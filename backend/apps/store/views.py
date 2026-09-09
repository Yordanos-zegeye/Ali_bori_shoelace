from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FinishedProductBag, StoreMovement


class StoreMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreMovement
        fields = '__all__'


class FinishedProductBagSerializer(serializers.ModelSerializer):
    bag_id = serializers.CharField(required=False, allow_blank=True)
    product_name = serializers.CharField(source='product_variant.__str__', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    movements = StoreMovementSerializer(many=True, read_only=True)

    class Meta:
        model = FinishedProductBag
        fields = '__all__'


class FinishedProductBagViewSet(viewsets.ModelViewSet):
    queryset = FinishedProductBag.objects.all().select_related('product_variant__color', 'product_variant__thickness', 'batch')
    serializer_class = FinishedProductBagSerializer
    filterset_fields = ['status', 'store_location', 'product_variant', 'batch']
    search_fields = ['bag_id', 'product_variant__serial_code', 'batch__batch_number']
    ordering_fields = ['-entry_date', 'bag_id', 'weight_kg']

    def create(self, request, *args, **kwargs):
        from decimal import Decimal
        from django.db.models import Sum
        from apps.production.models import ProductionBatch

        batch_id = request.data.get('batch')
        weight_raw = request.data.get('weight_kg')
        if batch_id and weight_raw:
            try:
                batch = ProductionBatch.objects.get(id=batch_id)
                bag_weight = Decimal(str(weight_raw))
                already_packed = batch.bags.aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')
                finished_output = batch.finished_output_kg or Decimal('0.00')
                max_allowed = finished_output if finished_output > Decimal('0.00') else (batch.tipping_input_kg or batch.braided_output_kg or batch.raw_yarn_input_kg or Decimal('0.00'))

                if max_allowed > Decimal('0.00'):
                    remaining = max(Decimal('0.00'), max_allowed - already_packed)
                    if bag_weight > remaining:
                        return Response({
                            'error': f"Cannot pack {bag_weight:.2f} KG. Only {remaining:.2f} KG of unpacked shoelaces remains for run {batch.batch_number} (Allowed: {max_allowed:.2f} KG, already packed: {already_packed:.2f} KG)."
                        }, status=status.HTTP_400_BAD_REQUEST)
            except ProductionBatch.DoesNotExist:
                pass

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from decimal import Decimal
        from django.db.models import Sum
        bag = serializer.save()
        StoreMovement.objects.create(
            bag=bag,
            movement_type=StoreMovement.MovementType.STORE_ENTRY,
            from_location=f"Production Run {bag.batch.batch_number}" if bag.batch else "Factory Floor",
            to_location=bag.store_location,
            notes=f"Weighed and shipped to store ({bag.weight_kg} KG)"
        )
        if bag.batch:
            # If finished_output_kg was not set yet, set to total packed
            if not bag.batch.finished_output_kg or bag.batch.finished_output_kg == Decimal('0.00'):
                total_packed = bag.batch.bags.aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')
                bag.batch.finished_output_kg = total_packed
            bag.batch.recalculate_totals()
            bag.batch.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == FinishedProductBag.Status.DISPATCHED:
            return Response(
                {'error': "Cannot delete sack because it has already been shipped to customers."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        batch = instance.batch
        instance.delete()
        if batch:
            batch.recalculate_totals()
            batch.save()

    @action(detail=False, methods=['get'])
    def available_for_dispatch(self, request):
        bags = self.get_queryset().filter(status=FinishedProductBag.Status.IN_STORE)
        variant_id = request.query_params.get('variant')
        if variant_id:
            bags = bags.filter(product_variant_id=variant_id)
        return Response(FinishedProductBagSerializer(bags, many=True).data)

    @action(detail=True, methods=['post'])
    def transfer_location(self, request, pk=None):
        bag = self.get_object()
        new_loc = request.data.get('destination_location')
        if not new_loc:
            return Response({'error': "Destination location is required."}, status=status.HTTP_400_BAD_REQUEST)

        old_loc = bag.store_location
        bag.store_location = new_loc
        bag.save()

        StoreMovement.objects.create(
            bag=bag,
            movement_type=StoreMovement.MovementType.STORE_TRANSFER,
            from_location=old_loc,
            to_location=new_loc,
            notes=request.data.get('notes', f"Transfer from {old_loc} to {new_loc}")
        )
        return Response(FinishedProductBagSerializer(bag).data)


class StoreMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StoreMovement.objects.all().select_related('bag')
    serializer_class = StoreMovementSerializer
    filterset_fields = ['movement_type', 'bag']
    ordering_fields = ['-created_at']

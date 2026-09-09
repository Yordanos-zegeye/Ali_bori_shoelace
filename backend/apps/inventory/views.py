from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    StorageLocation, RawMaterialType, RawMaterialVariant,
    RawMaterialStock, RawMaterialInventoryTransaction,
    StockRequest, StockRequestItem
)
from apps.assets.models import SparePart, SparePartInventoryTransaction
from apps.notifications.services import NotificationService


class StorageLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageLocation
        fields = '__all__'


class RawMaterialTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterialType
        fields = '__all__'


class RawMaterialVariantSerializer(serializers.ModelSerializer):
    material_type_name = serializers.CharField(source='material_type.name', read_only=True)
    color_code = serializers.CharField(source='color.code', read_only=True)
    name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    total_available_kg = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = RawMaterialVariant
        fields = '__all__'

    def get_name(self, obj):
        return f"{obj.material_type.name} - {obj.color_name}"

    def get_display_name(self, obj):
        return f"{obj.material_type.name} - {obj.color_name}"

    def get_total_available_kg(self, obj):
        return sum(s.available_kg for s in obj.stock_records.all())

    def get_is_low_stock(self, obj):
        avail = self.get_total_available_kg(obj)
        return avail <= obj.minimum_stock_kg


class RawMaterialStockSerializer(serializers.ModelSerializer):
    variant_name = serializers.CharField(source='variant.__str__', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    place = serializers.CharField(source='place_text', required=False, allow_blank=True)
    quantity_kg = serializers.DecimalField(source='available_kg', max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = RawMaterialStock
        fields = '__all__'
        extra_kwargs = {
            'variant': {'required': False},
            'total_kg': {'required': False},
            'available_kg': {'required': False},
        }


class RawMaterialInventoryTransactionSerializer(serializers.ModelSerializer):
    variant_name = serializers.CharField(source='variant.__str__', read_only=True)

    class Meta:
        model = RawMaterialInventoryTransaction
        fields = '__all__'


class StockRequestItemSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source='raw_material_variant.__str__', read_only=True)
    spare_part_name = serializers.CharField(source='spare_part.name', read_only=True)

    class Meta:
        model = StockRequestItem
        fields = '__all__'


class StockRequestSerializer(serializers.ModelSerializer):
    items = StockRequestItemSerializer(many=True, read_only=True)

    class Meta:
        model = StockRequest
        fields = '__all__'


class StorageLocationViewSet(viewsets.ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer


class RawMaterialTypeViewSet(viewsets.ModelViewSet):
    queryset = RawMaterialType.objects.all()
    serializer_class = RawMaterialTypeSerializer


class RawMaterialVariantViewSet(viewsets.ModelViewSet):
    queryset = RawMaterialVariant.objects.all().select_related('material_type', 'color').prefetch_related('stock_records')
    serializer_class = RawMaterialVariantSerializer
    filterset_fields = ['material_type', 'color_name', 'is_active']
    search_fields = ['code', 'color_name', 'material_type__name']


class RawMaterialStockViewSet(viewsets.ModelViewSet):
    queryset = RawMaterialStock.objects.all().select_related('variant__material_type', 'location')
    serializer_class = RawMaterialStockSerializer
    filterset_fields = ['variant', 'location', 'place_text']

    def create(self, request, *args, **kwargs):
        data = request.data
        variant_id = data.get('variant') or data.get('raw_material_variant')
        if not variant_id:
            return Response(
                {'error': 'A valid yarn variant is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            variant = RawMaterialVariant.objects.get(id=variant_id)
        except RawMaterialVariant.DoesNotExist:
            return Response(
                {'error': f'RawMaterialVariant with ID {variant_id} does not exist.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse quantity
        qty_raw = data.get('quantity_kg') or data.get('available_kg') or data.get('total_kg') or '0'
        try:
            qty = Decimal(str(qty_raw))
            if qty <= 0:
                raise ValueError()
        except Exception:
            return Response(
                {'error': 'Received quantity must be a positive number greater than 0 KG.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        place_text = data.get('place_text') or data.get('place') or 'MAIN_YARN_STORE'

        st_v_raw = data.get('st_v', '0.00')
        st_n_raw = data.get('st_n', '0.00')
        try:
            st_v = Decimal(str(st_v_raw))
        except Exception:
            st_v = Decimal('0.00')
        try:
            st_n = Decimal(str(st_n_raw))
        except Exception:
            st_n = Decimal('0.00')

        remark = data.get('remark') or data.get('notes') or ''
        location_id = data.get('location')

        with transaction.atomic():
            # Check if stock record exists for this variant and place
            stock_rec = RawMaterialStock.objects.select_for_update().filter(
                variant=variant,
                place_text=place_text
            ).first()

            if stock_rec:
                stock_rec.total_kg += qty
                stock_rec.available_kg += qty
                if st_v > 0:
                    stock_rec.st_v = st_v
                if st_n > 0:
                    stock_rec.st_n = st_n
                if location_id:
                    stock_rec.location_id = location_id
                stock_rec.save()
            else:
                stock_rec = RawMaterialStock.objects.create(
                    variant=variant,
                    location_id=location_id if location_id else None,
                    place_text=place_text,
                    st_v=st_v,
                    st_n=st_n,
                    total_kg=qty,
                    available_kg=qty
                )

            # Calculate new balance across all stock records of this variant
            balance_after = sum(s.available_kg for s in variant.stock_records.all())

            # Log audit trail transaction
            ref_batch = f"SHIPMENT-{timezone.now().strftime('%Y%m%d-%H%M%S')}"
            created_by_user = request.user.username if (request.user and request.user.is_authenticated) else "Warehouse Manager"
            RawMaterialInventoryTransaction.objects.create(
                variant=variant,
                transaction_type=RawMaterialInventoryTransaction.TransactionType.PURCHASE_RECEIPT,
                quantity_kg=qty,
                balance_after_kg=balance_after,
                reference_batch_number=ref_batch,
                notes=remark or f"Received {qty} KG of yarn at {place_text}",
                created_by=created_by_user
            )

        serializer = self.get_serializer(stock_rec)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RawMaterialInventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RawMaterialInventoryTransaction.objects.all().select_related('variant')
    serializer_class = RawMaterialInventoryTransactionSerializer
    filterset_fields = ['transaction_type', 'variant']
    ordering_fields = ['-created_at']


class StockRequestViewSet(viewsets.ModelViewSet):
    queryset = StockRequest.objects.all().prefetch_related('items__raw_material_variant', 'items__spare_part')
    serializer_class = StockRequestSerializer
    filterset_fields = ['status', 'department']
    search_fields = ['request_number', 'requester_name', 'reason']

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.get('items', [])
        
        # Generate human-readable request number REQ-YYYY-XXXXX
        year = timezone.now().year
        count = StockRequest.objects.filter(created_at__year=year).count() + 1
        req_num = f"REQ-{year}-{count:05d}"

        with transaction.atomic():
            stock_req = StockRequest.objects.create(
                request_number=req_num,
                requester_name=data.get('requester_name', 'Production Worker'),
                department=data.get('department', 'PRODUCTION'),
                reason=data.get('reason', 'Manufacturing consumption'),
                status=StockRequest.Status.PENDING,
                notes=data.get('notes', '')
            )
            for item in items_data:
                StockRequestItem.objects.create(
                    stock_request=stock_req,
                    item_type=item.get('item_type', 'RAW_MATERIAL'),
                    raw_material_variant_id=item.get('raw_material_variant_id') or item.get('raw_material_variant'),
                    spare_part_id=item.get('spare_part_id') or item.get('spare_part'),
                    item_description=item.get('item_description', ''),
                    requested_quantity=Decimal(str(item.get('requested_quantity', 1))),
                    unit=item.get('unit', 'KG')
                )
            NotificationService.notify_stock_request_created(stock_req)

        return Response(StockRequestSerializer(stock_req).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req_obj = self.get_object()
        if req_obj.status not in [StockRequest.Status.PENDING, StockRequest.Status.REJECTED]:
            return Response({'error': f"Cannot approve request in status {req_obj.status}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            req_obj.status = StockRequest.Status.APPROVED
            req_obj.approved_by = request.data.get('approved_by', 'Warehouse Manager')
            req_obj.approved_at = timezone.now()
            # Set approved_quantity = requested_quantity by default
            for it in req_obj.items.all():
                it.approved_quantity = it.requested_quantity
                it.status = StockRequest.Status.APPROVED
                it.save()
            req_obj.save()
            NotificationService.notify_stock_request_status_change(req_obj, 'approved')

        return Response(StockRequestSerializer(req_obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req_obj = self.get_object()
        reason = request.data.get('rejection_reason', 'Denied by manager')
        with transaction.atomic():
            req_obj.status = StockRequest.Status.REJECTED
            req_obj.rejection_reason = reason
            req_obj.save()
            for it in req_obj.items.all():
                it.status = StockRequest.Status.REJECTED
                it.save()
            NotificationService.notify_stock_request_status_change(req_obj, 'rejected')
        return Response(StockRequestSerializer(req_obj).data)

    @action(detail=True, methods=['post'])
    def issue_materials(self, request, pk=None):
        req_obj = self.get_object()
        if req_obj.status != StockRequest.Status.APPROVED:
            return Response({'error': "Request must be APPROVED before issuing materials."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for it in req_obj.items.all():
                qty = it.approved_quantity or it.requested_quantity
                if it.item_type == StockRequestItem.ItemType.RAW_MATERIAL and it.raw_material_variant:
                    rm_var = it.raw_material_variant
                    stock_rec = RawMaterialStock.objects.select_for_update().filter(variant=rm_var).first()
                    if not stock_rec or stock_rec.available_kg < qty:
                        avail = stock_rec.available_kg if stock_rec else 0
                        return Response(
                            {'error': f"Insufficient raw material for {rm_var}. Available: {avail} KG, Requested: {qty} KG"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    stock_rec.available_kg -= qty
                    stock_rec.save()

                    RawMaterialInventoryTransaction.objects.create(
                        variant=rm_var,
                        transaction_type=RawMaterialInventoryTransaction.TransactionType.PRODUCTION_CONSUMPTION,
                        quantity_kg=-qty,
                        balance_after_kg=stock_rec.available_kg,
                        reference_batch_number=req_obj.request_number,
                        notes=f"Issued for request {req_obj.request_number}"
                    )

                    if stock_rec.available_kg <= rm_var.minimum_stock_kg:
                        NotificationService.notify_low_raw_material(rm_var, stock_rec.available_kg, rm_var.minimum_stock_kg)

                elif it.item_type == StockRequestItem.ItemType.SPARE_PART and it.spare_part:
                    spare = SparePart.objects.select_for_update().get(id=it.spare_part.id)
                    if spare.quantity < qty:
                        return Response(
                            {'error': f"Insufficient spare parts for {spare.name}. Available: {spare.quantity}, Requested: {qty}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    spare.quantity -= qty
                    spare.save()

                    SparePartInventoryTransaction.objects.create(
                        spare_part=spare,
                        transaction_type=SparePartInventoryTransaction.TransactionType.MAINTENANCE_CONSUMPTION,
                        quantity=-qty,
                        balance_after=spare.quantity,
                        notes=f"Issued for request {req_obj.request_number}"
                    )

                    if spare.quantity <= spare.minimum_stock:
                        NotificationService.notify_low_spare_part(spare, spare.quantity, spare.minimum_stock)

                it.issued_quantity = qty
                it.status = StockRequest.Status.ISSUED
                it.save()

            req_obj.status = StockRequest.Status.ISSUED
            req_obj.issued_by = request.data.get('issued_by', 'Warehouse Storekeeper')
            req_obj.issued_at = timezone.now()
            req_obj.save()
            NotificationService.notify_stock_request_status_change(req_obj, 'issued')

        return Response(StockRequestSerializer(req_obj).data)

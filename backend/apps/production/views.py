from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    ProductionBatch, Phase1BraidingRecord, WIPTransfer, 
    Phase2TippingRecord, ProductionBatchMaterial
)
from apps.catalog.models import ProductVariant
from apps.assets.models import Machine
from apps.inventory.models import (
    RawMaterialVariant, RawMaterialStock, RawMaterialInventoryTransaction,
    StockRequest, StockRequestItem
)
from apps.store.models import FinishedProductBag, StoreMovement


class ProductionBatchMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='raw_material_variant.__str__', read_only=True)

    class Meta:
        model = ProductionBatchMaterial
        fields = '__all__'


class Phase1BraidingRecordSerializer(serializers.ModelSerializer):
    machine_code = serializers.CharField(source='machine.machine_code', read_only=True)
    raw_material_name = serializers.CharField(source='raw_material_variant.__str__', read_only=True)

    class Meta:
        model = Phase1BraidingRecord
        fields = '__all__'


class WIPTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = WIPTransfer
        fields = '__all__'


class Phase2TippingRecordSerializer(serializers.ModelSerializer):
    machine_code = serializers.CharField(source='machine.machine_code', read_only=True)

    class Meta:
        model = Phase2TippingRecord
        fields = '__all__'


class ProductionBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_variant.__str__', read_only=True)
    raw_material_yarn_name = serializers.CharField(source='raw_material_yarn.__str__', read_only=True)
    film_roll_name = serializers.CharField(source='film_roll_variant.__str__', read_only=True)
    phase1_record = Phase1BraidingRecordSerializer(read_only=True)
    phase2_record = Phase2TippingRecordSerializer(read_only=True)
    transfers = WIPTransferSerializer(many=True, read_only=True)
    materials_used = ProductionBatchMaterialSerializer(many=True, read_only=True)
    bag_count = serializers.IntegerField(source='bags.count', read_only=True)
    total_packed_kg = serializers.SerializerMethodField()
    remaining_unpacked_kg = serializers.SerializerMethodField()
    bags_list = serializers.SerializerMethodField()

    class Meta:
        model = ProductionBatch
        fields = '__all__'

    def get_total_packed_kg(self, obj):
        total = obj.bags.aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')
        return f"{total:.2f}"

    def get_remaining_unpacked_kg(self, obj):
        total = obj.bags.aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')
        fin = obj.finished_output_kg or Decimal('0.00')
        return f"{max(Decimal('0.00'), fin - total):.2f}"

    def get_bags_list(self, obj):
        return [
            {
                'id': str(b.id),
                'bag_id': b.bag_id,
                'weight_kg': f"{b.weight_kg:.2f}",
                'store_location': b.store_location,
                'status': b.status,
                'entry_date': str(b.entry_date)
            }
            for b in obj.bags.all().order_by('created_at')
        ]


class ProductionBatchViewSet(viewsets.ModelViewSet):
    queryset = ProductionBatch.objects.all().select_related(
        'product_variant', 'raw_material_yarn', 'film_roll_variant'
    ).prefetch_related('transfers', 'bags', 'materials_used')
    serializer_class = ProductionBatchSerializer
    filterset_fields = ['status', 'product_variant', 'start_date']
    search_fields = ['batch_number', 'supervisor', 'product_variant__serial_code']
    ordering_fields = ['-created_at', 'batch_number']

    def create(self, request, *args, **kwargs):
        data = request.data
        year = timezone.now().year
        count = ProductionBatch.objects.filter(created_at__year=year).count() + 1
        batch_num = f"BATCH-{year}-{count:05d}"
        while ProductionBatch.objects.filter(batch_number=batch_num).exists():
            count += 1
            batch_num = f"BATCH-{year}-{count:05d}"

        variant_id = data.get('product_variant')
        yarn_id = data.get('raw_material_yarn') or data.get('raw_material_yarn_id')
        film_id = data.get('film_roll_variant') or data.get('film_roll_variant_id')

        batch_count = int(data.get('yarn_batch_count', 1) or 1)
        if 'raw_yarn_input_kg' in data and data['raw_yarn_input_kg']:
            raw_yarn_input = Decimal(str(data['raw_yarn_input_kg']))
        else:
            raw_yarn_input = Decimal(str(batch_count * 32.00))

        acetone_qty = Decimal(str(data.get('acetone_used', '0.00') or '0.00'))
        film_qty = Decimal(str(data.get('film_roll_used', '0.00') or '0.00'))
        supervisor_name = data.get('supervisor', 'Production Supervisor') or 'Production Supervisor'

        # Create formal StockRequest in Inventory app (conflict-free number)
        req_count = StockRequest.objects.count() + 1
        req_num = f"REQ-{year}-{req_count:05d}"
        while StockRequest.objects.filter(request_number=req_num).exists():
            req_count += 1
            req_num = f"REQ-{year}-{req_count:05d}"

        stock_req = StockRequest.objects.create(
            request_number=req_num,
            requester_name=supervisor_name,
            department="PRODUCTION",
            reason=f"Raw materials requested for production run {batch_num} ({batch_count} yarn batches = {raw_yarn_input} KG)",
            status=StockRequest.Status.APPROVED
        )

        batch = ProductionBatch.objects.create(
            batch_number=batch_num,
            product_variant_id=variant_id,
            raw_material_yarn_id=yarn_id if yarn_id else None,
            yarn_batch_count=batch_count,
            raw_yarn_input_kg=raw_yarn_input,
            acetone_used=acetone_qty,
            film_roll_variant_id=film_id if film_id else None,
            film_roll_used=film_qty,
            stock_request_number=req_num,
            status=data.get('status', ProductionBatch.Status.IN_PROGRESS),
            supervisor=supervisor_name,
            notes=data.get('notes', ''),
            created_by=data.get('created_by', 'Production Manager')
        )

        # Record line-item material usages & StockRequestItems
        if yarn_id and raw_yarn_input > Decimal('0.00'):
            ProductionBatchMaterial.objects.create(
                batch=batch,
                raw_material_variant_id=yarn_id,
                quantity=raw_yarn_input,
                unit='KG',
                phase='PHASE_1',
                notes='Initial Braiding Yarn'
            )
            StockRequestItem.objects.create(
                stock_request=stock_req,
                item_type=StockRequestItem.ItemType.RAW_MATERIAL,
                raw_material_variant_id=yarn_id,
                item_description=f"Raw Yarn for {batch_num}",
                requested_quantity=raw_yarn_input,
                approved_quantity=raw_yarn_input,
                issued_quantity=raw_yarn_input,
                unit='KG'
            )
            # Deduct from RawMaterialStock across records with available stock & log transaction
            remaining_to_deduct = raw_yarn_input
            stocks_to_deduct = list(RawMaterialStock.objects.filter(variant_id=yarn_id, available_kg__gt=0).order_by('-available_kg'))
            for st in stocks_to_deduct:
                if remaining_to_deduct <= Decimal('0.00'):
                    break
                deduct_amt = min(st.available_kg, remaining_to_deduct)
                st.available_kg -= deduct_amt
                st.save()
                remaining_to_deduct -= deduct_amt

            if remaining_to_deduct > Decimal('0.00'):
                first_st = RawMaterialStock.objects.filter(variant_id=yarn_id).first()
                if first_st:
                    first_st.available_kg = max(Decimal('0.00'), first_st.available_kg - remaining_to_deduct)
                    first_st.save()

            total_yarn_after = sum(s.available_kg for s in RawMaterialStock.objects.filter(variant_id=yarn_id))
            RawMaterialInventoryTransaction.objects.create(
                variant_id=yarn_id,
                transaction_type=RawMaterialInventoryTransaction.TransactionType.PRODUCTION_CONSUMPTION,
                quantity_kg=-raw_yarn_input,
                balance_after_kg=total_yarn_after,
                reference_batch_number=batch.batch_number,
                notes=f"Issued for production run {batch.batch_number} ({stock_req.request_number})"
            )

        if acetone_qty > Decimal('0.00'):
            acetone_var = RawMaterialVariant.objects.filter(material_type__name__icontains='Acetone').first()
            if acetone_var:
                ProductionBatchMaterial.objects.create(
                    batch=batch,
                    raw_material_variant=acetone_var,
                    quantity=acetone_qty,
                    unit='Liters',
                    phase='PHASE_2',
                    notes='Tipping Bonding Agent'
                )
                StockRequestItem.objects.create(
                    stock_request=stock_req,
                    item_type=StockRequestItem.ItemType.RAW_MATERIAL,
                    raw_material_variant=acetone_var,
                    item_description=f"Acetone Solvent for {batch_num}",
                    requested_quantity=acetone_qty,
                    approved_quantity=acetone_qty,
                    issued_quantity=acetone_qty,
                    unit='Liters'
                )
                rem_acetone = acetone_qty
                for a_st in RawMaterialStock.objects.filter(variant=acetone_var, available_kg__gt=0).order_by('-available_kg'):
                    if rem_acetone <= Decimal('0.00'):
                        break
                    d_amt = min(a_st.available_kg, rem_acetone)
                    a_st.available_kg -= d_amt
                    a_st.save()
                    rem_acetone -= d_amt
                total_acetone_after = sum(s.available_kg for s in RawMaterialStock.objects.filter(variant=acetone_var))
                RawMaterialInventoryTransaction.objects.create(
                    variant=acetone_var,
                    transaction_type=RawMaterialInventoryTransaction.TransactionType.PRODUCTION_CONSUMPTION,
                    quantity_kg=-acetone_qty,
                    balance_after_kg=total_acetone_after,
                    reference_batch_number=batch.batch_number,
                    notes=f"Acetone Solvent for production run {batch.batch_number}"
                )

        if film_id and film_qty > Decimal('0.00'):
            ProductionBatchMaterial.objects.create(
                batch=batch,
                raw_material_variant_id=film_id,
                quantity=film_qty,
                unit='Rolls',
                phase='PHASE_2',
                notes='Plastic Aglet Film Roll'
            )
            StockRequestItem.objects.create(
                stock_request=stock_req,
                item_type=StockRequestItem.ItemType.RAW_MATERIAL,
                raw_material_variant_id=film_id,
                item_description=f"Film Roll for {batch_num}",
                requested_quantity=film_qty,
                approved_quantity=film_qty,
                issued_quantity=film_qty,
                unit='Rolls'
            )
            rem_film = film_qty
            for f_st in RawMaterialStock.objects.filter(variant_id=film_id, available_kg__gt=0).order_by('-available_kg'):
                if rem_film <= Decimal('0.00'):
                    break
                d_amt = min(f_st.available_kg, rem_film)
                f_st.available_kg -= d_amt
                f_st.save()
                rem_film -= d_amt
            total_film_after = sum(s.available_kg for s in RawMaterialStock.objects.filter(variant_id=film_id))
            RawMaterialInventoryTransaction.objects.create(
                variant_id=film_id,
                transaction_type=RawMaterialInventoryTransaction.TransactionType.PRODUCTION_CONSUMPTION,
                quantity_kg=-film_qty,
                balance_after_kg=total_film_after,
                reference_batch_number=batch.batch_number,
                notes=f"Film Roll for production run {batch.batch_number}"
            )

        return Response(ProductionBatchSerializer(batch).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data

        if 'product_variant' in data and data['product_variant']:
            instance.product_variant_id = data['product_variant']
        if 'raw_material_yarn' in data:
            instance.raw_material_yarn_id = data['raw_material_yarn'] or None
        if 'yarn_batch_count' in data and data['yarn_batch_count']:
            instance.yarn_batch_count = int(data['yarn_batch_count'])
        if 'raw_yarn_input_kg' in data:
            instance.raw_yarn_input_kg = Decimal(str(data['raw_yarn_input_kg'] or '0.00'))
        if 'braided_output_kg' in data:
            instance.braided_output_kg = Decimal(str(data['braided_output_kg'] or '0.00'))
        if 'tipping_input_kg' in data:
            instance.tipping_input_kg = Decimal(str(data['tipping_input_kg'] or '0.00'))
        if 'finished_output_kg' in data:
            instance.finished_output_kg = Decimal(str(data['finished_output_kg'] or '0.00'))
        if 'acetone_used' in data:
            instance.acetone_used = Decimal(str(data['acetone_used'] or '0.00'))
        if 'film_roll_variant' in data:
            instance.film_roll_variant_id = data['film_roll_variant'] or None
        if 'film_roll_used' in data:
            instance.film_roll_used = Decimal(str(data['film_roll_used'] or '0.00'))
        if 'supervisor' in data:
            instance.supervisor = data['supervisor']
        if 'notes' in data:
            instance.notes = data['notes']
        if 'status' in data:
            instance.status = data['status']

        try:
            instance.recalculate_totals()
            instance.save()
        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionBatchSerializer(instance).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            # Idempotent deletion: if already deleted or does not exist, return 204
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Check if any bags attached to this batch were dispatched
        dispatched_bags = instance.bags.filter(status=FinishedProductBag.Status.DISPATCHED).count()
        if dispatched_bags > 0:
            return Response(
                {"error": "Cannot delete this production run because its finished sacks have already been shipped to customers."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def move_to_b2(self, request, pk=None):
        """
        Step 2: Input weighed processed lace and move from Building 1 to Building 2.
        Calculates Phase 1 spindle waste, updates tipping input, and logs WIP transfer.
        """
        batch = self.get_object()
        data = request.data

        braided_kg = Decimal(str(data.get('braided_output_kg', batch.braided_output_kg or '0.00')))
        if braided_kg <= Decimal('0.00'):
            return Response({'error': "Processed lace weight must be greater than 0 KG."}, status=status.HTTP_400_BAD_REQUEST)

        raw_in = batch.raw_yarn_input_kg or Decimal('0.00')
        if raw_in > Decimal('0.00') and braided_kg > raw_in:
            return Response({
                'error': f"Braided lace ({braided_kg:.2f} KG) cannot exceed initial raw yarn input ({raw_in:.2f} KG). Braiding output cannot exceed input."
            }, status=status.HTTP_400_BAD_REQUEST)

        batch.braided_output_kg = braided_kg
        batch.tipping_input_kg = braided_kg
        batch.status = ProductionBatch.Status.TRANSFERRED
        if 'notes' in data and data['notes']:
            batch.notes = (batch.notes or '') + f"\n[Move to B2]: {data['notes']}"
        batch.recalculate_totals()
        batch.save()

        # Log WIP transfer from B1 to B2
        WIPTransfer.objects.create(
            batch=batch,
            source_building="Building 1",
            source_room="Braiding Floor",
            destination_building="Building 2",
            destination_room="Tipping Department",
            weight_kg=braided_kg,
            sender=data.get('transferred_by', batch.supervisor or 'Braiding Supervisor'),
            transfer_date=timezone.now(),
            status=WIPTransfer.Status.RECEIVED,
            notes=f"Weighed lace moved from B1 to B2 for run {batch.batch_number}"
        )

        return Response(ProductionBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def weigh_and_store(self, request, pk=None):
        """
        Step 3: Move from Building 2 to Store by weighing.
        Inputs finished shoelace weight, calculates Phase 2 waste, total waste, and yield %,
        and packs into finished store sacks (packing as much as desired to the store).
        """
        batch = self.get_object()
        data = request.data

        # Process any sack weights provided (as much and as many as user wants)
        sack_weights = data.get('sack_weights')
        if not sack_weights and data.get('sack_weight_kg'):
            sack_weights = [data.get('sack_weight_kg')]

        valid_weights = []
        if sack_weights and isinstance(sack_weights, list):
            for sw in sack_weights:
                try:
                    w = Decimal(str(sw))
                    if w > Decimal('0.00'):
                        valid_weights.append(w)
                except Exception:
                    pass

        # Determine finished output weight
        finished_kg_input = data.get('finished_output_kg')
        if finished_kg_input is not None and str(finished_kg_input).strip() != '':
            finished_kg = Decimal(str(finished_kg_input))
        elif valid_weights:
            finished_kg = sum(valid_weights)
        else:
            finished_kg = batch.finished_output_kg or Decimal('0.00')

        if finished_kg <= Decimal('0.00'):
            return Response({'error': "Finished shoelaces weight must be greater than 0 KG."}, status=status.HTTP_400_BAD_REQUEST)

        # Upper bound: Finished shoelaces cannot exceed incoming braided cords or raw yarn input!
        max_possible = batch.tipping_input_kg or batch.braided_output_kg or batch.raw_yarn_input_kg or Decimal('0.00')
        if max_possible > Decimal('0.00') and finished_kg > max_possible:
            return Response({
                'error': f"Finished shoelaces ({finished_kg:.2f} KG) cannot exceed incoming braided cords ({max_possible:.2f} KG). Physical output cannot exceed input."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Sack weights cannot exceed finished_kg
        if valid_weights:
            sum_sacks = sum(valid_weights)
            if sum_sacks > finished_kg:
                return Response({
                    'error': f"Total packed sack weight ({sum_sacks:.2f} KG) cannot exceed weighed finished shoelaces ({finished_kg:.2f} KG)."
                }, status=status.HTTP_400_BAD_REQUEST)

        batch.finished_output_kg = finished_kg
        batch.status = ProductionBatch.Status.COMPLETED
        batch.completion_date = timezone.now().date()
        batch.recalculate_totals()
        batch.save()

        store_location = data.get('store_location', 'Finished Goods Store 1')
        sacks_created = []

        for w_dec in valid_weights:
            bag = FinishedProductBag.objects.create(
                batch=batch,
                product_variant=batch.product_variant,
                weight_kg=w_dec,
                store_location=store_location,
                status=FinishedProductBag.Status.IN_STORE,
                notes=f"Weighed from run {batch.batch_number} into store"
            )
            StoreMovement.objects.create(
                bag=bag,
                movement_type=StoreMovement.MovementType.STORE_ENTRY,
                from_location=f"Production Run {batch.batch_number} (Tipping)",
                to_location=store_location,
                notes=f"Entry from production batch {batch.batch_number}"
            )
            sacks_created.append(bag.bag_id)

        res_data = ProductionBatchSerializer(batch).data
        res_data['sacks_created'] = sacks_created
        return Response(res_data)

    @action(detail=True, methods=['post'])
    def record_phase1(self, request, pk=None):
        batch = self.get_object()
        data = request.data

        input_kg = Decimal(str(data.get('input_weight_kg', 0)))
        output_kg = Decimal(str(data.get('output_weight_kg', 0)))

        # Production Validation (Section 20)
        if input_kg <= Decimal('0.00'):
            return Response({'error': "Raw yarn input weight must be greater than 0 KG."}, status=status.HTTP_400_BAD_REQUEST)
        if output_kg < Decimal('0.00'):
            return Response({'error': "Braided output weight cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
        if output_kg > input_kg:
            return Response({'error': f"Braided output ({output_kg} KG) cannot exceed raw yarn input ({input_kg} KG)."}, status=status.HTTP_400_BAD_REQUEST)

        raw_mat_id = data.get('raw_material_variant_id')
        machine_id = data.get('machine_id')
        operator = data.get('operator', 'Braiding Operator')
        rec_date = data.get('date', timezone.now().date())
        notes = data.get('notes', '')

        with transaction.atomic():
            # Deduct from raw material stock if not already deducted via stock request
            rm_var = RawMaterialVariant.objects.get(id=raw_mat_id)
            stock = RawMaterialStock.objects.select_for_update().filter(variant=rm_var).first()
            if stock:
                stock.available_kg = max(Decimal('0.00'), stock.available_kg - input_kg)
                stock.save()
                RawMaterialInventoryTransaction.objects.create(
                    variant=rm_var,
                    transaction_type=RawMaterialInventoryTransaction.TransactionType.PRODUCTION_CONSUMPTION,
                    quantity_kg=-input_kg,
                    balance_after_kg=stock.available_kg,
                    reference_batch_number=batch.batch_number,
                    notes=f"Consumed in Phase 1 Braiding for batch {batch.batch_number}"
                )

            record, _ = Phase1BraidingRecord.objects.update_or_create(
                batch=batch,
                defaults={
                    'raw_material_variant_id': raw_mat_id,
                    'machine_id': machine_id,
                    'building': data.get('building', 'Building 1'),
                    'room': data.get('room', 'B1'),
                    'operator': operator,
                    'input_weight_kg': input_kg,
                    'output_weight_kg': output_kg,
                    'date': rec_date,
                    'notes': notes,
                }
            )

        return Response(ProductionBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def record_transfer(self, request, pk=None):
        batch = self.get_object()
        data = request.data

        weight = Decimal(str(data.get('weight_kg', batch.braided_output_kg)))
        transfer = WIPTransfer.objects.create(
            batch=batch,
            source_building=data.get('source_building', 'Building 1'),
            source_room=data.get('source_room', 'B1'),
            destination_building=data.get('destination_building', 'Building 2'),
            destination_room=data.get('destination_room', 'B2'),
            weight_kg=weight,
            sender=data.get('sender', 'Building 1 Supervisor'),
            receiver=data.get('receiver', 'Building 2 Supervisor'),
            transfer_date=data.get('transfer_date', timezone.now()),
            status=WIPTransfer.Status.RECEIVED,
            notes=data.get('notes', '')
        )
        batch.status = ProductionBatch.Status.TRANSFERRED
        batch.save()
        return Response(ProductionBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def record_phase2(self, request, pk=None):
        batch = self.get_object()
        data = request.data

        input_kg = Decimal(str(data.get('input_weight_kg', 0)))
        output_kg = Decimal(str(data.get('finished_output_kg', 0)))

        # Production Validation (Section 20)
        if input_kg <= Decimal('0.00'):
            return Response({'error': "Tipping input weight must be greater than 0 KG."}, status=status.HTTP_400_BAD_REQUEST)
        if output_kg < Decimal('0.00'):
            return Response({'error': "Finished output weight cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
        if output_kg > input_kg:
            return Response({'error': f"Finished output ({output_kg} KG) cannot exceed tipping input ({input_kg} KG)."}, status=status.HTTP_400_BAD_REQUEST)

        machine_id = data.get('machine_id')
        operator = data.get('operator', 'Tipping Operator')
        rec_date = data.get('date', timezone.now().date())
        notes = data.get('notes', '')

        with transaction.atomic():
            record, _ = Phase2TippingRecord.objects.update_or_create(
                batch=batch,
                defaults={
                    'machine_id': machine_id,
                    'building': data.get('building', 'Building 2'),
                    'room': data.get('room', 'B2'),
                    'operator': operator,
                    'input_weight_kg': input_kg,
                    'finished_output_kg': output_kg,
                    'date': rec_date,
                    'notes': notes,
                }
            )

        return Response(ProductionBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def pack_into_bags(self, request, pk=None):
        """
        Divides the finished output of a batch into individually tracked 25-40 KG bags.
        """
        batch = self.get_object()
        data = request.data
        bag_weights = data.get('bag_weights', [])  # list of weights e.g. [30.00, 30.00, 28.00]

        if not bag_weights:
            return Response({'error': "Please provide a list of bag weights."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate all bag weights upfront (25.00 <= w <= 40.00)
        total_pack = Decimal('0.00')
        for w in bag_weights:
            dw = Decimal(str(w))
            if dw < Decimal('25.00') or dw > Decimal('40.00'):
                return Response(
                    {'error': f"Invalid bag weight {dw} KG. Every finished product bag must be between 25.00 KG and 40.00 KG."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            total_pack += dw

        created_bags = []
        year = timezone.now().year
        with transaction.atomic():
            for dw in bag_weights:
                count = FinishedProductBag.objects.filter(entry_date__year=year).count() + 1
                bag_id = f"ABSL-{year}-{count:06d}"

                bag = FinishedProductBag.objects.create(
                    bag_id=bag_id,
                    batch=batch,
                    product_variant=batch.product_variant,
                    weight_kg=Decimal(str(dw)),
                    store_location=data.get('store_location', 'Finished Goods Store 1'),
                    status=FinishedProductBag.Status.IN_STORE,
                    notes=f"Packed from Batch {batch.batch_number}"
                )
                StoreMovement.objects.create(
                    bag=bag,
                    movement_type=StoreMovement.MovementType.STORE_ENTRY,
                    to_location=bag.store_location,
                    notes=f"Initial store entry from batch {batch.batch_number}"
                )
                created_bags.append(bag)

        return Response({
            'message': f"Successfully packed {len(created_bags)} bags totaling {total_pack} KG.",
            'bag_count': len(created_bags),
            'total_kg': total_pack,
            'batch': ProductionBatchSerializer(batch).data
        })

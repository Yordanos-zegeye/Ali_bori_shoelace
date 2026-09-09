from decimal import Decimal
from django.db import transaction
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    MachineType, Machine, SparePart,
    MachineTypeSparePartCompatibility, SparePartInventoryTransaction,
    UtilityEquipment, UtilityMaintenanceExpense
)
from apps.notifications.services import NotificationService


class MachineTypeSerializer(serializers.ModelSerializer):
    machine_count = serializers.IntegerField(source='machines.count', read_only=True)

    class Meta:
        model = MachineType
        fields = '__all__'


class MachineSerializer(serializers.ModelSerializer):
    machine_type_name = serializers.CharField(source='machine_type.name', read_only=True)
    performance_percent = serializers.SerializerMethodField()

    class Meta:
        model = Machine
        fields = '__all__'

    def get_performance_percent(self, obj):
        return int(obj.performance_score * 100) if obj.performance_score is not None else 100


class SparePartSerializer(serializers.ModelSerializer):
    compatible_machine_type_names = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field='name', source='compatible_machine_types'
    )
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = SparePart
        fields = '__all__'

    def get_is_low_stock(self, obj):
        return obj.quantity <= obj.minimum_stock


class MachineTypeSparePartCompatibilitySerializer(serializers.ModelSerializer):
    machine_type_name = serializers.CharField(source='machine_type.name', read_only=True)
    spare_part_name = serializers.CharField(source='spare_part.name', read_only=True)

    class Meta:
        model = MachineTypeSparePartCompatibility
        fields = '__all__'


class SparePartInventoryTransactionSerializer(serializers.ModelSerializer):
    spare_part_name = serializers.CharField(source='spare_part.name', read_only=True)

    class Meta:
        model = SparePartInventoryTransaction
        fields = '__all__'


class UtilityEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UtilityEquipment
        fields = '__all__'


class UtilityMaintenanceExpenseSerializer(serializers.ModelSerializer):
    utility_name = serializers.CharField(source='utility.name', read_only=True)

    class Meta:
        model = UtilityMaintenanceExpense
        fields = '__all__'


class MachineTypeViewSet(viewsets.ModelViewSet):
    queryset = MachineType.objects.all().prefetch_related('machines')
    serializer_class = MachineTypeSerializer
    search_fields = ['name', 'description']


class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().select_related('machine_type')
    serializer_class = MachineSerializer
    filterset_fields = ['machine_type', 'health', 'building', 'room', 'status']
    search_fields = ['machine_code', 'name', 'most_frequent_issue', 'room', 'place']
    ordering_fields = ['machine_code', 'performance_score', 'health', 'last_service_date']

    @action(detail=True, methods=['post'])
    def record_maintenance(self, request, pk=None):
        machine = self.get_object()
        data = request.data

        issue_resolved = data.get('issue', machine.most_frequent_issue)
        new_health = data.get('health', Machine.Health.NORMAL)
        service_date = data.get('service_date')
        next_service_date = data.get('next_service_date')
        parts_consumed = data.get('parts', [])  # list of {spare_part_id, quantity}
        notes = data.get('notes', '')

        with transaction.atomic():
            for part_item in parts_consumed:
                sp_id = part_item.get('spare_part_id')
                qty = Decimal(str(part_item.get('quantity', 1)))
                spare = SparePart.objects.select_for_update().get(id=sp_id)
                if spare.quantity < qty:
                    return Response(
                        {'error': f"Insufficient stock for spare part '{spare.name}'. In stock: {spare.quantity}, Requested: {qty}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                spare.quantity -= qty
                spare.save()

                SparePartInventoryTransaction.objects.create(
                    spare_part=spare,
                    transaction_type=SparePartInventoryTransaction.TransactionType.MAINTENANCE_CONSUMPTION,
                    quantity=-qty,
                    balance_after=spare.quantity,
                    reference_machine=machine,
                    notes=f"Consumed in maintenance on {machine.machine_code}: {notes}"
                )

                if spare.quantity <= spare.minimum_stock:
                    NotificationService.notify_low_spare_part(spare, spare.quantity, spare.minimum_stock)

            old_health = machine.health
            machine.health = new_health
            if service_date:
                machine.last_service_date = service_date
            if next_service_date:
                machine.next_service_date = next_service_date
            if issue_resolved:
                machine.most_frequent_issue = issue_resolved
            machine.save()

            if new_health == Machine.Health.CRITICAL and old_health != Machine.Health.CRITICAL:
                NotificationService.notify_machine_critical(machine, notes)

        return Response(MachineSerializer(machine).data)


class SparePartViewSet(viewsets.ModelViewSet):
    queryset = SparePart.objects.all().prefetch_related('compatible_machine_types')
    serializer_class = SparePartSerializer
    filterset_fields = ['room', 'place', 'shelf', 'is_active']
    search_fields = ['part_code', 'name', 'for_machine_text', 'room', 'shelf']
    ordering_fields = ['name', 'quantity', 'minimum_stock']


class SparePartInventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SparePartInventoryTransaction.objects.all().select_related('spare_part', 'reference_machine')
    serializer_class = SparePartInventoryTransactionSerializer
    filterset_fields = ['transaction_type', 'spare_part']
    ordering_fields = ['-created_at']


class UtilityEquipmentViewSet(viewsets.ModelViewSet):
    queryset = UtilityEquipment.objects.all()
    serializer_class = UtilityEquipmentSerializer
    search_fields = ['name', 'room', 'condition']


class UtilityMaintenanceExpenseViewSet(viewsets.ModelViewSet):
    queryset = UtilityMaintenanceExpense.objects.all().select_related('utility')
    serializer_class = UtilityMaintenanceExpenseSerializer
    filterset_fields = ['utility', 'date']
    search_fields = ['description', 'vendor', 'performed_by']

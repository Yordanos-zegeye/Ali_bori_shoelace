from rest_framework import serializers, viewsets
from .models import AuditLog, UniversalMovementLedger


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'


class UniversalMovementLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniversalMovementLedger
        fields = '__all__'


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    filterset_fields = ['who', 'action', 'model_name']
    search_fields = ['who', 'object_repr', 'action']
    ordering_fields = ['-timestamp']


class UniversalMovementLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UniversalMovementLedger.objects.all()
    serializer_class = UniversalMovementLedgerSerializer
    filterset_fields = ['movement_type', 'item_category', 'performed_by']
    search_fields = ['item_identifier', 'item_description', 'reference_no']
    ordering_fields = ['-timestamp']

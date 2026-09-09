from rest_framework import serializers, viewsets
from .models import DocumentRegistry


class DocumentRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRegistry
        fields = '__all__'


class DocumentRegistryViewSet(viewsets.ModelViewSet):
    queryset = DocumentRegistry.objects.all()
    serializer_class = DocumentRegistrySerializer
    filterset_fields = ['document_type', 'room', 'shelf']
    search_fields = ['document_name', 'document_number', 'docx_no', 'description']
    ordering_fields = ['document_name', '-created_at']

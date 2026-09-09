import uuid
from django.db import models


class DocumentRegistry(models.Model):
    class DocumentType(models.TextChoices):
        CERTIFICATE = "CERTIFICATE", "Certificate"
        POLICY = "POLICY", "Company Policy / Agreement"
        REPORT = "REPORT", "Audit / Inspection Report"
        CONTRACT = "CONTRACT", "Contract / Deal Book"
        MANUAL = "MANUAL", "Machine Manual"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_number = models.CharField(max_length=50, blank=True, null=True, help_text="Excel docx no")
    document_name = models.CharField(max_length=255, help_text="Excel name of docx")
    room = models.CharField(max_length=50, blank=True, null=True, help_text="Excel room")
    shelf = models.CharField(max_length=50, blank=True, null=True, help_text="Excel shelf")
    docx_no = models.CharField(max_length=50, blank=True, null=True, help_text="Excel docx no")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices, default=DocumentType.OTHER)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="documents/%Y/%m/", blank=True, null=True)
    uploaded_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['document_name']

    def __str__(self):
        loc = f" (Room: {self.room}, Shelf: {self.shelf})" if self.room or self.shelf else ""
        return f"{self.document_name}{loc}"

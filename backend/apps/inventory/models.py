import uuid
from django.db import models
from apps.catalog.models import Color
from apps.assets.models import SparePart


class StorageLocation(models.Model):
    code = models.CharField(max_length=50, unique=True, help_text="e.g. ST 1, ST 2, Store 1, Warehouse A")
    name = models.CharField(max_length=100)
    building = models.CharField(max_length=50, default="B1")
    room = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class RawMaterialType(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Excel NAME e.g. Polyster yarn")
    code = models.CharField(max_length=50, unique=True)
    unit = models.CharField(max_length=20, default="KG")
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class RawMaterialVariant(models.Model):
    material_type = models.ForeignKey(RawMaterialType, on_delete=models.CASCADE, related_name="variants")
    color = models.ForeignKey(Color, on_delete=models.SET_NULL, null=True, blank=True, related_name="raw_material_variants")
    color_name = models.CharField(max_length=50, help_text="Excel COLOR e.g. black, white, brown, red, gray")
    code = models.CharField(max_length=50, unique=True)
    minimum_stock_kg = models.DecimalField(max_digits=12, decimal_places=2, default=25.00, help_text="Threshold for low-stock alert")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('material_type', 'color_name')

    @property
    def total_available_kg(self):
        return sum(s.available_kg for s in self.stock_records.all())

    @property
    def is_low_stock(self):
        return self.total_available_kg <= self.minimum_stock_kg

    def __str__(self):
        return f"{self.material_type.name} - {self.color_name}"


class RawMaterialStock(models.Model):
    variant = models.ForeignKey(RawMaterialVariant, on_delete=models.CASCADE, related_name="stock_records")
    location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name="raw_material_stocks")
    place_text = models.CharField(max_length=50, blank=True, null=True, help_text="Excel 'place' raw text e.g. ST 1, ST 2")
    st_v = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel ST V")
    st_n = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel ST N")
    total_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel total")
    available_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Available KG for production consumption")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.variant}: Available {self.available_kg} KG (Total: {self.total_kg} KG at {self.place_text})"


class RawMaterialInventoryTransaction(models.Model):
    class TransactionType(models.TextChoices):
        INITIAL_STOCK = "INITIAL_STOCK", "Initial Stock"
        PURCHASE_RECEIPT = "PURCHASE_RECEIPT", "Purchase Receipt"
        PRODUCTION_CONSUMPTION = "PRODUCTION_CONSUMPTION", "Production Consumption"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        TRANSFER = "TRANSFER", "Transfer"
        RETURN = "RETURN", "Return"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.ForeignKey(RawMaterialVariant, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=40, choices=TransactionType.choices)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2, help_text="Positive for addition, negative for consumption")
    balance_after_kg = models.DecimalField(max_digits=12, decimal_places=2)
    reference_batch_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} {self.variant}: {self.quantity_kg} KG"


class StockRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PARTIALLY_ISSUED = "PARTIALLY_ISSUED", "Partially Issued"
        ISSUED = "ISSUED", "Issued"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=50, unique=True, help_text="e.g. REQ-2026-00001")
    requester_name = models.CharField(max_length=100)
    department = models.CharField(max_length=50, default="PRODUCTION")
    reason = models.TextField(help_text="Reason for request e.g. Phase 1 production")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.CharField(max_length=100, blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    issued_by = models.CharField(max_length=100, blank=True, null=True)
    issued_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.request_number} ({self.status}) - {self.requester_name}"


class StockRequestItem(models.Model):
    class ItemType(models.TextChoices):
        RAW_MATERIAL = "RAW_MATERIAL", "Raw Material"
        SPARE_PART = "SPARE_PART", "Spare Part"
        OTHER = "OTHER", "Other"

    stock_request = models.ForeignKey(StockRequest, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.RAW_MATERIAL)
    raw_material_variant = models.ForeignKey(RawMaterialVariant, on_delete=models.SET_NULL, null=True, blank=True)
    spare_part = models.ForeignKey(SparePart, on_delete=models.SET_NULL, null=True, blank=True)
    item_description = models.CharField(max_length=255, blank=True, null=True)
    requested_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    approved_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    issued_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    unit = models.CharField(max_length=20, default="KG")

    def __str__(self):
        return f"{self.stock_request.request_number}: {self.requested_quantity} {self.unit}"

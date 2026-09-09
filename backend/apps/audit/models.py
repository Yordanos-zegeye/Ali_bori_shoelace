import uuid
from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    who = models.CharField(max_length=100, default="System")
    action = models.CharField(max_length=50, help_text="e.g. CREATE, UPDATE, DELETE, DISPATCH, COLLECT_PAYMENT, APPROVE_REQUEST")
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=255, blank=True, null=True)
    changes_json = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.who} {self.action} {self.model_name} ({self.object_repr}) at {self.timestamp}"


class UniversalMovementLedger(models.Model):
    class MovementType(models.TextChoices):
        RAW_MATERIAL_RECEIPT = "RAW_MATERIAL_RECEIPT", "Raw Material Receipt"
        RAW_MATERIAL_CONSUMPTION = "RAW_MATERIAL_CONSUMPTION", "Raw Material Consumption"
        WIP_OUTPUT = "WIP_OUTPUT", "WIP Output (Braiding)"
        WIP_TRANSFER = "WIP_TRANSFER", "WIP Transfer"
        FINISHED_GOODS_ENTRY = "FINISHED_GOODS_ENTRY", "Finished Goods Entry"
        STORE_TRANSFER = "STORE_TRANSFER", "Store Transfer"
        DISPATCH = "DISPATCH", "Sales Dispatch"
        RETURN = "RETURN", "Return"
        ADJUSTMENT = "ADJUSTMENT", "Inventory Adjustment"
        SPARE_PART_RECEIPT = "SPARE_PART_RECEIPT", "Spare Part Receipt"
        SPARE_PART_CONSUMPTION = "SPARE_PART_CONSUMPTION", "Spare Part Consumption"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movement_type = models.CharField(max_length=40, choices=MovementType.choices)
    item_category = models.CharField(max_length=50, help_text="RAW_MATERIAL, WIP, FINISHED_BAG, SPARE_PART")
    item_identifier = models.CharField(max_length=100)
    item_description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, default="KG")
    source_location = models.CharField(max_length=100, blank=True, null=True)
    destination_location = models.CharField(max_length=100, blank=True, null=True)
    reference_no = models.CharField(max_length=100, blank=True, null=True)
    performed_by = models.CharField(max_length=100, default="System")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.movement_type}] {self.quantity} {self.unit} of {self.item_identifier} by {self.performed_by}"

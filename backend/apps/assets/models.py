import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class MachineType(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g. TIPPING, SPINDLE, CH SPINDLE, WINDER, SMALL WINDER")
    description = models.TextField(blank=True, null=True)
    maintenance_interval_days = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Machine(models.Model):
    class Health(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        NEEDS_SERVICE = "NEEDS_SERVICE", "Needs Service"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        MAINTENANCE = "MAINTENANCE", "Under Maintenance"
        OFFLINE = "OFFLINE", "Offline"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    machine_code = models.CharField(max_length=50, unique=True, help_text="Excel NAME e.g. TP 1, TP 2")
    name = models.CharField(max_length=100, blank=True)
    machine_type = models.ForeignKey(MachineType, on_delete=models.SET_NULL, null=True, blank=True, related_name="machines")
    building = models.CharField(max_length=50, default="B1", help_text="e.g. B1, B2")
    room = models.CharField(max_length=50, blank=True, null=True, help_text="Excel room e.g. B, B1")
    product_type = models.CharField(max_length=100, blank=True, null=True, help_text="Excel TYPE OF PRODUCT e.g. CUT")
    place = models.CharField(max_length=50, blank=True, null=True, help_text="Excel place e.g. B1")
    health = models.CharField(max_length=20, choices=Health.choices, default=Health.NORMAL)
    most_frequent_issue = models.CharField(max_length=100, blank=True, null=True, help_text="Excel MOST ISSUE e.g. BOLOJA, BELT, GEAR")
    service_time = models.DateTimeField(blank=True, null=True, help_text="Excel SERVICE TIME")
    last_service_date = models.DateField(blank=True, null=True)
    next_service_date = models.DateField(blank=True, null=True)
    performance_score = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        default=1.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(1.00)],
        help_text="Performance decimal 0.00 to 1.00 e.g. 0.98, 0.45"
    )
    total = models.IntegerField(default=1, help_text="Excel TOTAL count")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    remark = models.CharField(max_length=255, blank=True, null=True, help_text="Excel REMARK e.g. good, imp")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['machine_code']

    def __str__(self):
        return f"{self.machine_code} ({self.health})"


class SparePart(models.Model):
    part_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100, help_text="e.g. MLACH, CHINGA, ADJESTER, SPRING, HEATER, Red Belt")
    compatible_machine_types = models.ManyToManyField(MachineType, blank=True, related_name="compatible_spares")
    for_machine_text = models.CharField(max_length=100, blank=True, null=True, help_text="Excel 'for machine' raw text")
    place = models.CharField(max_length=50, blank=True, null=True, help_text="Excel place e.g. R1")
    room = models.CharField(max_length=50, blank=True, null=True, help_text="Excel room e.g. R11")
    shelf = models.CharField(max_length=50, blank=True, null=True, help_text="Excel shelf e.g. AF")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Current in-stock quantity")
    minimum_stock = models.DecimalField(max_digits=10, decimal_places=2, default=3.00, help_text="Threshold for low-stock notification")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    remark = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    @property
    def is_low_stock(self):
        return self.quantity <= self.minimum_stock

    def __str__(self):
        return f"{self.name} (Qty: {self.quantity})"


class MachineTypeSparePartCompatibility(models.Model):
    machine_type = models.ForeignKey(MachineType, on_delete=models.CASCADE, related_name="compatibility_entries")
    spare_part = models.ForeignKey(SparePart, on_delete=models.CASCADE, related_name="compatibility_entries")
    part_slot = models.CharField(max_length=20, blank=True, null=True, help_text="PART NO1, PART NO2, etc.")
    remark = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        unique_together = ('machine_type', 'spare_part')

    def __str__(self):
        return f"{self.machine_type.name} -> {self.spare_part.name} ({self.part_slot})"


class SparePartInventoryTransaction(models.Model):
    class TransactionType(models.TextChoices):
        INITIAL_STOCK = "INITIAL_STOCK", "Initial Stock"
        PURCHASE = "PURCHASE", "Purchase"
        RECEIPT = "RECEIPT", "Receipt"
        MAINTENANCE_CONSUMPTION = "MAINTENANCE_CONSUMPTION", "Maintenance Consumption"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        TRANSFER = "TRANSFER", "Transfer"
        RETURN = "RETURN", "Return"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spare_part = models.ForeignKey(SparePart, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for addition, negative for deduction")
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_machine = models.ForeignKey(Machine, on_delete=models.SET_NULL, null=True, blank=True, related_name="spare_consumptions")
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} on {self.spare_part.name}: {self.quantity} (Bal: {self.balance_after})"


class UtilityEquipment(models.Model):
    name = models.CharField(max_length=100, help_text="Excel NAME OF UT e.g. DRILL, GRINDER, MIZAN")
    category = models.CharField(max_length=50, default="GENERAL")
    room = models.CharField(max_length=50, blank=True, null=True, help_text="Excel ROOM e.g. B, C")
    quantity = models.IntegerField(default=1, help_text="Excel TOTAL count")
    condition = models.CharField(max_length=50, default="GOOD")
    maintenance_status = models.CharField(max_length=50, default="OPERATIONAL")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remark = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Room {self.room}, Qty: {self.quantity})"


class UtilityMaintenanceExpense(models.Model):
    utility = models.ForeignKey(UtilityEquipment, on_delete=models.CASCADE, related_name="expenses")
    date = models.DateField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    vendor = models.CharField(max_length=100, blank=True, null=True)
    performed_by = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.utility.name} Expense: {self.amount} ETB on {self.date}"

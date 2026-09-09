import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from apps.catalog.models import ProductVariant
from apps.assets.models import Machine
from apps.inventory.models import RawMaterialVariant


class ProductionBatch(models.Model):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        PHASE_1_COMPLETE = "PHASE_1_COMPLETE", "Phase 1 Complete"
        TRANSFERRED = "TRANSFERRED", "Transferred to Building 2"
        PHASE_2_IN_PROGRESS = "PHASE_2_IN_PROGRESS", "Phase 2 In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_number = models.CharField(max_length=50, unique=True, help_text="e.g. BATCH-2026-00001")
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="batches")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PLANNED)
    start_date = models.DateField(auto_now_add=True)
    completion_date = models.DateField(blank=True, null=True)
    supervisor = models.CharField(max_length=100, blank=True, null=True)

    # Raw materials consumed for Phase 1 and Phase 2
    raw_material_yarn = models.ForeignKey(RawMaterialVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name="batches_as_yarn")
    yarn_batch_count = models.IntegerField(default=1, help_text="Number of 32 KG yarn store batches (1 batch = 32 KG, 2 = 64 KG, 3 = 96 KG...)")
    raw_yarn_input_kg = models.DecimalField(max_digits=12, decimal_places=2, default=32.00, help_text="Initial raw yarn weight in KG (batches * 32 KG)")
    
    acetone_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Acetone consumed in Liters/KG")
    film_roll_variant = models.ForeignKey(RawMaterialVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name="batches_as_film")
    film_roll_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Film roll consumed in Rolls/KG")
    stock_request_number = models.CharField(max_length=50, blank=True, null=True, help_text="Linked Inventory Stock Request")

    # Aggregated calculations across Phase 1 & Phase 2
    braided_output_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    phase1_waste_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    tipping_input_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    finished_output_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    phase2_waste_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    total_waste_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    yield_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, help_text="Finished Output / Raw Input * 100")
    waste_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, help_text="Total Waste / Raw Input * 100")

    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.batch_number} ({self.status}) - {self.product_variant}"

    def recalculate_totals(self):
        """
        Calculates official backend totals based on 32 KG batches:
        Total Waste = Phase 1 Waste + Phase 2 Waste
        Yield % = Finished Output / Initial Raw Yarn Input * 100
        Waste % = Total Waste / Initial Raw Yarn Input * 100
        """
        if self.yarn_batch_count and self.yarn_batch_count > 0:
            if not self.raw_yarn_input_kg or self.raw_yarn_input_kg == Decimal('0.00'):
                self.raw_yarn_input_kg = Decimal(str(self.yarn_batch_count * 32.00))
        elif self.raw_yarn_input_kg and self.raw_yarn_input_kg > Decimal('0.00'):
            if not self.yarn_batch_count:
                self.yarn_batch_count = max(1, round(float(self.raw_yarn_input_kg) / 32.0))

        raw_in = Decimal(str(self.raw_yarn_input_kg or 0))
        braid_out = Decimal(str(self.braided_output_kg or 0))
        tip_in = Decimal(str(self.tipping_input_kg or 0))
        fin_out = Decimal(str(self.finished_output_kg or 0))

        self.phase1_waste_kg = max(Decimal('0.00'), raw_in - braid_out)
        self.phase2_waste_kg = max(Decimal('0.00'), tip_in - fin_out)
        self.total_waste_kg = self.phase1_waste_kg + self.phase2_waste_kg

        if raw_in > Decimal('0.00'):
            self.yield_percentage = round((fin_out / raw_in) * Decimal('100.00'), 2)
            self.waste_percentage = round((self.total_waste_kg / raw_in) * Decimal('100.00'), 2)
        else:
            self.yield_percentage = Decimal('0.00')
            self.waste_percentage = Decimal('0.00')

    def clean(self):
        raw_in = Decimal(str(self.raw_yarn_input_kg or 0))
        braid_out = Decimal(str(self.braided_output_kg or 0))
        tip_in = Decimal(str(self.tipping_input_kg or 0))
        fin_out = Decimal(str(self.finished_output_kg or 0))

        if raw_in > Decimal('0.00'):
            if braid_out > raw_in:
                raise ValidationError(f"Braided output ({braid_out:.2f} KG) cannot exceed raw yarn input ({raw_in:.2f} KG).")
            if fin_out > raw_in:
                raise ValidationError(f"Finished shoelaces ({fin_out:.2f} KG) cannot exceed raw yarn input ({raw_in:.2f} KG).")
        if tip_in > Decimal('0.00') and fin_out > tip_in:
            raise ValidationError(f"Finished shoelaces ({fin_out:.2f} KG) cannot exceed tipping incoming lace ({tip_in:.2f} KG).")

    def save(self, *args, **kwargs):
        self.clean()
        self.recalculate_totals()
        super().save(*args, **kwargs)


class ProductionBatchMaterial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(ProductionBatch, on_delete=models.CASCADE, related_name="materials_used")
    raw_material_variant = models.ForeignKey(RawMaterialVariant, on_delete=models.PROTECT, related_name="batch_usages")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, default="KG")
    phase = models.CharField(max_length=20, default="PHASE_1", choices=[("PHASE_1", "Phase 1 - Braiding"), ("PHASE_2", "Phase 2 - Tipping")])
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.batch.batch_number} - {self.raw_material_variant}: {self.quantity} {self.unit}"



class Phase1BraidingRecord(models.Model):
    batch = models.OneToOneField(ProductionBatch, on_delete=models.CASCADE, related_name="phase1_record")
    raw_material_variant = models.ForeignKey(RawMaterialVariant, on_delete=models.PROTECT, related_name="braiding_records")
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT, related_name="braiding_records")
    building = models.CharField(max_length=50, default="Building 1")
    room = models.CharField(max_length=50, default="B1")
    operator = models.CharField(max_length=100)
    input_weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    output_weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    waste_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.input_weight_kg <= 0:
            raise ValidationError("Raw yarn input must be greater than 0 KG.")
        if self.output_weight_kg < 0:
            raise ValidationError("Braided output cannot be negative.")
        if self.output_weight_kg > self.input_weight_kg:
            raise ValidationError(f"Braided output ({self.output_weight_kg} KG) cannot exceed raw yarn input ({self.input_weight_kg} KG).")

    def save(self, *args, **kwargs):
        self.clean()
        self.waste_kg = self.input_weight_kg - self.output_weight_kg
        super().save(*args, **kwargs)
        # Update batch
        batch = self.batch
        batch.raw_yarn_input_kg = self.input_weight_kg
        batch.braided_output_kg = self.output_weight_kg
        batch.phase1_waste_kg = self.waste_kg
        batch.status = ProductionBatch.Status.PHASE_1_COMPLETE
        batch.recalculate_totals()
        batch.save()


class WIPTransfer(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        RECEIVED = "RECEIVED", "Received"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(ProductionBatch, on_delete=models.CASCADE, related_name="transfers")
    source_building = models.CharField(max_length=50, default="Building 1")
    source_room = models.CharField(max_length=50, default="B1")
    destination_building = models.CharField(max_length=50, default="Building 2")
    destination_room = models.CharField(max_length=50, default="B2")
    weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    sender = models.CharField(max_length=100)
    receiver = models.CharField(max_length=100, blank=True, null=True)
    transfer_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.batch.batch_number}: {self.weight_kg} KG -> {self.destination_building}"


class Phase2TippingRecord(models.Model):
    batch = models.OneToOneField(ProductionBatch, on_delete=models.CASCADE, related_name="phase2_record")
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT, related_name="tipping_records")
    building = models.CharField(max_length=50, default="Building 2")
    room = models.CharField(max_length=50, default="B2")
    operator = models.CharField(max_length=100)
    input_weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    finished_output_kg = models.DecimalField(max_digits=12, decimal_places=2)
    waste_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.input_weight_kg <= 0:
            raise ValidationError("Tipping input must be greater than 0 KG.")
        if self.finished_output_kg < 0:
            raise ValidationError("Finished output cannot be negative.")
        if self.finished_output_kg > self.input_weight_kg:
            raise ValidationError(f"Finished output ({self.finished_output_kg} KG) cannot exceed tipping input ({self.input_weight_kg} KG).")

    def save(self, *args, **kwargs):
        self.clean()
        self.waste_kg = self.input_weight_kg - self.finished_output_kg
        super().save(*args, **kwargs)
        # Update batch
        batch = self.batch
        batch.tipping_input_kg = self.input_weight_kg
        batch.finished_output_kg = self.finished_output_kg
        batch.phase2_waste_kg = self.waste_kg
        batch.status = ProductionBatch.Status.COMPLETED
        batch.completion_date = self.date
        batch.recalculate_totals()
        batch.save()

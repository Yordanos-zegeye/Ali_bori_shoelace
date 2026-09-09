import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from apps.catalog.models import ProductVariant
from apps.production.models import ProductionBatch


class FinishedProductBag(models.Model):
    class Status(models.TextChoices):
        IN_STORE = "IN_STORE", "In Store"
        RESERVED = "RESERVED", "Reserved"
        DISPATCHED = "DISPATCHED", "Dispatched"
        RETURNED = "RETURNED", "Returned"
        DAMAGED = "DAMAGED", "Damaged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bag_id = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. ABSL-2026-000001")
    batch = models.ForeignKey(ProductionBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name="bags")
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="finished_bags")
    
    # Flexible sack scale weight: allow packing as much as desired to the store
    weight_kg = models.DecimalField(
        max_digits=8, 
        decimal_places=2,
        validators=[
            MinValueValidator(0.01, message="Bag weight must be greater than 0 KG.")
        ],
        help_text="Measured sack scale weight in KG"
    )
    store_location = models.CharField(max_length=100, default="Finished Goods Store 1")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_STORE, db_index=True)
    entry_date = models.DateField(auto_now_add=True)
    dispatched_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.weight_kg is not None:
            if self.weight_kg <= 0:
                raise ValidationError(f"Invalid bag weight {self.weight_kg} KG. Weight must be greater than 0 KG.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.bag_id or not str(self.bag_id).strip():
            import datetime
            year = datetime.date.today().year
            count = FinishedProductBag.objects.count() + 1
            cand = f"ABSL-{year}-{count:06d}"
            while FinishedProductBag.objects.filter(bag_id=cand).exists():
                count += 1
                cand = f"ABSL-{year}-{count:06d}"
            self.bag_id = cand
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(weight_kg__gt=0),
                name="valid_bag_weight_positive"
            )
        ]

    def __str__(self):
        return f"{self.bag_id} ({self.weight_kg} KG) - {self.product_variant} [{self.status}]"


class StoreMovement(models.Model):
    class MovementType(models.TextChoices):
        STORE_ENTRY = "STORE_ENTRY", "Store Entry"
        STORE_TRANSFER = "STORE_TRANSFER", "Store Transfer"
        STORE_RESERVATION = "STORE_RESERVATION", "Store Reservation"
        DISPATCH = "DISPATCH", "Dispatch"
        RETURN = "RETURN", "Return"
        DAMAGE = "DAMAGE", "Damage"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bag = models.ForeignKey(FinishedProductBag, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    from_location = models.CharField(max_length=100, blank=True, null=True)
    to_location = models.CharField(max_length=100, blank=True, null=True)
    reference_order = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} on {self.bag.bag_id} at {self.created_at}"

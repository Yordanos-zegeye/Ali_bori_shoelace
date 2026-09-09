from decimal import Decimal
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from apps.store.models import FinishedProductBag


class Customer(models.Model):
    class CustomerType(models.TextChoices):
        RETAIL_SHOP = "RETAIL_SHOP", "Retail Shop"
        WHOLESALER = "WHOLESALER", "Wholesaler"
        DISTRIBUTOR = "DISTRIBUTOR", "Distributor"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_code = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. CUST-001")
    name = models.CharField(max_length=150)
    customer_type = models.CharField(max_length=30, choices=CustomerType.choices, default=CustomerType.WHOLESALER)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Maximum allowed credit in ETB")
    current_outstanding = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Current unpaid debt in ETB")
    active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.customer_code}) - Outstanding: {self.current_outstanding} ETB / Limit: {self.credit_limit} ETB"

    @property
    def available_credit(self):
        cl = Decimal(str(self.credit_limit))
        co = Decimal(str(self.current_outstanding))
        return max(Decimal('0.00'), cl - co)

    @property
    def credit_utilization_percent(self):
        cl = Decimal(str(self.credit_limit))
        co = Decimal(str(self.current_outstanding))
        if cl > Decimal('0.00'):
            return round(float((co / cl) * Decimal('100.0')), 1)
        return 0.0


class DispatchOrder(models.Model):
    class PaymentMode(models.TextChoices):
        CASH = "CASH", "Cash"
        CREDIT = "CREDIT", "Credit"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Dispatch"
        COMPLETED = "COMPLETED", "Dispatched"
        PARTIAL = "PARTIAL", "Partially Paid"
        SETTLED = "SETTLED", "Settled / Fully Paid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. DISP-2026-00001")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="dispatch_orders")
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices, default=PaymentMode.CASH)
    total_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Total order amount in ETB")
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    outstanding_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} - {self.customer.name} ({self.total_amount} ETB [{self.payment_mode}])"


class DispatchOrderItem(models.Model):
    dispatch_order = models.ForeignKey(DispatchOrder, on_delete=models.CASCADE, related_name="items")
    bag = models.OneToOneField(FinishedProductBag, on_delete=models.PROTECT, related_name="dispatch_record", help_text="Guarantees a bag is never dispatched twice")
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.weight_kg * self.price_per_kg
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bag.bag_id}: {self.weight_kg} KG @ {self.price_per_kg} ETB/KG = {self.subtotal} ETB"


class Receivable(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PARTIAL = "PARTIAL", "Partially Paid"
        SETTLED = "SETTLED", "Settled"
        OVERDUE = "OVERDUE", "Overdue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispatch_order = models.OneToOneField(DispatchOrder, on_delete=models.CASCADE, related_name="receivable")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="receivables")
    original_amount = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    remaining_amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Receivable for {self.dispatch_order.order_number}: {self.remaining_amount} ETB remaining [{self.status}]"


class PaymentRecord(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer (CBE / Awash)"
        CHEQUE = "CHEQUE", "Cheque"
        TELEBIRR = "TELEBIRR", "Telebirr"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receivable = models.ForeignKey(Receivable, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference_no = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque / bank transaction slip number")
    recorded_by = models.CharField(max_length=100, default="System")
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment of {self.amount} ETB on {self.payment_date} ({self.payment_method})"

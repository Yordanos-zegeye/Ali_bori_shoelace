import uuid
from django.db import models


class Notification(models.Model):
    class Severity(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical"

    class NotificationType(models.TextChoices):
        STOCK_LOW = "STOCK_LOW", "Low Stock"
        STOCK_REQUEST = "STOCK_REQUEST", "Stock Request"
        MAINTENANCE_DUE = "MAINTENANCE_DUE", "Maintenance Due"
        MACHINE_CRITICAL = "MACHINE_CRITICAL", "Machine Critical"
        CREDIT_WARNING = "CREDIT_WARNING", "Credit Warning"
        CREDIT_OVERDUE = "CREDIT_OVERDUE", "Credit Overdue"
        HR_ALERT = "HR_ALERT", "Workforce Exception"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.CharField(max_length=100, default="admin", help_text="Target role or user e.g. store_manager, maintenance_manager, sales_manager")
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    related_model = models.CharField(max_length=100, blank=True, null=True)
    related_object_id = models.CharField(max_length=100, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} -> {self.recipient}"


class NotificationPreference(models.Model):
    role_name = models.CharField(max_length=100, unique=True, help_text="e.g. store_manager, maintenance_manager, sales, admin")
    notify_low_raw_material = models.BooleanField(default=True)
    notify_low_spares = models.BooleanField(default=True)
    notify_stock_requests = models.BooleanField(default=True)
    notify_machine_critical = models.BooleanField(default=True)
    notify_credit_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=80.00, help_text="Threshold % to trigger credit warning")
    notify_credit_overdue = models.BooleanField(default=True)

    def __str__(self):
        return f"Preferences for {self.role_name}"

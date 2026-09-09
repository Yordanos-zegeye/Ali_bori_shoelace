"""
Centralized Notification Service for Ali Bori Shoe Lace Factory ERP.
Prevents notification fatigue by sending only operationally critical alerts to relevant roles.
"""

from decimal import Decimal
from .models import Notification


class NotificationService:
    @staticmethod
    def notify_low_raw_material(variant, current_kg, minimum_kg):
        """
        Notify store manager & production manager when raw material falls below minimum stock.
        """
        title = f"Low Raw Material: {variant.material_type.name} ({variant.color_name})"
        message = f"Stock has fallen to {current_kg} KG, which is below the configured minimum of {minimum_kg} KG."
        
        Notification.objects.create(
            recipient="store_manager",
            notification_type=Notification.NotificationType.STOCK_LOW,
            title=title,
            message=message,
            severity=Notification.Severity.WARNING,
            related_model="RawMaterialVariant",
            related_object_id=str(variant.id)
        )
        Notification.objects.create(
            recipient="production_manager",
            notification_type=Notification.NotificationType.STOCK_LOW,
            title=title,
            message=message,
            severity=Notification.Severity.WARNING,
            related_model="RawMaterialVariant",
            related_object_id=str(variant.id)
        )

    @staticmethod
    def notify_low_spare_part(spare_part, current_qty, minimum_qty):
        """
        Notify maintenance manager when spare part falls below minimum.
        """
        title = f"Spare Part Low Stock: {spare_part.name}"
        message = f"In-stock quantity is {current_qty}, which is below minimum threshold of {minimum_qty}."
        Notification.objects.create(
            recipient="maintenance_manager",
            notification_type=Notification.NotificationType.STOCK_LOW,
            title=title,
            message=message,
            severity=Notification.Severity.WARNING,
            related_model="SparePart",
            related_object_id=str(spare_part.id)
        )

    @staticmethod
    def notify_stock_request_created(stock_request):
        """
        Notify store approver when a new stock request is filed.
        """
        Notification.objects.create(
            recipient="store_manager",
            notification_type=Notification.NotificationType.STOCK_REQUEST,
            title=f"Stock Request Submitted: {stock_request.request_number}",
            message=f"Requester {stock_request.requester_name} ({stock_request.department}) requested items. Reason: {stock_request.reason}",
            severity=Notification.Severity.INFO,
            related_model="StockRequest",
            related_object_id=str(stock_request.id)
        )

    @staticmethod
    def notify_stock_request_status_change(stock_request, action_name):
        """
        Notify the requester when their request is approved, rejected, or issued.
        """
        severity = Notification.Severity.INFO if stock_request.status in ['APPROVED', 'ISSUED'] else Notification.Severity.WARNING
        Notification.objects.create(
            recipient=stock_request.requester_name,
            notification_type=Notification.NotificationType.STOCK_REQUEST,
            title=f"Stock Request {stock_request.request_number}: {stock_request.status}",
            message=f"Your stock request has been marked as {stock_request.status} by {stock_request.approved_by or stock_request.issued_by or 'Manager'}.",
            severity=severity,
            related_model="StockRequest",
            related_object_id=str(stock_request.id)
        )

    @staticmethod
    def notify_machine_critical(machine, reason="Machine reported critical state"):
        """
        Notify maintenance & operations managers when machine becomes CRITICAL.
        """
        title = f"CRITICAL: Machine {machine.machine_code} Needs Immediate Attention"
        message = f"Machine {machine.machine_code} in Room {machine.room} (Building {machine.building}) is marked CRITICAL. Issue: {machine.most_frequent_issue or reason}"
        
        Notification.objects.create(
            recipient="maintenance_manager",
            notification_type=Notification.NotificationType.MACHINE_CRITICAL,
            title=title,
            message=message,
            severity=Notification.Severity.CRITICAL,
            related_model="Machine",
            related_object_id=str(machine.id)
        )
        Notification.objects.create(
            recipient="operations_manager",
            notification_type=Notification.NotificationType.MACHINE_CRITICAL,
            title=title,
            message=message,
            severity=Notification.Severity.CRITICAL,
            related_model="Machine",
            related_object_id=str(machine.id)
        )

    @staticmethod
    def notify_credit_threshold(customer, current_debt, credit_limit):
        """
        Notify sales & finance when customer utilizes >= 80% of credit limit.
        """
        utilization = round((current_debt / credit_limit) * 100, 1) if credit_limit > 0 else 0
        Notification.objects.create(
            recipient="sales_manager",
            notification_type=Notification.NotificationType.CREDIT_WARNING,
            title=f"High Credit Utilization: {customer.name} ({utilization}%)",
            message=f"Customer outstanding debt is {current_debt:,.2f} ETB out of {credit_limit:,.2f} ETB limit ({utilization}% utilized).",
            severity=Notification.Severity.WARNING,
            related_model="Customer",
            related_object_id=str(customer.id)
        )

    @staticmethod
    def notify_receivable_overdue(receivable):
        """
        Notify accounting when credit dispatch becomes overdue.
        """
        Notification.objects.create(
            recipient="accountant",
            notification_type=Notification.NotificationType.CREDIT_OVERDUE,
            title=f"OVERDUE: Invoice {receivable.dispatch_order.order_number}",
            message=f"Outstanding balance {receivable.remaining_amount:,.2f} ETB for {receivable.customer.name} is past due date ({receivable.due_date}).",
            severity=Notification.Severity.CRITICAL,
            related_model="Receivable",
            related_object_id=str(receivable.id)
        )

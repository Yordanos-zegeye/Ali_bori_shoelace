from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.management import call_command
import tempfile
import os

from apps.catalog.views import (
    ProductViewSet, ColorViewSet, ThicknessViewSet,
    ProductVariantViewSet, ProductStockViewSet
)
from apps.assets.views import (
    MachineTypeViewSet, MachineViewSet, SparePartViewSet,
    SparePartInventoryTransactionViewSet, UtilityEquipmentViewSet,
    UtilityMaintenanceExpenseViewSet
)
from apps.inventory.views import (
    StorageLocationViewSet, RawMaterialTypeViewSet,
    RawMaterialVariantViewSet, RawMaterialStockViewSet,
    RawMaterialInventoryTransactionViewSet, StockRequestViewSet
)
from apps.production.views import ProductionBatchViewSet
from apps.store.views import FinishedProductBagViewSet, StoreMovementViewSet
from apps.sales.views import (
    CustomerViewSet, DispatchOrderViewSet, ReceivableViewSet, PaymentRecordViewSet
)
from apps.workforce.views import (
    EmployeeViewSet, AttendanceRecordViewSet, AdditionalPaymentTypeViewSet,
    EmployeeAdditionalPaymentViewSet, PayrollConfigurationViewSet, PayrollPeriodViewSet,
    PayrollSlipViewSet
)
from apps.documents.views import DocumentRegistryViewSet
from apps.notifications.views import NotificationViewSet
from apps.audit.views import AuditLogViewSet, UniversalMovementLedgerViewSet
from core.analytics_view import DashboardAnalyticsView


class ImporterTriggerView(APIView):
    def post(self, request):
        """
        Re-run or upload and run the factory data importer.
        """
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
                for chunk in uploaded_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            try:
                call_command('import_factory_data', tmp_path)
                os.remove(tmp_path)
                return Response({'status': 'success', 'message': 'Custom workbook imported successfully into Neon PostgreSQL!'})
            except Exception as e:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                return Response({'status': 'error', 'message': str(e)}, status=400)
        else:
            try:
                call_command('import_factory_data')
                return Response({'status': 'success', 'message': 'Factory Excel workbook re-imported successfully!'})
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=400)


router = DefaultRouter()

# Catalog
router.register(r'catalog/products', ProductViewSet)
router.register(r'catalog/colors', ColorViewSet)
router.register(r'catalog/thicknesses', ThicknessViewSet)
router.register(r'catalog/variants', ProductVariantViewSet)
router.register(r'catalog/stocks', ProductStockViewSet)

# Assets & Spares
router.register(r'assets/machine-types', MachineTypeViewSet, basename='machine-types')
router.register(r'assets/types', MachineTypeViewSet, basename='machine-types-alias')
router.register(r'assets/machines', MachineViewSet, basename='machines')
router.register(r'assets/spare-parts', SparePartViewSet, basename='spare-parts')
router.register(r'assets/spares', SparePartViewSet, basename='spares')
router.register(r'assets/spare-transactions', SparePartInventoryTransactionViewSet, basename='spare-transactions')
router.register(r'assets/maintenance-logs', SparePartInventoryTransactionViewSet, basename='maintenance-logs')
router.register(r'assets/utilities', UtilityEquipmentViewSet, basename='utilities')
router.register(r'assets/utility-expenses', UtilityMaintenanceExpenseViewSet, basename='utility-expenses')

# Inventory & Raw Materials
router.register(r'inventory/locations', StorageLocationViewSet, basename='locations')
router.register(r'inventory/raw-material-types', RawMaterialTypeViewSet, basename='raw-material-types')
router.register(r'inventory/raw-materials', RawMaterialVariantViewSet, basename='raw-materials')
router.register(r'inventory/variants', RawMaterialVariantViewSet, basename='inventory-variants')
router.register(r'inventory/raw-material-stocks', RawMaterialStockViewSet, basename='raw-material-stocks')
router.register(r'inventory/stocks', RawMaterialStockViewSet, basename='inventory-stocks')
router.register(r'inventory/raw-material-transactions', RawMaterialInventoryTransactionViewSet, basename='raw-material-transactions')
router.register(r'inventory/stock-requests', StockRequestViewSet, basename='stock-requests')

# Production & WIP
router.register(r'production/batches', ProductionBatchViewSet, basename='production-batches')

# Store & Finished Bags
router.register(r'store/bags', FinishedProductBagViewSet, basename='store-bags')
router.register(r'store/movements', StoreMovementViewSet, basename='store-movements')

# Sales, Customers & Credit
router.register(r'sales/customers', CustomerViewSet, basename='customers')
router.register(r'sales/orders', DispatchOrderViewSet, basename='orders')
router.register(r'sales/receivables', ReceivableViewSet, basename='receivables')
router.register(r'sales/payments', PaymentRecordViewSet, basename='payments')

# Workforce, Attendance & Payroll
router.register(r'workforce/employees', EmployeeViewSet, basename='employees')
router.register(r'workforce/attendance', AttendanceRecordViewSet, basename='attendance')
router.register(r'workforce/payment-types', AdditionalPaymentTypeViewSet, basename='payment-types')
router.register(r'workforce/employee-payments', EmployeeAdditionalPaymentViewSet, basename='employee-payments')
router.register(r'workforce/payroll-configs', PayrollConfigurationViewSet, basename='payroll-configs')
router.register(r'workforce/payroll-periods', PayrollPeriodViewSet, basename='payroll-periods')
router.register(r'workforce/payroll-slips', PayrollSlipViewSet, basename='payroll-slips')

# Documents
router.register(r'documents/registry', DocumentRegistryViewSet, basename='documents-registry')
router.register(r'documents/items', DocumentRegistryViewSet, basename='documents-items')

# Notifications & Audit
router.register(r'notifications/items', NotificationViewSet)
router.register(r'audit/logs', AuditLogViewSet)
router.register(r'audit/movements', UniversalMovementLedgerViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
    path('api/v1/analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard_analytics'),
    path('api/v1/importer/trigger/', ImporterTriggerView.as_view(), name='importer_trigger'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

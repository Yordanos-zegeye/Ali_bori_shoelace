from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Avg, F, Q
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.inventory.models import RawMaterialStock, RawMaterialVariant, StockRequest
from apps.production.models import ProductionBatch, Phase1BraidingRecord, Phase2TippingRecord, WIPTransfer
from apps.store.models import FinishedProductBag
from apps.sales.models import DispatchOrder, Receivable, Customer
from apps.assets.models import Machine, SparePart
from apps.workforce.models import Employee, AttendanceRecord
from apps.notifications.models import Notification


class DashboardAnalyticsView(APIView):
    def get(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'store':
            return Response(
                {'error': 'Customer accounts do not have authorization to view internal company analytics.'},
                status=403
            )

        today = timezone.now().date()

        # 1. Raw Materials - Database aggregate
        total_raw_kg = RawMaterialStock.objects.aggregate(total=Sum('available_kg'))['total'] or Decimal('0.00')
        low_stock_raw_count = sum(1 for v in RawMaterialVariant.objects.prefetch_related('stock_records').all() if v.is_low_stock)

        # 2. Production Today - Database aggregate
        p1_agg = Phase1BraidingRecord.objects.filter(date=today).aggregate(
            inp=Sum('input_weight_kg'),
            out=Sum('output_weight_kg'),
            waste=Sum('waste_kg')
        )
        p2_agg = Phase2TippingRecord.objects.filter(date=today).aggregate(
            out=Sum('finished_output_kg'),
            waste=Sum('waste_kg')
        )
        today_input_kg = p1_agg['inp'] or Decimal('0.00')
        today_braided_output_kg = p1_agg['out'] or Decimal('0.00')
        today_output_kg = p2_agg['out'] or Decimal('0.00')
        today_total_waste_kg = (p1_agg['waste'] or Decimal('0.00')) + (p2_agg['waste'] or Decimal('0.00'))

        # Daily production efficiency: average of each batch production rather than simply summing or adding
        today_p1_batch_ids = list(Phase1BraidingRecord.objects.filter(date=today).values_list('batch_id', flat=True))
        today_p2_batch_ids = list(Phase2TippingRecord.objects.filter(date=today).values_list('batch_id', flat=True))
        today_completed_batch_ids = list(ProductionBatch.objects.filter(completion_date=today, status='COMPLETED').values_list('id', flat=True))
        all_today_batch_ids = list(set(today_p1_batch_ids + today_p2_batch_ids + today_completed_batch_ids))

        today_batch_efficiencies = []
        today_batch_wastes = []
        if all_today_batch_ids:
            today_batches = ProductionBatch.objects.filter(id__in=all_today_batch_ids)
            for b in today_batches:
                if b.status == 'COMPLETED' or (b.finished_output_kg and b.finished_output_kg > 0):
                    eff = float(b.yield_percentage)
                    waste = float(b.waste_percentage)
                elif b.raw_yarn_input_kg and b.raw_yarn_input_kg > 0 and b.braided_output_kg and b.braided_output_kg > 0:
                    eff = round((float(b.braided_output_kg) / float(b.raw_yarn_input_kg)) * 100, 2)
                    waste = round((float(b.phase1_waste_kg) / float(b.raw_yarn_input_kg)) * 100, 2)
                else:
                    eff = None
                    waste = None

                if eff is not None and eff > 0:
                    today_batch_efficiencies.append(eff)
                if waste is not None:
                    today_batch_wastes.append(waste)

        # Batch yield & waste average across completed batches
        overall_completed_agg = ProductionBatch.objects.filter(status='COMPLETED').aggregate(
            avg_yield=Avg('yield_percentage'),
            avg_waste=Avg('waste_percentage')
        )
        avg_batch_yield = float(overall_completed_agg['avg_yield'] or 88.0)
        avg_batch_waste = float(overall_completed_agg['avg_waste'] or 12.0)

        if today_batch_efficiencies:
            daily_yield_pct = round(sum(today_batch_efficiencies) / len(today_batch_efficiencies), 1)
            daily_waste_pct = round(sum(today_batch_wastes) / len(today_batch_wastes), 1) if today_batch_wastes else round(100.0 - daily_yield_pct, 1)
        else:
            daily_yield_pct = round(avg_batch_yield, 1)
            daily_waste_pct = round(avg_batch_waste, 1)

        # 3. WIP
        wip_b1 = ProductionBatch.objects.filter(status='PHASE_1_COMPLETE').aggregate(total=Sum('braided_output_kg'))['total'] or Decimal('0.00')
        wip_b2 = WIPTransfer.objects.filter(status=WIPTransfer.Status.RECEIVED).aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')

        # 4. Finished Goods
        store_bags = FinishedProductBag.objects.filter(status=FinishedProductBag.Status.IN_STORE)
        available_bags_count = store_bags.count()
        available_finished_kg = store_bags.aggregate(total=Sum('weight_kg'))['total'] or Decimal('0.00')

        # 5. Sales
        today_dispatches = DispatchOrder.objects.filter(created_at__date=today)
        today_dispatch_count = today_dispatches.count()
        today_sales_etb = today_dispatches.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_sales_etb = DispatchOrder.objects.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        # 6. Credit & Receivables
        rec_agg = Receivable.objects.filter(remaining_amount__gt=0).aggregate(
            total=Sum('remaining_amount'),
            overdue=Sum('remaining_amount', filter=Q(due_date__lt=today))
        )
        total_receivables_etb = rec_agg['total'] or Decimal('0.00')
        overdue_receivables_etb = rec_agg['overdue'] or Decimal('0.00')

        cust_agg = Customer.objects.aggregate(
            limits=Sum('credit_limit'),
            outstanding=Sum('current_outstanding')
        )
        total_credit_limits = cust_agg['limits'] or Decimal('0.00')
        total_outstanding_all = cust_agg['outstanding'] or Decimal('0.00')
        overall_credit_utilization = round((float(total_outstanding_all) / float(total_credit_limits)) * 100, 1) if total_credit_limits > 0 else 0.0

        # 7. Machines Fleet Health (direct count queries)
        normal_machines = Machine.objects.filter(health=Machine.Health.NORMAL).count()
        service_machines = Machine.objects.filter(health=Machine.Health.NEEDS_SERVICE).count()
        critical_machines = Machine.objects.filter(health=Machine.Health.CRITICAL).count()
        total_machines = Machine.objects.count()

        # 8. Workforce
        total_employees = Employee.objects.filter(employment_status=Employee.EmploymentStatus.ACTIVE).count()
        att_today = AttendanceRecord.objects.filter(date=today)
        present_today = att_today.filter(status=AttendanceRecord.Status.PRESENT).count()
        absent_today = att_today.filter(status=AttendanceRecord.Status.ABSENT).count()
        today_ot_hours = att_today.aggregate(ot=Sum('overtime_hours'))['ot'] or Decimal('0.00')

        # 9. Alerts
        critical_alerts = Notification.objects.filter(is_read=False, severity=Notification.Severity.CRITICAL).count()
        pending_stock_requests = StockRequest.objects.filter(status=StockRequest.Status.PENDING).count()
        low_spares_count = SparePart.objects.filter(quantity__lte=F('minimum_stock')).count()

        return Response({
            'raw_materials': {
                'total_kg': float(total_raw_kg),
                'low_stock_count': low_stock_raw_count,
            },
            'production': {
                'today_input_kg': float(today_input_kg),
                'today_braided_output_kg': float(today_braided_output_kg),
                'today_output_kg': float(today_output_kg),
                'today_waste_kg': float(today_total_waste_kg),
                'waste_percentage': float(daily_waste_pct),
                'yield_percentage': float(daily_yield_pct),
                'today_batch_count': len(today_batch_efficiencies),
            },
            'wip': {
                'building_1_kg': float(wip_b1),
                'building_2_kg': float(wip_b2),
            },
            'finished_goods': {
                'available_bags': available_bags_count,
                'available_kg': float(available_finished_kg),
            },
            'sales': {
                'today_dispatches': today_dispatch_count,
                'today_sales_etb': float(today_sales_etb),
                'total_sales_etb': float(total_sales_etb),
            },
            'credit': {
                'total_receivables_etb': float(total_receivables_etb),
                'overdue_etb': float(overdue_receivables_etb),
                'credit_utilization_percent': float(overall_credit_utilization),
            },
            'machines': {
                'total': total_machines,
                'normal': normal_machines,
                'needs_service': service_machines,
                'critical': critical_machines,
            },
            'workforce': {
                'total_employees': total_employees,
                'present_today': present_today if att_today.exists() else total_employees,
                'absent_today': absent_today,
                'overtime_hours': float(today_ot_hours),
            },
            'alerts': {
                'critical_count': critical_alerts,
                'pending_stock_requests': pending_stock_requests,
                'low_spares_count': low_spares_count,
            }
        })

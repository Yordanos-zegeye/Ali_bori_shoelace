from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Employee, AttendanceRecord, AdditionalPaymentType,
    EmployeeAdditionalPayment, PayrollConfiguration,
    PayrollPeriod, PayrollSlip
)


class EmployeeSerializer(serializers.ModelSerializer):
    attendance_count = serializers.IntegerField(source='attendance_records.count', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'


class AdditionalPaymentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalPaymentType
        fields = '__all__'


class EmployeeAdditionalPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    payment_name = serializers.CharField(source='payment_type.name', read_only=True)

    class Meta:
        model = EmployeeAdditionalPayment
        fields = '__all__'


class PayrollConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollConfiguration
        fields = '__all__'


class PayrollSlipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    work_room = serializers.CharField(source='employee.work_room', read_only=True)

    class Meta:
        model = PayrollSlip
        fields = '__all__'


class PayrollPeriodSerializer(serializers.ModelSerializer):
    slips = PayrollSlipSerializer(many=True, read_only=True)
    employee_count = serializers.IntegerField(source='slips.count', read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = '__all__'


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filterset_fields = ['work_room', 'employment_status', 'gender']
    search_fields = ['name', 'employee_id', 'work_room', 'remark']
    ordering_fields = ['name', 'base_salary', 'performance_score']


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().select_related('employee')
    serializer_class = AttendanceRecordSerializer
    filterset_fields = ['date', 'status', 'employee', 'is_saturday']
    search_fields = ['employee__name', 'notes']
    ordering_fields = ['-date', 'employee__name']

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """
        Record daily attendance for multiple employees at once.
        """
        data = request.data
        att_date = data.get('date', timezone.now().date())
        records = data.get('records', [])  # list of {employee_id, status, overtime_hours, is_saturday, notes}

        created = []
        updated = []
        with transaction.atomic():
            for r in records:
                emp_id = r.get('employee_id')
                rec, is_created = AttendanceRecord.objects.update_or_create(
                    employee_id=emp_id,
                    date=att_date,
                    defaults={
                        'status': r.get('status', AttendanceRecord.Status.PRESENT),
                        'check_in': r.get('check_in'),
                        'check_out': r.get('check_out'),
                        'overtime_hours': Decimal(str(r.get('overtime_hours', 0))),
                        'is_saturday': r.get('is_saturday', False),
                        'notes': r.get('notes', ''),
                    }
                )
                if is_created:
                    created.append(rec)
                else:
                    updated.append(rec)

        return Response({
            'message': f"Marked attendance for {len(created) + len(updated)} employees on {att_date}.",
            'created_count': len(created),
            'updated_count': len(updated),
        })


class AdditionalPaymentTypeViewSet(viewsets.ModelViewSet):
    queryset = AdditionalPaymentType.objects.all()
    serializer_class = AdditionalPaymentTypeSerializer
    search_fields = ['name', 'target_group']


class EmployeeAdditionalPaymentViewSet(viewsets.ModelViewSet):
    queryset = EmployeeAdditionalPayment.objects.all().select_related('employee', 'payment_type')
    serializer_class = EmployeeAdditionalPaymentSerializer


class PayrollConfigurationViewSet(viewsets.ModelViewSet):
    queryset = PayrollConfiguration.objects.all()
    serializer_class = PayrollConfigurationSerializer


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all().prefetch_related('slips__employee')
    serializer_class = PayrollPeriodSerializer
    ordering_fields = ['-start_date']

    @action(detail=True, methods=['post'], url_path='calculate')
    def calculate_payroll(self, request, pk=None):
        """
        Calculates employee salaries for this period based on attendance and admin-configured deduction rules.
        Historical integrity: Stores config snapshot in the period so future changes do not affect past runs!
        """
        period = self.get_object()
        config = PayrollConfiguration.objects.filter(is_active=True).first()
        if not config:
            config = PayrollConfiguration.objects.create(name="Default Policy")

        # Freeze config snapshot
        config_snapshot = {
            'config_id': config.id,
            'name': config.name,
            'working_days_per_period': config.working_days_per_period,
            'absence_deduction_method': config.absence_deduction_method,
            'absence_deduction_rate': float(config.absence_deduction_rate),
            'overtime_hourly_multiplier': float(config.overtime_hourly_multiplier),
            'saturday_rate': float(config.saturday_rate),
        }
        period.config_snapshot = config_snapshot

        working_days = Decimal(str(period.working_days or config.working_days_per_period or 26))
        employees = Employee.objects.filter(employment_status=Employee.EmploymentStatus.ACTIVE)

        total_gross = Decimal('0.00')
        total_deduct = Decimal('0.00')
        total_net = Decimal('0.00')

        with transaction.atomic():
            PayrollSlip.objects.filter(payroll_period=period).delete()  # replace existing slips

            for emp in employees:
                base_sal = emp.base_salary

                # Count attendance in date range
                att_records = AttendanceRecord.objects.filter(
                    employee=emp,
                    date__gte=period.start_date,
                    date__lte=period.end_date
                )
                present_days = att_records.filter(status=AttendanceRecord.Status.PRESENT).count()
                absent_days = att_records.filter(status=AttendanceRecord.Status.ABSENT).count()
                late_days = att_records.filter(status=AttendanceRecord.Status.LATE).count()
                half_days = att_records.filter(status=AttendanceRecord.Status.HALF_DAY).count()
                leave_days = att_records.filter(status=AttendanceRecord.Status.LEAVE).count()
                saturday_worked = att_records.filter(is_saturday=True, status=AttendanceRecord.Status.PRESENT).count()
                total_ot_hours = sum(r.overtime_hours for r in att_records)

                # Effective absent days (half day counts as 0.5 absent)
                effective_absent = Decimal(str(absent_days)) + (Decimal(str(half_days)) * Decimal('0.5'))

                # Absence Deduction Calculation (Section 32)
                method = config.absence_deduction_method
                if method == PayrollConfiguration.AbsenceDeductionMethod.DAILY_RATE:
                    daily_rate = base_sal / working_days if working_days > 0 else Decimal('0.00')
                    absence_deduction = round(daily_rate * effective_absent, 2)
                    deduction_formula = f"Daily Rate ({base_sal:,.2f} / {working_days} = {daily_rate:,.2f}) * {effective_absent} days"
                elif method == PayrollConfiguration.AbsenceDeductionMethod.PERCENTAGE_OF_SALARY:
                    rate_pct = config.absence_deduction_rate
                    absence_deduction = round(base_sal * rate_pct * effective_absent, 2)
                    deduction_formula = f"Percentage ({base_sal:,.2f} * {rate_pct*100}% * {effective_absent} days)"
                else:  # FIXED_AMOUNT
                    fixed_amt = config.absence_deduction_rate
                    absence_deduction = round(fixed_amt * effective_absent, 2)
                    deduction_formula = f"Fixed Amount ({fixed_amt:,.2f} ETB * {effective_absent} days)"

                # Overtime calculation: (Base Salary / (Working Days * 8)) * Multiplier * OT Hours
                hourly_base = (base_sal / (working_days * Decimal('8.0'))) if working_days > 0 else Decimal('0.00')
                overtime_pay = round(hourly_base * config.overtime_hourly_multiplier * total_ot_hours, 2)

                # Saturday payments
                saturday_pay = round(Decimal(str(saturday_worked)) * (config.saturday_rate / Decimal('4.0')), 2) if saturday_worked > 0 else Decimal('0.00')

                # Additional approved payments (e.g. food allowance)
                additional_additions = Decimal('0.00')
                emp_additions = EmployeeAdditionalPayment.objects.filter(employee=emp, active=True)
                for ea in emp_additions:
                    additional_additions += ea.amount

                gross_salary = base_sal + overtime_pay + saturday_pay + additional_additions
                other_deductions = Decimal('0.00')
                total_deductions_emp = absence_deduction + other_deductions
                net_salary = max(Decimal('0.00'), gross_salary - total_deductions_emp)

                calc_details = {
                    'base_salary': float(base_sal),
                    'working_days': int(working_days),
                    'present_days': present_days,
                    'absent_days': absent_days,
                    'effective_absent_days': float(effective_absent),
                    'deduction_method': method,
                    'deduction_formula': deduction_formula,
                    'absence_deduction': float(absence_deduction),
                    'overtime_hours': float(total_ot_hours),
                    'overtime_pay': float(overtime_pay),
                    'saturday_worked_days': saturday_worked,
                    'saturday_pay': float(saturday_pay),
                    'additional_allowances': float(additional_additions),
                    'net_salary': float(net_salary),
                }

                PayrollSlip.objects.create(
                    payroll_period=period,
                    employee=emp,
                    base_salary=base_sal,
                    working_days=int(working_days),
                    present_days=present_days,
                    absent_days=absent_days,
                    late_days=late_days,
                    leave_days=leave_days,
                    overtime_hours=total_ot_hours,
                    overtime_pay=overtime_pay,
                    saturday_pay=saturday_pay,
                    additional_allowances=additional_additions,
                    absence_deduction=absence_deduction,
                    other_deductions=other_deductions,
                    net_salary=net_salary,
                    calculation_details=calc_details,
                    status="CALCULATED"
                )

                total_gross += gross_salary
                total_deduct += total_deductions_emp
                total_net += net_salary

            period.total_gross_salary = total_gross
            period.total_deductions = total_deduct
            period.total_net_salary = total_net
            period.status = PayrollPeriod.Status.CALCULATED
            period.save()

        period.refresh_from_db()
        return Response(PayrollPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        period = self.get_object()
        period.status = PayrollPeriod.Status.APPROVED
        period.save()
        period.slips.update(status="APPROVED")
        return Response(PayrollPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        period = self.get_object()
        period.status = PayrollPeriod.Status.PAID
        period.save()
        now = timezone.now()
        period.slips.update(status="PAID", paid_at=now)
        return Response(PayrollPeriodSerializer(period).data)


class PayrollSlipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PayrollSlip.objects.all().select_related('employee', 'payroll_period')
    serializer_class = PayrollSlipSerializer
    filterset_fields = ['payroll_period', 'employee', 'status']
    search_fields = ['employee__name', 'employee__employee_id']


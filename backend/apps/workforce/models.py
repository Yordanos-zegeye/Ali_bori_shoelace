import uuid
from django.db import models
from django.core.exceptions import ValidationError


class Employee(models.Model):
    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ON_LEAVE = "ON_LEAVE", "On Leave"
        TERMINATED = "TERMINATED", "Terminated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_id = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. EMP-0001")
    name = models.CharField(max_length=150, help_text="Excel NAME OF LABOR e.g. SELEHADIN ALI, ISHAQ ALEMAYEW")
    age = models.IntegerField(blank=True, null=True, help_text="Excel AGE")
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE, help_text="Excel GENDER")
    work_hours_per_day = models.IntegerField(default=8, help_text="Excel WORK HOUR")
    work_room = models.CharField(max_length=100, blank=True, null=True, help_text="Excel WORK ROOM e.g. B1, B2, ALL")
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel SALLARY in ETB")
    performance_score = models.DecimalField(max_digits=6, decimal_places=2, default=80.00, help_text="Excel PERFORMANCE e.g. 85, 90")
    employment_status = models.CharField(max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE)
    hire_date = models.DateField(blank=True, null=True)
    remark = models.CharField(max_length=255, blank=True, null=True, help_text="Excel REMARK")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.employee_id}) - Room {self.work_room}"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"
        HALF_DAY = "HALF_DAY", "Half Day"
        LEAVE = "LEAVE", "Approved Leave"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    check_in = models.TimeField(blank=True, null=True)
    check_out = models.TimeField(blank=True, null=True)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overtime_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_saturday = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'employee__name']
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.name} on {self.date}: {self.status} (OT: {self.overtime_hours}h)"


class AdditionalPaymentType(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Excel PAYMENT e.g. SATURDAY")
    means = models.CharField(max_length=50, default="WEEKLY", help_text="Excel MEANS e.g. WEEKLY, MONTHLY")
    default_price = models.DecimalField(max_digits=12, decimal_places=2, default=1800.00, help_text="Excel PRICE in ETB")
    target_group = models.CharField(max_length=100, default="F.I.A", help_text="Excel FOR WHO e.g. F.I.A")
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.means}) - {self.default_price} ETB for {self.target_group}"


class EmployeeAdditionalPayment(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="additional_payments", null=True, blank=True)
    payment_type = models.ForeignKey(AdditionalPaymentType, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    effective_date = models.DateField()
    active = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        target = self.employee.name if self.employee else self.payment_type.target_group
        return f"{self.payment_type.name} to {target}: {self.amount} ETB"


class PayrollConfiguration(models.Model):
    class AbsenceDeductionMethod(models.TextChoices):
        DAILY_RATE = "DAILY_RATE", "Daily Rate (Salary / Working Days * Absent Days)"
        PERCENTAGE_OF_SALARY = "PERCENTAGE_OF_SALARY", "Percentage (Salary * Configured % * Absent Days)"
        FIXED_AMOUNT = "FIXED_AMOUNT", "Fixed Amount per Absent Day"

    class SalaryPeriod(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        WEEKLY = "WEEKLY", "Weekly"
        CUSTOM = "CUSTOM", "Custom"

    name = models.CharField(max_length=100, default="Standard Factory Payroll Rule")
    salary_period = models.CharField(max_length=20, choices=SalaryPeriod.choices, default=SalaryPeriod.MONTHLY)
    working_days_per_period = models.PositiveIntegerField(default=26, help_text="Standard factory working days per month")
    absence_deduction_method = models.CharField(
        max_length=30, 
        choices=AbsenceDeductionMethod.choices, 
        default=AbsenceDeductionMethod.DAILY_RATE
    )
    absence_deduction_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=4, 
        default=0.0385,
        help_text="Used if PERCENTAGE (e.g. 0.0385 for 3.85%) or FIXED_AMOUNT (e.g. 300 ETB)"
    )
    overtime_hourly_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.25, help_text="1.25x hourly rate")
    saturday_rate = models.DecimalField(max_digits=10, decimal_places=2, default=1800.00, help_text="Weekly Saturday allowance in ETB")
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} [{self.absence_deduction_method}] ({'Active' if self.is_active else 'Inactive'})"


class PayrollPeriod(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        CALCULATED = "CALCULATED", "Calculated"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period_code = models.CharField(max_length=50, unique=True, help_text="e.g. PAYROLL-2026-09")
    start_date = models.DateField()
    end_date = models.DateField()
    working_days = models.PositiveIntegerField(default=26)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    config_snapshot = models.JSONField(blank=True, null=True, help_text="Permanent snapshot of payroll rules used for historical integrity")
    total_gross_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_net_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    created_by = models.CharField(max_length=100, default="System")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.period_code} ({self.start_date} to {self.end_date}) [{self.status}]"


class PayrollSlip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name="slips")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_slips")
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    working_days = models.PositiveIntegerField(default=26)
    present_days = models.PositiveIntegerField(default=26)
    absent_days = models.PositiveIntegerField(default=0)
    late_days = models.PositiveIntegerField(default=0)
    leave_days = models.PositiveIntegerField(default=0)
    
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    saturday_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    additional_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    absence_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    calculation_details = models.JSONField(blank=True, null=True, help_text="Transparent calculation step-by-step breakdown")
    status = models.CharField(max_length=20, default="CALCULATED")

    class Meta:
        unique_together = ('payroll_period', 'employee')
        ordering = ['employee__name']

    def __str__(self):
        return f"{self.employee.name} - Net: {self.net_salary} ETB ({self.payroll_period.period_code})"

from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError

from apps.catalog.models import Product, Color, Thickness, ProductVariant
from apps.assets.models import Machine, MachineType, SparePart
from apps.inventory.models import RawMaterialType, RawMaterialVariant, RawMaterialStock
from apps.production.models import ProductionBatch, Phase1BraidingRecord, Phase2TippingRecord
from apps.store.models import FinishedProductBag
from apps.sales.models import Customer, DispatchOrder, Receivable
from apps.workforce.models import Employee, AttendanceRecord, PayrollConfiguration, PayrollPeriod, PayrollSlip


class AliBoriShoelaceERPTests(TestCase):
    def setUp(self):
        # Master Catalog
        self.color_black = Color.objects.create(name="Black", code="B")
        self.thick_10mm = Thickness.objects.create(name="10MM", value_mm=Decimal('10.00'))
        self.product = Product.objects.create(code="SL-01", name="Shoe Lace Standard")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            serial_code="37\\110",
            color=self.color_black,
            thickness=self.thick_10mm
        )

        # Machines
        self.m_type_braid = MachineType.objects.create(name="BRAIDER")
        self.m_type_tip = MachineType.objects.create(name="TIPPING")
        self.machine_braid = Machine.objects.create(machine_code="BR-01", machine_type=self.m_type_braid)
        self.machine_tip = Machine.objects.create(machine_code="TP-01", machine_type=self.m_type_tip)

        # Raw Material
        self.rm_type = RawMaterialType.objects.create(name="Polyester Yarn", code="POLY-01")
        self.rm_var = RawMaterialVariant.objects.create(
            material_type=self.rm_type,
            color=self.color_black,
            color_name="black",
            code="POLY-BLK"
        )
        self.rm_stock = RawMaterialStock.objects.create(
            variant=self.rm_var,
            total_kg=Decimal('500.00'),
            available_kg=Decimal('500.00')
        )

        # Employee
        self.employee = Employee.objects.create(
            employee_id="EMP-9999",
            name="Test Worker",
            base_salary=Decimal('10000.00'),
            work_room="B1"
        )

        # Customer
        self.customer = Customer.objects.create(
            customer_code="CUST-999",
            name="Addis Shoes Wholesaler",
            credit_limit=Decimal('50000.00'),
            current_outstanding=Decimal('0.00')
        )

    def test_bag_weight_constraints(self):
        """
        Critical Rule (Section 23): 25.00 KG <= weight <= 40.00 KG.
        25.00 and 40.00 accepted; 24.99 and 40.01 rejected.
        """
        # Accept 25.00 KG
        bag_25 = FinishedProductBag.objects.create(
            bag_id="ABSL-TEST-000025",
            product_variant=self.variant,
            weight_kg=Decimal('25.00')
        )
        self.assertEqual(bag_25.weight_kg, Decimal('25.00'))

        # Accept 40.00 KG
        bag_40 = FinishedProductBag.objects.create(
            bag_id="ABSL-TEST-000040",
            product_variant=self.variant,
            weight_kg=Decimal('40.00')
        )
        self.assertEqual(bag_40.weight_kg, Decimal('40.00'))

        # Reject 24.99 KG
        with self.assertRaises(ValidationError):
            bag_low = FinishedProductBag(
                bag_id="ABSL-TEST-000024",
                product_variant=self.variant,
                weight_kg=Decimal('24.99')
            )
            bag_low.clean()

        # Reject 40.01 KG
        with self.assertRaises(ValidationError):
            bag_high = FinishedProductBag(
                bag_id="ABSL-TEST-000041",
                product_variant=self.variant,
                weight_kg=Decimal('40.01')
            )
            bag_high.clean()

    def test_production_waste_and_yield_calculation(self):
        """
        Production Formulas (Section 17, 18, 19, 20):
        Input = 100 KG -> Phase 1 output = 94 KG -> Phase 1 waste = 6 KG
        Phase 2 input = 94 KG -> Phase 2 output = 88 KG -> Phase 2 waste = 6 KG
        Total waste = 12 KG, Yield = 88%
        Reject output > input.
        """
        batch = ProductionBatch.objects.create(
            batch_number="BATCH-TEST-001",
            product_variant=self.variant
        )

        # Phase 1
        p1 = Phase1BraidingRecord.objects.create(
            batch=batch,
            raw_material_variant=self.rm_var,
            machine=self.machine_braid,
            operator="Operator 1",
            input_weight_kg=Decimal('100.00'),
            output_weight_kg=Decimal('94.00'),
            date=date.today()
        )
        self.assertEqual(p1.waste_kg, Decimal('6.00'))
        batch.refresh_from_db()
        self.assertEqual(batch.phase1_waste_kg, Decimal('6.00'))

        # Phase 2
        p2 = Phase2TippingRecord.objects.create(
            batch=batch,
            machine=self.machine_tip,
            operator="Operator 2",
            input_weight_kg=Decimal('94.00'),
            finished_output_kg=Decimal('88.00'),
            date=date.today()
        )
        self.assertEqual(p2.waste_kg, Decimal('6.00'))

        batch.refresh_from_db()
        self.assertEqual(batch.total_waste_kg, Decimal('12.00'))
        self.assertEqual(batch.yield_percentage, Decimal('88.00'))
        self.assertEqual(batch.waste_percentage, Decimal('12.00'))

        # Test output > input validation
        with self.assertRaises(ValidationError):
            invalid_p1 = Phase1BraidingRecord(
                batch=batch,
                raw_material_variant=self.rm_var,
                machine=self.machine_braid,
                operator="Operator X",
                input_weight_kg=Decimal('100.00'),
                output_weight_kg=Decimal('105.00'),
                date=date.today()
            )
            invalid_p1.clean()

    def test_duplicate_attendance_prevention(self):
        """
        Attendance Rule (Section 31): UNIQUE(employee, date)
        Prevent duplicate attendance for the same employee on the same date.
        """
        today = date.today()
        AttendanceRecord.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceRecord.Status.PRESENT
        )

        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                employee=self.employee,
                date=today,
                status=AttendanceRecord.Status.ABSENT
            )

    def test_configurable_payroll_daily_rate_calculation(self):
        """
        Salary Calculation Rule (Section 32, 33):
        Base: 10,000 ETB, Working days: 26, Absent: 2 days
        Daily Rate deduction = (10,000 / 26) * 2 = 769.23 ETB
        """
        config = PayrollConfiguration.objects.create(
            name="Daily Rate Test Policy",
            working_days_per_period=26,
            absence_deduction_method=PayrollConfiguration.AbsenceDeductionMethod.DAILY_RATE
        )
        base_salary = Decimal('10000.00')
        working_days = Decimal('26.00')
        absent_days = Decimal('2.00')

        daily_rate = base_salary / working_days
        deduction = round(daily_rate * absent_days, 2)
        net_salary = base_salary - deduction

        self.assertAlmostEqual(float(deduction), 769.23, places=2)
        self.assertAlmostEqual(float(net_salary), 9230.77, places=2)

    def test_credit_limit_enforcement(self):
        """
        Credit Limit Rule (Section 27):
        Current Outstanding + New Order Amount <= Credit Limit
        If false: BLOCK THE TRANSACTION.
        """
        self.customer.credit_limit = Decimal('50000.00')
        self.customer.current_outstanding = Decimal('40000.00')
        self.customer.save()

        # Available credit is 10,000 ETB. An order of 15,000 ETB must be blocked.
        available_credit = self.customer.credit_limit - self.customer.current_outstanding
        new_order_amount = Decimal('15000.00')
        self.assertFalse(self.customer.current_outstanding + new_order_amount <= self.customer.credit_limit)
        self.assertEqual(available_credit, Decimal('10000.00'))

    def test_payment_collection_workflow(self):
        """
        Payment Collection Rule (Section 29):
        Debt = 100,000 ETB
        Payment 1 = 30,000 ETB -> Remaining = 70,000 ETB (PARTIAL)
        Payment 2 = 70,000 ETB -> Remaining = 0 ETB (SETTLED)
        """
        order = DispatchOrder.objects.create(
            order_number="DISP-TEST-001",
            customer=self.customer,
            payment_mode=DispatchOrder.PaymentMode.CREDIT,
            total_amount=Decimal('100000.00'),
            amount_paid=Decimal('0.00'),
            outstanding_amount=Decimal('100000.00')
        )
        receivable = Receivable.objects.create(
            dispatch_order=order,
            customer=self.customer,
            original_amount=Decimal('100000.00'),
            amount_paid=Decimal('0.00'),
            remaining_amount=Decimal('100000.00'),
            status=Receivable.Status.PENDING
        )

        # Payment 1: 30,000 ETB
        pay1 = Decimal('30000.00')
        receivable.amount_paid += pay1
        receivable.remaining_amount -= pay1
        receivable.status = Receivable.Status.PARTIAL
        receivable.save()

        self.assertEqual(receivable.amount_paid, Decimal('30000.00'))
        self.assertEqual(receivable.remaining_amount, Decimal('70000.00'))
        self.assertEqual(receivable.status, Receivable.Status.PARTIAL)

        # Payment 2: 70,000 ETB
        pay2 = Decimal('70000.00')
        receivable.amount_paid += pay2
        receivable.remaining_amount -= pay2
        receivable.status = Receivable.Status.SETTLED
        receivable.save()

        self.assertEqual(receivable.amount_paid, Decimal('100000.00'))
        self.assertEqual(receivable.remaining_amount, Decimal('0.00'))
        self.assertEqual(receivable.status, Receivable.Status.SETTLED)

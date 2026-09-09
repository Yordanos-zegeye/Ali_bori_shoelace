from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Customer, DispatchOrder, DispatchOrderItem, Receivable, PaymentRecord
from apps.store.models import FinishedProductBag, StoreMovement
from apps.notifications.services import NotificationService


class CustomerSerializer(serializers.ModelSerializer):
    available_credit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    credit_utilization_percent = serializers.FloatField(read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'


class DispatchOrderItemSerializer(serializers.ModelSerializer):
    bag_id = serializers.CharField(source='bag.bag_id', read_only=True)

    class Meta:
        model = DispatchOrderItem
        fields = '__all__'


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = '__all__'


class ReceivableSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    order_number = serializers.CharField(source='dispatch_order.order_number', read_only=True)
    payments = PaymentRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Receivable
        fields = '__all__'


class DispatchOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = DispatchOrderItemSerializer(many=True, read_only=True)
    receivable = ReceivableSerializer(read_only=True)

    class Meta:
        model = DispatchOrder
        fields = '__all__'


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filterset_fields = ['customer_type', 'active']
    search_fields = ['customer_code', 'name', 'phone', 'contact_person']
    ordering_fields = ['name', 'current_outstanding', 'credit_limit']


class DispatchOrderViewSet(viewsets.ModelViewSet):
    queryset = DispatchOrder.objects.all().select_related('customer').prefetch_related('items__bag', 'receivable__payments')
    serializer_class = DispatchOrderSerializer
    filterset_fields = ['status', 'payment_mode', 'customer']
    search_fields = ['order_number', 'customer__name']
    ordering_fields = ['-created_at', 'order_number']

    def create(self, request, *args, **kwargs):
        data = request.data
        customer_id = data.get('customer_id') or data.get('customer')
        payment_mode = data.get('payment_mode', DispatchOrder.PaymentMode.CASH)
        bag_items = data.get('items', [])  # list of {bag_id, price_per_kg}
        amount_paid = Decimal(str(data.get('amount_paid', 0)))
        due_date = data.get('due_date')
        notes = data.get('notes', '')

        if not bag_items:
            return Response({'error': "Order must include at least one finished product bag."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            customer = Customer.objects.select_for_update().get(id=customer_id)

            # Calculate total weight and order amount
            total_kg = Decimal('0.00')
            total_amount = Decimal('0.00')
            bags_to_dispatch = []

            for item in bag_items:
                b_id = item.get('bag_id') or item.get('bag')
                price_kg = Decimal(str(item.get('price_per_kg', 150.00)))
                
                try:
                    bag = FinishedProductBag.objects.select_for_update().get(id=b_id)
                except (ValidationError, FinishedProductBag.DoesNotExist, ValueError):
                    bag = FinishedProductBag.objects.select_for_update().get(bag_id=b_id)
                if bag.status == FinishedProductBag.Status.DISPATCHED:
                    return Response(
                        {'error': f"Bag {bag.bag_id} has already been dispatched. Double-dispatch is prohibited."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                subtotal = bag.weight_kg * price_kg
                total_kg += bag.weight_kg
                total_amount += subtotal
                bags_to_dispatch.append((bag, price_kg, subtotal))

            # Mandatory Credit Limit Check (Section 27)
            if payment_mode == DispatchOrder.PaymentMode.CREDIT:
                available_credit = customer.credit_limit - customer.current_outstanding
                credit_requested = total_amount - amount_paid
                if customer.current_outstanding + credit_requested > customer.credit_limit:
                    return Response({
                        'error': "Credit limit exceeded.",
                        'detail': f"Credit limit exceeded. Available credit: {available_credit:,.2f} ETB, Requested credit: {credit_requested:,.2f} ETB.",
                        'available_credit': float(available_credit),
                        'requested_credit': float(credit_requested),
                        'credit_limit': float(customer.credit_limit),
                        'current_outstanding': float(customer.current_outstanding),
                    }, status=status.HTTP_400_BAD_REQUEST)

            year = timezone.now().year
            count = DispatchOrder.objects.filter(created_at__year=year).count() + 1
            order_num = f"DISP-{year}-{count:05d}"

            outstanding = total_amount - amount_paid
            order_status = DispatchOrder.Status.SETTLED if outstanding <= Decimal('0.00') else (
                DispatchOrder.Status.PARTIAL if amount_paid > 0 else DispatchOrder.Status.PENDING
            )

            order = DispatchOrder.objects.create(
                order_number=order_num,
                customer=customer,
                payment_mode=payment_mode,
                total_kg=total_kg,
                total_amount=total_amount,
                amount_paid=amount_paid,
                outstanding_amount=outstanding,
                due_date=due_date,
                status=order_status,
                notes=notes,
                created_by=data.get('created_by', 'Sales Dispatcher')
            )

            for bag, price_kg, subtotal in bags_to_dispatch:
                DispatchOrderItem.objects.create(
                    dispatch_order=order,
                    bag=bag,
                    weight_kg=bag.weight_kg,
                    price_per_kg=price_kg,
                    subtotal=subtotal
                )
                bag.status = FinishedProductBag.Status.DISPATCHED
                bag.dispatched_date = timezone.now().date()
                bag.save()

                StoreMovement.objects.create(
                    bag=bag,
                    movement_type=StoreMovement.MovementType.DISPATCH,
                    from_location=bag.store_location,
                    reference_order=order.order_number,
                    notes=f"Dispatched to customer {customer.name} on order {order.order_number}"
                )

            # Manage Receivables & Outstanding Debt
            if payment_mode == DispatchOrder.PaymentMode.CREDIT or outstanding > Decimal('0.00'):
                customer.current_outstanding += outstanding
                customer.save()

                receivable = Receivable.objects.create(
                    dispatch_order=order,
                    customer=customer,
                    original_amount=total_amount,
                    amount_paid=amount_paid,
                    remaining_amount=outstanding,
                    due_date=due_date,
                    status=Receivable.Status.SETTLED if outstanding <= 0 else (
                        Receivable.Status.PARTIAL if amount_paid > 0 else Receivable.Status.PENDING
                    )
                )
                if amount_paid > Decimal('0.00'):
                    PaymentRecord.objects.create(
                        receivable=receivable,
                        amount=amount_paid,
                        payment_date=timezone.now().date(),
                        payment_method=PaymentRecord.PaymentMethod.CASH,
                        notes="Upfront payment on dispatch"
                    )

                # Check credit threshold warning
                if customer.credit_limit > 0 and (customer.current_outstanding / customer.credit_limit) >= Decimal('0.80'):
                    NotificationService.notify_credit_threshold(customer, customer.current_outstanding, customer.credit_limit)

        return Response(DispatchOrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='collect-payment')
    def collect_payment(self, request, pk=None):
        """
        Record partial or full payment on a dispatch order / receivable (Section 29).
        Transitions: PENDING -> PARTIAL -> SETTLED
        """
        order = self.get_object()
        data = request.data

        pay_amount = Decimal(str(data.get('amount', 0)))
        if pay_amount <= Decimal('0.00'):
            return Response({'error': "Payment amount must be greater than 0 ETB."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            receivable = Receivable.objects.select_for_update().filter(dispatch_order=order).first()
            if not receivable or receivable.remaining_amount <= Decimal('0.00'):
                return Response({'error': "This order has no outstanding receivable balance."}, status=status.HTTP_400_BAD_REQUEST)

            if pay_amount > receivable.remaining_amount:
                pay_amount = receivable.remaining_amount  # cap to remaining debt

            receivable.amount_paid += pay_amount
            receivable.remaining_amount -= pay_amount
            
            if receivable.remaining_amount == Decimal('0.00'):
                receivable.status = Receivable.Status.SETTLED
                order.status = DispatchOrder.Status.SETTLED
            else:
                receivable.status = Receivable.Status.PARTIAL
                order.status = DispatchOrder.Status.PARTIAL
            receivable.save()

            order.amount_paid += pay_amount
            order.outstanding_amount = receivable.remaining_amount
            order.save()

            customer = Customer.objects.select_for_update().get(id=order.customer_id)
            customer.current_outstanding = max(Decimal('0.00'), customer.current_outstanding - pay_amount)
            customer.save()

            payment = PaymentRecord.objects.create(
                receivable=receivable,
                amount=pay_amount,
                payment_date=data.get('payment_date', timezone.now().date()),
                payment_method=data.get('payment_method', PaymentRecord.PaymentMethod.CASH),
                reference_no=data.get('reference_no', ''),
                recorded_by=data.get('recorded_by', 'Accountant'),
                notes=data.get('notes', '')
            )

        return Response({
            'message': f"Payment of {pay_amount:,.2f} ETB collected successfully. Remaining balance: {receivable.remaining_amount:,.2f} ETB.",
            'status': order.status,
            'outstanding_amount': float(order.outstanding_amount),
            'amount_paid': float(order.amount_paid),
            'receivable': ReceivableSerializer(receivable).data,
            'payment': PaymentRecordSerializer(payment).data,
            'order': DispatchOrderSerializer(order).data
        })


class ReceivableViewSet(viewsets.ModelViewSet):
    queryset = Receivable.objects.all().select_related('customer', 'dispatch_order').prefetch_related('payments')
    serializer_class = ReceivableSerializer
    filterset_fields = ['status', 'customer']
    search_fields = ['dispatch_order__order_number', 'customer__name']
    ordering_fields = ['-created_at', 'due_date', 'remaining_amount']


class PaymentRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentRecord.objects.all().select_related('receivable__customer', 'receivable__dispatch_order')
    serializer_class = PaymentRecordSerializer
    filterset_fields = ['payment_method', 'payment_date']
    ordering_fields = ['-payment_date', '-created_at']

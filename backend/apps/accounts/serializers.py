from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    is_active = serializers.BooleanField(source='user.is_active')
    is_superuser = serializers.BooleanField(source='user.is_superuser', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    customer_id = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'is_superuser', 'is_active',
            'phone_number', 'store_name', 'department',
            'customer_id', 'customer_name', 'customer_code', 'customer',
            'date_joined', 'created_at'
        ]

    def get_customer_id(self, obj):
        cust = obj.get_customer()
        return str(cust.id) if cust else None

    def get_customer_name(self, obj):
        cust = obj.get_customer()
        return cust.name if cust else None

    def get_customer_code(self, obj):
        cust = obj.get_customer()
        return cust.customer_code if cust else None

    def get_customer(self, obj):
        cust = obj.get_customer()
        if not cust:
            return None
        return {
            'id': str(cust.id),
            'customer_code': cust.customer_code,
            'name': cust.name,
            'customer_type': cust.customer_type,
            'phone': cust.phone,
            'address': cust.address,
            'credit_limit': float(cust.credit_limit),
            'current_outstanding': float(cust.current_outstanding),
            'available_credit': float(cust.available_credit),
            'credit_utilization_percent': cust.credit_utilization_percent,
        }


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email_or_user = attrs.get('email', '').strip()
        password = attrs.get('password', '')

        # Lookup user by email (case-insensitive) or by username
        user = (
            User.objects.filter(email__iexact=email_or_user).first() or
            User.objects.filter(username__iexact=email_or_user).first()
        )

        if not user or not user.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid email/username or password."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "This user account is inactive. Please contact your Super Admin."})

        # Ensure profile exists
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': UserProfile.Role.SUPER_ADMIN if user.is_superuser else UserProfile.Role.STORE}
        )

        # Trigger customer auto-recognition if applicable
        if profile.role == UserProfile.Role.STORE:
            profile.get_customer()

        refresh = RefreshToken.for_user(user)
        # Add custom claims to the JWT payload
        refresh['email'] = user.email
        refresh['role'] = profile.role

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(profile).data
        }


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, default=UserProfile.Role.STORE)
    phone_number = serializers.CharField(required=False, allow_blank=True, default='')
    store_name = serializers.CharField(required=False, allow_blank=True, default='')
    department = serializers.CharField(required=False, allow_blank=True, default='')
    customer = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone_number', 'store_name', 'department', 'customer', 'is_active'
        ]

    def create(self, validated_data):
        from apps.sales.models import Customer
        email = validated_data.pop('email').lower().strip()
        password = validated_data.pop('password', 'alibori123')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        is_active = validated_data.pop('is_active', True)
        role = validated_data.get('role', UserProfile.Role.STORE)
        customer_id_or_obj = validated_data.pop('customer', None)

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "A user with this email address already exists."})

        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active,
            is_superuser=(role == UserProfile.Role.SUPER_ADMIN),
            is_staff=(role == UserProfile.Role.SUPER_ADMIN),
        )

        # Profile is created via signal, update with remaining attributes
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for attr, value in validated_data.items():
            setattr(profile, attr, value)
        profile.role = role

        if customer_id_or_obj:
            try:
                profile.customer = Customer.objects.get(id=customer_id_or_obj)
            except Exception:
                pass
        profile.save()
        profile.get_customer()

        return profile

    def update(self, instance, validated_data):
        from apps.sales.models import Customer
        user = instance.user
        email = validated_data.pop('email', None)
        customer_id_or_obj = validated_data.pop('customer', 'NOT_PROVIDED')

        if email:
            email = email.lower().strip()
            if User.objects.filter(email__iexact=email).exclude(id=user.id).exists():
                raise serializers.ValidationError({"email": "This email address is already in use by another account."})
            user.email = email

        if 'password' in validated_data and validated_data['password']:
            user.set_password(validated_data.pop('password'))

        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'is_active' in validated_data:
            user.is_active = validated_data.pop('is_active')

        role = validated_data.get('role')
        if role:
            user.is_superuser = (role == UserProfile.Role.SUPER_ADMIN)
            user.is_staff = (role == UserProfile.Role.SUPER_ADMIN)

        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if customer_id_or_obj != 'NOT_PROVIDED':
            if customer_id_or_obj:
                try:
                    instance.customer = Customer.objects.get(id=customer_id_or_obj)
                except Exception:
                    instance.customer = None
            else:
                instance.customer = None

        instance.save()
        instance.get_customer()

        return instance

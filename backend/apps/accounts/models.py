import uuid
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        FACTORY_MONITOR = "factory_monitor", "Factory Monitor"
        STORE = "store", "Store / Shop"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.STORE,
        help_text="Role determining ERP system permissions"
    )
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    store_name = models.CharField(max_length=150, blank=True, null=True, help_text="Designated shop or branch name for store role")
    department = models.CharField(max_length=100, blank=True, null=True)
    customer = models.ForeignKey(
        'sales.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_profiles',
        help_text="Designated customer record for customer / store role"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__email']
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.email or self.user.username} ({self.get_role_display()})"

    @property
    def email(self):
        return self.user.email

    @property
    def full_name(self):
        name = f"{self.user.first_name} {self.user.last_name}".strip()
        return name if name else (self.user.email or self.user.username)

    def get_customer(self):
        """
        Auto-recognizes and returns the linked Customer record for this user.
        If not explicitly set, attempts automatic recognition by store_name, email, or single active customer.
        """
        if self.customer:
            return self.customer

        if self.role != self.Role.STORE and not self.store_name:
            return None

        from apps.sales.models import Customer
        match = None

        # 1. Match store_name against Customer name or customer_code
        if self.store_name:
            clean_store = self.store_name.strip()
            match = (
                Customer.objects.filter(name__iexact=clean_store).first() or
                Customer.objects.filter(customer_code__iexact=clean_store).first()
            )
            # Fuzzy / substring match (e.g. "Merkato Retail Branch 1" matching "MERKATO")
            if not match:
                for c in Customer.objects.all():
                    if c.name.lower() in clean_store.lower() or clean_store.lower() in c.name.lower():
                        match = c
                        break

        # 2. Match user email or phone against Customer
        if not match:
            if self.user.email:
                match = Customer.objects.filter(contact_person__iexact=self.user.email).first()
            if not match and self.phone_number:
                match = Customer.objects.filter(phone=self.phone_number).first()

        # 3. Fallback: if role is STORE and only one active customer exists, link to it
        if not match and self.role == self.Role.STORE:
            active_customers = Customer.objects.filter(active=True)
            if active_customers.count() == 1:
                match = active_customers.first()

        if match:
            self.customer = match
            self.save(update_fields=['customer'])
            return match

        return None


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        role = UserProfile.Role.SUPER_ADMIN if instance.is_superuser else UserProfile.Role.STORE
        UserProfile.objects.create(user=instance, role=role)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
        else:
            role = UserProfile.Role.SUPER_ADMIN if instance.is_superuser else UserProfile.Role.STORE
            UserProfile.objects.create(user=instance, role=role)

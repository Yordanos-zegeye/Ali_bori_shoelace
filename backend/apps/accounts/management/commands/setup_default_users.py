from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile


class Command(BaseCommand):
    help = "Seeds or resets default users for Super Admin, Factory Monitor, and Store roles."

    def handle(self, *args, **options):
        default_users = [
            {
                "username": "admin",
                "email": "admin@alibori.com",
                "password": "admin123",
                "first_name": "Ali",
                "last_name": "Bori (Admin)",
                "role": UserProfile.Role.SUPER_ADMIN,
                "is_superuser": True,
                "is_staff": True,
                "phone_number": "+251-911-000001",
                "store_name": "Headquarters",
                "department": "Executive Management"
            },
            {
                "username": "factory_monitor",
                "email": "factory@alibori.com",
                "password": "factory123",
                "first_name": "Dawit",
                "last_name": "Tadesse",
                "role": UserProfile.Role.FACTORY_MONITOR,
                "is_superuser": False,
                "is_staff": False,
                "phone_number": "+251-911-000002",
                "store_name": "Main Factory Plant",
                "department": "Plant Floor & Production"
            },
            {
                "username": "store_user",
                "email": "store@alibori.com",
                "password": "store123",
                "first_name": "Selam",
                "last_name": "Bekele",
                "role": UserProfile.Role.STORE,
                "is_superuser": False,
                "is_staff": False,
                "phone_number": "+251-911-000003",
                "store_name": "Merkato Retail Branch 1",
                "department": "Sales & Retail Distribution"
            },
        ]

        for udata in default_users:
            email = udata["email"]
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=udata["username"]).first()

            if user:
                user.username = udata["username"]
                user.email = email
                user.first_name = udata["first_name"]
                user.last_name = udata["last_name"]
                user.is_superuser = udata["is_superuser"]
                user.is_staff = udata["is_staff"]
                user.is_active = True
                user.set_password(udata["password"])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Updated existing user: {email}"))
            else:
                user = User.objects.create_user(
                    username=udata["username"],
                    email=email,
                    password=udata["password"],
                    first_name=udata["first_name"],
                    last_name=udata["last_name"],
                    is_superuser=udata["is_superuser"],
                    is_staff=udata["is_staff"],
                    is_active=True
                )
                self.stdout.write(self.style.SUCCESS(f"Created new user: {email}"))

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = udata["role"]
            profile.phone_number = udata["phone_number"]
            profile.store_name = udata["store_name"]
            profile.department = udata["department"]
            profile.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"-> Role: {profile.get_role_display()} | Credentials: {email} / {udata['password']}"
                )
            )

        self.stdout.write(self.style.SUCCESS("All default test users configured successfully!"))

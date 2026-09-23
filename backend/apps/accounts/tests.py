from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile


class AuthenticationAndAuthorizationTests(APITestCase):
    def setUp(self):
        # 1. Super Admin
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@alibori.com',
            password='admin123',
            first_name='Ali',
            last_name='Bori'
        )
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        self.admin_profile.role = UserProfile.Role.SUPER_ADMIN
        self.admin_profile.save()

        # 2. Factory Monitor
        self.factory_user = User.objects.create_user(
            username='factory_test',
            email='factory@alibori.com',
            password='factory123',
            first_name='Dawit',
            last_name='Tadesse'
        )
        self.factory_profile, _ = UserProfile.objects.get_or_create(user=self.factory_user)
        self.factory_profile.role = UserProfile.Role.FACTORY_MONITOR
        self.factory_profile.save()

        # 3. Store User
        self.store_user = User.objects.create_user(
            username='store_test',
            email='store@alibori.com',
            password='store123',
            first_name='Selam',
            last_name='Bekele'
        )
        self.store_profile, _ = UserProfile.objects.get_or_create(user=self.store_user)
        self.store_profile.role = UserProfile.Role.STORE
        self.store_profile.save()

    def test_super_admin_login_and_user_management(self):
        # Login
        r_admin = self.client.post('/api/v1/auth/login/', {'email': 'admin@alibori.com', 'password': 'admin123'}, format='json')
        self.assertEqual(r_admin.status_code, status.HTTP_200_OK)
        admin_token = r_admin.data['access']
        self.assertEqual(r_admin.data['user']['role'], 'super_admin')

        # List Users
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        r_users = self.client.get('/api/v1/auth/users/')
        self.assertEqual(r_users.status_code, status.HTTP_200_OK)

        # Create New User
        r_create = self.client.post('/api/v1/auth/users/', {
            'email': 'new_store@alibori.com',
            'password': 'password123',
            'first_name': 'New',
            'last_name': 'Store',
            'role': 'store',
            'store_name': 'Bole Branch'
        }, format='json')
        self.assertEqual(r_create.status_code, status.HTTP_201_CREATED)
        new_user_id = r_create.data['id']

        # Toggle Active
        r_toggle = self.client.post(f'/api/v1/auth/users/{new_user_id}/toggle-active/')
        self.assertEqual(r_toggle.status_code, status.HTTP_200_OK)
        self.assertFalse(r_toggle.data['is_active'])

        # Inactive login should fail
        self.client.credentials()
        r_inactive = self.client.post('/api/v1/auth/login/', {'email': 'new_store@alibori.com', 'password': 'password123'}, format='json')
        self.assertEqual(r_inactive.status_code, status.HTTP_400_BAD_REQUEST)

    def test_factory_monitor_and_store_permissions(self):
        # Factory Monitor login
        r_factory = self.client.post('/api/v1/auth/login/', {'email': 'factory@alibori.com', 'password': 'factory123'}, format='json')
        self.assertEqual(r_factory.status_code, status.HTTP_200_OK)
        factory_token = r_factory.data['access']
        self.assertEqual(r_factory.data['user']['role'], 'factory_monitor')

        # Factory Monitor cannot access User Management
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {factory_token}')
        r_fm_users = self.client.get('/api/v1/auth/users/')
        self.assertEqual(r_fm_users.status_code, status.HTTP_403_FORBIDDEN)

        # Store User login
        r_store = self.client.post('/api/v1/auth/login/', {'email': 'store@alibori.com', 'password': 'store123'}, format='json')
        self.assertEqual(r_store.status_code, status.HTTP_200_OK)
        store_token = r_store.data['access']
        self.assertEqual(r_store.data['user']['role'], 'store')

        # Store User cannot access User Management
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {store_token}')
        r_store_users = self.client.get('/api/v1/auth/users/')
        self.assertEqual(r_store_users.status_code, status.HTTP_403_FORBIDDEN)

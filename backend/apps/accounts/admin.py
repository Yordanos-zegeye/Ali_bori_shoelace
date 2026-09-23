from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'email', 'role', 'phone_number', 'store_name', 'department', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'store_name')

from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """
    Allows access only to Super Admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role == 'super_admin'


class IsFactoryMonitorOrAdmin(BasePermission):
    """
    Allows access to Factory Monitor or Super Admin.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role in ['factory_monitor', 'super_admin']


class IsStoreOrAdmin(BasePermission):
    """
    Allows access to Store users or Super Admin.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role in ['store', 'super_admin']

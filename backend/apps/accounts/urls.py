from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, CurrentUserView, UserManagementViewSet

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='manage-users')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth_current_user'),
    path('', include(router.urls)),
]

from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action

from .models import UserProfile
from .serializers import (
    LoginSerializer,
    UserProfileSerializer,
    UserCreateUpdateSerializer
)
from .permissions import IsSuperAdmin


class LoginView(APIView):
    """
    Authenticate user using email and password.
    Returns SimpleJWT access & refresh tokens along with user profile and role.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """
    Retrieve profile details of the currently authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={'role': UserProfile.Role.SUPER_ADMIN if request.user.is_superuser else UserProfile.Role.STORE}
        )
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    Full CRUD management of users and role assignments.
    Restricted to Super Admins.
    """
    queryset = UserProfile.objects.select_related('user').all().order_by('-created_at')
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserProfileSerializer

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        profile = self.get_object()
        user = profile.user
        if user == request.user:
            return Response(
                {"detail": "You cannot deactivate your own administrative account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = not user.is_active
        user.save()
        return Response({
            "status": "success",
            "is_active": user.is_active,
            "message": f"User {user.email} is now {'active' if user.is_active else 'deactivated'}."
        })

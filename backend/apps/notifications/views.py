from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = '__all__'


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_fields = ['severity', 'notification_type', 'is_read', 'recipient']
    search_fields = ['title', 'message', 'recipient']
    ordering_fields = ['created_at', 'severity']

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(is_read=False).count()
        critical_count = Notification.objects.filter(is_read=False, severity=Notification.Severity.CRITICAL).count()
        return Response({'unread_count': count, 'critical_count': critical_count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

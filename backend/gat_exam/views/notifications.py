from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Notification
from ..serializers import NotificationSerializer

class NotificationViewSet(
    mixins.ListModelMixin,      # GET (Список)
    mixins.RetrieveModelMixin,  # GET (Одно)
    mixins.UpdateModelMixin,    # PATCH (Обновить статус)
    viewsets.GenericViewSet     # Базовая логика
):
    """
    Контроллер уведомлений.
    Пользователь может: Видеть список, Видеть детали, Отмечать прочитанным.
    Пользователь НЕ может: Удалять, Создавать (это делает система).
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    # Разрешаем только безопасные методы + PATCH (для обновления статуса)
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        # 1. Фильтруем только свои уведомления
        user = self.request.user
        qs = Notification.objects.filter(user=user)
        
        # 2. Опционально: фильтр ?unread_only=true (для иконки колокольчика)
        unread_only = self.request.query_params.get('unread_only')
        if unread_only == 'true':
            qs = qs.filter(is_read=False)
            
        # 3. Сортировка и лимит (чтобы не тянуть 1000 записей)
        # Берем последние 50 уведомлений
        return qs.order_by('-created_at')[:50]

    def update(self, request, *args, **kwargs):
        """
        Переопределяем update, чтобы пользователь мог менять ТОЛЬКО is_read.
        Нельзя поменять текст уведомления.
        """
        instance = self.get_object()
        # Разрешаем менять только статус прочтения
        instance.is_read = request.data.get('is_read', instance.is_read)
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Отметить всё как прочитанное"""
        # Обновляем сразу все непрочитанные уведомления пользователя
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "success", "message": "All notifications marked as read"})
    
    # create_test можно оставить для тестов, но лучше убрать в продакшене
    # Если нужно оставить, добавь 'post' в http_method_names
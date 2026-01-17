from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from ..models import GlobalSettings  # Импорт модели (проверь путь, если models.py в корне приложения)
from ..serializers import GlobalSettingsSerializer # Импорт сериализатора

class SettingsView(views.APIView):
    """
    Управление глобальными настройками системы.
    Паттерн: Singleton (одна запись).
    """
    
    # GET: Доступен всем (нужно для логотипа на странице логина)
    # PATCH: Только админам
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def get_object(self):
        # Получаем первую запись или создаем дефолтную, если её нет
        obj, created = GlobalSettings.objects.get_or_create(pk=1)
        return obj

    def get(self, request):
        settings = self.get_object()
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings = self.get_object()
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
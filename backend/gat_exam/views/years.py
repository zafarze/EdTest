import logging
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db.models import Count

# Импортируем модели и сериализаторы
from ..models import SchoolYear, Quarter
from ..serializers import SchoolYearSerializer, QuarterSerializer
from ..permissions import IsVipOrReadOnly

logger = logging.getLogger(__name__)

# --- 1. УЧЕБНЫЕ ГОДЫ ---
class SchoolYearViewSet(viewsets.ModelViewSet):
    # Сортируем по убыванию (сначала новые годы)
    queryset = SchoolYear.objects.all().order_by('-start_date')
    serializer_class = SchoolYearSerializer
    # 🔥 Создавать/удалять годы могут только VIP (Админ/Ген.дир)
    permission_classes = [permissions.IsAuthenticated, IsVipOrReadOnly]

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info(f"📅 [AUDIT] School Year Created: {instance.name} by {self.request.user}")

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(f"✏️ [AUDIT] School Year Updated: {instance.name} by {self.request.user}")

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        logger.info(f"🗑️ [AUDIT] School Year Deleted: {name} by {self.request.user}")


# --- 2. ЧЕТВЕРТИ ---
class QuarterViewSet(viewsets.ModelViewSet):
    queryset = Quarter.objects.all().order_by('start_date')
    serializer_class = QuarterSerializer
    permission_classes = [permissions.IsAuthenticated, IsVipOrReadOnly]

    def perform_create(self, serializer):
        # Вся логика поиска года теперь внутри serializer.save() -> validate()
        instance = serializer.save()
        
        # Безопасное получение имени года для логов
        year_name = instance.school_year.name if instance.school_year else "Unknown"
        logger.info(f"✅ Quarter Created: {instance.name} (Year: {year_name}) by {self.request.user}")

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(f"✏️ Quarter Updated: {instance.name} by {self.request.user}")
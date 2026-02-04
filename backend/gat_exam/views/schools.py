import logging
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, permissions
from rest_framework.pagination import PageNumberPagination

# Импорт прав
from gat_exam.permissions import IsVipOrReadOnly

# Импорт моделей
from ..models import School

# Импорт сериализаторов
from ..serializers import SchoolSerializer

# 🔥 ИМПОРТ СЕРВИСА ДОСТУПА (Новое)
from ..services.access_service import AccessService

# Настройка логгера
logger = logging.getLogger(__name__)

# ==========================================
# УТИЛИТЫ И ПАГИНАЦИЯ (HELPER CLASSES)
# ==========================================

class StandardPagination(PageNumberPagination):
    """
    Стандартная пагинация: 20 элементов на страницу.
    Можно менять через ?page_size=50 (максимум 100).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==========================================
# SCHOOL VIEWSET (ТОЛЬКО ШКОЛЫ)
# ==========================================
class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'custom_id', 'address', 'phone', 'name_tj', 'name_en']
    ordering_fields = ['id', 'name', 'students_count']
    ordering = ['id']

    def get_permissions(self):
        # Строгая проверка: менять школы могут только VIP
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsVipOrReadOnly()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        # Оптимизируем подсчет студентов сразу в запросе
        queryset = School.objects.annotate(students_count=Count('students')).order_by('id')

        # 🔥 ИСПОЛЬЗУЕМ СЕРВИС
        # Вся логика "кто что видит" теперь живет в AccessService
        return AccessService.get_available_schools(user, queryset)

    def perform_create(self, serializer):
        # Валидация custom_id теперь происходит внутри сериализатора автоматически
        instance = serializer.save()
        logger.info(f"✅ School Created: {instance.name} (ID: {instance.id}) by {self.request.user}")

    def perform_update(self, serializer):
        # Валидация custom_id теперь происходит внутри сериализатора автоматически
        instance = serializer.save()
        logger.info(f"✏️ School Updated: {instance.name} (ID: {instance.id}) by {self.request.user}")
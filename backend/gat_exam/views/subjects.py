import logging
from rest_framework import viewsets, filters, permissions
from ..models import Subject
from ..serializers import SubjectSerializer
from ..permissions import IsVipOrReadOnly

logger = logging.getLogger(__name__)

class SubjectViewSet(viewsets.ModelViewSet):
    # Оптимизация: prefetch_related нужен, только если мы реально тянем вопросы
    # Если это просто список предметов для селекта, лучше без него.
    queryset = Subject.objects.all().order_by('name')
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsVipOrReadOnly]
    
    pagination_class = None

    # 🔍 Поиск и фильтрация
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'name_tj', 'name_en', 'abbreviation', 'category']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """
        Логика видимости предметов.
        """
        user = self.request.user
        
        # 1. Базовый запрос
        qs = super().get_queryset()

        if user.is_superuser:
            return qs

        if hasattr(user, 'profile'):
            role = user.profile.role
            
            # 2. Администраторы и Директора видят ВСЕ предметы
            # (так как они должны назначать их учителям и видеть статистику)
            if role in ['admin', 'general_director', 'ceo', 'founder', 'director', 'deputy']:
                return qs
            
            # 3. Учителя и Эксперты видят только НАЗНАЧЕННЫЕ им предметы
            # Это уменьшает шум в интерфейсе (учитель математики не видит "ИЗО")
            if role in ['teacher', 'expert'] and hasattr(user.profile, 'subjects'):
                return user.profile.subjects.all()
        
        # По умолчанию возвращаем всё (для учеников и прочих), 
        # либо qs.none(), если хочешь строгую приватность.
        # Обычно предметы видны всем для выбора в фильтрах.
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info(f"📚 Subject Created: {instance.name} by {self.request.user}")

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(f"✏️ Subject Updated: {instance.name} by {self.request.user}")

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        logger.info(f"🗑️ Subject Deleted: {name} by {self.request.user}")
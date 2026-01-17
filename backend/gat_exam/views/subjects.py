from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from ..models import Subject
from ..serializers import SubjectSerializer

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    
    # 🔍 Поиск и фильтрация
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'abbreviation', 'category']
    ordering_fields = ['name', 'created_at']
    ordering = ['name'] # Сортировка по умолчанию

    def get_queryset(self):
        # ⚡ ОПТИМИЗАЦИЯ:
        # Загружаем связанные экзамены и вопросы сразу, чтобы
        # поле 'questionsCount' в сериализаторе не делало 100500 запросов к БД.
        return Subject.objects.prefetch_related('exams__questions').all()
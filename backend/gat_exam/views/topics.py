from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Count 

from ..models import Topic, School
from ..serializers import TopicSerializer
# 👇 ОБЯЗАТЕЛЬНО ИМПОРТИРУЕМ НАШ НОВЫЙ ФИЛЬТР
from ..filters import TopicFilter

class TopicViewSet(viewsets.ModelViewSet):
    # 🔥 ОПТИМИЗАЦИЯ ЗАПРОСОВ:
    # 1. select_related - для одиночных связей (Author, Subject)
    # 2. prefetch_related - для ManyToMany (Schools)
    # 3. annotate - считаем количество вопросов прямо в базе (для статуса)
    queryset = Topic.objects.all()\
        .select_related('subject', 'author')\
        .prefetch_related('schools')\
        .annotate(questions_count=Count('questions'))
    
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]
    
    # Явно подключаем фильтры
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # 🔥 ВАЖНО: Подключаем наш кастомный класс фильтрации вместо filterset_fields
    filterset_class = TopicFilter
    
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def perform_create(self, serializer):
        # Автоматически проставляем автора (текущий пользователь)
        serializer.save(author=self.request.user)

    # --- 🚀 ЛОГИКА ТРАНСФЕРА (Копирование/Перемещение) ---
    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """
        Копирование или перемещение тем в другую школу.
        Принимает JSON:
        {
            "topic_ids": [1, 2, 5],
            "target_school_id": 2,
            "target_grade": 10,  # Опционально (если менять класс)
            "mode": "copy" | "move"
        }
        """
        topic_ids = request.data.get('topic_ids', [])
        target_school_id = request.data.get('target_school_id')
        target_grade = request.data.get('target_grade')
        mode = request.data.get('mode', 'copy')

        if not topic_ids or not target_school_id:
            return Response({"error": "Не указаны ID тем или целевая школа"}, status=400)

        try:
            target_school = School.objects.get(id=target_school_id)
            topics = Topic.objects.filter(id__in=topic_ids)
            
            created_count = 0
            
            with transaction.atomic():
                for topic in topics:
                    # 1. Создаем копию объекта (без M2M полей)
                    new_topic = Topic.objects.create(
                        subject=topic.subject,
                        quarter=topic.quarter,
                        # Если передан новый класс - используем его, иначе оставляем старый
                        grade_level=target_grade if target_grade else topic.grade_level,
                        title=topic.title,
                        description=topic.description,
                        author=request.user # Автор копии - тот, кто нажал кнопку
                    )
                    
                    # 2. Добавляем школу (M2M связь)
                    new_topic.schools.add(target_school)
                    
                    created_count += 1
                
                # Если режим "Перемещение", удаляем исходные темы
                if mode == 'move':
                    topics.delete()

            return Response({
                "message": f"Успешно {'перемещено' if mode == 'move' else 'скопировано'} {created_count} тем",
                "status": "success"
            })

        except Exception as e:
            print(f"Error in transfer: {e}")
            return Response({"error": str(e)}, status=500)
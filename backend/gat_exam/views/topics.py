import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Count, Q

from ..models import Topic, School, Question, Choice
from ..serializers import TopicSerializer
from ..filters import TopicFilter
from ..permissions import IsTopicManagerOrReadOnly

# 🔥 Импортируем нашу утилиту безопасности
from ..utils import get_allowed_school_ids

logger = logging.getLogger(__name__)

class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated, IsTopicManagerOrReadOnly]
    
    # 🔥 ОТКЛЮЧАЕМ ПАГИНАЦИЮ (фронтенд ждет полный список для селектов)
    pagination_class = None
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TopicFilter
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        """
        🔥 ДИНАМИЧЕСКИЙ QUERYSET С ЗАЩИТОЙ ДАННЫХ
        """
        # 1. Базовая оптимизация (Жадная загрузка)
        queryset = Topic.objects.select_related('subject', 'author')\
            .prefetch_related('schools')\
            .annotate(questions_count=Count('questions'))

        user = self.request.user

        # 2. Получаем список ID школ, доступных пользователю
        allowed_ids = get_allowed_school_ids(user)

        # 3. Фильтрация
        # Если None — это Супер-Админ, возвращаем всё
        if allowed_ids is None:
            return queryset

        # Иначе показываем:
        # а) Темы, привязанные к школам, где работает пользователь
        # б) Темы, которые пользователь создал сам (личные наработки)
        return queryset.filter(
            Q(schools__id__in=allowed_ids) | Q(author=user)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'profile'):
            raise PermissionDenied("У пользователя нет профиля.")

        profile = user.profile

        # Проверка для эксперта (только свой предмет)
        if profile.role == 'expert':
            request_subject_id = self.request.data.get('subject')
            if request_subject_id:
                request_subject_id = int(request_subject_id)
                # Логика проверки предмета эксперта
                if hasattr(profile, 'subject') and profile.subject:
                    if profile.subject.id != request_subject_id:
                        raise PermissionDenied(f"Вы эксперт по {profile.subject.name}. Вы не можете создавать темы по другим предметам.")
                elif hasattr(profile, 'subjects'):
                    if not profile.subjects.filter(id=request_subject_id).exists():
                         raise PermissionDenied("Этот предмет не входит в вашу зону экспертизы.")
            else:
                 raise PermissionDenied("Не указан предмет.")

        instance = serializer.save(author=user)
        logger.info(f"📂 Topic Created: {instance.title} by {user}")

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(f"✏️ Topic Updated: {instance.title} by {self.request.user}")

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        logger.info(f"🗑️ Topic Deleted: {title} by {self.request.user}")

    # --- ТРАНСФЕР (Копирование/Перемещение тем между школами) ---
    @action(detail=False, methods=['post'])
    def transfer(self, request):
        topic_ids = request.data.get('topic_ids', [])
        target_school_id = request.data.get('target_school_id')
        target_grade = request.data.get('target_grade')
        mode = request.data.get('mode', 'copy') # 'copy' или 'move'
        with_questions = request.data.get('with_questions', True)

        if not topic_ids or not target_school_id:
            return Response({"error": "Не указаны ID тем или целевая школа"}, status=400)

        try:
            # Проверяем доступ к целевой школе (нельзя скопировать в чужую школу)
            allowed_ids = get_allowed_school_ids(request.user)
            if allowed_ids is not None and int(target_school_id) not in allowed_ids:
                 return Response({"error": "Нет доступа к целевой школе."}, status=403)

            target_school = School.objects.get(id=target_school_id)
            
            # Ищем темы в пределах доступного queryset (безопасность)
            topics = self.get_queryset().filter(id__in=topic_ids)
            
            if not topics.exists():
                return Response({"error": "Нет доступных тем для переноса."}, status=404)
            
            created_count = 0
            questions_count = 0
            
            with transaction.atomic():
                for topic in topics:
                    # 1. Создаем копию темы
                    new_topic = Topic.objects.create(
                        subject=topic.subject,
                        quarter=topic.quarter,
                        grade_level=target_grade if target_grade else topic.grade_level,
                        title=topic.title,
                        description=topic.description,
                        author=request.user 
                    )
                    new_topic.schools.add(target_school)
                    created_count += 1

                    # 2. Копируем вопросы (если флаг True)
                    if with_questions:
                        original_questions = Question.objects.filter(topic=topic)
                        for q in original_questions:
                            new_q = Question.objects.create(
                                topic=new_topic,
                                text=q.text,
                                image=q.image,
                                question_type=q.question_type,
                                difficulty=q.difficulty,
                                exam=q.exam
                            )
                            questions_count += 1
                            
                            # Копируем варианты ответов
                            for c in q.choices.all():
                                Choice.objects.create(
                                    question=new_q,
                                    text=c.text,
                                    image=c.image,
                                    is_correct=c.is_correct
                                )
                
                # Если режим перемещения - удаляем старые темы
                if mode == 'move':
                    topics.delete()

            return Response({
                "message": f"Успешно {'перемещено' if mode == 'move' else 'скопировано'} {created_count} тем и {questions_count} вопросов",
                "status": "success"
            })

        except Exception as e:
            logger.error(f"Transfer Error: {e}")
            return Response({"error": str(e)}, status=500)
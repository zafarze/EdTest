from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from ..models import QuestionLimit, School, Subject
from ..serializers import SchoolConfigSerializer

class QuestionCountsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    # GET /api/question_counts/
    def list(self, request):
        """
        Возвращает полную структуру настроек для страницы QuestionCounts.tsx
        """
        user = request.user
        
        # Если это директор, показываем только его школу
        schools = School.objects.all()
        if hasattr(user, 'profile') and user.profile.role == 'director':
             schools = user.profile.assigned_schools.all()

        serializer = SchoolConfigSerializer(schools, many=True)
        return Response(serializer.data)

    # POST /api/question_counts/update_count/
    @action(detail=False, methods=['post'])
    def update_count(self, request):
        """
        Изменение количества вопросов (+/- или ввод вручную).
        Payload: { school_id: 1, grade: 2, subject_id: 5, count: 25 }
        """
        school_id = request.data.get('school_id')
        grade = request.data.get('grade')
        subject_id = request.data.get('subject_id')
        count = request.data.get('count')

        if not all([school_id, grade, subject_id]):
            return Response({"error": "Неполные данные"}, status=400)

        try:
            # update_or_create: Если запись есть - обновит, если нет - создаст
            limit, created = QuestionLimit.objects.update_or_create(
                school_id=school_id,
                grade_level=grade,
                subject_id=subject_id,
                defaults={'count': count}
            )
            return Response({"status": "updated", "id": limit.id, "count": limit.count})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # POST /api/question_counts/remove_subject/
    @action(detail=False, methods=['post'])
    def remove_subject(self, request):
        """
        Удаление предмета из класса.
        """
        school_id = request.data.get('school_id')
        grade = request.data.get('grade')
        subject_id = request.data.get('subject_id')

        QuestionLimit.objects.filter(
            school_id=school_id,
            grade_level=grade,
            subject_id=subject_id
        ).delete()

        return Response({"status": "deleted"})

    # POST /api/question_counts/clone/
    @action(detail=False, methods=['post'])
    def clone(self, request):
        """
        Кнопка "Импорт": Копирует настройки из одной школы в другую.
        """
        source_id = request.data.get('source_school_id') # Откуда (ID школы)
        target_id = request.data.get('target_school_id') # Куда (ID школы)

        if not source_id or not target_id:
            return Response({"error": "Нужны ID школ"}, status=400)

        try:
            with transaction.atomic():
                # 1. Очищаем текущие настройки целевой школы (чтобы не было дублей)
                QuestionLimit.objects.filter(school_id=target_id).delete()
                
                # 2. Берем настройки исходной школы
                source_limits = QuestionLimit.objects.filter(school_id=source_id)
                
                # 3. Создаем копии
                new_limits = []
                for l in source_limits:
                    new_limits.append(QuestionLimit(
                        school_id=target_id,
                        grade_level=l.grade_level,
                        subject=l.subject,
                        count=l.count
                    ))
                
                # 4. Сохраняем пачкой (bulk_create быстрее, чем save() в цикле)
                QuestionLimit.objects.bulk_create(new_limits)
                
            return Response({"status": "cloned", "count": len(new_limits)})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
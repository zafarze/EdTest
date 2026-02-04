import logging
from django.db.models import Count, ProtectedError
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

# Импорты моделей и сериализаторов
from ..models import StudentClass, School
from ..serializers import StudentClassSerializer, ClassStructureSerializer

# 🔥 Импорт сервиса доступа
from ..services.access_service import AccessService

logger = logging.getLogger(__name__)

class StudentClassViewSet(viewsets.ModelViewSet):
    # 🔥 ИСПРАВЛЕНИЕ: Роутеру нужен этот атрибут, чтобы определить basename
    queryset = StudentClass.objects.all()
    
    serializer_class = StudentClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # Выключаем пагинацию, так как фронтенд рисует сетку
    pagination_class = None 

    def get_queryset(self):
        """
        🔥 СТРОГАЯ ИЗОЛЯЦИЯ ДАННЫХ ЧЕРЕЗ ACCESS SERVICE
        Возвращает только те классы, которые принадлежат доступным пользователю школам.
        """
        user = self.request.user
        
        # 1. Получаем список школ, доступных юзеру (через сервис)
        available_schools = AccessService.get_available_schools(user)

        # 2. Фильтруем классы по этим школам + оптимизация запроса (select_related)
        queryset = StudentClass.objects.filter(
            school__in=available_schools
        ).select_related('school').order_by('grade_level', 'section')

        # 3. Дополнительный фильтр по ID школы (если передан в URL ?school_id=...)
        school_id = self.request.query_params.get('school_id')
        if school_id:
            queryset = queryset.filter(school_id=school_id)

        return queryset

    def perform_create(self, serializer):
        """
        Проверка прав при создании класса.
        Нельзя создать класс в школе, к которой нет доступа.
        """
        school = serializer.validated_data['school']
        user = self.request.user
        
        # Проверяем доступ к конкретной школе через сервис
        allowed_schools = AccessService.get_available_schools(user)
        
        if not allowed_schools.filter(id=school.id).exists():
            raise ValidationError({"school": "У вас нет прав создавать классы в этой школе."})

        instance = serializer.save()
        logger.info(f"📚 Class Created: {instance.grade_level}-{instance.section} ({school.name}) by {user}")

    def perform_destroy(self, instance):
        """
        Безопасное удаление класса.
        """
        try:
            # Логируем перед удалением
            grade = instance.grade_level
            section = instance.section
            instance.delete()
            logger.info(f"🗑️ Class Deleted: {grade}-{section} by {self.request.user}")
        except ProtectedError:
            # Если есть ученики или другие связи — Django не даст удалить
            raise ValidationError("Нельзя удалить класс, в котором есть ученики! Сначала переведите или удалите их.")

    # --- СПЕЦИАЛЬНЫЕ ДЕЙСТВИЯ (ACTIONS) ---

    @action(detail=False, methods=['delete'], url_path='delete_grade')
    def delete_grade(self, request):
        """
        Удалить всю параллель (например, все 11-е классы школы).
        Пример: DELETE /api/classes/delete_grade/?school_id=1&grade=11
        """
        school_id = request.query_params.get('school_id')
        grade = request.query_params.get('grade')

        if not school_id or not grade:
            return Response({'error': 'Не указаны school_id или grade'}, status=400)

        # 1. Проверка прав через сервис
        available_schools = AccessService.get_available_schools(request.user)
        if not available_schools.filter(id=school_id).exists():
             return Response({'error': 'Нет доступа к этой школе или школа не найдена'}, status=403)

        # 2. Поиск классов
        classes_to_delete = StudentClass.objects.filter(school_id=school_id, grade_level=grade)

        if not classes_to_delete.exists():
            return Response({'message': 'Классы не найдены'}, status=404)

        # 3. Проверка на наличие учеников
        # (distinct() нужен, чтобы не считать дубликаты при join)
        if classes_to_delete.filter(students__isnull=False).distinct().exists():
            return Response({'error': 'В одном из классов есть ученики! Удаление невозможно.'}, status=400)

        # 4. Удаление
        try:
            count, _ = classes_to_delete.delete()
            logger.info(f"🔥 Grade {grade} deleted in School {school_id} by {request.user}")
            return Response({'message': f'Удалено {count} классов.'}, status=204)
        except ProtectedError:
            return Response({'error': 'Ошибка удаления (связанные данные).'}, status=400)

    @action(detail=False, methods=['get'])
    def structure(self, request):
        """
        Возвращает структуру классов для сайдбара или фильтров.
        Пример: GET /api/classes/structure/?school_id=1
        """
        school_id = request.query_params.get('school_id')
        if not school_id:
            return Response([])
        
        # 1. Проверка прав через сервис
        available_schools = AccessService.get_available_schools(request.user)
        if not available_schools.filter(id=school_id).exists():
             return Response([]) # Просто возвращаем пустой список, если нет доступа

        # 2. Выборка
        classes = StudentClass.objects.filter(school_id=school_id)\
            .annotate(students_count=Count('students'))\
            .order_by('grade_level', 'section')
            
        serializer = ClassStructureSerializer(classes, many=True)
        return Response(serializer.data)
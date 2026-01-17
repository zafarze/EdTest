from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, ProtectedError
from django.shortcuts import get_object_or_404

# Импорты твоих моделей и сериализаторов
from ..models import StudentClass
from ..serializers import StudentClassSerializer, ClassStructureSerializer

class StudentClassViewSet(viewsets.ModelViewSet):
    queryset = StudentClass.objects.all()
    serializer_class = StudentClassSerializer

    # 🔥 1. ГЛАВНОЕ ИСПРАВЛЕНИЕ: Фильтрация списка по ID школы
    # Это решает проблему, когда классы одной школы видны в другой.
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Frontend отправляет ?school_id=1
        school_id = self.request.query_params.get('school_id')
        
        # Если параметр передан — показываем классы ТОЛЬКО этой школы
        if school_id:
            queryset = queryset.filter(school_id=school_id)
            
        return queryset

    # 🔥 2. БЕЗОПАСНОЕ УДАЛЕНИЕ ОДНОГО КЛАССА (Метод DELETE /api/classes/{id}/)
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            # Проверка: Нельзя удалить класс, если в нем есть ученики
            if instance.students.exists():
                 return Response(
                    {'error': 'Нельзя удалить класс: в нем есть ученики! Сначала переведите их.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ProtectedError:
            # Ошибка возникает, если класс связан с чем-то важным (что нельзя удалять каскадно)
            return Response(
                {'error': 'Ошибка удаления: Невозможно удалить класс, так как он используется в других записях (например, в расписании или экзаменах).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # 🔥 3. СТРУКТУРА ДЛЯ САЙДБАРА (Твой метод)
    @action(detail=False, methods=['get'])
    def structure(self, request):
        """
        Возвращает классы школы с подсчетом учеников.
        Пример: /api/classes/structure/?school_id=1
        """
        school_id = request.query_params.get('school_id')
        if not school_id:
            return Response([])

        # Считаем количество учеников прямо в базе данных
        classes = StudentClass.objects.filter(school_id=school_id)\
            .annotate(students_count=Count('students'))\
            .order_by('grade_level', 'section')

        serializer = ClassStructureSerializer(classes, many=True)
        return Response(serializer.data)

    # 🔥 4. МАССОВОЕ УДАЛЕНИЕ ПАРАЛЛЕЛИ (Твой метод)
    @action(detail=False, methods=['delete'])
    def delete_grade(self, request):
        """
        Удаляет ВСЕ классы определенной параллели (например, все 3-и классы).
        Пример: /api/classes/delete_grade/?school_id=1&grade=3
        """
        school_id = request.query_params.get('school_id')
        grade = request.query_params.get('grade')

        if not school_id or not grade:
            return Response({'error': 'School ID and Grade are required'}, status=400)

        # Находим классы
        classes_to_delete = StudentClass.objects.filter(
            school_id=school_id, 
            grade_level=grade
        )

        if not classes_to_delete.exists():
            return Response({'message': 'Классы не найдены'}, status=404)

        # Проверка безопасности: есть ли ученики?
        if classes_to_delete.filter(students__isnull=False).distinct().exists():
            return Response(
                {'error': 'Нельзя удалить параллель: в классах есть ученики!'},
                status=400
            )

        # Попытка удаления
        try:
            deleted_count, _ = classes_to_delete.delete()
            return Response({'message': f'Успешно удалено {deleted_count} классов.'}, status=204)
        except ProtectedError:
            return Response(
                {'error': 'Ошибка удаления: срабатывает защита данных. Возможно, есть связи с экзаменами.'},
                status=400
            )
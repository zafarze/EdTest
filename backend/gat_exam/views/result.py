from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import Exam, ExamResult

class ExamResultView(APIView):
    """
    URL: /api/exams/<pk>/results/
    Возвращает список результатов для конкретного экзамена.
    """
    permission_classes = [IsAuthenticated]

    # 👇 ВАЖНО: аргумент называем 'pk', так как в urls.py написано <int:pk>
    def get(self, request, pk):
        # Получаем экзамен по ID (pk)
        exam = get_object_or_404(Exam, pk=pk)
        
        # Подгружаем связанные данные (ученик, класс, школа) для скорости
        results = ExamResult.objects.filter(exam=exam).select_related(
            'student', 
            'student__student_class', 
            'student__school'
        )
        
        data = []
        for r in results:
            # Безопасное получение имени
            student_name = f"{r.student.last_name_ru} {r.student.first_name_ru}"
            
            # Безопасное получение класса
            class_name = str(r.student.student_class) if r.student.student_class else "-"
            
            # Безопасное получение школы
            school_name = r.student.school.name if r.student.school else "—"
            
            data.append({
                "id": r.id,
                "student_name": student_name,
                "class_name": class_name,
                "school_name": school_name,
                "score": r.score,
                "max_score": r.max_score,
                "percentage": r.percentage,
                "details": r.details,
                "day": r.day,           # День сдачи (если есть)
                "exam": exam.id         # 🔥 ВАЖНО: Добавили ID экзамена для кнопки AI
            })
            
        return Response(data, status=status.HTTP_200_OK)
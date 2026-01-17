from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import Exam, ExamResult

class ExamResultView(APIView):
    """
    URL: /api/exams/<id>/results/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, exam_id):
        exam = get_object_or_404(Exam, pk=exam_id)
        
        # Подгружаем школу тоже (select_related)
        results = ExamResult.objects.filter(exam=exam).select_related('student', 'student__student_class', 'student__school')
        
        data = []
        for r in results:
            # Безопасное получение данных
            student_name = f"{r.student.last_name_ru} {r.student.first_name_ru}"
            class_name = str(r.student.student_class) if r.student.student_class else "-"
            
            # 🔥 ДОБАВЛЕНО: Название школы
            school_name = r.student.school.name if r.student.school else "—"
            
            data.append({
                "id": r.id,
                "student_name": student_name,
                "class_name": class_name,
                "school_name": school_name, # <-- Вот оно
                "score": r.score,
                "max_score": r.max_score,
                "percentage": r.percentage,
                "details": r.details 
            })
            
        return Response(data, status=status.HTTP_200_OK)
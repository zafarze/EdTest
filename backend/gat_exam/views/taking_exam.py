# backend/gat_exam/views/taking_exam.py

from django.http import FileResponse
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import Exam, ExamResult, Student
# Убедитесь, что ExamPlaySerializer добавлен в serializers.py (код был выше)
from ..serializers import ExamPlaySerializer  
from ..services.pdf_generator import PDFGenerator

class StudentExamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet ТОЛЬКО для студентов.
    Позволяет видеть свои экзамены, начинать их, сдавать и скачивать пропуск.
    """
    serializer_class = ExamPlaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Показываем студенту только экзамены его класса (или общешкольные).
        """
        user = self.request.user
        if user.is_superuser:
            return Exam.objects.all().order_by('-date')
            
        try:
            student = Student.objects.get(username=user.username)
            # Фильтруем: Экзамен активен И (назначен классу ИЛИ нет классов вообще)
            return Exam.objects.filter(
                status__in=['active', 'planned'],
                classes=student.student_class
            ).order_by('-date')
        except Student.DoesNotExist:
            return Exam.objects.none()

    # --- 1. НАЧАТЬ ЭКЗАМЕН (GET questions) ---
    @action(detail=True, methods=['get'])
    def take(self, request, pk=None):
        """
        Возвращает вопросы БЕЗ правильных ответов.
        URL: /api/student/exams/{id}/take/
        """
        exam = self.get_object()
        serializer = self.get_serializer(exam)
        return Response(serializer.data)

    # --- 2. СДАТЬ ЭКЗАМЕН (POST answers) ---
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Принимает ответы, считает баллы.
        URL: /api/student/exams/{id}/submit/
        """
        exam = self.get_object()
        raw_answers = request.data.get('answers', {}) # { "question_id": index }
        
        # 1. Ищем студента
        try:
            student = Student.objects.get(username=request.user.username)
        except Student.DoesNotExist:
            return Response({"error": "Профиль студента не найден"}, status=400)

        # 2. Проверка на повторную сдачу
        if ExamResult.objects.filter(student=student, exam=exam).exists():
             return Response({"error": "Вы уже сдали этот экзамен!"}, status=400)

        # 3. Подсчет баллов
        score = 0
        questions = exam.questions.all()
        total = questions.count()
        details = {}

        for q in questions:
            user_idx = raw_answers.get(str(q.id))
            is_correct = False
            choices = list(q.choices.all())
            
            if user_idx is not None and isinstance(user_idx, int):
                if 0 <= user_idx < len(choices):
                    selected_choice = choices[user_idx]
                    if selected_choice.is_correct:
                        score += 1
                        is_correct = True
            
            details[q.id] = {"correct": is_correct, "u_idx": user_idx}

        percentage = (score / total) * 100 if total > 0 else 0
        percentage = round(percentage, 2)

        # 4. Сохранение
        with transaction.atomic():
            ExamResult.objects.create(
                student=student,
                exam=exam,
                score=score,
                max_score=total,
                percentage=percentage,
                details=details
            )

        return Response({
            "message": "Экзамен успешно сдан",
            "score": score,
            "total": total,
            "percent": percentage
        })

    # --- 3. СКАЧАТЬ БИЛЕТ (PDF) ---
    @action(detail=True, methods=['get'])
    def download_ticket(self, request, pk=None):
        """
        Генерация PDF пропуска для оффлайн экзамена.
        URL: /api/student/exams/{id}/download_ticket/
        """
        exam = self.get_object()
        if not exam.smart_seating:
             return Response({"error": "Smart Seating выключен"}, status=400)

        try:
            student = Student.objects.get(username=request.user.username)
        except Student.DoesNotExist:
             return Response({"error": "Вы не студент"}, status=403)

        try:
            generator = PDFGenerator()
            # Вариант 'A' (в будущем можно сделать рандом)
            generator.create_student_page(student, exam, "A")
            pdf_file = generator.get_pdf()
            
            filename = f"Ticket_{student.last_name_en}_{exam.id}.pdf"
            return FileResponse(pdf_file, as_attachment=True, filename=filename)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
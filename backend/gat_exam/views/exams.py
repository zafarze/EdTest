from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import Exam
from ..serializers import ExamSerializer
from ..services.ai_auditor import ExamAuditor # <-- Импортируем наш сервис

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all().order_by('-date')
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

    # --- 🚀 AI AUDIT ACTION ---
    @action(detail=True, methods=['post'])
    def audit(self, request, pk=None):
        """Запускает ИИ-ревизора для проверки экзамена"""
        exam = self.get_object()
        
        # Вызываем сервис
        audit_result = ExamAuditor.audit_exam(exam)
        
        if audit_result['passed']:
            # Если всё ок — сохраняем в базу галочку
            exam.ai_audit_passed = True
            exam.save()
            return Response(audit_result)
        else:
            # Если ошибки — возвращаем их, галочку снимаем
            exam.ai_audit_passed = False
            exam.save()
            return Response(audit_result, status=status.HTTP_400_BAD_REQUEST)

    # --- ГЕНЕРАЦИЯ ПРОПУСКОВ (Smart Seating) ---
    @action(detail=True, methods=['get'])
    def generate_tickets(self, request, pk=None):
        exam = self.get_object()
        if not exam.smart_seating:
             return Response({"error": "Умная рассадка выключена для этого экзамена"}, status=400)
             
        # Тут в будущем будет генерация PDF
        return Response({
            "message": "Пропуска сгенерированы",
            "download_url": f"/media/tickets/exam_{exam.id}.pdf" # Фейк URL пока
        })
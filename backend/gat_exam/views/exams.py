# backend/gat_exam/views/exams.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import Exam
from ..serializers import ExamSerializer
from ..services.ai_auditor import ExamAuditor

class ExamViewSet(viewsets.ModelViewSet):
    """
    ViewSet ДЛЯ УЧИТЕЛЕЙ/АДМИНОВ.
    Управление экзаменами (CRUD) + AI Аудит.
    """
    queryset = Exam.objects.all().order_by('-date')
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated] 

    # --- AI AUDIT (Только для учителей) ---
    @action(detail=True, methods=['post'])
    def audit(self, request, pk=None):
        """Запускает ИИ-ревизора для проверки качества вопросов"""
        exam = self.get_object()
        audit_result = ExamAuditor.audit_exam(exam)
        
        if audit_result['passed']:
            exam.ai_audit_passed = True
            exam.save()
            return Response(audit_result)
        else:
            exam.ai_audit_passed = False
            exam.save()
            return Response(audit_result, status=status.HTTP_400_BAD_REQUEST)
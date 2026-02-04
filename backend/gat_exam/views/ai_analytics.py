import io
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Avg, F

# Библиотеки для генерации PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

# Локальные импорты (убедитесь, что пути правильные)
from ..models import ExamResult, Student
from ..services.ai_advisor import AIAdvisorService

# ==============================================================================
# 1. API ДЛЯ ДАШБОРДА (ДАННЫЕ + AI)
# ==============================================================================
class AIAnalyticsDashboardView(APIView):
    """
    API для страницы 'God Mode' (AnalyticsAI.tsx).
    Сочетает быструю SQL-аналитику и мощь GPT-4.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. 🔍 СБОР ДАННЫХ (SQL) - Быстро
        
        # Получаем последние 100 результатов
        results = ExamResult.objects.select_related('student', 'student__student_class').order_by('-id')[:100]
        
        # --- ЛОГИКА РАСЧЕТА РИСКОВ (Упрощенная) ---
        risk_list = []
        for r in results[:10]: # Берем срез для демонстрации
            if r.percentage < 60:
                risk_list.append({
                    "id": r.student.id,
                    "name": f"{r.student.last_name_ru} {r.student.first_name_ru}",
                    "grade": str(r.student.student_class),
                    "risk": 100 - int(r.percentage), # Чем меньше балл, тем выше риск
                    "drop": 15, # Заглушка (в реале: current_score - prev_score)
                    "reason": "Низкий балл по последнему тесту"
                })

        # --- СТАТИСТИКА ПО ТЕМАМ (MOCK) ---
        # В реальном проекте тут должен быть агрегационный запрос к модели TopicResult
        topics_stats = [
            {"name": "Алгебра", "score": 85, "trend": 5},
            {"name": "Геометрия", "score": 42, "trend": -12}, # Провальная тема
            {"name": "Физика", "score": 60, "trend": 1},
        ]

        # 2. 🧠 ВЫЗОВ ИИ (Только если запрошен параметр ?ask_ai=true)
        # Это экономит деньги. Фронтенд сначала грузит цифры, потом отдельным запросом просит совета.
        ai_advice = None
        if request.query_params.get('ask_ai') == 'true':
            ai_advice = AIAdvisorService.generate_strategic_insight(
                risk_students=risk_list,
                weak_topics=[t for t in topics_stats if t['score'] < 50],
                trend=-2.5
            )

        return Response({
            "risk_students": risk_list,
            "knowledge_map": topics_stats,
            "ai_advisor": ai_advice, # Будет null, если не запросили
            "kpi": {
                "forecast": "+12.5%",
                "validity": "99.9%",
                "engagement": "High"
            }
        })


# ==============================================================================
# 2. ГЕНЕРАТОР PDF ОТЧЕТА
# ==============================================================================
class AnalyticsReportPDFView(APIView):
    """
    Генерирует PDF-отчет для скачивания при клике на баннер.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Создаем байтовый буфер
        buffer = io.BytesIO()
        
        # Создаем объект PDF
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # --- ЗАГОЛОВОК ---
        p.setFont("Helvetica-Bold", 20)
        p.drawString(50, height - 50, "GAT Neural Analytics Report")
        
        p.setFont("Helvetica", 10)
        p.setFillColor(colors.grey)
        p.drawString(50, height - 70, f"Generated automatically on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        p.setFillColor(colors.black)
        
        # Линия разделитель
        p.setStrokeColor(colors.purple)
        p.setLineWidth(2)
        p.line(50, height - 85, 550, height - 85)
        
        # --- СЕКЦИЯ: EXECUTIVE SUMMARY ---
        y = height - 120
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "1. Executive Summary")
        y -= 25
        p.setFont("Helvetica", 11)
        p.drawString(60, y, "Current academic forecast shows a positive trend of +12.5%.")
        y -= 15
        p.drawString(60, y, "However, critical attention is required in Geometry topics.")

        # --- СЕКЦИЯ: ЗОНА РИСКА ---
        y -= 50
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "2. High Risk Students (Priority List)")
        y -= 30
        
        # Пример данных (в идеале нужно делать запрос в БД, как в DashboardView)
        # Здесь используем демо-данные для PDF
        risk_students = [
            {"name": "Student A", "grade": "10A", "risk": "Critical (85%)"},
            {"name": "Student B", "grade": "10B", "risk": "High (72%)"},
            {"name": "Student C", "grade": "11A", "risk": "Moderate (60%)"},
        ]
        
        p.setFont("Helvetica", 11)
        for s in risk_students:
            p.drawString(70, y, f"• {s['name']} ({s['grade']}) — Risk Level: {s['risk']}")
            y -= 20

        # --- СЕКЦИЯ: РЕКОМЕНДАЦИИ ---
        y -= 30
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "3. AI Strategic Recommendations")
        y -= 25
        p.setFont("Helvetica-Oblique", 11)
        p.setFillColor(colors.darkblue)
        p.drawString(60, y, "Action: Conduct 'Math Hackathon' to improve engagement.")
        p.drawString(60, y - 20, "Focus: Review 3D Geometry concepts with 10th grade.")

        # --- ФУТЕР ---
        p.setFont("Helvetica", 9)
        p.setFillColor(colors.grey)
        p.drawString(50, 50, "Confidential Document. Do not distribute without permission.")
        p.drawRightString(550, 50, "Page 1 of 1")
        
        # Закрываем и сохраняем
        p.showPage()
        p.save()
        
        # Возвращаем результат
        buffer.seek(0)
        filename = f"GAT_Report_{datetime.now().strftime('%Y%m%d')}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
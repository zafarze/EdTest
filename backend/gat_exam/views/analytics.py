from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Avg, Count
from collections import defaultdict
import re

# Импорт моделей
from ..models import ExamResult, Student
from ..services.ai_service import generate_class_report

# ==========================================
# 1. AI REPORT (Без изменений)
# ==========================================
class ExamReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report_text = generate_class_report(pk)
            return Response({"report": report_text}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==========================================
# 2. DASHBOARD ANALYTICS
# ==========================================
class DashboardAnalyticsView(APIView):
    """
    URL: /api/analytics/dashboard/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Читаем фильтры
        schools_param = request.query_params.get('schools')
        classes_param = request.query_params.get('classes')
        gats_param = request.query_params.get('gats')

        # 2. Базовый запрос
        queryset = ExamResult.objects.select_related(
            'student', 'student__school', 'student__student_class', 'exam'
        ).all()

        # 3. Применяем фильтры
        if schools_param:
            try:
                ids = [int(x) for x in schools_param.split(',') if x.isdigit()]
                if ids:
                    queryset = queryset.filter(student__school__id__in=ids)
            except: pass

        if classes_param:
            target_grades = []
            for item in classes_param.split(','):
                digits = re.findall(r'\d+', item)
                if digits: target_grades.append(int(digits[0]))
            if target_grades:
                queryset = queryset.filter(student__student_class__grade_level__in=target_grades)

        if gats_param:
            target_rounds = []
            for item in gats_param.split(','):
                digits = re.findall(r'\d+', item)
                if digits: target_rounds.append(int(digits[0]))
            if target_rounds:
                # ВАЖНО: Проверь, как называется поле в модели Exam (round_id или gat_round)
                # Обычно это gat_round или просто round
                queryset = queryset.filter(exam__gat_round__in=target_rounds)

        # Если данных нет
        if not queryset.exists():
            return Response({
                "kpi": {"avg_gat": 0, "total_students": 0, "top_school": "-"},
                "leaders": [],
                "chart_schools": [],
                "chart_subjects": [], # Пустой список
                "matrix": []
            })

        # --- РАСЧЕТ KPI ---
        total_students = queryset.count()
        avg_gat = queryset.aggregate(Avg('percentage'))['percentage__avg'] or 0
        
        top_school_data = queryset.values('student__school__name').annotate(
            avg=Avg('percentage')
        ).order_by('-avg').first()
        top_school = top_school_data['student__school__name'] if top_school_data else "-"

        # --- ТОП 5 УЧЕНИКОВ ---
        leaders_qs = queryset.order_by('-score')[:5]
        leaders = []
        for res in leaders_qs:
            leaders.append({
                "id": res.student.id,
                "name": f"{res.student.last_name_ru} {res.student.first_name_ru}",
                "school": res.student.school.name if res.student.school else "Школа",
                "score": res.score
            })

        # --- ГРАФИК 1: ПО ШКОЛАМ ---
        schools_stats = queryset.values('student__school__name').annotate(
            score=Avg('percentage')
        ).order_by('-score')
        
        chart_schools = []
        for s in schools_stats:
            chart_schools.append({
                "name": s['student__school__name'],
                "score": round(s['score'], 1),
                "prev": 0 
            })

        # --- 🔥 НОВОЕ: ГРАФИК 2: ПО ПРЕДМЕТАМ ---
        # Группируем по имени предмета, связанного с экзаменом
        subjects_stats = queryset.values('exam__subjects__name').annotate(
            score=Avg('percentage')
        ).order_by('-score')

        chart_subjects = []
        for s in subjects_stats:
            subj_name = s['exam__subjects__name']
            if subj_name: # Исключаем None
                chart_subjects.append({
                    "name": subj_name,
                    "score": round(s['score'], 1)
                })

        # --- МАТРИЦА ОЦЕНОК ---
        tree = defaultdict(lambda: defaultdict(lambda: {
            "marks": defaultdict(int), "total": 0, "sum_pct": 0
        }))

        for res in queryset:
            cls_obj = res.student.student_class
            if not cls_obj: continue
            
            try:
                section = getattr(cls_obj, 'section', '')
                cls_name = f"{cls_obj.grade_level}-{section}" if section else f"{cls_obj.grade_level}"
                level = f"{cls_obj.grade_level} Класс"
            except:
                level = "Неизвестно"
                cls_name = str(cls_obj)

            if res.percentage == 100: mark = 10
            else: mark = int(res.percentage // 10) + 1
            if mark < 1: mark = 1
            if mark > 10: mark = 10

            tree[level][cls_name]["marks"][mark] += 1
            tree[level][cls_name]["total"] += 1
            tree[level][cls_name]["sum_pct"] += res.percentage

        grades_list = []
        sorted_levels = sorted(tree.keys(), key=lambda x: int(x.split()[0]) if x.split()[0].isdigit() else 0, reverse=True)

        for level in sorted_levels:
            classes_data = []
            for cls_name, data in tree[level].items():
                avg = round(data["sum_pct"] / data["total"], 1) if data["total"] > 0 else 0
                classes_data.append({
                    "name": cls_name,
                    "marks": data["marks"],
                    "total": data["total"],
                    "avg": avg
                })
            classes_data.sort(key=lambda x: x["name"])
            grades_list.append({"level": level, "classes": classes_data})

        matrix = [{"id": 1, "title": "GAT (Общий)", "grades": grades_list}]

        return Response({
            "kpi": {
                "avg_gat": round(avg_gat, 1),
                "total_students": total_students,
                "top_school": top_school
            },
            "leaders": leaders,
            "chart_schools": chart_schools,
            "chart_subjects": chart_subjects, # 🔥 Отправляем новые данные
            "matrix": matrix
        }, status=status.HTTP_200_OK)
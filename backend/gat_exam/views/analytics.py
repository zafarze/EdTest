from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, F, Q
from django.db.models.functions import Coalesce
from collections import defaultdict

# Импорты моделей
from ..models import School, ExamResult, Student, Subject, StudentClass

class AnalyticsView(APIView):
    """
    Оптимизированная аналитика.
    Использует Aggregation и Python-группировку вместо циклов по БД.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # --- 1. ОПРЕДЕЛЕНИЕ ОБЛАСТИ ВИДИМОСТИ (SCOPING) ---
        # По умолчанию берем всё
        schools_qs = School.objects.all()
        results_qs = ExamResult.objects.all()

        # Если это Директор — сужаем область видимости до его школы
        if hasattr(user, 'profile') and user.profile.role == 'director':
            if user.profile.school:
                my_school_id = user.profile.school.id
                schools_qs = schools_qs.filter(id=my_school_id)
                results_qs = results_qs.filter(student__school_id=my_school_id)
            else:
                # Если у директора нет школы, возвращаем пустые данные
                return Response({"chart_schools": [], "leaders": [], "matrix": [], "kpi": {}})

        # --- 2. KPI (ОБЩИЕ ПОКАЗАТЕЛИ) ---
        # Считаем одной командой агрегации
        kpi_stats = results_qs.aggregate(
            avg_score=Avg('score'),
            total_students=Count('student', distinct=True) # Уникальные ученики, сдававшие экзамены
        )
        
        raw_avg = kpi_stats['avg_score'] or 0
        # Логика конвертации 100 -> 10
        avg_gat_10 = round(raw_avg / 10, 1) if raw_avg > 10 else round(raw_avg, 1)

        # --- 3. ГРАФИК ШКОЛ (БЫСТРАЯ АГРЕГАЦИЯ) ---
        # Coalesce нужен, чтобы заменить None на 0, если результатов нет
        schools_data = schools_qs.annotate(
            avg_raw=Coalesce(Avg('students__results__score'), 0.0)
        ).values('name', 'avg_raw').order_by('-avg_raw')

        schools_chart = []
        top_school_name = "-"

        for s in schools_data:
            val = s['avg_raw']
            score_10 = round(val / 10, 1) if val > 10 else round(val, 1)
            
            schools_chart.append({
                "name": s['name'],
                "score": score_10,
                "prev": round(score_10 * 0.95, 1) # Имитация динамики (можно заменить на реальную логику)
            })
        
        if schools_chart:
            top_school_name = schools_chart[0]['name']

        # --- 4. ТОП УЧЕНИКИ (LEADERS) ---
        # select_related ускоряет получение имен и названий школ
        top_students = results_qs.select_related('student', 'student__school')\
            .order_by('-score')[:5]
            
        leaders_data = [
            {
                "id": res.student.id,
                "name": f"{res.student.last_name_ru} {res.student.first_name_ru}",
                "school": res.student.school.name,
                "score": int(res.score)
            }
            for res in top_students
        ]

        # --- 5. МАТРИЦА 1-10 (SUPER OPTIMIZED) ---
        
        # Шаг А: Получаем "плоский" список всех нужных данных одним запросом
        # Мы берем только результаты активных предметов
        raw_matrix_data = results_qs.filter(exam__subjects__is_active=True).values(
            'exam__subjects__id',
            'exam__subjects__name',
            'exam__subjects__color', # Если есть поле color
            'student__student_class__grade_level',
            'student__student_class__section',
            'score'
        )

        # Шаг Б: Группировка в Python (Это намного быстрее, чем 300 запросов к БД)
        # Структура: tree[subject_id][grade][section] = [scores...]
        tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
        subject_meta = {} # Храним названия и цвета предметов

        for row in raw_matrix_data:
            subj_id = row['exam__subjects__id']
            subj_name = row['exam__subjects__name']
            subj_color = row.get('exam__subjects__color', 'blue') # Fallback цвет
            
            grade = row['student__student_class__grade_level']
            section = row['student__student_class__section']
            score = row['score']
            
            # Сохраняем метаданные предмета (чтобы не потерять при группировке)
            if subj_id not in subject_meta:
                subject_meta[subj_id] = {'name': subj_name, 'color': subj_color}
            
            if grade and section: # Проверка на всякий случай
                tree[subj_id][grade][section].append(score)

        # Шаг В: Формируем итоговый JSON для фронтенда
        final_matrix = []

        for subj_id, grades_data in tree.items():
            meta = subject_meta[subj_id]
            
            grades_list = []
            
            # Сортируем параллели (11, 10, 9...)
            for grade in sorted(grades_data.keys(), reverse=True):
                classes_list = []
                sections_data = grades_data[grade]
                
                # Сортируем классы (А, Б, В...)
                for section in sorted(sections_data.keys()):
                    scores = sections_data[section]
                    total_students = len(scores)
                    
                    # Расчет среднего
                    avg_val = sum(scores) / total_students if total_students > 0 else 0
                    avg_10 = round(avg_val / 10, 1) if avg_val > 10 else round(avg_val, 1)

                    # Расчет распределения (1-10)
                    marks_dist = {i: 0 for i in range(1, 11)}
                    for s in scores:
                        # Конвертация
                        val = s / 10 if s > 10 else s
                        mark = int(round(val))
                        # Защита границ
                        if mark < 1: mark = 1
                        if mark > 10: mark = 10
                        marks_dist[mark] += 1
                    
                    classes_list.append({
                        "name": f"{grade} \"{section}\"",
                        "marks": marks_dist,
                        "total": total_students,
                        "avg": avg_10
                    })
                
                grades_list.append({
                    "level": f"{grade} Классы",
                    "classes": classes_list
                })
            
            # Добавляем предмет в итоговый список
            final_matrix.append({
                "id": subj_id,
                "title": meta['name'],
                # Можно мапить цвета на фронте, или передавать отсюда
                "color": f"text-{meta.get('color', 'indigo')}-600", 
                "bg": f"bg-{meta.get('color', 'indigo')}-50",
                "grades": grades_list
            })

        # Сортировка предметов по названию
        final_matrix.sort(key=lambda x: x['title'])

        return Response({
            "chart_schools": schools_chart,
            "leaders": leaders_data,
            "matrix": final_matrix,
            "kpi": {
                "avg_gat": avg_gat_10,
                "total_students": kpi_stats['total_students'], # Общее число уникальных учеников
                "top_school": top_school_name
            }
        })
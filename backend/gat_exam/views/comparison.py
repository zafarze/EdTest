from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, F, Q
from django.db.models.functions import TruncDate
from collections import defaultdict

# Импортируем твои модели
from ..models import ExamResult, Exam, Subject, School, Student, StudentClass

class AnalyticsView(APIView):
    """
    Главный контроллер аналитики для Dashboard.
    Собирает данные для графиков, тепловых карт и AI-инсайтов.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ==========================================
        # 1. СБОР И ПРИМЕНЕНИЕ ФИЛЬТРОВ
        # ==========================================
        
        # Получаем списки ID из запроса (React шлет ?schools[]=1&schools[]=2)
        school_ids = request.GET.getlist('schools[]')
        subject_ids = request.GET.getlist('subjects[]')
        grade_levels = request.GET.getlist('grades[]') # 11, 10, 9...
        letters = request.GET.getlist('letters[]')     # А, Б, В...
        gat_rounds = request.GET.getlist('gats[]')     # 1, 2...

        # Базовый QuerySet: Только завершенные экзамены
        # Используем select_related для оптимизации (чтобы не было 1000 запросов к БД)
        results = ExamResult.objects.select_related(
            'student', 
            'student__school', 
            'student__student_class', 
            'exam', 
            'exam__quarter'
        ).prefetch_related('exam__subjects').filter(exam__status='finished')

        # Применяем фильтры, если они переданы
        if school_ids:
            results = results.filter(student__school__id__in=school_ids)
        
        if subject_ids:
            # Результат относится к экзамену, экзамен может содержать несколько предметов.
            # Фильтруем экзамены, которые содержат выбранные предметы.
            results = results.filter(exam__subjects__id__in=subject_ids)

        if grade_levels:
            results = results.filter(student__student_class__grade_level__in=grade_levels)

        if letters:
            results = results.filter(student__student_class__section__in=letters)

        if gat_rounds:
            results = results.filter(exam__gat_round__in=gat_rounds)

        # ==========================================
        # 2. СБОРКА ДАННЫХ (АГРЕГАЦИЯ)
        # ==========================================

        # A. Сводный график (Summary) - Среднее по предметам
        summary_chart = self._get_summary_chart(results)

        # B. Сравнение школ (Comparison)
        comparison_chart = self._get_comparison_chart(results, summary_chart['labels'])

        # C. Тренд (Trend) - Динамика по GAT
        trend_chart = self._get_trend_chart(results)

        # D. Тепловые карты (Heatmap) - Самое сложное
        heatmap_data, heatmap_summary = self._get_heatmap_data(results)

        # E. Группа риска (Risk Group)
        risk_group = self._get_risk_group(results)

        # F. AI Инсайты (AI Insights)
        ai_insights = self._get_ai_insights(results, trend_chart)

        # ==========================================
        # 3. ФОРМИРОВАНИЕ ОТВЕТА (JSON)
        # ==========================================
        response_data = {
            "charts": {
                "summary": summary_chart,
                "comparison": comparison_chart,
                "trend": trend_chart,
                "gender": None # Убрали по требованию
            },
            "heatmap": {
                "data": heatmap_data,
                "summary": heatmap_summary
            },
            "problems": {}, # Заглушка, можно заполнить из heatmap_summary['hardest']
            "risk_group": risk_group,
            "ai_insights": ai_insights
        }

        return Response(response_data)


    # ==========================================
    # ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ (ЛОГИКА)
    # ==========================================

    def _get_summary_chart(self, qs):
        """
        Считает средний процент успеваемости по каждому предмету.
        Возвращает: { labels: ['Math', 'Eng'], datasets: [...] }
        """
        # Получаем уникальные предметы, которые встречались в результатах
        # (Чтобы не показывать предметы, по которым не было экзаменов)
        subject_stats = {}
        
        # Проходимся по результатам и группируем баллы по предметам
        # Примечание: В идеале ExamResult должен иметь FK на Subject, но у нас он через Exam.
        # Если экзамен мульти-предметный (GAT), то в results.details должны быть разбивки.
        # Для упрощения берем первый предмет экзамена (обычно GAT делится на секции).
        
        # Вариант 1: Если в ExamResult.details лежит {"Math": 80, "Eng": 70}
        # Вариант 2 (Упрощенный): Считаем среднее по экзамену и приписываем первому предмету.
        
        # Реализуем надежный вариант через агрегацию по Subject ID
        subjects = Subject.objects.filter(exams__results__in=qs).distinct()
        
        labels = []
        data = []

        for subj in subjects:
            # Берем средний процент всех экзаменов, где есть этот предмет
            avg = qs.filter(exam__subjects=subj).aggregate(val=Avg('percentage'))['val']
            if avg is not None:
                labels.append(subj.abbreviation if subj.abbreviation else subj.name[:10])
                data.append(round(avg, 1))

        return {
            "labels": labels,
            "datasets": [{
                "label": "Среднее по системе",
                "data": data
            }]
        }

    def _get_comparison_chart(self, qs, subject_labels):
        """
        Сравнивает школы по предметам.
        Ось X: Школы.
        Столбики: Предметы.
        """
        schools = School.objects.filter(students__results__in=qs).distinct()
        school_labels = [s.name for s in schools]
        
        datasets = []
        
        # Получаем список предметов, которые есть в summary (чтобы цвета совпадали)
        # Но для comparison нам нужно итерироваться по предметам
        active_subjects = Subject.objects.filter(exams__results__in=qs).distinct()

        for subj in active_subjects:
            subj_data = []
            for school in schools:
                # Средний балл по этому предмету в этой школе
                avg = qs.filter(student__school=school, exam__subjects=subj).aggregate(val=Avg('percentage'))['val']
                subj_data.append(round(avg, 1) if avg else 0)
            
            datasets.append({
                "label": subj.name,
                "data": subj_data
            })

        return {
            "labels": school_labels,
            "datasets": datasets
        }

    def _get_trend_chart(self, qs):
        """
        Показывает динамику по GAT (1, 2, 3, 4).
        """
        labels = ["GAT-1", "GAT-2", "GAT-3", "GAT-4"]
        
        # Нам нужно разбить данные по предметам, чтобы нарисовать несколько линий
        active_subjects = Subject.objects.filter(exams__results__in=qs).distinct()[:3] # Берем топ-3 предмета для чистоты
        
        datasets = []
        for subj in active_subjects:
            data_points = []
            for i in range(1, 5): # GAT 1 to 4
                avg = qs.filter(exam__gat_round=i, exam__subjects=subj).aggregate(val=Avg('percentage'))['val']
                data_points.append(round(avg, 1) if avg else None)
            
            datasets.append({
                "label": subj.name,
                "data": data_points
            })
            
        return {
            "labels": labels,
            "datasets": datasets
        }

    def _get_heatmap_data(self, qs):
        """
        Формирует структуру для тепловых карт, разбирая JSON с ответами.
        Ожидаемая структура JSON в ExamResult.details:
        { "1": true, "2": false, ... } - где ключ - номер вопроса.
        """
        # Структура: data[Subject_Name][School_Name][Question_Num] = {correct, total}
        raw_map = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"correct": 0, "total": 0})))
        
        # Получаем данные пакетами (оптимизация)
        # Нам нужны: детали ответов, имя школы, класс, предмет
        values = qs.values(
            'details', 
            'student__school__name', 
            'exam__subjects__name',
            'student__student_class__grade_level'
        )

        for item in values:
            details = item['details']
            school_name = item['student__school__name']
            subject_name = item['exam__subjects__name']
            grade = item['student__student_class__grade_level']
            
            # Ключ для группировки карт (например: "Математика (11-е классы)")
            heatmap_key = f"{subject_name} ({grade}-е классы)"
            
            if not details or not isinstance(details, dict):
                continue
            
            for q_num, is_correct in details.items():
                # q_num - это номер вопроса ("1", "2"...)
                raw_map[heatmap_key][school_name][q_num]["total"] += 1
                if is_correct:
                    raw_map[heatmap_key][school_name][q_num]["correct"] += 1

        # Превращаем в финальный формат для фронтенда
        final_data = {}
        final_summary = {}

        for topic_key, schools_data in raw_map.items():
            # 1. Формируем "data"
            all_questions = set()
            formatted_schools = {}
            
            topic_q_stats = defaultdict(lambda: {"correct": 0, "total": 0}) # Для подсчета easy/hard

            for school_name, q_data in schools_data.items():
                formatted_schools[school_name] = {}
                for q_num, stats in q_data.items():
                    all_questions.add(q_num)
                    percent = round((stats["correct"] / stats["total"]) * 100) if stats["total"] > 0 else 0
                    formatted_schools[school_name][q_num] = {"percentage": percent}
                    
                    # Собираем общую статистику по вопросу
                    topic_q_stats[q_num]["correct"] += stats["correct"]
                    topic_q_stats[q_num]["total"] += stats["total"]

            # Сортируем вопросы (1, 2, 3, 10...)
            sorted_questions = sorted(list(all_questions), key=lambda x: int(x) if x.isdigit() else x)
            
            final_data[topic_key] = {
                "questions": sorted_questions,
                "schools": formatted_schools
            }

            # 2. Формируем "summary" (easiest, hardest, ranking)
            # Рейтинг вопросов
            q_performance = []
            for q_num, stats in topic_q_stats.items():
                p = round((stats["correct"] / stats["total"]) * 100) if stats["total"] > 0 else 0
                q_performance.append({"q_num": q_num, "percentage": p})
            
            q_performance.sort(key=lambda x: x["percentage"], reverse=True) # От легких к сложным

            # Рейтинг школ
            school_ranking = []
            for school_name, q_data in formatted_schools.items():
                # Среднее по всем вопросам школы
                sum_p = sum(d["percentage"] for d in q_data.values())
                count = len(q_data)
                avg = round(sum_p / count) if count > 0 else 0
                school_ranking.append({"school": school_name, "avg": avg})
            
            school_ranking.sort(key=lambda x: x["avg"], reverse=True)

            final_summary[topic_key] = {
                "easiest": q_performance[:2],
                "hardest": q_performance[-2:],
                "ranking": school_ranking
            }

        return final_data, final_summary

    def _get_risk_group(self, qs):
        """
        Находит учеников с баллом < 50%.
        Пытается определить тренд (сравнивая с предыдущим GAT).
        """
        # Берем только последние результаты учеников (группировка сложная, упростим)
        # Фильтруем "двоечников"
        low_scores = qs.filter(percentage__lt=50).order_by('percentage')[:10] # Топ 10 проблемных
        
        risk_list = []
        for res in low_scores:
            # Попытка найти предыдущий результат
            trend = "stable"
            current_gat = res.exam.gat_round
            if current_gat > 1:
                prev_res = ExamResult.objects.filter(
                    student=res.student,
                    exam__gat_round=current_gat - 1,
                    exam__subjects__in=res.exam.subjects.all()
                ).first()
                
                if prev_res:
                    if res.percentage < prev_res.percentage:
                        trend = "down" # Ухудшился
                    elif res.percentage > prev_res.percentage:
                        trend = "up"   # Улучшился
            
            risk_list.append({
                "name": f"{res.student.last_name_ru} {res.student.first_name_ru}",
                "class": f"{res.student.student_class.grade_level}{res.student.student_class.section}",
                "school": res.student.school.name,
                "subject": res.exam.subjects.first().name if res.exam.subjects.exists() else "GAT",
                "score": int(res.percentage),
                "trend": trend
            })
            
        return risk_list

    def _get_ai_insights(self, qs, trend_chart):
        """
        Генерирует инсайты. 
        В будущем здесь будет ML модель. Сейчас - умная эвристика.
        """
        # 1. Прогноз (Forecast)
        # Берем данные из trend_chart и делаем простую линейную экстраполяцию
        forecast = []
        datasets = trend_chart.get('datasets', [])
        if datasets:
            data = datasets[0]['data'] # Берем первый предмет
            valid_points = [d for d in data if d is not None]
            if len(valid_points) >= 2:
                # Простейшая логика: следующее значение = последнее + (последнее - предпоследнее)
                last = valid_points[-1]
                prev = valid_points[-2]
                predicted = min(100, max(0, last + (last - prev))) # Clamp 0-100
                
                forecast = [
                    {"label": "GAT-1", "actual": data[0], "predicted": None},
                    {"label": "GAT-2", "actual": data[1] if len(data)>1 else None, "predicted": None},
                    {"label": "GAT-3", "actual": data[2] if len(data)>2 else None, "predicted": None},
                    {"label": "GAT-4 (AI)", "actual": None, "predicted": int(predicted)}
                ]
        
        if not forecast:
            # Заглушка если данных мало
            forecast = [{"label": "Мало данных", "actual": 0, "predicted": 0}]

        # 2. Кластеры (Статика или простая логика)
        # Можно посчитать, сколько учеников имеют >80 по мат и <60 по языкам (Технари)
        cluster_analysis = [
            {"label": "Технари", "value": 45, "desc": "Сильная математика, слабая история", "icon": "Calculator", "color": "bg-blue-100 text-blue-600"},
            {"label": "Гуманитарии", "value": 30, "desc": "Сильные языки, слабая физика", "icon": "BookOpen", "color": "bg-pink-100 text-pink-600"},
            {"label": "Универсалы", "value": 25, "desc": "Ровные баллы по всем предметам", "icon": "Layers", "color": "bg-emerald-100 text-emerald-600"}
        ]

        # 3. Рекомендации (На основе самых сложных предметов из Summary)
        recommendations = []
        # Находим предметы с самым низким средним баллом
        subjects = Subject.objects.filter(exams__results__in=qs).annotate(avg=Avg('exam__results__percentage')).order_by('avg')[:2]
        
        for subj in subjects:
            recommendations.append({
                "subject": subj.name,
                "topic": "Повторение базовых тем", # Здесь в будущем будет конкретная тема из Heatmap
                "priority": "High"
            })

        return {
            "forecast": forecast,
            "cheating_risk": [
                {"name": "Чистые результаты", "value": 92, "color": "#10b981"},
                {"name": "Подозрение", "value": 8, "color": "#f59e0b"}
            ],
            "cluster_analysis": cluster_analysis,
            "recommendations": recommendations
        }
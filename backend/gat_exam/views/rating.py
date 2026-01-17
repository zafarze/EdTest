from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg
from ..models import ExamResult, Subject, StudentClass, School
import json

class MonitoringRatingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Получаем язык (ru, tj, en). По умолчанию ru
        lang = request.headers.get('Accept-Language', 'ru').lower()
        
        # --- ПАРАМЕТРЫ ---
        school_ids_param = request.query_params.get('schools')
        grades = request.query_params.get('grades')
        sections = request.query_params.get('sections')
        exams = request.query_params.get('exams') 
        days = request.query_params.get('days')
        subjects = request.query_params.get('subjects')

        # Пагинация
        try:
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 50))
        except ValueError:
            page = 1
            limit = 50
        offset = (page - 1) * limit

        # --- ПОДГОТОВКА ID ШКОЛ ---
        selected_school_ids = []
        if school_ids_param:
            selected_school_ids = [int(x) for x in school_ids_param.split(',') if x.strip().isdigit()]
        
        # --- СБОР МЕТА-ДАННЫХ ---
        classes_qs = StudentClass.objects.all()
        if selected_school_ids:
            classes_qs = classes_qs.filter(school_id__in=selected_school_ids)
        
        sections_qs = classes_qs
        if grades:
            g_list = [int(x) for x in grades.split(',') if x.strip().isdigit()]
            sections_qs = sections_qs.filter(grade_level__in=g_list)

        available_grades = classes_qs.values_list('grade_level', flat=True).distinct().order_by('grade_level')
        available_sections = sections_qs.values_list('section', flat=True).distinct().order_by('section')
        available_gats = ExamResult.objects.values_list('exam__gat_round', flat=True).distinct().order_by('exam__gat_round')
        
        # Предметы (перевод)
        all_subjects_db = Subject.objects.filter(is_active=True).order_by('name')
        smart_subjects = []
        for s in all_subjects_db:
            default_name = getattr(s, 'name', 'Subject')
            name = default_name
            if 'tj' in lang: name = getattr(s, 'name_tj', None) or default_name
            elif 'en' in lang: name = getattr(s, 'name_en', None) or default_name
            smart_subjects.append({'id': str(s.id), 'label': name, 'slug': getattr(s, 'slug', str(s.id))})

        # --- ШКОЛЫ И КЛАССЫ ---
        school_classes_info = {}
        schools_to_fetch = School.objects.filter(id__in=selected_school_ids) if selected_school_ids else School.objects.all()
        
        for school in schools_to_fetch:
            school_classes = StudentClass.objects.filter(school_id=school.id)
            grades_in_school = school_classes.values_list('grade_level', flat=True).distinct().order_by('grade_level')
            sections_in_school = school_classes.values_list('section', flat=True).distinct().order_by('section')
            
            # Логика имени школы (RU = name, TJ = name_tj, EN = name_en)
            sch_name = school.name
            if 'tj' in lang: 
                sch_name = getattr(school, 'name_tj', '') or school.name
            elif 'en' in lang: 
                sch_name = getattr(school, 'name_en', '') or school.name
            
            school_classes_info[str(school.id)] = {
                'id': school.id,
                'name': sch_name,
                'color_theme': school.color_theme,
                'grades': list(grades_in_school),
                'sections': list(sections_in_school),
            }

        # --- ФИЛЬТРАЦИЯ ---
        queryset = ExamResult.objects.select_related('student', 'student__school', 'student__student_class', 'exam').prefetch_related('exam__subjects')

        if selected_school_ids: queryset = queryset.filter(student__school_id__in=selected_school_ids)
        if grades: queryset = queryset.filter(student__student_class__grade_level__in=[int(x) for x in grades.split(',') if x.strip().isdigit()])
        if sections: queryset = queryset.filter(student__student_class__section__in=[x.strip() for x in sections.split(',') if x.strip()])
        if exams: queryset = queryset.filter(exam__gat_round__in=[int(e.lower().replace('gat', '')) for e in exams.split(',') if 'gat' in e.lower()])
        if days: queryset = queryset.filter(exam__gat_day__in=[int(x) for x in days.split(',') if x.strip().isdigit()])
        if subjects: queryset = queryset.filter(exam__subjects__id__in=[int(x) for x in subjects.split(',') if x.strip().isdigit()]).distinct()

        final_queryset = queryset.order_by('-score')
        total_count = final_queryset.count()

        # --- ЛИДЕР (ИСПРАВЛЕНО) ---
        leader_info = { "key": "leader_school", "params": {}, "value": "-", "type": "school" }
        if final_queryset.exists():
            # Запрашиваем только существующие поля! name_ru не запрашиваем.
            best_school = final_queryset.values(
                'student__school__name', 
                'student__school__name_tj', 
                'student__school__name_en'
            ).annotate(avg_score=Avg('score')).order_by('-avg_score').first()
            
            if best_school:
                 # Выбираем имя лидера
                 l_sch_name = best_school['student__school__name'] # По умолчанию (RU)
                 
                 if 'tj' in lang and best_school.get('student__school__name_tj'): 
                     l_sch_name = best_school['student__school__name_tj']
                 elif 'en' in lang and best_school.get('student__school__name_en'): 
                     l_sch_name = best_school['student__school__name_en']
                 
                 leader_info = { "key": "leader_school", "params": {}, "value": l_sch_name, "type": "school" }

        # --- СПИСОК СТУДЕНТОВ ---
        paginated_qs = final_queryset[offset : offset + limit]
        
        students_data = []
        for res in paginated_qs:
            student = res.student
            exam = res.exam
            badges = []
            db_subjects = exam.subjects.all()
            
            # Подготовка details
            details_map = {}
            if res.details:
                raw_details = res.details
                if isinstance(raw_details, str):
                    try: raw_details = json.loads(raw_details.replace("'", '"'))
                    except: raw_details = {}
                if isinstance(raw_details, dict):
                    for k, v in raw_details.items():
                        details_map[str(k).strip().lower()] = v

            # Расчет баллов
            for subj in db_subjects:
                score_sum = 0
                has_score = False
                subj_id = str(subj.id)
                subj_slug = getattr(subj, 'slug', '').lower()
                target_prefixes = []
                
                if subj_id == '1': target_prefixes = ['math']
                elif subj_id == '6': target_prefixes = ['eng']
                elif subj_id == '3': target_prefixes = ['рус.яз']
                elif subj_id == '2': target_prefixes = ['заб.точ']
                elif subj_id == '4': target_prefixes = ['табиат', 'tabiat']
                else:
                    if 'mat' in subj_slug: target_prefixes = ['math']
                    elif 'eng' in subj_slug: target_prefixes = ['eng']
                    elif 'rus' in subj_slug: target_prefixes = ['рус.яз']
                    elif 'taj' in subj_slug or 'zab' in subj_slug: target_prefixes = ['заб.точ']
                    elif 'tab' in subj_slug or 'sci' in subj_slug: target_prefixes = ['табиат']
                    else: target_prefixes = [subj_slug]

                for key, val in details_map.items():
                    for prefix in target_prefixes:
                        if key.startswith(prefix + '_') or key.startswith(prefix + ' '):
                            try:
                                score_sum += int(val)
                                has_score = True
                            except: pass
                
                badges.append({
                    "slug": getattr(subj, 'slug', 'def'),
                    "name": (getattr(subj, 'abbreviation', '') or subj.name)[:3].upper(), 
                    "score": score_sum if has_score else "-",
                    "color": getattr(subj, 'color', 'indigo')
                })

            # 🔥 ПЕРЕВОД ИМЕН (ИСПРАВЛЕНО) 🔥
            base_first = getattr(student, 'first_name', '')
            base_last = getattr(student, 'last_name', '')
            
            s_first_name = base_first
            s_last_name = base_last
            school_name = student.school.name # Default RU

            if 'tj' in lang:
                s_first_name = getattr(student, 'first_name_tj', '') or base_first
                s_last_name = getattr(student, 'last_name_tj', '') or base_last
                school_name = getattr(student.school, 'name_tj', '') or student.school.name
            elif 'en' in lang:
                s_first_name = getattr(student, 'first_name_en', '') or base_first
                s_last_name = getattr(student, 'last_name_en', '') or base_last
                school_name = getattr(student.school, 'name_en', '') or student.school.name
            else:
                # RU: Ищем first_name_ru, если нет - берем first_name
                s_first_name = getattr(student, 'first_name_ru', '') or base_first
                s_last_name = getattr(student, 'last_name_ru', '') or base_last
                # У школы name_ru нет, поэтому просто name
                school_name = student.school.name 

            full_name = f"{s_last_name} {s_first_name}".strip()

            students_data.append({
                "id": student.id,
                "name": full_name,
                "firstName": s_first_name,
                "lastName": s_last_name,
                "school": school_name,
                "schoolId": student.school.id,
                "grade": student.student_class.grade_level,
                "section": student.student_class.section,
                "exam": f"GAT-{exam.gat_round}",
                "score": res.score,
                "badges": badges
            })

        return Response({
            "meta": {
                "availableGrades": list(available_grades),
                "availableSections": list(available_sections),
                "availableGats": [f"gat{x}" for x in available_gats],
                "availableSubjects": smart_subjects,
                "schoolClasses": school_classes_info,
                "pagination": {
                    "page": page, "limit": limit, "total": total_count, "has_next": (offset + limit) < total_count
                }
            },
            "leader": leader_info,
            "stats": {
                "participants": total_count,
                "avgScore": round(final_queryset.aggregate(Avg('score'))['score__avg'] or 0)
            },
            "data": students_data
        })
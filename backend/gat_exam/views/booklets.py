# backend/gat_exam/views/booklets.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.http import HttpResponse
import logging

# Логгер
logger = logging.getLogger(__name__)

# WeasyPrint (PDF движок)
try:
    import weasyprint
except ImportError:
    weasyprint = None

# --- ИМПОРТЫ МОДЕЛЕЙ ---
from ..models import School, Exam, Question, Subject, BookletSection

# ==============================================================================
# 1. КАТАЛОГ БУКЛЕТОВ (Список для карточек)
# ==============================================================================
class BookletCatalogView(APIView):
    """
    Показывает список сгенерированных буклетов.
    Поддерживает уровни навигации: schools -> grades -> gats -> booklets
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get('level', 'schools')
        
        # --- УРОВЕНЬ 1: СПИСОК ШКОЛ ---
        if level == 'schools':
            schools = School.objects.annotate(
                tests_count=Count('exams')
            ).filter(tests_count__gt=0).order_by('id')
            
            data = []
            for s in schools:
                data.append({
                    "id": s.id,
                    "name": s.name,
                    "tests_count": s.tests_count,
                    "students_count": 0 
                })
            return Response(data)

        # --- УРОВЕНЬ 2: СПИСОК КЛАССОВ ---
        elif level == 'grades':
            school_id = request.query_params.get('schoolId')
            if not school_id: return Response([], 200)

            exams = Exam.objects.filter(school_id=school_id).values('grade_level').annotate(count=Count('id')).order_by('grade_level')
            
            data = []
            for e in exams:
                g = e['grade_level']
                data.append({
                    "id": g,
                    "grade_level": g,
                    "name": f"{g} Класс",
                    "tests_count": e['count']
                })
            return Response(data)

        # --- УРОВЕНЬ 3: СПИСОК РАУНДОВ (GAT-1, GAT-2...) ---
        # 🔥 ИСПРАВЛЕНИЕ: Группируем, чтобы показать уникальные папки GAT
        elif level == 'gats':
            school_id = request.query_params.get('schoolId')
            grade = request.query_params.get('grade')
            
            qs = Exam.objects.filter(school_id=school_id)
            if grade:
                qs = qs.filter(grade_level=grade)
            
            # Получаем уникальные номера раундов
            rounds_values = qs.values('gat_round').distinct().order_by('gat_round')
            
            data = []
            for item in rounds_values:
                r_num = item['gat_round']
                # Берем любой экзамен из этого раунда, чтобы получить дату и статус для превью папки
                example_exam = qs.filter(gat_round=r_num).first()
                
                data.append({
                    "id": f"gat-{r_num}",   # Уникальный ID для ключа React
                    "number": r_num,        # 🔥 ВАЖНО: Это поле ждет Frontend для отображения "GAT-1"
                    "date": str(example_exam.date) if example_exam else None,
                    "status": example_exam.status if example_exam else 'draft'
                })
            return Response(data)

        # --- УРОВЕНЬ 4: СПИСОК БУКЛЕТОВ (КОНКРЕТНЫЕ ВАРИАНТЫ) ---
        elif level == 'booklets':
            school_id = request.query_params.get('schoolId')
            grade = request.query_params.get('grade')
            gat_number = request.query_params.get('gatNumber') # Фронт передает это при клике на папку
            
            qs = Exam.objects.filter(school_id=school_id)
            if grade:
                qs = qs.filter(grade_level=grade)
            if gat_number:
                qs = qs.filter(gat_round=gat_number)
            
            qs = qs.order_by('gat_day', 'variant')
            
            data = []
            for exam in qs:
                subjects = [s.name for s in exam.subjects.all()]
                is_ready = exam.status != 'draft'
                
                data.append({
                    "id": exam.id,
                    "title": exam.title,
                    "variant": exam.variant,
                    "day": exam.gat_day,
                    "gat_round": exam.gat_round,
                    "exam_round": {
                        "name": f"GAT-{exam.gat_round}", 
                        "date": str(exam.date or "N/A")
                    },
                    "subjects": subjects,
                    "date": exam.created_at.strftime("%d.%m.%Y"),
                    "question_count": exam.questions.count(),
                    "fill_percent": 100 if is_ready else 50,
                    "color": "blue" if exam.variant == 'A' else "indigo",
                    "status": exam.status
                })
            return Response(data)

        return Response({"error": f"Unknown level: {level}"}, 400)


# ==============================================================================
# 2. ПРЕДПРОСМОТР (PREVIEW)
# ==============================================================================
class BookletPreviewView(APIView):
    """
    Возвращает JSON структуру буклета для отрисовки на фронтенде.
    Учитывает перемешивание (Shuffle Map) для Варианта Б.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        
        # 1. Получаем карту порядка (JSON)
        order_map = exam.question_order or {}
        
        # 2. Загружаем вопросы
        all_questions = list(exam.questions.select_related('topic__subject').prefetch_related('choices'))
        q_lookup = {q.id: q for q in all_questions}

        # 3. Собираем вопросы в правильном порядке
        ordered_questions = []
        
        if order_map:
            # Сортируем ключи ("1", "2", "3"...)
            sorted_keys = sorted(order_map.keys(), key=lambda x: int(x))
            
            for key in sorted_keys:
                item = order_map[key]
                
                # Поддержка формата { "1": 10 } и { "1": {"id": 10, "choices": [...]} }
                if isinstance(item, dict):
                    q_id = item.get('id')
                    custom_choices_order = item.get('choices', [])
                else:
                    q_id = item
                    custom_choices_order = []

                question = q_lookup.get(q_id)
                if question:
                    # Формируем данные вопроса для фронтенда
                    q_data = self._serialize_question(question, custom_choices_order)
                    ordered_questions.append(q_data)
        else:
            # Fallback (если карты нет)
            for q in all_questions:
                ordered_questions.append(self._serialize_question(q))

        # 4. Группируем по секциям (Предметам)
        sections = []
        current_subject = None
        current_q_list = []

        for q in ordered_questions:
            subj_name = q['subject_name']
            
            if subj_name != current_subject:
                if current_subject:
                    sections.append({
                        "id": len(sections) + 1,
                        "subject_name": current_subject,
                        "grade_level": exam.grade_level,
                        "questions": current_q_list
                    })
                current_subject = subj_name
                current_q_list = []
            
            current_q_list.append(q)

        # Добавляем последнюю секцию
        if current_subject:
            sections.append({
                "id": len(sections) + 1,
                "subject_name": current_subject,
                "grade_level": exam.grade_level,
                "questions": current_q_list
            })

        # 5. Итоговый ответ
        response_data = {
            "id": exam.id,
            "title": exam.title,
            "variant": exam.variant,
            "gat_round": exam.gat_round,
            "exam_round": {"name": f"GAT-{exam.gat_round}", "date": str(exam.date)},
            "sections": sections,
            "questions": ordered_questions, 
            "grade_level_display": f"{exam.grade_level} Класс",
            "academic_year": "2025-2026"
        }
        
        return Response(response_data)

    def _serialize_question(self, question, choices_order_ids=None):
        """Превращает объект вопроса в JSON + сортирует ответы"""
        
        # Получаем все варианты
        choices = list(question.choices.all())
        
        # Если задан порядок (для Варианта Б)
        final_choices = []
        if choices_order_ids:
            c_lookup = {c.id: c for c in choices}
            for cid in choices_order_ids:
                if cid in c_lookup:
                    final_choices.append(c_lookup[cid])
        else:
            final_choices = choices

        # Сериализация вариантов
        options_data = []
        for opt in final_choices:
            options_data.append({
                "id": opt.id,
                "text": opt.text,
                "is_correct": opt.is_correct
            })

        return {
            "id": question.id,
            "text": question.text,
            "question_type": question.question_type,
            "options": options_data, 
            "choices": options_data, 
            "subject_name": question.topic.subject.name if (question.topic and question.topic.subject) else "General",
            "order_in_booklet": 0 
        }


# ==============================================================================
# 3. ГЕНЕРАТОР PDF (Для печати)
# ==============================================================================
class BookletDownloadView(APIView):
    """
    Генерирует PDF файл.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        order_map = exam.question_order or {}
        
        all_questions = list(exam.questions.select_related('topic__subject').prefetch_related('choices'))
        q_lookup = {q.id: q for q in all_questions}

        ordered_questions = []
        
        if order_map:
            sorted_keys = sorted(order_map.keys(), key=lambda x: int(x))
            for key in sorted_keys:
                item = order_map[key]
                if isinstance(item, dict):
                    q_id = item.get('id')
                    custom_choices_order = item.get('choices', [])
                else:
                    q_id = item
                    custom_choices_order = []

                question = q_lookup.get(q_id)
                if question:
                    # Подменяем порядок ответов для PDF
                    if custom_choices_order:
                        c_lookup = {c.id: c for c in question.choices.all()}
                        sorted_choices = []
                        for c_id in custom_choices_order:
                            if c_id in c_lookup:
                                sorted_choices.append(c_lookup[c_id])
                        question.pdf_choices = sorted_choices
                    else:
                        question.pdf_choices = list(question.choices.all())
                    ordered_questions.append(question)
        else:
            ordered_questions = all_questions
            for q in ordered_questions:
                q.pdf_choices = list(q.choices.all())

        # Группировка для PDF
        sections = []
        current_subject = None
        current_questions = []

        for q in ordered_questions:
            subj_name = q.topic.subject.name if (q.topic and q.topic.subject) else "General"
            
            if subj_name != current_subject:
                if current_subject:
                    sections.append({'subject': current_subject, 'questions': list(current_questions)})
                current_subject = subj_name
                current_questions = []
            current_questions.append(q)

        if current_subject:
            sections.append({'subject': current_subject, 'questions': current_questions})

        context = {
            'exam': exam,
            'variant': exam.variant,
            'sections': sections,
            'school_name': exam.school.name if exam.school else "EduTest",
            'date': exam.date or "2026",
            'host': request.build_absolute_uri('/')[:-1]
        }

        try:
            html_string = render_to_string('booklet_pdf.html', context, request=request)
        except Exception as e:
            return Response({"error": f"Template error: {str(e)}"}, status=500)

        if weasyprint:
            try:
                pdf_file = weasyprint.HTML(string=html_string, base_url=request.build_absolute_uri()).write_pdf()
                response = HttpResponse(pdf_file, content_type='application/pdf')
                filename = f"Exam_{exam.pk}_Var{exam.variant}.pdf"
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
            except Exception as e:
                logger.error(f"WeasyPrint error: {e}")
                return Response({"error": f"PDF Error: {str(e)}"}, status=500)
        else:
            return HttpResponse(html_string)
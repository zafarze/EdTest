# backend/gat_exam/views/smart_booklets.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Max, Q, F
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
import random
import logging
import difflib

# --- ИМПОРТЫ МОДЕЛЕЙ ---
from ..models import (
    ExamRound, BookletSection, SectionQuestion, 
    Question, QuestionHistory, QuestionLimit, Subject, School, Exam,
    SchoolYear
)

# --- ИМПОРТЫ СЕРИАЛИЗАТОРОВ ---
from ..serializers import (
    ExamRoundSerializer, 
    BookletSectionSerializer, 
    ExamPreviewSerializer,
    QuestionSerializer 
)

logger = logging.getLogger(__name__)

# ==============================================================================
# 🔹 ЛОКАЛЬНЫЕ СЕРИАЛИЗАТОРЫ (Вспомогательные)
# ==============================================================================

class SectionQuestionSerializer(serializers.ModelSerializer):
    """
    Показывает вопрос внутри секции с учетом его порядка.
    """
    question = QuestionSerializer(read_only=True)
    difficulty = serializers.CharField(source='question.difficulty', read_only=True)
    
    class Meta:
        model = SectionQuestion
        fields = ['id', 'order', 'question', 'difficulty', 'fixed_text', 'is_forced_by_director']


# ==============================================================================
# 🚀 1. EXAM ROUND VIEWSET (ГЛАВНЫЙ ПУЛЬТ)
# ==============================================================================

class ExamRoundViewSet(viewsets.ModelViewSet):
    """
    Управление Раундами (GAT-1, GAT-2) и Генерация вариантов.
    """
    queryset = ExamRound.objects.all().order_by('-date')
    serializer_class = ExamRoundSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # --- 1. ИНИЦИАЛИЗАЦИЯ (Создание пустых секций) ---
    @action(detail=True, methods=['post'])
    def initialize_sections(self, request, pk=None):
        """
        Создает пустые черновики секций для всех предметов и классов,
        базируясь на настройках QuestionLimit.
        """
        exam_round = self.get_object()
        created_count = 0
        
        # 1. Получаем настройки лимитов (какие предметы нужны для каких классов)
        limits = QuestionLimit.objects.values('subject', 'grade_level').distinct()
        
        if not limits.exists():
             return Response({"error": "Сначала настройте Лимиты вопросов (Question Limits)!"}, status=400)

        # 2. Создаем секции
        for item in limits:
            subject_id = item['subject']
            grade = item['grade_level']
            
            # get_or_create чтобы не создавать дубликаты
            section, created = BookletSection.objects.get_or_create(
                round=exam_round,
                subject_id=subject_id,
                grade_level=grade,
                defaults={'status': 'draft'}
            )
            
            if created:
                created_count += 1
                
        return Response({
            "status": "success", 
            "message": f"Инициализация завершена. Создано {created_count} новых секций.",
            "total_templates": limits.count()
        })
    
    # --- 2. ГЕНЕРАТОР ВАРИАНТОВ A/B (CORE LOGIC) ---
    @action(detail=True, methods=['post'])
    def generate_variants(self, request, pk=None):
        """
        🔥 MAIN GENERATOR: Создает Варианты А и Б для школ.
        
        Input:
            - day: "1" or "2" (Обязательно)
            - school_ids: [1, 2, 5] (Опционально. Если нет - для всех)
            - grade: 5 (Опционально. Если нет - для всех параллелей)
        """
        round_obj = self.get_object()
        
        # Параметры из фронтенда
        school_ids = request.data.get('school_ids', []) # Список ID школ
        grade_param = request.data.get('grade')
        day = request.data.get('day') # '1' или '2'

        if not day:
             return Response({"error": "Не указан день (Day 1 или Day 2)"}, status=400)

        # 1. Определяем список школ
        if school_ids:
            schools = School.objects.filter(id__in=school_ids)
        else:
            schools = School.objects.all() # Если пусто, берем ВСЕ школы

        # 2. Находим утвержденные секции (Master Copies)
        # Ищем секции, которые 'approved' и соответствуют нужному дню
        # ВАЖНО: В модели BookletSection должно быть поле 'day' или логика разделения предметов по дням.
        # Если поля нет, считаем, что все утвержденные подходят.
        sections_qs = BookletSection.objects.filter(
            round=round_obj,
            status='approved'
        )
        
        # Если у Секции есть поле day, фильтруем. Если нет - игнорируем.
        if hasattr(BookletSection, 'day'):
            sections_qs = sections_qs.filter(day=day)

        if grade_param:
            sections_qs = sections_qs.filter(grade_level=grade_param)

        if not sections_qs.exists():
            return Response({"error": f"Нет утвержденных секций для генерации (День {day})"}, status=400)

        # 3. Группируем секции по Параллелям (5, 6, 7...)
        # { 5: [MathSec, EngSec], 6: [BioSec, ChemSec] }
        sections_by_grade = {}
        for sec in sections_qs:
            g = sec.grade_level
            if g not in sections_by_grade:
                sections_by_grade[g] = []
            sections_by_grade[g].append(sec)

        generated_log = []
        
        try:
            with transaction.atomic():
                # Проходим по каждой школе
                for school in schools:
                    # Проходим по каждой параллели (5, 6, 7 класс...)
                    for grade_level, grade_sections in sections_by_grade.items():
                        
                        # Сортируем секции, чтобы порядок предметов был фиксирован (Мат, Англ, Ист...)
                        sorted_sections = sorted(grade_sections, key=lambda s: s.subject.id)

                        # --- ГЕНЕРАЦИЯ ВАРИАНТА A ---
                        self._create_exam_variant(
                            school=school, 
                            round_obj=round_obj, 
                            grade=grade_level, 
                            day=day, 
                            sections=sorted_sections, 
                            variant='A'
                        )
                        
                        # --- ГЕНЕРАЦИЯ ВАРИАНТА B ---
                        self._create_exam_variant(
                            school=school, 
                            round_obj=round_obj, 
                            grade=grade_level, 
                            day=day, 
                            sections=sorted_sections, 
                            variant='B'
                        )
                        
                        generated_log.append(f"School {school.name}: Grade {grade_level} OK")

        except Exception as e:
            logger.error(f"Generation Error: {e}")
            return Response({"error": f"Ошибка генерации: {str(e)}"}, status=500)

        return Response({
            "message": f"Генерация завершена! Обработано школ: {len(schools)}",
            "details": generated_log
        })

    def _create_exam_variant(self, school, round_obj, grade, day, sections, variant):
        """
        Внутренний метод создания одного физического экзамена (буклета).
        Теперь с поддержкой перемешивания ОТВЕТОВ (Full Shuffle).
        """
        # 1. Собираем список вопросов из всех секций
        questions_list = []
        subjects_list = []
        
        for sec in sections:
            subjects_list.append(sec.subject)
            # Берем вопросы строго по порядку эксперта
            q_qs = sec.section_questions.select_related('question').order_by('order')
            for sq in q_qs:
                questions_list.append(sq.question)
        
        # 2. Перемешивание ВОПРОСОВ (Если Вариант Б)
        final_questions = list(questions_list)
        if variant == 'B':
            random.shuffle(final_questions)
        
        # 3. ГЕНЕРАЦИЯ "УМНОЙ КАРТЫ" (JSON MAPPING)
        # Здесь мы "запекаем" правильные ответы для этого варианта
        question_order_map = {}
        
        for idx, question in enumerate(final_questions):
            q_num = str(idx + 1)
            
            # Получаем варианты ответов
            choices = list(question.choices.all())
            
            # Если Вариант Б — перемешиваем и ВАРИАНТЫ ОТВЕТОВ тоже!
            if variant == 'B':
                random.shuffle(choices)
            # Если Вариант А — оставляем оригинальный порядок (как создал учитель/эксперт)
            # или сортируем по ID, чтобы было предсказуемо
            else:
                choices.sort(key=lambda x: x.id)

            # Находим, какая буква теперь правильная (A, B, C, D)
            correct_letter = "?"
            choice_ids_order = []
            
            letters = ['A', 'B', 'C', 'D', 'E', 'F']
            
            for i, choice in enumerate(choices):
                choice_ids_order.append(choice.id) # Сохраняем порядок ID для PDF генератора
                if choice.is_correct:
                    correct_letter = letters[i] if i < len(letters) else "?"
            
            # 🔥 СОХРАНЯЕМ ВСЮ ИНФУ В JSON
            question_order_map[q_num] = {
                "id": question.id,
                "key": correct_letter,     # <-- ГЛАВНОЕ: Правильный ответ для этого буклета (напр. "C")
                "choices": choice_ids_order # <-- Нужно для PDF, чтобы напечатать в том же порядке
            }
            
        # 4. СОЗДАЕМ/ОБНОВЛЯЕМ ЭКЗАМЕН В БД
        title = f"{round_obj.name} - {grade} Кл - День {day} - Вар {variant}"
        
        exam, created = Exam.objects.update_or_create(
            school=school,
            gat_round=round_obj.number if hasattr(round_obj, 'number') else 1,
            gat_day=day,
            grade_level=grade,
            variant=variant,
            defaults={
                'title': title,
                'status': 'planned',
                'question_order': question_order_map, # 🔥 Теперь здесь лежит "Умная карта"
                'duration': 180
            }
        )
        
        # 5. ПРИВЯЗЫВАЕМ ДАННЫЕ (M2M)
        # Это нужно для совместимости с админкой и списками
        exam.questions.set(final_questions)
        exam.subjects.set(subjects_list)
        
        return exam

# ==============================================================================
# 📝 2. BOOKLET SECTION VIEWSET (РАБОЧЕЕ МЕСТО ЭКСПЕРТА)
# ==============================================================================

class BookletSectionViewSet(viewsets.ModelViewSet):
    queryset = BookletSection.objects.all()
    serializer_class = BookletSectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return BookletSection.objects.none()

        qs = BookletSection.objects.all()

        # Фильтрация по правам доступа
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'teacher'
        
        if user.is_superuser or role in ['admin', 'general_director', 'director']:
            pass # Видят всё
        elif role == 'expert':
            # Эксперты видят только свои секции или черновики
            # Здесь можно добавить фильтр по subject если он привязан к эксперту
            pass 
        else:
            return BookletSection.objects.none()
        
        # Фильтры из URL
        round_id = self.request.query_params.get('round')
        if round_id:
            qs = qs.filter(round_id=round_id)
            
        grade = self.request.query_params.get('grade')
        if grade:
            qs = qs.filter(grade_level=grade)

        return qs.order_by('grade_level', 'subject__id')

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Получить список вопросов секции"""
        section = self.get_object()
        section_questions = SectionQuestion.objects.filter(section=section).select_related('question').order_by('order')
        serializer = SectionQuestionSerializer(section_questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        """Добавить вопрос в секцию"""
        section = self.get_object()
        question_id = request.data.get('question_id')
        
        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({"error": "Вопрос не найден"}, status=404)

        if SectionQuestion.objects.filter(section=section, question=question).exists():
            return Response({"error": "Этот вопрос уже добавлен"}, status=400)

        warning = None
        if question.topic and question.topic.grade_level != section.grade_level:
            warning = f"Внимание: Вопрос из {question.topic.grade_level} класса"

        # Находим последний порядковый номер
        last_order = SectionQuestion.objects.filter(section=section).aggregate(Max('order'))['order__max'] or 0
        
        SectionQuestion.objects.create(
            section=section,
            question=question,
            order=last_order + 1,
            fixed_text=question.text
        )
        
        return Response({"status": "added", "warning": warning}, status=200)

    @action(detail=True, methods=['post'])
    def remove_question(self, request, pk=None):
        """Удалить вопрос из секции"""
        section = self.get_object()
        question_id = request.data.get('question_id')
        deleted_count, _ = SectionQuestion.objects.filter(section=section, question_id=question_id).delete()
        
        if deleted_count > 0:
            return Response({"status": "removed"}, status=200)
        else:
            return Response({"error": "Вопрос не найден в этой секции"}, status=404)

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Изменить порядок вопросов (Drag & Drop)"""
        section = self.get_object()
        new_order = request.data.get('order', []) # Список ID вопросов [10, 5, 8...]
        
        with transaction.atomic():
            for index, q_id in enumerate(new_order):
                # Обновляем order для каждого вопроса
                SectionQuestion.objects.filter(section=section, question_id=q_id).update(order=index + 1)
                
        return Response({"status": "reordered"})

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """
        Умная валидация секции:
        1. Проверка структуры (есть ли ответы, правильный ли ответ).
        2. Проверка дубликатов (fuzzy matching текста).
        3. Проверка распределения сложности.
        """
        section = self.get_object()
        
        # Получаем вопросы с подгрузкой вариантов ответов для оптимизации
        # Используем section_questions, чтобы знать порядок
        section_questions = SectionQuestion.objects.filter(section=section).select_related('question').prefetch_related('question__choices')
        
        questions = [sq.question for sq in section_questions]
        current_count = len(questions)
        needed_max = 25  # Можно вынести в настройки модели Section или Round
        
        errors = []
        warnings = []
        
        # --- 1. СТРУКТУРНЫЙ АНАЛИЗ ---
        for idx, q in enumerate(questions, 1):
            # Проверка: Минимум 3 варианта ответа
            choices = list(q.choices.all())
            if len(choices) < 3:
                errors.append(f"Вопрос #{idx} ({q.text[:30]}...) имеет меньше 3 вариантов ответа.")
            
            # Проверка: Есть ли правильный ответ
            if not any(c.is_correct for c in choices):
                errors.append(f"Вопрос #{idx} ({q.text[:30]}...) не имеет отмеченного правильного ответа.")

            # Проверка: Не слишком ли короткий текст
            if len(q.text.strip()) < 5:
                warnings.append(f"Вопрос #{idx} выглядит слишком коротким или пустым.")

        # --- 2. ПОИСК ДУБЛИКАТОВ (HEURISTIC AI) ---
        # Сравниваем каждый вопрос с каждым на похожесть текста > 85%
        texts = [(idx + 1, q.text) for idx, q in enumerate(questions)]
        
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                idx1, text1 = texts[i]
                idx2, text2 = texts[j]
                
                # SequenceMatcher вычисляет коэффициент схожести (0.0 - 1.0)
                similarity = difflib.SequenceMatcher(None, text1, text2).ratio()
                
                if similarity > 0.95:
                    errors.append(f"ДУБЛИКАТ: Вопрос #{idx1} полностью совпадает с #{idx2}.")
                elif similarity > 0.75:
                    warnings.append(f"Похожие вопросы: #{idx1} и #{idx2} похожи на {int(similarity*100)}%. Проверьте смысл.")

        # --- 3. АНАЛИЗ СЛОЖНОСТИ ---
        stats = {
            "easy": 0,
            "medium": 0,
            "hard": 0
        }
        
        for q in questions:
            if q.difficulty in stats:
                stats[q.difficulty] += 1
                
        # Примерная логика (можно настроить под ваши стандарты)
        total = current_count if current_count > 0 else 1
        easy_pct = (stats['easy'] / total) * 100
        hard_pct = (stats['hard'] / total) * 100
        
        if current_count > 0:
            if hard_pct > 30:
                warnings.append(f"Слишком много сложных вопросов ({int(hard_pct)}%). Рекомендуется не более 20-25%.")
            if easy_pct < 20:
                warnings.append(f"Маловато легких вопросов ({int(easy_pct)}%). Добавьте для разогрева.")

        # --- 4. ИТОГ ---
        is_valid = len(errors) == 0
        
        # Если вопросов меньше минимума - это не ошибка валидации самого контента, 
        # но предупреждение перед отправкой
        if current_count < needed_max:
             warnings.append(f"Секция заполнена не полностью: {current_count} из {needed_max}.")

        validation_result = {
            "is_valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "stats": {
                "current": current_count,
                "needed_max": needed_max,
                "difficulty_breakdown": stats
            }
        }
        
        # Сохраняем результат в поле модели (если оно есть, или просто возвращаем)
        # section.ai_validation_result = validation_result
        # section.save()

        return Response(validation_result)
    
    @action(detail=True, methods=['post'])
    def send_to_review(self, request, pk=None):
        """🚀 ЭКСПЕРТ -> ДИРЕКТОР: Отправка на проверку"""
        section = self.get_object()
        
        if section.status != 'draft':
            return Response({"error": "Можно отправить только черновик"}, status=400)

        if section.questions.count() == 0:
             return Response({"error": "Секция пуста! Добавьте вопросы."}, status=400)

        section.status = 'review'
        section.save()
        
        return Response({
            "status": "review", 
            "message": "Секция успешно отправлена на проверку Ген. Директору 👨‍💼"
        })
    
    @action(detail=True, methods=['post'])
    def approve_section(self, request, pk=None):
        """👨‍💼 ДИРЕКТОР: Утверждение секции"""
        section = self.get_object()
        user = request.user
        
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'teacher'
        allowed_roles = ['admin', 'general_director', 'director']

        if role not in allowed_roles and not user.is_superuser:
            return Response({"error": "У вас нет прав на утверждение"}, status=403)

        section.status = 'approved'
        section.save()
        
        return Response({"status": "approved", "message": "Секция утверждена и готова к генерации ✅"})

    @action(detail=True, methods=['post'])
    def return_to_draft(self, request, pk=None):
        """↩️ ДИРЕКТОР: Возврат на доработку"""
        section = self.get_object()
        user = request.user
        
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'teacher'
        allowed_roles = ['admin', 'general_director', 'director']

        if role not in allowed_roles and not user.is_superuser:
             return Response({"error": "Нет прав"}, status=403)

        section.status = 'draft'
        section.save()
        
        return Response({"status": "draft", "message": "Секция возвращена эксперту на доработку ↩️"})


# ==============================================================================
# 👁️ 3. EXAM PREVIEW VIEWSET (ПРОСМОТР ПЕРЕД ПЕЧАТЬЮ)
# ==============================================================================

class ExamPreviewViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamPreviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def full_data(self, request, pk=None):
        """
        Возвращает полные данные экзамена с вопросами и вариантами ответов
        для генерации PDF или предпросмотра.
        """
        try:
            exam_with_questions = Exam.objects.prefetch_related(
                'questions', 
                'questions__choices',
                'subjects'
            ).get(pk=pk)
            
            # Используем сериализатор для детального вывода
            serializer = self.get_serializer(exam_with_questions)
            
            data = serializer.data
            # Передаем маппинг порядка, чтобы фронт мог отрисовать реальный порядок Варианта Б
            data['question_order_map'] = exam_with_questions.question_order
            
            return Response(data)
        except Exam.DoesNotExist:
            return Response({"error": "Экзамен не найден"}, status=404)
import pandas as pd
import numpy as np
import re
import logging
from difflib import SequenceMatcher
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from typing import Dict, Any, List

# Импорты моделей
from ..models import (
    Student, Exam, ExamResult, StudentClass, 
    School, Question, Subject, UserProfile
)
from ..serializers import ExamResultSerializer # Если нужен для ответа API

logger = logging.getLogger(__name__)

class ImportService:
    """
    🧠 SMART IMPORT SERVICE (THE MATRIX LOGIC)
    
    Главная задача:
    1. Прочитать Excel.
    2. Понять, какой вариант решал ученик (А или Б).
    3. Достать из БД "Карту Вопросов" (question_order) для этого варианта.
    4. Перевести "Номер в Excel" -> "Реальный ID вопроса".
    5. Проверить ответ и выставить оценку.
    """

    @staticmethod
    def process_file(file_obj, school_id: int, round_id: int, grade_level: int, day: int = 1):
        """
        Главный метод обработки файла.
        """
        logs = []
        
        # 1. Читаем Excel
        try:
            df = pd.read_excel(file_obj)
            # Приводим заголовки к верхнему регистру для удобства (variant -> VARIANT)
            df.columns = [str(c).strip().upper() for c in df.columns]
        except Exception as e:
            return {"error": f"Ошибка чтения файла: {str(e)}"}

        # 2. Проверяем наличие колонки VARIANT
        # Возможные названия: VARIANT, VAR, ВАРИАНТ
        variant_col = next((col for col in df.columns if 'VAR' in col or 'ВАР' in col), None)
        
        if not variant_col:
            return {"error": "❌ В файле нет колонки 'Variant' (или 'Вариант'). Без неё Умный Импорт невозможен."}

        # 3. Подгружаем Экзамены (КЭШИРОВАНИЕ)
        # Чтобы не делать 100 запросов в БД, достаем экзамены заранее
        # Ключ словаря: (Variant_Letter) -> Объект Exam
        # Например: 'B' -> <Exam: 5 Класс - Var B>
        exams_cache = {}
        
        exams_qs = Exam.objects.filter(
            school_id=school_id,
            # gat_round__id=round_id, # Если round_id это ID объекта
            # Или gat_round=round_id если это число. Подстрой под свою модель Round!
            grade_level=grade_level,
            gat_day=day
        ).prefetch_related('questions', 'questions__choices', 'questions__topic__subject')
        
        if not exams_qs.exists():
            return {"error": f"❌ В базе данных не найдены экзамены для Школы ID={school_id}, Класса {grade_level}, Дня {day}. Сначала сгенерируйте их!"}

        for exam in exams_qs:
            # Нормализуем вариант (A, B)
            v_key = ImportService._normalize_variant(exam.variant)
            exams_cache[v_key] = exam

        # 4. Обработка строк
        processed_count = 0
        new_students_count = 0
        results_to_create = [] # Для bulk_create (оптимизация)

        # Подгружаем список существующих студентов школы, чтобы искать быстро
        existing_students = list(Student.objects.filter(school_id=school_id, grade_level=grade_level))
        
        for index, row in df.iterrows():
            try:
                row_log = []
                
                # --- А. Идентификация Ученика ---
                student_id = row.get('STUDENT ID') or row.get('ID')
                full_name = row.get('FULL NAME') or row.get('NAME') or row.get('ФИО')
                
                student, created = ImportService._find_or_create_student(
                    student_id, full_name, existing_students, school_id, grade_level
                )
                
                if created:
                    new_students_count += 1
                    existing_students.append(student) # Добавляем в локальный кэш

                # --- Б. Маршрутизация (Routing) ---
                raw_variant = row.get(variant_col)
                variant_char = ImportService._normalize_variant(raw_variant)
                
                if not variant_char or variant_char not in exams_cache:
                    logs.append(f"⚠️ Строка {index+2}: Неизвестный вариант '{raw_variant}'. Пропуск.")
                    continue
                
                target_exam = exams_cache[variant_char]
                
                # --- В. ПРОВЕРКА (THE MATRIX LOGIC) ---
                # Здесь происходит магия сопоставления Q1 (Var A) = Q5 (Var B)
                score_data = ImportService._calculate_score(row, target_exam)
                
                # --- Г. Подготовка результата ---
                # Удаляем старый результат этого ученика за этот экзамен, если есть
                ExamResult.objects.filter(exam=target_exam, student=student).delete()
                
                result_obj = ExamResult(
                    exam=target_exam,
                    student=student,
                    score=score_data['total_score'],
                    max_score=score_data['max_score_possible'],
                    percentage=score_data['percentage'],
                    details=score_data['details'], # JSON с ответами
                    is_passed=(score_data['percentage'] >= 50) # Порог 50%
                )
                results_to_create.append(result_obj)
                processed_count += 1

            except Exception as e:
                logs.append(f"❌ Ошибка в строке {index+2}: {str(e)}")

        # 5. Массовое сохранение (Bulk Create)
        if results_to_create:
            ExamResult.objects.bulk_create(results_to_create)

        return {
            "success": True,
            "processed": processed_count,
            "new_students": new_students_count,
            "logs": logs[:20] # Вернем только первые 20 логов, чтобы не спамить
        }

    # =========================================================================
    # 🕵️ ЛОГИКА ПРОВЕРКИ (ТО САМОЕ МЕСТО)
    # =========================================================================
    @staticmethod
    def _calculate_score(row: pd.Series, exam: Exam) -> Dict:
        """
        Проверяет ответы ученика, используя 'Запеченные ключи' (Baked Keys) из question_order.
        Поддерживает Full Shuffle (перемешанные вопросы И ответы).
        """
        total_score = 0
        max_possible = 0
        details = {} 
        
        # 1. Получаем карту
        order_map = exam.question_order or {}
        
        # Кэш объектов вопросов (чтобы достать предмет/тему для аналитики)
        # Нам всё еще нужны объекты, чтобы узнать "Математика" это или "Физика"
        questions_lookup = {q.id: q for q in exam.questions.select_related('topic__subject').all()}

        # 2. Идем по колонкам Excel (Q1, Q2...)
        for col_name in row.index:
            match = re.search(r'(\d+)', str(col_name))
            if not match: continue
            
            booklet_num = match.group(1) # Например "5"
            
            # Достаем данные из JSON карты
            # Поддержка старого формата (где просто ID) и нового (где Dict)
            map_data = order_map.get(booklet_num) or order_map.get(int(booklet_num))
            
            if not map_data: continue

            # Разбираем формат
            if isinstance(map_data, int):
                # СТАРЫЙ ФОРМАТ (только ID вопроса) -> Fallback Logic
                real_question_id = map_data
                correct_val = None # Придется искать в БД
            else:
                # НОВЫЙ ФОРМАТ (Full Shuffle)
                real_question_id = map_data.get('id')
                correct_val = map_data.get('key') # 'A', 'B', 'C'...

            question_obj = questions_lookup.get(real_question_id)
            if not question_obj: continue

            # Если ключа не было в JSON (старый формат), ищем в базе
            if not correct_val:
                correct_choice = next((c for c in question_obj.choices.all() if c.is_correct), None)
                correct_val = correct_choice.variant if correct_choice else "?"

            # Ответ ученика
            student_val = str(row[col_name]).strip().upper()
            if student_val in ['NAN', 'NONE', '']: student_val = '-'

            # --- ПРОВЕРКА ---
            # Просто сравниваем буквы!
            is_correct = (student_val == correct_val)
            
            points = 1 
            
            if is_correct:
                total_score += points
            max_possible += points
            
            # Детали для аналитики
            subj_abbr = "GEN"
            if question_obj.topic and question_obj.topic.subject:
                subj_abbr = question_obj.topic.subject.abbreviation or question_obj.topic.subject.name[:3]

            details[booklet_num] = {
                "s": 1 if is_correct else 0,
                "v": student_val,
                "sb": subj_abbr
            }

        percentage = (total_score / max_possible * 100) if max_possible > 0 else 0
        
        return {
            "total_score": total_score,
            "max_score_possible": max_possible,
            "percentage": round(percentage, 1),
            "details": details
        }

    # =========================================================================
    # 🛠 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    # =========================================================================
    @staticmethod
    def _normalize_variant(val) -> str:
        """Очистка: 'Вариант А' -> 'A', 'Var B' -> 'B'"""
        if pd.isna(val): return None
        s = str(val).upper().strip()
        
        # Кириллица -> Латиница
        trans = {'А': 'A', 'Б': 'B', 'В': 'C', 'С': 'C', 'Д': 'D'} 
        for k, v in trans.items():
            s = s.replace(k, v)
            
        if 'A' in s: return 'A'
        if 'B' in s: return 'B'
        if 'C' in s: return 'C'
        if 'D' in s: return 'D'
        return None

    @staticmethod
    def _find_or_create_student(student_id, full_name, existing_list, school_id, grade):
        """
        Ищет ученика. Сначала по ID, потом нечеткий поиск по имени.
        Если не нашел — создает нового.
        """
        # 1. Поиск по ID (если есть)
        if student_id and str(student_id).isdigit():
            found = next((s for s in existing_list if str(s.custom_id) == str(student_id) or s.id == int(student_id)), None)
            if found: return found, False

        # 2. Поиск по Имени (Fuzzy String Matching)
        # Если в Excel "Ivanov Ivan", а в базе "Ivanov I.", это сложнее.
        # Используем простое совпадение пока.
        if full_name:
            clean_name = str(full_name).lower().strip()
            for s in existing_list:
                db_name = f"{s.last_name} {s.first_name}".lower()
                # Если совпадение > 90%
                if SequenceMatcher(None, clean_name, db_name).ratio() > 0.85:
                    return s, False

        # 3. Создание нового
        names = str(full_name).split()
        last = names[0] if len(names) > 0 else "Unknown"
        first = names[1] if len(names) > 1 else "Student"
        
        # Нужен User для студента? Используем Auth Service если есть, или напрямую
        # Создаем "фейковый" username
        import uuid
        username = f"std_{uuid.uuid4().hex[:8]}"
        
        with transaction.atomic():
            # Создаем Django User (для совместимости)
            from django.contrib.auth.models import User
            u = User.objects.create_user(username=username, password="temp_password_123")
            
            # Профиль
            UserProfile.objects.create(user=u, role='student', school_id=school_id)
            
            # Студент
            new_student = Student.objects.create(
                user=u, # Если поле user обязательное
                school_id=school_id,
                grade_level=grade,
                first_name=first,
                last_name=last,
                custom_id=student_id if (student_id and str(student_id).isdigit()) else None
            )
            
        return new_student, True
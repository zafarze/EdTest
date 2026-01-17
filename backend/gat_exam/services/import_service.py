import pandas as pd
import numpy as np
import re
from django.db import transaction
from ..models import Student, Exam, ExamResult, StudentClass, School

class ImportService:
    
    @staticmethod
    def process_file(file, mode, exam_id=None):
        print(f"📂 [ImportService] Старт. Файл: {file.name}, Mode: {mode}, ExamID: {exam_id}")
        
        try:
            # --- 1. ЧТЕНИЕ ФАЙЛА ---
            # Используем transaction.atomic, чтобы обеспечить целостность данных
            # (Хотя здесь мы только читаем, сохранение будет внутри методов)
            
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, encoding='utf-8', sep=None, engine='python')
                except UnicodeDecodeError:
                    file.seek(0)
                    df = pd.read_csv(file, encoding='cp1251', sep=None, engine='python')
            else:
                df = pd.read_excel(file)
            
            # Очистка заголовков (убираем пробелы, делаем строками)
            df.columns = [str(c).strip() for c in df.columns]
            print(f"📋 Колонки: {list(df.columns)}")

            # Запускаем нужный режим внутри транзакции
            with transaction.atomic():
                if mode == 'scores':
                    return ImportService._process_scores(df, exam_id, filename=file.name)
                elif mode == 'answers':
                    return ImportService._process_answers(df, exam_id)
                else:
                    return {"status": "error", "message": f"Неизвестный режим: {mode}"}

        except Exception as e:
            print(f"❌ Критическая ошибка импорта: {str(e)}")
            return {"status": "error", "message": f"Ошибка файла: {str(e)}"}

    @staticmethod
    def _process_scores(df, exam_id, filename=""):
        if not exam_id: return {"status": "error", "message": "Нет ID экзамена"}

        try:
            exam = Exam.objects.select_related('school').get(pk=exam_id)
        except Exam.DoesNotExist:
            return {"status": "error", "message": "Экзамен не найден"}

        processed_count = 0
        created_students = 0
        errors = []

        # --- 1. ОПРЕДЕЛЕНИЕ КОЛОНОК ---
        # Приводим все к нижнему регистру для поиска
        cols_lower = {col.lower(): col for col in df.columns}
        
        possible_id_cols = ['student id', 'id', 'code', 'custom_id', 'код', 'номер', 'student_id']
        id_col = next((cols_lower[k] for k in possible_id_cols if k in cols_lower), None)

        surname_col = next((cols_lower[k] for k in ['surname', 'fam', 'фамилия', 'last name'] if k in cols_lower), None)
        name_col = next((cols_lower[k] for k in ['name', 'imya', 'имя', 'first name'] if k in cols_lower), None)
        
        section_col = next((cols_lower[k] for k in ['section', 'class', 'grade', 'класс', 'лит'] if k in cols_lower), None)

        # Пытаемся угадать параллель из имени файла (например "2 Class.xlsx" -> 2)
        inferred_grade = 1
        match = re.search(r'(\d+)', filename)
        if match:
            inferred_grade = int(match.group(1))

        # --- 2. КЭШ СТУДЕНТОВ (Оптимизация) ---
        all_students = Student.objects.filter(school=exam.school) if exam.school else Student.objects.all()
        student_map = {}
        for s in all_students:
            if s.custom_id:
                raw = str(s.custom_id).strip()
                student_map[raw] = s 
                student_map[raw.lstrip('0')] = s  
                student_map[raw.zfill(6)] = s     

        # Колонки, которые НЕ вопросы (метаданные)
        metadata_cols = [id_col, surname_col, name_col, section_col, 'Sheet', 'Class', 'Score', 'Total', 'Grade']
        # Все остальные колонки считаем вопросами
        question_cols = [c for c in df.columns if c not in metadata_cols and c is not None]
        
        score_col = next((cols_lower[k] for k in ['score', 'total', 'mark', 'балл', 'оценка'] if k in cols_lower), None)

        # --- 3. ЦИКЛ ПО СТРОКАМ ---
        for index, row in df.iterrows():
            try:
                student = None
                raw_id = str(row[id_col]).strip().replace('.0', '') if id_col else ""
                
                # А. Поиск существующего
                if raw_id:
                    student = student_map.get(raw_id)

                # Б. АВТО-СОЗДАНИЕ
                if not student and raw_id and surname_col and name_col:
                    first_name = str(row[name_col]).strip()
                    last_name = str(row[surname_col]).strip()
                    section_val = str(row[section_col]).strip() if section_col else "A"
                    
                    student_class = None
                    if exam.school:
                        # Используем inferred_grade, но с защитой
                        grade_val = inferred_grade if 1 <= inferred_grade <= 12 else 1
                        student_class, _ = StudentClass.objects.get_or_create(
                            school=exam.school,
                            grade_level=grade_val,
                            section=section_val,
                            defaults={'language': 'ru'}
                        )

                    student = Student.objects.create(
                        custom_id=raw_id,
                        first_name_ru=first_name,
                        last_name_ru=last_name,
                        school=exam.school,
                        student_class=student_class,
                        status='active'
                    )
                    student_map[raw_id] = student
                    created_students += 1

                if not student:
                    errors.append(f"Стр {index+2}: Студент не найден и не может быть создан (нет ID или Имени)")
                    continue

                # В. РАСЧЕТ БАЛЛОВ
                final_score = 0
                max_score_val = 0
                details_json = {} 

                if score_col:
                    # Если есть колонка Score, берем её
                    try: 
                        val = str(row[score_col]).replace(',', '.')
                        final_score = float(val)
                    except ValueError: 
                        final_score = 0
                    
                    # Если макс балл не задан, предполагаем 100 или 20 (можно поправить логику)
                    max_score_val = 100 
                else:
                    # Иначе считаем по колонкам вопросов
                    for q_col in question_cols:
                        val = row[q_col]
                        # Умная проверка правдивости
                        str_val = str(val).strip().lower()
                        is_correct = str_val in ['1', '1.0', '+', 'true', 'да', 'ok']
                        
                        if is_correct:
                            final_score += 1
                            details_json[q_col] = 1 
                        else:
                            details_json[q_col] = 0 
                    
                    max_score_val = len(question_cols)

                # Защита от деления на ноль
                percentage_val = 0
                if max_score_val > 0:
                    percentage_val = (final_score / max_score_val) * 100
                
                # Округляем до 2 знаков
                percentage_val = round(percentage_val, 2)

                # Г. Сохраняем результат
                ExamResult.objects.update_or_create(
                    student=student,
                    exam=exam,
                    defaults={
                        'score': final_score,
                        'max_score': max_score_val,
                        'percentage': percentage_val, # ✅ ТЕПЕРЬ ПРАВИЛЬНЫЙ ПРОЦЕНТ
                        'details': details_json
                    }
                )
                processed_count += 1

            except Exception as row_error:
                # Ловим ошибку конкретной строки, чтобы не валить весь файл,
                # но транзакция защитит от частичных записей внутри create
                errors.append(f"Ошибка в строке {index+2}: {str(row_error)}")
                continue

        print(f"✅ Итог: Обработано {processed_count}, Создано {created_students}, Ошибок {len(errors)}")
        
        status_msg = "success" if processed_count > 0 else "warning"
        msg = f"Успешно обработано: {processed_count}. Новых учеников: {created_students}."
        
        if errors:
            status_msg = "warning"
            msg += f" Ошибок: {len(errors)} (см. детали)"

        return {
            "status": status_msg,
            "processed": processed_count,
            "message": msg,
            "errors": errors[:10] # Возвращаем первые 10 ошибок
        }

    @staticmethod
    def _process_answers(df, exam_id):
        return {"status": "error", "message": "Импорт ответов в разработке"}
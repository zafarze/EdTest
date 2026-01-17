# Файл: create_test_data.py
import os
import django
import random
from datetime import date

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gat_exam.models import School, StudentClass, Student, Exam, ExamResult, Subject, Quarter, SchoolYear

def create_data():
    print("🚀 Начинаем генерацию тестовых данных для Рейтинга...")

    # 1. Берем ваши школы (или создаем)
    school1 = School.objects.first()
    if not school1:
        print("❌ Сначала создайте школу в админке!")
        return
    
    # 2. Берем или создаем предметы
    math, _ = Subject.objects.get_or_create(name="Mathematics", defaults={'slug': 'math', 'color': 'indigo'})
    eng, _ = Subject.objects.get_or_create(name="English", defaults={'slug': 'eng', 'color': 'rose'})

    # 3. Создаем Учебный год и Четверть (нужно для экзамена)
    year, _ = SchoolYear.objects.get_or_create(name="2025-2026", defaults={'start_date': date(2025, 9, 1), 'end_date': date(2026, 5, 25), 'is_active': True})
    quarter, _ = Quarter.objects.get_or_create(name="Q2", school_year=year, defaults={'start_date': date(2025, 11, 1), 'end_date': date(2025, 12, 30)})

    # 4. Создаем Экзамен (GAT-1)
    exam, _ = Exam.objects.get_or_create(
        title="GAT Monitoring Round 1",
        defaults={
            'school_year': year,
            'quarter': quarter,
            'gat_round': 1,
            'status': 'finished', # Важно: статус завершен
            'exam_type': 'offline'
        }
    )
    exam.subjects.add(math, eng)
    print(f"✅ Экзамен '{exam.title}' готов.")

    # 5. Генерируем учеников и результаты для ВСЕХ существующих классов
    classes = StudentClass.objects.all()
    
    if not classes.exists():
        print("❌ Нет классов! Создайте классы в панели управления.")
        return

    count = 0
    for cls in classes:
        # Создаем 3 учеников в каждом классе
        for i in range(1, 4):
            student, created = Student.objects.get_or_create(
                custom_id=f"{cls.school.id}-{cls.id}-{i}",
                defaults={
                    'first_name_ru': f"Uchenik {i}",
                    'last_name_ru': f"Testov {cls.section}",
                    'school': cls.school,
                    'student_class': cls,
                    'gender': 'male'
                }
            )
            
            # Ставим оценку
            score = random.randint(50, 100)
            ExamResult.objects.update_or_create(
                student=student,
                exam=exam,
                defaults={
                    'score': score,
                    'max_score': 100,
                    'percentage': score,
                    'details': {
                        'math': random.randint(20, 50),
                        'eng': random.randint(20, 50)
                    }
                }
            )
            count += 1
    
    print(f"🎉 Успешно! Добавлено {count} результатов экзаменов.")
    print("👉 Теперь обновите страницу Рейтинга в браузере.")

if __name__ == '__main__':
    create_data()
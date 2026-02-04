import os
import django

# 1. Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gat_exam.models import School, StudentClass, Student, Exam, Question, Subject
from gat_exam.services.pdf_generator import PDFGenerator

def run_test():
    print("🚀 Начинаем тест генерации PDF...")

    # --- 2. Создаем/Получаем тестовые данные ---
    print("🛠 Подготовка данных...")
    
    # Школа
    school, _ = School.objects.get_or_create(
        custom_id="TEST_SCHOOL",
        defaults={'name': "Тестовая Гимназия", 'slug': 'test-school'}
    )

    # Класс
    cls, _ = StudentClass.objects.get_or_create(
        school=school, grade_level=11, section="A",
        defaults={'language': 'ru'}
    )

    # Ученик
    student, _ = Student.objects.get_or_create(
        username="test_student_pdf",
        defaults={
            'first_name_ru': "Иван", 'last_name_ru': "Тестов",
            'first_name_en': "Ivan", 'last_name_en': "Testov", # Для PDF важно EN имя
            'school': school, 'student_class': cls, 'custom_id': "1001"
        }
    )

    # Предмет
    subj, _ = Subject.objects.get_or_create(name="Mathematics", defaults={'abbreviation': 'MATH'})

    # Экзамен
    exam, _ = Exam.objects.get_or_create(
        title="MOCK GAT TEST 2026",
        defaults={
            'school': school,
            'exam_type': 'offline',
            'duration': 60
        }
    )
    exam.subjects.add(subj)

    # Вопросы (нужны для подсчета кружков)
    if exam.questions.count() < 5:
        for i in range(5):
            Question.objects.create(
                exam=exam, 
                text=f"Test Question {i+1}", 
                difficulty='medium'
            )
    
    print(f"✅ Данные готовы: Студент {student}, Экзамен {exam} ({exam.questions.count()} вопросов)")

    # --- 3. Генерация PDF ---
    print("📄 Генерирую PDF...")
    try:
        generator = PDFGenerator()
        # Генерируем страницу для студента (Вариант A)
        generator.create_student_page(student, exam, "A")
        
        pdf_data = generator.get_pdf()
        
        filename = "TEST_ANSWER_SHEET.pdf"
        with open(filename, "wb") as f:
            f.write(pdf_data.read())
            
        print(f"🎉 УСПЕХ! Файл сохранен как: {filename}")
        print("👉 Открой этот файл и проверь: имя (Ivan Testov), QR-код и кружочки.")

    except Exception as e:
        print(f"❌ ОШИБКА генерации: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
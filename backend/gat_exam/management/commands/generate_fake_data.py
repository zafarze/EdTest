import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from gat_exam.models import Subject, Topic, Question, Choice, School

User = get_user_model()

class Command(BaseCommand):
    help = 'Генерирует фейковые темы и вопросы для тестирования'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Начинаем генерацию данных...")

        # 1. Получаем автора (Админа)
        author = User.objects.filter(is_superuser=True).first()
        if not author:
            self.stdout.write(self.style.ERROR("❌ Сначала создай суперюзера: python manage.py createsuperuser"))
            return

        # 2. Убедимся, что есть Школа (это важно для привязки!)
        schools = School.objects.all()
        if not schools.exists():
            self.stdout.write("⚠️ Школ нет, создаю тестовую...")
            School.objects.create(name="Тестовая Школа", custom_id="TEST01")
            schools = School.objects.all()

        # 3. Получаем предметы
        subjects = Subject.objects.all()
        if not subjects.exists():
            self.stdout.write("⚠️ Предметов нет, создаю базовые...")
            Subject.objects.create(name="Математика", slug="math", color="blue")
            Subject.objects.create(name="Физика", slug="physics", color="indigo")
            Subject.objects.create(name="История", slug="history", color="amber")
            subjects = Subject.objects.all()

        # 4. Генерация контента
        total_questions = 0
        
        with transaction.atomic():
            for subject in subjects:
                self.stdout.write(f"📚 Обработка предмета: {subject.name}")

                # Создаем темы для разных классов (9, 10, 11)
                for grade in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]: # 🔥 Добавил все классы
                    for i in range(1, 4): # По 3 темы на каждый класс
                        topic_title = f"Тема {i} по {subject.name} ({grade} класс)"
                        
                        topic, created = Topic.objects.get_or_create(
                            subject=subject,
                            grade_level=grade,
                            title=topic_title,
                            quarter=random.choice([1, 2, 3, 4]),
                            defaults={
                                'description': f"Описание темы {topic_title}.",
                                'author': author
                            }
                        )
                        
                        # 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: Привязываем тему к школам
                        # Теперь тема видна во всех школах
                        topic.schools.set(schools) 

                        if created:
                            # Генерируем вопросы
                            for q_num in range(1, 6): 
                                q_text = f"Вопрос №{q_num} по теме '{topic.title}'?"
                                
                                question = Question.objects.create(
                                    topic=topic,
                                    text=q_text,
                                    difficulty=random.choice(['easy', 'medium', 'hard']),
                                    question_type='single',
                                    points=1
                                )

                                # Генерируем варианты
                                correct_index = random.randint(0, 3)
                                for opt_idx, label in enumerate(['A', 'B', 'C', 'D']):
                                    is_correct = (opt_idx == correct_index)
                                    Choice.objects.create(
                                        question=question,
                                        text=f"Ответ {label}",
                                        is_correct=is_correct
                                    )
                                total_questions += 5

        self.stdout.write(self.style.SUCCESS(f"✅ Успешно! Темы теперь привязаны к школам. Вопросов: {total_questions}"))
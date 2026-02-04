from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from gat_exam.models import (
    School, Subject, Topic, Question, ExamRound, 
    BookletSection, QuestionLimit, UserProfile
)
import random

class Command(BaseCommand):
    help = 'Заполняет базу демо-данными для тестирования GAT'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Начало генерации демо-данных...")

        # 1. Создаем Школу
        school, _ = School.objects.get_or_create(
            name="Демо Лицей №1",
            defaults={'slug': 'demo-lyceum', 'color_theme': 'indigo'}
        )

        # 2. Создаем Предметы
        subjects_data = [
            ('Math', 'Математика', 'blue'),
            ('Eng', 'Английский', 'rose'),
            ('CS', 'Информатика', 'emerald'),
        ]
        
        subjects = {}
        for code, name, color in subjects_data:
            sub, _ = Subject.objects.get_or_create(
                name=name, 
                defaults={'abbreviation': code, 'slug': code.lower(), 'color': color}
            )
            subjects[code] = sub

        # 3. Создаем Пользователя-Эксперта
        expert_user, created = User.objects.get_or_create(username='expert_demo')
        if created:
            expert_user.set_password('123')
            expert_user.first_name = "Алишер"
            expert_user.last_name = "Экспертов"
            expert_user.save()
            # Профиль
            profile, _ = UserProfile.objects.get_or_create(user=expert_user)
            profile.role = 'expert'
            profile.save()
            self.stdout.write(self.style.SUCCESS(f"👤 Создан эксперт: expert_demo / 123"))

        # 4. Создаем Раунд GAT
        exam_round, _ = ExamRound.objects.get_or_create(
            name="GAT-2026 (Весна)",
            defaults={
                'date': timezone.now().date(),
                'target_easy_pct': 30,
                'target_medium_pct': 50,
                'target_hard_pct': 20
            }
        )

        # 5. Генерируем Банк Вопросов (по 20 шт на предмет)
        for code, sub in subjects.items():
            # Создаем тему
            topic, _ = Topic.objects.get_or_create(
                subject=sub, 
                title=f"Основы {sub.name}",
                grade_level=10,
                defaults={'quarter': 1}
            )

            current_qty = Question.objects.filter(topic=topic).count()
            if current_qty < 10:
                for i in range(15):
                    difficulty = random.choice(['easy', 'medium', 'hard'])
                    Question.objects.create(
                        topic=topic,
                        text=f"Демо вопрос №{i+1} по {sub.name} ({difficulty})? Текст вопроса для проверки верстки.",
                        difficulty=difficulty,
                        points=1
                    )
                self.stdout.write(f"📚 Добавлено 15 вопросов по {sub.name}")

            # 6. Создаем ЛИМИТЫ (Правила)
            # Школа требует 5 вопросов по этому предмету для 10 класса
            QuestionLimit.objects.get_or_create(
                school=school,
                subject=sub,
                grade_level=10,
                defaults={'count': 5}
            )

        # 7. 🔥 ГЛАВНОЕ: Создаем Секции (Задачи для Эксперта)
        
        # Секция 1: Математика 10 класс (Черновик)
        section_math, created = BookletSection.objects.get_or_create(
            round=exam_round,
            subject=subjects['Math'],
            grade_level=10,
            defaults={
                'expert': expert_user,
                'status': 'draft'
            }
        )
        if not created:
            section_math.expert = expert_user # Присвоим нашему эксперту, если уже была
            section_math.save()

        # Секция 2: Информатика 10 класс (На проверке)
        section_cs, _ = BookletSection.objects.get_or_create(
            round=exam_round,
            subject=subjects['CS'],
            grade_level=10,
            defaults={
                'expert': expert_user,
                'status': 'review'
            }
        )

        self.stdout.write(self.style.SUCCESS("✅ Демо-данные успешно загружены!"))
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from gat_exam.models import (
    Subject, ExamRound, BookletSection, 
    Question, SectionQuestion, UserProfile
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает тестовый цикл Smart Booklet (Раунд + Секции)'

    def handle(self, *args, **kwargs):
        # 1. Получаем суперюзера (он будет и Директором, и Экспертом для теста)
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR("❌ Нет суперюзера! Сначала создайте его."))
            return

        # Настраиваем профиль, чтобы система пустила в дашборды
        profile, _ = UserProfile.objects.get_or_create(user=admin_user)
        
        # Привязываем эксперта ко всем предметам, чтобы он видел все секции
        all_subjects = Subject.objects.all()
        if not all_subjects.exists():
            self.stdout.write(self.style.ERROR("❌ Нет предметов! Сначала запустите generate_fake_data"))
            return
            
        profile.assigned_subjects.set(all_subjects)
        profile.save()
        self.stdout.write(f"👨‍💼 Пользователь {admin_user.username} настроен как Эксперт по всем предметам.")

        # 2. Создаем Раунд (например, GAT-1)
        round_name = f"GAT-{random.randint(10, 99)} (Тестовый)"
        exam_round, created = ExamRound.objects.get_or_create(
            name=round_name,
            defaults={
                'date': timezone.now().date(),
                'is_active': True,
                'target_easy_pct': 30,
                'target_medium_pct': 50,
                'target_hard_pct': 20
            }
        )
        self.stdout.write(f"🏆 Раунд создан: {exam_round.name}")

        # 3. Создаем Секции (Задания) для каждого предмета
        # Например, только для 11 класса
        for subject in all_subjects:
            section, sec_created = BookletSection.objects.get_or_create(
                round=exam_round,
                subject=subject,
                grade_level=11,
                defaults={
                    'expert': admin_user, # Назначаем тебе
                    'status': 'draft'     # Статус черновика
                }
            )
            
            if sec_created:
                self.stdout.write(f"   📄 Секция '{subject.name}' создана -> Ответственный: {admin_user.username}")
                
                # 4. (Опционально) Добавим пару вопросов в черновик для наглядности
                pool_questions = Question.objects.filter(topic__subject=subject)[:5]
                
                for idx, q in enumerate(pool_questions):
                    SectionQuestion.objects.create(
                        section=section,
                        question=q,
                        order=idx + 1,
                        fixed_text=q.text
                    )

        self.stdout.write(self.style.SUCCESS("✅ Успешно! Теперь обновите страницу 'Manage Booklets'."))
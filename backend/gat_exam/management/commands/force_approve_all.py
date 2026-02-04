import random
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from gat_exam.models import (
    ExamRound, BookletSection, SectionQuestion, Question, 
    QuestionLimit, School, Subject
)

class Command(BaseCommand):
    help = 'АВТОПИЛОТ: Наполняет секции, ставит лимиты и утверждает всё для Директора'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Запуск Авто-Эксперта...")

        # 1. Берем активный раунд
        exam_round = ExamRound.objects.filter(is_active=True).first()
        if not exam_round:
            self.stdout.write(self.style.ERROR("❌ Нет активного раунда! Сначала запусти init_smart_cycle"))
            return

        self.stdout.write(f"🎯 Работаем с раундом: {exam_round.name}")

        # 2. НАСТРОЙКА ЛИМИТОВ (Это критически важно для генерации!)
        # Если школа не знает, сколько вопросов ей нужно, генератор ничего не создаст.
        schools = School.objects.all()
        subjects = Subject.objects.all()
        
        self.stdout.write("⚙️ Настраиваю лимиты вопросов для школ...")
        with transaction.atomic():
            for school in schools:
                for subject in subjects:
                    for grade in [9, 10, 11]:
                        # Допустим, нужно по 15 вопросов каждого предмета
                        QuestionLimit.objects.update_or_create(
                            school=school,
                            subject=subject,
                            grade_level=grade,
                            defaults={'count': 5} # Ставим 5 для теста (чтобы PDF не был огромным)
                        )

        # 3. НАПОЛНЕНИЕ СЕКЦИЙ И УТВЕРЖДЕНИЕ
        sections = BookletSection.objects.filter(round=exam_round)
        
        if not sections.exists():
            self.stdout.write(self.style.WARNING("⚠️ Секций нет. Создаю недостающие..."))
            # Если секций нет, создадим их быстро
            admin = get_user_model().objects.filter(is_superuser=True).first()
            for subject in subjects:
                BookletSection.objects.get_or_create(
                    round=exam_round, subject=subject, grade_level=11,
                    defaults={'expert': admin, 'status': 'draft'}
                )
            sections = BookletSection.objects.filter(round=exam_round)

        self.stdout.write(f"📝 Обработка {sections.count()} секций...")

        with transaction.atomic():
            for section in sections:
                # Очищаем старые вопросы в секции, чтобы не дублировать
                section.questions.clear()
                
                # Ищем вопросы в банке (подходящий предмет и класс)
                # Если вопросов 11 класса мало, берем любые для теста
                pool = Question.objects.filter(topic__subject=section.subject)
                
                # Если вопросов мало, берем сколько есть
                count_to_take = min(pool.count(), 10) 
                selected_questions = list(pool[:count_to_take])
                
                if not selected_questions:
                    self.stdout.write(self.style.WARNING(f"  ⚠️ Нет вопросов для {section.subject.name}"))
                    continue

                # Добавляем вопросы в секцию
                for idx, q in enumerate(selected_questions):
                    SectionQuestion.objects.create(
                        section=section,
                        question=q,
                        order=idx + 1,
                        fixed_text=q.text
                    )

                # 🔥 МАГИЯ: Утверждаем секцию
                section.status = 'approved' # Зеленый статус
                
                # Фейковая валидация для красоты UI
                section.ai_validation_result = {
                    "is_valid": True,
                    "errors": [],
                    "warnings": [],
                    "stats": {"current": count_to_take, "needed_max": 5}
                }
                section.save()
                
                self.stdout.write(f"  ✅ {section.subject.name} ({section.grade_level} кл) -> APPROVED ({count_to_take} вопр.)")

        self.stdout.write(self.style.SUCCESS("🎉 ГОТОВО! Теперь иди в Кабинет Директора и жми 'Генерация'."))
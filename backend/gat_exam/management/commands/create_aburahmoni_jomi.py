import random
import json
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from gat_exam.models import (
    School, Subject, Topic, Question, Choice, 
    ExamRound, BookletSection, SectionQuestion, Exam,
    StudentClass, Student, QuestionLimit
)

class Command(BaseCommand):
    help = 'Создает тестовые данные для школы Абураҳмони Ҷоми (5 класс, GAT-1, День 2)'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Начинаем создание данных для Абураҳмони Ҷоми...")

        with transaction.atomic():
            # 1. СОЗДАНИЕ ШКОЛЫ
            school, created = School.objects.get_or_create(
                name="Абураҳмони Ҷоми",
                defaults={
                    'custom_id': 'AJ_001',
                    'slug': 'aburahmoni-jomi',
                    'color_theme': 'emerald'
                }
            )
            if created:
                self.stdout.write(f"🏫 Школа создана: {school.name}")
            else:
                self.stdout.write(f"🏫 Школа найдена: {school.name}")

            # 2. СОЗДАНИЕ РАУНДА GAT-1
            exam_round, _ = ExamRound.objects.get_or_create(
                name="GAT-1",
                defaults={
                    'date': timezone.now().date(),
                    'is_active': True
                }
            )

            # 3. НАСТРОЙКА ПРЕДМЕТОВ (Из твоих Excel файлов)
            # Format: (Abbreviation, Name, QuestionCount)
            subjects_data = [
                ('Math', 'Математика', 25),
                ('Rus', 'Русский язык', 15),
                ('Lit', 'Адабиёт', 10),
                ('Hist', 'Таърихи умумӣ', 10),
                ('Comp', 'Информатика', 10),
            ]

            master_data_for_exam = {} # Для question_order
            subject_objects = []

            for abbr, name, q_count in subjects_data:
                # Создаем предмет
                subject, _ = Subject.objects.get_or_create(
                    abbreviation=abbr,
                    defaults={'name': name, 'slug': abbr.lower()}
                )
                subject_objects.append(subject)

                # Создаем Тему
                topic, _ = Topic.objects.get_or_create(
                    subject=subject,
                    grade_level=5,
                    quarter=1,
                    title=f"Базовая тема 5 кл ({name})"
                )

                # Создаем Секцию Буклета (День 2, 5 класс)
                section, sec_created = BookletSection.objects.get_or_create(
                    round=exam_round,
                    subject=subject,
                    grade_level=5,
                    day=2, # 🔥 ДЕНЬ 2
                    defaults={'status': 'approved'} # Сразу утверждаем
                )
                
                # Если секция была черновиком, утверждаем её
                section.status = 'approved'
                section.save()

                # Генерируем вопросы, если их нет
                current_q_count = SectionQuestion.objects.filter(section=section).count()
                
                if current_q_count < q_count:
                    needed = q_count - current_q_count
                    print(f"   📘 {name}: Генерирую {needed} вопросов...")
                    
                    for i in range(needed):
                        # Создаем вопрос
                        q = Question.objects.create(
                            topic=topic,
                            text=f"Вопрос №{current_q_count + i + 1} по {name} (Тест)?",
                            difficulty='medium',
                            question_type='single',
                            points=1
                        )
                        
                        # Варианты ответов (A - правильный для простоты теста, или рандом)
                        correct_idx = random.randint(0, 3)
                        for idx, letter in enumerate(['A', 'B', 'C', 'D']):
                            Choice.objects.create(
                                question=q,
                                text=f"Ответ {letter}",
                                is_correct=(idx == correct_idx)
                            )
                        
                        # Привязываем к секции
                        SectionQuestion.objects.create(
                            section=section,
                            question=q,
                            order=current_q_count + i + 1
                        )

                # Собираем ID вопросов для создания экзамена (Master List)
                qs_in_order = SectionQuestion.objects.filter(section=section).order_by('order')
                master_data_for_exam[abbr] = [sq.question.id for sq in qs_in_order]

            # 4. АВТО-ГЕНЕРАЦИЯ ЭКЗАМЕНОВ (Варианты C и D для Дня 2)
            self.stdout.write("⚙️ Генерация экзаменов Exam (Var C и Var D)...")
            
            variants = ['C', 'D'] # День 2 обычно C/D
            
            for var_code in variants:
                should_shuffle = (var_code == 'D') # D перемешиваем
                
                # Формируем карту вопросов
                current_order_map = {}
                final_q_ids = []

                for subj_key, q_ids in master_data_for_exam.items():
                    current_list = list(q_ids)
                    if should_shuffle:
                        random.shuffle(current_list)
                    
                    current_order_map[subj_key] = current_list
                    final_q_ids.extend(current_list)

                # Создаем объект Exam
                title = f"5 Класс - GAT-1 (День 2) - Var {var_code}"
                
                exam, _ = Exam.objects.update_or_create(
                    title=title,
                    defaults={
                        'school': school, # Привяжем к этой школе для теста
                        'gat_round': 1,
                        'gat_day': 2,
                        'status': 'planned',
                        'exam_type': 'offline',
                        'question_order': current_order_map # 🔥 ТОТ САМЫЙ JSON
                    }
                )
                
                # Привязываем M2M
                exam.subjects.set(subject_objects)
                exam.questions.set(final_q_ids)
                
                self.stdout.write(f"   ✅ Экзамен создан: {title} (ID: {exam.id})")

            # 5. СОЗДАЕМ ТЕСТОВЫХ УЧЕНИКОВ (Опционально)
            # Чтобы в Excel можно было вписать их ID
            stud_class, _ = StudentClass.objects.get_or_create(school=school, grade_level=5, section="А")
            
            if Student.objects.filter(school=school).count() < 5:
                self.stdout.write("👨‍🎓 Создаю тестовых учеников...")
                students_data = [
                    ("Алиев", "Вали", "1001"),
                    ("Каримов", "Азиз", "1002"),
                    ("Бобоев", "Рустам", "1003")
                ]
                for s_name, f_name, c_id in students_data:
                    Student.objects.get_or_create(
                        custom_id=c_id,
                        school=school,
                        defaults={
                            'first_name_ru': f_name,
                            'last_name_ru': s_name,
                            'student_class': stud_class,
                            'username': f"test_{c_id}"
                        }
                    )

        self.stdout.write(self.style.SUCCESS("🎉 ГОТОВО! Можно тестировать Smart Import."))
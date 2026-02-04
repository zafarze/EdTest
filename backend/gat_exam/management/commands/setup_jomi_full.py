import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from gat_exam.models import (
    School, Subject, Topic, Question, Choice, 
    ExamRound, BookletSection, Exam,
    StudentClass, Student, SchoolYear, Quarter
)

class Command(BaseCommand):
    help = 'Создает ПОЛНУЮ среду под Excel файл "Class 5.xlsx" с правильными ID'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 НАЧИНАЕМ ЗАЛИВКУ ДАННЫХ ПОД EXCEL...")

        with transaction.atomic():
            # 1. СОЗДАНИЕ УЧЕБНОГО ГОДА
            year_start = timezone.now().date()
            year_end = year_start + timedelta(days=365)
            
            year, _ = SchoolYear.objects.get_or_create(
                name="2025-2026", 
                defaults={
                    'is_active': True,
                    'start_date': year_start,
                    'end_date': year_end
                }
            )
            
            # 1.5. СОЗДАНИЕ ЧЕТВЕРТИ (FORCE ID = 1)
            # 🔥 ВАЖНО: Мы пытаемся захватить ID=1, чтобы фильтры на фронтенде (quarter=1) работали.
            q1_start = year_start
            q1_end = year_start + timedelta(days=60)
            
            try:
                # Пытаемся найти четверть именно с ID=1
                quarter_obj = Quarter.objects.get(id=1)
                # Если нашли - обновляем её данные
                quarter_obj.name = "1-я Четверть"
                quarter_obj.school_year = year
                quarter_obj.is_active = True
                quarter_obj.save()
                self.stdout.write(f"📅 Четверть обновлена (ID: 1)")
            except Quarter.DoesNotExist:
                # Если ID=1 свободен - создаем новую с этим ID
                quarter_obj = Quarter.objects.create(
                    id=1,
                    school_year=year,
                    name="1-я Четверть",
                    start_date=q1_start,
                    end_date=q1_end,
                    is_active=True
                )
                self.stdout.write(f"📅 Четверть создана принудительно (ID: 1)")

            # 2. СОЗДАНИЕ GAT-1
            exam_round, _ = ExamRound.objects.get_or_create(
                name="1", 
                defaults={
                    'date': timezone.now().date(),
                    'is_active': True
                }
            )
            self.stdout.write(f"🏆 Раунд GAT-1 готов (ID: {exam_round.id})")

            # 3. СОЗДАНИЕ ШКОЛЫ
            school, created = School.objects.get_or_create(
                name="Абураҳмони Ҷоми",
                defaults={
                    'custom_id': '60', 
                    'slug': 'aburahmoni-jomi',
                    'color_theme': 'emerald'
                }
            )
            self.stdout.write(f"🏫 Школа готова: {school.name}")

            # 4. СОЗДАНИЕ КЛАССА
            student_class, _ = StudentClass.objects.get_or_create(
                school=school,
                grade_level=5,
                section="А"
            )

            # 5. СОЗДАНИЕ ПРЕДМЕТОВ
            subjects_config = [
                ("Адабиёт", "Адабиёт", 10, "rose"),
                ("Русский язык", "Рус.яз", 15, "blue"),
                ("Таърихи умумӣ", "Таъ.ум", 10, "amber"),
                ("Информатика", "Comp", 10, "violet"),
                ("Математика", "Math", 20, "emerald"),
                ("Английский", "Eng", 20, "cyan"),
                ("Таърихи халқи тоҷик", "Toj.t", 10, "rose"),
            ]

            created_questions = [] 
            
            for s_name, s_abbr, q_count, s_color in subjects_config:
                subject = Subject.objects.filter(Q(name__iexact=s_name) | Q(abbreviation__iexact=s_abbr)).first()
                
                if subject:
                    subject.name = s_name
                    subject.abbreviation = s_abbr
                    subject.color = s_color
                    subject.save()
                    self.stdout.write(f"   🔄 Предмет обновлен: {s_name}")
                else:
                    subject = Subject.objects.create(
                        name=s_name,
                        abbreviation=s_abbr,
                        slug=s_abbr.lower().replace('.', '') + '_5',
                        color=s_color
                    )
                    self.stdout.write(f"   ✨ Предмет создан: {s_name}")

                # Б. Создаем тему (Здесь quarter - это просто число в модели Topic)
                topic, _ = Topic.objects.get_or_create(
                    subject=subject,
                    title=f"Тема по {s_name}",
                    grade_level=5,
                    defaults={
                        'quarter': 1 
                    }
                )

                # В. Создаем вопросы
                existing_qs = Question.objects.filter(topic=topic).count()
                
                if existing_qs < q_count:
                    needed = q_count - existing_qs
                    new_qs = []
                    for i in range(1, needed + 1):
                        q = Question(
                            topic=topic,
                            text=f"Вопрос №{existing_qs + i} по {s_name} ({s_abbr})?",
                            question_type='single',
                            points=1,
                            difficulty='medium'
                        )
                        new_qs.append(q)
                    
                    Question.objects.bulk_create(new_qs)
                    
                    saved_qs = Question.objects.filter(topic=topic).order_by('-id')[:needed]
                    
                    all_choices = []
                    for q in saved_qs:
                        for char in ['A', 'B', 'C', 'D']:
                            all_choices.append(Choice(
                                question=q,
                                text=f"Ответ {char}",
                                is_correct=(char == 'A')
                            ))
                    Choice.objects.bulk_create(all_choices)
                    
                    created_questions.extend(list(saved_qs))
                    self.stdout.write(f"      📚 Добавлено {needed} вопросов")
                else:
                    qs = list(Question.objects.filter(topic=topic)[:q_count])
                    created_questions.extend(qs)

            # 6. ГЕНЕРАЦИЯ ЭКЗАМЕНОВ
            target_day = 2 
            variants = ['A', 'B', 'C', 'D']
            
            self.stdout.write(f"⚙️ Генерирую экзамены для 5 класса (День {target_day})...")

            created_questions.sort(key=lambda x: x.topic.subject.id)

            for variant in variants:
                title = f"5 Классы - GAT-1 (День {target_day}) - Var {variant}"
                
                exam_questions = created_questions.copy()
                
                is_shuffled = variant != 'A'
                if is_shuffled:
                    random.seed(f"gat1_day2_{variant}_v3") 
                    random.shuffle(exam_questions)

                order_map = {}
                for idx, q in enumerate(exam_questions):
                    order_map[str(idx + 1)] = q.id

                # Создаем/Обновляем экзамен
                exam, _ = Exam.objects.update_or_create(
                    title=title,
                    gat_round=1,
                    gat_day=target_day,
                    defaults={
                        'school_year': year,
                        'date': timezone.now().date(),
                        'exam_type': 'offline',
                        'status': 'planned',
                        'variants_count': 4,
                        'question_order': order_map,
                        # 🔥 ССЫЛКА НА ПРАВИЛЬНЫЙ QUARTER (ID=1)
                        'quarter': quarter_obj 
                    }
                )
                
                exam.questions.set(exam_questions)
                self.stdout.write(f"   ✅ Экзамен создан: {title}")

            # 7. СОЗДАНИЕ УЧЕНИКОВ
            students_data = [
                ("60030", "РАДЖАБОВ", "САМАД"),
                ("60102", "ХИСРАВ", "БУРХОНЗОДА"),
            ]

            for s_id, last, first in students_data:
                Student.objects.get_or_create(
                    custom_id=s_id,
                    defaults={
                        'first_name_ru': first,
                        'last_name_ru': last,
                        'school': school,
                        'student_class': student_class,
                        'status': 'active'
                    }
                )
            self.stdout.write(f"👨‍🎓 Тестовые ученики добавлены.")

        self.stdout.write(self.style.SUCCESS("🎉 ВСЕ ГОТОВО! ID четверти теперь точно = 1"))
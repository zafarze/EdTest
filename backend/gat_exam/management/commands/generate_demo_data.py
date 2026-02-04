import random
from io import BytesIO
from PIL import Image, ImageDraw
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

# Импортируем модели согласно твоему models.py
from gat_exam.models import (
    Subject, Topic, Question, Choice, 
    School, Exam, ExamRound
)

class Command(BaseCommand):
    help = 'Генерирует 50 вопросов с цветными картинками для теста верстки и Ч/Б режима'

    def create_color_image(self, text, color, size=(400, 200)):
        """Создает цветную картинку в памяти"""
        img = Image.new('RGB', size, color=color)
        d = ImageDraw.Draw(img)
        # Рисуем текст (если получится, иначе просто цветной квадрат)
        try:
            d.text((10, 80), text, fill=(255, 255, 255))
        except:
            pass
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        return ContentFile(buffer.getvalue(), name=f'{text}_{random.randint(1000,9999)}.jpg')

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Начинаем генерацию демо-данных...")

        with transaction.atomic():
            # 1. Создаем Школу и Предмет
            school, _ = School.objects.get_or_create(name="Demo School #1")
            subject, _ = Subject.objects.get_or_create(name="Math & Logic")
            
            # 2. Создаем Тему (ИСПРАВЛЕНО: используем title и quarter)
            topic, _ = Topic.objects.get_or_create(
                subject=subject, 
                title="General Algebra",   # Было name, стало title
                grade_level=5,
                quarter=1                  # Обязательное поле из models.py
            )
            
            # 3. Генерируем 50 вопросов
            questions_list = []
            colors = ['red', 'blue', 'green', 'purple', 'orange']
            
            for i in range(1, 51):
                has_image = i % 3 == 0 
                
                q_text = f"Вопрос №{i}: Вычислите значение выражения. "
                if i % 5 == 0:
                    q_text += "Это длинный вопрос, чтобы проверить, как текст переносится на следующую строку и не ломает верстку колонок. " * 2

                # Создаем вопрос
                q = Question.objects.create(
                    text=q_text,
                    topic=topic,
                    difficulty='medium',
                    question_type='single'
                )
                
                # Добавляем картинку
                if has_image:
                    color = random.choice(colors)
                    img_file = self.create_color_image(f"Q{i} Image", color)
                    if hasattr(q, 'image'):
                        q.image.save(img_file.name, img_file, save=False)
                        q.save()
                
                # 4. Создаем варианты ответов (Используем модель Choice)
                for j, letter in enumerate(['A', 'B', 'C', 'D']):
                    is_correct = (j == 0)
                    
                    choice = Choice(
                        question=q,
                        text=f"Вариант {letter} для вопроса {i}",
                        is_correct=is_correct
                    )
                    choice.save()
                
                questions_list.append(q)
                
                if i % 10 == 0:
                    self.stdout.write(f"   ...создано {i} вопросов")

            # 5. Создаем Экзамен
            exam = Exam.objects.create(
                title="DEMO PRINT TEST 50 Qs",
                school=school,
                gat_round=1, # Используем int, так как choices=(1, 'GAT-1')
                gat_day=1,
                variant='A',
                grade_level=5,
                status='planned'
            )
            
            # Привязываем вопросы
            exam.questions.set(questions_list)
            
            # Генерируем маппинг (1 к 1)
            order_map = {}
            for idx, q in enumerate(questions_list):
                order_map[str(idx + 1)] = q.id
            
            exam.question_order = order_map
            exam.save()

        self.stdout.write(self.style.SUCCESS(f"✅ УСПЕШНО! Экзамен ID: {exam.id}"))
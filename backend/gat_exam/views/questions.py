import json
import openpyxl
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from ..models import Question, Choice, Topic
from ..serializers import QuestionSerializer

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all().prefetch_related('choices')
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['topic', 'exam', 'question_type', 'difficulty']
    search_fields = ['text']

    def perform_create(self, serializer):
        question = serializer.save()
        choices_json = self.request.data.get('choices_data')
        if choices_json:
            choices_data = json.loads(choices_json)
            for index, choice_data in enumerate(choices_data):
                image_key = f'choice_image_{index}'
                image_file = self.request.FILES.get(image_key)
                Choice.objects.create(
                    question=question,
                    text=choice_data.get('text', ''),
                    is_correct=choice_data.get('is_correct', False),
                    image=image_file
                )

    # --- 1. СКАЧАТЬ ШАБЛОН ---
    @action(detail=False, methods=['get'])
    def download_template(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Questions Template"

        # Заголовки (сделаем их жирными и понятными)
        headers = [
            "Текст вопроса", 
            "Сложность (easy/medium/hard)", 
            "Тип (single/multiple)",
            "Вариант A", "Вариант B", "Вариант C", "Вариант D",
            "Правильный ответ (A, B, C, D)"
        ]
        ws.append(headers)
        
        # Пример данных
        ws.append([
            "Сколько будет 2 + 2?", "easy", "single", 
            "3", "4", "5", "6", 
            "B"
        ])
        ws.append([
            "Столица Таджикистана?", "medium", "single", 
            "Худжанд", "Душанбе", "Куляб", "Бохтар", 
            "B"
        ])

        # Настройка ширины колонок
        ws.column_dimensions['A'].width = 50
        for col in ['D', 'E', 'F', 'G']:
            ws.column_dimensions[col].width = 20

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="questions_template.xlsx"'
        wb.save(response)
        return response

    # --- 2. ИМПОРТ EXCEL ---
    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        file = request.FILES.get('file')
        topic_id = request.data.get('topic')

        if not file or not topic_id:
            return Response({"error": "Файл и тема обязательны"}, status=400)

        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
            
            created_count = 0
            
            with transaction.atomic():
                # Пропускаем заголовок (min_row=2)
                for row in ws.iter_rows(min_row=2, values_only=True):
                    # row[0] - Текст, row[1] - Сложность, ...
                    q_text, q_diff, q_type, opt_a, opt_b, opt_c, opt_d, correct_letter = row

                    if not q_text: continue # Пропуск пустых строк

                    # Нормализация данных
                    q_diff = q_diff.lower() if q_diff else 'medium'
                    if q_diff not in ['easy', 'medium', 'hard']: q_diff = 'medium'
                    
                    q_type = q_type.lower() if q_type else 'single'

                    # Создаем вопрос
                    question = Question.objects.create(
                        topic_id=topic_id,
                        text=str(q_text),
                        difficulty=q_diff,
                        question_type=q_type
                    )

                    # Создаем варианты
                    options = [str(opt_a), str(opt_b), str(opt_c), str(opt_d)]
                    correct_letter = str(correct_letter).upper().strip() # "A", "B"...
                    
                    letters = ['A', 'B', 'C', 'D']

                    for i, opt_text in enumerate(options):
                        is_correct = (letters[i] == correct_letter)
                        Choice.objects.create(
                            question=question,
                            text=opt_text if opt_text else "", # Защита от None
                            is_correct=is_correct
                        )
                    
                    created_count += 1

            return Response({"status": "success", "count": created_count})

        except Exception as e:
            return Response({"error": str(e)}, status=500)
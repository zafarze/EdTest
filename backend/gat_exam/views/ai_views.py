import base64
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django_celery_results.models import TaskResult
from celery.result import AsyncResult

# Импортируем задачу Celery
from ..tasks import ai_analyze_question_task

# Импортируем обычный сервис для генерации дистракторов (это быстрая операция, можно без Celery)
from ..services.ai_service import generate_distractors_ai

# 1. VIEW ДЛЯ АНАЛИЗА ВОПРОСА (Асинхронно через Celery)
class AIAnalyzeQuestionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, *args, **kwargs):
        try:
            text = request.data.get('text', '')
            
            # Обработка choices
            choices_raw = request.data.get('choices')
            choices = json.loads(choices_raw) if choices_raw else []

            # Обработка картинки (в Base64 для Celery)
            image_b64 = None
            if 'image' in request.FILES:
                img_file = request.FILES['image']
                img_data = img_file.read()
                # Формируем data URI scheme
                image_b64 = f"data:{img_file.content_type};base64,{base64.b64encode(img_data).decode('utf-8')}"

            # 🔥 ЗАПУСК ЗАДАЧИ В ФОНЕ
            task = ai_analyze_question_task.delay(text, choices, image_b64)
            
            # Возвращаем ID задачи фронтенду моментально
            return Response({"task_id": task.id, "status": "processing"}, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# 2. VIEW ДЛЯ ПРОВЕРКИ СТАТУСА ЗАДАЧИ
class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        task_result = AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
             return Response({"state": "PENDING", "status": "В очереди..."}, status=status.HTTP_200_OK)
        elif task_result.state == 'STARTED':
             return Response({"state": "STARTED", "status": "Анализ AI..."}, status=status.HTTP_200_OK)
        elif task_result.state == 'SUCCESS':
             return Response({
                 "state": "SUCCESS", 
                 "result": task_result.result 
             }, status=status.HTTP_200_OK)
        elif task_result.state == 'FAILURE':
             return Response({"state": "FAILURE", "error": str(task_result.result)}, status=status.HTTP_200_OK)
        
        return Response({"state": task_result.state}, status=status.HTTP_200_OK)

# 3. VIEW ДЛЯ ГЕНЕРАЦИИ ДИСТРАКТОРОВ (Синхронно, т.к. быстро)
class AIGenerateDistractorsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        question_text = request.data.get('question_text')
        correct_answer = request.data.get('correct_answer')
        
        if not question_text or not correct_answer:
            return Response({"error": "Missing question_text or correct_answer"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Вызываем сервис напрямую (это занимает 1-2 сек, Celery не обязателен)
            distractors = generate_distractors_ai(question_text, correct_answer)
            return Response({"distractors": distractors}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
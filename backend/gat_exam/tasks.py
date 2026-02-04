from celery import shared_task
import base64
from django.core.files.base import ContentFile
# Импортируем сервисы внутри функций, чтобы избежать циклических импортов при запуске
# (Это частая проблема, поэтому импорт перенесен внутрь)

@shared_task(bind=True)
def ai_analyze_question_task(self, text, choices, image_data_base64=None):
    """
    Фоновая задача для проверки вопроса через AI.
    """
    # Ленивый импорт сервиса
    from .services.ai_service import analyze_question_ai
    
    # Обработка картинки из Base64 (если есть)
    image_file = None
    if image_data_base64:
        try:
            format, imgstr = image_data_base64.split(';base64,') 
            ext = format.split('/')[-1] 
            image_file = ContentFile(base64.b64decode(imgstr), name=f'temp.{ext}')
        except Exception as e:
            print(f"Ошибка декодирования картинки в задаче: {e}")

    # Вызываем сервис
    try:
        result = analyze_question_ai(text, choices, image_file)
        return result
    except Exception as e:
        return {"valid": False, "message": f"Critical AI Error: {str(e)}"}

@shared_task
def grader_process_scan_task(file_path):
    """
    Фоновая задача для грейдера (на будущее)
    """
    return {"status": "pending", "message": "Grader task not implemented yet"}
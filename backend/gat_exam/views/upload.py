from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import logging

# Импортируем сервисы
from ..services.import_service import ImportService 
from ..services.grader_service import GraderService 

logger = logging.getLogger(__name__)

class FileUploadView(APIView):
    """
    Единая точка входа для загрузки файлов.
    Маршрутизирует задачу в нужный сервис в зависимости от 'mode'.
    
    Поддерживаемые режимы (mode):
    1. 'smart'   -> 🚀 НОВЫЙ: Умный массовый импорт (Школа + Класс + Раунд + День)
    2. 'scan'    -> Обработка фото бланка/OMR (GraderService)
    3. 'scores'  -> (Legacy) Старый импорт баллов в конкретный экзамен
    4. 'answers' -> (Legacy) Старый импорт ответов в конкретный экзамен
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. Получаем файл
        file_obj = request.FILES.get('file')
        
        # 2. Получаем параметры
        mode = request.data.get('mode', 'smart') # По умолчанию smart
        
        # -- Параметры для старого импорта (по одному) --
        exam_id = request.data.get('exam_id')
        
        # -- Параметры для НОВОГО Smart Import --
        school_id = request.data.get('school_id')
        grade = request.data.get('grade')
        round_id = request.data.get('round_id')
        day = request.data.get('day') # 🔥 Обязательный параметр для GAT

        # Очистка exam_id от мусора JS (если пришло 'undefined' или 'null')
        if str(exam_id) in ['undefined', 'null', '']:
            exam_id = None

        # 3. Базовая валидация файла
        if not file_obj:
            return Response(
                {"status": "error", "message": "Файл не загружен (File is missing)"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"📥 [UploadView] Incoming: Mode={mode}, File={file_obj.name}")

        try:
            # ==========================================
            # 🚀 ВАРИАНТ 1: SMART IMPORT (Умный робот)
            # ==========================================
            if mode == 'smart':
                print(f"🧠 [UploadView] Запуск Smart Import...")
                
                # Проверка обязательных полей
                missing = []
                if not school_id: missing.append('school_id (Школа)')
                if not grade: missing.append('grade (Класс)')
                if not round_id: missing.append('round_id (Раунд)')
                if not day: missing.append('day (День)')
                
                if missing:
                    return Response(
                        {"status": "error", "message": f"Для умного импорта не хватает данных: {', '.join(missing)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Вызов сервиса (с преобразованием типов в int)
                result = ImportService.process_smart_import(
                    file=file_obj,
                    school_id=int(school_id),
                    grade_level=int(grade),
                    round_id=int(round_id),
                    day=int(day) # 🔥 Передаем день в сервис!
                )
                
                # Возврат результата
                http_status = status.HTTP_200_OK
                if result.get('status') == 'error':
                    http_status = status.HTTP_400_BAD_REQUEST
                    
                return Response(result, status=http_status)

            # ==========================================
            # 📸 ВАРИАНТ 2: СКАНИРОВАНИЕ (OMR)
            # ==========================================
            elif mode == 'scan':
                print(f"📸 [UploadView] Запуск сканера...")
                result = GraderService.process_scan(file_obj)
                
                if result.get('status') == 'error':
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
                return Response(result, status=status.HTTP_200_OK)

            # ==========================================
            # 📊 ВАРИАНТ 3: ОБЫЧНЫЙ ИМПОРТ (Legacy)
            # ==========================================
            elif mode in ['scores', 'answers']:
                if not exam_id:
                    return Response(
                        {"status": "error", "message": "Для точечного импорта укажите Exam ID"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                print(f"📊 [UploadView] Запуск обычного импорта в экзамен {exam_id}...")
                result = ImportService.process_file(file_obj, mode, exam_id)
                
                if result.get('status') == 'error':
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
                return Response(result, status=status.HTTP_200_OK)

            # Если режим неизвестен
            else:
                return Response(
                    {"status": "error", "message": f"Неизвестный режим '{mode}'"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Upload Error: {e}")
            return Response(
                {"status": "error", "message": f"Внутренняя ошибка сервера: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
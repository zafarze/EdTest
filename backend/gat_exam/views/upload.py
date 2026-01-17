from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

# Импортируем оба сервиса
from ..services.import_service import ImportService 
from ..services.grader_service import GraderService 

class FileUploadView(APIView):
    """
    Единая точка входа для загрузки файлов.
    Маршрутизирует задачу в нужный сервис в зависимости от 'mode'.
    
    Поддерживаемые режимы (mode):
    1. 'scores'  -> Импорт Excel с баллами (ImportService)
    2. 'answers' -> Импорт Excel с ответами A/B/C/D (ImportService)
    3. 'scan'    -> Обработка фото бланка/OMR (GraderService)
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. Получаем данные из запроса
        file_obj = request.FILES.get('file')
        mode = request.data.get('mode')
        exam_id = request.data.get('exam_id')

        # Очистка exam_id от строкового "undefined" (приходит с фронта, если не выбран экзамен)
        if str(exam_id) == 'undefined' or str(exam_id) == 'null':
            exam_id = None

        # 2. Базовая валидация
        if not file_obj:
            return Response(
                {"status": "error", "message": "Файл не загружен (File is missing)"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_modes = ['scores', 'answers', 'scan']
        if mode not in valid_modes:
             return Response(
                {"status": "error", "message": f"Неверный режим '{mode}'. Допустимые: {valid_modes}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # --- ВАРИАНТ А: СКАНИРОВАНИЕ (OMR) ---
            if mode == 'scan':
                # Для скана exam_id не обязателен в запросе, 
                # так как GraderService может достать его из QR-кода.
                # Но если QR не считается, ошибка вернется из сервиса.
                
                print(f"📸 [UploadView] Запуск сканирования файла: {file_obj.name}")
                result = GraderService.process_scan(file_obj)
                
                if result.get('status') == 'error':
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
                return Response(result, status=status.HTTP_200_OK)

            # --- ВАРИАНТ Б: ИМПОРТ EXCEL (Баллы/Ответы) ---
            else: # mode == 'scores' or mode == 'answers'
                if not exam_id:
                    return Response(
                        {"status": "error", "message": "Для импорта Excel обязательно укажите Экзамен (Exam ID)"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                print(f"📊 [UploadView] Запуск импорта Excel. Mode: {mode}, Exam: {exam_id}")
                result = ImportService.process_file(file_obj, mode, exam_id)
                
                if result.get('status') == 'error':
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
                return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            # Глобальный перехват ошибок, чтобы сервер не упал (500)
            print(f"❌ [UploadView] Critical Error: {str(e)}")
            return Response(
                {"status": "error", "message": f"Внутренняя ошибка сервера: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
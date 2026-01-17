from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import ExamResult

class AllResultsView(APIView):
    # 🔒 РЕЖИМ ПРОДАКШЕНА (Безопасно):
    # Только авторизованные пользователи (Front-end с токеном) могут видеть данные.
    permission_classes = [IsAuthenticated]

    # 🔓 РЕЖИМ ОТЛАДКИ (Тест в браузере):
    # Если нужно проверить ссылку в Chrome без фронтенда,
    # закомментируйте строку выше и раскомментируйте строку ниже:
    # permission_classes = [AllowAny]

    def get(self, request):
        # --- 1. Считываем параметры из запроса ---
        school_ids = request.query_params.get('schools')
        quarter_id = request.query_params.get('quarter')
        gat_round = request.query_params.get('gat')
        grade_level = request.query_params.get('grade')
        gat_day = request.query_params.get('day')  # 🔥 Параметр дня

        # 🔍 ЛОГИ: Выводим в терминал параметры запроса
        print(f"\n--- 🔍 ЗАПРОС API (AllResultsView) ---")
        print(f"Schools: {school_ids}")
        print(f"Quarter: {quarter_id}")
        print(f"GAT Round: {gat_round}")
        print(f"Grade: {grade_level}")
        print(f"Day: {gat_day}")

        # --- 2. Базовая выборка (Optimized) ---
        # Используем select_related, чтобы Django не делал 1000 запросов к БД
        queryset = ExamResult.objects.select_related(
            'student', 
            'student__school', 
            'student__student_class', 
            'exam'
        ).all()

        # --- 3. Применяем фильтры ---
        
        # Фильтр по Школам (принимает строку "1,2,3")
        if school_ids:
            try:
                ids = [int(x) for x in school_ids.split(',') if x.strip().isdigit()]
                if ids:
                    queryset = queryset.filter(student__school_id__in=ids)
            except ValueError:
                pass
        
        # Фильтр по Четверти
        if quarter_id and quarter_id.isdigit():
            queryset = queryset.filter(exam__quarter_id=int(quarter_id))
            
        # Фильтр по Раунду GAT
        if gat_round and gat_round.isdigit():
            queryset = queryset.filter(exam__gat_round=int(gat_round))

        # 🔥 Фильтр по Дню (1 или 2)
        if gat_day and gat_day.isdigit():
            queryset = queryset.filter(exam__gat_day=int(gat_day))
            
        # Фильтр по Классу (grade level)
        if grade_level and grade_level.isdigit():
            queryset = queryset.filter(student__student_class__grade_level=int(grade_level))

        # 🔍 ЛОГИ: Количество найденных записей
        count = queryset.count()
        print(f"✅ НАЙДЕНО ЗАПИСЕЙ: {count}")
        print("-------------------------------------\n")

        # --- 4. Формируем красивый JSON ---
        data = []
        for r in queryset:
            # Безопасное получение имени школы и класса (на случай если удалены)
            school_name = r.student.school.name if r.student.school else "—"
            class_name = str(r.student.student_class) if r.student.student_class else "-"
            
            # Формируем ФИО
            student_name = f"{r.student.last_name_ru} {r.student.first_name_ru}"
            
            data.append({
                "id": r.id,
                "student_name": student_name,
                "class_name": class_name,
                "school_name": school_name,
                "score": r.score,
                "max_score": r.max_score,
                "percentage": r.percentage,
                "details": r.details,   # Детализация ответов (Eng_1: 1, Math_2: 0...)
                "day": r.exam.gat_day   # Возвращаем день, чтобы показать в таблице
            })
            
        return Response(data)
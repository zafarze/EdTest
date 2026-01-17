from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from ..models import School, StudentClass, Exam

# Импортируем из основного файла serializers.py
from ..serializers import (
    SchoolCatalogSerializer,
    ClassCatalogSerializer,
    GatGroupSerializer,
    BookletCatalogSerializer
)

class BookletCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get('level', 'schools')
        
        # --- УРОВЕНЬ 1: ШКОЛЫ ---
        if level == 'schools':
            schools = School.objects.annotate(
                students_count=Count('students', distinct=True),
                tests_count=Count('exams', distinct=True) # Используем related_name='exams' из модели
            ).order_by('name')
            
            serializer = SchoolCatalogSerializer(schools, many=True)
            return Response(serializer.data)

        # --- УРОВЕНЬ 2: КЛАССЫ ---
        elif level == 'classes':
            school_id = request.query_params.get('schoolId')
            if not school_id:
                return Response({"error": "schoolId is required"}, status=400)

            classes = StudentClass.objects.filter(school_id=school_id).annotate(
                tests_count=Count('exams') # Используем related_name='exams'
            ).order_by('-grade_level', 'section')
            
            serializer = ClassCatalogSerializer(classes, many=True)
            return Response(serializer.data)

        # --- УРОВЕНЬ 3: GAT (НОМЕРА) ---
        elif level == 'gats':
            class_id = request.query_params.get('classId')
            if not class_id:
                return Response({"error": "classId is required"}, status=400)

            gats = Exam.objects.filter(classes__id=class_id)\
                .values('gat_round', 'date', 'status')\
                .distinct().order_by('gat_round')
            
            data = []
            seen_rounds = set()
            for g in gats:
                if g['gat_round'] not in seen_rounds:
                    data.append({
                        'gat_round': g['gat_round'],
                        'date': g['date'],
                        'status': g['status'],
                        'id': f"gat-{g['gat_round']}"
                    })
                    seen_rounds.add(g['gat_round'])

            serializer = GatGroupSerializer(data, many=True)
            return Response(serializer.data)

        # --- УРОВЕНЬ 4: БУКЛЕТЫ ---
        elif level == 'booklets':
            class_id = request.query_params.get('classId')
            gat_number = request.query_params.get('gatNumber')
            
            if not class_id or not gat_number:
                return Response({"error": "classId and gatNumber are required"}, status=400)

            booklets = Exam.objects.filter(
                classes__id=class_id, 
                gat_round=gat_number
            ).prefetch_related('subjects')
            
            serializer = BookletCatalogSerializer(booklets, many=True)
            return Response(serializer.data)

        return Response({"error": "Invalid level"}, status=400)

class BookletDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # 1. Находим экзамен
        exam = get_object_or_404(Exam, pk=pk)
        
        # 2. Получаем вопросы (важно отсортировать по предметам для группировки в шаблоне)
        questions = exam.questions.select_related('subject')\
            .prefetch_related('choices')\
            .order_by('subject__name', 'id')

        # 3. Собираем контекст для шаблона
        context = {
            'page_title': f"{exam.title} (Вариант {chr(65 + (exam.id % 4))})",
            'header_left': exam.school.name if exam.school else "GAT Premium",
            'header_center': f"{exam.title} | {exam.get_gat_round_display()}",
            'header_right': exam.date.strftime('%d.%m.%Y') if exam.date else "Дата не указана",
            'all_questions': questions,
        }

        # 4. Рендерим HTML
        html_string = render_to_string('booklet_pdf.html', context, request=request)

        # 5. Генерируем PDF
        if weasyprint:
            # base_url нужен для подгрузки картинок (static/media)
            pdf_file = weasyprint.HTML(string=html_string, base_url=request.build_absolute_uri()).write_pdf()
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            # 'inline' открывает в браузере, 'attachment' скачивает файл
            response['Content-Disposition'] = f'inline; filename="booklet_{exam.id}.pdf"'
            return response
        else:
            return HttpResponse("Ошибка: Библиотека WeasyPrint не установлена на сервере.", status=500)
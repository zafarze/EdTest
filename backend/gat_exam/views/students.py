from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.http import HttpResponse
from django.db import transaction
import random
import qrcode
import secrets # 🔥 Для безопасной генерации
import string  # 🔥 Для алфавита
import openpyxl 
import re 

import io
import os # Для путей
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm

from ..models import Student, StudentClass, School
from ..serializers import StudentSerializer

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Student.objects.select_related('school', 'student_class').all()
        
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(first_name_ru__icontains=search_query) |
                Q(last_name_ru__icontains=search_query) |
                Q(custom_id__icontains=search_query) |
                Q(username__icontains=search_query)
            )

        school_id = self.request.query_params.get('school_id')
        if school_id: queryset = queryset.filter(school_id=school_id)

        class_id = self.request.query_params.get('class_id')
        if class_id: queryset = queryset.filter(student_class_id=class_id)
            
        grade_level = self.request.query_params.get('grade_level')
        if grade_level: queryset = queryset.filter(student_class__grade_level=grade_level)

        return queryset.order_by('last_name_ru')

    def _get_next_smart_id(self, school_id):
        try:
            school = School.objects.get(id=school_id)
            school_prefix = school.custom_id if school.custom_id else "00"
            existing_ids = Student.objects.filter(school_id=school_id, custom_id__startswith=school_prefix).values_list('custom_id', flat=True)
            used_numbers = set()
            for uid in existing_ids:
                suffix = uid[len(school_prefix):] 
                if suffix.isdigit(): used_numbers.add(int(suffix))
            next_num = 1
            while next_num in used_numbers: next_num += 1
            return f"{school_prefix}{str(next_num).zfill(4)}"
        except Exception: return None

    def _transliterate(self, text):
        if not text: return ""
        mapping = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya','ғ':'gh','қ':'q','ҳ':'h','ҷ':'j','ӣ':'i','ӯ':'u'}
        return "".join([mapping.get(char, char) for char in text.lower()])

    def _parse_class_string(self, class_str):
        if not class_str: return None, None
        match = re.match(r"(\d+)([а-яА-Яa-zA-Z]*)", str(class_str).strip())
        if match:
            return int(match.group(1)), match.group(2).upper()
        return None, None

    def _normalize_gender(self, val):
        if not val: return 'male'
        s = str(val).strip().lower()
        if s in ['female', 'f', 'женский', 'ж', 'жен']: return 'female'
        return 'male'

    # 🔥 ПРОФЕССИОНАЛЬНАЯ ГЕНЕРАЦИЯ ПАРОЛЯ
    def _generate_strong_password(self, length=8):
        """
        Генерирует безопасный, но читаемый пароль.
        Исключает похожие символы (l, I, 1, O, 0), чтобы не путать при вводе.
        """
        # Набор символов: буквы (без l, I, O) + цифры (без 1, 0)
        chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            password = ''.join(secrets.choice(chars) for _ in range(length))
            # Проверяем, что есть хотя бы одна цифра и одна буква (для надежности)
            if (any(c.isdigit() for c in password) and any(c.isalpha() for c in password)):
                return password

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('custom_id'):
            generated_id = self._get_next_smart_id(data.get('school'))
            if generated_id: data['custom_id'] = generated_id
        
        if not data.get('username') and data.get('last_name_ru'):
             base_login = self._transliterate(data['last_name_ru'])
             suffix = data.get('custom_id')[-4:] if data.get('custom_id') else str(random.randint(100,999))
             data['username'] = f"{base_login}{suffix}"
        
        # 🔥 ИСПОЛЬЗУЕМ НОВЫЙ ГЕНЕРАТОР
        if not data.get('password'): 
            data['password'] = self._generate_strong_password()

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # --- МАССОВАЯ ГЕНЕРАЦИЯ ДОСТУПОВ ---
    @action(detail=False, methods=['post'], url_path='bulk-generate-credentials')
    def bulk_generate_credentials(self, request):
        ids = request.data.get('ids', [])
        if not ids: return Response({"error": "No students selected"}, status=400)

        students = Student.objects.filter(id__in=ids)
        updated_count = 0

        with transaction.atomic():
            for student in students:
                if student.last_name_ru and student.first_name_ru:
                    base = self._transliterate(student.last_name_ru).capitalize()
                    initial = self._transliterate(student.first_name_ru[0]).upper()
                    suffix = str(random.randint(100, 999))
                    student.username = f"{base}{initial}{suffix}"
                
                # 🔥 ИСПОЛЬЗУЕМ НОВЫЙ ГЕНЕРАТОР
                student.password = self._generate_strong_password()
                student.save()
                updated_count += 1

        return Response({"message": f"Generated credentials for {updated_count} students"})

    # --- МАССОВЫЙ ПЕРЕВОД ---
    @action(detail=False, methods=['post'], url_path='transfer')
    def bulk_transfer(self, request):
        ids = request.data.get('ids', [])
        action_type = request.data.get('type')
        target_class_id = request.data.get('target_class_id')

        if not ids: return Response({"error": "No students selected"}, status=400)
        
        students = Student.objects.filter(id__in=ids)
        updated_count = 0

        with transaction.atomic():
            if action_type == 'archive':
                students.update(status='graduated') 
                updated_count = students.count()
            elif action_type == 'class' and target_class_id:
                students.update(student_class_id=target_class_id)
                updated_count = students.count()
            elif action_type == 'next_year':
                for student in students:
                    current_class = student.student_class
                    if not current_class: continue
                    next_grade = current_class.grade_level + 1
                    if next_grade > 11: 
                        student.status = 'graduated'
                        student.save()
                        updated_count += 1
                        continue
                    next_class, _ = StudentClass.objects.get_or_create(
                        school=student.school,
                        grade_level=next_grade,
                        section=current_class.section
                    )
                    student.student_class = next_class
                    student.save()
                    updated_count += 1

        return Response({"message": f"Processed {updated_count} students"})

    # --- СБРОС ПАРОЛЯ ---
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        student = self.get_object()
        new_password = request.data.get('password')
        if not new_password: return Response({"error": "Empty password"}, status=400)
        student.password = new_password 
        student.save()
        return Response({"message": "Password changed successfully"})

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        Student.objects.filter(id__in=ids).delete()
        return Response({"message": "Deleted"})

    # --- 🔥 ПРЕДПРОСМОТР ИМПОРТА ---
    @action(detail=False, methods=['post'], url_path='preview-import')
    def preview_import(self, request):
        school_id = request.data.get('school_id')
        file = request.FILES.get('file')

        if not file or not school_id:
            return Response({"error": "File and School ID required"}, status=400)

        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
        except:
            return Response({"error": "Invalid Excel file format"}, status=400)
        
        header_map = {
            'ID': 'custom_id',
            'Last Name (RU)': 'last_name_ru', 'First Name (RU)': 'first_name_ru',
            'Last Name (TJ)': 'last_name_tj', 'First Name (TJ)': 'first_name_tj',
            'Last Name (EN)': 'last_name_en', 'First Name (EN)': 'first_name_en',
            'Login': 'username', 'Class': 'class_name', 'Gender': 'gender'
        }

        headers = [cell.value for cell in ws[1]]
        if 'ID' not in headers:
             return Response({"error": "В файле нет колонки 'ID'. Скачайте новый шаблон."}, status=400)

        col_indices = {field: headers.index(name) for name, field in header_map.items() if name in headers}

        changes = []
        warnings = [] 
        new_count = 0

        for row in ws.iter_rows(min_row=2, values_only=True):
            row_data = {}
            for field, idx in col_indices.items():
                val = row[idx]
                row_data[field] = str(val).strip() if val is not None else ""

            c_id = row_data.get('custom_id')

            if not c_id:
                new_count += 1
                continue

            try:
                student = Student.objects.select_related('school').get(custom_id=c_id)
                
                if str(student.school.id) != str(school_id):
                    warnings.append({
                        'id': c_id,
                        'name': f"{student.last_name_ru} {student.first_name_ru}",
                        'current_school': student.school.name
                    })
                
                diff = []
                fields_to_check = ['last_name_ru', 'first_name_ru', 'last_name_en', 'first_name_en', 'username']
                
                for field in fields_to_check:
                    old_val = getattr(student, field) or ""
                    new_val = row_data.get(field, "")
                    if new_val and old_val != new_val:
                        diff.append({'field': field, 'old': old_val, 'new': new_val})

                if diff:
                    changes.append({
                        'id': c_id,
                        'name': f"{student.last_name_ru} {student.first_name_ru}",
                        'diff': diff
                    })

            except Student.DoesNotExist:
                new_count += 1

        return Response({
            'new_count': new_count,
            'changes': changes,
            'warnings': warnings,
            'total_rows': ws.max_row - 1
        })

    # --- 🔥 ИМПОРТ EXCEL (СОХРАНЕНИЕ) ---
    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        school_id = request.data.get('school_id')
        file = request.FILES.get('file')
        
        if not file or not school_id: return Response({"error": "Data missing"}, status=400)

        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
        except:
            return Response({"error": "Invalid Excel file"}, status=400)
        
        header_map = {
            'ID': 'custom_id', 
            'Last Name (RU)': 'last_name_ru', 'First Name (RU)': 'first_name_ru',
            'Last Name (TJ)': 'last_name_tj', 'First Name (TJ)': 'first_name_tj', 
            'Last Name (EN)': 'last_name_en', 'First Name (EN)': 'first_name_en',
            'Login': 'username', 'Password': 'password', 'Class': 'class_name', 'Gender': 'gender'
        }
        
        headers = [cell.value for cell in ws[1]]
        col_indices = {field: headers.index(name) for name, field in header_map.items() if name in headers}

        school = School.objects.get(id=school_id)

        with transaction.atomic():
            for row in ws.iter_rows(min_row=2, values_only=True):
                data = {}
                for field, idx in col_indices.items():
                    val = row[idx]
                    data[field] = str(val).strip() if val is not None else ""

                class_obj = None
                if data.get('class_name'):
                    grade, section = self._parse_class_string(data['class_name'])
                    if grade:
                        class_obj, _ = StudentClass.objects.get_or_create(
                            school=school, grade_level=grade, section=section or ""
                        )

                student = None
                if data.get('custom_id'):
                    student = Student.objects.filter(custom_id=data['custom_id']).first()

                if not student:
                    student = Student(school=school)
                    if not data.get('custom_id'):
                        generated_id = self._get_next_smart_id(school_id)
                        if generated_id: student.custom_id = generated_id
                    else:
                        student.custom_id = data['custom_id']

                if data.get('last_name_ru'): student.last_name_ru = data['last_name_ru']
                if data.get('first_name_ru'): student.first_name_ru = data['first_name_ru']
                if data.get('last_name_tj'): student.last_name_tj = data['last_name_tj']
                if data.get('first_name_tj'): student.first_name_tj = data['first_name_tj']
                if data.get('last_name_en'): student.last_name_en = data['last_name_en']
                if data.get('first_name_en'): student.first_name_en = data['first_name_en']
                
                if data.get('username'): student.username = data['username']
                if data.get('password'): student.password = data['password']
                if data.get('gender'): student.gender = self._normalize_gender(data['gender'])
                
                if class_obj: student.student_class = class_obj

                if not student.username and student.last_name_ru:
                    base = self._transliterate(student.last_name_ru)
                    student.username = f"{base}{random.randint(100,999)}"
                
                # 🔥 ИСПОЛЬЗУЕМ НОВЫЙ ГЕНЕРАТОР, ЕСЛИ ПАРОЛЯ НЕТ
                if not student.password:
                    student.password = self._generate_strong_password()

                student.save()

        return Response({"message": "Import completed"})

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        ids_param = request.query_params.get('ids')
        if ids_param:
            if ids_param == '0':
                students = []
            else:
                ids = [int(x) for x in ids_param.split(',') if x.isdigit()]
                students = Student.objects.filter(id__in=ids).select_related('student_class')
        else:
            students = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="students.xlsx"'
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Students List"
        
        headers = [
            'ID', 
            'Last Name (RU)', 'First Name (RU)', 
            'Last Name (TJ)', 'First Name (TJ)', 
            'Last Name (EN)', 'First Name (EN)', 
            'Login', 'Password', 'Class', 'Gender'
        ]
        ws.append(headers)
        
        for s in students:
            ws.append([
                s.custom_id, 
                s.last_name_ru, s.first_name_ru, 
                s.last_name_tj, s.first_name_tj,
                s.last_name_en, s.first_name_en, 
                s.username, s.password, 
                str(s.student_class) if s.student_class else "", s.gender
            ])
            
        wb.save(response)
        return response

# --- 🔥 ЭКСПОРТ PDF КАРТОЧЕК (PREMIUM TICKET - CENTERED & FIXED) ---
    @action(detail=False, methods=['get'], url_path='export-pdf-cards')
    def export_pdf_cards(self, request):
        ids_param = request.query_params.get('ids')
        if ids_param:
            ids = [int(x) for x in ids_param.split(',') if x.isdigit()]
            students = Student.objects.filter(id__in=ids).select_related('school', 'student_class')
        else:
            students = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="student_access_cards.pdf"'

        c = canvas.Canvas(response, pagesize=A4)
        page_width, page_height = A4 # 210mm x 297mm
        
        # 1. ШРИФТЫ
        font_path = "C:\\Windows\\Fonts\\arial.ttf"
        font_bold_path = "C:\\Windows\\Fonts\\arialbd.ttf"
        font_name = "Arial"
        font_bold = "Arial-Bold"
        
        try:
            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                if os.path.exists(font_bold_path):
                    pdfmetrics.registerFont(TTFont(font_bold, font_bold_path))
                else:
                    font_bold = font_name
            else:
                font_name = "Helvetica"
                font_bold = "Helvetica-Bold"
        except:
            font_name = "Helvetica"
            font_bold = "Helvetica-Bold"

        # 2. РАЗМЕРЫ И ЦЕНТРОВКА
        card_width = 90 * mm
        card_height = 53 * mm # Чуть уменьшили, чтобы влезло 5 рядов на А4
        
        col_gap = 10 * mm 
        row_gap = 4 * mm # Чуть меньше разрыв между рядами

        # Рассчитываем общую ширину и высоту контента
        total_content_width = (2 * card_width) + col_gap
        total_content_height = (5 * card_height) + (4 * row_gap)

        # Вычисляем стартовые координаты, чтобы было РОВНО ПО ЦЕНТРУ
        margin_x = (page_width - total_content_width) / 2
        margin_y = (page_height - total_content_height) / 2

        x_start = margin_x
        # ReportLab рисует снизу вверх, поэтому стартовая Y - это верхняя точка первой карты
        y_start_top = page_height - margin_y - card_height 

        col = 0
        row = 0

        # ЦВЕТА
        primary_color = colors.HexColor("#4F46E5") # Indigo
        secondary_color = colors.HexColor("#EEF2FF") # Light Indigo
        text_dark = colors.HexColor("#111827")
        text_gray = colors.HexColor("#6B7280")

        for student in students:
            # Координаты текущей карточки
            x = x_start + (col * (card_width + col_gap))
            y = y_start_top - (row * (card_height + row_gap))

            # --- ТЕНЬ И ФОН ---
            c.setFillColor(colors.HexColor("#E5E7EB"))
            c.roundRect(x + 1*mm, y - 1*mm, card_width, card_height, 3*mm, fill=1, stroke=0)

            c.setFillColor(colors.white)
            c.setStrokeColor(colors.white)
            c.roundRect(x, y, card_width, card_height, 3*mm, fill=1, stroke=0)

            # --- ЛЕВАЯ ЧАСТЬ (Сайдбар с QR) ---
            sidebar_width = 25 * mm
            c.setFillColor(primary_color)
            
            # Рисуем фигуру сайдбара
            p = c.beginPath()
            p.moveTo(x + sidebar_width, y) 
            p.lineTo(x + 3*mm, y) 
            p.arcTo(x, y, x, y + 3*mm, 3*mm) 
            p.lineTo(x, y + card_height - 3*mm) 
            p.arcTo(x, y + card_height, x + 3*mm, y + card_height, 3*mm) 
            p.lineTo(x + sidebar_width, y + card_height) 
            p.lineTo(x + sidebar_width, y) 
            c.drawPath(p, fill=1, stroke=0)

            # --- QR КОД ---
            qr_data = "https://www.edutest.tj"
            qr = qrcode.QRCode(box_size=10, border=0)
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="white", back_color="#4F46E5")
            
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            
            c.drawImage(ImageReader(img_buffer), x + 2.5*mm, y + 15*mm, width=20*mm, height=20*mm, mask='auto')

            c.setFillColor(colors.white)
            c.setFont(font_bold, 6)
            c.drawCentredString(x + 12.5*mm, y + 11*mm, "SCAN ME")
            c.setFont(font_name, 5)
            c.drawCentredString(x + 12.5*mm, y + 8*mm, "www.edutest.tj")

            # --- ЛИНИЯ ОТРЫВА ---
            c.setStrokeColor(colors.lightgrey)
            c.setLineWidth(1)
            c.setDash(3, 3)
            c.line(x + sidebar_width, y + 2*mm, x + sidebar_width, y + card_height - 2*mm)
            c.setDash([])

            # --- ПРАВАЯ ЧАСТЬ (Контент) ---
            content_x = x + sidebar_width + 5*mm
            
            # Логотип Школы (В правом верхнем углу)
            if student.school.logo:
                try:
                    logo_path = student.school.logo.path 
                    if os.path.exists(logo_path):
                        c.drawImage(logo_path, x + card_width - 12*mm, y + card_height - 12*mm, width=8*mm, height=8*mm, mask='auto')
                except: pass

            # Заголовок (Школа) - Подняли чуть выше
            c.setFillColor(text_gray)
            c.setFont(font_name, 7)
            school_name = student.school.name
            c.drawString(content_x, y + card_height - 10*mm, school_name[:35].upper())

            # 🔥 ИМЯ УЧЕНИКА (Опустили ниже, чтобы не наезжало на лого)
            c.setFillColor(text_dark)
            c.setFont(font_bold, 12)
            full_name = f"{student.last_name_ru} {student.first_name_ru}"
            # Было -14mm, стало -18mm (сдвинули вниз на 4мм)
            c.drawString(content_x, y + card_height - 18*mm, full_name[:22])

            # Класс
            c.setFillColor(primary_color)
            c.setFont(font_bold, 9)
            class_txt = f"Класс: {student.student_class}" if student.student_class else "Класс: -"
            c.drawString(content_x, y + card_height - 23*mm, class_txt)

            # БЛОК С ЛОГИНОМ И ПАРОЛЕМ
            box_y = y + 10*mm # Нижний отступ блока
            box_height = 14*mm
            box_width = card_width - sidebar_width - 10*mm
            
            c.setFillColor(secondary_color)
            c.roundRect(content_x, box_y, box_width, box_height, 2*mm, fill=1, stroke=0)

            c.setFillColor(text_gray)
            c.setFont(font_name, 6)
            c.drawString(content_x + 3*mm, box_y + 9*mm, "LOGIN")
            c.drawString(content_x + 3*mm, box_y + 3*mm, "PASSWORD")

            c.setFillColor(text_dark)
            c.setFont(font_bold, 10)
            c.drawString(content_x + 20*mm, box_y + 9*mm, student.username)
            c.drawString(content_x + 20*mm, box_y + 3*mm, student.password)

            # Нижний текст
            c.setFillColor(text_gray)
            c.setFont(font_name, 5)
            c.drawCentredString(x + sidebar_width + (card_width - sidebar_width)/2, y + 4*mm, "Мы рады видеть вас на нашем портале!")

            # Управление листом
            col += 1
            if col >= 2:
                col = 0
                row += 1
            
            if row >= 5: # 5 рядов влазят идеально
                c.showPage()
                col = 0
                row = 0

        c.save()
        return response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.http import HttpResponse
from django.db import transaction
from django.contrib.auth.models import User

import random
import qrcode
import secrets
import openpyxl
import re
import io
import os

# Библиотеки для PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm

# 🔥 ДОБАВИЛ ИМПОРТ UserProfile
from ..models import Student, StudentClass, School, UserProfile
from ..serializers import StudentSerializer

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        🔥 ГЛАВНЫЙ ФИЛЬТР: СВОЙ-ЧУЖОЙ
        """
        user = self.request.user
        
        # 1. Суперюзеры и Админы -> Видят всех
        if user.is_superuser or (hasattr(user, 'profile') and 
                                 user.profile.role in ['admin', 'general_director', 'ceo']):
            queryset = Student.objects.select_related('school', 'student_class').all()
        else:
            # 2. Директора и Учителя -> Видят ТОЛЬКО свою школу/школы
            if hasattr(user, 'profile'):
                my_schools = set()
                if user.profile.school:
                    my_schools.add(user.profile.school.id)
                my_schools.update(user.profile.assigned_schools.values_list('id', flat=True))
                
                if not my_schools:
                    return Student.objects.none()
                
                queryset = Student.objects.select_related('school', 'student_class').filter(
                    school__id__in=my_schools
                )
            else:
                return Student.objects.none()

        # --- ОБЩИЕ ФИЛЬТРЫ ---
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(first_name_ru__icontains=search_query) |
                Q(last_name_ru__icontains=search_query) |
                Q(custom_id__icontains=search_query) |
                Q(username__icontains=search_query)
            )

        school_id = self.request.query_params.get('school_id')
        if school_id:
            queryset = queryset.filter(school_id=school_id)

        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(student_class_id=class_id)

        grade_level = self.request.query_params.get('grade_level')
        if grade_level:
            queryset = queryset.filter(student_class__grade_level=grade_level)

        return queryset.order_by('last_name_ru')

    def create(self, request, *args, **kwargs):
        """
        🔥 СОЗДАНИЕ С АВТО-ID И ПРОВЕРКОЙ ПРАВ
        """
        user = request.user
        data = request.data.copy()
        
        # 1. Определяем школу
        is_admin = user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'general_director', 'ceo'])
        
        if not is_admin:
            if hasattr(user, 'profile') and user.profile.school:
                data['school'] = user.profile.school.id
            else:
                return Response(
                    {"error": "У вас нет привязанной школы для добавления ученика."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif 'school' not in data and not data.get('school'):
             return Response({"error": "Admin must provide school_id"}, status=400)

        # 2. Генерация Custom ID (если нет)
        if not data.get('custom_id'):
            generated_id = self._get_next_smart_id(data.get('school'))
            if generated_id:
                data['custom_id'] = generated_id

        # 3. Генерация логина (если нет)
        if not data.get('username') and data.get('last_name_ru'):
            base_login = self._transliterate(data['last_name_ru'])
            suffix = data.get('custom_id')[-4:] if data.get('custom_id') else str(random.randint(100, 999))
            data['username'] = f"{base_login}{suffix}"

        # 4. Пароль
        if not data.get('password'):
            data['password'] = self._generate_strong_password()

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # 🔥 FIX: Сразу после создания гарантируем роль Студент
        instance = serializer.instance
        if instance.username:
            u = User.objects.filter(username=instance.username).first()
            if u:
                profile, _ = UserProfile.objects.get_or_create(user=u)
                profile.role = 'student'
                profile.school = instance.school
                profile.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---
    def _get_next_smart_id(self, school_id):
        try:
            school = School.objects.get(id=school_id)
            school_prefix = school.custom_id if school.custom_id else "00"
            
            existing_ids = Student.objects.filter(
                school_id=school_id, 
                custom_id__startswith=school_prefix
            ).values_list('custom_id', flat=True)
            
            used_numbers = set()
            prefix_len = len(school_prefix)
            
            for uid in existing_ids:
                if len(uid) > prefix_len:
                    suffix = uid[prefix_len:]
                    if suffix.isdigit():
                        used_numbers.add(int(suffix))
            
            next_num = 1
            while next_num in used_numbers:
                next_num += 1
                
            return f"{school_prefix}{str(next_num).zfill(4)}"
        except Exception as e:
            print(f"Error generating ID: {e}")
            return None

    def _transliterate(self, text):
        if not text: return ""
        mapping = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z',
            'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
            'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ғ': 'gh', 'қ': 'q', 'ҳ': 'h',
            'ҷ': 'j', 'ӣ': 'i', 'ӯ': 'u'
        }
        return "".join([mapping.get(char, char) for char in text.lower()])

    def _generate_strong_password(self, length=8):
        chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            password = ''.join(secrets.choice(chars) for _ in range(length))
            if (any(c.isdigit() for c in password) and any(c.isalpha() for c in password)):
                return password

    # --- ДЕЙСТВИЯ (ACTIONS) ---

    @action(detail=False, methods=['post'], url_path='bulk-generate-credentials')
    def bulk_generate_credentials(self, request):
        """
        Генерирует новые пароли, активирует и СТАВИТ РОЛЬ STUDENT.
        """
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No students selected"}, status=400)

        students = self.get_queryset().filter(id__in=ids)
        updated_count = 0

        with transaction.atomic():
            for student in students:
                # 1. Генерируем логин
                if not student.username or len(student.username) < 3:
                     if student.last_name_ru and student.first_name_ru:
                        base = self._transliterate(student.last_name_ru).capitalize()
                        initial = self._transliterate(student.first_name_ru[0]).upper()
                        suffix = str(random.randint(100, 999))
                        student.username = f"{base}{initial}{suffix}"
                        student.save()

                # 2. Пароль
                raw_password = self._generate_strong_password()
                
                # 3. User + Профиль
                if student.username:
                    user, created = User.objects.get_or_create(username=student.username)
                    user.set_password(raw_password)
                    user.is_active = True
                    user.save()
                    
                    # 🔥 ВАЖНОЕ ИСПРАВЛЕНИЕ: ПРИНУДИТЕЛЬНО СТАВИМ РОЛЬ "STUDENT"
                    profile, _ = UserProfile.objects.get_or_create(user=user)
                    profile.role = 'student'
                    profile.school = student.school # Привязываем к школе
                    profile.save()
                    
                    updated_count += 1

        return Response({"message": f"Generated credentials and fixed roles for {updated_count} students"})

    @action(detail=False, methods=['post'], url_path='transfer')
    def bulk_transfer(self, request):
        user = request.user
        ids = request.data.get('ids', [])
        action_type = request.data.get('type')
        target_class_id = request.data.get('target_class_id')

        if not ids:
            return Response({"error": "No students selected"}, status=400)

        students = self.get_queryset().filter(id__in=ids)
        updated_count = 0

        with transaction.atomic():
            if action_type == 'archive':
                students.update(status='graduated')
                updated_count = students.count()
                
            elif action_type == 'class' and target_class_id:
                try:
                    target_class = StudentClass.objects.get(id=target_class_id)
                    is_admin = user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'general_director', 'ceo'])
                    if not is_admin:
                         if hasattr(user, 'profile') and user.profile.school:
                            if target_class.school != user.profile.school:
                                return Response({"error": "Cannot transfer to another school"}, status=403)

                    students.update(student_class_id=target_class_id)
                    updated_count = students.count()
                except StudentClass.DoesNotExist:
                    return Response({"error": "Target class not found"}, status=404)
                    
            elif action_type == 'next_year':
                for student in students:
                    current_class = student.student_class
                    if not current_class: continue
                    
                    next_grade = current_class.grade_level + 1
                    if next_grade > 11:
                        student.status = 'graduated'
                        student.save()
                    else:
                        next_class, _ = StudentClass.objects.get_or_create(
                            school=student.school,
                            grade_level=next_grade,
                            section=current_class.section
                        )
                        student.student_class = next_class
                        student.save()
                    updated_count += 1

        return Response({"message": f"Processed {updated_count} students"})

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        student = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password:
            return Response({"error": "Empty password"}, status=400)
            
        if not student.username:
             return Response({"error": "Student has no username. Generate credentials first."}, status=400)

        try:
            user = User.objects.get(username=student.username)
            user.set_password(new_password)
            user.is_active = True
            user.save()
            return Response({"message": "Password changed and user activated successfully"})
        except User.DoesNotExist:
            return Response({"error": "Linked User not found"}, status=404)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        queryset = self.get_queryset().filter(id__in=ids)
        deleted_count = queryset.count()
        queryset.delete()
        return Response({"message": f"Deleted {deleted_count} students"})

    # --- 🔥 ЭКСПОРТ PDF С ИСПРАВЛЕНИЕМ РОЛИ ---
    @action(detail=False, methods=['get'], url_path='export-pdf-cards')
    def export_pdf_cards(self, request):
        ids_param = request.query_params.get('ids')
        if ids_param:
            ids = [int(x) for x in ids_param.split(',') if x.isdigit()]
            students = self.get_queryset().filter(id__in=ids).select_related('school', 'student_class')
        else:
            students = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="student_access_cards.pdf"'

        c = canvas.Canvas(response, pagesize=A4)
        page_width, page_height = A4

        # Шрифты (как в прошлом коде)
        font_name = "Helvetica"
        font_bold = "Helvetica-Bold"
        possible_font_paths = [
            os.path.join(os.path.dirname(__file__), 'fonts', 'arial.ttf'),
            "C:\\Windows\\Fonts\\arial.ttf",
            "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
        ]
        possible_bold_paths = [
            os.path.join(os.path.dirname(__file__), 'fonts', 'arialbd.ttf'),
            "C:\\Windows\\Fonts\\arialbd.ttf",
        ]

        found_font = None
        for path in possible_font_paths:
            if os.path.exists(path):
                found_font = path
                break
        
        found_bold = None
        for path in possible_bold_paths:
             if os.path.exists(path):
                found_bold = path
                break

        try:
            if found_font:
                pdfmetrics.registerFont(TTFont('CustomFont', found_font))
                font_name = 'CustomFont'
                if found_bold:
                    pdfmetrics.registerFont(TTFont('CustomFont-Bold', found_bold))
                    font_bold = 'CustomFont-Bold'
                else:
                    font_bold = 'CustomFont'
        except Exception as e:
            print(f"Font error: {e}")

        card_width = 90 * mm
        card_height = 53 * mm
        col_gap = 10 * mm
        row_gap = 4 * mm
        
        total_content_width = (2 * card_width) + col_gap
        total_content_height = (5 * card_height) + (4 * row_gap)
        
        margin_x = (page_width - total_content_width) / 2
        margin_y = (page_height - total_content_height) / 2
        
        x_start = margin_x
        y_start_top = page_height - margin_y - card_height
        
        col = 0
        row = 0
        
        primary_color = colors.HexColor("#4F46E5")
        secondary_color = colors.HexColor("#EEF2FF")
        text_dark = colors.HexColor("#111827")
        text_gray = colors.HexColor("#6B7280")

        with transaction.atomic():
            for student in students:
                new_password_for_card = self._generate_strong_password()
                
                if student.username:
                    user, _ = User.objects.get_or_create(username=student.username)
                    user.set_password(new_password_for_card)
                    user.is_active = True
                    user.save()
                    
                    # 🔥 ИСПРАВЛЕНИЕ РОЛИ ПРИ ПЕЧАТИ
                    profile, _ = UserProfile.objects.get_or_create(user=user)
                    profile.role = 'student'
                    profile.school = student.school
                    profile.save()
                else:
                    new_password_for_card = "Error: No Login"

                # Рисование карточки (без изменений)
                x = x_start + (col * (card_width + col_gap))
                y = y_start_top - (row * (card_height + row_gap))

                c.setFillColor(colors.HexColor("#E5E7EB"))
                c.roundRect(x + 1 * mm, y - 1 * mm, card_width, card_height, 3 * mm, fill=1, stroke=0)
                c.setFillColor(colors.white)
                c.roundRect(x, y, card_width, card_height, 3 * mm, fill=1, stroke=0)

                sidebar_width = 25 * mm
                c.setFillColor(primary_color)
                p = c.beginPath()
                p.moveTo(x + sidebar_width, y)
                p.lineTo(x + 3 * mm, y)
                p.arcTo(x, y, x, y + 3 * mm, 3 * mm)
                p.lineTo(x, y + card_height - 3 * mm)
                p.arcTo(x, y + card_height, x + 3 * mm, y + card_height, 3 * mm)
                p.lineTo(x + sidebar_width, y + card_height)
                p.lineTo(x + sidebar_width, y)
                c.drawPath(p, fill=1, stroke=0)

                qr = qrcode.QRCode(box_size=10, border=0)
                qr.add_data("https://www.edutest.tj")
                qr.make(fit=True)
                img = qr.make_image(fill_color="white", back_color="#4F46E5")
                img_buffer = io.BytesIO()
                img.save(img_buffer, format="PNG")
                img_buffer.seek(0)
                c.drawImage(ImageReader(img_buffer), x + 2.5 * mm, y + 15 * mm, width=20 * mm, height=20 * mm, mask='auto')

                c.setFillColor(colors.white)
                c.setFont(font_bold, 6)
                c.drawCentredString(x + 12.5 * mm, y + 11 * mm, "SCAN ME")
                
                content_x = x + sidebar_width + 5 * mm
                
                if student.school.logo:
                    try:
                        logo_path = student.school.logo.path
                        if os.path.exists(logo_path):
                            c.drawImage(logo_path, x + card_width - 12 * mm, y + card_height - 12 * mm, width=8 * mm, height=8 * mm, mask='auto')
                    except: pass

                c.setFillColor(text_gray)
                c.setFont(font_name, 7)
                school_name = student.school.name
                c.drawString(content_x, y + card_height - 10 * mm, school_name[:35].upper())

                c.setFillColor(text_dark)
                c.setFont(font_bold, 12)
                lname = student.last_name_ru or ""
                fname = student.first_name_ru or ""
                full_name = f"{lname} {fname}"
                c.drawString(content_x, y + card_height - 18 * mm, full_name[:22])

                c.setFillColor(primary_color)
                c.setFont(font_bold, 9)
                class_txt = str(student.student_class) if student.student_class else "-"
                c.drawString(content_x, y + card_height - 23 * mm, f"Класс: {class_txt}")

                box_y = y + 10 * mm
                box_height = 14 * mm
                box_width = card_width - sidebar_width - 10 * mm
                
                c.setFillColor(secondary_color)
                c.roundRect(content_x, box_y, box_width, box_height, 2 * mm, fill=1, stroke=0)
                
                c.setFillColor(text_gray)
                c.setFont(font_name, 6)
                c.drawString(content_x + 3 * mm, box_y + 9 * mm, "LOGIN")
                c.drawString(content_x + 3 * mm, box_y + 3 * mm, "PASSWORD")
                
                c.setFillColor(text_dark)
                c.setFont(font_bold, 10)
                c.drawString(content_x + 20 * mm, box_y + 9 * mm, student.username or "-")
                c.drawString(content_x + 20 * mm, box_y + 3 * mm, new_password_for_card)

                col += 1
                if col >= 2:
                    col = 0
                    row += 1
                if row >= 5:
                    c.showPage()
                    col = 0
                    row = 0

        c.save()
        return response
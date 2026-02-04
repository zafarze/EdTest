import os
import uuid
import random
import string
from django.utils import timezone
from datetime import datetime

# ==========================================
# 1. ЗАЩИТА: ПОЛУЧЕНИЕ ДОСТУПНЫХ ШКОЛ
# ==========================================
def get_allowed_school_ids(user):
    """
    Возвращает set ID школ, доступных пользователю.
    None = Админ (видит всё).
    set() = Нет доступа.
    """
    if not user.is_authenticated:
        return set()

    # Админы платформы, CEO, Основатели
    if user.is_superuser:
        return None
    
    if hasattr(user, 'profile') and user.profile.role in ['admin', 'general_director', 'ceo', 'founder']:
        return None

    # Директора, Завучи, Учителя
    allowed_ids = set()
    if hasattr(user, 'profile'):
        # 1. Основная школа
        if user.profile.school:
            allowed_ids.add(user.profile.school.id)
        
        # 2. Прикрепленные школы (M2M)
        if hasattr(user.profile, 'assigned_schools'):
            allowed_ids.update(user.profile.assigned_schools.values_list('id', flat=True))
    
    return allowed_ids

# ==========================================
# 2. ФАЙЛЫ: УМНОЕ ИМЕНОВАНИЕ И ПАПКИ
# ==========================================
def unique_filename(instance, filename):
    """
    Генерирует уникальное имя и раскладывает по папкам.
    Пример: school_logos/uuid.jpg или exam_files/uuid.pdf
    """
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{ext}"
    
    folder = 'uploads'
    
    # Проверяем, к какой модели относится файл, и меняем папку
    # (Это работает, если поля в моделях называются определенным образом)
    if hasattr(instance, 'avatar'):
        folder = 'avatars'
    elif hasattr(instance, 'logo') or hasattr(instance, 'banner'):
        folder = 'school_branding'
    elif hasattr(instance, 'question_type'): # Это модель Question
        folder = 'question_images'
    elif hasattr(instance, 'file'): # Это модель ExamFile или Upload
        folder = 'exam_files'
        
    return os.path.join(folder, new_filename)

# ==========================================
# 3. ЭКЗАМЕНЫ: ГЕНЕРАТОР КОДОВ
# ==========================================
def generate_exam_code(length=6):
    """
    Генерирует код типа 'X7K9P2' для входа учеников.
    Исключаем I, O, 1, 0 чтобы не путать.
    """
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" # Без I, O, 0, 1
    return ''.join(random.choice(chars) for _ in range(length))

# ==========================================
# 4. ДАТЫ: ТЕКУЩИЙ УЧЕБНЫЙ ГОД
# ==========================================
def get_current_academic_year_dates():
    """
    Возвращает (start_date, end_date) текущего учебного года.
    Если сейчас Август-Декабрь 2026 -> Год 2026-2027.
    Если сейчас Январь-Июль 2027 -> Год 2026-2027.
    """
    now = timezone.now().date()
    year = now.year
    
    # Считаем, что год начинается с 1 августа
    if now.month >= 8:
        start_date = datetime(year, 9, 1).date()
        end_date = datetime(year + 1, 5, 25).date()
    else:
        start_date = datetime(year - 1, 9, 1).date()
        end_date = datetime(year, 5, 25).date()
        
    return start_date, end_date
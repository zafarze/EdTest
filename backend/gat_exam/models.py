from django.db import models, transaction
from pytils.translit import slugify
from django.core.exceptions import ValidationError
from datetime import date
from django.apps import apps
from django.contrib.auth import get_user_model
from django.utils.timesince import timesince
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

# --- 0. МОДЕЛЬ ШКОЛЫ ---
class School(models.Model):
    THEME_CHOICES = [
        ('emerald', 'Emerald (Зеленый)'),
        ('blue', 'Blue (Синий)'),
        ('violet', 'Violet (Фиолетовый)'),
        ('amber', 'Amber (Оранжевый)'),
        ('rose', 'Rose (Розовый)'),
        ('cyan', 'Cyan (Голубой)'),
    ]

    custom_id = models.CharField(
        max_length=20, 
        verbose_name="Код школы (ID)", 
        unique=True,
        blank=True, 
        null=True
    )
    banner = models.ImageField(upload_to='school_banners/', null=True, blank=True, verbose_name="Обложка (Баннер)")
    
    name = models.CharField(max_length=100, verbose_name="Название (RU)", db_index=True)
    address = models.CharField(max_length=255, verbose_name="Адрес (RU)", blank=True)
    
    name_tj = models.CharField(max_length=100, verbose_name="Название (TJ)", blank=True)
    address_tj = models.CharField(max_length=255, verbose_name="Адрес (TJ)", blank=True)

    name_en = models.CharField(max_length=100, verbose_name="Название (EN)", blank=True)
    address_en = models.CharField(max_length=255, verbose_name="Адрес (EN)", blank=True)

    slug = models.SlugField(unique=True, verbose_name="Уникальная ссылка (slug)", blank=True)
    
    logo = models.ImageField(upload_to='school_logos/', null=True, blank=True, verbose_name="Логотип")
    phone = models.CharField(max_length=20, verbose_name="Телефон", blank=True)
    email = models.EmailField(verbose_name="Email школы", blank=True)
    
    primary_color = models.CharField(max_length=7, default="#7c3aed", verbose_name="Основной цвет (HEX)")
    min_grade_level = models.PositiveIntegerField(default=1, verbose_name="Мин. класс")
    max_grade_level = models.PositiveIntegerField(default=11, verbose_name="Макс. класс")
    
    color_theme = models.CharField(
        max_length=20, 
        choices=THEME_CHOICES, 
        default='blue', 
        verbose_name="Цветовая тема (для сайта)"
    )

    class Meta:
        verbose_name = "Школа"
        verbose_name_plural = "Школы"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# --- 1. МОДЕЛЬ УЧЕБНОГО ГОДА ---
class SchoolYear(models.Model):
    name = models.CharField(max_length=50, verbose_name="Название (RU)") 
    name_tj = models.CharField(max_length=50, verbose_name="Название (TJ)", blank=True)
    name_en = models.CharField(max_length=50, verbose_name="Название (EN)", blank=True)

    start_date = models.DateField(verbose_name="Дата начала")
    end_date = models.DateField(verbose_name="Дата конца")
    is_active = models.BooleanField(default=False, verbose_name="Текущий год")

    class Meta:
        ordering = ['start_date']
        verbose_name = "Учебный год"
        verbose_name_plural = "Учебные годы"

    def __str__(self):
        return self.name

    @property
    def weeks_total(self):
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            return int(delta.days / 7)
        return 0

    @property
    def days_left(self):
        today = date.today()
        if not self.end_date or today > self.end_date:
            return 0
        if today < self.start_date:
             return (self.end_date - self.start_date).days
        return (self.end_date - today).days


# --- 2. МОДЕЛЬ ЧЕТВЕРТИ ---
class Quarter(models.Model):
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name='quarters')
    
    name = models.CharField(max_length=50, verbose_name="Название (RU)")
    name_tj = models.CharField(max_length=50, verbose_name="Название (TJ)", blank=True)
    name_en = models.CharField(max_length=50, verbose_name="Название (EN)", blank=True)
    
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['start_date']

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.is_active:
                qs = Quarter.objects.filter(is_active=True).exclude(pk=self.pk)
                if self.school_year:
                    qs = qs.filter(school_year=self.school_year)
                qs.update(is_active=False)
            super().save(*args, **kwargs)

    def __str__(self):
        year_name = self.school_year.name if self.school_year else "Без года"
        return f"{self.name} ({year_name})"

    @property
    def progress(self):
        today = date.today()
        if not self.start_date or not self.end_date: return 0
        if today < self.start_date: return 0
        if today > self.end_date: return 100
        
        total_days = (self.end_date - self.start_date).days
        passed_days = (today - self.start_date).days
        
        if total_days <= 0: return 100
        return int((passed_days / total_days) * 100)

    @property
    def status(self):
        if self.is_active: return 'active'
        if self.end_date and date.today() > self.end_date: return 'completed'
        return 'upcoming'


# ==============================================================================
# 📚 2.5. МОДЕЛЬ ПРЕДМЕТА (SUBJECT)
# ==============================================================================
class Subject(models.Model):
    CATEGORY_CHOICES = [
        ('Точные науки', 'Точные науки'),
        ('Естественные науки', 'Естественные науки'),
        ('Гуманитарные', 'Гуманитарные'),
        ('Языки', 'Языки'),
        ('Искусство', 'Искусство'),
        ('Спорт', 'Спорт'),
        ('Другое', 'Другое'),
    ]

    name = models.CharField(max_length=100, verbose_name="Название предмета (RU)", unique=True)
    name_tj = models.CharField(max_length=100, verbose_name="Название (TJ)", blank=True)
    name_en = models.CharField(max_length=100, verbose_name="Название (EN)", blank=True)
    
    slug = models.SlugField(max_length=50, unique=True, verbose_name="Код (slug)", blank=True)
    
    # 🔥 КЛЮЧ ДЛЯ EXCEL
    # null=True обязательно, чтобы уникальность не ломалась на пустых полях
    abbreviation = models.CharField(
        max_length=10, 
        unique=True, 
        null=True, 
        blank=True, 
        verbose_name="Сокращение (МАТ)",
        help_text="Используется для авто-определения предмета при импорте Excel (Math, Eng)"
    )

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Точные науки', verbose_name="Категория")
    color = models.CharField(max_length=20, default="blue", verbose_name="Цвет (Slug)")
    icon_type = models.CharField(max_length=20, default="default", verbose_name="Иконка (ID)")
    
    is_active = models.BooleanField(default=True, verbose_name="Активен?")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"
        ordering = ['name']

    def __str__(self):
        if self.abbreviation:
            return f"{self.name} [{self.abbreviation}]"
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# ==============================================================================
# 📝 3. МОДЕЛЬ ЭКЗАМЕНА (EXAM)
# ==============================================================================
class Exam(models.Model):
    EXAM_TYPES = (
        ('online', 'Online Exam'),
        ('offline', 'Offline (Paper)'),
        ('cambridge_ai', 'Cambridge AI'),
    )
    
    STATUS_CHOICES = (
        ('planned', 'Планируется'),
        ('active', 'Идет экзамен'),
        ('grading', 'Идет проверка'),
        ('finished', 'Завершен'),
    )

    GAT_ROUNDS = (
        (1, 'GAT-1'),
        (2, 'GAT-2'),
        (3, 'GAT-3'),
        (4, 'GAT-4'),
    )

    # 🔥 ДВА ДНЯ
    GAT_DAYS = (
        (1, 'День 1'),
        (2, 'День 2'),
    )

    # 🔥 ДВА ВАРИАНТА
    VARIANT_CHOICES = (
        ('A', 'Вариант А (Master)'),
        ('B', 'Вариант Б (Shuffled)'),
    )
    
    # Основные данные
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(verbose_name="Описание", blank=True)
    
    # 🔥 ВАЖНО: Grade Level числом. 
    # Нужно для быстрого поиска: Exam.objects.get(grade_level=5, variant='B')
    grade_level = models.IntegerField(default=5, verbose_name="Параллель (5-11)", db_index=True)

    school = models.ForeignKey('School', on_delete=models.CASCADE, related_name='exams', verbose_name="Школа", null=True, blank=True)
    
    # Связи (Год, Четверть, Классы, Предметы)
    school_year = models.ForeignKey('SchoolYear', on_delete=models.CASCADE, related_name='exams', verbose_name="Учебный год", null=True, blank=True)
    quarter = models.ForeignKey('Quarter', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Четверть")
    classes = models.ManyToManyField('StudentClass', related_name='exams', verbose_name="Классы (Список)", blank=True)
    subjects = models.ManyToManyField(Subject, related_name='exams', verbose_name="Предметы", blank=True)
    
    # 🔥 ВОПРОСЫ
    questions = models.ManyToManyField('Question', related_name='assigned_exams', verbose_name="Вопросы", blank=True)
    
    # 🔥 MAPPING ВОПРОСОВ (Для Варианта Б)
    # Структура: { "1": 105, "2": 33 } -> Вопрос №1 в этом буклете это ID=105
    question_order = models.JSONField(
        default=dict, 
        verbose_name="Порядок вопросов (Shuffle Map)", 
        blank=True,
        help_text="Критично для Варианта Б! Хранит соответствие: Номер в буклете -> ID вопроса"
    )

    # Настройки Раунда
    gat_round = models.IntegerField(choices=GAT_ROUNDS, default=1, verbose_name="Номер GAT")
    gat_day = models.IntegerField(choices=GAT_DAYS, default=1, verbose_name="День экзамена")
    variant = models.CharField(max_length=1, choices=VARIANT_CHOICES, default='A', verbose_name="Вариант", db_index=True)

    # Технические настройки
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES, default='online', verbose_name="Тип")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned', verbose_name="Статус")
    date = models.DateField(verbose_name="Дата проведения", null=True, blank=True)
    duration = models.PositiveIntegerField(default=60, verbose_name="Длительность (мин)")
    
    # Флаги AI и Безопасности
    is_adaptive = models.BooleanField(default=False)
    lockdown_mode = models.BooleanField(default=False)
    webcam_monitoring = models.BooleanField(default=False)
    ai_audit_passed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Экзамен"
        verbose_name_plural = "Экзамены"
        # Уникальность: В одной школе, в одном раунде, в один день, в одной параллели не может быть двух вариантов А
        unique_together = [['school', 'school_year', 'gat_round', 'gat_day', 'grade_level', 'variant']]

    def __str__(self):
        return f"{self.title} [Grade {self.grade_level}] [Var {self.variant}]"


# --- 4. МОДЕЛЬ ВОПРОСА ---
class Question(models.Model):
    # 🔥 ИСПРАВЛЕНИЕ: Удалено поле 'exam', так как теперь связь идет через Exam.questions (ManyToMany)
    # Это решает ошибку конфликта имен и позволяет вопросу быть в нескольких экзаменах сразу.
    
    topic = models.ForeignKey('Topic', on_delete=models.CASCADE, related_name='questions', verbose_name="Тема", null=True, blank=True)
    
    text = models.TextField(verbose_name="Текст вопроса")
    image = models.ImageField(upload_to='questions/', null=True, blank=True, verbose_name="Изображение")

    VARIANT_CHOICES = [
        ('A', 'Вариант A'),
        ('B', 'Вариант B'),
        ('C', 'Вариант C'),
        ('D', 'Вариант D'),
        ('All', 'Для всех вариантов'), 
    ]
    variant = models.CharField(max_length=5, choices=VARIANT_CHOICES, default='All', verbose_name="Вариант")

    DIFFICULTY_CHOICES = [
        ('easy', 'Легкий'),
        ('medium', 'Стандартный'),
        ('hard', 'Сложный')
    ]
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium', verbose_name="Сложность")
    
    points = models.PositiveIntegerField(default=1, verbose_name="Баллы")

    TYPE_CHOICES = [
        ('single', 'Один правильный ответ'),
        ('multiple', 'Несколько правильных'),
        ('true_false', 'Истина / Ложь'),
        ('short_answer', 'Краткий ответ'),
        ('essay', 'Эссе (Развернутый ответ)'),
        ('blanks', 'Заполнение пропусков'),
        ('matching', 'Сопоставление'),
        ('ordering', 'Сортировка') 
    ]
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='single', verbose_name="Тип")

    class Meta:
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"
        ordering = ['id']

    def __str__(self):
        return f"[{self.variant}] {self.text[:50]}"
    
    def save(self, *args, **kwargs):
        if self.points == 1: 
            if self.difficulty == 'medium': self.points = 2
            elif self.difficulty == 'hard': self.points = 3
        super().save(*args, **kwargs)

# --- 5. ВАРИАНТЫ ОТВЕТОВ ---
class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=255, verbose_name="Текст ответа")
    is_correct = models.BooleanField(default=False, verbose_name="Верный?")
    image = models.ImageField(upload_to='choices/', null=True, blank=True, verbose_name="Изображение")

    def __str__(self):
        return self.text
    

# --- 6. МОДЕЛЬ КЛАССА ---
class StudentClass(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classes', verbose_name="Школа")
    
    grade_level = models.PositiveIntegerField(verbose_name="Параллель", choices=[(i, str(i)) for i in range(0, 14)])
    section = models.CharField(max_length=5, verbose_name="Литера (А, Б, В...)")
    language = models.CharField(max_length=50, default="Русский", verbose_name="Язык обучения", blank=True)
    
    class Meta:
        verbose_name = "Класс"
        verbose_name_plural = "Классы"
        unique_together = ['school', 'grade_level', 'section']
        ordering = ['grade_level', 'section']

    def __str__(self):
        return f"{self.grade_level}{self.section}"


# --- 7. МОДЕЛЬ УЧЕНИКА ---
class Student(models.Model):
    STATUS_CHOICES = [
        ('active', 'Учится'),
        ('graduated', 'Выпускник'),
        ('expelled', 'Отчислен'),
    ]

    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='students', verbose_name="Школа")
    student_class = models.ForeignKey(StudentClass, on_delete=models.CASCADE, related_name='students', verbose_name="Класс")
    custom_id = models.CharField(max_length=50, verbose_name="ID Личного дела", blank=True, null=True, db_index=True)
    
    # --- МУЛЬТИЯЗЫЧНЫЕ ИМЕНА ---
    first_name_ru = models.CharField(max_length=50, verbose_name="Имя (RU)")
    last_name_ru = models.CharField(max_length=50, verbose_name="Фамилия (RU)")
    first_name_tj = models.CharField(max_length=50, verbose_name="Имя (TJ)", blank=True)
    last_name_tj = models.CharField(max_length=50, verbose_name="Фамилия (TJ)", blank=True)
    first_name_en = models.CharField(max_length=50, verbose_name="Имя (EN)", blank=True)
    last_name_en = models.CharField(max_length=50, verbose_name="Фамилия (EN)", blank=True)
    
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='male', verbose_name="Пол")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name="Статус")
    
    username = models.CharField(max_length=100, blank=True, null=True, unique=True, verbose_name="Логин")
    
    # ❌ ПОЛЕ PASSWORD УДАЛЕНО ДЛЯ БЕЗОПАСНОСТИ
    
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ученик"
        verbose_name_plural = "Ученики"
        ordering = ['last_name_ru', 'first_name_ru']

    def __str__(self):
        return f"{self.last_name_ru} {self.first_name_ru}"
    
    def save(self, *args, **kwargs):
        # 1. Авто-заполнение имен для других языков
        if not self.first_name_tj: self.first_name_tj = self.first_name_ru
        if not self.last_name_tj: self.last_name_tj = self.last_name_ru
        if not self.first_name_en: self.first_name_en = self.first_name_ru
        if not self.last_name_en: self.last_name_en = self.last_name_ru
        
        # 2. Создание User теперь выполняется через AuthService, а не здесь
        super().save(*args, **kwargs)
    

# --- 8. МОДЕЛЬ УВЕДОМЛЕНИЙ ---
class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Инфо'),
        ('success', 'Успех'),
        ('warning', 'Внимание'),
        ('error', 'Ошибка'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name="Кому")
    title = models.CharField(max_length=255, verbose_name="Заголовок")
    message = models.TextField(verbose_name="Сообщение")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info', verbose_name="Тип")
    is_read = models.BooleanField(default=False, verbose_name="Прочитано")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user}"


# --- 9. МОДЕЛЬ ТЕМЫ (TOPIC) ---
class Topic(models.Model):
    schools = models.ManyToManyField(School, related_name="topics", verbose_name="Школы")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, verbose_name="Предмет", related_name="topics")
    
    QUARTER_CHOICES = [(1, '1-я Четверть'), (2, '2-я Четверть'), (3, '3-я Четверть'), (4, '4-я Четверть')]
    quarter = models.PositiveIntegerField(choices=QUARTER_CHOICES, verbose_name="Четверть")
    
    grade_level = models.PositiveIntegerField(verbose_name="Класс (Параллель)", help_text="Например: 10")
    title = models.CharField(max_length=255, verbose_name="Название темы")
    description = models.TextField(blank=True, verbose_name="Описание")
    
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Автор", related_name="created_topics")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Тема"
        verbose_name_plural = "Темы"
        ordering = ['grade_level', 'quarter', 'title']

    def __str__(self):
        return f"{self.title} ({self.grade_level} кл, {self.subject.name})"

# --- 10. РЕЗУЛЬТАТ ЭКЗАМЕНА ---
class ExamResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='results')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    
    score = models.FloatField(verbose_name="Итоговый балл")
    max_score = models.FloatField(verbose_name="Макс. балл")
    percentage = models.FloatField(verbose_name="Процент", default=0)
    
    details = models.JSONField(verbose_name="Детали ответов", default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'exam')

    def __str__(self):
        return f"{self.student} - {self.exam}: {self.score}"


# --- 11. ГЛОБАЛЬНЫЕ НАСТРОЙКИ ---
class GlobalSettings(models.Model):
    site_name = models.CharField("Название платформы", max_length=100, default="GAT Premium Platform")
    language = models.CharField("Язык по умолчанию", max_length=10, default="ru", choices=[('ru', 'Русский'), ('tj', 'Тоҷикӣ'), ('en', 'English')])
    timezone = models.CharField("Часовой пояс", max_length=50, default="dushanbe")
    logo = models.ImageField("Логотип", upload_to='branding/', null=True, blank=True)

    # Academic
    current_year = models.CharField("Текущий учебный год", max_length=20, default="2024-2025")
    grading_system = models.CharField("Система оценивания", max_length=20, default="100", choices=[('100', '100-балльная'), ('5', '5-балльная'), ('letters', 'Буквенная')])
    pass_mark = models.IntegerField("Порог прохождения (%)", default=60)

    # Security
    maintenance_mode = models.BooleanField("Режим обслуживания", default=False, help_text="Если включено, доступ только у админов")
    allow_registration = models.BooleanField("Разрешить регистрацию", default=False)
    force_2fa = models.BooleanField("Принудительная 2FA для админов", default=False)

    # Notifications
    email_alerts = models.BooleanField("Email уведомления", default=True)
    smtp_host = models.CharField("SMTP Host", max_length=100, blank=True, default="smtp.gmail.com")
    telegram_bot_token = models.CharField("Telegram Token", max_length=200, blank=True)

    # Appearance
    theme = models.CharField("Тема", max_length=10, default="light")
    primary_color = models.CharField("Основной цвет", max_length=20, default="indigo")

    class Meta:
        verbose_name = "Настройки Системы"
        verbose_name_plural = "Настройки Системы"

    def save(self, *args, **kwargs):
        if not self.pk and GlobalSettings.objects.exists():
            from django.core.exceptions import ValidationError
            raise ValidationError('Можно создать только один объект настроек')
        return super(GlobalSettings, self).save(*args, **kwargs)

    def __str__(self):
        return "Конфигурация GAT"


# --- 12. ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ---
class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Администратор'),
        ('general_director', 'Ген. Директор'),
        ('director', 'Директор'),
        ('deputy', 'Зам. директора'),
        ('expert', 'Эксперт/Методист'),
        ('teacher', 'Учитель'), 
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField("Роль", max_length=20, choices=ROLE_CHOICES, default='teacher')
    
    assigned_schools = models.ManyToManyField(School, blank=True, related_name='assigned_staff', verbose_name="Прикрепленные школы")
    assigned_subjects = models.ManyToManyField(Subject, blank=True, related_name='assigned_experts', verbose_name="Курируемые предметы")
    assigned_classes = models.ManyToManyField(StudentClass, blank=True, related_name='homeroom_teachers', verbose_name="Курируемые классы")

    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_primary')
    
    phone = models.CharField("Телефон", max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

# Сигнал создания профиля
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        initial_role = 'admin' if instance.is_superuser else 'teacher'
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={'role': initial_role}
        )

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except (ObjectDoesNotExist, User.profile.RelatedObjectDoesNotExist):
        UserProfile.objects.create(user=instance)


# --- 13. ЛИМИТЫ ВОПРОСОВ (Настройки QuestionCounts) ---
class QuestionLimit(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='question_limits', verbose_name="Школа")
    grade_level = models.PositiveIntegerField(verbose_name="Класс")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, verbose_name="Предмет")
    
    count = models.PositiveIntegerField(default=0, verbose_name="Количество вопросов")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Лимит вопросов"
        verbose_name_plural = "Лимиты вопросов"
        unique_together = ['school', 'grade_level', 'subject']

    def __str__(self):
        return f"{self.school.name} - {self.grade_level} кл - {self.subject.name}: {self.count}"


# =================================================================================
# 🚀 МОДУЛЬ SMART BOOKLET (НОВАЯ АРХИТЕКТУРА)
# =================================================================================

class ExamRound(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название раунда")
    date = models.DateField(verbose_name="Дата проведения")
    is_active = models.BooleanField(default=True, verbose_name="Активен?")
    
    target_easy_pct = models.PositiveIntegerField(default=40, verbose_name="% Легких")
    target_medium_pct = models.PositiveIntegerField(default=40, verbose_name="% Средних")
    target_hard_pct = models.PositiveIntegerField(default=20, verbose_name="% Сложных")
    
    allow_duplicates = models.BooleanField(default=False, verbose_name="Разрешить повторы?")
    max_duplicate_pct = models.PositiveIntegerField(default=10, verbose_name="Макс % повторов (если разрешено)")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Раунд Экзамена (Config)"
        verbose_name_plural = "Раунды Экзаменов"

    def __str__(self):
        return f"{self.name} ({self.date})"


class BookletSection(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('review', 'На проверке (AI)'),
        ('approved', 'Утверждено'),
        ('locked', 'Включено в буклет') 
    ]

    round = models.ForeignKey(ExamRound, on_delete=models.CASCADE, related_name='sections', verbose_name="Раунд")
    subject = models.ForeignKey('Subject', on_delete=models.CASCADE, related_name='booklet_sections', verbose_name="Предмет")
    grade_level = models.PositiveIntegerField(default=11, verbose_name="Класс")
    expert = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Ответственный эксперт")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Статус")
    
    ai_validation_result = models.JSONField(default=dict, blank=True, verbose_name="Результат AI проверки")

    questions = models.ManyToManyField('Question', through='SectionQuestion', related_name='in_sections')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    day = models.PositiveIntegerField(default=1, verbose_name="День проведения") 

    class Meta:
        verbose_name = "Секция Буклета"
        verbose_name_plural = "Секции Буклета"
        # Уникальность: Раунд + Предмет + Класс + День
        unique_together = ['round', 'subject', 'grade_level', 'day']
        # Сортировка: Сначала по Раунду, потом по Дню (1, 2...), потом по Классу
        ordering = ['round', 'day', 'grade_level'] 

    def __str__(self):
        # Добавили (D{self.day}) для наглядности
        return f"{self.subject.name} [{self.round.name}] (D{self.day}) - {self.grade_level}кл"

class SectionQuestion(models.Model):
    section = models.ForeignKey(
        'BookletSection', 
        on_delete=models.CASCADE, 
        related_name='section_questions', # 🔥 ЭТОЙ СТРОЧКИ НЕ ХВАТАЛО
        verbose_name="Секция"
    )
    question = models.ForeignKey('Question', on_delete=models.CASCADE)
    
    order = models.PositiveIntegerField(default=0, verbose_name="Порядковый номер")
    fixed_text = models.TextField(blank=True, verbose_name="Зафиксированный текст")
    is_forced_by_director = models.BooleanField(default=False, verbose_name="Добавлен директором")

    class Meta:
        ordering = ['order']
        verbose_name = "Вопрос секции"
        verbose_name_plural = "Вопросы секции"
        # 🔥 ДОБАВИТЬ ЭТУ СТРОКУ:
        unique_together = ['section', 'question'] 

    def save(self, *args, **kwargs):
        if not self.fixed_text and self.question:
            self.fixed_text = self.question.text
        super().save(*args, **kwargs)


class MasterBooklet(models.Model):
    round = models.OneToOneField(ExamRound, on_delete=models.CASCADE, related_name='master_booklet', verbose_name="Раунд")
    
    sections = models.ManyToManyField(BookletSection, related_name='included_in_booklets')
    
    is_generated = models.BooleanField(default=False, verbose_name="Сгенерирован?")
    generated_at = models.DateTimeField(null=True, blank=True)
    
    pdf_file = models.FileField(upload_to='booklets/pdf/', null=True, blank=True, verbose_name="Файл буклета")

    class Meta:
        verbose_name = "Мастер-Буклет"
        verbose_name_plural = "Мастер-Буклеты"

    def __str__(self):
        return f"Booklet for {self.round.name}"


class QuestionHistory(models.Model):
    question = models.ForeignKey('Question', on_delete=models.CASCADE, related_name='usage_history')
    round = models.ForeignKey(ExamRound, on_delete=models.CASCADE)
    used_date = models.DateField()
    
    class Meta:
        verbose_name = "История использования"
        verbose_name_plural = "История использования"

class AIPrompt(models.Model):
    """
    🧠 МОЗГИ СИСТЕМЫ.
    Позволяет менять поведение AI без пересборки бэкенда.
    """
    slug = models.SlugField(unique=True, verbose_name="Код (ключ)", help_text="Например: question_audit")
    name = models.CharField(max_length=100, verbose_name="Название промпта")
    
    # Настройки модели
    model_name = models.CharField(max_length=50, default="gpt-4o", verbose_name="Модель OpenAI")
    temperature = models.FloatField(default=0.3, verbose_name="Креативность (0-1)")
    
    # Сам промпт
    system_role = models.TextField(verbose_name="Роль (System)", help_text="Ты — строгий учитель...")
    user_template = models.TextField(verbose_name="Шаблон (User)", help_text="Используй {text}, {choices} как переменные")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Промпт"
        verbose_name_plural = "AI Промпты"

    def __str__(self):
        return f"{self.name} ({self.slug})"
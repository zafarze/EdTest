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

THEME_CHOICES = [
        ('emerald', 'Emerald (Зеленый)'),
        ('blue', 'Blue (Синий)'),
        ('violet', 'Violet (Фиолетовый)'),
        ('amber', 'Amber (Оранжевый)'),
        ('rose', 'Rose (Розовый)'),
        ('cyan', 'Cyan (Голубой)'),
    ]

    # 🔥 НОВОЕ ПОЛЕ: Тема оформления школы
color_theme = models.CharField(
        max_length=20, 
        choices=THEME_CHOICES, 
        default='blue', 
        verbose_name="Цветовая тема"
    )

# --- 0. МОДЕЛЬ ШКОЛЫ ---
class School(models.Model):
    custom_id = models.CharField(
        max_length=20, 
        verbose_name="Код школы (ID)", 
        unique=True,   # 🔥 ДОБАВЛЕНО ВОТ ЭТО (ЗАЩИТА ОТ ДУБЛЕЙ)
        blank=True, 
        null=True
    )
    banner = models.ImageField(upload_to='school_banners/', null=True, blank=True, verbose_name="Обложка (Баннер)")
    
    # 🔥 ОСНОВНЫЕ ПОЛЯ (RU - Default)
    name = models.CharField(max_length=100, verbose_name="Название (RU)", db_index=True)
    address = models.CharField(max_length=255, verbose_name="Адрес (RU)", blank=True)
    
    # 🔥 НОВЫЕ ПОЛЯ (TJ)
    name_tj = models.CharField(max_length=100, verbose_name="Название (TJ)", blank=True)
    address_tj = models.CharField(max_length=255, verbose_name="Адрес (TJ)", blank=True)

    # 🔥 НОВЫЕ ПОЛЯ (EN)
    name_en = models.CharField(max_length=100, verbose_name="Название (EN)", blank=True)
    address_en = models.CharField(max_length=255, verbose_name="Адрес (EN)", blank=True)

    # 🔥 2. ВАЖНО: Добавил blank=True, чтобы форма не ругалась на пустое поле перед сохранением
    slug = models.SlugField(unique=True, verbose_name="Уникальная ссылка (slug)", blank=True)
    
    logo = models.ImageField(upload_to='school_logos/', null=True, blank=True, verbose_name="Логотип")
    phone = models.CharField(max_length=20, verbose_name="Телефон", blank=True)
    email = models.EmailField(verbose_name="Email школы", blank=True)
    
    # Настройки темы
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

    # 🔥 3. ВАЖНО: Метод SAVE для авто-генерации
    def save(self, *args, **kwargs):
        # Если слага нет (создаем новую школу), генерируем его из названия
        if not self.slug:
            self.slug = slugify(self.name)
        
        super().save(*args, **kwargs)


# --- 1. МОДЕЛЬ УЧЕБНОГО ГОДА ---
class SchoolYear(models.Model):
    # RU (Default)
    name = models.CharField(max_length=50, verbose_name="Название (RU)") 
    # TJ & EN (Новые поля)
    name_tj = models.CharField(max_length=50, verbose_name="Название (TJ)", blank=True)
    name_en = models.CharField(max_length=50, verbose_name="Название (EN)", blank=True)

    start_date = models.DateField(verbose_name="Дата начала")
    end_date = models.DateField(verbose_name="Дата конца")
    is_active = models.BooleanField(default=False, verbose_name="Текущий год")

    class Meta:
        ordering = ['start_date'] # Хронологический порядок
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
    
    # 🔥 ОБНОВЛЯЕМ ЭТУ ЧАСТЬ
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


# --- 2.5. МОДЕЛЬ ПРЕДМЕТА ---
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

    # Основное имя (RU)
    name = models.CharField(max_length=100, verbose_name="Название предмета (RU)", unique=True)
    
    # 🔥 НОВЫЕ ПОЛЯ
    name_tj = models.CharField(max_length=100, verbose_name="Название (TJ)", blank=True)
    name_en = models.CharField(max_length=100, verbose_name="Название (EN)", blank=True)
    
    slug = models.SlugField(max_length=50, unique=True, verbose_name="Код (slug)", blank=True)
    
    abbreviation = models.CharField(max_length=10, verbose_name="Сокращение (МАТ)", blank=True)
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
        return self.name

    # 🔥 АВТОГЕНЕРАЦИЯ SLUG
    def save(self, *args, **kwargs):
        if not self.slug:
            # Превращаем "Математика" -> "matematika" (если нет pytils, можно использовать slugify из django)
            try:
                self.slug = slugify(self.name)
            except:
                from django.utils.text import slugify as django_slugify
                self.slug = django_slugify(self.name)
        super().save(*args, **kwargs)
    

# --- 3. МОДЕЛЬ ЭКЗАМЕНА (ОБНОВЛЕННАЯ СТРУКТУРА) ---
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

    GAT_DAYS = (
        (1, 'День 1'),
        (2, 'День 2'),
    )

    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(verbose_name="Описание", blank=True)
    
    # ПРИВЯЗКИ
    # 🔥 ИСПРАВЛЕНО: Добавлен related_name='exams', чтобы School.exams работало
    school = models.ForeignKey('School', on_delete=models.CASCADE, related_name='exams', verbose_name="Школа", null=True, blank=True)
    
    # 🔥 ИСПРАВЛЕНО: Добавлен related_name='exams', чтобы StudentClass.exams работало
    classes = models.ManyToManyField('StudentClass', related_name='exams', verbose_name="Классы", blank=True)
    
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name='exams', verbose_name="Учебный год", null=True, blank=True)
    quarter = models.ForeignKey(Quarter, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Четверть")
    
    # ManyToManyField (subjects)
    subjects = models.ManyToManyField(Subject, related_name='exams', verbose_name="Предметы", blank=True)
    
    # GAT ЛОГИКА
    gat_round = models.IntegerField(choices=GAT_ROUNDS, default=1, verbose_name="Номер GAT")
    gat_day = models.IntegerField(choices=GAT_DAYS, default=1, verbose_name="День экзамена")

    # Настройки
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES, default='online', verbose_name="Тип")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned', verbose_name="Статус")
    date = models.DateField(verbose_name="Дата проведения", null=True, blank=True)
    duration = models.PositiveIntegerField(default=60, verbose_name="Длительность (мин)")
    variants_count = models.PositiveIntegerField(default=1, verbose_name="Кол-во вариантов")
    
    # Настройки Premium
    is_adaptive = models.BooleanField(default=False)
    lockdown_mode = models.BooleanField(default=False)
    webcam_monitoring = models.BooleanField(default=False)
    emotional_check = models.BooleanField(default=False)
    smart_seating = models.BooleanField(default=False)
    ai_audit_passed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Экзамен"
        verbose_name_plural = "Экзамены"

    def __str__(self):
        return f"{self.title} (GAT-{self.gat_round})"


# --- 4. МОДЕЛЬ ВОПРОСА ---
class Question(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, related_name='questions', verbose_name="Экзамен", null=True, blank=True)
    topic = models.ForeignKey('Topic', on_delete=models.CASCADE, related_name='questions', verbose_name="Тема", null=True, blank=True)
    
    text = models.TextField(verbose_name="Текст вопроса")
    image = models.ImageField(upload_to='questions/', null=True, blank=True, verbose_name="Изображение")

    # 🔥 ДОБАВЛЯЕМ ВАРИАНТ (A, B, C, D...)
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
    
    # 🔥 ДОБАВЛЯЕМ БАЛЛЫ (Числовое поле для подсчета!)
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
    
    # Автоматическое проставление баллов при сохранении, если не задано
    def save(self, *args, **kwargs):
        if self.points == 1: # Если дефолт
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
    

# --- 6. МОДЕЛЬ КЛАССА (ВЕРНУЛИ КАК БЫЛО) ---
class StudentClass(models.Model):
    # 👇 Здесь должно быть ForeignKey (одна школа), а не ManyToMany
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classes', verbose_name="Школа")
    
    grade_level = models.PositiveIntegerField(verbose_name="Параллель", choices=[(i, str(i)) for i in range(0, 14)])
    section = models.CharField(max_length=5, verbose_name="Литера (А, Б, В...)")
    language = models.CharField(max_length=50, default="Русский", verbose_name="Язык обучения", blank=True)
    
    class Meta:
        verbose_name = "Класс"
        verbose_name_plural = "Классы"
        unique_together = ['school', 'grade_level', 'section'] # Теперь это сработает
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
    password = models.CharField(max_length=100, blank=True, verbose_name="Пароль")
    
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ученик"
        verbose_name_plural = "Ученики"
        ordering = ['last_name_ru', 'first_name_ru']

    def __str__(self):
        return f"{self.last_name_ru} {self.first_name_ru}"
    
    def save(self, *args, **kwargs):
        if not self.first_name_tj: self.first_name_tj = self.first_name_ru
        if not self.last_name_tj: self.last_name_tj = self.last_name_ru
        if not self.first_name_en: self.first_name_en = self.first_name_ru
        if not self.last_name_en: self.last_name_en = self.last_name_ru
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
    # 👇 А ВОТ ЗДЕСЬ МЕНЯЕМ school НА schools (Много школ)
    schools = models.ManyToManyField(School, related_name="topics", verbose_name="Школы")
    
    # Поле school удаляем!
    
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
    
    # Привязки Many-to-Many
    assigned_schools = models.ManyToManyField(School, blank=True, related_name='assigned_staff', verbose_name="Прикрепленные школы")
    assigned_subjects = models.ManyToManyField(Subject, blank=True, related_name='assigned_experts', verbose_name="Курируемые предметы")
    assigned_classes = models.ManyToManyField(StudentClass, blank=True, related_name='homeroom_teachers', verbose_name="Курируемые классы")

    # Основная школа
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_primary')
    
    phone = models.CharField("Телефон", max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

# Сигнал создания профиля
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except (ObjectDoesNotExist, User.profile.RelatedObjectDoesNotExist):
        UserProfile.objects.create(user=instance)
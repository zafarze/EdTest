from rest_framework import serializers
from django.utils.timesince import timesince
from django.contrib.auth.models import User
from django.utils import timezone 
from .models import (
    School, SchoolYear, Quarter, StudentClass, Student, 
    Exam, Question, Choice, Notification, Subject, 
    Topic, GlobalSettings, UserProfile,
    ExamRound, BookletSection, MasterBooklet,
    ExamResult  # <--- 🔥 ДОБАВИТЬ ВОТ ЭТО
)
import re
from .models import Exam, Student, BookletSection

from django.db import transaction
from datetime import timedelta
from .models import QuestionLimit
# 🔥 ИМПОРТИРУЕМ НАШ НОВЫЙ СЕРВИС
from .services.auth_service import AuthService  

# --- БАЗОВЫЕ СЕРИАЛИЗАТОРЫ ---

class SchoolMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name', 'name_tj', 'name_en', 'logo', 'slug', 'color_theme']

class SchoolSerializer(serializers.ModelSerializer):
    students_count = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    
    def validate_custom_id(self, value):
        """
        Проверяет уникальность ID школы.
        При обновлении исключает саму себя из проверки.
        """
        # 1. Если поле пустое — пропускаем (пусть валидатор модели решает, можно ли null)
        if not value:
            return value

        # 2. Базовый запрос: ищем школы с таким же custom_id
        # Используем exists(), это быстрее, чем тянуть объект
        queryset = School.objects.filter(custom_id=value)

        # 3. ЕСЛИ ЭТО ОБНОВЛЕНИЕ (self.instance существует):
        # Исключаем из поиска текущую школу, чтобы не было ошибки "Этот ID уже занят" (самой собой)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        # 4. Если нашли дубликат — кидаем ошибку
        if queryset.exists():
            raise serializers.ValidationError(f"Школа с кодом '{value}' уже существует.")

        return value 

    class Meta:
        model = School
        fields = '__all__'

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'image']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    points = serializers.IntegerField(required=False, default=1)
    variant = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'difficulty', 'points', 'variant', 'question_type', 'image', 'choices', 'topic']

# --- ГЛАВНЫЙ СЕРИАЛИЗАТОР ЭКЗАМЕНА ---

class ExamSerializer(serializers.ModelSerializer):
    settings = serializers.SerializerMethodField()
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    
    # --- 1. ТИПЫ ЭКЗАМЕНА ---
    type = serializers.CharField(source='exam_type', read_only=True)
    types = serializers.JSONField(source='exam_types', required=False)

    school_name = serializers.ReadOnlyField(source='school.name')
    quarter_name = serializers.ReadOnlyField(source='quarter.name')
    
    subject_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    subjects_data = serializers.SerializerMethodField()

    class_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    classes_names = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'type', 'types',
            'status', 'date', 
            'duration', 'variants_count', 'settings', 
            'questions_count', 'created_at',
            'school', 'school_name', 
            'quarter', 'quarter_name',
            'gat_round', 'gat_day',
            'class_ids', 'classes_names',
            'subject_ids', 'subjects_data',
        ]

    def get_classes_names(self, obj):
        return [str(c) for c in obj.classes.all()]

    def get_subjects_data(self, obj):
        return [{'id': s.id, 'name': s.name, 'color': s.color} for s in obj.subjects.all()]

    def get_settings(self, obj):
        return {
            "isAdaptive": obj.is_adaptive,
            "lockdownMode": obj.lockdown_mode,
            "webcamMonitoring": obj.webcam_monitoring,
            "emotionalCheck": obj.emotional_check,
            "smartSeating": obj.smart_seating,
            "aiAuditPassed": obj.ai_audit_passed
        }

    def create(self, validated_data):
        """
        Создание экзамена с логикой синхронизации вопросов из Буклета.
        """
        settings_data = self.initial_data.get('settings', {})
        class_ids = validated_data.pop('class_ids', [])
        subject_ids = validated_data.pop('subject_ids', [])
        
        # --- 1. ЛОГИКА ТИПОВ (Hybrid Exam) ---
        raw_type = self.initial_data.get('type')
        
        if isinstance(raw_type, list):
            validated_data['exam_types'] = raw_type
            validated_data['exam_type'] = raw_type[0] if raw_type else 'online'
        elif isinstance(raw_type, str):
            validated_data['exam_type'] = raw_type
            validated_data['exam_types'] = [raw_type]
        
        # --- 2. НАСТРОЙКИ ---
        validated_data['is_adaptive'] = settings_data.get('isAdaptive', False)
        validated_data['lockdown_mode'] = settings_data.get('lockdownMode', False)
        validated_data['webcam_monitoring'] = settings_data.get('webcamMonitoring', False)
        validated_data['emotional_check'] = settings_data.get('emotionalCheck', False)
        validated_data['smart_seating'] = settings_data.get('smartSeating', False)
        
        # --- 3. СОЗДАНИЕ ОБЪЕКТА ---
        exam = super().create(validated_data)
        
        # Связи с годом
        if exam.quarter and exam.quarter.school_year:
            exam.school_year = exam.quarter.school_year
            exam.save()
        
        # Привязка классов и предметов
        if class_ids: exam.classes.set(class_ids)
        if subject_ids: exam.subjects.set(subject_ids)

        # =========================================================
        # 🔥 ЛОГИКА СИНХРОНИЗАЦИИ (С УЧЕТОМ ДНЯ)
        # =========================================================
        if exam.gat_round:
            # 1. Определяем класс (берем первый попавшийся из списка)
            target_class_obj = exam.classes.first()
            target_grade = target_class_obj.grade_level if target_class_obj else 11
            
            # 2. Ищем секции буклета
            sections = BookletSection.objects.filter(
                round__name__icontains=str(exam.gat_round), # Фильтр по Раунду (GAT-1)
                grade_level=target_grade,                   # Фильтр по Классу (11)
                subject__id__in=subject_ids,                # Фильтр по Выбранным предметам
                status__in=['approved', 'locked'],          # Только утвержденные
                day=exam.gat_day                            # 👈 ГЛАВНОЕ: Фильтр по Дню (1 или 2)
            )
            
            questions_to_link = []
            
            # 3. Собираем вопросы
            for section in sections:
                questions_to_link.extend(section.questions.all())
            
            # 4. Привязываем к экзамену
            if questions_to_link:
                exam.questions.set(questions_to_link)
                print(f"✅ SYNC: День {exam.gat_day}. Добавлено {len(questions_to_link)} вопросов в экзамен #{exam.id}.")
            else:
                print(f"⚠️ WARNING: Для Дня {exam.gat_day} не найдено утвержденных секций по выбранным предметам.")
        
        return exam

    def update(self, instance, validated_data):
        # (Оставляем метод update без изменений, как он был у вас раньше)
        settings_data = self.initial_data.get('settings', {})
        class_ids = validated_data.pop('class_ids', None)
        subject_ids = validated_data.pop('subject_ids', None)

        if 'type' in self.initial_data:
            raw_type = self.initial_data.get('type')
            if isinstance(raw_type, list):
                instance.exam_types = raw_type
                if raw_type: instance.exam_type = raw_type[0]
            elif isinstance(raw_type, str):
                instance.exam_type = raw_type
                instance.exam_types = [raw_type]

        if settings_data:
            instance.is_adaptive = settings_data.get('isAdaptive', instance.is_adaptive)
            instance.lockdown_mode = settings_data.get('lockdownMode', instance.lockdown_mode)
            instance.webcam_monitoring = settings_data.get('webcamMonitoring', instance.webcam_monitoring)
            instance.emotional_check = settings_data.get('emotionalCheck', instance.emotional_check)
            instance.smart_seating = settings_data.get('smartSeating', instance.smart_seating)
        
        exam = super().update(instance, validated_data)
        
        if exam.quarter and exam.quarter.school_year:
            exam.school_year = exam.quarter.school_year
            exam.save()
        
        if class_ids is not None: exam.classes.set(class_ids)
        if subject_ids is not None: exam.subjects.set(subject_ids)
            
        return exam


# --- ОСТАЛЬНЫЕ СЕРИАЛИЗАТОРЫ ---

class SchoolYearSerializer(serializers.ModelSerializer):
    studentsCount = serializers.SerializerMethodField()
    weeksTotal = serializers.ReadOnlyField(source='weeks_total')
    daysLeft = serializers.ReadOnlyField(source='days_left')
    start = serializers.DateField(source='start_date')
    end = serializers.DateField(source='end_date')
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = SchoolYear
        fields = ['id', 'name', 'name_tj', 'name_en', 'start', 'end', 'isActive', 'studentsCount', 'weeksTotal', 'daysLeft']

    def get_studentsCount(self, obj):
        if hasattr(obj, 'students_count'):
            return obj.students_count
        if obj.is_active:
            return Student.objects.filter(status='active').count()
        return Student.objects.filter(created_at__date__gte=obj.start_date, created_at__date__lte=obj.end_date).count()

class QuarterSerializer(serializers.ModelSerializer):
    progress = serializers.ReadOnlyField()
    status = serializers.ReadOnlyField()
    school_year_name = serializers.ReadOnlyField(source='school_year.name')

    class Meta:
        model = Quarter
        fields = [
            'id', 'name', 'name_tj', 'name_en', 
            'start_date', 'end_date', 'is_active', 
            'progress', 'status', 
            'school_year_name',
            'school_year' # 🔥 Добавляем поле, чтобы можно было вручную задать, если нужно
        ]
        # school_year теперь НЕ read_only, но required=False
        extra_kwargs = {
            'school_year': {'required': False, 'allow_null': True}
        }

    def validate(self, data):
        """
        🔥 АВТО-ПРИВЯЗКА К ГОДУ
        Если год не передан, ищем его по дате начала четверти.
        """
        start = data.get('start_date')
        
        # Если это частичное обновление (PATCH) и даты нет, пропускаем
        if not start and self.instance:
            start = self.instance.start_date
            
        if start:
            # Пытаемся найти год, который охватывает эту дату
            matching_year = SchoolYear.objects.filter(
                start_date__lte=start, 
                end_date__gte=start
            ).first()

            if not matching_year:
                raise serializers.ValidationError(
                    f"На дату {start} не найден учебный год. Сначала создайте Год."
                )
            
            # Присваиваем год
            data['school_year'] = matching_year
            
        return data
        
class StudentClassSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    class Meta:
        model = StudentClass
        fields = ['id', 'school', 'school_name', 'grade_level', 'section', 'language']

class ClassStructureSerializer(serializers.ModelSerializer):
    students_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = StudentClass
        fields = ['id', 'grade_level', 'section', 'students_count']

# --- 🔥 ИСПРАВЛЕННЫЙ StudentSerializer ---
class StudentSerializer(serializers.ModelSerializer):
    # Пароль пишем только при создании (write_only), читать его нельзя!
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class_name = serializers.SerializerMethodField()
    student_class_details = StudentClassSerializer(source='student_class', read_only=True)
    is_online = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'first_name_ru', 'last_name_ru', 
            'first_name_tj', 'last_name_tj',
            'first_name_en', 'last_name_en',
            'gender', 'status', 'custom_id',
            'username', 'password', # Оставляем здесь, но в модели его нет!
            'school', 'student_class', 
            'student_class_details',
            'class_name',
            'is_online', 'last_login'
        ]

    def get_class_name(self, obj):
        if obj.student_class:
            return f"{obj.student_class.grade_level}-{obj.student_class.section}"
        return "-"

    def get_is_online(self, obj):
        if not obj.username: 
            return False
        try:
            user = User.objects.get(username=obj.username)
            if not user.last_login:
                return False
            now = timezone.now()
            diff = now - user.last_login
            return diff < timedelta(minutes=5)
        except User.DoesNotExist:
            return False

    def get_last_login(self, obj):
        if not obj.username: return None
        try:
            user = User.objects.get(username=obj.username)
            return user.last_login
        except User.DoesNotExist:
            return None

    def create(self, validated_data):
        """
        Переопределяем создание: вызываем AuthService
        """
        # Извлекаем пароль, чтобы он не попал в аргументы модели
        raw_password = validated_data.pop('password', None)
        # Вызываем сервис для безопасного создания
        return AuthService.create_student(validated_data, password=raw_password)

class SubjectSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active')
    iconType = serializers.CharField(source='icon_type')
    questionsCount = serializers.IntegerField(source='questions_count', read_only=True, default=0)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'name_tj', 'name_en', 'slug', 'abbreviation', 'category', 'color', 'iconType', 'isActive', 'questionsCount']

class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    author_name = serializers.ReadOnlyField(source='author.username')
    school_names = serializers.SerializerMethodField()
    questions_count = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'schools', 'school_names', 'subject', 'subject_name',
            'quarter', 'grade_level', 'title', 'description', 
            'author_name', 'created_at',
            'questions_count', 'status'
        ]
        read_only_fields = ['author', 'created_at']

    def get_school_names(self, obj):
        return [s.name for s in obj.schools.all()]

    def get_status(self, obj):
        count = getattr(obj, 'questions_count', 0)
        if count == 0:
            return 'empty'
        elif count < 5:
            return 'progress'
        else:
            return 'ready'
        
class NotificationSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()
    class Meta:
        model = Notification
        fields = '__all__'
    def get_time(self, obj):
        return f"{timesince(obj.created_at).split(',')[0]} назад"

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = '__all__'

class ProfileSerializer(serializers.ModelSerializer):
    school = SchoolMiniSerializer(read_only=True)
    # 👇 ДОБАВЛЯЕМ ЭТИ ПОЛЯ, ЧТОБЫ ФРОНТ ИХ ВИДЕЛ ПОСЛЕ СОХРАНЕНИЯ
    assigned_schools = SchoolMiniSerializer(many=True, read_only=True)
    assigned_subjects = SubjectSerializer(many=True, read_only=True)
    assigned_classes = StudentClassSerializer(many=True, read_only=True)

    class Meta:
        model = UserProfile
        # 👇 И ДОБАВЛЯЕМ ИХ В FIELDS
        fields = [
            'role', 'phone', 'school', 
            'assigned_schools', 'assigned_subjects', 'assigned_classes'
        ]

class UserSerializer(serializers.ModelSerializer):
    # 🔥 ЧТЕНИЕ: берем роль из профиля
    role = serializers.CharField(source='profile.role', read_only=True)
    role_input = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, write_only=True, required=False)
    school_name = serializers.CharField(source='profile.school.name', read_only=True)
    profile = ProfileSerializer(read_only=True)

    # Поля для записи (Write Only)
    school_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    subject_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    class_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    full_name = serializers.SerializerMethodField()
    
    # 🔥 НОВОЕ ПОЛЕ: Единый список прав для Permissions.tsx
    assigned_items = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'password', 
            'role', 'role_input',
            'school_name', 'profile', 
            'school_ids', 'subject_ids', 'class_ids',
            'full_name', 'last_login', 'is_active',
            'assigned_items' # 👈 Не забудь добавить сюда!
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}".strip()

    # 🔥 МАГИЯ СИНХРОНИЗАЦИИ
    def get_assigned_items(self, obj):
        items = []
        if hasattr(obj, 'profile'):
            # 1. Школы
            for s in obj.profile.assigned_schools.all():
                items.append({'id': s.id, 'name': s.name, 'type': 'school'})
            
            # 2. Предметы
            for s in obj.profile.assigned_subjects.all():
                items.append({'id': s.id, 'name': s.name, 'type': 'subject'})
            
            # 3. Классы
            for c in obj.profile.assigned_classes.all():
                # Используем str(c), чтобы получить "10А (Школа 1)"
                items.append({'id': c.id, 'name': str(c), 'type': 'class'})
                
        return items

    def create(self, validated_data):
        school_ids = validated_data.pop('school_ids', [])
        subject_ids = validated_data.pop('subject_ids', [])
        class_ids = validated_data.pop('class_ids', [])
        role = validated_data.pop('role_input', 'teacher')
        password = validated_data.pop('password', None)
        
        validated_data.pop('profile', None)

        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        
        # Привязываем школы (доступ)
        if school_ids:
            schools = School.objects.filter(id__in=school_ids)
            profile.assigned_schools.set(schools)
            
            # 🔥 ИСПРАВЛЕНИЕ:
            # Основную школу (profile.school) ставим, ТОЛЬКО если это НЕ VIP-роль.
            # Эксперты, Админы и Ген.диры не должны быть "внутри" школы.
            global_roles = ['admin', 'general_director', 'expert']
            
            if role not in global_roles and schools.exists():
                profile.school = schools.first()
            else:
                profile.school = None # Для экспертов всегда пусто

        if subject_ids:
            profile.assigned_subjects.set(Subject.objects.filter(id__in=subject_ids))
        
        if class_ids:
            profile.assigned_classes.set(StudentClass.objects.filter(id__in=class_ids))
            
        profile.save()
        return user

    # --- ИСПРАВЛЕННЫЙ МЕТОД UPDATE ---
    def update(self, instance, validated_data):
        with transaction.atomic():
            school_ids = validated_data.pop('school_ids', None)
            subject_ids = validated_data.pop('subject_ids', None)
            class_ids = validated_data.pop('class_ids', None)
            
            # 1. Обновляем роль
            if 'role_input' in validated_data:
                new_role = validated_data.pop('role_input')
                profile, _ = UserProfile.objects.select_for_update().get_or_create(user=instance)
                profile.role = new_role
                profile.save()

            # 2. Обновляем данные User
            for attr, value in validated_data.items():
                if attr == 'password' and value:
                    instance.set_password(value)
                else:
                    setattr(instance, attr, value)
            instance.save()

            # 3. Обновляем связи
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            global_roles = ['admin', 'general_director', 'expert']

            # Если пришли новые школы — обновляем список
            if school_ids is not None:
                schools = School.objects.filter(id__in=school_ids)
                profile.assigned_schools.set(schools)
                
                # Логика для УЧИТЕЛЕЙ: если школа не выбрана, берем первую
                if profile.role not in global_roles:
                    if not profile.school and schools.exists():
                        profile.school = schools.first()

            if subject_ids is not None:
                profile.assigned_subjects.set(Subject.objects.filter(id__in=subject_ids))
                
            if class_ids is not None:
                profile.assigned_classes.set(StudentClass.objects.filter(id__in=class_ids))

            # 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: ЖЕСТКАЯ ОЧИСТКА
            # Выполняется всегда в конце, независимо от того, что прислал фронт.
            if profile.role in global_roles:
                profile.school = None  # Стираем привязку к конкретной школе

            profile.save()
        
        instance.refresh_from_db()
        if hasattr(instance, 'profile'):
            instance.profile.refresh_from_db()

        return instance

class SchoolCatalogSerializer(serializers.ModelSerializer):
    students_count = serializers.IntegerField(read_only=True)
    tests_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = School
        fields = ['id', 'name', 'students_count', 'tests_count']

class ClassCatalogSerializer(serializers.ModelSerializer):
    tests_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudentClass
        fields = ['id', 'grade_level', 'section', 'tests_count']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = str(instance) 
        return data

class GatGroupSerializer(serializers.Serializer):
    number = serializers.IntegerField(source='gat_round')
    date = serializers.DateField()
    status = serializers.SerializerMethodField()
    id = serializers.CharField() 

    def get_status(self, obj):
        if obj.get('status') == 'finished':
            return 'completed'
        return 'upcoming'

class BookletCatalogSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()
    variant = serializers.SerializerMethodField()
    day = serializers.IntegerField(source='gat_day')
    color = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = ['id', 'variant', 'day', 'subjects', 'color']

    def get_subjects(self, obj):
        # 🔥 ИСПРАВЛЕНИЕ: Убрали [:3], теперь показываем ВСЕ предметы
        return [s.abbreviation for s in obj.subjects.all()]
    
    def get_variant(self, obj):
        # Логика определения варианта из названия
        if "Var A" in obj.title: return "A"
        if "Var B" in obj.title: return "B"
        if "Var C" in obj.title: return "C"
        if "Var D" in obj.title: return "D"
        return chr(65 + (obj.id % 4))
    
    def get_color(self, obj):
        colors = [
            'from-blue-500 to-indigo-500',
            'from-purple-500 to-pink-500', 
            'from-emerald-500 to-teal-500',
            'from-orange-500 to-amber-500'
        ]
        return colors[obj.id % len(colors)]

# --- СЕРИАЛИЗАТОРЫ ДЛЯ ЛИМИТОВ (QuestionCounts) ---

class SchoolConfigSerializer(serializers.ModelSerializer):
    grades = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = ['id', 'name', 'grades']

    def get_grades(self, school):
        limits = QuestionLimit.objects.filter(school=school).select_related('subject')
        grades_map = {}
        
        for limit in limits:
            grade = limit.grade_level
            if grade not in grades_map:
                grades_map[grade] = []
            
            grades_map[grade].append({
                "id": str(limit.subject.id),
                "subjectName": limit.subject.name,
                "count": limit.count,
                "color": f"text-{limit.subject.color}-600 bg-{limit.subject.color}-50" if hasattr(limit.subject, 'color') else "text-slate-600 bg-slate-50"
            })
            
        result = []
        for grade in sorted(grades_map.keys()):
            result.append({
                "grade": grade,
                "subjects": grades_map[grade]
            })
            
        return result

class ExamPreviewSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    
    # Легкие вычисляемые поля
    variant = serializers.SerializerMethodField()
    grade_level_display = serializers.SerializerMethodField()
    academic_year = serializers.SerializerMethodField()
    
    # 🔥 ГЛАВНОЕ: Секции теперь берутся из кэша
    sections = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'school_name', 'gat_round', 'date', 
            'variant', 'duration', 'sections', 
            'grade_level_display', 'academic_year'
        ]

    def get_variant(self, obj):
        # Быстрый поиск подстроки (можно оптимизировать regex, но пока ок)
        if "Var A" in obj.title: return "A"
        if "Var B" in obj.title: return "B"
        if "Var C" in obj.title: return "C"
        if "Var D" in obj.title: return "D"
        return "A"

    def get_grade_level_display(self, obj):
        # Если есть кэшированное значение в модели - берем его, иначе регулярка
        match = re.search(r'(\d+)\s*Класс', obj.title, re.IGNORECASE)
        return match.group(1) if match else "..."

    def get_academic_year(self, obj):
        # Логика даты очень быстрая, оставляем как есть
        date_ref = obj.date or timezone.now()
        y = date_ref.year
        return f"{y-1}-{y}" if date_ref.month < 8 else f"{y}-{y+1}"

    def get_sections(self, obj):
        """
        🚀 ULTRA-FAST METHOD WITH CACHING
        Ключ кэша: exam_structure_{id}_v{updated_at_timestamp}
        """
        # Уникальный ключ версии, чтобы сбрасывать кэш при обновлении экзамена
        # Если у Exam нет поля updated_at, добавь его в модель! (auto_now=True)
        # Если пока нет, используем просто ID, но тогда нужен сигнал для инвалидации.
        cache_key = f"exam_sections_{obj.id}"
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        # 1. OPTIMIZED DB QUERY
        # Используем select_related для связей FK и prefetch_related для M2M (choices)
        # order_by важен для groupby!
        questions = obj.questions.select_related('topic', 'topic__subject')\
                                 .prefetch_related('choices')\
                                 .order_by('topic__subject__id', 'id')

        grouped_sections = []
        
        # 2. FAST GROUPING (itertools)
        # Группируем по Предмету. 
        # lambda q: q.topic.subject if ... - это ключ группировки
        key_func = lambda q: q.topic.subject if (q.topic and q.topic.subject) else None
        
        for subject, group in groupby(questions, key=key_func):
            # Превращаем итератор группы в список
            qs_list = list(group)
            
            subject_name = subject.name if subject else "Общие вопросы"
            
            # Переводы (можно вынести в словарь для красоты)
            subj_upper = subject_name.upper()
            if "АНГЛИЙСК" in subj_upper: display_name = "ENGLISH"
            elif "МАТЕМАТ" in subj_upper: display_name = "MATHEMATICS"
            elif "ИСТОР" in subj_upper: display_name = "HISTORY"
            else: display_name = subj_upper

            # Сериализуем вопросы (вложенный сериализатор)
            # Важно: QuestionSerializer тоже должен быть легким!
            q_data = QuestionSerializer(qs_list, many=True).data
            
            grouped_sections.append({
                "id": subject.id if subject else 0,
                "subject_name": display_name,
                "questions": q_data
            })

        # 3. SET CACHE (на 1 час)
        cache.set(cache_key, grouped_sections, timeout=60*60)
        
        return grouped_sections

# --- 🔥 НОВЫЕ СЕРИАЛИЗАТОРЫ ДЛЯ УМНЫХ БУКЛЕТОВ ---

class ExamRoundSerializer(serializers.ModelSerializer):
    """
    Сериализатор для управления глобальными раундами (GAT-1, GAT-2)
    """
    class Meta:
        model = ExamRound
        fields = '__all__'

class BookletSectionSerializer(serializers.ModelSerializer):
    """
    Сериализатор для секций буклета.
    🔥 FIX: Теперь вычисляет статистику (stats) в реальном времени,
    а не берет устаревшие данные из ai_validation_result.
    """
    subject_name = serializers.ReadOnlyField(source='subject.name')
    expert_name = serializers.ReadOnlyField(source='expert.get_full_name')
    
    # Добавляем вычисляемое поле stats
    stats = serializers.SerializerMethodField()
    
    class Meta:
        model = BookletSection
        fields = [
            'id', 'round', 'subject', 'subject_name', 
            'expert', 'expert_name', 'grade_level', 
            'status', 'ai_validation_result', 
            'stats', # 👈 Важно: поле статистики
            'created_at', 'updated_at'
        ]

    def get_stats(self, obj):
        # 1. ЖИВОЙ ПОДСЧЕТ: Считаем сколько вопросов сейчас реально в базе
        current_count = obj.questions.count()

        # 2. ЛИМИТ: Ищем, сколько нужно вопросов (из настроек QuestionLimit)
        # Импортируем внутри метода, чтобы избежать ошибок циклического импорта
        from .models import QuestionLimit
        from django.db.models import Max
        
        # Находим максимальное требование среди школ для этого класса/предмета
        max_limit = QuestionLimit.objects.filter(
            grade_level=obj.grade_level,
            subject=obj.subject
        ).aggregate(Max('count'))['count__max']
        
        needed_max = max_limit if max_limit else 0

        return {
            "current": current_count,
            "needed_max": needed_max
        }

# --- ДОБАВИТЬ В serializers.py ---

class QuestionPlaySerializer(serializers.ModelSerializer):
    """Сериализатор вопроса для СТУДЕНТА (без поля is_correct!)"""
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'text', 'options', 'image'] # image добавили на случай картинок

    def get_options(self, obj):
        # Возвращаем просто список текстов ['Ответ 1', 'Ответ 2'...]
        # Важно: перемешать их, если нужно, но пока вернем как есть
        return [c.text for c in obj.choices.all()]

class ExamPlaySerializer(serializers.ModelSerializer):
    """Полный объект экзамена для прохождения"""
    questions = QuestionPlaySerializer(many=True, read_only=True)
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'duration', 'questions']

class ExamResultSerializer(serializers.ModelSerializer):
    """
    Сериализатор для результатов экзамена.
    Используется в отчетах и при импорте.
    """
    student_name = serializers.SerializerMethodField()
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = ExamResult
        fields = [
            'id', 
            'student', 'student_name', 
            'exam', 'exam_title', 
            'score', 'max_score', 'percentage', 
            'is_passed', 'details', 'created_at'
        ]

    def get_student_name(self, obj):
        # Пытаемся собрать красивое имя
        if not obj.student:
            return "Unknown"
        return f"{obj.student.last_name} {obj.student.first_name}".strip()
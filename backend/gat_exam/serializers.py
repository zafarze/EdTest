from rest_framework import serializers
from django.utils.timesince import timesince
from django.contrib.auth.models import User
from .models import (
    School, SchoolYear, Quarter, StudentClass, Student, 
    Exam, Question, Choice, Notification, Subject, 
    Topic, GlobalSettings, UserProfile
)

# --- БАЗОВЫЕ СЕРИАЛИЗАТОРЫ ---

# 1. 🔥 НОВЫЙ СЕРИАЛИЗАТОР ДЛЯ ШКОЛЫ (С ЛОГОТИПОМ)
class SchoolMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name', 'name_tj', 'name_en', 'logo', 'slug', 'color_theme'] # 👈 Добавили color_theme

class SchoolSerializer(serializers.ModelSerializer):
    # 🔥 Добавляем поле для чтения кол-ва учеников
    students_count = serializers.IntegerField(read_only=True)
    
    # 🔥 Слаг генерирует сервер, фронт его только читает
    slug = serializers.SlugField(read_only=True) 

    class Meta:
        model = School
        fields = '__all__'

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'image']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    class Meta:
        model = Question
        # 🔥 Добавили 'points' и 'variant'
        fields = ['id', 'text', 'difficulty', 'points', 'variant', 'question_type', 'image', 'choices', 'topic']

# --- ГЛАВНЫЙ СЕРИАЛИЗАТОР ЭКЗАМЕНА ---

class ExamSerializer(serializers.ModelSerializer):
    settings = serializers.SerializerMethodField()
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    type = serializers.CharField(source='exam_type') 
    
    # Чтение данных (красивые названия)
    school_name = serializers.ReadOnlyField(source='school.name')
    quarter_name = serializers.ReadOnlyField(source='quarter.name')
    
    # 🔥 ПРЕДМЕТЫ (Множественные)
    subject_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    subjects_data = serializers.SerializerMethodField()

    # 🔥 КЛАССЫ (Множественные)
    class_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    classes_names = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'type', 'status', 'date', 
            'duration', 'variants_count', 'settings', 
            'questions_count', 'created_at',
            'school', 'school_name', 
            'quarter', 'quarter_name',
            'gat_round', 'gat_day',
            'class_ids', 'classes_names',
            'subject_ids', 'subjects_data'
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
        settings_data = self.initial_data.get('settings', {})
        class_ids = validated_data.pop('class_ids', [])
        subject_ids = validated_data.pop('subject_ids', [])
        
        validated_data['is_adaptive'] = settings_data.get('isAdaptive', False)
        validated_data['lockdown_mode'] = settings_data.get('lockdownMode', False)
        validated_data['webcam_monitoring'] = settings_data.get('webcamMonitoring', False)
        validated_data['emotional_check'] = settings_data.get('emotionalCheck', False)
        validated_data['smart_seating'] = settings_data.get('smartSeating', False)
        
        exam = super().create(validated_data)
        
        if exam.quarter and exam.quarter.school_year:
            exam.school_year = exam.quarter.school_year
            exam.save()
        
        if class_ids: exam.classes.set(class_ids)
        if subject_ids: exam.subjects.set(subject_ids)
            
        return exam

    def update(self, instance, validated_data):
        settings_data = self.initial_data.get('settings', {})
        class_ids = validated_data.pop('class_ids', None)
        subject_ids = validated_data.pop('subject_ids', None)

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
        # 🔥 Добавляем name_tj и name_en
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
    
    # 🔥 ИСПРАВЛЕНИЕ: Переименовали year_name -> school_year_name
    # Теперь фронтенд увидит это поле!
    school_year_name = serializers.ReadOnlyField(source='school_year.name')

    class Meta:
        model = Quarter
        fields = [
            'id', 'name', 'name_tj', 'name_en', 
            'start_date', 'end_date', 'is_active', 
            'progress', 'status', 
            'school_year_name' # 🔥 Не забудь обновить и здесь!
        ]
        read_only_fields = ['school_year']
        
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

class StudentSerializer(serializers.ModelSerializer):
    # Добавляем поля, чтобы можно было передать пароль при создании
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Student
        fields = '__all__'

    def create(self, validated_data):
        # Извлекаем пароль (если он был передан)
        password = validated_data.pop('password', None)
        username = validated_data.get('username')
        school = validated_data.get('school')

        # Запускаем транзакцию: либо всё создастся, либо ничего (безопасно)
        with transaction.atomic():
            # 1. Проверяем, существует ли уже такой User (пользователь для входа)
            if username and not User.objects.filter(username=username).exists():
                # Если пароль не передали, генерируем простой (например, 12345678) или берем из логина
                final_password = password if password else "12345678"
                
                # 🔥 СОЗДАЕМ ПОЛЬЗОВАТЕЛЯ (User)
                user = User.objects.create_user(
                    username=username,
                    password=final_password,
                    first_name=validated_data.get('first_name_ru', ''),
                    last_name=validated_data.get('last_name_ru', '')
                )
                
                # 🔥 НАЗНАЧАЕМ РОЛЬ "STUDENT"
                # Проверяем, есть ли профиль (обычно создается сигналом, но на всякий случай)
                if not hasattr(user, 'profile'):
                    UserProfile.objects.create(user=user, role='student', school=school)
                else:
                    user.profile.role = 'student'
                    user.profile.school = school
                    user.profile.save()

                print(f"✅ [StudentSerializer] Создан User для ученика: {username} / Пароль: {final_password}")

            # 2. Создаем саму запись Ученика
            student = Student.objects.create(**validated_data)
            return student

    def update(self, instance, validated_data):
        # Если меняем данные ученика, можно обновить и User (имя, фамилию)
        password = validated_data.pop('password', None)
        
        # Обновляем поля студента
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Если передан новый пароль - меняем его у пользователя
        if password and instance.username:
            try:
                user = User.objects.get(username=instance.username)
                user.set_password(password)
                user.save()
                print(f"🔄 [StudentSerializer] Пароль обновлен для: {instance.username}")
            except User.DoesNotExist:
                pass

        return instance

class SubjectSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active')
    iconType = serializers.CharField(source='icon_type')
    questionsCount = serializers.IntegerField(source='questions_count', read_only=True, default=0)

    class Meta:
        model = Subject
        # 🔥 Добавили 'slug' в список полей
        fields = ['id', 'name', 'name_tj', 'name_en', 'slug', 'abbreviation', 'category', 'color', 'iconType', 'isActive', 'questionsCount']

class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    author_name = serializers.ReadOnlyField(source='author.username')
    school_names = serializers.SerializerMethodField()
    
    # 🔥 Добавляем эти два поля
    questions_count = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'schools', 'school_names', 'subject', 'subject_name',
            'quarter', 'grade_level', 'title', 'description', 
            'author_name', 'created_at',
            'questions_count', 'status' # 👈 Не забудь добавить сюда!
        ]
        read_only_fields = ['author', 'created_at']

    def get_school_names(self, obj):
        return [s.name for s in obj.schools.all()]

    # 🔥 Логика статуса
    def get_status(self, obj):
        # Если аннотации нет (например, при создании), считаем 0
        count = getattr(obj, 'questions_count', 0)
        
        if count == 0:
            return 'empty'     # Серый (Пусто)
        elif count < 5:
            return 'progress'  # Желтый (В процессе)
        else:
            return 'ready'     # Зеленый (Готово)
        
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

# --- 🔥 НОВЫЙ СЕРИАЛИЗАТОР ПРОФИЛЯ ---
class ProfileSerializer(serializers.ModelSerializer):
    # Включаем наш SchoolMiniSerializer внутрь профиля
    school = SchoolMiniSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['role', 'phone', 'school']

# --- USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    # Оставляем старые поля для обратной совместимости
    role = serializers.CharField(source='profile.role', required=False)
    school_name = serializers.CharField(source='profile.school.name', read_only=True)
    
    # 🔥 Включаем полный объект профиля (где есть логотип школы)
    profile = ProfileSerializer(read_only=True)

    assigned_schools = serializers.SerializerMethodField()
    assigned_subjects = serializers.SerializerMethodField()
    assigned_classes = serializers.SerializerMethodField()

    school_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    subject_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    class_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'password', 'role', 'school_name', 
            'profile', 
            'assigned_schools', 'assigned_subjects', 'assigned_classes',
            'school_ids', 'subject_ids', 'class_ids',
            'full_name', 'last_login', 'is_active'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False} 
        }

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}".strip()

    def get_assigned_schools(self, obj):
        if hasattr(obj, 'profile'): return [{'id': s.id, 'name': s.name} for s in obj.profile.assigned_schools.all()]
        return []

    def get_assigned_subjects(self, obj):
        if hasattr(obj, 'profile'): return [{'id': s.id, 'name': s.name} for s in obj.profile.assigned_subjects.all()]
        return []

    def get_assigned_classes(self, obj):
        if hasattr(obj, 'profile'): return [{'id': c.id, 'name': str(c)} for c in obj.profile.assigned_classes.all()]
        return []
    
    def to_representation(self, instance):
        print(f"🔍 DEBUG для {instance.username} ------------------")
        
        # 1. Проверяем профиль
        if hasattr(instance, 'profile'):
            print(f"✅ Профиль найден! Роль: {instance.profile.role}")
            
            # 2. Проверяем школу
            if instance.profile.school:
                print(f"🏫 Школа привязана: {instance.profile.school.name} (ID: {instance.profile.school.id})")
                print(f"🖼️ Логотип: {instance.profile.school.logo}")
            else:
                print("❌ Школа в профиле = None (Пусто!)")
                
            # 3. Проверяем Many-to-Many
            schools_count = instance.profile.assigned_schools.count()
            print(f"📚 Прикрепленных школ в списке: {schools_count}")
            
        else:
            print("😱 ПРОФИЛЬ НЕ НАЙДЕН (hasattr вернул False)")
            
        print("--------------------------------------------------")
        return super().to_representation(instance)

    def validate_school_ids(self, value):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'): return value
        user = request.user
        if user.is_superuser or user.profile.role in ['admin', 'general_director']: return value
        if user.profile.role == 'director':
            allowed = set(user.profile.assigned_schools.values_list('id', flat=True))
            if user.profile.school: allowed.add(user.profile.school.id)
            for school_id in value:
                if school_id not in allowed: raise serializers.ValidationError(f"Нет прав на школу ID {school_id}.")
        return value

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        school_ids = validated_data.pop('school_ids', [])
        subject_ids = validated_data.pop('subject_ids', [])
        class_ids = validated_data.pop('class_ids', [])
        password = validated_data.pop('password')
        role = profile_data.get('role', 'teacher')

        request = self.context.get('request')
        if request and not request.user.is_superuser:
            if role == 'admin' or role == 'general_director': 
                raise serializers.ValidationError("Нельзя создать Админа.")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if hasattr(user, 'profile'):
            profile = user.profile
        else:
            profile = UserProfile.objects.create(user=user)

        profile.role = role
        
        # --- ЛОГИКА ШКОЛ ---
        if school_ids:
            # 1. Привязываем Many-to-Many
            schools = School.objects.filter(id__in=school_ids)
            profile.assigned_schools.set(schools)
            
            # 2. 🔥 ВАЖНО: Устанавливаем ПЕРВУЮ школу как ОСНОВНУЮ
            if schools.exists():
                profile.school = schools.first()
        # -------------------

        profile.save()
        
        if subject_ids: profile.assigned_subjects.set(Subject.objects.filter(id__in=subject_ids))
        if class_ids: profile.assigned_classes.set(StudentClass.objects.filter(id__in=class_ids))
        
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        school_ids = validated_data.pop('school_ids', None)
        subject_ids = validated_data.pop('subject_ids', None)
        class_ids = validated_data.pop('class_ids', None)

        if 'role' in profile_data:
            new_role = profile_data['role']
            request = self.context.get('request')
            if request and not request.user.is_superuser:
                if new_role in ['admin', 'general_director']: 
                    raise serializers.ValidationError("Нельзя повысить до Админа.")

        for attr, value in validated_data.items():
            if attr == 'password': instance.set_password(value)
            else: setattr(instance, attr, value)
        instance.save()

        if hasattr(instance, 'profile'):
            profile = instance.profile
            if 'role' in profile_data: profile.role = profile_data['role']
            
            # --- ЛОГИКА ШКОЛ ---
            if school_ids is not None:
                # 1. Привязываем Many-to-Many
                schools = School.objects.filter(id__in=school_ids)
                profile.assigned_schools.set(schools)
                
                # 2. 🔥 ВАЖНО: Обновляем ОСНОВНУЮ школу
                # Если список не пуст -> берем первую. Если пуст -> обнуляем основную.
                if schools.exists():
                    profile.school = schools.first()
                else:
                    profile.school = None
            # -------------------

            if subject_ids is not None: profile.assigned_subjects.set(Subject.objects.filter(id__in=subject_ids))
            if class_ids is not None: profile.assigned_classes.set(StudentClass.objects.filter(id__in=class_ids))
            
            profile.save()
            
        return instance

# --- 👇 ДОБАВИТЬ В КОНЕЦ serializers.py 👇 ---

class SchoolCatalogSerializer(serializers.ModelSerializer):
    """Легкий сериализатор для списка школ в каталоге"""
    students_count = serializers.IntegerField(read_only=True)
    tests_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = School
        fields = ['id', 'name', 'students_count', 'tests_count']

class ClassCatalogSerializer(serializers.ModelSerializer):
    """Легкий сериализатор для списка классов"""
    tests_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudentClass
        fields = ['id', 'grade_level', 'section', 'tests_count']
    
    def to_representation(self, instance):
        # Превращаем объект класса в красивое имя "11А"
        data = super().to_representation(instance)
        data['name'] = str(instance) 
        return data

class GatGroupSerializer(serializers.Serializer):
    """Для группировки GAT (например, карточка 'GAT-1')"""
    number = serializers.IntegerField(source='gat_round')
    date = serializers.DateField()
    status = serializers.SerializerMethodField()
    id = serializers.CharField() 

    def get_status(self, obj):
        # Логика статуса: если статус 'finished' или дата прошла
        if obj.get('status') == 'finished':
            return 'completed'
        return 'upcoming'

class BookletCatalogSerializer(serializers.ModelSerializer):
    """Сериализатор для конечной карточки буклета (Exam)"""
    subjects = serializers.SerializerMethodField()
    variant = serializers.SerializerMethodField()
    day = serializers.IntegerField(source='gat_day')
    color = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = ['id', 'variant', 'day', 'subjects', 'color']

    def get_subjects(self, obj):
        # Возвращаем список сокращений предметов (МАТ, АНГ...)
        return [s.abbreviation for s in obj.subjects.all()[:3]]
    
    def get_variant(self, obj):
        # Пока у нас нет поля 'variant' в Exam, можно генерировать фиктивно или добавить поле.
        # Для примера вернем ID или букву на основе ID
        return chr(65 + (obj.id % 4)) # Возвращает A, B, C...
    
    def get_color(self, obj):
        # Генерируем градиент на основе дня или ID
        colors = [
            'from-blue-500 to-indigo-500',
            'from-purple-500 to-pink-500', 
            'from-emerald-500 to-teal-500',
            'from-orange-500 to-amber-500'
        ]
        return colors[obj.id % len(colors)]
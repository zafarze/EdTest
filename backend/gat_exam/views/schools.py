import logging
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from gat_exam.permissions import IsVipOrReadOnly, IsSchoolDirectorOrReadOnly

# Импорт моделей
from ..models import (
    School, SchoolYear, Quarter, StudentClass, Student,
    Exam, Question, Choice, Subject, Topic, 
    GlobalSettings, UserProfile
)

# Импорт сериализаторов
from ..serializers import (
    SchoolSerializer, SchoolMiniSerializer,
    UserSerializer, ProfileSerializer,
    ExamSerializer, QuestionSerializer, ChoiceSerializer,
    SubjectSerializer, TopicSerializer,
    StudentSerializer, StudentClassSerializer,
    SchoolYearSerializer, QuarterSerializer,
    # Новые для каталога
    SchoolCatalogSerializer, BookletCatalogSerializer, GatGroupSerializer
)

# Импорт прав (предполагаем, что permissions.py настроен)
from gat_exam.permissions import IsSchoolDirectorOrReadOnly, IsVipOrReadOnly

# Настройка логгера
logger = logging.getLogger(__name__)


# ==========================================
# 1. SCHOOL VIEWSET (ШКОЛЫ)
# ==========================================
class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'custom_id', 'address', 'phone']
    ordering_fields = ['id', 'name', 'students_count']
    ordering = ['id']

    def get_permissions(self):
        # 1. Создание (create) и Удаление (destroy) -> Только VIP
        if self.action in ['create', 'destroy']:
            return [IsVipOrReadOnly()]  # 🔥 Сюда попадет наш новый код
            
        # 2. Редактирование -> Директор (своей школы) или VIP
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsSchoolDirectorOrReadOnly()]
            
        # 3. Чтение -> Всем авторизованным
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Оптимизация: сразу считаем учеников
        queryset = School.objects.annotate(students_count=Count('students')).order_by('id')

        # 1. Суперюзеры и VIP видят всё
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'general_director', 'ceo']):
            return queryset

        # 2. Остальные видят только свои школы (основную + привязанные)
        if hasattr(user, 'profile'):
            school_ids = set()
            if user.profile.school:
                school_ids.add(user.profile.school.id)
            school_ids.update(user.profile.assigned_schools.values_list('id', flat=True))
            
            if school_ids:
                return queryset.filter(id__in=school_ids)
        
        return School.objects.none()

    def perform_create(self, serializer):
        # 🔥 ФИКС ДУБЛИКАТОВ ID: Проверяем перед сохранением
        custom_id = serializer.validated_data.get('custom_id')
        if custom_id:
            if School.objects.filter(custom_id=custom_id).exists():
                logger.warning(f"⛔ Попытка создания дубликата школы ID {custom_id} пользователем {self.request.user}")
                raise ValidationError({"custom_id": [f"Школа с кодом '{custom_id}' уже существует."]})

        instance = serializer.save()
        logger.info(f"✅ [AUDIT] New School Created: {instance.name} (ID: {instance.id}) by {self.request.user}")

    def perform_destroy(self, instance):
        school_name = instance.name
        instance.delete()
        logger.info(f"🗑️ [AUDIT] School Deleted: {school_name} by {self.request.user}")


# ==========================================
# 2. USER VIEWSET (ПОЛЬЗОВАТЕЛИ)
# ==========================================
from django.contrib.auth import get_user_model
User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_queryset(self):
        # Оптимизация запросов (JOIN profile и school)
        qs = User.objects.select_related('profile', 'profile__school').prefetch_related(
            'profile__assigned_schools', 'profile__assigned_subjects'
        )
        
        user = self.request.user
        # Админы видят всех
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'general_director']):
            return qs
            
        # Директора видят только сотрудников своих школ
        if hasattr(user, 'profile') and user.profile.school:
             return qs.filter(profile__school=user.profile.school)
             
        # Обычные юзеры видят только себя
        return qs.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Возвращает данные текущего пользователя.
        Используется фронтендом при загрузке страницы.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


# ==========================================
# 3. EXAM VIEWSET (ЭКЗАМЕНЫ)
# ==========================================
class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # 🔥 Фильтры для GAT и поиска
    filterset_fields = ['school', 'school_year', 'gat_round', 'gat_day', 'status', 'exam_type']
    search_fields = ['title', 'description']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        # Оптимизация: подгружаем связанные поля
        qs = Exam.objects.select_related('school', 'school_year', 'quarter')\
                         .prefetch_related('subjects', 'classes', 'questions')
        
        user = self.request.user
        # Логика видимости (по аналогии со школами)
        if user.is_superuser: return qs
        if hasattr(user, 'profile'):
            if user.profile.role in ['admin', 'general_director']: return qs
            # Учителя/Директора видят экзамены своих школ
            allowed_schools = set()
            if user.profile.school: allowed_schools.add(user.profile.school.id)
            allowed_schools.update(user.profile.assigned_schools.values_list('id', flat=True))
            return qs.filter(school__id__in=allowed_schools)
            
        return qs.none()

    @action(detail=False, methods=['get'])
    def gat_catalog(self, request):
        """
        Специальный endpoint для каталога GAT (карточки экзаменов).
        Группирует экзамены по GAT Round (1, 2, 3...)
        """
        # Логика получения уникальных раундов, которые есть в базе
        exams = self.get_queryset().filter(exam_type='online').order_by('-gat_round', 'gat_day')
        
        # Здесь можно написать кастомную логику группировки
        # Для простоты вернем список экзаменов через BookletCatalogSerializer
        serializer = BookletCatalogSerializer(exams, many=True)
        return Response(serializer.data)


# ==========================================
# 4. QUESTION VIEWSET (ВОПРОСЫ)
# ==========================================
class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['exam', 'topic', 'difficulty', 'question_type']
    search_fields = ['text']

    def get_queryset(self):
        return Question.objects.select_related('exam', 'topic').prefetch_related('choices').all()

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Дублирование вопроса"""
        try:
            question = self.get_object()
            choices = question.choices.all()
            
            question.pk = None
            question.text = f"{question.text} (Копия)"
            question.save()
            
            for choice in choices:
                choice.pk = None
                choice.question = question
                choice.save()
                
            return Response(self.get_serializer(question).data)
        except Exception as e:
            logger.error(f"Error duplicating question: {e}")
            return Response({"error": "Failed"}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 5. SUBJECT & TOPIC (ПРЕДМЕТЫ И ТЕМЫ)
# ==========================================
class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Считаем вопросы в каждом предмете (полезно для админки)
        return Subject.objects.annotate(questions_count=Count('topics__questions'))

class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['subject', 'grade_level', 'quarter']

    def get_queryset(self):
        return Topic.objects.select_related('subject', 'author')\
                            .prefetch_related('schools')\
                            .annotate(questions_count=Count('questions'))


# ==========================================
# 6. STUDENT & CLASS (УЧЕНИКИ)
# ==========================================
class StudentClassViewSet(viewsets.ModelViewSet):
    serializer_class = StudentClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        qs = StudentClass.objects.select_related('school')
        
        # Фильтр: только классы моей школы
        if hasattr(user, 'profile') and user.profile.school and not user.is_superuser:
            return qs.filter(school=user.profile.school)
        return qs

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['first_name_ru', 'last_name_ru', 'custom_id']
    filterset_fields = ['student_class', 'school', 'gender']

    def get_queryset(self):
        qs = Student.objects.select_related('school', 'student_class')
        # ... аналогичная логика фильтрации по школе ...
        user = self.request.user
        if hasattr(user, 'profile') and user.profile.school and not user.is_superuser:
            # Видит учеников своей школы + учеников классов, которые курирует (если они в других школах - редкость, но все же)
            return qs.filter(school=user.profile.school)
        return qs
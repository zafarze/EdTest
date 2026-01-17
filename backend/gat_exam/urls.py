from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.rating import MonitoringRatingView

# Импорт ViewSets (CRUD)
from .views.users_view import UserViewSet
from .views.schools import SchoolViewSet
from .views.years import SchoolYearViewSet, QuarterViewSet
from .views.classes import StudentClassViewSet
from .views.students import StudentViewSet
from .views.subjects import SubjectViewSet
from .views.topics import TopicViewSet
from .views.exams import ExamViewSet
from .views.questions import QuestionViewSet
from .views.notifications import NotificationViewSet
# BookletViewSet удаляем, он больше не нужен здесь
from .views.settings import SettingsView

# Импорт APIViews (Кастомная логика)
from .views.upload import FileUploadView
from .views.result import ExamResultView
from .views.all_results import AllResultsView
from .views.analytics import AnalyticsView
from .views.booklets import BookletCatalogView, BookletDownloadView

router = DefaultRouter()

# --- 1. АДМИНИСТРАТИВНЫЙ БЛОК ---
router.register(r'users', UserViewSet, basename='users')
router.register(r'schools', SchoolViewSet, basename='schools')

# --- 2. АКАДЕМИЧЕСКАЯ СТРУКТУРА ---
router.register(r'years', SchoolYearViewSet)
router.register(r'quarters', QuarterViewSet)
router.register(r'classes', StudentClassViewSet)
router.register(r'students', StudentViewSet, basename='students')

# --- 3. УЧЕБНЫЙ КОНТЕНТ ---
router.register(r'subjects', SubjectViewSet, basename='subjects')
router.register(r'topics', TopicViewSet, basename='topics')
router.register(r'questions', QuestionViewSet, basename='questions')

# --- 4. ЭКЗАМЕНЫ ---
router.register(r'exams', ExamViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')
# router.register(r'booklets') - ЭТУ СТРОКУ УДАЛИЛИ, ТАК КАК ИСПОЛЬЗУЕМ КАТАЛОГ НИЖЕ

urlpatterns = [
    # Роутер (CRUD операции)
    path('', include(router.urls)),

    # --- КАСТОМНЫЕ ЭНДПОИНТЫ ---
    
    # 1. Загрузка файлов
    path('upload/', FileUploadView.as_view(), name='file-upload'),

    # 2. Результаты
    path('exams/<int:exam_id>/results/', ExamResultView.as_view(), name='exam-results'),
    path('monitoring/results/', AllResultsView.as_view(), name='all-results'),

    # 3. Настройки и Аналитика
    path('settings/', SettingsView.as_view(), name='global-settings'),
    path('analytics/dashboard/', AnalyticsView.as_view(), name='analytics-dashboard'),
    
    # 🔥 4. КАТАЛОГ БУКЛЕТОВ (Исправленный путь)
    path('booklets/catalog/', BookletCatalogView.as_view(), name='booklet-catalog'),
    path('download/pdf/<int:pk>/', BookletDownloadView.as_view(), name='booklet-pdf'),
    path('monitoring/rating/', MonitoringRatingView.as_view(), name='monitoring-rating'),
]

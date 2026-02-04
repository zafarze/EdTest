from django.urls import path, include
from rest_framework.routers import DefaultRouter

# --- ИМПОРТЫ ---

# 1. Импортируем TaskStatusView напрямую
from .views.ai_views import TaskStatusView

# 2. Импортируем ViewSet для студентов
from .views.taking_exam import StudentExamViewSet

# 3. 🔥 ИМПОРТ НОВОЙ ВЬЮХИ (Исправление ошибки 404)
# Если вы переименовали файл ai_analytics.py в analytics.py, поменяйте импорт на .views.analytics
from .views.ai_analytics import AIAnalyticsDashboardView, AnalyticsReportPDFView

# 4. Основной импорт остальных ViewSet'ов из __init__.py
from .views import (
    # ViewSets (CRUD)
    UserViewSet, SchoolViewSet, 
    SchoolYearViewSet, QuarterViewSet, 
    StudentClassViewSet, StudentViewSet,
    SubjectViewSet, TopicViewSet, QuestionViewSet,
    ExamViewSet, NotificationViewSet, QuestionCountsViewSet,
    
    # Умные буклеты
    ExamRoundViewSet, BookletSectionViewSet, ExamPreviewViewSet,
    
    # APIViews (Кастомные действия)
    FileUploadView, 
    ExamResultView, 
    AllResultsView, 
    MonitoringRatingView, 
    SettingsView, 
    BookletCatalogView,
    BookletDownloadView, 
    BookletPreviewView,

    # AI Сервисы
    AIGenerateDistractorsView,
    AIAnalyzeQuestionView,
    ExamReportView,      # AI отчет

    # АНАЛИТИКА
    ComparisonView,          # (Можно использовать для других графиков)
    DashboardAnalyticsView   # Главный дашборд
)

router = DefaultRouter()

# ==============================================================================
# 1. АДМИНИСТРАТИВНЫЙ БЛОК & УЧЕБНАЯ СТРУКТУРА
# ==============================================================================
router.register(r'users', UserViewSet, basename='users')
router.register(r'schools', SchoolViewSet, basename='schools')
router.register(r'years', SchoolYearViewSet)
router.register(r'quarters', QuarterViewSet)
router.register(r'classes', StudentClassViewSet)
router.register(r'students', StudentViewSet, basename='students')

# ==============================================================================
# 2. УЧЕБНЫЙ КОНТЕНТ (Вопросы, Темы)
# ==============================================================================
router.register(r'subjects', SubjectViewSet, basename='subjects')
router.register(r'topics', TopicViewSet, basename='topics')
router.register(r'questions', QuestionViewSet, basename='questions')
router.register(r'question_counts', QuestionCountsViewSet, basename='question_counts')
router.register(r'notifications', NotificationViewSet, basename='notifications')

# ==============================================================================
# 3. ЭКЗАМЕНЫ (РАЗДЕЛЕНИЕ РОЛЕЙ)
# ==============================================================================

# 🅰️ ПУТЬ УЧИТЕЛЯ/АДМИНА
router.register(r'exams', ExamViewSet, basename='admin-exams')

# 🅱️ ПУТЬ СТУДЕНТА
router.register(r'student/exams', StudentExamViewSet, basename='student-exams')

# ==============================================================================
# 4. УМНЫЕ БУКЛЕТЫ
# ==============================================================================
router.register(r'exam-rounds', ExamRoundViewSet)
router.register(r'booklet-sections', BookletSectionViewSet, basename='booklet-sections')
router.register(r'exam-previews', ExamPreviewViewSet, basename='exam-preview')


urlpatterns = [
    # Подключаем все роуты из router
    path('', include(router.urls)),

    # --- ЗАГРУЗКА ФАЙЛОВ ---
    path('upload/', FileUploadView.as_view(), name='file-upload'),

    # --- РЕЗУЛЬТАТЫ И РЕЙТИНГИ ---
    path('monitoring/results/', AllResultsView.as_view(), name='all-results'),
    path('monitoring/rating/', MonitoringRatingView.as_view(), name='monitoring-rating'),
    path('exams/<int:pk>/results/', ExamResultView.as_view(), name='exam-result-detail'),

    # --- НАСТРОЙКИ ---
    path('settings/', SettingsView.as_view(), name='global-settings'),

    # --- БУКЛЕТЫ (PDF) ---
    path('booklets/catalog/', BookletCatalogView.as_view(), name='booklet-catalog'),
    path('download/pdf/<int:pk>/', BookletDownloadView.as_view(), name='booklet-pdf'),

    # --- AI ФУНКЦИИ (CELERY + GPT) ---
    path('ai/generate-distractors/', AIGenerateDistractorsView.as_view(), name='ai-generate-distractors'),
    path('ai/analyze-question/', AIAnalyzeQuestionView.as_view(), name='ai-analyze-question'),
    path('tasks/<str:task_id>/', TaskStatusView.as_view(), name='task_status'),
    
    # 🔥 AI ОТЧЕТ ПО ЭКЗАМЕНУ
    path('exams/<int:pk>/ai-report/', ExamReportView.as_view(), name='exam-ai-report'),

    # --- АНАЛИТИКА ---
    # Главный дашборд (SQL Статистика)
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='analytics-dashboard'),
    
    # 🔥 AI ADVISOR (ИСПРАВЛЕНИЕ: Добавлен маршрут для стратегии)
    path('analytics/ai-core/', AIAnalyticsDashboardView.as_view(), name='ai-analytics-core'),

    # Сравнение
    path('analytics/comparison/', ComparisonView.as_view(), name='analytics-comparison'),
    path('analytics/report/pdf/', AnalyticsReportPDFView.as_view(), name='analytics-pdf'),
    path('booklets/<int:pk>/preview/', BookletPreviewView.as_view(), name='booklet-preview'),
]
# backend/gat_exam/views/__init__.py

# 1. Административные
from .users_view import UserViewSet
# 🔥 ИСПРАВЛЕНО: Убрали удаленную функцию get_allowed_school_ids
from .schools import SchoolViewSet 

# 2. Учебный процесс
from .years import SchoolYearViewSet, QuarterViewSet
from .classes import StudentClassViewSet
from .students import StudentViewSet

# 3. Контент
from .subjects import SubjectViewSet
from .topics import TopicViewSet
from .questions import QuestionViewSet
from .question_counts import QuestionCountsViewSet

# 4. Экзамены и Проверка
from .exams import ExamViewSet
from .smart_booklets import ExamRoundViewSet, BookletSectionViewSet, ExamPreviewViewSet

# 5. Сервисы и Загрузка
from .upload import FileUploadView
from .ai_views import AIGenerateDistractorsView, AIAnalyzeQuestionView

# 🔥 ВАЖНО: Добавлен BookletPreviewView в импорты
from .booklets import (
    BookletCatalogView, 
    BookletDownloadView, 
    BookletPreviewView
)

from .notifications import NotificationViewSet
from .settings import SettingsView

# 6. Результаты и Рейтинги
from .result import ExamResultView        # Детали одного ученика
from .all_results import AllResultsView   # Общая таблица результатов
from .rating import MonitoringRatingView  # Рейтинг школ

# 7. АНАЛИТИКА
# ------------------------------------------------------------------
# Импортируем отчеты и дашборд
from .analytics import ExamReportView, DashboardAnalyticsView

# Сравнение/Графики (alias для избежания конфликта имен)
from .comparison import AnalyticsView as ComparisonView
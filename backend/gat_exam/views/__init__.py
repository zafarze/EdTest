from .students import StudentViewSet
from .classes import StudentClassViewSet
from .years import SchoolYearViewSet, QuarterViewSet
from .exams import ExamViewSet
from .notifications import NotificationViewSet
from .subjects import SubjectViewSet
from .topics import TopicViewSet
from .questions import QuestionViewSet
from .booklets import BookletCatalogView
from .upload import FileUploadView
from .settings import SettingsView

# --- ИСПРАВЛЕННЫЕ ИМПОРТЫ ---

# 1. Мы оставили users_view.py (там новая логика)
from .users_view import UserViewSet  

# 2. Мы оставили schools.py (твой мощный файл)
from .schools import SchoolViewSet
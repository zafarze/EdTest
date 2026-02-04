# backend/gat_exam/apps.py

from django.apps import AppConfig

class GatExamConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gat_exam'
    verbose_name = "GAT Exam Platform"

    def ready(self):
        # Импортируем сигналы, чтобы они зарегистрировались
        import gat_exam.signals
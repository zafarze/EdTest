import os
from celery import Celery

# Указываем Django настройки по умолчанию
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('gat_exam')

# Используем настройки из settings.py с префиксом CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматически находим tasks.py во всех приложениях (gat_exam)
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
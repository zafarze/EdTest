import os
from pathlib import Path
import environ
from datetime import timedelta

# Инициализация переменных окружения
env = environ.Env(
    DEBUG=(bool, False)
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Читаем .env файл только если он есть (локальная разработка)
# В Cloud Run переменных из файла не будет, они придут из настроек сервиса
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# --- SECURITY ---
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-locally')
DEBUG = env('DEBUG', default=False)

ALLOWED_HOSTS = ['*'] # Разрешаем Google Cloud Run

# --- APPLICATION DEFINITION ---
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'corsheaders',            
    'rest_framework',         
    'rest_framework.authtoken',
    'django_filters',         
    'djoser', 
    'storages',               # <--- ВАЖНО для Google Storage
    'django_celery_results',

    # Local Apps
    'gat_exam.apps.GatExamConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',                  # 1. CORS
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',             # 2. WhiteNoise (Статика)
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'gat_exam.middleware.ActiveUserMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# --- DATABASE ---
# Если есть DATABASE_URL (в облаке), используем Postgres.
# Если нет — SQLite (локально).
if env('DATABASE_URL', default=None):
    DATABASES = {
        'default': env.db('DATABASE_URL')
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# --- PASSWORDS ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTHENTICATION_BACKENDS = [
    'gat_exam.backends.EmailOrUsernameModelBackend', 
    'django.contrib.auth.backends.ModelBackend',
]

# --- I18N ---
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Dushanbe'
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ('ru', 'Russian'),
    ('en', 'English'),
    ('tj', 'Tajik'), 
]

# --- STATIC & MEDIA (САМОЕ ВАЖНОЕ) ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Настройка хранилищ (Django 4.2+)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Если указан бакет (в облаке) - переключаем медиа на Google Cloud
GS_BUCKET_NAME = env('GS_BUCKET_NAME', default=None)

if GS_BUCKET_NAME:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
    }
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/'
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

# --- REST & JWT ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer', 'JWT'), 
}

DJOSER = {
    'LOGIN_FIELD': 'username',
    'USER_CREATE_PASSWORD_RETYPE': True,
    'SERIALIZERS': {
        'user_create': 'gat_exam.serializers.UserSerializer',
        'user': 'gat_exam.serializers.UserSerializer',
        'current_user': 'gat_exam.serializers.UserSerializer',
    },
}

# --- JAZZMIN ---
JAZZMIN_SETTINGS = {
    "site_title": "Premium GAT Admin",
    "site_header": "GAT Premium",
    "site_brand": "GAT Control",
    "welcome_sign": "Добро пожаловать в Центр Управления",
    "search_model": ["auth.User", "gat_exam.Student"],
    "topmenu_links": [
        {"name": "Главная", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Открыть Сайт", "url": "/", "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
}
JAZZMIN_UI_TWEAKS = {"theme": "darkly"}

# --- CORS ---
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = ['https://*.run.app'] # Доверяем доменам Cloud Run

# --- CELERY ---
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
"""
Django settings for config project.
Revised for GAT Premium White Label support.
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-test-key-replace-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG') == 'True'

ALLOWED_HOSTS = ['*']


# --- APPLICATION DEFINITION ---

INSTALLED_APPS = [
    # 1. Admin Interface (Jazzmin must be before admin)
    'jazzmin',
    'django.contrib.admin',

    # 2. Django Core
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 3. Third Party
    'corsheaders',            # Для связи с React
    'rest_framework',         # API
    'rest_framework.authtoken',
    'django_filters',         # Фильтрация
    'djoser',                 # Auth/Registration

    # 4. Local Apps (Project)
    'gat_exam.apps.GatExamConfig',
]

MIDDLEWARE = [
    # 1. CORS (Must be first!)
    'corsheaders.middleware.CorsMiddleware',

    # 2. Security
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    # 3. I18n / L10n (Language switcher) - ВАЖНО для перевода
    'django.middleware.locale.LocaleMiddleware', 

    # 4. Common
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
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
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}


# --- PASSWORD VALIDATION ---
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

# --- AUTHENTICATION BACKENDS ---
# Говорим Django сначала проверять наш кастомный бекенд (Email + Username),
# а если не вышло — пробовать стандартный.
AUTHENTICATION_BACKENDS = [
    'gat_exam.backends.EmailOrUsernameModelBackend',  # 👈 Твой класс из backends.py
    'django.contrib.auth.backends.ModelBackend',      # Стандартный (на всякий случай)
]

# --- INTERNATIONALIZATION (I18N) ---
LANGUAGE_CODE = 'ru' # По умолчанию Русский

TIME_ZONE = 'Asia/Dushanbe' # Установил часовой пояс Таджикистана

USE_I18N = True
USE_TZ = True

# Поддерживаемые языки
LANGUAGES = [
    ('ru', 'Russian'),
    ('en', 'English'),
    ('tj', 'Tajik'), 
]


# --- STATIC & MEDIA ---
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# --- CORS SETTINGS (Fix Network Error) ---
# В режиме разработки разрешаем ВСЁ.
CORS_ALLOW_ALL_ORIGINS = True 
CORS_ALLOW_CREDENTIALS = True

# 🔥 ВАЖНО: Разрешаем заголовки авторизации, чтобы браузер пропускал токен
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]


# --- REST FRAMEWORK ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

# --- AUTH & JWT ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    
    # 🔥 ИСПРАВЛЕНИЕ: Разрешаем и 'Bearer' (стандарт), и 'JWT' (твой React)
    'AUTH_HEADER_TYPES': ('Bearer', 'JWT'), 
}

# --- 🔥 DJOSER SETTINGS (ГЛАВНОЕ ИСПРАВЛЕНИЕ) ---
DJOSER = {
    'LOGIN_FIELD': 'username',
    'USER_CREATE_PASSWORD_RETYPE': True,
    'SERIALIZERS': {
        'user_create': 'gat_exam.serializers.UserSerializer',
        'user': 'gat_exam.serializers.UserSerializer',
        'current_user': 'gat_exam.serializers.UserSerializer',
    },
}


# --- JAZZMIN (ADMIN UI) ---
JAZZMIN_SETTINGS = {
    "site_title": "Premium GAT Admin",
    "site_header": "GAT Premium",
    "site_brand": "GAT Control",
    "welcome_sign": "Добро пожаловать в Центр Управления",
    "copyright": "Premium GAT Ltd",
    "search_model": ["auth.User", "gat_exam.Student"], 
    
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user-shield",
        "auth.Group": "fas fa-users",
        "gat_exam.School": "fas fa-school",
        "gat_exam.Student": "fas fa-user-graduate",
        "gat_exam.Exam": "fas fa-file-signature",
        "gat_exam.Question": "fas fa-question",
    },

    "topmenu_links": [
        {"name": "Главная", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Открыть Сайт", "url": "http://localhost:5173", "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly", # Темная тема
    "dark_mode_theme": "darkly",
}
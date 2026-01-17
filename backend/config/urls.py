from django.contrib import admin
from django.urls import path, include
from django.conf import settings             # <--- Импорт настроек
from django.conf.urls.static import static   # <--- Импорт функции для раздачи файлов

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Авторизация (Djoser)
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # 🔥 ВАЖНО: Добавляем префикс 'api/'
    # Теперь все ссылки из gat_exam будут начинаться с /api/
    path('api/', include('gat_exam.urls')),
]

# 👇 МАГИЯ: Если мы в режиме разработки (DEBUG=True), то Django сам отдает картинки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
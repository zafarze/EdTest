# backend/gat_exam/middleware.py

from django.utils import timezone
from django.contrib.auth.models import User
from django.utils.deprecation import MiddlewareMixin
from datetime import timedelta
from rest_framework_simplejwt.authentication import JWTAuthentication

class ActiveUserMiddleware:
    """
    Middleware для отслеживания активности пользователей (last_login).
    Работает и с Session Auth, и с JWT (DRF).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Сначала пытаемся получить пользователя стандартным путем
        user = request.user

        # 2. Если пользователь не залогинен (AnonymousUser), но есть JWT токен
        if not user.is_authenticated:
            try:
                # Пытаемся вручную аутентифицировать через JWT
                # Это нужно, так как DRF делает это позже (во View), 
                # а нам нужно знать юзера прямо сейчас для middleware.
                auth = JWTAuthentication()
                # authenticate возвращает (user, token) или None
                auth_result = auth.authenticate(request)
                
                if auth_result:
                    user, token = auth_result
                    request.user = user # Присваиваем юзера запросу
            except Exception:
                # Если токен невалиден или его нет — просто игнорируем
                pass

        # 3. Обновляем last_login (с троттлингом в 1 минуту)
        if user and user.is_authenticated:
            now = timezone.now()
            
            # Проверка, чтобы не спамить UPDATE-запросами в БД на каждый клик
            if not user.last_login or (now - user.last_login) > timedelta(minutes=1):
                # 🔥 ВАЖНО: Используем .update(), а не .save()
                # .save() вызывает сигналы (post_save), которые у нас тяжелые (синхронизация профиля).
                # .update() пишет напрямую в SQL и игнорирует сигналы. Это оптимизация.
                User.objects.filter(pk=user.pk).update(last_login=now)

        # 4. Передаем запрос дальше по цепочке
        response = self.get_response(request)
        return response
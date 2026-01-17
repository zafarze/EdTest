# backend/gat_exam/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Разрешает вход и по username, и по email.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        try:
            # Ищем юзера, у которого username совпадает ИЛИ email совпадает
            user = User.objects.get(Q(username=username) | Q(email=username))
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            # Если вдруг два юзера с одинаковым email (бывает при плохой валидации),
            # берем первого, но лучше поставить unique=True на email в модели
            user = User.objects.filter(Q(username=username) | Q(email=username)).order_by('id').first()

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
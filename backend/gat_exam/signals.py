import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Student
from django.db.models.signals import m2m_changed, post_save
from django.core.cache import cache
from .models import Exam

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------
# ⚠️ ВНИМАНИЕ:
# Функция sync_student_to_user была УДАЛЕНА.
#
# Раньше она автоматически создавала User при сохранении Student.
# Теперь это делается безопасно через AuthService (см. services/auth_service.py),
# так как мы удалили поле password из модели Student для безопасности.
# -------------------------------------------------------------------------

@receiver(post_delete, sender=Student)
def delete_linked_user(sender, instance, **kwargs):
    """
    Автоматически деактивирует (Soft Delete) пользователя Django,
    если удалена запись Студента.
    """
    if instance.username:
        try:
            # Ищем пользователя по username
            u = User.objects.get(username=instance.username)
            
            # Не удаляем полностью, а только отключаем вход
            # Это сохраняет целостность данных (историю экзаменов и т.д.)
            u.is_active = False 
            u.save()
            
            logger.info(f"🚫 [Signal] Пользователь {u.username} деактивирован после удаления студента.")
        except User.DoesNotExist:
            # Если пользователя уже нет, ничего страшного
            pass

@receiver(m2m_changed, sender=Exam.questions.through)
def invalidate_exam_cache(sender, instance, **kwargs):
    """
    Если к экзамену добавили/удалили вопросы -> сбрасываем кэш структуры.
    """
    cache_key = f"exam_sections_{instance.id}"
    cache.delete(cache_key)
    print(f"🧹 Cache cleared for Exam {instance.id}")

@receiver(post_save, sender=Exam)
def invalidate_exam_update(sender, instance, **kwargs):
    """
    Если изменили название или настройки экзамена -> сбрасываем кэш.
    """
    cache_key = f"exam_sections_{instance.id}"
    cache.delete(cache_key)
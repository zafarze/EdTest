# backend/gat_exam/services/access_service.py

from ..models import School

class AccessService:
    """
    Сервис для управления областью видимости данных (Row-Level Permissions).
    Определяет, какие объекты может видеть конкретный пользователь.
    """

    @staticmethod
    def get_available_schools(user, base_queryset=None):
        """
        Возвращает QuerySet школ, доступных пользователю.
        """
        if base_queryset is None:
            base_queryset = School.objects.all()

        # 0. Анонимы не видят ничего
        if not user.is_authenticated:
            return base_queryset.none()

        # 1. Superuser видит всё
        if user.is_superuser:
            return base_queryset

        # Проверяем профиль
        if not hasattr(user, 'profile'):
            return base_queryset.none()
            
        role = user.profile.role

        # 2. Глобальные роли видят всё
        global_roles = ['admin', 'general_director', 'ceo', 'expert']
        if role in global_roles:
            return base_queryset

        # 3. Локальные роли (Директор, Завуч, Учитель) видят только свои школы
        # Собираем ID школ, к которым привязан пользователь
        allowed_ids = set()
        
        # Основная школа
        if user.profile.school:
            allowed_ids.add(user.profile.school.id)
            
        # Прикрепленные школы (Many-to-Many)
        # values_list возвращает список ID быстрее, чем перебор объектов
        assigned_ids = user.profile.assigned_schools.values_list('id', flat=True)
        allowed_ids.update(assigned_ids)

        if not allowed_ids:
            return base_queryset.none()

        return base_queryset.filter(id__in=allowed_ids)
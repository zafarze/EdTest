from rest_framework import permissions

class IsVipOrReadOnly(permissions.BasePermission):
    """
    👑 УРОВЕНЬ 1: ГЛОБАЛЬНЫЙ КОНТРОЛЬ (RBAC)
    Используется для: Учебные годы, Четверти, Настройки системы, Предметы (создание).
    
    Разрешает:
    1. Читать (GET) -> Всем авторизованным.
    2. Изменять (POST, PUT, DELETE) -> Только VIP:
       - Superuser
       - Role: 'admin' (Админ платформы)
       - Role: 'general_director' (Гендиректор)
    """
    
    def has_permission(self, request, view):
        # Чтение разрешено всем авторизованным
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Изменение - только VIP
        return self._is_vip(request.user)

    def _is_vip(self, user):
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser:
            return True

        profile = getattr(user, 'profile', None)
        if not profile:
            return False

        # Роли, которым можно управлять глобальными настройками
        # (добавил 'ceo' и 'founder' на всякий случай, если ты их добавишь в модель)
        vip_roles = ['admin', 'general_director', 'ceo', 'founder']
        return profile.role in vip_roles


class IsSchoolDirectorOrReadOnly(permissions.BasePermission):
    """
    🏫 УРОВЕНЬ 2: УПРАВЛЕНИЕ ШКОЛОЙ
    Используется для: Ученики, Классы, Редактирование школы.
    
    Разрешает изменение, только если ты:
    1. Глобальный Админ (VIP)
    2. Или Директор ИМЕННО ЭТОЙ школы (проверяет и основную, и привязанные)
    """
    def has_object_permission(self, request, view, obj):
        # Чтение - всем
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Админы и Директора могут удалять всё
        user = request.user
        if user.is_superuser: return True
        if user.profile.role in ['admin', 'general_director', 'director', 'deputy']: return True
        
        # Учитель может менять ТОЛЬКО СВОЁ (если в модели есть поле author)
        # Если поля author нет, то можно пропустить эту проверку
        if hasattr(obj, 'author'):
             return obj.author == user
             
        return True

        # 2. Директору - только в СВОИХ школах
        if profile.role == 'director':
            
            # А) Если редактируем саму ШКОЛУ (obj == School)
            if obj.__class__.__name__ == 'School':
                # Проверяем основную школу
                if profile.school and obj == profile.school:
                    return True
                # Проверяем список прикрепленных школ (M2M)
                if obj in profile.assigned_schools.all():
                    return True
            
            # Б) Если редактируем вложенный объект (Ученик, Класс) -> obj.school
            elif hasattr(obj, 'school'):
                # Проверяем основную школу
                if profile.school and obj.school == profile.school:
                    return True
                # Проверяем список прикрепленных школ
                if obj.school in profile.assigned_schools.all():
                    return True
                
        return False


class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    📚 УРОВЕНЬ 3: КОНТЕНТ
    Используется для: Вопросы, Экзамены, Темы.
    
    Разрешает создавать контент учителям и выше.
    Ученики могут только смотреть (и то, если разрешено во Views).
    """
    def has_permission(self, request, view):
        # Чтение - всем авторизованным (ученикам нужно видеть вопросы на экзамене)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
            
        user = request.user
        if user.is_superuser: return True
        
        profile = getattr(user, 'profile', None)
        if not profile: return False
        
        # Кто может создавать/менять контент
        allowed_roles = ['admin', 'general_director', 'director', 'deputy', 'expert', 'teacher']
        return profile.role in allowed_roles
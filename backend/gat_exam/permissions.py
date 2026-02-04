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
       - Role: 'ceo', 'founder'
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

        # Безопасное получение профиля
        if not hasattr(user, 'profile'):
            return False

        profile = user.profile

        # Роли, которым можно управлять глобальными настройками
        vip_roles = ['admin', 'general_director', 'ceo', 'founder']
        return profile.role in vip_roles


class IsSchoolDirectorOrReadOnly(permissions.BasePermission):
    """
    🏫 УРОВЕНЬ 2: УПРАВЛЕНИЕ ШКОЛОЙ
    Используется для: Ученики, Классы, Редактирование школы.
    
    Разрешает изменение, только если ты:
    1. Глобальный Админ (VIP) - доступ ко всем школам.
    2. Директор/Зам - доступ ТОЛЬКО к своим школам.
    """
    def has_object_permission(self, request, view, obj):
        # Чтение - всем авторизованным (безопасные методы)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
            
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser: 
            return True
            
        if not hasattr(user, 'profile'):
            return False
            
        profile = user.profile
        
        # 1. ГЛОБАЛЬНЫЕ АДМИНЫ (Видят и правят всё)
        if profile.role in ['admin', 'general_director', 'ceo', 'founder']: 
            return True
        
        # 2. ДИРЕКТОРА И ЗАМЫ (Только своё)
        if profile.role in ['director', 'deputy']:
            
            # А) Если редактируем саму ШКОЛУ (obj == School)
            if obj.__class__.__name__ == 'School':
                # Это моя основная школа?
                if profile.school and obj == profile.school:
                    return True
                # Это одна из моих прикрепленных школ?
                if obj in profile.assigned_schools.all():
                    return True
            
            # Б) Если редактируем вложенный объект (Ученик, Класс, Экзамен)
            # У объекта должно быть поле 'school'
            elif hasattr(obj, 'school'):
                target_school = obj.school
                # Проверяем основную школу
                if profile.school and target_school == profile.school:
                    return True
                # Проверяем прикрепленные школы
                if target_school in profile.assigned_schools.all():
                    return True

        # 3. УЧИТЕЛЯ (Автор контента)
        # Если это личный контент (например, тема или вопрос), и юзер - автор
        if hasattr(obj, 'author'):
             return obj.author == user
             
        return False


class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    📚 УРОВЕНЬ 3: КОНТЕНТ
    Используется для: Вопросы, Экзамены, Темы (создание).
    
    Разрешает создавать контент учителям и выше.
    """
    def has_permission(self, request, view):
        # Чтение - всем авторизованным
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
            
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser: return True
        
        if not hasattr(user, 'profile'): return False
        
        # Кто может создавать/менять контент
        allowed_roles = ['admin', 'general_director', 'director', 'deputy', 'expert', 'teacher']
        return user.profile.role in allowed_roles


class IsTopicManagerOrReadOnly(permissions.BasePermission):
    """
    🔐 ПРАВИЛА ДОСТУПА К ТЕМАМ:
    1. Чтение (GET) -> Разрешено всем авторизованным (учителя, директора должны видеть план).
    2. Изменение (POST, PUT, DELETE) ->
       - Admin / Gen. Director: Полный доступ.
       - Expert: Только если тема относится к его ПРЕДМЕТУ (assigned_subjects).
       - Остальные (Director, Teacher): ЗАПРЕЩЕНО.
    """

    def has_permission(self, request, view):
        # 1. Разрешаем чтение всем (SAFE_METHODS = GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # 2. Проверяем права на запись (POST, PUT, DELETE)
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser:
            return True

        if not hasattr(user, 'profile'):
            return False
            
        role = user.profile.role
        
        # VIP (видят и правят всё)
        if role in ['admin', 'general_director', 'ceo', 'founder']:
            return True
            
        # Эксперт (может создавать, но валидация предмета будет в has_object_permission)
        if role == 'expert':
            return True
            
        # Директорам и учителям запрещено менять темы (глобальный стандарт)
        return False

    def has_object_permission(self, request, view, obj):
        # Чтение разрешено всем
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if user.is_superuser: return True
        
        profile = user.profile
        role = profile.role

        # 1. VIP
        if role in ['admin', 'general_director', 'ceo', 'founder']:
            return True

        # 2. ЭКСПЕРТ
        if role == 'expert':
            # 🔥 ВАЖНОЕ ИСПРАВЛЕНИЕ:
            # Проверяем, входит ли предмет темы в список assigned_subjects (Many-to-Many) эксперта
            return obj.subject in profile.assigned_subjects.all()
        
        return False


class IsQuestionSecurityClearance(permissions.BasePermission):
    """
    🔐 УРОВЕНЬ 4: СЕКРЕТНЫЙ ДОСТУП (Банк Вопросов)
    
    Самый строгий уровень.
    1. Admin / Gen. Director / CEO -> Полный доступ.
    2. Expert -> Доступ есть (но фильтрация данных будет в View).
    3. Director / Teacher / Deputy -> ⛔ ДОСТУП ЗАПРЕЩЕН (403 Forbidden).
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser: return True
        
        if not hasattr(user, 'profile'): return False
        
        role = user.profile.role
        
        # Разрешаем только ЭЛИТЕ и ЭКСПЕРТАМ
        allowed_roles = ['admin', 'general_director', 'ceo', 'founder', 'expert']
        
        return role in allowed_roles
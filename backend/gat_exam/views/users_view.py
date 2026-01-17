from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

# Импорты наших моделей и сериализаторов
from ..serializers import UserSerializer
from ..models import School, Subject, StudentClass

# --- 1. ПАГИНАЦИЯ ---
class StandardResultsSetPagination(PageNumberPagination):
    """
    По умолчанию выдает 20 записей.
    Фронтенд может запросить больше через ?page_size=50, но не более 100.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserViewSet(viewsets.ModelViewSet):
    """
    Premium ViewSet для управления пользователями (HR-модуль).
    Включает:
    1. Пагинацию и Фильтрацию.
    2. RBAC (Role Based Access Control).
    3. Soft Delete.
    4. Управление сложными правами (assign_permission).
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    # --- 2. ФИЛЬТРЫ И ПОИСК ---
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'profile__phone']
    filterset_fields = ['profile__school', 'profile__role', 'is_active']

    def get_queryset(self):
        """
        Умная фильтрация "Свой-Чужой".
        """
        user = self.request.user
        
        # Оптимизация: сразу тянем профиль и основную школу
        # Также prefetch_related для many-to-many полей, чтобы не тормозило при выдаче прав
        queryset = User.objects.select_related('profile', 'profile__school') \
                               .prefetch_related('profile__assigned_schools', 
                                                 'profile__assigned_subjects', 
                                                 'profile__assigned_classes') \
                               .all().order_by('-date_joined')

        # 1. Админ/Суперюзер -> Видит всех
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'admin'):
            return queryset
        
        # 2. Директор -> Видит только сотрудников своей школы
        if hasattr(user, 'profile') and user.profile.role == 'director':
            my_school = user.profile.school
            if not my_school:
                return User.objects.none()
            
            # Исключаем админов и суперюзеров из списка директора
            return queryset.filter(
                profile__school=my_school
            ).exclude(is_superuser=True).exclude(profile__role='admin')
            
        # 3. Остальные -> Видят только себя
        return queryset.filter(id=user.id)

    def perform_create(self, serializer):
        """
        Создание пользователя с проверками безопасности.
        """
        request_user = self.request.user
        profile_data = self.request.data.get('profile', {})
        requested_role = profile_data.get('role', 'teacher')

        # Запрет на создание админов
        if not request_user.is_superuser and requested_role == 'admin':
             raise PermissionDenied("У вас нет прав создавать Администраторов.")
        
        # Сохраняем
        user = serializer.save()

        # Авто-привязка к школе Директора
        if hasattr(request_user, 'profile') and request_user.profile.role == 'director':
            if request_user.profile.school:
                user.profile.school = request_user.profile.school
                user.profile.save()

    def perform_destroy(self, instance):
        """
        Soft Delete (Деактивация) вместо удаления.
        """
        if instance == self.request.user:
            raise PermissionDenied("Нельзя заблокировать самого себя.")
        
        if instance.is_superuser:
            raise PermissionDenied("Нельзя заблокировать Супер-Админа.")
            
        # Защита иерархии для Директора
        current_user = self.request.user
        if hasattr(current_user, 'profile') and current_user.profile.role == 'director':
            if instance.profile.role in ['admin', 'director']:
                raise PermissionDenied("Директор не может блокировать равных себе или старших.")

        # Деактивация
        instance.is_active = False
        instance.save()

    # --- 🔥 НОВЫЙ МЕТОД: УПРАВЛЕНИЕ ПРАВАМИ ---
    @action(detail=True, methods=['post'], url_path='assign-permission')
    def assign_permission(self, request, pk=None):
        """
        Эндпоинт для добавления/удаления зон ответственности.
        URL: POST /api/users/{id}/assign-permission/
        Body:
        {
            "type": "school" | "subject" | "class",
            "id": 123,
            "action": "add" | "remove"
        }
        """
        user = self.get_object()
        if not hasattr(user, 'profile'):
            return Response({"error": "У пользователя нет профиля"}, status=status.HTTP_400_BAD_REQUEST)
            
        profile = user.profile
        
        item_type = request.data.get('type')
        item_id = request.data.get('id')
        action_type = request.data.get('action', 'add') # по умолчанию add

        try:
            # 1. Школы (Директора, Учителя-сетевики)
            if item_type == 'school':
                obj = get_object_or_404(School, pk=item_id)
                if action_type == 'add':
                    profile.assigned_schools.add(obj)
                else:
                    profile.assigned_schools.remove(obj)

            # 2. Предметы (Эксперты)
            elif item_type == 'subject':
                obj = get_object_or_404(Subject, pk=item_id)
                if action_type == 'add':
                    profile.assigned_subjects.add(obj)
                else:
                    profile.assigned_subjects.remove(obj)

            # 3. Классы (Классные руководители)
            elif item_type == 'class':
                obj = get_object_or_404(StudentClass, pk=item_id)
                if action_type == 'add':
                    profile.assigned_classes.add(obj)
                else:
                    profile.assigned_classes.remove(obj)
            
            else:
                return Response({"error": f"Неизвестный тип объекта: {item_type}"}, status=status.HTTP_400_BAD_REQUEST)
                
            # Сохраняем изменения (для ManyToMany save() вызывается автоматически при add/remove, но для надежности можно тронуть профиль)
            profile.save()
            
            # Возвращаем обновленные данные пользователя, чтобы React перерисовал интерфейс
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
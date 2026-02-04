from rest_framework import viewsets, filters, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

# Импорты наших моделей и сериализаторов
from ..serializers import UserSerializer
from ..models import School, Subject, StudentClass

# --- 0. КАСТОМНЫЕ ПРАВА ---
class IsGlobalAdmin(BasePermission):
    """
    Разрешает доступ только Суперюзеру или пользователю с ролью 'admin'.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (
            hasattr(request.user, 'profile') and request.user.profile.role == 'admin'
        )

# --- 1. ПАГИНАЦИЯ ---
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'profile__phone']
    filterset_fields = ['profile__school', 'profile__role', 'is_active']

    def get_permissions(self):
        # Опасные действия только для Админов
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'assign_permission']:
            return [IsGlobalAdmin()]
        # Чтение доступно всем (но список фильтруется в get_queryset)
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        # 🔥 ИСПРАВЛЕНИЕ: Исключаем студентов из общего списка пользователей
        queryset = User.objects.select_related('profile', 'profile__school') \
                               .prefetch_related('profile__assigned_schools', 
                                                 'profile__assigned_subjects', 
                                                 'profile__assigned_classes') \
                               .exclude(profile__role='student') \
                               .all().order_by('-date_joined')

        # 1. Если Админ — видит всех (кроме студентов, которых мы исключили выше)
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'admin'):
            return queryset
        
        # 2. Если Директор — видит сотрудников своей школы
        if hasattr(user, 'profile') and user.profile.role == 'director':
            my_school = user.profile.school
            if not my_school:
                return User.objects.none()
            # Директор видит учителей своей школы, но не видит Супер-Админов и других Админов
            return queryset.filter(profile__school=my_school).exclude(is_superuser=True).exclude(profile__role='admin')
            
        # 3. Остальные видят только себя
        return queryset.filter(id=user.id)

    def perform_create(self, serializer):
        request_user = self.request.user
        user = serializer.save()
        if hasattr(request_user, 'profile') and request_user.profile.role == 'director':
             if request_user.profile.school:
                user.profile.school = request_user.profile.school
                user.profile.save()

    def perform_destroy(self, instance):
        """
        🔥 ИСПРАВЛЕНО: Теперь это НАСТОЯЩЕЕ удаление из базы.
        """
        if instance == self.request.user:
            raise PermissionDenied("Нельзя удалить самого себя.")
        if instance.is_superuser:
            raise PermissionDenied("Нельзя удалить Супер-Админа.")
        
        # Полное удаление (вместо instance.is_active = False)
        instance.delete()

    # --- ДОП. МЕТОДЫ ---
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Возвращает данные текущего пользователя.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    # --- УПРАВЛЕНИЕ ПРАВАМИ ---
    @action(detail=True, methods=['post'], url_path='assign-permission')
    def assign_permission(self, request, pk=None):
        user = self.get_object()
        if not hasattr(user, 'profile'):
            return Response({"error": "У пользователя нет профиля"}, status=status.HTTP_400_BAD_REQUEST)
            
        profile = user.profile
        item_type = request.data.get('type')
        item_id = request.data.get('id')
        action_type = request.data.get('action', 'add') 

        try:
            if item_type == 'school':
                obj = get_object_or_404(School, pk=item_id)
                if action_type == 'add': profile.assigned_schools.add(obj)
                else: profile.assigned_schools.remove(obj)

            elif item_type == 'subject':
                obj = get_object_or_404(Subject, pk=item_id)
                if action_type == 'add': profile.assigned_subjects.add(obj)
                else: profile.assigned_subjects.remove(obj)

            elif item_type == 'class':
                obj = get_object_or_404(StudentClass, pk=item_id)
                if action_type == 'add': profile.assigned_classes.add(obj)
                else: profile.assigned_classes.remove(obj)
            
            else:
                return Response({"error": f"Неизвестный тип объекта: {item_type}"}, status=status.HTTP_400_BAD_REQUEST)
                
            profile.save()
            return Response(self.get_serializer(user).data)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
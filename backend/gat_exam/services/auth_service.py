from django.contrib.auth.models import User
from django.db import transaction
from ..models import Student, UserProfile

class AuthService:
    """
    Сервис для безопасного управления пользователями и их ролями.
    """

    @staticmethod
    def create_student(validated_data, password=None):
        """
        Создает Студента И (если нужно) связанного User'а в одной транзакции.
        """
        username = validated_data.get('username')
        
        # Если пароля нет, генерируем случайный
        if not password:
            password = User.objects.make_random_password()

        with transaction.atomic():
            # 1. Создаем или получаем Django User
            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    'first_name': validated_data.get('first_name_ru', ''),
                    'last_name': validated_data.get('last_name_ru', ''),
                    'is_active': (validated_data.get('status', 'active') == 'active')
                }
            )
            
            # 2. Устанавливаем пароль (ТОЛЬКО ЕСЛИ СОЗДАН ИЛИ ПЕРЕДАН НОВЫЙ)
            if created or password:
                user.set_password(password)
                user.save()

            # 3. Гарантируем роль 'student'
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.role != 'student':
                profile.role = 'student'
                profile.school = validated_data.get('school')
                profile.save()

            # 4. Создаем запись Student
            student_data = validated_data.copy()
            
            # Создаем студента
            student = Student.objects.create(**student_data)
            
            return student
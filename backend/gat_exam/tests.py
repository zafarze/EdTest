from django.test import TestCase
from django.contrib.auth.models import User
from .models import School, StudentClass, Student, Question
# Импортируем наш новый сервис авторизации
from .services.auth_service import AuthService  

class CoreLogicTests(TestCase):
    
    def setUp(self):
        """
        Подготовка данных перед КАЖДЫМ тестом.
        """
        self.school = School.objects.create(
            name="Тестовая Школа №1",
            custom_id="TEST001"
        )
        self.student_class = StudentClass.objects.create(
            school=self.school,
            grade_level=10,
            section="A"
        )

    def test_student_auth_service_creation(self):
        """
        ✅ ПРАВИЛЬНЫЙ ТЕСТ: 
        Проверяем создание студента через AuthService.
        """
        username = "test_student_service"
        password = "secret_password_123"
        
        # Эмулируем данные, которые приходят с фронтенда
        student_data = {
            'school': self.school,
            'student_class': self.student_class,
            'first_name_ru': "Иван",
            'last_name_ru': "Сервисов",
            'username': username,
            'status': 'active'
        }

        # 🔥 Вызываем сервис (вместо Student.objects.create)
        student = AuthService.create_student(student_data, password=password)

        # 1. Проверяем, создался ли User в Django
        self.assertTrue(User.objects.filter(username=username).exists())
        
        user = User.objects.get(username=username)
        
        # 2. Проверяем пароль
        self.assertTrue(user.check_password(password))
        
        # 3. Проверяем профиль
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.role, 'student')
        
        # 4. Проверяем связь
        self.assertEqual(student.username, user.username)

    def test_question_default_points(self):
        """Проверяем авто-подсчет баллов (Question.save)"""
        q = Question.objects.create(
            text="Сложный вопрос?",
            difficulty="hard",
            question_type="single"
        )
        # hard = 3 балла
        self.assertEqual(q.points, 3)

    def test_school_slug_generation(self):
        self.assertEqual(self.school.slug, "testovaya-shkola-1")
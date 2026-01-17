import os
import django

# 1. Настраиваем окружение Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from gat_exam.models import Student, UserProfile

def create_users_for_students():
    User = get_user_model()
    students = Student.objects.all()

    print(f"🚀 Найдено {students.count()} учеников. Проверяем доступы...")

    count_created = 0
    count_exist = 0

    for s in students:
        # Генерируем username, если его нет
        if not s.username:
            s.username = f"student_{s.id}"
            s.save() # Сохраняем, чтобы в базе тоже обновилось
        
        # Проверяем, есть ли такой User в системе входа
        if not User.objects.filter(username=s.username).exists():
            # Если пароля нет, ставим 12345678
            pwd = s.password if s.password else "12345678"
            
            # Создаем пользователя для входа
            try:
                u = User.objects.create_user(
                    username=s.username,
                    password=pwd,
                    first_name=s.first_name_ru,
                    last_name=s.last_name_ru
                )
                
                # Создаем профиль с ролью
                UserProfile.objects.get_or_create(user=u, role='student', school=s.school)
                
                print(f"✅ [СОЗДАН] {s.first_name_ru} -> Логин: {s.username} | Пароль: {pwd}")
                count_created += 1
            except Exception as e:
                print(f"❌ Ошибка при создании {s.username}: {e}")
        else:
            # Если юзер есть, просто убедимся, что у него есть профиль
            user_obj = User.objects.get(username=s.username)
            if not hasattr(user_obj, 'profile'):
                UserProfile.objects.create(user=user_obj, role='student', school=s.school)
                print(f"🔧 [FIX] Добавлен профиль для {s.username}")
            
            count_exist += 1

    print("-" * 30)
    print(f"🎉 Готово! Создано новых: {count_created}. Уже были: {count_exist}.")

if __name__ == '__main__':
    create_users_for_students()
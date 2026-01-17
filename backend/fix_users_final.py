import os
import django

# Настройка окружения
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from gat_exam.models import Student, UserProfile

def fix_users_final():
    User = get_user_model()
    students = Student.objects.all()

    print(f"🚀 Запуск финального исправления для {students.count()} учеников...")

    for s in students:
        # 1. Генерируем логин, если нет
        if not s.username:
            s.username = f"student_{s.id}"
            s.save()

        # 2. Ищем или создаем User
        user = None
        is_new_user = False
        
        try:
            user = User.objects.get(username=s.username)
        except User.DoesNotExist:
            # Если юзера нет - создаем
            pwd = s.password if s.password else "12345678"
            user = User.objects.create_user(
                username=s.username,
                password=pwd,
                first_name=s.first_name_ru,
                last_name=s.last_name_ru
            )
            is_new_user = True

        # 3. 🔥 ИСПРАВЛЕНИЕ: Работаем с Профилем
        # Мы не создаем новый, мы получаем тот, который создал Сигнал Django
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            # На всякий случай, если сигнала не было
            profile = UserProfile.objects.create(user=user)

        # 4. Обновляем данные профиля
        profile.role = 'student'
        profile.school = s.school
        profile.save()

        if is_new_user:
            print(f"✅ [Создан] {s.username}")
        else:
            print(f"🔄 [Обновлен] {s.username}")

    print("-" * 30)
    print("🎉 Все исправлено! Теперь можно входить.")

if __name__ == '__main__':
    fix_users_final()
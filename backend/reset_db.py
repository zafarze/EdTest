import os
import django
from django.db import connection

# Настраиваем окружение Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def nuclear_reset():
    print("☢️  НАЧИНАЕМ ПОЛНЫЙ СБРОС БАЗЫ ДАННЫХ...")
    
    with connection.cursor() as cursor:
        # Эта команда удаляет ВСЁ: таблицы, индексы, данные
        cursor.execute("DROP SCHEMA public CASCADE;")
        # Эта команда создает чистую схему заново
        cursor.execute("CREATE SCHEMA public;")
    
    print("✅ База данных полностью очищена! Она девственно чиста.")

if __name__ == "__main__":
    nuclear_reset()
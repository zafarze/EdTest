import pandas as pd
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Создает идеальный Excel файл для теста Smart Import'

    def handle(self, *args, **kwargs):
        # 1. Заголовки (В точности как мы создали предметы)
        # Variant - обязательная колонка!
        data = {
            "Student ID": ["1001", "1002", "NewGuy"],
            "Name": ["Алиев Вали", "Каримов Азиз", "Новенький"],
            "Variant": ["C", "D", "C"], # Варианты, которые мы создали (56 и 57)
        }

        # 2. Добавляем ответы (A, B, C, D)
        # Предметы: Math, Rus, Lit, Hist, Comp
        # Генерируем по 5 вопросов для теста
        subjects = ['Math', 'Rus', 'Lit', 'Hist', 'Comp']
        
        for subj in subjects:
            for i in range(1, 6): # Вопросы с 1 по 5
                col_name = f"{subj}_{i}" # Math_1, Math_2...
                # Ответы: 1-й ученик ставит A, 2-й - B, 3-й - C
                data[col_name] = ["A", "B", "C"]

        # 3. Создаем DataFrame
        df = pd.DataFrame(data)

        # 4. Сохраняем
        filename = "Smart_Import_Test.xlsx"
        df.to_excel(filename, index=False)
        
        self.stdout.write(self.style.SUCCESS(f"✅ Файл создан: {filename}"))
        self.stdout.write(f"📂 Колонки: {list(df.columns)}")
        self.stdout.write("👉 Теперь загрузи этот файл через сайт!")
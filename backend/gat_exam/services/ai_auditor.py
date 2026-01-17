import time
import random

class ExamAuditor:
    """
    Симуляция AI-агента, который проверяет качество экзамена.
    В будущем здесь будет вызов OpenAI API.
    """
    
    @staticmethod
    def audit_exam(exam):
        # 1. Получаем вопросы
        questions = exam.questions.all()
        errors = []
        
        # Эмуляция "раздумий" ИИ
        time.sleep(2) 
        
        # --- ПРОВЕРКА 1: Пустой экзамен ---
        if not questions.exists():
            return {
                "passed": False,
                "message": "Экзамен пуст! Добавьте вопросы перед публикацией."
            }

        # --- ПРОВЕРКА 2: Качество вопросов ---
        for q in questions:
            # Проверка: есть ли правильный ответ? (Для тестов)
            if q.question_type in ['single', 'multiple']:
                correct_choices = q.choices.filter(is_correct=True)
                if not correct_choices.exists():
                    errors.append(f"Вопрос '{q.text[:20]}...' не имеет правильного ответа.")
            
            # Проверка: слишком короткий текст
            if len(q.text) < 5:
                errors.append(f"Вопрос ID {q.id} слишком короткий. Уточните формулировку.")

        # --- РЕЗУЛЬТАТ ---
        if errors:
            return {
                "passed": False,
                "message": "AI нашел ошибки:",
                "errors": errors
            }
        
        return {
            "passed": True,
            "message": "Экзамен прошел проверку качества! Структура идеальна."
        }
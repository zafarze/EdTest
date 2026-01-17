import cv2
import numpy as np
import json
from ..models import Student, Exam, ExamResult, Choice

class GraderService:
    
    @staticmethod
    def process_scan(file_obj):
        try:
            file_bytes = np.frombuffer(file_obj.read(), np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

            if image is None: return {"status": "error", "message": "Не удалось прочитать изображение."}

            # Ищем QR
            qr_data, points = GraderService.find_qr_code(image)
            if not qr_data: return {"status": "error", "message": "QR-код не найден."}

            try:
                data = json.loads(qr_data)
                student = Student.objects.get(id=data.get('uid'))
                exam = Exam.objects.get(id=data.get('eid'))
            except Exception:
                return {"status": "error", "message": "Ошибка данных QR или базы."}

            # Распознаем ответы
            print(f"👀 Начинаю распознавание для: {student.last_name_ru}")
            student_answers, debug_path = GraderService.recognize_answers(image, exam.questions.count() or 20)
            print(f"✅ Распознано ответов: {len(student_answers)}")

            # Сохраняем
            result_obj = GraderService.calculate_and_save(student, exam, student_answers)

            return {
                "status": "success",
                "message": f"Оценка: {result_obj.score}/{result_obj.max_score}",
                "data": {
                    "student": f"{student.last_name_ru} {student.first_name_ru}",
                    "exam": exam.title,
                    "score": result_obj.score,
                    "percent": result_obj.percentage,
                    "details": result_obj.details,
                    "debug_file": debug_path
                }
            }

        except Exception as e:
            return {"status": "error", "message": f"Ошибка: {str(e)}"}

    @staticmethod
    def calculate_and_save(student, exam, raw_answers):
        questions = exam.questions.all().order_by('id')
        score = 0
        max_score = len(questions)
        details = {}
        options_map = ["A", "B", "C", "D"]

        for idx, question in enumerate(questions):
            q_num = str(idx + 1)
            student_ans = raw_answers.get(q_num, None)
            
            # Ищем правильный ответ
            correct_letter = None
            choices = question.choices.all().order_by('id')
            for c_idx, choice in enumerate(choices):
                if choice.is_correct and c_idx < 4:
                    correct_letter = options_map[c_idx]
                    break
            
            is_match = (student_ans == correct_letter)
            if is_match: score += 1
            
            details[q_num] = {
                "student": student_ans,
                "correct": correct_letter,
                "is_match": is_match
            }

        percent = (score / max_score) * 100 if max_score > 0 else 0

        result, _ = ExamResult.objects.update_or_create(
            student=student, exam=exam,
            defaults={'score': score, 'max_score': max_score, 'percentage': round(percent, 2), 'details': details}
        )
        return result

    @staticmethod
    def find_qr_code(image):
        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(image)
        if data: return data, points
        return None, None

    @staticmethod
    def recognize_answers(image, questions_count=20):
        # 1. Подготовка
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

        # 2. Контуры
        cnts, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        question_cnts = []

        # 3. Фильтр (ВЕРНУЛИ 17px и строгую пропорцию)
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            
            # Было 14, стало 17 (чтобы не ловить буквы)
            # Пропорция 0.9-1.1 (строгий круг/квадрат)
            if w >= 17 and h >= 17 and w <= 50 and h <= 50 and 0.9 <= ar <= 1.1:
                question_cnts.append(c)

        # ДИАГНОСТИКА
        print(f"🔎 Найдено потенциальных кружков: {len(question_cnts)} (Ожидаем {questions_count * 4})")

        # 4. Сортировка (Сверху-вниз)
        question_cnts = GraderService.sort_contours(question_cnts, method="top-to-bottom")
        
        expected = questions_count * 4
        # Если нашли лишнее, попробуем взять нижние (так как мусор обычно сверху в заголовке)
        if len(question_cnts) > expected:
            # Эвристика: берем последние 80 элементов (так как вопросы обычно ниже заголовка)
            question_cnts = question_cnts[-expected:] 
            print("⚠️ Отбросили лишние верхние контуры (мусор в шапке)")

        results = {}
        debug_img = image.copy()
        options_map = {0: "A", 1: "B", 2: "C", 3: "D"}

        # 5. Анализ
        for (q, i) in enumerate(range(0, len(question_cnts), 4)):
            row_cnts = question_cnts[i:i + 4]
            if len(row_cnts) < 4: continue

            row_cnts = GraderService.sort_contours(row_cnts, method="left-to-right")
            
            bubbled = None
            max_pixels = 0

            for (j, c) in enumerate(row_cnts):
                mask = np.zeros(thresh.shape, dtype="uint8")
                cv2.drawContours(mask, [c], -1, 255, -1)
                mask = cv2.bitwise_and(thresh, thresh, mask=mask)
                total = cv2.countNonZero(mask)

                if bubbled is None or total > max_pixels:
                    max_pixels = total
                    bubbled = (j, c)

            # Чуть поднял порог (чтобы пустые круги не засчитывались)
            if bubbled and max_pixels > 450:
                idx, best_cnt = bubbled
                results[str(q + 1)] = options_map[idx]
                cv2.drawContours(debug_img, [best_cnt], -1, (0, 255, 0), 3)

        cv2.imwrite("debug_scan_result.jpg", debug_img)
        return results, "debug_scan_result.jpg"

    @staticmethod
    def sort_contours(cnts, method="left-to-right"):
        if not cnts: return []
        reverse = False
        i = 0
        if method == "top-to-bottom" or method == "bottom-to-top": i = 1
        if method == "right-to-left" or method == "bottom-to-top": reverse = True
        
        boundingBoxes = [cv2.boundingRect(c) for c in cnts]
        (cnts, boundingBoxes) = zip(*sorted(zip(cnts, boundingBoxes), key=lambda b: b[1][i], reverse=reverse))
        return cnts
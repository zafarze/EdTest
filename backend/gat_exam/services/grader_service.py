import cv2
import numpy as np
import json
from ..models import Student, Exam, ExamResult

class GraderService:
    
    # Константы для поиска (подбирал под A4 и твои якоря)
    A4_WIDTH_PX = 1240   # Ширина, к которой приводим скан
    A4_HEIGHT_PX = 1754  # Высота A4 при 150 DPI
    
    # Координаты центров якорей на идеальном листе (в PDF координатах, переведенных в пиксели)
    # PDF: A4 (595x842 pt). Якоря: (30,30), (W-40,30), (30, H-40). QR: (W-80, H-80).
    # Масштабируем их к 1240x1754
    SCALE = A4_WIDTH_PX / 595.27
    
    # Целевые точки (куда мы хотим притянуть найденные маркеры)
    # Порядок: [Top-Left, Top-Right (QR), Bottom-Right, Bottom-Left]
    DST_PTS = np.array([
        [35 * SCALE, 35 * SCALE],                # TL (Якорь Верх-Лево)
        [515 * SCALE, 80 * SCALE],               # TR (Центр QR-кода)
        [560 * SCALE, 1719 * SCALE],             # BR (Якорь Низ-Право)
        [35 * SCALE, 1719 * SCALE]               # BL (Якорь Низ-Лево)
    ], dtype="float32")

    @staticmethod
    def process_scan(file_obj):
        try:
            # 1. Читаем файл в OpenCV
            file_bytes = np.frombuffer(file_obj.read(), np.uint8)
            original_image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

            if original_image is None: 
                return {"status": "error", "message": "Не удалось прочитать изображение."}

            print("📸 [1] Фото загружено. Начинаю выравнивание...")

            # 2. ВЫРАВНИВАНИЕ (Perspective Transform)
            aligned_image, debug_align_path = GraderService.align_image(original_image)
            
            # Если выравнивание не удалось, пробуем работать с оригиналом (на страх и риск)
            image_to_scan = aligned_image if aligned_image is not None else original_image

            # 3. Ищем QR-код (теперь на ровном фото это легче)
            qr_data, _ = GraderService.find_qr_code(image_to_scan)
            
            if not qr_data: 
                # Если не нашли на ровном, пробуем на оригинале (вдруг при выравнивании обрезали)
                qr_data, _ = GraderService.find_qr_code(original_image)
                if not qr_data:
                    return {"status": "error", "message": "QR-код не найден. Убедитесь, что фото четкое."}

            try:
                data = json.loads(qr_data)
                student = Student.objects.get(id=data.get('uid'))
                exam = Exam.objects.get(id=data.get('eid'))
            except Exception:
                return {"status": "error", "message": "Неверный формат данных в QR-коде."}

            # 4. РАСПОЗНАВАНИЕ ОТВЕТОВ
            print(f"👀 [2] Сканирую ответы студента: {student.last_name_ru}")
            # Берем кол-во вопросов из экзамена, или 20 по умолчанию
            q_count = exam.questions.count() or 20
            
            student_answers, debug_scan_path = GraderService.recognize_answers(image_to_scan, q_count)
            print(f"✅ [3] Распознано ответов: {len(student_answers)}")

            # 5. РАСЧЕТ И СОХРАНЕНИЕ
            result_obj = GraderService.calculate_and_save(student, exam, student_answers)

            return {
                "status": "success",
                "message": f"Оценка: {result_obj.score} из {result_obj.max_score}",
                "data": {
                    "student": f"{student.last_name_ru} {student.first_name_ru}",
                    "exam": exam.title,
                    "score": result_obj.score,
                    "percent": result_obj.percentage,
                    "debug_files": [debug_align_path, debug_scan_path]
                }
            }

        except Exception as e:
            print(f"❌ Критическая ошибка: {e}")
            return {"status": "error", "message": f"Системная ошибка: {str(e)}"}

    @staticmethod
    def align_image(image):
        """
        Ищет 3 квадрата и QR код, вычисляет матрицу перспективы и выравнивает лист.
        """
        try:
            # Уменьшаем для быстрого поиска контуров
            ratio = image.shape[0] / 800.0
            small = cv2.resize(image, (int(image.shape[1] / ratio), 800))
            
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edged = cv2.Canny(blurred, 50, 200)

            # Ищем контуры
            cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            anchors = []
            
            # Фильтруем контуры, ищем квадраты
            for c in cnts:
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.04 * peri, True)

                # Якорь должен иметь 4 угла
                if len(approx) == 4:
                    (x, y, w, h) = cv2.boundingRect(approx)
                    ar = w / float(h)
                    
                    # Фильтры: размер (не шум и не весь лист) и квадратность (0.8-1.2)
                    if w > 10 and h > 10 and 0.8 <= ar <= 1.2:
                        anchors.append(approx)

            # Нам нужно найти 3 квадрата (якоря). QR код мы найдем отдельно детектором.
            # Если нашли слишком много квадратов, берем самые похожие по площади
            anchors = sorted(anchors, key=cv2.contourArea, reverse=True)[:5] 
            
            # Ищем QR-код на уменьшенном изображении для скорости
            detector = cv2.QRCodeDetector()
            decoded_info, qr_points, _ = detector.detectAndDecode(small)
            
            qr_center = None
            if qr_points is not None:
                # qr_points - это массив углов [[x,y], ...]
                pts = qr_points[0]
                center_x = np.mean([p[0] for p in pts])
                center_y = np.mean([p[1] for p in pts])
                qr_center = np.array([center_x, center_y])
            
            # Если нет QR или нет хотя бы 3 квадратов, выравнивание невозможно
            # (Можно попробовать усложнить логику, но пока вернем оригинал)
            if qr_center is None or len(anchors) < 3:
                print("⚠️ Не нашел достаточно якорей или QR. Пропускаю выравнивание.")
                return None, None

            # --- ЛОГИКА ОПРЕДЕЛЕНИЯ КТО ЕСТЬ КТО ---
            # У нас есть QR (это всегда Верх-Право, если лист не перевернут)
            # И 3 квадрата: TL, BL, BR.
            
            # Переводим координаты в масштаб оригинала
            qr_center_orig = qr_center * ratio
            
            found_anchors = []
            for a in anchors[:3]: # Берем 3 самых больших квадрата
                M = cv2.moments(a)
                if M["m00"] != 0:
                    cX = int((M["m10"] / M["m00"]) * ratio)
                    cY = int((M["m01"] / M["m00"]) * ratio)
                    found_anchors.append([cX, cY])
            
            if len(found_anchors) < 3: return None, None
            
            # Сортируем: 
            # 1. Считаем расстояния от QR кода до каждого якоря.
            # TL (Верх-Лево) - должен быть ближе всего по X к 0 и Y к 0? Нет, QR справа.
            # Самый далекий от QR - это BL (Низ-Лево).
            # Ближайший по Y к QR (на одном уровне) - это TL (Верх-Лево) (нет, QR справа, TL слева).
            
            # Простой метод: Сортировка по координатам.
            # Но лист может быть повернут.
            # Используем QR как опорную точку Top-Right.
            
            # Собираем все 4 точки: [A, B, C, QR]
            all_points = np.array(found_anchors + [qr_center_orig.tolist()], dtype="float32")
            
            # Нам нужно упорядочить их так, как в DST_PTS: [TL, TR, BR, BL]
            # TR (Top-Right) - это наш QR код.
            
            # Найдем BL (он диагонально противоположен QR) -> Максимальное расстояние от QR
            dists = [np.linalg.norm(np.array(p) - qr_center_orig) for p in found_anchors]
            bl_idx = np.argmax(dists)
            bl_point = found_anchors[bl_idx]
            
            # Остались два якоря: TL и BR.
            # TL находится "слева" от вектора BL -> QR ?
            # Или проще: TL ближе к QR по Y (если лист вертикальный), а BR ближе по X (они на одной вертикали с QR).
            remaining = [p for i, p in enumerate(found_anchors) if i != bl_idx]
            
            # Вектор BL -> QR
            vec_main = qr_center_orig - np.array(bl_point)
            
            # Вектор BL -> P1
            vec_p1 = np.array(remaining[0]) - np.array(bl_point)
            
            # Векторное произведение (Cross product), чтобы понять, слева или справа точка
            cross_prod = np.cross(vec_main, vec_p1) # z-компонента в 2D
            
            # Если лист ориентирован стандартно, TL будет "слева" от диагонали BL-TR.
            # Значит, если cross > 0 (или <0 в зависимости от системы координат), это TL.
            # В OpenCV Y вниз. 
            
            if cross_prod > 0: # P1 это TL (для стандартной системы координат изображения)
                tl_point = remaining[0]
                br_point = remaining[1]
            else:
                br_point = remaining[0]
                tl_point = remaining[1]

            # Собираем итоговый массив source points в правильном порядке
            src_pts = np.array([
                tl_point,
                qr_center_orig,
                br_point,
                bl_point
            ], dtype="float32")

            # Вычисляем матрицу трансформации
            M = cv2.getPerspectiveTransform(src_pts, GraderService.DST_PTS)
            
            # Применяем
            warped = cv2.warpPerspective(image, M, (GraderService.A4_WIDTH_PX, GraderService.A4_HEIGHT_PX))
            
            # Дебаг
            cv2.imwrite("debug_aligned.jpg", warped)
            
            return warped, "debug_aligned.jpg"

        except Exception as e:
            print(f"⚠️ Ошибка выравнивания: {e}")
            return None, None

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
            
            # Правильный ответ
            correct_letter = None
            for c_idx, choice in enumerate(question.choices.all().order_by('id')):
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
        return data, points

    @staticmethod
    def recognize_answers(image, questions_count=20):
        # 1. Подготовка (уже на выровненном изображении)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

        # 2. Поиск кружков
        cnts, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        question_cnts = []

        # Фильтр для кружков (подгоняем под размеры на A4_WIDTH_PX=1240)
        # На листе шириной 1240, кружок будет примерно 20-25px
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            
            # Чуть расширим диапазон, чтобы ловить даже неидеальные круги
            if w >= 18 and h >= 18 and w <= 60 and h <= 60 and 0.85 <= ar <= 1.15:
                question_cnts.append(c)

        # 3. Сортировка (Сверху-вниз)
        question_cnts = GraderService.sort_contours(question_cnts, method="top-to-bottom")
        
        # Обрезаем лишнее (если нашли шум)
        expected = questions_count * 4
        if len(question_cnts) > expected:
            # Берем нижние, так как вопросы идут после шапки
            question_cnts = question_cnts[-expected:] 

        results = {}
        debug_img = image.copy()
        options_map = {0: "A", 1: "B", 2: "C", 3: "D"}

        # 4. Анализ заполненности
        for (q, i) in enumerate(range(0, len(question_cnts), 4)):
            row_cnts = question_cnts[i:i + 4]
            if len(row_cnts) < 4: continue

            # Сортируем слева-направо (A, B, C, D)
            row_cnts = GraderService.sort_contours(row_cnts, method="left-to-right")
            
            bubbled = None
            max_pixels = 0

            for (j, c) in enumerate(row_cnts):
                mask = np.zeros(thresh.shape, dtype="uint8")
                cv2.drawContours(mask, [c], -1, 255, -1)
                mask = cv2.bitwise_and(thresh, thresh, mask=mask)
                total = cv2.countNonZero(mask)

                # Порог закрашенности (нужно тестировать, 500 для размера 1240px - ок)
                if bubbled is None or total > max_pixels:
                    max_pixels = total
                    bubbled = (j, c)

            if bubbled and max_pixels > 550: # Поднял порог, чтобы исключить случайные точки
                idx, best_cnt = bubbled
                results[str(q + 1)] = options_map[idx]
                # Рисуем зеленый кружок вокруг ответа
                cv2.drawContours(debug_img, [best_cnt], -1, (0, 255, 0), 4)
            else:
                # Если ответ не распознан, рисуем красный
                cv2.drawContours(debug_img, row_cnts, -1, (0, 0, 255), 1)

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
import os
import django
import cv2
import numpy as np
import qrcode
import json
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

# 1. Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gat_exam.services.grader_service import GraderService
from gat_exam.models import Student, Exam

def create_fake_scan_image(student_id, exam_id):
    """
    Создает цифровое изображение, имитирующее скан бланка.
    Рисует QR-код, чтобы GraderService мог распознать ученика.
    """
    print("🎨 Рисуем 'виртуальный скан'...")
    
    # 1. Белый лист (A4 пропорции, но меньше разрешение для теста)
    width, height = 1000, 1414
    img = np.ones((height, width, 3), dtype="uint8") * 255
    
    # 2. Генерируем QR код (строго тот формат, что ждет сервис)
    # Формат: {"uid": 1, "eid": 5, "v": "A"}
    qr_payload = json.dumps({"uid": student_id, "eid": exam_id, "v": "A"})
    qr = qrcode.make(qr_payload)
    qr_img = np.array(qr.convert('RGB'))
    
    # 3. Вставляем QR код на "лист" (обычно он справа сверху)
    # Координаты: x=750, y=50
    qr_size = 200
    qr_resized = cv2.resize(qr_img, (qr_size, qr_size))
    
    # Инвертируем цвета (QR должен быть черным на белом), если нужно
    # Но qrcode.make и так делает черное на белом.
    
    y_offset = 50
    x_offset = 750
    img[y_offset:y_offset+qr_size, x_offset:x_offset+qr_size] = qr_resized
    
    # 4. (Опционально) Можно нарисовать черные квадраты-маркеры по углам
    # Но для базового теста QR-кода это не обязательно, если алгоритм ищет QR везде.
    
    return img

def run_test():
    print("🚀 Запуск теста Грейдера (Simulated Scan)...")
    
    # 1. Ищем студента и экзамен, созданных на прошлом шаге
    try:
        student = Student.objects.get(username="test_student_pdf")
        exam = Exam.objects.get(title="MOCK GAT TEST 2026")
        print(f"✅ Найдены: Студент ID={student.id}, Экзамен ID={exam.id}")
    except Exception as e:
        print(f"❌ Ошибка: Данные не найдены. Сначала выполни test_pdf_gen.py! ({e})")
        return

    # 2. Генерируем картинку
    scan_img = create_fake_scan_image(student.id, exam.id)
    
    # 3. Конвертируем numpy-изображение в файл для Django
    # (Кодируем в JPG -> BytesIO -> InMemoryUploadedFile)
    is_success, buffer = cv2.imencode(".jpg", scan_img)
    if not is_success:
        print("❌ Ошибка кодирования изображения")
        return
        
    io_buf = BytesIO(buffer)
    django_file = SimpleUploadedFile(
        name="fake_scan_test.jpg",
        content=io_buf.read(),
        content_type="image/jpeg"
    )

    # 4. 🔥 СКАРМЛИВАЕМ СЕРВИСУ 🔥
    print("📸 Отправляем изображение в GraderService.process_scan()...")
    try:
        result = GraderService.process_scan(django_file)
        
        print("\n" + "="*40)
        print("📊 РЕЗУЛЬТАТ РАСПОЗНАВАНИЯ:")
        print("="*40)
        print(result)
        
        # Проверяем успех
        if result.get('status') == 'error':
            if "QR-код не найден" in result.get('message', ''):
                print("\n❌ ПРОВАЛ: Сервис не увидел QR-код.")
            else:
                print("\n⚠️ ЧАСТИЧНЫЙ УСПЕХ: QR прочитан, но есть другие ошибки (это нормально для пустого листа).")
                print(f"Сообщение сервиса: {result.get('message')}")
        else:
            print("\n🎉 ПОЛНЫЙ УСПЕХ: Бланк распознан идеально!")

    except Exception as e:
        print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА В СЕРВИСЕ: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
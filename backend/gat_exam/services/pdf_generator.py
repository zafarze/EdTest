import io
import qrcode
import json
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

class PDFGenerator:
    def __init__(self):
        self.buffer = io.BytesIO()
        self.p = canvas.Canvas(self.buffer, pagesize=A4)
        self.width, self.height = A4
        
        # --- ШРИФТЫ ---
        # Чтобы писать на Таджикском/Русском, нужно зарегистрировать шрифт.
        # В ПРОДАКШЕНЕ: Скачай Arial.ttf, положи в папку и раскомментируй строки ниже:
        # font_path = os.path.join('gat_exam', 'static', 'fonts', 'Arial.ttf')
        # if os.path.exists(font_path):
        #     pdfmetrics.registerFont(TTFont('Arial', font_path))
        #     self.font_name = 'Arial'
        # else:
        self.font_name = 'Helvetica-Bold' # Helvetica не поддерживает кириллицу, поэтому имена берем английские

    def generate_qr(self, data_dict):
        """Создает картинку QR кода из данных"""
        qr = qrcode.QRCode(box_size=10, border=1)
        # Превращаем JSON {"uid": 1} в строку
        qr.add_data(json.dumps(data_dict))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        return img

    def draw_header(self, student_name, exam_title, variant, qr_data):
        """Рисует шапку: Имя, Экзамен и QR код"""
        
        # 1. QR Код (Справа сверху)
        qr_img = self.generate_qr(qr_data)
        
        # Конвертируем для ReportLab
        side_size = 100
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        
        # Рисуем QR (координаты X, Y - от левого нижнего угла)
        self.p.drawImage(ImageReader(qr_buffer), self.width - 130, self.height - 130, width=side_size, height=side_size)

        # 2. Текст (Слева)
        self.p.setFont(self.font_name, 18)
        self.p.drawString(50, self.height - 50, "GAT PREMIUM EXAM")
        
        self.p.setFont(self.font_name, 12)
        # Убираем None, если имя не заполнено
        clean_name = student_name.replace("None", "").strip()
        self.p.drawString(50, self.height - 80, f"Student: {clean_name}")
        self.p.drawString(50, self.height - 100, f"Exam: {exam_title}")
        self.p.drawString(50, self.height - 120, f"Variant: {variant}")
        
        # Линия разделения
        self.p.line(50, self.height - 140, self.width - 50, self.height - 140)

    def draw_bubble_sheet(self, questions_count=20):
        """Рисует сетку ответов (Кружочки)"""
        start_y = self.height - 180
        start_x = 50
        
        self.p.setFont(self.font_name, 10)
        self.p.drawString(start_x, start_y + 20, "Mark your answers clearly:")

        # Рисуем строки
        for i in range(questions_count):
            y_pos = start_y - (i * 25)
            
            # Номер вопроса
            self.p.drawString(start_x, y_pos, f"{i+1}.")
            
            # Варианты A, B, C, D
            options = ['A', 'B', 'C', 'D']
            for j, opt in enumerate(options):
                x_pos = start_x + 50 + (j * 40)
                
                # Кружочек
                self.p.circle(x_pos + 5, y_pos + 3, 8, stroke=1, fill=0)
                # Буква внутри (опционально, или над кружком)
                self.p.drawString(x_pos + 2, y_pos, opt)

    def create_student_page(self, student, exam, variant):
        """Создает одну страницу PDF для конкретного студента"""
        
        # Данные для QR (минимум байтов для легкого сканирования)
        qr_payload = {
            "uid": student.id,
            "eid": exam.id,
            "v": variant
        }

        # 🔥 ИСПРАВЛЕНИЕ: Собираем имя вручную из полей модели
        # Используем английские имена, так как шрифт Helvetica не понимает кириллицу
        full_name = f"{student.first_name_en} {student.last_name_en}"
        
        # Если английского имени нет, пробуем транслит или просто ID (чтобы не упало)
        if len(full_name.strip()) < 2:
             full_name = f"Student ID: {student.custom_id or student.id}"

        # Рисуем элементы
        self.draw_header(full_name, exam.title, variant, qr_payload)
        
        # Кол-во вопросов берем из экзамена, или 20 по умолчанию
        q_count = 20
        # Проверяем, есть ли у exam атрибут questions_count (через related manager)
        if hasattr(exam, 'questions') and exam.questions.exists():
             q_count = exam.questions.count()
        
        self.draw_bubble_sheet(questions_count=q_count)
        
        # Маркеры по углам (Якоря для выравнивания скана)
        self.p.rect(30, 30, 10, 10, fill=1) # Левый нижний
        self.p.rect(self.width-40, 30, 10, 10, fill=1) # Правый нижний
        self.p.rect(30, self.height-40, 10, 10, fill=1) # Левый верхний
        
        # Конец страницы
        self.p.showPage()

    def get_pdf(self):
        """Возвращает байты готового PDF"""
        self.p.save()
        self.buffer.seek(0)
        return self.buffer
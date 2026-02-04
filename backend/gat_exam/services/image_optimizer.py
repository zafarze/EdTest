from PIL import Image, ImageEnhance, ImageOps
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys

def optimize_image(image_file):
    """
    1. Конвертирует в WebP (минимальный вес).
    2. Улучшает резкость и контраст (для текста).
    3. Уменьшает размер до HD (если он огромный).
    """
    if not image_file:
        return None

    try:
        img = Image.open(image_file)
        
        # Если есть прозрачность (RGBA), заливаем белым фоном (для JPG/WebP)
        if img.mode in ('RGBA', 'LA'):
            background = Image.new(img.mode[:-1], img.size, (255, 255, 255))
            background.paste(img, img.split()[-1])
            img = background
        
        img = img.convert('RGB')

        # 1. СЖАТИЕ РАЗМЕРА (Resize)
        # Если ширина больше 1200px, уменьшаем пропорционально
        if img.width > 1200:
            ratio = 1200 / float(img.width)
            new_height = int((float(img.height) * float(ratio)))
            img = img.resize((1200, new_height), Image.Resampling.LANCZOS)

        # 2. УЛУЧШЕНИЕ КАЧЕСТВА (ДЛЯ ТЕКСТА)
        # Повышаем резкость
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.5) # +50% резкости
        
        # Повышаем контраст (чтобы текст на фото тетради был чернее)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2) # +20% контраста

        # 3. СОХРАНЕНИЕ В WebP
        output = BytesIO()
        img.save(output, format='WebP', quality=80, optimize=True)
        output.seek(0)

        return InMemoryUploadedFile(
            output,
            'ImageField',
            f"{image_file.name.split('.')[0]}.webp",
            'image/webp',
            sys.getsizeof(output),
            None
        )
    except Exception as e:
        print(f"Ошибка оптимизации фото: {e}")
        return image_file # Если ошибка, возвращаем оригинал
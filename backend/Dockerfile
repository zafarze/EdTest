# Используем Python 3.10
FROM python:3.10-slim

# Отключаем буферизацию (чтобы логи сразу были видны)
ENV PYTHONUNBUFFERED True

# Устанавливаем системные библиотеки (для PDF и картинок)
RUN apt-get update && apt-get install -y \
	libgl1-mesa-glx \
	libpango-1.0-0 \
	libpangoft2-1.0-0 \
	libcairo2 \
	libgdk-pixbuf2.0-0 \
	libffi-dev \
	shared-mime-info \
	&& rm -rf /var/lib/apt/lists/*

# Создаем папку приложения
ENV APP_HOME /app
WORKDIR $APP_HOME

# Сначала копируем зависимости (для кэширования)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код
COPY . ./

# Запускаем Gunicorn.
# ВАЖНО: config.wsgi означает, что папка с settings.py называется "config"
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 config.wsgi:application
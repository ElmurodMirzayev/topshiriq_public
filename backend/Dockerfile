# Backend: FastAPI + Telegram bot (aiogram)
FROM python:3.11-slim

# Не создавать .pyc и не буферизировать логи (логи сразу видны в docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Сначала зависимости — так Docker кэширует слой и пересобирает быстрее
COPY requirements.txt .
# python-multipart нужен FastAPI для приёма файлов (загрузка отчётов)
RUN pip install --no-cache-dir -r requirements.txt python-multipart

# Затем весь код backend
COPY . .

EXPOSE 8000

# Запуск API-сервера. Бот запускается отдельным сервисом (см. docker-compose.yml)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

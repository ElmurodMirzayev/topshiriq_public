# 📋 Telegram Mini App — Топшириқлар

## Роли
| Роль | Экран | Статус |
|------|-------|--------|
| Boshliq | Барча топшириқлар | ✅ |
| Admin | Ходимлар рўйхати | ✅ |
| Xodim | Привязка по телефону | ✅ |

## Запуск
```bash
# Backend
cd backend && cp .env.example .env  # заполните BOT_TOKEN, BOSHLIQ_IDS, ADMIN_IDS
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
python bot.py  # в отдельном терминале

# Frontend
cd frontend && npm install && npm start

# ngrok
ngrok http 3000
```

## API
| Метод | URL | Доступ |
|-------|-----|--------|
| POST | /api/auth/login | Все |
| GET | /api/auth/check-binding | Все |
| GET/POST | /api/tasks | Boshliq |
| GET/POST | /api/admin/employees | Admin |
| GET/PUT/DELETE | /api/admin/employees/{id} | Admin |

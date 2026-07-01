# Развёртывание через Docker (Ubuntu 22.04, сервер Kamatera)

Цель: запустить весь проект **одной командой** с автоматическим HTTPS.
После настройки обновление сводится к `docker compose up -d --build`.

---

## Что делает эта сборка

- **backend** — FastAPI (API вашего приложения)
- **bot** — Telegram-бот (aiogram, режим polling — webhook НЕ нужен)
- **web (Caddy)** — раздаёт React-приложение, проксирует запросы к API
  и **сам автоматически получает бесплатный HTTPS-сертификат**
  (не нужен ни nginx, ни certbot вручную).

---

## ⚠️ Шаг 0. Самое важное: DNS и порты

Ваш бот **работал через ngrok**, потому что ngrok сам делал туннель и HTTPS.
**dynv6 — это только DNS** (направляет домен на IP), HTTPS он не делает.
Поэтому Telegram Mini App не открывался. Docker + Caddy это решают.

Но сначала проверьте две вещи (это не код, это сеть):

### 0.1. Домен должен указывать на НОВЫЙ сервер
На скриншоте dynv6 стоит старый IP `114.29.237.215`.
Ваш новый сервер Kamatera имеет IP **`45.126.124.84`**.

Зайдите на dynv6.com → ваша зона `topshiriqbot.dynv6.net` → и убедитесь,
что **IPv4 Address = `45.126.124.84`**. Если стоит старый IP — исправьте его.

Проверить, что домен уже указывает на новый сервер (с любого компьютера):
```bash
ping topshiriqbot.dynv6.net
```
В ответе должен быть `45.126.124.84`. (DNS может обновляться до 5–15 минут.)

### 0.2. Открыть порты 80 и 443
1. В **панели Kamatera** (Firewall / Network) откройте входящие порты `80` и `443` (TCP).
2. На самом сервере (см. Шаг 3) откроем их и в `ufw`.

Порт **80** обязателен — через него Caddy проверяет домен и получает SSL.

---

## Шаг 1. Подключиться к серверу

С вашего компьютера (Windows — используйте PowerShell или PuTTY):
```bash
ssh root@45.126.124.84
```
Введите пароль от сервера (его выдал Kamatera).

---

## Шаг 2. Установить Docker (один раз)

Скопируйте и выполните на сервере:
```bash
curl -fsSL https://get.docker.com | sh
```
Проверка:
```bash
docker --version
docker compose version
```
Обе команды должны показать версии без ошибок.

---

## Шаг 3. Открыть порты в firewall сервера

```bash
ufw allow 22/tcp    # SSH — чтобы не потерять доступ к серверу
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## Шаг 4. Загрузить проект на сервер

Скопируйте всю папку проекта `telegram-mini-app` на сервер (например
через `scp` с вашего компьютера, или `git clone`, если проект в GitHub).

Пример через scp (выполнять на своём компьютере, не на сервере):
```bash
scp -r telegram-mini-app root@45.126.124.84:/root/
```

В проекте, помимо `backend/` и `frontend/`, должны лежать новые файлы:
```
telegram-mini-app/
├── docker-compose.yml     ← новый
├── Caddyfile              ← новый
├── DEPLOY.md              ← этот файл
├── backend/
│   ├── Dockerfile         ← новый
│   ├── .dockerignore      ← новый
│   └── ... (ваш код)
└── frontend/
    ├── Dockerfile         ← новый
    ├── .dockerignore      ← новый
    └── ... (ваш код)
```

---

## Шаг 5. Проверить .env (важно)

Откройте `backend/.env` на сервере и убедитесь:
```bash
nano backend/.env
```
- `MINI_APP_URL=https://topshiriqbot.dynv6.net`  ✅ (уже правильно)
- `ALLOWED_ORIGINS=https://topshiriqbot.dynv6.net,http://localhost:3000`  ✅
- `BOT_TOKEN=...`  — ваш токен от @BotFather
- **Рекомендуется** сменить `SECRET_KEY` на случайную строку. Сгенерировать:
  ```bash
  openssl rand -hex 32
  ```
  Вставьте результат в `SECRET_KEY=...`

Сохранить в nano: `Ctrl+O`, `Enter`, затем `Ctrl+X`.

---

## Шаг 6. ЗАПУСК (та самая «одна команда»)

Из папки проекта (где лежит `docker-compose.yml`):
```bash
cd /root/telegram-mini-app
docker compose up -d --build
```

Первый запуск занимает несколько минут (сборка образов).
Caddy сам получит SSL-сертификат для домена.

Проверить, что всё работает:
```bash
docker compose ps         # все сервисы должны быть "running"
docker compose logs -f    # смотреть логи (выход — Ctrl+C)
```

Откройте в браузере: **https://topshiriqbot.dynv6.net**
Замок в адресной строке = HTTPS работает. Затем откройте Mini App в Telegram.

---

## Полезные команды

| Действие | Команда |
|---|---|
| Остановить всё | `docker compose down` |
| Запустить снова | `docker compose up -d` |
| Перезапуск после изменения кода | `docker compose up -d --build` |
| Логи всех сервисов | `docker compose logs -f` |
| Логи только бота | `docker compose logs -f bot` |
| Логи только API | `docker compose logs -f backend` |
| Логи Caddy (SSL) | `docker compose logs -f web` |

---

## Если что-то не работает

1. **Сайт не открывается / нет HTTPS**
   → Проверьте `docker compose logs -f web`. Частая причина: домен ещё
   указывает на старый IP, или закрыт порт 80/443. Вернитесь к Шагу 0.

2. **`ping topshiriqbot.dynv6.net` показывает не 45.126.124.84**
   → Исправьте IP в панели dynv6 и подождите несколько минут.

3. **Бот не отвечает на /start**
   → `docker compose logs -f bot`. Проверьте правильность `BOT_TOKEN` в `.env`.
   После изменения `.env`: `docker compose up -d` (перечитает переменные).

4. **API отвечает ошибкой CORS**
   → Проверьте `ALLOWED_ORIGINS` в `backend/.env` (должен быть ваш домен с https).

---

## Про базу данных

Сейчас используется **SQLite** (файл `backend/tasks.db`) — как и раньше.
Он сохраняется на сервере и не пропадает при перезапуске контейнеров.

Для большой нагрузки в будущем можно перейти на PostgreSQL (проект это
поддерживает — см. `DATABASE_URL` в `.env`), но для старта SQLite достаточно.

# PROJECT_GUIDE.md

> Гид по проекту **Telegram Mini App** — система управления поручениями (топшириқлар) и отчётами (ҳисоботлар).
> Документ написан для того, чтобы любой разработчик или ИИ-ассистент мог быстро понять архитектуру и безопасно вносить изменения.
> UI-тексты на узбекском (кириллица), комментарии в коде на русском.

---

## 1. Что это за приложение

Telegram Mini App для распределения рабочих поручений руководителем и сбора отчётов от сотрудников.

Три роли:

| Роль | Кто это | Что делает |
|------|---------|------------|
| **boshliq** (руководитель) | Telegram ID в `BOSHLIQ_IDS` | Создаёт поручения, видит все отчёты, принимает (`Қабул қилиш`) или возвращает на доработку (`Қайта ишлашга юбориш`). |
| **admin** (администратор) | Telegram ID в `ADMIN_IDS` | Управляет сотрудниками (CRUD), просматривает поручения и отчёты (без приёмки). |
| **xodim** (сотрудник) | Привязан по номеру телефона | Видит поручения, принимает их, отправляет отчёты (видео/аудио/фото/документы), исправляет по замечаниям. |

Роль `boshliq`/`admin` определяется **только** по Telegram ID из переменных окружения. Роль `xodim` — по наличию привязанной записи `Employee`. Пользователь без привязки получает роль `unknown` → экран ввода телефона.

---

## 2. Технологический стек

**Backend** — `/backend`
- Python + **FastAPI**
- **SQLAlchemy** ORM, по умолчанию **SQLite** (`tasks.db`), настраивается через `DATABASE_URL`
- **Хранилище файлов отчётов — абстракция `services/storage.py`**: при заданных `S3_*` файлы хранятся в S3-совместимом объектном хранилище (AWS S3, MinIO, R2, Yandex Object Storage); иначе fallback — локальная папка `/backend/uploads` (только для разработки), отдаётся как статика на `/uploads`. См. §9.
- Загружаемые файлы проходят валидацию размера и MIME-типа (`services/file_validation.py`) **до** сохранения. См. §9.
- **aiogram** — отдельный Telegram-бот (`bot.py`) для онбординга сотрудников по номеру телефона
- Запуск API: `uvicorn app.main:app --reload --port 8000`
- Запуск бота: `python bot.py`

**Frontend** — `/frontend`
- **React** (Create React App) на **TypeScript** (`.tsx`/`.ts`), точка входа — `src/index.tsx`
- **react-router-dom** — навигация на основе URL-маршрутов (см. §6). Старая `useState`-машина из `App.jsx` удалена.
- Авторизация и роль вынесены в **`context/AuthContext.tsx`** (хук `useAuth`)
- **axios** — типизированный HTTP-клиент (`src/api/api.ts`)
- Общие типы домена — `src/types/models.ts`; глобальный тип Telegram WebApp — `src/types/telegram.d.ts`
- **Единый источник правды по статусам** — `src/constants/status.ts` (метки, классы бейджей, переходы). См. §5.
- Модульный CSS: `src/styles/` разбит по фичам и собирается через `styles/index.css` (без CSS-модулей и без Tailwind). См. §12.
- Использует `window.Telegram.WebApp` (Telegram WebApp SDK, подключается в `public/index.html`)
- Запуск: `npm install` (после обновления зависимостей) → `npm start` (по умолчанию `http://localhost:3000`)

---

## 3. Структура каталогов

```
backend/
  app/
    main.py                 # Точка входа FastAPI, регистрация роутеров, CORS, статика /uploads
    config.py               # Settings из .env (BOT_TOKEN, BOSHLIQ_IDS, ADMIN_IDS, DATABASE_URL, ...)
    database/
      connection.py         # engine, SessionLocal, Base, get_db()
      init_db.py            # create_all() + лёгкие миграции (ALTER TABLE для SQLite)
    models/                 # SQLAlchemy-модели (таблицы)
      user.py               # User (boshliq/admin)
      employee.py           # Employee (xodim)
      task.py               # Task (поручение)
      task_assignment.py    # TaskAssignment (связь сотрудник↔поручение + статус)
      report.py             # Report + ReportFile (отчёт и его файлы)
    schemas/                # Pydantic-схемы (валидация запросов/ответов)
    services/               # Бизнес-логика (вся работа с БД здесь)
      auth_service.py
      employee_service.py
      task_service.py
      task_assignment_service.py
      report_service.py       # Создание/чтение отчётов + очистка старых при переотправке
      storage.py              # Абстракция хранилища: S3 (boto3) или локальный fallback
      file_validation.py      # Проверка размера и MIME-типа загружаемых файлов
    routers/                # HTTP-эндпоинты (тонкие, делегируют в services)
      auth.py               # /api/auth
      tasks.py              # /api/tasks  (boshliq/admin)
      admin.py              # /api/admin  (admin)
      xodim.py              # /api/xodim  (сотрудник)
    utils/
      telegram.py           # validate_init_data(), get_user_role()
  bot.py                    # aiogram-бот (онбординг по контакту)
  uploads/                  # Загруженные файлы отчётов (создаётся автоматически)
  requirements.txt

frontend/
  tsconfig.json             # Конфигурация TypeScript
  src/
    index.tsx               # ReactDOM bootstrap; импортирует styles/index.css
    App.tsx                 # Роутер (react-router-dom): маршруты + защита по роли
    api/api.ts              # Все вызовы к backend (axios), типизированы
    context/
      AuthContext.tsx       # Авторизация, роль, привязка телефона (хук useAuth)
    constants/
      status.ts             # Единый источник правды по статусам (метки, бейджи, переходы)
    types/
      models.ts             # Типы домена (Task, Employee, Report, ...)
      telegram.d.ts         # Глобальный тип window.Telegram.WebApp
    utils/
      telegram.ts           # Проверка возможностей Telegram WebApp (поддержка загрузки файлов)
      apiError.ts           # getApiErrorMessage() — единый разбор ошибок axios
      format.ts             # Форматирование дат и пр.
      videoCompress.ts      # Сжатие видео (mediabunny) — опциональная утилита
    components/
      TaskCard.tsx          # Карточка поручения в списке
      EmployeeCard.tsx      # Карточка сотрудника
      AdminTabs.tsx         # Лейаут с нижними табами для boshliq/admin
    pages/
      TaskList.tsx          # Boshliq/Admin: "Барча топшириқлар"
      TaskCreate.tsx        # Boshliq: создание поручения
      TaskDetail.tsx        # Boshliq/Admin: детали + статистика + список сотрудников
      ReportView.tsx        # Boshliq/Admin: просмотр отчёта + кнопки приёмки/доработки
      EmployeeList.tsx      # Admin: список сотрудников
      EmployeeCreate.tsx    # Admin: добавление сотрудника
      XodimTaskList.tsx     # Сотрудник: "Менинг топшириқларим"
      XodimTaskDetail.tsx   # Сотрудник: детали + кнопки принять/отправить отчёт
      XodimReportForm.tsx   # Сотрудник: форма отправки отчёта (загрузка файлов)
      PhoneVerify.tsx       # Экран привязки телефона
    styles/                 # Модульный CSS, собирается через index.css
      index.css             # Баррель: @import всех модулей
      base.css              # Базовые стили, переменные, layout
      cards.css             # Карточки списков
      task-detail.css       # Детали поручения и статистика
      navigation.css        # Нижние табы / навигация
      forms.css             # Формы создания
      report.css            # Просмотр и форма отчёта
      phone-verify.css      # Экран привязки телефона
```

---

## 4. Модель данных (БД)

### `users` — руководители и админы
`id, telegram_id (unique), username, first_name, last_name, role, created_at`

### `employees` — сотрудники
`id, full_name, region (Ҳудуд), position (Лавозим), phone_number (unique), telegram_user_id (unique, nullable), role, is_active, created_at, created_by_admin_id`
- `telegram_user_id` заполняется при привязке через бот (по контакту) или экран PhoneVerify.

### `tasks` — поручения
`id, number, name, description, report_format (JSON: ["video","audio","rasm","matn"]), deadline, status, created_by, assigned_to, created_at, updated_at`
- `report_format` — массив обязательных типов файлов для отчёта.

### `task_assignments` — связь сотрудник ↔ поручение (ключевая таблица статусов!)
`id, task_id, employee_id, status, accepted_at, reported_at, reviewed_at, review_comment, created_at`
- Уникальность: `(task_id, employee_id)`.
- **`status`** — это и есть рабочий процесс. См. §5.
- `reviewed_at` / `review_comment` — решение руководителя (доработка несёт комментарий).

### `reports` + `report_files` — отчёты
- `reports`: `id, task_id, employee_id, assignment_id, comment, created_at`
- `report_files`: `id, report_id, file_type (video|audio|rasm|matn), file_name, file_path, file_size, mime_type, created_at`
  - `file_path` — это **ключ объекта в хранилище** (для S3 — путь внутри бакета, для локального — имя файла). API дополнительно отдаёт готовую ссылку `file_url` (для S3 — presigned-URL, для локального — `/uploads/<имя>`).
- При повторной отправке создаётся **новый** `Report`; `get_report()` берёт самый свежий по `created_at DESC`.
- **Очистка:** после успешной переотправки `report_service._cleanup_old_reports()` удаляет предыдущие отчёты этого сотрудника по этому поручению вместе с их файлами в хранилище, чтобы не копился мусор.

---

## 5. Жизненный цикл статуса отчёта (САМОЕ ВАЖНОЕ)

Статус хранится в `task_assignments.status`. Возможные значения и переходы:

```
none ──(сотрудник открыл, ещё не принял)
  │
pending ──► accepted ──► reported ──► approved   (принят руководителем — финал)
                ▲            │
                │            └──► rework ──► reported (сотрудник исправил и переотправил)
                │                   │
                └───────────────────┘
```

| Статус | Значение | UI-бе��дж (узб.) | Цвет |
|--------|----------|------------------|------|
| `none` | Нет записи назначения | «Янги» | серый |
| `pending` | Назначено, не принято | «Кутилмоқда» | серый |
| `accepted` | Сотрудник принял поручение | «Қабул қилди» | зелёный |
| `reported` | Отчёт отправлен, ждёт проверки | «Ҳисобот келди» | оранжевый |
| `approved` | Руководитель **принял** отчёт (финал) | «Ҳисобот қабул қилинди» | зелёный |
| `rework` | Возвращён на доработку с комментарием | «Қайта ишлашга» | красный |

Правила переходов (реализованы в `task_assignment_service.py`):
- `accept_task`: `pending/none → accepted`.
- `submit_report` (через `report_service.create_report`): `accepted` **или** `rework` → `reported`; при этом `reviewed_at` и `review_comment` сбрасываются (новый цикл проверки).
- `approve_report`: только `reported → approved`. **Финальный статус** — отчёт больше нельзя переотправить/изменить.
- `request_rework`: только `reported → rework`, требует непустой `comment`.

> ⚠️ При добавлении новых статусов обновляй: переходы в `task_assignment_service.py`, фильтры в `get_task_stats` (backend) и **единый модуль `frontend/src/constants/status.ts`** (frontend). Метки и классы бейджей теперь централизованы там — отдельные экраны (`TaskDetail.tsx`, `XodimTaskList.tsx`, `XodimTaskDetail.tsx`, `ReportView.tsx`) импортируют их оттуда, а не дублируют.

---

## 6. Навигация на фронтенде (react-router-dom)

Навигация построена на **URL-маршрутах** (`App.tsx`, `BrowserRouter`). Старая `useState`-машина из `App.jsx` удалена. Переходы — через `useNavigate()` и `<Link>`; выбранные сущности передаются через параметры пути (`useParams`), а не через общий state.

Примеры маршрутов:
- Boshliq/Admin: `/tasks`, `/tasks/create`, `/tasks/:taskId`, `/tasks/:taskId/report/:employeeId`, `/employees`, `/employees/create`
- Xodim: `/my-tasks`, `/my-tasks/:taskId`, `/my-tasks/:taskId/report`
- `/phone` — экран привязки телефона

Доступ по ролям защищён на уровне роутера в `App.tsx` (маршруты рендерятся в зависимости от роли из `useAuth()`), а нижние табы для boshliq/admin вынесены в лейаут `components/AdminTabs.tsx`.

**Авторизация и роль** живут в `context/AuthContext.tsx` (хук `useAuth`): он валидирует `initData`, определяет роль и хранит состояние привязки телефона. Если приложение открыто **вне** Telegram (нет `initData`) — включается demo-режим: фиктивный пользователь `boshliq`, чтобы можно было разрабатывать в обычном браузере.

---

## 7. Аутентификация

1. Telegram WebApp SDK даёт `window.Telegram.WebApp.initData` (подписанная строка).
2. Frontend шлёт её в заголовке **`X-Telegram-Init-Data`** (см. axios-интерсептор в `api.ts`).
3. Backend проверяет подпись HMAC-SHA256 в `utils/telegram.py → validate_init_data()` (секрет — `BOT_TOKEN`).
4. Роль: `get_user_role(telegram_id)` → `boshliq` / `admin` (по env) или `xodim` (по умолчанию).
5. На каждом защищённом эндпоинте есть зависимость: `get_current_user` (tasks), `get_admin_user` (admin), `get_xodim` (xodim). Они валидируют initData и проверяют роль.

> Здесь **нет JWT и сессий** — каждый запрос заново валидирует `initData`. Это нормально для Telegram Mini App.

---

## 8. Карта API-эндпоинтов

Все требуют заголовок `X-Telegram-Init-Data` (кроме корневых `/`, `/api/health`).

**Auth** (`/api/auth`)
- `POST /login` → данные пользователя + роль
- `GET  /me`
- `GET  /check-binding` → привязан ли Telegram к сотруднику

**Tasks — boshliq/admin** (`/api/tasks`)
- `GET  ""` → список поручений (+ `total_employees`, `not_submitted_count` на каждое)
- `POST ""` → создать поручение (только boshliq)
- `GET  /{task_id}/detail` → детали + `stats` + `assignments[]`
- `GET  /{task_id}/report/{employee_id}` → отчёт сотрудника + статус назначения
- `POST /{task_id}/report/{employee_id}/approve` → принять отчёт (только boshliq)
- `POST /{task_id}/report/{employee_id}/rework` → на доработку, body `{comment}` (только boshliq)

**Admin — сотрудники** (`/api/admin`)
- `GET/POST /employees`, `GET/PUT/DELETE /employees/{eid}`

**Xodim — сотрудник** (`/api/xodim`)
- `GET  /tasks` → мои поручения (+ `my_status`, `review_comment`)
- `GET  /tasks/{task_id}` → детали поручения для меня
- `POST /tasks/{task_id}/accept` → принять поручение
- `POST /tasks/{task_id}/submit-report` → отправить отчёт (**multipart/form-data**: `comment`, `file_types` (JSON-массив), `files[]`)

### `stats` (в `/detail`) — содержимое
`total_employees, accepted_count, reported_count, approved_count, submitted_count, not_submitted_count`
- `not_submitted_count = total_employees − submitted` (где submitted = reported+approved+rework).
- Показывается в `TaskCard` как «N/жами таси ҳали ҳисобот топширмади» (красный блок).
- `approved_count` показывается в статистике `TaskDetail` как «Муваффақиятли якунлади».

---

## 9. Загрузка и хранение файлов отчёта (тонкое место)

Форма: `XodimReportForm.tsx`. Особенности, которые легко сломать:

1. **Telegram WebView ненадёжно работает с нативным `<input type="file">`** (особенно Android, особенно `multiple`). Поэтому:
   - inputs скрыты, открываются по кнопке;
   - `input.value` сбрасывается до и после выбора (чтобы повторный выбор того же файла снова вызвал `change`);
   - файлы **накапливаются** в state с дедупликацией (можно добавлять по одному);
   - после выбора проверяется, что `FileList` непустой и файлы имеют `size > 0` — иначе показывается ошибка, файл **не** добавляется (никаких «фейковых» вложений).
2. **`utils/telegram.ts → getFileUploadSupport()`** определяет по версии клиента (`isVersionAtLeast('6.0')`), поддерживается ли загрузка. Если нет — показывается баннер «обновите Telegram», пикер блокируется.
3. Отправка (`api.ts → submitReportFiles`): `Content-Type` принудительно `undefined`, чтобы axios сам выставил `multipart/form-data` boundary.
4. Backend (`xodim.py → submit-report`) проверяет, что присланы все обязательные типы из `task.report_format`, затем `report_service.create_report` сохраняет файлы.

**Серверное хранилище и валидация:**
- `services/file_validation.py` проверяет каждый файл **до сохранения**: размер (`MAX_*_SIZE_MB`) и MIME-тип (`ALLOWED_*_MIME` из §11). При нарушении — `HTTPException 400` с понятным сообщением (узб.), файл не сохраняется, «пустой» отчёт в БД не создаётся.
- `services/storage.py` — единый интерфейс (`save_bytes`, `get_url`, `delete`). Если в `.env` заданы `S3_BUCKET` + ключи (`settings.s3_enabled`) — используется S3 (boto3); иначе локальная папка `/uploads`. Выбор автоматический, бизнес-логика и API не зависят от бэкенда хранилища.
- Для просмотра API отдаёт `file_url`: presigned-ссылку для S3 (TTL = `S3_URL_EXPIRE`) или относительный `/uploads/<имя>` для локального. Фронтенд (`ReportView.tsx`) использует `file_url` с обратной совместимостью со старыми записями (по `file_path`).

---

## 10. Миграции БД

Полноценного Alembic **нет**. `database/init_db.py`:
1. `Base.metadata.create_all()` — создаёт недостающие таблицы.
2. Лёгкие ручные миграции через `ALTER TABLE ... ADD COLUMN` для SQLite (идемпотентно — проверяет существование колонки через `PRAGMA table_info`).

Так были добавлены `reviewed_at` и `review_comment` в `task_assignments`. **При добавлении новых колонок в существующие таблицы** добавляй такой же безопасный `ALTER TABLE` в `init_db.py`, иначе на старых БД будет ошибка.

Миграции выполняются на старте FastAPI (`lifespan` в `main.py`). **После изменения схемы/эндпоинтов нужно перезапустить uvicorn**, иначе работает старый код в памяти (типичная причина «404» на новых маршрутах).

---

## 11. Переменные окружения (`backend/.env`)

```
BOT_TOKEN=<токен Telegram-бота>           # нужен для проверки подписи initData
MINI_APP_URL=https://<адрес фронтенда>     # кнопка в боте
BOSHLIQ_IDS=12345678,...                   # Telegram ID руководителей (через запятую)
ADMIN_IDS=87654321,...                     # Telegram ID админов
DATABASE_URL=sqlite:///./tasks.db          # или Postgres URL
SECRET_KEY=<любая_строка>

# Хранилище файлов (S3). Если пусто — локальный fallback в /uploads (разработка).
S3_ENDPOINT=                               # напр. https://s3.amazonaws.com (для AWS можно пусто)
S3_BUCKET=                                 # имя бакета — включает S3-режим
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1
S3_PREFIX=reports                          # папка внутри бакета
S3_URL_EXPIRE=3600                         # TTL presigned-ссылки, сек

# Ограничения загружаемых файлов
MAX_VIDEO_SIZE_MB=500
MAX_IMAGE_SIZE_MB=20
MAX_AUDIO_SIZE_MB=50
MAX_DOCUMENT_SIZE_MB=100
# (опционально) ALLOWED_VIDEO_MIME / ALLOWED_IMAGE_MIME / ALLOWED_AUDIO_MIME / ALLOWED_DOCUMENT_MIME
```

> S3-режим включается автоматически, когда заданы `S3_BUCKET` + `S3_ACCESS_KEY` + `S3_SECRET_KEY` (`settings.s3_enabled`). Полный список с комментариями — в `backend/.env.example`. Для S3 требуется пакет `boto3` (уже в `requirements.txt`).

Frontend: `REACT_APP_API_URL` — базовый URL backend (если фронт и бэк на разных доменах).

---

## 12. Соглашения и правила при доработке

- **Бизнес-логика — только в `services/`.** Роутеры тонкие: проверка роли → вызов сервиса → формирование ответа.
- **Frontend на TypeScript.** Типизируй пропсы и ответы API; новые типы домена клади в `src/types/models.ts`. Перед коммитом полезно прогнать `npx tsc --noEmit`.
- **Цвета бейджей:** зелёный = успех/принято, оранжевый = ждёт действия, красный = проблема/доработка/не сдано, серый = нейтрально. Метки и классы — в `constants/status.ts`, не хардкодь их в компонентах.
- **Узбекский (кириллица) для всех UI-текстов.** Комментарии — на русском.
- **Стили** добавляй в подходящий модуль `frontend/src/styles/*.css` и подключай через `styles/index.css` (проект не использует CSS-модули/Tailwind).
- **Не ломай статус-машину** (§5) — правки делай в `constants/status.ts` (frontend) и `get_task_stats` (backend).
- **JSX-экранирование:** апострофы и спецсимволы в тексте оборачивай корректно.
- При добавлении API-метода: добавь типизированную функцию в `frontend/src/api/api.ts` и соответствующий эндпоинт в нужный роутер.
- **Файлы — только через `services/storage.py`** (не пиши на диск напрямую) и валидируй их через `services/file_validation.py`.
- **Перезапускай backend** после изменений в Python-коде; маршруты/миграции подхватываются только при старте процесса.
- После изменения зависимостей фронтенда выполни **`npm install`** перед `npm start` (иначе `Cannot find module ...`).

---

## 13. Быстрый старт для нового изменения (чек-лист)

1. Понять роль и экран: какой маршрут в `App.tsx` отвечает за UI (см. §6)?
2. Найти страницу в `frontend/src/pages/` и связанную типизированную функцию в `api/api.ts`.
3. На бэке: эндпоинт в `routers/`, логика в `services/`, при необходимости — поле в `models/` + миграция в `init_db.py`.
4. Если меняется статус отчёта — обновить `constants/status.ts` (frontend) и `get_task_stats` (backend) по §5.
5. Если работа с файлами — идти через `services/storage.py` + `services/file_validation.py` (§9).
6. `npx tsc --noEmit` на фронте; перезапустить uvicorn (при изменении схемы убедиться, что миграция применилась — в логах строки `✅ Добавлена колонка ...`).

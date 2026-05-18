# LMS TCMS LLM

Stepik-подобная LMS для обучения тестированию. **Фаза 1** — без LLM (курсы, auth, шаг «Тест-кейс» с ручной проверкой).

## Стек

- **Backend:** Django 6 + DRF + JWT (SimpleJWT)
- **Frontend:** React + TypeScript + Vite 5 + Ant Design
- **БД:** SQLite (если нет `.env`) или **PostgreSQL** (рекомендуется с pgAdmin)

## База данных (PostgreSQL + pgAdmin)

По умолчанию Django пишет в **SQLite** (`backend/db.sqlite3`). Для **pgAdmin** нужен **PostgreSQL**.

### Вариант A — Docker (проще всего)

```powershell
cd c:\Programs\LMS_TCMS_LLM
docker compose up -d
```

Поднимется Postgres: `localhost:5432`, БД `lms`, пользователь/пароль `lms` / `lms`.

### Вариант B — свой PostgreSQL (уже стоит в системе)

В **pgAdmin** → правый клик по **Databases** → **Create** → **Database**:

- Name: `lms` (или другое — укажите то же в `.env`)

При необходимости создайте пользователя с правами на эту БД (Login/Group Roles → Create).

### Подключение Django к Postgres

```powershell
cd backend
copy .env.example .env
# Отредактируйте .env, если другие host/порт/логин/пароль
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py runserver
```

В `backend/.env` должно быть (пример):

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=lms
POSTGRES_USER=lms
POSTGRES_PASSWORD=lms
```

Пока задан `POSTGRES_HOST`, Django **не** использует SQLite.

### Подключение в pgAdmin

**Register → Server:**

| Поле | Значение |
|------|----------|
| Host | `localhost` |
| Port | `5432` |
| Maintenance database | `postgres` или `lms` |
| Username | как в `.env` (`lms` или ваш) |
| Password | как в `.env` |

После `migrate` в БД `lms` появятся таблицы: `accounts_user`, `courses_course`, `content_step` и др.

### Перенос с SQLite на Postgres

Если уже есть данные в `db.sqlite3`, для диплома проще начать с чистой БД Postgres (`migrate`). Перенос — отдельная задача (`dumpdata` / `loaddata`).

## Быстрый старт

### Backend

```powershell
cd backend
.\.venv\Scripts\pip install -r requirements.txt
# Настройте .env для Postgres (см. выше) или пропустите — будет SQLite
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py runserver
```

API: http://127.0.0.1:8000/api/

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173 (прокси `/api` → backend)

## Auth API

| Метод | URL | Тело |
|-------|-----|------|
| POST | `/api/auth/register/` | `email`, `password`, `name`, `role` (`student` \| `teacher`) |
| POST | `/api/auth/login/` | `login` (email), `password` |
| GET | `/api/auth/me/` | Bearer token |
| POST | `/api/auth/refresh/` | `refresh` |

## Тест-кейс (без LLM)

- POST `/api/steps/<uuid>/submit-test-case/` — сдача (8 полей по шаблону)
- POST `/api/submissions/<uuid>/grade/` — оценка преподавателем (`score`, `feedback`)

**Фаза 2 (позже):** Ollama, автопроверка LLM, чат-тьютор.

## UI (Фаза 1)

- **Преподавание:** список курсов → редактор курса (описание, модули, уроки) → редактор урока (шаги: текст, тест, тест-кейс)
- **Оценка тест-кейсов:** в редакторе урока → «Работы» на шаге типа тест-кейс
- **Обучение:** каталог / мои курсы → прохождение урока (текст, тест, форма тест-кейса)

## Документация

- [Описание.md](Описание.md)
- [Регистрация,авторизация.md](Регистрация,авторизация.md)

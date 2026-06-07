# LMS TCMS LLM

Stepik-подобная LMS для обучения тестированию. **Фаза 2** — автопроверка тест-кейсов локальной LLM (Ollama), личные кабинеты, рубрика по критериям.

## Стек

- **Backend:** Django 6 + DRF + JWT (SimpleJWT)
- **Frontend:** React + TypeScript + Vite 5 + Ant Design
- **LLM:** Ollama (`qwen2.5:7b-instruct-q4_K_M` по умолчанию)
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

## Ollama (автопроверка тест-кейсов)

```powershell
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama serve
```

В `backend/.env` (из `.env.example`):

```env
OLLAMA_ENABLED=true
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct-q4_K_M
OLLAMA_TEMPERATURE=0
OLLAMA_NUM_CTX=4096
OLLAMA_TIMEOUT=120
```

Отключить ИИ без удаления кода: `OLLAMA_ENABLED=false` — сдачи останутся в статусе `submitted` для ручной проверки.

## Быстрый старт

### Backend

```powershell
cd backend
.\.venv\Scripts\pip install -r requirements.txt
# Настройте .env для Postgres и Ollama (см. выше) или пропустите — будет SQLite
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

## Тест-кейс и LLM

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/steps/<uuid>/submit-test-case/` | Сдача: `title`, `preconditions`, `execution_steps`, `expected_result` → синхронная оценка Ollama |
| GET | `/api/steps/<uuid>/my-submission/` | Последняя сдача студента (без `llm_debug`) |
| POST | `/api/submissions/<uuid>/grade/` | Оценка / принятие ИИ преподавателем (`score`, `feedback`) → `grading_source=manual` |

После успешной оценки ИИ: `status=graded`, `grading_source=llm`, в `payload.llm_grade` — проценты по критериям и рекомендации.

## UI

- **Преподавание:** курс → урок → шаг «Тест-кейс»: ТЗ (`condition_html`), рубрика (критерии + веса + hints), опционально эталон
- **Студент:** форма из 4 полей → результат ИИ → «Улучшить и отправить снова»
- **Кабинеты:** `/cabinet/teacher`, `/cabinet/student` — табель, очередь, просмотр сдачи, метка «ИИ»

## Документация

- [Описание.md](Описание.md)
- [Регистрация,авторизация.md](Регистрация,авторизация.md)
- [docs/VKR_LLM.md](docs/VKR_LLM.md) — критерии, методика, риски, эксперимент для ВКР
- [docs/student-assignments/](docs/student-assignments/) — **ТЗ для студентов** и **эталонные тест-кейсы** (3 задания)

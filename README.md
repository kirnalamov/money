# Money App

Full-stack приложение для управления финансами с архитектурой **Next.js + FastAPI + PostgreSQL**.

Проект включает:

* регистрацию и авторизацию пользователей;
* JWT-аутентификацию;
* управление пользователями;
* разграничение ролей;
* финансовый учёт;
* мониторинг и метрики;
* Docker-развёртывание.

## Структура проекта

```
money/
├── frontend/          # Next.js приложение
├── backend/           # FastAPI приложение
├── docker-compose.yml # Конфигурация сервисов
└── README.md
```

## Требования

Перед запуском необходимо установить:

* Docker
* Docker Compose
* Node.js 18+
* Python 3.11+

## Запуск проекта

Клонировать проект:

```bash
cd c:\money
```

Создать корневой файл окружения для Docker:

```bash
cp .env.example .env
```

Настроить основные параметры:

```env
SECRET_KEY=your_secret_key
POSTGRES_PASSWORD=your_password
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
DATABASE_URL=postgresql+asyncpg://postgres:your_password@db:5432/app
EXCHANGE_RATES_URL=https://open.er-api.com/v6/latest/USD
EXCHANGE_RATES_TTL_MINUTES=60
```

Для локального запуска backend вне Docker используйте отдельный `backend/.env`; не подставляйте SQLite-конфигурацию в Docker Compose.

Курсы валют обновляются backend через `EXCHANGE_RATES_URL` с интервалом `EXCHANGE_RATES_TTL_MINUTES`. При недоступности провайдера используется последний успешный снимок или безопасные резервные значения.

Запустить приложение:

```bash
docker-compose up --build
```

После успешного запуска:

Frontend:

```
http://localhost:3000
```

Backend API:

```
http://localhost:8000
```

Swagger документация:

```
http://localhost:8000/api/v1/docs
```

Проверка состояния:

```
http://localhost:8000/health
```

## Backend

Используемые технологии:

* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic
* Pydantic
* JWT
* Bcrypt

### Основные API

Авторизация:

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

Пользователь:

```
GET /api/v1/users/me
PUT /api/v1/users/me
GET /api/v1/users/
```

Мониторинг:

```
GET /health
GET /metrics
```

## Создание администратора

Через переменные окружения:

```env
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_USERNAME=admin
FIRST_SUPERUSER_PASSWORD=StrongPassword123!
```

Перезапуск сервиса:

```bash
docker-compose restart backend
```

Или создание вручную:

```bash
docker-compose exec backend python scripts/create_superuser.py
```

## Frontend

Стек:

* Next.js
* TypeScript
* React

Локальный запуск:

```bash
cd frontend
npm install
npm run dev
```

Переменная окружения:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Безопасность

Реализовано:

* JWT access и refresh токены;
* автоматическое обновление токенов;
* bcrypt-хеширование паролей;
* роли пользователей;
* защита от brute-force атак;
* CORS;
* проверка входных данных;
* безопасная обработка ошибок;
* HTTP security headers.

Перед production необходимо:

* заменить `SECRET_KEY`;
* настроить безопасный пароль PostgreSQL;
* ограничить CORS;
* включить HTTPS;
* настроить резервное копирование БД;
* подключить мониторинг.

## Docker команды

Запуск:

```bash
docker-compose up --build
```

Запуск в фоне:

```bash
docker-compose up -d
```

Просмотр логов:

```bash
docker-compose logs -f backend
```

Остановка:

```bash
docker-compose down
```

Удаление контейнеров вместе с БД:

```bash
docker-compose down -v
```

Пересборка отдельного сервиса:

```bash
docker-compose up --build backend
```

## Миграции базы данных

Создание миграции:

```bash
docker-compose exec backend alembic revision --autogenerate -m "change description"
```

Применение миграций:

```bash
docker-compose exec backend alembic upgrade head
```

Откат последней миграции:

```bash
docker-compose exec backend alembic downgrade -1
```

## Production checklist

Перед развёртыванием:

* настроить переменные окружения;
* создать администратора;
* проверить авторизацию;
* настроить PostgreSQL backup;
* настроить HTTPS;
* проверить security headers;
* включить JSON-логирование;
* настроить мониторинг.

## Лицензия

Лицензия проекта определяется владельцем репозитория.

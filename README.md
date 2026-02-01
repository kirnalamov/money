# Money App

A production-ready full-stack application with a Next.js frontend and FastAPI backend featuring robust authentication, user management, and financial tracking.

## 🏗️ Project Structure

- `frontend/`: Next.js application with TypeScript
- `backend/`: Python FastAPI application with PostgreSQL
- `docker-compose.yml`: Orchestration for all services

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Running the Full Stack

1. **Clone and navigate to the project:**
   ```bash
   cd c:\money
   ```

2. **Configure environment (Important!):**
   ```bash
   # Copy the example environment file
   cp backend/.env.example backend/.env
   
   # Edit backend/.env and set at minimum:
   # - SECRET_KEY (use a random string!)
   # - BACKEND_CORS_ORIGINS (add your frontend URL)
   ```

3. **Start all services:**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Start PostgreSQL on port 5432
   - Start the FastAPI backend on port 8000
   - Start the Next.js frontend on port 3000
   - Run database migrations automatically

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/api/v1/docs
   - Health Check: http://localhost:8000/health
   - Metrics: http://localhost:8000/metrics

## 🔐 Security Best Practices

> [!WARNING]
> **Before deploying to production, you MUST:**
> 1. Change `SECRET_KEY` to a random value (generate with `openssl rand -hex 32`)
> 2. Use strong passwords for `POSTGRES_PASSWORD`
> 3. Set `BACKEND_CORS_ORIGINS` to only trusted domains
> 4. Review all environment variables in `backend/.env.example`

### Security Features

- ✅ **JWT Authentication**: Access and refresh tokens with automatic rotation
- ✅ **Password Security**: Bcrypt hashing with strength validation
- ✅ **Role-Based Access Control (RBAC)**: User and admin roles
- ✅ **Rate Limiting**: Protection against brute force attacks
- ✅ **Security Headers**: X-Frame-Options, HSTS, X-Content-Type-Options
- ✅ **CORS Configuration**: Configurable allowed origins
- ✅ **Input Validation**: Pydantic schemas with email validation
- ✅ **Error Handling**: Sanitized error messages (no sensitive data leakage)

## 📚 Backend Development

### Environment Variables

See `backend/.env.example` for a complete list of configuration options. Key variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | JWT signing key | ✅ Yes | (placeholder) |
| `POSTGRES_SERVER` | Database host | ✅ Yes | db |
| `POSTGRES_PASSWORD` | Database password | ✅ Yes | postgres |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | ✅ Yes | (empty) |
| `LOG_FORMAT` | Logging format | No | console |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | No | 30 |

### Creating Initial Superuser

**Option 1: Via environment variables**

Set these in `backend/.env` or `docker-compose.yml`:
```bash
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_USERNAME=admin
FIRST_SUPERUSER_PASSWORD=SecurePassword123!
FIRST_SUPERUSER_FULL_NAME=Admin User
```

Then restart the backend service:
```bash
docker-compose restart backend
```

**Option 2: Via script**

```bash
# Run inside the backend container
docker-compose exec backend python scripts/create_superuser.py
```

### Database Migrations

**Create a new migration:**
```bash
# Inside the backend container
docker-compose exec backend alembic revision --autogenerate -m "Description of changes"
```

**Apply migrations:**
```bash
docker-compose exec backend alembic upgrade head
```

**Rollback last migration:**
```bash
docker-compose exec backend alembic downgrade -1
```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (get tokens)
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke refresh token)

#### User Management
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/` - List all users (admin only)
- `GET /api/v1/users/{user_id}` - Get user by ID (admin only)

#### Monitoring
- `GET /health` - Health check with database status
- `GET /metrics` - Prometheus metrics

## 🎨 Frontend Development

### Running Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:3000 and connect to the backend API.

### Environment Variables

Configure in `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 📊 Monitoring & Observability

### Structured Logging

The backend uses structured logging with two formats:

- **Console format** (development): Human-readable colored output
- **JSON format** (production): Machine-parsable structured logs

Set via environment variable:
```bash
LOG_FORMAT=json  # for production
LOG_FORMAT=console  # for development
```

### Prometheus Metrics

Metrics are exposed at `/metrics` and include:
- HTTP request duration
- Request count by endpoint
- Error rates
- Response status codes

### Health Checks

The `/health` endpoint returns:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "connected"
}
```

Status can be:
- `ok` - All systems operational
- `degraded` - Database connection issues

## 🐳 Docker & Deployment

### Production Deployment Checklist

- [ ] Set strong `SECRET_KEY` (not the default!)
- [ ] Configure `BACKEND_CORS_ORIGINS` with production domains
- [ ] Use strong `POSTGRES_PASSWORD`
- [ ] Set `LOG_FORMAT=json` for structured logging
- [ ] Create initial superuser account
- [ ] Configure backup strategy for PostgreSQL data
- [ ] Set up reverse proxy (nginx/traefik) with HTTPS
- [ ] Configure environment-specific `.env` files
- [ ] Review and adjust rate limiting settings
- [ ] Enable monitoring and alerting
- [ ] Test token refresh flow
- [ ] Verify all security headers are present

### Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Rebuild specific service
docker-compose up --build backend
```

## 🔧 Troubleshooting

### Backend won't start

1. Check if database is ready: `docker-compose logs db`
2. Verify environment variables are set correctly
3. Check logs: `docker-compose logs backend`

### Database connection errors

1. Ensure PostgreSQL is healthy: `docker-compose ps`
2. Verify `DATABASE_URL` matches your configuration
3. Try resetting: `docker-compose down -v && docker-compose up`

### CORS errors in frontend

1. Add your frontend URL to `BACKEND_CORS_ORIGINS` in `backend/.env`
2. Restart backend: `docker-compose restart backend`

### Authentication errors

1. Verify `SECRET_KEY` is consistent across restarts
2. Check token hasn't expired
3. Ensure user account is active

## 📝 License

[Your License Here]

## 🤝 Contributing

[Your Contributing Guidelines Here]

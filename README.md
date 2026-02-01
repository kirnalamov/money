# Money App

This project consists of a Next.js frontend and a FastAPI backend.

## Project Structure

- `frontend/`: Next.js application (moved from root)
- `backend/`: Python FastAPI application (New)
- `docker-compose.yml`: Orchestration for Backend and Database

## how to Run

### Backend & Database

The backend and database are containerized using Docker Compose.

1. Ensure Docker and Docker Compose are installed and running.
2. Run the following command from the project root:

```bash
docker-compose up --build
```

This will:
- Start PostgreSQL on port 5432
- Start the FastAPI backend on port 8000
- Run database migrations (Alembic) automatically on startup

**Endpoints:**
- API Docs: http://localhost:8000/api/v1/docs
- Health Check: http://localhost:8000/health
- Metrics: http://localhost:8000/metrics

### Frontend

To run the frontend components:

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will start on http://localhost:3000.

## Backend Development

To add new migrations:
```bash
# Inside the backend container or with local environment setup
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Configuration

- Backend configuration is managed via `backend/app/core/config.py` and environment variables.
- Database credentials can be configured in `docker-compose.yml`.

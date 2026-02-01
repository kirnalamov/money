import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import structlog
from app.core.config import settings
from app.core.logging import setup_logging

# Setup logging
setup_logging()
logger = structlog.get_logger()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
)

# CORS Options
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Middleware for response time header and logging
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    
    # Process request
    response = await call_next(request)
    
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log request details (simplified)
    await logger.info(
        "request_processed",
        path=request.url.path,
        method=request.method,
        status_code=response.status_code,
        process_time=process_time
    )
    
    return response

# Prometheus setup
instrumentator = Instrumentator().instrument(app).expose(app)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/")
def root():
    return {"message": "Welcome to Money App API. Visit /docs for documentation."}

from app.api.api_v1.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)


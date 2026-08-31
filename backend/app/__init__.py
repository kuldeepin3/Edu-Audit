"""
EduAudit AI - FastAPI Application Entry Point
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
import sentry_sdk

from app.config import settings
from app.routers import router as api_router
from app.db import init_db, close_db
from app.sockets import socket_app
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware, AuditLogMiddleware
from app.redis import redis_client


def create_app() -> FastAPI:
    """Application factory"""

    # Sentry integration (production only)
    if settings.ENVIRONMENT == "production":
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.2,
            profiles_sample_rate=0.1,
        )

    app = FastAPI(
        title="EduAudit AI",
        description="AI-Powered School Infrastructure Monitoring & Transparency System",
        version="1.0.0",
        docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Gzip compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Audit logging
    app.add_middleware(AuditLogMiddleware)

    # Rate limiting
    app.add_middleware(RateLimitMiddleware, redis_client=redis_client)

    # Prometheus metrics
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # Mount Socket.io
    app.mount("/ws", socket_app)

    # Uploaded complaint evidence is stored locally (or in a Docker volume).
    media_path = Path(settings.MEDIA_STORAGE_PATH)
    media_path.mkdir(parents=True, exist_ok=True)
    app.mount(settings.MEDIA_URL, StaticFiles(directory=media_path), name="media")

    # API routes
    app.include_router(api_router, prefix="/api/v1")

    # Lifecycle
    @app.on_event("startup")
    async def startup():
        await init_db()

    @app.on_event("shutdown")
    async def shutdown():
        await close_db()

    # Health check
    @app.get("/health")
    async def health():
        return {"status": "ok", "version": "1.0.0"}

    @app.get("/ready")
    async def ready():
        # Check database connectivity
        # Check Redis connectivity
        # Check Qdrant connectivity
        return {
            "status": "ready",
            "database": "connected",
            "redis": "connected",
            "qdrant": "connected",
        }

    return app


app = create_app()

"""
EduAudit AI - Application Settings
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "EduAudit AI"
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"

    # API
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8000", "http://localhost:8001"]

    # Database
    DATABASE_URL: str = "postgresql://eduaudit:eduaudit_secure@localhost:5432/eduaudit"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Local media storage
    MEDIA_STORAGE_PATH: str = "uploads"
    MEDIA_URL: str = "/media"



    # AI Models
    MODEL_PATH: str = "models/yolov11_nano.pt"
    CLIP_MODEL_NAME: str = "ViT-L/14"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # Ollama (local AI - completely offline)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CHAT_MODEL: str = "llama3.2"
    OLLAMA_VISION_MODEL: str = "minicpm-v"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_TIMEOUT: int = 120

    # LLM (cloud – unused, kept for compatibility)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # SMS (MSG91)
    MSG91_AUTH_KEY: str = ""

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    # Rate Limiting
    RATE_LIMIT_ANON: int = 30  # requests per minute
    RATE_LIMIT_USER: int = 60
    RATE_LIMIT_UPLOAD: int = 10

    # Sentry
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

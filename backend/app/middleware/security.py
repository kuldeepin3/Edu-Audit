"""
EduAudit AI - Security Middleware
Rate limiting, request validation, and security headers
"""
import time
import hashlib
import logging
from typing import Optional, Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# RATE LIMITING (Token Bucket Algorithm with Redis)
# ============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed rate limiting middleware.
    Different limits per user role and endpoint type.
    """

    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client
        # Fallback in-memory store for development
        self._memory_store: dict = {}

    async def dispatch(self, request: Request, call_next):
        # Skip health checks
        if request.url.path in ["/health", "/ready", "/metrics"]:
            return await call_next(request)

        # Skip rate limiting in development/testing mode
        if settings.ENVIRONMENT != "production":
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Determine rate limit based on endpoint
        limit, window = self._get_limit(request)

        # Check rate limit
        allowed = await self._check_rate_limit(client_id, limit, window)
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_id} on {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {limit} requests per {window} seconds. Please slow down.",
                    "retry_after": window,
                },
                headers={
                    "Retry-After": str(window),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        return response

    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier (IP + user agent hash)"""
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        auth = request.headers.get("authorization", "")
        if auth:
            # Authenticated user: use token hash
            return f"user:{hashlib.sha256(auth.encode()).hexdigest()[:16]}"
        return f"anon:{ip}:{hashlib.sha256(user_agent.encode()).hexdigest()[:8]}"

    def _get_limit(self, request: Request) -> tuple:
        """Determine rate limit based on endpoint and method"""
        path = request.url.path
        method = request.method

        # Anonymous reporting (stricter)
        if "/complaints" in path and method == "POST":
            return (10, 3600)  # 10 reports per hour

        # Image upload (very strict)
        if "/upload" in path or "/images" in path:
            return (20, 3600)  # 20 uploads per hour

        # Vision analysis
        if "/vision" in path:
            return (30, 3600)  # 30 per hour

        # Chatbot
        if "/chatbot" in path:
            return (50, 3600)  # 50 queries per hour

        # General API
        return (settings.RATE_LIMIT_USER, 60)  # 60 per minute

    async def _check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Token bucket check"""
        if self.redis:
            return await self._redis_check(key, limit, window)
        return self._memory_check(key, limit, window)

    async def _redis_check(self, key: str, limit: int, window: int) -> bool:
        """Redis-based rate limiting (production)"""
        redis_key = f"ratelimit:{key}"
        pipe = self.redis.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, window)
        results = await pipe.execute()
        current = results[0]
        return current <= limit

    def _memory_check(self, key: str, limit: int, window: int) -> bool:
        """In-memory rate limiting (development only)"""
        now = time.time()
        if key not in self._memory_store:
            self._memory_store[key] = []

        # Remove old entries
        self._memory_store[key] = [
            t for t in self._memory_store[key] if now - t < window
        ]

        if len(self._memory_store[key]) >= limit:
            return False

        self._memory_store[key].append(now)
        return True


# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), camera=(self), microphone=()"
        )

        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "img-src 'self' data: blob: https://res.cloudinary.com; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "connect-src 'self' https://api.eduaudit.gov.in wss://api.eduaudit.gov.in"
            )

        return response


# ============================================================================
# AUDIT LOGGING MIDDLEWARE
# ============================================================================

class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log all API calls for compliance audit trail"""

    SKIP_PATHS = {"/health", "/ready", "/metrics", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        start_time = time.time()

        # Capture request info
        audit_data = {
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": time.time(),
        }

        response = await call_next(request)

        # Log response
        audit_data["status_code"] = response.status_code
        audit_data["duration_ms"] = round((time.time() - start_time) * 1000, 2)

        # Store audit log (async, non-blocking)
        logger.info(f"AUDIT: {audit_data}")

        return response


# ============================================================================
# INPUT VALIDATION UTILITIES
# ============================================================================

def validate_image_upload(file_size: int, content_type: str) -> tuple[bool, str]:
    """Validate image upload parameters"""
    MAX_SIZE = 20 * 1024 * 1024  # 20MB
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

    if file_size > MAX_SIZE:
        return False, f"File too large. Maximum size is {MAX_SIZE // (1024*1024)}MB"

    if content_type not in ALLOWED_TYPES:
        return False, f"Unsupported file type: {content_type}. Allowed: {ALLOWED_TYPES}"

    return True, "Valid"


def sanitize_input(text: str, max_length: int = 5000) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not text:
        return ""

    # Truncate
    text = text[:max_length]

    # Remove null bytes
    text = text.replace("\x00", "")

    # Strip control characters (except newlines/tabs)
    import re
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    return text.strip()


def validate_gps_coordinates(lat: float, lng: float) -> bool:
    """Validate GPS coordinates are within India's bounding box"""
    # India bounding box (approximate)
    INDIA_BOUNDS = {
        "lat_min": 6.0,
        "lat_max": 37.0,
        "lng_min": 68.0,
        "lng_max": 97.0,
    }

    return (
        INDIA_BOUNDS["lat_min"] <= lat <= INDIA_BOUNDS["lat_max"] and
        INDIA_BOUNDS["lng_min"] <= lng <= INDIA_BOUNDS["lng_max"]
    )

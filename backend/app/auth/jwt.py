"""
EduAudit AI - JWT Token Management & Security Hashing
"""
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import Request, Response, HTTPException, status
from jose import JWTError, jwt
import bcrypt

from app.config import settings
from app.redis import redis_client


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hash"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(user_id: str, role: str, district: Optional[str] = None) -> str:
    """Create JWT Access Token (expires in 15 minutes)"""
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "district": district,
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str, role: str) -> str:
    """Create JWT Refresh Token (expires in 7 days)"""
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set JWT tokens as secure HttpOnly cookies"""
    # Access token cookie (15 mins)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",  # Set to True in production (requires HTTPS)
        path="/"
    )
    # Refresh token cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",  # Set to True in production (requires HTTPS)
        path="/"
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear access and refresh token cookies on logout"""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


def extract_token_from_request(request: Request) -> Optional[str]:
    """Extract access token from cookies or Authorization header"""
    # 1. Try cookie first
    token = request.cookies.get("access_token")
    if token:
        return token

    # 2. Try Authorization header as fallback
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]

    return None


def get_token_payload(token: str) -> Optional[dict]:
    """Decode token and return payload if valid"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def check_login_lockout(email: str) -> Tuple[bool, Optional[str]]:
    """
    Check if a user is locked out from logging in via Redis.
    Returns: (is_locked, error_message)
    """
    try:
        lockout_key = f"auth:lockout:{email}"
        ttl = await redis_client.ttl(lockout_key)
        if ttl > 0:
            minutes = ttl // 60
            seconds = ttl % 60
            time_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
            return True, f"Account temporarily locked due to too many failed attempts. Try again in {time_str}."
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Redis lockout check failed: {e}")
    return False, None


async def register_failed_attempt(email: str) -> int:
    """Register a failed login attempt and set lockout if attempts exceed 5 in Redis"""
    try:
        attempts_key = f"auth:attempts:{email}"
        attempts = await redis_client.incr(attempts_key)
        
        # Set expiry for attempts tracking on first failed attempt
        if attempts == 1:
            await redis_client.expire(attempts_key, 15 * 60)
            
        if attempts >= 5:
            lockout_key = f"auth:lockout:{email}"
            await redis_client.set(lockout_key, "1", ex=15 * 60)
            await redis_client.delete(attempts_key)
            import logging
            logging.getLogger(__name__).warning(f"[SECURITY] Account {email} locked out for 15 minutes.")
            
        return attempts
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Redis register failed attempt failed: {e}")
        return 1


async def reset_failed_attempts(email: str) -> None:
    """Reset failed login attempts for a user upon successful login in Redis"""
    try:
        await redis_client.delete(f"auth:attempts:{email}", f"auth:lockout:{email}")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Redis reset failed attempts failed: {e}")

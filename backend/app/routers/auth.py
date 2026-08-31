"""
EduAudit AI - Authentication API Endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt

from app.config import settings
from app.db import get_db
from app.models.user import User
from app.models.auditor import Auditor
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
    AuditorProfileResponse
)
from app.auth.jwt import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    check_login_lockout,
    register_failed_attempt,
    reset_failed_attempts
)
from app.middleware.rbac import get_current_user, get_current_auditor_profile

router = APIRouter()


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register_citizen(request: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Citizen registration endpoint (only role citizen is self-registrable)"""
    # Check duplicate email
    existing_email = await db.execute(select(User).where(User.email == request.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Check duplicate phone
    existing_phone = await db.execute(select(User).where(User.phone == request.phone))
    if existing_phone.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this phone number already exists."
        )

    # Create citizen user
    user = User(
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=get_password_hash(request.password),
        role="citizen"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate tokens
    access_token = create_access_token(user_id=str(user.id), role=user.role)
    refresh_token = create_refresh_token(user_id=str(user.id), role=user.role)

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)

    return LoginResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Central login endpoint for Citizen, Auditor, and Admin (sets HttpOnly cookies)"""
    email = request.email.lower().strip()
    
    # 1. Lockout check
    is_locked, error_msg = await check_login_lockout(email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=error_msg
        )

    # 2. Fetch user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # 3. Verify credentials
    if not user or not verify_password(request.password, user.password_hash):
        attempts = await register_failed_attempt(email)
        remaining = 5 - attempts
        if remaining > 0:
            detail = f"Invalid email or password. {remaining} attempts remaining before account lock."
        else:
            detail = "Account locked out due to too many failed attempts. Try again in 15 minutes."
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )

    # Reset failure counters
    await reset_failed_attempts(email)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    # 4. Auditor district detection
    district = None
    auditor_profile = None
    if user.role == "auditor":
        aud_res = await db.execute(select(Auditor).where(Auditor.user_id == user.id))
        auditor_profile = aud_res.scalar_one_or_none()
        if auditor_profile:
            district = auditor_profile.district

    # 5. Tokens generation
    access_token = create_access_token(user_id=str(user.id), role=user.role, district=district)
    refresh_token = create_refresh_token(user_id=str(user.id), role=user.role)

    # 6. Cookies setup
    set_auth_cookies(response, access_token, refresh_token)

    return LoginResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user),
        auditor=AuditorProfileResponse.from_orm(auditor_profile) if auditor_profile else None
    )


@router.post("/logout")
async def logout(response: Response):
    """Logs the user out by clearing HttpOnly authentication cookies"""
    clear_auth_cookies(response)
    return {"status": "success", "message": "Successfully logged out"}


@router.post("/refresh", response_model=LoginResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Refresh tokens using the refresh_token HttpOnly cookie"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing. Please log in again."
        )

    try:
        payload = jwt.decode(
            refresh_token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type."
            )
        
        user_id_str = payload.get("sub")
        user_uuid = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token session. Please log in again."
        )

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session deactivated or user not found."
        )

    # Re-fetch auditor district if auditor
    district = None
    auditor_profile = None
    if user.role == "auditor":
        aud_res = await db.execute(select(Auditor).where(Auditor.user_id == user.id))
        auditor_profile = aud_res.scalar_one_or_none()
        if auditor_profile:
            district = auditor_profile.district

    # Issue new tokens
    access_token = create_access_token(user_id=str(user.id), role=user.role, district=district)
    new_refresh_token = create_refresh_token(user_id=str(user.id), role=user.role)

    # Set new cookies
    set_auth_cookies(response, access_token, new_refresh_token)

    return LoginResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user),
        auditor=AuditorProfileResponse.from_orm(auditor_profile) if auditor_profile else None
    )


@router.get("/me", response_model=LoginResponse)
async def get_me(
    user: User = Depends(get_current_user),
    auditor_profile: Optional[Auditor] = Depends(get_current_auditor_profile)
):
    """Retrieve profile and data for the currently logged-in user session"""
    return LoginResponse(
        user=UserResponse.from_orm(user),
        auditor=AuditorProfileResponse.from_orm(auditor_profile) if auditor_profile else None
    )

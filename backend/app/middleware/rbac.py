"""
EduAudit AI - Role-Based Access Control (RBAC) & Dependency Injection
"""
from typing import List, Optional
from uuid import UUID
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.auditor import Auditor
from app.auth.jwt import extract_token_from_request, get_token_payload

# RBAC Permissions Mapping
ROLE_PERMISSIONS = {
    "citizen": [
        "complaints:create",
        "complaints:track",
        "reports:view",
        "chatbot:use",
        "profile:edit"
    ],
    "auditor": [
        "complaints:view_assigned",
        "complaints:review",
        "complaints:approve",
        "complaints:reject",
        "complaints:change_status",
        "reports:generate",
        "images:upload"
    ],
    "admin": [
        "auditors:create",
        "auditors:delete",
        "schools:manage",
        "analytics:view",
        "districts:assign"
    ]
}


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to retrieve the currently authenticated user from cookie or header token"""
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Access token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = get_token_payload(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject.",
        )

    try:
        user_uuid = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    # Fetch user from DB
    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated.",
        )

    # Attach the decrypted token payload data back to request state
    request.state.user = user
    request.state.token_payload = payload

    return user


async def get_current_auditor_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[Auditor]:
    """Dependency to retrieve the auditor profile if the user is an auditor"""
    if user.role != "auditor":
        return None

    result = await db.execute(
        select(Auditor).where(Auditor.user_id == user.id)
    )
    return result.scalar_one_or_none()


def require_role(*allowed_roles: str):
    """Dependency factory to require specific role(s) for an endpoint"""
    async def role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Current role: {user.role}",
            )
        return user
    return role_dependency


def require_permission(permission: str):
    """Dependency factory to check if a user has a specific permission based on their role"""
    async def permission_dependency(user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(user.role, [])
        if permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permission: {permission}",
            )
        return user
    return permission_dependency


def check_auditor_district_access(user: User, auditor_profile: Optional[Auditor], district: str) -> None:
    """Helper to verify that an auditor can only access complaints/reports in their assigned district"""
    if user.role == "admin":
        return  # Admins bypass district checks
        
    if user.role != "auditor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only auditors and admins can access district-scoped resources."
        )
        
    if not auditor_profile or auditor_profile.district.lower() != district.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. You are assigned to '{auditor_profile.district if auditor_profile else 'None'}' district, not '{district}'."
        )

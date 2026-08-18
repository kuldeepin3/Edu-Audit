"""
EduAudit AI - Admin Management Endpoints
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db import get_db
from app.models.user import User
from app.models.auditor import Auditor
from app.models.complaint import Complaint
from app.models.school import School
from app.schemas.auth import AuditorCreate, AuditorResponse, UserResponse
from app.middleware.rbac import require_role
from app.auth.jwt import get_password_hash

router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.post("/auditors", response_model=AuditorResponse, status_code=status.HTTP_201_CREATED)
async def create_auditor(request: AuditorCreate, db: AsyncSession = Depends(get_db)):
    """Admin creates a new Auditor account and profile"""
    # 1. Check if email/phone exists
    existing = await db.execute(
        select(User).where((User.email == request.email) | (User.phone == request.phone))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or phone already exists."
        )

    # 2. Check if employee ID exists
    existing_employee = await db.execute(
        select(Auditor).where(Auditor.employee_id == request.employee_id)
    )
    if existing_employee.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An auditor with employee ID '{request.employee_id}' already exists."
        )

    # 3. Create User account
    user = User(
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=get_password_hash(request.password),
        role="auditor",
        is_verified=True,
    )
    db.add(user)
    await db.flush()  # Obtain user ID

    # 4. Create Auditor profile
    auditor = Auditor(
        user_id=user.id,
        employee_id=request.employee_id,
        department=request.department,
        district=request.district,
        designation=request.designation
    )
    db.add(auditor)
    await db.commit()
    await db.refresh(auditor)

    # Re-fetch with joined load or construct manual dict for response model
    # UserResponse and AuditorResponse are configured with from_attributes=True
    return auditor


@router.get("/auditors", response_model=List[AuditorResponse])
async def list_auditors(db: AsyncSession = Depends(get_db)):
    """List all auditor accounts and profiles"""
    result = await db.execute(
        select(Auditor)
    )
    auditors = result.scalars().all()
    return auditors


@router.delete("/auditors/{auditor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_auditor(auditor_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Admin deletes an auditor account (cascades to auditor profile)"""
    result = await db.execute(
        select(Auditor).where(Auditor.id == auditor_id)
    )
    auditor = result.scalar_one_or_none()
    if not auditor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Auditor profile not found."
        )

    user_id = auditor.user_id
    
    # Delete the user record, cascade will clean up the auditor profile
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        await db.delete(user)
        await db.commit()
    else:
        # Fallback delete auditor if user not found
        await db.delete(auditor)
        await db.commit()

    return None


@router.get("/analytics")
async def get_admin_analytics(db: AsyncSession = Depends(get_db)):
    """Fetch system statistics for Admin dashboard"""
    # Citizens count
    citizen_count = await db.execute(
        select(func.count(User.id)).where(User.role == "citizen")
    )
    # Auditors count
    auditor_count = await db.execute(
        select(func.count(User.id)).where(User.role == "auditor")
    )
    # Complaints status groups
    complaint_counts = await db.execute(
        select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
    )
    status_summary = {r[0]: r[1] for r in complaint_counts.all()}
    
    # Total schools
    school_count = await db.execute(select(func.count(School.id)))

    return {
        "citizens_count": citizen_count.scalar() or 0,
        "auditors_count": auditor_count.scalar() or 0,
        "schools_count": school_count.scalar() or 0,
        "complaints_status_summary": status_summary,
        "total_complaints": sum(status_summary.values())
    }

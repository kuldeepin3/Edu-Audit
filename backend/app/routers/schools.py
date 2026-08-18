"""
EduAudit AI - Schools API Endpoints
School search, management, and health scores
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.db import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models.user import User
from app.models.school import School
from app.models.complaint import Complaint
from app.schemas import SchoolResponse, SchoolListResponse, SchoolHealthResponse

router = APIRouter()


@router.get("/search", response_model=List[SchoolResponse])
async def search_schools(
    q: str = Query(..., min_length=2, description="Search by name, UDISE code, or location"),
    district_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Search schools by name or UDISE code.
    Case insensitive, return maximum 10 records.
    """
    query = (
        select(School)
        .options(joinedload(School.district))
        .where(
            School.name.ilike(f"%{q}%") |
            School.udise_code.ilike(f"%{q}%")
        )
    )

    if district_id:
        query = query.where(School.district_id == uuid.UUID(district_id))

    query = query.order_by(School.name).limit(10)

    result = await db.execute(query)
    schools = result.scalars().all()

    return [SchoolResponse.from_orm(s) for s in schools]


@router.get("/nearby")
async def nearby_schools(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_km: float = Query(10, ge=1, le=100, description="Search radius in km"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Find schools near a GPS coordinate using PostGIS.
    """
    point = f"POINT({longitude} {latitude})"

    # PostGIS distance query
    query = select(School).order_by(
        func.ST_Distance(School.location, func.ST_GeogFromText(point, 4326))
    ).limit(page_size)

    result = await db.execute(query)
    schools = result.scalars().all()

    return {
        "items": [
            {
                **SchoolResponse.from_orm(s).dict(),
                "distance_km": round(
                    float(func.ST_Distance(s.location, func.ST_GeogFromText(point, 4326))),
                    2
                ),
            }
            for s in schools
        ],
        "center": {"lat": latitude, "lng": longitude},
        "radius_km": radius_km,
    }


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed school information including health score"""
    result = await db.execute(
        select(School).where(School.id == uuid.UUID(school_id))
    )
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return SchoolResponse.from_orm(school)


@router.get("/{school_id}/health", response_model=SchoolHealthResponse)
async def get_school_health(
    school_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive health score breakdown for a school"""
    # Get school
    result = await db.execute(
        select(School).where(School.id == uuid.UUID(school_id))
    )
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Get open complaints
    open_result = await db.execute(
        select(func.count()).select_from(
            select(Complaint).where(
                Complaint.school_id == uuid.UUID(school_id),
                Complaint.status.not_in(["completed", "rejected", "draft"]),
            ).subquery()
        )
    )
    open_complaints = open_result.scalar()

    return SchoolHealthResponse(
        school_id=school.id,
        school_name=school.name,
        health_score=school.health_score,
        health_grade=school.health_grade or "N/A",
        open_complaints=open_complaints,
        total_enrollment=school.enrollment,
    )

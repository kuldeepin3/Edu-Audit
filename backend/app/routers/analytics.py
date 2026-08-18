"""
EduAudit AI - Analytics & Dashboard API
For District Education Officers and administrators
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.db import get_db
from app.middleware.rbac import require_role
from app.models.user import User
from app.models.complaint import Complaint
from app.models.school import School

router = APIRouter()


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    district_id: Optional[str] = None,
    user: User = Depends(require_role("deo", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard summary statistics.
    Returns pending complaints, resolution rates, health scores, etc.
    """
    query = select(
        func.count().label("total"),
        func.count().filter(Complaint.severity_level == "critical").label("critical"),
        func.count().filter(Complaint.severity_level == "high").label("high"),
        func.count().filter(Complaint.status == "completed").label("completed"),
        func.count().filter(Complaint.status.in_(["submitted", "ai_verified", "pending_review"])).label("pending"),
        func.count().filter(Complaint.status == "in_progress").label("in_progress"),
        func.avg(Complaint.severity_score).label("avg_severity"),
    ).where(Complaint.status != "draft")

    if district_id:
        query = query.where(Complaint.school_id.in_(
            select(School.id).where(School.district_id == district_id)
        ))

    result = await db.execute(query)
    row = result.one()

    return {
        "total_complaints": row.total,
        "critical_pending": row.critical,
        "high_priority": row.high,
        "completed": row.completed,
        "pending_review": row.pending,
        "in_progress": row.in_progress,
        "avg_severity": round(float(row.avg_severity), 1) if row.avg_severity else 0,
        "resolution_rate": round(row.completed / row.total * 100, 1) if row.total else 0,
    }


@router.get("/dashboard/category-breakdown")
async def get_category_breakdown(
    district_id: Optional[str] = None,
    user: User = Depends(require_role("deo", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get complaints broken down by category with counts and severity"""
    query = select(
        Complaint.category_id,
        func.count().label("count"),
        func.avg(Complaint.severity_score).label("avg_severity"),
        func.count().filter(Complaint.status == "completed").label("resolved"),
    ).where(
        Complaint.status != "draft"
    ).group_by(Complaint.category_id)

    result = await db.execute(query)
    categories = result.all()

    return {
        "categories": [
            {
                "category_id": str(row.category_id),
                "count": row.count,
                "avg_severity": round(float(row.avg_severity), 1) if row.avg_severity else 0,
                "resolved": row.resolved,
                "pending": row.count - row.resolved,
            }
            for row in categories
        ]
    }


@router.get("/dashboard/trend")
async def get_complaint_trend(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    months: int = Query(6, ge=1, le=24),
    district_id: Optional[str] = None,
    user: User = Depends(require_role("deo", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get complaint trend over time for charts"""
    # SQL date truncation based on period
    trunc = {
        "daily": func.date_trunc("day", Complaint.created_at),
        "weekly": func.date_trunc("week", Complaint.created_at),
        "monthly": func.date_trunc("month", Complaint.created_at),
    }[period]

    query = select(
        trunc.label("period"),
        func.count().label("count"),
        func.count().filter(Complaint.severity_level == "critical").label("critical"),
    ).where(
        Complaint.status != "draft"
    ).group_by(trunc).order_by(trunc.desc())

    result = await db.execute(query)
    data = result.all()

    return {
        "trend": [
            {
                "period": str(row.period),
                "count": row.count,
                "critical": row.critical,
            }
            for row in data
        ]
    }


@router.get("/schools/ranking")
async def get_school_ranking(
    district_id: Optional[str] = None,
    sort_by: str = Query("health_score", pattern="^(health_score|complaints|severity)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(require_role("deo", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get school rankings by health score, complaint count, or severity"""
    query = select(School).order_by(
        School.health_score.asc() if sort_by == "health_score" and order == "asc"
        else School.health_score.desc()
    ).limit(limit)

    result = await db.execute(query)
    schools = result.scalars().all()

    return {
        "schools": [
            {
                "id": str(s.id),
                "name": s.name,
                "udise_code": s.udise_code,
                "health_score": s.health_score,
                "health_grade": s.health_grade,
                "enrollment": s.enrollment,
                "school_type": s.school_type,
            }
            for s in schools
        ]
    }

"""
EduAudit AI - Complaints API Endpoints
Core citizen reporting system
"""
import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.db import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models.complaint import Complaint, StatusHistory
from app.models.image import Image
from app.models.school import School
from app.models.category import Category
from app.models.user import User
from app.schemas import (
    ComplaintResponse, ComplaintListResponse,
    ComplaintUpdate, ReportTrackingResponse
)
from app.services.storage import upload, storage
from app.services.vision import analyze_image
from app.services.fraud import check_fraud
from app.services.report_generator import generate_auto_report

router = APIRouter()


@router.post("/", response_model=ComplaintResponse, status_code=201)
async def create_complaint(
    description: Optional[str] = Form(None),
    school_id: Optional[str] = Form(None),
    category_code: Optional[str] = Form(None),
    is_anonymous: bool = Form(False),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    images: List[UploadFile] = File(default=[]),
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new infrastructure complaint.
    Supports both authenticated and anonymous submissions.
    """
    school = None
    category = None
    # Validate school
    if school_id:
        school_result = await db.execute(
            select(School).where(School.id == uuid.UUID(school_id))
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

    # Validate category
    if category_code:
        cat_result = await db.execute(
            select(Category).where(Category.code == category_code)
        )
        category = cat_result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

    # Generate report ID
    report_id = await _generate_report_id(db)

    # Process uploaded images
    uploaded_images = []
    ai_results = None

    for i, image_file in enumerate(images):
        # Validate file type and size
        if image_file.content_type not in ["image/jpeg", "image/png", "image/webp", "video/mp4"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {image_file.content_type}",
            )
        if len(await image_file.read()) > 20 * 1024 * 1024:  # 20MB
            raise HTTPException(status_code=400, detail="File too large (max 20MB)")

        await image_file.seek(0)
        image_bytes = await image_file.read()

        # Fraud detection
        fraud_result = await check_fraud(image_bytes, report_id)
        if fraud_result.is_fraud and not fraud_result.requires_human_review:
            raise HTTPException(
                status_code=400,
                detail=f"Image rejected: {fraud_result.reason}",
            )

        # Upload to storage
        image_url = await upload(image_bytes, f"complaints/{report_id}/image_{i}.jpg")
        
        # Generate and save thumbnail locally
        thumb_bytes = await storage.generate_thumbnail(image_bytes)
        thumbnail_url = await upload(thumb_bytes, f"complaints/{report_id}/thumb_{i}.jpg")

        uploaded_images.append({
            "storage_url": image_url,
            "thumbnail_url": thumbnail_url,
            "file_size": len(image_bytes),
        })

        # Run AI analysis on first image
        if i == 0 and not ai_results:
            ai_results = await analyze_image(image_bytes)

    # Auto-categorize if not specified
    if not category_code and ai_results:
        category_code = ai_results.primary_class_code
        cat_result = await db.execute(
            select(Category).where(Category.code == category_code)
        )
        category = cat_result.scalar_one_or_none()

    # Calculate severity
    severity = category.default_severity if category else "medium"
    severity_score = ai_results.severity_score if ai_results else 5.0
    ai_confidence = ai_results.confidence if ai_results else None

    # Generate structured AI report
    ai_report = None
    if ai_results:
        ai_report = generate_auto_report(
            school=school,
            category=category,
            ai_results=ai_results,
            report_id=report_id,
        )

    # Determine initial status
    status = "ai_verified" if ai_confidence and ai_confidence > 85 else "pending_review"

    # Create complaint
    complaint = Complaint(
        report_id=report_id,
        reporter_id=user.id if user and not is_anonymous else None,
        school_id=uuid.UUID(school_id) if school_id else None,
        category_id=category.id if category else None,
        status=status,
        severity_level=severity,
        severity_score=severity_score,
        ai_confidence=ai_confidence,
        description=description or "",
        ai_analysis=ai_report.dict() if ai_report else {},
        is_anonymous=is_anonymous,
        gps_location=f"POINT({longitude} {latitude})" if latitude and longitude else None,
    )
    db.add(complaint)
    await db.flush()  # Get complaint.id

    # Create image records
    for i, img_data in enumerate(uploaded_images):
        image = Image(
            complaint_id=complaint.id,
            media_url=img_data["storage_url"],
            cloudinary_url=None,
            thumbnail_url=img_data["thumbnail_url"],
            file_size=img_data["file_size"],
            is_primary=(i == 0),
            detection_results=ai_results.detections if i == 0 and ai_results else [],
        )
        db.add(image)

    # Log status
    status_entry = StatusHistory(
        complaint_id=complaint.id,
        new_status=status,
        notes="Complaint created via " + ("anonymous" if is_anonymous else "authenticated") + " submission",
    )
    db.add(status_entry)

    await db.commit()
    await db.refresh(complaint)

    return ComplaintResponse.from_orm(complaint)


@router.get("/track/{report_id}", response_model=ReportTrackingResponse)
async def track_complaint(
    report_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public complaint tracking by report ID — no auth required"""
    result = await db.execute(
        select(Complaint).where(Complaint.report_id == report_id)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get status history
    history_result = await db.execute(
        select(StatusHistory)
        .where(StatusHistory.complaint_id == complaint.id)
        .order_by(StatusHistory.created_at)
    )
    history = history_result.scalars().all()

    return ReportTrackingResponse(
        report_id=complaint.report_id,
        status=complaint.status,
        category=str(complaint.category_id) if complaint.category_id else None,
        school_id=complaint.school_id,
        severity_level=complaint.severity_level,
        severity_score=complaint.severity_score,
        created_at=complaint.created_at,
        resolved_at=complaint.resolved_at,
        status_history=[
            {"status": h.new_status, "timestamp": h.created_at, "notes": h.notes}
            for h in history
        ],
    )


from sqlalchemy.orm import selectinload, joinedload


@router.get("/", response_model=ComplaintListResponse)
async def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    school_id: Optional[str] = None,
    district_id: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|severity_score|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    user: User = Depends(require_role("auditor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """List complaints with filtering (auth required)"""
    query = select(
        Complaint,
        func.ST_AsText(Complaint.gps_location).label("gps_wkt")
    ).options(
        joinedload(Complaint.school).joinedload(School.district)
    ).where(Complaint.status != "draft")

    # Apply filters
    if status:
        query = query.where(Complaint.status == status)
    if school_id:
        query = query.where(Complaint.school_id == uuid.UUID(school_id))
    if severity:
        query = query.where(Complaint.severity_level == severity)
    if category:
        query = query.where(Complaint.category_code == category)

    # Role-based filtering
    if user.role == "deo":
        # DEO sees complaints from their district only
        pass  # Add district filter
    elif user.role == "principal":
        # Principal sees complaints for their school only
        query = query.where(Complaint.school_id == user.school_id)

    # Sorting
    sort_column = getattr(Complaint, sort_by)
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    # Pagination
    total = await db.execute(select(func.count()).select_from(Complaint).where(Complaint.status != "draft"))
    total_count = total.scalar()
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        c = row[0]
        wkt = row[1]
        lat, lng = None, None
        if wkt and "POINT(" in str(wkt):
            try:
                coords = str(wkt).replace("POINT(", "").replace(")", "").strip().split()
                if len(coords) == 2:
                    lng = float(coords[0])
                    lat = float(coords[1])
            except Exception:
                pass

        s_name = c.school.name if c.school else "Vadodara Primary School"
        d_name = c.school.district.name if (c.school and c.school.district) else (c.ai_analysis.get("district") if c.ai_analysis else "Vadodara")
        
        gps_str = f"{lat:.6f}, {lng:.6f}" if (lat is not None and lng is not None) else (c.ai_analysis.get("gps_location") if (c.ai_analysis and c.ai_analysis.get("gps_location")) else f"{s_name}, {d_name}")

        c_dict = {
            "id": c.id,
            "report_id": c.report_id,
            "school_id": c.school_id,
            "school_name": s_name,
            "district": d_name,
            "category_id": c.category_id,
            "status": c.status,
            "severity_level": c.severity_level,
            "severity_score": float(c.severity_score) if c.severity_score is not None else 0.0,
            "ai_confidence": float(c.ai_confidence) if c.ai_confidence is not None else None,
            "description": c.description,
            "ai_analysis": c.ai_analysis or {},
            "is_anonymous": c.is_anonymous,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "resolved_at": c.resolved_at,
            "latitude": lat,
            "longitude": lng,
            "gps_location": gps_str,
        }
        items.append(ComplaintResponse(**c_dict))

    return ComplaintListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=(total_count + page_size - 1) // page_size,
    )


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: str,
    update: ComplaintUpdate,
    user: User = Depends(require_role("auditor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update complaint status (DEO/Admin only)"""
    result = await db.execute(
        select(Complaint).where(Complaint.id == uuid.UUID(complaint_id))
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    complaint.status = update.status
    complaint.assigned_to = user.id if not complaint.assigned_to else complaint.assigned_to
    complaint.updated_at = datetime.utcnow()

    if update.status == "completed":
        complaint.resolved_at = datetime.utcnow()
        complaint.resolution_notes = update.notes

    # Log status change
    status_entry = StatusHistory(
        complaint_id=complaint.id,
        old_status=old_status,
        new_status=update.status,
        changed_by=user.id,
        notes=update.notes or "",
    )
    db.add(status_entry)

    await db.commit()
    await db.refresh(complaint)

    # Re-query with school/district eager loading
    res = await db.execute(
        select(Complaint, func.ST_AsText(Complaint.gps_location).label("gps_wkt"))
        .options(joinedload(Complaint.school).joinedload(School.district))
        .where(Complaint.id == complaint.id)
    )
    row = res.first()
    c = row[0]
    wkt = row[1]
    lat, lng = None, None
    if wkt and "POINT(" in str(wkt):
        try:
            coords = str(wkt).replace("POINT(", "").replace(")", "").strip().split()
            if len(coords) == 2:
                lng = float(coords[0])
                lat = float(coords[1])
        except Exception:
            pass

    s_name = c.school.name if c.school else "Vadodara Primary School"
    d_name = c.school.district.name if (c.school and c.school.district) else (c.ai_analysis.get("district") if c.ai_analysis else "Vadodara")
    gps_str = f"{lat:.6f}, {lng:.6f}" if (lat is not None and lng is not None) else (c.ai_analysis.get("gps_location") if (c.ai_analysis and c.ai_analysis.get("gps_location")) else f"{s_name}, {d_name}")

    c_dict = {
        "id": c.id,
        "report_id": c.report_id,
        "school_id": c.school_id,
        "school_name": s_name,
        "district": d_name,
        "category_id": c.category_id,
        "status": c.status,
        "severity_level": c.severity_level,
        "severity_score": float(c.severity_score) if c.severity_score is not None else 0.0,
        "ai_confidence": float(c.ai_confidence) if c.ai_confidence is not None else None,
        "description": c.description,
        "ai_analysis": c.ai_analysis or {},
        "is_anonymous": c.is_anonymous,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "resolved_at": c.resolved_at,
        "latitude": lat,
        "longitude": lng,
        "gps_location": gps_str,
    }
    return ComplaintResponse(**c_dict)


async def _generate_report_id(db: AsyncSession) -> str:
    """Generate unique report tracking ID: RPT-YYYYMMDD-NNNNN"""
    date_str = datetime.now().strftime("%Y%m%d")
    prefix = f"RPT-{date_str}-"

    # Count existing reports today
    result = await db.execute(
        select(func.count())
        .select_from(Complaint)
        .where(Complaint.report_id.like(f"RPT-{date_str}%"))
    )
    count = result.scalar() + 1

    return f"{prefix}{count:05d}"

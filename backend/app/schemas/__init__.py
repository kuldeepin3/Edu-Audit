"""
EduAudit AI - Pydantic Schemas
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator


# ============================================================================
# AUTH SCHEMAS
# ============================================================================
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    AuditorProfileResponse,
    AuditorResponse,
    AuditorCreate,
    TokenPayload,
    LoginResponse
)

class AnonymousTokenRequest(BaseModel):
    device_fingerprint: str = Field(..., min_length=1)


class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{9,14}$")


# ============================================================================
# COMPLAINT SCHEMAS
# ============================================================================

class ComplaintResponse(BaseModel):
    id: UUID
    report_id: str
    school_id: Optional[UUID] = None
    school_name: Optional[str] = None
    district: Optional[str] = None
    category_id: Optional[UUID] = None
    status: str
    severity_level: str
    severity_score: float
    ai_confidence: Optional[float] = None
    description: Optional[str] = None
    ai_analysis: Dict[str, Any] = {}
    is_anonymous: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_location: Optional[str] = None

    class Config:
        from_attributes = True


class ComplaintListResponse(BaseModel):
    items: List[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ComplaintUpdate(BaseModel):
    status: str = Field(..., pattern="^(verified|assigned|in_progress|pending_completion|completed|rejected|reopened)$")
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class ReportTrackingResponse(BaseModel):
    report_id: str
    status: str
    category: Optional[str] = None
    school_id: Optional[UUID] = None
    severity_level: str
    severity_score: float
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    status_history: List[Dict[str, Any]] = []


# ============================================================================
# SCHOOL SCHEMAS
# ============================================================================

class SchoolResponse(BaseModel):
    id: UUID
    udise_code: Optional[str] = None
    name: str
    address: Optional[str] = None
    enrollment: int = 0
    school_type: Optional[str] = None
    health_score: int = 0
    health_grade: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_custom_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            res = {}
            for field in cls.model_fields:
                if hasattr(data, field):
                    res[field] = getattr(data, field)
            
            # Extract district name if available
            if hasattr(data, "district") and data.district:
                res["district"] = data.district.name
            
            # Extract location coordinates
            if hasattr(data, "location") and data.location is not None:
                try:
                    from geoalchemy2.shape import to_shape
                    shape = to_shape(data.location)
                    res["longitude"] = shape.x
                    res["latitude"] = shape.y
                except Exception:
                    pass
            return res
        return data


class SchoolListResponse(BaseModel):
    items: List[SchoolResponse]
    total: int
    page: int
    page_size: int


class SchoolHealthResponse(BaseModel):
    school_id: UUID
    school_name: str
    health_score: int
    health_grade: str
    open_complaints: int
    total_enrollment: int

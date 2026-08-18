"""
EduAudit AI - SQLAlchemy ORM Models: Complaint & StatusHistory
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship

from app.db import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(String(20), unique=True, nullable=False, index=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True)
    status = Column(String(30), default="submitted", nullable=False, index=True)
    severity_level = Column(String(20), default="medium", nullable=False)
    severity_score = Column(Numeric(4, 1), default=0.0, nullable=False)
    ai_confidence = Column(Numeric(5, 2))
    gps_location = Column(Geography("POINT", srid=4326))
    description = Column(Text, default="")
    ai_analysis = Column(JSONB, default={})
    is_anonymous = Column(Boolean, default=False)
    device_fingerprint = Column(String(255))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    estimated_cost_min = Column(Integer)
    estimated_cost_max = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reporter = relationship("User", back_populates="complaints", foreign_keys=[reporter_id])
    school = relationship("School", back_populates="complaints")
    category = relationship("Category")
    images = relationship("Image", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship(
        "StatusHistory", back_populates="complaint", cascade="all, delete-orphan"
    )


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(
        UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    old_status = Column(String(30))
    new_status = Column(String(30), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    complaint = relationship("Complaint", back_populates="status_history")

"""
EduAudit AI - SQLAlchemy ORM Models: User
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200))
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(String(20), default="citizen", index=True)  # citizen, teacher, deo, etc.
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id"))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"))
    reputation_score = Column(Integer, default=0)
    reputation_level = Column(String(20), default="New")
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500))
    metadata_ = Column("metadata", JSONB, default={})
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="reporter", foreign_keys="Complaint.reporter_id")
    auditor_profile = relationship("Auditor", back_populates="user", uselist=False, cascade="all, delete-orphan")

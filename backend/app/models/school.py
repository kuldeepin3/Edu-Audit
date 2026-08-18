"""
EduAudit AI - SQLAlchemy ORM Models: School
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship

from app.db import Base


class School(Base):
    __tablename__ = "schools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    udise_code = Column(String(15), unique=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id"), nullable=False, index=True)
    address = Column(Text)
    location = Column(Geography("POINT", srid=4326))
    block = Column(String(100))
    cluster = Column(String(100))
    enrollment = Column(Integer, default=0)
    school_type = Column(String(50))  # primary, upper_primary, secondary, sr_secondary
    management_type = Column(String(50))  # govt, govt_aided, private_aided
    health_score = Column(Integer, default=0)
    health_grade = Column(String(2))
    infrastructure_data = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="school")
    district = relationship("District")

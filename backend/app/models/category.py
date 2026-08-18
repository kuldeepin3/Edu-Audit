"""
EduAudit AI - SQLAlchemy ORM Models: Category & District & State
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship

from app.db import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(50))
    default_severity = Column(String(20), default="medium", nullable=False)
    sla_days = Column(Integer, default=14, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class State(Base):
    __tablename__ = "states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(5), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class District(Base):
    __tablename__ = "districts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    state_id = Column(UUID(as_uuid=True), ForeignKey("states.id"), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    deo_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    boundaries = Column(Geography("POLYGON", srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)

    state = relationship("State")

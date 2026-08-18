"""
EduAudit AI - SQLAlchemy ORM Models: Auditor
"""
import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Auditor(Base):
    __tablename__ = "auditors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)

    # Relationships
    user = relationship("User", back_populates="auditor_profile")

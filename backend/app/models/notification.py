"""
EduAudit AI - SQLAlchemy ORM Models: Notification & AuditLog
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.dialects.postgresql import JSONB as PGJSONB
from app.db import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String(20), default="in_app")  # in_app, email, sms, push
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), index=True)
    changes = Column(JSONB, default={})
    ip_address = Column(INET)
    user_agent = Column(Text)
    request_path = Column(String(500))
    response_status = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

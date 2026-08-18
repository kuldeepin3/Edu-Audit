"""
EduAudit AI - SQLAlchemy ORM Models: Image
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship

from app.db import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(
        UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    s3_url = Column(String(500), nullable=False)
    cloudinary_url = Column(String(500))
    thumbnail_url = Column(String(500))
    embedding = Column(Vector(768))  # CLIP ViT-L/14 embedding
    phash = Column(String(64), index=True)  # Perceptual hash for fraud detection
    exif_data = Column(JSONB, default={})
    detection_results = Column(JSONB, default=[])  # YOLOv11 bounding boxes
    file_size = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    mime_type = Column(String(50))
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="images")

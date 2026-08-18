"""
EduAudit AI - Fraud Detection API
Perceptual hashing, CLIP similarity, and spam detection
"""
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.rbac import get_current_user as require_auth, require_role
from app.models.user import User
from app.services.fraud import FraudDetector

router = APIRouter()

detector = FraudDetector()


class FraudCheckResponse(BaseModel):
    is_fraud: bool
    confidence: float
    reason: Optional[str] = None
    similar_reports: Optional[list] = None
    requires_human_review: bool = False
    checks_performed: list


@router.post("/check", response_model=FraudCheckResponse)
async def check_image_fraud(
    image: UploadFile = File(...),
    user: User = Depends(require_role("admin", "deo", "volunteer")),
):
    """
    Check an image for potential fraud (duplicates, edited images, internet-sourced).
    Used internally during complaint submission; also available for manual checks.
    """
    image_bytes = await image.read()

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large")

    result = await detector.full_check(image_bytes)

    return FraudCheckResponse(
        is_fraud=result.is_fraud,
        confidence=result.confidence,
        reason=result.reason,
        similar_reports=result.similar_report_ids,
        requires_human_review=result.requires_human_review,
        checks_performed=result.checks_performed,
    )

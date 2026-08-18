"""
EduAudit AI - API Router (all endpoints)
"""
from fastapi import APIRouter

from app.routers.complaints import router as complaints_router
from app.routers.schools import router as schools_router
from app.routers.auth import router as auth_router
from app.routers.vision import router as vision_router
from app.routers.chatbot import router as chatbot_router
from app.routers.analytics import router as analytics_router
from app.routers.fraud import router as fraud_router
from app.routers.notifications import router as notifications_router
from app.routers.admin import router as admin_router

router = APIRouter()

# Public routes (no auth required for complaint submission)
router.include_router(complaints_router, prefix="/complaints", tags=["Complaints"])
router.include_router(schools_router, prefix="/schools", tags=["Schools"])
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(vision_router, prefix="/vision", tags=["Computer Vision"])
router.include_router(fraud_router, prefix="/fraud", tags=["Fraud Detection"])

# Protected routes (auth required)
router.include_router(chatbot_router, prefix="/chatbot", tags=["AI Chatbot"])
router.include_router(analytics_router, prefix="/analytics", tags=["Analytics & Dashboard"])
router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
router.include_router(admin_router, prefix="/admin", tags=["Admin Control"])

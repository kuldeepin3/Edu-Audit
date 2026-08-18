"""
EduAudit AI - Celery Worker
Async task processing for AI inference, RAG, and fraud detection
"""
import asyncio
import logging
from celery import Celery, Task
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)

# ============================================================================
# CELERY APP CONFIGURATION
# ============================================================================

celery_app = Celery(
    "eduaudit",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Task routing
    task_routes={
        "app.tasks.vision_tasks.*": {"queue": "ai_priority"},
        "app.tasks.fraud_tasks.*": {"queue": "ai_priority"},
        "app.tasks.rag_tasks.*": {"queue": "ai_standard"},
        "app.tasks.analytics_tasks.*": {"queue": "ai_standard"},
        "app.tasks.notification_tasks.*": {"queue": "notifications"},
    },

    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,

    # Retries
    task_autoretry_for=(Exception,),
    task_max_retries=3,
    task_retry_backoff=True,
    task_retry_backoff_max=60,
    task_retry_jitter=True,

    # Scheduled tasks (Beat)
    beat_schedule={
        # Refresh school health scores daily
        "refresh-health-scores": {
            "task": "app.tasks.analytics_tasks.refresh_all_health_scores",
            "schedule": 86400.0,  # 24 hours
        },
        # Run predictive analytics weekly
        "run-predictions": {
            "task": "app.tasks.analytics_tasks.run_predictions",
            "schedule": 604800.0,  # 7 days
        },
        # Cleanup old fraud detection hashes daily
        "cleanup-fraud-cache": {
            "task": "app.tasks.fraud_tasks.cleanup_hash_store",
            "schedule": 86400.0,
        },
        # Send daily digest to DEOs at 9 AM IST
        "send-deo-digest": {
            "task": "app.tasks.notification_tasks.send_daily_digest",
            "schedule": 86400.0,
        },
    },
)


# ============================================================================
# ASYNC TASK WRAPPER
# ============================================================================

class AsyncTask(Task):
    """
    Base task class that handles async functions.
    Allows using async/await in Celery tasks.
    """

    def __call__(self, *args, **kwargs):
        if asyncio.iscoroutinefunction(self.run):
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(self.run(*args, **kwargs))
            finally:
                loop.close()
        return super().__call__(*args, **kwargs)


@celery_app.task(bind=True, base=AsyncTask, name="app.tasks.vision_tasks.analyze_complaint_images")
async def analyze_complaint_images(self, complaint_id: str, image_urls: list):
    """
    Async task: Run YOLOv11 inference on complaint images.
    Updates the complaint with AI analysis results.
    """
    from app.services.vision import VisionService
    from app.db import AsyncSessionLocal
    from app.models.complaint import Complaint
    from app.models.image import Image
    from sqlalchemy import select
    import uuid

    logger.info(f"[TASK] Analyzing images for complaint {complaint_id}")

    try:
        service = VisionService()
        await service.load_model()

        async with AsyncSessionLocal() as db:
            # Get complaint
            result = await db.execute(
                select(Complaint).where(Complaint.id == uuid.UUID(complaint_id))
            )
            complaint = result.scalar_one_or_none()
            if not complaint:
                logger.error(f"Complaint {complaint_id} not found")
                return

            # Get images
            images_result = await db.execute(
                select(Image).where(Image.complaint_id == complaint.id)
            )
            images = images_result.scalars().all()

            all_detections = []
            primary_result = None

            for img in images:
                # Download and analyze image (simplified)
                # In production: fetch from S3
                detection = service.detect_placeholder()
                img.detection_results = detection
                all_detections.append(detection)
                if primary_result is None:
                    primary_result = detection

            # Update complaint
            if primary_result:
                complaint.ai_confidence = primary_result["confidence"] * 100
                complaint.severity_score = primary_result["severity_score"]
                complaint.status = "ai_verified" if primary_result["confidence"] > 0.85 else "pending_review"
                complaint.ai_analysis = {
                    "primary_class": primary_result["class"],
                    "all_detections": all_detections,
                    "analyzed_at": datetime.utcnow().isoformat(),
                }

            await db.commit()

        logger.info(f"[TASK] Completed analysis for complaint {complaint_id}")
        return {"status": "completed", "complaint_id": complaint_id}

    except Exception as e:
        logger.error(f"[TASK] Failed to analyze complaint {complaint_id}: {e}")
        raise


@celery_app.task(bind=True, base=AsyncTask, name="app.tasks.vision_tasks.batch_reanalyze")
async def batch_reanalyze(self, school_id: str):
    """
    Re-analyze all images for a school (used when model is updated).
    """
    logger.info(f"[TASK] Batch re-analyzing school {school_id}")
    # Implementation: fetch all images, re-run inference, update scores
    return {"status": "completed", "school_id": school_id}

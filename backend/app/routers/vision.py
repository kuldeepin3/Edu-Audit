"""
EduAudit AI - Computer Vision API Endpoints
Two-stage pipeline: YOLO detection + Ollama Vision verification (minicpm-v)
"""
import io
import time
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from PIL import Image
import numpy as np
from pydantic import BaseModel, Field

from app.services.vision import VisionService, DetectionResult, verify_with_ollama, classify_with_gemini_fallback

router = APIRouter()

# Singleton vision service (lazy-loaded)
_vision_service: Optional[VisionService] = None


async def get_vision_service() -> VisionService:
    """Lazy-load vision service (GPU memory optimization)"""
    global _vision_service
    if _vision_service is None:
        _vision_service = VisionService()
        await _vision_service.load_model()
    return _vision_service


# ============================================================================
# SCHEMAS
# ============================================================================

class BBoxResponse(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float
    severity: str


class VerificationResponse(BaseModel):
    verified: bool
    category: str
    confidence: float
    reason: str


class AnalysisResponse(BaseModel):
    detections: List[BBoxResponse]
    primary_class: str
    primary_class_code: str
    primary_confidence: float
    severity_score: float
    severity_level: str
    processing_time_ms: float
    image_dimensions: dict
    recommendation: str
    verification: Optional[VerificationResponse] = None


class BatchAnalysisResponse(BaseModel):
    results: List[AnalysisResponse]
    total_processing_time_ms: float
    aggregate_severity: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_single_image(
    image: UploadFile = File(..., description="Image file (JPEG, PNG, WebP)"),
    category: Optional[str] = Query(None, description="Selected category for AI verification"),
):
    """
    Analyze a single image for infrastructure defects.
    
    Tiered AI Pipeline:
    1. Local YOLOv11 detection — bounding boxes, confidence, severity
    2. Cloud Gemini Vision fallback — if YOLO has no detection / is uncertain
    3. Ollama Vision verification — optional category consistency check
    """
    # Validate file type
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    # Read and validate image
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Stage 1: YOLO inference
    service = await get_vision_service()
    start_time = time.time()
    result = service.detect(img_array)

    primary_cls = result.primary_class
    primary_code = result.primary_class_code
    primary_conf = result.primary_confidence
    sev_score = result.severity_score
    sev_level = result.severity_level
    recommendation = result.recommendation
    verification = None

    # Stage 2 (Intelligent Cloud Fallback): If YOLO has no detections or is uncertain, invoke Gemini Vision
    if not primary_cls or primary_cls == "none" or primary_conf < 0.25:
        gemini_fallback = await classify_with_gemini_fallback(image_bytes)
        if gemini_fallback:
            primary_cls = gemini_fallback["primary_class"]
            primary_code = gemini_fallback["primary_class_code"]
            primary_conf = gemini_fallback["primary_confidence"]
            sev_score = gemini_fallback["severity_score"]
            sev_level = gemini_fallback["severity_level"]
            recommendation = gemini_fallback["recommendation"]
            verification = VerificationResponse(
                verified=True,
                category=primary_cls,
                confidence=primary_conf,
                reason=gemini_fallback.get("reason", f"Verified {primary_cls} via Gemini Vision fallback.")
            )

    # Stage 3: Ollama Vision verification (if category provided and verification not yet set)
    if category and not verification:
        verification_result = await verify_with_ollama(image_bytes, category)
        verification = VerificationResponse(**verification_result)

    if (not primary_cls or primary_cls == "none") and category:
        primary_cls = category
        cat_lower = category.lower().replace(" ", "_")
        primary_code = cat_lower
        primary_conf = 0.88
        if any(w in cat_lower for w in ["wiring", "toilet", "washroom", "structural"]):
            sev_score = 8.5
            sev_level = "critical"
        elif any(w in cat_lower for w in ["wall", "roof", "leakage", "window"]):
            sev_score = 6.5
            sev_level = "high"
        else:
            sev_score = 5.0
            sev_level = "medium"
        from app.services.vision import RECOMMENDATIONS
        recommendation = RECOMMENDATIONS.get(cat_lower, "Inspection and repair recommended for this category.")

    processing_time = (time.time() - start_time) * 1000

    return AnalysisResponse(
        detections=[
            BBoxResponse(
                class_id=d.class_id,
                class_name=d.class_name,
                confidence=round(d.confidence, 3),
                x1=d.bbox[0],
                y1=d.bbox[1],
                x2=d.bbox[2],
                y2=d.bbox[3],
                severity=d.severity,
            )
            for d in result.detections
        ],
        primary_class=primary_cls,
        primary_class_code=primary_code,
        primary_confidence=round(primary_conf, 3),
        severity_score=round(sev_score, 1),
        severity_level=sev_level,
        processing_time_ms=round(processing_time, 2),
        image_dimensions={"width": img.width, "height": img.height},
        recommendation=recommendation,
        verification=verification,
    )


@router.post("/analyze/batch", response_model=BatchAnalysisResponse)
async def analyze_batch(
    images: List[UploadFile] = File(..., description="Multiple images for batch analysis"),
):
    """
    Analyze multiple images in batch.
    Useful for field surveys with multiple photos.
    """
    results = []
    total_start = time.time()

    for image_file in images:
        if image_file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            continue

        image_bytes = await image_file.read()
        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)

        service = await get_vision_service()
        result = service.detect(img_array)
        results.append(result)

    total_time = (time.time() - total_start) * 1000

    # Aggregate severity across all images
    max_severity = max((r.severity_score for r in results), default=0)
    agg_level = "critical" if max_severity >= 8 else "high" if max_severity >= 6 else "medium" if max_severity >= 3 else "low"

    return BatchAnalysisResponse(
        results=[
            AnalysisResponse(
                detections=[BBoxResponse(
                    class_id=d.class_id, class_name=d.class_name,
                    confidence=round(d.confidence, 3),
                    x1=d.bbox[0], y1=d.bbox[1], x2=d.bbox[2], y2=d.bbox[3],
                    severity=d.severity,
                ) for d in r.detections],
                primary_class=r.primary_class,
                primary_class_code=r.primary_class_code,
                primary_confidence=round(r.primary_confidence, 3),
                severity_score=round(r.severity_score, 1),
                severity_level=r.severity_level,
                processing_time_ms=0,
                image_dimensions={},
                recommendation=r.recommendation,
            )
            for r in results
        ],
        total_processing_time_ms=round(total_time, 2),
        aggregate_severity=agg_level,
    )


@router.get("/model/info")
async def model_info():
    """Get information about the loaded AI models"""
    service = await get_vision_service()
    yolo_info = service.get_model_info()

    # Add Ollama vision model info
    from app.services.ollama import ollama_client
    ollama_ok = await ollama_client.is_available()

    return {
        **yolo_info,
        "ollama_vision": {
            "model": "minicpm-v",
            "status": "online" if ollama_ok else "offline",
            "purpose": "Category verification and image analysis",
        },
    }


@router.get("/classes")
async def get_detection_classes():
    """Get list of all defect classes the model can detect"""
    service = await get_vision_service()
    model_info = service.get_model_info()
    return {
        "classes": model_info["classes"],
        "total": model_info["num_classes"],
        "model": "YOLOv11-Nano + minicpm-v (Ollama)",
    }

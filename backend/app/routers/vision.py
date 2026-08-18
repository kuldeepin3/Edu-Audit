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

from app.services.vision import VisionService, DetectionResult, verify_with_ollama

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
    
    Two-stage pipeline:
    1. YOLO detection — bounding boxes, confidence, severity
    2. Ollama Vision verification — category validation via minicpm-v
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

    # Stage 2: Ollama Vision verification (if category provided)
    verification = None
    if category:
        verification_result = await verify_with_ollama(image_bytes, category)
        verification = VerificationResponse(**verification_result)
    
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
        primary_class=result.primary_class,
        primary_confidence=round(result.primary_confidence, 3),
        severity_score=round(result.severity_score, 1),
        severity_level=result.severity_level,
        processing_time_ms=round(processing_time, 2),
        image_dimensions={"width": img.width, "height": img.height},
        recommendation=result.recommendation,
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
    return {
        "classes": [
            {"id": 0, "name": "Broken Toilet", "code": "broken_toilet", "severity": "critical"},
            {"id": 1, "name": "Damaged Wall/Ceiling", "code": "damaged_wall", "severity": "high"},
            {"id": 2, "name": "Roof Leakage", "code": "roof_leakage", "severity": "high"},
            {"id": 3, "name": "No Water Facility", "code": "no_water_facility", "severity": "critical"},
            {"id": 4, "name": "Unsafe Electrical Wiring", "code": "unsafe_wiring", "severity": "critical"},
            {"id": 5, "name": "Broken Furniture", "code": "broken_furniture", "severity": "medium"},
            {"id": 6, "name": "Poor Sanitation", "code": "poor_sanitation", "severity": "critical"},
            {"id": 7, "name": "Structural Damage", "code": "structural_damage", "severity": "high"},
            {"id": 8, "name": "Broken Window/Door", "code": "broken_window_door", "severity": "medium"},
            {"id": 9, "name": "Playground Hazard", "code": "playground_hazard", "severity": "medium"},
        ],
        "total": 10,
        "model": "YOLOv11-Nano + minicpm-v (Ollama)",
    }

"""
EduAudit AI - Computer Vision Service
YOLOv11-Nano inference engine for infrastructure defect detection
"""
import time
import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Detection:
    class_id: int
    class_name: str
    class_code: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2] in normalized coords
    severity: str  # low, medium, high, critical


@dataclass
class DetectionResult:
    detections: List[Detection]
    primary_class: str
    primary_class_code: str
    primary_confidence: float
    severity_score: float
    severity_level: str
    recommendation: str
    processing_time_ms: float

    @property
    def confidence(self) -> float:
        return self.primary_confidence * 100



# ============================================================================
# DEFECT CLASS DEFINITIONS
# ============================================================================

DEFECT_CLASSES = {
    0: {"name": "Broken Toilet", "code": "broken_toilet", "severity": "critical"},
    1: {"name": "Damaged Wall/Ceiling", "code": "damaged_wall", "severity": "high"},
    2: {"name": "Roof Leakage", "code": "roof_leakage", "severity": "high"},
    3: {"name": "No Water Facility", "code": "no_water_facility", "severity": "critical"},
    4: {"name": "Unsafe Electrical Wiring", "code": "unsafe_wiring", "severity": "critical"},
    5: {"name": "Broken Furniture", "code": "broken_furniture", "severity": "medium"},
    6: {"name": "Poor Sanitation", "code": "poor_sanitation", "severity": "critical"},
    7: {"name": "Structural Damage", "code": "structural_damage", "severity": "high"},
    8: {"name": "Broken Window/Door", "code": "broken_window_door", "severity": "medium"},
    9: {"name": "Playground Hazard", "code": "playground_hazard", "severity": "medium"},
}

SEVERITY_MAP = {"low": 2, "medium": 5, "high": 7, "critical": 9}

# Recommendations by class
RECOMMENDATIONS = {
    "broken_toilet": "Immediate plumber dispatch recommended. Temporary alternative sanitation arrangements needed.",
    "damaged_wall": "Structural engineer assessment required. Barricade affected area for student safety.",
    "roof_leakage": "Waterproofing contractor needed. Move students away from affected area during monsoon.",
    "no_water_facility": "Water tanker arrangement needed immediately. RO/filter installation recommended.",
    "unsafe_wiring": "Immediate electrical contractor dispatch. Disconnect affected circuits for safety.",
    "broken_furniture": "Furniture replacement or repair needed. Ensure no injury risk from sharp edges.",
    "poor_sanitation": "Deep cleaning and pest control required. Sanitation worker deployment recommended.",
    "structural_damage": "Immediate structural assessment. School closure may be required for safety.",
    "broken_window_door": "Glass replacement and door repair. Ensure classroom security and weather protection.",
    "playground_hazard": "Remove or repair hazardous equipment. Restrict access to affected area.",
}


# ============================================================================
# VISION SERVICE
# ============================================================================

class VisionService:
    """
    Computer Vision service using YOLOv11-Nano for school infrastructure defect detection.
    Supports both PyTorch inference and ONNX runtime (for production).
    """

    def __init__(self, model_path: Optional[str] = None):
        from app.config import settings
        self.model_path = model_path or settings.MODEL_PATH
        self.model = None
        self.is_loaded = False
        self.confidence_threshold = 0.45
        self.iou_threshold = 0.45
        self.input_size = 640

    async def load_model(self):
        """Lazy-load the YOLOv11 model"""
        if self.is_loaded:
            return

        try:
            from ultralytics import YOLO
            model_file = Path(self.model_path)

            if model_file.exists():
                self.model = YOLO(str(model_file))
                logger.info(f"Loaded YOLO model from {model_file}")
            else:
                logger.warning(f"Model file not found at {model_file}. Using demo mode.")
                self.model = None

            self.is_loaded = True

        except ImportError:
            logger.error("ultralytics package not installed. AI detection disabled.")
            self.model = None
            self.is_loaded = True

    def detect(self, image_array: np.ndarray) -> DetectionResult:
        """
        Run inference on a single image (numpy array, RGB).
        Returns structured detection results.
        """
        if not self.is_loaded:
            self.load_model_sync()

        if self.model is None:
            return DetectionResult(
                detections=[],
                primary_class="unknown",
                primary_class_code="unknown",
                primary_confidence=0.0,
                severity_score=0.0,
                severity_level="low",
                recommendation="AI model not available. Manual review required.",
                processing_time_ms=0.0,
            )

        start_time = time.time()

        # Preprocess: ensure RGB, resize
        if image_array.shape[2] == 4:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
        elif image_array.shape[2] == 1:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)

        # Run YOLO inference
        results = self.model(
            image_array,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            imgsz=self.input_size,
            verbose=False,
        )

        # Parse detections
        detections = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = [float(c) for c in box.xyxy[0]]

                # Normalize bbox
                h, w = image_array.shape[:2]
                norm_bbox = [x1/w, y1/h, x2/w, y2/h]

                class_info = DEFECT_CLASSES.get(class_id, {"name": "unknown", "code": "unknown", "severity": "medium"})

                detections.append(Detection(
                    class_id=class_id,
                    class_name=class_info["name"],
                    class_code=class_info["code"],
                    confidence=confidence,
                    bbox=norm_bbox,
                    severity=class_info["severity"],
                ))

        # Sort by confidence
        detections.sort(key=lambda d: d.confidence, reverse=True)

        # Primary detection
        primary = detections[0] if detections else None
        processing_time = (time.time() - start_time) * 1000

        if primary:
            severity_score = self._calculate_severity(
                primary, detections, image_array.shape
            )
            severity_level = self._score_to_level(severity_score)
            recommendation = RECOMMENDATIONS.get(
                primary.class_code,
                "Manual inspection and repair recommended."
            )
        else:
            severity_score = 0.0
            severity_level = "low"
            recommendation = "No significant infrastructure defects detected."

        return DetectionResult(
            detections=detections,
            primary_class=primary.class_name if primary else "none",
            primary_class_code=primary.class_code if primary else "none",
            primary_confidence=primary.confidence if primary else 0.0,
            severity_score=severity_score,
            severity_level=severity_level,
            recommendation=recommendation,
            processing_time_ms=round(processing_time, 2),
        )

    def _calculate_severity(
        self, primary: Detection, all_detections: List[Detection], image_shape
    ) -> float:
        """Multi-factor severity calculation (0-10)"""
        # Base severity from class
        base = SEVERITY_MAP.get(primary.severity, 5)

        # Confidence factor
        conf_factor = primary.confidence

        # Area factor (larger defect = more severe)
        x1, y1, x2, y2 = primary.bbox
        area = (x2 - x1) * (y2 - y1)
        area_factor = min(area * 10, 1.0)

        # Multi-defect factor
        multi_factor = min(len(all_detections) * 0.15, 1.0)

        severity = (
            base * 0.4 +
            conf_factor * 10 * 0.25 +
            area_factor * 10 * 0.15 +
            multi_factor * 10 * 0.2
        )

        return round(min(max(severity, 0), 10), 1)

    def _score_to_level(self, score: float) -> str:
        if score >= 8:
            return "critical"
        elif score >= 6:
            return "high"
        elif score >= 3:
            return "medium"
        return "low"

    def load_model_sync(self):
        """Synchronous model loading fallback"""
        try:
            from ultralytics import YOLO
            model_file = Path(self.model_path)
            if model_file.exists():
                self.model = YOLO(str(model_file))
            self.is_loaded = True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.is_loaded = True

    def get_model_info(self) -> dict:
        """Get model metadata"""
        return {
            "model_name": "YOLOv11-Nano",
            "model_path": self.model_path,
            "is_loaded": self.is_loaded and self.model is not None,
            "num_classes": len(DEFECT_CLASSES),
            "classes": list(DEFECT_CLASSES.values()),
            "input_size": self.input_size,
            "confidence_threshold": self.confidence_threshold,
        }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

_global_vision_service: Optional[VisionService] = None

async def analyze_image(image_bytes: bytes, category: str = None) -> DetectionResult:
    """
    Analyze image bytes and return DetectionResult.
    Stage 1: YOLO detection (if model exists)
    """
    global _global_vision_service
    if _global_vision_service is None:
        _global_vision_service = VisionService()
        await _global_vision_service.load_model()

    import io
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)
    except Exception as e:
        logger.error(f"Failed to parse image for analysis: {e}")
        return DetectionResult(
            detections=[],
            primary_class="none",
            primary_class_code="none",
            primary_confidence=0.0,
            severity_score=0.0,
            severity_level="low",
            recommendation="Invalid image data.",
            processing_time_ms=0.0,
        )

    return _global_vision_service.detect(img_array)


async def verify_with_ollama(image_bytes: bytes, category: str = "Unknown") -> Dict[str, Any]:
    """
    Stage 2: Verify image against a category using Ollama Vision (minicpm-v).
    
    Returns:
        {
            "verified": bool,
            "category": str,
            "confidence": float,
            "reason": str
        }
    """
    import base64

    try:
        from app.services.ollama import ollama_client

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = f"""Analyze this school infrastructure image.
User selected category: {category}

Determine:
1. Does the image belong to this category?
2. Is a defect visible?
3. Give a short explanation.
4. Give a confidence score between 0.0 and 1.0.

You MUST respond with ONLY valid JSON in this exact format:
{{"verified": true, "category": "{category}", "confidence": 0.91, "reason": "Visible broken seat and water damage"}}"""

        result = await ollama_client.vision(image_b64, prompt)
        
        if result and isinstance(result, dict):
            return {
                "verified": result.get("verified", False),
                "category": result.get("category", category),
                "confidence": float(result.get("confidence", 0.0)),
                "reason": result.get("reason", "Analysis complete"),
            }
        
        return {
            "verified": False,
            "category": category,
            "confidence": 0.0,
            "reason": "Could not parse vision model response",
        }

    except Exception as e:
        logger.error(f"Ollama vision verification failed: {e}")
        return {
            "verified": False,
            "category": category,
            "confidence": 0.0,
            "reason": f"Vision service unavailable: {str(e)}",
        }



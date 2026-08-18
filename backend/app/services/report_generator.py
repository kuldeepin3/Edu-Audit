"""
EduAudit AI - Auto Report Generator
Generates structured AI reports from CV detection results
"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.services.vision import DetectionResult


# Repair cost estimates (India, 2026)
REPAIR_COSTS = {
    "broken_toilet": {"minor": (5000, 12000), "moderate": (12000, 30000), "severe": (30000, 80000)},
    "damaged_wall": {"minor": (8000, 20000), "moderate": (20000, 60000), "severe": (60000, 150000)},
    "roof_leakage": {"minor": (8000, 20000), "moderate": (20000, 80000), "severe": (80000, 200000)},
    "no_water_facility": {"minor": (3000, 8000), "moderate": (8000, 25000), "severe": (25000, 70000)},
    "unsafe_wiring": {"minor": (3000, 10000), "moderate": (10000, 50000), "severe": (50000, 150000)},
    "broken_furniture": {"minor": (2000, 5000), "moderate": (5000, 15000), "severe": (15000, 40000)},
    "poor_sanitation": {"minor": (3000, 8000), "moderate": (8000, 25000), "severe": (25000, 60000)},
    "structural_damage": {"minor": (15000, 40000), "moderate": (40000, 150000), "severe": (150000, 500000)},
    "broken_window_door": {"minor": (2000, 5000), "moderate": (5000, 15000), "severe": (15000, 40000)},
    "playground_hazard": {"minor": (3000, 10000), "moderate": (10000, 30000), "severe": (30000, 80000)},
}


@dataclass
class AutoReport:
    """Structured AI-generated complaint report"""
    report_id: str
    school_name: str
    district: str
    gps_coordinates: Optional[str] = None
    issue_type: str = ""
    severity_score: float = 0.0
    severity_level: str = ""
    confidence_score: float = 0.0
    ai_confidence_label: str = ""
    priority: str = ""
    recommended_sla_days: int = 14
    estimated_cost_min: int = 0
    estimated_cost_max: int = 0
    estimated_cost_recommended: int = 0
    currency: str = "INR"
    detection_details: List[Dict] = field(default_factory=list)
    recommendation: str = ""
    images_analyzed: int = 0
    generated_at: str = ""
    model_name: str = "YOLOv11-Nano v1.0"

    def dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "school_name": self.school_name,
            "district": self.district,
            "gps_coordinates": self.gps_coordinates,
            "issue_type": self.issue_type,
            "severity_score": self.severity_score,
            "severity_level": self.severity_level,
            "confidence_score": self.confidence_score,
            "ai_confidence_label": self.ai_confidence_label,
            "priority": self.priority,
            "recommended_sla_days": self.recommended_sla_days,
            "estimated_cost_min": self.estimated_cost_min,
            "estimated_cost_max": self.estimated_cost_max,
            "estimated_cost_recommended": self.estimated_cost_recommended,
            "currency": self.currency,
            "detection_details": self.detection_details,
            "recommendation": self.recommendation,
            "images_analyzed": self.images_analyzed,
            "generated_at": self.generated_at,
            "model_name": self.model_name,
        }


def generate_auto_report(
    school: Any,
    category: Any,
    ai_results: DetectionResult,
    report_id: str,
) -> AutoReport:
    """
    Generate a structured auto-report from AI detection results.
    """
    # Confidence label
    confidence = ai_results.primary_confidence * 100
    if confidence >= 95:
        conf_label = "Very High Confidence"
    elif confidence >= 85:
        conf_label = "High Confidence"
    elif confidence >= 70:
        conf_label = "Medium Confidence"
    else:
        conf_label = "Low Confidence — Manual Review Recommended"

    # Priority based on severity + confidence
    severity = ai_results.severity_score
    if severity >= 8 and confidence >= 85:
        priority = "IMMEDIATE"
        sla = 3
    elif severity >= 6:
        priority = "HIGH"
        sla = 7
    elif severity >= 3:
        priority = "MEDIUM"
        sla = 14
    else:
        priority = "LOW"
        sla = 30

    # Cost estimation
    class_code = ai_results.primary_class_code
    costs = REPAIR_COSTS.get(class_code, {"moderate": (5000, 20000)})
    severity_grade = "severe" if severity >= 8 else "moderate" if severity >= 5 else "minor"
    cost_min, cost_max = costs.get(severity_grade, costs.get("moderate", (5000, 20000)))

    # Detection details
    details = []
    for det in ai_results.detections:
        details.append({
            "defect": det.class_name,
            "code": det.class_code,
            "confidence": round(det.confidence * 100, 1),
            "location": f"bbox: [{det.bbox[0]:.2f}, {det.bbox[1]:.2f}, {det.bbox[2]:.2f}, {det.bbox[3]:.2f}]",
            "severity": det.severity,
        })

    return AutoReport(
        report_id=report_id,
        school_name=school.name if school else "Unknown School",
        district=str(school.district_id) if school and school.district_id else "Unknown",
        issue_type=ai_results.primary_class,
        severity_score=ai_results.severity_score,
        severity_level=ai_results.severity_level,
        confidence_score=round(confidence, 1),
        ai_confidence_label=conf_label,
        priority=priority,
        recommended_sla_days=sla,
        estimated_cost_min=cost_min,
        estimated_cost_max=cost_max,
        estimated_cost_recommended=(cost_min + cost_max) // 2,
        detection_details=details,
        recommendation=ai_results.recommendation,
        images_analyzed=1,
        generated_at=datetime.utcnow().isoformat(),
    )

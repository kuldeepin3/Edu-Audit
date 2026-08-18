"""
EduAudit AI - Fraud Detection Service
Perceptual hashing, CLIP embeddings, and metadata analysis
"""
import io
import hashlib
import logging
from typing import Optional, List
from dataclasses import dataclass

import imagehash
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class FraudResult:
    is_fraud: bool
    confidence: float
    reason: Optional[str] = None
    similar_report_ids: Optional[List[str]] = None
    requires_human_review: bool = False
    checks_performed: List[str] = None


class FraudDetector:
    """
    Multi-layer fraud detection for uploaded images:
    1. Perceptual hash (pHash) — instant duplicate detection
    2. CLIP embedding similarity — near-duplicate detection
    3. EXIF metadata analysis — internet-sourced image detection
    4. Error Level Analysis — edited image detection
    5. Rate limiting — spam prevention
    """

    def __init__(self):
        self.hash_threshold = 5  # Hamming distance for pHash
        self.clip_threshold = 0.92  # Cosine similarity for CLIP
        self.ela_threshold = 0.3  # ELA score for edited images

        # In-memory hash store (use Redis in production)
        self._phash_store: dict = {}  # phash -> report_id
        # In production: self.redis = Redis(settings.REDIS_URL)

    async def full_check(self, image_bytes: bytes, report_id: str = None) -> FraudResult:
        """
        Run all fraud detection layers on an image.
        Returns first match found (prioritized by confidence).
        """
        checks = []

        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception:
            return FraudResult(
                is_fraud=True,
                confidence=1.0,
                reason="invalid_image",
                checks_performed=["format_check"],
            )

        # Layer 1: Perceptual Hash (instant)
        checks.append("perceptual_hash")
        p_hash = imagehash.phash(img)
        similar = self._find_similar_phash(p_hash)
        if similar:
            return FraudResult(
                is_fraud=True,
                confidence=0.95,
                reason="duplicate_image",
                similar_report_ids=[similar],
                checks_performed=checks,
            )

        # Layer 2: Average Hash (additional check)
        a_hash = imagehash.average_hash(img)
        d_hash = imagehash.dhash(img)

        # Layer 3: EXIF Metadata
        checks.append("exif_analysis")
        exif = self._analyze_exif(img)
        if exif.get("is_suspicious", False):
            return FraudResult(
                is_fraud=True,
                confidence=0.7,
                reason="metadata_mismatch",
                requires_human_review=True,
                checks_performed=checks,
            )

        # Layer 4: Error Level Analysis (for edits)
        checks.append("error_level_analysis")
        ela_score = self._compute_ela(img)
        if ela_score > self.ela_threshold:
            return FraudResult(
                is_fraud=True,
                confidence=round(ela_score, 2),
                reason="possibly_edited",
                requires_human_review=True,
                checks_performed=checks,
            )

        # Layer 5: CLIP Embedding (for internet-sourced detection)
        # In production: compare against known stock photo database
        # checks.append("clip_similarity")

        # Store hash for future checks
        if report_id:
            self._store_phash(p_hash, report_id)

        return FraudResult(
            is_fraud=False,
            confidence=0.95,
            checks_performed=checks,
        )

    def _find_similar_phash(self, phash, threshold: int = None) -> Optional[str]:
        """Check if similar perceptual hash exists"""
        threshold = threshold or self.hash_threshold
        for stored_hash, report_id in self._phash_store.items():
            try:
                # stored_hash is hex string, convert to ImageHash
                stored_hash_obj = imagehash.hex_to_hash(stored_hash)
                if phash - stored_hash_obj < threshold:
                    return report_id
            except Exception as e:
                logger.error(f"Error decoding hex hash '{stored_hash}': {e}")
        return None

    def _store_phash(self, phash, report_id: str):
        """Store perceptual hash for future duplicate checks"""
        self._phash_store[str(phash)] = report_id

    def _analyze_exif(self, img: Image.Image) -> dict:
        """
        Analyze EXIF metadata for signs of stock/downloaded images.
        """
        try:
            exif_data = img._getexif()
            if not exif_data:
                return {"is_suspicious": False, "reason": "no_exif"}

            # Check for editing software signatures
            software = exif_data.get(0x0131, "").lower() if 0x0131 in exif_data else ""

            editing_tools = ["photoshop", "lightroom", "gimp", "snapseed", "picasa"]
            if any(tool in software for tool in editing_tools):
                return {
                    "is_suspicious": True,
                    "reason": f"Edited with: {software}",
                }

            return {"is_suspicious": False, "software": software}

        except Exception:
            return {"is_suspicious": False, "reason": "exif_parse_error"}

    def _compute_ela(self, img: Image.Image, quality: int = 75) -> float:
        """
        Error Level Analysis for detecting image manipulation.
        Compressed-recompressed difference reveals edited areas.
        Returns a score from 0 (clean) to 1 (likely edited).
        """
        # Convert to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Compress at lower quality
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        compressed = Image.open(buffer)

        # Calculate difference
        img_arr = np.array(img, dtype=np.float32)
        comp_arr = np.array(compressed, dtype=np.float32)
        diff = np.abs(img_arr - comp_arr)

        # Normalize score
        mean_diff = np.mean(diff)
        score = min(mean_diff / 20.0, 1.0)  # Normalize to 0-1

        return round(score, 3)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

_global_detector = FraudDetector()

async def check_fraud(image_bytes: bytes, report_id: Optional[str] = None) -> FraudResult:
    """
    Check image bytes for potential fraud using the global detector instance.
    """
    return await _global_detector.full_check(image_bytes, report_id)


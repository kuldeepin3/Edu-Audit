"""Local media storage and optional Cloudinary thumbnail support."""
import io
import logging
from pathlib import Path, PurePosixPath
from typing import Optional
from urllib.parse import quote

import aiofiles

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Stores uploaded files locally and optionally creates Cloudinary thumbnails."""

    def __init__(self):
        self.media_root = Path(settings.MEDIA_STORAGE_PATH).resolve()

    async def upload(
        self, file_bytes: bytes, key: str, content_type: str = "image/jpeg"
    ) -> Optional[str]:
        """Write a file inside the local media directory and return its API URL."""
        relative_path = PurePosixPath(key)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            raise ValueError("Invalid media storage key")

        destination = (self.media_root / Path(*relative_path.parts)).resolve()
        if self.media_root not in destination.parents:
            raise ValueError("Invalid media storage key")

        destination.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(destination, "wb") as media_file:
            await media_file.write(file_bytes)

        media_url = settings.MEDIA_URL.rstrip("/")
        return f"{media_url}/{quote(relative_path.as_posix(), safe='/')}"

    async def generate_thumbnail(self, file_bytes: bytes, size: tuple = (200, 200)) -> bytes:
        """Generate thumbnail from image"""
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(file_bytes))
            img.thumbnail(size, Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            return buffer.getvalue()
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {e}")
            return file_bytes


# Singleton instance
storage = StorageService()


async def upload(file_bytes: bytes, key: str, content_type: str = "image/jpeg") -> Optional[str]:
    return await storage.upload(file_bytes, key, content_type)

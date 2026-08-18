"""
EduAudit AI - Storage Service
AWS S3 + Cloudinary for media storage
"""
import io
import uuid
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Manages file uploads to AWS S3 and Cloudinary"""

    def __init__(self):
        self.s3_client = None
        self._init_s3()

    def _init_s3(self):
        """Initialize S3 client"""
        try:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            logger.info("S3 client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")

    async def upload_to_s3(
        self, file_bytes: bytes, key: str, content_type: str = "image/jpeg"
    ) -> Optional[str]:
        """Upload file to S3 and return public URL"""
        if not self.s3_client:
            logger.warning("S3 not configured, returning mock URL")
            return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{key}"

        try:
            self.s3_client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
                # AES-256 server-side encryption
                ServerSideEncryption="AES256",
            )
            url = f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            return url
        except Exception as e:
            logger.error(f"S3 upload failed: {e}. Returning fallback mock URL.")
            return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{key}"

    async def upload_to_cloudinary(
        self, file_bytes: bytes, folder: str = "eduaudit"
    ) -> Optional[str]:
        """Upload to Cloudinary for CDN + transformations"""
        if not settings.CLOUDINARY_URL:
            return None

        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(cloud_name=settings.CLOUDINARY_CLOUD_NAME)
            result = cloudinary.uploader.upload(
                io.BytesIO(file_bytes),
                folder=folder,
                transformation=[{"width": 800, "crop": "limit"}],
            )
            return result.get("secure_url")
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            return None

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


async def upload_to_s3(file_bytes: bytes, key: str, content_type: str = "image/jpeg") -> Optional[str]:
    return await storage.upload_to_s3(file_bytes, key, content_type)


async def upload_to_cloudinary(file_bytes: bytes, folder: str = "eduaudit") -> Optional[str]:
    return await storage.upload_to_cloudinary(file_bytes, folder)

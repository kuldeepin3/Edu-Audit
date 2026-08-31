"""
EduAudit AI - Redis Connection Management
"""
from redis.asyncio import Redis
from app.config import settings

# Initialize Redis client using settings url
# decode_responses=True allows us to get strings directly instead of bytes
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

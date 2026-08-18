"""
EduAudit AI - Notifications API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db import get_db
from app.middleware.rbac import get_current_user as require_auth, require_role
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()


@router.get("/")
async def get_notifications(
    unread_only: bool = True,
    page: int = 1,
    page_size: int = 20,
    user: User = Depends(require_role("citizen", "auditor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get user notifications"""
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "channel": n.channel,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "unread_count": len(notifications),
    }


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Mark notification as read"""
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked as read"}

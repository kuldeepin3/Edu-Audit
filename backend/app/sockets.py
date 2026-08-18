"""
EduAudit AI - WebSocket Server (Socket.io)
Real-time complaint status updates
"""
import socketio
from typing import Optional

from app.config import settings

# Create Socket.io server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    ping_timeout=60,
    ping_interval=25,
)
socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ):
    """Client connected"""
    print(f"[WS] Client connected: {sid}")
    await sio.emit("connected", {"message": "Connected to EduAudit AI realtime"}, room=sid)


@sio.event
async def disconnect(sid):
    """Client disconnected"""
    print(f"[WS] Client disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    """Join a room for receiving updates about a specific complaint"""
    room = data.get("room", "general")
    await sio.enter_room(sid, room)
    print(f"[WS] {sid} joined room: {room}")
    await sio.emit("joined", {"room": room}, room=sid)


@sio.event
async def leave_room(sid, data):
    """Leave a room"""
    room = data.get("room", "general")
    await sio.leave_room(sid, room)


# ============================================================================
# SERVER-SIDE EMIT HELPERS
# ============================================================================

async def emit_complaint_update(complaint_id: str, status: str, details: dict = None):
    """Emit complaint status update to all room subscribers"""
    await sio.emit(
        "complaint_updated",
        {
            "complaint_id": complaint_id,
            "status": status,
            "details": details or {},
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        },
        room=f"complaint_{complaint_id}",
    )


async def emit_dashboard_update(district_id: str, summary: dict):
    """Emit dashboard statistics update"""
    await sio.emit(
        "dashboard_update",
        summary,
        room=f"dashboard_{district_id}",
    )


async def emit_notification(user_id: str, notification: dict):
    """Emit push notification to specific user"""
    await sio.emit(
        "notification",
        notification,
        room=f"user_{user_id}",
    )

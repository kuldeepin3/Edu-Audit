"""
EduAudit AI - RAG Chatbot API Endpoints
Offline RAG with Qdrant + Ollama (llama3.2 + nomic-embed-text)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.rag import RAGService

router = APIRouter()

_rag_service: Optional[RAGService] = None


async def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


# ============================================================================
# SCHEMAS
# ============================================================================

class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    query: str = Field(..., description="User question about school infrastructure")
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    filters: Optional[dict] = Field(default=None, description="Optional filters: district, school, date_range")
    language: str = Field(default="en", description="Response language")


class Citation(BaseModel):
    report_id: str
    school_name: str
    category: str
    severity: str
    status: str
    excerpt: str
    relevance_score: float


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    follow_up_suggestions: List[str]
    data_summary: Optional[dict] = None
    confidence: float


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(request: ChatRequest):
    """
    Ask the AI chatbot questions about school infrastructure.
    Uses offline RAG: Ollama nomic-embed-text → Qdrant → Ollama llama3.2

    Example queries:
    - "Show schools with worst toilet infrastructure in District X"
    - "How many complaints were filed in March 2026?"
    - "Which schools have recurring issues?"
    - "Summarize all critical complaints pending for more than 30 days"
    """
    service = await get_rag_service()

    result = await service.query(
        question=request.query,
        conversation_history=[m.dict() for m in request.conversation_history],
        filters=request.filters,
    )

    return ChatResponse(
        answer=result["answer"],
        citations=[
            Citation(
                report_id=c.get("report_id", ""),
                school_name=c.get("school_name", ""),
                category=c.get("category", ""),
                severity=c.get("severity", ""),
                status=c.get("status", ""),
                excerpt=c.get("excerpt", ""),
                relevance_score=c.get("relevance_score", c.get("score", 0.0)),
            )
            for c in result.get("citations", [])
        ],
        follow_up_suggestions=result.get("follow_ups", []),
        data_summary=result.get("data_summary"),
        confidence=result.get("confidence", 0.0),
    )


@router.post("/reindex")
async def reindex_complaints():
    """
    Re-index all complaints from PostgreSQL into Qdrant.
    Generates embeddings via Ollama nomic-embed-text.
    """
    service = await get_rag_service()
    result = await service.reindex_all()
    return result


@router.get("/status")
async def chatbot_status():
    """
    Check health of all AI components:
    - Ollama (llama3.2, nomic-embed-text)
    - Qdrant (local vector DB)
    """
    service = await get_rag_service()
    status = await service.get_status()
    return status


@router.get("/suggestions")
async def get_query_suggestions(
    q: Optional[str] = Query(None, description="Partial query for autocomplete"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """Get suggested queries for the chatbot"""
    suggestions = [
        "Which district has the worst toilet infrastructure?",
        "Show schools with recurring complaints in the last 3 months",
        "How many critical complaints are overdue?",
        "List top 10 schools with the lowest health scores",
        "Summarize all sanitation complaints from Vadodara",
        "What is the average resolution time for roof leakage complaints?",
        "Show schools that need immediate attention",
        "Which category has the most pending complaints?",
        "Compare infrastructure between two schools",
        "What budget is needed for next quarter?",
    ]

    if q:
        suggestions = [s for s in suggestions if q.lower() in s.lower()]

    return {"suggestions": suggestions[:5]}

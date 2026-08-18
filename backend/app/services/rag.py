"""
EduAudit AI - Offline RAG Service
Qdrant vector search + Ollama nomic-embed-text embeddings + Ollama llama3.2 generation

Completely offline. No cloud APIs. No OpenAI. No Anthropic. No Gemini.
"""
import json
import logging
import uuid
from typing import List, Dict, Any, Optional
from collections import Counter

from app.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation service for EduAudit AI chatbot.

    Pipeline:
    1. Parse user query intent
    2. Generate query embedding (nomic-embed-text via Ollama)
    3. Semantic search in Qdrant local
    4. Rerank results (keyword overlap)
    5. Build LLM context
    6. Generate response with llama3.2 via Ollama
    7. Extract citations
    """

    COLLECTION_NAME = "eduaudit_complaints"
    VECTOR_DIM = 768  # nomic-embed-text output dimension

    def __init__(self):
        self.qdrant_client = None
        self._initialized = False

    async def _ensure_initialized(self):
        """Lazy initialization of Qdrant client and collection"""
        if self._initialized:
            return

        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Distance, VectorParams

            self.qdrant_client = QdrantClient(settings.QDRANT_URL)
            logger.info(f"Connected to Qdrant at {settings.QDRANT_URL}")

            # Ensure collection exists
            collections = self.qdrant_client.get_collections().collections
            collection_names = [c.name for c in collections]

            if self.COLLECTION_NAME not in collection_names:
                self.qdrant_client.create_collection(
                    collection_name=self.COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=self.VECTOR_DIM,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {self.COLLECTION_NAME}")
            else:
                logger.info(f"Qdrant collection '{self.COLLECTION_NAME}' already exists.")

            self._initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            self._initialized = True  # Don't retry on every request

    # ========================================================================
    # INDEXING
    # ========================================================================

    async def index_complaint(self, complaint_data: Dict[str, Any]) -> bool:
        """
        Index a single complaint into Qdrant.
        
        complaint_data should contain:
            report_id, school_name, district, category, severity, status,
            description, created_at
        """
        await self._ensure_initialized()

        if not self.qdrant_client:
            logger.warning("Qdrant not available. Skipping indexing.")
            return False

        try:
            from app.services.ollama import ollama_client

            # Build text for embedding
            text = self._complaint_to_text(complaint_data)

            # Generate embedding via Ollama nomic-embed-text
            embedding = await ollama_client.embed(text)
            if not embedding:
                logger.error("Failed to generate embedding for complaint")
                return False

            # Upsert into Qdrant
            from qdrant_client.models import PointStruct

            point_id = str(uuid.uuid4())
            self.qdrant_client.upsert(
                collection_name=self.COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            "report_id": complaint_data.get("report_id", ""),
                            "school_name": complaint_data.get("school_name", "Unknown"),
                            "district": complaint_data.get("district", ""),
                            "category": complaint_data.get("category", ""),
                            "severity": complaint_data.get("severity", ""),
                            "status": complaint_data.get("status", ""),
                            "content": complaint_data.get("description", ""),
                            "created_at": str(complaint_data.get("created_at", "")),
                        },
                    )
                ],
            )
            logger.info(f"Indexed complaint {complaint_data.get('report_id')} into Qdrant")
            return True

        except Exception as e:
            logger.error(f"Failed to index complaint: {e}")
            return False

    async def reindex_all(self) -> Dict[str, Any]:
        """
        Re-index all complaints from PostgreSQL into Qdrant.
        Returns stats about the indexing operation.
        """
        await self._ensure_initialized()

        if not self.qdrant_client:
            return {"status": "error", "message": "Qdrant not available"}

        try:
            from app.db import async_session
            from sqlalchemy import text

            indexed = 0
            errors = 0

            async with async_session() as session:
                result = await session.execute(
                    text("""
                        SELECT 
                            c.report_id, c.description, c.severity_level, c.status,
                            c.created_at,
                            s.name as school_name, 
                            d.name as district_name,
                            cat.name as category_name
                        FROM complaints c
                        LEFT JOIN schools s ON c.school_id = s.id
                        LEFT JOIN districts d ON s.district_id = d.id
                        LEFT JOIN categories cat ON c.category_id = cat.id
                        ORDER BY c.created_at DESC
                    """)
                )
                rows = result.fetchall()

            for row in rows:
                success = await self.index_complaint({
                    "report_id": row.report_id or "",
                    "school_name": row.school_name or "Unknown",
                    "district": row.district_name or "",
                    "category": row.category_name or "",
                    "severity": row.severity_level or "",
                    "status": row.status or "",
                    "description": row.description or "",
                    "created_at": str(row.created_at) if row.created_at else "",
                })
                if success:
                    indexed += 1
                else:
                    errors += 1

            return {
                "status": "completed",
                "total_found": len(rows),
                "indexed": indexed,
                "errors": errors,
            }

        except Exception as e:
            logger.error(f"Reindex failed: {e}")
            return {"status": "error", "message": str(e)}

    # ========================================================================
    # QUERY PIPELINE
    # ========================================================================

    async def query(
        self,
        question: str,
        conversation_history: List[Dict] = None,
        filters: Dict = None,
        user_id: str = None,
        user_role: str = None,
    ) -> Dict[str, Any]:
        """
        Full RAG pipeline: query → embed → retrieve → rerank → generate

        Returns:
            {
                "answer": str,
                "citations": List[dict],
                "follow_ups": List[str],
                "data_summary": dict,
                "confidence": float,
            }
        """
        await self._ensure_initialized()

        from app.services.ollama import ollama_client

        # Check if Ollama is available
        ollama_available = await ollama_client.is_available()

        # Step 1: Query understanding
        intent = self._classify_intent(question)

        # Step 2: Generate query embedding via Ollama
        query_embedding = await ollama_client.embed(question)

        if not query_embedding:
            return {
                "answer": "⚠️ AI service is not available. Please ensure Ollama is running at "
                          f"{settings.OLLAMA_BASE_URL} with the model '{settings.OLLAMA_EMBED_MODEL}'.",
                "citations": [],
                "follow_ups": [],
                "data_summary": None,
                "confidence": 0.0,
            }

        # Step 3: Vector search with filters
        retrieved = await self._search_qdrant(
            question=question,
            query_vector=query_embedding,
            filters=filters,
            intent=intent,
            top_k=10,
        )

        if not retrieved:
            # Try to answer without context if Ollama is available
            if ollama_available:
                answer = await ollama_client.chat(
                    prompt=question,
                    system_prompt=(
                        "You are EduAudit AI Assistant. You help with school infrastructure queries. "
                        "No complaint data was found matching this query. "
                        "Politely let the user know and suggest they rephrase their question."
                    ),
                )
                return {
                    "answer": answer,
                    "citations": [],
                    "follow_ups": self._generate_follow_ups(question),
                    "data_summary": None,
                    "confidence": 0.0,
                }
            return {
                "answer": "I couldn't find relevant complaint data for your query. "
                          "Please try rephrasing or ask about specific schools, categories, or districts.",
                "citations": [],
                "follow_ups": self._generate_follow_ups(question),
                "data_summary": None,
                "confidence": 0.0,
            }

        # Step 4: Rerank
        reranked = self._rerank(question, retrieved)

        # Step 5: Build context for LLM
        context = self._build_context(reranked[:5])

        # Step 6: Generate response with Ollama llama3.2
        system_prompt = f"""You are EduAudit AI Assistant.
Answer only using the supplied context below.
Do not hallucinate or make up information.
Mention complaint IDs (report IDs).
Mention school names.
Mention dates when available.
Be concise but thorough.

Context:
{context}"""

        answer = await ollama_client.chat(
            prompt=question,
            system_prompt=system_prompt,
        )

        # Step 7: Extract citations
        citations = self._extract_citations(reranked[:5])

        # Step 8: Data summary
        data_summary = self._build_data_summary(reranked[:5])

        return {
            "answer": answer,
            "citations": citations,
            "follow_ups": self._generate_follow_ups(question),
            "data_summary": data_summary,
            "confidence": self._calculate_confidence(reranked[:5]),
        }

    # ========================================================================
    # HEALTH CHECK
    # ========================================================================

    async def get_status(self) -> Dict[str, Any]:
        """Check health of all RAG components"""
        from app.services.ollama import ollama_client

        ollama_ok = await ollama_client.is_available()

        qdrant_ok = False
        qdrant_count = 0
        try:
            if self.qdrant_client:
                info = self.qdrant_client.get_collection(self.COLLECTION_NAME)
                qdrant_ok = True
                qdrant_count = info.points_count
        except Exception:
            pass

        return {
            "ollama": {
                "status": "online" if ollama_ok else "offline",
                "base_url": settings.OLLAMA_BASE_URL,
                "chat_model": settings.OLLAMA_CHAT_MODEL,
                "embed_model": settings.OLLAMA_EMBED_MODEL,
            },
            "qdrant": {
                "status": "online" if qdrant_ok else "offline",
                "url": settings.QDRANT_URL,
                "collection": self.COLLECTION_NAME,
                "indexed_documents": qdrant_count,
            },
        }

    # ========================================================================
    # INTERNAL METHODS
    # ========================================================================

    def _complaint_to_text(self, data: Dict) -> str:
        """Convert complaint data to text for embedding"""
        parts = []
        if data.get("category"):
            parts.append(f"Category: {data['category']}")
        if data.get("school_name"):
            parts.append(f"School: {data['school_name']}")
        if data.get("district"):
            parts.append(f"District: {data['district']}")
        if data.get("severity"):
            parts.append(f"Severity: {data['severity']}")
        if data.get("status"):
            parts.append(f"Status: {data['status']}")
        if data.get("description"):
            parts.append(f"Description: {data['description']}")
        if data.get("report_id"):
            parts.append(f"Report ID: {data['report_id']}")
        if data.get("created_at"):
            parts.append(f"Date: {data['created_at']}")
        return ". ".join(parts)

    def _classify_intent(self, question: str) -> str:
        """Classify query intent for optimized retrieval"""
        question_lower = question.lower()

        intent_keywords = {
            "summary": ["summarize", "summary", "overview", "all", "list"],
            "comparison": ["compare", "between", "vs", "versus", "difference"],
            "ranking": ["worst", "best", "top", "bottom", "ranking", "most", "least"],
            "statistics": ["how many", "count", "average", "percentage", "total"],
            "timeline": ["trend", "over time", "last month", "last year", "this month"],
        }

        for intent, keywords in intent_keywords.items():
            for kw in keywords:
                if kw in question_lower:
                    return intent
        return "general"

    async def _search_qdrant(
        self,
        question: str,
        query_vector: List[float],
        filters: Dict = None,
        intent: str = "general",
        top_k: int = 10,
    ) -> List[Dict]:
        """Semantic vector search in Qdrant"""
        if not self.qdrant_client:
            return []

        # Build Qdrant filter
        qdrant_filter = None
        if filters:
            conditions = []
            if filters.get("district"):
                conditions.append({
                    "key": "district",
                    "match": {"value": filters["district"]},
                })
            if filters.get("category"):
                conditions.append({
                    "key": "category",
                    "match": {"value": filters["category"]},
                })
            if filters.get("severity"):
                conditions.append({
                    "key": "severity",
                    "match": {"value": filters["severity"]},
                })
            if conditions:
                qdrant_filter = {"must": conditions}

        try:
            results = self.qdrant_client.search(
                collection_name=self.COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=qdrant_filter,
                limit=top_k,
                with_payload=True,
                score_threshold=0.3,
            )

            return [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "report_id": r.payload.get("report_id", ""),
                    "school_name": r.payload.get("school_name", "Unknown"),
                    "district": r.payload.get("district", ""),
                    "category": r.payload.get("category", ""),
                    "severity": r.payload.get("severity", ""),
                    "status": r.payload.get("status", ""),
                    "content": r.payload.get("content", ""),
                    "created_at": str(r.payload.get("created_at", "")),
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}")
            return []

    def _rerank(self, question: str, results: List[Dict]) -> List[Dict]:
        """Simple relevance reranking using keyword overlap"""
        question_lower = question.lower()
        keywords = set(question_lower.split())

        for r in results:
            content_lower = r.get("content", "").lower()
            school_lower = r.get("school_name", "").lower()
            category_lower = r.get("category", "").lower()

            content_words = set(content_lower.split()) | {school_lower, category_lower}
            overlap = len(keywords & content_words) / max(len(keywords), 1)

            r["rerank_score"] = r["score"] * 0.7 + overlap * 0.3

        results.sort(key=lambda x: x["rerank_score"], reverse=True)
        return results

    def _build_context(self, documents: List[Dict]) -> str:
        """Build context string for LLM from retrieved documents"""
        context_parts = []
        for i, doc in enumerate(documents, 1):
            context_parts.append(
                f"[{i}] Report ID: {doc.get('report_id', 'N/A')}\n"
                f"    School: {doc.get('school_name', 'Unknown')}\n"
                f"    District: {doc.get('district', 'N/A')}\n"
                f"    Category: {doc.get('category', 'N/A')}\n"
                f"    Severity: {doc.get('severity', 'N/A')}\n"
                f"    Status: {doc.get('status', 'N/A')}\n"
                f"    Date: {doc.get('created_at', 'N/A')}\n"
                f"    Details: {doc.get('content', 'No details')[:300]}\n"
            )
        return "\n".join(context_parts)

    def _extract_citations(self, docs: List[Dict]) -> List[Dict]:
        """Extract citation information from top documents"""
        return [
            {
                "report_id": d.get("report_id", ""),
                "school_name": d.get("school_name", "Unknown"),
                "category": d.get("category", ""),
                "severity": d.get("severity", ""),
                "status": d.get("status", ""),
                "excerpt": d.get("content", "")[:150],
                "relevance_score": round(d.get("rerank_score", d.get("score", 0)), 3),
            }
            for d in docs
        ]

    def _build_data_summary(self, docs: List[Dict]) -> Optional[Dict]:
        """Build a summary data object for visualizations"""
        if not docs:
            return None

        districts = Counter(d.get("district", "Unknown") for d in docs)
        categories = Counter(d.get("category", "Unknown") for d in docs)
        severities = Counter(d.get("severity", "Unknown") for d in docs)
        statuses = Counter(d.get("status", "Unknown") for d in docs)

        return {
            "total_reports_referenced": len(docs),
            "districts": dict(districts.most_common(5)),
            "categories": dict(categories.most_common(5)),
            "severity_breakdown": dict(severities),
            "status_breakdown": dict(statuses),
        }

    def _generate_follow_ups(self, question: str) -> List[str]:
        """Suggest follow-up questions"""
        return [
            "Show me the resolution status of these complaints",
            "Which schools have the most recurring issues?",
            "What is the estimated repair cost?",
        ]

    def _calculate_confidence(self, docs: List[Dict]) -> float:
        """Overall confidence score for the response"""
        if not docs:
            return 0.0
        avg_score = sum(d.get("score", 0) for d in docs) / len(docs)
        return round(min(avg_score * 100, 100), 1)


# Module-level singleton
_rag_service: Optional[RAGService] = None


async def get_rag_service() -> RAGService:
    """Get or create the RAG service singleton"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service

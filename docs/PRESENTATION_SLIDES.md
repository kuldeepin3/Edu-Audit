# EduAudit AI — College Presentation Slide Deck & Speaker Notes

This slide deck accompanies the generated PowerPoint presentation file:
📂 **File Location:** [`K:\EduAudit\EduAudit_Presentation.pptx`](file:///K:/EduAudit/EduAudit_Presentation.pptx)

---

## 📽️ Slide Overview & Speaking Guide

### Slide 1: Title Slide
*   **Slide Title:** EduAudit AI — Intelligent Campus Infrastructure Auditing & Defect Detection System
*   **Key Points:**
    *   Final Year Academic Project
    *   Domain: Computer Vision, Large Language Models (RAG), Full-Stack Systems & Cloud Infrastructure
*   **🗣️ Speaker Script:**
    > *"Good morning respected evaluators, professors, and peers. Today, I am presenting **EduAudit AI**, an automated campus infrastructure defect detection and auditing platform. Our project bridges Computer Vision and local Generative AI to solve the real-world challenge of maintaining institutional infrastructure efficiently and transparently."*

---

### Slide 2: Motivation & Problem Statement
*   **Slide Title:** The Infrastructure Auditing Problem
*   **Key Points:**
    1.  **Slow Manual Audits:** Labor-intensive inspections, long turnaround times, hazards go unnoticed.
    2.  **Fake & Unverified Reports:** Spam complaints, unverified photos, manual photo review bottlenecks.
    3.  **Information Silos:** Administrators cannot search unstructured complaint logs intelligently; traditional keyword search misses synonyms.
*   **🗣️ Speaker Script:**
    > *"Traditional campus maintenance relies heavily on paper logs or unstructured complaint portals. This leads to three fundamental bottlenecks: critical defects take weeks to triage, staff waste hours manually verifying whether photos are real, and administrators have no semantic search tools to analyze recurring maintenance hotspots."*

---

### Slide 3: Proposed Solution
*   **Slide Title:** The EduAudit Solution: End-to-End AI Automation
*   **Key Points:**
    *   **📸 AI Vision Verification:** Real-time YOLOv11 defect detection with bounding box coordinates and strict confidence filtering.
    *   **🤖 Offline RAG Chatbot:** Conversational query engine powered by Qdrant Vector DB & Ollama (LLaMA 3.2).
    *   **📊 Auditor Command Center:** Modern Next.js interface with status tracking (`Pending` → `In Progress` → `Resolved`).
*   **🗣️ Speaker Script:**
    > *"To solve this, EduAudit introduces a closed-loop system: citizens report issues via a fast web app with voice dictation, our backend YOLOv11 model instantly verifies the visual defect, and an offline RAG chatbot allows administrators to ask natural language questions about all campus reports."*

---

### Slide 4: System Architecture
*   **Slide Title:** Decoupled 3-Tier Architecture
*   **Key Points:**
    *   **Frontend Tier:** Next.js 14, React, TypeScript, TailwindCSS, Canvas overlay.
    *   **Backend Tier:** FastAPI (Asynchronous Python), Celery Workers, Redis Broker.
    *   **Data Tier:** PostgreSQL (Relational source of truth) + Qdrant (Vector DB).
    *   **AI Tier:** YOLOv11-Nano (.pt weights) + Ollama (`nomic-embed-text` & `llama3.2`).
*   **🗣️ Speaker Script:**
    > *"Our architecture follows a clean decoupled design. The Next.js frontend handles responsive user interactions. The FastAPI backend processes heavy AI inference and database operations asynchronously. We run everything in Docker containers to guarantee zero-hassle portability and reliability."*

---

### Slide 5: Computer Vision Pipeline (YOLOv11-Nano)
*   **Slide Title:** YOLOv11-Nano Defect Detection Engine
*   **Key Points:**
    *   **Why YOLOv11:** Single-pass object detection; outputs exact bounding coordinates `[x1, y1, x2, y2]`.
    *   **Model Size:** Lightweight Nano architecture (~5.4 MB weights) for high-speed edge/server inference.
    *   **Custom Classes:** `washroom_damage`, `broken_furniture`, `campus_hazard`, `poor_sanitation`.
    *   **Thresholding:** Rejects submissions with confidence under 25% (0.25) to eliminate false positives.
*   **🗣️ Speaker Script:**
    > *"Unlike basic classification models that only tell you 'what' an image is, YOLOv11 performs true object detection. It pinpoints the defect's exact location with bounding boxes. By custom-training YOLOv11-Nano on campus damage categories, we achieved sub-second inference while maintaining high precision."*

---

### Slide 6: RAG Chatbot Architecture
*   **Slide Title:** Retrieval-Augmented Generation (Qdrant + Ollama)
*   **Key Points:**
    *   **Ingestion:** Descriptions vectorized with `nomic-embed-text` into 768-dimensional embeddings in Qdrant.
    *   **Retrieval:** Cosine similarity search fetches matching complaints from Qdrant & PostgreSQL.
    *   **Generation:** Ollama `llama3.2` synthesizes fact-checked answers grounded strictly on database evidence.
*   **🗣️ Speaker Script:**
    > *"For our chatbot, we implemented RAG. When an auditor asks 'How many washroom issues occurred in Block A?', the query is converted into a vector, Qdrant retrieves the closest matching reports via cosine similarity, and our local LLaMA 3.2 model synthesizes a factual, evidence-backed answer with zero hallucinations."*

---

### Slide 7: Dual Database Strategy
*   **Slide Title:** PostgreSQL + Qdrant: The Dual Store Advantage
*   **Key Points:**
    *   **PostgreSQL:** Handles ACID transactions, user authentication, complaint workflow status, and audit history.
    *   **Qdrant:** Handles high-dimensional vector search to solve the vocabulary mismatch problem (e.g., searching 'smashed chair' finds 'broken furniture').
*   **🗣️ Speaker Script:**
    > *"We deliberately chose a dual-database pattern. PostgreSQL acts as our relational source of truth for transactional data. Qdrant handles vector embeddings, allowing the AI to understand semantic meaning rather than relying on brittle SQL keyword matching."*

---

### Slide 8: End-to-End Data Flow
*   **Slide Title:** End-to-End Complaint Lifecycle
*   **Key Steps:**
    1. Citizen uploads photo & voice note in Next.js.
    2. FastAPI executes YOLOv11 validation.
    3. Structured record saved in PostgreSQL.
    4. Text description embedded and indexed in Qdrant.
    5. Auditor inspects defect with bounding boxes on Dashboard.
    6. Auditor queries RAG Chatbot for macro-level insights.

---

### Slide 9: Results & Performance Highlights
*   **Slide Title:** Project Highlights & Key Differentiators
*   **Key Points:**
    *   **High Accuracy:** Up to 91.3% confidence on custom campus defect test sets.
    *   **100% Offline & Private:** Zero reliance on proprietary external APIs (like OpenAI); complete data sovereignty.
    *   **Production Ready:** Docker containerization, asynchronous Celery task queues, and Redis caching.
*   **🗣️ Speaker Script:**
    > *"A key innovation in EduAudit is that the entire AI pipeline—both Computer Vision and Generative AI—runs completely self-hosted and offline. There are zero ongoing API fees, and sensitive campus data never leaves the institutional network."*

---

### Slide 10: Future Scope & Conclusion
*   **Slide Title:** Future Enhancements & Impact
*   **Key Points:**
    *   **Future Scope:** Drone-assisted aerial roof sweeps, geospatial heatmaps, automated contractor cost estimation.
    *   **Conclusion:** Modernizes institutional maintenance with transparency, automation, and speed.
*   **🗣️ Speaker Script:**
    > *"In conclusion, EduAudit replaces obsolete inspection workflows with a modern, AI-powered system. In the future, we plan to integrate drone surveys and geospatial heatmaps for predictive maintenance. Thank you, and I am now open to your questions and live demonstration."*

---

### Slide 11: Demo & Q&A
*   Ready for live demonstration using `viva_yolo_demo.py` and the web interface!

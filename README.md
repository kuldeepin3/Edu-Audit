# 🎓 EduAudit AI
### AI-Powered School Infrastructure Monitoring & Transparency System

> **Every citizen becomes a school auditor. Every phone becomes an inspection tool. AI ensures every complaint is verified, prioritized, and tracked to resolution.**

[![Status](https://img.shields.io/badge/status-production--ready-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Smart India Hackathon](https://img.shields.io/badge/SIH-2026-orange)]()
[![SDG](https://img.shields.io/badge/SDG-4%20%7C%206%20%7C%2016-success)]()

---

## 📖 Overview

**EduAudit AI** is an intelligent digital platform that empowers citizens, students, teachers, NGOs, and parents to report infrastructure problems in government schools across India. By combining **crowdsourced evidence collection** with **AI-powered computer vision**, **fraud detection**, **predictive analytics**, and a **multimodal RAG-powered chatbot**, EduAudit transforms the reactive, manual, corruption-prone school inspection process into a proactive, transparent, data-driven system.

### 🎯 The Problem We Solve

| Metric | Current State | With EduAudit AI |
|--------|--------------|------------------|
| Avg. Inspection Frequency | Once per 2-3 years | Continuous citizen-driven |
| Avg. Issue Resolution Time | 6-18 months | < 15 days |
| Schools Audited/Year (India) | ~15% | 100% target |
| Audit Cost per School | ₹8,000-15,000 | < ₹500 |
| Citizen Participation | Near zero | Gamified, multi-channel |

---

## ✨ Key Features

- 🤖 **AI-Powered Detection** — YOLOv11-Nano identifies 10 infrastructure defect types from photos
- 🛡️ **Fraud Prevention** — Perceptual hashing + CLIP embeddings detect duplicates, edits, and spam
- 💬 **RAG Chatbot** — Ask questions in natural language, get evidence-backed answers with citations
- 📊 **Authority Dashboard** — Heatmaps, severity rankings, repair tracking, cost estimation
- 🔮 **Predictive Analytics** — LightGBM predicts school deterioration before it happens
- 📱 **Multi-Channel** — Web, PWA, WhatsApp bot, SMS, voice (22 Indian languages)
- 🔒 **Anonymous Reporting** — JWT + RBAC with anonymous submission support
- 🌐 **Offline-First** — PWA captures reports without internet, auto-syncs when online
- 🏆 **Gamification** — Badges, leaderboards, reputation scores for citizen engagement

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                   │
│   Next.js Web  │  PWA Mobile  │  WhatsApp Bot  │  SMS Gateway    │
└──────────────┬─────────────────────────────────────────────────────┘
               │
        API Gateway (NGINX / Ingress)
               │
┌──────────────┴───────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                       │
│  Auth │ Complaints │ Vision │ RAG │ Fraud │ Analytics │ Notify   │
└──────┬───────────────────────────────────────────┬───────────────┘
       │                                           │
┌──────┴──────────────┐               ┌───────────┴──────────────┐
│   Celery Workers    │               │      Data Layer           │
│   (AI inference,    │               │ PostgreSQL+pgvector       │
│    RAG, fraud)      │               │ Qdrant (Vector DB)        │
└─────────────────────┘               │ Redis (Cache/Queue)       │
                                      │ AWS S3 (Media Storage)    │
                                      └───────────────────────────┘
```

---

## 📁 Project Structure

```
EduAudit/
├── docs/
│   └── DESIGN_DOCUMENT.md          # Complete 16-part design spec
├── database/
│   └── schema.sql                  # PostgreSQL schema (pgvector + PostGIS)
├── backend/
│   ├── app/
│   │   ├── __init__.py             # FastAPI app factory
│   │   ├── config.py               # Settings (Pydantic)
│   │   ├── db.py                   # Async SQLAlchemy session
│   │   ├── websocket.py            # Socket.io realtime
│   │   ├── api/                    # API endpoints
│   │   │   ├── auth.py             # JWT + RBAC + anonymous
│   │   │   ├── complaints.py       # Citizen reporting
│   │   │   ├── schools.py          # School search (PostGIS)
│   │   │   ├── vision.py           # YOLOv11 inference
│   │   │   ├── chatbot.py          # RAG chatbot
│   │   │   ├── fraud.py            # Fraud detection
│   │   │   ├── analytics.py        # Dashboard data
│   │   │   └── notifications.py    # Push notifications
│   │   ├── models/                 # SQLAlchemy ORM
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   │   ├── vision.py           # YOLOv11 service
│   │   │   ├── rag.py              # RAG pipeline (Qdrant + LLM)
│   │   │   ├── fraud.py            # Perceptual hashing + CLIP
│   │   │   ├── storage.py          # S3 + Cloudinary
│   │   │   └── report_generator.py # Auto-report generation
│   │   ├── middleware/
│   │   │   └── security.py         # Rate limiting + audit
│   │   └── worker.py               # Celery tasks
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── report/             # Complaint submission
│   │   │   ├── track/[reportId]/   # Status tracking
│   │   │   ├── dashboard/          # DEO dashboard
│   │   │   └── chatbot/            # AI chatbot
│   │   ├── components/             # Reusable UI
│   │   └── lib/                    # API client + utils
│   ├── Dockerfile
│   └── package.json
├── cv_pipeline/
│   ├── train.py                    # YOLOv11 training pipeline
│   ├── build_dataset.py            # Dataset builder
│   └── data/dataset.yaml           # Dataset config
├── docker/
│   ├── docker-compose.yml          # Full dev stack
│   └── nginx.conf                  # Reverse proxy
├── kubernetes/                     # Production K8s manifests
│   ├── namespace.yaml
│   ├── api-deployment.yaml
│   ├── web-deployment.yaml
│   ├── ai-worker-deployment.yaml
│   ├── data-deployment.yaml
│   ├── ingress-config.yaml
│   └── monitoring-backup.yaml
└── .github/workflows/
    └── ci-cd.yml                   # GitHub Actions CI/CD
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker** 24+ & Docker Compose v2
- **Node.js** 20+ (for frontend dev)
- **Python** 3.11+ (for backend dev)
- **PostgreSQL** 16 with pgvector + PostGIS (or use Docker)

### Option 1: Full Stack with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-team/eduaudit-ai.git
cd eduaudit-ai

# Copy environment template
cp .env.example .env

# Start all services
cd docker
docker-compose up -d

# Services will be available at:
#   Frontend:  http://localhost:3000
#   API:       http://localhost:8000
#   API Docs:  http://localhost:8000/api/docs
#   PostgreSQL: localhost:5432
#   Qdrant:    http://localhost:6333/dashboard
#   MinIO:     http://localhost:9001 (S3-compatible storage)
```

### Option 2: Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
uvicorn app:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Database (with Docker)
docker run -d --name eduaudit-db \
  -e POSTGRES_DB=eduaudit \
  -e POSTGRES_USER=eduaudit \
  -e POSTGRES_PASSWORD=eduaudit_secure \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Initialize schema
psql -h localhost -U eduaudit -d eduaudit -f database/schema.sql
```

### Option 3: Train the CV Model

```bash
cd cv_pipeline
pip install -r requirements.txt

# Create dataset structure
python train.py setup

# Train YOLOv11-Nano (requires GPU recommended)
python train.py train --data data/dataset.yaml --epochs 150 --batch 16

# Evaluate
python train.py eval --weights runs/train/eduaudit_yolo11_phase2/weights/best.pt

# Export for mobile deployment
python train.py export --weights runs/train/eduaudit_yolo11_phase2/weights/best.pt --format onnx --int8

# Benchmark inference speed
python train.py benchmark --weights runs/train/eduaudit_yolo11_phase2/weights/best.pt
```

---

## 🧠 AI Components

### 1. Computer Vision (YOLOv11-Nano)

**Recommended model:** YOLOv11-Nano for mobile + YOLOv11-Small for cloud

| Metric | Target |
|--------|--------|
| mAP@0.5 | ≥ 85% |
| Precision | ≥ 88% |
| Recall | ≥ 82% |
| Inference (Mobile) | < 20ms |
| Model Size (INT8) | < 5MB |

**Detection classes:** broken_toilet, damaged_wall, roof_leakage, no_water_facility, unsafe_wiring, broken_furniture, poor_sanitation, structural_damage, broken_window_door, playground_hazard

### 2. RAG Chatbot (Qdrant + LLM)

- **Embeddings:** BGE-M3 (1024-dim, multilingual) for text, CLIP ViT-L/14 (768-dim) for images
- **Vector DB:** Qdrant (self-hosted, Rust-based, sub-ms latency)
- **LLM:** GPT-4o / Gemini 2.0 Flash
- **Hybrid Search:** Semantic + keyword (BM25) + metadata filters
- **Reranking:** Cross-encoder

### 3. Fraud Detection

- **Perceptual Hashing** (pHash, dHash) — instant duplicate detection (< 1ms)
- **CLIP Embeddings** — near-duplicate and internet-sourced image detection
- **Error Level Analysis (ELA)** — edited image detection
- **EXIF Analysis** — metadata validation
- **User Reputation** — community-driven trust scores

### 4. Predictive Analytics

- **LightGBM** (recommended) for tabular prediction
- **Tasks:** School deterioration, budget forecasting, maintenance prioritization
- **Explainability:** SHAP values for transparency

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT (RS256) with 15-min access + 7-day refresh tokens |
| Authorization | RBAC with 7 roles + attribute-based scoping |
| Anonymous Reporting | Limited JWT tokens with device fingerprinting |
| Data Encryption | AES-256 at rest, TLS 1.3 in transit |
| Rate Limiting | Token-bucket per endpoint (Redis-backed) |
| Audit Trail | Every API call logged with IP, user-agent, response |
| Input Validation | Pydantic schemas + sanitization utilities |
| Image Security | EXIF stripping, file type validation, size limits |

---

## ☁️ Deployment

### Development (Docker Compose)
```bash
cd docker && docker-compose up -d
```

### Production (Kubernetes)
```bash
# Apply manifests in order
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/data-deployment.yaml
kubectl apply -f kubernetes/api-deployment.yaml
kubectl apply -f kubernetes/web-deployment.yaml
kubectl apply -f kubernetes/ai-worker-deployment.yaml
kubectl apply -f kubernetes/ingress-config.yaml
kubectl apply -f kubernetes/monitoring-backup.yaml

# Check status
kubectl get pods -n eduaudit
kubectl get svc -n eduaudit
```

### CI/CD (GitHub Actions)
The pipeline at `.github/workflows/ci-cd.yml` automatically:
1. Runs tests (backend + frontend)
2. Performs security scans (Trivy, pip-audit)
3. Builds and pushes Docker images to GHCR
4. Deploys to staging on `main` push
5. Deploys to production with manual approval

---

## 📊 API Overview

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/auth/login` | POST | Login with email/phone | Public |
| `/api/v1/auth/register` | POST | Register new user | Public |
| `/api/v1/auth/anonymous-token` | POST | Get anonymous token | Public |
| `/api/v1/complaints/` | POST | Submit new complaint | Optional |
| `/api/v1/complaints/track/{id}` | GET | Track report status | Public |
| `/api/v1/complaints/` | GET | List complaints (filtered) | DEO/Admin |
| `/api/v1/schools/search` | GET | Search schools | Public |
| `/api/v1/schools/nearby` | GET | Find nearby schools (PostGIS) | Public |
| `/api/v1/vision/analyze` | POST | Analyze image with YOLOv11 | Auth |
| `/api/v1/chatbot/ask` | POST | Ask RAG chatbot | Auth |
| `/api/v1/analytics/dashboard/summary` | GET | Dashboard stats | DEO/Admin |
| `/api/v1/fraud/check` | POST | Check image for fraud | Admin |

Full interactive docs at `http://localhost:8000/api/docs` (Swagger UI)

---

## 🌍 Social Impact

EduAudit AI aligns with **UN Sustainable Development Goals**:

- **SDG 4** — Quality Education (primary)
- **SDG 6** — Clean Water & Sanitation
- **SDG 9** — Industry, Innovation & Infrastructure
- **SDG 10** — Reduced Inequalities
- **SDG 11** — Sustainable Cities & Communities
- **SDG 16** — Peace, Justice & Strong Institutions

### 12-Month Pilot Projections (1 District)

| Metric | Target |
|--------|--------|
| Schools Monitored | 800 |
| Citizen Reports | 20,000 |
| Avg Resolution Time | 12 days (from 180) |
| Cost per Audit | ₹500 (from ₹12,000) |
| Total Savings | ₹92 Lakhs |
| Citizen Participants | 10,000 |

---

## 🛣️ Roadmap

| Phase | Timeline | Goal |
|-------|----------|------|
| **Hackathon MVP** | 48 hours | Working demo with CV + chatbot + dashboard |
| **College Project** | 3 months | Trained model, full CRUD, RAG, fraud detection |
| **Pilot Deployment** | 6 months | 1 district, 200+ schools, WhatsApp/SMS integration |
| **State-wide Rollout** | 12 months | 50,000+ schools, drone + satellite integration |

---

## 👥 Team Requirements

| Role | Hackathon | Pilot | State-wide |
|------|-----------|-------|------------|
| Full-Stack Dev | 2 | 2 | 6 |
| ML Engineer | 1 | 1 | 3 |
| DevOps | — | 1 | 2 |
| Designer | 1 | 1 | 2 |
| Domain Expert | 1 | 1 | 2 |
| Community Manager | — | 1 | 4 |
| **Total** | **6** | **8** | **20+** |

---

## 📚 Documentation

- 📄 **[Complete Design Document](docs/DESIGN_DOCUMENT.md)** — All 16 parts in detail
- 🗄️ **[Database Schema](database/schema.sql)** — Full PostgreSQL DDL with indexes
- 🤖 **[CV Training Pipeline](cv_pipeline/train.py)** — YOLOv11 training, eval, export
- ☸️ **[Kubernetes Manifests](kubernetes/)** — Production deployment configs
- 🔧 **[API Documentation](http://localhost:8000/api/docs)** — Interactive Swagger UI (when running)

---

## 🏆 Why This Wins Smart India Hackathon

1. **Technical Depth** — CV (YOLOv11) + NLP (RAG) + Edge AI + Predictive ML
2. **Social Impact** — Directly affects 10.5 lakh schools and millions of students
3. **Innovation** — First multimodal AI system for school infrastructure in India
4. **Scalability** — WhatsApp + SMS = 1B+ potential users
5. **GovTech Ready** — UDISE+ integration, DPDP Act 2023 compliant
6. **Accessibility** — Voice, SMS, multilingual, WCAG 2.1 — leaves no one behind
7. **Production Quality** — Docker, Kubernetes, CI/CD, monitoring, security hardening

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Smart India Hackathon** for the platform and inspiration
- **UDISE+** for school data references
- **Ultralytics** for YOLOv11
- **Qdrant** for vector database
- **OpenStreetMap** for map data
- All the teachers, students, and citizens who will use this platform

---

<div align="center">

**Built with ❤️ for India's government schools**

*Report • Track • Transform*

</div>

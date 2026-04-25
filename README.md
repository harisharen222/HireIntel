# 🎯 TalentMatch AI — Semantic Job Matching & Profile Scoring Platform

> An end-to-end NLP platform that matches candidate CVs to job descriptions using transformer embeddings, vector similarity search, and a hybrid AI + rules scoring engine.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-0.7-336791)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📌 Overview

**TalentMatch AI** is a production-grade semantic matching platform built around three core ideas:

1. **Semantic retrieval** — CVs and job descriptions are embedded into a shared vector space using Sentence Transformers, enabling meaning-aware matching (not keyword-based).
2. **Hybrid scoring** — A weighted pipeline combining cosine similarity, rule-based skill overlap, and experience calibration produces an explainable fit score.
3. **Separation of concerns** — A **BFF (Backend-For-Frontend) Node.js gateway** handles auth, sessions, and orchestration, while a dedicated **Python FastAPI microservice** owns all ML inference. This mirrors how real enterprise AI teams ship systems.

The project was designed to demonstrate junior-to-mid level AI engineering depth across NLP, system design, security, and DevOps.

---

## ✨ Key Features

### Core
- 🔐 **JWT authentication** with HttpOnly Secure cookies, refresh token rotation, role-based access (`candidate` / `recruiter` / `admin`)
- 📄 **PDF CV upload** with MIME sniffing, size limits, malware-pattern checks, and on-disk quarantine
- 🧠 **Transformer embeddings** via `sentence-transformers/all-MiniLM-L6-v2` (384-dim, multilingual-capable)
- 🔍 **Vector similarity search** using PostgreSQL + `pgvector` (HNSW index, cosine distance)
- 📊 **Hybrid ranking**: `α · semantic_similarity + β · skill_overlap + γ · experience_fit` (tunable weights)
- 🧾 **Explainability**: every match returns matched skills, missing skills, and per-component score breakdown

### Production-grade
- 🛡️ Helmet, strict CORS, Zod input validation, express-rate-limit, structured audit logging (Pino)
- 📚 Auto-generated OpenAPI / Swagger docs on both services
- 🐳 Full Docker Compose stack (frontend, backend, AI service, Postgres+pgvector)
- ⚙️ GitHub Actions CI (lint, typecheck, test, Docker build) for all three services
- 📤 CSV export of matching results
- 📈 Admin analytics dashboard (user growth, match volume, avg score distribution)

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
│                 │      │                     │      │                      │
│  React + Vite   │─────▶│  Node.js / Express  │─────▶│  FastAPI AI Service  │
│   (TypeScript)  │◀─────│     BFF Gateway     │◀─────│  (Embeddings + NLP)  │
│                 │ HTTP │                     │ HTTP │                      │
└─────────────────┘      └──────────┬──────────┘      └──────────┬───────────┘
   HttpOnly cookie                  │                            │
                                    ▼                            ▼
                          ┌────────────────────────────────────────┐
                          │     PostgreSQL 16 + pgvector           │
                          │  users │ jobs │ cvs │ embeddings │ matches
                          └────────────────────────────────────────┘
```

### Why this shape?

**BFF gateway (Node)** handles everything the browser touches: auth, sessions, CSRF-resistant cookies, rate limits, request shaping. The browser never sees the AI service directly — this is the public API boundary.

**AI microservice (Python)** is isolated because ML workloads have different runtime requirements (heavy dependencies, GPU-friendly, slow cold starts). Keeping it separate lets us scale it independently, swap models without touching business logic, and keep the Node tier fast and stateless.

**Internal communication** uses REST/JSON over a Docker-internal network. The AI service is **not exposed publicly** — only the Node gateway can reach it, authenticated via a shared `X-Internal-API-Key` header. This enforces a clean security boundary: public traffic never executes Python code directly.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design rationale, trust zones, and failure modes.

---

## 🧠 AI & NLP Pipeline

```
PDF CV ──▶ pdfplumber ──▶ raw text ──┐
                                     ├──▶ Sentence-Transformer ──▶ 384-d vector ──▶ pgvector
Job Description (text) ──────────────┘                                                  │
                                                                                         ▼
                                                                               cosine similarity
                                                                                         │
                                            rule-based skill overlap ──┐                 │
                                            experience calibration  ──┼─▶ hybrid score ──┤
                                                                      │                  ▼
                                                                  explanation   ranked matches
```

**Model choice**: `all-MiniLM-L6-v2` — 22M params, 384-d embeddings, ~14k sentences/sec on CPU. It's the pragmatic default for a portfolio project: fast enough for live demo, quality-competitive with larger models on short-text semantic similarity benchmarks (STS-B).

**Why pgvector over a dedicated vector DB (Pinecone/Weaviate)?** For <1M vectors, `pgvector` with an HNSW index is as fast in practice and keeps the stack single-database. Operationally simpler, transactional with the rest of the data, and what most production teams actually run.

**Scoring formula**:

```
final_score = 0.65 · cosine_sim + 0.25 · skill_overlap + 0.10 · experience_fit
```

Weights are config-driven (`ai-service/app/core/config.py`) and were picked after sanity-checking against a small labelled set. See [`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md).

---

## 📁 Project Structure

```
semantic-job-matcher/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/              # Axios client with cookie credentials
│   │   ├── components/       # Reusable UI (MatchCard, ScoreBar, Navbar)
│   │   ├── context/          # AuthContext (user, role, session)
│   │   ├── hooks/            # useMatches, useAuth, useUpload
│   │   ├── pages/            # Login, Dashboard, Upload, Results, Admin
│   │   └── types/            # Shared TS interfaces
│   ├── Dockerfile
│   └── vite.config.ts
│
├── backend/                  # Node.js + Express + TypeScript (BFF)
│   ├── src/
│   │   ├── config/           # env loading, CORS, logger
│   │   ├── controllers/      # HTTP handlers (auth, cv, job, match)
│   │   ├── middleware/       # auth, role, rateLimit, errorHandler
│   │   ├── routes/           # Express routers
│   │   ├── services/         # business logic + AI service client
│   │   ├── validators/       # Zod schemas
│   │   └── utils/            # jwt, password, logger
│   ├── prisma/
│   │   └── schema.prisma     # Postgres + pgvector schema
│   └── Dockerfile
│
├── ai-service/               # Python + FastAPI (ML inference)
│   ├── app/
│   │   ├── core/             # config, security (internal API key)
│   │   ├── routers/          # /embed, /parse, /match endpoints
│   │   ├── schemas/          # Pydantic request/response models
│   │   └── services/         # embedder, parser, scorer, explainer
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SECURITY.md
│   └── AI_PIPELINE.md
│
├── docker/
│   └── init.sql              # pgvector extension + HNSW index
│
├── .github/workflows/        # CI for each service
│   ├── backend-ci.yml
│   ├── frontend-ci.yml
│   └── ai-service-ci.yml
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose (v2)
- Node 20+ and Python 3.11+ (only needed for local non-Docker dev)

### Quickstart (Docker)

```bash
git clone https://github.com/<your-handle>/talentmatch-ai.git
cd talentmatch-ai

cp .env.example .env
# Edit .env — at minimum set JWT_SECRET, INTERNAL_API_KEY, POSTGRES_PASSWORD

docker compose up --build
```

Services:
- Frontend → http://localhost:5173
- Backend API → http://localhost:4000 (Swagger at `/api/docs`)
- AI Service → http://localhost:8000 (Swagger at `/docs`, only reachable inside Docker network in prod)
- Postgres → localhost:5432

### First run

The AI service downloads the Sentence Transformer model on first boot (~90 MB). Subsequent starts use the cached model volume.

A seed script creates demo accounts:
- Candidate: `candidate@demo.io` / `Demo1234!`
- Recruiter: `recruiter@demo.io` / `Demo1234!`
- Admin: `admin@demo.io` / `Demo1234!`

---

## 🔌 API Highlights

Full spec: [`docs/API.md`](docs/API.md) + live Swagger at `/api/docs`.

### Register + login (sets HttpOnly cookie)

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "sara@example.com",
  "password": "StrongP@ss1",
  "role": "candidate",
  "fullName": "Sara Ben Ali"
}
```

### Upload CV

```http
POST /api/cv/upload
Content-Type: multipart/form-data
Cookie: access_token=<jwt>

file: <resume.pdf>
```

Response:

```json
{
  "cvId": "clv3s8q2x0001abcd",
  "filename": "resume.pdf",
  "extractedSkills": ["python", "pytorch", "nlp", "docker"],
  "yearsExperience": 3,
  "embeddingDim": 384,
  "processedAt": "2026-04-20T10:22:11Z"
}
```

### Match a CV against all open jobs

```http
POST /api/match/run
Content-Type: application/json

{ "cvId": "clv3s8q2x0001abcd", "topK": 10 }
```

Response:

```json
{
  "matches": [
    {
      "jobId": "clv3tq1p0004efgh",
      "jobTitle": "NLP Engineer",
      "company": "Devoteam",
      "finalScore": 0.874,
      "breakdown": {
        "semanticSimilarity": 0.912,
        "skillOverlap": 0.800,
        "experienceFit": 0.750
      },
      "matchedSkills": ["python", "nlp", "pytorch"],
      "missingSkills": ["aws", "kubernetes"],
      "verdict": "STRONG_FIT"
    }
  ]
}
```

---

## 🔒 Security

Production-grade hardening — full writeup in [`docs/SECURITY.md`](docs/SECURITY.md). Summary:

| Layer | Control |
|-------|---------|
| Transport | HTTPS enforced in prod, HSTS via Helmet |
| Auth | Short-lived access JWT (15 min) + rotating refresh token, HttpOnly + Secure + SameSite=Strict cookies |
| Authorization | Role middleware on every protected route |
| Input | Zod validation at every controller boundary, Pydantic at every FastAPI route |
| File upload | MIME sniffing (not trusting `Content-Type`), `%PDF-` magic-byte check, 5 MB cap, per-user rate limit |
| AI service | Not internet-exposed; shared-secret `X-Internal-API-Key` required |
| Rate limiting | Global + stricter on `/auth/*` to resist credential stuffing |
| Secrets | `.env` only, `.env.example` committed, real `.env` gitignored |
| Logging | Pino structured logs, auth + match events with user ID and IP |
| OWASP | A01 (Broken Access Control) — role mw; A02 (Crypto) — bcrypt cost 12; A03 (Injection) — Prisma parameterized queries; A05 (Misconfig) — Helmet defaults; A07 (AuthN) — lockout after N failures |

---

## 🧪 Testing

```bash
# Backend
cd backend && npm test

# AI service
cd ai-service && pytest

# Frontend
cd frontend && npm test
```

CI runs all three on every PR. See `.github/workflows/`.

---

## 🗺️ Roadmap

- [ ] Replace MiniLM with a fine-tuned multilingual model (French CVs are common in the target market)
- [ ] Cross-encoder re-ranker on top-K for higher precision
- [ ] LLM-generated match explanation ("Why this candidate fits")
- [ ] Recruiter feedback loop → supervised fine-tuning signal
- [ ] Kubernetes Helm chart
- [ ] Observability: OpenTelemetry + Grafana

---

## 📄 License

MIT. See `LICENSE`.

---

## 👤 Author

Built as a portfolio project targeting AI engineering roles in NLP / Data / Cloud consulting. Contributions and feedback welcome.

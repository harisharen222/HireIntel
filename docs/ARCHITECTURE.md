# Architecture

This document explains *why* the system is shaped the way it is, not just what it contains.

## 1. High-level topology

```
                                    ┌──────────────────────────────┐
                                    │   Browser (React + Vite)     │
                                    │   HttpOnly cookie with JWT   │
                                    └───────────────┬──────────────┘
                                                    │ HTTPS
                                                    │ credentials: include
                                                    ▼
                ┌────────────────────────────────────────────────────────┐
                │              Node.js / Express BFF Gateway             │
                │  • Auth + session cookies                              │
                │  • Zod validation                                      │
                │  • RBAC                                                │
                │  • Rate limiting, Helmet, CORS                         │
                │  • Orchestration (file upload → AI service → DB)       │
                │  • The only service the public internet talks to       │
                └───────────────┬──────────────────────────┬─────────────┘
                                │                          │
                                │ REST + X-Internal-Key    │ Prisma
                                ▼                          ▼
                ┌─────────────────────────────┐   ┌─────────────────────────┐
                │  FastAPI AI Microservice    │   │  PostgreSQL 16          │
                │  • /parse  (PDF → text)     │   │  Relational Data        │
                │  • /embed  (text → vector)  │   └─────────────────────────┘
                │  • /match  (query → topK)   │   ┌─────────────────────────┐
                │  • /agent/run (LangGraph)   │   │  MongoDB Atlas          │
                │  • Sentence-Transformer     │   │  + Vector Search        │
                │  • Scorer + Explainer       │   └─────────────────────────┘
                └─────────────────────────────┘
                    (reachable only on the
                     Docker-internal network)
```

## 2. Why a BFF gateway?

A Backend-For-Frontend is the right pattern here for three reasons:

1. **Security boundary.** Cookies, CSRF handling, and auth state are Node's job. If the browser talked to FastAPI directly, we would be reimplementing session handling in Python and exposing an ML runtime to the public internet — a weak pattern for a service whose attack surface includes model-inference endpoints.

2. **Orchestration.** The "upload CV" flow is not one request. It is: store file → call parser → call embedder → write rows transactionally → return clean DTO. That orchestration belongs in a fast, async-friendly tier (Node) close to the DB, not inside the ML service.

3. **Output shaping.** The frontend wants a flat, cookie-authenticated, versioned REST API. The AI service wants to return raw tensors and model metadata. The BFF translates between the two and can change either side without breaking the other.

## 3. Why a separate AI microservice?

Keeping embeddings and parsing in Python (FastAPI) rather than forcing ML into Node is a pragmatic call:

- **Ecosystem.** `sentence-transformers`, `transformers`, `pdfplumber`, `torch`, `spacy` — the ML ecosystem is Python-first. ONNX/tfjs ports exist but are second-class for iteration.
- **Independent scaling.** A machine doing inference has very different CPU/RAM/GPU characteristics than a machine handling REST traffic. Splitting them lets us give the AI service a beefier replica (or GPU) without over-provisioning the API tier.
- **Cold-start isolation.** Loading a 90 MB transformer into memory happens once per AI-service pod, not on every Node request. Node stays stateless.
- **Model swaps are cheap.** Replacing MiniLM with a fine-tuned multilingual model or a cross-encoder re-ranker becomes a Docker image bump — the API contract doesn't change.

## 4. Trust zones

```
   Public internet  │  DMZ (Node BFF)  │  Internal (AI + DB)
                    │                   │
   Browser ────────▶│ Express ─────────▶│ FastAPI
                    │                   │   │
                    │                   │   └─▶ Postgres
```

- **Public zone** terminates HTTPS at the frontend host / reverse proxy.
- **DMZ** is the Node BFF. It is the only service that speaks to the browser. It validates everything.
- **Internal zone** (FastAPI + Postgres) is on a Docker network with no published ports in production. The AI service rejects any request without a valid `X-Internal-API-Key`; the DB uses a strong password and listens only on the internal bridge.

In `docker-compose.yml`, only the frontend and backend expose ports to the host. The `ai-service` and `postgres` services do not — they are reachable by service name inside the Docker network only.

## 5. Data flow: "upload CV and get matches"

```
1.  Browser    → POST /api/cv/upload (multipart, HttpOnly cookie)
2.  Node BFF   → authenticate (JWT middleware)
                 validate file (MIME sniff + magic bytes + size)
                 save to /uploads/<userId>/<cvId>.pdf
3.  Node BFF   → POST http://ai-service:8000/parse  { filePath }
4.  AI service → pdfplumber extracts text, regex extracts skills & years
                 return { text, skills, yearsExperience }
5.  Node BFF   → POST http://ai-service:8000/embed  { text }
6.  AI service → returns 384-d float vector
7.  Node BFF   → Prisma transaction:
                 INSERT cv (relational data to Postgres)
                 UPDATE user.hasCv = true
8.  Node BFF   → POST http://ai-service:8000/vectors/upsert (save vector to Mongo)
9.  Node BFF   → 201 Created with CV summary

10. Browser    → POST /api/match/run { cvId, topK: 10 }
11. Node BFF   → POST http://ai-service:8000/match { cvId, topK }
12. AI service → loads cv.embedding from MongoDB (direct read),
                 runs a $vectorSearch against MongoDB limit $topK,
                 fetches relational data from Postgres using matched IDs,
                 applies hybrid scorer,
                 returns ranked list with breakdown & explanation
13. Node BFF   → returns matches to browser
```

Two things worth noting:

- The AI service has **read access to the DB** (Mongo + Postgres) for `/match` specifically. Writes remain a Node-only responsibility.
- The parse + embed steps could be a single AI-service endpoint (`/ingest`), and in a real deployment I'd merge them to save a round-trip. They're split here to keep each concern independently testable.

## 6. Failure modes & what the system does

| Failure | Response |
|---|---|
| AI service down | Node returns 503 with `retry-after`. CV upload is rolled back (no partial row). |
| Parse fails (encrypted/scanned PDF) | 422 with actionable message. File is quarantined, not stored long-term. |
| Embedding times out | Circuit breaker trips after 3 consecutive failures; subsequent requests fast-fail for 30s. |
| DB connection pool exhausted | Prisma queue with timeout; 503 after 5s. |
| Model OOM | AI service is health-checked every 10s; Docker restarts it; Node retries the in-flight request once. |

## 7. What I deliberately did *not* do (and why)

- **No message queue (RabbitMQ / Kafka).** For this load profile (interactive upload + match), sync REST is simpler and easier to reason about. A queue would be the right call if we added batch bulk-matching.
- **GraphQL.** REST + OpenAPI is lighter for this surface area and is what most BFFs in consulting shops actually ship.
- **No microservice per entity** (user-service, job-service, etc.). The split between Node and FastAPI is a *capability* boundary (web vs ML), not an entity boundary. Splitting further would be over-engineering for the problem.

## 8. Extending it

- **Re-ranker.** Add a `/rerank` endpoint in the AI service that takes the top-K from pgvector and runs a cross-encoder (`ms-marco-MiniLM-L-6-v2`) for higher precision. Cost: ~50ms per pair, so only run it on K≤20.
- **Multilingual.** Swap the embedder for `paraphrase-multilingual-MiniLM-L12-v2`. Behind the `Embedder` interface, nothing else changes.
- **Feedback loop.** Recruiters' thumbs-up/down on matches becomes a supervised signal. Store it in a `match_feedback` table; nightly job exports to a training set.
- **LLM explanations.** Replace the current rule-based explanation with a small-context LLM call that consumes the breakdown and produces 2-3 sentences. Keep the deterministic breakdown as the source of truth.

# Security

This document is deliberately concrete: every control is paired with *what it defends against*. Generic best-practice lists don't help anyone.

## 1. Authentication

### Token strategy

- **Access token**: JWT, 15-minute TTL, signed with HS256 and a 256-bit secret loaded from `JWT_SECRET`.
- **Refresh token**: opaque random 256-bit string, stored hashed (SHA-256) in the `refresh_tokens` table with a 7-day TTL. Rotated on every refresh.
- Both travel exclusively in **HttpOnly, Secure, SameSite=Strict cookies** — never in `localStorage`, never in response bodies after the initial login.

**Why not `localStorage`?** Any XSS means total account compromise. Cookies with `HttpOnly` keep tokens out of JavaScript reach, shrinking the blast radius of a compromised frontend dependency.

### Password storage

- `bcrypt`, cost factor **12**.
- A per-request timing-safe compare via `bcrypt.compare` — no early-exit string comparison anywhere.
- Password policy enforced at the Zod validator: min 10 chars, at least one digit, at least one symbol. No arbitrary upper bound.

### Brute-force defense

- `/api/auth/login` has a stricter rate limit: **5 attempts per 15 minutes per IP + email pair** (not just IP, so one tenant behind NAT doesn't lock out the rest).
- After 10 failed attempts on one email, the account is soft-locked for 30 minutes. A structured log event is emitted for ops.

### Session invalidation

- Logout deletes the refresh token row; the access JWT is left to expire (max 15 min). For forced logout everywhere, an admin endpoint nukes all refresh tokens for a user.

## 2. Authorization (RBAC)

Three roles: `candidate`, `recruiter`, `admin`.

Every protected route runs:

```
authMiddleware → requireRole([...]) → controller
```

Authorization is *not* checked inside controllers. This is deliberate — route-level enforcement is easier to audit than scattered `if (user.role !== ...)` checks. See `backend/src/middleware/auth.ts` and `role.ts`.

Object-level access (e.g. "candidate A cannot read candidate B's CV") is enforced in the service layer by always scoping queries with `userId` from the JWT, never from the request body.

## 3. Input validation

- **Backend (Node):** every controller is wrapped in a Zod-parsed DTO. Failure → 400 with the field path. Unknown fields are *stripped*, not rejected (defense in depth — even if a field survives the boundary, it never reaches Prisma).
- **AI service (Python):** every FastAPI route takes a Pydantic model. FastAPI returns 422 automatically on mismatch.

No raw string concatenation ever reaches the DB. Prisma parameterizes everything, and the one raw SQL call we make (`<=>` similarity query) uses `$queryRaw` with tagged parameters.

## 4. File upload hardening

Uploads are the highest-risk surface after auth. Controls in order:

1. **Multer limits**: 5 MB max, 1 file per request, `.pdf` extension only.
2. **MIME sniff**: `file-type` reads the first bytes — we do not trust the `Content-Type` header.
3. **Magic-byte check**: first 4 bytes must be `%PDF`.
4. **Filename sanitization**: stored as `<cvId>.pdf` using a server-generated cuid; the original filename is kept only as a display label in the DB.
5. **Per-user rate limit**: 10 uploads / hour / user. Prevents abuse as a free storage service.
6. **Out-of-web-root storage**: files land in `/data/uploads/`, not under the web-served directory.
7. **Serving**: downloads go through an authenticated route (`GET /api/cv/:id/file`) that re-checks ownership. There is no static file server for uploads.

What we explicitly don't do (and document): we don't run a malware scanner. In a real deployment this would be ClamAV in front of the upload handler. The hooks are there (`services/fileScanner.ts`) but the implementation is a no-op; flagged as a roadmap item.

## 5. AI service isolation

- `ai-service` has no published host ports in `docker-compose.yml`. It is reachable only by service-name DNS inside the Docker network (`http://ai-service:8000`).
- Every AI-service route requires `X-Internal-API-Key`. Missing or wrong → 401. The key is a 256-bit random value in `INTERNAL_API_KEY`, shared between Node and Python via env.
- The AI service does not accept arbitrary file paths — the Node BFF copies uploads into a shared volume and sends *relative* paths; the AI service rejects paths that don't resolve inside the allowed directory (path-traversal defense).

## 6. CORS

Strict allowlist in `backend/src/config/cors.ts`:

```ts
origin: env.FRONTEND_URL,   // exact match, no wildcards
credentials: true,
methods: ['GET', 'POST', 'PATCH', 'DELETE'],
allowedHeaders: ['Content-Type', 'X-CSRF-Token']
```

With `SameSite=Strict` cookies, CSRF risk is very low; we still expose a `/api/auth/csrf` endpoint that mints a double-submit token, and write endpoints check for it. Defense in depth.

## 7. Security headers (Helmet)

Default Helmet config plus:

- `contentSecurityPolicy`: tuned for the frontend origin; `script-src` is self + vendor CDN, `connect-src` is self. Report-only in dev.
- `hsts`: `max-age=31536000; includeSubDomains; preload` (prod only).
- `referrerPolicy: 'no-referrer'`.
- `crossOriginEmbedderPolicy: false` (kept off to allow CV preview iframes).

## 8. Rate limiting

`express-rate-limit` with a memory store in dev and a Redis store recommended for prod (wired via adapter, commented in code).

| Scope | Limit |
|---|---|
| Global | 300 req / 15 min / IP |
| `/auth/*` | 20 req / 15 min / IP |
| `/auth/login` | 5 attempts / 15 min / (IP + email) |
| `/cv/upload` | 10 / hour / user |
| `/match/run` | 60 / hour / user |

## 9. Logging & audit

Structured JSON logs via Pino. Every log line has `requestId`, `userId` (if auth'd), `ip`, `route`.

Separate audit channel for:
- All auth events (`login.success`, `login.failed`, `password.changed`, `refresh.rotated`).
- All matching runs (`match.started`, `match.completed` with `cvId`, `topK`, `durationMs`).
- All role-gated actions (`admin.userListed`, `admin.exported`).

Logs are designed for a SIEM: flat JSON, no nested objects beyond one level, timestamp as ISO string.

## 10. Secrets management

- `.env` is in `.gitignore`. `.env.example` is committed with placeholder values and docstrings.
- No secret is logged — the logger has a redactor for keys matching `/password|token|secret|key/i`.
- JWT and API-key rotation is a documented runbook step, not a code change: update env, rolling restart Node + AI service.

## 11. OWASP Top 10 (2021) mapping

| # | Risk | Where we address it |
|---|---|---|
| A01 | Broken Access Control | `requireRole` middleware + service-layer userId scoping |
| A02 | Cryptographic Failures | bcrypt cost 12, HS256 with 256-bit secret, HTTPS+HSTS in prod |
| A03 | Injection | Prisma parameterized queries, Zod/Pydantic on every boundary |
| A04 | Insecure Design | BFF + trust zones; AI service not internet-exposed |
| A05 | Security Misconfiguration | Helmet defaults, strict CORS, secrets in env, error messages scrubbed |
| A06 | Vulnerable Components | `npm audit` + `pip-audit` in CI, Dependabot PRs |
| A07 | Identification & Auth Failures | Rate-limited login, lockout, refresh rotation, HttpOnly cookies |
| A08 | Software & Data Integrity | Package lockfiles committed, Docker images pinned by digest in CI |
| A09 | Security Logging & Monitoring | Pino audit channel with auth + match events |
| A10 | Server-Side Request Forgery | AI service is the only outbound call; destination is a hardcoded service name, not a URL from user input |

## 12. Threat model summary

**In scope**: credential theft, XSS, CSRF, IDOR on CVs/jobs, file-upload abuse, injection, DoS via matching loops.

**Out of scope for this portfolio**: nation-state actors, physical attacks, compromised Docker host, supply-chain attacks on pinned dependencies. These would be the next tier of hardening (image signing, runtime security, WAF, bastion hosts) in a real deployment.

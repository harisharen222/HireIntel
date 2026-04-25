# API Reference

Live Swagger UI: `http://localhost:4000/api/docs` (backend) · `http://localhost:8000/docs` (AI service, dev only).

All backend endpoints use JSON. Auth is cookie-based (`HttpOnly`, `Secure`, `SameSite=Strict`) — include `credentials: 'include'` on `fetch` or `withCredentials: true` on axios.

---

## Auth

### `POST /api/auth/register`

Create an account. Sets session cookies on 201.

```json
{
  "email": "sara@example.com",
  "password": "StrongP@ss1",
  "fullName": "Sara Ben Ali",
  "role": "CANDIDATE"
}
```

**201 Created**

```json
{ "user": { "id": "...", "email": "sara@example.com", "role": "CANDIDATE", "fullName": "Sara Ben Ali" } }
```

**409 Conflict** if email is taken.

### `POST /api/auth/login`

```json
{ "email": "sara@example.com", "password": "StrongP@ss1" }
```

**200 OK** with `{ user: ... }` and cookies set. **401** on bad credentials (uniform message — no user enumeration).

Rate-limited: 5 attempts / 15 min per (IP, email). Account locks for 30 min after 10 failed attempts.

### `POST /api/auth/refresh`

Rotates the refresh token. Called automatically by the frontend's axios interceptor on 401.

### `POST /api/auth/logout`

Revokes the refresh token row and clears both cookies.

### `GET /api/auth/me`

Returns the current user from the JWT. Used on app load to restore session.

---

## CV

### `POST /api/cv/upload`

`multipart/form-data` with a single `file` field. PDF only, 5 MB max. Rate-limited to 10 uploads/hour/user.

```bash
curl -X POST http://localhost:4000/api/cv/upload \
  -b cookies.txt \
  -F "file=@resume.pdf"
```

**201 Created**

```json
{
  "cvId": "cv_...",
  "filename": "resume.pdf",
  "extractedSkills": ["python", "pytorch", "nlp", "docker"],
  "yearsExperience": 3,
  "embeddingDim": 384,
  "processedAt": "2026-04-20T10:22:11Z"
}
```

**422** if the PDF is scanned, encrypted, or unparseable.

### `GET /api/cv/mine`

List the authenticated candidate's CVs.

### `GET /api/cv/:id` · `DELETE /api/cv/:id`

Object-level authz: a candidate can only touch their own CVs.

---

## Jobs

### `GET /api/jobs`

Public listing of `OPEN` jobs. Returns up to 100 most recent.

### `POST /api/jobs` (recruiter)

```json
{
  "title": "NLP Engineer",
  "company": "Devoteam",
  "description": "We're hiring an NLP engineer...",
  "requiredSkills": ["python", "nlp", "pytorch", "aws"],
  "minYears": 2,
  "location": "Paris / Remote",
  "status": "OPEN"
}
```

The description is embedded (title + skills + description concatenated) into the same 384-dim space as CVs.

### `GET /api/jobs/mine` · `PATCH /api/jobs/:id` · `DELETE /api/jobs/:id`

Recruiter-scoped. The PATCH endpoint re-embeds only when `title`, `description`, or `requiredSkills` change.

---

## Matching

### `POST /api/match/run`

Provide exactly one of `cvId` or `jobId`.

- `cvId` → top-K matching OPEN jobs for that CV (candidate flow).
- `jobId` → top-K matching CVs for that job (recruiter flow).

```json
{ "cvId": "cv_...", "topK": 10 }
```

**200 OK**

```json
{
  "runId": "run_...",
  "matches": [
    {
      "jobId": "job_...",
      "jobTitle": "NLP Engineer",
      "company": "Devoteam",
      "finalScore": 0.874,
      "semanticSimilarity": 0.912,
      "skillOverlap": 0.800,
      "experienceFit": 0.750,
      "matchedSkills": ["python", "nlp", "pytorch"],
      "missingSkills": ["aws", "kubernetes"],
      "verdict": "STRONG_FIT"
    }
  ]
}
```

Rate-limited: 60/hour/user.

### `GET /api/match/history`

Last 50 runs for the current user with their top 10 results each.

### `GET /api/match/:runId/export.csv`

Returns a CSV attachment with one row per match result (rank, score breakdown, matched/missing skills).

---

## Admin

All under `/api/admin` — requires `ADMIN` role.

### `GET /api/admin/analytics`

```json
{
  "totals": { "users": 142, "cvs": 89, "openJobs": 23, "matchRuns": 417 },
  "recent": { "usersLast7Days": 12 },
  "verdictDistribution": [
    { "verdict": "STRONG_FIT", "count": 81 },
    { "verdict": "MEDIUM_FIT", "count": 203 },
    { "verdict": "WEAK_FIT", "count": 133 }
  ]
}
```

### `GET /api/admin/users?cursor=&limit=`

Cursor-paginated user list.

---

## Internal AI service

**Not exposed to the public internet.** Only the Node BFF can reach it (by Docker service name) with a valid `X-Internal-API-Key` header.

### `POST /parse` → `{ text, skills, yearsExperience }`
### `POST /embed` → `{ embedding: number[384], dim, model }`
### `POST /match` → `{ matches: MatchItem[] }`

See `ai-service/app/schemas/models.py` for full schema.

---

## Error envelope

All errors follow:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { ... } } }
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE` (422), `TOO_MANY_REQUESTS` (429), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

# AI / NLP Pipeline

## 1. Model choice

**`sentence-transformers/all-MiniLM-L6-v2`**

- 22M parameters, 6 transformer layers, 384-dim output.
- Trained via contrastive loss on 1B+ sentence pairs; strong STS (Semantic Textual Similarity) benchmark scores despite small size.
- CPU-friendly: ~14k sentences/sec batched on a modern CPU; latency ~50 ms single-inference.
- MIT-licensed weights from HuggingFace Hub.

### Why this model

Portfolio projects often default to BERT-base or larger. They're usually a poor choice because:

- 110M params → 4x memory, 5x latency, no meaningful quality gain for short-text similarity.
- Downloading 400+ MB on every CI run is slow.
- The extra headroom is wasted when the downstream signal (a scalar similarity score) doesn't need it.

MiniLM is the defensible middle ground and matches what most production retrieval systems use as a first pass before a re-ranker.

### When we'd replace it

- **Multilingual corpus** (French + Arabic CVs are realistic in the target market) → `paraphrase-multilingual-MiniLM-L12-v2` (same interface, 50 languages).
- **Quality ceiling** → keep MiniLM for the first-stage retrieval, add a cross-encoder re-ranker (`cross-encoder/ms-marco-MiniLM-L-6-v2`) on the top 20 only.

Both swaps are behind the `Embedder` interface in `ai-service/app/services/embedder.py` — the API contract does not change.

## 2. Text extraction

`pdfplumber` is used over `PyPDF2` because it preserves reading order better for multi-column CVs (very common in French and European CVs).

Pipeline:
1. Open PDF with `pdfplumber`.
2. Extract page-by-page text, join with single newlines.
3. Collapse excess whitespace.
4. If total extracted length < 200 chars → return `EMPTY_OR_SCANNED` error. The BFF surfaces this to the user with a clear message ("Your CV appears to be a scanned image; please upload a text-based PDF"). OCR would be the next step in roadmap.

## 3. Skill & experience extraction

Deliberately simple, deliberately rule-based:

- **Skill list**: a curated `SKILL_TAXONOMY` (~400 terms across programming languages, frameworks, cloud, data, soft skills) in `ai-service/app/services/skills.py`. Case-insensitive whole-word match with alias support (`js` → `javascript`).
- **Experience years**: regex over common phrasings (`\b(\d{1,2})\+?\s*(years?|ans?|yrs?)\s*(of\s*)?(experience|exp)`).

This is intentionally low-tech. A real deployment would use a NER model fine-tuned on resume data (e.g., `JobBERT`), but that's a 3-week project on its own. The rule-based version works on the portfolio and is honest about its limits — documented as such.

## 4. Scoring

```
final_score = 0.65 · semantic_similarity
            + 0.25 · skill_overlap
            + 0.10 · experience_fit
```

### `semantic_similarity`

Cosine similarity between CV embedding and job-description embedding. Both live in the `embedding` column of their respective tables. pgvector's `<=>` operator computes cosine distance; we convert to similarity with `1 - distance`. Range [0, 1] (negative similarities are clamped; they don't occur in practice with Sentence Transformers which produce approximately unit-norm vectors).

### `skill_overlap`

Jaccard similarity of skill sets:

```
|CV.skills ∩ job.requiredSkills| / |CV.skills ∪ job.requiredSkills|
```

Required skills are extracted from the job description at post time, the same way they are from CVs. Range [0, 1].

### `experience_fit`

Piecewise:
- `cv_years >= job_min_years` → `1.0`
- `cv_years == job_min_years - 1` → `0.75`
- `cv_years == job_min_years - 2` → `0.5`
- else → `0.0`

Asymmetric on purpose: being over-qualified doesn't hurt the score.

### Weights

Default weights were chosen by:
1. Creating 30 (CV, job) pairs with human-labelled fit (strong / medium / weak).
2. Grid-searching α, β, γ on the simplex in 0.05 increments.
3. Picking the triplet that maximized Spearman correlation between `final_score` and human label.

The resulting `(0.65, 0.25, 0.10)` isn't gospel — it's a starting point. Weights are in `ai-service/app/core/config.py` and can be tuned without a code change.

### Verdict thresholds

```
final_score >= 0.80  → STRONG_FIT
final_score >= 0.60  → MEDIUM_FIT
final_score <  0.60  → WEAK_FIT
```

These are shown to users as labels, not numbers — numbers invite false precision on something that's ultimately a heuristic ranking.

## 5. Explainability

For every match the API returns:

```json
{
  "finalScore": 0.87,
  "breakdown": { "semanticSimilarity": 0.91, "skillOverlap": 0.80, "experienceFit": 0.75 },
  "matchedSkills": ["python", "nlp", "pytorch"],
  "missingSkills": ["aws", "kubernetes"],
  "verdict": "STRONG_FIT"
}
```

This is deliberately mechanical — every user can trace why they got the score they did. No black-box LLM summary in the critical path. An LLM-generated natural-language version is planned but as a nice-to-have layer on top, not a replacement for the breakdown.

## 6. Retrieval

For a CV with `k` jobs in the system:

```sql
SELECT j.id, j.title, j.company_id,
       1 - (j.embedding <=> $cv_embedding) AS cosine_sim
FROM   jobs j
WHERE  j.status = 'OPEN'
ORDER  BY j.embedding <=> $cv_embedding
LIMIT  $topK;
```

An **HNSW index** on `jobs.embedding` (cosine ops) makes this ~O(log n) instead of O(n). Index is created in `docker/init.sql`:

```sql
CREATE INDEX jobs_embedding_hnsw
ON jobs USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

`m` and `ef_construction` values follow pgvector's recommended defaults for <1M rows. For portfolio demo scale (hundreds of rows), the index barely matters — but the decision is documented and the code is production-shaped.

After retrieval, the top-K candidates go through the full hybrid scorer on the Python side (it's fast because K is small), and the re-ranked list is returned.

## 7. Evaluation

`ai-service/tests/test_scoring.py` contains:

- Unit tests for each scoring component (determinism, boundary conditions).
- A small regression suite: fixed (CV, job) pairs with expected score ranges. If we change weights or the model, these flag the shift.

A real project would add:
- Precision@K and nDCG@K on a larger labelled set.
- A/B harness to compare model versions in shadow mode.

## 8. Latency budget

On modest hardware (4-core CPU, no GPU):

| Stage | Median latency |
|---|---|
| PDF parse | 150 ms |
| Skill extraction | 20 ms |
| Embedding (single) | 50 ms |
| pgvector top-10 retrieval (1k jobs) | 5 ms |
| Hybrid scoring + explain | 10 ms |
| **Total upload → CV ready** | **~220 ms** |
| **Total match run** | **~15 ms** |

Well within the 500ms P99 target for interactive UX.

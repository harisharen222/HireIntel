"""pgvector-backed retrieval with hybrid re-scoring.

The cheap part (narrowing to top-K by cosine) happens in Postgres via the
HNSW index. Only then do we pull rows to Python and apply the full
hybrid scorer. This keeps the data transfer small even with many jobs.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import asyncpg
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.models import MatchItem
from app.services.scorer import experience_fit, final_score, verdict_for
from app.services.skills import skill_overlap

log = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=get_settings().DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=10,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@dataclass
class _Row:
    id: str
    title: str
    company: str
    required_skills: list[str]
    min_years: int
    cosine_sim: float


def _vec_literal(v: list[float]) -> str:
    """Format a Python list as a pgvector literal: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


async def _load_cv(cv_id: str) -> tuple[list[float], list[str], int]:
    pool = await get_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            SELECT embedding::text AS embedding_text, skills, "yearsExperience"
            FROM cvs WHERE id = $1
            """,
            cv_id,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="CV not found")
    # pgvector text format: "[0.1,0.2,...]"
    emb_text: str = row["embedding_text"]
    emb = [float(x) for x in emb_text.strip("[]").split(",")]
    return emb, list(row["skills"]), int(row["yearsExperience"])


async def _load_job(job_id: str) -> tuple[list[float], list[str], int]:
    pool = await get_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            SELECT embedding::text AS embedding_text, "requiredSkills", "minYears"
            FROM jobs WHERE id = $1
            """,
            job_id,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    emb_text: str = row["embedding_text"]
    emb = [float(x) for x in emb_text.strip("[]").split(",")]
    return emb, list(row["requiredSkills"]), int(row["minYears"])


async def match_cv_to_jobs(cv_id: str, top_k: int) -> list[MatchItem]:
    """For a given CV, return its top-K matching OPEN jobs."""
    cv_emb, cv_skills, cv_years = await _load_cv(cv_id)

    pool = await get_pool()
    async with pool.acquire() as con:
        rows = await con.fetch(
            f"""
            SELECT
                j.id,
                j.title,
                j.company,
                j."requiredSkills" AS required_skills,
                j."minYears" AS min_years,
                1 - (j.embedding <=> '{_vec_literal(cv_emb)}'::vector) AS cosine_sim
            FROM jobs j
            WHERE j.status = 'OPEN'
            ORDER BY j.embedding <=> '{_vec_literal(cv_emb)}'::vector
            LIMIT $1
            """,
            top_k,
        )

    items: list[MatchItem] = []
    for r in rows:
        row = _Row(
            id=r["id"],
            title=r["title"],
            company=r["company"],
            required_skills=list(r["required_skills"]),
            min_years=int(r["min_years"]),
            cosine_sim=float(r["cosine_sim"]),
        )
        overlap, matched, missing = skill_overlap(cv_skills, row.required_skills)
        exp_fit = experience_fit(cv_years, row.min_years)
        score = final_score(row.cosine_sim, overlap, exp_fit)
        items.append(
            MatchItem(
                jobId=row.id,
                jobTitle=row.title,
                company=row.company,
                semanticSimilarity=round(row.cosine_sim, 4),
                skillOverlap=round(overlap, 4),
                experienceFit=round(exp_fit, 4),
                finalScore=round(score, 4),
                matchedSkills=matched,
                missingSkills=missing,
                verdict=verdict_for(score),
            )
        )
    # Sorted by cosine on the DB side, but the hybrid score can reorder.
    items.sort(key=lambda m: m.finalScore, reverse=True)
    return items


async def match_job_to_cvs(job_id: str, top_k: int) -> list[MatchItem]:
    """For a given job, return its top-K matching CVs.

    Returns MatchItem with cv identity packed into jobId/jobTitle/company
    fields as a pragmatic reuse of the schema. In a v2 I'd add a
    dedicated CandidateMatch schema.
    """
    job_emb, job_skills, job_min = await _load_job(job_id)

    pool = await get_pool()
    async with pool.acquire() as con:
        rows = await con.fetch(
            f"""
            SELECT
                c.id,
                u."fullName" AS candidate_name,
                u.email AS candidate_email,
                c.skills,
                c."yearsExperience" AS years,
                1 - (c.embedding <=> '{_vec_literal(job_emb)}'::vector) AS cosine_sim
            FROM cvs c
            JOIN users u ON u.id = c."userId"
            ORDER BY c.embedding <=> '{_vec_literal(job_emb)}'::vector
            LIMIT $1
            """,
            top_k,
        )

    items: list[MatchItem] = []
    for r in rows:
        cv_skills = list(r["skills"])
        years = int(r["years"])
        cos = float(r["cosine_sim"])
        overlap, matched, missing = skill_overlap(cv_skills, job_skills)
        exp_fit = experience_fit(years, job_min)
        score = final_score(cos, overlap, exp_fit)
        items.append(
            MatchItem(
                jobId=r["id"],
                jobTitle=r["candidate_name"],
                company=r["candidate_email"],
                semanticSimilarity=round(cos, 4),
                skillOverlap=round(overlap, 4),
                experienceFit=round(exp_fit, 4),
                finalScore=round(score, 4),
                matchedSkills=matched,
                missingSkills=missing,
                verdict=verdict_for(score),
            )
        )
    items.sort(key=lambda m: m.finalScore, reverse=True)
    return items

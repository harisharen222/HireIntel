"""MongoDB-backed retrieval with hybrid re-scoring.

The cheap part (narrowing to top-K by cosine) happens in MongoDB via Atlas Vector Search.
Only then do we pull rows from Postgres and apply the full hybrid scorer.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict

import asyncpg
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.db import vector_store
from app.schemas.models import MatchItem
from app.services.scorer import experience_fit, final_score, verdict_for
from app.services.skills import skill_overlap

log = logging.getLogger(__name__)

from app.db.pg import db

@dataclass
class _JobRow:
    id: str
    title: str
    company: str
    required_skills: list[str]
    min_years: int
    cosine_sim: float

@dataclass
class _CvRow:
    id: str
    candidate_name: str
    candidate_email: str
    skills: list[str]
    years: int
    cosine_sim: float

async def _load_cv_details(cv_id: str) -> tuple[list[str], int]:
    pool = db.pool
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            SELECT skills, "yearsExperience"
            FROM cvs WHERE id = $1
            """,
            cv_id,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="CV not found")
    return list(row["skills"]), int(row["yearsExperience"])

async def _load_job_details(job_id: str) -> tuple[list[str], int]:
    pool = db.pool
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            SELECT "requiredSkills", "minYears"
            FROM jobs WHERE id = $1
            """,
            job_id,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    return list(row["requiredSkills"]), int(row["minYears"])

async def match_cv_to_jobs(cv_id: str, top_k: int) -> list[MatchItem]:
    cv_skills, cv_years = await _load_cv_details(cv_id)
    
    try:
        cv_emb = await vector_store.get_embedding(cv_id, "cvs")
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="CV embedding not found")

    # Fetch top candidates from MongoDB
    # Since we need OPEN jobs, we might fetch more to account for closed ones, 
    # but for simplicity we fetch top_k * 2 and filter in postgres.
    mongo_results = await vector_store.search_similar(cv_emb, top_k * 2, "jobs")
    if not mongo_results:
        return []

    doc_scores = {res["doc_id"]: res["score"] for res in mongo_results}
    doc_ids = list(doc_scores.keys())

    pool = db.pool
    async with pool.acquire() as con:
        rows = await con.fetch(
            """
            SELECT
                id, title, company, "requiredSkills" AS required_skills, "minYears" AS min_years
            FROM jobs
            WHERE id = ANY($1::text[]) AND status = 'OPEN'
            """,
            doc_ids,
        )

    items: list[MatchItem] = []
    for r in rows:
        job_id = r["id"]
        row = _JobRow(
            id=job_id,
            title=r["title"],
            company=r["company"],
            required_skills=list(r["required_skills"]),
            min_years=int(r["min_years"]),
            cosine_sim=float(doc_scores.get(job_id, 0.0)),
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
    items.sort(key=lambda m: m.finalScore, reverse=True)
    return items[:top_k]

async def match_job_to_cvs(job_id: str, top_k: int) -> list[MatchItem]:
    job_skills, job_min = await _load_job_details(job_id)

    try:
        job_emb = await vector_store.get_embedding(job_id, "jobs")
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job embedding not found")

    mongo_results = await vector_store.search_similar(job_emb, top_k, "cvs")
    if not mongo_results:
        return []

    doc_scores = {res["doc_id"]: res["score"] for res in mongo_results}
    doc_ids = list(doc_scores.keys())

    pool = db.pool
    async with pool.acquire() as con:
        rows = await con.fetch(
            """
            SELECT
                c.id, u."fullName" AS candidate_name, u.email AS candidate_email,
                c.skills, c."yearsExperience" AS years
            FROM cvs c
            JOIN users u ON u.id = c."userId"
            WHERE c.id = ANY($1::text[])
            """,
            doc_ids,
        )

    items: list[MatchItem] = []
    for r in rows:
        cv_id = r["id"]
        row = _CvRow(
            id=cv_id,
            candidate_name=r["candidate_name"],
            candidate_email=r["candidate_email"],
            skills=list(r["skills"]),
            years=int(r["years"]),
            cosine_sim=float(doc_scores.get(cv_id, 0.0)),
        )
        overlap, matched, missing = skill_overlap(row.skills, job_skills)
        exp_fit = experience_fit(row.years, job_min)
        score = final_score(row.cosine_sim, overlap, exp_fit)
        items.append(
            MatchItem(
                jobId=row.id,
                jobTitle=row.candidate_name,
                company=row.candidate_email,
                semanticSimilarity=round(row.cosine_sim, 4),
                skillOverlap=round(overlap, 4),
                experienceFit=round(exp_fit, 4),
                finalScore=round(score, 4),
                matchedSkills=matched,
                missingSkills=missing,
                verdict=verdict_for(score),
            )
        )
    items.sort(key=lambda m: m.finalScore, reverse=True)
    return items[:top_k]

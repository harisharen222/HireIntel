"""Hybrid scoring: combines semantic similarity, skill overlap, and
experience fit into a single final score with an explainable breakdown.
"""
from __future__ import annotations

from app.core.config import get_settings
from app.schemas.models import Verdict


def experience_fit(cv_years: int, job_min_years: int) -> float:
    """Piecewise, asymmetric (over-qualification is not penalized)."""
    if cv_years >= job_min_years:
        return 1.0
    gap = job_min_years - cv_years
    if gap == 1:
        return 0.75
    if gap == 2:
        return 0.5
    return 0.0


def final_score(semantic: float, skills: float, experience: float) -> float:
    s = get_settings()
    # Clamp components to [0, 1] defensively — pgvector can return slight
    # out-of-range values due to float precision.
    semantic = max(0.0, min(1.0, semantic))
    skills = max(0.0, min(1.0, skills))
    experience = max(0.0, min(1.0, experience))

    # Normalize by total weight so the score stays in [0, 1] even if operators
    # tune the weights to values that don't sum to 1.0.
    total_w = s.WEIGHT_SEMANTIC + s.WEIGHT_SKILLS + s.WEIGHT_EXPERIENCE
    if total_w <= 0:
        return 0.0
    return (
        s.WEIGHT_SEMANTIC * semantic
        + s.WEIGHT_SKILLS * skills
        + s.WEIGHT_EXPERIENCE * experience
    ) / total_w


def verdict_for(score: float) -> Verdict:
    s = get_settings()
    if score >= s.THRESHOLD_STRONG:
        return "STRONG_FIT"
    if score >= s.THRESHOLD_MEDIUM:
        return "MEDIUM_FIT"
    return "WEAK_FIT"

"""Unit tests for the scoring pipeline — pure functions, no DB."""
import pytest

from app.services.scorer import experience_fit, final_score, verdict_for
from app.services.skills import (
    extract_skills,
    extract_years_experience,
    skill_overlap,
)


class TestExperienceFit:
    def test_meets_requirement(self):
        assert experience_fit(5, 3) == 1.0

    def test_exactly_meets(self):
        assert experience_fit(3, 3) == 1.0

    def test_one_year_short(self):
        assert experience_fit(2, 3) == 0.75

    def test_two_years_short(self):
        assert experience_fit(1, 3) == 0.5

    def test_far_short(self):
        assert experience_fit(0, 5) == 0.0

    def test_zero_requirement_zero_cv(self):
        assert experience_fit(0, 0) == 1.0


class TestFinalScore:
    def test_all_max(self):
        assert final_score(1.0, 1.0, 1.0) == pytest.approx(1.0, abs=1e-6)

    def test_all_zero(self):
        assert final_score(0.0, 0.0, 0.0) == 0.0

    def test_clamps_out_of_range(self):
        # pgvector can return 1.0001 due to float precision; must not explode.
        assert final_score(1.01, 1.01, 1.01) == pytest.approx(1.0, abs=1e-6)
        assert final_score(-0.01, 0.5, 0.5) >= 0.0

    def test_semantic_dominates(self):
        # With default weights 0.65/0.25/0.10, semantic gets the biggest share.
        high_sem = final_score(1.0, 0.0, 0.0)
        high_skl = final_score(0.0, 1.0, 0.0)
        high_exp = final_score(0.0, 0.0, 1.0)
        assert high_sem > high_skl > high_exp


class TestVerdict:
    def test_strong(self):
        assert verdict_for(0.90) == "STRONG_FIT"
        assert verdict_for(0.80) == "STRONG_FIT"

    def test_medium(self):
        assert verdict_for(0.79) == "MEDIUM_FIT"
        assert verdict_for(0.60) == "MEDIUM_FIT"

    def test_weak(self):
        assert verdict_for(0.59) == "WEAK_FIT"
        assert verdict_for(0.0) == "WEAK_FIT"


class TestSkillExtraction:
    def test_basic(self):
        text = "I work with Python and PyTorch on NLP projects."
        skills = extract_skills(text)
        assert "python" in skills
        assert "pytorch" in skills
        assert "nlp" in skills

    def test_aliases(self):
        text = "Experienced in JS, TS, and K8s."
        skills = extract_skills(text)
        assert "javascript" in skills
        assert "typescript" in skills
        assert "kubernetes" in skills

    def test_case_insensitive(self):
        text = "PYTHON and python and Python"
        skills = extract_skills(text)
        # Dedup — appears only once.
        assert skills.count("python") == 1

    def test_word_boundary(self):
        # "java" should not match inside "javascript"
        text = "javascript only"
        skills = extract_skills(text)
        assert "javascript" in skills
        assert "java" not in skills


class TestYearsExtraction:
    def test_basic(self):
        assert extract_years_experience("5 years of experience") == 5

    def test_french(self):
        assert extract_years_experience("3 ans d'expérience") == 3

    def test_plus_notation(self):
        assert extract_years_experience("10+ years experience") == 10

    def test_picks_max(self):
        text = "2 years in ML, 7 years total experience"
        assert extract_years_experience(text) == 7

    def test_filters_implausible(self):
        text = "100 years of experience"
        assert extract_years_experience(text) == 0

    def test_no_match(self):
        assert extract_years_experience("no numbers here") == 0


class TestSkillOverlap:
    def test_perfect_overlap(self):
        score, matched, missing = skill_overlap(["python", "sql"], ["python", "sql"])
        assert score == 1.0
        assert set(matched) == {"python", "sql"}
        assert missing == []

    def test_no_overlap(self):
        score, matched, missing = skill_overlap(["python"], ["go"])
        assert score == 0.0
        assert matched == []
        assert missing == ["go"]

    def test_partial(self):
        score, matched, missing = skill_overlap(
            ["python", "pytorch", "nlp"],
            ["python", "aws", "kubernetes"],
        )
        # Intersection = 1, union = 5
        assert score == pytest.approx(0.2)
        assert matched == ["python"]
        assert set(missing) == {"aws", "kubernetes"}

    def test_empty(self):
        score, matched, missing = skill_overlap([], [])
        assert score == 0.0
        assert matched == []
        assert missing == []

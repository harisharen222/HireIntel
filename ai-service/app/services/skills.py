"""Rule-based skill extraction and overlap scoring.

Deliberately simple: a curated taxonomy with aliases, case-insensitive
whole-word matching. A NER-based approach would be more accurate at the
cost of a training pipeline — out of scope for this portfolio. The
taxonomy is easy to extend in one place.
"""
from __future__ import annotations

import re

# (canonical, [aliases...])
_TAXONOMY: list[tuple[str, list[str]]] = [
    # Languages
    ("python", ["python3", "py"]),
    ("javascript", ["js", "ecmascript"]),
    ("typescript", ["ts"]),
    ("java", []),
    ("c++", ["cpp", "c plus plus"]),
    ("c#", ["csharp", "c sharp"]),
    ("go", ["golang"]),
    ("rust", []),
    ("ruby", []),
    ("php", []),
    ("scala", []),
    ("kotlin", []),
    ("swift", []),
    ("r", []),
    ("sql", []),
    # Frameworks / libs
    ("react", ["reactjs", "react.js"]),
    ("vue", ["vuejs", "vue.js"]),
    ("angular", ["angularjs"]),
    ("next.js", ["nextjs"]),
    ("node.js", ["nodejs", "node"]),
    ("express", ["expressjs", "express.js"]),
    ("fastapi", []),
    ("django", []),
    ("flask", []),
    ("spring", ["spring boot", "springboot"]),
    # ML / NLP
    ("pytorch", ["torch"]),
    ("tensorflow", ["tf"]),
    ("keras", []),
    ("scikit-learn", ["sklearn", "scikit learn"]),
    ("huggingface", ["hugging face", "transformers"]),
    ("nlp", ["natural language processing"]),
    ("computer vision", ["cv", "opencv"]),
    ("deep learning", ["dl"]),
    ("machine learning", ["ml"]),
    ("reinforcement learning", ["rl"]),
    ("langchain", []),
    ("llm", ["large language model", "llms"]),
    # Data
    ("pandas", []),
    ("numpy", []),
    ("spark", ["apache spark", "pyspark"]),
    ("kafka", ["apache kafka"]),
    ("airflow", ["apache airflow"]),
    ("dbt", []),
    ("snowflake", []),
    ("bigquery", []),
    # DBs
    ("postgresql", ["postgres", "psql"]),
    ("mysql", []),
    ("mongodb", ["mongo"]),
    ("redis", []),
    ("elasticsearch", ["elastic"]),
    ("pgvector", []),
    ("pinecone", []),
    # Cloud / infra
    ("aws", ["amazon web services"]),
    ("azure", ["microsoft azure"]),
    ("gcp", ["google cloud", "google cloud platform"]),
    ("docker", []),
    ("kubernetes", ["k8s"]),
    ("terraform", []),
    ("ansible", []),
    ("jenkins", []),
    ("github actions", ["gh actions"]),
    ("gitlab ci", []),
    ("ci/cd", ["cicd", "ci cd"]),
    ("linux", []),
    # Practices
    ("rest", ["rest api", "restful"]),
    ("graphql", []),
    ("microservices", ["microservice"]),
    ("agile", ["scrum"]),
    ("tdd", ["test driven development"]),
    # Tunisian / French context — common in target market
    ("french", ["français", "francais"]),
    ("arabic", ["العربية"]),
    ("english", ["anglais"]),
]

# Build (alias_lowered → canonical) lookup, including the canonical itself.
_ALIAS_MAP: dict[str, str] = {}
for canon, aliases in _TAXONOMY:
    _ALIAS_MAP[canon.lower()] = canon
    for a in aliases:
        _ALIAS_MAP[a.lower()] = canon

# Sort patterns longest-first so "c++" matches before "c", "next.js" before "next".
_PATTERNS: list[tuple[re.Pattern[str], str]] = sorted(
    (
        (re.compile(rf"(?<![A-Za-z0-9+#.]){re.escape(alias)}(?![A-Za-z0-9+#.])", re.IGNORECASE), canon)
        for alias, canon in _ALIAS_MAP.items()
    ),
    key=lambda p: -len(p[0].pattern),
)

# Mois en français et anglais → numéro
_MONTHS = {
    "jan": 1, "janv": 1, "january": 1, "janvier": 1,
    "feb": 2, "fev": 2, "févr": 2, "fevr": 2, "february": 2, "février": 2, "fevrier": 2,
    "mar": 3, "mars": 3, "march": 3,
    "apr": 4, "avr": 4, "april": 4, "avril": 4,
    "may": 5, "mai": 5,
    "jun": 6, "juin": 6, "june": 6,
    "jul": 7, "juil": 7, "july": 7, "juillet": 7,
    "aug": 8, "aou": 8, "août": 8, "aout": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9, "septembre": 9,
    "oct": 10, "october": 10, "octobre": 10,
    "nov": 11, "november": 11, "novembre": 11,
    "dec": 12, "déc": 12, "december": 12, "décembre": 12, "decembre": 12,
}

# "Mois Année" — ex: "Sept 2024", "Feb 2020", "Janvier 2023"
_MONTH_YEAR = r"([A-Za-zéûôîÉÛÔÎ]{3,9})\.?\s+(\d{4})"

# Une plage : "Sept 2024 – En cours" ou "Feb 2020 - June 2020"
_RANGE_RE = re.compile(
    rf"{_MONTH_YEAR}\s*[-–—]\s*(?:{_MONTH_YEAR}|en\s*cours|present|actuel|now|today|aujourd'hui)",
    re.IGNORECASE,
)

# Fallback: "5 ans d'expérience" / "3 years of experience"
_YEARS_RE = re.compile(
    r"\b(\d{1,2})\s*\+?\s*(?:years?|ans?|yrs?)\s*(?:of\s*)?(?:experience|exp|expérience)?\b",
    re.IGNORECASE,
)


def _month_index(year: int, month: int) -> int:
    """Convert (year, month) to a single integer for set operations."""
    return year * 12 + (month - 1)


def extract_years_experience(text: str) -> int:
    """Compute total years of experience from a CV.

    Strategy:
      1. Find all 'Month YYYY – Month YYYY' (or 'En cours') ranges.
      2. Convert each range to the set of months it covers.
      3. Take the UNION of all months — de-duplicates overlapping experiences
         (someone teaching at 2 universities at once gets counted once).
      4. Convert total months → years.

    Falls back to '5 years experience' phrasing if no ranges are found.
    """
    from datetime import datetime
    now = datetime.now()
    today_idx = _month_index(now.year, now.month)

    months_worked: set[int] = set()

    for m in _RANGE_RE.finditer(text):
        start_month_str = m.group(1).lower().rstrip(".")
        start_year = int(m.group(2))
        start_month = _MONTHS.get(start_month_str[:4]) or _MONTHS.get(start_month_str[:3])
        if start_month is None:
            continue

        end_month_str = m.group(3)
        end_year_str = m.group(4)
        if end_month_str and end_year_str:
            end_month_str = end_month_str.lower().rstrip(".")
            end_month = _MONTHS.get(end_month_str[:4]) or _MONTHS.get(end_month_str[:3])
            if end_month is None:
                continue
            end_idx = _month_index(int(end_year_str), end_month)
        else:
            # "En cours", "Present", etc. → today
            end_idx = today_idx

        start_idx = _month_index(start_year, start_month)
        if end_idx < start_idx:
            continue  # malformed range

        for i in range(start_idx, end_idx + 1):
            months_worked.add(i)

    if months_worked:
        total_years = len(months_worked) // 12
        return max(0, min(50, total_years))

    # Fallback: explicit "X years experience" mention.
    matches = [int(m) for m in _YEARS_RE.findall(text)]
    matches = [y for y in matches if 0 <= y <= 50]
    return max(matches) if matches else 0


def extract_skills(text: str) -> list[str]:
    """Return canonical skills found in text, deduped, stable order."""
    found: list[str] = []
    seen: set[str] = set()
    for pattern, canon in _PATTERNS:
        if canon in seen:
            continue
        if pattern.search(text):
            seen.add(canon)
            found.append(canon)
    return found

def skill_overlap(cv_skills: list[str], job_skills: list[str]) -> tuple[float, list[str], list[str]]:
    """Jaccard similarity + matched/missing lists.

    Returns (score ∈ [0,1], matched, missing).
    """
    a = {s.lower() for s in cv_skills}
    b = {s.lower() for s in job_skills}
    if not a and not b:
        return 0.0, [], []
    matched = sorted(a & b)
    missing = sorted(b - a)
    union = a | b
    score = len(a & b) / len(union) if union else 0.0
    return score, matched, missing

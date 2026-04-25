from typing import Literal

from pydantic import BaseModel, Field


class ParseRequest(BaseModel):
    storagePath: str = Field(..., min_length=1, max_length=1000)


class ParseResponse(BaseModel):
    text: str
    skills: list[str]
    yearsExperience: int


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=200_000)


class EmbedResponse(BaseModel):
    embedding: list[float]
    dim: int
    model: str


class MatchRequest(BaseModel):
    cvId: str | None = None
    jobId: str | None = None
    topK: int = Field(default=10, ge=1, le=50)


Verdict = Literal["STRONG_FIT", "MEDIUM_FIT", "WEAK_FIT"]


class MatchItem(BaseModel):
    jobId: str
    jobTitle: str
    company: str
    semanticSimilarity: float
    skillOverlap: float
    experienceFit: float
    finalScore: float
    matchedSkills: list[str]
    missingSkills: list[str]
    verdict: Verdict


class MatchResponse(BaseModel):
    matches: list[MatchItem]

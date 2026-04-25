"""Typed config loaded from environment variables."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Security — shared secret with the Node BFF.
    INTERNAL_API_KEY: str

    # Model & pipeline.
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # Hybrid scoring weights. α + β + γ = 1.0 by convention.
    WEIGHT_SEMANTIC: float = 0.65
    WEIGHT_SKILLS: float = 0.25
    WEIGHT_EXPERIENCE: float = 0.10

    # Verdict thresholds on the final score.
    THRESHOLD_STRONG: float = 0.80
    THRESHOLD_MEDIUM: float = 0.60

    # Storage root — must match backend UPLOAD_DIR, mounted as shared volume.
    UPLOAD_DIR: str = "/data/uploads"

    # DB (read-only access; writes happen via the Node BFF).
    DATABASE_URL: str

    # Runtime.
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = ""  # not used in prod — service is internal-only


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

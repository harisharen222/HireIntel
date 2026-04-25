"""Sentence-transformer embedder.

The model is loaded once per process on first use. FastAPI's lifespan hook
triggers this at startup so the first real request doesn't eat the ~2s load
penalty.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings

log = logging.getLogger(__name__)

_model_lock = threading.Lock()
_model: Optional[SentenceTransformer] = None


def get_model() -> SentenceTransformer:
    """Thread-safe lazy-init. Cheap after first call."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                name = get_settings().EMBEDDING_MODEL
                log.info("Loading embedding model: %s", name)
                _model = SentenceTransformer(name)
                log.info("Model loaded, dim=%d", _model.get_sentence_embedding_dimension())
    return _model


def embed_text(text: str) -> list[float]:
    """Encode one string → 384-dim L2-normalized vector.

    Normalization matters: cosine similarity on normalized vectors equals
    dot product, and pgvector's `<=>` operator assumes normalized input for
    the best recall on HNSW.
    """
    model = get_model()
    vec: np.ndarray = model.encode(
        text,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return vec.astype(np.float32).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    arr: np.ndarray = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        batch_size=32,
        show_progress_bar=False,
    )
    return [row.astype(np.float32).tolist() for row in arr]


def warmup() -> None:
    """Called at startup so the first user doesn't wait for model load."""
    get_model().encode("warmup", show_progress_bar=False)

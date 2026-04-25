"""PDF text extraction with pdfplumber.

We use pdfplumber over PyPDF2 because it preserves reading order better
for multi-column resumes (common in European CVs).
"""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path

import pdfplumber
from fastapi import HTTPException, status

from app.core.config import get_settings

log = logging.getLogger(__name__)

_WHITESPACE_RE = re.compile(r"\s+")


def _safe_path(storage_path: str) -> Path:
    """Reject any path that escapes UPLOAD_DIR.

    The Node BFF already stores files under UPLOAD_DIR/<userId>/<cvId>.pdf,
    but defense in depth: we re-validate here so a compromised Node
    instance can't trick us into reading arbitrary files.
    """
    root = Path(get_settings().UPLOAD_DIR).resolve()
    candidate = Path(storage_path).resolve()

    try:
        candidate.relative_to(root)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path escapes upload directory",
        ) from e

    if not candidate.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    if os.path.getsize(candidate) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File is empty",
        )
    return candidate


def extract_text(storage_path: str) -> str:
    path = _safe_path(storage_path)
    pages: list[str] = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t:
                    pages.append(t)
    except Exception as e:  # malformed PDF
        log.warning("pdfplumber failed on %s: %s", storage_path, e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not parse PDF (may be corrupt or encrypted)",
        ) from e

    text = "\n".join(pages).strip()
    text = _WHITESPACE_RE.sub(" ", text)

    if len(text) < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "PDF appears to be scanned or contains no extractable text. "
                "OCR is not enabled on this instance."
            ),
        )
    return text

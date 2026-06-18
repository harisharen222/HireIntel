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


import io

def extract_text(file_bytes: bytes) -> str:
    pages: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t:
                    pages.append(t)
    except Exception as e:  # malformed PDF
        log.warning("pdfplumber failed: %s", e)
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

"""Internal API-key enforcement.

This service has no public auth surface — it's called only by the Node BFF.
Every request (except /health and /docs in dev) must present a matching
X-Internal-API-Key header. A constant-time compare prevents timing attacks.
"""
import secrets

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def require_internal_key(
    x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
) -> None:
    expected = get_settings().INTERNAL_API_KEY
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )

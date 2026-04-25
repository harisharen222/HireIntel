from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.security import require_internal_key
from app.schemas.models import EmbedRequest, EmbedResponse
from app.services.embedder import embed_text

router = APIRouter(prefix="/embed", tags=["Embed"], dependencies=[Depends(require_internal_key)])


@router.post("", response_model=EmbedResponse)
async def embed(req: EmbedRequest) -> EmbedResponse:
    settings = get_settings()
    vec = embed_text(req.text)
    return EmbedResponse(embedding=vec, dim=len(vec), model=settings.EMBEDDING_MODEL)

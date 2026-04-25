from fastapi import APIRouter, Depends

from app.core.security import require_internal_key
from app.schemas.models import ParseRequest, ParseResponse
from app.services.parser import extract_text
from app.services.skills import extract_skills, extract_years_experience

router = APIRouter(prefix="/parse", tags=["Parse"], dependencies=[Depends(require_internal_key)])


@router.post("", response_model=ParseResponse)
async def parse_cv(req: ParseRequest) -> ParseResponse:
    text = extract_text(req.storagePath)
    return ParseResponse(
        text=text,
        skills=extract_skills(text),
        yearsExperience=extract_years_experience(text),
    )

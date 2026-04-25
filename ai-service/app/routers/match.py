from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_internal_key
from app.schemas.models import MatchRequest, MatchResponse
from app.services.retrieval import match_cv_to_jobs, match_job_to_cvs

router = APIRouter(prefix="/match", tags=["Match"], dependencies=[Depends(require_internal_key)])


@router.post("", response_model=MatchResponse)
async def run_match(req: MatchRequest) -> MatchResponse:
    if req.cvId and req.jobId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide only one of cvId or jobId, not both",
        )
    if req.cvId:
        matches = await match_cv_to_jobs(req.cvId, req.topK)
    elif req.jobId:
        matches = await match_job_to_cvs(req.jobId, req.topK)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either cvId or jobId is required",
        )
    return MatchResponse(matches=matches)

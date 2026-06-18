from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_internal_key
from app.schemas.agent import AgentRunRequest, AgentRunResponse, AgentMatchItem
from app.agents.hiring_agent import run_hiring_agent

router = APIRouter(prefix="/agent", tags=["Agent"], dependencies=[Depends(require_internal_key)])

@router.post("/run", response_model=AgentRunResponse)
async def run_agent(req: AgentRunRequest) -> AgentRunResponse:
    state = await run_hiring_agent(req.job_id, req.top_k)
    
    if state.get("error"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=state["error"]
        )
        
    candidates = []
    for c in state.get("processed_candidates", []):
        candidates.append(AgentMatchItem(**c))
        
    return AgentRunResponse(
        job_id=req.job_id,
        candidates=candidates,
        status="success"
    )

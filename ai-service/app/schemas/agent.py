from typing import List, Optional
from pydantic import BaseModel
from app.schemas.models import MatchItem

class AgentRunRequest(BaseModel):
    job_id: str
    top_k: int = 5

class AgentMatchItem(MatchItem):
    outreach_email: str

class AgentRunResponse(BaseModel):
    job_id: str
    candidates: List[AgentMatchItem]
    status: str
    error: Optional[str] = None

import logging
from typing import Any, Dict, List, TypedDict

from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

from app.core.config import get_settings
from app.schemas.models import MatchItem
from app.services.retrieval import match_job_to_cvs

log = logging.getLogger(__name__)

# Define the state for the LangGraph
class AgentState(TypedDict):
    job_id: str
    top_k: int
    job_details: Dict[str, Any]
    raw_candidates: List[MatchItem]
    processed_candidates: List[Dict[str, Any]]
    error: str | None

# Nodes
async def fetch_job_node(state: AgentState) -> AgentState:
    log.info(f"fetch_job_node: Fetching job details for {state['job_id']}")
    # For now, we simulate fetching job details since match_job_to_cvs handles it
    state["job_details"] = {"id": state["job_id"]}
    return state

async def search_candidates_node(state: AgentState) -> AgentState:
    log.info("search_candidates_node: Searching for candidates")
    try:
        candidates = await match_job_to_cvs(state["job_id"], state["top_k"])
        state["raw_candidates"] = candidates
    except Exception as e:
        log.error(f"Error in search_candidates_node: {e}")
        state["error"] = str(e)
    return state

async def score_candidates_node(state: AgentState) -> AgentState:
    log.info("score_candidates_node: Processing candidates")
    # match_job_to_cvs already applies hybrid scoring. We just pass them through.
    state["processed_candidates"] = [c.model_dump() for c in state.get("raw_candidates", [])]
    return state

async def draft_outreach_node(state: AgentState) -> AgentState:
    log.info("draft_outreach_node: Drafting outreach emails via Groq")
    settings = get_settings()
    
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "gsk_your_groq_api_key_here":
        log.warning("GROQ_API_KEY is missing or invalid. Using dummy outreach emails.")
        for c in state["processed_candidates"]:
            c["outreach_email"] = "Dear candidate, we liked your profile. Please apply."
        return state

    try:
        llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_retries=2
        )
        
        prompt = PromptTemplate.from_template(
            "Write a short, professional outreach email to a candidate named {name}. "
            "Mention you are impressed by their skills: {matched_skills}. "
            "Politely note that the job requires {missing_skills}, and ask if they have "
            "experience with them or are willing to learn. Keep it under 100 words."
        )
        
        chain = prompt | llm
        
        for c in state["processed_candidates"]:
            matched = ", ".join(c.get("matchedSkills", [])) or "your background"
            missing = ", ".join(c.get("missingSkills", [])) or "some specific tools"
            name = c.get("jobTitle", "Candidate") # jobTitle holds candidate_name in match_job_to_cvs
            
            # Using invoke directly for simplicity, could be batched
            res = await chain.ainvoke({
                "name": name,
                "matched_skills": matched,
                "missing_skills": missing
            })
            c["outreach_email"] = res.content
            
    except Exception as e:
        log.error(f"Error drafting outreach emails: {e}")
        for c in state["processed_candidates"]:
            c["outreach_email"] = "Could not generate email due to an AI error."
            
    return state

async def compile_report_node(state: AgentState) -> AgentState:
    log.info("compile_report_node: Finalizing report")
    return state

async def error_node(state: AgentState) -> AgentState:
    log.error(f"error_node: Agent encountered an error: {state.get('error')}")
    return state

# Edges & Routing
def route_after_search(state: AgentState) -> str:
    if state.get("error"):
        return "error_node"
    return "score_candidates_node"

# Build Graph
builder = StateGraph(AgentState)

builder.add_node("fetch_job_node", fetch_job_node)
builder.add_node("search_candidates_node", search_candidates_node)
builder.add_node("score_candidates_node", score_candidates_node)
builder.add_node("draft_outreach_node", draft_outreach_node)
builder.add_node("compile_report_node", compile_report_node)
builder.add_node("error_node", error_node)

builder.set_entry_point("fetch_job_node")
builder.add_edge("fetch_job_node", "search_candidates_node")
builder.add_conditional_edges("search_candidates_node", route_after_search)
builder.add_edge("score_candidates_node", "draft_outreach_node")
builder.add_edge("draft_outreach_node", "compile_report_node")
builder.add_edge("compile_report_node", END)
builder.add_edge("error_node", END)

hiring_agent = builder.compile()

async def run_hiring_agent(job_id: str, top_k: int) -> dict:
    initial_state = {
        "job_id": job_id,
        "top_k": top_k,
        "job_details": {},
        "raw_candidates": [],
        "processed_candidates": [],
        "error": None
    }
    
    final_state = await hiring_agent.ainvoke(initial_state)
    return final_state

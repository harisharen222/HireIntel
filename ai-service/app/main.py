"""TalentMatch AI — FastAPI service entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import embed, match, parse, vector, agent
from app.services import embedder, retrieval
from app.db.pg import db

logging.basicConfig(
    level=get_settings().LOG_LEVEL,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("talentmatch.ai")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("Warming up embedding model...")
    embedder.warmup()
    await db.connect()
    log.info("Ready.")
    yield
    log.info("Shutting down, closing DB pool...")
    await db.disconnect()


app = FastAPI(
    title="TalentMatch AI Service",
    description=(
        "Internal ML service. Handles PDF parsing, sentence-transformer "
        "embeddings, and hybrid-scored matching. Not internet-exposed."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["Health"])
async def health() -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "service": "ai-service",
            "model": get_settings().EMBEDDING_MODEL,
            "dim": get_settings().EMBEDDING_DIM,
        }
    )


app.include_router(parse.router)
app.include_router(embed.router)
app.include_router(match.router)
app.include_router(vector.router)
app.include_router(agent.router)

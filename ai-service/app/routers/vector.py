from typing import Any, Dict, List
from fastapi import APIRouter, Depends

from app.core.security import require_internal_key
from app.db import vector_store
from pydantic import BaseModel

router = APIRouter(prefix="/vectors", tags=["Vectors"], dependencies=[Depends(require_internal_key)])

class UpsertVectorRequest(BaseModel):
    doc_id: str
    vector: List[float]
    metadata: Dict[str, Any]
    collection: str

@router.post("/upsert")
async def upsert_vector(req: UpsertVectorRequest):
    await vector_store.upsert_embedding(req.doc_id, req.vector, req.metadata, req.collection)
    return {"ok": True}

@router.delete("/{collection}/{doc_id}")
async def delete_vector(collection: str, doc_id: str):
    await vector_store.delete_embedding(doc_id, collection)
    return {"ok": True}

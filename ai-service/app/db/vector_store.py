import logging
from typing import Any, Dict, List
import json
from app.db.pg import db

log = logging.getLogger(__name__)

async def upsert_embedding(doc_id: str, vector: List[float], metadata: Dict[str, Any], collection_name: str):
    """Upsert a document containing its ID, vector embedding, and any metadata."""
    # We map collection_name 'cvs' to the cvs table, and 'jobs' to the jobs table.
    # The BFF has already created the row, so we just update the embedding column.
    
    if db.pool is None:
        raise RuntimeError("Postgres pool is not initialized")
        
    table_name = collection_name
    query = f"""
        UPDATE {table_name} 
        SET embedding = $1 
        WHERE id = $2
    """
    
    # We must ensure the vector string is castable or passed as a list, asyncpg+pgvector handles lists correctly.
    async with db.pool.acquire() as con:
        result = await con.execute(query, vector, doc_id)
        if result == "UPDATE 0":
            log.warning(f"Failed to upsert embedding: {doc_id} not found in {table_name}")
        else:
            log.info(f"Upserted embedding for doc_id={doc_id} into {collection_name}")

async def get_embedding(doc_id: str, collection_name: str) -> List[float]:
    """Retrieve an embedding by ID."""
    table_name = collection_name
    query = f"SELECT embedding FROM {table_name} WHERE id = $1"
    
    async with db.pool.acquire() as con:
        row = await con.fetchrow(query, doc_id)
        
    if not row or row["embedding"] is None:
        raise ValueError(f"Embedding not found for doc_id={doc_id} in {collection_name}")
        
    return list(row["embedding"])

async def delete_embedding(doc_id: str, collection_name: str):
    """Delete an embedding by ID. Here we just set it to NULL."""
    table_name = collection_name
    query = f"UPDATE {table_name} SET embedding = NULL WHERE id = $1"
    
    async with db.pool.acquire() as con:
        await con.execute(query, doc_id)
    log.info(f"Deleted embedding for doc_id={doc_id} from {collection_name}")

async def search_similar(query_vector: List[float], top_k: int, collection_name: str, filter: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Search for similar vectors using PostgreSQL pgvector <=> (cosine distance).
    We convert distance to cosine similarity: sim = 1 - distance
    """
    table_name = collection_name
    
    # Construct filter clause if necessary
    where_clause = "WHERE embedding IS NOT NULL"
    args = [query_vector, top_k]
    
    if filter:
        # Simplistic handling of status filter for jobs
        if "status" in filter:
            where_clause += f" AND status = '{filter['status']}'"
            
    query = f"""
        SELECT id, (1 - (embedding <=> $1)) AS score
        FROM {table_name}
        {where_clause}
        ORDER BY embedding <=> $1
        LIMIT $2
    """
    
    async with db.pool.acquire() as con:
        rows = await con.fetch(query, *args)
        
    results = []
    for r in rows:
        results.append({
            "doc_id": str(r["id"]),
            "score": float(r["score"])
        })
        
    return results

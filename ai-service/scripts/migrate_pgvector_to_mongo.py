import asyncio
import logging
import os
import sys

# Ensure app imports work from project root
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ai-service"))

import asyncpg
from app.core.config import get_settings
from app.db import mongo, vector_store

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("migrate")

async def migrate():
    settings = get_settings()
    
    log.info("Connecting to Postgres...")
    pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    
    log.info("Connecting to MongoDB Atlas...")
    await mongo.connect_to_mongo()

    async with pool.acquire() as con:
        # Migrate CVs
        log.info("Migrating CV embeddings...")
        cv_rows = await con.fetch("""
            SELECT id, embedding::text AS embedding_text 
            FROM cvs 
            WHERE embedding IS NOT NULL
        """)
        for row in cv_rows:
            cv_id = row["id"]
            emb_text = row["embedding_text"]
            vector = [float(x) for x in emb_text.strip("[]").split(",")]
            await vector_store.upsert_embedding(cv_id, vector, {}, "cvs")
            
        # Migrate Jobs
        log.info("Migrating Job embeddings...")
        job_rows = await con.fetch("""
            SELECT id, embedding::text AS embedding_text 
            FROM jobs 
            WHERE embedding IS NOT NULL
        """)
        for row in job_rows:
            job_id = row["id"]
            emb_text = row["embedding_text"]
            vector = [float(x) for x in emb_text.strip("[]").split(",")]
            await vector_store.upsert_embedding(job_id, vector, {}, "jobs")

    log.info("Migration complete.")
    await pool.close()
    await mongo.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(migrate())

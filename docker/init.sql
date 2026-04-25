-- TalentMatch AI — Postgres initialization
-- Runs once on first boot of the Postgres container.
-- Prisma migrations handle schema; this file handles extensions and
-- the HNSW indexes that Prisma cannot express natively.

CREATE EXTENSION IF NOT EXISTS vector;

-- The vector columns themselves are created by Prisma (Unsupported("vector(384)")).
-- After `prisma migrate deploy` runs, apply these indexes. In Docker Compose this
-- file runs BEFORE migrations, so the index creation is idempotent and the
-- migration step is responsible for creating the tables.

-- Helper: only create the index if the table and column already exist.
-- Used when the stack is restarted with a populated DB.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cvs' AND column_name = 'embedding'
    ) THEN
        CREATE INDEX IF NOT EXISTS cvs_embedding_hnsw
        ON cvs USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'embedding'
    ) THEN
        CREATE INDEX IF NOT EXISTS jobs_embedding_hnsw
        ON jobs USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    END IF;
END $$;

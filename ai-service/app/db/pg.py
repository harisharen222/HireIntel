import asyncpg
from pgvector.asyncpg import register_vector
import logging
from app.core.config import get_settings

log = logging.getLogger(__name__)

class PostgresConnection:
    def __init__(self):
        self.pool = None

    async def connect(self):
        settings = get_settings()
        dsn = settings.DATABASE_URL
        # Remove dialect part from postgresql:// for asyncpg if it has something like postgresql+asyncpg://
        if dsn.startswith("postgresql+"):
            dsn = "postgresql://" + dsn.split("://", 1)[1]
        
        log.info("Connecting to PostgreSQL database pool...")
        try:
            self.pool = await asyncpg.create_pool(
                dsn,
                min_size=1,
                max_size=10,
                command_timeout=60,
                setup=self.setup_connection
            )
            log.info("Successfully connected to PostgreSQL database pool.")
        except Exception as e:
            log.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    async def setup_connection(self, conn: asyncpg.Connection):
        await register_vector(conn)

    async def disconnect(self):
        if self.pool:
            log.info("Closing PostgreSQL database pool...")
            await self.pool.close()

db = PostgresConnection()

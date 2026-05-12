"""PostgreSQL database layer (Supabase) — replaces the old SQLite backend."""
import asyncpg
import os
import logging

logger = logging.getLogger("launchpad")

PG_HOST = os.getenv("PG_HOST", "10.0.0.179")
PG_PORT = int(os.getenv("PG_PORT", "5432"))
PG_USER = os.getenv("PG_USER", "supabase_admin")
PG_PASS = os.getenv("PG_PASS", "30e7c300099aa41391b43b33ea4a4ded")
PG_DB = os.getenv("PG_DB", "postgres")

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Return the shared asyncpg connection pool (lazy-init)."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASS,
            database=PG_DB,
            min_size=2,
            max_size=10,
        )
        logger.info("PostgreSQL pool created (min=2, max=10)")
    return _pool


async def close_pool() -> None:
    """Shut down the pool (called on app shutdown)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")

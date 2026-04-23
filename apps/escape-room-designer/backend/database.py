import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "/app/data/escape_rooms.db")

async def get_db():
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    await conn.execute("PRAGMA journal_mode = WAL")
    return conn

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = await get_db()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            theme TEXT NOT NULL,
            age_group TEXT,
            difficulty TEXT,
            duration TEXT,
            plan_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id)
    """)
    await conn.commit()
    await conn.close()

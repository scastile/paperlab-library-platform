import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "/app/data/event_plans.db")

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
        CREATE TABLE IF NOT EXISTS event_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'Program',
            date TEXT DEFAULT '',
            time TEXT DEFAULT '',
            duration TEXT DEFAULT '60',
            room TEXT DEFAULT '',
            capacity TEXT DEFAULT '',
            audience TEXT DEFAULT 'All Ages',
            description TEXT DEFAULT '',
            checklist TEXT DEFAULT '[]',
            estimated_cost REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_event_plans_user_id ON event_plans(user_id)
    """)
    await conn.commit()
    await conn.close()

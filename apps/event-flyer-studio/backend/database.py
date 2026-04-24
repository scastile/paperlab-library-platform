import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "/app/data/flyers.db")

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS flyers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                event_name TEXT NOT NULL,
                event_description TEXT,
                theme TEXT,
                audience TEXT,
                vibe TEXT,
                date TEXT,
                time TEXT,
                timezone TEXT,
                location TEXT,
                website TEXT,
                layout TEXT DEFAULT 'poster',
                include_image INTEGER DEFAULT 1,
                headline TEXT,
                body_text TEXT,
                cta_text TEXT,
                image_url TEXT,
                png_data BLOB,
                pdf_data BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Graceful migration: add timezone if table exists without it
        cursor = await db.execute("PRAGMA table_info(flyers)")
        cols = [row[1] for row in await cursor.fetchall()]
        if 'timezone' not in cols:
            await db.execute("ALTER TABLE flyers ADD COLUMN timezone TEXT")
        await db.commit()

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys=ON")
    return db

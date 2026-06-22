"""SQLite database layer (aiosqlite) — replaces the old PostgreSQL backend."""
import aiosqlite
import os
import logging

logger = logging.getLogger("launchpad")

DB_PATH = os.getenv("DB_PATH", "/app/data/launchpad.db")


async def get_db():
    """Return a new aiosqlite connection (callers must close)."""
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    await conn.execute("PRAGMA journal_mode = WAL")
    return conn


async def init_db():
    """Create tables if they don't exist, then close the connection."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = await get_db()
    await conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            credits INTEGER DEFAULT 10,
            has_received_free_credits INTEGER DEFAULT 1,
            last_credit_reset TEXT,
            escape_rooms_used_monthly INTEGER DEFAULT 0,
            subscription_tier TEXT DEFAULT 'free',
            stripe_customer_id TEXT,
            stripe_price_id TEXT,
            stripe_subscription_id TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS credit_packs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            credits_purchased INTEGER,
            credits_remaining INTEGER,
            purchase_type TEXT,
            status TEXT DEFAULT 'active',
            expires_at TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS credit_usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action_type TEXT,
            credits_spent INTEGER,
            campaign_id INTEGER,
            app TEXT,
            product TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            topic TEXT,
            image_url TEXT,
            target_audience TEXT,
            budget TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            card_type TEXT,
            content TEXT,
            pinned INTEGER DEFAULT 0,
            position INTEGER,
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS media_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            title TEXT,
            author TEXT,
            media_type TEXT,
            cover_url TEXT,
            openlibrary_key TEXT,
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS relevant_dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            date TEXT,
            reason TEXT,
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cross_media_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            title TEXT,
            year INTEGER,
            author TEXT,
            connection TEXT,
            cover_url TEXT,
            openlibrary_key TEXT,
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS escape_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            user_id TEXT,
            topic TEXT,
            plan_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    await conn.commit()
    await conn.close()
    logger.info("SQLite database initialized at %s", DB_PATH)

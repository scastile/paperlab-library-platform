import aiosqlite
import os
import logging
from datetime import date

logger = logging.getLogger("launchpad")

DB_PATH = os.getenv("DB_PATH", "launchpad.db")

# Track applied migrations to avoid re-applying
_applied_migrations = set()


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    # Enable WAL mode for better concurrent read/write performance
    await db.execute("PRAGMA journal_mode=WAL")
    # Enable foreign keys (needed for ON DELETE CASCADE to work)
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'anonymous',
                topic TEXT NOT NULL,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migration: add user_id if table exists without it
        cursor = await db.execute("PRAGMA table_info(campaigns)")
        columns = [row[1] for row in await cursor.fetchall()]
        if 'user_id' not in columns:
            await db.execute("ALTER TABLE campaigns ADD COLUMN user_id TEXT NOT NULL DEFAULT 'anonymous'")
            await db.commit()

        # Migration: add target_audience and budget columns
        if 'target_audience' not in columns:
            await db.execute("ALTER TABLE campaigns ADD COLUMN target_audience TEXT DEFAULT 'All Ages'")
            await db.commit()
        if 'budget' not in columns:
            await db.execute("ALTER TABLE campaigns ADD COLUMN budget TEXT DEFAULT '$50 — Small Event'")
            await db.commit()

        # Migration: add expires_at to credit_packs
        cursor = await db.execute("PRAGMA table_info(credit_packs)")
        pack_columns = [row[1] for row in await cursor.fetchall()]
        if 'expires_at' not in pack_columns:
            await db.execute("ALTER TABLE credit_packs ADD COLUMN expires_at DATE")
            await db.commit()

        # Migration: add app/product to credit_usage_log
        cursor = await db.execute("PRAGMA table_info(credit_usage_log)")
        log_columns = [row[1] for row in await cursor.fetchall()]
        if 'app' not in log_columns:
            await db.execute("ALTER TABLE credit_usage_log ADD COLUMN app TEXT DEFAULT 'launchpad'")
            await db.commit()
        if 'product' not in log_columns:
            await db.execute("ALTER TABLE credit_usage_log ADD COLUMN product TEXT DEFAULT 'launchpad'")
            await db.commit()

        # Migration: add stripe_price_id to users
        cursor = await db.execute("PRAGMA table_info(users)")
        user_columns = [row[1] for row in await cursor.fetchall()]
        if 'stripe_price_id' not in user_columns:
            await db.execute("ALTER TABLE users ADD COLUMN stripe_price_id TEXT")
            await db.commit()

        await db.executescript("""

            CREATE TABLE IF NOT EXISTS media_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                author TEXT,
                media_type TEXT,
                cover_url TEXT,
                openlibrary_key TEXT,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                card_type TEXT NOT NULL,
                content TEXT NOT NULL,
                pinned INTEGER DEFAULT 0,
                position INTEGER DEFAULT 0,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,          -- Supabase user_id
                credits INTEGER DEFAULT 0,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                stripe_price_id TEXT,
                subscription_tier TEXT DEFAULT 'free',  -- 'free' | 'creator' | 'pro' | 'institution'
                credits_used_this_month INTEGER DEFAULT 0,
                escape_rooms_used_monthly INTEGER DEFAULT 0,
                last_credit_reset DATE,
                has_received_free_credits INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS credit_packs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                stripe_payment_intent_id TEXT,
                credits_purchased INTEGER NOT NULL,
                credits_remaining INTEGER NOT NULL,
                amount_paid_cents INTEGER NOT NULL,
                purchase_type TEXT DEFAULT 'pack',  -- 'pack' | 'subscription'
                status TEXT DEFAULT 'active',  -- 'active' | 'consumed' | 'refunded'
                expires_at DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS escape_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                plan_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS credit_usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action_type TEXT NOT NULL,  -- 'generate' | 'reroll' | 'reroll_all' | 'escape_plan'
                credits_spent INTEGER NOT NULL,
                campaign_id INTEGER,
                app TEXT DEFAULT 'launchpad',
                product TEXT DEFAULT 'launchpad',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS relevant_dates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                reason TEXT,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cross_media_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                year INTEGER,
                author TEXT,
                connection TEXT,
                cover_url TEXT,
                openlibrary_key TEXT,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            );
        """)
        await db.commit()

        # Create indexes (IF NOT EXISTS is safe to re-run)
        await db.executescript("""
            CREATE INDEX IF NOT EXISTS idx_cards_campaign_id ON cards(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_media_campaign_id ON media_results(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_escape_plans_campaign_id ON escape_plans(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_escape_plans_user_id ON escape_plans(user_id);
            CREATE INDEX IF NOT EXISTS idx_relevant_dates_campaign_id ON relevant_dates(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_cross_media_campaign_id ON cross_media_connections(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
            CREATE INDEX IF NOT EXISTS idx_credit_packs_user_id ON credit_packs(user_id);
            CREATE INDEX IF NOT EXISTS idx_credit_packs_status ON credit_packs(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON credit_usage_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_credit_usage_app ON credit_usage_log(user_id, app);
            CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
            CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
            CREATE INDEX IF NOT EXISTS idx_users_stripe_price ON users(stripe_price_id);
        """)
        await db.commit()

        logger.info("Database initialized with indexes and WAL mode")
    finally:
        await db.close()

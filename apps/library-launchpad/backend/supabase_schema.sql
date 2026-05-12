-- Supabase PostgreSQL schema for Library Launchpad
-- Run via Supabase SQL Editor or psql

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,
    target_audience TEXT DEFAULT 'All Ages',
    budget TEXT DEFAULT '$50 — Small Event',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

CREATE TABLE IF NOT EXISTS media_results (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    media_type TEXT,
    cover_url TEXT,
    openlibrary_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_campaign_id ON media_results(campaign_id);

CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL,
    content JSONB NOT NULL,
    pinned INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cards_campaign_id ON cards(campaign_id);

CREATE TABLE IF NOT EXISTS relevant_dates (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_relevant_dates_campaign_id ON relevant_dates(campaign_id);

CREATE TABLE IF NOT EXISTS cross_media_connections (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    year INTEGER,
    author TEXT,
    connection TEXT,
    cover_url TEXT,
    openlibrary_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_cross_media_campaign_id ON cross_media_connections(campaign_id);

CREATE TABLE IF NOT EXISTS escape_plans (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    plan_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_escape_plans_campaign_id ON escape_plans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_escape_plans_user_id ON escape_plans(user_id);

-- Users table mirrors Supabase auth.users(id)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    credits INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    credits_used_this_month INTEGER DEFAULT 0,
    escape_rooms_used_monthly INTEGER DEFAULT 0,
    last_credit_reset DATE,
    has_received_free_credits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_price ON users(stripe_price_id);

CREATE TABLE IF NOT EXISTS credit_packs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    stripe_payment_intent_id TEXT,
    credits_purchased INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    amount_paid_cents INTEGER NOT NULL,
    purchase_type TEXT DEFAULT 'pack',
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_packs_user_id ON credit_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_packs_status ON credit_packs(user_id, status);

CREATE TABLE IF NOT EXISTS credit_usage_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    credits_spent INTEGER NOT NULL,
    campaign_id INTEGER,
    app TEXT DEFAULT 'launchpad',
    product TEXT DEFAULT 'launchpad',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_app ON credit_usage_log(user_id, app);

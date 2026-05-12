"""Credit system — Supabase PostgreSQL backend."""
from database import get_pool
from datetime import date
import json
import logging

logger = logging.getLogger("launchpad")

CREDIT_COSTS = {
    "generate": 5,
    "reroll": 1,
    "reroll_all": 1,
    "escape_plan": 8,
    "escape_room_generate": 10,
    "flyer_generate": 6,
    "flyer_generate_with_image": 10,
    "flyer_regenerate": 2,
    "pdf_standard": 1,
    "pdf_ocr": 2,
    "pdf_bulk": 3,
}
TIER_MONTHLY_CREDITS = {"free": 0, "creator": 60, "pro": 150, "institution": 400}
PACK_EXPIRATION_DAYS = 90
PRO_ROLLOVER_CAP_MONTHS = 2
PRO_FREE_ESCAPE_ROOMS = 5


async def get_or_create_user(user_id: str) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if row:
            return dict(row)

        await conn.execute(
            """INSERT INTO users (id, credits, has_received_free_credits,
               last_credit_reset, escape_rooms_used_monthly)
               VALUES ($1, 10, 1, $2, 0)""",
            user_id, date.today().isoformat(),
        )
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(row)


async def get_credit_balance(user_id: str) -> dict:
    user = await get_or_create_user(user_id)
    await ensure_monthly_reset(user_id)

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        user = dict(row) if row else await get_or_create_user(user_id)

        pack_row = await conn.fetchrow(
            """SELECT COALESCE(SUM(credits_remaining), 0) AS pack_credits
               FROM credit_packs WHERE user_id = $1 AND status = 'active'
               AND (expires_at IS NULL OR expires_at > now())""",
            user_id,
        )
        pack_credits = pack_row["pack_credits"]

        tier = user["subscription_tier"]
        monthly_allocation = TIER_MONTHLY_CREDITS.get(tier, 0)
        monthly_used = user.get("credits_used_this_month") or 0
        monthly_remaining = max(0, monthly_allocation - monthly_used)
        total_available = pack_credits + monthly_remaining + (user.get("credits") or 0)

        er_used = user.get("escape_rooms_used_monthly") or 0
        er_free_rem = max(0, PRO_FREE_ESCAPE_ROOMS - er_used) if tier == "pro" else 0

        return {
            "user_id": user_id,
            "tier": tier,
            "pack_credits": pack_credits,
            "monthly_allocation": monthly_allocation,
            "monthly_used": max(0, monthly_used),
            "monthly_remaining": monthly_remaining,
            "free_credits": 0,
            "total_available": total_available,
            "stripe_customer_id": user.get("stripe_customer_id"),
            "stripe_subscription_id": user.get("stripe_subscription_id"),
            "escape_rooms_free_remaining": er_free_rem,
            "escape_rooms_free_total": PRO_FREE_ESCAPE_ROOMS if tier == "pro" else 0,
        }


async def ensure_monthly_reset(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT last_credit_reset, subscription_tier FROM users WHERE id = $1",
            user_id,
        )
        if not row:
            return
        last_reset = row["last_credit_reset"]
        tier = row["subscription_tier"]
        if not last_reset:
            return
        lr = date.fromisoformat(str(last_reset))
        today = date.today()
        if lr.month != today.month or lr.year != today.year:
            if tier in ("pro", "institution"):
                row2 = await conn.fetchrow(
                    "SELECT credits_used_this_month FROM users WHERE id = $1", user_id
                )
                old_used = row2["credits_used_this_month"] or 0
                alloc = TIER_MONTHLY_CREDITS.get(tier, 0)
                rollover = min(max(0, alloc - old_used), alloc * PRO_ROLLOVER_CAP_MONTHS)
                await conn.execute(
                    """UPDATE users SET credits_used_this_month = $1,
                       escape_rooms_used_monthly = 0, last_credit_reset = $2 WHERE id = $3""",
                    -rollover, today.isoformat(), user_id,
                )
            else:
                await conn.execute(
                    """UPDATE users SET credits_used_this_month = 0,
                       escape_rooms_used_monthly = 0, last_credit_reset = $1 WHERE id = $2""",
                    today.isoformat(), user_id,
                )
            await conn.execute("")  # commit via acquire context


async def can_use_action(user_id, action, cost_override=None, app="launchpad", product="launchpad"):
    if action not in CREDIT_COSTS:
        return False, f"Unknown action: {action}", 0
    cost = cost_override if cost_override is not None else CREDIT_COSTS[action]
    balance = await get_credit_balance(user_id)
    if action in ("escape_plan", "escape_room_generate") and balance["tier"] == "pro" and balance["escape_rooms_free_remaining"] > 0:
        return True, "Pro free escape room", balance["total_available"]
    current = balance["total_available"]
    if current >= cost:
        return True, "", current
    return False, f"Insufficient credits (need {cost}, have {current})", current


async def deduct_credits(user_id, action, campaign_id=None, cost_override=None, app="launchpad", product="launchpad"):
    if action not in CREDIT_COSTS:
        return False, f"Unknown action: {action}"

    balance = await get_credit_balance(user_id)
    if action in ("escape_plan", "escape_room_generate") and balance["tier"] == "pro" and balance["escape_rooms_free_remaining"] > 0:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                r = await conn.execute(
                    """UPDATE users SET escape_rooms_used_monthly = escape_rooms_used_monthly + 1
                       WHERE id = $1 AND escape_rooms_used_monthly < $2""",
                    user_id, PRO_FREE_ESCAPE_ROOMS,
                )
                if r == "UPDATE 0":
                    return False, "Pro escape room limit reached"
                await log_usage(user_id, action, 0, campaign_id, app, product)
            return True, ""

    cost = cost_override if cost_override is not None else CREDIT_COSTS[action]
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            user_row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            if not user_row:
                return False, "User not found"
            user = dict(user_row)
            tier = user["subscription_tier"]
            monthly_allocation = TIER_MONTHLY_CREDITS.get(tier, 0)
            monthly_used = user.get("credits_used_this_month") or 0
            monthly_remaining = max(0, monthly_allocation - monthly_used)

            pack_row = await conn.fetchrow(
                """SELECT COALESCE(SUM(credits_remaining), 0) AS pack_credits
                   FROM credit_packs WHERE user_id = $1 AND status = 'active'""",
                user_id,
            )
            pack_credits = pack_row["pack_credits"]
            total_available = pack_credits + monthly_remaining + (user.get("credits") or 0)
            if total_available < cost:
                return False, f"Insufficient credits (need {cost}, have {total_available})"

            remaining_cost = cost
            free_credits = user.get("credits") or 0
            if free_credits > 0:
                u = min(free_credits, remaining_cost)
                await conn.execute("UPDATE users SET credits = credits - $1 WHERE id = $2", u, user_id)
                remaining_cost -= u

            if monthly_remaining > 0:
                u = min(monthly_remaining, remaining_cost)
                await conn.execute(
                    "UPDATE users SET credits_used_this_month = credits_used_this_month + $1 WHERE id = $2",
                    u, user_id,
                )
                remaining_cost -= u

            if remaining_cost > 0 and pack_credits > 0:
                packs = await conn.fetch(
                    """SELECT id, credits_remaining FROM credit_packs
                       WHERE user_id = $1 AND status = 'active' AND credits_remaining > 0
                       ORDER BY created_at ASC""",
                    user_id,
                )
                for pack in packs:
                    if remaining_cost <= 0:
                        break
                    u = min(pack["credits_remaining"], remaining_cost)
                    await conn.execute(
                        "UPDATE credit_packs SET credits_remaining = credits_remaining - $1 WHERE id = $2",
                        u, pack["id"],
                    )
                    remaining_cost -= u
                await conn.execute(
                    "UPDATE credit_packs SET status = 'consumed' WHERE user_id = $1 AND credits_remaining <= 0 AND status = 'active'",
                    user_id,
                )
            await log_usage(user_id, action, cost, campaign_id, app, product)
        return True, ""


async def log_usage(user_id, action_type, credits_spent, campaign_id=None, app="launchpad", product="launchpad"):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO credit_usage_log (user_id, action_type, credits_spent,
               campaign_id, app, product) VALUES ($1, $2, $3, $4, $5, $6)""",
            user_id, action_type, credits_spent, campaign_id, app, product,
        )


async def add_credits_to_user(user_id, credits, purchase_type="pack"):
    from datetime import timedelta
    pool = await get_pool()
    async with pool.acquire() as conn:
        expires_at = date.today() + timedelta(days=PACK_EXPIRATION_DAYS)
        await conn.execute(
            """INSERT INTO credit_packs (user_id, credits_purchased, credits_remaining,
               purchase_type, status, expires_at) VALUES ($1, $2, $3, $4, 'active', $5)""",
            user_id, credits, credits, purchase_type, expires_at.isoformat(),
        )


async def set_user_subscription(user_id, tier, stripe_subscription_id=None, stripe_price_id=None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE users SET subscription_tier = $1, stripe_subscription_id = $2,
               stripe_price_id = $3, updated_at = now() WHERE id = $4""",
            tier, stripe_subscription_id, stripe_price_id, user_id,
        )

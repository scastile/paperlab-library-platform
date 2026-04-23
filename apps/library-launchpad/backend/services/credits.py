from database import get_db
from datetime import date
import json
import logging

logger = logging.getLogger("launchpad")

# Credit costs per action
CREDIT_COSTS = {
    # Launchpad
    "generate": 5,
    "reroll": 1,
    "reroll_all": 1,  # per card (cost_override used for actual count)
    "escape_plan": 8,
    # Escape Room Designer
    "escape_room_generate": 10,
    # Flyer Studio
    "flyer_generate": 6,
    "flyer_generate_with_image": 10,
    # LibPDF
    "pdf_standard": 1,
    "pdf_ocr": 2,
    "pdf_bulk": 3,
}

# Monthly credit allocation by tier
TIER_MONTHLY_CREDITS = {
    "free": 0,
    "creator": 60,
    "pro": 150,
    "institution": 400,
}

# Pack credit expiration in days
PACK_EXPIRATION_DAYS = 90

# Pro rollover cap (months of credits that can roll over)
PRO_ROLLOVER_CAP_MONTHS = 2

# Pro users get 5 free escape rooms per month
PRO_FREE_ESCAPE_ROOMS = 5


async def get_or_create_user(user_id: str) -> dict:
    """Get or create a user record."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        
        if row:
            return dict(row)
        
        # Create new user with 10 free credits
        await db.execute(
            """INSERT INTO users (id, credits, has_received_free_credits, last_credit_reset, escape_rooms_used_monthly)
               VALUES (?, 10, 1, ?, 0)""",
            (user_id, date.today().isoformat())
        )
        await db.commit()
        
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


async def get_credit_balance(user_id: str) -> dict:
    """Get user's full credit status."""
    user = await get_or_create_user(user_id)
    
    # Check if we need monthly reset
    await ensure_monthly_reset(user_id)
    
    # Re-fetch after potential reset
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            user = await get_or_create_user(user_id)
        else:
            user = dict(row)
    finally:
        await db.close()
    
    db = await get_db()
    try:
        # Get pack credits (active, not expired)
        cursor = await db.execute(
            """SELECT COALESCE(SUM(credits_remaining), 0) as pack_credits 
               FROM credit_packs WHERE user_id = ? AND status = 'active'
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)""",
            (user_id,)
        )
        pack_row = await cursor.fetchone()
        pack_credits = pack_row["pack_credits"] if pack_row else 0
        
        # Calculate monthly credits
        tier = user["subscription_tier"]
        monthly_allocation = TIER_MONTHLY_CREDITS.get(tier, 0)
        monthly_used = user.get("credits_used_this_month", 0)
        # credits_used_this_month can be negative (pro rollover), so remaining = allocation - used
        monthly_remaining = max(0, monthly_allocation - monthly_used)
        
        # Free credits — always 0 since we grant them on creation now
        free_credits = 0
        
        total_available = pack_credits + monthly_remaining + user.get("credits", 0)
        
        # Escape room tracking for pro
        escape_rooms_used = user.get("escape_rooms_used_monthly", 0) if tier == "pro" else 0
        escape_rooms_remaining = max(0, PRO_FREE_ESCAPE_ROOMS - escape_rooms_used) if tier == "pro" else 0
        
        return {
            "user_id": user_id,
            "tier": tier,
            "pack_credits": pack_credits,
            "monthly_allocation": monthly_allocation,
            "monthly_used": max(0, monthly_used),
            "monthly_remaining": monthly_remaining,
            "free_credits": free_credits,
            "total_available": total_available,
            "stripe_customer_id": user.get("stripe_customer_id"),
            "stripe_subscription_id": user.get("stripe_subscription_id"),
            "escape_rooms_free_remaining": escape_rooms_remaining,
            "escape_rooms_free_total": PRO_FREE_ESCAPE_ROOMS if tier == "pro" else 0,
        }
    finally:
        await db.close()


async def ensure_monthly_reset(user_id: str):
    """Reset monthly credits if it's a new month. Pro users get rollover."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT last_credit_reset, subscription_tier FROM users WHERE id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return
        
        last_reset = row["last_credit_reset"]
        tier = row["subscription_tier"]
        
        if last_reset:
            last_reset_date = date.fromisoformat(last_reset)
            today = date.today()
            
            # Reset if new month
            if last_reset_date.month != today.month or last_reset_date.year != today.year:
                if tier == "pro":
                    # Pro rollover: keep unused credits as negative credit_used
                    # This makes monthly_remaining = allocation - (-rollover) = allocation + rollover
                    cursor2 = await db.execute("SELECT credits_used_this_month FROM users WHERE id = ?", (user_id,))
                    r = await cursor2.fetchone()
                    old_used = r[0] if r and r[0] else 0
                    old_allocation = TIER_MONTHLY_CREDITS.get("pro", 100)
                    rollover = max(0, old_allocation - old_used)
                    # Cap rollover at 2 months worth
                    rollover_cap = old_allocation * PRO_ROLLOVER_CAP_MONTHS
                    rollover = min(rollover, rollover_cap)
                    # Set credits_used to negative rollover so remaining = 100 + rollover
                    await db.execute(
                        "UPDATE users SET credits_used_this_month = ?, escape_rooms_used_monthly = 0, last_credit_reset = ? WHERE id = ?",
                        (-rollover, today.isoformat(), user_id)
                    )
                elif tier == "premium":
                    # Premium rollover (same cap logic)
                    cursor2 = await db.execute("SELECT credits_used_this_month FROM users WHERE id = ?", (user_id,))
                    r = await cursor2.fetchone()
                    old_used = r[0] if r and r[0] else 0
                    old_allocation = TIER_MONTHLY_CREDITS.get("premium", 200)
                    rollover = max(0, old_allocation - old_used)
                    rollover_cap = old_allocation * PRO_ROLLOVER_CAP_MONTHS
                    rollover = min(rollover, rollover_cap)
                    await db.execute(
                        "UPDATE users SET credits_used_this_month = ?, escape_rooms_used_monthly = 0, last_credit_reset = ? WHERE id = ?",
                        (-rollover, today.isoformat(), user_id)
                    )
                else:
                    # Non-pro: reset normally
                    await db.execute(
                        "UPDATE users SET credits_used_this_month = 0, escape_rooms_used_monthly = 0, last_credit_reset = ? WHERE id = ?",
                        (today.isoformat(), user_id)
                    )
                await db.commit()
    finally:
        await db.close()


async def can_use_action(user_id: str, action: str, cost_override: int = None, app: str = "launchpad", product: str = "launchpad") -> tuple[bool, str, int]:
    """Check if user can perform an action. Returns (allowed, reason, current_credits)."""
    if action not in CREDIT_COSTS:
        return False, f"Unknown action: {action}", 0

    cost = cost_override if cost_override is not None else CREDIT_COSTS[action]
    balance = await get_credit_balance(user_id)
    
    # Pro users get 5 free escape rooms per month (escape_plan action in launchpad or escape_room_generate in escape room)
    if action in ("escape_plan", "escape_room_generate") and balance["tier"] == "pro":
        if balance["escape_rooms_free_remaining"] > 0:
            return True, "Pro free escape room", balance["total_available"]
    
    current = balance["total_available"]
    if current >= cost:
        return True, "", current
    
    return False, f"Insufficient credits (need {cost}, have {current})", current


async def deduct_credits(user_id: str, action: str, campaign_id: int = None, cost_override: int = None, app: str = "launchpad", product: str = "launchpad") -> tuple[bool, str]:
    """Deduct credits for an action atomically. Returns (success, error_message)."""
    if action not in CREDIT_COSTS:
        return False, f"Unknown action: {action}"

    # Check Pro free escape rooms first (before acquiring DB lock)
    balance = await get_credit_balance(user_id)
    if action in ("escape_plan", "escape_room_generate") and balance["tier"] == "pro" and balance["escape_rooms_free_remaining"] > 0:
        # Track escape room usage instead of deducting credits
        db = await get_db()
        try:
            # Atomic increment with check to prevent race
            await db.execute(
                """UPDATE users SET escape_rooms_used_monthly = escape_rooms_used_monthly + 1
                   WHERE id = ? AND escape_rooms_used_monthly < ?""",
                (user_id, PRO_FREE_ESCAPE_ROOMS)
            )
            await db.commit()
            await log_usage(user_id, action, 0, campaign_id, app, product)
            return True, ""
        finally:
            await db.close()

    cost = cost_override if cost_override is not None else CREDIT_COSTS[action]
    
    # Single atomic transaction for the entire deduction
    db = await get_db()
    try:
        # Re-check balance inside the transaction for atomicity
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = await cursor.fetchone()
        if not user_row:
            return False, "User not found"
        user = dict(user_row)

        # Recalculate available inside transaction
        tier = user["subscription_tier"]
        monthly_allocation = TIER_MONTHLY_CREDITS.get(tier, 0)
        monthly_used = user.get("credits_used_this_month", 0)
        monthly_remaining = max(0, monthly_allocation - monthly_used)

        cursor = await db.execute(
            """SELECT COALESCE(SUM(credits_remaining), 0) as pack_credits 
               FROM credit_packs WHERE user_id = ? AND status = 'active'""",
            (user_id,)
        )
        pack_row = await cursor.fetchone()
        pack_credits = pack_row["pack_credits"] if pack_row else 0

        total_available = pack_credits + monthly_remaining + user.get("credits", 0)
        if total_available < cost:
            return False, f"Insufficient credits (need {cost}, have {total_available})"

        # Deduct from: free credits first, then monthly, then packs
        remaining_cost = cost
        
        # Use free credits first
        free_credits = user.get("credits", 0)
        if free_credits > 0:
            use_from_free = min(free_credits, remaining_cost)
            await db.execute(
                "UPDATE users SET credits = credits - ? WHERE id = ?",
                (use_from_free, user_id)
            )
            remaining_cost -= use_from_free
        
        # Use monthly first
        if monthly_remaining > 0:
            use_from_monthly = min(monthly_remaining, remaining_cost)
            await db.execute(
                "UPDATE users SET credits_used_this_month = credits_used_this_month + ? WHERE id = ?",
                (use_from_monthly, user_id)
            )
            remaining_cost -= use_from_monthly
        
        # Then packs (oldest first)
        if remaining_cost > 0 and pack_credits > 0:
            cursor = await db.execute(
                """SELECT id, credits_remaining FROM credit_packs 
                   WHERE user_id = ? AND status = 'active' AND credits_remaining > 0
                   ORDER BY created_at ASC""",
                (user_id,)
            )
            packs = await cursor.fetchall()
            
            for pack in packs:
                if remaining_cost <= 0:
                    break
                use_from_this = min(pack["credits_remaining"], remaining_cost)
                await db.execute(
                    "UPDATE credit_packs SET credits_remaining = credits_remaining - ? WHERE id = ?",
                    (use_from_this, pack["id"])
                )
                remaining_cost -= use_from_this
            
            # Mark empty packs as consumed
            await db.execute(
                """UPDATE credit_packs SET status = 'consumed' 
                   WHERE user_id = ? AND credits_remaining <= 0 AND status = 'active'""",
                (user_id,)
            )
        
        await db.commit()
        
        # Log the usage
        await log_usage(user_id, action, cost, campaign_id, app, product)
        
        return True, ""
    finally:
        await db.close()


async def log_usage(user_id: str, action_type: str, credits_spent: int, campaign_id: int = None, app: str = "launchpad", product: str = "launchpad"):
    """Log credit usage."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO credit_usage_log (user_id, action_type, credits_spent, campaign_id, app, product)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, action_type, credits_spent, campaign_id, app, product)
        )
        await db.commit()
    finally:
        await db.close()


async def add_credits_to_user(user_id: str, credits: int, purchase_type: str = "pack"):
    """Add credits to user's pack balance (for purchases). Pack credits expire after 90 days."""
    from datetime import timedelta
    db = await get_db()
    try:
        expires_at = (date.today() + timedelta(days=PACK_EXPIRATION_DAYS)).isoformat()
        await db.execute(
            """INSERT INTO credit_packs (user_id, credits_purchased, credits_remaining, 
               purchase_type, status, expires_at) VALUES (?, ?, ?, ?, 'active', ?)""",
            (user_id, credits, credits, purchase_type, expires_at)
        )
        await db.commit()
    finally:
        await db.close()


async def set_user_subscription(user_id: str, tier: str, stripe_subscription_id: str = None, stripe_price_id: str = None):
    """Update user's subscription tier."""
    db = await get_db()
    try:
        if stripe_subscription_id and stripe_price_id:
            await db.execute(
                """UPDATE users SET subscription_tier = ?, stripe_subscription_id = ?,
                   stripe_price_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (tier, stripe_subscription_id, stripe_price_id, user_id)
            )
        elif stripe_subscription_id:
            await db.execute(
                """UPDATE users SET subscription_tier = ?, stripe_subscription_id = ?,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (tier, stripe_subscription_id, user_id)
            )
        else:
            await db.execute(
                """UPDATE users SET subscription_tier = ?, stripe_subscription_id = NULL,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (tier, user_id)
            )
        await db.commit()
    finally:
        await db.close()

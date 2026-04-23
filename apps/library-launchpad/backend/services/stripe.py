import stripe
import os
import logging
from fastapi import Request, HTTPException
from services.credits import add_credits_to_user, set_user_subscription

logger = logging.getLogger("launchpad")

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Base URL for redirects
BASE_URL = os.getenv("BASE_URL", "http://localhost:8200")

# Credit pack pricing (in cents) with Stripe price IDs
PACK_PRICES = {
    "small": {"credits": 20, "price_cents": 700, "stripe_price_id": os.getenv("STRIPE_PRICE_PACK_SMALL", "")},
    "medium": {"credits": 50, "price_cents": 1500, "stripe_price_id": os.getenv("STRIPE_PRICE_PACK_MEDIUM", "")},
    "large": {"credits": 120, "price_cents": 3000, "stripe_price_id": os.getenv("STRIPE_PRICE_PACK_LARGE", "")},
}

# Subscription pricing (in cents) with Stripe price IDs
SUBSCRIPTION_PRICES = {
    "creator": {"credits_per_month": 60, "price_cents": 1299, "stripe_price_id": os.getenv("STRIPE_PRICE_CREATOR_MONTHLY", os.getenv("STRIPE_PRICE_BASIC_MONTHLY", ""))},
    "pro": {"credits_per_month": 150, "price_cents": 2499, "stripe_price_id": os.getenv("STRIPE_PRICE_PRO_MONTHLY", "")},
    "institution": {"credits_per_month": 400, "price_cents": 4999, "stripe_price_id": os.getenv("STRIPE_PRICE_INSTITUTION_MONTHLY", os.getenv("STRIPE_PRICE_PREMIUM_MONTHLY", ""))},
}

# Reverse lookup: Stripe price ID → tier
_PRICE_TO_TIER = {}
for _tier, _info in SUBSCRIPTION_PRICES.items():
    _PRICE_TO_TIER[_info["stripe_price_id"]] = _tier


async def create_checkout_session(user_id: str, item: str, return_url: str = "") -> str:
    """Create a Stripe Checkout session for credit pack purchase."""
    if item not in PACK_PRICES:
        raise HTTPException(400, f"Unknown pack: {item}")
    
    pack = PACK_PRICES[item]
    
    # Use provided return URL or fall back to BASE_URL
    base = return_url or BASE_URL
    
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price": pack["stripe_price_id"],
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{base}/credits/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/credits/cancel",
        metadata={
            "user_id": user_id,
            "item": item,
            "credits": str(pack["credits"]),
        },
    )
    
    return session.url


async def create_subscription_checkout(user_id: str, tier: str, return_url: str = "") -> str:
    """Create a Stripe Checkout session for monthly subscription."""
    if tier not in SUBSCRIPTION_PRICES:
        raise HTTPException(400, f"Unknown tier: {tier}")
    
    sub = SUBSCRIPTION_PRICES[tier]
    
    # Use provided return URL or fall back to BASE_URL
    base = return_url or BASE_URL
    
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price": sub["stripe_price_id"],
            "quantity": 1,
        }],
        mode="subscription",
        success_url=f"{base}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/subscription/cancel",
        metadata={
            "user_id": user_id,
            "tier": tier,
        },
    )
    
    return session.url


async def cancel_subscription(stripe_subscription_id: str) -> bool:
    """Cancel a Stripe subscription."""
    try:
        stripe.Subscription.delete(stripe_subscription_id)
        return True
    except stripe.error.StripeError as e:
        logger.error(f"Error cancelling subscription: {e}")
        return False


async def handle_stripe_webhook(request: Request) -> dict:
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(400, "Missing stripe-signature header")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await handle_checkout_complete(session)
    
    elif event["type"] == "customer.subscription.created":
        subscription = event["data"]["object"]
        await handle_subscription_created(subscription)
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_cancelled(subscription)
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(invoice)
    
    return {"status": "received"}


async def handle_checkout_complete(session: dict):
    """Handle completed checkout session."""
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        logger.warning("Checkout completed with no user_id in metadata")
        return
    
    # Verify user exists in our DB before applying changes
    from database import get_db
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            logger.error(f"Checkout complete for unknown user: {user_id}")
            return
    finally:
        await db.close()
    
    # Check if this was a subscription or one-time payment
    if session.get("mode") == "subscription":
        # Subscription checkout - handled by subscription.created webhook
        pass
    else:
        # Credit pack purchase
        credits = session.get("metadata", {}).get("credits")
        if credits:
            await add_credits_to_user(user_id, int(credits), "pack")


async def handle_subscription_created(subscription: dict):
    """Handle new subscription created. Determine tier from Stripe price ID."""
    from database import get_db
    customer_id = subscription.get("customer")
    
    # Determine tier from the subscription's price ID
    tier = "free"
    price_id = ""
    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id", "")
        tier = _PRICE_TO_TIER.get(price_id, "free")
    
    if tier == "free":
        logger.warning(f"Subscription created with unknown price — defaulting to free. Sub ID: {subscription.get('id')}")
    
    # Also check metadata as fallback
    metadata_tier = subscription.get("metadata", {}).get("tier")
    if metadata_tier and metadata_tier in SUBSCRIPTION_PRICES:
        tier = metadata_tier
    
    db = await get_db()
    try:
        # Find user by stripe customer ID or by metadata user_id
        user_id = None
        
        # Try customer_id lookup first
        cursor = await db.execute(
            "SELECT id FROM users WHERE stripe_customer_id = ?",
            (customer_id,)
        )
        row = await cursor.fetchone()
        if row:
            user_id = row["id"]
        else:
            # Fallback: check subscription metadata for user_id
            metadata_user_id = subscription.get("metadata", {}).get("user_id")
            if metadata_user_id:
                cursor = await db.execute(
                    "SELECT id FROM users WHERE id = ?",
                    (metadata_user_id,)
                )
                row = await cursor.fetchone()
                if row:
                    user_id = row["id"]
                    # Also update their customer ID
                    await db.execute(
                        "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
                        (customer_id, user_id)
                    )
                    await db.commit()
        
        if user_id:
            # Store both tier and the specific price ID for allocation lookups
            await set_user_subscription(user_id, tier, subscription.get("id"), price_id)
            logger.info(f"Subscription created: user={user_id}, tier={tier}")
        else:
            logger.error(f"Subscription created but no matching user found. Customer: {customer_id}")
    finally:
        await db.close()


async def handle_subscription_cancelled(subscription: dict):
    """Handle subscription cancellation - downgrade to free."""
    from database import get_db
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM users WHERE stripe_subscription_id = ?",
            (subscription.get("id"),)
        )
        row = await cursor.fetchone()
        if row:
            await set_user_subscription(row["id"], "free", None)
            logger.info(f"Subscription cancelled for user: {row['id']}")
    finally:
        await db.close()


async def handle_payment_failed(invoice: dict):
    """Handle failed payment - log for monitoring."""
    logger.warning(f"Payment failed for invoice: {invoice.get('id')}")


def get_available_packs() -> list[dict]:
    """Return available credit packs."""
    return [
        {"id": key, "credits": val["credits"], "price_cents": val["price_cents"]}
        for key, val in PACK_PRICES.items()
    ]


def get_available_subscriptions() -> list[dict]:
    """Return available subscription tiers."""
    return [
        {"id": key, "credits": val["credits_per_month"], "price_cents": val["price_cents"]}
        for key, val in SUBSCRIPTION_PRICES.items()
    ]

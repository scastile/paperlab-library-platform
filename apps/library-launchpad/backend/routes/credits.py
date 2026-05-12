from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import get_current_user, optional_user
from rate_limit import rate_limiter
from services.credits import get_credit_balance, deduct_credits, can_use_action
from services import stripe as stripe_service

router = APIRouter()


class PurchaseRequest(BaseModel):
    item: str  # 'trial' | 'small' | 'medium' | 'large'


class SubscriptionRequest(BaseModel):
    tier: str  # 'basic' | 'pro'


@router.get("/credits")
async def get_credits(user_id: str = Depends(get_current_user)):
    """Get user's credit balance and subscription status."""
    balance = await get_credit_balance(user_id)
    return balance


@router.get("/credits/balance")
async def get_credits_balance(user_id: str = Depends(optional_user)):
    """Get user's credit balance - works for logged in users only."""
    if not user_id:
        raise HTTPException(401, "Login required")
    balance = await get_credit_balance(user_id)
    return balance


class DeductRequest(BaseModel):
    action: str
    app: str = "launchpad"
    product: str = "launchpad"
    campaign_id: int = None
    cost_override: int = None


@router.post("/credits/deduct")
async def deduct(
    req: DeductRequest,
    user_id: str = Depends(get_current_user)
):
    """Deduct credits for an action. Returns updated balance on success, 402 on failure."""
    ok, msg = await rate_limiter.check(f"user:{user_id}:deduct", max_requests=30, window_seconds=60)
    if not ok:
        raise HTTPException(429, msg)
    success, error = await deduct_credits(
        user_id, req.action, req.campaign_id, req.cost_override, req.app, req.product
    )
    if not success:
        raise HTTPException(402, error)
    balance = await get_credit_balance(user_id)
    return balance


@router.get("/credits/packs")
async def get_credit_packs():
    """Get available credit packs."""
    return {
        "packs": stripe_service.get_available_packs(),
        "subscriptions": stripe_service.get_available_subscriptions(),
    }


class CheckoutRequest(BaseModel):
    pack_id: str
    type: str = "pack"  # 'pack' or 'subscription'
    return_url: str = ""  # URL to return to after checkout


@router.post("/credits/checkout")
async def create_checkout(
    req: CheckoutRequest,
    user_id: str = Depends(get_current_user)
):
    """Create Stripe Checkout session for credit pack or subscription."""
    ok, msg = await rate_limiter.check(f"user:{user_id}:checkout", max_requests=5, window_seconds=60)
    if not ok:
        raise HTTPException(429, msg)
    if req.type == "subscription":
        checkout_url = await stripe_service.create_subscription_checkout(user_id, req.pack_id, req.return_url)
    else:
        checkout_url = await stripe_service.create_checkout_session(user_id, req.pack_id, req.return_url)
    
    if checkout_url:
        return {"url": checkout_url}
    return {"error": "Failed to create checkout session", "url": None}


@router.post("/credits/purchase")
async def purchase_credits(
    req: PurchaseRequest,
    user_id: str = Depends(get_current_user)
):
    """Create Stripe Checkout session for credit pack purchase."""
    checkout_url = await stripe_service.create_checkout_session(user_id, req.item)
    return {"checkout_url": checkout_url}


@router.post("/subscription/checkout")
async def create_subscription(
    req: SubscriptionRequest,
    user_id: str = Depends(get_current_user)
):
    """Create Stripe Checkout session for subscription."""
    checkout_url = await stripe_service.create_subscription_checkout(user_id, req.tier)
    return {"checkout_url": checkout_url}


@router.post("/subscription/cancel")
async def cancel_user_subscription(user_id: str = Depends(get_current_user)):
    """Cancel user's subscription."""
    balance = await get_credit_balance(user_id)
    sub_id = balance.get("stripe_subscription_id")
    
    if not sub_id:
        raise HTTPException(400, "No active subscription")
    
    success = await stripe_service.cancel_subscription(sub_id)
    if success:
        # Update local user record
        from services.credits import set_user_subscription
        await set_user_subscription(user_id, "free", None)
        return {"success": True}
    
    return {"success": False, "error": "Failed to cancel subscription"}


@router.get("/alice")
async def get_alice_demo():
    """Return pre-generated Alice in Wonderland demo campaign."""
    return {
        "campaign_id": "alice-demo",
        "topic": "Alice's Adventures in Wonderland",
        "is_demo": True,
        "media": [
            {
                "title": "Alice's Adventures in Wonderland",
                "author": "Lewis Carroll",
                "media_type": "book",
                "cover_url": "https://covers.openlibrary.org/b/olid/OL5209484M-M.jpg",
                "openlibrary_key": "OL5209484M"
            }
        ],
        "cards": [
            {
                "id": "alice-1",
                "card_type": "book_info",
                "content": {
                    "title": "A Classic Fantasy Adventure",
                    "description": "Follow Alice down the rabbit hole into a world of talking animals, mad hatters, and nonsensical poetry. This beloved tale has enchanted readers since 1865."
                },
                "pinned": True,
                "position": 0
            },
            {
                "id": "alice-2",
                "card_type": "discussion",
                "content": {
                    "question": "What would YOU do?",
                    "prompt": "If you found a door that led to a tiny door and a potion that made you shrink, would you drink it? What might you find on the other side?"
                },
                "pinned": False,
                "position": 1
            },
            {
                "id": "alice-3",
                "card_type": "fun_fact",
                "content": {
                    "fact": "The Mad Hatter's tea party",
                    "detail": "In Victorian England, hat makers were often called 'mad hatters' because they used mercury in hat-making, which caused tremors and hallucinations!"
                },
                "pinned": False,
                "position": 2
            },
            {
                "id": "alice-4",
                "card_type": "activity",
                "content": {
                    "title": "Create Your Own Wonderland",
                    "instructions": "Draw your own version of the Cheshire Cat. What strange creatures might live in your imaginary world? Write a short description of one."
                },
                "pinned": False,
                "position": 3
            },
            {
                "id": "alice-5",
                "card_type": "discussion",
                "content": {
                    "question": "Nonsense or Meaning?",
                    "prompt": "Some people think Carroll's nonsense verse is pure fun, while others see hidden meanings. What do you think 'Jabberwocky' is really about?"
                },
                "pinned": False,
                "position": 4
            },
            {
                "id": "alice-6",
                "card_type": "extension",
                "content": {
                    "title": "Continue the Story",
                    "prompt": "Alice meets a new character who speaks only in riddles. Write a 5-sentence conversation between them."
                },
                "pinned": False,
                "position": 5
            },
            {
                "id": "alice-7",
                "card_type": "fun_fact",
                "content": {
                    "fact": "A Real Alice",
                    "detail": "Alice Liddell, the real girl who inspired the story, was the daughter of the Dean of Christ Church College in Oxford where Carroll lived."
                },
                "pinned": False,
                "position": 6
            },
            {
                "id": "alice-8",
                "card_type": "activity",
                "content": {
                    "title": "Act It Out",
                    "prompt": "Stage the 'Off with their heads!' scene from the Queen's trial. Assign roles and write a short script."
                },
                "pinned": False,
                "position": 7
            }
        ],
        "credits_message": "Sign up to create your own custom campaign!"
    }


@router.post("/check-action")
async def check_action(
    action: str,
    user_id: str = Depends(optional_user)
):
    """Check if user can perform an action. For anon users, always returns blocked."""
    if not user_id:
        return {
            "allowed": False,
            "reason": "login_required",
            "message": "Sign up or log in to use this feature"
        }
    
    allowed, reason, current = await can_use_action(user_id, action)
    
    if not allowed:
        return {
            "allowed": False,
            "reason": "insufficient_credits",
            "message": reason,
            "current_credits": current
        }
    
    return {
        "allowed": True,
        "current_credits": current
    }

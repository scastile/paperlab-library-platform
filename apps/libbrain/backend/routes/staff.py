import os
import time
import hashlib
import hmac
from fastapi import APIRouter, Depends, HTTPException, Header

router = APIRouter()

# Simple staff auth for hackathon demo
STAFF_PASSWORD = os.getenv("STAFF_PASSWORD", "libbrain2026")
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "demo-secret")

# Mutable password (can be changed at runtime)
_current_password = STAFF_PASSWORD

def _make_token(user_id: str) -> str:
    """Simple HMAC-based token for demo purposes."""
    payload = f"{user_id}:{int(time.time())}"
    sig = hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}:{sig}"

def _verify_token(token: str) -> str | None:
    """Verify demo token, return user_id or None."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        user_id, ts, sig = parts
        expected = hmac.new(JWT_SECRET.encode(), f"{user_id}:{ts}".encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return None
        if int(time.time()) - int(ts) > 86400:
            return None
        return user_id
    except Exception:
        return None

@router.post("/login")
async def staff_login(body: dict):
    global _current_password
    password = body.get("password", "")
    if not password or password != _current_password:
        raise HTTPException(401, "Invalid password")
    token = _make_token("staff")
    return {"token": token, "user_id": "staff"}

@router.get("/profile")
async def get_profile(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    user_id = _verify_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    return {"user_id": user_id}

@router.post("/change-password")
async def change_password(body: dict, authorization: str = Header(None)):
    global _current_password

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    user_id = _verify_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")

    current_password = body.get("current_password", "")
    new_password = body.get("new_password", "")

    if not current_password or current_password != _current_password:
        raise HTTPException(400, "Current password is incorrect")

    if not new_password or len(new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")

    _current_password = new_password
    return {"message": "Password changed successfully"}

import jwt
from fastapi import Depends, HTTPException, Header
import os
import logging

logger = logging.getLogger("launchpad")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


async def get_current_user(authorization: str = Header(None)) -> str:
    """Validate Supabase JWT and return user_id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Token missing user ID")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        # Don't leak internal JWT error details to the client
        raise HTTPException(401, "Invalid token")


async def optional_user(authorization: str = Header(None)) -> str | None:
    """Return user_id if valid token provided, None if no token.
    Still raises 401 if a token IS provided but is invalid/malformed,
    so users with stale sessions know they need to re-auth."""
    if not authorization:
        return None
    # If they provided a header, validate it — don't silently swallow errors
    if not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException as e:
        # Expired tokens: tell the user instead of silently degrading
        if e.status_code == 401 and "expired" in str(e.detail).lower():
            raise
        # Other invalid tokens: treat as unauthenticated (no token)
        return None

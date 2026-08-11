import httpx
from fastapi import HTTPException, Header
import os

POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")


async def validate_pb_token(token: str) -> dict:
    """Validate a PocketBase auth token by calling auth-refresh.
    Returns the user record if valid, raises HTTPException(401) if not."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                POCKETBASE_URL + "/api/collections/users/auth-refresh",
                headers={"Authorization": f"Bearer {token}"}
            )
        if r.status_code == 200:
            data = r.json()
            return data.get("record", {})
        raise HTTPException(401, "Invalid or expired token")
    except httpx.RequestError:
        raise HTTPException(503, "Auth service unavailable")


async def get_current_user(authorization: str = Header(None)) -> str:
    """Validate token and return user_id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    record = await validate_pb_token(token)
    user_id = record.get("id")
    if not user_id:
        raise HTTPException(401, "Token missing user ID")
    return user_id


async def get_current_user_with_token(authorization: str = Header(None)) -> tuple[str, str]:
    """Return (user_id, token) or raise 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    record = await validate_pb_token(token)
    user_id = record.get("id")
    if not user_id:
        raise HTTPException(401, "Token missing user ID")
    return user_id, token

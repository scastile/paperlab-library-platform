from fastapi import APIRouter, Depends, HTTPException, Header
from routes.staff import _verify_token
from database import get_all_settings, set_setting

router = APIRouter()

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    user_id = _verify_token(authorization.split(" ", 1)[1])
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    return user_id

LIBRARY_KEYS = {"library_name", "address", "phone", "hours", "website", "policies", "custom_faq"}
PROVIDER_KEYS = {"primary_provider", "mimo_api_key", "openrouter_api_key", "anthropic_api_key", "openai_api_key",
                 "mimo_model", "openrouter_model", "claude_model", "chatgpt_model",
                 "nous_api_key", "nvidia_api_key", "gemini_api_key",
                 "nous_model", "nvidia_model", "gemini_model"}

DEFAULT_SETTINGS = {
    "library_name": "",
    "address": "",
    "phone": "",
    "hours": "",
    "website": "",
    "policies": "",
    "custom_faq": "",
    "primary_provider": "mimo",
    "mimo_api_key": "",
    "openrouter_api_key": "",
    "anthropic_api_key": "",
    "openai_api_key": "",
    "mimo_model": "",
    "openrouter_model": "",
    "claude_model": "",
    "chatgpt_model": "",
    "nous_api_key": "",
    "nvidia_api_key": "",
    "gemini_api_key": "",
    "nous_model": "",
    "nvidia_model": "",
    "gemini_model": "",
}

@router.get("")
async def get_settings(user_id: str = Depends(get_current_user)):
    stored = await get_all_settings()
    result = {}
    for key, default in DEFAULT_SETTINGS.items():
        val = stored.get(key, default)
        # Mask API keys for display (show first 8 and last 4 chars)
        if key.endswith("_api_key") and val and len(val) > 12:
            result[key] = val[:8] + "..." + val[-4:]
        elif key.endswith("_api_key") and val:
            result[key] = "***"
        else:
            result[key] = val
    return result

@router.get("/raw")
async def get_settings_raw(user_id: str = Depends(get_current_user)):
    """Returns raw settings including full API keys — used internally."""
    stored = await get_all_settings()
    result = {}
    for key, default in DEFAULT_SETTINGS.items():
        result[key] = stored.get(key, default)
    return result

@router.put("")
async def update_settings(body: dict, user_id: str = Depends(get_current_user)):
    valid_keys = LIBRARY_KEYS | PROVIDER_KEYS
    updated = []
    for key, value in body.items():
        if key in valid_keys:
            # Don't overwrite with masked values
            if key.endswith("_api_key") and isinstance(value, str) and "..." in value:
                continue
            await set_setting(key, str(value))
            updated.append(key)
    return {"updated": updated}

@router.get("/context")
async def get_settings_context():
    """Public endpoint — returns library info as context for the AI patron chat."""
    stored = await get_all_settings()
    if not stored:
        return {"context": ""}

    parts = []
    if stored.get("library_name"):
        parts.append(f"Library: {stored['library_name']}")
    if stored.get("address"):
        parts.append(f"Address: {stored['address']}")
    if stored.get("phone"):
        parts.append(f"Phone: {stored['phone']}")
    if stored.get("hours"):
        parts.append(f"Hours: {stored['hours']}")
    if stored.get("website"):
        parts.append(f"Website: {stored['website']}")
    if stored.get("policies"):
        parts.append(f"Policies: {stored['policies']}")
    if stored.get("custom_faq"):
        parts.append(f"Additional info: {stored['custom_faq']}")

    return {"context": "\n".join(parts)}

"""Credit proxy for backends that rely on Launchpad's credit system.

Used by Flyer Studio and Escape Room Designer.
"""
import httpx
from fastapi import HTTPException


async def proxy_request(
    launchpad_url: str, path: str, token: str, method: str = "GET", data: dict | None = None, timeout: float = 10.0
):
    """Send a request to the Launchpad credit backend."""
    url = f"{launchpad_url}{path}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                resp = await client.get(url, headers=headers, timeout=timeout)
            else:
                resp = await client.post(url, headers=headers, json=data, timeout=timeout)
            
    except httpx.RequestError as e:
        raise HTTPException(503, f"Credit service unreachable: {e}")
    
    if resp.status_code == 402:
        detail = resp.json().get("detail", "Insufficient credits")
        raise HTTPException(402, detail)
    if resp.status_code == 401:
        raise HTTPException(401, "Invalid token")
    if not resp.is_success:
        raise HTTPException(500, f"Credit service error: {resp.status_code}")
    
    return resp.json()

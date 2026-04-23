from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import os
import httpx

load_dotenv()

from ai_prompts import generate_escape_room_detailed
from auth import get_current_user, get_current_user_with_token, optional_user
from database import init_db, get_db

ALLOWED_ORIGINS = [
    "http://10.0.0.179:8203",
    "http://localhost:8203",
    "http://localhost:5174",
    "https://escape.paperlab.xyz",
]
ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]

LAUNCHPAD_URL = os.getenv("LAUNCHPAD_URL", "http://library-launchpad-backend-1:8000")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Escape Room Designer", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    theme: str
    age_group: str = "All Ages"
    difficulty: str = "medium"
    duration: str = "45 minutes"
    inventory: list[str] = []

class SaveRequest(BaseModel):
    theme: str
    age_group: str = "All Ages"
    difficulty: str = "medium"
    duration: str = "45 minutes"
    plan_json: dict

async def deduct_credits_via_launchpad(token: str, action: str, app: str = "escape-room", product: str = "escape-room-designer"):
    """Call Launchpad's credit deduct endpoint. Returns balance dict on success, raises HTTPException on failure."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{LAUNCHPAD_URL}/api/credits/deduct",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"action": action, "app": app, "product": product},
                timeout=10.0
            )
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

@app.post("/api/generate")
async def generate(req: GenerateRequest, auth: tuple = Depends(get_current_user_with_token)):
    user_id, token = auth
    # Deduct credits atomically via Launchpad
    await deduct_credits_via_launchpad(token, "escape_room_generate")
    plan = await generate_escape_room_detailed(
        req.theme, req.age_group, req.difficulty, req.duration, req.inventory
    )
    return {"plan": plan}

@app.post("/api/save")
async def save(req: SaveRequest, user_id: str = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO plans (user_id, theme, age_group, difficulty, duration, plan_json) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, req.theme, req.age_group, req.difficulty, req.duration, json.dumps(req.plan_json))
    )
    plan_id = cursor.lastrowid
    await db.commit()
    await db.close()
    return {"id": plan_id, "message": "Saved"}

@app.get("/api/plans")
async def list_plans(user_id: str = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, theme, age_group, difficulty, duration, created_at FROM plans WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    )
    rows = await cursor.fetchall()
    await db.close()
    return {"plans": [dict(r) for r in rows]}

@app.get("/api/plans/{plan_id}")
async def get_plan(plan_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM plans WHERE id = ? AND user_id = ?", (plan_id, user_id)
    )
    row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(404, "Plan not found")
    return {"plan": dict(row)}

@app.delete("/api/plans/{plan_id}")
async def delete_plan(plan_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM plans WHERE id = ? AND user_id = ?", (plan_id, user_id)
    )
    await db.commit()
    await db.close()
    return {"message": "Deleted"}

@app.get("/api/health")
async def health():
    return {"ok": True}

@app.get("/api/credits/balance")
async def credits_balance(auth: tuple = Depends(get_current_user_with_token)):
    user_id, token = auth
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{LAUNCHPAD_URL}/api/credits/balance",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
        except httpx.RequestError as e:
            raise HTTPException(503, f"Credit service unreachable: {e}")
    if resp.status_code == 401:
        raise HTTPException(401, "Invalid token")
    if not resp.is_success:
        raise HTTPException(500, f"Credit service error: {resp.status_code}")
    return resp.json()

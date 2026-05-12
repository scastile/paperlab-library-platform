from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import os

from config import build_cors_origins, require_env
from rate_limit import RateLimiterMiddleware
from credit_proxy import proxy_request
from ai_prompts import generate_escape_room_detailed
from auth import get_current_user, get_current_user_with_token, optional_user
from database import init_db, get_db

load_dotenv()

# Fail fast if critical env vars are missing
require_env(["OPENROUTER_API_KEY", "SUPABASE_JWT_SECRET"])

LAUNCHPAD_URL = os.getenv("LAUNCHPAD_URL", "http://launchpad-backend:8000")
ALLOWED_ORIGINS = build_cors_origins()


async def deduct_credits_via_launchpad(token: str, action: str, app: str = "escape-room", product: str = "escape-room-designer"):
    """Proxy credit deduction to the Launchpad backend."""
    return await proxy_request(
        LAUNCHPAD_URL,
        path="/api/credits/deduct",
        token=token,
        method="POST",
        data={"action": action, "app": app, "product": product},
    )


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
app.add_middleware(
    RateLimiterMiddleware,
    max_requests=120,
    window_seconds=60,
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

@app.post("/api/generate")
async def generate(req: GenerateRequest, auth: tuple = Depends(get_current_user_with_token)):
    _, token = auth
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

@app.get("/api/credits/balance")
async def credits_balance(auth: tuple = Depends(get_current_user_with_token)):
    """Proxy credit balance to the Launchpad backend."""
    _, token = auth
    return await proxy_request(LAUNCHPAD_URL, path="/api/credits/balance", token=token)

@app.get("/api/health")
async def health():
    return {"ok": True}

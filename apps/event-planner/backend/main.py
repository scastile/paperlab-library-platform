from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import os

from config import ALLOWED_ORIGINS, require_all
from rate_limit import RateLimiterMiddleware
from credit_proxy import proxy_request
from auth import get_current_user, get_current_user_with_token
from database import init_db, get_db

load_dotenv()

require_all()

LAUNCHPAD_URL = os.getenv("LAUNCHPAD_URL", "http://launchpad-backend:8000")
PLAN_ACTION = "event_plan"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Event Planner", version="0.1.0", lifespan=lifespan)

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


async def deduct_credit(token: str):
    """Deduct 1 credit via Launchpad (the credit authority). 402 if insufficient."""
    await proxy_request(
        LAUNCHPAD_URL,
        path="/api/credits/deduct",
        token=token,
        method="POST",
        data={"action": PLAN_ACTION, "app": "event-planner", "product": "event-planner"},
    )


class PlanRequest(BaseModel):
    name: str
    type: str = "Program"
    date: str = ""
    time: str = ""
    duration: str = "60"
    room: str = ""
    capacity: str = ""
    audience: str = "All Ages"
    description: str = ""
    checklist: list[str] = []
    estimated_cost: float = 0


def row_to_plan(row) -> dict:
    plan = dict(row)
    try:
        plan["checklist"] = json.loads(plan.get("checklist") or "[]")
    except Exception:
        plan["checklist"] = []
    plan.pop("created_at", None)
    return plan


@app.post("/api/plans")
async def create_plan(req: PlanRequest, auth: tuple = Depends(get_current_user_with_token)):
    """Deduct 1 credit, then save the plan for the user."""
    user_id, token = auth
    await deduct_credit(token)  # raises 402 on insufficient credits

    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO event_plans
               (user_id, name, type, date, time, duration, room, capacity, audience, description, checklist, estimated_cost)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, req.name, req.type, req.date, req.time, req.duration,
                req.room, req.capacity, req.audience, req.description,
                json.dumps(req.checklist), req.estimated_cost,
            ),
        )
        plan_id = cursor.lastrowid
        await db.commit()
        row = await (await db.execute("SELECT * FROM event_plans WHERE id = ?", (plan_id,))).fetchone()
        return {"plan": row_to_plan(row), "balance": None}
    finally:
        await db.close()


@app.get("/api/plans")
async def list_plans(user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        rows = await (await db.execute(
            "SELECT * FROM event_plans WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (user_id,),
        )).fetchall()
        return {"plans": [row_to_plan(r) for r in rows]}
    finally:
        await db.close()


@app.delete("/api/plans/{plan_id}")
async def delete_plan(plan_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM event_plans WHERE id = ? AND user_id = ?", (plan_id, user_id))
        await db.commit()
        return {"message": "Deleted"}
    finally:
        await db.close()


@app.get("/api/credits/balance")
async def credits_balance(auth: tuple = Depends(get_current_user_with_token)):
    """Proxy credit balance to the Launchpad backend."""
    _, token = auth
    return await proxy_request(LAUNCHPAD_URL, path="/api/credits/balance", token=token)


@app.get("/api/health")
async def health():
    return {"ok": True}

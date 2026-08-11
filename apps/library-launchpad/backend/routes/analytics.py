"""Lightweight first-party analytics — a single fire-and-forget event log.

No external SDKs, no cookies. Frontend calls POST /api/events with an event
name and optional props; we just persist a row. Intended for funnel signals:
signup -> first paid -> monthly recurring revenue, plus per-tool usage so we
can tell which product/credit experiment actually converts. Fire-and-forget
means the request is never allowed to block the UI or fail an action.
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
import json
import logging

from auth import optional_user
from database import get_db

router = APIRouter()
logger = logging.getLogger("launchpad")

# Events we care about (case-insensitive match on purpose):
ALLOWED = {
    "signup",
    "login",
    "first_generate",       # first credit-costing action in any tool
    "purchase",             # one-off credit pack
    "subscription",         # subscription started/changed
    "tool_use",             # any tool action (escape/flyer/event/launchpad)
    "out_of_credits",       # hit a 402 insufficient-credits
}


class EventRequest(BaseModel):
    event: str
    props: Optional[dict] = Field(default_factory=dict)


@router.post("/events")
async def record_event(
    req: EventRequest,
    user_id: Optional[str] = Depends(optional_user),
):
    # Keep it cheap: only persist known events, ignore everything else.
    if req.event.lower() not in ALLOWED:
        return {"ok": True, "skipped": True}

    try:
        conn = await get_db()
        await conn.execute(
            "INSERT INTO analytics_events (user_id, event, props) VALUES (?, ?, ?)",
            (user_id, req.event.lower(), json.dumps(req.props or {})[:2000]),
        )
        await conn.commit()
        await conn.close()
    except Exception as exc:  # never let telemetry break the app
        logger.warning("analytics write failed: %s", exc)
    return {"ok": True}

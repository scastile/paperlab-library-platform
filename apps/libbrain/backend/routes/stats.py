import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from routes.staff import _verify_token
from fastapi import Header

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        from fastapi import HTTPException
        raise HTTPException(401, "Missing token")
    user_id = _verify_token(authorization.split(" ", 1)[1])
    if not user_id:
        from fastapi import HTTPException
        raise HTTPException(401, "Invalid or expired token")
    return user_id
from database import get_db
from models import StatsResponse

router = APIRouter()


def _period_filter(period: str) -> tuple[str, datetime]:
    now = datetime.utcnow()
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return "daily", start
    elif period == "weekly":
        start = now - timedelta(days=7)
        return "weekly", start
    else:  # monthly
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return "monthly", start


@router.get("", response_model=StatsResponse)
async def get_stats(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    user_id: str = Depends(get_current_user),
):
    db = await get_db()
    try:
        results = {}
        for p in ("daily", "weekly", "monthly"):
            _, start = _period_filter(p)
            cursor = await db.execute(
                "SELECT COUNT(*) FROM reference_questions WHERE timestamp >= ?",
                (start.isoformat(),),
            )
            row = await cursor.fetchone()
            results[p] = row[0]

        # Breakdown by category (using requested period)
        _, start = _period_filter(period)
        cursor = await db.execute(
            "SELECT category, COUNT(*) FROM reference_questions WHERE timestamp >= ? GROUP BY category",
            (start.isoformat(),),
        )
        by_category = {}
        for row in await cursor.fetchall():
            by_category[row[0] or "unknown"] = row[1]

        return StatsResponse(
            daily=results["daily"],
            weekly=results["weekly"],
            monthly=results["monthly"],
            by_category=by_category,
        )
    finally:
        await db.close()


@router.get("/export")
async def export_stats(
    period: str = Query("monthly", regex="^(daily|weekly|monthly)$"),
    user_id: str = Depends(get_current_user),
):
    db = await get_db()
    try:
        _, start = _period_filter(period)
        cursor = await db.execute(
            """SELECT DATE(timestamp) as date, category, COUNT(*) as count
               FROM reference_questions
               WHERE timestamp >= ?
               GROUP BY DATE(timestamp), category
               ORDER BY date""",
            (start.isoformat(),),
        )
        rows = await cursor.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["date", "category", "count"])
        for row in rows:
            writer.writerow([row[0], row[1], row[2]])

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=stats_{period}.csv"},
        )
    finally:
        await db.close()

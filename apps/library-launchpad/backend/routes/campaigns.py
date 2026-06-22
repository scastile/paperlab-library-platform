from fastapi import APIRouter, HTTPException, Depends
from models import CampaignListItem, CardOut, MediaOut
from database import get_db
from auth import get_current_user, optional_user
import json

router = APIRouter()


@router.get("/campaigns")
async def list_campaigns(user_id: str = Depends(optional_user)):
    """List saved campaigns. Shows all if not authenticated, only own if authenticated."""
    db = await get_db()
    try:
        if user_id:
            cursor = await db.execute("""
                SELECT c.id, c.topic, c.created_at, COUNT(cards.id) as card_count, c.target_audience, c.budget
                FROM campaigns c
                LEFT JOIN cards ON cards.campaign_id = c.id
                WHERE c.user_id = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """, (user_id,))
        else:
            cursor = await db.execute("""
                SELECT c.id, c.topic, c.created_at, COUNT(cards.id) as card_count, c.target_audience, c.budget
                FROM campaigns c
                LEFT JOIN cards ON cards.campaign_id = c.id
                WHERE c.user_id = 'anonymous'
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """)
        rows = await cursor.fetchall()
        return [
            CampaignListItem(
                id=r["id"], topic=r["topic"], created_at=r["created_at"], card_count=r["card_count"],
                target_audience=r["target_audience"] or "All Ages", budget=r["budget"] or "$50 — Small Event"
            )
            for r in rows
        ]
    finally:
        await db.close()


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int, user_id: str = Depends(optional_user)):
    """Load a saved campaign with all its cards and media."""
    db = await get_db()
    try:
        if user_id:
            cursor = await db.execute(
                "SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = ? AND user_id = ?",
                (campaign_id, user_id),
            )
        else:
            cursor = await db.execute(
                "SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = ? AND user_id = 'anonymous'",
                (campaign_id,),
            )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Campaign not found")

        cursor = await db.execute(
            "SELECT id, title, author, media_type, cover_url, openlibrary_key FROM media_results WHERE campaign_id = ?",
            (campaign_id,),
        )
        media_rows = await cursor.fetchall()
        media = [MediaOut(id=r["id"], title=r["title"], author=r["author"], media_type=r["media_type"], cover_url=r["cover_url"], openlibrary_key=r["openlibrary_key"]) for r in media_rows]

        cursor = await db.execute(
            "SELECT id, card_type, content, pinned, position FROM cards WHERE campaign_id = ? ORDER BY position",
            (campaign_id,),
        )
        card_rows = await cursor.fetchall()
        cards = [CardOut(id=r["id"], card_type=r["card_type"], content=json.loads(r["content"]), pinned=bool(r["pinned"]), position=r["position"]) for r in card_rows]

        cursor = await db.execute("SELECT date, reason FROM relevant_dates WHERE campaign_id = ?", (campaign_id,))
        dates = await cursor.fetchall()
        relevant_dates = [{"date": r["date"], "reason": r["reason"]} for r in dates]

        cursor = await db.execute("SELECT title, year, author, connection, cover_url, openlibrary_key FROM cross_media_connections WHERE campaign_id = ?", (campaign_id,))
        cm = await cursor.fetchall()
        cross_media = [{"title": r["title"], "year": r["year"], "author": r["author"], "connection": r["connection"], "cover_url": r["cover_url"], "openlibrary_key": r["openlibrary_key"]} for r in cm]

        return {
            "id": row["id"], "topic": row["topic"], "image_url": row["image_url"],
            "created_at": row["created_at"],
            "target_audience": row["target_audience"] or "All Ages", "budget": row["budget"] or "$50 — Small Event",
            "media": media, "cards": cards, "relevant_dates": relevant_dates,
            "cross_media_connections": cross_media,
        }
    finally:
        await db.close()


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int, user_id: str = Depends(optional_user)):
    """Delete a campaign and all related data. SQLite FK cascade handles cleanup."""
    db = await get_db()
    try:
        if user_id:
            cursor = await db.execute(
                "SELECT id FROM campaigns WHERE id = ? AND user_id = ?",
                (campaign_id, user_id),
            )
        else:
            cursor = await db.execute(
                "SELECT id FROM campaigns WHERE id = ? AND user_id = 'anonymous'",
                (campaign_id,),
            )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Campaign not found")

        # SQLite FK CASCADE handles everything, but keep explicit deletes for safety
        await db.execute("DELETE FROM escape_plans WHERE campaign_id = ?", (campaign_id,))
        await db.execute("DELETE FROM cards WHERE campaign_id = ?", (campaign_id,))
        await db.execute("DELETE FROM media_results WHERE campaign_id = ?", (campaign_id,))
        await db.execute("DELETE FROM relevant_dates WHERE campaign_id = ?", (campaign_id,))
        await db.execute("DELETE FROM cross_media_connections WHERE campaign_id = ?", (campaign_id,))
        await db.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        await db.commit()

        return {"deleted": campaign_id}
    finally:
        await db.close()

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
                id=r[0], topic=r[1], created_at=r[2], card_count=r[3],
                target_audience=r[4] or "All Ages", budget=r[5] or "$50 — Small Event"
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
            cursor = await db.execute("SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = ? AND user_id = ?", (campaign_id, user_id))
        else:
            cursor = await db.execute("SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = ? AND user_id = 'anonymous'", (campaign_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Campaign not found")

        # Get media
        cursor = await db.execute(
            "SELECT id, title, author, media_type, cover_url, openlibrary_key FROM media_results WHERE campaign_id = ?",
            (campaign_id,)
        )
        media_rows = await cursor.fetchall()
        media = [
            MediaOut(id=r[0], title=r[1], author=r[2], media_type=r[3], cover_url=r[4], openlibrary_key=r[5])
            for r in media_rows
        ]

        # Get cards
        cursor = await db.execute(
            "SELECT id, card_type, content, pinned, position FROM cards WHERE campaign_id = ? ORDER BY position",
            (campaign_id,)
        )
        card_rows = await cursor.fetchall()
        cards = [
            CardOut(id=r[0], card_type=r[1], content=json.loads(r[2]), pinned=bool(r[3]), position=r[4])
            for r in card_rows
        ]

        # Get relevant dates
        cursor = await db.execute(
            "SELECT date, reason FROM relevant_dates WHERE campaign_id = ?",
            (campaign_id,)
        )
        relevant_dates = [{"date": r[0], "reason": r[1]} for r in await cursor.fetchall()]

        # Get cross-media connections
        cursor = await db.execute(
            "SELECT title, year, author, connection, cover_url, openlibrary_key FROM cross_media_connections WHERE campaign_id = ?",
            (campaign_id,)
        )
        cross_media = [
            {"title": r[0], "year": r[1], "author": r[2], "connection": r[3], "cover_url": r[4], "openlibrary_key": r[5]}
            for r in await cursor.fetchall()
        ]

        return {
            "id": row[0],
            "topic": row[1],
            "image_url": row[2],
            "created_at": row[3],
            "target_audience": row[4] or "All Ages",
            "budget": row[5] or "$50 — Small Event",
            "media": media,
            "cards": cards,
            "relevant_dates": relevant_dates,
            "cross_media_connections": cross_media,
        }
    finally:
        await db.close()


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int, user_id: str = Depends(optional_user)):
    """Delete a campaign and all related data (cards, media, escape plans, etc.)."""
    db = await get_db()
    try:
        if user_id:
            cursor = await db.execute("SELECT id FROM campaigns WHERE id = ? AND user_id = ?", (campaign_id, user_id))
        else:
            cursor = await db.execute("SELECT id FROM campaigns WHERE id = ? AND user_id = 'anonymous'", (campaign_id,))
        if not cursor.fetchone():
            raise HTTPException(404, "Campaign not found")

        # Delete in order: escape_plans first (not covered by FK cascade if FK was off)
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

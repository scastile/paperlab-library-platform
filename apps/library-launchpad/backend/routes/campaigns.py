from fastapi import APIRouter, HTTPException, Depends
from models import CampaignListItem, CardOut, MediaOut
from database import get_pool
from auth import get_current_user, optional_user
import json

router = APIRouter()


@router.get("/campaigns")
async def list_campaigns(user_id: str = Depends(optional_user)):
    """List saved campaigns. Shows all if not authenticated, only own if authenticated."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if user_id:
            rows = await conn.fetch("""
                SELECT c.id, c.topic, c.created_at, COUNT(cards.id) as card_count, c.target_audience, c.budget
                FROM campaigns c
                LEFT JOIN cards ON cards.campaign_id = c.id
                WHERE c.user_id = $1
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """, user_id)
        else:
            rows = await conn.fetch("""
                SELECT c.id, c.topic, c.created_at, COUNT(cards.id) as card_count, c.target_audience, c.budget
                FROM campaigns c
                LEFT JOIN cards ON cards.campaign_id = c.id
                WHERE c.user_id = 'anonymous'
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """)
        return [
            CampaignListItem(
                id=r["id"], topic=r["topic"], created_at=r["created_at"], card_count=r["card_count"],
                target_audience=r["target_audience"] or "All Ages", budget=r["budget"] or "$50 — Small Event"
            )
            for r in rows
        ]


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int, user_id: str = Depends(optional_user)):
    """Load a saved campaign with all its cards and media."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if user_id:
            row = await conn.fetchrow(
                "SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = $1 AND user_id = $2",
                campaign_id, user_id,
            )
        else:
            row = await conn.fetchrow(
                "SELECT id, topic, image_url, created_at, target_audience, budget FROM campaigns WHERE id = $1 AND user_id = 'anonymous'",
                campaign_id,
            )
        if not row:
            raise HTTPException(404, "Campaign not found")

        media_rows = await conn.fetch(
            "SELECT id, title, author, media_type, cover_url, openlibrary_key FROM media_results WHERE campaign_id = $1",
            campaign_id,
        )
        media = [MediaOut(id=r["id"], title=r["title"], author=r["author"], media_type=r["media_type"], cover_url=r["cover_url"], openlibrary_key=r["openlibrary_key"]) for r in media_rows]

        card_rows = await conn.fetch(
            "SELECT id, card_type, content, pinned, position FROM cards WHERE campaign_id = $1 ORDER BY position",
            campaign_id,
        )
        cards = [CardOut(id=r["id"], card_type=r["card_type"], content=json.loads(r["content"]), pinned=bool(r["pinned"]), position=r["position"]) for r in card_rows]

        dates = await conn.fetch("SELECT date, reason FROM relevant_dates WHERE campaign_id = $1", campaign_id)
        relevant_dates = [{"date": r["date"], "reason": r["reason"]} for r in dates]

        cm = await conn.fetch("SELECT title, year, author, connection, cover_url, openlibrary_key FROM cross_media_connections WHERE campaign_id = $1", campaign_id)
        cross_media = [{"title": r["title"], "year": r["year"], "author": r["author"], "connection": r["connection"], "cover_url": r["cover_url"], "openlibrary_key": r["openlibrary_key"]} for r in cm]

        return {
            "id": row["id"], "topic": row["topic"], "image_url": row["image_url"],
            "created_at": row["created_at"],
            "target_audience": row["target_audience"] or "All Ages", "budget": row["budget"] or "$50 — Small Event",
            "media": media, "cards": cards, "relevant_dates": relevant_dates,
            "cross_media_connections": cross_media,
        }


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int, user_id: str = Depends(optional_user)):
    """Delete a campaign and all related data. PostgreSQL FK cascade handles cleanup."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if user_id:
            row = await conn.fetchrow(
                "SELECT id FROM campaigns WHERE id = $1 AND user_id = $2",
                campaign_id, user_id,
            )
        else:
            row = await conn.fetchrow(
                "SELECT id FROM campaigns WHERE id = $1 AND user_id = 'anonymous'",
                campaign_id,
            )
        if not row:
            raise HTTPException(404, "Campaign not found")

        # PostgreSQL FK CASCADE handles everything, but keep explicit deletes for safety
        await conn.execute("DELETE FROM escape_plans WHERE campaign_id = $1", campaign_id)
        await conn.execute("DELETE FROM cards WHERE campaign_id = $1", campaign_id)
        await conn.execute("DELETE FROM media_results WHERE campaign_id = $1", campaign_id)
        await conn.execute("DELETE FROM relevant_dates WHERE campaign_id = $1", campaign_id)
        await conn.execute("DELETE FROM cross_media_connections WHERE campaign_id = $1", campaign_id)
        await conn.execute("DELETE FROM campaigns WHERE id = $1", campaign_id)

        return {"deleted": campaign_id}

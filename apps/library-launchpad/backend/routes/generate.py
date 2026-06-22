from fastapi import APIRouter, HTTPException, Depends
from models import GenerateRequest, RerollRequest, CardOut, MediaOut, SaveRequest
from database import get_db
from services.openlibrary import search_media, search_openlibrary
from services.ai_prompts import generate_cards, reroll_card
from services.credits import can_use_action, deduct_credits, get_or_create_user
from auth import get_current_user, optional_user
import json
import asyncio
import time
import logging

logger = logging.getLogger("launchpad")

router = APIRouter()

# In-memory store for unsaved campaigns (session-scoped)
_temp_campaigns = {}
_next_temp_id = 1
_TEMP_CAMPAIGN_TTL = 3600  # 1 hour in seconds


async def cleanup_temp_campaigns():
    """Remove expired temp campaigns. Called on shutdown."""
    _temp_campaigns.clear()


def _cleanup_expired_temp():
    """Remove temp campaigns older than TTL."""
    now = time.time()
    expired = [k for k, v in _temp_campaigns.items() if now - v.get("created_at", 0) > _TEMP_CAMPAIGN_TTL]
    for k in expired:
        del _temp_campaigns[k]


@router.post("/generate")
async def generate(req: GenerateRequest, user_id: str = Depends(optional_user)):
    if not user_id:
        raise HTTPException(403, "Sign up or log in to create campaigns")

    allowed, reason, current = await can_use_action(user_id, "generate")
    if not allowed:
        raise HTTPException(402, json.dumps({"reason": "insufficient_credits", "message": reason, "current_credits": current}))

    topic = req.topic.strip()
    if not topic:
        raise HTTPException(400, "Topic is required")
    if len(topic) > 500:
        raise HTTPException(400, "Topic must be under 500 characters")

    media = await search_media(topic)
    ai_result = await generate_cards(topic, media, req.target_audience, req.budget)
    cards_raw = ai_result["cards"]
    relevant_dates = ai_result.get("relevant_dates", [])
    cross_media = ai_result.get("cross_media_connections", [])

    async def _lookup_cover(conn_dict):
        title = conn_dict.get("title", "")
        author = conn_dict.get("author", "")
        if title:
            query = f"{title} {author}".strip()
            try:
                ol_results = await search_openlibrary(query, limit=1)
                if ol_results:
                    conn_dict["cover_url"] = ol_results[0].get("cover_url")
                    conn_dict["openlibrary_key"] = ol_results[0].get("openlibrary_key")
            except Exception:
                pass
        return conn_dict

    enriched_cross_media = await asyncio.gather(*[_lookup_cover(c) for c in cross_media]) if cross_media else []

    global _next_temp_id
    temp_id = _next_temp_id
    _next_temp_id += 1

    cards = []
    for i, card in enumerate(cards_raw):
        cards.append({
            "id": f"temp_{temp_id}_{i}",
            "card_type": card["type"],
            "content": card["content"],
            "pinned": False,
            "position": i,
        })

    media_out = [
        {"title": m["title"], "author": m["author"], "media_type": m["media_type"],
         "cover_url": m.get("cover_url"), "openlibrary_key": m.get("openlibrary_key")}
        for m in media
    ]

    _cleanup_expired_temp()
    _temp_campaigns[temp_id] = {
        "topic": topic,
        "media": media,
        "cards": cards,
        "user_id": user_id,
        "created_at": time.time(),
    }

    await deduct_credits(user_id, "generate")

    return {
        "campaign_id": f"temp_{temp_id}",
        "topic": topic,
        "media": media_out,
        "cards": cards,
        "relevant_dates": relevant_dates,
        "cross_media_connections": enriched_cross_media,
        "target_audience": req.target_audience,
        "budget": req.budget,
    }


@router.post("/save")
async def save_campaign(payload: SaveRequest, user_id: str = Depends(get_current_user)):
    topic = payload.topic
    media = payload.media
    cards = payload.cards
    target_audience = payload.target_audience
    budget = payload.budget
    relevant_dates = payload.relevant_dates
    cross_media = payload.cross_media_connections

    if not topic:
        raise HTTPException(400, "Topic is required")
    if len(topic) > 500:
        raise HTTPException(400, "Topic must be under 500 characters")
    if len(cards) > 50:
        raise HTTPException(400, "Too many cards (max 50)")

    db = await get_db()
    try:
        await db.execute("BEGIN")
        cursor = await db.execute(
            "INSERT INTO campaigns (user_id, topic, target_audience, budget) VALUES (?, ?, ?, ?)",
            (user_id, topic, target_audience, budget),
        )
        campaign_id = cursor.lastrowid

        for m in media[:50]:
            await db.execute(
                """INSERT INTO media_results (campaign_id, title, author, media_type, cover_url, openlibrary_key)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (campaign_id, (m.get("title") or "")[:500], (m.get("author") or "")[:200],
                 (m.get("media_type") or "")[:50], (m.get("cover_url") or "")[:500], (m.get("openlibrary_key") or "")[:100]),
            )

        for i, card in enumerate(cards[:50]):
            await db.execute(
                """INSERT INTO cards (campaign_id, card_type, content, pinned, position)
                   VALUES (?, ?, ?, ?, ?)""",
                (campaign_id, (card.get("card_type") or "")[:50],
                 json.dumps(card.get("content", {})), 1 if card.get("pinned") else 0, i),
            )

        for d in relevant_dates[:50]:
            await db.execute(
                "INSERT INTO relevant_dates (campaign_id, date, reason) VALUES (?, ?, ?)",
                (campaign_id, (d.get("date") or "")[:50], (d.get("reason") or "")[:500]),
            )

        for c in cross_media[:50]:
            await db.execute(
                """INSERT INTO cross_media_connections (campaign_id, title, year, author, connection, cover_url, openlibrary_key)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (campaign_id, (c.get("title") or "")[:500], c.get("year"), (c.get("author") or "")[:200],
                 (c.get("connection") or "")[:500], (c.get("cover_url") or "")[:500], (c.get("openlibrary_key") or "")[:100]),
            )

        saved_cards = []
        cursor = await db.execute(
            "SELECT id, card_type, content, pinned, position FROM cards WHERE campaign_id = ? ORDER BY position",
            (campaign_id,),
        )
        rows = await cursor.fetchall()
        for row in rows:
            saved_cards.append({
                "id": row["id"], "card_type": row["card_type"], "content": json.loads(row["content"]),
                "pinned": bool(row["pinned"]), "position": row["position"],
            })

        await db.commit()

        return {
            "campaign_id": campaign_id, "topic": topic, "media": media,
            "cards": saved_cards, "relevant_dates": relevant_dates,
            "cross_media_connections": cross_media,
            "target_audience": target_audience, "budget": budget, "saved": True,
        }
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


@router.post("/reroll")
async def reroll(req: RerollRequest, user_id: str = Depends(optional_user)):
    if not user_id:
        raise HTTPException(403, "Sign up or log in to reroll cards")

    action = "reroll_all" if not req.card_id else "reroll"
    allowed, reason, current = await can_use_action(user_id, action)
    if not allowed:
        raise HTTPException(402, json.dumps({"reason": "insufficient_credits", "message": reason, "current_credits": current}))

    campaign_id = str(req.campaign_id)
    card_id = req.card_id

    # --- TEMP CAMPAIGN (in-memory) ---
    if campaign_id.startswith("temp_"):
        try:
            temp_id = int(campaign_id.split("_")[1])
        except (IndexError, ValueError):
            raise HTTPException(400, "Invalid temp campaign ID")

        temp = _temp_campaigns.get(temp_id)
        if not temp:
            raise HTTPException(404, "Temp campaign not found or expired")
        if temp.get("user_id") and temp["user_id"] != user_id:
            raise HTTPException(403, "Not your campaign")

        topic = temp["topic"]
        media = temp["media"]
        cards = temp["cards"]

        if card_id:
            card_id_str = str(card_id)
            card = next((c for c in cards if str(c["id"]) == card_id_str), None)
            if not card:
                raise HTTPException(404, f"Card {card_id} not found")
            if card.get("pinned"):
                raise HTTPException(400, "Cannot reroll a pinned card. Unpin it first.")

            new_card = await reroll_card(topic, card["card_type"], media, card["content"])
            card["content"] = new_card.get("content", new_card)
            card["card_type"] = new_card.get("type", card["card_type"])

            await deduct_credits(user_id, "reroll")
            return {"card_id": card_id, "card_type": card["card_type"], "content": card["content"]}
        else:
            async def _reroll_one(card):
                if card.get("pinned"):
                    return card
                new_card = await reroll_card(topic, card["card_type"], media, card["content"])
                card["content"] = new_card.get("content", new_card)
                card["card_type"] = new_card.get("type", card["card_type"])
                return card

            await asyncio.gather(*[_reroll_one(c) for c in cards])
            unpinned_count = sum(1 for c in cards if not c.get("pinned"))
            await deduct_credits(user_id, "reroll_all", cost_override=unpinned_count)
            return {"cards": cards}

    # --- SAVED CAMPAIGN (database) ---
    db = await get_db()
    try:
        campaign_id_int = int(campaign_id)

        cursor = await db.execute("SELECT topic, user_id FROM campaigns WHERE id = ?", (campaign_id_int,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Campaign not found — save it first")
        campaign_owner = row["user_id"]
        if campaign_owner and campaign_owner != "anonymous" and campaign_owner != user_id:
            raise HTTPException(403, "Not your campaign")
        topic = row["topic"]

        cursor = await db.execute(
            "SELECT title, author, media_type, cover_url, openlibrary_key FROM media_results WHERE campaign_id = ?",
            (campaign_id_int,),
        )
        media_rows = await cursor.fetchall()
        media = [dict(r) for r in media_rows]

        if card_id:
            card_id_int = int(card_id)
            cursor = await db.execute(
                "SELECT card_type, content, pinned FROM cards WHERE id = ? AND campaign_id = ?",
                (card_id_int, campaign_id_int),
            )
            card_row = await cursor.fetchone()
            if not card_row:
                raise HTTPException(404, "Card not found")
            if card_row["pinned"]:
                raise HTTPException(400, "Cannot reroll a pinned card. Unpin it first.")

            current_content = json.loads(card_row["content"])
            new_card = await reroll_card(topic, card_row["card_type"], media, current_content)
            await db.execute(
                "UPDATE cards SET content = ? WHERE id = ?",
                (json.dumps(new_card.get("content", new_card)), card_id_int),
            )
            await db.commit()
            await deduct_credits(user_id, "reroll")
            return {"card_id": card_id, "card_type": new_card.get("type", card_row["card_type"]), "content": new_card.get("content", new_card)}
        else:
            cursor = await db.execute(
                "SELECT id, card_type, content, pinned FROM cards WHERE campaign_id = ? ORDER BY position",
                (campaign_id_int,),
            )
            all_cards = await cursor.fetchall()

            async def _reroll_db_card(db_card):
                if db_card["pinned"]:
                    return (db_card["id"], None, None)
                current_content = json.loads(db_card["content"])
                new_card = await reroll_card(topic, db_card["card_type"], media, current_content)
                return (db_card["id"], json.dumps(new_card.get("content", new_card)), new_card.get("type", db_card["card_type"]))

            results = await asyncio.gather(*[_reroll_db_card(db_card) for db_card in all_cards])

            for db_card_id, new_content, _ in results:
                if new_content is not None:
                    await db.execute("UPDATE cards SET content = ? WHERE id = ?", (new_content, db_card_id))

            unpinned_count = sum(1 for _, nc, _ in results if nc is not None)
            await db.commit()
            await deduct_credits(user_id, "reroll_all", cost_override=unpinned_count)

            cursor = await db.execute(
                "SELECT id, card_type, content, pinned, position FROM cards WHERE campaign_id = ? ORDER BY position",
                (campaign_id_int,),
            )
            rows = await cursor.fetchall()
            return {
                "cards": [
                    {"id": r["id"], "card_type": r["card_type"], "content": json.loads(r["content"]),
                     "pinned": bool(r["pinned"]), "position": r["position"]}
                    for r in rows
                ]
            }
    finally:
        await db.close()


@router.post("/cards/{card_id}/pin")
async def toggle_pin(card_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT c.pinned, camp.user_id FROM cards c
               JOIN campaigns camp ON c.campaign_id = camp.id
               WHERE c.id = ?""",
            (card_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Card not found — save the campaign first")

        campaign_owner = row["user_id"]
        if campaign_owner and campaign_owner != "anonymous" and campaign_owner != user_id:
            raise HTTPException(403, "Not your campaign")

        new_pin = 0 if row["pinned"] else 1
        await db.execute("UPDATE cards SET pinned = ? WHERE id = ?", (new_pin, card_id))
        await db.commit()
        return {"card_id": card_id, "pinned": bool(new_pin)}
    finally:
        await db.close()


@router.post("/escape-plan")
async def generate_escape_plan(payload: dict, user_id: str = Depends(optional_user)):
    from services.ai_prompts import generate_escape_room_detailed

    if not user_id:
        raise HTTPException(403, "Sign up or log in to generate escape plans")

    allowed, reason, current = await can_use_action(user_id, "escape_plan")
    if not allowed:
        raise HTTPException(402, json.dumps({"reason": "insufficient_credits", "message": reason, "current_credits": current}))

    topic = payload.get("topic", "")
    card_content = payload.get("card_content", {})
    if not topic and not card_content:
        raise HTTPException(400, "Topic or card_content required")
    if not topic.strip() and not card_content.get("concept", "").strip():
        raise HTTPException(400, "Topic cannot be empty")

    try:
        plan = await generate_escape_room_detailed(topic, card_content)

        campaign_id = card_content.get("campaign_id")
        if campaign_id:
            db = await get_db()
            try:
                await db.execute(
                    "INSERT INTO escape_plans (campaign_id, user_id, topic, plan_data) VALUES (?, ?, ?, ?)",
                    (campaign_id, user_id, topic, json.dumps(plan)),
                )
                await db.commit()
            finally:
                await db.close()

        await deduct_credits(user_id, "escape_plan")
        return plan
    except Exception as e:
        logger.error(f"Escape plan generation failed: {e}")
        raise HTTPException(500, "Failed to generate escape plan. Please try again.")


@router.get("/escape-plans/{campaign_id}")
async def get_escape_plans(campaign_id: int, user_id: str = Depends(optional_user)):
    if not user_id:
        raise HTTPException(403, "Sign up or log in to view escape plans")

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, topic, plan_data, created_at FROM escape_plans WHERE campaign_id = ? AND user_id = ? ORDER BY created_at DESC",
            (campaign_id, user_id),
        )
        rows = await cursor.fetchall()
        return [{"id": r["id"], "topic": r["topic"], "plan": json.loads(r["plan_data"]), "created_at": r["created_at"]} for r in rows]
    finally:
        await db.close()

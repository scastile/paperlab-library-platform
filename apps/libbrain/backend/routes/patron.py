from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import io

from models import AskRequest, AskResponse
from resilience import provider_chain
from database import get_db, get_all_settings

router = APIRouter()

REFERENCE_CATEGORIES = {"reference", "readers_advisory", "tech_help"}

BASE_SYSTEM_PROMPT = (
    "You are LibBrain, a helpful library assistant. "
    "Answer concisely and warmly. "
    "If you are not sure, suggest asking a librarian."
)

async def _build_system_prompt() -> str:
    """Build system prompt with library-specific context."""
    stored = await get_all_settings()
    if not stored:
        return BASE_SYSTEM_PROMPT

    context_parts = []
    if stored.get("library_name"):
        context_parts.append(f"You are assisting patrons of {stored['library_name']}.")
    if stored.get("hours"):
        context_parts.append(f"Library hours: {stored['hours']}")
    if stored.get("address"):
        context_parts.append(f"Address: {stored['address']}")
    if stored.get("phone"):
        context_parts.append(f"Phone: {stored['phone']}")
    if stored.get("website"):
        context_parts.append(f"Website: {stored['website']}")
    if stored.get("policies"):
        context_parts.append(f"Library policies: {stored['policies']}")
    if stored.get("custom_faq"):
        context_parts.append(f"Additional information: {stored['custom_faq']}")

    if context_parts:
        return BASE_SYSTEM_PROMPT + "\n\n" + "\n".join(context_parts)
    return BASE_SYSTEM_PROMPT


@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    # Classify the question
    category = await provider_chain.classify(req.question)

    # Build system prompt with library context
    system_prompt = await _build_system_prompt()

    # Generate answer
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.question},
    ]
    answer = await provider_chain.chat(messages)

    # Count reference-type questions
    counted = False
    if category in REFERENCE_CATEGORIES:
        db = await get_db()
        try:
            await db.execute(
                "INSERT INTO reference_questions (category, branch_id) VALUES (?, ?)",
                (category, req.branch_id),
            )
            await db.commit()
            counted = True
        finally:
            await db.close()

    return AskResponse(answer=answer, category=category, counted=counted)


@router.post("/tts")
async def tts(req: AskRequest):
    audio = await provider_chain.tts(req.question)
    if not audio:
        return {"error": "TTS not available"}
    return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg")

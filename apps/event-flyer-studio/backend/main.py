from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import base64
import json
import os
import io
import httpx
import tempfile

from config import build_cors_origins, require_env
from rate_limit import RateLimiterMiddleware, rate_limiter
from auth import get_current_user, get_current_user_with_token
from database import init_db, get_db
from models import GenerateRequest, SaveRequest, FlyerUpdateRequest
from ai_prompts import generate_flyer_content
from flyer_renderer import render_flyer, png_to_pdf

load_dotenv = __import__("dotenv").load_dotenv
load_dotenv()

# Fail fast if critical env vars are missing
require_env(["OPENROUTER_API_KEY", "SUPABASE_JWT_SECRET"])

ALLOWED_ORIGINS = build_cors_origins()

LAUNCHPAD_URL = os.getenv("LAUNCHPAD_URL", "http://launchpad-backend:8000")
FAL_KEY = os.getenv("FAL_KEY", "")

# Vibe-specific aesthetic anchors — front-loaded because Nano Banana (Gemini)
# weighs opening phrases heaviest. This "sandbags" the style so it doesn't
# get lost in a wordy subject description.
VIBE_OVERRIDES = {
    "Modern & Sleek": (
        "Shot on 35mm film, minimalist, sharp focus, neutral palette, "
        "high-end editorial style, clean lines, architectural."
    ),
    "Whimsical": (
        "Magical realism, vibrant colors, soft diffused lighting, "
        "storybook illustration style, gentle watercolor textures."
    ),
    "Vintage Scholastic": (
        "Retro 1970s print aesthetic, halftone dots, aged paper texture, "
        "muted earth tones, warm analog film grain."
    ),
    "High-Energy": (
        "Dynamic action photography, motion blur, dramatic angles, "
        "bold graphic elements, explosive composition, vivid saturated colors."
    ),
    "Calm & Relaxing": (
        "Serene landscape photography, shallow depth of field, "
        "soft natural light, pastel tones, tranquil composition."
    ),
    "Festive": (
        "Bright cheerful photography, warm ambient lighting, "
        "colorful decorations, inviting atmosphere, joyful energy."
    ),
}

# Mandatory negative constraints appended to every image call.
# Simulates a negative prompt for models that don't support one natively.
NEGATIVE_SUFFIX = (
    "The image must be a background only. "
    "Do not include any placeholder text, labels, UI elements, or borders. "
    "No text, no letters, no words, no characters, no watermarks. "
    "Ensure the text-safe zone is clear of complex details."
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Event Flyer Studio", version="0.1.0", lifespan=lifespan)

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

async def deduct_credits_via_launchpad(token: str, action: str, app_name: str = "flyer-studio", product: str = "event-flyer-studio"):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{LAUNCHPAD_URL}/api/credits/deduct",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"action": action, "app": app_name, "product": product},
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

async def generate_background_image(prompt: str, vibe: str = "Modern & Sleek", layout: str = "poster") -> bytes:
    """Generate an image using OpenRouter Gemini 2.5 Flash Image. Returns PNG bytes."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not configured")

    vibe_prefix = VIBE_OVERRIDES.get(vibe, "")
    wrapper = (
        f"A high-quality professional background photograph: {prompt}. "
        f"Style direction: {vibe_prefix}. "
        f"Minimalist, clean composition. {NEGATIVE_SUFFIX}"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://paperlab.xyz",
                "X-Title": "Event Flyer Studio",
            },
            json={
                "model": "google/gemini-2.5-flash-image",
                "messages": [{"role": "user", "content": wrapper}],
                "modalities": ["image", "text"],
                "max_tokens": 4096,
                "image_config": {"aspect_ratio": "4:3", "image_size": "1K"},
            },
            timeout=120.0
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Image generation error {resp.status_code}: {resp.text[:500]}")

    data = resp.json()
    images = data.get("choices", [{}])[0].get("message", {}).get("images", [])
    if not images:
        raise RuntimeError("No image returned from generation API")

    image_url = images[0].get("image_url", {}).get("url", "")
    if image_url.startswith("data:image"):
        b64_data = image_url.split(",", 1)[1]
        return base64.b64decode(b64_data)
    elif image_url.startswith("http"):
        async with httpx.AsyncClient() as client:
            img_resp = await client.get(image_url, timeout=30.0)
        if img_resp.status_code != 200:
            raise RuntimeError(f"Failed to download image: {img_resp.status_code}")
        return img_resp.content
    else:
        raise RuntimeError("Invalid image URL format")

@app.post("/api/generate")
async def generate(req: GenerateRequest, auth: tuple = Depends(get_current_user_with_token)):
    user_id, token = auth
    
    # Determine action and cost
    action = "flyer_generate_with_image" if req.include_image else "flyer_generate"
    
    # Deduct credits
    await deduct_credits_via_launchpad(token, action)
    
    # Generate AI content
    content = await generate_flyer_content(
        req.event_name,
        req.event_description,
        req.theme,
        req.audience,
        req.vibe,
        req.date,
        req.time,
        req.location,
        req.layout,
    )

    # If user provided a custom background description, use it instead of the AI-generated one
    image_prompt = req.background_description.strip() if req.background_description.strip() else content["image_prompt"]

    # Save logo to temp file if provided
    logo_path = None
    if req.logo_base64:
        try:
            logo_bytes = base64.b64decode(req.logo_base64)
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                f.write(logo_bytes)
                logo_path = f.name
        except Exception:
            logo_path = None
    
    # Generate background image if requested
    image_path = None
    if req.include_image:
        try:
            img_bytes = await generate_background_image(image_prompt, vibe=req.vibe, layout=req.layout)
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                f.write(img_bytes)
                image_path = f.name
            print(f"[DEBUG] Image generated successfully: {image_path} ({len(img_bytes)} bytes)")
        except Exception as e:
            print(f"[ERROR] Image generation failed: {e}")
            image_path = None
    
    # Render flyer
    render_fields = {
        "headline": content["headline"],
        "body_text": content["body_text"],
        "cta_text": content["cta_text"],
        "date": req.date,
        "time": req.time,
        "timezone": req.timezone,
        "location": req.location,
        "website": req.website,
        "image_path": image_path,
        "logo_path": logo_path,
        "accent_color": content.get("color_suggestion", "#6366f1"),
        "vibe": req.vibe,
    }
    
    # Render fallback PNG via PIL (for download endpoint) — client renders HTML live
    png_bytes = render_flyer(render_fields, layout=req.layout)
    png_b64 = base64.b64encode(png_bytes).decode("utf-8")
    
    # Also return the raw background image as base64 for the HTML renderer
    bg_base64 = None
    if image_path and os.path.exists(image_path):
        try:
            bg_bytes = open(image_path, "rb").read()
            bg_base64 = base64.b64encode(bg_bytes).decode("utf-8")
        except Exception:
            pass
    
    # Cleanup temp files
    if image_path:
        try:
            os.unlink(image_path)
        except Exception:
            pass
    if logo_path:
        try:
            os.unlink(logo_path)
        except Exception:
            pass
    
    return {
        "headline": content["headline"],
        "body_text": content["body_text"],
        "cta_text": content["cta_text"],
        "image_prompt": content["image_prompt"],
        "accent_color": content.get("color_suggestion", "#6366f1"),
        "png_base64": png_b64,
        "background_base64": bg_base64,
        "layout": req.layout,
        "vibe": req.vibe,
        "date": req.date,
        "time": req.time,
        "timezone": req.timezone,
        "location": req.location,
        "website": req.website,
        "background_description": req.background_description,
        "logo_base64": req.logo_base64,
    }

@app.post("/api/regenerate")
async def regenerate(req: FlyerUpdateRequest, auth: tuple = Depends(get_current_user_with_token)):
    """Re-render a flyer with edited text fields. Deducts 2 credits."""
    user_id, token = auth
    await deduct_credits_via_launchpad(token, "flyer_regenerate")
    render_fields = {
        "headline": req.headline or "",
        "body_text": req.body_text or "",
        "cta_text": req.cta_text or "",
        "date": req.date or "",
        "time": req.time or "",
        "timezone": req.timezone or "",
        "location": req.location or "",
        "website": req.website or "",
        "image_path": None,
        "accent_color": req.accent_color or "#6366f1",
        "vibe": req.vibe or "Modern & Sleek",
    }
    png_bytes = render_flyer(render_fields, layout=req.layout or "poster")
    png_b64 = base64.b64encode(png_bytes).decode("utf-8")
    return {"png_base64": png_b64}

@app.post("/api/save")
async def save(req: SaveRequest, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        png_data = base64.b64decode(req.png_base64) if req.png_base64 else None
        cursor = await db.execute(
            """INSERT INTO flyers 
               (user_id, event_name, event_description, theme, audience, vibe, date, time, timezone, location, website,
                layout, include_image, headline, body_text, cta_text, image_url, png_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, req.event_name, req.event_description, req.theme, req.audience, req.vibe,
                req.date, req.time, req.timezone, req.location, req.website, req.layout, 1 if req.include_image else 0,
                req.headline, req.body_text, req.cta_text, req.image_url, png_data
            )
        )
        flyer_id = cursor.lastrowid
        await db.commit()
        return {"id": flyer_id, "message": "Saved"}
    finally:
        await db.close()

@app.get("/api/flyers")
async def list_flyers(user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, event_name, theme, vibe, date, time, location, layout, headline, created_at 
               FROM flyers WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        )
        rows = await cursor.fetchall()
        return {"flyers": [dict(r) for r in rows]}
    finally:
        await db.close()

@app.get("/api/flyers/{flyer_id}")
async def get_flyer(flyer_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM flyers WHERE id = ? AND user_id = ?", (flyer_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Flyer not found")
        result = dict(row)
        if result.get("png_data"):
            result["png_base64"] = base64.b64encode(result["png_data"]).decode("utf-8")
            del result["png_data"]
        return {"flyer": result}
    finally:
        await db.close()

@app.delete("/api/flyers/{flyer_id}")
async def delete_flyer(flyer_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        await db.execute("DELETE FROM flyers WHERE id = ? AND user_id = ?", (flyer_id, user_id))
        await db.commit()
        return {"message": "Deleted"}
    finally:
        await db.close()

@app.get("/api/flyers/{flyer_id}/download/png")
async def download_png(flyer_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT png_data, event_name FROM flyers WHERE id = ? AND user_id = ?", (flyer_id, user_id)
        )
        row = await cursor.fetchone()
        if not row or not row["png_data"]:
            raise HTTPException(404, "Flyer not found")
        return StreamingResponse(
            io.BytesIO(row["png_data"]),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=\"{row['event_name'] or 'flyer'}.png\""}
        )
    finally:
        await db.close()

@app.get("/api/flyers/{flyer_id}/download/pdf")
async def download_pdf(flyer_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT png_data, event_name FROM flyers WHERE id = ? AND user_id = ?", (flyer_id, user_id)
        )
        row = await cursor.fetchone()
        if not row or not row["png_data"]:
            raise HTTPException(404, "Flyer not found")
        pdf_bytes = png_to_pdf(row["png_data"])
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{row['event_name'] or 'flyer'}.pdf\""}
        )
    finally:
        await db.close()

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

@app.get("/api/health")
async def health():
    return {"ok": True}

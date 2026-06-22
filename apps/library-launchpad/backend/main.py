from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

load_dotenv()

from config import ALLOWED_ORIGINS, require_all
from rate_limit import RateLimiterMiddleware
from database import init_db

logger = logging.getLogger("launchpad")

require_all()

from routes.generate import router as generate_router
from routes.campaigns import router as campaigns_router
from routes.credits import router as credits_router
from services.stripe import handle_stripe_webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    from routes.generate import cleanup_temp_campaigns
    await cleanup_temp_campaigns()
    logger.info("Shutdown complete")


app = FastAPI(title="Library Launchpad", version="0.1.0", lifespan=lifespan)

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

app.include_router(generate_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(credits_router, prefix="/api")


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (payment success, subscription changes, etc.)"""
    return await handle_stripe_webhook(request)


@app.get("/api/health")
async def health():
    return {"status": "ok"}

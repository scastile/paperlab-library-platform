from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, require_all
from database import init_db
from resilience import provider_chain

from routes.patron import router as patron_router
from routes.staff import router as staff_router
from routes.stats import router as stats_router
from routes.campaigns import router as campaigns_router
from routes.settings import router as settings_router

load_dotenv = __import__("dotenv").load_dotenv
load_dotenv()

require_all()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="LibBrain", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patron_router, prefix="/api/patron")
app.include_router(staff_router, prefix="/api/staff")
app.include_router(stats_router, prefix="/api/stats")
app.include_router(campaigns_router, prefix="/api/campaigns")
app.include_router(settings_router, prefix="/api/settings")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "providers": provider_chain.get_status(),
    }


@app.get("/")
async def root():
    return {"app": "LibBrain", "version": "0.1.0"}

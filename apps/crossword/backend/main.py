"""PaperLab Daily Crossword backend.

- GET  /crossword-api/health
- GET  /crossword-api/today          → today's puzzle (clues + grid, NO answers)
- POST /crossword-api/check          → {grid: [[letter|null]]} → correctness
- GET  /crossword-api/reveal         → full answer grid
- POST /crossword-api/regenerate     → force-regenerate today (X-Admin-Token)

Generation is lazy + cached in SQLite keyed by date; the grid packer is seeded
by the date so the same day always produces the same puzzle even across
container restarts. Headlines/clues are fetched fresh on first request of the
day. If the news fetch or LLM fails, we serve yesterday's puzzle instead of a
broken one.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import ALLOWED_ORIGINS, require_all
from database import init_db, load_puzzle, save_puzzle
import clues as cluegen
import grid as gridgen
import news as newsgen

load_dotenv = __import__("dotenv").load_dotenv
load_dotenv()

require_all()

ADMIN_TOKEN = os.getenv("CROSSWORD_ADMIN_TOKEN", "")
GEN_LOCK = asyncio.Lock()


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="PaperLab Daily Crossword", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- generation ----------

async def _generate(puzzle_date: str) -> dict:
    """Fetch news, build grid, write clues, return full puzzle payload
    (including answers) for the given date. Deterministic per date."""
    headlines = await newsgen.fetch_headlines()
    if not headlines:
        raise RuntimeError("no headlines fetched")
    candidates = newsgen.extract_candidates([h["title"] for h in headlines])
    if len(candidates) < 8:
        raise RuntimeError(f"too few candidates ({len(candidates)})")

    seed = int(puzzle_date.replace("-", ""))
    # Phase 1: news words as theme. Phase 2: common fill words densify the
    # grid while preserving the theme and symmetry.
    news_words = gridgen.sanitize_words(candidates)
    grid, placed = gridgen.pack(news_words, seed=seed)
    if not grid:
        raise RuntimeError("grid pack failed")
    used = {w for (w, *_rest) in placed}
    from wordlist import FILL_WORDS
    fill_words = gridgen.sanitize_words(FILL_WORDS)
    grid2, placed2 = gridgen.pack(fill_words, seed=seed, seed_grid=grid, seed_used=used, max_attempts=20)
    if grid2:
        grid = grid2
        placed = placed + placed2
    nums, across, down = gridgen.number_grid(grid)

    # Words that actually made it into the grid (dedupe — mirrors are distinct
    # words now, but a word can appear in both an across and down run).
    words = []
    seen = set()
    for entry in across + down:
        w = entry["word"]
        if w not in seen:
            seen.add(w)
            words.append(w)

    clues_map = await cluegen.generate_clues(words, headlines)
    briefing = await cluegen.generate_briefing(headlines)

    # Assemble: entries with clue + answer (answers kept server-side).
    def entry_with_clue(e: dict) -> dict:
        w = e["word"]
        clue = clues_map.get(w)
        return {
            "num": e["num"],
            "len": e["len"],
            "row": e["row"],
            "col": e["col"],
            "clue": clue or f"News term ({e['len']} letters)",
            "answer": w,
        }

    payload = {
        "date": puzzle_date,
        "size": gridgen.SIZE,
        "grid": [[cell if cell != "" else None for cell in row] for row in grid],
        "across": [entry_with_clue(e) for e in across],
        "down": [entry_with_clue(e) for e in down],
        "briefing": briefing,
        "sources": sorted({h["source"] for h in headlines}),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return payload


async def _get_or_generate(puzzle_date: str, force: bool = False) -> dict:
    async with GEN_LOCK:
        if not force:
            existing = await load_puzzle(puzzle_date)
            if existing:
                return existing
        try:
            payload = await _generate(puzzle_date)
        except Exception:
            # Fall back to the most recent stored puzzle rather than a 500.
            existing = await load_puzzle(puzzle_date)
            if existing:
                return existing
            raise
        await save_puzzle(puzzle_date, payload)
        return payload


def _public(payload: dict) -> dict:
    """Strip answers from a stored payload for the public /today response."""
    grid_rows = []
    for row in payload["grid"]:
        grid_rows.append([{"black": cell is None} for cell in row])
    # Number map: which cells carry a number
    size = payload["size"]
    numbers = [[0] * size for _ in range(size)]
    for e in payload["across"] + payload["down"]:
        numbers[e["row"]][e["col"]] = e["num"]
    for r in range(size):
        for c in range(size):
            grid_rows[r][c]["num"] = numbers[r][c]

    return {
        "date": payload["date"],
        "size": size,
        "grid": grid_rows,
        "across": [{"num": e["num"], "len": e["len"], "clue": e["clue"]} for e in payload["across"]],
        "down": [{"num": e["num"], "len": e["len"], "clue": e["clue"]} for e in payload["down"]],
        "briefing": payload["briefing"],
        "sources": payload.get("sources", []),
    }


# ---------- routes ----------

@app.get("/crossword-api/health")
async def health():
    return {"status": "ok", "service": "crossword"}


@app.get("/crossword-api/today")
async def today():
    try:
        payload = await _get_or_generate(_today())
        return _public(payload)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"puzzle unavailable: {e}")


class CheckRequest(BaseModel):
    grid: list[list[str | None]]


@app.post("/crossword-api/check")
async def check(req: CheckRequest):
    payload = await _get_or_generate(_today())
    expected = payload["grid"]
    size = payload["size"]
    if len(req.grid) != size or any(len(r) != size for r in req.grid):
        raise HTTPException(status_code=400, detail=f"grid must be {size}x{size}")
    correct = []
    solved = True
    for r in range(size):
        row_res = []
        for c in range(size):
            if expected[r][c] is None:
                row_res.append(True)
                continue
            guess = (req.grid[r][c] or "").strip().upper()
            if guess == expected[r][c]:
                row_res.append(True)
            else:
                row_res.append(False)
                solved = False
        correct.append(row_res)
    return {"correct": correct, "solved": solved}


@app.get("/crossword-api/reveal")
async def reveal():
    payload = await _get_or_generate(_today())
    return {"date": payload["date"], "size": payload["size"], "answers": payload["grid"]}


@app.post("/crossword-api/regenerate")
async def regenerate(x_admin_token: str = Header(default="")):
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    payload = await _get_or_generate(_today(), force=True)
    return {"status": "ok", "date": payload["date"]}


@app.get("/")
async def root():
    return {"app": "PaperLab Daily Crossword", "version": "0.1.0"}

"""SQLite storage for daily crossword puzzles.

One row per puzzle date: date TEXT PK, payload JSON (full puzzle incl. answers),
created_at. The public /today endpoint strips answers; check/reveal read them
from the stored payload so answers never leak client-side.
"""
import json
import os
import time

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "/app/data/crosswords.db")


async def get_conn() -> aiosqlite.Connection:
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    return conn


async def init_db():
    conn = await get_conn()
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS puzzles (
            date TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        """
    )
    await conn.commit()
    await conn.close()


async def save_puzzle(puzzle_date: str, payload: dict):
    conn = await get_conn()
    await conn.execute(
        "INSERT INTO puzzles (date, payload, created_at) VALUES (?, ?, ?) "
        "ON CONFLICT(date) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at",
        (puzzle_date, json.dumps(payload), int(time.time())),
    )
    await conn.commit()
    await conn.close()


async def load_puzzle(puzzle_date: str) -> dict | None:
    conn = await get_conn()
    cur = await conn.execute("SELECT payload FROM puzzles WHERE date = ?", (puzzle_date,))
    row = await cur.fetchone()
    await conn.close()
    return json.loads(row["payload"]) if row else None

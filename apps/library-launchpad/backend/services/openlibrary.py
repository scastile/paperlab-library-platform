import httpx
import re

BASE_URL = "https://openlibrary.org"

# Titles matching these patterns are garbage (summaries, study guides, bundles)
JUNK_PATTERNS = re.compile(
    r"(summary|study guide|collection set|collection bundle|3 books|2 books|books collection|"
    r"breakdown|analysis|quickread|quick read|speedread|recap|synopsis|"
    r"book analysis|book summary|critical analysis|reading guide|teaching guide|"
    r"companion|cliffnotes|cliff notes|barron's|sparknotes)",
    re.IGNORECASE,
)

# Known repackage publishers that just reprint summaries
REPACKAGE_AUTHORS = {"ozbon publishing", "moscow press", "summary hub", "leodegar colson",
                     "victoria anderson", "supersummary", "thomas conway", "independently published"}


def _is_junk_result(doc: dict) -> bool:
    """Filter out summaries, study guides, and bundle editions."""
    title = doc.get("title", "")
    authors = {a.lower() for a in doc.get("author_name", [])}

    if JUNK_PATTERNS.search(title):
        return True

    if authors & REPACKAGE_AUTHORS:
        return True

    for author in doc.get("author_name", []):
        if author.lower().startswith(("summary of", "study guide")):
            return True

    return False


def _extract_work_key(doc: dict) -> str:
    """Extract the work key (OL...W) for deduplication."""
    key = doc.get("key", "")
    if key.startswith("/works/"):
        return key
    work_keys = doc.get("work_key", [])
    if work_keys:
        return f"/works/{work_keys[0]}"
    return key


async def search_openlibrary(query: str, limit: int = 10) -> list[dict]:
    """Raw search — returns results without filtering. For lookups of specific titles."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}/search.json",
            params={"q": query, "limit": limit},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for doc in data.get("docs", []):
        cover_id = doc.get("cover_i")
        results.append({
            "title": doc.get("title", "Unknown"),
            "author": ", ".join(doc.get("author_name", ["Unknown"])),
            "media_type": "book",
            "cover_url": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
            "openlibrary_key": doc.get("key", ""),
        })
    return results


async def search_media(topic: str, limit: int = 8) -> list[dict]:
    """Search Open Library for books related to a topic.
    Deduplicates by work and filters out summaries/study guides/bundles."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}/search.json",
            params={"q": topic, "limit": limit * 3},  # over-fetch, then filter
        )
        resp.raise_for_status()
        data = resp.json()

    seen_works: set[str] = set()
    results = []
    for doc in data.get("docs", []):
        if _is_junk_result(doc):
            continue

        work_key = _extract_work_key(doc)
        if work_key in seen_works:
            continue
        seen_works.add(work_key)

        cover_id = doc.get("cover_i")
        results.append({
            "title": doc.get("title", "Unknown"),
            "author": ", ".join(doc.get("author_name", ["Unknown"])),
            "media_type": "book",
            "cover_url": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
            "openlibrary_key": doc.get("key", ""),
        })

        if len(results) >= limit:
            break

    return results

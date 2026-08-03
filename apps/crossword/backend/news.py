"""News intake for the daily crossword.

Fetches top headlines from free RSS feeds (no API keys), dedupes, extracts
candidate answer words (proper nouns + key terms), and builds a brief summary
of the day's top stories via the LLM (used as puzzle context).

Feeds are chosen for reliability + no auth:
- BBC World
- NPR News
- The Guardian World
- Al Jazeera
- Reuters World (via feedburner-free RSS)
"""
import asyncio
import html
import re
import xml.etree.ElementTree as ET

import httpx

FEEDS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.npr.org/1001/rss.xml",
    "https://www.theguardian.com/world/rss",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://feeds.reuters.com/reuters/worldNews",
]

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "for",
    "with", "from", "by", "as", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would", "can", "could",
    "should", "may", "might", "must", "it", "its", "this", "that", "these",
    "those", "i", "we", "you", "they", "he", "she", "them", "their", "his",
    "her", "our", "your", "my", "not", "no", "yes", "so", "if", "then", "than",
    "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
    "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "only", "own", "same", "too", "very", "just", "about", "after",
    "against", "between", "during", "before", "above", "below", "under",
    "over", "again", "further", "once", "here", "there", "up", "down", "out",
    "off", "into", "through", "while", "still", "even", "also", "amid",
    "says", "said", "say", "told", "report", "reports", "reported", "new",
    "news", "year", "years", "day", "days", "week", "weeks", "month", "months",
    "one", "two", "three", "first", "last", "next", "top", "world", "global",
    "make", "makes", "made", "take", "takes", "took", "get", "gets", "got",
    "go", "goes", "went", "come", "comes", "came", "see", "sees", "saw",
    "know", "knows", "knew", "like", "want", "needs", "need", "show", "shows",
    "showed", "back", "again", "after", "before", "amid", "over", "under",
}

WORD_RE = re.compile(r"[A-Za-z][A-Za-z']{2,}")


async def fetch_headlines(timeout: float = 12.0, limit_per_feed: int = 15) -> list[dict]:
    """Fetch headlines from all feeds. Returns [{title, source, link}]."""
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0 (PaperLab crossword bot)"}) as client:
        async def grab(url):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp.text
            except Exception:
                return None

        results = await asyncio.gather(*[grab(f) for f in FEEDS])
    items = []
    seen = set()
    for i, text in enumerate(results):
        if not text:
            continue
        source = FEEDS[i].split("/")[2].replace("www.", "").split(".")[0]
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            continue
        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            if title_el is None or not title_el.text:
                continue
            title = html.unescape(title_el.text).strip()
            key = title.lower()
            if key in seen or len(title) < 25:
                continue
            seen.add(key)
            items.append({"title": title, "source": source, "link": link_el.text if link_el is not None else ""})
            if len(items) >= limit_per_feed * len(FEEDS):
                break
    return items


def extract_candidates(headlines: list[str], max_words: int = 60) -> list[str]:
    """Extract candidate answer words from headlines.

    Scores tokens by frequency + proper-noun bonus + length preference, then
    returns the top `max_words` as uppercase alpha-only words (3-15 chars).
    """
    scores: dict[str, int] = {}
    freq: dict[str, int] = {}
    for title in headlines:
        tokens = WORD_RE.findall(title)
        for i, tok in enumerate(tokens):
            word = tok.strip("'").lower()
            if len(word) < 3 or len(word) > 15 or word in STOPWORDS or not word.isalpha():
                continue
            freq[word] = freq.get(word, 0) + 1
            # Proper noun bonus: capitalized mid-title (not first word)
            if i > 0 and tok[0].isupper():
                scores[word] = scores.get(word, 0) + 3
            scores[word] = scores.get(word, 0) + 1
    ranked = sorted(scores, key=lambda w: (scores[w] + freq[w], len(w)), reverse=True)
    return [w.upper() for w in ranked[:max_words]]


def summarize_brief(headlines: list[dict], limit: int = 8) -> str:
    """Plain-text brief of the day's top stories (no LLM — cheap fallback)."""
    lines = []
    for h in headlines[:limit]:
        src = h["source"]
        lines.append(f"- [{src}] {h['title']}")
    return "\n".join(lines)

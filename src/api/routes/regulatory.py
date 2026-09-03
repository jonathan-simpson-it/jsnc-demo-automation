"""Regulatory Radar API endpoints."""

from datetime import datetime

from fastapi import APIRouter

from src.core import database as db
from src.regulatory import scheduler

router = APIRouter()

# Per-regulator limit and kind preference for cross-category duplicates
# (SFC publishes most items into "all news" AND a sub-category, so the same
# refNo can appear under several kinds — keep the most specific one).
FEED_PER_REGULATOR = 10
_KIND_PRIORITY = {
    "enforcement news": 4,
    "corporate news": 3,
    "news": 2,
    "press release": 1,
    "speech": 1,
    "circular": 0,
}


def _date_sort_key(issued_at: str | None):
    if not issued_at:
        return datetime.min
    value = issued_at.strip()
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return datetime.min


def _regulator_top(items: list[dict], limit: int = FEED_PER_REGULATOR) -> list[dict]:
    """Deduplicate by external id (prefer specific kinds), keep newest first."""
    best: dict[tuple[str, str], dict] = {}
    for item in items:
        key = (item.get("regulator") or "", item.get("external_id") or "")
        if not key[0] or not key[1]:
            continue
        existing = best.get(key)
        priority = _KIND_PRIORITY.get((item.get("kind") or "").lower(), 0)
        if existing is None or priority > _KIND_PRIORITY.get(
            (existing.get("kind") or "").lower(), 0
        ):
            best[key] = item
    ordered = sorted(
        best.values(),
        key=lambda it: _date_sort_key(it.get("issued_at")),
        reverse=True,
    )
    return ordered[:limit]


@router.post("/poll")
async def poll_now() -> dict:
    """Run one fetch + ingest cycle on demand."""
    return scheduler.poll_cycle()


@router.get("/status")
async def radar_status() -> dict:
    return scheduler.get_state()


@router.get("/feed")
async def radar_feed() -> dict:
    """Feed: the newest items per regulator, deduplicated across categories."""
    items = db.list_regulatory_items(limit=500)
    by_regulator: dict[str, list[dict]] = {}
    for item in items:
        by_regulator.setdefault(item.get("regulator") or "Other", []).append(item)
    result: list[dict] = []
    for regulator_items in by_regulator.values():
        result.extend(_regulator_top(regulator_items))
    return {"items": result}

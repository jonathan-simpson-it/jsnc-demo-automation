"""Regulatory Radar API endpoints."""

from fastapi import APIRouter

from src.core import database as db
from src.regulatory import scheduler

router = APIRouter()


@router.post("/poll")
async def poll_now() -> dict:
    """Run one fetch + ingest cycle on demand."""
    return scheduler.poll_cycle()


@router.get("/status")
async def radar_status() -> dict:
    return scheduler.get_state()


@router.get("/feed")
async def radar_feed(limit: int = 100) -> dict:
    items = db.list_regulatory_items(limit=limit)
    return {"items": items}

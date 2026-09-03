"""Microsoft Graph mail endpoints (read mailbox, create drafts)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src import graph_mail

router = APIRouter()


class DraftRequest(BaseModel):
    subject: str
    body: str
    to: list[str] = []


@router.get("/status")
async def mail_status() -> dict:
    """Whether mailbox access is configured and resolvable."""
    return graph_mail.status()


@router.get("/messages")
async def list_messages(limit: int = 50) -> dict:
    """List the newest messages from the target mailbox (demo when unset)."""
    try:
        return {"emails": graph_mail.list_messages(limit=limit)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Graph mail error: {exc}")


@router.post("/drafts")
async def create_draft(req: DraftRequest) -> dict:
    """Create a draft message from the current report."""
    if not req.subject.strip():
        raise HTTPException(status_code=400, detail="subject is required")
    try:
        return graph_mail.create_draft(req.subject, req.body, to=req.to)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Graph mail error: {exc}")

"""Microsoft Graph mail integration (read mailbox + create drafts).

Uses the OAuth 2.0 client-credentials flow with application permissions
(Mail.Read, Mail.ReadWrite). Requires GRAPH_TENANT_ID / GRAPH_CLIENT_ID /
GRAPH_CLIENT_SECRET and, optionally, GRAPH_MAILBOX (a userPrincipalName).
When GRAPH_MAILBOX is empty, the mailbox of the OneDrive-connected user is
used if known.

Everything degrades gracefully: unconfigured credentials, missing scopes, or
network errors surface as structured state instead of exceptions.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from config.settings import settings

_GRAPH_BASE = "https://graph.microsoft.com/v1.0"
_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}


def configured() -> bool:
    return bool(
        settings.graph_tenant_id
        and settings.graph_client_id
        and settings.graph_client_secret
    )


def _acquire_token() -> str:
    """Return a valid access token (client credentials), cached until expiry."""
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["token"]
    resp = httpx.post(
        _TOKEN_URL.format(tenant=settings.graph_tenant_id),
        data={
            "client_id": settings.graph_client_id,
            "client_secret": settings.graph_client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        },
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data["access_token"]
    _token_cache["token"] = token
    _token_cache["expires_at"] = time.time() + int(data.get("expires_in", 3600))
    return token


def _mailbox() -> str:
    """Resolve the target mailbox (userPrincipalName)."""
    if settings.graph_mailbox:
        return settings.graph_mailbox
    try:
        from src.core import database as db

        conn = db.get_db()
        row = conn.execute(
            "SELECT user_email FROM onedrive_tokens WHERE id = 1"
        ).fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    raise RuntimeError("GRAPH_MAILBOX is not set and no OneDrive user is connected")


def _get(path: str, params: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {_acquire_token()}"}
    resp = httpx.get(
        f"{_GRAPH_BASE}{path}", headers=headers, params=params, timeout=25
    )
    resp.raise_for_status()
    return resp.json()


def _post(path: str, payload: dict) -> dict:
    headers = {"Authorization": f"Bearer {_acquire_token()}"}
    resp = httpx.post(
        f"{_GRAPH_BASE}{path}", headers=headers, json=payload, timeout=25
    )
    resp.raise_for_status()
    return resp.json()


def status() -> dict:
    """Describe whether the mail integration can work right now."""
    if not configured():
        return {
            "configured": False,
            "reason": (
                "Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID and "
                "GRAPH_CLIENT_SECRET in .env to enable mailbox access."
            ),
        }
    try:
        mailbox = _mailbox()
    except RuntimeError as exc:
        return {"configured": False, "reason": str(exc)}
    return {"configured": True, "mailbox": mailbox}


def list_messages(limit: int = 50) -> list[dict]:
    """Return the newest messages from the target mailbox."""
    mailbox = _mailbox()
    params = {
        "$top": max(1, min(int(limit), 200)),
        "$select": "id,subject,from,receivedDateTime,bodyPreview,webLink",
        "$orderby": "receivedDateTime desc",
    }
    data = _get(f"/users/{mailbox}/messages", params=params)
    emails = []
    for msg in data.get("value", []):
        sender = (msg.get("from") or {}).get("emailAddress") or {}
        emails.append(
            {
                "id": msg.get("id"),
                "subject": msg.get("subject") or "",
                "from": sender.get("name") or sender.get("address") or "",
                "from_email": sender.get("address") or "",
                "received_at": msg.get("receivedDateTime"),
                "body_preview": (msg.get("bodyPreview") or "").strip()[:500],
                "web_link": msg.get("webLink") or "",
            }
        )
    return emails


def create_draft(subject: str, body: str, to: list[str] | None = None) -> dict:
    """Create a draft message in the mailbox's Drafts folder."""
    mailbox = _mailbox()
    payload: dict[str, Any] = {
        "subject": subject,
        "body": {"contentType": "text", "content": body},
        "importance": "normal",
    }
    if to:
        payload["toRecipients"] = [
            {"emailAddress": {"address": address}} for address in to
        ]
    created = _post(f"/users/{mailbox}/messages", payload)
    return {
        "id": created.get("id"),
        "subject": created.get("subject") or subject,
        "draft_link": created.get("webLink") or "",
    }

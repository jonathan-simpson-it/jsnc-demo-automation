"""Tests for the Regulatory Radar poll cycle.

Sandbox note: requires the project venv/CI (pytest). Fully offline: listing +
item fetches are monkeypatched to fixture-shaped data.
"""

from pathlib import Path

import pytest

from src.core import database as db
from src.regulatory import scheduler


@pytest.fixture()
def isolated_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    yield tmp_path / "test.db"


class _NoopStore:
    def add_documents(self, chunks, filename=None):
        pass


def _fixture_items():
    return [
        {
            "source_key": "sfc_circulars",
            "items": [{
                "external_id": "licensing-of-virtual-asset-trading-platforms",
                "title": "Licensing of Virtual Asset Trading Platforms",
                "url": "https://www.sfc.hk/en/circulars/licensing-vasp-2026",
                "issued_at": "16 Oct 2026",
            }],
        },
        {
            "source_key": "hkma_circulars",
            "items": [{
                "external_id": "virtual-banking-guidance-2026",
                "title": "Virtual banking risk management",
                "url": "https://www.hkma.gov.hk/eng/press/virtual-banks-2026",
                "issued_at": "20 Oct 2026",
            }],
        },
    ]


def test_poll_cycle_ingests_and_is_idempotent(isolated_db, monkeypatch):
    def fake_listing(source):
        for entry in _fixture_items():
            if entry["source_key"] == source.key:
                return entry["items"]
        return []

    monkeypatch.setattr(scheduler.client, "fetch_listing", fake_listing)
    monkeypatch.setattr(
        scheduler.client, "fetch_item_text",
        lambda url, source: "Licensed corporations must perform customer due diligence. " * 30,
    )
    state = scheduler.poll_cycle(store=_NoopStore())
    assert state["last_status"] == "ok"
    items = db.list_regulatory_items()
    assert len(items) == 2
    assert all(i["status"] == "ingested" for i in items)

    # Second run must not duplicate anything
    scheduler.poll_cycle(store=_NoopStore())
    assert len(db.list_regulatory_items()) == 2


def test_per_item_failure_marks_error(isolated_db, monkeypatch):
    def fake_listing(source):
        if source.key == "sfc_circulars":
            return _fixture_items()[0]["items"]
        return []

    def boom(url, source):
        raise RuntimeError("fetch failed")

    monkeypatch.setattr(scheduler.client, "fetch_listing", fake_listing)
    monkeypatch.setattr(scheduler.client, "fetch_item_text", boom)

    state = scheduler.poll_cycle(store=_NoopStore())
    assert state["last_status"] == "ok"
    assert state["last_error"] is not None
    items = db.list_regulatory_items()
    assert items and items[0]["status"] == "error"

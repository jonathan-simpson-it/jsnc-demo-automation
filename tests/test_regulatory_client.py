"""Tests for the fixture-driven regulatory client.

Sandbox note: requires the project venv/CI (pytest); runs fully offline by
forcing the fixture fallback through a raising _http_get stub.
"""

from src.regulatory.client import FetchError, fetch_item_text, fetch_listing
from src.regulatory.sources import SOURCES

BASE = "tests/fixtures/regulatory"


def _offline(url: str) -> str:
    raise FetchError("network disabled in tests")


def test_fetch_listing_sfc():
    source = next(s for s in SOURCES if s.key == "sfc_circulars")
    items = fetch_listing(source, BASE, _http_get=_offline)
    titles = [i["title"] for i in items]
    assert any("Virtual Asset Trading Platforms" in t for t in titles)
    assert any("AML/CFT screening" in t for t in titles)
    item = items[0]
    assert item["external_id"]
    assert item["url"].startswith("https://www.sfc.hk")
    assert item["issued_at"] == "16 Oct 2026"


def test_fetch_listing_hkma():
    source = next(s for s in SOURCES if s.key == "hkma_circulars")
    items = fetch_listing(source, BASE, _http_get=_offline)
    assert len(items) == 2
    assert items[0]["issued_at"] == "20 Oct 2026"


def test_fetch_item_text_from_fixture():
    source = next(s for s in SOURCES if s.key == "sfc_circulars")
    text = fetch_item_text(
        "https://www.sfc.hk/en/circulars/licensing-vasp-2026",
        source,
        BASE,
        _http_get=_offline,
    )
    assert "customer due diligence" in text.lower()
    assert "Anti-Money Laundering" in text

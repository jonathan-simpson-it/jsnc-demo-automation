"""Tests for the radar feed aggregation (per-regulator top-N, dedupe)."""

from src.api.routes.regulatory import _regulator_top


def _item(regulator, external_id, kind, issued_at):
    return {
        "regulator": regulator,
        "external_id": external_id,
        "kind": kind,
        "issued_at": issued_at,
        "title": f"{regulator}-{external_id}",
    }


def test_per_regulator_top_limit():
    rows = [_item("SFC", f"R{i}", "news", f"2026-0{(i % 9) + 1}-01") for i in range(15)]
    top = _regulator_top(rows, limit=10)
    assert len(top) == 10


def test_dedupe_prefers_specific_kind():
    rows = [
        _item("SFC", "26PR99", "news", "2026-07-01"),
        _item("SFC", "26PR99", "corporate news", "2026-07-01"),
        _item("SFC", "26PR99", "enforcement news", "2026-07-01"),
    ]
    top = _regulator_top(rows)
    assert len(top) == 1
    assert top[0]["kind"] == "enforcement news"


def test_newest_first_with_missing_dates_last():
    rows = [
        _item("HKMA", "old", "press release", "2026-01-05"),
        _item("HKMA", "none", "press release", None),
        _item("HKMA", "new", "press release", "2026-09-01"),
    ]
    top = _regulator_top(rows)
    assert [t["external_id"] for t in top] == ["new", "old", "none"]


def test_legacy_text_dates_are_sorted():
    rows = [
        _item("HKMA", "a", "press release", "20 Oct 2026"),
        _item("HKMA", "b", "press release", "01 Oct 2026"),
    ]
    top = _regulator_top(rows)
    assert [t["external_id"] for t in top] == ["a", "b"]

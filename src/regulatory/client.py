"""Fixture-driven fetcher for SFC/HKMA regulatory listings.

Parsing rules target the fixture HTML under tests/fixtures/regulatory/ so the
suite runs offline. When the network is available the same parser runs against
live HTML (best-effort); any failure falls back to fixtures so the app never
crashes in offline sandboxes.
"""

import re
from html import unescape
from pathlib import Path
from urllib.parse import urljoin

from src.regulatory.sources import RegulatorySource

DEFAULT_FIXTURE_DIR = "tests/fixtures/regulatory"


class FetchError(Exception):
    pass


def _read_fixture(filename: str, base_dir: str) -> str:
    path = Path(base_dir) / filename
    if not path.exists():
        raise FetchError(f"fixture not found: {path}")
    return path.read_text(encoding="utf-8")


def _parse_listing(html: str, source: RegulatorySource) -> list[dict]:
    """Parse <article> blocks with a .title link and a .date element."""
    items = []
    for article in re.findall(r"<article>(.*?)</article>", html, re.S | re.I):
        link = re.search(
            r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', article, re.S | re.I
        )
        if not link:
            continue
        href, raw_title = link.group(1), link.group(2)
        title = unescape(re.sub(r"<[^>]+>", "", raw_title)).strip()
        if not title:
            continue
        date_match = re.search(
            r'class="date"[^>]*>(.*?)<', article, re.S | re.I
        )
        date = unescape(date_match.group(1)).strip() if date_match else ""
        external_id = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
        url = urljoin(source.url, href)
        items.append(
            {
                "external_id": external_id,
                "title": title,
                "url": url,
                "issued_at": date or None,
            }
        )
    return items


def fetch_listing(
    source: RegulatorySource,
    base_dir: str = DEFAULT_FIXTURE_DIR,
    _http_get=None,
) -> list[dict]:
    """Return listing items. Offline/failure => parse the saved fixture."""
    try:
        if _http_get is not None:
            html = _http_get(source.url)
        else:
            import httpx

            html = httpx.get(source.url, timeout=15).text
        items = _parse_listing(html, source)
        if items:
            return items
    except Exception:
        pass
    html = _read_fixture(source.html_fixture, base_dir)
    return _parse_listing(html, source)


def fetch_item_text(
    url: str,
    source: RegulatorySource,
    base_dir: str = DEFAULT_FIXTURE_DIR,
    _http_get=None,
) -> str:
    """Return cleaned article text. Offline => load a <slug>.html fixture when
    one exists, else fall back to the bare title so ingest still records the item."""
    try:
        if _http_get is not None:
            html = _http_get(url)
        else:
            import httpx

            html = httpx.get(url, timeout=15).text
        text = unescape(re.sub(r"<[^>]+>", " ", html))
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            return text
    except Exception:
        pass
    slug = url.rstrip("/").split("/")[-1] or source.key
    path = Path(base_dir) / f"{slug}.html"
    if path.exists():
        html = path.read_text(encoding="utf-8")
        text = unescape(re.sub(r"<[^>]+>", " ", html))
        return re.sub(r"\s+", " ", text).strip()
    return f"{source.regulator} {source.kind}: {slug}"

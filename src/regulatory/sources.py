"""Regulatory Radar: SFC/HKMA source configuration.

Sources cover the news hubs the Radar page cares about:

- SFC "News and announcements" family (https://www.sfc.hk/en/News-and-announcements):
  the site renders its lists client-side, so these are fetched through the
  same JSON search API the site uses (mode="sfc_api", one source per category:
  all / corporate / enforcement / other).
- SFC circulars page: server-rendered HTML (mode="html", fixture-backed).
- HKMA news hub (https://www.hkma.gov.hk/eng/news-and-media/): server-rendered
  HTML; the hub's subsections (press releases, speeches) are scraped as
  "hkma_html" list pages discovered from the hub itself.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class RegulatorySource:
    key: str
    regulator: str
    kind: str
    url: str
    # Fetch strategy: "html" (parse <article> markup), "hkma_html" (new HKMA
    # news lists, hub + subsections), or "sfc_api" (SFC JSON search API).
    mode: str = "html"
    # SFC search category used by the news API (mode="sfc_api").
    category: str = ""
    # HKMA hub subsection path fragments to scrape (mode="hkma_html").
    subsections: tuple[str, ...] = ()
    html_fixture: str = ""


SOURCES = [
    # --- SFC: News and announcements (multiple sections, JSON API) ---
    RegulatorySource(
        key="sfc_news",
        regulator="SFC",
        kind="news",
        url="https://www.sfc.hk/en/News-and-announcements/News/All-news",
        mode="sfc_api",
        category="all",
    ),
    RegulatorySource(
        key="sfc_corporate_news",
        regulator="SFC",
        kind="corporate news",
        url="https://www.sfc.hk/en/News-and-announcements/News/Corporate-news",
        mode="sfc_api",
        category="corporate",
    ),
    RegulatorySource(
        key="sfc_enforcement_news",
        regulator="SFC",
        kind="enforcement news",
        url="https://www.sfc.hk/en/News-and-announcements/News/Enforcement-news",
        mode="sfc_api",
        category="enforcement",
    ),
    RegulatorySource(
        key="sfc_other_news",
        regulator="SFC",
        kind="other news",
        url="https://www.sfc.hk/en/News-and-announcements/News/Other-news",
        mode="sfc_api",
        category="other",
    ),
    # --- SFC: circulars (server-rendered page + fixture) ---
    RegulatorySource(
        key="sfc_circulars",
        regulator="SFC",
        kind="circular",
        url="https://www.sfc.hk/en/Regulatory-functions/Intermediaries/Circulars-to-licensed-corporations",
        mode="html",
        html_fixture="sfc_circulars_list.html",
    ),
    # --- HKMA: news hub (server-rendered HTML lists) ---
    RegulatorySource(
        key="hkma_news",
        regulator="HKMA",
        kind="press release",
        url="https://www.hkma.gov.hk/eng/news-and-media/",
        mode="hkma_html",
        subsections=("press-releases", "speeches"),
        html_fixture="hkma_press_list.html",
    ),
    # --- HKMA: legacy press-release page (kept for fixture/offline support) ---
    RegulatorySource(
        key="hkma_circulars",
        regulator="HKMA",
        kind="press release",
        url="https://www.hkma.gov.hk/eng/key-information/press-releases/",
        mode="html",
        html_fixture="hkma_press_list.html",
    ),
]

# HKMA subsection -> human category label (drives feed `kind` per item).
HKMA_SUBSECTION_KINDS = {
    "press-releases": "press release",
    "speeches": "speech",
}


def source_by_key(key: str) -> RegulatorySource | None:
    return next((s for s in SOURCES if s.key == key), None)

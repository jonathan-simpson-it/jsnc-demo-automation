"""Regulatory Radar: SFC/HKMA source configuration."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RegulatorySource:
    key: str
    regulator: str
    kind: str
    url: str
    html_fixture: str


SOURCES = [
    RegulatorySource(
        key="sfc_circulars",
        regulator="SFC",
        kind="circular",
        url="https://www.sfc.hk/en/Regulatory-functions/Intermediaries/Circulars-to-licensed-corporations",
        html_fixture="sfc_circulars_list.html",
    ),
    RegulatorySource(
        key="hkma_circulars",
        regulator="HKMA",
        kind="press release",
        url="https://www.hkma.gov.hk/eng/key-information/press-releases/",
        html_fixture="hkma_press_list.html",
    ),
]


def source_by_key(key: str) -> RegulatorySource | None:
    return next((s for s in SOURCES if s.key == key), None)

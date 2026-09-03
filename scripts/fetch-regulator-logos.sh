#!/bin/bash
# Fetches official SFC and HKMA logos. Sources verified 2026-09-03 from each
# regulator's own homepage. Requires one-time internet access.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/frontend/public/pictures" "$ROOT/web/public/pictures"

fetch() { # $1=url  $2=outfile
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL --max-time 30 -A "Mozilla/5.0" "$1" -o "$tmp/raw"
  cp "$tmp/raw" "$2"; rm -rf "$tmp"
}

# SFC header logo (official site header asset, verified live 2026-09-03)
fetch "https://www.sfc.hk/assets/images/common/logo.svg" \
      "$ROOT/frontend/public/pictures/sfc-logo.svg"
# HKMA site header logo (official, verified live 2026-09-03)
fetch "https://www.hkma.gov.hk/statics/assets/img/logo.jpg" \
      "$ROOT/frontend/public/pictures/hkma-logo.jpg"
echo "done"

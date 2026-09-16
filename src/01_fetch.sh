#!/usr/bin/env bash
# Download every input into .cache/ (gitignored). Idempotent.
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p .cache; cd .cache
clone(){ [ -d "$2" ] || git clone --depth 1 -q "https://github.com/$1.git" "$2"; }
clone datanews/license-plates         ny-2010-2014     # NY accepted/rejected plates + Red Guide
clone veltman/ca-license-plates        ca-2015-2016     # CA flagged applications with reviewer comments
clone dannguyen/dmv-vanity-plate-rejections collection  # governmentattic.org 2012 lists + MuckRock CA 2012-13
# Texas 2025 declined plates. TxDMV posted it; the only copy found is FOX 4's re-host.
[ -s tx2025.pdf ] || curl -sfL -A "Mozilla/5.0" -o tx2025.pdf \
  "https://static.fox4news.com/www.fox4news.com/content/uploads/2026/01/denied_plate_selections_cy2025.pdf"
ls -la

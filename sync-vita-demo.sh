#!/usr/bin/env bash
# Stage the vita-breakout "Act III" overlay bundle (the HENlo chain + payload)
# under ./vita/ so old.html can fire it on a real PS Vita. The website repo never
# commits these (see .gitignore) — this is the deploy-time copy step. Production
# must serve the same five files at the vita/ path beside old.html.
#
# Usage: ./sync-vita-demo.sh [path-to-vita-breakout/henlo]
set -euo pipefail

SRC="${1:-../vita-breakout/henlo}"
DEST="$(cd "$(dirname "$0")" && pwd)/vita"

if [ ! -d "$SRC" ]; then
  echo "error: HENlo bundle dir not found: $SRC" >&2
  echo "pass the path to vita-breakout/henlo as the first argument." >&2
  exit 1
fi

mkdir -p "$DEST"
for f in exploit.js kernel.js jsos.js offsets.js payload.bin; do
  if [ ! -f "$SRC/$f" ]; then
    echo "error: missing $f in $SRC" >&2
    echo "(build payload.bin first — see the vita-breakout README)" >&2
    exit 1
  fi
  cp "$SRC/$f" "$DEST/$f"
done

echo "staged $(ls -1 "$DEST" | wc -l | tr -d ' ') files into $DEST"
echo "serve the site (python3 -m http.server 8000) and open old.html on a FW 3.65 Vita."

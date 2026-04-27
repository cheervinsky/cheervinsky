#!/usr/bin/env bash
# Rebuilds build/app.bundle.js from data/*.js + components/*.jsx
# Run this any time you edit a .jsx or data/*.js file.
#
# Usage:  ./build.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HERE/build"

# Find esbuild — try the global path first, then anywhere on PATH.
ESBUILD=""
for c in \
  "/usr/local/lib/node_modules_global/lib/node_modules/tsx/node_modules/.bin/esbuild" \
  "$(command -v esbuild || true)" \
  "$(command -v npx >/dev/null && echo "npx --yes esbuild" || true)"; do
  if [ -n "$c" ]; then ESBUILD="$c"; break; fi
done
if [ -z "$ESBUILD" ]; then
  echo "Could not find esbuild. Install with: npm install -g esbuild" >&2
  exit 1
fi

TMP="$(mktemp -t cheer-bundle.XXXXXX.jsx)"
cat \
  "$HERE/data/defaults.js" \
  "$HERE/data/sync.js" \
  "$HERE/data/media.js" \
  "$HERE/data/store.js" \
  "$HERE/components/shared.jsx" \
  "$HERE/components/home.jsx" \
  "$HERE/components/pages.jsx" \
  "$HERE/components/app.jsx" \
  > "$TMP"

$ESBUILD --loader:.jsx=jsx --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment "$TMP" > "$HERE/build/app.bundle.js"
rm -f "$TMP"
echo "Wrote $HERE/build/app.bundle.js ($(wc -l < "$HERE/build/app.bundle.js") lines)."

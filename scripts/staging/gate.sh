#!/usr/bin/env bash
# Stand up staging exactly as run.sh does, then put it through the eleven
# production readiness checks. Same cluster, same data, nothing live touched.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$ROOT/scripts/staging/run.sh" >/dev/null
DATABASE_URL="postgres://shrs@127.0.0.1:${SHRS_STAGING_PORT:-55432}/shrs_staging" \
  node "$ROOT/scripts/staging/readiness-gate.mjs"

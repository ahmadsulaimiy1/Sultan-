#!/usr/bin/env bash
# Stand up a throwaway staging database, load the real schema and the real
# certificates into it, and run the public verification endpoint against it.
#
#     ./scripts/staging/run.sh
#
# WHY THIS EXISTS. Every certificate defect this project has shipped was
# invisible in the code and obvious the moment real rows sat in a real
# database. Two were found the first time this script ran, on 15 August 2026,
# and neither could be reproduced against the thirteen certificates alone —
# they needed the graduation batches loaded beside them.
#
# It touches NOTHING live. The cluster is created fresh under /var/lib/
# postgresql/shrs-staging, listens on 127.0.0.1:55432, and is dropped by
# `pg_ctl stop`. No production credential is read and none is needed: the
# signing key below is a scratch value, and staging must never hold the real
# one — a database that can mint an authentic certificate is not a staging
# database.
set -euo pipefail

PORT="${SHRS_STAGING_PORT:-55432}"
PGDATA="${SHRS_STAGING_PGDATA:-/var/lib/postgresql/shrs-staging}"
PGBIN="${SHRS_PGBIN:-/usr/lib/postgresql/16/bin}"
DB="shrs_staging"
KEY="${SHRS_STAGING_KEY:-preflight-test-only-0001}"
KEYVER="${SHRS_STAGING_KEY_VERSION:-3}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
URL="postgres://shrs@127.0.0.1:${PORT}/${DB}"

echo "── cluster ──────────────────────────────────────────────"
if ! "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" -q 2>/dev/null; then
  rm -rf "$PGDATA"; mkdir -p "$PGDATA" /var/run/postgresql
  chown postgres:postgres "$PGDATA" /var/run/postgresql
  su postgres -c "$PGBIN/initdb -D $PGDATA -U shrs --auth=trust -E UTF8" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PORT -c listen_addresses=127.0.0.1' -l $PGDATA/log start" >/dev/null
  sleep 2
fi
psql -h 127.0.0.1 -p "$PORT" -U shrs -d postgres -qc "DROP DATABASE IF EXISTS $DB;"
psql -h 127.0.0.1 -p "$PORT" -U shrs -d postgres -qc "CREATE DATABASE $DB;"
echo "  up on 127.0.0.1:$PORT"

echo "── schema ───────────────────────────────────────────────"
# NOT >/dev/null 2>&1. That is how a broken schema hid here on 15 August 2026:
# a foreign key referencing a table defined 900 lines later made CREATE TABLE
# verification_log fail, the error went to the void, and the harness reported a
# healthy database with no audit table in it. Errors are shown, and a missing
# table is a hard stop.
psql -q "$URL" -f "$ROOT/sql/schema.sql" 2>&1 | grep -E '^psql:.*ERROR' && { echo "  SCHEMA ERRORS ABOVE — refusing to continue"; exit 1; }
echo "  $(psql -tA "$URL" -c "select count(*) from information_schema.tables where table_schema='public';") tables"
for t in stage_certificates verification_log student_identity_names; do
  psql -tA "$URL" -c "select to_regclass('public.$t');" | grep -q "^$t$" \
    || { echo "  MISSING TABLE: $t — the schema did not apply cleanly"; exit 1; }
done

echo "── certificates ─────────────────────────────────────────"
# The thirteen already issued, verbatim from the production import, so the
# regression check runs against the real rows and not a reconstruction.
psql -q "$URL" -f "$ROOT/docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql" >/dev/null
# Every batch currently built. A batch that is HELD for a missing Arabic name
# or an unrecorded award simply is not on disk, so it is not loaded — the
# harness reports what exists rather than pretending the set is complete.
for f in "$ROOT"/dist/certificates/*/register-*.sql "$ROOT"/dist/certificates/*/graduation-register.sql; do
  [ -e "$f" ] || continue
  case "$f" in *IBT-000014*|*IBT-000035*) continue;; esac   # already in the import
  psql -q "$URL" -f "$f" >/dev/null
done
echo "  $(psql -tA "$URL" -c 'select count(*) from stage_certificates;') rows, sequence $(psql -tA "$URL" -c 'select min(id)||E'"'"'-'"'"'||max(id) from stage_certificates;')"

# The identity name history, derived from the same two sources everything else
# reads. Loaded here so the historical-name note is exercised, not assumed.
# The Institution Credential IDs, pinned from the sealed registers rather than
# left at the column's database default — the same file the deployment applies.
psql -q "$URL" -f "$ROOT/docs/graduation-registers/2026-08-15-CREDENTIAL-IDS.sql" >/dev/null
echo "  $(psql -tA "$URL" -c 'select count(distinct credential_id) from stage_certificates;') distinct credential ids"

psql -q "$URL" -f "$ROOT/docs/graduation-registers/2026-08-15-IDENTITY-NAMES.sql" >/dev/null
echo "  $(psql -tA "$URL" -c 'select count(*) from student_identity_names;') identity names, $(psql -tA "$URL" -c 'select count(*) from student_identity_names where not is_current;') historical"

echo
DATABASE_URL="$URL" DOCUMENT_HASH_SECRET="$KEY" DOCUMENT_HASH_KEY_VERSION="$KEYVER" \
  node --import "$ROOT/scripts/staging/register.mjs" "$ROOT/scripts/staging/staging-test.mjs"

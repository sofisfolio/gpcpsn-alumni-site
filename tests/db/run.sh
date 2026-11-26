#!/usr/bin/env bash
# Runs the migrations and security tests against a throw-away local PostgreSQL (needs postgresql + psql, run as root or postgres).
# Usage: tests/db/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
DIR=/tmp/gpcpsn-pgtest; PORT=54329
pkill -f "postgres.*$DIR" 2>/dev/null || true; sleep 1
rm -rf "$DIR"; mkdir -p "$DIR"; chown postgres "$DIR"
su postgres -c "$PGBIN/initdb -D $DIR/data -A trust >/dev/null"
su postgres -c "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start >/dev/null"
trap 'su postgres -c "$PGBIN/pg_ctl -D $DIR/data -m immediate stop >/dev/null" || true' EXIT
PSQL=(psql -h "$DIR" -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$HERE/00_supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "applying $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$HERE/10_security_tests.sql" -P pager=off

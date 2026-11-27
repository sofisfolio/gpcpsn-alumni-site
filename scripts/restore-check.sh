#!/usr/bin/env bash
# Decrypts a backup and (optionally) loads db.sql into a throw-away local database to prove it restores.
# usage: BACKUP_PASSPHRASE=... scripts/restore-check.sh file.tgz.gpg [postgres-url-of-EMPTY-test-db]
set -euo pipefail
F="$1"; DB="${2:-}"; D=$(mktemp -d)
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d "$F" | tar -xz -C "$D"
echo "db.sql: $(wc -l < "$D/db.sql") lines; files listed: $(wc -l < "$D/files.txt")"
if [ -n "$DB" ]; then psql "$DB" -v ON_ERROR_STOP=0 -q -f "$D/db.sql" >/dev/null 2>"$D/err.txt" || true
  psql "$DB" -At -c "select 'profiles', count(*) from public.profiles"; echo "errors: $(grep -c ERROR "$D/err.txt" || true)"; fi
echo "extracted to $D"

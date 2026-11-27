#!/usr/bin/env bash
# Encrypted backup of database (public + auth schemas) and public storage files.
# Needs: SUPABASE_DB_URL, BACKUP_PASSPHRASE, pg_dump >= 17, gpg, curl, jq
# Optional: PUBLIC_API_URL (default project URL), PUBLIC_KEY
set -euo pipefail
: "${SUPABASE_DB_URL:?}"; : "${BACKUP_PASSPHRASE:?}"
OUT="${1:-backup-out}"; STAMP=$(date -u +%Y%m%d-%H%M%S)
WORK=$(mktemp -d); mkdir -p "$OUT"
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --schema=public --schema=private --schema=auth \
  --exclude-table-data='auth.sessions' --exclude-table-data='auth.refresh_tokens' \
  -f "$WORK/db.sql"
mkdir -p "$WORK/files"; : > "$WORK/storage-meta.sql"; : > "$WORK/files.txt"
# data-only copy (used for restoring into a fresh project after the migrations have been applied)
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --data-only --disable-triggers --schema=public --schema=auth \
  --exclude-table-data='auth.sessions' --exclude-table-data='auth.refresh_tokens' -f "$WORK/data.sql"
# storage objects list (metadata) so files can be re-uploaded
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --data-only --table=storage.objects --table=storage.buckets \
  -f "$WORK/storage-meta.sql" 2>/dev/null || true
API="${PUBLIC_API_URL:-https://sllpahrgmhqvchufiugf.supabase.co}"
mkdir -p "$WORK/files"
psql "$SUPABASE_DB_URL" -At -c "select bucket_id||'/'||name from storage.objects" > "$WORK/files.txt" || true
while IFS= read -r p; do
  [ -z "$p" ] && continue
  mkdir -p "$WORK/files/$(dirname "$p")"
  curl -sf --retry 2 "$API/storage/v1/object/public/$p" -o "$WORK/files/$p" || echo "skip $p" >&2
done < "$WORK/files.txt"
tar -C "$WORK" -czf "$WORK/bundle.tgz" db.sql data.sql storage-meta.sql files.txt files
gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" \
  --symmetric --cipher-algo AES256 -o "$OUT/gpcpsn-backup-$STAMP.tgz.gpg" "$WORK/bundle.tgz"
rm -rf "$WORK"; ls -l "$OUT"

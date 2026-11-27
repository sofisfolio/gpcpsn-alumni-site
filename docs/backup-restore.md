# Keep-alive, backups and restore

## 1. Keep-alive (stops the free database pausing)
`.github/workflows/keepalive.yml` queries the database every 2 days and, once a month, commits a tiny file so
GitHub never disables the schedule (GitHub switches off scheduled jobs after 60 days without repo activity).
Nothing to configure. Check: GitHub repo → **Actions** → "Keep database awake" → green ticks.
Workflows only run from the **default branch (`main`)**, so our work must be merged into `main`.

## 2. Encrypted backups (Sunday and Wednesday)
`.github/workflows/backup.yml` runs `scripts/backup.sh`: database (public, private, auth), a data-only copy and all
public files (photos), packed into one AES-256 encrypted file. It is kept 30 days as a workflow artifact
(the repo is public, so the file is encrypted: without the passphrase it is unreadable).

### One-time setup (about 5 minutes, you must do this yourself)
1. Supabase → **Connect** (top bar) → **Session pooler** → copy the URI, replace `[YOUR-PASSWORD]` with the
   database password (Project Settings → Database → Reset password if you do not know it).
   Use the *pooler* URI (port 5432, user `postgres.sllpahrgmhqvchufiugf`); the direct one is IPv6-only and GitHub cannot reach it.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = the URI from step 1
   - `BACKUP_PASSPHRASE` = a long phrase you invent. **Save it in a password manager: without it backups cannot be opened.**
3. **Actions → Encrypted backup → Run workflow**. When green, download the artifact once and keep a copy on your own drive monthly.
Never paste the password or passphrase in chat.

## 3. Restore (new empty Supabase project)
1. Download the `.gpg` artifact. Decrypt: `gpg -d gpcpsn-backup-XXXX.tgz.gpg | tar -xz` (asks for the passphrase) →
   `db.sql`, `data.sql`, `files/`.
2. In the new project run the migrations in `supabase/migrations/` in order (SQL editor). This recreates tables, rules, grants, buckets.
3. Load the data: run `data.sql` with `set session_replication_role = replica;` first. "duplicate key" messages for
   reference tables (roles, permissions, categories) are expected: the migrations already created them.
4. Upload `files/<bucket>/...` back into the same buckets (avatars, covers, article-images, event-banners, job-logos).
5. Update `site/js/config.js` with the new project URL/key and redeploy.
`scripts/restore-check.sh file.gpg <empty test db url>` rehearses steps 1 and `db.sql` load. Tested locally: all 49 policies and 12 functions restored.

## 4. What is NOT protected
Supabase Free has no point-in-time recovery. Worst case you lose changes since the last backup (up to 3-4 days). Upgrading to Pro ($25/month) adds daily backups if the network grows.

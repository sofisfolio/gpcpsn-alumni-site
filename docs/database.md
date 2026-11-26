# Database (Phase 2)

Live on Supabase project `sllpahrgmhqvchufiugf` (Postgres 17, Tokyo). Migrations: `supabase/migrations/` (4 files, applied in order).

**Model.** Base tables are readable only by their owner and admins. Everyone else reads through 7 privacy-safe views
(`directory_profiles`, `directory_contact`, `jobs_public`, `events_public`, `articles_public`, `featured_alumni_public`, `site_stats`).
The Supabase security advisor lists these as "Security Definer View"; that is intentional, since each view exposes only safe columns and approved rows.
Event sign-up goes through 3 functions (`register_for_event`, `cancel_event_registration`, `get_event_online_url`) which the advisor also flags as intentional.

**Rules enforced by the database (not the website):** members cannot verify themselves or become admins; job and article status is forced to pending/draft for members;
editing an approved job sends it back for review; changing year/department drops verification; event capacity and duplicate sign-ups are enforced with a row lock;
private columns (enrolment number, phone, online link, apply email for anonymous visitors) are never exposed publicly; images limited to jpg/png/webp, size-capped, in the owner's own folder.

**Tested:** `tests/db/run.sh` runs all migrations on a local Postgres and 138 attack/behaviour checks: 138/138 pass.
It found 4 real bugs before launch (invalid regex limits, slug function permission, event sign-up silently not saving, admin image moderation).
Not yet tested: behaviour against the real Supabase Auth/Storage services (done in Phase 3 with real sign-ups).

**Admins:** see `docs/admin-bootstrap.sql`.

## Later migrations
- 5: launch with Civil Engineering only ("Other" hidden).
- 6: `admin_list_members(status)`: admin-only function that shows applicants' sign-up emails (emails are never readable otherwise).
- 7: a rejected member who corrects batch year/department/enrolment number goes back to "pending" for re-review.

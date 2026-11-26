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

**Staff and roles (migration 8):** see the section below. The first Superadmin is created with `docs/admin-bootstrap.sql`.

## Later migrations
- 5: launch with Civil Engineering only ("Other" hidden).
- 6: `admin_list_members(status)`: admin-only function that shows applicants' sign-up emails (emails are never readable otherwise).
- 7: a rejected member who corrects batch year/department/enrolment number goes back to "pending" for re-review.

## Roles and permissions (migration 8)
WordPress-style: a **role** is a named set of **permissions**; a person can hold several roles; roles and who holds them can be changed at any time from the website
(Staff panel > Staff & roles) with no code or database work. The old single-admin switch (`app_admins`, `private.is_admin()`) is gone.

| Permission | Allows |
|---|---|
| `dashboard.view` | Open the staff panel, see counts and the 10 latest activity entries |
| `members.review` | See applicants (with email), verify / reject / suspend; moderate member images |
| `jobs.review` / `jobs.publish` | Approve, reject, feature, take down any job / own jobs go live without review |
| `events.manage` | Create and manage events, see registrations, upload banners |
| `articles.review` / `articles.publish` | Review any article / own articles go live without review |
| `reports.handle` | Read member reports and act on them |
| `messages.read` | Read and mark messages from the website contact form |
| `site.manage` | Testimonials, featured alumni, categories, departments, site settings |
| `audit.view` | Full activity log (more than 20 entries) |
| `roles.manage` | Give or remove roles; create, edit, delete roles |

Built-in roles: **Superadmin** (implicitly everything, cannot be edited, last one cannot be removed), **Admin** (everything except `roles.manage`), **Faculty** (dashboard, alumni, jobs, events, articles, reports, messages).
Only a Superadmin can grant or remove the Superadmin role. A role that someone still holds cannot be deleted. Granting and removing roles is written to the activity log.
The role tables have RLS on and no direct access at all: everything goes through checked functions (`my_access`, `admin_dashboard`, `admin_recent_activity`, `admin_list_staff`, `admin_assign_role`, `admin_remove_role`, `admin_roles`, `admin_save_role`, `admin_delete_role`).
The website hides sections a person cannot use, but that is only convenience: the database re-checks every action.

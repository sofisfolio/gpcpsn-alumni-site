# Architecture and decisions

## Stack (from the brief, unchanged)
Cloudflare Pages (static hosting) + Supabase (Postgres, Auth, Storage, RLS) + GitHub (source) + a transactional email provider (Phase 8) + a domain the owner buys.

## Decision 1: no build step, native ES modules
The prototype is vanilla JS, so the lowest-risk migration is to split it into ES modules and serve `site/` as-is. Cloudflare Pages needs no build command (output directory `site`). This avoids a framework and a node toolchain for a volunteer-maintained site, and it was also the only option that could be built and verified in this session (package installs are blocked).
Trade-off: no bundling/minification and no npm packages. `@supabase/supabase-js` will be loaded as a **pinned-version ES module**, ideally vendored into `site/vendor/` so there is no runtime dependency on a CDN. **I have not installed it yet** (network for installs is off in this session). If vendoring is not possible, load it from a pinned CDN URL and add that origin to the CSP. Revisit a bundler (Vite) only if the code outgrows this.

## Decision 2: routing. Hash now, History API in Phase 3
Hash routes (`#jobs`) need no server rules and are kept for Phase 1 so behaviour is identical to v17 (verified by 17 route-parity tests). **Before Phase 3 I will move to path routes (`/jobs`, `/profile/<slug>`)**: Supabase's email-link/redirect flows return tokens in the URL, which conflicts with a hash router, and public alumni/job/article pages deserve real shareable, crawlable URLs. Cloudflare Pages serves `index.html` for unknown paths when there is no 404.html, so no rewrite rules are needed. Auth will use the PKCE flow.

## Module map (`site/js`)
- `lib/util.js`: DOM helpers, `esc()` (HTML escaping), image URL helper, date formatter.
- `state.js`: UI state (replaced by the Supabase session in Phase 3).
- `ui.js`: toast, modal, lightbox, sign-in gate, mobile nav, reveal animations.
- `views/templates.js`: HTML templates per route. `views/wire.js`: behaviour per route.
- `router.js`: hash parser and renderer. `main.js`: boot. `config.js`: public config only.
- `data/dev-sample.js`: **dev-only** content. Each phase replaces one slice with a service in `site/js/services/`.

## Security model (summary; full checklist in Phase 9)
- RLS on every table; the browser holds only the publishable key. Admin rights live in a table that users cannot write; first admin is set by SQL run by the owner in the Supabase dashboard (no public path).
- Public reads go through views/policies exposing only opt-in, approved, privacy-safe columns. Private email/phone are never selectable by anonymous users.
- All user text is escaped on render; rich article content will be sanitised (or stored as restricted Markdown). External links are validated to `https://` or `mailto:`.
- Uploads: type + size limits, generated paths, per-user folder policies.
- Strict CSP in `_headers` once connect/img/font origins are final.

## Assumptions made (change any of these)
1. Alumni accounts are **admin-approved**: signing up and confirming email does not make someone "verified" until an admin approves (the UI will say so).
2. Profiles are **private by default**; the directory shows only members who opt in.
3. Jobs and articles default to `pending` moderation.
4. The schema supports multiple departments; Civil Engineering is the first.
5. English UI with the Marathi tagline kept; Marathi translation is a roadmap item.

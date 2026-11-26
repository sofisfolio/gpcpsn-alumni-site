# GPCPSN Alumni Network

Alumni networking platform for Government Polytechnic, Chhatrapati Sambhaji Nagar.
Status: **Phase 1 complete (foundation).** The site runs on sample content only. No backend yet.

## Run locally
```bash
npm run serve        # http://localhost:8080  (any static server works; no build step)
NODE_PATH=$(npm root -g) npm test   # smoke + parity tests (needs Playwright)
```

## Layout
| Path | Purpose |
|---|---|
| `site/` | The deployable website (Cloudflare Pages "build output directory" = `site`, no build command) |
| `site/assets/css/` | Design system split from the prototype, loaded in cascade order |
| `site/js/` | ES modules: router, ui chrome, per-page views, config |
| `site/js/data/dev-sample.js` | **Dev-only** sample content from the prototype. Removed as real services land |
| `archive/gpcpsn-website-v17.html` | Original single-file prototype (reference only; do not deploy) |
| `docs/` | Audit, architecture, checklist, free-tier notes, test report, original brief |
| `supabase/migrations/` | Database migrations (Phase 2) |
| `tests/` | Automated tests |

## Documents
Start with [docs/plan-and-checklist.md](docs/plan-and-checklist.md), then [docs/00-audit.md](docs/00-audit.md) and [docs/architecture.md](docs/architecture.md).

## Security rules
No secrets in this repo or in `site/`. Only the Supabase URL and publishable key belong in `site/js/config.js`; Row Level Security protects the data. The service-role key is never used by the website.

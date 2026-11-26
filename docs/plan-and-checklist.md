# Plan, checklist and change log

Legend: [x] done and verified, [~] partly, [ ] not started, [!] needs the owner.

## Phase 0: audit and planning
- [x] Prototype inspected end to end; demo vs real behaviour inventoried (docs/00-audit.md)
- [x] Architecture and defaults documented (docs/architecture.md)
- [x] Free-tier limits verified from vendor pages (docs/free-tier.md)
- [x] Plan and checklist (this file)

## Phase 1: repository and foundation
- [x] Project structure; prototype archived untouched in `archive/`
- [x] CSS split into 7 files; verified identical to v17 (non-blank lines), plus two documented fixes
- [x] JS split into 9 ES modules; logo extracted from base64 to `assets/img/logo.png`
- [x] Behaviour parity: 17 routes render identical text vs v17 in a real browser (docs/test-report.md)
- [x] Responsive checks at 390/768/1024/1440 (no sideways scroll); nav drawer and keyboard checks
- [x] `.gitignore`, `.env.example`, `_headers`, `config.js` (no secrets)
- [x] Local git repository with milestone commits
- [!] GitHub repository (private): GitHub is not linked to this session
- [~] Cloudflare project created by the owner (Workers static assets, not classic Pages). `wrangler.jsonc` added so it publishes `site/` from branch `phase-1-foundation`. Staging URL pending confirmation

## Next phases (unchanged from the brief)
2 Backend/DB/RLS/Storage/admin bootstrap, 3 Auth+profiles+directory (move router to History API), 4 Jobs, 5 Events, 6 Articles, 7 Dashboards+admin+site content, 8 Email+polish, 9 Testing+launch, 10 Handover.

## What I need from you (only these block progress)
1. **GitHub**: connect your GitHub account in claude.ai Settings > Connectors (then I can create the private repo and push), or create an empty private repo named `gpcpsn-alumni-network` yourself and push the zip's contents to it (`git remote add origin <url> && git push -u origin main`). Until then the code is only in the zip I sent.
2. **Cloudflare**: create a free account, then Workers & Pages > Create > Pages > connect the GitHub repo; build command empty, output directory `site`. Send me the `*.pages.dev` URL.
3. **Supabase** (Phase 2): create a free account and a new project (region nearest India). Do **not** send me the service-role key or DB password; I will give you SQL to paste into the SQL editor and you will paste back the Project URL and the publishable key (both safe to share).
4. **Domain**: your approval to buy one; it unlocks real email (see free-tier.md). Nothing is purchased without your yes.
5. Card prompts: if any signup asks for a payment card, stop and tell me.

## Questions where I took a default (tell me if wrong)
1. Is the network for **all departments** or only Civil Engineering? (default: schema supports all; Civil first)
2. How should an admin **verify** someone is an alumnus? (default: admin approves after seeing name, year, department, optional enrolment number)
3. Content to supply: real contact email/phone, social links, principal's message, committee names, policy text review, institute photos, confirmation of the faculty list and Vision/Mission/PEO/PO/PSO text.
4. First administrator's email address (set by you in the Supabase dashboard; no public admin sign-up).

## Change log
- 2026-11-26 Cloudflare production branch set to `phase-1-foundation`; build triggered.
- 2026-11-26 v0.1.0: migrated prototype v17 into a multi-file static site; added dev preview banner; fixed off-canvas-menu sideways scroll and focusable hidden menu links; added tests and docs.

## Launch reminders
- [ ] Remove `<meta name="robots" content="noindex, nofollow">` from `site/index.html` and set `DEV_BANNER=false` in `site/js/config.js` once every page uses real data (after Phase 7).
- [ ] Turn Confirm email back ON after custom email sending is set up (Phase 8).

## Phase 4 decisions (made on the owner's behalf)
- Verified alumni post; an administrator approves before anything is public. Applicants apply on the employer's own link or email (no in-site application tracking).
- Listings with a past deadline disappear automatically. Editing a live listing sends it back for review. Members can withdraw or delete their own.
- Any verified member can report a listing; an administrator can take it down from Admin → Reports.
- Not built yet: company logo upload for jobs (logos show the company initials).

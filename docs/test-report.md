# Test report: Phase 1 (automated smoke and regression)

Run: 26 Nov 2026, headless Chromium (Playwright) against a local static server. Reproduce with `NODE_PATH=$(npm root -g) npm test`.
External hosts (Google Fonts, Unsplash) are blocked in the sandbox, so image rendering and font loading are **not** covered here.

**Result: 70/70 passed**

| Test | Expected | Result | Pass |
|---|---|---|---|
| render parity #home | Visible text of the route identical to the v17 prototype | 4625 chars identical | PASS |
| no JS/same-origin errors #home | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #about | Visible text of the route identical to the v17 prototype | 4901 chars identical | PASS |
| no JS/same-origin errors #about | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #about/faculty | Visible text of the route identical to the v17 prototype | 4901 chars identical | PASS |
| no JS/same-origin errors #about/faculty | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #alumni | Visible text of the route identical to the v17 prototype | 1334 chars identical | PASS |
| no JS/same-origin errors #alumni | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #profile/rahul-shinde | Visible text of the route identical to the v17 prototype | 788 chars identical | PASS |
| no JS/same-origin errors #profile/rahul-shinde | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #profile/meena-pawar | Visible text of the route identical to the v17 prototype | 75 chars identical | PASS |
| no JS/same-origin errors #profile/meena-pawar | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #jobs | Visible text of the route identical to the v17 prototype | 1418 chars identical | PASS |
| no JS/same-origin errors #jobs | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #job/site-eng | Visible text of the route identical to the v17 prototype | 902 chars identical | PASS |
| no JS/same-origin errors #job/site-eng | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #post-job | Visible text of the route identical to the v17 prototype | 449 chars identical | PASS |
| no JS/same-origin errors #post-job | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #events | Visible text of the route identical to the v17 prototype | 996 chars identical | PASS |
| no JS/same-origin errors #events | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #event/annual-meet-2026 | Visible text of the route identical to the v17 prototype | 691 chars identical | PASS |
| no JS/same-origin errors #event/annual-meet-2026 | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #event/batch-2014 | Visible text of the route identical to the v17 prototype | 422 chars identical | PASS |
| no JS/same-origin errors #event/batch-2014 | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #news | Visible text of the route identical to the v17 prototype | 1371 chars identical | PASS |
| no JS/same-origin errors #news | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #blog/survey-future | Visible text of the route identical to the v17 prototype | 1017 chars identical | PASS |
| no JS/same-origin errors #blog/survey-future | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #login | Visible text of the route identical to the v17 prototype | 574 chars identical | PASS |
| no JS/same-origin errors #login | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #login/join | Visible text of the route identical to the v17 prototype | 574 chars identical | PASS |
| no JS/same-origin errors #login/join | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| render parity #nonexistent | Visible text of the route identical to the v17 prototype | 4625 chars identical | PASS |
| no JS/same-origin errors #nonexistent | No uncaught JS error, no failed/4xx same-origin request | ok | PASS |
| no horizontal scroll #home @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #alumni @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #jobs @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #events @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #news @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #login/join @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #about @390 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #home @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #alumni @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #jobs @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #events @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #news @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #login/join @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #about @768 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #home @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #alumni @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #jobs @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #events @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #news @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #login/join @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #about @1024 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #home @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #alumni @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #jobs @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #events @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #news @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #login/join @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| no horizontal scroll #about @1440 | Page cannot be scrolled sideways | scrollX after scrollTo(600) = 0 | PASS |
| directory filter by year narrows results | Year filter narrows results | 6 -> 1 | PASS |
| private profile is not shown | Profile with pub:false is not shown | ok | PASS |
| post-job gated for anonymous visitor | Anonymous visitor sees sign-in prompt | ok | PASS |
| mobile menu opens | Burger opens drawer | ok | PASS |
| open menu drawer is on-screen and visible | Open drawer is visible and inside the viewport | x=55 w=335 visibility=visible | PASS |
| Escape closes mobile menu | Escape closes drawer | ok | PASS |
| closed drawer links are not keyboard-focusable | Closed drawer links not focusable | ok | PASS |
| preview banner visible | Preview banner shown | ok | PASS |

## Issues found and fixed during this run

1. `LOCK_ICON` was not imported in `views/wire.js` after splitting, so `#post-job` threw for signed-out visitors. Fixed; test now passes.
2. Sideways scroll below 1060 px (also present in v17, confirmed by measuring the original). Fixed with a `.page-clip` wrapper; first attempt (clip on `<body>`) did not work and was reverted.

## Not tested yet (cannot be until later phases)

Authentication, email delivery, RLS/permissions, storage, moderation, admin, real data, production domain/HTTPS, backups, screen-reader testing, colour contrast audit, cross-browser (only Chromium so far).


## Phase 3 (sign-up, sign-in, profile)
- `tests/auth.e2e.cjs`: 32/32 pass, in a real browser against a **mock** Supabase (it imitates the documented behaviour; it is not the real service).
  Covers sign-up (with and without email confirmation), duplicate email, validation, wrong password, rate limit, network failure, session kept across reload,
  sign-out, profile edit and cleaning, `javascript:` links refused, private contact stored apart, no verification/admin fields ever sent, tokens only on signed-in requests,
  testimonial text escaped, real numbers on the home page, no invented content.
- `tests/smoke.cjs`: 70/70 pass (the six pages that intentionally differ from the prototype are now checked for absence of invented content).
- **Not yet verified:** the real Supabase Auth service. Verified live only when the owner registers on the deployed site (checked afterwards by SQL).

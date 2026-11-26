# Phase 0 audit of `gpcpsn-website-v17.html`

Method: read the whole file (1,564 lines; the two ~100 KB base64 logo lines and long data rows were read truncated to 400 characters, structure and fields confirmed by script), then rendered it in a browser and compared it with the migrated site.

## 1. What the prototype is
- One HTML file, 325 KB: inline CSS (~480 lines), a hash-routed vanilla-JS single-page app (~1,000 lines), and **all content as in-memory arrays**. No backend, no network calls except Google Fonts and Unsplash images.
- Routes (hash): `home, about (+#about/faculty), alumni, profile/<id>, jobs, job/<id>, post-job, events, event/<id>, news, blog/<id>, login (+join/forgot tabs)`. Unknown hashes fall back to home (there is no real 404).
- Design system: navy `#17336B`, orange `#F07F2A`, paper `#F7F5F1`, Plus Jakarta Sans + Noto Sans Devanagari, 20px radius cards, pill buttons, scroll-reveal, count-up stats. Responsive breakpoints at 1180/1060/860/760 px. Already has skip link, visible focus, labelled form fields, `prefers-reduced-motion`.
- Output escaping is done with an `esc()` helper on interpolated data, and image IDs are regex-validated. A reasonable base, but it must be re-verified once data is user-supplied.

## 2. Reusable as-is
Logo; colour/typography tokens; all card/form/nav/hero/footer components; the faculty list and the department Vision, Mission, PEO, PO and PSO text (**confirm with the department**); the Marathi tagline; page layouts for directory, profile, jobs, events, articles, auth.

## 3. Demo-only behaviour that must be replaced
| Area | What the prototype fakes | Real replacement (phase) |
|---|---|---|
| Authentication | Any email + 6-char password "signs in"; register accepts anything; "Reset link sent (demo)"; "Remember me" does nothing | Supabase Auth with email verification and real reset (3) |
| Stats strip & About stats | "Registered alumni" is hard-coded **1,200**; "40+ batches", "1,200+ alumni"; counters append "+" to any number ≥10, which would misstate real counts | Counts from DB, or "unavailable" (7) |
| Hero "Live activity" | Rotating invented events ("New batch member verified…") | Remove, or drive from real moderated activity (8) |
| Directory | 11 fictional alumni with stock portraits; `pub`/`contact` flags in the array; "Save ☆" is local state | `profiles` + privacy fields + RLS (3) |
| Profile | "Connect" shows fake "Request sent"; LinkedIn button always disabled | Remove Connect (roadmap feature) or implement later; real links (3) |
| Jobs | 6 sample jobs; "Apply now" fakes "Application sent ✓" and a progress tracker | Apply uses the listing's real link or email; no fake tracker (4) |
| Post a job | Client-side validation, then fake success; nothing saved; link not safety-checked | Authenticated insert, `pending` status, moderation, URL allow-list (4) |
| Events | RSVP mutates seat counts in memory; cancel always subtracts 1; "attendees up to 4" is not capacity-checked | `event_registrations` with unique + capacity check in DB (5) |
| News | 6 sample articles; newsletter shows "Subscribed ✓" without sending anything; share buttons are "demo" toasts; **hard-coded fake comments** ("Sameer K.", "Nisha P.") | Real articles + moderation; real share URLs; remove comments and newsletter until implemented (6) |
| Testimonials | 3 invented quotes attributed to named people | Remove; use only genuine approved quotes (7) |
| About page | Placeholder principal quote; committee cards "President / General Secretary…" with stock photos and no names | Real supplied content or remove (7) |
| Footer / legal | `alumni@example.edu (replace)`, `+91 00000 00000 (replace)`, `#` social links; policy modals say "text to be provided" | Real contact details; draft policy pages labelled for institute review (8) |
| Images | Unsplash hot-linked stock photos used as if they were institute photos | Institute-owned images in Supabase Storage / `site/assets` (as supplied) |

## 4. Missing relative to the brief (not in the prototype at all)
Member dashboard, edit profile, my jobs/events/articles, notifications, settings, article editor, password-reset page, admin area (dashboard, alumni, jobs, events, blogs, site content, roles), contact page, privacy/terms/accessibility pages, real 404, server-side search/pagination, image upload, moderation, audit log.

## 5. Issues found while auditing / migrating
1. **Sideways scroll below 1060 px (pre-existing in v17, fixed).** The off-canvas menu drawer extended the page ~350 px to the right; script-driven and some mobile browsers can scroll to it. Fixed by clipping on a wrapper (`.page-clip`), not `<body>` (a `clip` on body is promoted to the viewport and does not help). Verified 0 px at 390/768/1024/1061 px.
2. **Closed mobile menu links were keyboard-focusable (pre-existing, fixed)** via `visibility:hidden` when closed.
3. **Civil-Engineering-only.** The prototype says the network is "created by the Department of Civil Engineering" and the registration form offers only "Civil Engineering / Other". The brief says "department/program". Decision needed (see plan, question 1). The schema will support many departments either way.
4. Inline `onclick` in the sign-in modal (`gate()`) blocks a strict Content-Security-Policy. To be replaced in Phase 3.
5. Hash routing will collide with Supabase's auth redirect (see architecture.md, Routing).
6. Google Fonts and Unsplash are third-party requests. Fonts should be self-hosted before launch for speed and privacy (needs the font files: network is blocked in this session).

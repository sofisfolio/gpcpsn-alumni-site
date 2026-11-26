# Free-tier limits and what they mean here

Checked 26 Nov 2026 from vendor pages (links below). **Re-verify before launch; limits change.** Only the domain is a paid item.

## Supabase (Free plan)
- 500 MB database per project, 1 GB file storage, 5 GB egress, 50,000 monthly active users, 2 active projects.
- **Free projects are paused after 1 week of inactivity.** A quiet alumni site can go to sleep and the first visitor then waits for it to wake. Mitigation (Phase 9): a scheduled GitHub Actions request every few days that touches the API; the owner can also restore a paused project from the dashboard. Upgrading to Pro removes pausing (that is a cost; not done without approval).
- **Automatic backups are not included on Free.** We will add our own export routine (database dump + storage listing) and document how to run it; see roadmap.
- Source: https://supabase.com/pricing , https://supabase.com/docs/guides/platform/billing-on-supabase

## Cloudflare Pages (Free plan)
- 500 builds/month (we have no build step), up to 20,000 files, 25 MiB max per file, unlimited bandwidth and requests, custom domains included.
- Cloudflare is also promoting "Workers static assets"; Pages remains available. Confirm which is offered when the project is created.
- Source: https://developers.cloudflare.com/pages/platform/limits

## Email (the important constraint)
- Supabase's **built-in email sender only delivers to members of your Supabase team** and is rate-limited and best-effort. Real alumni will not receive verification or reset emails until a **custom SMTP provider** is configured. Source: https://supabase.com/docs/guides/auth/auth-smtp
- A custom provider needs a **domain you own** with SPF/DKIM records. **So email verification cannot be tested with real users until the domain is bought.** Until then, testing is limited to team-member addresses.
- Resend (candidate): free plan 3,000 emails/month **and 100/day**, 1 verified domain; sending pauses at the cap; both sent and received mail count. Source: https://resend.com/docs/knowledge-base/resend-sending-limits . 100/day is fine for normal sign-ups but a batch invitation drive would exceed it. Other providers may fit better; I will compare at Phase 8.

## Other
- GitHub: free private repositories are expected for individual accounts, **not re-verified in this session**; confirm when creating the repo.
- Fonts/images: Google Fonts and Unsplash hot-links are free but external; plan to self-host fonts.
- Storage will hold profile/cover/event/article images; at 1 GB, enforce client-side resize (~200 KB avatars, ~400 KB banners).

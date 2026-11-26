# GPCPSN Alumni Network — Claude Project Execution Brief
## Complete build, backend, deployment and handover specification

**Project:** GPCPSN Alumni Network — Government Polytechnic, Chhatrapati Sambhaji Nagar  
**Goal:** Transform the supplied HTML prototype into a publicly accessible, genuinely functional alumni networking and communication platform.  
**Budget:** Use free tiers and free tools wherever feasible. The user is willing to pay for domain registration/renewal only. Do not assume paid services or upgrade plans.  
**Primary handoff:** This document + `gpcpsn-website-v17.html` uploaded as a design/prototype reference.

---

# 1. YOUR ROLE AND WORKING STYLE

Act as the lead full-stack engineer, product designer, database architect, security engineer, QA tester and deployment guide for this project. Take ownership of implementation and make progress autonomously wherever the tools and access available to you permit.

Do not merely explain how the user could build it. Build, configure, test, document and deploy it when you have the ability. When an action requires the user to create an account, accept terms, verify an email, enter a payment method, reveal a secret, or make a decision you cannot make safely, pause only for that specific action and provide precise, step-by-step instructions. Resume after the user completes it.

Do not claim that a service, deployment, integration, feature, test or configuration is complete unless you actually performed and verified it.

## Work protocol
1. Start by inspecting the supplied HTML file completely, including its inline CSS, JavaScript, page/router structure, mock data, forms, UI behavior, images, assets and dependencies.
2. Create a project plan and a written inventory of what is reusable, what is demo-only, what is missing, and what must be replaced.
3. Preserve the visual design and identity where practical. Do not gratuitously redesign or remove features.
4. Establish the repository and project structure, then implement in small, verifiable milestones.
5. Prefer stable, maintained, free-tier services and well-documented APIs.
6. Verify service free-tier terms and limitations at implementation time; do not assume pricing or quotas remain unchanged.
7. Do not hardcode secrets, service-role keys, private tokens, credentials or personal data in frontend code, repository history or documentation.
8. Use the Supabase publishable/anon key only in the frontend when appropriate, with properly configured Row Level Security (RLS). Never expose a service-role key.
9. Use real database records rather than fake success messages or local-only mock data for core features.
10. Keep a change log, progress checklist, setup instructions, troubleshooting notes and final handover documentation.
11. Use the user's existing HTML as the design source of truth unless an improvement is needed for usability, security, accessibility or functionality. Explain major deviations.
12. Avoid adding paid services, paid templates, premium APIs, paid plugins or paid hosting. If a free-tier limitation blocks something, explain and propose a free alternative before proceeding.

---

# 2. EXISTING PROTOTYPE

The user has supplied `gpcpsn-website-v17.html`.

The file currently includes a sizeable HTML/CSS/JavaScript prototype, including styling, responsive behavior, UI elements and demo interactions related to alumni profiles, directory, jobs, events, blogs, login and registration.

## Instructions for the prototype
- Inspect the actual file before making implementation decisions.
- Preserve the existing brand name, institutional context, visual identity, color system, typography, components and design language where reasonable.
- Reuse existing CSS, UI patterns, content and assets when suitable.
- The prototype is not the production backend. Identify demo behavior such as simulated authentication, local state, mock listings, non-persistent forms, simulated notifications, placeholder policy text, and other mock interactions.
- Replace demo-only functionality with real Supabase-backed behavior.
- Do not assume the prototype is already a multi-file project. Determine the best migration path.
- Maintain a working baseline and avoid destructive changes.
- Keep the prototype file archived in the repository as a reference, but do not expose unnecessary development files publicly.

---

# 3. TARGET TECHNOLOGY STACK

Use this stack by default. Re-evaluate only if a specific technical reason or a free-tier restriction requires a change; document the reason and ask before replacing the core stack.

## A. Cloudflare Pages — hosting
Purpose:
- Host the public frontend.
- Serve the website securely over HTTPS.
- Support custom domain connection.
- Provide deploy previews or deployment workflow where available.

Website:
https://pages.cloudflare.com/

Preferred deployment approach:
- Connect a GitHub repository to Cloudflare Pages for continuous deployment, if available and appropriate.
- Push updates to the chosen branch to trigger builds/deployments.
- Use Cloudflare's supplied project subdomain during development.
- Connect the purchased domain after the site is tested.
- Avoid paid Cloudflare services.

## B. Supabase — backend
Purpose:
- PostgreSQL database.
- Alumni authentication.
- User profile records.
- Jobs and job-posting management.
- Events and registration.
- Blog/article management.
- Storage for user and content images.
- Row Level Security and database policies.
- Optional server-side functions where required and available within free tier.

Website:
https://supabase.com/

Use:
- Supabase Auth.
- PostgreSQL.
- Supabase Storage.
- RLS policies.
- Supabase Edge Functions only if required and within the free tier; otherwise use an appropriate secure alternative.

Never expose the service-role key in the client.

## C. GitHub — source code and version control
Purpose:
- Store source code.
- Version control.
- Collaborate and track changes.
- Connect repository to deployment.

Website:
https://github.com/

Create a repository with an appropriate name, such as `gpcpsn-alumni-network`. Keep it private by default unless the user explicitly chooses otherwise. Do not commit secrets or sensitive user data.

## D. Email service — transactional email
Purpose:
- Email verification.
- Password reset.
- Optional notifications and updates.

Choose an email provider that offers a genuinely usable free tier for this project at implementation time. Verify current limits and any domain-authentication requirements. Prefer the simplest maintainable option.

Do not claim email delivery is configured until it has been tested. Explain DNS records (SPF, DKIM, and any required DMARC) when a custom sender domain is needed. If email is not configured, clearly document the limitations and avoid relying on it for critical workflows.

## E. Domain
The user will purchase and pay for domain registration/renewal only. Prefer connecting the domain to Cloudflare Pages and use DNS instructions suitable for the chosen registrar. Do not purchase a domain or spend money without explicit approval.

---

# 4. PRODUCT GOAL AND USER TYPES

Build an alumni community platform for Government Polytechnic, Chhatrapati Sambhaji Nagar.

The platform has three primary user groups:

1. **Public visitor:** Can browse approved public content and public alumni profiles according to privacy settings.
2. **Registered alumni/member:** Can manage their profile, interact with permitted features, submit jobs, register for events and submit articles.
3. **Administrator:** Can manage users, verify alumni as appropriate, moderate submissions, manage content and oversee platform operations.

Use a clear permission model. Do not let public users or ordinary alumni access administrative functions.

---

# 5. INFORMATION ARCHITECTURE AND PAGE SPECIFICATION

Implement the pages as appropriate routes/views. Do not force every page to be a separate static HTML file if dynamic templates are better.

## 5.1 Homepage
Sections:
- Responsive navigation bar: brand/logo, Home, About, Alumni Directory, Jobs, Events, News & Blogs, Login and Join Alumni Network.
- Hero: strong alumni-network headline, introduction, background visual, primary registration CTA and secondary discovery CTA.
- Alumni-at-a-glance statistics. Numbers must come from real database records or be clearly marked as unavailable; do not fabricate.
- About the alumni network.
- Featured alumni (admin-curated).
- Alumni success stories.
- Latest career opportunities.
- Upcoming events.
- Latest news/blogs.
- Testimonials, if genuine and approved; do not invent testimonials.
- Join the Alumni Network CTA.
- Footer: navigation, social links, contact details, policies.

## 5.2 About Alumni Association
- Hero/banner.
- Introduction.
- Vision and mission.
- Objectives.
- Benefits of joining.
- Activities and engagement.
- Relationship with the institute.
- Leadership/committee section if actual content is supplied.
- Registration CTA.
- Footer.

## 5.3 Alumni Directory
- Search by name.
- Filters: graduation year, department/program, location, industry and company where those fields are permitted and available.
- Sorting and pagination.
- Alumni cards with profile image, name, graduation year, program/department, position/company and profile link, subject to visibility settings.
- Empty state, loading state and error state.
- Do not publicly expose private email addresses, phone numbers or sensitive profile data.
- Public visibility is opt-in or governed by explicit profile privacy settings.

## 5.4 Alumni Profile
- Profile/cover image.
- Name.
- Graduation year and program/department.
- Professional headline, company, role and location.
- Biography.
- Career history.
- Education.
- Skills.
- Achievements.
- Approved public links.
- Visibility controls for contact details.
- Related/featured alumni if appropriate.
- Edit profile option only for the owner or authorized administrator.

## 5.5 Career & Jobs Listing
- Search.
- Filters: job title, company, location, employment type, work mode, industry and posting date where data is available.
- Featured and latest listings.
- Job cards.
- Pagination.
- Post a Job CTA.
- Listing status indicators.
- Do not show expired, unapproved or deleted jobs publicly.

## 5.6 Job Details
- Job title, company and logo (if provided).
- Location, employment type, work mode, salary range (optional).
- Experience level.
- Description.
- Responsibilities.
- Qualifications and skills.
- Deadline.
- Application instructions/link.
- Employer description if provided.
- Similar jobs.
- Report listing option if appropriate.
- Apply CTA must use the actual application method configured for the listing.

## 5.7 Post a Job (member-only)
Fields:
- Job title.
- Company.
- Company website (optional).
- Location.
- Work mode.
- Employment type.
- Industry (optional).
- Experience range.
- Salary range (optional).
- Job description.
- Responsibilities/requirements.
- Skills (optional).
- External application link or application email (one required, as appropriate).
- Application deadline (optional).
- Company logo (optional).
- Submission for moderation.

Rules:
- Validate all fields.
- Prevent malicious links and unsafe content.
- Only authenticated users may submit.
- The submitter may edit their own job according to status.
- New jobs default to `pending` moderation unless an administrator explicitly changes the policy.
- Provide clear submission status and messages.

## 5.8 Events Listing
- Featured event.
- Upcoming events.
- Past events.
- Categories.
- Search and filters.
- Event cards with date, location/format and CTA.
- Pagination or sensible load-more behavior.
- Past events may link to galleries or recaps.

## 5.9 Event Details
- Event banner.
- Title.
- Date/time and timezone.
- Location or virtual format.
- Description.
- Agenda.
- Speakers/guests, if actual information exists.
- Organizer.
- Registration details.
- Registration CTA.
- Capacity, when applicable.
- Related events.
- Accessibility and cancellation information where available.

## 5.10 Event Registration (member-only where configured)
- Prefill member information.
- Registration confirmation.
- Optional additional fields only when needed.
- Prevent duplicate registrations.
- Capacity checks and closed registration state.
- Registration status and cancellation policy.
- My Events access.
- Admin export/management.

## 5.11 News & Blogs Listing
- Featured article.
- Search.
- Categories.
- Article cards.
- Author and publication date.
- Pagination.
- Newsletter signup only if a real email subscription mechanism is implemented; do not simulate subscription success.
- Popular/latest content where supported.

## 5.12 Blog/Article Detail
- Title, category, cover image.
- Author and publication date.
- Reading time if calculated.
- Article content.
- Social sharing links that actually work.
- Related articles.
- Comments only if securely implemented, with moderation.
- Public visibility only for published articles.

## 5.13 Submit Article / Blog (member-only)
- Title.
- Category.
- Featured image.
- Summary.
- Content editor.
- Save draft.
- Preview.
- Submit for moderation.
- Status: draft, pending, published, rejected or archived as appropriate.
- Author edit controls and administrator moderation.

## 5.14 Registration
- Name.
- Email.
- Password.
- Password confirmation.
- Graduation year.
- Department/program.
- Optional verification fields determined by the institute.
- Terms/privacy acceptance.
- Email verification.
- Secure validation and error handling.
- Do not require sensitive data unnecessarily.
- Clearly explain any alumni verification process.
- Do not falsely claim an account is verified when it is not.

## 5.15 Login
- Email and password.
- Forgot password.
- Clear error states.
- Secure session handling.
- Logout.
- Login redirect to intended page where appropriate.

## 5.16 Forgot/Reset Password
- Request reset using email.
- Use the real Supabase authentication flow.
- Verify redirect URL configuration.
- Reset password.
- Show clear success/failure states.

## 5.17 Member Dashboard
- Welcome panel.
- Profile completion indicator (based on real profile fields).
- Quick actions: Edit Profile, Post Job, Register for Event, Write Article.
- Member's jobs and statuses.
- Registered events.
- Articles and drafts.
- Relevant recent content.
- Notifications if implemented.
- Do not fabricate analytics or notifications.

## 5.18 Edit Profile
- Personal information.
- Academic information.
- Professional information.
- Bio.
- Career history.
- Skills.
- Achievements.
- Social/professional links.
- Profile image and cover image.
- Privacy controls.
- Save and validation.

## 5.19 My Jobs
- List of jobs submitted by the current user.
- Status.
- Edit according to permissions.
- Remove/cancel as permitted.
- Expiration status.
- Applications only if an application tracking system is intentionally implemented.

## 5.20 My Events
- Upcoming registrations.
- Past registrations.
- Registration status.
- Cancel if permitted.
- Event detail links.

## 5.21 My Articles
- Published articles.
- Drafts.
- Pending.
- Rejected with feedback.
- Edit and resubmit as allowed.

## 5.22 Notifications
Only build notifications that have a real source and persistence.
- Moderation outcomes.
- Event reminders if reminder infrastructure is configured.
- Account updates.
- Announcements.
- Mark-read functionality.
If no notification system is implemented, do not present a fake notification center.

## 5.23 Settings
- Account settings.
- Password management through Supabase.
- Email preferences if supported.
- Profile visibility.
- Contact visibility.
- Account deletion/request process.
- Logout.

## 5.24 Admin Dashboard
- Counts based on database records.
- Pending registrations or verification requests, if enabled.
- Pending jobs.
- Pending articles.
- Event activity.
- Recent moderation activity.
- No fake charts or inflated metrics.

## 5.25 Admin Alumni Management
- Search/filter alumni.
- View profiles.
- Verify/approve accounts where verification is required.
- Manage roles only through secure administrative processes.
- Suspend/deactivate or delete users according to documented policy.
- Export only authorized information.
- Audit administrative changes where feasible.

## 5.26 Admin Jobs
- Pending queue.
- Approve/reject.
- Feedback to submitter.
- Edit/remove.
- Expiration management.
- Reported jobs.
- Status filters.

## 5.27 Admin Events
- Create/edit/delete events.
- Banner upload.
- Dates/timezone.
- Location/virtual event details.
- Capacity.
- Registration management.
- Attendee export.
- Publish/unpublish.
- Cancellation or status management.

## 5.28 Admin Blogs/Content
- Article review queue.
- Approve/reject with feedback.
- Edit/publish/unpublish.
- Categories.
- Featured content.
- Reported content.
- Moderation history.

## 5.29 Admin Site Content
Where practical, admin-managed:
- Homepage featured content.
- About content.
- Featured alumni.
- Testimonials.
- Announcements.
- Footer links/contact.
- Categories and taxonomy.

## 5.30 Admin Settings and Permissions
- Admin role management using secure, non-self-service escalation.
- Configuration and content settings.
- Moderation rules.
- Audit logs where feasible.
- Avoid unnecessary complexity in the first release.

## 5.31 Supporting pages
- Contact.
- Privacy policy.
- Terms and conditions.
- Accessibility statement or accessibility guidance.
- 404/not-found page.
- Maintenance/error page if appropriate.

Policy content must be a clearly labeled draft for review, not presented as legally approved. The institute should review the policies before launch.

---

# 6. DATABASE DESIGN

Design and implement a normalized Supabase/PostgreSQL schema. Review the final schema with the project needs, then create migration SQL files and apply them using the available authorized method.

Potential tables (adjust as needed and document any changes):

## 6.1 `profiles`
- `id` — UUID, references authenticated user.
- `full_name`.
- `avatar_path`.
- `cover_path`.
- `graduation_year`.
- `department` or program.
- `current_company`.
- `current_position`.
- `location`.
- `bio`.
- `skills` or normalized skills relation.
- `website_url`.
- `linkedin_url`.
- `profile_visibility`.
- `contact_visibility`.
- `verification_status`.
- `created_at`.
- `updated_at`.

Keep private contact information in an appropriately protected field/table if needed. Do not expose private data through public queries.

## 6.2 `jobs`
- ID.
- Submitter/user ID.
- Job title.
- Company.
- Company website.
- Company logo path.
- Location.
- Work mode.
- Employment type.
- Industry.
- Experience details.
- Salary range (optional).
- Description.
- Responsibilities/requirements.
- Skills.
- Application URL/email.
- Deadline.
- Status (`pending`, `approved`, `rejected`, `expired`, etc. as appropriate).
- Moderation notes.
- Created/updated/published timestamps.

## 6.3 `events`
- ID.
- Title.
- Slug.
- Description.
- Banner path.
- Event start/end.
- Timezone.
- Venue.
- Address or virtual details.
- Category.
- Capacity (optional).
- Registration deadline.
- Status.
- Organizer.
- Created/updated timestamps.

## 6.4 `event_registrations`
- ID.
- Event ID.
- User ID.
- Registration status.
- Additional fields only as necessary.
- Created timestamp.
- Unique constraint to prevent duplicate registrations per user/event unless explicitly needed.

## 6.5 `articles`
- ID.
- Author/user ID.
- Title.
- Slug.
- Category.
- Summary.
- Cover image path.
- Content.
- Status.
- Moderation notes.
- Published timestamp.
- Created/updated timestamps.

## 6.6 Additional tables as needed
- `roles` or secure role mapping.
- `job_categories`.
- `event_categories`.
- `article_categories`.
- `notifications` (only if implemented).
- `comments` (only if implemented).
- `contact_messages` (if contact form is implemented).
- `site_settings`.
- `featured_alumni`.
- `moderation_logs`.
- `skills`/profile skill relations if normalized.
- Newsletter subscriptions only if a real service is integrated.

Use indexes for search/filter fields, foreign keys, check constraints, unique constraints and appropriate cascade/restrict behavior. Document the design.

---

# 7. SECURITY AND ACCESS CONTROL — NON-NEGOTIABLE

Configure Row Level Security for every exposed table.

Create and test policies for:
- Public read access only to approved, published, and privacy-safe content.
- Members can read/update their own private profile data.
- Members can create their own job submissions and edit only their own records under allowed statuses.
- Members can create their own article submissions and edit only their own records under allowed statuses.
- Members can register for events and access only their own registration records.
- Administrators can manage content and users only through properly authenticated, securely assigned admin privileges.
- Prevent users from changing their own role/administrator status.
- Prevent public access to private emails, phone numbers or other sensitive fields.
- Prevent anonymous writes to core tables.
- Prevent storage uploads to unauthorized locations.
- Validate file types, file size and filenames.
- Avoid SQL injection, XSS, unsafe HTML rendering, CSRF risks where applicable, insecure redirect behavior and abuse of public forms.
- Validate and sanitize external links and user-generated content.
- Use rate-limiting or abuse protections where available and appropriate.
- Never trust frontend checks alone for authorization.
- Do not place service-role keys or other secrets in client-side files.
- Keep secrets out of GitHub and the deployment build.
- Create a security checklist and test it before public launch.

If an admin role is required, design a safe bootstrap process. Do not make admin assignment available through public registration. Explain how the initial administrator will be assigned and how to remove or rotate access.

---

# 8. STORAGE AND MEDIA

Use Supabase Storage or another free solution only if it meets the needs and free limits.

Plan buckets and permissions for:
- Alumni profile avatars.
- Profile cover images.
- Company/job images if necessary.
- Event banners.
- Article images.

Requirements:
- Validate file type and size.
- Use safe filenames or generated paths.
- Restrict upload and deletion permissions.
- Avoid exposing private files unnecessarily.
- Use public URLs only for content intended to be public.
- Document storage limits and cleanup procedures.
- Provide image previews and meaningful error messages.

---

# 9. EMAIL AND AUTHENTICATION

Configure:
- Signup verification.
- Password reset.
- Email confirmation.
- Redirect URLs for local development and deployed domain.
- Sender identity, if the chosen provider supports it.
- Basic transactional email templates with project branding.

Verify actual delivery through testing. Document free-tier email restrictions, provider throttling, domain-authentication requirements and the fallback if email configuration cannot be completed.

Do not simulate verification or password reset as successful.

---

# 10. DESIGN, UX AND ACCESSIBILITY

Preserve the supplied prototype's visual identity where practical.

## Design principles
- Professional, modern, institutional, trustworthy and welcoming.
- Responsive from mobile through desktop.
- Consistent typography, spacing, colors, buttons, cards, forms and navigation.
- Clear information hierarchy.
- Fast, lightweight and efficient.
- Avoid unnecessary animation and decorative complexity.
- Keep visual accessibility in mind.

## Responsive behavior
Test at approximate widths:
- 360–390px mobile.
- 768px tablet.
- 1024px laptop/tablet landscape.
- 1440px desktop.

## Accessibility
- Keyboard navigation.
- Visible focus.
- Semantic HTML.
- Labels and accessible form messages.
- Alt text.
- Appropriate contrast.
- Reduced-motion support.
- Accessible dialogs and navigation.
- Avoid relying only on color for status.
- Screen-reader-friendly loading, error and success messages.

---

# 11. IMPLEMENTATION AND REPOSITORY

Choose a maintainable project structure and explain why. A framework is acceptable if it improves maintainability, but do not add needless complexity. Evaluate whether the prototype can be migrated to a modern frontend framework or a lightweight structure. Use a single coherent approach.

Example structure (adapt as needed):

```text
gpcpsn-alumni-network/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── deployment.md
│   ├── admin-guide.md
│   ├── troubleshooting.md
│   ├── security-checklist.md
│   └── roadmap.md
├── public/
│   └── assets/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── styles/
│   ├── lib/
│   ├── services/
│   ├── hooks/
│   └── routes/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config/
├── tests/
└── package.json
```

Requirements:
- Use Git.
- Commit meaningful milestones.
- Maintain `.gitignore`.
- Include safe environment-variable examples such as `.env.example` without actual secrets.
- Keep secrets in secure configuration, not in source.
- Use a migration-based database workflow.
- Provide a seed strategy for development only. Do not seed fictitious alumni or fake metrics into production.
- Keep development/test content clearly distinct from production.
- Avoid unnecessarily large dependencies.

---

# 12. FREE-TIER AND COST MANAGEMENT

The user intends to pay only for the domain. Therefore:

- Use free tiers for hosting, backend, repository, email and tooling wherever feasible.
- Verify current pricing and limits at the time of implementation.
- Do not use paid features or trigger paid usage.
- Do not add a billing plan or purchase without explicit permission.
- If account setup requests a payment card, inform the user and pause for approval.
- Do not falsely guarantee that a service will remain free indefinitely.
- Document free-tier quotas, limits, pause behavior, storage limits, bandwidth, email limits and any constraints that could affect availability.
- Provide a backup/export plan for database and content.
- Explain the risk of free-tier inactivity pauses, if applicable.
- Identify any feature that may eventually incur costs and provide an alternative where possible.
- Keep the domain expense separate from platform/service expenses.

---

# 13. TESTING AND ACCEPTANCE CRITERIA

The site is not ready merely because it loads. Implement a systematic test plan.

## 13.1 Public pages
- All navigation links work.
- Pages render correctly.
- Search/filter behavior works.
- No broken images.
- Responsive layouts.
- Empty/loading/error states.
- Public content respects privacy and moderation.

## 13.2 Authentication
- Signup.
- Email verification.
- Login.
- Logout.
- Invalid credentials.
- Password reset.
- Session handling.
- Redirect behavior.
- Duplicate/invalid submissions.
- Authorization checks.

## 13.3 Profiles
- Create/update profile.
- Upload/change image.
- Privacy settings.
- Public/private field checks.
- Profile ownership permissions.
- Directory search/filter.

## 13.4 Jobs
- Submit job.
- Pending moderation.
- Admin approval/rejection.
- Approved listing visible publicly.
- Rejected/pending listing not publicly visible.
- Edit permissions.
- Expiration.
- Invalid link/field handling.
- Unauthorized edit/delete attempts.

## 13.5 Events
- Create event.
- Publish/unpublish.
- Register.
- Duplicate registration prevention.
- Capacity/closed registration.
- Cancel registration if permitted.
- Admin attendee list.
- Unauthorized access attempts.

## 13.6 Blogs
- Draft.
- Submission.
- Moderation.
- Publication.
- Rejection.
- Edit/resubmit.
- Public visibility.
- Image uploads.
- XSS/security checks for content.

## 13.7 Administration
- Admin access restricted.
- Non-admin cannot access admin routes or database actions.
- Approvals work.
- Content management works.
- Role escalation is blocked.
- Audit/logging where implemented.

## 13.8 Security
- RLS enabled on all exposed tables.
- Public users cannot write to protected records.
- Members cannot read or edit another member's private data.
- Members cannot assign themselves admin roles.
- Storage policies are tested.
- Secrets are not in repository or frontend.
- Forms are validated.
- Unsafe content is handled appropriately.

## 13.9 Deployment
- Deployed site loads over HTTPS.
- Domain works when configured.
- DNS is correct.
- Auth redirect URLs work on production domain.
- Environment variables are correctly configured.
- No console-breaking errors.
- Deployment update workflow is documented.
- Backups/export tested where feasible.

Produce a test report with:
- Test name.
- Expected result.
- Actual result.
- Pass/fail.
- Issues and remediation.
Do not claim tests passed if they were not executed.

---

# 14. EXECUTION PHASES

Proceed in phases and keep a checklist updated.

## Phase 0 — Audit and planning
- Inspect prototype.
- Inventory existing features.
- Identify fake/demo functionality.
- Plan architecture.
- Confirm free-tier services and limitations.
- Create project plan and implementation checklist.

## Phase 1 — Repository and foundation
- Set up repository.
- Establish project structure.
- Migrate design and assets.
- Build responsive navigation and layouts.
- Set up frontend environment.
- Create initial deployment pipeline.
- Publish a basic staging site when possible.

## Phase 2 — Backend and database
- Create Supabase project with user permission.
- Implement migrations.
- Tables, indexes, constraints and relationships.
- RLS.
- Storage buckets/policies.
- Auth configuration.
- Secure admin bootstrap.
- Verify basic connectivity.

## Phase 3 — Authentication and profiles
- Signup.
- Verification.
- Login/logout.
- Password reset.
- Member profile.
- Profile privacy.
- Directory.
- Profile image uploads.

## Phase 4 — Jobs
- Listing and detail views.
- Search/filter.
- Job submission.
- Moderation workflow.
- Member's jobs.
- Admin jobs.

## Phase 5 — Events
- Listing and details.
- Admin event creation.
- Registration.
- Duplicate prevention/capacity.
- Member's events.
- Admin attendee management.

## Phase 6 — Blogs and content
- Listing and details.
- Article editor/submission.
- Draft and moderation.
- Admin publishing.
- Image uploads.

## Phase 7 — Dashboard and administration
- Member dashboard.
- Profile settings.
- My Jobs.
- My Events.
- My Articles.
- Admin dashboard.
- User management.
- Site content and settings.

## Phase 8 — Email and polish
- Email provider setup.
- Auth emails.
- Password reset.
- Error states.
- Accessibility.
- Responsive refinement.
- Performance.

## Phase 9 — Testing and launch
- Full acceptance tests.
- Security checks.
- Backup/export check.
- Deployment.
- Custom domain connection with user approval.
- Final launch checklist.

## Phase 10 — Handover
Provide:
- Project source/repository.
- Live website URL.
- Domain configuration instructions/status.
- Architecture documentation.
- Database schema and migration instructions.
- Admin guide.
- User guide.
- Security checklist.
- Backup/export instructions.
- Deployment and update instructions.
- Troubleshooting.
- Free-tier limitations.
- Roadmap for future improvements.

---

# 15. ADMINISTRATOR BOOTSTRAP AND HANDOVER

Ensure the user can manage the platform without depending on you for routine tasks.

- Provide a documented process to establish the first administrator securely.
- Never implement public admin registration or role escalation.
- Provide admin dashboard instructions.
- Explain how to approve alumni/content/jobs.
- Explain how to create/edit events.
- Explain how to manage categories and content.
- Explain how to export data.
- Explain how to back up the database and content.
- Explain how to recover from a failed deployment.
- Explain how to change domain/DNS if necessary.
- Explain how to rotate credentials.
- Explain how to remove or deactivate an admin safely.
- Explain what the free-tier provider may pause, limit or discontinue.

---

# 16. FUTURE UPGRADE ROADMAP — DO NOT BUILD EVERYTHING NOW

Build a stable MVP first and keep the architecture extensible. Do not implement the following unless the core project is stable, the user requests it and the feature can be built within the available free tier.

Possible future features:
- Alumni messaging.
- Connection requests.
- Mentorship matching.
- Alumni groups by department, batch, region or industry.
- Alumni map.
- Job application tracking.
- Advanced notifications.
- Newsletter campaigns.
- Donation/fundraising.
- Alumni reunion ticketing.
- QR check-in.
- Mobile app.
- Analytics.
- University integrations.
- Multi-admin roles.
- Advanced search.
- Recommendation system.

Do not build features that involve payments, complex third-party integrations or additional costs without explicit approval.

---

# 17. HOW TO REPORT PROGRESS

At the end of each milestone, provide a concise report:

1. **Completed:** Items actually completed.
2. **Verified:** Tests/actions actually performed.
3. **Pending:** Items not yet complete.
4. **Blocked:** Exact action needed from the user, if any.
5. **Files changed:** Relevant files.
6. **Next milestone:** What you will do next.

Maintain the project checklist in the repository. Do not repeatedly ask the user questions whose answers can be safely determined from the prototype or documentation. Use reasonable defaults, document them and proceed. Pause only for essential decisions, access, secrets, account verification, approval, or money.

---

# 18. FIRST INSTRUCTION TO CLAUDE

Begin by auditing the uploaded `gpcpsn-website-v17.html` and this project specification. Do not immediately overwrite or discard the prototype.

Your first response should:
1. Confirm that you can access the prototype and project brief.
2. Summarize the prototype's current architecture and demo-only behavior based on inspection.
3. Propose the initial implementation plan and milestones.
4. Identify account creation/access steps that genuinely require me.
5. Then start Phase 0 and Phase 1, performing actual work rather than merely presenting a plan.

The ultimate objective is a real, secure, responsive and maintainable GPCPSN alumni website that can be publicly launched on a custom domain, with free infrastructure wherever feasible, and that the owner can manage independently.

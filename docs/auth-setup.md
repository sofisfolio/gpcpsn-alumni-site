# Sign-in setup (do once, in the Supabase dashboard)

Project: `sllpahrgmhqvchufiugf`. Authentication > Sign In / Providers (or "Providers") > **Email**:

1. **Confirm email: OFF** (for now). Supabase's built-in mailer only delivers to your own team, so alumni would never receive the link
   and could not log in. This is safe because a new account is `pending`: it cannot be listed, post jobs, write articles or register
   for events until an administrator verifies it. Turn it back ON in Phase 8, once a custom email service (Resend + your domain) is connected.
2. **Minimum password length: 8** (Authentication > Policies / Password).
3. Authentication > **URL Configuration** > Site URL: `https://gpcpsn-alumni-site.sofiyan-contact.workers.dev` (change to your real domain later).

Known limits until Phase 8: "Forgot password" cannot deliver email to alumni (the button works, the email does not arrive);
anyone can type any email address when registering, which is why administrator verification is the real gate.

The site talks to Supabase with a small built-in client (`site/js/lib/supa.js`), no third-party library is loaded.

/* Public, non-secret configuration. The Supabase URL and the publishable (anon) key are
   designed to be public; Row Level Security is what protects data. NEVER put a
   service_role key, SMTP password or any other secret in this file. */
export const SUPABASE_URL = "";            // filled in Phase 2, e.g. https://xxxx.supabase.co
export const SUPABASE_PUBLISHABLE_KEY = ""; // filled in Phase 2 (publishable / anon key only)
export const DEV_BANNER = true;            // show "sample content" strip until real data is live

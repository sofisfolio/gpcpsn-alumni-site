/* Session + current member. Keeps the header, S.* state and routes in step with Supabase Auth. */
import {auth, db, onAuthChange} from '../lib/supa.js';
import {S} from '../state.js';
import {setAuth, toast, hooks} from '../ui.js';

export function friendly(e) {
  const m = String((e && e.message) || e || '');
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(m)) return 'Cannot reach the server. Please check your internet connection and try again.';
  if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
  if (/already registered|already been registered|user_already_exists/i.test(m)) return 'An account with this email already exists. Try signing in instead.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/rate limit|too many|over_email_send_rate_limit|429/i.test(m) || (e && e.status === 429)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/password should be|weak_password|at least \d+ char/i.test(m)) return 'Choose a stronger password (at least 8 characters).';
  if (/signups? (are )?(not allowed|disabled)/i.test(m)) return 'New sign-ups are currently closed.';
  if (/valid email|email_address_invalid/i.test(m)) return 'Please enter a valid email address.';
  if (/row-level security|permission denied/i.test(m)) return 'You do not have permission to do that.';
  if (/administrator/i.test(m)) return 'Only an administrator can change verification details.';
  return 'Something went wrong. Please try again.';
}

let lastUid = null;
export async function loadMe() {
  const s = auth.getSession();
  if (!s) { S.profile = null; S.isAdmin = false; setAuth(false); return; }
  try {
    const [p, a] = await Promise.all([db.select('profiles', '*', {id: 'eq.' + s.user.id}), db.select('app_admins', 'user_id')]);
    S.profile = p[0] || null; S.isAdmin = a.length > 0;
  } catch { S.profile = null; S.isAdmin = false; }
  setAuth(true, (S.profile && S.profile.full_name) || (s.user.email || 'Member').split('@')[0]);
}

export async function initAuth() {
  hooks.signOut = async () => {
    await auth.signOut();
    toast('Signed out');
    if (location.hash === '#home' || location.hash === '') hooks.route(); else location.hash = '#home';
  };
  await auth.init();
  await loadMe();
  lastUid = (auth.getSession() || {user: {}}).user.id || null;
  S.ready = true;
  onAuthChange(async s => {
    const uid = s ? s.user.id : null;
    if (uid === lastUid) return;            // token refresh only: nothing to redraw
    lastUid = uid;
    await loadMe();
    hooks.route();
  });
}

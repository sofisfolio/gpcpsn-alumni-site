/* Minimal Supabase client: Auth (password), PostgREST (tables, views, RPC) and Storage.
   No third-party code is loaded. Uses only the public URL + publishable key from config.js.
   Sessions live in localStorage (same as the official library); every value shown on screen is escaped. */
import {SUPABASE_URL as URL_, SUPABASE_PUBLISHABLE_KEY as KEY} from '../config.js';

const LS = 'gpcpsn.session';
let session = null;
let refreshing = null;
const listeners = new Set();

const now = () => Math.floor(Date.now() / 1000);

function load() { try { session = JSON.parse(localStorage.getItem(LS) || 'null'); } catch { session = null; } }
function save(s) {
  session = s;
  try { s ? localStorage.setItem(LS, JSON.stringify(s)) : localStorage.removeItem(LS); } catch { /* private mode */ }
}
function emit() { listeners.forEach(fn => { try { fn(session); } catch (e) { console.error(e); } }); }
export const onAuthChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

function normalise(r) {
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at || now() + (r.expires_in || 3600),
    user: r.user,
  };
}

export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}

async function parse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('Request failed (' + res.status + ')');
    throw new ApiError(msg, res.status, data && (data.error_code || data.code));
  }
  return data;
}

async function authCall(path, body, token) {
  const headers = {apikey: KEY, 'Content-Type': 'application/json'};
  if (token) headers.Authorization = 'Bearer ' + token;
  return parse(await fetch(URL_ + '/auth/v1' + path, {method: 'POST', headers, body: JSON.stringify(body || {})}));
}

async function refresh() {
  if (!session || !session.refresh_token) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const r = await authCall('/token?grant_type=refresh_token', {refresh_token: session.refresh_token});
      save(normalise(r)); emit();
      return session;
    } catch (e) {
      if (e.status >= 400 && e.status < 500) { save(null); emit(); }   // refresh token rejected: signed out
      return null;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

async function token() {
  if (!session) return null;
  if (session.expires_at - 30 > now()) return session.access_token;
  const s = await refresh();
  return s ? s.access_token : null;
}

/* ------------------------------------------------------------------ auth */
export const auth = {
  getSession: () => session,
  async init() {
    load();
    if (session && session.expires_at - 30 <= now()) await refresh();
    addEventListener('storage', e => { if (e.key === LS) { load(); emit(); } });   // other tab signed in/out
    return session;
  },
  async signUp(email, password, data) {
    const r = await authCall('/signup', {email, password, data});
    if (r && r.access_token) { save(normalise(r)); emit(); return {session, user: r.user}; }
    return {session: null, user: r};
  },
  async signIn(email, password) {
    const r = await authCall('/token?grant_type=password', {email, password});
    save(normalise(r)); emit();
    return session;
  },
  async signOut() {
    const t = session && session.access_token;
    save(null); emit();
    if (t) { try { await authCall('/logout', {}, t); } catch { /* already signed out locally */ } }
  },
  recover: email => authCall('/recover', {email}),
};

/* ------------------------------------------------------------------ database (PostgREST) */
async function restCall(path, {method = 'GET', body, headers = {}} = {}, retried = false) {
  const t = await token();
  const h = {apikey: KEY, Accept: 'application/json', ...headers};
  if (t) h.Authorization = 'Bearer ' + t;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(URL_ + '/rest/v1/' + path, {method, headers: h, body: body === undefined ? undefined : JSON.stringify(body)});
  if (res.status === 401 && t && !retried) {
    if (await refresh()) return restCall(path, {method, body, headers}, true);
  }
  return parse(res);
}
export const db = {
  /* select('profiles', 'id,full_name', {id: 'eq.<uuid>', limit: 5}) */
  select(table, columns = '*', filters = {}) {
    const q = new URLSearchParams({select: columns});
    for (const [k, v] of Object.entries(filters)) q.set(k, v);
    return restCall(table + '?' + q.toString());
  },
  update(table, filters, values) {
    const q = new URLSearchParams(filters);
    return restCall(table + '?' + q.toString(), {method: 'PATCH', body: values, headers: {Prefer: 'return=representation'}});
  },
  insert(table, values, {upsert = false} = {}) {
    return restCall(table, {method: 'POST', body: values, headers: {Prefer: (upsert ? 'resolution=merge-duplicates,' : '') + 'return=representation'}});
  },
  remove(table, filters) {
    return restCall(table + '?' + new URLSearchParams(filters).toString(), {method: 'DELETE'});
  },
  rpc: (fn, args) => restCall('rpc/' + fn, {method: 'POST', body: args || {}}),
};

/* ------------------------------------------------------------------ storage */
export const storage = {
  publicUrl: (bucket, path) => URL_ + '/storage/v1/object/public/' + bucket + '/' + path.split('/').map(encodeURIComponent).join('/'),
  async upload(bucket, path, blob) {
    const t = await token();
    if (!t) throw new ApiError('Please sign in first', 401);
    const res = await fetch(URL_ + '/storage/v1/object/' + bucket + '/' + path.split('/').map(encodeURIComponent).join('/'), {
      method: 'POST',
      headers: {apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': blob.type, 'x-upsert': 'true', 'Cache-Control': 'max-age=3600'},
      body: blob,
    });
    return parse(res);
  },
  async remove(bucket, path) {
    const t = await token();
    if (!t) return;
    await fetch(URL_ + '/storage/v1/object/' + bucket + '/' + path.split('/').map(encodeURIComponent).join('/'), {method: 'DELETE', headers: {apikey: KEY, Authorization: 'Bearer ' + t}});
  },
};

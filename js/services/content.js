/* Events and articles (news + blogs): reads from the public views, writes through RLS-protected tables and RPCs. */
import {db, storage} from '../lib/supa.js';

export const IST = 'Asia/Kolkata';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* ---- dates: events are always shown and entered in Indian Standard Time ---- */
const f = (iso, o) => new Date(iso).toLocaleString('en-IN', {timeZone: IST, ...o});
export const dayOf = iso => ({day: f(iso, {day: 'numeric'}), mon: f(iso, {month: 'short'}), full: f(iso, {day: 'numeric', month: 'long', year: 'numeric'}), short: f(iso, {day: 'numeric', month: 'short', year: 'numeric'})});
export const timeOf = iso => f(iso, {hour: 'numeric', minute: '2-digit', hour12: true}).toUpperCase();
export const timeRange = e => timeOf(e.starts_at) + (e.ends_at ? ' – ' + timeOf(e.ends_at) : '');
export const isPast = e => new Date(e.ends_at || e.starts_at) < new Date();
export const toInput = iso => (iso ? new Date(new Date(iso).getTime() + 19800000).toISOString().slice(0, 16) : '');
export const fromInput = v => (v ? new Date(v + ':00+05:30').toISOString() : null);

/* ---- categories ---- */
export const eventCategories = () => db.select('event_categories', 'id,slug,name', {order: 'sort_order.asc'});
export const articleCategories = () => db.select('article_categories', 'id,slug,name', {order: 'sort_order.asc'});

/* ---- events ---- */
export const bannerUrl = p => (p ? storage.publicUrl('event-banners', p) : '');
export const listEvents = () => db.select('events_public', '*', {order: 'starts_at.asc', limit: '300'});
export async function getEvent(key) {
  if (!UUID_RE.test(key) && !SLUG_RE.test(key)) return null;
  const rows = await db.select('events_public', '*', UUID_RE.test(key) ? {id: 'eq.' + key} : {slug: 'eq.' + key});
  return rows[0] || null;
}
export const myRegistration = async (uid, eventId) => (await db.select('event_registrations', 'status,attendees,notes', {user_id: 'eq.' + uid, event_id: 'eq.' + eventId}))[0] || null;
export const registerFor = (id, n, notes) => db.rpc('register_for_event', {p_event_id: id, p_attendees: n, p_notes: notes || null});
export const cancelRegistration = id => db.rpc('cancel_event_registration', {p_event_id: id});
export const onlineUrl = id => db.rpc('get_event_online_url', {p_event_id: id});
export const agendaLines = a => (Array.isArray(a) ? a : []).map(x => (Array.isArray(x) ? x : [x.time, x.text])).filter(x => x[0] || x[1]);

/* ---- articles ---- */
export const coverUrl = p => (p ? storage.publicUrl('article-images', p) : '');
export const listArticles = () => db.select('articles_public', 'id,slug,title,summary,cover_path,featured,published_at,category,category_slug,author_name,author_graduation_year', {order: 'featured.desc,published_at.desc', limit: '300'});
export async function getArticle(slug) {
  if (!SLUG_RE.test(slug)) return null;
  return (await db.select('articles_public', '*', {slug: 'eq.' + slug}))[0] || null;
}
export const paragraphs = t => String(t || '').split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
export const readMins = t => Math.max(1, Math.round(String(t || '').split(/\s+/).filter(Boolean).length / 200));
export const myArticles = uid => db.select('articles', '*', {author_id: 'eq.' + uid, order: 'created_at.desc'});

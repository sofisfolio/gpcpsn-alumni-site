/* Read-only access to the public alumni directory (privacy-safe database views). */
import {db, storage} from '../lib/supa.js';
import {S} from '../state.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = x => UUID.test(String(x || ''));
export const avatarUrl = path => path ? storage.publicUrl('avatars', path) : null;

const person = r => ({
  id: r.id, n: r.full_name || 'Alumnus', y: r.graduation_year, d: r.department || 'Civil Engineering',
  r: r.current_position || '', co: r.current_company || '', ind: r.industry || '', ctry: r.country || '', city: r.city || '',
  img: avatarUrl(r.avatar_path), cov: r.cover_path ? storage.publicUrl('covers', r.cover_path) : null,
  headline: r.headline || '', intro: r.bio || '', skills: r.skills || [], ach: r.achievements || [],
  linkedin: r.linkedin_url || '', website: r.website_url || '',
});

export async function listAlumni() {
  const rows = await db.select('directory_profiles', '*', {order: 'full_name.asc', limit: '1000'});
  return rows.map(person);
}

export async function getAlumnus(id) {
  if (!isId(id)) return null;
  const [r] = await db.select('directory_profiles', '*', {id: 'eq.' + id});
  if (!r) return null;
  const q = [
    db.select('profile_experience', '*', {profile_id: 'eq.' + id, order: 'sort_order.asc,start_year.desc'}),
    db.select('profile_education', '*', {profile_id: 'eq.' + id, order: 'sort_order.asc,year.desc'}),
    S.auth ? db.select('directory_contact', '*', {profile_id: 'eq.' + id}) : Promise.resolve([]),
  ];
  const [exp, edu, contact] = await Promise.all(q.map(p => p.catch(() => [])));
  const a = person(r);
  a.exp = exp.map(e => [[e.start_year, e.end_year || (e.start_year ? 'now' : '')].filter(Boolean).join('–'), e.title, e.organisation]);
  a.edu = edu.map(e => [e.year || '', e.qualification, e.institution]);
  a.contact = contact[0] || null;
  return a;
}

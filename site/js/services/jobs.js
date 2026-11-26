/* Jobs: public listing (privacy-safe view), member submissions, reports. */
import {db} from '../lib/supa.js';
import {isId} from './directory.js';

export const TYPE = {full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship', apprenticeship: 'Apprenticeship'};
export const MODE = {on_site: 'On-site', hybrid: 'Hybrid', remote: 'Remote'};
export const lines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);

export const listJobs = () => db.select('jobs_public', '*', {order: 'featured.desc,published_at.desc', limit: '500'});
export async function getJob(id) {
  if (!isId(id)) return null;
  const [j] = await db.select('jobs_public', '*', {id: 'eq.' + id});
  return j || null;
}
export const submitJob = values => db.insert('jobs', values);
export const myJobs = uid => db.select('jobs', 'id,title,company,status,rejection_reason,created_at,published_at,deadline', {submitted_by: 'eq.' + uid, order: 'created_at.desc'});
export const withdrawJob = id => db.update('jobs', {id: 'eq.' + id}, {status: 'withdrawn'});
export const deleteJob = id => db.remove('jobs', {id: 'eq.' + id});
export const reportJob = (uid, id, reason) => db.insert('content_reports', {reporter_id: uid, entity_type: 'job', entity_id: id, reason});

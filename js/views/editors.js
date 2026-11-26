/* Editors for events and articles. Each draws a form into a host element; used by the staff panel and the member "Write" page.
   Rules that matter (who may publish, status changes, slugs) are enforced by the database; the form only guides. */
import {$,$$,esc} from '../lib/util.js';
import {toast} from '../ui.js';
import {db,storage} from '../lib/supa.js';
import {toJpeg} from '../lib/image.js';
import {friendly} from '../services/auth.js';
import {eventCategories,articleCategories,toInput,fromInput,agendaLines,bannerUrl,coverUrl} from '../services/content.js';

const emsg=e=>e&&e.userMessage?e.userMessage:/check constraint|violates/i.test(String(e&&e.message))?'Some details are not valid. Please check the fields.':/row-level security|permission denied/i.test(String(e&&e.message))?'You do not have permission to do that.':friendly(e);
const setErr=(el,ok,msg)=>{if(!el)return;el.classList.toggle('bad',!ok);const er=el.parentElement.querySelector('.err');if(er)er.textContent=ok?'':msg};
const HTTPS=/^https:\/\/[^\s<>"']{3,255}$/i;
const stamp=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const opts=(rows,sel,blank)=>(blank?`<option value="">${esc(blank)}</option>`:'')+rows.map(r=>`<option value="${esc(r.id)}" ${r.id===sel?'selected':''}>${esc(r.name)}</option>`).join('');

/* ------------------------------------------------------------------ events */
export async function eventEditor(host,ev,{uid,done}){
  host.innerHTML='<p>Loading…</p>';
  let cats=[];try{cats=await eventCategories()}catch{}
  const e=ev||{};
  const agenda=agendaLines(e.agenda).map(a=>a[0]+' | '+a[1]).join('\n');
  const speakers=(Array.isArray(e.speakers)?e.speakers:[]).map(s=>(s.name||'')+' | '+(s.role||'')).join('\n');
  host.innerHTML=`<div class="adm-edhead"><button class="btn btn-line btn-sm" type="button" id="edBack">← Back to events</button><h2 class="adm-h2" style="margin:0">${ev?'Edit event':'New event'}</h2></div>
  <form id="evForm" class="card adm-card" novalidate><div class="g-form">
    <div class="full"><label for="ev_title">Event title *</label><input class="field" id="ev_title" name="title" maxlength="150" value="${esc(e.title||'')}"><div class="err"></div></div>
    <div><label for="ev_cat">Category</label><select class="field" id="ev_cat" name="category">${opts(cats,e.category_id,'No category')}</select></div>
    <div><label for="ev_status">Status</label><select class="field" id="ev_status" name="status"><option value="draft" ${(e.status||'draft')==='draft'?'selected':''}>Draft (not visible)</option><option value="published" ${e.status==='published'?'selected':''}>Published</option><option value="cancelled" ${e.status==='cancelled'?'selected':''}>Cancelled</option></select></div>
    <div><label for="ev_start">Starts * <small style="color:var(--muted)">(India time)</small></label><input class="field" id="ev_start" name="start" type="datetime-local" value="${esc(toInput(e.starts_at))}"><div class="err"></div></div>
    <div><label for="ev_end">Ends</label><input class="field" id="ev_end" name="end" type="datetime-local" value="${esc(toInput(e.ends_at))}"><div class="err"></div></div>
    <div><label for="ev_venue">Venue</label><input class="field" id="ev_venue" name="venue" maxlength="150" value="${esc(e.venue||'')}" placeholder="e.g. Campus Auditorium"></div>
    <div><label for="ev_addr">Address</label><input class="field" id="ev_addr" name="address" maxlength="300" value="${esc(e.address||'')}"></div>
    <div class="full"><label class="adm-check"><input type="checkbox" name="online" ${e.is_online?'checked':''}><span><b>This event is online</b><small>Registered people can see the link below. It is never shown to the public.</small></span></label></div>
    <div class="full"><label for="ev_url">Online link (https://…)</label><input class="field" id="ev_url" name="url" maxlength="255" placeholder="https://meet.example.com/…"><div class="err"></div>${ev&&e.is_online?'<small style="color:var(--muted)">Leave empty to keep the current link; type a new one to replace it.</small>':''}</div>
    <div><label for="ev_cap">Seats (leave empty for unlimited)</label><input class="field" id="ev_cap" name="capacity" type="number" min="1" max="100000" value="${esc(e.capacity??'')}"><div class="err"></div></div>
    <div><label for="ev_dl">Registration closes</label><input class="field" id="ev_dl" name="deadline" type="datetime-local" value="${esc(toInput(e.registration_deadline))}"><div class="err"></div></div>
    <div><label for="ev_fee">Fee</label><input class="field" id="ev_fee" name="fee" maxlength="60" value="${esc(e.fee_text||'Free')}"></div>
    <div><label for="ev_org">Organiser</label><input class="field" id="ev_org" name="organizer" maxlength="150" value="${esc(e.organizer||'')}" placeholder="e.g. Alumni Cell"></div>
    <div class="full"><label for="ev_desc">About the event</label><textarea class="field" id="ev_desc" name="desc" rows="5" maxlength="8000">${esc(e.description||'')}</textarea></div>
    <div class="full"><label for="ev_ag">Agenda <small style="color:var(--muted)">(one per line: time | what happens)</small></label><textarea class="field" id="ev_ag" name="agenda" rows="4" placeholder="10:00 | Welcome and registration">${esc(agenda)}</textarea><div class="err"></div></div>
    <div class="full"><label for="ev_sp">Speakers and guests <small style="color:var(--muted)">(one per line: name | role)</small></label><textarea class="field" id="ev_sp" name="speakers" rows="3" placeholder="Rahul Shinde | Site Engineer, Pune">${esc(speakers)}</textarea></div>
    <div class="full"><label for="ev_img">Banner image <small style="color:var(--muted)">(JPG, PNG or WebP)</small></label>
      ${e.banner_path?`<div class="adm-thumb" style="background-image:url('${esc(bannerUrl(e.banner_path))}')"></div>`:''}<input class="field" id="ev_img" name="img" type="file" accept="image/jpeg,image/png,image/webp"><div class="err"></div></div>
    <div class="full"><label class="adm-check"><input type="checkbox" name="featured" ${e.featured?'checked':''}><span><b>Feature on the Events page</b></span></label></div>
    <div class="full err" id="evMsg"></div>
    <div class="full" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-em" type="submit">${ev?'Save changes':'Create event'}</button><button class="btn btn-line" type="button" id="edCancel">Cancel</button></div>
  </div></form>`;
  const back=()=>done(false);
  $('#edBack').onclick=back;$('#edCancel').onclick=back;
  const f=$('#evForm');
  f.onsubmit=async x=>{
    x.preventDefault();let ok=true;const v=n=>f[n].value.trim();
    const chk=(n,good,msg)=>{setErr(f[n],good,msg);if(!good)ok=false};
    chk('title',v('title').length>=3,'At least 3 characters');
    chk('start',!!v('start'),'Choose the start date and time');
    const st=fromInput(v('start')),en=fromInput(v('end'));
    chk('end',!en||!st||en>=st,'The end must be after the start');
    const url=v('url');chk('url',url===''||HTTPS.test(url),'Link must start with https://');
    const cap=v('capacity')===''?null:+v('capacity');chk('capacity',cap===null||(Number.isInteger(cap)&&cap>0),'Enter a whole number above 0');
    const dl=fromInput(v('deadline'));chk('deadline',!dl||!st||dl<=st,'Must be before the event starts');
    const ag=v('agenda').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.indexOf('|');return i<0?['',l.slice(0,200)]:[l.slice(0,i).trim().slice(0,20),l.slice(i+1).trim().slice(0,200)]});
    const sp=v('speakers').split('\n').map(l=>l.trim()).filter(Boolean).slice(0,30).map(l=>{const i=l.indexOf('|');return i<0?{name:l.slice(0,100),role:''}:{name:l.slice(0,i).trim().slice(0,100),role:l.slice(i+1).trim().slice(0,100)}});
    if(!ok)return;
    const btn=f.querySelector('button[type=submit]');btn.disabled=true;$('#evMsg').textContent='';
    let newBanner=null;
    try{
      const file=f.img.files[0];
      if(file){const blob=await toJpeg(file,1600);newBanner='events/'+stamp()+'.jpg';await storage.upload('event-banners',newBanner,blob)}
      const row={title:v('title'),category_id:f.category.value||null,status:f.status.value,starts_at:st,ends_at:en,venue:v('venue')||null,address:v('address')||null,
        is_online:f.online.checked,capacity:cap,registration_deadline:dl,fee_text:v('fee')||'Free',organizer:v('organizer')||null,description:v('desc')||null,
        agenda:ag,speakers:sp,featured:f.featured.checked};
      if(url)row.online_url=url;else if(!f.online.checked)row.online_url=null;
      if(newBanner)row.banner_path=newBanner;
      if(ev)await db.update('events',{id:'eq.'+ev.id},row);else await db.insert('events',{...row,created_by:uid});
      if(newBanner&&ev&&ev.banner_path)storage.remove('event-banners',ev.banner_path).catch(()=>{});
      toast(ev?'Event saved':'Event created');done(true);
    }catch(err){
      if(newBanner)storage.remove('event-banners',newBanner).catch(()=>{});
      $('#evMsg').textContent=emsg(err);btn.disabled=false;
    }
  };
  $$('input,textarea,select',f).forEach(el=>el.addEventListener('input',()=>el.classList.remove('bad')));
}

/* ------------------------------------------------------------------ articles */
/* ctx: {uid, canPublish, done(changed), backLabel}. A person editing someone else's article (a reviewer) keeps its status. */
export async function articleEditor(host,a,ctx){
  host.innerHTML='<p>Loading…</p>';
  let cats=[];try{cats=await articleCategories()}catch{}
  const x=a||{},own=!a||a.author_id===ctx.uid;
  const live=a&&a.status==='published';
  host.innerHTML=`<div class="adm-edhead"><button class="btn btn-line btn-sm" type="button" id="edBack">← ${esc(ctx.backLabel||'Back')}</button><h2 class="adm-h2" style="margin:0">${a?'Edit article':'New article'}</h2></div>
  ${a&&a.status==='rejected'&&a.rejection_reason?`<div class="card adm-card" style="margin-bottom:14px;border-color:#F8D2B3"><b>Reviewer's note:</b> ${esc(a.rejection_reason)}</div>`:''}
  <form id="arForm" class="card adm-card" novalidate><div class="g-form">
    <div class="full"><label for="ar_title">Title *</label><input class="field" id="ar_title" name="title" maxlength="200" value="${esc(x.title||'')}"><div class="err"></div></div>
    <div><label for="ar_cat">Category *</label><select class="field" id="ar_cat" name="category">${opts(cats,x.category_id,'Choose a category')}</select><div class="err"></div></div>
    <div><label for="ar_img">Cover image <small style="color:var(--muted)">(optional)</small></label><input class="field" id="ar_img" name="img" type="file" accept="image/jpeg,image/png,image/webp"><div class="err"></div></div>
    ${x.cover_path?`<div class="full"><div class="adm-thumb" style="background-image:url('${esc(coverUrl(x.cover_path))}')"></div></div>`:''}
    <div class="full"><label for="ar_sum">Short summary <small style="color:var(--muted)">(shown in lists, up to 400 characters)</small></label><textarea class="field" id="ar_sum" name="summary" rows="2" maxlength="400">${esc(x.summary||'')}</textarea></div>
    <div class="full"><label for="ar_body">Article *</label><textarea class="field" id="ar_body" name="content" rows="14" maxlength="50000" placeholder="Write plain text. Leave a blank line between paragraphs.">${esc(x.content||'')}</textarea><div class="err"></div></div>
    <div class="full err" id="arMsg"></div>
    <div class="full" style="display:flex;gap:10px;flex-wrap:wrap">
      ${own&&!live?`<button class="btn btn-line" type="submit" data-st="draft">Save draft</button>
        ${ctx.canPublish?`<button class="btn btn-em" type="submit" data-st="published">Publish now</button>`:`<button class="btn btn-em" type="submit" data-st="pending">Submit for review</button>`}`
        :`<button class="btn btn-em" type="submit" data-st="keep">Save changes</button>`}
      <button class="btn btn-line" type="button" id="edCancel">Cancel</button></div>
  </div></form>`;
  const back=()=>ctx.done(false);
  $('#edBack').onclick=back;$('#edCancel').onclick=back;
  const f=$('#arForm');let want='keep';
  $$('button[type=submit]',f).forEach(b=>b.addEventListener('click',()=>{want=b.dataset.st}));
  f.onsubmit=async e=>{
    e.preventDefault();let ok=true;const v=n=>f[n].value.trim();
    const chk=(n,good,msg)=>{setErr(f[n],good,msg);if(!good)ok=false};
    const strict=want!=='draft';
    chk('title',v('title').length>=3,'At least 3 characters');
    chk('category',!strict||!!f.category.value,'Choose a category');
    chk('content',strict?v('content').length>=50:true,'Please write at least 50 characters before publishing or submitting');
    if(!ok)return;
    const btns=$$('button[type=submit]',f);btns.forEach(b=>b.disabled=true);$('#arMsg').textContent='';
    let cover=null;
    try{
      const file=f.img.files[0];
      if(file){const blob=await toJpeg(file,1600);cover=ctx.uid+'/cover-'+stamp()+'.jpg';await storage.upload('article-images',cover,blob)}
      const row={title:v('title'),category_id:f.category.value||null,summary:v('summary')||null,content:f.content.value};
      if(cover)row.cover_path=cover;
      if(want!=='keep')row.status=want;
      if(a)await db.update('articles',{id:'eq.'+a.id},row);else await db.insert('articles',{...row,author_id:ctx.uid,status:want==='keep'?'draft':want});
      if(cover&&a&&a.cover_path)storage.remove('article-images',a.cover_path).catch(()=>{});
      toast(want==='published'?'Published':want==='pending'?'Submitted for review':'Saved');ctx.done(true);
    }catch(err){
      if(cover)storage.remove('article-images',cover).catch(()=>{});
      $('#arMsg').textContent=emsg(err);btns.forEach(b=>b.disabled=false);
    }
  };
  $$('input,textarea,select',f).forEach(el=>el.addEventListener('input',()=>el.classList.remove('bad')));
}

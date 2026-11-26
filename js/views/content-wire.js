/* Public Events, News & Blogs pages and the member "Write" page. All content comes from the database; nothing is invented. */
import {$,$$,esc,ini} from '../lib/util.js';
import {S,can} from '../state.js';
import {toast,openModal,closeModal,gate,motion,bars,hooks,app,LOCK_ICON} from '../ui.js';
import {auth,db} from '../lib/supa.js';
import {friendly} from '../services/auth.js';
import {listEvents,getEvent,myRegistration,registerFor,cancelRegistration,onlineUrl,dayOf,timeRange,isPast,bannerUrl,agendaLines,
  listArticles,getArticle,coverUrl,paragraphs,readMins,myArticles} from '../services/content.js';
import {articleEditor} from './editors.js';
import {svg,ICO,notFound} from './templates.js';

const art=url=>url?`background-image:url('${esc(url)}')`:'background:linear-gradient(135deg,var(--navy-2),var(--em))';
const isVerifiedOrStaff=()=>S.isAdmin||(S.profile&&S.profile.verification_status==='verified');

/* ------------------------------------------------------------------ events */
const seatsText=e=>{if(isPast(e)||e.status==='cancelled')return '';if(!e.capacity)return 'Open to all';const left=e.capacity-e.seats_taken;return left>0?left+' seats left':'Fully booked'};
export const eventCard=(e,i=0)=>{
  const d=dayOf(e.starts_at),past=isPast(e),cancelled=e.status==='cancelled',where=e.venue||(e.is_online?'Online':'');
  return `<article class="card ev reveal d${i%3}"><div class="dt"><b>${esc(d.day)}</b><small>${esc(d.mon)}</small></div><div class="ov"><div class="bg" style="${art(bannerUrl(e.banner_path))}"></div></div>
    <span class="tag ${cancelled?'n':''}" style="align-self:flex-start">${esc(cancelled?'Cancelled':e.category||'Event')}</span><h3 style="margin-top:12px">${esc(e.title)}</h3>
    <div class="info"><span>🕘 ${esc(timeRange(e))}</span>${where?`<span>📍 ${esc(where)}</span>`:''}${seatsText(e)?`<span>${esc(seatsText(e))}</span>`:''}</div>
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="btn btn-navy btn-sm" href="#event/${esc(e.slug)}">${past||cancelled?'View details':'Register now'}</a><a class="more" href="#event/${esc(e.slug)}">Details <span>→</span></a></div></article>`;
};

let evF='upcoming',evC='All';
export async function eventsWire(){
  const list=$('#evList');if(!list)return;
  let all;
  try{all=await listEvents()}catch{list.innerHTML='<p>Events could not be loaded. Please try again in a moment.</p>';return}
  const cats=[...new Set(all.map(e=>e.category).filter(Boolean))];
  if(evC!=='All'&&!cats.includes(evC))evC='All';
  $('#evcat').innerHTML=cats.length?['All',...cats].map(x=>`<button class="chip ${x===evC?'on':''}" data-cat="${esc(x)}">${esc(x)}</button>`).join(''):'';
  $$('#evc .chip').forEach(x=>x.classList.toggle('on',x.dataset.f===evF));
  const f=()=>{
    let rows=all.filter(e=>(evF==='all'||(evF==='past')===isPast(e))&&(evC==='All'||e.category===evC));
    rows=evF==='past'?rows.slice().reverse():rows;
    const feat=evF!=='past'&&evC==='All'?rows.find(e=>e.featured&&e.status==='published'&&!isPast(e)):null;
    if(feat){const d=dayOf(feat.starts_at);rows=rows.filter(e=>e!==feat);
      $('#evFeat').innerHTML=`<article class="card reveal" style="padding:0;overflow:hidden;flex-direction:row;flex-wrap:wrap;margin-bottom:56px">
        <div class="ov" style="flex:1 1 480px;min-height:340px;border-radius:0"><div class="bg" style="${art(bannerUrl(feat.banner_path))}"></div><div style="position:absolute;top:22px;left:22px;z-index:3"><span class="tag">Featured</span></div></div>
        <div style="flex:1 1 380px;padding:44px;display:flex;flex-direction:column;justify-content:center">${feat.category?`<span class="tag n" style="align-self:flex-start">${esc(feat.category)}</span>`:''}<h2 style="margin:16px 0 12px;font-size:2.1rem">${esc(feat.title)}</h2>${feat.description?`<p>${esc(feat.description.slice(0,220))}${feat.description.length>220?'…':''}</p>`:''}
        <div style="display:grid;gap:8px;margin:20px 0;color:var(--muted);font-size:.93rem"><span>📅 ${esc(d.full)} · ${esc(timeRange(feat))}</span>${feat.venue?`<span>📍 ${esc(feat.venue)}</span>`:''}</div>
        <a class="btn btn-em" style="align-self:flex-start" href="#event/${esc(feat.slug)}">Register now <span>→</span></a></div></article>`}
    else $('#evFeat').innerHTML='';
    list.innerHTML=rows.map(eventCard).join('');
    $('#evEmpty').classList.toggle('on',!rows.length&&!feat);
    motion(app);
  };
  $('#evc').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;evF=b.dataset.f;$$('#evc .chip').forEach(x=>x.classList.toggle('on',x===b));f()};
  $('#evcat').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;evC=b.dataset.cat;$$('#evcat .chip').forEach(x=>x.classList.toggle('on',x===b));f()};
  f();
}

const REG_ERR={not_authenticated:'Please sign in first.',not_verified:'Only verified alumni can register. See your profile page for your status.',registration_closed:'Registration for this event has closed.',
  event_full:'There are not enough seats left for that many people.',already_registered:'You are already registered.',event_not_found:'This event is not open for registration.',invalid_attendees:'Choose between 1 and 4 people.'};
const regErr=e=>{const m=String((e&&e.message)||'');for(const k in REG_ERR)if(m.includes(k))return REG_ERR[k];return friendly(e)};

export async function eventWire(key){
  const box=$('#evBox');if(!box)return;
  let e;
  try{e=await getEvent(key)}catch{box.innerHTML=notFound('Event could not be loaded','Please try again in a moment.');return}
  if(!e){box.innerHTML=notFound('Event not found','This event may have been removed.');return}
  document.title=e.title+' | GPCPSN';
  const s=auth.getSession(),uid=s&&s.user.id,past=isPast(e),cancelled=e.status==='cancelled';
  const canReg=!!uid&&isVerifiedOrStaff();
  let reg=null,link=null,more=[];
  try{
    if(canReg){reg=await myRegistration(uid,e.id);if(reg&&reg.status==='registered'&&e.is_online){link=await onlineUrl(e.id)}}
    more=(await listEvents()).filter(x=>x.id!==e.id&&!isPast(x)&&x.status==='published').slice(0,3);
  }catch{}
  const d=dayOf(e.starts_at),going=!!(reg&&reg.status==='registered'),left=e.capacity?e.capacity-e.seats_taken:null,full=left!==null&&left<=0;
  const closed=e.registration_deadline&&new Date(e.registration_deadline)<new Date();
  const ag=agendaLines(e.agenda),sp=Array.isArray(e.speakers)?e.speakers:[];
  let btn;
  if(cancelled)btn=`<button class="btn btn-line" disabled>Event cancelled</button>`;
  else if(past)btn=`<button class="btn btn-line" disabled>Event ended</button>`;
  else if(going)btn=`<button class="btn done" disabled>You're registered ✓</button><button class="btn btn-line btn-sm" id="cancelBtn">Cancel registration</button>`;
  else if(!uid)btn=`<button class="btn btn-em" id="regBtn">Sign in to register</button>`;
  else if(!canReg)btn=`<a class="btn btn-line" href="#me">Registration opens once you are verified</a>`;
  else if(closed)btn=`<button class="btn btn-line" disabled>Registration closed</button>`;
  else if(full)btn=`<button class="btn btn-line" disabled>Fully booked</button>`;
  else btn=`<button class="btn btn-em" id="regBtn">Register now</button>`;
  box.innerHTML=`
  <section class="phero" style="min-height:360px"><div class="bg" style="${art(bannerUrl(e.banner_path))}"></div>
    <div class="wrap"><div class="phero-copy"><div class="crumb"><a href="#events">Events</a><span>/</span>Event details</div><span class="tag">${esc(cancelled?'Cancelled':e.category||'Event')}</span><h1 style="margin-top:14px">${esc(e.title)}</h1>${e.venue||e.is_online?`<p>${esc(e.venue||'Online')}</p>`:''}</div>
    <div class="mini-stats"><div><b>${esc(d.day)}</b><small>${esc(d.mon)}</small></div><div><b>${esc(e.fee_text)}</b><small>Fee</small></div></div></div>
  </section>
  <section class="sec"><div class="wrap jd">
    <div class="reveal">
      ${e.description?`<div class="card" style="padding:32px"><div class="kicker">About the event</div><p style="white-space:pre-line">${esc(e.description)}</p></div>`:''}
      ${ag.length?`<div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Agenda</div><div class="agenda">${ag.map(a=>`<div class="ag"><b>${esc(a[0])}</b><span>${esc(a[1])}</span></div>`).join('')}</div></div>`:''}
      ${sp.length?`<div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Speakers & guests</div><div class="spk">${sp.map(x=>`<div><div class="av" style="display:grid;place-items:center;background:linear-gradient(135deg,var(--em),var(--navy-2));color:#fff;font-weight:800">${esc(ini(x.name))}</div><b>${esc(x.name)}</b><small>${esc(x.role||'')}</small></div>`).join('')}</div></div>`:''}
      ${e.organizer?`<div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Organised by</div><p>${esc(e.organizer)}</p></div>`:''}
    </div>
    <aside class="side reveal d1"><div class="card" style="padding:28px">
      <div class="row" style="border:0;padding:0 0 16px"><div class="ic">${svg(ICO.cal,20)}</div><div><small>Date & time</small><b>${esc(d.full)}<br>${esc(timeRange(e))}</b></div></div>
      ${e.venue||e.address||e.is_online?`<div class="row" style="border:0;padding:0 0 16px"><div class="ic">${svg(ICO.pin,20)}</div><div><small>${e.is_online&&!e.venue?'Online':'Venue'}</small><b>${esc(e.venue||'Online')}${e.address?'<br><span style="font-weight:500">'+esc(e.address)+'</span>':''}</b></div></div>`:''}
      ${e.capacity?`<small style="color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.07em">Seats</small><div class="seats"><i data-w="${Math.min(100,Math.round(e.seats_taken/e.capacity*100))}"></i></div><div style="font-size:.88rem;color:var(--muted)">${left>0?left+' of '+e.capacity+' seats left':'Fully booked'}</div>`:'<div style="font-size:.9rem;color:var(--muted)">Open to all alumni</div>'}
      ${e.registration_deadline&&!past&&!cancelled?`<div style="font-size:.85rem;color:var(--muted);margin-top:8px">Register by ${esc(dayOf(e.registration_deadline).short)}</div>`:''}
      <div class="pri" id="regRow">${btn}</div><div class="err" id="regErr" style="margin-top:8px"></div>
      ${link&&/^https:\/\//.test(link)?`<div style="margin-top:16px"><a class="btn btn-navy" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Join online ↗</a></div>`:''}
    </div></aside>
  </div>
  ${more.length?`<div class="wrap" style="margin-top:70px"><div class="sec-h"><div><div class="kicker">More</div><h2>Other upcoming events</h2></div></div><div class="grid g3">${more.map(eventCard).join('')}</div></div>`:''}
  </section>`;
  motion(box);bars(box);
  const again=()=>eventWire(key);
  const rb=$('#regBtn');
  if(rb)rb.onclick=()=>gate('Registration is for signed-in, verified alumni.',()=>{
    openModal(`<div class="kicker">Register</div><h2 style="font-size:1.55rem">${esc(e.title)}</h2><p style="margin:6px 0 20px">${esc(d.full)} · ${esc(timeRange(e))}</p>
      <div class="g-form"><div class="full"><label for="att2">How many people are coming (including you)?</label><select class="field" id="att2">${[1,2,3,4].map(n=>`<option>${n}</option>`).join('')}</select></div>
      <div class="full"><label for="attN">Notes for the organisers (optional)</label><input class="field" id="attN" maxlength="300"></div>
      <div class="full err" id="rgErr"></div><div class="full"><button class="btn btn-em" id="confirm" style="width:100%">Confirm registration</button></div></div>`);
    $('#confirm').onclick=async()=>{
      const b=$('#confirm');b.disabled=true;
      try{await registerFor(e.id,+$('#att2').value,$('#attN').value.trim());closeModal();toast('Registration confirmed');again()}
      catch(err){$('#rgErr').textContent=regErr(err);b.disabled=false}
    };
  });
  const cb=$('#cancelBtn');
  if(cb)cb.onclick=async()=>{cb.disabled=true;try{await cancelRegistration(e.id);toast('Registration cancelled');again()}catch(err){$('#regErr').textContent=regErr(err);cb.disabled=false}};
}

/* ------------------------------------------------------------------ news & blogs */
export const articleCard=(n,k=0)=>`<article class="card nw reveal d${k%3}"><div class="ov"><div class="bg" style="${art(coverUrl(n.cover_path))}"></div></div>
  ${n.category?`<span class="tag ${k%2?'g':''}" style="align-self:flex-start">${esc(n.category)}</span>`:''}<h3 style="margin-top:12px">${esc(n.title)}</h3>
  <div class="meta">${esc(dayOf(n.published_at).short)} · ${esc(n.author_name||'')}</div>${n.summary?`<p>${esc(n.summary)}</p>`:''}<a class="more" href="#blog/${esc(n.slug)}" style="margin-top:auto">Read more <span>→</span></a></article>`;

let nC='All';
export async function newsWire(){
  const grid=$('#nGrid');if(!grid)return;
  let all;
  try{all=await listArticles()}catch{grid.innerHTML='<p>Articles could not be loaded. Please try again in a moment.</p>';return}
  const cats=[...new Set(all.map(n=>n.category).filter(Boolean))];
  if(nC!=='All'&&!cats.includes(nC))nC='All';
  $('#nc').innerHTML=cats.length?['All',...cats].map(x=>`<button class="chip ${x===nC?'on':''}" data-cat="${esc(x)}">${esc(x)}</button>`).join(''):'';
  const f=()=>{
    const q=$('#nq').value.trim().toLowerCase();
    const list=all.filter(n=>(nC==='All'||n.category===nC)&&(!q||[n.title,n.summary,n.author_name].join(' ').toLowerCase().includes(q)));
    const feat=list.find(n=>n.featured)||list[0],rest=list.filter(n=>n!==feat);
    const ff=$('#nFeat');
    if(feat){ff.style.display='flex';ff.innerHTML=`<div class="ov" style="flex:1 1 460px;min-height:360px;border-radius:0"><div class="bg" style="${art(coverUrl(feat.cover_path))}"></div>${feat.featured?'<div style="position:absolute;top:20px;left:20px;z-index:3"><span class="tag">Featured</span></div>':''}</div>
      <div style="flex:1 1 380px;padding:44px;display:flex;flex-direction:column;justify-content:center">${feat.category?`<span class="tag n" style="align-self:flex-start">${esc(feat.category)}</span>`:''}<h2 style="margin:16px 0 12px;font-size:2rem">${esc(feat.title)}</h2>${feat.summary?`<p>${esc(feat.summary)}</p>`:''}
      <div class="meta" style="margin-top:14px">${esc(dayOf(feat.published_at).short)} · ${esc(feat.author_name||'')}</div><a class="btn btn-navy" style="align-self:flex-start;margin-top:20px" href="#blog/${esc(feat.slug)}">Read article <span>→</span></a></div>`}
    else{ff.style.display='none';ff.innerHTML=''}
    grid.innerHTML=rest.map(articleCard).join('');
    $('#nct').textContent=list.length?`${list.length} ${list.length===1?'article':'articles'}`:'';
    $('#nEmpty').classList.toggle('on',!list.length);
    motion(app);
  };
  $('#nq').addEventListener('input',f);
  $('#nc').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;nC=b.dataset.cat;$$('#nc .chip').forEach(x=>x.classList.toggle('on',x===b));f()};
  f();
}

export async function blogWire(slug){
  const box=$('#blogBox');if(!box)return;
  let n,rel=[];
  try{n=await getArticle(slug);if(n)rel=(await listArticles()).filter(x=>x.id!==n.id).slice(0,3)}catch{box.innerHTML=notFound('Article could not be loaded','Please try again in a moment.');return}
  if(!n){box.innerHTML=notFound('Article not found','This article may have moved.');return}
  document.title=n.title+' | GPCPSN';
  const ps=paragraphs(n.content);
  box.innerHTML=`
  <section class="phero" style="min-height:420px"><div class="bg" style="${art(coverUrl(n.cover_path))}"></div>
    <div class="wrap"><div class="phero-copy"><div class="crumb"><a href="#news">News & Blogs</a><span>/</span>Article</div>${n.category?`<span class="tag">${esc(n.category)}</span>`:''}<h1 style="margin-top:14px;max-width:22ch">${esc(n.title)}</h1><p>By ${esc(n.author_name||'GPCPSN Alumni Network')}${n.author_graduation_year?' (Batch '+esc(n.author_graduation_year)+')':''} · ${esc(dayOf(n.published_at).full)} · ${readMins(n.content)} min read</p></div></div>
  </section>
  <section class="sec"><div class="wrap"><article class="art reveal">
    ${n.summary?`<p class="lead">${esc(n.summary)}</p>`:''}
    ${ps.map(p=>`<p style="white-space:pre-line">${esc(p)}</p>`).join('')}
    <div class="share"><span style="font-weight:700;color:var(--navy);font-size:.9rem">Share</span><button class="chip" id="shareCopy">Copy link</button><button class="chip" data-share="whatsapp">WhatsApp</button><button class="chip" data-share="linkedin">LinkedIn</button></div>
  </article></div>
  ${rel.length?`<div class="wrap" style="margin-top:80px"><div class="sec-h"><div><div class="kicker">Related</div><h2>Keep reading</h2></div></div><div class="grid g3">${rel.map(articleCard).join('')}</div></div>`:''}
  </section>`;
  motion(box);
  $('#shareCopy').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(location.href).catch(()=>{});toast('Link copied')};
  $$('[data-share]',box).forEach(b=>b.onclick=()=>{const u=encodeURIComponent(location.href),t=encodeURIComponent(n.title);
    const to={whatsapp:'https://wa.me/?text='+t+'%20'+u,linkedin:'https://www.linkedin.com/sharing/share-offsite/?url='+u}[b.dataset.share];
    if(to)window.open(to,'_blank','noopener,noreferrer')});
}

/* ------------------------------------------------------------------ home page sections (hidden until there is real content) */
export async function loadHomeEvents(){
  try{
    const rows=(await listEvents()).filter(e=>e.status==='published'&&!isPast(e)).slice(0,3);
    const sec=$('#homeEvSec'),box=$('#homeEv');if(!sec||!box||!rows.length)return;
    box.innerHTML=rows.map(eventCard).join('');sec.style.display='';motion(box);
  }catch{/* section stays hidden */}
}
export async function loadHomeNews(){
  try{
    const rows=(await listArticles()).slice(0,3);
    const sec=$('#homeNewsSec'),box=$('#homeNews');if(!sec||!box||!rows.length)return;
    box.innerHTML=rows.map(articleCard).join('');sec.style.display='';motion(box);
  }catch{/* section stays hidden */}
}

/* ------------------------------------------------------------------ "Write" page for verified alumni and staff */
const AST={draft:'Draft',pending:'Waiting for review',published:'Published',rejected:'Needs changes',archived:'Unpublished'};
export async function writeWire(){
  const box=$('#wrBox');if(!box)return;
  const gateBox=h=>{box.innerHTML=`<div style="text-align:center;padding:30px 10px"><div class="ic dark" style="margin:0 auto 18px;width:68px;height:68px;border-radius:50%">${LOCK_ICON}</div>${h}</div>`};
  const s=auth.getSession();
  if(!s){gateBox(`<h2 style="font-size:1.5rem">Sign in to write an article</h2><p style="margin:10px 0 22px">Only verified alumni can publish blogs on the network.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a href="#login" class="btn btn-em">Sign in</a><a href="#login/join" class="btn btn-line">Create account</a></div>`);return}
  if(!isVerifiedOrStaff()){gateBox(`<h2 style="font-size:1.5rem">Your account is not verified yet</h2><p style="margin:10px 0 22px">Articles can be written once the alumni cell has verified you.</p><a href="#me" class="btn btn-em">Go to my profile</a>`);return}
  const uid=s.user.id,canPublish=can('articles.publish');
  const list=async()=>{
    box.innerHTML='<p>Loading…</p>';
    let rows;try{rows=await myArticles(uid)}catch(err){box.innerHTML=`<p>${esc(friendly(err))}</p>`;return}
    box.innerHTML=`<div class="sec-h" style="margin-bottom:20px"><div><div class="kicker">Write for the network</div><h2>My articles</h2></div><button class="btn btn-em" id="wrNew">New article +</button></div>
      <p style="margin-bottom:22px">${canPublish?'Your articles go live as soon as you publish them.':'Submit an article and the alumni cell will review it before it goes live. You can keep working on drafts any time.'}</p>
      ${rows.length?rows.map(r=>`<article class="card" style="padding:20px 24px;margin-bottom:14px" data-id="${esc(r.id)}"><div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start">
        <div style="min-width:0;flex:1 1 300px"><h3 style="font-size:1.1rem">${esc(r.title)} <span class="tag ${r.status==='published'?'':'n'}">${esc(AST[r.status]||r.status)}</span></h3>${r.rejection_reason&&r.status==='rejected'?`<div style="color:var(--muted);font-size:.9rem;margin-top:6px"><b>Reviewer's note:</b> ${esc(r.rejection_reason)}</div>`:''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${r.status==='published'?`<a class="btn btn-line btn-sm" href="#blog/${esc(r.slug)}">View</a>`:''}${r.status!=='published'||canPublish?'<button class="btn btn-line btn-sm" data-wr="edit">Edit</button>':''}${r.status==='draft'?'<button class="btn btn-line btn-sm" data-wr="del">Delete</button>':''}</div></div></article>`).join(''):`<p>You have not written anything yet. Start with “New article”.</p>`}`;
    const edit=row=>articleEditor(box,row,{uid,canPublish,backLabel:'My articles',done:()=>list()});
    $('#wrNew').onclick=()=>edit(null);
    box.onclick=async e=>{
      const b=e.target.closest('[data-wr]');if(!b)return;const id=b.closest('[data-id]').dataset.id;
      if(b.dataset.wr==='edit'){try{const r=(await db.select('articles','*',{id:'eq.'+id}))[0];if(r)edit(r)}catch(err){toast(friendly(err))}return}
      openModal(`<h2 style="font-size:1.35rem">Delete this draft?</h2><p style="margin-top:10px">This cannot be undone.</p><div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-em" id="dlYes">Delete</button><button class="btn btn-line" id="dlNo">Cancel</button></div>`);
      $('#dlNo').onclick=closeModal;
      $('#dlYes').onclick=async()=>{try{await db.remove('articles',{id:'eq.'+id});closeModal();toast('Draft deleted');list()}catch(err){closeModal();toast(friendly(err))}};
    };
  };
  list();
}

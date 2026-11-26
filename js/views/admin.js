/* Admin panel (the "CMS"): sidebar + sections. Which sections appear depends on the signed-in person's permissions (S.perms).
   This is only a convenience: every action is re-checked by the database, so hiding a button is never the security. */
import {$,$$,esc} from '../lib/util.js';
import {S,can} from '../state.js';
import {toast,openModal,closeModal} from '../ui.js';
import {auth,db} from '../lib/supa.js';
import {friendly} from '../services/auth.js';
import {isId} from '../services/directory.js';
import {TYPE} from '../services/jobs.js';
import {eventEditor,articleEditor} from './editors.js';
import {eventCategories,dayOf,timeRange,isPast} from '../services/content.js';

const ERR={not_allowed:'You do not have permission to do that.',user_not_found:'No account uses that email. The person must register on the website first.',
  role_not_found:'That role does not exist.',last_superadmin:'There must always be at least one Superadmin.',only_superadmin:'Only a Superadmin can do that.',
  locked_role:'The Superadmin role is built in and cannot be changed or deleted.',role_in_use:'This role is still given to someone. Remove it from them first.',
  unknown_permission:'One of the permissions is not valid.'};
const aerr=e=>{const m=String((e&&e.message)||'');for(const k in ERR)if(m.includes(k))return ERR[k];return /check constraint|violates/i.test(m)?'Some details are not valid. Please check them.':friendly(e)};

const I={dash:'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z',users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  job:'M4 7h16v13H4zM9 7V4h6v3',flag:'M5 21V4M5 4h12l-2 4 2 4H5',mail:'M3 5h18v14H3zM3 5l9 8 9-8',key:'M15 7a4 4 0 11-3.9 5H3v-2h2V8h2v2h4.1A4 4 0 0115 7z',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',cal:'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',doc:'M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h6'};
const ic=d=>`<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const SECTIONS=[
  {k:'dashboard',t:'Dashboard',p:'dashboard.view',i:I.dash},
  {k:'members',t:'Alumni',p:'members.review',i:I.users,badge:'members_pending'},
  {k:'jobs',t:'Jobs',p:'jobs.review',i:I.job,badge:'jobs_pending'},
  {k:'events',t:'Events',p:'events.manage',i:I.cal},
  {k:'articles',t:'News & blogs',p:['articles.review','articles.publish'],i:I.doc,badge:'articles_pending'},
  {k:'reports',t:'Reports',p:'reports.handle',i:I.flag,badge:'reports_open'},
  {k:'messages',t:'Messages',p:'messages.read',i:I.mail,badge:'messages_new'},
  {k:'staff',t:'Staff & roles',p:'roles.manage',i:I.key},
  {k:'activity',t:'Activity log',p:'audit.view',i:I.list}
];
const day=d=>esc(new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}));
const when=d=>esc(new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}));
const btns=a=>a.filter(Boolean).map(x=>`<button class="btn ${x[2]||'btn-line'} btn-sm" data-act="${x[0]}">${x[1]}</button>`).join('');
const row=(id,head,sub,meta,actions,extra='')=>`<article class="card adm-row" data-id="${esc(id)}" ${extra}><div class="adm-rowin"><div class="adm-rowtxt">${head}<div class="adm-sub">${sub}</div><div class="adm-meta">${meta}</div></div><div class="adm-acts">${actions}</div></div></article>`;
const slug=s=>{let k=String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/^[0-9_]+/,'').slice(0,30);return k.length<2?'':k};

function confirmBox(title,text,okLabel,fn){
  openModal(`<h2 style="font-size:1.3rem">${esc(title)}</h2><p style="margin-top:10px">${esc(text)}</p><div class="err" id="cbErr"></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-em" id="cbOk">${esc(okLabel)}</button><button class="btn btn-line" id="cbNo">Cancel</button></div>`);
  $('#cbNo').onclick=closeModal;
  $('#cbOk').onclick=async()=>{try{await fn();closeModal()}catch(e){$('#cbErr').textContent=aerr(e)}};
}

export async function adminWire(arg){
  const box=$('#adBox');if(!box)return;
  const note=h=>{box.innerHTML=`<div class="wrap" style="max-width:640px"><div class="card" style="padding:28px">${h}</div></div>`};
  if(!auth.getSession()){note(`<p>Please <a class="more" href="#login">sign in</a> to open the admin panel.</p>`);return}
  if(!S.isAdmin){note(`<p>This area is for the alumni cell and faculty. If you should have access, ask a Superadmin to give you a role.</p>`);return}
  const allowed=SECTIONS.filter(s=>[].concat(s.p).some(can));
  const [argSec,argSub]=String(arg||'').split('/');
  const cur=allowed.find(s=>s.k===argSec)||allowed[0];
  let tab='';
  const TABS={members:[['pending','Waiting'],['verified','Verified'],['rejected','Rejected'],['suspended','Suspended'],['all','Everyone']],
    jobs:[['pending','Waiting'],['approved','Live'],['rejected','Not approved'],['all','Everyone']],
    messages:[['new','New'],['handled','Handled'],['all','All']],
    events:[['upcoming','Upcoming'],['draft','Drafts'],['past','Past'],['cancelled','Cancelled'],['all','All']],
    articles:[['pending','Waiting for review'],['published','Published'],['draft','My drafts'],['rejected','Not approved'],['archived','Unpublished'],['all','All']],staff:[['people','People'],['roles','Roles']]};
  tab=TABS[cur.k]?TABS[cur.k][0][0]:'';
  let counts=null,editing=null;
  if(argSub==='new'&&['events','articles'].includes(cur.k))editing={kind:cur.k==='events'?'event':'article',row:null};
  const me=auth.getSession().user.id;
  const cache={};
  const name=(S.profile&&S.profile.full_name)||'Staff';

  box.innerHTML=`<div class="adm"><aside class="adm-side"><div class="adm-who"><b>${esc(name)}</b><span>${esc(S.roles.join(', ')||'Staff')}</span></div>
    <nav class="adm-nav">${allowed.map(s=>`<a href="#admin/${s.k}" class="${s.k===cur.k?'on':''}">${ic(s.i)}<span>${esc(s.t)}</span><em data-badge="${s.badge||''}"></em>${['events','articles'].includes(s.k)?`<i class="adm-plus" data-plus="${s.k}" title="Add new" role="link" tabindex="0">+</i>`:''}</a>`).join('')}</nav></aside>
    <div class="adm-main"><div class="adm-head"><div class="kicker">Admin panel</div><h1>${esc(cur.t)}</h1></div><div id="adTabs"></div><div id="adMain"><p>Loading…</p></div></div></div>`;

  const paintBadges=()=>{if(!counts)return;$$('[data-badge]',box).forEach(b=>{const n=counts[b.dataset.badge];b.textContent=n>0?n:'';b.style.display=n>0?'':'none'})};
  const fetchCounts=async()=>{if(!can('dashboard.view'))return null;try{counts=await db.rpc('admin_dashboard');paintBadges()}catch{}return counts};
  const drawTabs=()=>{const t=TABS[cur.k];$('#adTabs').innerHTML=t?`<div class="chips adm-tabs">${t.map(x=>`<button class="chip ${x[0]===tab?'on':''}" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`:''};

  const R={
    async dashboard(el){
      const [c,act]=await Promise.all([fetchCounts(),db.rpc('admin_recent_activity',{p_limit:10})]);
      const card=(n,label,sec)=>{const ok=sec&&allowed.some(s=>s.k===sec);return `<${ok?`a href="#admin/${sec}"`:'div'} class="card adm-stat"><b>${esc(c[n])}</b><span>${esc(label)}</span></${ok?'a':'div'}>`};
      el.innerHTML=`<div class="adm-stats">${card('members_pending','Alumni waiting for verification','members')}${card('jobs_pending','Jobs waiting for review','jobs')}${card('reports_open','Open reports','reports')}${card('messages_new','New messages','messages')}
        ${card('articles_pending','Articles waiting for review','articles')}${card('events_upcoming','Upcoming events','events')}${card('members_verified','Verified alumni','')}${card('jobs_live','Live job listings','')}</div>
        <h2 class="adm-h2">Quick actions</h2><div class="adm-quick">${can('events.manage')?'<a class="btn btn-em btn-sm" href="#admin/events/new">+ New event</a>':''}${can('articles.review')||can('articles.publish')?'<a class="btn btn-em btn-sm" href="#admin/articles/new">+ Write article</a>':''}${can('jobs.publish')||can('jobs.review')?'<a class="btn btn-line btn-sm" href="#post-job">+ Post a job</a>':''}</div>
        <h2 class="adm-h2">Recent activity</h2>${actList(act)}`;
    },
    async members(el){
      const rows=await db.rpc('admin_list_members',{p_status:tab==='all'?null:tab});
      el.innerHTML=rows.length?rows.map(r=>row(r.id,`<h3>${esc(r.full_name||'(no name)')} <span class="tag">${esc(r.verification_status)}</span></h3>`,
        `${esc(r.email)} · Batch ${esc(r.graduation_year??'?')} · Enrolment: ${esc(r.enrollment_no||'not given')}${r.current_company?' · '+esc(r.current_company):''}${r.city?' · '+esc(r.city):''}`,
        `Registered ${day(r.created_at)}${r.verification_note?` · Note: ${esc(r.verification_note)}`:''}`,
        btns([r.verification_status!=='verified'?['verified',r.verification_status==='suspended'?'Reinstate':'Verify','btn-em']:null,
          ['pending','verified'].includes(r.verification_status)?['rejected','Reject']:null,r.verification_status==='verified'?['suspended','Suspend']:null]))).join(''):`<p>${tab==='pending'?'Nobody is waiting for verification.':'Nobody here.'}</p>`;
    },
    async jobs(el){
      const rows=await db.select('jobs','*',{...(tab==='all'?{}:{status:'eq.'+tab}),order:'created_at.desc',limit:'200'});
      const ids=[...new Set(rows.map(r=>r.submitted_by))];
      const names={};if(ids.length)(await db.select('profiles','id,full_name',{id:'in.('+ids.join(',')+')'})).forEach(p=>names[p.id]=p.full_name);
      el.innerHTML=rows.length?rows.map(r=>row(r.id,`<h3>${esc(r.title)} <span class="tag">${esc(r.status)}</span>${r.featured?' <span class="tag g">Featured</span>':''}</h3>`,
        `${esc(r.company)} · ${esc(r.location)} · ${esc(TYPE[r.employment_type]||'')} · Apply: ${esc(r.apply_url||r.apply_email||'')}<br><span style="white-space:pre-line">${esc(r.description.slice(0,400))}${r.description.length>400?'…':''}</span>`,
        `Posted by ${esc(names[r.submitted_by]||'unknown')} on ${day(r.created_at)}${r.rejection_reason?` · Reason: ${esc(r.rejection_reason)}`:''}`,
        btns([r.status!=='approved'?['approved','Approve','btn-em']:null,['pending','approved'].includes(r.status)?['rejected',r.status==='approved'?'Take down':'Reject']:null,
          r.status==='approved'?[r.featured?'unfeature':'feature',r.featured?'Unfeature':'Feature']:null]))).join(''):`<p>${tab==='pending'?'No jobs are waiting for review.':'Nothing here.'}</p>`;
    },
    async reports(el){
      const rows=await db.select('content_reports','*',{status:'eq.open',order:'created_at.desc',limit:'100'});
      const ids=[...new Set(rows.map(r=>r.entity_id))];
      const jobs={};if(ids.length&&can('jobs.review'))(await db.select('jobs','id,title,company,status',{id:'in.('+ids.join(',')+')'})).forEach(j=>jobs[j.id]=j);
      el.innerHTML=rows.length?rows.map(r=>{const j=jobs[r.entity_id];return row(r.id,`<h3>Report on ${j?esc(j.title)+' · '+esc(j.company):'a listing'}</h3>`,`“${esc(r.reason)}”`,`Reported ${day(r.created_at)}${j?` · Listing is ${esc(j.status)}`:''}`,
        btns([j&&j.status==='approved'?['takedown','Take down listing','btn-em']:null,['dismiss','Dismiss report']]),`data-job="${esc(r.entity_id)}"`)}).join(''):`<p>No open reports.</p>`;
    },
    async events(el){
      const [rows,regs,cats]=await Promise.all([db.select('events','*',{order:'starts_at.desc',limit:'300'}),db.select('event_registrations','event_id,attendees',{status:'eq.registered',limit:'5000'}),eventCategories().catch(()=>[])]);
      const taken={};regs.forEach(r=>taken[r.event_id]=(taken[r.event_id]||0)+r.attendees);
      const cn=Object.fromEntries(cats.map(c=>[c.id,c.name]));
      rows.forEach(r=>cache[r.id]=r);
      const list=rows.filter(r=>tab==='all'||(tab==='draft'&&r.status==='draft')||(tab==='cancelled'&&r.status==='cancelled')||(tab==='upcoming'&&r.status==='published'&&!isPast(r))||(tab==='past'&&r.status==='published'&&isPast(r)));
      if(tab==='upcoming')list.reverse();
      el.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px"><p style="max-width:620px">Create events, publish them for alumni to register, and see who is coming.</p><button class="btn btn-em" data-act="newevent">New event +</button></div>`+
        (list.length?list.map(r=>{const d=dayOf(r.starts_at);return row(r.id,`<h3>${esc(r.title)} <span class="tag ${r.status==='published'?'':'n'}">${esc(r.status)}</span>${r.featured?' <span class="tag g">Featured</span>':''}</h3>`,
          `${d.full} · ${esc(timeRange(r))}${r.venue?' · '+esc(r.venue):''}${r.is_online?' · Online':''}`,
          `${cn[r.category_id]?esc(cn[r.category_id])+' · ':''}Registered: ${taken[r.id]||0}${r.capacity?' of '+r.capacity+' seats':' (no seat limit)'}`,
          btns([['editevent','Edit'],['regs','Registrations'],r.status==='draft'?['evpublish','Publish','btn-em']:null,r.status==='published'?['evdraft','Unpublish']:null,r.status==='published'?['evcancel','Cancel event']:null,r.status==='cancelled'?['evpublish','Reopen']:null,r.status==='draft'?['evdelete','Delete']:null])+(r.status==='published'?`<a class="btn btn-line btn-sm" href="#event/${esc(r.slug)}">View</a>`:''))}).join(''):`<p>${tab==='upcoming'?'No upcoming events yet. Create one with “New event”.':'Nothing here.'}</p>`);
    },
    async articles(el){
      const f={...(tab==='all'?{}:{status:'eq.'+tab}),order:'created_at.desc',limit:'200'};
      if(tab==='draft')f.author_id='eq.'+me;
      const rows=await db.select('articles','id,author_id,title,summary,status,featured,rejection_reason,published_at,created_at,slug,content,category_id,cover_path',f);
      rows.forEach(r=>cache[r.id]=r);
      const ids=[...new Set(rows.map(r=>r.author_id))],names={};
      if(ids.length)try{(await db.select('profiles','id,full_name',{id:'in.('+ids.join(',')+')'})).forEach(p=>names[p.id]=p.full_name)}catch{}
      const rev=can('articles.review'),pub=can('articles.publish');
      el.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px"><p style="max-width:620px">${rev?'Review what alumni submit, and publish news and blogs yourself.':'Write news and blogs and publish them.'}</p><button class="btn btn-em" data-act="newarticle">Write article +</button></div>`+
        (rows.length?rows.map(r=>{const mine=r.author_id===me;return row(r.id,`<h3>${esc(r.title)} <span class="tag ${r.status==='published'?'':'n'}">${esc(r.status)}</span>${r.featured?' <span class="tag g">Featured</span>':''}</h3>`,
          `${esc(r.summary||r.content.slice(0,220))}${!r.summary&&r.content.length>220?'…':''}`,
          `By ${esc(mine?'you':names[r.author_id]||'a member')} · ${day(r.created_at)}${r.rejection_reason?` · Reason: ${esc(r.rejection_reason)}`:''}`,
          btns([rev||(mine&&(r.status!=='published'||pub))?['editarticle','Edit']:null,
            rev&&['pending','draft'].includes(r.status)&&!mine||rev&&['rejected','archived'].includes(r.status)?['published','Publish','btn-em']:null,
            rev&&r.status==='pending'?['rejected','Reject']:null,rev&&r.status==='published'?['archived','Unpublish']:null,
            rev&&r.status==='published'?[r.featured?'unfeature':'feature',r.featured?'Unfeature':'Feature']:null,
            (rev||mine)&&r.status!=='published'?['ardelete','Delete']:null])+(r.status==='published'?`<a class="btn btn-line btn-sm" href="#blog/${esc(r.slug)}">View</a>`:''))}).join(''):`<p>${tab==='pending'?'Nothing is waiting for review.':'Nothing here.'}</p>`);
    },
    async messages(el){
      const rows=await db.select('contact_messages','*',{...(tab==='all'?{}:{handled:'eq.'+(tab==='handled')}),order:'created_at.desc',limit:'200'});
      el.innerHTML=rows.length?rows.map(r=>row(r.id,`<h3>${esc(r.name)} <span class="tag ${r.handled?'n':''}">${r.handled?'handled':'new'}</span></h3>`,
        `<a class="more" href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><span style="white-space:pre-line">${esc(r.message)}</span>`,`Received ${when(r.created_at)}`,
        btns([r.handled?['reopen','Mark as new']:['handled','Mark as handled','btn-em']]))).join(''):`<p>${tab==='new'?'No new messages.':'Nothing here.'}</p>`;
    },
    async activity(el){el.innerHTML=actList(await db.rpc('admin_recent_activity',{p_limit:100}))},
    async staff(el){
      const rl=await db.rpc('admin_roles');R._rl=rl;
      if(tab==='roles'){
        const grp={};rl.permissions.forEach(p=>(grp[p.group]=grp[p.group]||[]).push(p));
        const label=Object.fromEntries(rl.permissions.map(p=>[p.key,p.label]));
        el.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px"><p style="max-width:620px">A role is a named set of permissions. Change what a role can do and everyone holding it is affected immediately.</p><button class="btn btn-em" data-act="newrole">New role +</button></div>`+
          rl.roles.map(r=>row(r.key,`<h3>${esc(r.name)} ${r.is_system?'<span class="tag n">built in</span>':''} <span class="tag n">${esc(r.users)} ${r.users===1?'person':'people'}</span></h3>`,esc(r.description||''),
            r.key==='superadmin'?'Has every permission, always. Cannot be changed.':(r.permissions.length?r.permissions.map(k=>esc(label[k]||k)).join(' · '):'No permissions yet'),
            r.key==='superadmin'?'':btns([['editrole','Edit'],r.is_system?null:['delrole','Delete']]))).join('');
        return;
      }
      const staff=await db.rpc('admin_list_staff');
      const names=Object.fromEntries(rl.roles.map(r=>[r.key,r.name]));
      el.innerHTML=`<div class="card adm-card"><h3>Give someone a role</h3><p style="margin:6px 0 14px">The person must already have registered on the website. Use the email they signed up with.</p>
        <form id="asForm" class="adm-inline"><input class="field" id="asEmail" type="email" placeholder="name@example.com" required maxlength="254" aria-label="Email"><select class="field" id="asRole" aria-label="Role">${rl.roles.filter(r=>S.superadmin||r.key!=='superadmin').map(r=>`<option value="${esc(r.key)}">${esc(r.name)}</option>`).join('')}</select><button class="btn btn-em" type="submit">Give role</button></form><div class="err" id="asErr"></div></div>
        <h2 class="adm-h2">People with staff access</h2>`+
        staff.map(s=>row(s.user_id,`<h3>${esc(s.full_name||'(no name)')}</h3>`,esc(s.email),s.roles.map(k=>`<span class="tag">${esc(names[k]||k)} <button class="adm-x" data-rm="${esc(k)}" aria-label="Remove ${esc(names[k]||k)}">×</button></span>`).join(' '),'')).join('');
      $('#asForm').onsubmit=async e=>{e.preventDefault();$('#asErr').textContent='';
        try{await db.rpc('admin_assign_role',{p_email:$('#asEmail').value.trim(),p_role:$('#asRole').value});toast('Role given');load()}catch(err){$('#asErr').textContent=aerr(err)}};
    }
  };
  function actList(rows){
    if(!rows.length)return `<p>Nothing has happened yet.</p>`;
    return `<div class="card adm-log">${rows.map(r=>`<div class="adm-logrow"><div><b>${esc(r.actor_name)}</b> · ${esc(r.action)} <span class="adm-sub">(${esc(r.entity_type)}${r.entity_label?': '+esc(r.entity_label):''})</span>${r.note?`<div class="adm-sub">“${esc(r.note)}”</div>`:''}</div><time>${when(r.created_at)}</time></div>`).join('')}</div>`;
  }

  const load=async()=>{
    const el=$('#adMain');if(!el)return;
    if(editing){$('#adTabs').innerHTML='';
      const done=changed=>{editing=null;load();if(changed)fetchCounts()};
      try{if(editing.kind==='event')await eventEditor(el,editing.row,{uid:me,done});else await articleEditor(el,editing.row,{uid:me,canPublish:can('articles.publish'),done,backLabel:'Back to articles'})}
      catch(err){el.innerHTML=`<p>${esc(aerr(err))}</p>`}
      scrollTo({top:0,behavior:'instant'});return}
    drawTabs();
    try{await R[cur.k](el);if(cur.k!=='dashboard')fetchCounts()}catch(err){el.innerHTML=`<p>${esc(aerr(err))}</p>`}};
  load();

  const doIt=async(act,id,jobId,note)=>{
    if(cur.k==='members')return db.update('profiles',{id:'eq.'+id},{verification_status:act,verification_note:note||null});
    if(cur.k==='messages')return db.update('contact_messages',{id:'eq.'+id},{handled:act==='handled'});
    if(cur.k==='articles'){
      if(act==='feature'||act==='unfeature')return db.update('articles',{id:'eq.'+id},{featured:act==='feature'});
      return db.update('articles',{id:'eq.'+id},{status:act,rejection_reason:act==='rejected'?note:null});
    }
    if(cur.k==='jobs'){
      if(act==='feature'||act==='unfeature')return db.update('jobs',{id:'eq.'+id},{featured:act==='feature'});
      return db.update('jobs',{id:'eq.'+id},{status:act,rejection_reason:act==='rejected'?note:null});
    }
    if(act==='dismiss')return db.update('content_reports',{id:'eq.'+id},{status:'dismissed'});
    await db.update('jobs',{id:'eq.'+jobId},{status:'rejected',rejection_reason:note});
    return db.update('content_reports',{id:'eq.'+id},{status:'resolved'});
  };

  const roleForm=(r)=>{
    const rl=R._rl,grp={};rl.permissions.forEach(p=>(grp[p.group]=grp[p.group]||[]).push(p));
    const has=new Set(r?r.permissions:[]);
    openModal(`<h2 style="font-size:1.35rem">${r?'Edit role':'New role'}</h2><form id="rfForm" style="margin-top:14px" novalidate>
      <label for="rfName">Role name *</label><input class="field" id="rfName" maxlength="40" value="${esc(r?r.name:'')}" placeholder="e.g. Batch coordinator">
      <label for="rfDesc" style="margin-top:10px;display:block">Short description</label><input class="field" id="rfDesc" maxlength="200" value="${esc(r?r.description||'':'')}">
      <div style="margin-top:14px"><b>What can this role do?</b></div>
      ${Object.entries(grp).map(([g,ps])=>`<fieldset class="adm-perm"><legend>${esc(g)}</legend>${ps.map(p=>`<label class="adm-check"><input type="checkbox" value="${esc(p.key)}" ${has.has(p.key)?'checked':''}><span><b>${esc(p.label)}</b><small>${esc(p.description)}</small></span></label>`).join('')}</fieldset>`).join('')}
      <div class="err" id="rfErr"></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-em" type="submit">Save role</button><button class="btn btn-line" type="button" id="rfNo">Cancel</button></div></form>`);
    $('#rfNo').onclick=closeModal;
    $('#rfForm').onsubmit=async e=>{e.preventDefault();
      const nm=$('#rfName').value.trim(),key=r?r.key:slug(nm);
      if(nm.length<2||!key){$('#rfErr').textContent='Give the role a name (letters and numbers).';return}
      if(!r&&R._rl.roles.some(x=>x.key===key)){$('#rfErr').textContent='A role with that name already exists.';return}
      try{await db.rpc('admin_save_role',{p_key:key,p_name:nm,p_description:$('#rfDesc').value.trim(),p_permissions:$$('#rfForm input[type=checkbox]:checked').map(c=>c.value)});closeModal();toast('Role saved');load()}
      catch(err){$('#rfErr').textContent=aerr(err)}};
  };

  const showRegs=async ev=>{
    openModal(`<h2 style="font-size:1.3rem">Registrations</h2><p style="margin-top:6px">${esc(ev?ev.title:'')}</p><div id="rgBox" style="margin-top:14px"><p>Loading…</p></div>`);
    try{
      const rows=await db.rpc('admin_event_registrations',{p_event_id:ev.id});
      const going=rows.filter(r=>r.status==='registered'),seats=going.reduce((n,r)=>n+r.attendees,0);
      $('#rgBox').innerHTML=rows.length?`<p><b>${going.length}</b> ${going.length===1?'person':'people'} · <b>${seats}</b> ${seats===1?'seat':'seats'}${ev.capacity?' of '+ev.capacity:''}</p>
        <div style="max-height:46vh;overflow:auto;margin-top:10px">${rows.map(r=>`<div class="adm-logrow" style="${r.status==='cancelled'?'opacity:.55':''}"><div><b>${esc(r.full_name||'(no name)')}</b> <span class="adm-sub">Batch ${esc(r.graduation_year??'?')} · ${esc(r.email)}</span>${r.notes?`<div class="adm-sub">“${esc(r.notes)}”</div>`:''}</div><time>${esc(r.attendees)} ${r.status==='cancelled'?'· cancelled':''}</time></div>`).join('')}</div>
        <div style="margin-top:14px"><button class="btn btn-line btn-sm" id="rgCopy">Copy emails</button></div>`:`<p>Nobody has registered yet.</p>`;
      const cp=$('#rgCopy');if(cp)cp.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(going.map(r=>r.email).join(', ')).catch(()=>{});toast('Emails copied')};
    }catch(err){$('#rgBox').innerHTML=`<p>${esc(aerr(err))}</p>`}
  };

  box.onclick=e=>{
    const pl=e.target.closest('[data-plus]');if(pl){e.preventDefault();location.hash='#admin/'+pl.dataset.plus+'/new';return}
    const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;load();return}
    const rm=e.target.closest('[data-rm]');
    if(rm){const uid=rm.closest('[data-id]').dataset.id,role=rm.dataset.rm;if(!isId(uid))return;
      confirmBox('Remove this role?','They will lose everything this role allowed, straight away.','Remove',async()=>{await db.rpc('admin_remove_role',{p_user:uid,p_role:role});toast('Role removed');load()});return}
    const b=e.target.closest('[data-act]');if(!b)return;
    const act=b.dataset.act;
    if(act==='newrole'){roleForm(null);return}
    if(act==='newevent'){editing={kind:'event',row:null};load();return}
    if(act==='newarticle'){editing={kind:'article',row:null};load();return}
    const card=b.closest('[data-id]'),id=card.dataset.id,jobId=card.dataset.job;
    if(act==='editevent'&&cache[id]){editing={kind:'event',row:cache[id]};load();return}
    if(act==='editarticle'&&cache[id]){editing={kind:'article',row:cache[id]};load();return}
    if(act==='regs'&&isId(id)){showRegs(cache[id]);return}
    if(['evpublish','evdraft'].includes(act)&&isId(id)){db.update('events',{id:'eq.'+id},{status:act==='evpublish'?'published':'draft'}).then(()=>{toast('Updated');load();fetchCounts()}).catch(err=>toast(aerr(err)));return}
    if(act==='evcancel'&&isId(id)){confirmBox('Cancel this event?','It stays on the Events page marked as cancelled, and registration closes. You can reopen it later.','Cancel event',async()=>{await db.update('events',{id:'eq.'+id},{status:'cancelled'});toast('Event cancelled');load()});return}
    if(act==='evdelete'&&isId(id)){confirmBox('Delete this draft?','This cannot be undone.','Delete',async()=>{await db.remove('events',{id:'eq.'+id});toast('Draft deleted');load()});return}
    if(act==='ardelete'&&isId(id)){confirmBox('Delete this article?','This cannot be undone.','Delete',async()=>{await db.remove('articles',{id:'eq.'+id});toast('Article deleted');load();fetchCounts()});return}
    if(act==='editrole'){const r=(R._rl.roles||[]).find(x=>x.key===id);if(r)roleForm(r);return}
    if(act==='delrole'){confirmBox('Delete this role?','This cannot be undone. A role that someone still holds cannot be deleted.','Delete',async()=>{await db.rpc('admin_delete_role',{p_key:id});toast('Role deleted');load()});return}
    if(!isId(id)||(jobId&&!isId(jobId)))return;
    const run=async n=>{try{await doIt(act,id,jobId,n);closeModal();toast('Updated');load()}catch(err){const el=$('#adErr');if(el)el.textContent=aerr(err);else toast(aerr(err))}};
    if(['feature','unfeature','dismiss','handled','reopen'].includes(act)){run('');return}
    const need=['rejected','suspended','takedown'].includes(act);
    const titles={verified:'Verify this alumnus?',rejected:'Reject',suspended:'Suspend this account',approved:'Approve this job?',published:'Publish this article?',archived:'Unpublish this article?',pending:'Return to review?',takedown:'Take this listing down'};
    openModal(`<h2 style="font-size:1.35rem">${esc(titles[act]||'Confirm')}</h2>
      <form id="adForm" style="margin-top:14px"><label for="adNote">${need?'Reason (the member will see this) *':'Note (optional)'}</label><textarea class="field" id="adNote" rows="3" maxlength="500"></textarea><div class="err" id="adErr"></div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-em" type="submit">Confirm</button><button class="btn btn-line" type="button" id="adCancel">Cancel</button></div></form>`);
    $('#adCancel').onclick=closeModal;
    $('#adForm').onsubmit=ev=>{ev.preventDefault();const n=$('#adNote').value.trim();if(need&&n.length<3){$('#adErr').textContent='Please give a short reason.';return}run(n)};
  };
}

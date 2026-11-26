/* Per-page behaviour (filters, forms, carousels). Demo behaviour is replaced feature-by-feature in later phases. */
import {$,$$,esc,ini,U,P,dt,TODAY} from '../lib/util.js';
import {S,EMAIL_RE} from '../state.js';
import {toast,openModal,closeModal,gate,setAuth,motion,bars,hooks,app,LOCK_ICON} from '../ui.js';
import {auth,db} from '../lib/supa.js';
import {friendly,loadMe} from '../services/auth.js';
import {ALUMNI,JOBS,EVENTS,NEWS} from '../data/dev-sample.js';
export function wire(p,arg){
  motion(app);bars(app);
  if(p==="about"&&arg){setTimeout(()=>{const t=document.getElementById(arg);if(t)t.scrollIntoView({behavior:"smooth",block:"start"})},120)}
  if(p==="home")homeWire();
  if(p==="alumni")alumniWire();
  if(p==="profile")profileWire();
  if(p==="jobs")jobsWire();
  if(p==="job")jobWire(arg);
  if(p==="post-job")postWire();
  if(p==="events")eventsWire();
  if(p==="event")eventWire(arg);
  if(p==="news")newsWire();
  if(p==="blog")blogWire(arg);
  if(p==="login")loginWire(arg);
  if(p==="me")meWire();
}

/* home */
let tTimer;
function homeWire(){
  const car=$("#car");
  $("#carL").onclick=()=>car.scrollBy({left:-320,behavior:"smooth"});
  $("#carR").onclick=()=>car.scrollBy({left:320,behavior:"smooth"});
  loadStats();loadTestimonials();
}
async function loadStats(){
  try{
    const [r]=await db.select("site_stats","*");
    if(!r)return;
    $$("[data-stat]",app).forEach(el=>{el.textContent=Number(r[el.dataset.stat]||0).toLocaleString("en-IN")});
  }catch{/* leave dashes */}
}
async function loadTestimonials(){
  clearInterval(tTimer);
  try{
    const rows=await db.select("testimonials","quote,author_name,batch_year,role_text",{order:"sort_order.asc",limit:"10"});
    const sec=$("#testiSec"),box=$("#testi");
    if(!sec||!box||!rows.length)return;
    box.insertAdjacentHTML("afterbegin",rows.map((t,i)=>`<div class="tslide ${i===0?'on':''}" style="grid-template-columns:1fr"><div><p class="tq">${esc(t.quote)}</p><div class="twho"><span class="av" style="width:48px;height:48px;font-size:.92rem">${esc(ini(t.author_name))}</span><div><b style="color:var(--navy)">${esc(t.author_name)}</b><small>${[t.batch_year?"Batch "+t.batch_year:"",t.role_text].filter(Boolean).map(esc).join(" · ")}</small></div></div></div></div>`).join(""));
    sec.style.display="";
    const ts=$$(".tslide",box),td=$("#tdots");let ti=0;
    ts.forEach((_,i)=>td.insertAdjacentHTML("beforeend",`<button aria-label="Testimonial ${i+1}" class="${i?'':'on'}"></button>`));
    const tset=i=>{ti=(i+ts.length)%ts.length;ts.forEach((t,j)=>t.classList.toggle("on",j===ti));$$("button",td).forEach((b,j)=>b.classList.toggle("on",j===ti))};
    const restartT=()=>{clearInterval(tTimer);if(ts.length>1)tTimer=setInterval(()=>{if(!$("#testi"))clearInterval(tTimer);else tset(ti+1)},6500)};
    td.onclick=e=>{const b=e.target.closest("button");if(b){tset([...td.children].indexOf(b));restartT()}};
    restartT();
  }catch{/* section stays hidden */}
}

/* alumni directory */
let alPage=1;const PAGE=6;
function alumniWire(){
  const f=()=>{
    const q=$("#fq").value.trim().toLowerCase(),y=$("#fy").value,d=$("#fd").value,i=$("#fi").value,c=$("#fc").value,s=$("#fs").value;
    let list=ALUMNI.filter(a=>a.pub&&(!y||a.y==y)&&(!d||a.d===d)&&(!i||a.ind===i)&&(!c||a.ctry===c)&&(!q||[a.n,a.co,a.city,a.r,a.ind].join(" ").toLowerCase().includes(q)));
    list.sort((a,b)=>s==="new"?b.y-a.y:s==="old"?a.y-b.y:a.n.localeCompare(b.n));
    const shown=list.slice(0,alPage*PAGE);
    $("#alGrid").innerHTML=shown.map((a,k)=>`<article class="card person reveal d${k%3}">
      <div style="display:flex;gap:14px;align-items:center"><div class="av" style="background-image:url('${U(a.ph,300)}')"></div><div><h3>${esc(a.n)}</h3><div class="meta">Batch ${a.y} · ${esc(a.d)}</div></div></div>
      <div class="pill-list" style="margin-top:0"><span>${esc(a.r)}</span><span>${esc(a.ind)}</span></div>
      <div style="font-size:.88rem;color:var(--muted)">${esc(a.co)} · 📍 ${esc(a.city)}</div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--line);padding-top:14px"><a class="more" href="#profile/${a.id}">View profile <span>→</span></a><button class="chip" data-save="${a.id}" style="font-size:.78rem;padding:.35rem .7rem">${S.saved[a.id]?'Saved ★':'Save ☆'}</button></div>
    </article>`).join("");
    $("#ct").textContent=`Showing ${shown.length} of ${list.length} alumni`;
    $("#alEmpty").classList.toggle("on",!list.length);
    $("#lm").style.display=shown.length<list.length?"":"none";
    const chips=[];if(y)chips.push(["Batch "+y,"fy"]);if(d)chips.push([d,"fd"]);if(i)chips.push([i,"fi"]);if(c)chips.push([c,"fc"]);
    $("#chipsAl").innerHTML=chips.map(x=>`<button class="chip on" data-clear="${x[1]}">${esc(x[0])} ✕</button>`).join("")||`<span class="count">Filter by batch, department, industry or country</span>`;
    motion($("#alGrid"));
  };
  ["fq","fy","fd","fi","fc","fs"].forEach(id=>$("#"+id).addEventListener("input",()=>{alPage=1;f()}));
  $("#lm").onclick=()=>{alPage++;f()};
  $("#chipsAl").onclick=e=>{const b=e.target.closest("[data-clear]");if(!b)return;$("#"+b.dataset.clear).value="";alPage=1;f()};
  $("#alGrid").onclick=e=>{const b=e.target.closest("[data-save]");if(!b)return;const id=b.dataset.save;S.saved[id]=!S.saved[id];b.textContent=S.saved[id]?"Saved ★":"Save ☆";toast(S.saved[id]?"Saved to your list":"Removed")};
  alPage=1;
  f();
}

/* profile */
function profileWire(){
  const b=$("#connectBtn");
  if(b)b.onclick=()=>gate("Connecting with alumni requires a signed-in account.",()=>{b.textContent="Request sent ✓";b.classList.replace("btn-em","btn-navy");toast("Connection request sent")});
}

/* jobs */
function jobsWire(){
  let jf="all";
  const f=()=>{
    const q=$("#jq").value.trim().toLowerCase(),ind=$("#ji").value,ty=$("#jt").value,ex=$("#je").value,dd=$("#jd").value;
    const list=JOBS.filter(j=>(!ind||j.ind===ind)&&(!ty||j.type===ty)&&(!ex||j.exp.toLowerCase().includes(ex.toLowerCase().split(" ")[0]))&&(!q||[j.t,j.co,j.loc].join(" ").toLowerCase().includes(q))&&(!dd||(TODAY-new Date(j.posted+"T00:00:00"))/864e5<=+dd)&&(jf==="all"||j.type===jf||(jf==="feat"&&j.feat)));
    $("#jList").innerHTML=list.map((j,k)=>`<article class="card jobrow reveal d${k%2}">
      <div class="logo-b pic" style="background-image:url('${U(j.img,300)}')" role="img" aria-label="${esc(j.co)}">${esc(ini(j.co))}</div>
      <div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag ${j.type==='Internship'?'':'n'}">${esc(j.type)}</span>${j.feat?'<span class="tag g">Featured</span>':''}</div><h3 style="margin-top:10px"><a href="#job/${j.id}">${esc(j.t)}</a></h3>
        <div class="sub"><span>${esc(j.co)}</span><span>📍 ${esc(j.loc)}</span><span>🗓 ${dt(j.posted).short}</span></div></div>
      <a class="btn btn-em btn-sm" href="#job/${j.id}">Apply now</a></article>`).join("");
    $("#jct").textContent=`${list.length} openings`;
    $("#jEmpty").classList.toggle("on",!list.length);
    $("#jchips").innerHTML=[["all","All roles"],["feat","Featured"],["Full-time","Full-time"],["Internship","Internship"],["Contract","Contract"]].map(x=>`<button class="chip ${jf===x[0]?'on':''}" data-jf="${x[0]}">${x[1]}</button>`).join("");
    motion($("#jList"));
  };
  ["jq","ji","jt","je","jd"].forEach(id=>$("#"+id).addEventListener("input",f));
  $("#jchips").onclick=e=>{const b=e.target.closest("[data-jf]");if(!b)return;jf=b.dataset.jf;f()};
  f();
}

function jobWire(id){
  const j=JOBS.find(x=>x.id===id);if(!j)return;
  const b=$("#applyBtn");
  if(b)b.onclick=()=>gate("Apply with your alumni profile.",()=>{
    S.apply[j.id]=true;b.textContent="Application sent ✓";b.disabled=true;b.classList.add("done");b.classList.remove("btn-em");
    const t=$$("#track div");if(t[1])t[1].classList.add("on");toast("Application sent");
  });
}

function postWire(){
  const f=$("#pj");
  const showGate=()=>{$("#pjForm").innerHTML=`<div style="text-align:center;padding:30px 10px"><div class="ic dark" style="margin:0 auto 18px;width:68px;height:68px;border-radius:50%">${LOCK_ICON}</div><h2 style="font-size:1.5rem">Sign in to post a job</h2><p style="margin:10px 0 22px">Only signed-in alumni can submit openings for review.</p><a class="btn btn-em" href="#login">Sign in</a></div>`};
  if(!S.auth){showGate();return}
  if(!f) return;
  f.onsubmit=e=>{
    e.preventDefault();
    const req=[["t",f.t.value.trim().length>2],["co",f.co.value.trim().length>1],["loc",f.loc.value.trim().length>1],["desc",f.desc.value.trim().length>=20],["link",f.link.value.trim().length>3]];
    let ok=true;
    req.forEach(([n,v])=>{const el=f[n];el.classList.toggle("bad",!v);el.parentElement.querySelector(".err").textContent=v?"":"Required";if(!v)ok=false});
    if(!ok)return;
    $("#pjForm").style.display="none";$("#pjDone").style.display="block";toast("Job submitted for approval");
  };
  $$("input,textarea",f).forEach(el=>el.addEventListener("input",()=>el.classList.remove("bad")));
}

/* events */
let evF="upcoming",evC="All";
function eventsWire(){
  const f=()=>{
    const list=EVENTS.slice().sort((a,b)=>a.d.localeCompare(b.d)).filter(e=>(evF==="all"||(evF==="past")===dt(e.d).past)&&(evC==="All"||e.cat===evC));
    $("#evList").innerHTML=list.map((e,k)=>{const f=dt(e.d),left=e.seats-e.taken;return `<article class="card ev reveal d${k%3}">
      <div class="dt"><b>${f.day}</b><small>${f.mon}</small></div>
      <div class="ov"><div class="bg" style="background-image:url('${U(e.img,900)}')"></div></div>
      <span class="tag ${e.cat==='Alumni reunions'?'':'n'}" style="align-self:flex-start">${esc(e.cat)}</span>
      <h3 style="margin-top:12px">${esc(e.t)}</h3>
      <div class="info"><span>🕘 ${esc(e.time)}</span><span>📍 ${esc(e.venue)}</span><span>${left>0?left+' seats left':'Fully booked'}</span></div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="btn btn-navy btn-sm" href="#event/${e.id}">${f.past?'View recap':'Register now'}</a><a class="more" href="#event/${e.id}">Details <span>→</span></a></div></article>`}).join("");
    $("#evEmpty").classList.toggle("on",!list.length);
    motion($("#evList"));
  };
  $("#evc").onclick=e=>{const b=e.target.closest("[data-f]");if(!b)return;evF=b.dataset.f;$$("#evc .chip").forEach(x=>x.classList.toggle("on",x===b));f()};
  $("#evcat").onclick=e=>{const b=e.target.closest("[data-cat]");if(!b)return;evC=b.dataset.cat;$$("#evcat .chip").forEach(x=>x.classList.toggle("on",x===b));f()};
  f();
}

function eventWire(id){
  const e=EVENTS.find(x=>x.id===id);if(!e)return;
  const rb=$("#regBtn"),cb=$("#cancelBtn");
  if(rb&&!rb.disabled)rb.onclick=()=>gate("Registration is for signed-in alumni.",()=>{
    openModal(`<div class="kicker">Register</div><h2 style="font-size:1.55rem">${esc(e.t)}</h2><p style="margin:6px 0 20px">${esc(e.time)} · ${esc(e.venue)}</p>
    <div class="g-form"><div class="full"><label for="att">Attendance</label><select class="field" id="att"><option>${e.online?'Virtual':'In person'}</option><option>${e.online?'In person':'Virtual'}</option></select></div>
    <div class="full"><label for="att2">Number of attendees</label><input class="field" id="att2" type="number" min="1" max="4" value="1"></div>
    <div class="full"><label for="attN">Notes (optional)</label><input class="field" id="attN"></div>
    <div class="full"><button class="btn btn-em" id="confirm" style="width:100%">Confirm registration</button></div></div>`);
    $("#confirm").onclick=()=>{
      const n=Math.max(1,+$("#att2").value||1);
      S.rsvp[e.id]=true;e.taken+=n;S.rsvpN++;closeModal();toast("Registration confirmed");hooks.route();
    };
  });
  if(cb)cb.onclick=()=>{delete S.rsvp[e.id];e.taken=Math.max(0,e.taken-1);S.rsvpN=Math.max(0,S.rsvpN-1);toast("Registration cancelled");hooks.route()};
}

/* news */
let nC="All";
function newsWire(){
  const f=()=>{
    const q=$("#nq").value.trim().toLowerCase();
    const list=NEWS.slice().sort((a,b)=>b.date.localeCompare(a.date)).filter(n=>(nC==="All"||n.cat===nC)&&(!q||[n.t,n.ex,n.author].join(" ").toLowerCase().includes(q)));
    const feat=list.find(n=>n.feat)||list[0];
    const rest=list.filter(n=>n!==feat);
    $("#nFeat").innerHTML=feat?`<div class="ov" style="flex:1 1 460px;min-height:360px;border-radius:0"><div class="bg" style="background-image:url('${U(feat.img,1400)}')"></div><div style="position:absolute;top:20px;left:20px;z-index:3"><span class="tag">Featured</span></div></div><div style="flex:1 1 380px;padding:44px;display:flex;flex-direction:column;justify-content:center"><span class="tag n" style="align-self:flex-start">${esc(feat.cat)}</span><h2 style="margin:14px 0;font-size:2rem">${esc(feat.t)}</h2><p>${esc(feat.ex)}</p><div style="font-size:.86rem;color:var(--muted);margin:12px 0 22px">${esc(feat.author)} · ${dt(feat.date).full}</div><a class="btn btn-navy" href="#blog/${feat.id}" style="align-self:flex-start">Read article <span>→</span></a></div>`:"";
    $("#nGrid").innerHTML=rest.map((n,k)=>`<article class="card nw reveal d${k%3}"><div class="ov"><div class="bg" style="background-image:url('${U(n.img,900)}')"></div></div><span class="tag ${k%2?'g':''}" style="align-self:flex-start">${esc(n.cat)}</span><h3 style="margin-top:12px">${esc(n.t)}</h3><div class="meta">${dt(n.date).short} · ${esc(n.author)}</div><p>${esc(n.ex)}</p><a class="more" href="#blog/${n.id}" style="margin-top:auto">Read more <span>→</span></a></article>`).join("");
    $("#nct").textContent=`${list.length} articles`;
    $("#nEmpty").classList.toggle("on",!list.length);
    motion(app);
  };
  $("#nq").addEventListener("input",f);
  $("#nc").onclick=e=>{const b=e.target.closest("[data-cat]");if(!b)return;nC=b.dataset.cat;$$("#nc .chip").forEach(x=>x.classList.toggle("on",x===b));f()};
  $("#subForm").onsubmit=e=>{
    e.preventDefault();
    const v=e.target.querySelector("input").value.trim();
    if(!EMAIL_RE.test(v)){toast("Enter a valid email");return}
    e.target.innerHTML=`<span style="padding:12px 16px;color:var(--em-d);font-weight:700">Subscribed ✓</span>`;
    toast("Subscribed to the newsletter");
  };
  f();
}

/* blog */
function blogWire(id){
  const n=NEWS.find(x=>x.id===id);if(!n)return;
  $("#shareCopy").onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(location.href).catch(()=>{});toast("Link copied")};
  $$("[data-share]").forEach(b=>b.onclick=()=>{const u=encodeURIComponent(location.href),t=encodeURIComponent(n.t);
    const to={whatsapp:"https://wa.me/?text="+t+"%20"+u,linkedin:"https://www.linkedin.com/sharing/share-offsite/?url="+u}[b.dataset.share];
    if(to)window.open(to,"_blank","noopener,noreferrer")});
}

/* login */
function loginWire(arg){
  const show=p=>{$$("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.p===p));$$(".pane").forEach(x=>x.classList.toggle("on",x.id==="p-"+p))};
  $$("[data-p]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.p)));
  if(arg==="join")show("join");
  const setErr=(el,ok,msg)=>{el.classList.toggle("bad",!ok);el.parentElement.querySelector(".err").textContent=ok?"":msg};
  const busy=(f,on,label)=>{const b=f.querySelector("button[type=submit]");b.disabled=on;if(label)b.firstChild.textContent=on?"Please wait… ":label};

  $("#fLogin").onsubmit=async e=>{
    e.preventDefault();const f=e.target;const em=f.email.value.trim(),pw=f.pw.value;
    const okE=EMAIL_RE.test(em),okP=pw.length>=6;
    setErr(f.email,okE,"Enter a valid email");
    setErr(f.pw,okP,"At least 6 characters");
    if(!okE||!okP)return;
    busy(f,true,"Sign in ");
    try{
      await auth.signIn(em,pw);await loadMe();
      toast("Welcome back");location.hash=S.profile&&S.profile.verification_status==="verified"?"#home":"#me";
    }catch(err){setErr(f.pw,false,friendly(err))}
    finally{busy(f,false,"Sign in ")}
  };

  $("#fJoin").onsubmit=async e=>{
    e.preventDefault();const f=e.target;let ok=true;
    const chk=(el,v,m)=>{setErr(el,v,m);if(!v)ok=false};
    chk(f.name,f.name.value.trim().length>1,"Enter your full name");
    chk(f.email,EMAIL_RE.test(f.email.value.trim()),"Enter a valid email");
    chk(f.pw,f.pw.value.length>=8,"Use at least 8 characters");
    chk(f.pw2,f.pw2.value===f.pw.value&&f.pw2.value.length>0,"Passwords do not match");
    const t=f.terms.checked;$("#tErr").textContent=t?"":"Please accept the terms";if(!t)ok=false;
    if(!ok)return;
    busy(f,true,"Create account ");
    try{
      const email=f.email.value.trim();
      const r=await auth.signUp(email,f.pw.value,{full_name:f.name.value.trim(),graduation_year:+f.y.value,department:f.d.value});
      if(r.session){
        const en=f.en.value.trim();
        if(en){try{await db.update("profiles",{id:"eq."+r.session.user.id},{enrollment_no:en})}catch{/* can be added later on the profile page */}}
        await loadMe();
        toast("Account created. Please complete your profile.");location.hash="#me";
      }else{
        $("#p-join").innerHTML=`<div style="text-align:center;padding:30px 10px"><h2 style="font-size:1.4rem">Check your email</h2><p style="margin-top:10px">We sent a confirmation link to <b>${esc(email)}</b>. Open it, then sign in. After that, the alumni cell will verify your profile.</p></div>`;
      }
    }catch(err){setErr(f.email,false,friendly(err))}
    finally{if($("#fJoin"))busy(f,false,"Create account ")}
  };

  $("#pwIn").addEventListener("input",e=>{
    const v=e.target.value;
    const s=Math.min(4,(v.length>=8)+(/[A-Z]/.test(v))+(/\d/.test(v))+(/[^A-Za-z0-9]/.test(v)));
    const bar=$("#pwBar");
    bar.style.width=(s*25)+"%";
    bar.style.background=["#ef4444","#f59e0b","#eab308","#F07F2A","#E06A1F"][s];
  });

  $("#fForgot").onsubmit=async e=>{
    e.preventDefault();const f=e.target,v=f.email.value.trim();
    if(!EMAIL_RE.test(v)){setErr(f.email,false,"Enter a valid email");return}
    setErr(f.email,true,"");
    try{await auth.recover(v);toast("If that email is registered, a reset link is on its way")}
    catch(err){setErr(f.email,false,friendly(err))}
  };
}

/* my profile */
const STATUS={
  pending:["Awaiting verification","The alumni cell will check your details and verify you. Until then you can complete your profile, but it is not listed and you cannot post jobs or register for events."],
  verified:["Verified alumnus","Your profile follows the visibility you choose below."],
  rejected:["Verification needs attention","Please correct your details and save again."],
  suspended:["Account suspended","Please contact the alumni cell."]
};
async function meWire(){
  const box=$("#meBox");if(!box)return;
  const s=auth.getSession();
  if(!s){box.innerHTML=`<div style="text-align:center;padding:40px 10px"><div class="ic dark" style="margin:0 auto 18px;width:68px;height:68px;border-radius:50%">${LOCK_ICON}</div><h2 style="font-size:1.55rem">Sign in to see your profile</h2><div style="display:flex;gap:10px;justify-content:center;margin-top:20px"><a href="#login" class="btn btn-em">Sign in</a><a href="#login/join" class="btn btn-line">Create account</a></div></div>`;return}
  if(!S.profile){await loadMe()}
  const p=S.profile;
  if(!p){box.innerHTML=`<p>We could not load your profile. Please refresh the page.</p>`;return}
  let c={};
  try{[c={}]=await db.select("profile_contact","*",{profile_id:"eq."+p.id})}catch{/* optional */}
  const st=STATUS[p.verification_status]||STATUS.pending;
  const v=x=>esc(x??"");
  const sel=(name,val,opts)=>`<select class="field" name="${name}">${opts.map(o=>`<option value="${o[0]}"${o[0]===val?" selected":""}>${o[1]}</option>`).join("")}</select>`;
  box.innerHTML=`
  <div class="card" style="padding:22px 26px;margin-bottom:22px"><div class="kicker">${esc(st[0])}</div><p style="margin-top:6px">${esc(st[1])}${p.verification_note?` <b>Note from the alumni cell:</b> ${esc(p.verification_note)}`:""}</p>${S.isAdmin?'<p style="margin-top:8px"><b>You are an administrator.</b></p>':""}</div>
  <form id="fMe" class="card" style="padding:28px" novalidate>
    <h2 style="font-size:1.5rem;margin-bottom:6px">My profile</h2>
    <p style="margin-bottom:18px">Signed in as <b>${esc(s.user.email)}</b></p>
    <div class="g-form">
      <div class="full"><label>Full name *</label><input class="field" name="full_name" maxlength="120" value="${v(p.full_name)}"><div class="err"></div></div>
      <div><label>Graduation year</label><input class="field" name="graduation_year" type="number" min="1950" max="2100" value="${v(p.graduation_year)}"></div>
      <div><label>Enrolment / seat number</label><input class="field" name="enrollment_no" maxlength="40" value="${v(p.enrollment_no)}"></div>
      <div class="full"><small style="color:var(--muted)">Department: Civil Engineering. Changing your year or enrolment number sends your profile for re-verification.</small></div>
      <div class="full"><label>Headline</label><input class="field" name="headline" maxlength="160" placeholder="e.g. Site Engineer at ABC Infra" value="${v(p.headline)}"></div>
      <div><label>Company</label><input class="field" name="current_company" maxlength="120" value="${v(p.current_company)}"></div>
      <div><label>Position</label><input class="field" name="current_position" maxlength="120" value="${v(p.current_position)}"></div>
      <div><label>City</label><input class="field" name="city" maxlength="80" value="${v(p.city)}"></div>
      <div><label>Country</label><input class="field" name="country" maxlength="80" value="${v(p.country)}"></div>
      <div class="full"><label>Industry</label><input class="field" name="industry" maxlength="80" value="${v(p.industry)}"></div>
      <div class="full"><label>About you</label><textarea class="field" name="bio" rows="5" maxlength="2000">${v(p.bio)}</textarea></div>
      <div class="full"><label>Skills <small style="color:var(--muted)">(separate with commas)</small></label><input class="field" name="skills" value="${v((p.skills||[]).join(", "))}"></div>
      <div><label>Website</label><input class="field" name="website_url" placeholder="https://" value="${v(p.website_url)}"><div class="err"></div></div>
      <div><label>LinkedIn</label><input class="field" name="linkedin_url" placeholder="https://www.linkedin.com/in/…" value="${v(p.linkedin_url)}"><div class="err"></div></div>
      <div><label>Contact email <small style="color:var(--muted)">(private)</small></label><input class="field" name="contact_email" type="email" value="${v(c.contact_email)}"><div class="err"></div></div>
      <div><label>Phone <small style="color:var(--muted)">(private)</small></label><input class="field" name="phone" value="${v(c.phone)}"><div class="err"></div></div>
      <div><label>Who can see my profile</label>${sel("profile_visibility",p.profile_visibility,[["private","Only me"],["members","Signed-in alumni"],["public","Anyone"]])}</div>
      <div><label>Who can see my contact details</label>${sel("contact_visibility",p.contact_visibility,[["hidden","Nobody"],["members","Signed-in alumni"]])}</div>
      <div class="full"><small style="color:var(--muted)">Your profile is shown in the directory only after you are verified and you choose a visibility other than "Only me".</small></div>
      <div class="full"><button class="btn btn-em" type="submit">Save profile <span>→</span></button> <span id="meMsg" role="status" style="margin-left:12px"></span></div>
    </div>
  </form>`;
  const f=$("#fMe");
  const setErr=(el,ok,msg)=>{el.classList.toggle("bad",!ok);const er=el.parentElement.querySelector(".err");if(er)er.textContent=ok?"":msg};
  f.onsubmit=async e=>{
    e.preventDefault();let ok=true;
    const val=n=>f[n].value.trim();
    const nul=n=>val(n)===""?null:val(n);
    const https=n=>{const x=val(n);const good=x===""||/^https:\/\/[^\s<>"']{3,255}$/i.test(x);setErr(f[n],good,"Link must start with https://");if(!good)ok=false;return x===""?null:x};
    setErr(f.full_name,val("full_name").length>1,"Enter your full name");if(val("full_name").length<2)ok=false;
    const website=https("website_url"),linkedin=https("linkedin_url");
    const ce=val("contact_email"),cemOk=ce===""||EMAIL_RE.test(ce);setErr(f.contact_email,cemOk,"Enter a valid email");if(!cemOk)ok=false;
    const ph=val("phone"),phOk=ph===""||/^[0-9+() -]{6,20}$/.test(ph);setErr(f.phone,phOk,"Digits, spaces, + ( ) - only");if(!phOk)ok=false;
    if(!ok)return;
    const gy=val("graduation_year");
    const skills=val("skills").split(",").map(x=>x.trim().slice(0,40)).filter(Boolean).slice(0,30);
    const payload={full_name:val("full_name"),graduation_year:gy===""?null:+gy,enrollment_no:nul("enrollment_no"),headline:nul("headline"),
      current_company:nul("current_company"),current_position:nul("current_position"),city:nul("city"),country:nul("country"),industry:nul("industry"),
      bio:nul("bio"),skills,website_url:website,linkedin_url:linkedin,profile_visibility:f.profile_visibility.value,contact_visibility:f.contact_visibility.value};
    const btn=f.querySelector("button[type=submit]"),msg=$("#meMsg");btn.disabled=true;msg.textContent="Saving…";
    try{
      const rows=await db.update("profiles",{id:"eq."+p.id},payload);
      await db.insert("profile_contact",{profile_id:p.id,contact_email:ce===""?null:ce,phone:ph===""?null:ph},{upsert:true});
      if(rows&&rows[0])S.profile=rows[0];
      setAuth(true,S.profile.full_name||s.user.email.split("@")[0]);
      toast("Profile saved");
      if(rows&&rows[0]&&rows[0].verification_status!==p.verification_status)hooks.route();else msg.textContent="Saved";
    }catch(err){msg.textContent=/check constraint|violates/i.test(err.message)?"Some details are not valid. Please check the highlighted fields.":friendly(err)}
    finally{btn.disabled=false}
  };
}

/* footer policy links */
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-policy]");if(!a)return;e.preventDefault();
  openModal(`<h2 style="font-size:1.45rem">${a.dataset.policy==="privacy"?"Privacy policy":"Terms & conditions"}</h2><p style="margin-top:12px">Policy text to be provided by the institute. Public pages show only profiles and details alumni have agreed to share.</p>`);
});

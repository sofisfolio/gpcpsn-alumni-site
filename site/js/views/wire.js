/* Per-page behaviour (filters, forms, carousels). Demo behaviour is replaced feature-by-feature in later phases. */
import {$,$$,esc,ini,U,P,dt,TODAY} from '../lib/util.js';
import {S,EMAIL_RE} from '../state.js';
import {toast,openModal,closeModal,gate,setAuth,motion,bars,hooks,app,LOCK_ICON} from '../ui.js';
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
}

/* home */
let heroT,tI;
const FEED=["New batch member verified · Civil Engineering","Job posted · Site Engineer · Pune","Mentor joined · Structural design","Reunion RSVP · Annual Alumni Meet","Connection made · Construction · Mumbai","Internship listed · Surveying · Sambhaji Nagar"];
function homeWire(){
  clearInterval(heroT);
  const box=$("#feed");
  if(box){
    let k=0;
    const show=()=>{
      if(!$("#feed")){clearInterval(heroT);return}
      box.innerHTML=[0,1,2].map(j=>`<div class="fi" style="opacity:${1-j*.28}"><i></i><span>${esc(FEED[(k+j)%FEED.length])}</span></div>`).join("");
      k=(k+1)%FEED.length;
    };
    show();heroT=setInterval(show,2600);
  }
  const car=$("#car");
  $("#carL").onclick=()=>car.scrollBy({left:-320,behavior:"smooth"});
  $("#carR").onclick=()=>car.scrollBy({left:320,behavior:"smooth"});

  const ts=$$(".tslide",app),td=$("#tdots");let ti=0;
  ts.forEach((_,i)=>td.insertAdjacentHTML("beforeend",`<button aria-label="Testimonial ${i+1}" class="${i?'':'on'}"></button>`));
  const tset=i=>{ti=(i+ts.length)%ts.length;ts.forEach((t,j)=>t.classList.toggle("on",j===ti));$$("button",td).forEach((b,j)=>b.classList.toggle("on",j===ti))};
  let tTimer;
  const restartT=()=>{clearInterval(tTimer);tTimer=setInterval(()=>tset(ti+1),6500)};
  td.onclick=e=>{const b=e.target.closest("button");if(b){tset([...td.children].indexOf(b));restartT()}};
  restartT();
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
  $$("[data-share]").forEach(b=>b.onclick=()=>toast("Sharing to "+b.dataset.share+" (demo)"));
  $("#cmtForm").onsubmit=e=>{
    e.preventDefault();
    gate("Comments are for signed-in members.",()=>{
      const v=$("#cmtIn").value.trim();if(!v)return;
      const d=document.createElement("div");d.className="c";
      d.innerHTML=`<b>${esc(S.user)}</b> · just now<p>${esc(v)}</p>`;
      e.target.before(d);$("#cmtIn").value="";toast("Comment submitted for moderation");
    });
  };
}

/* login */
function loginWire(arg){
  const show=p=>{$$("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.p===p));$$(".pane").forEach(x=>x.classList.toggle("on",x.id==="p-"+p))};
  $$("[data-p]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.p)));
  if(arg==="join")show("join");
  const setErr=(el,ok,msg)=>{el.classList.toggle("bad",!ok);el.parentElement.querySelector(".err").textContent=ok?"":msg};

  $("#fLogin").onsubmit=e=>{
    e.preventDefault();const f=e.target;const em=f.email.value.trim(),pw=f.pw.value;
    const okE=EMAIL_RE.test(em),okP=pw.length>=6;
    setErr(f.email,okE,"Enter a valid email");
    setErr(f.pw,okP,"At least 6 characters");
    if(!okE||!okP)return;
    setAuth(true,em.split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
    toast("Welcome back");location.hash="#home";
  };

  $("#fJoin").onsubmit=e=>{
    e.preventDefault();const f=e.target;let ok=true;
    const chk=(el,v,m)=>{setErr(el,v,m);if(!v)ok=false};
    chk(f.name,f.name.value.trim().length>1,"Enter your full name");
    chk(f.email,EMAIL_RE.test(f.email.value.trim()),"Enter a valid email");
    chk(f.pw,f.pw.value.length>=8,"Use at least 8 characters");
    chk(f.pw2,f.pw2.value===f.pw.value&&f.pw2.value.length>0,"Passwords do not match");
    const t=f.terms.checked;$("#tErr").textContent=t?"":"Please accept the terms";if(!t)ok=false;
    if(!ok)return;
    setAuth(true,f.name.value.trim());toast("Account created. Welcome!");location.hash="#home";
  };

  $("#pwIn").addEventListener("input",e=>{
    const v=e.target.value;
    const s=Math.min(4,(v.length>=8)+(/[A-Z]/.test(v))+(/\d/.test(v))+(/[^A-Za-z0-9]/.test(v)));
    const bar=$("#pwBar");
    bar.style.width=(s*25)+"%";
    bar.style.background=["#ef4444","#f59e0b","#eab308","#F07F2A","#E06A1F"][s];
  });

  $("#fForgot").onsubmit=e=>{
    e.preventDefault();const v=e.target.email.value.trim();
    if(!EMAIL_RE.test(v)){setErr(e.target.email,false,"Enter a valid email");return}
    toast("Reset link sent (demo)");
  };
}

/* footer policy links */
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-policy]");if(!a)return;e.preventDefault();
  openModal(`<h2 style="font-size:1.45rem">${a.dataset.policy==="privacy"?"Privacy policy":"Terms & conditions"}</h2><p style="margin-top:12px">Policy text to be provided by the institute. Public pages show only profiles and details alumni have agreed to share.</p>`);
});

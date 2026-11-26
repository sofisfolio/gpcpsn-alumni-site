/* Per-page behaviour (filters, forms, carousels). Demo behaviour is replaced feature-by-feature in later phases. */
import {$,$$,esc,ini,U,P,dt,TODAY,batchYears} from '../lib/util.js';
import {S,EMAIL_RE} from '../state.js';
import {toast,openModal,closeModal,gate,setAuth,motion,bars,hooks,app,LOCK_ICON} from '../ui.js';
import {auth,db} from '../lib/supa.js';
import {friendly,loadMe} from '../services/auth.js';
import {listAlumni,getAlumnus,isId} from '../services/directory.js';
import {storage} from '../lib/supa.js';
import {listJobs,getJob,submitJob,myJobs,withdrawJob,deleteJob,reportJob,TYPE,MODE,lines} from '../services/jobs.js';
import {ALUMNI,JOBS,EVENTS,NEWS} from '../data/dev-sample.js';
export function wire(p,arg){
  motion(app);bars(app);
  if(p==="about"&&arg){setTimeout(()=>{const t=document.getElementById(arg);if(t)t.scrollIntoView({behavior:"smooth",block:"start"})},120)}
  if(p==="home")homeWire();
  if(p==="alumni")alumniWire();
  if(p==="profile")profileWire(arg);
  if(p==="jobs")jobsWire();
  if(p==="job")jobWire(arg);
  if(p==="post-job")postWire();
  if(p==="events")eventsWire();
  if(p==="event")eventWire(arg);
  if(p==="news")newsWire();
  if(p==="blog")blogWire(arg);
  if(p==="login")loginWire(arg);
  if(p==="me")meWire();
  if(p==="admin")adminWire();
}

/* home */
let tTimer;
function homeWire(){
  const car=$("#car");
  $("#carL").onclick=()=>car.scrollBy({left:-320,behavior:"smooth"});
  $("#carR").onclick=()=>car.scrollBy({left:320,behavior:"smooth"});
  loadStats();loadTestimonials();loadFeatured();loadHomeJobs();
}
const jobCard=(j,k=0)=>`<article class="card jobrow reveal d${k%2}">
      <div class="logo-b pic" role="img" aria-label="${esc(j.company)}">${esc(ini(j.company))}</div>
      <div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag ${j.employment_type==='internship'?'':'n'}">${esc(TYPE[j.employment_type]||j.employment_type)}</span>${j.featured?'<span class="tag g">Featured</span>':''}</div><h3 style="margin-top:10px"><a href="#job/${esc(j.id)}">${esc(j.title)}</a></h3>
        <div class="sub"><span>${esc(j.company)}</span><span>📍 ${esc(j.location)}</span>${j.published_at?`<span>🗓 ${esc(new Date(j.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}))}</span>`:""}</div></div>
      <a class="btn btn-em btn-sm" href="#job/${esc(j.id)}">View &amp; apply</a></article>`;
async function loadHomeJobs(){
  try{
    const rows=(await listJobs()).slice(0,4);
    const sec=$("#homeJobsSec"),box=$("#homeJobs");if(!sec||!box||!rows.length)return;
    box.innerHTML=rows.map(jobCard).join("");sec.style.display="";motion(box);
  }catch{/* section stays hidden */}
}
async function loadFeatured(){
  try{
    const rows=await db.select("featured_alumni_public","*",{order:"sort_order.asc",limit:"8"});
    const sec=$("#featSec"),car=$("#car");if(!sec||!car||!rows.length)return;
    car.innerHTML=rows.map(r=>{const img=r.avatar_path?storage.publicUrl("avatars",r.avatar_path):"";
      return `<article class="card pcard reveal"><div class="ph" style="${img?`background-image:url('${esc(img)}');`:"background:linear-gradient(135deg,var(--em),var(--navy-2));display:grid;place-items:center;color:#fff;font-size:2.4rem;font-weight:800;"}">${img?"":esc(ini(r.full_name))}${r.industry?`<span class="tag n">${esc(r.industry)}</span>`:""}${r.graduation_year?`<span class="yr">BATCH ${esc(r.graduation_year)}</span>`:""}</div>
      <div class="bd"><h3>${esc(r.full_name)}</h3><div class="meta">${esc([r.current_position,r.current_company].filter(Boolean).join(" · "))}</div><a class="more" href="#profile/${esc(r.id)}">View profile <span>→</span></a></div></article>`}).join("");
    sec.style.display="";motion(car);
  }catch{/* section stays hidden */}
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

/* alumni directory (real, from the database) */
let alPage=1;const PAGE=9;
const avatar=(a,size=300,extra="")=>`<div class="av" style="${a.img?`background-image:url('${esc(a.img)}');`:""}${extra}">${a.img?"":esc(ini(a.n))}</div>`;
async function alumniWire(){
  const grid=$("#alGrid");
  $("#ct").textContent="Loading alumni…";$("#lm").style.display="none";
  let ALL=[];
  try{ALL=await listAlumni()}catch(e){$("#ct").textContent="";$("#alEmpty").classList.add("on");$("#alEmptyMsg").textContent=friendly(e);return}
  if(!$("#alGrid"))return;                       // user navigated away while loading
  const fill=(id,vals,fmt=x=>x)=>{const el=$("#"+id);vals.forEach(v=>el.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(fmt(v))}</option>`))};
  fill("fy",[...new Set(ALL.map(a=>a.y).filter(Boolean))].sort((a,b)=>b-a));
  fill("fi",[...new Set(ALL.map(a=>a.ind).filter(Boolean))].sort());
  fill("fc",[...new Set(ALL.map(a=>a.ctry).filter(Boolean))].sort());
  const f=()=>{
    const q=$("#fq").value.trim().toLowerCase(),y=$("#fy").value,i=$("#fi").value,c=$("#fc").value,s=$("#fs").value;
    let list=ALL.filter(a=>(!y||a.y==y)&&(!i||a.ind===i)&&(!c||a.ctry===c)&&(!q||[a.n,a.co,a.city,a.r,a.ind,a.skills.join(" ")].join(" ").toLowerCase().includes(q)));
    list.sort((a,b)=>s==="new"?(b.y||0)-(a.y||0):s==="old"?(a.y||0)-(b.y||0):a.n.localeCompare(b.n));
    const shown=list.slice(0,alPage*PAGE);
    grid.innerHTML=shown.map((a,k)=>`<article class="card person reveal d${k%3}">
      <div style="display:flex;gap:14px;align-items:center">${avatar(a)}<div><h3>${esc(a.n)}</h3><div class="meta">${a.y?"Batch "+esc(a.y)+" · ":""}${esc(a.d)}</div></div></div>
      <div class="pill-list" style="margin-top:0">${[a.r,a.ind].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join("")}</div>
      <div style="font-size:.88rem;color:var(--muted)">${esc([a.co,a.city].filter(Boolean).join(" · "))}</div>
      <div style="margin-top:auto;border-top:1px dashed var(--line);padding-top:14px"><a class="more" href="#profile/${esc(a.id)}">View profile <span>→</span></a></div>
    </article>`).join("");
    $("#ct").textContent=ALL.length?`Showing ${shown.length} of ${list.length} alumni`:"";
    $("#alEmpty").classList.toggle("on",!list.length);
    $("#alEmptyMsg").textContent=ALL.length?"Try clearing a filter.":"No alumni have made their profile visible yet. Join the network and be one of the first.";
    $("#lm").style.display=shown.length<list.length?"":"none";
    const chips=[];if(y)chips.push(["Batch "+y,"fy"]);if(i)chips.push([i,"fi"]);if(c)chips.push([c,"fc"]);
    $("#chipsAl").innerHTML=chips.map(x=>`<button class="chip on" data-clear="${x[1]}">${esc(x[0])} ✕</button>`).join("")||`<span class="count">Filter by batch, industry or country</span>`;
    motion(grid);
  };
  ["fq","fy","fi","fc","fs"].forEach(id=>$("#"+id).addEventListener("input",()=>{alPage=1;f()}));
  $("#lm").onclick=()=>{alPage++;f()};
  $("#chipsAl").onclick=e=>{const b=e.target.closest("[data-clear]");if(!b)return;$("#"+b.dataset.clear).value="";alPage=1;f()};
  alPage=1;f();
}

/* single profile */
async function profileWire(id){
  const box=$("#proBox");if(!box)return;
  const missing=(t,m)=>{box.innerHTML=`<div class="wrap" style="padding:90px 0;text-align:center"><h2>${esc(t)}</h2><p style="margin:10px 0 22px">${esc(m)}</p><a class="btn btn-em" href="#alumni">Back to the directory</a></div>`};
  let a=null;
  try{a=await getAlumnus(id)}catch(e){return missing("Could not load this profile",friendly(e))}
  if(!$("#proBox"))return;
  if(!a)return missing("Profile not available","This profile is private or does not exist.");
  document.title=a.n+" | GPCPSN";
  const cover=a.cov||U("",2000);
  const card=(k,inner)=>`<div class="card" style="padding:32px;margin-top:22px"><div class="kicker">${k}</div>${inner}</div>`;
  const tl=rows=>`<div class="tl">${rows.map(e=>`<div><small>${esc(e[0])}</small><b>${esc(e[1])}</b><span>${esc(e[2])}</span></div>`).join("")}</div>`;
  const where=[a.city,a.ctry].filter(Boolean).join(", ");
  let contact;
  if(a.contact&&(a.contact.contact_email||a.contact.phone)){
    contact=`<button class="btn btn-em" id="showContact">Show contact details</button><div id="contactBox" style="display:none;margin-top:12px;word-break:break-word">${a.contact.contact_email?`<div><b>Email:</b> <a href="mailto:${esc(a.contact.contact_email)}">${esc(a.contact.contact_email)}</a></div>`:""}${a.contact.phone?`<div><b>Phone:</b> ${esc(a.contact.phone)}</div>`:""}</div>`;
  }else if(!S.auth){
    contact=`<a class="btn btn-line" href="#login">Sign in to see contact details</a>`;
  }else contact=`<button class="btn btn-line" disabled>Contact details not shared</button>`;
  box.innerHTML=`
    <div class="cover" style="background-image:url('${esc(cover)}')"></div>
    <div class="wrap">
      <div class="pro-head reveal">
        <div class="pro-photo" style="${a.img?`background-image:url('${esc(a.img)}');`:"display:grid;place-items:center;background:linear-gradient(135deg,var(--em),var(--navy-2));color:#fff;font-size:3rem;font-weight:800;"}">${a.img?"":esc(ini(a.n))}</div>
        <div style="padding-bottom:10px">${a.y?`<span class="tag">Batch ${esc(a.y)}</span>`:""}<h1 style="margin-top:12px">${esc(a.n)}</h1><div class="sub">${a.headline||a.r||a.co?`<span>${esc(a.headline||[a.r,a.co].filter(Boolean).join(" at "))}</span>`:""}${where?`<span>📍 ${esc(where)}</span>`:""}<span>🎓 ${esc(a.d)}</span></div></div>
      </div>
      <div class="pro-grid">
        <div class="reveal">
          ${a.intro?card("Introduction",`<p style="font-size:1.07rem;color:#334155;white-space:pre-line">${esc(a.intro)}</p>`):""}
          ${a.exp.length?card("Career",tl(a.exp)):""}
          ${a.edu.length?card("Education",tl(a.edu)):""}
          ${a.skills.length?card("Skills & expertise",`<div class="pill-list">${a.skills.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`):""}
          ${a.ach.length?card("Achievements",a.ach.map(x=>`<div class="ach">🏆 ${esc(x)}</div>`).join("")):""}
        </div>
        <aside class="side reveal d1"><div class="card" style="padding:28px">
          ${a.co?`<div class="row"><div class="ic">${LOCK_ICON.replace(/width="28" height="28"/,'width="20" height="20"')}</div><div><small>Company</small><b>${esc(a.co)}</b></div></div>`:""}
          ${where?`<div class="row"><div class="ic">📍</div><div><small>Location</small><b>${esc(where)}</b></div></div>`:""}
          ${a.ind?`<div class="row"><div class="ic">▦</div><div><small>Industry</small><b>${esc(a.ind)}</b></div></div>`:""}
          <div class="pri">${contact}
            ${a.linkedin?`<a class="btn btn-line" href="${esc(a.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn profile</a>`:""}
            ${a.website?`<a class="btn btn-line" href="${esc(a.website)}" target="_blank" rel="noopener noreferrer">Website</a>`:""}</div>
          <div class="privacy">Contact details are shown only if this alumnus chose to share them with signed-in members.</div>
        </div></aside>
      </div>
      <div style="height:80px"></div>
    </div>`;
  const sc=$("#showContact");if(sc)sc.onclick=()=>{$("#contactBox").style.display="";sc.style.display="none"};
  motion(box);
}

/* jobs (real) */
async function jobsWire(){
  let jf="all",ALL=[];
  $("#jct").textContent="Loading…";
  try{ALL=await listJobs()}catch(e){$("#jct").textContent="";$("#jEmpty").classList.add("on");$("#jEmptyMsg").textContent=friendly(e);return}
  if(!$("#jList"))return;
  [...new Set(ALL.map(j=>j.industry).filter(Boolean))].sort().forEach(v=>$("#ji").insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v)}</option>`));
  const expOk=(j,e)=>{if(!e)return true;const m=j.experience_min_years;return e==="fresher"?(m==null||m===0):e==="1-3"?(m!=null&&m>=1&&m<=3):(m!=null&&m>=3)};
  const f=()=>{
    const q=$("#jq").value.trim().toLowerCase(),ind=$("#ji").value,ty=$("#jt").value,ex=$("#je").value,dd=$("#jd").value;
    const list=ALL.filter(j=>(!ind||j.industry===ind)&&(!ty||j.employment_type===ty)&&expOk(j,ex)&&(!q||[j.title,j.company,j.location].join(" ").toLowerCase().includes(q))&&(!dd||(Date.now()-new Date(j.published_at||j.created_at))/864e5<=+dd)&&(jf==="all"||j.employment_type===jf||(jf==="feat"&&j.featured)));
    $("#jList").innerHTML=list.map(jobCard).join("");
    $("#jct").textContent=`${list.length} ${list.length===1?"opening":"openings"}`;
    $("#jEmpty").classList.toggle("on",!list.length);
    $("#jEmptyMsg").textContent=ALL.length?"Adjust filters to see more roles.":"No openings have been approved yet. Alumni who are hiring can post one.";
    $("#jchips").innerHTML=[["all","All roles"],["feat","Featured"],["full_time","Full-time"],["internship","Internship"],["contract","Contract"]].map(x=>`<button class="chip ${jf===x[0]?'on':''}" data-jf="${x[0]}">${x[1]}</button>`).join("");
    motion($("#jList"));
  };
  ["jq","ji","jt","je","jd"].forEach(id=>$("#"+id).addEventListener("input",f));
  $("#jchips").onclick=e=>{const b=e.target.closest("[data-jf]");if(!b)return;jf=b.dataset.jf;f()};
  f();
}

async function jobWire(id){
  const box=$("#jobBox");if(!box)return;
  const missing=(t,m)=>{box.innerHTML=`<section class="sec"><div class="wrap" style="padding:90px 0;text-align:center"><h2>${esc(t)}</h2><p style="margin:10px 0 22px">${esc(m)}</p><a class="btn btn-em" href="#jobs">Back to jobs</a></div></section>`};
  let j=null;
  try{j=await getJob(id)}catch(e){return missing("Could not load this job",friendly(e))}
  if(!$("#jobBox"))return;
  if(!j)return missing("Job not found","This listing may have expired or been removed.");
  document.title=j.title+" | GPCPSN";
  const fmt=d=>new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  const li=t=>{const a=lines(t);return a.length?`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""};
  const exp=j.experience_min_years==null&&j.experience_max_years==null?"Not specified":j.experience_max_years!=null&&j.experience_min_years!=null?`${j.experience_min_years}–${j.experience_max_years} years`:j.experience_min_years!=null?`${j.experience_min_years}+ years`:`Up to ${j.experience_max_years} years`;
  const apply=[];
  if(j.apply_url)apply.push(`<a class="btn btn-em" href="${esc(j.apply_url)}" target="_blank" rel="noopener noreferrer">Apply on employer site</a>`);
  if(j.apply_email)apply.push(`<a class="btn ${j.apply_url?"btn-line":"btn-em"}" href="mailto:${esc(j.apply_email)}?subject=${encodeURIComponent("Application: "+j.title)}">Apply by email</a>`);
  if(!j.apply_url&&!j.apply_email)apply.push(`<a class="btn btn-em" href="#login">Sign in to see how to apply</a>`);
  box.innerHTML=`
  <section class="phero" style="min-height:320px"><div class="bg" style="background-image:url('${U("photo-1521737604893-d14cc237f11d",2000)}')"></div>
    <div class="wrap"><div class="phero-copy"><div class="crumb"><a href="#jobs">Job portal</a><span>/</span>Job details</div><span class="tag">${esc(TYPE[j.employment_type]||"")}</span><h1 style="margin-top:14px">${esc(j.title)}</h1><p>${esc(j.company)} · ${esc(j.location)} · ${esc(MODE[j.work_mode]||"")}</p></div></div>
  </section>
  <section class="sec"><div class="wrap jd">
    <div class="reveal">
      <div class="facts">
        <div class="fact"><small>Salary</small><b>${esc(j.salary_text||"Not disclosed")}</b></div>
        <div class="fact"><small>Employment</small><b>${esc(TYPE[j.employment_type]||"")}</b></div>
        <div class="fact"><small>Experience</small><b>${esc(exp)}</b></div>
        <div class="fact"><small>Posted</small><b>${j.published_at?esc(fmt(j.published_at)):"Recently"}</b></div>
      </div>
      <div class="card" style="padding:32px"><div class="kicker">Description</div><p style="white-space:pre-line">${esc(j.description)}</p>
        ${j.responsibilities?`<h3>Responsibilities</h3>${li(j.responsibilities)}`:""}
        ${j.qualifications?`<h3>Qualifications</h3>${li(j.qualifications)}`:""}
        ${(j.skills||[]).length?`<h3>Skills</h3><div class="pill-list">${j.skills.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
      </div>
      <div class="card" style="padding:30px;margin-top:22px;flex-direction:row;gap:18px;align-items:center"><div class="logo-b pic" style="width:70px;height:70px">${esc(ini(j.company))}</div><div><small style="color:var(--muted);font-weight:700">About the employer</small><h3>${esc(j.company)}</h3><p style="font-size:.92rem">Shared by a verified alumnus of the network.${j.company_website?` <a class="more" href="${esc(j.company_website)}" target="_blank" rel="noopener noreferrer">Company website</a>`:""}</p></div></div>
    </div>
    <aside class="side reveal d1"><div class="card" style="padding:28px">
      <div class="kicker">How to apply</div>
      ${j.deadline?`<div style="margin-bottom:14px;color:var(--muted);font-size:.9rem">Last date: <b style="color:var(--navy)">${esc(fmt(j.deadline))}</b></div>`:""}
      <div class="pri" style="margin-top:12px">${apply.join("")}<a class="btn btn-line" href="#jobs">Back to jobs</a></div>
      <p style="font-size:.82rem;color:var(--muted);margin-top:16px">You apply directly with the employer. Never pay money to apply. <button type="button" class="more" id="reportJob" style="display:inline;font-size:.82rem">Report this listing</button></p>
    </div></aside>
  </div></section>`;
  motion(box);
  $("#reportJob").onclick=()=>{
    if(!S.auth){gate("Reporting a listing requires a signed-in account.",()=>{});return}
    if(!S.profile||S.profile.verification_status!=="verified"){openModal(`<h2 style="font-size:1.35rem">Only verified members can report</h2><p style="margin-top:10px">Once the alumni cell has verified you, you can report listings that look wrong.</p>`);return}
    openModal(`<h2 style="font-size:1.35rem">Report this listing</h2><form id="rpForm" style="margin-top:14px"><label for="rpWhy">What is wrong with it? *</label><textarea class="field" id="rpWhy" rows="3" maxlength="500"></textarea><div class="err" id="rpErr"></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-em" type="submit">Send report</button><button class="btn btn-line" type="button" id="rpCancel">Cancel</button></div></form>`);
    $("#rpCancel").onclick=closeModal;
    $("#rpForm").onsubmit=async ev=>{
      ev.preventDefault();const why=$("#rpWhy").value.trim();
      if(why.length<3){$("#rpErr").textContent="Please say what is wrong.";return}
      try{await reportJob(auth.getSession().user.id,j.id,why);closeModal();toast("Thank you. The alumni cell will review this listing.")}
      catch(err){$("#rpErr").textContent=err&&(err.code==="23505"||/duplicate/i.test(err.message))?"You have already reported this listing.":friendly(err)}
    };
  };
}

function postWire(){
  const f=$("#pj");
  const gateBox=(inner)=>{$("#pjForm").innerHTML=`<div style="text-align:center;padding:30px 10px"><div class="ic dark" style="margin:0 auto 18px;width:68px;height:68px;border-radius:50%">${LOCK_ICON}</div>${inner}</div>`};
  if(!S.auth){gateBox(`<h2 style="font-size:1.5rem">Sign in to post a job</h2><p style="margin:10px 0 22px">Only verified alumni can submit openings for the network.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a href="#login" class="btn btn-em">Sign in</a><a href="#login/join" class="btn btn-line">Create account</a></div>`);return}
  if(!S.profile||S.profile.verification_status!=="verified"){gateBox(`<h2 style="font-size:1.5rem">Your account is not verified yet</h2><p style="margin:10px 0 22px">Jobs can be posted once the alumni cell has verified you. ${S.profile&&S.profile.verification_status==="rejected"?"Please correct your details on your profile page.":"Meanwhile, complete your profile."}</p><a href="#me" class="btn btn-em">Go to my profile</a>`);return}
  if(!f)return;
  const setErr=(el,ok,msg)=>{el.classList.toggle("bad",!ok);const er=el.parentElement.querySelector(".err");if(er)er.textContent=ok?"":msg};
  f.onsubmit=async e=>{
    e.preventDefault();let ok=true;
    const v=n=>f[n].value.trim();
    const chk=(n,good,msg)=>{setErr(f[n],good,msg);if(!good)ok=false};
    chk("t",v("t").length>=3,"At least 3 characters");
    chk("co",v("co").length>=2,"Enter the company name");
    chk("loc",v("loc").length>=2,"Enter the location");
    chk("desc",v("desc").length>=20,"Please write at least 20 characters");
    const web=v("web");chk("web",web===""||/^https:\/\/[^\s<>"']{3,255}$/i.test(web),"Link must start with https://");
    const link=v("link");let apply_url=null,apply_email=null;
    if(link.includes("@")){apply_email=link;chk("link",EMAIL_RE.test(link)&&link.length<=254,"Enter a valid email")}
    else{apply_url=link;chk("link",/^https:\/\/[^\s<>"']{3,255}$/i.test(link),"Enter an https:// link or an email")}
    const emin=v("emin")===""?null:+v("emin"),emax=v("emax")===""?null:+v("emax");
    chk("emin",emin===null||(Number.isInteger(emin)&&emin>=0&&emin<=60),"0 to 60");
    chk("emax",emax===null||(Number.isInteger(emax)&&emax>=0&&emax<=60&&(emin===null||emax>=emin)),"Must be at least the minimum");
    const dl=v("dl");chk("dl",dl===""||dl>=new Date().toISOString().slice(0,10),"Date cannot be in the past");
    if(!ok)return;
    const btn=f.querySelector("button[type=submit]");btn.disabled=true;
    try{
      await submitJob({submitted_by:auth.getSession().user.id,title:v("t"),company:v("co"),company_website:web||null,location:v("loc"),industry:v("ind")||null,
        employment_type:f.type.value,work_mode:f.mode.value,salary_text:v("sal")||null,experience_min_years:emin,experience_max_years:emax,
        description:v("desc"),responsibilities:v("resp")||null,qualifications:v("qual")||null,
        skills:v("skills").split(",").map(x=>x.trim().slice(0,40)).filter(Boolean).slice(0,20),apply_url,apply_email,deadline:dl||null});
      $("#pjForm").style.display="none";$("#pjDone").style.display="block";toast("Job submitted for approval");$("#pjAgain").onclick=()=>hooks.route();
    }catch(err){setErr(f.link,false,/check constraint|violates/i.test(err.message)?"Some details are not valid. Please check the fields.":friendly(err))}
    finally{btn.disabled=false}
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

/* resize to <=512px JPEG on the device (also strips EXIF/GPS data) */
async function toJpeg(file,max=512){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){const e=new Error("type");e.userMessage="Please choose a JPG, PNG or WebP image.";throw e}
  if(file.size>15*1024*1024){const e=new Error("size");e.userMessage="That image is too large. Choose one under 15 MB.";throw e}
  let bmp;try{bmp=await createImageBitmap(file)}catch{const e=new Error("decode");e.userMessage="That image could not be read.";throw e}
  const k=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(bmp.width*k));c.height=Math.max(1,Math.round(bmp.height*k));
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("encode")),"image/jpeg",0.85));
}

/* my profile */
const STATUS={
  pending:["Awaiting verification","The alumni cell will check your details and verify you. Until then you can complete your profile, but it is not listed and you cannot post jobs or register for events."],
  verified:["Verified alumnus","Your profile follows the visibility you choose below."],
  rejected:["Verification needs attention","Please correct your batch year or enrolment number below and save: you will go back in the queue to be reviewed again."],
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
      <div class="full" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div id="avPrev" class="av" style="width:84px;height:84px;font-size:1.4rem;${p.avatar_path?`background-image:url('${esc(storage.publicUrl("avatars",p.avatar_path))}')`:""}">${p.avatar_path?"":esc(ini(p.full_name||"?"))}</div><div><label for="avFile">Profile photo</label><input id="avFile" type="file" accept="image/jpeg,image/png,image/webp"><div><small id="avMsg" role="status" style="color:var(--muted)">JPG, PNG or WebP. Resized on your device; location data in the photo is removed.</small></div></div></div>
      <div class="full"><label>Full name *</label><input class="field" name="full_name" maxlength="120" value="${v(p.full_name)}"><div class="err"></div></div>
      <div><label>Batch (graduation year)</label><select class="field" name="graduation_year"><option value="">Not set</option>${[...new Set([...batchYears(),...(p.graduation_year?[p.graduation_year]:[])])].sort((a,b)=>b-a).map(y=>`<option value="${y}"${y===p.graduation_year?" selected":""}>${y}</option>`).join("")}</select></div>
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
  box.insertAdjacentHTML("beforeend",`<div class="card" style="padding:28px;margin-top:22px" id="myJobsBox"><h2 style="font-size:1.3rem;margin-bottom:12px">My job listings</h2><div id="myJobs"><p>Loading…</p></div></div>`);
  const renderMyJobs=async()=>{
    const el=$("#myJobs");if(!el)return;
    try{
      const rows=await myJobs(p.id);
      el.innerHTML=rows.length?rows.map(r=>`<div data-id="${esc(r.id)}" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;padding:12px 0;border-top:1px solid var(--line)">
        <div><b>${esc(r.title)}</b> · ${esc(r.company)} <span class="tag" style="vertical-align:middle">${esc(({pending:"Waiting for review",approved:"Live",rejected:"Not approved",withdrawn:"Withdrawn",expired:"Expired"})[r.status]||r.status)}</span>${r.rejection_reason?`<div style="font-size:.88rem;color:var(--muted)">Reason: ${esc(r.rejection_reason)}</div>`:""}</div>
        <div style="display:flex;gap:8px">${r.status==="approved"?`<a class="btn btn-line btn-sm" href="#job/${esc(r.id)}">View</a>`:""}${r.status==="pending"||r.status==="approved"?`<button class="btn btn-line btn-sm" data-jact="withdraw">Withdraw</button>`:""}${["pending","rejected","withdrawn"].includes(r.status)?`<button class="btn btn-line btn-sm" data-jact="delete">Delete</button>`:""}</div></div>`).join(""):`<p>You have not posted any jobs. <a class="more" href="#post-job">Post a job</a></p>`;
    }catch(err){el.innerHTML=`<p>${esc(friendly(err))}</p>`}
  };
  renderMyJobs();
  $("#myJobsBox").onclick=async e=>{
    const b=e.target.closest("[data-jact]");if(!b)return;const id=b.closest("[data-id]").dataset.id;if(!isId(id))return;
    const run=async()=>{try{if(b.dataset.jact==="withdraw"){await withdrawJob(id);toast("Listing withdrawn")}else{await deleteJob(id);toast("Listing deleted")}renderMyJobs()}catch(err){toast(friendly(err))}};
    if(b.dataset.jact==="withdraw"){run();return}
    openModal(`<h2 style="font-size:1.35rem">Delete this listing?</h2><p style="margin-top:10px">This cannot be undone.</p><div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-em" id="dlYes">Delete</button><button class="btn btn-line" id="dlNo">Keep it</button></div>`);
    $("#dlNo").onclick=closeModal;$("#dlYes").onclick=()=>{closeModal();run()};
  };
  const f=$("#fMe");
  $("#avFile").onchange=async e=>{
    const file=e.target.files[0];if(!file)return;const msg=$("#avMsg");
    try{
      msg.textContent="Uploading…";
      const blob=await toJpeg(file);
      const path=p.id+"/avatar-"+Date.now().toString(36)+".jpg";
      await storage.upload("avatars",path,blob);
      const old=S.profile.avatar_path;
      const rows=await db.update("profiles",{id:"eq."+p.id},{avatar_path:path});
      if(rows&&rows[0])S.profile=rows[0];
      if(old&&old!==path){storage.remove("avatars",old).catch(()=>{})}
      const pv=$("#avPrev");pv.style.backgroundImage=`url('${storage.publicUrl("avatars",path)}')`;pv.textContent="";
      msg.textContent="Photo updated.";
    }catch(err){msg.textContent=err&&err.userMessage?err.userMessage:friendly(err)}
    e.target.value="";
  };
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

/* administrator: verify alumni, review jobs, handle reports */
async function adminWire(){
  const box=$("#adBox");if(!box)return;
  if(!auth.getSession()){box.innerHTML=`<p>Please <a class="more" href="#login">sign in</a> as an administrator.</p>`;return}
  if(!S.isAdmin){box.innerHTML=`<p>This page is for administrators only.</p>`;return}
  let sec="members",tab="pending";
  const SECTIONS=[["members","Alumni"],["jobs","Jobs"],["reports","Reports"]];
  const TABS={members:[["pending","Waiting"],["verified","Verified"],["rejected","Rejected"],["suspended","Suspended"],["all","Everyone"]],
              jobs:[["pending","Waiting"],["approved","Live"],["rejected","Not approved"],["all","Everyone"]],reports:[]};
  const shell=()=>{box.innerHTML=`<div class="chips" id="adSecs" style="margin-bottom:12px">${SECTIONS.map(t=>`<button class="chip ${t[0]===sec?"on":""}" data-s="${t[0]}">${t[1]}</button>`).join("")}</div>
    ${TABS[sec].length?`<div class="chips" id="adTabs" style="margin-bottom:18px">${TABS[sec].map(t=>`<button class="chip ${t[0]===tab?"on":""}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>`:""}<div id="adList"><p>Loading…</p></div>`};
  const day=d=>esc(new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}));
  const btns=a=>a.filter(Boolean).map(x=>`<button class="btn ${x[2]||"btn-line"} btn-sm" data-act="${x[0]}">${x[1]}</button>`).join("");
  const row=(id,head,sub,meta,actions,extra="")=>`<article class="card" style="padding:20px 24px;margin-bottom:14px" data-id="${esc(id)}" ${extra}><div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start"><div style="min-width:0;flex:1 1 320px">${head}<div style="color:var(--muted);font-size:.9rem;margin-top:4px;word-break:break-word">${sub}</div><div style="color:var(--muted);font-size:.82rem;margin-top:2px">${meta}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div></div></article>`;

  const loaders={
    async members(list){
      const rows=await db.rpc("admin_list_members",{p_status:tab==="all"?null:tab});
      list.innerHTML=rows.length?rows.map(r=>row(r.id,`<h3 style="font-size:1.1rem">${esc(r.full_name||"(no name)")} <span class="tag" style="vertical-align:middle">${esc(r.verification_status)}</span></h3>`,
        `${esc(r.email)} · Batch ${esc(r.graduation_year??"?")} · Enrolment: ${esc(r.enrollment_no||"not given")}${r.current_company?" · "+esc(r.current_company):""}${r.city?" · "+esc(r.city):""}`,
        `Registered ${day(r.created_at)}${r.verification_note?` · Note: ${esc(r.verification_note)}`:""}`,
        btns([r.verification_status!=="verified"?["verified",r.verification_status==="suspended"?"Reinstate":"Verify","btn-em"]:null,
              ["pending","verified"].includes(r.verification_status)?["rejected","Reject"]:null,r.verification_status==="verified"?["suspended","Suspend"]:null]))).join(""):`<p>${tab==="pending"?"Nobody is waiting for verification.":"Nobody here."}</p>`;
    },
    async jobs(list){
      const rows=await db.select("jobs","*",{...(tab==="all"?{}:{status:"eq."+tab}),order:"created_at.desc",limit:"200"});
      const ids=[...new Set(rows.map(r=>r.submitted_by))];
      const names={};if(ids.length)(await db.select("profiles","id,full_name",{id:"in.("+ids.join(",")+")"})).forEach(p=>names[p.id]=p.full_name);
      list.innerHTML=rows.length?rows.map(r=>row(r.id,`<h3 style="font-size:1.1rem">${esc(r.title)} <span class="tag" style="vertical-align:middle">${esc(r.status)}</span>${r.featured?' <span class="tag g">Featured</span>':""}</h3>`,
        `${esc(r.company)} · ${esc(r.location)} · ${esc(TYPE[r.employment_type]||"")} · Apply: ${esc(r.apply_url||r.apply_email||"")}<br><span style="white-space:pre-line">${esc(r.description.slice(0,400))}${r.description.length>400?"…":""}</span>`,
        `Posted by ${esc(names[r.submitted_by]||"unknown")} on ${day(r.created_at)}${r.rejection_reason?` · Reason: ${esc(r.rejection_reason)}`:""}`,
        btns([r.status!=="approved"?["approved","Approve","btn-em"]:null,["pending","approved"].includes(r.status)?["rejected",r.status==="approved"?"Take down":"Reject"]:null,
              r.status==="approved"?[r.featured?"unfeature":"feature",r.featured?"Unfeature":"Feature"]:null]))).join(""):`<p>${tab==="pending"?"No jobs are waiting for review.":"Nothing here."}</p>`;
    },
    async reports(list){
      const rows=await db.select("content_reports","*",{status:"eq.open",order:"created_at.desc",limit:"100"});
      const ids=[...new Set(rows.map(r=>r.entity_id))];
      const jobs={};if(ids.length)(await db.select("jobs","id,title,company,status",{id:"in.("+ids.join(",")+")"})).forEach(j=>jobs[j.id]=j);
      list.innerHTML=rows.length?rows.map(r=>{const j=jobs[r.entity_id];return row(r.id,`<h3 style="font-size:1.1rem">Report on ${j?esc(j.title)+" · "+esc(j.company):"a removed listing"}</h3>`,`“${esc(r.reason)}”`,`Reported ${day(r.created_at)}${j?` · Listing is ${esc(j.status)}`:""}`,
        btns([j&&j.status==="approved"?["takedown","Take down listing","btn-em"]:null,["dismiss","Dismiss report"]]),`data-job="${esc(r.entity_id)}"`)}).join(""):`<p>No open reports.</p>`;
    }
  };
  const load=async()=>{const list=$("#adList");if(!list)return;try{await loaders[sec](list)}catch(err){list.innerHTML=`<p>${esc(friendly(err))}</p>`}};
  shell();load();

  const doIt=async(act,id,jobId,note)=>{
    if(sec==="members")return db.update("profiles",{id:"eq."+id},{verification_status:act,verification_note:note||null});
    if(sec==="jobs"){
      if(act==="feature"||act==="unfeature")return db.update("jobs",{id:"eq."+id},{featured:act==="feature"});
      return db.update("jobs",{id:"eq."+id},{status:act,rejection_reason:act==="rejected"?note:null});
    }
    if(act==="dismiss")return db.update("content_reports",{id:"eq."+id},{status:"dismissed"});
    await db.update("jobs",{id:"eq."+jobId},{status:"rejected",rejection_reason:note});
    return db.update("content_reports",{id:"eq."+id},{status:"resolved"});
  };
  box.onclick=e=>{
    const sb=e.target.closest("[data-s]");if(sb){sec=sb.dataset.s;tab=TABS[sec][0]?TABS[sec][0][0]:"";shell();load();return}
    const t=e.target.closest("[data-t]");if(t){tab=t.dataset.t;shell();load();return}
    const b=e.target.closest("[data-act]");if(!b)return;
    const card=b.closest("[data-id]"),id=card.dataset.id,jobId=card.dataset.job,act=b.dataset.act;
    if(!isId(id)||(jobId&&!isId(jobId)))return;
    const quick=["feature","unfeature","dismiss"].includes(act);
    const run=async note=>{try{await doIt(act,id,jobId,note);closeModal();toast("Updated");load()}catch(err){const el=$("#adErr");if(el)el.textContent=friendly(err);else toast(friendly(err))}};
    if(quick){run("");return}
    const need=["rejected","suspended","takedown"].includes(act)&&!(sec==="members"&&act==="verified");
    const titles={verified:"Verify this alumnus?",rejected:"Reject",suspended:"Suspend this account",approved:"Approve this job?",pending:"Return to review?",takedown:"Take this listing down"};
    openModal(`<h2 style="font-size:1.35rem">${esc(titles[act]||"Confirm")}</h2>
      <form id="adForm" style="margin-top:14px"><label for="adNote">${need?"Reason (the member will see this) *":"Note (optional)"}</label><textarea class="field" id="adNote" rows="3" maxlength="500"></textarea><div class="err" id="adErr"></div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-em" type="submit">Confirm</button><button class="btn btn-line" type="button" id="adCancel">Cancel</button></div></form>`);
    $("#adCancel").onclick=closeModal;
    $("#adForm").onsubmit=ev=>{ev.preventDefault();const note=$("#adNote").value.trim();if(need&&note.length<3){$("#adErr").textContent="Please give a short reason.";return}run(note)};
  };
}

/* footer policy links */
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-policy]");if(!a)return;e.preventDefault();
  openModal(`<h2 style="font-size:1.45rem">${a.dataset.policy==="privacy"?"Privacy policy":"Terms & conditions"}</h2><p style="margin-top:12px">Policy text to be provided by the institute. Public pages show only profiles and details alumni have agreed to share.</p>`);
});

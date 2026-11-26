/* View templates (HTML strings). Data now comes from ../data/dev-sample.js; swapped for services later. */
import {$,esc,ini,U,P,dt,CAMPUS,batchYears} from '../lib/util.js';
import {S} from '../state.js';
import {ALUMNI,COUNTRIES,INDUSTRIES,DEPTS,JOBS,EVENTS,NEWS,GAL,STORIES,TESTI,FACULTY,fini,VISION,MISSION,PEO,PO,PSO,facCards,PH} from '../data/dev-sample.js';
/* ============ view templates ============ */
export const V={};
export const ICO={
  users:"M12 11a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  mentor:"M12 3l9 4-9 4-9-4 9-4zM7 11v5c0 1 2 3 5 3s5-2 5-3v-5",
  heart:"M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z",
  pin:"M12 21s-7-4.4-7-10a7 7 0 0114 0c0 5.6-7 10-7 10z",
  check:"M5 13l4 4L19 7",
  cal:"M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 2v4M16 2v4"
};
export const svg=(d,s=22,w=2)=>`<svg width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

V.home=()=>`
<section class="hero">
  <div class="hero-bg" style="background-image:url('${CAMPUS}')" role="img" aria-label="Government Polytechnic Chhatrapati Sambhaji Nagar campus"></div>
  <div class="wrap hero-in">
    <div class="reveal">
      <div class="mr-l">एकदा विद्यार्थी, सदैव आपलं कुटुंब</div>
      <h1>Welcome to <em>GPCPSN</em> Alumni Network</h1>
      <p class="hp">Reconnect with your batchmates, find verified opportunities and give back to the institute that started your career.</p>
      <div class="hero-cta"><a href="#login/join" class="btn btn-em">Join Alumni Network <span>→</span></a><a href="#about" class="btn btn-white">Explore the network</a></div>
    </div>
    <div class="net reveal d2" aria-label="What the network offers">
      <div class="net-top"><span>Your network</span><span>Civil Engineering</span></div>
      <div class="feed"><div class="fi"><i></i><span>Verified alumni directory</span></div><div class="fi"><i></i><span>Jobs shared by fellow alumni</span></div><div class="fi"><i></i><span>Reunions, talks and events</span></div></div>
      <div class="net-foot"><span>Government Polytechnic, Chhatrapati Sambhaji Nagar</span></div>
    </div>
  </div>
</section>

<div class="glance"><div class="wrap"><div class="glance-box reveal">
  ${[[ICO.users,"Verified alumni","verified_members"],["M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20","Countries","countries"],["M21 16V8l-9-5-9 5v8l9 5 9-5zM12 3v18","Open jobs","open_jobs"],["M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z","Upcoming events","upcoming_events"]]
    .map(x=>`<div class="gl"><div class="ic">${svg(x[0],22)}</div><b data-stat="${x[2]}">–</b><span>${x[1]}</span></div>`).join("")}
</div></div></div>

<section class="sec">
  <div class="wrap split">
    <div class="stack reveal">
      <div class="big photo" style="background-image:url('${U("photo-1541888946425-d81bb19240f5",1200)}')"></div>
      <div class="small photo" style="background-image:url('${U("photo-1581092160562-40aa08e78837",800)}')"></div>
      <div class="badge"><span class="ic" style="width:36px;height:36px;border-radius:11px">${svg(ICO.mentor,18,2)}</span>Civil Engineering Dept.</div>
    </div>
    <div class="reveal d1">
      <div class="kicker">About the network</div>
      <h2>A home for every batch</h2>
      <p class="lead" style="margin-top:16px">Created by the Department of Civil Engineering, this network keeps graduates connected to the institute and to each other, and turns that bond into support for careers.</p>
      <div class="pillars">
        <div class="pillar"><div class="ic">${svg(ICO.users)}</div><div><b>Connect</b><p>Find batchmates by year, city or trade.</p></div></div>
        <div class="pillar"><div class="ic">${svg(ICO.mentor)}</div><div><b>Mentor</b><p>Guide students toward jobs and internships.</p></div></div>
        <div class="pillar"><div class="ic">${svg(ICO.heart)}</div><div><b>Give back</b><p>Scholarships, talks and shared resources.</p></div></div>
      </div>
      <a href="#about" class="btn btn-navy">Learn more <span>→</span></a>
    </div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Department of Civil Engineering</div><h2>Meet our faculty</h2><p>The department that created this alumni network.</p></div><a href="#about/faculty" class="more">Vision, mission &amp; outcomes <span>→</span></a></div>
    <article class="fac-head reveal">
      <div class="ov"><div class="bg" style="background-image:url('${U("photo-1541888946425-d81bb19240f5",1200)}')"></div></div>
      <div class="body"><span class="tag" style="align-self:flex-start">${esc(FACULTY[0].d)}</span><div style="display:flex;gap:18px;align-items:center;margin-top:8px"><div class="av" style="width:84px;height:84px;font-size:1.4rem">${esc(fini(FACULTY[0].n))}</div><h3>${esc(FACULTY[0].n)}</h3></div><p style="margin-top:8px">${esc(VISION)}</p><a class="more" href="#about/faculty" style="margin-top:8px">Read more <span>→</span></a></div>
    </article>
    <div class="fac-grid">${facCards(1)}</div>
  </div>
</section>

<section class="sec" id="featSec" style="display:none">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Featured alumni</div><h2>People who inspire</h2></div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="car-nav"><button id="carL" aria-label="Previous"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button><button id="carR" aria-label="Next"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button></div><a href="#alumni" class="more">All alumni <span>→</span></a></div></div>
    <div class="car" id="car">
    </div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Success stories</div><h2>Journeys worth reading</h2></div><a href="#news" class="more">All stories <span>→</span></a></div>
    <div class="grid g3">
      ${STORIES.map((s,i)=>`<article class="card story reveal d${i}"><div class="ov"><div class="bg" style="background-image:url('${U(s.img,900)}')"></div></div><span class="tag n" style="align-self:flex-start">${esc(s.cat)}</span><h3>${esc(s.t)}</h3><p>${esc(s.ex)}</p><div style="font-size:.86rem;color:var(--muted);margin-bottom:14px"><b style="color:var(--navy)">${esc(s.who)}</b> · Batch ${s.y}</div><a class="more" href="#news" style="margin-top:auto">Read the story <span>→</span></a></article>`).join("")}
    </div>
  </div>
</section>

<section class="sec" id="homeJobsSec" style="display:none">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Career opportunities</div><h2>Latest openings from alumni</h2></div><a href="#jobs" class="btn btn-line btn-sm">Browse all jobs <span>→</span></a></div>
    <div class="grid g2" id="homeJobs"></div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Upcoming events</div><h2>Gather, learn, reconnect</h2></div><a href="#events" class="more">All events <span>→</span></a></div>
    <div class="grid g3">
      ${EVENTS.filter(e=>!dt(e.d).past).slice(0,3).map((e,i)=>{const f=dt(e.d);return `<article class="card ev reveal d${i}"><div class="dt"><b>${f.day}</b><small>${f.mon}</small></div><div class="ov"><div class="bg" style="background-image:url('${U(e.img,900)}')"></div></div><span class="tag ${e.cat==='Alumni reunions'?'':'n'}" style="align-self:flex-start">${esc(e.cat)}</span><h3 style="margin-top:12px">${esc(e.t)}</h3><div class="info"><span>🕘 ${esc(e.time)}</span><span>📍 ${esc(e.venue)}</span></div><a class="btn btn-navy btn-sm" href="#event/${e.id}" style="align-self:flex-start;margin-top:auto">Register now</a></article>`}).join("")}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Latest news & blogs</div><h2>Stories, insights and updates</h2></div><a href="#news" class="more">Read all <span>→</span></a></div>
    <div class="grid g3">
      ${NEWS.slice(0,3).map((n,i)=>`<article class="card nw reveal d${i}"><div class="ov"><div class="bg" style="background-image:url('${U(n.img,900)}')"></div></div><span class="tag ${i===1?'g':''}" style="align-self:flex-start">${esc(n.cat)}</span><h3 style="margin-top:12px">${esc(n.t)}</h3><div class="meta">${dt(n.date).short} · ${esc(n.author)}</div><p>${esc(n.ex)}</p><a class="more" href="#blog/${n.id}" style="margin-top:auto">Read more <span>→</span></a></article>`).join("")}
    </div>
  </div>
</section>

<section class="sec paper" id="testiSec" style="display:none">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Testimonials</div><h2>In their words</h2></div></div>
    <div class="reveal" id="testi">

      <div class="tdots" id="tdots"></div>
    </div>
  </div>
</section>

<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="cta reveal">
      <div><h2>Your place in the network is waiting.</h2><p>Three simple steps and your profile goes live after verification.</p><div class="cta-row"><a href="#login/join" class="btn btn-em">Join Alumni Network <span>→</span></a><a href="#alumni" class="btn btn-white">Find batchmates</a></div></div>
      <div class="steps">
        <div><b>1</b>Create your account</div>
        <div><b>2</b>Add your education and career</div>
        <div><b>3</b>Get verified and connect</div>
      </div>
    </div>
  </div>
</section>`;

V.about=()=>`
${phero("About Alumni","About the Alumni Network","Created by the Department of Civil Engineering","Government Polytechnic, Chhatrapati Sambhaji Nagar. Meet the faculty, our vision and mission, and the outcomes every Civil Engineering diploma graduate works toward.","CAMPUS",[])}
<section class="sec">
  <div class="wrap split">
    <div class="reveal">
      <div class="kicker">Who we are</div>
      <h2>An alumni network built by the Civil Engineering Department</h2>
      <p class="lead" style="margin-top:16px">This alumni network was created by the Department of Civil Engineering, Government Polytechnic, Chhatrapati Sambhaji Nagar, to keep every batch connected to the department, to its faculty and to each other.</p>
      <p style="margin-top:14px">It turns that bond into jobs, mentoring, reunions and support for the next generation of civil engineers.</p>
      <div class="cta-row" style="margin-top:28px"><a href="#about/faculty" class="btn btn-navy">Meet the faculty <span>↓</span></a><a href="#login/join" class="btn btn-line">Join the network</a></div>
    </div>
    <div class="stack reveal d1">
      <div class="big photo" style="background-image:url('${CAMPUS}')"></div>
      <div class="small photo" style="background-image:url('${U("photo-1504307651254-35680f356dfd",800)}')"></div>
      <div class="badge"><span class="ic" style="width:36px;height:36px;border-radius:11px">${svg(ICO.mentor,18,2)}</span>Civil Engineering Dept.</div>
    </div>
  </div>
</section>

<section class="sec paper" id="faculty">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Our faculty</div><h2>Department of Civil Engineering</h2><p>The people who teach, guide and stay in touch with every batch.</p></div></div>
    <article class="fac-head reveal">
      <div class="ov"><div class="bg" style="background-image:url('${U("photo-1541888946425-d81bb19240f5",1200)}')"></div></div>
      <div class="body"><span class="tag" style="align-self:flex-start">${esc(FACULTY[0].d)}</span><div style="display:flex;gap:18px;align-items:center;margin-top:8px"><div class="av" style="width:84px;height:84px;font-size:1.4rem">${esc(fini(FACULTY[0].n))}</div><h3>${esc(FACULTY[0].n)}</h3></div><p style="margin-top:8px">Head of the Department of Civil Engineering, leading the faculty and the alumni network.</p></div>
    </article>
    <div class="fac-grid">${facCards(1)}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap grid g2" style="gap:26px">
    <div class="card reveal" style="padding:36px"><div class="photo" style="background-image:url('${U("photo-1486406146926-c627a92ad1ab",1000)}')"></div><div class="ic"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg></div><h2 style="font-size:1.7rem;margin:20px 0 12px">Vision</h2><p>${esc(VISION)}</p></div>
    <div class="card reveal d1" style="padding:36px"><div class="photo" style="background-image:url('${U("photo-1581092160562-40aa08e78837",1000)}')"></div><div class="ic"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg></div><h2 style="font-size:1.7rem;margin:20px 0 12px">Mission</h2><p>${esc(MISSION)}</p></div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap grid g2" style="align-items:start;gap:60px">
    <div class="reveal">
      <div class="kicker">Programme Educational Objectives</div><h2>PEOs</h2>
      <div class="obj" style="margin-top:24px">${PEO.map((t,i)=>`<div class="it"><b>PEO${i+1}</b><p>${esc(t)}</p></div>`).join("")}</div>
    </div>
    <div class="banner ov reveal d1"><div class="bg" style="background-image:url('${U("photo-1503387762-592deb58ef4e",1200)}')"></div><div><h3>Diploma to civil engineer</h3><p>Fundamentals, sustainable solutions, professional growth and higher studies.</p></div></div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Programme Outcomes</div><h2>PO's: what every graduate can do</h2></div></div>
    <div class="grid g2">${PO.map((o,i)=>`<div class="card reveal d${i%2}" style="flex-direction:row;gap:18px;align-items:flex-start"><div class="ic dark" style="font-weight:800">${i+1}</div><div><h3>${esc(o[0])}</h3><p style="font-size:.93rem;margin-top:6px">${esc(o[1])}</p></div></div>`).join("")}
      <div class="ov ovt reveal" style="min-height:200px"><div class="bg" style="background-image:url('${U("photo-1517245386807-bb43f82c33c4",1000)}')"></div><h3>Learning that lasts a lifetime</h3></div>
    </div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Programme Specific Outcomes</div><h2>PSO's</h2></div></div>
    <div class="grid g2">${PSO.map((o,i)=>`<div class="card reveal d${i}" style="flex-direction:row;gap:18px;align-items:flex-start"><div class="ic" style="font-weight:800;color:var(--em-d)">${i+1}</div><div><h3>${esc(o[0])}</h3><p style="font-size:.93rem;margin-top:6px">${esc(o[1])}</p></div></div>`).join("")}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Objectives</div><h2>What we work toward</h2></div></div>
    <div class="grid g4">
      ${[["M16 11a4 4 0 10-8 0","Keep batches in touch"],["M3 21V9l9-6 9 6v12","Support students"],["M3 17l6-6 4 4 8-8","Grow careers"],["M12 2a10 10 0 100 20 10 10 0 000-20zM8 12l3 3 5-6","Recognise achievers"]].map((o,i)=>`<div class="card reveal d${i}"><div class="ic">${svg(o[0],24)}</div><h3 style="margin-top:18px">${o[1]}</h3></div>`).join("")}
    </div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap">
    <div class="sec-h reveal"><div><div class="kicker">Why join</div><h2>Benefits of membership</h2></div><a href="#login/join" class="btn btn-em">Join the network <span>→</span></a></div>
    <div class="grid g3">
      ${[["Verified directory","Be found by batchmates and employers."],["Job referrals","Openings posted by fellow alumni first."],["Event access","Reunions, talks and the annual meet."],["Mentoring","Give and receive career guidance."],["Newsletter","Stories and updates from the institute."],["Recognition","Showcase your achievements on your profile."]].map((b,i)=>`<div class="card reveal d${i%3}" style="flex-direction:row;gap:18px;align-items:flex-start"><div class="ic dark">${svg(ICO.check,22,2.2)}</div><div><h3>${b[0]}</h3><p style="font-size:.93rem;margin-top:4px">${b[1]}</p></div></div>`).join("")}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap split" style="gap:60px">
    <div class="reveal"><div class="kicker">Activities</div><h2>What the association does</h2>
      <div style="display:grid;gap:12px;margin-top:24px">${["Annual alumni meet and batch reunions","Mentorship for final-year students","Scholarships and support for needy students","Technical talks and workshops"].map(x=>`<div class="pillar"><div class="ic" style="width:40px;height:40px;border-radius:12px">${svg(ICO.check,18,2.4)}</div><b>${x}</b></div>`).join("")}</div>
    </div>
    <div class="ov reveal d1" style="height:460px;border-radius:28px"><div class="bg" style="background-image:url('${U("photo-1517245386807-bb43f82c33c4",1200)}')"></div><div style="position:absolute;bottom:28px;left:30px;right:30px;color:#fff;z-index:3"><h3 style="color:#fff;font-size:1.5rem">Together, batch by batch</h3></div></div>
  </div>
</section>

<section class="sec paper">
  <div class="wrap grid g2" style="align-items:start;gap:60px">
    <div class="reveal"><div class="kicker">Institute & alumni</div><h2>Message from leadership</h2>
      <div class="card" style="margin-top:24px;flex-direction:row;gap:22px;align-items:center"><div class="av" style="width:84px;height:84px;font-size:1.3rem;flex:none"></div><div><p class="quote">"Our alumni are the proof of what this institute builds. Stay close to your batch and to your juniors. The next generation is watching."</p><b style="display:block;margin-top:12px;color:var(--navy)">Principal (name to be updated)</b></div></div>
    </div>
    <div class="reveal d1"><div class="kicker">Leadership</div><h2>Association committee</h2>
      <div class="grid g2" style="margin-top:24px;gap:14px">${[["President"],["General Secretary"],["Treasurer"],["Batch Coordinator"]].map((c,i)=>`<div class="card" style="padding:20px;align-items:center;text-align:center"><div class="av" style="margin:0 auto 12px;background-image:url('${P(PH[(i*2+1)%PH.length])}')"></div><b style="color:var(--navy)">${c[0]}</b><small style="color:var(--muted)">Name to be updated</small></div>`).join("")}</div>
    </div>
  </div>
</section>

<section class="sec" style="padding-top:40px">
  <div class="wrap">
    <div class="cta reveal" style="grid-template-columns:1fr auto">
      <div><h2>Ready to be part of it?</h2><p>Join in two minutes and start connecting today.</p></div>
      <div style="position:relative"><a href="#login/join" class="btn btn-em">Join the network <span>→</span></a></div>
    </div>
  </div>
</section>`;

V.alumni=()=>`
${phero("Alumni Network","Discover your alumni network","Find batchmates, mentors and peers","Search by name, year, department, company, industry, country and location.","photo-1600880292203-757bb62b4baf",[[ALUMNI.filter(a=>a.pub).length,"Public profiles"],[COUNTRIES.length,"Countries"],[INDUSTRIES.length,"Industries"]])}
<section class="sec">
  <div class="wrap">
    <div class="bar reveal">
      <input class="field" id="fq" placeholder="Search name, company or skill" aria-label="Search">
      <select class="field" id="fy" aria-label="Graduation year"><option value="">Any year</option></select>
      <select class="field" id="fi" aria-label="Industry"><option value="">Any industry</option></select>
      <select class="field" id="fc" aria-label="Country"><option value="">Any country</option></select>
      <select class="field" id="fs" aria-label="Sort"><option value="name">Name A–Z</option><option value="new">Newest batch</option><option value="old">Oldest batch</option></select>
    </div>
    <div class="bar2"><div class="chips" id="chipsAl"></div><span class="count" id="ct"></span></div>
    <div class="grid g3" id="alGrid"></div>
    <div class="empty" id="alEmpty"><h3>No alumni to show yet</h3><p id="alEmptyMsg">Try clearing a filter.</p></div>
    <div class="loadmore"><button class="btn btn-line" id="lm">Load more</button></div>
    <p class="count" style="text-align:center;margin-top:22px">Only profiles alumni have chosen to make public are shown.</p>
  </div>
</section>`;

V.profile=()=>`<section class="sec" style="padding:0"><div id="proBox"><div class="wrap" style="padding:90px 0"><p>Loading profile…</p></div></div></section>`;

V.jobs=()=>`
${phero("Job Portal","Build your next career move","Openings shared by alumni, for alumni","Search by role, company or city, and filter by industry, type, experience and date posted.","photo-1521737604893-d14cc237f11d",[])}
<section class="sec">
  <div class="wrap">
    <div class="bar reveal">
      <input class="field" id="jq" placeholder="Job title, company or city" aria-label="Search jobs">
      <select class="field" id="ji" aria-label="Industry"><option value="">Industry</option></select>
      <select class="field" id="jt" aria-label="Employment type"><option value="">Employment type</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="internship">Internship</option><option value="contract">Contract</option><option value="apprenticeship">Apprenticeship</option></select>
      <select class="field" id="je" aria-label="Experience"><option value="">Experience</option><option value="fresher">Freshers / students</option><option value="1-3">1–3 years</option><option value="3+">3+ years</option></select>
      <select class="field" id="jd" aria-label="Date posted"><option value="">Date posted</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
      <a href="#post-job" class="btn btn-navy" style="white-space:nowrap">Post a job <span>+</span></a>
    </div>
    <div class="bar2"><div class="chips" id="jchips"></div><span class="count" id="jct"></span></div>
    <div class="grid g2" id="jList"></div>
    <div class="empty" id="jEmpty"><h3>No openings to show</h3><p id="jEmptyMsg">Adjust filters to see more roles.</p></div>
    <div class="sec-h" style="margin-top:80px"><div><div class="kicker">Career resources</div><h2>Prepare and grow</h2></div></div>
    <div class="grid g3">
      ${[["Resume templates","Engineering CVs that get shortlisted.","M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"],["Interview prep","Common site and design interview questions.","M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],["Exam guides","Government engineering exam roadmaps.","M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"]].map((r,i)=>`<div class="card reveal d${i}"><div class="ic">${svg(r[2],24)}</div><h3 style="margin-top:18px">${r[0]}</h3><p style="font-size:.93rem;margin:8px 0 16px">${r[1]}</p><a class="more" href="#contact" onclick="return false" style="margin-top:auto">Open guide <span>→</span></a></div>`).join("")}
    </div>
  </div>
</section>
<section class="sec paper" style="padding-top:60px">
  <div class="wrap cta reveal" style="grid-template-columns:1fr auto">
    <div><h2>Hiring? Share it with your batch first.</h2><p>Alumni openings are reviewed by the cell and shared across the network.</p></div>
    <div style="position:relative"><a href="#post-job" class="btn btn-em">Post a job <span>→</span></a></div>
  </div>
</section>`;

V.job=()=>`<div id="jobBox"><section class="sec"><div class="wrap" style="padding:60px 0"><p>Loading…</p></div></section></div>`;

V["post-job"]=()=>`
${phero("Post a Job","Share an opportunity with fellow alumni","Login required. Submissions are reviewed by the alumni cell before going live.","","photo-1497366216548-37526070297c",[])}
<section class="sec">
  <div class="wrap split" style="align-items:start;gap:44px">
    <div class="reveal">
      <div class="card" style="padding:32px"><div class="kicker">How it works</div>
        <div class="track" id="ptrack" style="margin-top:22px"><div class="on">Submit</div><div>Admin review</div><div>Live</div></div>
        <p style="margin-top:20px;font-size:.93rem">After you submit, the alumni cell reviews the listing. You can follow its status under My profile → My job listings. Editing a live listing sends it back for review.</p>
      </div>
    </div>
    <div class="reveal d1" style="background:#fff;border:1px solid var(--line);border-radius:26px;padding:36px;box-shadow:var(--sh)">
      <div id="pjForm">
        <form id="pj" novalidate>
          <div class="g-form">
            <div class="full"><label for="pj_t">Job title *</label><input class="field" id="pj_t" name="t" maxlength="150"><div class="err"></div></div>
            <div><label for="pj_co">Company name *</label><input class="field" id="pj_co" name="co" maxlength="120"><div class="err"></div></div>
            <div><label for="pj_web">Company website</label><input class="field" id="pj_web" name="web" placeholder="https://"><div class="err"></div></div>
            <div><label for="pj_loc">Location *</label><input class="field" id="pj_loc" name="loc" maxlength="120"><div class="err"></div></div>
            <div><label for="pj_ind">Industry</label><input class="field" id="pj_ind" name="ind" maxlength="80" placeholder="e.g. Construction"></div>
            <div><label for="pj_type">Employment type</label><select class="field" id="pj_type" name="type"><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="internship">Internship</option><option value="contract">Contract</option><option value="apprenticeship">Apprenticeship</option></select></div>
            <div><label for="pj_mode">Work mode</label><select class="field" id="pj_mode" name="mode"><option value="on_site">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></div>
            <div><label for="pj_sal">Salary</label><input class="field" id="pj_sal" name="sal" maxlength="60" placeholder="e.g. ₹3–4 LPA"></div>
            <div><label for="pj_emin">Experience: minimum years</label><input class="field" id="pj_emin" name="emin" type="number" min="0" max="60"><div class="err"></div></div>
            <div><label for="pj_emax">Experience: maximum years</label><input class="field" id="pj_emax" name="emax" type="number" min="0" max="60"><div class="err"></div></div>
            <div class="full"><label for="pj_desc">Job description * <small style="color:var(--muted)">(at least 20 characters)</small></label><textarea class="field" id="pj_desc" name="desc" rows="4" maxlength="8000"></textarea><div class="err"></div></div>
            <div class="full"><label for="pj_resp">Responsibilities <small style="color:var(--muted)">(one per line)</small></label><textarea class="field" id="pj_resp" name="resp" rows="3" maxlength="4000"></textarea></div>
            <div class="full"><label for="pj_qual">Qualifications <small style="color:var(--muted)">(one per line)</small></label><textarea class="field" id="pj_qual" name="qual" rows="3" maxlength="4000"></textarea></div>
            <div class="full"><label for="pj_skills">Skills required</label><input class="field" id="pj_skills" name="skills" placeholder="Comma-separated"></div>
            <div><label for="pj_link">How to apply: link (https://…) or email *</label><input class="field" id="pj_link" name="link" maxlength="254"><div class="err"></div></div>
            <div><label for="pj_dl">Last date to apply</label><input class="field" id="pj_dl" type="date" name="dl"><div class="err"></div></div>
            <div class="full"><button class="btn btn-em" type="submit" style="width:100%">Submit for approval <span>→</span></button></div>
          </div>
        </form>
      </div>
      <div id="pjDone" style="display:none;text-align:center;padding:20px 0"><div class="done-ico">✓</div><h2 style="font-size:1.6rem">Submitted for approval</h2><p style="margin:10px 0 24px">The alumni cell will review and publish your listing shortly.</p><div class="track" style="margin-bottom:26px"><div class="on">Submitted</div><div>Admin review</div><div>Live</div></div><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button type="button" class="btn btn-em" id="pjAgain">Post another job</button><a href="#me" class="btn btn-line">My job listings</a><a href="#jobs" class="btn btn-line">Back to jobs</a></div></div>
    </div>
  </div>
</section>`;

V.events=()=>`
${phero("Events","Connect, celebrate & reconnect","Reunions, networking, workshops, conferences and webinars.","","photo-1523050854058-8df90110c9f1",[[EVENTS.filter(e=>!dt(e.d).past).length,"Upcoming"],[S.rsvpN,"Your RSVPs"]])}
<section class="sec">
  <div class="wrap">
    ${(()=>{const e=EVENTS[0];const f=dt(e.d);return `<article class="card reveal" style="padding:0;overflow:hidden;flex-direction:row;flex-wrap:wrap;margin-bottom:56px">
      <div class="ov" style="flex:1 1 480px;min-height:340px;border-radius:0"><div class="bg" style="background-image:url('${U(e.img,1400)}')"></div><div style="position:absolute;top:22px;left:22px;z-index:3"><span class="tag">Featured</span></div></div>
      <div style="flex:1 1 380px;padding:44px;display:flex;flex-direction:column;justify-content:center"><span class="tag n" style="align-self:flex-start">${esc(e.cat)}</span><h2 style="margin:16px 0 12px;font-size:2.1rem">${esc(e.t)}</h2><p>${esc(e.desc)}</p><div style="display:grid;gap:8px;margin:20px 0;color:var(--muted);font-size:.93rem"><span>📅 ${f.full} · ${esc(e.time)}</span><span>📍 ${esc(e.venue)}</span></div><a href="#event/${e.id}" class="btn btn-em" style="align-self:flex-start">View & register <span>→</span></a></div>
    </article>`})()}
    <div class="bar2"><div class="chips" id="evc">${["upcoming","past","all"].map((x,i)=>`<button class="chip ${i===0?'on':''}" data-f="${x}">${x[0].toUpperCase()+x.slice(1)}</button>`).join("")}</div>
      <div class="chips" id="evcat">${["All","Alumni reunions","Networking","Workshops","Conferences","Webinars","University events"].map((x,i)=>`<button class="chip ${i===0?'on':''}" data-cat="${x}">${x}</button>`).join("")}</div></div>
    <div class="grid g3" id="evList"></div>
    <div class="empty" id="evEmpty"><h3>No events in this view</h3></div>
    <div class="sec-h" style="margin-top:80px"><div><div class="kicker">Highlights</div><h2>Moments from past events</h2></div></div>
    <div class="gal">${GAL.slice(0,4).map((g,i)=>`<div class="reveal d${i}" data-lb="${g}" style="height:${i===0?'420px':'200px'}"><div class="bg" style="background-image:url('${U(g,900)}')"></div></div>`).join("")}</div>
  </div>
</section>`;

V.event=(id)=>{
  const e=EVENTS.find(x=>x.id===id); if(!e) return notFound("Event not found","This event may have been removed.");
  const f=dt(e.d), left=e.seats-e.taken, pct=Math.round(e.taken/e.seats*100), full=left<=0, going=!!S.rsvp[e.id], past=f.past;
  const related=EVENTS.filter(x=>x.id!==e.id&&x.cat===e.cat).slice(0,3);
  const label=past?"Event ended":going?"You're registered ✓":full?"Sold out":"Register now";
  return `
  <section class="phero" style="min-height:360px"><div class="bg" style="background-image:url('${U(e.img,2000)}')"></div>
    <div class="wrap"><div class="phero-copy"><div class="crumb"><a href="#events">Events</a><span>/</span>Event details</div><span class="tag">${esc(e.cat)}</span><h1 style="margin-top:14px">${esc(e.t)}</h1><p>${esc(e.venue)}</p></div>
    <div class="mini-stats"><div><b>${f.day}</b><small>${f.mon}</small></div><div><b>${esc(e.fee)}</b><small>Fee</small></div></div></div>
  </section>
  <section class="sec">
    <div class="wrap jd">
      <div class="reveal">
        <div class="card" style="padding:32px"><div class="kicker">About the event</div><p>${esc(e.desc)}</p></div>
        <div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Agenda</div><div class="agenda">${e.agenda.map(a=>`<div class="ag"><b>${esc(a[0])}</b><span>${esc(a[1])}</span></div>`).join("")}</div></div>
        ${e.speakers.length?`<div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Speakers & guests</div><div class="spk">${e.speakers.map((s,si)=>`<div><div class="av" style="background-image:url('${P(PH[(si*3+2)%PH.length])}')"></div><b>${esc(s.n)}</b><small>${esc(s.r)}</small></div>`).join("")}</div></div>`:""}
        <div class="card" style="padding:32px;margin-top:22px"><div class="kicker">Organising committee</div><p>${esc(e.org)}</p></div>
      </div>
      <aside class="side reveal d1">
        <div class="card" style="padding:28px">
          <div class="row" style="border:0;padding:0 0 16px"><div class="ic">${svg(ICO.cal,20)}</div><div><small>Date & time</small><b>${f.full}<br>${esc(e.time)}</b></div></div>
          <div class="row" style="border:0;padding:0 0 16px"><div class="ic">${svg(ICO.pin,20)}</div><div><small>${e.online?'Online':'Venue'}</small><b>${esc(e.venue)}</b></div></div>
          <small style="color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.07em">Seats</small>
          <div class="seats"><i data-w="${pct}"></i></div>
          <div style="font-size:.88rem;color:var(--muted)">${left>0?left+' of '+e.seats+' seats left':'Fully booked'}</div>
          <div class="pri"><button class="btn ${going?'done':'btn-em'}" id="regBtn" data-id="${e.id}" ${past||full&&!going?'disabled':''}>${label}</button>${going?`<button class="btn btn-line btn-sm" id="cancelBtn" data-id="${e.id}">Cancel registration</button>`:''}</div>
        </div>
      </aside>
    </div>
    ${related.length?`<div class="wrap" style="margin-top:70px"><div class="sec-h"><div><div class="kicker">Related</div><h2>More events</h2></div></div><div class="grid g3">${related.map(r=>{const rf=dt(r.d);return `<article class="card ev"><div class="dt"><b>${rf.day}</b><small>${rf.mon}</small></div><div class="ov sm"><div class="bg" style="background-image:url('${U(r.img,700)}')"></div></div><span class="tag n" style="align-self:flex-start">${esc(r.cat)}</span><h3 style="margin-top:12px">${esc(r.t)}</h3><a class="more" style="margin-top:14px" href="#event/${r.id}">View <span>→</span></a></article>`}).join("")}</div></div>`:""}
  </section>`;
};

V.news=()=>`
${phero("News & Blogs","Stories, insights & updates","Alumni experiences, research, career advice and institute news.","","photo-1497366216548-37526070297c",[[NEWS.length,"Articles"],[6,"Categories"]])}
<section class="sec">
  <div class="wrap">
    <div class="bar" style="grid-template-columns:1fr">
      <input class="field" id="nq" placeholder="Search articles" aria-label="Search articles">
    </div>
    <div class="bar2"><div class="chips" id="nc">${["All","Alumni Stories","University News","Career Insights","Research & Innovation","Industry Updates","Alumni Activities"].map((x,i)=>`<button class="chip ${i===0?'on':''}" data-cat="${x}">${x}</button>`).join("")}</div><span class="count" id="nct"></span></div>
    <article class="card reveal" id="nFeat" style="padding:0;overflow:hidden;flex-direction:row;flex-wrap:wrap;margin-bottom:44px"></article>
    <div class="grid g3" id="nGrid"></div>
    <div class="empty" id="nEmpty"><h3>No articles match</h3></div>
    <div class="cta reveal" style="margin-top:80px;grid-template-columns:1fr auto">
      <div><h2>Get the newsletter</h2><p>One email every fortnight with stories and opportunities from the network.</p></div>
      <form class="sub-box" id="subForm" style="max-width:440px;position:relative;background:#fff"><input type="email" placeholder="your@email.com" aria-label="Email" required><button class="btn btn-em btn-sm" type="submit">Subscribe</button></form>
    </div>
  </div>
</section>`;

V.blog=(id)=>{
  const n=NEWS.find(x=>x.id===id); if(!n) return notFound("Article not found","This article may have moved.");
  const words=n.body.join(" ").split(" ").length+60, mins=Math.max(2,Math.round(words/200));
  const rel=NEWS.filter(x=>x.id!==n.id).slice(0,3);
  return `
  <section class="phero" style="min-height:420px"><div class="bg" style="background-image:url('${U(n.img,2000)}')"></div>
    <div class="wrap"><div class="phero-copy"><div class="crumb"><a href="#news">News & Blogs</a><span>/</span>Article</div><span class="tag">${esc(n.cat)}</span><h1 style="margin-top:14px;max-width:22ch">${esc(n.t)}</h1><p>By ${esc(n.author)} · ${dt(n.date).full} · ${mins} min read</p></div></div>
  </section>
  <section class="sec">
    <div class="wrap">
      <article class="art reveal">
        <p class="lead">${esc(n.ex)}</p>
        ${n.body.map((p,i)=>`<p>${esc(p)}</p>${i===0?`<figure><img src="${U(n.img,1400)}" alt=""><figcaption>Photo: ${esc(n.t)}</figcaption></figure>`:""}`).join("")}
        <div class="share">
          <span style="font-weight:700;color:var(--navy);font-size:.9rem">Share</span>
          <button class="chip" id="shareCopy">Copy link</button>
          <button class="chip" data-share="whatsapp">WhatsApp</button>
          <button class="chip" data-share="linkedin">LinkedIn</button>
        </div>
      </article>
    </div>
    <div class="wrap" style="margin-top:80px"><div class="sec-h"><div><div class="kicker">Related</div><h2>Keep reading</h2></div></div>
      <div class="grid g3">${rel.map(r=>`<article class="card nw"><div class="ov"><div class="bg" style="background-image:url('${U(r.img,900)}')"></div></div><span class="tag n" style="align-self:flex-start;margin-top:16px">${esc(r.cat)}</span><h3 style="margin-top:12px">${esc(r.t)}</h3><a class="more" style="margin-top:14px" href="#blog/${r.id}">Read <span>→</span></a></article>`).join("")}</div>
    </div>
  </section>`;
};

V.login=()=>`
<section class="sec" style="padding-top:70px">
  <div class="wrap">
    <div class="auth reveal">
      <div class="side-img" style="background-image:url('${U("photo-1504307651254-35680f356dfd",1400)}')">
        <div class="kicker" style="color:#FFC08A">Member access</div>
        <h2>Welcome back to your network</h2>
        <p>Your batch, your jobs, your events, in one place.</p>
        <div class="pill-list" style="margin-top:22px"><span style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">Directory</span><span style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">Jobs</span><span style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">Events</span></div>
      </div>
      <div class="panel">
        <div class="tabs" id="tabs"><button class="on" data-p="login">Sign in</button><button data-p="join">Register</button><button data-p="forgot">Forgot</button></div>

        <div class="pane on" id="p-login">
          <form id="fLogin" class="stack-f" novalidate>
            <div><label for="l_email">Email</label><input class="field" id="l_email" name="email" type="email" autocomplete="email"><div class="err"></div></div>
            <div><label for="l_pw">Password</label><input class="field" id="l_pw" name="pw" type="password" autocomplete="current-password"><div class="err"></div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><label class="checkrow" style="margin:0"><input type="checkbox"> Remember me</label><button type="button" class="more" data-p="forgot" style="font-size:.86rem">Forgot password?</button></div>
            <button class="btn btn-em" type="submit" style="width:100%">Sign in <span>→</span></button>
            <p style="text-align:center;font-size:.9rem">New here? <button type="button" class="more" data-p="join" style="display:inline">Create an account</button></p>
          </form>
        </div>

        <div class="pane" id="p-join">
          <form id="fJoin" novalidate>
            <div class="g-form">
              <div class="full"><label for="j_name">Full name *</label><input class="field" id="j_name" name="name"><div class="err"></div></div>
              <div class="full"><label for="j_email">Email *</label><input class="field" id="j_email" name="email" type="email"><div class="err"></div></div>
              <div><label for="j_y">Graduation year *</label><select class="field" id="j_y" name="y">${batchYears().map(y=>`<option value="${y}">${y}</option>`).join("")}</select></div>
              <div><label for="j_d">Department</label><select class="field" id="j_d" name="d"><option value="civil-engineering">Civil Engineering</option></select></div>
              <div class="full"><label for="j_en">Enrolment / seat number <small style="color:var(--muted)">(optional, helps us verify you faster)</small></label><input class="field" id="j_en" name="en" maxlength="40" autocomplete="off"><div class="err"></div></div>
              <div><label for="pwIn">Password *</label><input class="field" name="pw" type="password" id="pwIn"><div class="strength"><i id="pwBar"></i></div><div class="err"></div></div>
              <div><label for="j_pw2">Confirm password *</label><input class="field" id="j_pw2" name="pw2" type="password"><div class="err"></div></div>
              <div class="full"><label class="checkrow" style="margin:0"><input type="checkbox" name="terms"> I agree to the terms and privacy policy</label><div class="err" id="tErr"></div></div>
              <div class="full"><button class="btn btn-em" type="submit" style="width:100%">Create account <span>→</span></button></div>
            </div>
          </form>
        </div>

        <div class="pane" id="p-forgot">
          <form id="fForgot" class="stack-f" novalidate>
            <p>Enter your registered email and we will send a reset link. If it does not arrive, contact the alumni cell.</p>
            <div><label for="f_email">Email</label><input class="field" id="f_email" name="email" type="email"><div class="err"></div></div>
            <button class="btn btn-navy" type="submit" style="width:100%">Send reset link</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>`;

export function phero(kicker,title,sub,text,img,stats,pos){
  const src=img==="CAMPUS"?CAMPUS:U(img,2000);
  return `<section class="phero"><div class="bg" style="background-image:url('${src}');background-position:${pos||"center 40%"}"></div>
  <div class="wrap"><div class="phero-copy"><nav class="crumb" aria-label="Breadcrumb"><a href="#home">Home</a><span>/</span>${esc(kicker)}</nav><h1>${esc(title)}</h1>${sub?`<p class="phero-lead">${esc(sub)}</p>`:""}${text?`<p>${esc(text)}</p>`:""}</div>
  ${stats.length?`<div class="mini-stats">${stats.map(s=>`<div><b>${esc(String(s[0]))}</b><small>${esc(s[1])}</small></div>`).join("")}</div>`:""}</div></section>`;
}
export function notFound(t,p){return `<section class="phero" style="min-height:320px"><div class="bg" style="background-image:url('${U("photo-1541888946425-d81bb19240f5",1600)}')"></div><div class="wrap"><div class="phero-copy"><h1>${esc(t)}</h1><p>${esc(p)}</p><a href="#home" class="btn btn-em" style="margin-top:22px">Back to home</a></div></div></section>`}

V.me=()=>`
<section class="sec" style="padding-top:70px"><div class="wrap" style="max-width:860px"><div id="meBox"><p>Loading…</p></div></div></section>`;

V.admin=()=>`
<section class="sec" style="padding-top:70px"><div class="wrap"><div class="sec-h"><div><div class="kicker">Administrator</div><h2>Verify alumni</h2></div></div><div id="adBox"><p>Loading…</p></div></div></section>`;

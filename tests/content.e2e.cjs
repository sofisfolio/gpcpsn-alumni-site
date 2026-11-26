/* End-to-end tests (real browser, MOCK Supabase) for events, news and blogs: public pages, registration, the member Write page,
   and the staff screens for events and articles.   Run:  NODE_PATH=$(npm root -g) node tests/content.e2e.cjs */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "site");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const SB = "https://sllpahrgmhqvchufiugf.supabase.co", U = "http://localhost:8098/";
const results = []; const rec = (n, ok, d = "") => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const server = http.createServer((req, rsp) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end("nf"); }
  rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(rsp);
});
const id = (n) => "00000000-0000-0000-0000-" + String(n).padStart(12, "0");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
const ALL = ["dashboard.view", "members.review", "jobs.review", "jobs.publish", "events.manage", "articles.publish", "articles.review", "reports.handle", "messages.read", "site.manage", "audit.view", "roles.manage"];
const FAC = ["dashboard.view", "events.manage", "articles.publish", "articles.review"];
const EVCATS = [{ id: id(201), slug: "workshops", name: "Workshops" }, { id: id(202), slug: "webinars", name: "Webinars" }];
const ARCATS = [{ id: id(301), slug: "alumni-stories", name: "Alumni Stories" }, { id: id(302), slug: "institute-news", name: "Institute News" }];
const ev = (n, o = {}) => ({ id: id(n), slug: "event-" + n, title: "Event " + n, description: "About event " + n, banner_path: null, starts_at: day(10 + n), ends_at: null, timezone: "Asia/Kolkata", venue: "Hall " + n, address: null,
  is_online: false, category: "Workshops", category_slug: "workshops", capacity: 10, registration_deadline: null, fee_text: "Free", organizer: "Alumni Cell", agenda: [["10:00", "Welcome"]], speakers: [{ name: "Rahul S", role: "Engineer" }], status: "published", featured: false, seats_taken: 2, ...o });
const art = (n, o = {}) => ({ id: id(400 + n), slug: "article-" + n, title: "Article " + n, summary: "Summary " + n, cover_path: null, featured: false, published_at: day(-n), category: "Alumni Stories", category_slug: "alumni-stories", author_name: "Kiran J", author_graduation_year: 2018, content: "First paragraph " + n + ".\n\nSecond paragraph.", ...o });

function makeBackend(o = {}) {
  const st = { calls: [], rpc: [], events: o.events || [], adminEvents: o.adminEvents || [], articles: o.articles || [], adminArticles: o.adminArticles || [], reg: o.reg || null, regs: o.regs || [], uploads: [], removed: [], inserts: [], patches: [], deleted: [],
    access: o.access || { superadmin: false, roles: [], permissions: [] }, verified: o.verified || "verified", failRpc: {}, mine: o.mine || [], online: "https://meet.example.test/secret" };
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    const hdr = req.headers(); const raw = req.postData(); let body = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    st.calls.push({ m, path: url.pathname, q: url.search, body });
    const json = (s, b) => route.fulfill({ status: s, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: b === undefined ? "" : JSON.stringify(b) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const P = url.pathname, uid = (hdr.authorization || "").replace("Bearer tok-", ""), eq = (k) => (url.searchParams.get(k) || "").replace("eq.", "");
    if (P.startsWith("/rest/v1/rpc/")) {
      const fn = P.replace("/rest/v1/rpc/", ""); st.rpc.push({ fn, body });
      if (st.failRpc[fn]) return json(400, { message: st.failRpc[fn], code: "P0001" });
      if (fn === "my_access") return json(200, st.access);
      if (fn === "admin_dashboard") return json(200, { members_pending: 0, members_verified: 1, jobs_pending: 0, jobs_live: 0, reports_open: 0, messages_new: 0, events_upcoming: 1, articles_pending: 1 });
      if (fn === "admin_recent_activity") return json(200, []);
      if (fn === "register_for_event") { st.reg = { status: "registered", attendees: body.p_attendees, notes: body.p_notes }; return json(200, "registered"); }
      if (fn === "cancel_event_registration") { st.reg = { status: "cancelled", attendees: 1 }; return json(200, true); }
      if (fn === "get_event_online_url") return json(200, st.online);
      if (fn === "admin_event_registrations") return json(200, st.regs);
      return json(204);
    }
    if (P === "/rest/v1/profiles" && m === "GET") return json(200, [{ id: uid, full_name: "Test Person", verification_status: st.verified, skills: [] }]);
    if (P === "/rest/v1/events_public") { const i = eq("id"), s = eq("slug"); return json(200, st.events.filter((e) => (!i || e.id === i) && (!s || e.slug === s))); }
    if (P === "/rest/v1/event_categories") return json(200, EVCATS);
    if (P === "/rest/v1/article_categories") return json(200, ARCATS);
    if (P === "/rest/v1/event_registrations") { if (url.searchParams.get("user_id")) return json(200, st.reg ? [st.reg] : []); return json(200, st.regs.filter((r) => r.status === "registered").map((r) => ({ event_id: id(1), attendees: r.attendees }))); }
    if (P === "/rest/v1/articles_public") { const s = eq("slug"); return json(200, st.articles.filter((a) => !s || a.slug === s)); }
    if (P === "/rest/v1/events") {
      if (m === "GET") return json(200, st.adminEvents);
      if (m === "POST") { st.inserts.push({ t: "events", body }); return json(201, [{ ...body, id: id(99) }]); }
      if (m === "PATCH") { st.patches.push({ t: "events", id: eq("id"), body }); return json(200, [{}]); }
      if (m === "DELETE") { st.deleted.push({ t: "events", id: eq("id") }); return json(204); }
    }
    if (P === "/rest/v1/articles") {
      if (m === "GET") { if (url.searchParams.get("author_id") && !url.searchParams.get("status")) return json(200, st.mine); const s = eq("status"); return json(200, st.adminArticles.filter((a) => !s || a.status === s || url.searchParams.get("status") === undefined)); }
      if (m === "POST") { st.inserts.push({ t: "articles", body }); return json(201, [{ ...body, id: id(98) }]); }
      if (m === "PATCH") { st.patches.push({ t: "articles", id: eq("id"), body }); return json(200, [{}]); }
      if (m === "DELETE") { st.deleted.push({ t: "articles", id: eq("id") }); return json(204); }
    }
    if (P.startsWith("/storage/v1/object/")) { if (m === "POST") st.uploads.push({ path: decodeURIComponent(P.replace("/storage/v1/object/", "")) }); else st.removed.push(decodeURIComponent(P.replace("/storage/v1/object/", ""))); return json(200, { Key: "x" }); }
    if (P === "/rest/v1/site_stats") return json(200, [{}]);
    if (["/rest/v1/testimonials", "/rest/v1/featured_alumni_public", "/rest/v1/jobs_public", "/rest/v1/jobs", "/rest/v1/content_reports"].includes(P)) return json(200, []);
    return json(404, { message: "mock: unhandled " + m + " " + P });
  }
  return { st, handle };
}
async function open(browser, backend, session) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (session) await ctx.addInitScript((s) => localStorage.setItem("gpcpsn.session", JSON.stringify(s)), { access_token: "tok-" + session, refresh_token: "ref-" + session, expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: session, email: "s@example.test" } });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.route(SB + "/**", backend.handle); await page.route(/fonts\.|unsplash/, (r) => r.abort());
  return { ctx, page, errs };
}
const STAFF = { superadmin: false, roles: ["Faculty"], permissions: FAC };

(async () => {
  await new Promise((r) => server.listen(8098, r));
  const browser = await chromium.launch();

  /* A. public events list */
  { const events = [ev(1, { title: "Annual <b>Meet</b>", featured: true }), ev(2, { category: "Webinars", capacity: 5, seats_taken: 5 }), ev(3, { starts_at: day(-5), category: "Webinars" }), ev(4, { status: "cancelled" })];
    const b = makeBackend({ events }); const { ctx, page, errs } = await open(browser, b);
    await page.goto(U + "#events"); await page.waitForSelector("#evList .ev");
    const t = await page.textContent("#evList");
    rec("events page shows real upcoming events, not the past one", t.includes("Event 2") && t.includes("Event 4") && !t.includes("Event 3"));
    rec("featured event is shown on top, titles are escaped", (await page.textContent("#evFeat")).includes("Annual <b>Meet</b>") && (await page.$("#evFeat b")) === null);
    rec("full and cancelled events are labelled", t.includes("Fully booked") && t.includes("Cancelled"));
    rec("category chips come from the data", (await page.$$eval("#evcat .chip", (e) => e.map((x) => x.textContent))).join() === "All,Workshops,Webinars");
    await page.click("#evc [data-f=past]"); await page.waitForTimeout(150);
    rec("past filter shows past events", (await page.textContent("#evList")).includes("Event 3"));
    await page.click("#evc [data-f=upcoming]"); await page.click("#evcat [data-cat=Webinars]"); await page.waitForTimeout(150);
    rec("category filter works", !(await page.textContent("#evList")).includes("Event 1") && (await page.textContent("#evList")).includes("Event 2"));
    rec("no sample events appear", !(await page.textContent("#app")).match(/Metro Viaduct|Annual Alumni Meet 2026/));
    rec("no JS errors (events)", errs.length === 0, errs.join("|")); await ctx.close(); }
  { const b = makeBackend({ events: [] }); const { ctx, page } = await open(browser, b); await page.goto(U + "#events"); await page.waitForSelector("#evEmpty.on");
    rec("empty events page shows a friendly message", true); await ctx.close(); }

  /* B. event page: register, online link, cancel, errors */
  { const e1 = ev(1, { is_online: true, venue: null, speakers: [{ name: "Rahul S <i>", role: "Eng" }] });
    const b = makeBackend({ events: [e1, ev(2)] }); const { ctx, page, errs } = await open(browser, b, id(5));
    await page.goto(U + "#event/event-1"); await page.waitForSelector("#regBtn");
    const t = await page.textContent("#evBox");
    rec("event page shows about, agenda and speakers (escaped)", t.includes("About event 1") && t.includes("Welcome") && t.includes("Rahul S <i>") && (await page.$("#evBox .spk i")) === null);
    rec("online link is NOT shown before registering", !(await page.content()).includes("meet.example.test") && !b.st.rpc.some((r) => r.fn === "get_event_online_url"));
    b.st.failRpc.register_for_event = "event_full"; await page.click("#regBtn"); await page.selectOption("#att2", "3"); await page.click("#confirm"); await page.waitForSelector("#rgErr:not(:empty)");
    rec("a full event gives a clear message", (await page.textContent("#rgErr")).includes("not enough seats"));
    delete b.st.failRpc.register_for_event; await page.fill("#attN", "Vegetarian"); await page.click("#confirm"); await page.waitForSelector("#cancelBtn");
    const r = b.st.rpc.filter((x) => x.fn === "register_for_event").pop();
    rec("registration sends event, attendees and note only", r.body.p_event_id === id(1) && r.body.p_attendees === 3 && r.body.p_notes === "Vegetarian" && Object.keys(r.body).length === 3);
    rec("after registering the page shows it and reveals the online link", (await page.textContent("#regRow")).includes("registered") && (await page.$("a[href='https://meet.example.test/secret']")) !== null);
    await page.click("#cancelBtn"); await page.waitForSelector("#regBtn");
    rec("cancelling brings the register button back and hides the link", b.st.rpc.some((x) => x.fn === "cancel_event_registration") && (await page.$("a[href='https://meet.example.test/secret']")) === null);
    await page.goto(U + "#event/not-a-real-one"); await page.waitForSelector("#evBox h1");
    rec("unknown event gives not-found page", (await page.textContent("#evBox")).includes("Event not found"));
    rec("no JS errors (event)", errs.length === 0, errs.join("|")); await ctx.close(); }
  { const b = makeBackend({ events: [ev(1)] }); const { ctx, page } = await open(browser, b);
    await page.goto(U + "#event/event-1"); await page.waitForSelector("#regBtn"); await page.click("#regBtn");
    rec("signed-out visitors are asked to sign in, no call is made", (await page.textContent("#mcontent")).includes("Sign in") && !b.st.rpc.some((x) => x.fn === "register_for_event")); await ctx.close(); }
  { const b = makeBackend({ events: [ev(1)], verified: "pending" }); const { ctx, page } = await open(browser, b, id(6));
    await page.goto(U + "#event/event-1"); await page.waitForSelector("#regRow a");
    rec("unverified members are told registration opens after verification", (await page.textContent("#regRow")).includes("once you are verified")); await ctx.close(); }
  { const b = makeBackend({ events: [ev(1, { starts_at: day(-3) }), ev(2, { status: "cancelled" })] }); const { ctx, page } = await open(browser, b, id(5));
    await page.goto(U + "#event/event-1"); await page.waitForSelector("#regRow button");
    const a = await page.textContent("#regRow"); await page.goto(U + "#event/event-2"); await page.waitForSelector("#regRow button");
    rec("past and cancelled events cannot be registered for", a.includes("Event ended") && (await page.textContent("#regRow")).includes("Event cancelled")); await ctx.close(); }

  /* C. news and blogs */
  { const articles = [art(1, { title: "Hello <u>World</u>", featured: true, content: "Para <b>one</b>\n\nPara two" }), art(2, { category: "Institute News" }), art(3)];
    const b = makeBackend({ articles }); const { ctx, page, errs } = await open(browser, b);
    await page.goto(U + "#news"); await page.waitForSelector("#nGrid .nw");
    rec("news page lists real articles with escaped titles", (await page.textContent("#nFeat")).includes("Hello <u>World</u>") && (await page.$("#nFeat u")) === null && (await page.$$("#nGrid .nw")).length === 2);
    rec("category chips come from the data", (await page.$$eval("#nc .chip", (e) => e.map((x) => x.textContent))).join() === "All,Alumni Stories,Institute News");
    await page.fill("#nq", "article 2"); await page.waitForTimeout(200);
    rec("search narrows the list", (await page.textContent("#nct")).includes("1 article"));
    rec("no fake newsletter form any more", (await page.$("#subForm")) === null);
    await page.goto(U + "#blog/article-1"); await page.waitForSelector(".art");
    rec("article page shows paragraphs escaped, with author and batch", (await page.textContent(".art")).includes("Para <b>one</b>") && (await page.$(".art b")) === null && (await page.textContent("#blogBox")).includes("Batch 2018"));
    await page.goto(U + "#blog/missing"); await page.waitForSelector("#blogBox h1");
    rec("unknown article gives not-found page", (await page.textContent("#blogBox")).includes("Article not found"));
    rec("no JS errors (news)", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* D. home page sections */
  { const b = makeBackend({ events: [ev(1)], articles: [art(1)] }); const { ctx, page } = await open(browser, b);
    await page.goto(U + "#home"); await page.waitForSelector("#homeEvSec:not([style*=none])"); await page.waitForSelector("#homeNewsSec:not([style*=none])");
    rec("home shows real events and news when they exist", (await page.textContent("#homeEv")).includes("Event 1") && (await page.textContent("#homeNews")).includes("Article 1")); await ctx.close(); }
  { const b = makeBackend({}); const { ctx, page } = await open(browser, b); await page.goto(U + "#home"); await page.waitForTimeout(500);
    rec("home hides those sections when there is nothing yet", (await page.$eval("#homeEvSec", (e) => e.style.display)) === "none" && (await page.$eval("#homeNewsSec", (e) => e.style.display)) === "none"); await ctx.close(); }

  /* E. member Write page */
  { const b = makeBackend({}); const { ctx, page } = await open(browser, b); await page.goto(U + "#write"); await page.waitForSelector("#wrBox a");
    rec("signed-out visitors cannot write", (await page.textContent("#wrBox")).includes("Sign in")); await ctx.close(); }
  { const b = makeBackend({ verified: "pending" }); const { ctx, page } = await open(browser, b, id(6)); await page.goto(U + "#write"); await page.waitForSelector("#wrBox a");
    rec("unverified members cannot write", (await page.textContent("#wrBox")).includes("not verified")); await ctx.close(); }
  { const mine = [{ id: id(410), title: "Old draft", status: "draft", slug: "old", content: "x", category_id: id(301), author_id: id(5) }, { id: id(411), title: "Sent back", status: "rejected", rejection_reason: "Add sources <b>please</b>", slug: "s", content: "x", author_id: id(5) }, { id: id(412), title: "Live one", status: "published", slug: "live-one", content: "x", author_id: id(5) }];
    const b = makeBackend({ mine }); const { ctx, page, errs } = await open(browser, b, id(5));
    await page.goto(U + "#write"); await page.waitForSelector("#wrNew");
    const t = await page.textContent("#wrBox");
    rec("my articles show status and the reviewer's note (escaped)", t.includes("Waiting") === false && t.includes("Needs changes") && t.includes("Add sources <b>please</b>") && (await page.$$("#wrBox article b")).length === 1);
    rec("a member cannot edit a live article, only view it", (await page.$$("article[data-id='" + id(412) + "'] [data-wr=edit]")).length === 0 && (await page.$$("article[data-id='" + id(412) + "'] a")).length === 1);
    await page.click("#wrNew"); await page.waitForSelector("#arForm");
    rec("members see 'Submit for review', not 'Publish now'", (await page.textContent("#arForm")).includes("Submit for review") && !(await page.textContent("#arForm")).includes("Publish now"));
    await page.click("button[data-st=pending]");
    rec("submitting needs a title, category and real content", (await page.$$eval("#arForm .err", (e) => e.filter((x) => x.textContent).length)) >= 2 && b.st.inserts.length === 0);
    await page.fill("#ar_title", "My journey"); await page.selectOption("#ar_cat", id(301)); await page.fill("#ar_body", "I started as a diploma student and worked my way up to a site engineer role. ".repeat(2));
    await page.setInputFiles("#ar_img", { name: "c.png", mimeType: "image/png", buffer: PNG }); await page.click("button[data-st=pending]"); await page.waitForSelector("#wrNew");
    const ins = b.st.inserts.find((x) => x.t === "articles");
    rec("submit sends status=pending with author, never featured or published_at", ins && ins.body.status === "pending" && ins.body.author_id === id(5) && !("featured" in ins.body) && !("published_at" in ins.body) && !("slug" in ins.body), JSON.stringify(ins && Object.keys(ins.body)));
    rec("cover is uploaded to the member's own folder", b.st.uploads.some((u) => u.path.startsWith("article-images/" + id(5) + "/cover-")) && ins.body.cover_path.startsWith(id(5) + "/"));
    await page.click("article[data-id='" + id(410) + "'] [data-wr=del]"); await page.click("#dlYes"); await page.waitForTimeout(300);
    rec("deleting a draft asks first, then deletes", b.st.deleted.some((x) => x.t === "articles" && x.id === id(410)));
    rec("no JS errors (write)", errs.length === 0, errs.join("|")); await ctx.close(); }
  { const b = makeBackend({ access: STAFF, mine: [] }); const { ctx, page } = await open(browser, b, id(2));
    await page.goto(U + "#write"); await page.waitForSelector("#wrNew"); await page.click("#wrNew"); await page.waitForSelector("#arForm");
    rec("staff who may publish see 'Publish now'", (await page.textContent("#arForm")).includes("Publish now"));
    await page.fill("#ar_title", "Institute news"); await page.selectOption("#ar_cat", id(302)); await page.fill("#ar_body", "The institute announces a new alumni cell room opening next month. ".repeat(2));
    await page.click("button[data-st=published]"); await page.waitForSelector("#wrNew");
    rec("publish-now sends status=published", b.st.inserts.some((x) => x.t === "articles" && x.body.status === "published")); await ctx.close(); }

  /* F. staff: events */
  { const adminEvents = [ { ...ev(1), category_id: id(201), status: "published", title: "Live <b>one</b>" }, { ...ev(2), category_id: id(201), status: "draft", title: "Draft event" }, { ...ev(3), status: "published", starts_at: day(-4), title: "Old event" } ];
    const regs = [{ user_id: id(7), full_name: "Asha <i>K</i>", email: "asha@example.test", graduation_year: 2014, attendees: 2, notes: "Need parking", status: "registered", created_at: day(-1) }, { user_id: id(8), full_name: "Ravi", email: "ravi@example.test", graduation_year: 2010, attendees: 1, notes: null, status: "cancelled", created_at: day(-1) }];
    const b = makeBackend({ access: STAFF, adminEvents, regs }); const { ctx, page, errs } = await open(browser, b, id(2));
    await page.goto(U + "#admin/events"); await page.waitForSelector("#adMain article");
    let t = await page.textContent("#adMain");
    rec("events list shows upcoming with registration numbers, escaped", t.includes("Live <b>one</b>") && t.includes("Registered: 2") && !t.includes("Draft event") && (await page.$("#adMain article b")) === null);
    await page.click("[data-t=draft]"); await page.waitForSelector("[data-act=evpublish]");
    await page.click("[data-act=evpublish]"); await page.waitForTimeout(300);
    rec("publishing a draft sets status=published", b.st.patches.some((x) => x.t === "events" && x.id === id(2) && x.body.status === "published"));
    await page.click("[data-t=upcoming]"); await page.waitForSelector("article[data-id='" + id(1) + "']");
    await page.click("article[data-id='" + id(1) + "'] [data-act=regs]"); await page.waitForSelector("#rgBox .adm-logrow");
    rec("registrations show names and emails (escaped), seats counted, cancelled dimmed", (await page.textContent("#rgBox")).includes("Asha <i>K</i>") && (await page.textContent("#rgBox")).includes("2 seats") && (await page.$("#rgBox i")) === null && b.st.rpc.some((x) => x.fn === "admin_event_registrations" && x.body.p_event_id === id(1)));
    await page.keyboard.press("Escape"); await page.evaluate(() => document.getElementById("modal").classList.remove("on"));
    await page.click("article[data-id='" + id(1) + "'] [data-act=evcancel]"); await page.click("#cbOk"); await page.waitForTimeout(300);
    rec("cancelling an event asks first, then sets status=cancelled", b.st.patches.some((x) => x.t === "events" && x.id === id(1) && x.body.status === "cancelled"));
    await page.click("[data-t=draft]"); await page.waitForTimeout(200);
    await page.click("[data-act=newevent]"); await page.waitForSelector("#evForm");
    await page.click("#evForm button[type=submit]");
    rec("new event needs a title and a start", (await page.$$eval("#evForm .err", (e) => e.filter((x) => x.textContent).length)) >= 2 && b.st.inserts.length === 0);
    await page.fill("#ev_title", "Reunion 2027"); await page.fill("#ev_start", "2027-01-10T10:00"); await page.fill("#ev_end", "2027-01-10T09:00"); await page.fill("#ev_url", "javascript:alert(1)"); await page.fill("#ev_cap", "0");
    await page.click("#evForm button[type=submit]");
    rec("end before start, a non-https link and zero seats are refused", (await page.$$eval("#evForm .err", (e) => e.filter((x) => x.textContent).length)) >= 3 && b.st.inserts.length === 0);
    await page.fill("#ev_end", "2027-01-10T16:00"); await page.fill("#ev_url", "https://meet.example.test/x"); await page.fill("#ev_cap", "50"); await page.check("input[name=online]");
    await page.fill("#ev_ag", "10:00 | Welcome\nLunch break"); await page.fill("#ev_sp", "Rahul S | Engineer"); await page.selectOption("#ev_cat", id(201)); await page.selectOption("#ev_status", "published");
    await page.setInputFiles("#ev_img", { name: "b.png", mimeType: "image/png", buffer: PNG });
    await page.click("#evForm button[type=submit]"); await page.waitForSelector("[data-act=newevent]");
    const ins = b.st.inserts.find((x) => x.t === "events").body;
    rec("event times are saved as India time (10:00 IST = 04:30 UTC)", ins.starts_at === "2027-01-10T04:30:00.000Z" && ins.ends_at === "2027-01-10T10:30:00.000Z", ins.starts_at);
    rec("event is saved with category, seats, agenda, speakers and creator", ins.category_id === id(201) && ins.capacity === 50 && ins.status === "published" && ins.created_by === id(2) && JSON.stringify(ins.agenda) === JSON.stringify([["10:00", "Welcome"], ["", "Lunch break"]]) && ins.speakers[0].name === "Rahul S" && ins.online_url === "https://meet.example.test/x");
    rec("banner is uploaded to event-banners/events/ and its path saved", b.st.uploads.some((u) => /^event-banners\/events\/[A-Za-z0-9._-]+\.jpg$/.test(u.path)) && /^events\/[A-Za-z0-9._-]+\.jpg$/.test(ins.banner_path));
    await page.click("[data-t=draft]"); await page.waitForSelector("[data-act=evdelete]"); await page.click("[data-act=evdelete]"); await page.click("#cbOk"); await page.waitForTimeout(300);
    rec("only drafts can be deleted, after confirmation", b.st.deleted.some((x) => x.t === "events"));
    rec("no JS errors (staff events)", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* G. staff: articles */
  { const rows = [{ id: id(420), author_id: id(9), title: "Alumni <b>draft</b>", summary: null, content: "Body text of the pending article that is long enough.", status: "pending", featured: false, slug: "alumni-draft", created_at: day(-1), category_id: id(301) },
      { id: id(421), author_id: id(2), title: "Mine live", summary: "s", content: "c", status: "published", featured: false, slug: "mine-live", created_at: day(-2), category_id: id(301) }];
    const b = makeBackend({ access: STAFF, adminArticles: rows }); const { ctx, page, errs } = await open(browser, b, id(2));
    await page.goto(U + "#admin/articles"); await page.waitForSelector("#adMain article");
    rec("review queue shows pending articles (escaped) with approve and reject", (await page.textContent("#adMain")).includes("Alumni <b>draft</b>") && (await page.$("#adMain article b")) === null && (await page.$("[data-act=published]")) !== null && (await page.$("[data-act=rejected]")) !== null);
    await page.click("[data-act=rejected]"); await page.click("#adForm button[type=submit]");
    rec("rejecting needs a reason", (await page.textContent("#adErr")).includes("short reason") && b.st.patches.length === 0);
    await page.fill("#adNote", "Please add sources"); await page.click("#adForm button[type=submit]"); await page.waitForTimeout(300);
    rec("reject stores status and reason", b.st.patches.some((x) => x.t === "articles" && x.id === id(420) && x.body.status === "rejected" && x.body.rejection_reason === "Please add sources"));
    await page.click("[data-act=published]").catch(() => {});
    await page.waitForSelector("#adForm"); await page.click("#adForm button[type=submit]"); await page.waitForTimeout(300);
    rec("publishing sets status=published without a reason", b.st.patches.some((x) => x.t === "articles" && x.id === id(420) && x.body.status === "published" && x.body.rejection_reason === null));
    await page.click("[data-t=published]"); await page.waitForSelector("[data-act=feature]"); await page.click("[data-act=feature]"); await page.waitForTimeout(300);
    rec("feature toggles without a dialog", b.st.patches.some((x) => x.t === "articles" && x.body.featured === true));
    rec("published articles link to the public page", (await page.$("a[href='#blog/mine-live']")) !== null);
    await page.click("[data-act=newarticle]"); await page.waitForSelector("#arForm");
    rec("staff with publish permission can publish from the editor", (await page.textContent("#arForm")).includes("Publish now"));
    rec("no JS errors (staff articles)", errs.length === 0, errs.join("|")); await ctx.close(); }
  { const b = makeBackend({ access: { superadmin: false, roles: ["Contributor"], permissions: ["dashboard.view", "articles.publish"] }, adminArticles: [{ id: id(430), author_id: id(3), title: "Mine pending", content: "c", status: "pending", slug: "m", created_at: day(-1) }, { id: id(431), author_id: id(3), title: "Mine live", content: "c", status: "published", slug: "m2", created_at: day(-1) }] });
    const { ctx, page } = await open(browser, b, id(3)); await page.goto(U + "#admin/articles"); await page.waitForSelector("#adMain article");
    rec("a contributor (publish only) cannot approve or reject, only edit and delete their own", (await page.$("[data-act=rejected]")) === null && (await page.$("[data-act=published]")) === null && (await page.$("[data-act=editarticle]")) !== null);
    rec("contributor sees News & blogs but not Events", (await page.$$eval(".adm-nav a span", (e) => e.map((x) => x.textContent))).join() === "Dashboard,News & blogs"); await ctx.close(); }

  await browser.close(); server.close();
  const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} passed`); process.exit(ok === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

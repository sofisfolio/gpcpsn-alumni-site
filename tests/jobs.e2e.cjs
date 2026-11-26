/* End-to-end tests (real browser, MOCK Supabase) for the job portal: browse, view, post, my listings, report, admin review.
   Run:  NODE_PATH=$(npm root -g) node tests/jobs.e2e.cjs */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "site");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const SB = "https://sllpahrgmhqvchufiugf.supabase.co";
const results = []; const rec = (n, ok, d = "") => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const server = http.createServer((req, rsp) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end("nf"); }
  rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(rsp);
});
const id = (n) => "00000000-0000-0000-0000-" + String(n).padStart(12, "0");
const job = (n, o = {}) => ({ id: id(n), title: "Site Engineer", company: "Acme Infra", company_website: null, company_logo_path: null, location: "Pune", work_mode: "on_site", employment_type: "full_time", industry: "Construction", experience_min_years: 1, experience_max_years: 3, salary_text: "₹4 LPA", description: "Supervise site work and quality.", responsibilities: "Daily site supervision\nQuality checks", qualifications: "Diploma in Civil\nAutoCAD", skills: ["AutoCAD"], apply_url: "https://acme.example/apply", apply_email: null, deadline: null, featured: false, published_at: "2026-11-20T10:00:00Z", created_at: "2026-11-19T10:00:00Z", ...o });
const JOBS = [job(1, { featured: true }), job(2, { title: "Surveyor <img src=x onerror=window.__x=1>", company: "Geo <b>Maps</b>", industry: "Surveying", employment_type: "internship", experience_min_years: 0, experience_max_years: null, apply_url: null, apply_email: null, location: "Dubai" }), job(3, { title: "Senior Planner", industry: "Consulting", experience_min_years: 5, experience_max_years: 9, employment_type: "contract" })];

function makeBackend(o = {}) {
  const st = { calls: [], jobs: o.jobs || [], pub: o.pub || [], reports: o.reports || [], profiles: o.profiles || {}, admins: o.admins || [], posted: [], patches: [], deleted: [], reported: [], dupReport: false };
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method(), hdr = req.headers();
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch { }
    st.calls.push({ m, path: url.pathname, q: url.search, auth: hdr.authorization || null });
    const json = (s, b) => route.fulfill({ status: s, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: b === undefined ? "" : JSON.stringify(b) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const uid = (hdr.authorization || "").replace("Bearer tok-", ""); const q = (k) => (url.searchParams.get(k) || ""); const eq = (k) => q(k).replace("eq.", ""); const P = url.pathname;
    if (P === "/rest/v1/site_stats") return json(200, [{}]);
    if (P === "/rest/v1/testimonials" || P === "/rest/v1/featured_alumni_public") return json(200, []);
    if (P === "/rest/v1/jobs_public") { const i = eq("id"); const rows = i ? st.pub.filter((j) => j.id === i) : st.pub; return json(200, rows.map((j) => hdr.authorization ? j : { ...j, apply_email: null })); }
    if (P === "/rest/v1/rpc/my_access") return json(200, st.admins.includes(uid) ? { superadmin: true, roles: ["Superadmin"], permissions: ["dashboard.view","members.review","jobs.review","jobs.publish","events.manage","articles.publish","articles.review","reports.handle","messages.read","site.manage","audit.view","roles.manage"] } : { superadmin: false, roles: [], permissions: [] });
    if (P === "/rest/v1/rpc/admin_dashboard") return json(200, { members_pending: 1, members_verified: 2, jobs_pending: 1, jobs_live: 1, reports_open: 0, messages_new: 0, events_upcoming: 0, articles_pending: 0 });
    if (P === "/rest/v1/rpc/admin_recent_activity") return json(200, []);
    if (P === "/rest/v1/profiles") { if (m === "GET") { const inq = q("id"); if (inq.startsWith("in.")) return json(200, Object.values(st.profiles).filter((p) => inq.includes(p.id))); return json(200, st.profiles[uid] && eq("id") === uid ? [st.profiles[uid]] : []); } }
    if (P === "/rest/v1/jobs") {
      if (m === "POST") { st.posted.push(body); return json(201, [{ ...body, id: id(900) }]); }
      if (m === "GET") { let rows = st.jobs; if (eq("submitted_by")) rows = rows.filter((j) => j.submitted_by === eq("submitted_by")); if (eq("status")) rows = rows.filter((j) => j.status === eq("status")); if (q("id").startsWith("in.")) rows = rows.filter((j) => q("id").includes(j.id)); return json(200, rows); }
      if (m === "PATCH") { st.patches.push({ id: eq("id"), body }); const j = st.jobs.find((x) => x.id === eq("id")); if (j) Object.assign(j, body); return json(200, j ? [j] : []); }
      if (m === "DELETE") { st.deleted.push(eq("id")); st.jobs = st.jobs.filter((x) => x.id !== eq("id")); return json(204); }
    }
    if (P === "/rest/v1/content_reports") {
      if (m === "POST") { if (st.dupReport) return json(409, { code: "23505", message: 'duplicate key value violates unique constraint' }); st.reported.push(body); return json(201, [body]); }
      if (m === "GET") return json(200, st.reports.filter((r) => r.status === "open"));
      if (m === "PATCH") { st.patches.push({ report: eq("id"), body }); const r = st.reports.find((x) => x.id === eq("id")); if (r) Object.assign(r, body); return json(200, [r]); }
    }
    return json(404, { message: "mock: unhandled " + m + " " + P });
  }
  return { st, handle };
}
async function open(browser, b, session) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (session) await ctx.addInitScript((s) => localStorage.setItem("gpcpsn.session", JSON.stringify(s)), { access_token: "tok-" + session, refresh_token: "ref-" + session, expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: session, email: session + "@example.test" } });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.route(SB + "/**", b.handle); await page.route(/fonts\.|unsplash/, (r) => r.abort());
  return { ctx, page, errs };
}
const member = (n, status = "verified") => ({ [id(n)]: { id: id(n), full_name: "Member " + n, verification_status: status, skills: [], profile_visibility: "private", contact_visibility: "hidden" } });
const U = "http://localhost:8097/";

(async () => {
  await new Promise((r) => server.listen(8097, r));
  const browser = await chromium.launch();

  /* A. public browsing */
  { const b = makeBackend({ pub: JOBS }); const { ctx, page, errs } = await open(browser, b);
    await page.goto(U + "#jobs"); await page.waitForSelector("#jList .jobrow");
    rec("job list shows real openings", (await page.$$("#jList .jobrow")).length === 3 && (await page.textContent("#jct")).startsWith("3"));
    rec("no sample jobs shown", !(await page.textContent("#jList")).match(/Metro|Gulf Build|Shinde Infra/));
    rec("featured job listed first", (await page.textContent("#jList .jobrow")).includes("Featured"));
    rec("job titles and companies are escaped", !(await page.evaluate(() => window.__x)) && (await page.$("#jList img")) === null && (await page.$("#jList b")) === null);
    rec("industry filter is built from the data", (await page.$$eval("#ji option", (o) => o.map((x) => x.value))).join() === ",Construction,Consulting,Surveying");
    await page.selectOption("#jt", "internship"); await page.waitForTimeout(100);
    rec("employment type filter works", (await page.$$("#jList .jobrow")).length === 1);
    await page.selectOption("#jt", ""); await page.selectOption("#je", "3+"); await page.waitForTimeout(100);
    rec("experience filter works", (await page.$$("#jList .jobrow")).length === 1 && (await page.textContent("#jList")).includes("Senior Planner"));
    await page.selectOption("#je", ""); await page.fill("#jq", "dubai"); await page.waitForTimeout(100);
    rec("search by city works", (await page.$$("#jList .jobrow")).length === 1);
    /* detail */
    await page.goto(U + "#job/" + id(1)); await page.waitForSelector(".jd");
    const t = await page.textContent("#jobBox");
    rec("job page shows details and bullet lists", t.includes("Site Engineer") && t.includes("Acme Infra") && t.includes("₹4 LPA") && t.includes("1–3 years") && (await page.$$("#jobBox ul li")).length === 4);
    rec("apply link opens employer site safely", await page.$eval("#jobBox a[href='https://acme.example/apply']", (a) => a.target === "_blank" && a.rel.includes("noopener") && a.rel.includes("noreferrer")));
    rec("no fake application tracker", !t.includes("Application sent") && (await page.$("#track")) === null);
    await page.goto(U + "#job/" + id(2)); await page.waitForSelector(".jd");
    rec("email-only listing asks anonymous visitor to sign in", (await page.textContent("#jobBox")).includes("Sign in to see how to apply"));
    await page.click("#reportJob"); await page.waitForSelector("#modal.on");
    rec("anonymous visitor cannot report (asked to sign in)", (await page.textContent("#modal")).includes("Sign in"));
    await page.goto(U + "#job/not-a-uuid"); await page.waitForSelector("#jobBox h2");
    rec("bad job id shows a friendly page", (await page.textContent("#jobBox")).includes("Job not found"));
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* B. home + empty states */
  { const b = makeBackend({ pub: JOBS }); const { ctx, page } = await open(browser, b);
    await page.goto(U + "#home"); await page.waitForSelector("#homeJobs .jobrow", { state: "attached" });
    rec("home shows the latest real openings", (await page.$$("#homeJobs .jobrow")).length === 3 && await page.$eval("#homeJobsSec", (e) => getComputedStyle(e).display !== "none")); await ctx.close();
    const e = makeBackend({ pub: [] }); const o = await open(browser, e);
    await o.page.goto(U + "#home"); await o.page.waitForTimeout(500);
    rec("home hides the jobs section when there are none", await o.page.$eval("#homeJobsSec", (x) => getComputedStyle(x).display === "none"));
    await o.page.goto(U + "#jobs"); await o.page.waitForFunction(() => document.querySelector("#jEmpty.on"));
    rec("empty job board explains itself", (await o.page.textContent("#jEmpty")).includes("No openings have been approved yet")); await o.ctx.close(); }

  /* C. posting */
  { const b = makeBackend({}); const { ctx, page } = await open(browser, b);
    await page.goto(U + "#post-job"); await page.waitForSelector("#pjForm");
    rec("signed-out visitor is asked to sign in to post", (await page.textContent("#pjForm")).includes("Sign in to post a job")); await ctx.close(); }
  { const b = makeBackend({ profiles: member(10, "pending") }); const { ctx, page } = await open(browser, b, id(10));
    await page.goto(U + "#post-job"); await page.waitForFunction(() => /not verified yet/.test(document.querySelector("#pjForm").textContent));
    rec("unverified member is told to wait for verification", !(await page.$("#pj"))); await ctx.close(); }
  { const b = makeBackend({ profiles: member(11) }); const { ctx, page, errs } = await open(browser, b, id(11));
    await page.goto(U + "#post-job"); await page.waitForSelector("#pj");
    await page.click("#pj button[type=submit]");
    rec("empty form shows what is missing", (await page.$$eval("#pj .err", (e) => e.map((x) => x.textContent).filter(Boolean))).length >= 4 && b.st.posted.length === 0);
    await page.fill("#pj_t", "Junior Engineer"); await page.fill("#pj_co", "Acme"); await page.fill("#pj_loc", "Pune"); await page.fill("#pj_desc", "Help with site supervision and reports.");
    await page.fill("#pj_link", "javascript:alert(1)"); await page.fill("#pj_emin", "5"); await page.fill("#pj_emax", "2"); await page.fill("#pj_dl", "2020-01-01");
    await page.click("#pj button[type=submit]");
    const errTxt = (await page.$$eval("#pj .err", (e) => e.map((x) => x.textContent).join("|")));
    rec("javascript: link, reversed experience range and past date are refused", /https:\/\/ link or an email/.test(errTxt) && /at least the minimum/.test(errTxt) && /cannot be in the past/.test(errTxt) && b.st.posted.length === 0, errTxt);
    await page.fill("#pj_link", "https://acme.example/jobs/1"); await page.fill("#pj_emax", "8"); await page.fill("#pj_dl", "2030-01-01");
    await page.fill("#pj_skills", "AutoCAD, Estimating , ,Surveying"); await page.fill("#pj_resp", "A\nB"); await page.selectOption("#pj_type", "internship");
    await page.click("#pj button[type=submit]"); await page.waitForSelector("#pjDone", { state: "visible" });
    const p = b.st.posted[0];
    rec("job is submitted with the right fields", p.title === "Junior Engineer" && p.apply_url === "https://acme.example/jobs/1" && p.apply_email === null && p.employment_type === "internship" && p.experience_min_years === 5 && p.experience_max_years === 8 && JSON.stringify(p.skills) === '["AutoCAD","Estimating","Surveying"]' && p.submitted_by === id(11) && p.deadline === "2030-01-01");
    rec("submission never sets status, featured or publish date", !("status" in p) && !("featured" in p) && !("published_at" in p) && !("rejection_reason" in p));
    await page.click("#pjAgain"); await page.waitForSelector("#pj"); await page.fill("#pj_t", "Estimator"); await page.fill("#pj_co", "Acme"); await page.fill("#pj_loc", "Pune"); await page.fill("#pj_desc", "Prepare estimates and BOQs for projects."); await page.fill("#pj_link", "hr@acme.example");
    await page.click("#pj button[type=submit]"); await page.waitForSelector("#pjDone", { state: "visible" });
    rec("an email address is stored as apply_email", b.st.posted[1].apply_email === "hr@acme.example" && b.st.posted[1].apply_url === null);
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* D. my listings + report */
  { const mine = [{ id: id(21), submitted_by: id(12), title: "Waiting job", company: "Acme", status: "pending", rejection_reason: null, created_at: "2026-11-20T00:00:00Z" },
                  { id: id(22), submitted_by: id(12), title: "Declined job", company: "Acme", status: "rejected", rejection_reason: "Missing company details", created_at: "2026-11-19T00:00:00Z" },
                  { id: id(23), submitted_by: id(99), title: "Someone else's", company: "X", status: "pending", created_at: "2026-11-18T00:00:00Z" }];
    const b = makeBackend({ profiles: member(12), jobs: mine, pub: JOBS }); const { ctx, page, errs } = await open(browser, b, id(12));
    await page.goto(U + "#me"); await page.waitForSelector("#myJobs [data-id]");
    const t = await page.textContent("#myJobs");
    rec("my listings show only mine, with status and reason", t.includes("Waiting job") && t.includes("Waiting for review") && t.includes("Not approved") && t.includes("Missing company details") && !t.includes("Someone else"));
    await page.click("[data-id='" + id(21) + "'] [data-jact=withdraw]"); await page.waitForTimeout(300);
    rec("withdraw sends status=withdrawn", b.st.patches.some((x) => x.id === id(21) && x.body.status === "withdrawn"));
    await page.click("[data-id='" + id(22) + "'] [data-jact=delete]"); await page.waitForSelector("#dlYes");
    rec("delete asks for confirmation first", b.st.deleted.length === 0);
    await page.click("#dlYes"); await page.waitForTimeout(300);
    rec("confirmed delete removes the listing", b.st.deleted[0] === id(22));
    /* report */
    await page.goto(U + "#job/" + id(1)); await page.waitForSelector("#reportJob"); await page.click("#reportJob"); await page.fill("#rpWhy", "ok"); await page.click("#rpForm button[type=submit]");
    rec("report needs a real reason", (await page.textContent("#rpErr")).includes("what is wrong") && b.st.reported.length === 0);
    await page.fill("#rpWhy", "Asks applicants to pay a fee"); await page.click("#rpForm button[type=submit]"); await page.waitForSelector("#modal:not(.on)", { state: "attached" });
    rec("verified member can report a listing", b.st.reported[0] && b.st.reported[0].entity_type === "job" && b.st.reported[0].entity_id === id(1) && b.st.reported[0].reporter_id === id(12));
    b.st.dupReport = true; await page.click("#reportJob"); await page.fill("#rpWhy", "again please"); await page.click("#rpForm button[type=submit]");
    await page.waitForFunction(() => /already reported/.test(document.querySelector("#rpErr").textContent));
    rec("second report on the same listing gives a clear message", true);
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* E. admin: jobs and reports */
  { const pend = { id: id(31), submitted_by: id(40), title: "Bridge Engineer", company: "Acme", location: "Pune", employment_type: "full_time", apply_url: "https://acme.example/x", apply_email: null, description: "Long enough description of the job.", status: "pending", featured: false, rejection_reason: null, created_at: "2026-11-21T00:00:00Z" };
    const live = { ...pend, id: id(32), title: "Live <b>Role</b>", status: "approved" };
    const b = makeBackend({ admins: [id(50)], profiles: { ...member(50), ...member(40) }, jobs: [pend, live], reports: [{ id: id(61), entity_type: "job", entity_id: id(32), reason: "Looks like a scam", status: "open", created_at: "2026-11-22T00:00:00Z" }] });
    const { ctx, page, errs } = await open(browser, b, id(50));
    await page.goto(U + "#admin/jobs"); await page.waitForSelector("#adMain article");
    let t = await page.textContent("#adMain");
    rec("admin sees waiting jobs with poster name", t.includes("Bridge Engineer") && t.includes("Member 40") && !t.includes("Live"));
    await page.click("[data-act=rejected]"); await page.click("#adForm button[type=submit]");
    rec("rejecting a job needs a reason", (await page.textContent("#adErr")).includes("short reason") && b.st.patches.length === 0);
    await page.fill("#adNote", "Please add the employer website"); await page.click("#adForm button[type=submit]"); await page.waitForTimeout(300);
    rec("reject stores status and reason", b.st.patches.some((x) => x.id === id(31) && x.body.status === "rejected" && x.body.rejection_reason === "Please add the employer website"));
    b.st.jobs[0].status = "pending"; await page.click("[data-t=pending]"); await page.waitForSelector("[data-act=approved]");
    await page.click("[data-act=approved]"); await page.click("#adForm button[type=submit]"); await page.waitForTimeout(300);
    rec("approve sets status=approved", b.st.patches.some((x) => x.id === id(31) && x.body.status === "approved" && x.body.rejection_reason === null));
    await page.click("[data-t=approved]"); await page.waitForSelector("[data-act=feature]"); await page.click("[data-act=feature]"); await page.waitForTimeout(300);
    rec("feature toggles without a dialog", b.st.patches.some((x) => x.body.featured === true));
    rec("job text is escaped in admin screen", (await page.$("#adMain b")) === null);
    await page.click("a[href=\"#admin/reports\"]"); await page.waitForFunction(() => /Looks like a scam/.test(((document.querySelector("#adMain")||{}).textContent||"")));
    t = await page.textContent("#adMain");
    rec("admin sees the open report with its reason", t.includes("Looks like a scam") && t.includes("Live"));
    await page.click("[data-act=takedown]"); await page.fill("#adNote", "Reported as a scam"); await page.click("#adForm button[type=submit]"); await page.waitForTimeout(400);
    rec("take down rejects the job and resolves the report", b.st.patches.some((x) => x.id === id(32) && x.body.status === "rejected" && x.body.rejection_reason === "Reported as a scam") && b.st.patches.some((x) => x.report === id(61) && x.body.status === "resolved"));
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  await browser.close(); server.close();
  const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} passed`); process.exit(ok === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

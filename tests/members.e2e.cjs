/* End-to-end tests (real browser, MOCK Supabase) for: public directory, profile pages, photo upload, admin verification.
   Run:  NODE_PATH=$(npm root -g) node tests/members.e2e.cjs */
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
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function makeBackend(o = {}) {
  const st = { calls: [], uploads: [], dir: o.dir || [], members: o.members || [], admins: o.admins || [], profile: o.profile || null, contact: o.contact || {} };
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    const hdr = req.headers(); const raw = req.postData();
    let body = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    st.calls.push({ m, path: url.pathname, q: url.search, auth: hdr.authorization || null, body, ct: hdr["content-type"] });
    const json = (s, b) => route.fulfill({ status: s, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: b === undefined ? "" : JSON.stringify(b) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const uid = (hdr.authorization || "").replace("Bearer tok-", "");
    const eq = (k) => (url.searchParams.get(k) || "").replace("eq.", "");
    const P = url.pathname;
    if (P === "/rest/v1/site_stats") return json(200, [{}]);
    if (P === "/rest/v1/testimonials") return json(200, []);
    if (P === "/rest/v1/directory_profiles") { const i = eq("id"); return json(200, i ? st.dir.filter((r) => r.id === i) : st.dir); }
    if (P === "/rest/v1/directory_contact") { if (!hdr.authorization) return json(401, { message: "permission denied for view directory_contact" }); const c = st.contact[eq("profile_id")]; return json(200, c ? [c] : []); }
    if (P === "/rest/v1/profile_experience") return json(200, eq("profile_id") === id(1) ? [{ title: "Site Engineer", organisation: "Acme Infra", start_year: 2016, end_year: null }] : []);
    if (P === "/rest/v1/profile_education") return json(200, []);
    if (P === "/rest/v1/rpc/my_access") return json(200, st.admins.includes(uid) ? { superadmin: true, roles: ["Superadmin"], permissions: ["dashboard.view","members.review","jobs.review","jobs.publish","events.manage","articles.publish","articles.review","reports.handle","messages.read","site.manage","audit.view","roles.manage"] } : { superadmin: false, roles: [], permissions: [] });
    if (P === "/rest/v1/rpc/admin_dashboard") return json(200, { members_pending: 1, members_verified: 2, jobs_pending: 1, jobs_live: 1, reports_open: 0, messages_new: 0, events_upcoming: 0, articles_pending: 0 });
    if (P === "/rest/v1/rpc/admin_recent_activity") return json(200, []);
    if (P === "/rest/v1/rpc/admin_list_members") { if (!st.admins.includes(uid)) return json(403, { message: "not_admin", code: "42501" }); const s = body.p_status; return json(200, st.members.filter((x) => !s || x.verification_status === s)); }
    if (P === "/rest/v1/profiles") {
      if (m === "GET") return json(200, st.profile && eq("id") === uid ? [st.profile] : []);
      if (m === "PATCH") {
        const t = eq("id");
        if (t === uid && st.profile) { if ("verification_status" in body) return json(403, { message: "verification fields can only be changed by an administrator" }); Object.assign(st.profile, body); return json(200, [st.profile]); }
        if (!st.admins.includes(uid)) return json(200, []);
        const x = st.members.find((r) => r.id === t); if (x) Object.assign(x, body); return json(200, [x]);
      }
    }
    if (P === "/rest/v1/profile_contact") return m === "GET" ? json(200, []) : json(201, [body]);
    if (P.startsWith("/storage/v1/object/avatars/")) { if (m === "POST") { st.uploads.push({ path: decodeURIComponent(P.replace("/storage/v1/object/avatars/", "")), ct: hdr["content-type"], size: (req.postDataBuffer() || Buffer.alloc(0)).length, auth: hdr.authorization }); return json(200, { Key: "ok" }); } if (m === "DELETE") { st.deleted = P; return json(200, {}); } }
    return json(404, { message: "mock: unhandled " + m + " " + P });
  }
  return { st, handle };
}
async function open(browser, backend, session) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (session) await ctx.addInitScript((s) => localStorage.setItem("gpcpsn.session", JSON.stringify(s)), { access_token: "tok-" + session, refresh_token: "ref-" + session, expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: session, email: session + "@example.test" } });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.route(SB + "/**", backend.handle); await page.route(/fonts\.|unsplash/, (r) => r.abort());
  return { ctx, page, errs };
}
const person = (n, name, o = {}) => ({ id: id(n), full_name: name, graduation_year: 2014, department: "Civil Engineering", department_slug: "civil-engineering", headline: null, current_company: "Acme", current_position: "Engineer", city: "Pune", country: "India", industry: "Construction", bio: "Hello there", skills: ["AutoCAD"], achievements: [], website_url: null, linkedin_url: null, avatar_path: null, cover_path: null, ...o });
const DIR = [person(1, "Rahul Shinde", { linkedin_url: "https://www.linkedin.com/in/rahul", avatar_path: id(1) + "/avatar-x.jpg" }), person(2, "Pooja <img src=x onerror=window.__x=1>", { graduation_year: 2010, industry: "Consulting", country: "UAE", city: "Dubai", current_company: "Gulf <b>Build</b>" }), person(3, "Kiran Jadhav", { graduation_year: 2018, skills: ["Surveying", "Drone mapping"] })];

(async () => {
  await new Promise((r) => server.listen(8096, r));
  const browser = await chromium.launch();

  /* A. anonymous directory */
  { const b = makeBackend({ dir: DIR }); const { ctx, page, errs } = await open(browser, b);
    await page.goto("http://localhost:8096/#alumni"); await page.waitForSelector("#alGrid .person");
    rec("directory lists real profiles", (await page.$$("#alGrid .person")).length === 3);
    rec("directory filters are built from the data", (await page.$$eval("#fy option", (o) => o.map((x) => x.value))).join() === ",2018,2014,2010" && (await page.$$eval("#fc option", (o) => o.map((x) => x.value))).join() === ",India,UAE");
    rec("no sample alumni names appear", !(await page.textContent("#alGrid")).match(/Meena Pawar|Amol Deshmukh/));
    rec("profile names/companies are escaped (no HTML injection)", !(await page.evaluate(() => window.__x)) && (await page.$("#alGrid img")) === null && (await page.$("#alGrid b")) === null);
    await page.fill("#fq", "drone"); await page.waitForTimeout(100);
    rec("search matches skills", (await page.$$("#alGrid .person")).length === 1 && (await page.textContent("#alGrid")).includes("Kiran"));
    await page.fill("#fq", ""); await page.selectOption("#fc", "UAE"); await page.waitForTimeout(100);
    rec("country filter works", (await page.$$("#alGrid .person")).length === 1);
    rec("anonymous directory request uses only the public key", b.st.calls.filter((c) => c.path.endsWith("directory_profiles")).every((c) => !c.auth));
    /* profile page */
    await page.goto("http://localhost:8096/#profile/" + id(1)); await page.waitForSelector(".pro-head");
    const html = await page.textContent("#proBox");
    rec("profile page shows real details", html.includes("Rahul Shinde") && html.includes("Site Engineer") && html.includes("Acme Infra") && html.includes("AutoCAD"));
    rec("LinkedIn opens safely in a new tab", await page.$eval("#proBox a[href^='https://www.linkedin.com']", (a) => a.rel.includes("noopener") && a.target === "_blank"));
    rec("anonymous visitor is asked to sign in for contact details", html.includes("Sign in to see contact details"));
    rec("avatar image is used when present", (await page.$eval(".pro-photo", (e) => e.style.backgroundImage)).includes("/storage/v1/object/public/avatars/" + id(1)));
    await page.goto("http://localhost:8096/#profile/not-a-uuid"); await page.waitForSelector("#proBox h2");
    rec("bad profile id shows a friendly page", (await page.textContent("#proBox")).includes("Profile not available"));
    await page.goto("http://localhost:8096/#profile/" + id(99)); await page.waitForFunction(() => /not available/.test(document.querySelector("#proBox").textContent));
    rec("unknown or private profile shows the same page (no leak)", true);
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* B. empty directory */
  { const b = makeBackend({ dir: [] }); const { ctx, page } = await open(browser, b);
    await page.goto("http://localhost:8096/#alumni"); await page.waitForFunction(() => document.querySelector("#alEmpty.on"));
    rec("empty directory invites people to join", (await page.textContent("#alEmpty")).includes("Join the network")); await ctx.close(); }

  /* C. signed-in member sees shared contact */
  { const b = makeBackend({ dir: DIR, contact: { [id(1)]: { profile_id: id(1), contact_email: "rahul@example.test", phone: "+91 99999 00000" } } });
    const { ctx, page } = await open(browser, b, id(50)); b.st.profile = { id: id(50), full_name: "Viewer", verification_status: "verified", skills: [] };
    await page.goto("http://localhost:8096/#profile/" + id(1)); await page.waitForSelector("#showContact");
    rec("contact hidden until the member clicks", await page.$eval("#contactBox", (e) => getComputedStyle(e).display === "none"));
    await page.click("#showContact");
    rec("shared contact details shown to signed-in member", (await page.textContent("#contactBox")).includes("rahul@example.test"));
    rec("contact request carried the member token", b.st.calls.some((c) => c.path.endsWith("directory_contact") && /^Bearer tok-/.test(c.auth || ""))); await ctx.close(); }

  /* D. photo upload */
  { const b = makeBackend({ profile: { id: id(60), full_name: "Asha K", verification_status: "pending", skills: [], avatar_path: id(60) + "/avatar-old.jpg", profile_visibility: "private", contact_visibility: "hidden" } });
    const { ctx, page, errs } = await open(browser, b, id(60));
    await page.goto("http://localhost:8096/#me"); await page.waitForSelector("#avFile");
    await page.setInputFiles("#avFile", { name: "me.png", mimeType: "image/png", buffer: PNG });
    await page.waitForFunction(() => /Photo updated/.test(document.querySelector("#avMsg").textContent));
    const up = b.st.uploads[0];
    rec("photo uploaded as JPEG into the member's own folder", up && up.ct === "image/jpeg" && new RegExp("^" + id(60) + "/avatar-[a-z0-9]+\\.jpg$").test(up.path) && up.auth === "Bearer tok-" + id(60), up && up.path);
    for (let i = 0; i < 30 && !b.st.deleted; i++) await page.waitForTimeout(50);   // old file is removed in the background
    rec("profile row points at the new photo and old file is removed", /avatar-[a-z0-9]+\.jpg$/.test(b.st.profile.avatar_path) && b.st.profile.avatar_path !== id(60) + "/avatar-old.jpg" && /avatar-old/.test(b.st.deleted || ""));
    rec("preview updates", (await page.$eval("#avPrev", (e) => e.style.backgroundImage)).includes(b.st.profile.avatar_path));
    await page.setInputFiles("#avFile", { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
    await page.waitForFunction(() => /JPG, PNG or WebP image/.test(document.querySelector("#avMsg").textContent));
    rec("non-image file refused with a clear message, nothing uploaded", b.st.uploads.length === 1);
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* E. administrator verification */
  { const members = [
      { id: id(70), full_name: "Neha Pawar <b>x</b>", email: "neha@example.test", graduation_year: 2015, enrollment_no: "CE-15-04", current_company: null, city: "Pune", verification_status: "pending", verification_note: null, created_at: "2026-11-20T10:00:00Z" },
      { id: id(71), full_name: "Old Member", email: "old@example.test", graduation_year: 2009, enrollment_no: null, current_company: "Acme", city: null, verification_status: "verified", verification_note: null, created_at: "2026-10-01T10:00:00Z" }];
    const b = makeBackend({ admins: [id(80)], members });
    const { ctx, page, errs } = await open(browser, b, id(80)); b.st.profile = { id: id(80), full_name: "Admin Person", verification_status: "verified", skills: [] };
    await page.goto("http://localhost:8096/#admin/members"); await page.waitForSelector("#adMain article");
    rec("Admin link visible to administrators", await page.$eval("#adminLink", (e) => getComputedStyle(e).display !== "none"));
    const t = await page.textContent("#adMain");
    rec("waiting list shows email, batch and enrolment number", t.includes("neha@example.test") && t.includes("2015") && t.includes("CE-15-04") && !t.includes("Old Member"));
    rec("member names are escaped in the admin list", (await page.$("#adMain b")) === null);
    await page.click("[data-act=rejected]"); await page.fill("#adNote", ""); await page.click("#adForm button[type=submit]");
    rec("rejecting without a reason is refused", (await page.textContent("#adErr")).includes("short reason") && !b.st.calls.some((c) => c.m === "PATCH"));
    await page.fill("#adNote", "Enrolment number not found"); await page.click("#adForm button[type=submit]");
    await page.waitForFunction(() => /Nobody is waiting/.test(document.querySelector("#adMain").textContent));
    const pr = b.st.calls.filter((c) => c.m === "PATCH").pop();
    rec("reject sends status and reason", pr.body.verification_status === "rejected" && pr.body.verification_note === "Enrolment number not found" && pr.q.includes("id=eq." + id(70)));
    await page.click("[data-t=rejected]"); await page.waitForSelector("#adMain article");
    await page.click("[data-act=verified]"); await page.click("#adForm button[type=submit]");
    await page.waitForFunction(() => /Nobody here/.test(document.querySelector("#adMain").textContent));
    rec("verify works without a note", b.st.members[0].verification_status === "verified" && b.st.members[0].verification_note === null);
    rec("no JS errors", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* F. non-admin cannot use the admin page */
  { const b = makeBackend({}); const { ctx, page } = await open(browser, b, id(90)); b.st.profile = { id: id(90), full_name: "Plain Member", verification_status: "verified", skills: [] };
    await page.goto("http://localhost:8096/#admin"); await page.waitForFunction(() => /for the alumni cell and faculty/.test(document.querySelector("#adBox").textContent));
    rec("members see 'administrators only' and no Admin link", !(await page.$eval("#adminLink", (e) => getComputedStyle(e).display !== "none")) && !b.st.calls.some((c) => c.path.includes("admin_list_members")));
    await ctx.close();
    const o = await open(browser, makeBackend({})); await o.page.goto("http://localhost:8096/#admin"); await o.page.waitForSelector("#adBox a");
    rec("signed-out visitors are sent to sign in", (await o.page.textContent("#adBox")).includes("sign in")); await o.ctx.close(); }

  await browser.close(); server.close();
  const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} passed`); process.exit(ok === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

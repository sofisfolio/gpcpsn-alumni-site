/* End-to-end test of sign-up / sign-in / profile / sign-out in a real browser against a MOCK Supabase.
   The mock imitates the documented Auth + PostgREST behaviour (it is NOT the real service), so this proves our code
   sends the right requests and handles the replies; the live service is checked separately (docs/test-report.md).
   Run:  NODE_PATH=$(npm root -g) node tests/auth.e2e.cjs */
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

/* ---- mock backend ---- */
function makeBackend(opts = {}) {
  const st = { users: {}, profiles: {}, contact: {}, calls: [], confirmEmail: !!opts.confirmEmail, failNext: null };
  const token = (u) => ({ access_token: "tok-" + u.id, refresh_token: "ref-" + u.id, expires_in: 3600, user: { id: u.id, email: u.email } });
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const hdr = req.headers(); st.calls.push({ m, path: url.pathname + url.search, auth: hdr.authorization || null, apikey: hdr.apikey, body });
    const json = (status, obj, extra = {}) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", ...extra }, body: JSON.stringify(obj) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (st.failNext) { const f = st.failNext; st.failNext = null; return f.abort ? route.abort('failed') : json(f.status, f.body); }
    const uidFromAuth = () => (hdr.authorization || "").replace("Bearer tok-", "");
    if (url.pathname === "/auth/v1/signup") {
      if (Object.values(st.users).some((u) => u.email === body.email)) return json(422, { error_code: "user_already_exists", msg: "User already registered" });
      const u = { id: "00000000-0000-0000-0000-" + String(Object.keys(st.users).length + 1).padStart(12, "0"), email: body.email, password: body.password };
      st.users[u.id] = u;
      st.profiles[u.id] = { id: u.id, full_name: body.data.full_name, graduation_year: body.data.graduation_year, department_id: "d1", enrollment_no: null, verification_status: "pending", verification_note: null, profile_visibility: "private", contact_visibility: "hidden", skills: [], achievements: [] };
      return st.confirmEmail ? json(200, { id: u.id, email: u.email }) : json(200, token(u));
    }
    if (url.pathname === "/auth/v1/token") {
      const g = url.searchParams.get("grant_type");
      if (g === "password") { const u = Object.values(st.users).find((x) => x.email === body.email && x.password === body.password); return u ? json(200, token(u)) : json(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" }); }
      if (g === "refresh_token") { const id = (body.refresh_token || "").replace("ref-", ""); return st.users[id] ? json(200, token(st.users[id])) : json(400, { msg: "Invalid Refresh Token" }); }
    }
    if (url.pathname === "/auth/v1/logout") return json(204, null);
    if (url.pathname === "/auth/v1/recover") return json(200, {});
    if (url.pathname === "/rest/v1/site_stats") return json(200, [{ verified_members: 12, open_jobs: 3, upcoming_events: 1, published_articles: 0, countries: 2 }]);
    if (url.pathname === "/rest/v1/testimonials") return json(200, opts.testimonials || []);
    if (url.pathname === "/rest/v1/rpc/my_access") return json(200, st.admins && st.admins.includes(uidFromAuth()) ? { superadmin: true, roles: ["Superadmin"], permissions: ["dashboard.view","members.review","jobs.review","jobs.publish","events.manage","articles.publish","articles.review","reports.handle","messages.read","site.manage","audit.view","roles.manage"] } : { superadmin: false, roles: [], permissions: [] });
    if (url.pathname === "/rest/v1/profiles") {
      const id = (url.searchParams.get("id") || "").replace("eq.", "");
      if (!hdr.authorization) return json(401, { message: "permission denied for table profiles" });
      if (m === "GET") return json(200, st.profiles[id] && id === uidFromAuth() ? [st.profiles[id]] : []);
      if (m === "PATCH") { if ("verification_status" in body) return json(403, { message: "verification fields can only be changed by an administrator" }); Object.assign(st.profiles[id], body); return json(200, [st.profiles[id]]); }
    }
    if (url.pathname === "/rest/v1/profile_contact") {
      if (m === "GET") { const id = (url.searchParams.get("profile_id") || "").replace("eq.", ""); return json(200, st.contact[id] ? [st.contact[id]] : []); }
      if (m === "POST") { st.contact[body.profile_id] = body; return json(201, [body]); }
    }
    return json(404, { message: "mock: unhandled " + m + " " + url.pathname });
  }
  return { st, handle };
}

async function newPage(browser, backend) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.route(SB + "/**", backend.handle);
  await page.route(/fonts\.|unsplash/, (r) => r.abort());
  return { ctx, page, errs };
}
const fillJoin = async (page, o) => {
  await page.goto("http://localhost:8095/#login/join"); await page.waitForSelector("#fJoin");
  await page.fill("#j_name", o.name); await page.fill("#j_email", o.email); await page.selectOption("#j_y", String(o.year || 2014));
  if (o.en) await page.fill("#j_en", o.en);
  await page.fill("#pwIn", o.pw); await page.fill("#j_pw2", o.pw2 ?? o.pw); await page.check("input[name=terms]");
};

(async () => {
  await new Promise((r) => server.listen(8095, r));
  const browser = await chromium.launch();

  /* 1. home shows real numbers, no invented content, hides empty testimonials */
  { const b = makeBackend(); const { ctx, page, errs } = await newPage(browser, b);
    await page.goto("http://localhost:8095/#home"); await page.waitForSelector("[data-stat]"); await page.waitForTimeout(400);
    const stats = await page.$$eval("[data-stat]", (els) => els.map((e) => e.textContent));
    rec("home shows numbers from the database", stats.join(",") === "12,2,3,1", stats.join(","));
    rec("testimonial section hidden when none exist", await page.$eval("#testiSec", (e) => getComputedStyle(e).display === "none"));
    rec("no invented live feed or '1,200'", !(await page.content()).match(/Live activity|1,200|Reset link sent \(demo\)/));
    rec("signed out: header offers Join", (await page.textContent("#joinCta")).includes("Join"));
    rec("anonymous requests carry only the public key", b.st.calls.filter((c) => c.path.includes("site_stats")).every((c) => !c.auth && c.apikey.startsWith("sb_publishable_")));
    rec("no JS errors on home", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* 2. real testimonials appear, HTML in them is escaped */
  { const b = makeBackend({ testimonials: [{ quote: "Great network <img src=x onerror=window.__x=1>", author_name: "A. Alumnus", batch_year: 2012, role_text: "Engineer" }] });
    const { ctx, page } = await newPage(browser, b);
    await page.goto("http://localhost:8095/#home"); await page.waitForSelector("#testiSec .tslide", { state: "attached" }); await page.waitForTimeout(300);
    rec("approved testimonial is shown", await page.$eval("#testiSec", (e) => getComputedStyle(e).display !== "none") && (await page.textContent("#testi")).includes("A. Alumnus"));
    rec("testimonial text is escaped (no script injection)", !(await page.evaluate(() => window.__x)) && (await page.$("#testi img")) === null); await ctx.close(); }

  /* batch year list: current year down to 1955 */
  { const { ctx: cy, page: py } = await newPage(browser, makeBackend());
    await py.goto("http://localhost:8095/#login/join"); await py.waitForSelector("#j_y");
    const yrs = await py.$$eval("#j_y option", (o) => o.map((x) => +x.value)); const cur = new Date().getFullYear();
    rec("batch years run from the current year down to 1955", yrs[0] === cur && yrs[yrs.length - 1] === 1955 && yrs.length === cur - 1955 + 1, yrs[0] + ".." + yrs[yrs.length - 1] + " (" + yrs.length + ")"); await cy.close(); }

  /* 3. sign-up without email confirmation -> signed in, profile page, pending banner */
  const b = makeBackend(); const { ctx, page, errs } = await newPage(browser, b);
  await fillJoin(page, { name: "Asha Kulkarni", email: "asha@example.test", pw: "Str0ng!pass", en: "CE-2014-17" });
  await page.click("#fJoin button[type=submit]"); await page.waitForURL(/#me/); await page.waitForSelector("#fMe");
  const su = b.st.calls.find((c) => c.path === "/auth/v1/signup");
  rec("sign-up sends name, year and department only", su && su.body.data.full_name === "Asha Kulkarni" && su.body.data.graduation_year === 2014 && su.body.data.department === "civil-engineering" && Object.keys(su.body.data).length === 3);
  rec("sign-up never sends role/verification fields", su && !JSON.stringify(su.body).match(/verif|admin|role/i));
  rec("enrolment number saved after sign-up", Object.values(b.st.profiles)[0].enrollment_no === "CE-2014-17");
  rec("lands on My profile with pending status", (await page.textContent("#meBox")).includes("Awaiting verification"));
  rec("header shows member name and Sign out", (await page.textContent("#me")).includes("Asha Kulkarni") && (await page.textContent("#joinCta")).includes("Sign out"));
  rec("session stored for reload", !!(await page.evaluate(() => localStorage.getItem("gpcpsn.session"))));

  /* 4. profile edit */
  await page.fill("[name=headline]", "Site Engineer at Acme"); await page.fill("[name=city]", "Pune"); await page.fill("[name=skills]", "AutoCAD, Surveying , ,Estimating");
  await page.selectOption("[name=profile_visibility]", "public"); await page.fill("[name=contact_email]", "asha.private@example.test");
  await page.click("#fMe button[type=submit]"); await page.waitForFunction(() => document.querySelector("#meMsg").textContent === "Saved");
  const pr = Object.values(b.st.profiles)[0];
  rec("profile saved with cleaned skills", pr.headline === "Site Engineer at Acme" && pr.city === "Pune" && JSON.stringify(pr.skills) === JSON.stringify(["AutoCAD", "Surveying", "Estimating"]));
  rec("profile save never includes verification fields", !b.st.calls.filter((c) => c.m === "PATCH").some((c) => "verification_status" in c.body || "verification_note" in c.body));
  rec("private contact stored separately", Object.values(b.st.contact)[0].contact_email === "asha.private@example.test");
  await page.fill("[name=website_url]", "javascript:alert(1)"); await page.click("#fMe button[type=submit]");
  rec("javascript: link refused by the form", (await page.textContent("#meBox")).includes("must start with https://"));
  await page.fill("[name=website_url]", "");

  /* 5. reload keeps session; sign out clears it */
  await page.reload(); await page.waitForSelector("#fMe");
  rec("reload keeps the member signed in", (await page.textContent("#me")).includes("Asha Kulkarni"));
  await page.click("#joinCta"); await page.waitForFunction(() => document.querySelector("#joinCta").textContent.includes("Join"));
  rec("sign out clears session and header", !(await page.evaluate(() => localStorage.getItem("gpcpsn.session"))) && (await page.textContent("#me")) === "");
  await page.goto("http://localhost:8095/#me"); await page.waitForSelector("#meBox");
  rec("profile page asks signed-out visitor to sign in", (await page.textContent("#meBox")).includes("Sign in to see your profile"));

  /* 6. sign-in errors and success */
  await page.goto("http://localhost:8095/#login"); await page.waitForSelector("#fLogin");
  await page.fill("#l_email", "asha@example.test"); await page.fill("#l_pw", "wrong-password"); await page.click("#fLogin button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#fLogin .err:nth-of-type(1)") && [...document.querySelectorAll("#fLogin .err")].some((e) => e.textContent));
  rec("wrong password shows a friendly message", (await page.textContent("#fLogin")).includes("Email or password is incorrect"));
  await page.fill("#l_pw", "Str0ng!pass"); await page.click("#fLogin button[type=submit]"); await page.waitForURL(/#me/);
  rec("correct password signs in (pending member goes to profile)", (await page.textContent("#me")).includes("Asha"));
  rec("signed-in requests carry the member token", b.st.calls.filter((c) => c.path.startsWith("/rest/v1/profiles") && c.m === "GET").some((c) => /^Bearer tok-/.test(c.auth || "")));

  /* 7. duplicate sign-up, validation, offline */
  await page.click("#joinCta"); await page.waitForTimeout(300);
  await fillJoin(page, { name: "Asha Again", email: "asha@example.test", pw: "Str0ng!pass" }); await page.click("#fJoin button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#j_email").parentElement.querySelector(".err").textContent);
  rec("duplicate email gives a clear message", (await page.textContent("#p-join")).includes("already exists"));
  await fillJoin(page, { name: "X", email: "bad", pw: "short", pw2: "different" }); await page.click("#fJoin button[type=submit]");
  const errsTxt = await page.$$eval("#p-join .err", (e) => e.map((x) => x.textContent).join("|"));
  rec("sign-up form validates name, email, password and terms", /full name/.test(errsTxt) && /valid email/.test(errsTxt) && /8 characters/.test(errsTxt) && /do not match/.test(errsTxt));
  await page.goto("http://localhost:8095/#login"); await page.waitForSelector("#fLogin");
  b.st.failNext = { abort: true }; await page.fill("#l_email", "asha@example.test"); await page.fill("#l_pw", "Str0ng!pass"); await page.click("#fLogin button[type=submit]");
  await page.waitForFunction(() => /Cannot reach/.test(document.querySelector("#fLogin").textContent));
  rec("offline gives a friendly message, no crash", true);
  b.st.failNext = { status: 429, body: { msg: "email rate limit exceeded", error_code: "over_email_send_rate_limit" } };
  await page.click("#fLogin button[type=submit]"); await page.waitForFunction(() => /Too many attempts/.test(document.querySelector("#fLogin").textContent));
  rec("rate limit gives a friendly message", true);
  rec("no uncaught JS errors in the whole flow", errs.length === 0, errs.join("|")); await ctx.close();

  /* 8. sign-up WITH email confirmation switched on -> no session, clear instructions */
  { const b2 = makeBackend({ confirmEmail: true }); const { ctx: c2, page: p2 } = await newPage(browser, b2);
    await fillJoin(p2, { name: "Ravi Joshi", email: "ravi@example.test", pw: "Str0ng!pass" }); await p2.click("#fJoin button[type=submit]");
    await p2.waitForFunction(() => /Check your email/.test(document.querySelector("#p-join").textContent));
    rec("confirmation mode: tells the user to check email, no session stored", !(await p2.evaluate(() => localStorage.getItem("gpcpsn.session")))); await c2.close(); }

  /* 9. a member cannot see the verification field as editable, and admin flag shows */
  { const b3 = makeBackend(); const { ctx: c3, page: p3 } = await newPage(browser, b3);
    await fillJoin(p3, { name: "Admin Person", email: "admin@example.test", pw: "Str0ng!pass" }); await p3.click("#fJoin button[type=submit]"); await p3.waitForSelector("#fMe");
    rec("profile form has no verification or admin controls", (await p3.$$("#fMe [name=verification_status],#fMe [name=verification_note],#fMe [name=is_admin]")).length === 0);
    b3.st.admins = [Object.keys(b3.st.users)[0]]; await p3.reload(); await p3.waitForSelector("#fMe");
    rec("administrator is recognised from the database", (await p3.textContent("#meBox")).includes("You are an administrator")); await c3.close(); }

  await browser.close(); server.close();
  const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} passed`); process.exit(ok === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

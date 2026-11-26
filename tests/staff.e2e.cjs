/* End-to-end tests (real browser, MOCK Supabase) for the staff panel: role-based sidebar, dashboard, messages,
   staff and roles management, contact form, and publishing jobs as staff.
   Run:  NODE_PATH=$(npm root -g) node tests/staff.e2e.cjs */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "site");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const SB = "https://sllpahrgmhqvchufiugf.supabase.co", U = "http://localhost:8097/";
const results = []; const rec = (n, ok, d = "") => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const server = http.createServer((req, rsp) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end("nf"); }
  rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(rsp);
});
const id = (n) => "00000000-0000-0000-0000-" + String(n).padStart(12, "0");
const ALL = ["dashboard.view", "members.review", "jobs.review", "jobs.publish", "events.manage", "articles.publish", "articles.review", "reports.handle", "messages.read", "site.manage", "audit.view", "roles.manage"];
const FAC = ["dashboard.view", "members.review", "jobs.review", "jobs.publish", "events.manage", "articles.publish", "articles.review", "reports.handle", "messages.read"];
const PERMS = ALL.map((k, i) => ({ key: k, label: "Label " + k, group: i < 2 ? "General" : "Other", description: "About " + k }));

function makeBackend(o = {}) {
  const st = { calls: [], access: o.access || { superadmin: false, roles: [], permissions: [] }, roles: o.roles || [
      { key: "superadmin", name: "Superadmin", description: "All", is_system: true, users: 1, permissions: ALL },
      { key: "faculty", name: "Faculty", description: "Faculty and staff", is_system: false, users: 1, permissions: FAC },
      { key: "coordinator", name: "Coordinator", description: "Helper", is_system: false, users: 0, permissions: ["dashboard.view"] }],
    staff: o.staff || [{ user_id: id(1), email: "boss@example.test", full_name: "Boss <b>One</b>", roles: ["superadmin"] }, { user_id: id(2), email: "fac@example.test", full_name: "Fac Person", roles: ["faculty"] }],
    messages: o.messages || [], rpc: [], patches: [], inserts: [], failRpc: {}, jobs: [] };
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    const hdr = req.headers(); const raw = req.postData(); let body = null; try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    st.calls.push({ m, path: url.pathname, body });
    const json = (s, b) => route.fulfill({ status: s, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: b === undefined ? "" : JSON.stringify(b) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const P = url.pathname, uid = (hdr.authorization || "").replace("Bearer tok-", "");
    if (P.startsWith("/rest/v1/rpc/")) {
      const fn = P.replace("/rest/v1/rpc/", ""); st.rpc.push({ fn, body });
      if (st.failRpc[fn]) return json(400, { message: st.failRpc[fn], code: "P0001" });
      if (fn === "my_access") return json(200, st.access);
      if (fn === "admin_dashboard") return json(200, { members_pending: 3, members_verified: 12, jobs_pending: 2, jobs_live: 5, reports_open: 1, messages_new: 4, events_upcoming: 0, articles_pending: 0 });
      if (fn === "admin_recent_activity") return json(200, [{ created_at: "2026-11-26T10:00:00Z", entity_type: "job", entity_id: id(9), action: "approved", note: "<i>ok</i>", actor_name: "Fac Person", entity_label: "Site Engineer" }]);
      if (fn === "admin_list_staff") return json(200, st.staff);
      if (fn === "admin_roles") return json(200, { permissions: PERMS, roles: st.roles });
      return json(204);
    }
    if (P === "/rest/v1/profiles" && m === "GET") return json(200, [{ id: uid, full_name: o.fullName || "Staff Person", verification_status: o.verified || "pending", skills: [] }]);
    if (P === "/rest/v1/contact_messages") {
      if (m === "GET") return json(200, st.messages.filter((x) => { const h = url.searchParams.get("handled"); return !h || x.handled === (h === "eq.true"); }));
      if (m === "PATCH") { st.patches.push(body); st.messages[0].handled = body.handled; return json(200, [st.messages[0]]); }
      if (m === "POST") { st.inserts.push(body); return json(201, [body]); }
    }
    if (P === "/rest/v1/jobs" && m === "POST") { st.jobs.push(body); return json(201, [{ ...body, id: id(70), status: o.jobStatus || "approved" }]); }
    if (P === "/rest/v1/jobs") return json(200, []);
    if (P === "/rest/v1/site_stats") return json(200, [{}]);
    if (P === "/rest/v1/testimonials" || P === "/rest/v1/featured_alumni_public" || P === "/rest/v1/jobs_public") return json(200, []);
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
const nav = (page) => page.$$eval(".adm-nav a span", (e) => e.map((x) => x.textContent));

(async () => {
  await new Promise((r) => server.listen(8097, r));
  const browser = await chromium.launch();

  /* A. faculty: limited sidebar, real numbers, no staff pages */
  { const b = makeBackend({ access: { superadmin: false, roles: ["Faculty"], permissions: FAC } });
    const { ctx, page, errs } = await open(browser, b, id(2));
    await page.goto(U + "#admin"); await page.waitForSelector(".adm-stat");
    const n = await nav(page);
    rec("faculty sees Dashboard, Alumni, Jobs, Reports, Messages", n.join() === "Dashboard,Alumni,Jobs,Reports,Messages", n.join());
    rec("faculty does not see Staff & roles or Activity log", !n.includes("Staff & roles") && !n.includes("Activity log"));
    rec("Staff panel link shows for staff", await page.$eval("#adminLink", (e) => getComputedStyle(e).display !== "none"));
    const t = await page.textContent("#adMain");
    rec("dashboard shows the real counts", t.includes("3") && t.includes("12") && t.includes("Alumni waiting for verification"));
    rec("sidebar badges show waiting work", (await page.$$eval("[data-badge]", (e) => e.map((x) => x.textContent).join())).includes("3"));
    rec("recent activity is shown and escaped", t.includes("Fac Person") && t.includes("Site Engineer") && (await page.$("#adMain i")) === null);
    rec("faculty sees the role name", (await page.textContent(".adm-who")).includes("Faculty"));
    await page.goto(U + "#admin/staff"); await page.waitForSelector(".adm-stat");
    rec("faculty opening #admin/staff falls back to the dashboard and never calls staff functions", !b.st.rpc.some((r) => r.fn === "admin_list_staff" || r.fn === "admin_roles"));
    rec("no JS errors (faculty)", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* B. dashboard-only role (custom role) sees only the dashboard */
  { const b = makeBackend({ access: { superadmin: false, roles: ["Coordinator"], permissions: ["dashboard.view"] } });
    const { ctx, page } = await open(browser, b, id(3));
    await page.goto(U + "#admin"); await page.waitForSelector(".adm-stat");
    rec("a custom role with one permission sees only that section", (await nav(page)).join() === "Dashboard");
    rec("stat cards without a section are plain text, not links", (await page.$$("a.adm-stat")).length === 0); await ctx.close(); }

  /* C. superadmin: staff and roles */
  { const b = makeBackend({ access: { superadmin: true, roles: ["Superadmin"], permissions: ALL } });
    const { ctx, page, errs } = await open(browser, b, id(1));
    await page.goto(U + "#admin/staff"); await page.waitForSelector("#asForm");
    rec("superadmin sees every section", (await nav(page)).join() === "Dashboard,Alumni,Jobs,Reports,Messages,Staff & roles,Activity log");
    rec("staff list shows names and roles, escaped", (await page.textContent("#adMain")).includes("fac@example.test") && (await page.$("#adMain b")) === null);
    await page.fill("#asEmail", "new@example.test"); await page.selectOption("#asRole", "faculty"); await page.click("#asForm button[type=submit]"); await page.waitForTimeout(300);
    rec("giving a role calls the database function with email and role", b.st.rpc.some((r) => r.fn === "admin_assign_role" && r.body.p_email === "new@example.test" && r.body.p_role === "faculty"));
    b.st.failRpc.admin_assign_role = "user_not_found";
    await page.fill("#asEmail", "ghost@example.test"); await page.click("#asForm button[type=submit]"); await page.waitForTimeout(300);
    rec("unknown email gives a clear message", (await page.textContent("#asErr")).includes("must register"));
    await page.click("[data-rm=faculty]"); await page.waitForSelector("#cbOk"); await page.click("#cbOk"); await page.waitForTimeout(300);
    rec("removing a role asks first, then calls the function", b.st.rpc.some((r) => r.fn === "admin_remove_role" && r.body.p_user === id(2) && r.body.p_role === "faculty"));
    b.st.failRpc.admin_remove_role = "last_superadmin";
    await page.click("[data-rm=superadmin]"); await page.waitForSelector("#cbOk"); await page.click("#cbOk"); await page.waitForSelector("#cbErr:not(:empty)");
    rec("last superadmin error is explained", (await page.textContent("#cbErr")).includes("at least one Superadmin")); await page.click("#cbNo");

    await page.click("[data-t=roles]"); await page.waitForSelector("[data-act=newrole]");
    const cards = await page.$$("#adMain article");
    rec("roles tab lists all roles", cards.length === 3);
    rec("Superadmin role has no edit or delete buttons", (await page.$$("article[data-id=superadmin] [data-act]")).length === 0);
    await page.click("[data-act=newrole]"); await page.waitForSelector("#rfForm");
    rec("role form lists every permission as a checkbox", (await page.$$("#rfForm input[type=checkbox]")).length === 12);
    await page.click("#rfForm button[type=submit]");
    rec("a role needs a name", (await page.textContent("#rfErr")).includes("name"));
    await page.fill("#rfName", "Batch coordinator"); await page.check("#rfForm input[value='members.review']"); await page.check("#rfForm input[value='dashboard.view']");
    await page.click("#rfForm button[type=submit]"); await page.waitForTimeout(300);
    const save = b.st.rpc.find((r) => r.fn === "admin_save_role");
    rec("new role is saved with a safe key and the ticked permissions", save && save.body.p_key === "batch_coordinator" && save.body.p_name === "Batch coordinator" && save.body.p_permissions.sort().join() === "dashboard.view,members.review", JSON.stringify(save && save.body));
    await page.click("article[data-id=faculty] [data-act=editrole]"); await page.waitForSelector("#rfForm");
    await page.uncheck("#rfForm input[value='jobs.publish']"); await page.click("#rfForm button[type=submit]"); await page.waitForTimeout(300);
    const edit = b.st.rpc.filter((r) => r.fn === "admin_save_role").pop();
    rec("editing a role keeps its key and drops the unticked permission", edit.body.p_key === "faculty" && !edit.body.p_permissions.includes("jobs.publish") && edit.body.p_permissions.includes("jobs.review"));
    b.st.failRpc.admin_delete_role = "role_in_use";
    await page.click("article[data-id=faculty] [data-act=delrole]"); await page.waitForSelector("#cbOk"); await page.click("#cbOk"); await page.waitForSelector("#cbErr:not(:empty)");
    rec("deleting a role in use is explained", (await page.textContent("#cbErr")).includes("still given")); await page.click("#cbNo");
    delete b.st.failRpc.admin_delete_role;
    await page.click("article[data-id=coordinator] [data-act=delrole]"); await page.waitForSelector("#cbOk"); await page.click("#cbOk"); await page.waitForTimeout(300);
    rec("unused role can be deleted", b.st.rpc.some((r) => r.fn === "admin_delete_role" && r.body.p_key === "coordinator"));
    await page.goto(U + "#admin/activity"); await page.waitForSelector(".adm-log");
    rec("activity log asks for 100 entries", b.st.rpc.some((r) => r.fn === "admin_recent_activity" && r.body.p_limit === 100));
    rec("no JS errors (superadmin)", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* D. messages inbox */
  { const b = makeBackend({ access: { superadmin: false, roles: ["Faculty"], permissions: FAC }, messages: [{ id: id(80), name: "Visitor <u>X</u>", email: "v@example.test", message: "Hello <b>team</b>, how do I join?", handled: false, created_at: "2026-11-25T09:00:00Z" }] });
    const { ctx, page } = await open(browser, b, id(2));
    await page.goto(U + "#admin/messages"); await page.waitForSelector("#adMain article");
    rec("messages show, and are escaped", (await page.textContent("#adMain")).includes("how do I join") && (await page.$("#adMain u")) === null && (await page.$("#adMain b")) === null);
    await page.click("[data-act=handled]"); await page.waitForTimeout(300);
    rec("mark handled updates the message", b.st.patches.some((x) => x.handled === true)); await ctx.close(); }

  /* E. contact form */
  { const b = makeBackend({}); const { ctx, page, errs } = await open(browser, b);
    await page.goto(U + "#contact"); await page.waitForSelector("#ctForm");
    await page.click("#ctForm button[type=submit]");
    rec("empty contact form is refused with messages", (await page.$$eval("#ctForm .err", (e) => e.filter((x) => x.textContent).length)) === 3 && b.st.inserts.length === 0);
    await page.fill("#ct_n", "Amit Patil"); await page.fill("#ct_e", "amit@example.test"); await page.fill("#ct_m", "I graduated in 2012 and want to join."); await page.click("#ctForm button[type=submit]"); await page.waitForSelector("#ctDone", { state: "visible" });
    rec("contact message is stored with only name, email and message", b.st.inserts.length === 1 && Object.keys(b.st.inserts[0]).sort().join() === "email,message,name");
    rec("no JS errors (contact)", errs.length === 0, errs.join("|")); await ctx.close(); }

  /* F. staff publisher posts a job: allowed without being a verified alumnus, and goes live */
  { const b = makeBackend({ access: { superadmin: false, roles: ["Faculty"], permissions: FAC }, verified: "pending", jobStatus: "approved" });
    const { ctx, page } = await open(browser, b, id(2));
    await page.goto(U + "#post-job"); await page.waitForSelector("#pj");
    rec("faculty can open the post-a-job form without alumni verification", true);
    await page.fill("#pj_t", "Site Supervisor"); await page.fill("#pj_co", "Acme Infra"); await page.fill("#pj_loc", "Pune"); await page.fill("#pj_desc", "Supervise civil works on site for two projects."); await page.fill("#pj_link", "hr@acme.example");
    await page.click("#pj button[type=submit]"); await page.waitForSelector("#pjDone", { state: "visible" });
    rec("success message says the job is live when the database published it", (await page.textContent("#pjDone h2")).includes("live")); await ctx.close(); }
  { const b = makeBackend({ verified: "pending" }); const { ctx, page } = await open(browser, b, id(5));
    await page.goto(U + "#post-job"); await page.waitForSelector("#pjForm");
    rec("an unverified non-staff member is still blocked", (await page.textContent("#pjForm")).includes("not verified") && (await page.$("#pj")) === null); await ctx.close(); }

  await browser.close(); server.close();
  const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} passed`); process.exit(ok === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

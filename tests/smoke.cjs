/* Smoke + regression test for the static site.
   - Renders every route in the migrated site and in the archived v17 prototype and compares the visible text.
   - Fails on uncaught JS errors / failed same-origin requests.
   - Checks for horizontal overflow at 390, 768, 1024 and 1440 px.
   Run:  NODE_PATH=$(npm root -g) node tests/smoke.cjs
   External hosts (Google Fonts, Unsplash) are blocked in CI sandboxes, so those failures are ignored. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
function serve(dir, port) {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end("nf"); }
      rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    }).listen(port, () => res(s));
  });
}

const ROUTES = ["#home", "#about", "#about/faculty", "#alumni", "#profile/rahul-shinde", "#profile/meena-pawar",
  "#jobs", "#job/site-eng", "#post-job", "#events", "#event/annual-meet-2026", "#event/batch-2014",
  "#news", "#blog/survey-future", "#login", "#login/join", "#nonexistent"];
const WIDTHS = [390, 768, 1024, 1440];

(async () => {
  const s1 = await serve(path.join(ROOT, "site"), 8091);
  const s2 = await serve(path.join(ROOT, "archive"), 8092);
  const browser = await chromium.launch();
  const results = [];
  const rec = (name, ok, detail = "") => { results.push({ name, ok, detail }); };

  async function open(base, file, width) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
    page.on("requestfailed", (r) => { if (r.url().startsWith(base)) errs.push("reqfailed: " + r.url()); });
    page.on("response", (r) => { if (r.url().startsWith(base) && r.status() >= 400) errs.push(r.status() + " " + r.url()); });
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    return { ctx, page, errs, url: base + file };
  }

  for (const route of ROUTES) {
    const A = await open("http://localhost:8091", "/", 1440);
    const B = await open("http://localhost:8092", "/gpcpsn-website-v17.html", 1440);
    await A.page.goto(A.url + route); await B.page.goto(B.url + route);
    await A.page.waitForTimeout(250); await B.page.waitForTimeout(250);
    const norm = (t) => t.replace(/\s+/g, " ").trim();
    // Live feed rotates by timer and counters animate; ignore those two regions.
    const get = (p) => p.evaluate(() => { const a = document.querySelector("#app").cloneNode(true); a.querySelectorAll("#feed,[data-c]").forEach((e) => e.remove()); return a.innerText || a.textContent; });
    const [ta, tb] = [norm(await get(A.page)), norm(await get(B.page))];
    rec(`render parity ${route}`, ta === tb && ta.length > 20, ta === tb ? `${ta.length} chars identical` : `DIFF len ${ta.length} vs ${tb.length}`);
    rec(`no JS/same-origin errors ${route}`, A.errs.length === 0, A.errs.join(" | "));
    await A.ctx.close(); await B.ctx.close();
  }

  for (const w of WIDTHS) {
    for (const route of ["#home", "#alumni", "#jobs", "#events", "#news", "#login/join", "#about"]) {
      const A = await open("http://localhost:8091", "/", w);
      await A.page.goto(A.url + route); await A.page.waitForTimeout(200);
      // The off-canvas mobile menu inflates scrollWidth but cannot be scrolled to (body overflow-x:hidden),
      // so measure what a user can actually do: try to scroll sideways.
      const o = await A.page.evaluate(() => { scrollTo(600, 0); return { x: scrollX, iw: innerWidth }; });
      rec(`no horizontal scroll ${route} @${w}`, o.x === 0, `scrollX after scrollTo(600) = ${o.x}`);
      await A.ctx.close();
    }
  }

  // Interaction checks (behaviour preserved from v17)
  {
    const A = await open("http://localhost:8091", "/", 1440);
    await A.page.goto(A.url + "#alumni"); await A.page.waitForTimeout(200);
    const before = await A.page.locator("#alGrid > article").count();
    await A.page.selectOption("#fy", "2014");
    const after = await A.page.locator("#alGrid > article").count();
    rec("directory filter by year narrows results", after > 0 && after < before, `${before} -> ${after}`);
    await A.page.goto(A.url + "#profile/meena-pawar"); await A.page.waitForTimeout(200);
    rec("private profile is not shown", /private or does not exist/i.test(await A.page.locator("#app").innerText()));
    await A.page.goto(A.url + "#post-job"); await A.page.waitForTimeout(200);
    rec("post-job gated for anonymous visitor", /Sign in to post a job/.test(await A.page.locator("#app").innerText()));
    await A.page.setViewportSize({ width: 390, height: 800 });
    await A.page.click("#burger");
    rec("mobile menu opens", await A.page.locator("#links.open").count() === 1);
    await A.page.waitForTimeout(100);
    const box = await A.page.locator("#links").boundingBox();
    const vis = await A.page.locator("#links").evaluate((e) => getComputedStyle(e).visibility);
    rec("open menu drawer is on-screen and visible", vis === "visible" && box.x >= 0 && box.x + box.width <= 391, `x=${Math.round(box.x)} w=${Math.round(box.width)} visibility=${vis}`);
    await A.page.keyboard.press("Escape");
    rec("Escape closes mobile menu", await A.page.locator("#links.open").count() === 0);
    await A.page.waitForTimeout(600);
    rec("closed drawer links are not keyboard-focusable", await A.page.locator("#links").evaluate((e) => getComputedStyle(e).visibility) === "hidden");
    rec("preview banner visible", /Preview build/.test(await A.page.locator("body").innerText()));
    await A.ctx.close();
  }

  await browser.close(); s1.close(); s2.close();
  const fail = results.filter((r) => !r.ok);
  for (const r of results) console.log((r.ok ? "PASS " : "FAIL ") + r.name + (r.detail ? "  [" + r.detail + "]" : ""));
  console.log(`\n${results.length - fail.length}/${results.length} passed`);
  process.exit(fail.length ? 1 : 0);
})();

#!/usr/bin/env node
// Visitor checks in headless Chromium on the saved live responses (test/fixtures, 23 Oct 2026 ~19:50 UTC), with
// the clock pinned to that moment, so the result doesn't depend on today's weather or on an agency being up.
//   CHROME_PATH=/opt/pw-browsers/chromium npm run smoke            (add -- --screens docs/screens to save screenshots)
//   npm run smoke -- --live                                        (no mocks: the real sources, today; prints only)
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
import { parseFloodWatch } from "./collect.mjs";
import { nearestTambon } from "../public/js/geo.js";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const SHOTS = args.includes("--screens") ? args[args.indexOf("--screens") + 1] : null;
const FX = (f) => readFileSync(new URL(`../test/fixtures/${f}`, import.meta.url));
const NOW = new Date("2026-10-23T19:50:00Z");
const BKK = { latitude: 13.7563, longitude: 100.5018 };

// host/path → fixture (anything else from outside is refused, so a new uncovered source shows up as a failure)
const MOCKS = [
  [/ensemble-api\.open-meteo\.com/, "ens_bkk.json"], [/air-quality-api\.open-meteo\.com/, "aq_bkk.json"],
  [/api\.open-meteo\.com\/v1\/elevation/, null, '{"elevation":[4.0]}'], [/getPm25byLocation/, "gistda_loc.json"],
  [/rain_24h/, "tw_rain_bkk.json"], [/waterlevel_load/, "tw_wl_bkk.json"], [/flashflood_report/, "hii_ff.txt"],
  [/seismicportal\.eu/, "emsc.json"], [/earthquake\.usgs\.gov/, "usgs_day.json"], [/gdacs\.org/, "gdacs.json"],
  [/jma\.go\.jp\/bosai\/typhoon\/data\/targetTc/, "jma_target.json"], [/jma\.go\.jp\/bosai\/typhoon\/data\/TC2636\/forecast/, "jma_forecast.json"],
  [/jma\.go\.jp\/bosai\/typhoon/, null, "[]"], [/data\/live\//, null, "{}"],
  [/VILLLAGE_RISK/, null, '{"count":0}'], [/T_ACTIVEFAULT/, null, '{"features":[]}'], [/air4thai\.com/, "a4t.json"],
  [/photon\.komoot\.io/, null, JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [100.6084, 13.7911] }, properties: { name: "ซอยลาดพร้าว 71", district: "สะพานสอง", city: "กรุงเทพมหานคร", state: "กรุงเทพมหานคร" } }] })],
  [/nominatim\.openstreetmap\.org/, null, JSON.stringify([{ lat: "13.8213", lon: "100.6043", display_name: "ซอยลาดพร้าว 71, แขวงลาดพร้าว, เขตลาดพร้าว, กรุงเทพมหานคร, 10230, ประเทศไทย" }])],
];

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) failures++; };

// LINE's in-app browser on a mid-range Android, the audience's usual window (visitor audit V5)
const LINE_UA = "Mozilla/5.0 (Linux; Android 14; SM-A156E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Line/14.16.0";

async function newPage(browser, { width = 390, height = 844, fail = false, ua, live = null, liveDelayMs = 0, now = NOW } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: "th-TH",
    timezoneId: "Asia/Bangkok", geolocation: BKK, permissions: ["geolocation"], isMobile: true, hasTouch: true, ...(ua ? { userAgent: ua } : {}) });
  const page = await ctx.newPage();
  if (!LIVE) await page.clock.setFixedTime(now);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (!LIVE) {
    // the collector's files are this site's own: absent in the fixture run (they'd be today's, not the fixtures' day)
    // (`live` gives some of them as {file: body}; `liveDelayMs` holds every answer back, like a slow link)
    await ctx.route(/\/data\/live\//, async (route) => {
      if (liveDelayMs) await new Promise((r) => setTimeout(r, liveDelayMs));
      const f = route.request().url().split("/").pop();
      return live?.[f] ? route.fulfill({ status: 200, contentType: "application/json", body: live[f] }) : route.fulfill({ status: 404, body: "" });
    });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
      const url = route.request().url();
      if (fail) return route.abort();
      const m = MOCKS.find(([re]) => re.test(url));
      if (!m) return route.fulfill({ status: 599, body: "not mocked" });
      return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": m[1]?.endsWith(".txt") ? "text/plain" : "application/json" },
        body: m[1] ? FX(m[1]) : m[2] });
    });
  }
  return { ctx, page, errors };
}

async function tapTargets(page) {
  return page.evaluate(() => [...document.querySelectorAll("button, a, input, summary")].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  }).map((e) => ({ t: (e.textContent || e.placeholder || e.getAttribute("aria-label") || "").trim().slice(0, 30),
    h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }))
    .filter((x) => x.h < 44 || x.w < 44)); // both ways: V28's ↻ and hotline numbers were tall enough but too narrow
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const text = (page, sel) => page.locator(sel).innerText();

async function main() {
  const server = await serve(0);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  try {
    // 1. first visit, then GPS
    const { page, errors, ctx } = await newPage(browser);
    await page.goto(base);
    ok(await page.locator("#welcome").isVisible(), "first visit shows the welcome and the GPS button");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/01-welcome-390.png`, fullPage: true });
    await page.click("#gps");
    await page.waitForSelector("#report:not([hidden])");
    await page.waitForFunction(() => document.querySelectorAll(".card").length >= 10 && !document.querySelector("#verdict .vtitle")?.textContent.includes("กำลัง"), null, { timeout: 20000 });
    await page.waitForTimeout(LIVE ? 8000 : 800);
    const name = await text(page, "#place-name");
    ok(/แขวง|ต\./.test(name), `GPS names the subdistrict: "${name}"`);
    const verdict = await text(page, "#verdict");
    ok(verdict.length > 5, `verdict: ${verdict.replace(/\s+/g, " ").slice(0, 160)}`);
    // GUIDELINES §2 (U17): a GPS place shows no coordinates anywhere on screen, rounded or not
    const shown = await page.evaluate(() => document.body.innerText);
    ok(!/\b\d{1,2}\.\d{1,4},\s*\d{2,3}\.\d{1,4}\b/.test(shown), "no coordinates on screen for a GPS place (U17)");
    const cards = await page.locator(".card").count();
    ok(cards === 10, `10 hazard cards (${cards})`);
    if (!LIVE) {
      const pm = await text(page, "#card-pm25");
      ok(pm.includes("31.9"), "PM2.5 card shows the nearest PCD station's 24-h mean (31.9 at bkp92t, from the fixture)");
      ok(pm.includes("สำนักงานเขตพระนคร"), "PM2.5 card names the station");
      const fl = await text(page, "#card-flood");
      ok(fl.includes("131 ซม."), "flood card leads with cm below the bank for C.12 (1.31 m in ThaiWater's fixture)");
      ok((await text(page, "#outlook")).includes("พรุ่งนี้"), "3-day table has tomorrow");
      const heat = await text(page, "#card-heat");
      ok(/4[0-9]\s°C/.test(heat) && heat.includes("ปรับแก้"), `heat card shows the corrected value (MODELS §1): ${heat.split("\n").slice(0, 5).join(" | ")}`);
    }
    // T9: the address bar keeps the place as its subdistrict code (LINE's own ⋯ → Share sends it), also after a tile tap
    const h1 = await page.evaluate(() => location.hash);
    await page.locator(".tile").first().click();
    await page.waitForTimeout(300);
    const h2 = await page.evaluate(() => location.hash);
    ok(/^#t=\d{6}$/.test(h1) && h2 === h1, `after GPS the address bar holds the subdistrict code, and a tile tap keeps it (T9): "${h1}" → "${h2}"`);
    ok((await overflow(page)) <= 0, "no horizontal scroll at 390 px");
    const small = await tapTargets(page);
    ok(small.length === 0, `tap targets ≥ 44 px (${small.length} smaller: ${JSON.stringify(small.slice(0, 6))})`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/02-report-390.png`, fullPage: true });
    if (LIVE) {
      for (const id of ["heat", "pm25", "air", "uv", "rain", "wind", "flood", "landslide", "quake", "fire"]) {
        const c = page.locator(`#card-${id}`);
        if (await c.count()) console.log(`   [${id}] ${(await c.innerText()).replace(/\s+/g, " ").slice(0, 260)}`);
      }
    }
    // 2. English
    await page.click("#lang");
    await page.waitForTimeout(200);
    const en = await text(page, "#main");
    ok(/Heat \(heat index\)/.test(en) && /The next 3 days/.test(en), "English switch translates the cards and headings");
    const thaiLeft = (await page.locator(".card h3, .block h2, #verdict .vtitle").allInnerTexts()).filter((s) => /[฀-๿]/.test(s));
    ok(thaiLeft.length === 0, `no Thai left in English headings (${JSON.stringify(thaiLeft)})`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/03-report-en-390.png`, fullPage: true });
    await page.click("#lang");
    // 3. local search, then a saved place survives a reload (with a place open the finder is one "ดูที่อื่น" row)
    ok(!(await page.locator("#q").isVisible()) && (await page.locator("#change").isVisible()), "with a place open, the finder folds to one row");
    await page.click("#change");
    await page.fill("#q", "เชียงใหม่");
    await page.waitForSelector("#results:not([hidden]) .hit");
    const hits = await page.locator("#results .hit").allInnerTexts();
    ok(hits[0].includes("จังหวัดเชียงใหม่"), `local search: first hit "${hits[0]}"`);
    ok(hits.some((h) => h.includes("OpenStreetMap")), "the OpenStreetMap button is offered");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/04-search-390.png` });
    await page.locator("#results .hit").first().click();
    await page.waitForFunction(() => document.querySelector("#place-name").textContent.includes("เชียงใหม่"));
    ok(true, "choosing a hit opens that place");
    page.once("dialog", (d) => d.accept("บ้านแม่"));
    await page.click("#save");
    await page.waitForSelector("#saved .chip", { state: "attached" }); // in the folded finder; the ★ on Save is the feedback
    await page.goto(base);
    await page.waitForSelector("#report:not([hidden])");
    ok((await text(page, "#place-name")).includes("บ้านแม่"), "reopening the app shows the saved place first");
    // 4. OSM search on Enter (soi variants)
    await page.click("#change");
    await page.fill("#q", "ซ. ลาดพร้าว 71");
    await page.press("#q", "Enter");
    await page.waitForSelector("[data-o]", { timeout: 10000 });
    ok((await page.locator("[data-o]").first().innerText()).includes("ลาดพร้าว 71"), "Enter asks OpenStreetMap; the soi is found");
    await page.locator("[data-o]").first().click();
    await page.waitForFunction(() => document.querySelector("#place-name").textContent.includes("ลาดพร้าว 71"));
    ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(" | ")})`);
    await ctx.close();

    // 5. the smallest phone, larger text
    const small320 = await newPage(browser, { width: 320, height: 568 });
    await small320.page.goto(`${base}#p=13.76,100.5,${encodeURIComponent("ทดสอบ")}`);
    await small320.page.waitForFunction(() => document.querySelectorAll(".card").length >= 10);
    await small320.page.click("#bigger");
    await small320.page.waitForTimeout(500);
    ok((await overflow(small320.page)) <= 0, "no horizontal scroll at 320 px with larger text");
    // the table scrolls inside its own box, which the page check can't see: 0.3.0 hid tomorrow and day 3 there
    const tbl = await small320.page.evaluate(() => {
      const t = document.querySelector(".outlook");
      return t ? [Math.round(t.getBoundingClientRect().width), t.parentElement.clientWidth] : null;
    });
    ok(tbl && tbl[0] <= tbl[1], `the 3-day table shows all three days at 320 px with larger text (${tbl})`);
    if (SHOTS) await small320.page.screenshot({ path: `${SHOTS}/05-report-320-bigger.png`, fullPage: true });
    await small320.ctx.close();

    // 5b. the verdict is on the first screen of a small phone inside LINE (KI-022, visitor audit V5)
    const line360 = await newPage(browser, { width: 360, height: 640, ua: LINE_UA });
    await line360.page.goto(`${base}#t=100101`);
    await line360.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 });
    const vBottom = await line360.page.$eval("#verdict", (e) => Math.round(e.getBoundingClientRect().bottom + scrollY));
    ok(vBottom <= 640, `verdict ends at ${vBottom} px on a 360 × 640 LINE screen (KI-022: ≤ 640)`);
    await line360.ctx.close();

    if (!LIVE) {
      // 5c. no interim verdict while the warnings are still on their way (KI-026, visitor audit V21)
      const slow = await newPage(browser, { liveDelayMs: 2500 });
      await slow.page.goto(`${base}#t=100101`);
      await slow.page.waitForSelector("#report:not([hidden])");
      await slow.page.waitForTimeout(1200);
      const early = await text(slow.page, "#verdict");
      ok(/กำลังดึงข้อมูล/.test(early) && !(await slow.page.locator("#verdict .vname").count()), `no level while warnings are unanswered: "${early.trim()}"`);
      await slow.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 8000 });
      ok(true, "the verdict comes once they answer");
      await slow.ctx.close();

      // 5d. English page, Hat Yai under TMD's heavy-rain warning: the collector's checked English, labelled (docs/AI.md)
      const warn = readFileSync(new URL("../test/fixtures/warnings_en.json", import.meta.url), "utf8");
      const index = (generated) => JSON.stringify({ generated, files: { "warnings.json": "2026-10-23T19:45:00Z" }, failed: {} });
      const en = await newPage(browser, { live: { "index.json": index("2026-10-23T19:45:00Z"), "warnings.json": warn } });
      await en.page.goto(`${base}?lang=en#p=7.01,100.47`);
      await en.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 });
      const w = await text(en.page, "#warnings");
      ok(/Areas at risk of heavy rain/.test(w) && /Machine translation \(GLM\)/.test(w) && !/\(in Thai\)/.test(w), "English page shows TMD's warning in checked English, labelled as a machine translation");
      const head = await text(en.page, "#verdict .vhead");
      ok(/TMD warning/.test(head) && !/chance/i.test(head), `verdict leads with the warning, no model chance beside it (KI-028): "${head.trim()}"`);
      if (SHOTS) await en.page.screenshot({ path: `${SHOTS}/06-warning-en-390.png` });
      await en.ctx.close();

      // 5e. the same files from a collector that stopped 6 h ago: missing, never "no warning" (S12)
      const old = await newPage(browser, { live: { "index.json": index("2026-10-23T13:45:00Z"), "warnings.json": warn } });
      await old.page.goto(`${base}#p=7.01,100.47`);
      await old.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 });
      const ow = await text(old.page, "#warnings");
      const ov = await text(old.page, "#verdict");
      ok(/ตรวจประกาศเตือนภัยของกรมอุตุฯ ไม่ได้/.test(ow) && !/กรมอุตุฯ: /.test(await text(old.page, "#pre")) && /ประกาศเตือนภัย/.test(ov),
        "a stale collector's warnings are treated as missing, not shown and not calm (S12)");
      await old.ctx.close();

      // 5f. FloodWatch's look ahead and the measured 3-day rain, through the collector (Trang's วังวิเศษ, FloodWatch's
      // "may reach the bank within 24 h, 25–50 %" on 24 Oct 2026; a made-up 3-day total at a made-up gauge beside it)
      const fwFile = JSON.stringify({ ...parseFloodWatch(JSON.parse(FX("fw_stations.json")), JSON.parse(FX("fw_risks.json"))), fetched: "2026-10-23T19:45:00Z" });
      const r3 = JSON.stringify({ fetched: "2026-10-23T19:40:00Z", rows: [["T1", "สถานีทดสอบ", 7.66, 99.47, 120, 260, 410, "2026-10-23T19:30Z"]] });
      const fwIdx = JSON.stringify({ generated: "2026-10-23T19:45:00Z", files: { "floodwatch.json": "2026-10-23T19:45:00Z", "rain3d.json": "2026-10-23T19:40:00Z" }, failed: {} });
      const tr = await newPage(browser, { live: { "index.json": fwIdx, "floodwatch.json": fwFile, "rain3d.json": r3 } });
      await tr.page.goto(`${base}#p=7.67,99.46`);
      await tr.page.waitForFunction(() => document.querySelectorAll(".card").length >= 10 && document.querySelector("#verdict .vname"), null, { timeout: 20000 });
      await tr.page.waitForTimeout(600);
      const tf = await text(tr.page, "#card-flood");
      const trn = await text(tr.page, "#card-rain");
      // the gauge is near its bank now (FloodWatch: warning, 94 %): the measured word leads, the forecast is a line
      ok(/📈 FloodWatch: วังวิเศษ/.test(tf) && /เกิดจริง 14%/.test(tf) && /ใกล้ล้นตลิ่ง/.test(tf) && /ตามที่ FloodWatch อ่าน/.test(tf),
        `FloodWatch's "may reach the bank" reaches the flood card with its track record, under the measured word: ${tf.split("\n").slice(0, 4).join(" | ")}`);
      ok(/ฝนสะสมที่วัดได้ 3 วัน \(72 ชม\.\): 410 มม\./.test(trn), "the rain card shows the measured 3-day total");
      ok(tr.errors.length === 0, `no page errors with FloodWatch's file (${tr.errors.slice(0, 2).join(" | ")})`);
      if (SHOTS) await tr.page.screenshot({ path: `${SHOTS}/08-floodwatch-ahead-390.png`, fullPage: true });
      await tr.ctx.close();

      // 5h. site data blocked ("Block all cookies"): the storage getters throw; a shared link still opens its place (T1)
      const nb = await newPage(browser);
      await nb.page.addInitScript(() => {
        for (const k of ["localStorage", "sessionStorage"]) Object.defineProperty(window, k, { get() { throw new DOMException("blocked", "SecurityError"); } });
      });
      await nb.page.goto(`${base}#t=100101`);
      const nbOk = await nb.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 }).then(() => true, () => false);
      ok(nbOk && nb.errors.length === 0, `with site data blocked a shared link still opens and grades its place (T1) ${nb.errors.slice(0, 1).join("")}`);
      await nb.ctx.close();

      // 5g. what changed since the last look (UX §5.3): yesterday's look kept on the phone said heat 0; then the look
      // this load stores, so a reload says nothing
      const code = nearestTambon(JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8")), BKK.latitude, BKK.longitude).code;
      const sv = await newPage(browser);
      await sv.page.addInitScript(([c, t]) => {
        if (!sessionStorage.getItem("smoke:seeded")) { localStorage.setItem("dn:seen", JSON.stringify({ [c]: { at: t, levels: { heat: 0, rain: 0 } } })); sessionStorage.setItem("smoke:seeded", "1"); }
      }, [code, Date.parse("2026-10-23T07:00:00Z")]);
      await sv.page.goto(`${base}#t=${code}`);
      await sv.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 });
      await sv.page.waitForTimeout(5600); // the look is stored once every source has answered or 5 s have passed
      const chg = (await sv.page.locator("#changes").isVisible()) ? await text(sv.page, "#changes") : "";
      ok(/เปลี่ยนจากที่ดูครั้งก่อน/.test(chg) && /ความร้อน ยังไม่น่าห่วง ↑ เตรียมตัว/.test(chg), `what changed since the last look: "${chg.replace(/\s+/g, " ")}"`);
      const stored = await sv.page.evaluate((c) => JSON.parse(localStorage.getItem("dn:seen"))[c], code);
      ok(stored && stored.levels.heat === 2 && Object.keys(stored).sort().join() === "at,levels", "this look is stored: levels and a time, by subdistrict code only");
      await sv.page.reload();
      await sv.page.waitForFunction(() => document.querySelector("#verdict .vname"), null, { timeout: 20000 });
      await sv.page.waitForTimeout(800);
      ok(!(await sv.page.locator("#changes").isVisible()), "a reload with nothing changed says nothing");
      await sv.ctx.close();
    }

    // 5b. the evening on the same fixtures: the main walk's clock (02:50 in Bangkok) never sees a window without an
    // afternoon, which is how the evening "danger heat" line (S6) went unseen from 0.2.0 to 0.4.0
    if (!LIVE) {
      const eve = await newPage(browser, { now: new Date("2026-10-24T11:30:00Z") }); // 18:30 in Bangkok
      await eve.page.goto(`${base}#p=13.76,100.5`);
      await eve.page.waitForFunction(() => document.querySelectorAll(".card").length >= 10 && document.querySelector(".outlook"));
      await eve.page.waitForTimeout(800);
      const head = await eve.page.locator(".outlook thead th").allInnerTexts();
      const heat0 = (await eve.page.locator(".outlook tbody tr").first().locator("td").first().innerText()).trim();
      const pre = await text(eve.page, "#pre");
      ok(head.includes("คืนนี้") && heat0 === "–" && !/ร้อนระดับอันตราย[^\n]*คืนนี้/.test(pre),
        `at 18:30 the first column is "คืนนี้", with no heat number or danger-heat line for the evening (S6): ${JSON.stringify(head)} heat "${heat0}"`);
      ok(eve.errors.length === 0, `no page errors in the evening (${eve.errors.slice(0, 2).join(" | ")})`);
      await eve.ctx.close();
    }

    // 6. every source down: the page still answers
    if (!LIVE) {
      const down = await newPage(browser, { fail: true });
      await down.page.goto(`${base}#p=13.76,100.5`);
      await down.page.waitForFunction(() => document.querySelectorAll(".card").length >= 10);
      await down.page.waitForTimeout(1500);
      const v = await text(down.page, "#verdict");
      ok(/ยังไม่มีข้อมูล/.test(v), `all sources down → "${v.trim()}"`);
      ok((await down.page.locator(".card .pill").allInnerTexts()).every((p) => /ดึงข้อมูลไม่สำเร็จ|ยังไม่มีข้อมูล/.test(p)), "every card says it couldn't load, none shows a level");
      ok((await down.page.locator(".tile .tv").count()) === 0, "no tile without a level shows a number (U13: '260 ซม.' read as calm)");
      ok(down.errors.length === 0, `no page errors with sources down (${down.errors.slice(0, 2).join(" | ")})`);
      await down.ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}
main();

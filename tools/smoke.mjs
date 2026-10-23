#!/usr/bin/env node
// Visitor checks in headless Chromium on the saved live responses (test/fixtures, 23 Oct 2026 ~19:50 UTC), with
// the clock pinned to that moment, so the result doesn't depend on today's weather or on an agency being up.
//   CHROME_PATH=/opt/pw-browsers/chromium npm run smoke            (add -- --screens docs/screens to save screenshots)
//   npm run smoke -- --live                                        (no mocks: the real sources, today; prints only)
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

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

async function newPage(browser, { width = 390, height = 844, fail = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: "th-TH",
    timezoneId: "Asia/Bangkok", geolocation: BKK, permissions: ["geolocation"], isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  if (!LIVE) await page.clock.setFixedTime(NOW);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (!LIVE) {
    // the collector's files are this site's own: absent in the fixture run (they'd be today's, not the fixtures' day)
    await ctx.route(/\/data\/live\//, (route) => route.fulfill({ status: 404, body: "" }));
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
  }).map((e) => ({ t: (e.textContent || e.placeholder || e.getAttribute("aria-label") || "").trim().slice(0, 30), h: e.getBoundingClientRect().height }))
    .filter((x) => x.h < 44));
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
      ok(/4[0-9] °C/.test(heat) && heat.includes("ปรับแก้"), `heat card shows the corrected value (ECMWF + 5 °C, MODELS §1): ${heat.split("\n").slice(0, 5).join(" | ")}`);
    }
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
    // 3. local search, then a saved place survives a reload
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
    await page.waitForSelector("#saved .chip");
    await page.goto(base);
    await page.waitForSelector("#report:not([hidden])");
    ok((await text(page, "#place-name")).includes("บ้านแม่"), "reopening the app shows the saved place first");
    // 4. OSM search on Enter (soi variants)
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
    if (SHOTS) await small320.page.screenshot({ path: `${SHOTS}/05-report-320-bigger.png`, fullPage: true });
    await small320.ctx.close();

    // 6. every source down: the page still answers
    if (!LIVE) {
      const down = await newPage(browser, { fail: true });
      await down.page.goto(`${base}#p=13.76,100.5`);
      await down.page.waitForFunction(() => document.querySelectorAll(".card").length >= 10);
      await down.page.waitForTimeout(1500);
      const v = await text(down.page, "#verdict");
      ok(/ยังไม่มีข้อมูล/.test(v), `all sources down → "${v.trim()}"`);
      ok((await down.page.locator(".card .pill").allInnerTexts()).every((p) => /ดึงข้อมูลไม่สำเร็จ|ยังไม่มีข้อมูล/.test(p)), "every card says it couldn't load, none shows a level");
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

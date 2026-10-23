// Tests for the findings of the output cross-check and the visitor audit (docs/research/*-2026-10-23.md): each one
// holds a fix in place. The IDs (M1–M5, H1–H4, V1–V41) are the reports'.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { assess, MODEL_MAX, BKK_MMI_TERM, STORM_SHOW_KM } from "../public/js/assess.js";
import { nearestTambon } from "../public/js/geo.js";
import { chanceWord, prewarnings } from "../public/js/outlook.js";
import { capHazard } from "../public/js/events.js";
import { quakesForPoint } from "../public/js/quake.js";
import { band } from "../public/js/levels.js";
import { IPE } from "../public/js/ipe.js";
import { parseCap } from "../tools/collect.mjs";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const jx = (f) => JSON.parse(fx(f));
const TAMBON = JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-23T19:50:00Z");
const at = (lat, lon) => ({ lat, lon, place: nearestTambon(TAMBON, lat, lon) });
const card = (r, id) => r.cards.find((c) => c.id === id);
const full = (point, extra = {}) => ({ now: NOW, point, ens: jx("ens_bkk.json"), aq: jx("aq_bkk.json"), gistda: jx("gistda_loc.json"),
  a4t: jx("a4t.json"), twRain: jx("tw_rain_bkk.json"), twLevel: jx("tw_wl_bkk.json"), hiiFf: fx("hii_ff.txt"), emsc: jx("emsc.json"),
  usgs: jx("usgs_day.json"), gdacs: jx("gdacs.json"), jma: [jx("jma_forecast.json")], dmrSlide: { count: 0 }, dmrFault: { features: [] },
  elev: { elevation: [4] }, errors: {}, ...extra });

test("V3: the service worker caches every module the page imports, at the page's ?v=", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const bare = shell.map((f) => f.replace(/\?.*$/, ""));
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    const src = readFileSync(new URL(`../public/js/${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/(?:from\s+|import\()\s*"\.\/([\w.-]+\.js)"/g)) walk(m[1]);
  };
  walk("main.js");
  for (const f of seen) assert.ok(bare.includes(`js/${f}`), `sw.js SHELL is missing js/${f}`);
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  for (const m of html.matchAll(/(?:href|src)="((?:css|js)\/[\w.]+\?v=[\d.]+)"/g)) assert.ok(shell.includes(m[1]), `sw.js SHELL should list ${m[1]}`);
});

test("V1: a model forecast alone never says 'act now'", () => {
  assert.equal(MODEL_MAX, 2);
  for (const [lat, lon] of [[13.7563, 100.5018], [7.0086, 100.4747], [18.7883, 98.9853]]) {
    const r = assess(full(at(lat, lon), { now: Date.parse("2026-10-24T06:00:00Z") }), "th");
    for (const id of ["heat", "rain", "wind", "uv"]) assert.ok(card(r, id).level <= MODEL_MAX, `${id} at ${lat}`);
  }
});

test("M5/V2: a TMD warning lifts its tile, leads the verdict and shows in the pre-warnings' place", () => {
  const w = parseCap(fx("tmd_cap_item.xml")); // Heavy Rain, Severe, Songkhla (90) among 11 provinces
  assert.equal(capHazard(w), "rain");
  assert.equal(capHazard({ event: "Strong Wind", headline: "" }), "wind");
  assert.equal(capHazard({ event: "", headline: "อากาศร้อนจัด" }), "heat");
  assert.equal(capHazard({ event: "Earthquake", headline: "" }), null);
  const hatYai = at(7.0086, 100.4747);
  assert.equal(hatYai.place.pv, 90);
  for (const lang of ["th", "en"]) {
    const r = assess(full(hatYai, { warnings: { items: [w] } }), lang);
    const rain = card(r, "rain");
    assert.ok(rain.level >= 2, `rain level ${rain.level}`);
    assert.ok(rain.official);
    assert.ok(rain.lines[0].startsWith(lang === "en" ? "TMD notice" : "ประกาศกรมอุตุฯ"), rain.lines[0]);
    assert.equal(r.verdict.worst.id, "rain", "the official warning ranks above a model-only tile of the same level");
    assert.ok(!r.verdict.missing.some((m) => /warning|ประกาศ/.test(m)));
    // KI-028: the 3-day table's rain cells under the warning say so, never "low" (the clock is 02:50 on 24 Oct in
    // Bangkok and the warning ends 08:00 that day: today is covered, tomorrow isn't)
    assert.ok(r.outlook[0].rain.official && !r.outlook[1].rain.official, JSON.stringify(r.outlook.map((o) => o.rain)));
    // KI-028: the tile shows the notice's end, never the model's milder chance beside TMD's word
    assert.ok(!/chance|โอกาส/.test(rain.value || ""), `tile value "${rain.value}"`);
    assert.ok(/milder|เบากว่า/.test(rain.lines[1]), rain.lines[1]);
  }
  // the same warning outside its provinces does nothing
  const bkk = assess(full(at(13.7563, 100.5018), { warnings: { items: [w] } }), "th");
  assert.ok(!card(bkk, "rain").official);
});

test("V4: missing data is never calm (forecast, gauges, warnings)", () => {
  const p = at(13.7563, 100.5018);
  const noEns = assess(full(p, { ens: undefined, errors: { ens: "timeout" } }), "th");
  assert.equal(card(noEns, "rain").level, -1, "a dry gauge yesterday doesn't make the next 24 h calm");
  assert.equal(card(noEns, "wind").level, -1, "a far storm alone doesn't make the wind calm");
  const noTw = assess(full(p, { twLevel: undefined, errors: { twLevel: "HTTP 500" } }), "th");
  assert.equal(card(noTw, "flood").level, -1, "the flash-flood list alone doesn't grade the rivers");
  const noLive = assess(full(p), "th");
  assert.ok(noLive.verdict.missing.includes("ประกาศเตือนภัย"), "unchecked warnings are named");
  // M4: in Chiang Mai the fixture's Bangkok gauges are all over 8 km away: no data, not "ยังรับน้ำได้"
  const cm = assess(full(at(18.7883, 98.9853)), "th");
  assert.equal(card(cm, "flood").level, -1);
});

test("M1/V9: a failed or late Air4Thai is not worded as 'no station here'", () => {
  const p = at(13.7563, 100.5018);
  const failed = card(assess(full(p, { a4t: undefined, errors: { a4t: "HTTP 503" } }), "th"), "pm25");
  assert.ok(failed.lines.some((l) => l.startsWith("ดึงข้อมูลสถานีวัดของ คพ. ไม่ได้ตอนนี้")), failed.lines.join(" | "));
  assert.ok(!failed.lines.some((l) => l.startsWith("ไม่มีสถานีวัดของ คพ.")));
  const late = card(assess(full(p, { now: NOW + 6 * 3.6e6 }), "th"), "pm25");
  assert.ok(late.lines.some((l) => /ยังไม่ส่งข้อมูลมา \d+ ชม\.: ค่าล่าสุด/.test(l)), late.lines.join(" | "));
});

test("M3/V7: before dawn the UV tile names today's peak, as the card does", () => {
  const r = assess({ now: NOW, point: at(13.75, 100.5), aq: jx("aq_bkk.json"), errors: {} }, "th"); // 02:50 Bangkok
  const uv = card(r, "uv");
  assert.match(uv.value, /^วันนี้สูงสุด/);
  assert.ok(uv.lines[0].includes("วันนี้"), uv.lines[0]);
});

test("H1: a mask line always carries the under-2 line", () => {
  const r = assess(full(at(13.7563, 100.5018), { a4t: undefined }), "th"); // GISTDA's 45.9: the mask band
  const pm = card(r, "pm25");
  assert.match(pm.action.text, /หน้ากาก/);
  assert.match(pm.action.baby.text, /^เด็กต่ำกว่า 2 ขวบ/);
});

test("rain in three words, never an amount as a forecast (MODELS.md §3)", () => {
  assert.equal(chanceWord(0.05), "ต่ำ");
  assert.equal(chanceWord(0.1), "มีโอกาส");
  assert.equal(chanceWord(0.39), "มีโอกาส");
  assert.equal(chanceWord(0.4), "สูง");
  assert.equal(chanceWord(0.5, "en"), "high");
  const rain = card(assess(full(at(13.7563, 100.5018)), "th"), "rain");
  assert.match(rain.value, /^โอกาสฝนหนัก (ต่ำ|มีโอกาส|สูง)$/);
  assert.ok(!/น่าจะ \d+ มม\./.test(rain.lines.join(" ")));
});

test("V8: likely heavy rain is listed even when very heavy rain is only possible", () => {
  const day = (r2, r3) => ({ date: "2026-10-25", heat: { chance: [1, 1, 0, 0] }, rain24: { chance: [1, 1, r2, r3], p90: 80 }, gust: { chance: [1, 0, 0, 0] } });
  const pre = prewarnings({ days: [day(0, 0), day(0.95, 0.3)] });
  assert.deepEqual(pre.map((x) => [x.hazard, x.level]), [["rain24", 3], ["rain24", 2]]);
  assert.deepEqual(prewarnings({ days: [day(0.4, 0.35)] }).map((x) => x.level), [3]);
});

test("quakes: the validated words and the Bangkok-metro term (MODELS.md §6)", () => {
  assert.equal(BKK_MMI_TERM, 1.06);
  assert.equal(band("mmi", 2.4).th, "ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง");
  assert.equal(band("mmi", 2.5).th, "อาจรู้สึกได้");
  assert.equal(band("mmi", 4.5).th, "รู้สึกได้ชัด");
  // the 28 Mar 2025 M7.7: Bangkok's reports averaged CDI 4.7; the IPE alone says 3.6
  const q = [{ mag: 7.7, lat: 22.0, lon: 95.92, depth: 10, t: NOW - 3.6e6, place: "Myanmar" }];
  const raw = quakesForPoint(q, 13.75, 100.5, NOW, IPE)[0];
  const bkk = quakesForPoint(q, 13.75, 100.5, NOW, IPE, { site: BKK_MMI_TERM })[0];
  assert.ok(Math.abs(bkk.mmi - raw.mmi - 1.06) < 1e-9);
  assert.equal(raw.band.th, "อาจรู้สึกได้");
  assert.equal(bkk.band.th, "รู้สึกได้ชัด");
  // KI-023: not beyond the ~1,600 km the term was fitted on (the M7.0 in Tibet, 2,181 km, 22 Oct 2026)
  const far = [{ mag: 7.0, lat: 31.6, lon: 93.9, depth: 10, t: NOW - 3.6e6, place: "Tibet" }];
  const a = quakesForPoint(far, 13.75, 100.5, NOW, IPE)[0];
  const b2 = quakesForPoint(far, 13.75, 100.5, NOW, IPE, { site: BKK_MMI_TERM })[0];
  assert.ok(a ? Math.abs((b2?.mmi ?? a.mmi) - a.mmi) < 1e-9 : !b2);
});

test("V10/V15: the FloodWatch link carries the rounded point; far storms are left out", () => {
  const r = assess(full({ lat: 13.787123, lon: 100.607645, place: nearestTambon(TAMBON, 13.787123, 100.607645) }), "th");
  assert.match(card(r, "flood").more.href, /#p=13\.79,100\.61$/);
  const wind = card(r, "wind");
  assert.ok(STORM_SHOW_KM <= 1500);
  assert.ok(!wind.lines.some((l) => /In-fa|จำปี/.test(l)), wind.lines.join(" | "));
});

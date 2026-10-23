// Unit tests for the pure modules, on responses saved from live calls on 23 Oct 2026 (~19:50 UTC, cloud host
// outside Thailand). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { km, rounded, nearestTambon, placeLabel, compass, bearing } from "../public/js/geo.js";
import { heatIndexC } from "../public/js/heat.js";
import { band, riverLevel, roundTo, HAZARDS } from "../public/js/levels.js";
import { buildOutlook, prewarnings, chanceText, windowLevel, summarize, quantile, dayWindows } from "../public/js/outlook.js";
import { parseGistda, camsRatio, buildAir } from "../public/js/airq.js";
import { nearRain, nearGauges, parseFlashFlood, parseFloodWatchPoint } from "../public/js/water.js";
import { parseEmsc, parseUsgs, mergeQuakes, quakesForPoint, tsunamiWatch, ANDAMAN_PROVINCES } from "../public/js/quake.js";
import { gdacsNear, warningsFor, hotspotsNear, hotspotLevel } from "../public/js/events.js";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const jx = (f) => JSON.parse(fx(f));
const TAMBON = JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-23T19:50:00Z"); // 02:50 Bangkok, 24 Oct: when the fixtures were saved

test("distance and rounding", () => {
  assert.ok(Math.abs(km(13.7563, 100.5018, 18.7883, 98.9853) - 581) < 5); // Bangkok–Chiang Mai ~581 km great-circle
  assert.deepEqual(rounded(13.756349, 100.501765), { lat: 13.76, lon: 100.5 });
  assert.equal(compass(bearing(13.75, 100.5, 18.79, 98.98), "th"), "เหนือ");
});

test("nearest subdistrict and its label", () => {
  const p = nearestTambon(TAMBON, 13.7504, 100.499);
  assert.equal(p.code, 100103);
  assert.equal(placeLabel(p), "แขวงวัดราชบพิธ เขตพระนคร กรุงเทพมหานคร");
  const cm = nearestTambon(TAMBON, 18.7883, 98.9853);
  assert.equal(cm.pv, 50); // Chiang Mai
  assert.match(placeLabel(cm), /^ต\..+ อ\..+ จ\.เชียงใหม่$/);
});

test("Andaman province codes are the six coastal provinces", () => {
  const names = ANDAMAN_PROVINCES.map((c) => TAMBON.p[String(c)][0]);
  assert.deepEqual(names, ["ระนอง", "พังงา", "ภูเก็ต", "กระบี่", "ตรัง", "สตูล"]);
});

test("heat index matches the NWS method", () => {
  // NWS: 90 °F at 70 % → 106 °F (41.1 °C); 80 °F at 40 % → 80 °F (simple formula region ~79.9)
  assert.ok(Math.abs(heatIndexC(32.22, 70) - 41.1) < 0.3);
  assert.ok(Math.abs(heatIndexC(26.67, 40) - 26.6) < 0.4);
  assert.equal(heatIndexC(null, 50), null);
  // a Bangkok afternoon: 34 °C at 60 % → about 42–43 °C (อันตราย)
  assert.equal(band("heat", heatIndexC(34, 60)).level, 3);
});

test("bands use the sources' own edges", () => {
  assert.equal(band("pm25", 25.0).th, "ดี");
  assert.equal(band("pm25", 25.1).th, "ปานกลาง");
  assert.equal(band("pm25", 25.04).th, "ดี"); // rounds to 25.0
  assert.equal(band("pm25", 37.6).level, 2);
  assert.equal(band("pm25", 75.1).level, 3);
  assert.equal(band("uv", 5.4).th, "ปานกลาง");
  assert.equal(band("uv", 5.6).th, "สูง");
  assert.equal(band("rain24", 35.0).th, "ฝนปานกลาง");
  assert.equal(band("rain24", 35.1).th, "ฝนหนัก");
  assert.equal(band("heat", 26.96).level, 1); // 27.0 after rounding
  assert.equal(band("heat", null).level, -1);
  assert.equal(roundTo(25.1 * 1, 0.1), 25.1);
  for (const [k, h] of Object.entries(HAZARDS)) {
    for (let i = 1; i < h.bands.length; i++) assert.ok(h.bands[i].min > h.bands[i - 1].min, `${k} ascending`);
  }
});

test("river level follows FloodWatch's rule", () => {
  assert.equal(riverLevel(2.3, 2.26, -14.52).level, 3); // over the bank
  assert.equal(riverLevel(0.95, 2.26, -14.52).level, 2); // C.12 on 24 Oct: 92 % of bank above the bed
  assert.equal(riverLevel(1.0, 3.0, 0).level, 0);
  assert.equal(riverLevel(1.0, 1.2, null).level, 2); // no bed: within 30 cm of the bank
  assert.equal(riverLevel(null, 2, 0).level, -1);
});

test("quantiles and day windows", () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantile([0, 10], 0.1), 1);
  const w = dayWindows(["2026-10-24T22:00", "2026-10-24T23:00", "2026-10-25T00:00", "2026-10-25T01:00"], 0);
  assert.deepEqual(w.map((d) => [d.date, d.hours]), [["2026-10-24", 2], ["2026-10-25", 2]]);
});

test("ensemble outlook from a live response", () => {
  const o = buildOutlook(jx("ens_bkk.json"), NOW);
  assert.ok(o);
  assert.equal(o.members, 51);
  assert.equal(o.issued, "2026-10-24T02:00");
  assert.equal(o.days.length, 3);
  assert.equal(o.days[0].date, "2026-10-24");
  assert.ok(o.days[0].heat.p50 > 30 && o.days[0].heat.p50 < 50, `heat ${o.days[0].heat.p50}`);
  assert.ok(o.days[0].heat.p10 <= o.days[0].heat.p50 && o.days[0].heat.p50 <= o.days[0].heat.p90);
  assert.ok(o.next24.rain24.n === 51);
  for (const d of o.days) for (const v of Object.values(d.rain24.chance)) assert.ok(v >= 0 && v <= 1);
  const pw = prewarnings(o);
  for (const p of pw) assert.ok(p.chance >= 0.2 && ["heat", "rain24", "gust"].includes(p.hazard));
});

test("window level from chances", () => {
  const s = summarize("rain24", [...Array(30).fill(5), ...Array(21).fill(40)]); // 41 % heavy
  assert.equal(windowLevel(s).level, 1); // possible warning → watch
  const t = summarize("rain24", [...Array(20).fill(5), ...Array(31).fill(40)]); // 61 % heavy
  assert.equal(windowLevel(t).level, 2);
  assert.equal(windowLevel(summarize("rain24", Array(51).fill(1))).level, 0);
});

test("chance wording never says 0 or 100", () => {
  assert.equal(chanceText(0.02), "ไม่ถึง 10%");
  assert.equal(chanceText(0.98), "เกิน 90%");
  assert.equal(chanceText(0.44), "40%");
  assert.equal(chanceText(0.46, "en"), "50%");
});

test("GISTDA point: Bangkok time with a fake Z", () => {
  const g = parseGistda(jx("gistda_loc.json"));
  assert.equal(g.time, "2026-10-24T02:00"); // 02:00 Bangkok, read at 19:47 UTC
  assert.equal(g.place.tb, 100103);
  assert.equal(g.hours.length, 24);
  assert.ok(Math.abs(g.mean24 - 46.37) < 0.01);
  assert.equal(band("pm25", g.mean24).level, 2);
});

test("CAMS correction ratio from overlapping hours", () => {
  const g = parseGistda(jx("gistda_loc.json"));
  const aq = jx("aq_bkk.json");
  const r = camsRatio(g.hours, aq.hourly.time, aq.hourly.pm2_5);
  assert.ok(r && r.hours >= 20, JSON.stringify(r));
  assert.ok(r.ratio >= 0.5 && r.ratio <= 3);
  const air = buildAir(aq, g, NOW);
  assert.equal(air.outlook.length, 3);
  assert.ok(air.outlook.every((d) => d.corrected));
  assert.equal(air.uv.length, 3);
  assert.ok(air.pollutants && air.pollutants.time === "2026-10-24T02:00");
  // with the ratio, tomorrow's mean is the model's mean × ratio
  const raw = buildAir(aq, null, NOW);
  assert.ok(Math.abs(air.outlook[1].mean - raw.outlook[1].mean * r.ratio) < 1e-9);
});

test("ThaiWater rain near Bangkok's old town", () => {
  const rows = nearRain(jx("tw_rain_bkk.json"), 13.75, 100.5, NOW);
  assert.ok(rows.length > 0);
  assert.ok(rows[0].km <= rows[rows.length - 1].km);
  assert.ok(rows.every((r) => r.ageH <= 6 && r.rain24 >= 0));
});

test("ThaiWater gauges use the bank, not situation_level", () => {
  const g = nearGauges(jx("tw_wl_bkk.json"), 13.75, 100.5, NOW);
  const c12 = g.find((x) => x.code === "C.12");
  assert.ok(c12);
  assert.equal(c12.bank, 2.26);
  assert.ok(Math.abs(c12.freeboard - 1.31) < 0.01);
  assert.equal(c12.status, 2);
});

test("HII flash-flood report: header only means none tonight", () => {
  assert.deepEqual(parseFlashFlood(fx("hii_ff.txt")), []);
  const sample = '"รหัสตำบล","จังหวัด","อำเภอ","ตำบล","FFPI","ฝนสะสม 1 วันล่วงหน้า","สถานี","ลุ่มน้ำ"\n"800901","นครศรีธรรมราช","ชะอวด","ท่าประจะ","4.61","85.66","x","y"';
  const r = parseFlashFlood(sample);
  assert.equal(r[0].code, 800901);
  assert.equal(r[0].ffpi, 4.61);
});

test("FloodWatch point parses", () => {
  const f = parseFloodWatchPoint(jx("fw_point.json"));
  assert.equal(f.river.status, "normal");
  assert.ok(f.rain.rain24 >= 0);
});

test("quakes: EMSC + USGS merged, the Laos M4.2 near Nan", () => {
  const all = mergeQuakes([parseEmsc(jx("emsc.json")), parseUsgs(jx("usgs_day.json"))]);
  assert.ok(all.length >= 5);
  const laos = all.find((q) => Math.abs(q.lat - 19.081) < 0.01);
  assert.ok(laos && laos.mag === 4.2);
  // without coefficients there is no felt estimate, only distance (≤ 300 km keeps it)
  const near = quakesForPoint(all, 18.78, 100.77, NOW, null); // Nan town
  assert.ok(near.some((q) => q.id === laos.id && q.km < 150));
  assert.equal(tsunamiWatch(all, 83, NOW), null);
});

test("GDACS: only current events; TCs only within 1,000 km", () => {
  const ev = gdacsNear(jx("gdacs.json"), 13.75, 100.5);
  assert.ok(ev.every((e) => e.type !== "TC" || e.km <= 1000));
});

test("warnings and hotspots by province and distance", () => {
  const live = { items: [{ event: "ฝนตกหนัก", provinces: [80, 84], severity: "Severe", expires: "2026-10-25T06:00:00+07:00" },
    { event: "old", provinces: [10], severity: "Moderate", expires: "2026-10-20T06:00:00+07:00" }] };
  assert.equal(warningsFor(live, 80, NOW)[0].level, 2);
  assert.equal(warningsFor(live, 10, NOW).length, 0);
  const hs = hotspotsNear({ items: [{ lat: 18.8, lon: 99.0 }, { lat: 18.9, lon: 99.1 }, { lat: 15, lon: 100 }] }, 18.79, 98.98);
  assert.equal(hs.count, 2);
  assert.equal(hotspotLevel(hs.count), 1);
});

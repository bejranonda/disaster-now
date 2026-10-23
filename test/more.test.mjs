// Tests for search, sharing words, the collector's parsers, FloodWatch's point rule and the strings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { localSearch, hitLabel, variants, parseNominatim, parsePhoton, norm } from "../public/js/places.js";
import { areaIndex, nearGauges, waterWord } from "../public/js/water.js";
import { jmaStorm, stormLevel } from "../public/js/events.js";
import { actionFor } from "../public/js/actions.js";
import { parseCap, parseTmdQuakes, parseFirms } from "../tools/collect.mjs";
import { STR } from "../public/js/i18n.js";
import { assess, ORDER } from "../public/js/assess.js";
import { nearestTambon } from "../public/js/geo.js";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const jx = (f) => JSON.parse(fx(f));
const TAMBON = JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-23T19:50:00Z");

test("local search: provinces and districts first, prefixes stripped, several words narrow", () => {
  assert.equal(hitLabel(localSearch(TAMBON, "เชียงใหม่")[0]), "จังหวัดเชียงใหม่");
  assert.equal(localSearch(TAMBON, "จ.เชียงใหม่")[0].kind, "p");
  const bk = localSearch(TAMBON, "บางกะปิ");
  assert.equal(bk[0].kind, "a"); // the district before its subdistricts
  assert.match(hitLabel(bk[0]), /^เขตบางกะปิ/);
  const two = localSearch(TAMBON, "ในเมือง ขอนแก่น");
  assert.ok(two.length && two.every((h) => /ขอนแก่น/.test(hitLabel(h))), JSON.stringify(two.map((h) => hitLabel(h))));
  assert.equal(localSearch(TAMBON, "ก").length, 0);
  assert.equal(hitLabel(localSearch(TAMBON, "chiang mai")[0], "en"), "Chiang Mai (province)");
  assert.equal(norm(" ลาด พร้าว "), "ลาดพร้าว");
});

test("FloodWatch's soi variants and abbreviations", () => {
  assert.deepEqual(variants("ลาดพร้าว 71"), ["ลาดพร้าว 71", "ซอยลาดพร้าว 71"]);
  assert.deepEqual(variants("ซ. ลาดพร้าว 71"), ["ซอยลาดพร้าว 71"]);
  assert.deepEqual(variants("ถ.พหล"), ["ถนนพหลโยธิน"]);
});

test("geocoder answers parse; outside Thailand dropped", () => {
  const n = parseNominatim([{ lat: "13.7911", lon: "100.6084", display_name: "ซอยลาดพร้าว 71, แขวงสะพานสอง, เขตวังทองหลาง, กรุงเทพมหานคร, 10310, ประเทศไทย" }]);
  assert.deepEqual(n[0], { name: "ซอยลาดพร้าว 71", area: "แขวงสะพานสอง, เขตวังทองหลาง, กรุงเทพมหานคร", lat: 13.7911, lon: 100.6084 });
  const p = parsePhoton({ features: [{ geometry: { coordinates: [100.6084, 13.7911] }, properties: { name: "ซอยลาดพร้าว 71", district: "สะพานสอง", city: "กรุงเทพมหานคร", state: "กรุงเทพมหานคร" } },
    { geometry: { coordinates: [2.35, 48.85] }, properties: { name: "Paris" } }] });
  assert.equal(p.length, 1);
  assert.equal(p[0].area, "สะพานสอง, กรุงเทพมหานคร");
});

test("FloodWatch's point rule: in Bangkok the river doesn't judge a point", () => {
  const g = nearGauges(jx("tw_wl_bkk.json"), 13.7563, 100.5018, NOW);
  const ai = areaIndex(g, 10);
  assert.ok(ai.polder);
  assert.ok(ai.basis.every((x) => waterWord(x, true) === "คลอง"));
  assert.equal(ai.category, 0); // FloodWatch's own /api/point said "normal" for this point (fixture fw_point.json)
  assert.equal(jx("fw_point.json").area.category, "normal");
  // outside the polder provinces every waterway counts
  const ai2 = areaIndex(g, 50);
  assert.ok(!ai2.polder && ai2.basis.some((x) => waterWord(x, false) === "แม่น้ำ"));
});

test("ThaiWater ground 0 means no bed level (as FloodWatch reads it)", () => {
  const j = { waterlevel_data: { data: [{ waterlevel_datetime: "2026-10-24 02:00", waterlevel_msl: "8.77", station: { tele_station_lat: 13.75, tele_station_long: 100.5, tele_station_oldcode: "HDA006", min_bank: 12.15, ground_level: 0 } }] } };
  const [g] = nearGauges(j, 13.75, 100.5, NOW);
  assert.equal(g.pct, null);
  assert.equal(g.status, 0); // FloodWatch: normal (3.38 m below the bank, no bed)
});

test("JMA storm: distance and forecast circle", () => {
  const s = jmaStorm(jx("jma_forecast.json"), 13.75, 100.5);
  assert.equal(s.name, "Champi");
  assert.ok(s.km > 2000 && s.km < 3000, `${s.km}`); // ~2,600 km from Bangkok (the sources scout: 2,592 by TMD's track)
  assert.ok(s.closest.edge <= s.km);
  assert.equal(stormLevel(s), 0);
  assert.equal(jmaStorm([], 13, 100), null);
});

test("sourced actions follow the bands", () => {
  assert.equal(actionFor("pm25", 31.9).text, "ออกกำลังหนักๆ นอกบ้านให้น้อยลง");
  assert.equal(actionFor("pm25", 80).text, "งดทำกิจกรรมนอกบ้าน");
  assert.equal(actionFor("heat", 38).text, "ลดกิจกรรมกลางแดด");
  assert.equal(actionFor("heat", 25), null);
  assert.ok(actionFor("heat", 45, "en").src.every((s) => s.url && s.date));
});

test("collector: TMD CAP item → province codes and times from the item", () => {
  const w = parseCap(fx("tmd_cap_item.xml"));
  assert.equal(w.event, "Heavy Rain");
  assert.equal(w.severity, "Severe");
  assert.equal(w.expires, "2026-10-24T08:00:00+07:00");
  assert.deepEqual(w.provinces, [80, 81, 83, 84, 90, 91, 92, 93, 94, 95, 96]);
});

test("collector: TMD quake RSS and FIRMS CSV", () => {
  const q = parseTmdQuakes(fx("tmd_eq.xml"));
  assert.equal(q[0].time, "2026-10-24T02:31:21+07:00");
  assert.equal(q[0].mag, 4.2);
  assert.equal(q[0].placeTh, "ประเทศลาว");
  const csv = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n18.8,99.0,330,0.4,0.4,2026-10-22,0652,N,nominal,2.0NRT,300,5.1,D\n18.9,99.1,330,0.4,0.4,2026-10-22,0652,N,low,2.0NRT,300,1.1,D\n-9,159,330,0.4,0.4,2026-10-22,0323,N,high,2.0NRT,300,6,D";
  const f = parseFirms(csv);
  assert.equal(f.length, 1);
  assert.equal(f[0].t, "2026-10-22T06:52:00Z");
});

test("every data-t in index.html has Thai and English", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const keys = [...html.matchAll(/data-t(?:-ph|-title)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20);
  for (const k of keys) assert.ok(STR[k] && STR[k].th != null && STR[k].en != null, `missing string ${k}`);
  for (const [k, v] of Object.entries(STR)) assert.ok(typeof v.th === "string" && typeof v.en === "string", `string ${k}`);
});

test("assess on live fixtures: page values equal the sources (cross-check)", () => {
  const lat = 13.7563;
  const lon = 100.5018;
  const b = { now: NOW, point: { lat, lon, place: nearestTambon(TAMBON, lat, lon) }, ens: jx("ens_bkk.json"), aq: jx("aq_bkk.json"),
    gistda: jx("gistda_loc.json"), a4t: jx("a4t.json"), twRain: jx("tw_rain_bkk.json"), twLevel: jx("tw_wl_bkk.json"),
    hiiFf: fx("hii_ff.txt"), emsc: jx("emsc.json"), usgs: jx("usgs_day.json"), gdacs: jx("gdacs.json"),
    jma: [jx("jma_forecast.json")], dmrSlide: { count: 0 }, dmrFault: { features: [] }, elev: { elevation: [4] }, errors: {} };
  for (const lang of ["th", "en"]) {
    const r = assess(b, lang);
    assert.deepEqual(r.cards.map((c) => c.id), ORDER);
    const pm = r.cards.find((c) => c.id === "pm25");
    // the nearest PCD station to this point, by hand from a4t.json: bkp92t สำนักงานเขตพระนคร, PM2.5 31.9 at 03:00
    assert.equal(pm.value, "31.9 µg/m³");
    assert.equal(pm.level, 1);
    // FloodWatch's /api/point was asked for 13.75, 100.5: the same gauge and amount here (fw_point.json)
    const r2 = assess({ ...b, point: { lat: 13.75, lon: 100.5, place: nearestTambon(TAMBON, 13.75, 100.5) } }, lang);
    const rain = r2.cards.find((c) => c.id === "rain");
    const fwRain = jx("fw_point.json").rain_measured;
    assert.ok(rain.lines.some((l) => l.includes(String(fwRain.rain_24h)) && l.includes(fwRain.name_th)), `rain: ${rain.lines.join(" | ")}`);
    const flood = r.cards.find((c) => c.id === "flood");
    assert.equal(flood.level, 0);
    assert.ok(r.verdict.level >= Math.max(...r.cards.map((c) => c.level)), "the verdict is never milder than a tile");
    assert.ok(r.cards.every((c) => c.level < 0 || c.word), "every graded tile has a word");
  }
});

test("collector: TMD storm track (UTC without offset) and its distance", async () => {
  const { parseTmdStorms } = await import("../tools/collect.mjs");
  const { tmdStormsNear } = await import("../public/js/events.js");
  const s = parseTmdStorms(jx("tmd_storm.json"));
  assert.equal(s[0].name, "จำปี");
  assert.equal(s[0].path[0].t, "2026-10-15T00:00:00Z"); // dateTimeTH "15/10/2569 07:00" = +7 h
  const near = tmdStormsNear({ items: s }, 13.75, 100.5);
  assert.ok(near[0].km > 2400 && near[0].km < 2800, `${near[0].km}`); // the sources scout measured 2,592 km
});

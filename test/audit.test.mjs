// Tests for the findings of the output cross-check and the visitor audit (docs/research/*-2026-10-23.md): each one
// holds a fix in place. The IDs (M1–M5, H1–H4, V1–V41) are the reports'.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { assess, MODEL_MAX, BKK_MMI_TERM, STORM_SHOW_KM } from "../public/js/assess.js";
import { nearestTambon } from "../public/js/geo.js";
import { chanceWord, prewarnings, buildOutlook } from "../public/js/outlook.js";
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

// ---------- the review of 24 Oct 2026 (docs/research/review-2026-10-24.md; S-series) ----------

test("S1: every view of a forecast takes the tile's level, never above เตรียมตัว: table, card days, pre-warnings' colour", () => {
  for (const [lat, lon] of [[13.7563, 100.5018], [7.0086, 100.4747], [18.7883, 98.9853]]) {
    const r = assess(full(at(lat, lon), { now: Date.parse("2026-10-24T06:00:00Z") }), "th");
    for (const row of r.outlook) {
      for (const k of ["heat", "rain", "gust", "uv", "pm25"]) {
        if (row[k] && !row[k].official) assert.ok(row[k].level <= MODEL_MAX, `table ${k} ${row.name} at ${lat}: ${row[k].level}`);
      }
    }
    for (const c of r.cards) for (const d of c.days || []) assert.ok(d.level <= MODEL_MAX, `${c.id} day ${d.name} at ${lat}: ${d.level}`);
    for (const x of r.pre) assert.ok(x.tone <= MODEL_MAX, `pre ${x.hazard} tone ${x.tone}`);
  }
  // Bangkok's fixture: a forecast of ≥ 42 °C keeps its agency word in the pre-warning (level 3) but is orange (tone 2)
  const r = assess(full(at(13.7563, 100.5018)), "th");
  const heatPre = r.pre.find((x) => x.hazard === "heat");
  assert.ok(heatPre && heatPre.level === 3 && heatPre.tone === MODEL_MAX);
  assert.equal(r.outlook[0].heat.level, card(r, "heat").days[0].level);
});

test("S2: the table's heat number is the card's (floored, KI-F16), so it never reads past its band", () => {
  const r = assess(full(at(13.7563, 100.5018)), "th");
  const days = card(r, "heat").days;
  r.outlook.forEach((row, i) => assert.equal(row.heat.text, days[i].text));
});

test("S3: from 18:00 Bangkok time the first column is 'คืนนี้' and the night's UV is 0", () => {
  const eve = Date.parse("2026-10-24T12:30:00Z"); // 19:30 in Bangkok
  for (const lang of ["th", "en"]) {
    const r = assess(full(at(13.7563, 100.5018), { now: eve }), lang);
    assert.equal(r.outlook[0].name, lang === "en" ? "Tonight" : "คืนนี้");
    assert.equal(r.outlook[1].name, lang === "en" ? "Tomorrow" : "พรุ่งนี้");
    if (r.outlook[0].uv) assert.deepEqual([r.outlook[0].uv.text, r.outlook[0].uv.level], ["0", 0]);
  }
  const morning = assess(full(at(13.7563, 100.5018), { now: Date.parse("2026-10-24T02:00:00Z") }), "th");
  assert.equal(morning.outlook[0].name, "วันนี้");
});

test("S4: the dust card's 'today' is marked as expected, not read against the measured 24-h mean", () => {
  const r = assess(full(at(13.7563, 100.5018)), "th");
  const d0 = card(r, "pm25").days?.[0];
  assert.ok(d0, "the fixture has a dust outlook");
  assert.equal(d0.sub, "คาด");
});

test("KI-008/V17: a river that doesn't judge the point carries no status word with ≥ 1 m to spare; the tile's gauge is named", () => {
  for (const lang of ["th", "en"]) {
    const c = card(assess(full(at(13.7563, 100.5018)), lang), "flood");
    const outside = c.lines.filter((l) => /นอกแนวคัน|outside the walls/.test(l));
    assert.ok(outside.length, "the Bangkok fixture has a river gauge outside the walls");
    for (const l of outside) assert.doesNotMatch(l, /ใกล้ล้นตลิ่ง|near the bank|เฝ้าระวัง|watch/i, l);
    const named = c.lines.find((l) => /ตัวเลขบนป้ายน้ำท่วม|the flood tile's number/.test(l));
    assert.ok(named, "one line names the tile's gauge");
    const cm = (s) => s.match(/(\d[\d,]*)\s*(?:ซม|cm)/)?.[1];
    assert.equal(cm(named), cm(c.value), "the named gauge is the tile's number");
  }
});

test("S6: no heat number or 'danger' line for a window with no afternoon left (the correction is for daily maxima)", () => {
  const ens = jx("ens_bkk.json");
  const at18 = buildOutlook(ens, Date.parse("2026-10-24T11:00:00Z")); // 18:00 in Bangkok
  assert.equal(at18.days[0].heat, null);
  assert.ok(at18.days[1].heat && at18.next24.heat, "tomorrow and the tile's 24 h keep theirs");
  assert.ok(!prewarnings(at18).some((x) => x.hazard === "heat" && x.day === 0));
  const r = assess(full(at(13.7563, 100.5018), { now: Date.parse("2026-10-24T11:00:00Z") }), "th");
  assert.equal(r.outlook[0].heat, null);
  assert.ok(!card(r, "heat").days.some((d) => d.name === "คืนนี้" || d.name === "วันนี้"));
  // before 16:00 the rest of today still holds the afternoon peak
  assert.ok(buildOutlook(ens, Date.parse("2026-10-24T07:30:00Z")).days[0].heat); // 14:30
});

test("U2/U20: a province opens its town's subdistrict and a district its seat, by code (#t=), labelled when drawn", async () => {
  const { localSearch, hitPlace } = await import("../public/js/places.js");
  const cm = hitPlace(localSearch(TAMBON, "เชียงใหม่")[0]);
  assert.deepEqual([cm.source, cm.code, cm.name], ["tambon", 500101, ""]); // ต.ศรีภูมิ, not a mountain 40 km away
  assert.equal(nearestTambon(TAMBON, cm.lat, cm.lon).code, 500101);
  for (const [q, code] of [["ภูเก็ต", 830101], ["ขอนแก่น", 400101], ["อุบลราชธานี", 340101], ["กรุงเทพมหานคร", 100101]]) {
    assert.equal(hitPlace(localSearch(TAMBON, q)[0]).code, code, q);
  }
  const mr = localSearch(TAMBON, "แม่ริม").find((h) => h.kind === "a");
  assert.equal(hitPlace(mr).code, 500701); // อ.แม่ริม's seat, ต.ริมใต้
  // a district whose xx01 no longer exists opens its lowest-coded subdistrict (14 of 928, e.g. เขตบางเขน)
  const bkn = localSearch(TAMBON, "บางเขน").find((h) => h.kind === "a");
  assert.ok(Math.floor(hitPlace(bkn).code / 100) === 1005);
});

test("U3/U25: the heat tile is the afternoon its label names, said as 'feels like'", () => {
  for (const [iso, label, day] of [["2026-10-23T19:50:00Z", "บ่ายนี้", 0], ["2026-10-24T09:30:00Z", "บ่ายพรุ่งนี้", 1]]) {
    const r = assess(full(at(13.7563, 100.5018), { now: Date.parse(iso) }), "th");
    const h = card(r, "heat");
    assert.ok(h.value.startsWith(`${label} รู้สึกเหมือน `), h.value);
    // the tile's number is the same window's as the table's cell for that day
    const cell = r.outlook[day].heat || r.outlook[1].heat;
    assert.equal(h.value.match(/(\d+) °C/)[1], cell.text.replace("°", ""), `${iso}: tile ${h.value} vs table ${cell.text}`);
  }
  const en = card(assess(full(at(13.7563, 100.5018)), "en"), "heat");
  assert.match(en.value, /^This afternoon: feels like \d+ °C$/);
});

test("U4: under a TMD warning the card's day chips say so, as the table does", () => {
  const w = parseCap(fx("tmd_cap_item.xml"));
  const r = assess(full(at(7.0086, 100.4747), { warnings: { items: [w] } }), "th");
  const chips = card(r, "rain").days;
  assert.equal(chips[0].text, "📢 เตือนภัย");
  assert.equal(chips[0].level, r.outlook[0].rain.level, "the chip takes the warning's level, as the table's cell does");
  assert.notEqual(chips[1].text, "📢 เตือนภัย", "the warning ends 08:00 on day 0: tomorrow keeps the model's word");
});

test("U5: the rain tile's word is the gauge's only when the gauge raised it", () => {
  const r = card(assess(full(at(13.7563, 100.5018)), "th"), "rain");
  assert.notEqual(r.word, "ไม่มีฝน", "yesterday's dry gauge is not today's word");
  assert.equal(r.word, "ยังไม่น่าห่วง");
});

test("U8/U15: today's far or small quakes are counted on the tile; felt words only from M5.5 at the low band", () => {
  const tmdQuakes = { items: [
    { time: "2026-10-24T02:31:00+07:00", lat: 18.9, lon: 102.6, mag: 4.2, depth: 10, placeTh: "ประเทศลาว", place: "ประเทศลาว" },
    { time: "2026-10-24T01:33:00+07:00", lat: 18.8, lon: 102.5, mag: 1.8, depth: 10, placeTh: "ประเทศลาว", place: "ประเทศลาว" },
  ] };
  const kk = at(16.43, 102.83); // Khon Kaen, about 265–275 km away (the list's radius is 300 km)
  const q = card(assess(full(kk, { tmdQuakes, emsc: { features: [] }, usgs: { features: [] } }), "th"), "quake");
  assert.equal(q.level, 0);
  assert.match(q.word, /^24 ชม\. นี้ 2 ครั้ง/);
  for (const l of q.lines.filter((x) => /ขนาด [14]\./.test(x))) assert.doesNotMatch(l, /รู้สึก/, l);
});

test("U9: in the verdict the heat band is named as a level, so 'เตือนภัย' isn't read as TMD's notice", () => {
  for (const lang of ["th", "en"]) {
    const r = assess(full(at(13.7563, 100.5018)), lang);
    const heat = [r.verdict.worst, ...r.verdict.others].find((i) => i && i.id === "heat");
    assert.ok(heat, "the Bangkok fixture's verdict names heat");
    assert.match(heat.word, lang === "en" ? / level$/ : /^ระดับ/);
  }
});

test("U14/U21/U24: words that say what the data says", () => {
  const p = at(18.79, 98.99);
  const ls = card(assess(full(p, { dmrSlide: { count: 2 } }), "th"), "landslide");
  if (ls.level === 0) assert.equal(ls.word, "ใกล้หมู่บ้านเสี่ยง ฝนยังไม่มาก");
  const rain = card(assess(full(at(13.7563, 100.5018)), "th"), "rain");
  assert.doesNotMatch(rain.lines.join(" "), /ราว ไม่ถึง|ราว เกิน/);
  const wind = card(assess(full(at(13.7563, 100.5018), { gdacs: undefined, errors: { gdacs: "timeout" } }), "th"), "wind");
  assert.ok(wind.lines.some((l) => /GDACS ไม่ได้/.test(l)), wind.lines.join(" | "));
});

test("U16: UV's first day is the rest of today, like every other column", () => {
  const morning = assess(full(at(13.7563, 100.5018), { now: Date.parse("2026-10-24T01:00:00Z") }), "th"); // 08:00
  const late = assess(full(at(13.7563, 100.5018), { now: Date.parse("2026-10-24T08:30:00Z") }), "th"); // 15:30
  assert.ok(+late.outlook[0].uv.text < +morning.outlook[0].uv.text, `${late.outlook[0].uv.text} vs ${morning.outlook[0].uv.text}`);
  assert.match(card(late, "uv").lines[0], /พรุ่งนี้/);
});

test("X8: a CAP Update or Cancel replaces the notices it references; the replaced ones leave the page", async () => {
  const { inForce } = await import("../tools/collect.mjs");
  const now = Date.parse("2026-10-22T10:00:00Z");
  const base = { status: "Actual", expires: "2026-10-22T18:00:00+07:00", references: [] };
  const alert = { ...base, id: "A", msgType: "Alert" };
  const update = { ...base, id: "B", msgType: "Update", references: ["A"] };
  const cancel = { ...base, id: "C", msgType: "Cancel", references: ["B"] };
  assert.deepEqual(inForce([alert], now).map((w) => w.id), ["A"]);
  assert.deepEqual(inForce([alert, update], now).map((w) => w.id), ["B"]);
  assert.deepEqual(inForce([alert, update, cancel], now).map((w) => w.id), []);
  assert.deepEqual(inForce([{ ...alert, status: "Exercise" }, { ...alert, id: "D", expires: "2026-10-22T08:00:00+07:00" }], now), []);
  // the parser reads <references> ("sender,identifier,sent" entries)
  const xml = fx("tmd_cap_item.xml").replace("</msgType>", "</msgType><references>tmd@tmd.go.th,TMD-OLD-1,2026-10-22T10:00:00+07:00 tmd@tmd.go.th,TMD-OLD-2,2026-10-22T11:00:00+07:00</references>");
  assert.deepEqual(parseCap(xml).references, ["TMD-OLD-1", "TMD-OLD-2"]);
});

test("X3: the heat number never sits below its own word's band (41.978 shows 42 under อันตราย)", async () => {
  const { heatNum } = await import("../public/js/assess.js");
  for (const v of [41.978, 41.94, 42, 32.96, 33.04, 26.96, 51.97]) {
    assert.equal(band("heat", heatNum(v)).level, band("heat", v).level, `${v} → ${heatNum(v)}`);
    assert.ok(heatNum(v) <= Math.round(v), "never above the rounded value");
  }
});

test("X10: the English page links to บ้านรอดไหม's English guides", () => {
  const en = assess(full(at(13.7563, 100.5018)), "en");
  const th = assess(full(at(13.7563, 100.5018)), "th");
  for (const c of en.cards) if (c.link?.href.includes("baanrodmai")) assert.match(c.link.href, /autobahn\.bot\/en\//, c.id);
  for (const c of th.cards) if (c.link?.href.includes("baanrodmai")) assert.doesNotMatch(c.link.href, /\/en\//, c.id);
});

// ---------- the model check of 24 Oct 2026 (docs/research/model-check-2026-10-24.md) ----------

test("model check §4.2: the ensemble is asked for the grid cell's own height, as the correction was fitted", async () => {
  const { urls } = await import("../public/js/sources.js");
  assert.match(urls({ lat: 9.13, lon: 99.33 }, NOW).ens, /[?&]elevation=nan(&|$)/);
});

test("model check §4.1: the heat correction gets each member's max of 13:00 and 16:00, as it was fitted", async () => {
  const { heatMembers, predictorIndex, perMemberAt, summarizeHeat } = await import("../public/js/outlook.js");
  const { HEAT } = await import("../public/js/calibration.js");
  const ens = jx("ens_bkk.json");
  const o = buildOutlook(ens, NOW);
  const d = o.days[1];
  const idx = predictorIndex(ens.hourly.time, d.i0, d.i1);
  assert.deepEqual(idx.map((i) => ens.hourly.time[i].slice(11, 16)), ["13:00", "16:00"]);
  const expect = summarizeHeat(perMemberAt(heatMembers(ens.hourly), idx), HEAT.lead1);
  assert.equal(d.heat.p50, expect.p50);
  assert.equal(d.heat.method, "C0", "October: the year-round line");
});

test("D-046: Nov–Feb uses C6 (corrected T and Td, then the heat index); in dry cool air it is milder than the line", async () => {
  const { HEAT, dewPoint, rhFrom } = await import("../public/js/calibration.js");
  const { heatIndexC } = await import("../public/js/heat.js");
  // dew point and RH are each other's inverse (Magnus 17.625 / 243.04)
  for (const [t, rh] of [[30, 50], [33, 75], [24, 90]]) assert.ok(Math.abs(rhFrom(t, dewPoint(t, rh)) - rh) < 1e-9);
  // a synthetic December day: 51 members at 30 °C and 50 % at 13:00 and 16:00
  const time = []; const T = []; const RH = [];
  for (let d = 10; d <= 13; d++) for (let hh = 0; hh < 24; hh++) {
    time.push(`2026-12-${d}T${String(hh).padStart(2, "0")}:00`);
    T.push(hh >= 12 && hh <= 16 ? 30 : 24); RH.push(hh >= 12 && hh <= 16 ? 50 : 85);
  }
  const hourly = { time, temperature_2m: T, relative_humidity_2m: RH, precipitation: T.map(() => 0), wind_gusts_10m: T.map(() => 10) };
  for (let m = 1; m <= 50; m++) {
    const k = String(m).padStart(2, "0");
    Object.assign(hourly, { [`temperature_2m_member${k}`]: T, [`relative_humidity_2m_member${k}`]: RH, [`precipitation_member${k}`]: T.map(() => 0), [`wind_gusts_10m_member${k}`]: T.map(() => 10) });
  }
  const o = buildOutlook({ hourly, utc_offset_seconds: 25200 }, Date.parse("2026-12-10T00:30:00Z"));
  const d1 = o.days[1];
  assert.equal(d1.heat.method, "C6");
  const k = HEAT.cool.lead1;
  const expect = heatIndexC(30 + k.dT, rhFrom(30 + k.dT, dewPoint(30, 50) + k.dTd)) + k.c;
  assert.ok(Math.abs(d1.heat.p50 - expect) < 1e-9, `${d1.heat.p50} vs ${expect}`);
  const line = HEAT.lead1.a + HEAT.lead1.b * heatIndexC(30, 50);
  assert.ok(line - d1.heat.p50 > 2, `the line ${line.toFixed(1)} vs C6 ${d1.heat.p50.toFixed(1)}: the line runs hot in dry cool air`);
});

test("S12: the collector's files count only while fresh (KV keeps the last upload when the server stops)", async () => {
  const { liveFresh, LIVE_MAX_AGE_H } = await import("../public/js/sources.js");
  const now = Date.parse("2026-10-24T09:00:00Z");
  assert.equal(LIVE_MAX_AGE_H, 2);
  assert.ok(liveFresh({ generated: "2026-10-24T08:45:00Z" }, now));
  assert.ok(liveFresh({ generated: "2026-10-24T07:01:00Z" }, now));
  assert.ok(!liveFresh({ generated: "2026-10-24T06:59:00Z" }, now));
  assert.ok(!liveFresh({ files: {} }, now), "no time, no trust");
  assert.ok(!liveFresh({ generated: "2026-10-25T09:00:00Z" }, now), "a clock far in the future isn't trusted either");
});

// ---------- the prediction research of 24 Oct 2026 (docs/research/predict-air-2026-10-24.md) ----------

test("PM2.5 chance (predict-air §7.1): only Dec–Apr, only tomorrow and after, 50 % at the band edge", async () => {
  const { dustChance } = await import("../public/js/airq.js");
  const c = (f, date = "2026-12-10", i = 1) => dustChance({ mean: f, date }, i);
  assert.ok(Math.abs(c(37.5).warn - 0.5) < 1e-9, "the chance adds words, not levels");
  assert.ok(Math.abs(c(28.1).warn - 0.2) < 0.005 && Math.abs(c(60).harm - 0.258) < 0.005);
  assert.ok(c(50, "2026-12-10", 2).warn < c(50).warn, "the day after is wider (σ 0.380 vs 0.343)");
  assert.equal(c(50, "2026-10-25"), null, "October is outside the fitted domain");
  assert.equal(c(50, "2026-05-02"), null);
  assert.equal(c(50, "2026-12-10", 0), null, "never the rest of today");
});

test("PM2.5 chance on the page: the card's words, the pre-warning's chance, a station only", () => {
  const shift = (f) => JSON.parse(fx(f).replaceAll("2026-10-", "2026-12-"));
  const dec = { now: NOW + 61 * 864e5, ens: shift("ens_bkk.json"), aq: shift("aq_bkk.json"), a4t: shift("a4t.json"), gistda: shift("gistda_loc.json") };
  const pm = card(assess(full(at(13.7563, 100.5018), dec), "th"), "pm25");
  const line = pm.lines.find((l) => l.includes("โอกาสที่ฝุ่นเฉลี่ยทั้งวันจะถึงระดับ “เริ่มมีผลกระทบต่อสุขภาพ”"));
  assert.ok(line && line.startsWith("พรุ่งนี้ "), JSON.stringify(pm.lines));
  assert.doesNotMatch(line, /ราว (ไม่ถึง|เกิน)/);
  assert.match(pm.note, /ใช้ชั่วคราว/);
  // the same day in October: no chance line
  const oct = card(assess(full(at(13.7563, 100.5018)), "th"), "pm25");
  assert.ok(!oct.lines.some((l) => l.includes("โอกาสที่ฝุ่น")));
  // without a station (GISTDA's estimate as input): no chance line
  const est = card(assess(full(at(13.7563, 100.5018), { ...dec, a4t: undefined, errors: { a4t: "HTTP 503" } }), "th"), "pm25");
  assert.ok(!est.lines.some((l) => l.includes("โอกาสที่ฝุ่น")));
});

test("PCD's 7-day dust forecast image: one region per province", async () => {
  const { pcdForecastImage } = await import("../public/js/assess.js");
  const r = (pv) => pcdForecastImage(pv).match(/forecast_img_(\w+)\.png$/)[1];
  assert.deepEqual([10, 12, 50, 63, 67, 40, 34, 20, 26, 83, 90, 71, 15].map(r),
    ["bkk", "bkk", "north", "north", "north", "esan", "esan", "east", "centralwest", "south", "south", "centralwest", "centralwest"]);
  assert.match(pcdForecastImage(50), /^https:\/\/air4thai\.pcd\.go\.th\//);
});

test("predict-earthquake: the Bangkok term only for crustal quakes, the domain it was fitted on", async () => {
  const { inSiteDomain } = await import("../public/js/quake.js");
  const mandalay = { lat: 22.0, lon: 95.9, depth: 10, mag: 7.7, t: NOW - 3600e3 };
  const sumatra = { lat: 2.3, lon: 93.0, depth: 20, mag: 8.6, t: NOW - 3600e3 };
  const deep = { lat: 23.0, lon: 95.0, depth: 120, mag: 6.5, t: NOW - 3600e3 };
  assert.ok(inSiteDomain(mandalay) && !inSiteDomain(sumatra) && !inSiteDomain(deep));
  const withTerm = (q) => quakesForPoint([q], 13.75, 100.5, NOW, IPE, { site: BKK_MMI_TERM })[0];
  const noTerm = (q) => quakesForPoint([q], 13.75, 100.5, NOW, IPE)[0];
  assert.ok(Math.abs(withTerm(mandalay).mmi - noTerm(mandalay).mmi - BKK_MMI_TERM) < 1e-9);
  assert.equal(withTerm(sumatra)?.mmi, noTerm(sumatra)?.mmi, "no term for an offshore subduction quake");
});

test("predict-earthquake: the card says what can't be predicted, and where early warning exists", () => {
  for (const lang of ["th", "en"]) {
    const q = card(assess(full(at(13.7563, 100.5018)), lang), "quake");
    assert.match(q.note, lang === "en" ? /^No one can predict when, where or how big/ : /^แผ่นดินไหวยังพยากรณ์ล่วงหน้าไม่ได้ว่าจะเกิดเมื่อไร ที่ไหน แรงแค่ไหน/);
    const eew = q.lines.find((l) => l.startsWith("📱"));
    assert.ok(eew && (lang === "en" ? /only shows quakes after they happen/ : /หลังเกิดแล้วเท่านั้น/).test(eew), eew);
    assert.doesNotMatch(q.lines.join(" "), /โอกาสเกิดแผ่นดินไหว|chance of an earthquake/i, "no earthquake chance of our own");
  }
});

test("predict-earthquake: the province's seismic zone, as the 2564 regulation words it, equal to the Gazette file", async () => {
  const { SEISMIC_ZONE } = await import("../public/js/assess.js");
  const z = JSON.parse(readFileSync(new URL("../research/data/eq_zones_2564.json", import.meta.url), "utf8"));
  for (const [zone, codes] of Object.entries(z.province_codes)) for (const c of codes) assert.equal(SEISMIC_ZONE[+c], +zone, `province ${c}`);
  assert.equal(Object.keys(SEISMIC_ZONE).length, 43);
  const line = (lat, lon, lang = "th") => assess(full(at(lat, lon)), lang).profile.find((p) => p.icon === "🏢")?.text;
  assert.match(line(18.79, 98.99), /"บริเวณที่ 3": อาคารอาจได้รับผลกระทบจากแผ่นดินไหวในระดับสูง \(ความเสี่ยงระยะยาว ไม่ใช่การทำนาย\)/);
  assert.match(line(13.7563, 100.5018), /"บริเวณที่ 2"/);
  assert.match(line(16.43, 102.83), /ไม่อยู่ในบริเวณ.*ไม่ได้แปลว่าไม่มีแผ่นดินไหว/);
  assert.match(line(18.79, 98.99, "en"), /zone 3: .*\(long-term hazard, not a prediction\)$/);
  assert.doesNotMatch(line(16.43, 102.83), /ปลอดภัย/);
});

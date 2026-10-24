// Tests for the flood path's new feeds: FloodWatch's own gauges through the collector (floodwatch.json) and the measured
// rain over 3 days (rain3d.json). Fixtures: FloodWatch's /api/stations (14 gauges) and /api/risks, 24 Oct 2026 20:10 UTC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseFloodWatch, fwGroups, parseRain24, rainDays, RAIN_SHOW_MM, packSnap, unpackSnap } from "../tools/collect.mjs";
import { fwRows, nearFw, fwWatch, fwOutlook, nearRainDays } from "../public/js/water.js";
import { assess } from "../public/js/assess.js";
import { nearestTambon } from "../public/js/geo.js";

const jx = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));
const TAMBON = JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-24T20:20:00Z");
const FILE = { ...parseFloodWatch(jx("fw_stations.json"), jx("fw_risks.json")), fetched: "2026-10-24T20:12:00Z" };
const row = (code) => fwRows(FILE, NOW).byCode[code];
const card = (b, id, lang = "th") => assess({ now: NOW, errors: {}, ...b }, lang).cards.find((c) => c.id === id);
const at = (code) => { const r = row(code); return { lat: r.lat, lon: r.lon, place: nearestTambon(TAMBON, r.lat, r.lon) }; };

test("collector: FloodWatch's stations and risks become compact rows with FloodWatch's own groups", () => {
  assert.equal(FILE.rows.length, 14);
  const g = fwGroups(jx("fw_risks.json"));
  assert.deepEqual(g.get("TNG004"), ["upstream", "STU004", "ควนกาหลง", 9, 248]);
  assert.deepEqual(g.get("TNG005"), ["may_reach", "25-50%", 24]);
  assert.equal(g.get("STU001")[0], "over_bank");
  assert.ok(!g.has("ยะลา"), "the rain group lists provinces, not gauges");
  // Hat Yai's chain keeps FloodWatch's learned travel times (X.44 ← X.90 6 h)
  assert.deepEqual(row("X.44").up.find((u) => u[0] === "X.90"), ["X.90", 6]);
  assert.equal(FILE.records.bank_24[">50%"].n, 459);
});

test("FloodWatch's look ahead reaches the flood card, with how often it came true", () => {
  // วังวิเศษ is near its bank now (FloodWatch: warning, 94 %): the measured level leads, the look ahead is a line
  const may = card({ point: at("TNG005"), fwLive: FILE }, "flood");
  assert.equal(may.level, 2);
  assert.equal(may.word, "ใกล้ล้นตลิ่ง");
  assert.ok(may.lines[0].startsWith("📈 FloodWatch: วังวิเศษ") && may.lines[0].includes("เกิดจริง 14%"), may.lines[0]);
  // the same forecast at a gauge that reads normal: 25–50 % came true 14 % of the time → เฝ้าระวัง at most, said as such
  const calm = { ...FILE, rows: FILE.rows.map((r) => (r[0] === "TNG005" ? Object.assign([...r], { 5: "normal" }) : r)) };
  const may2 = card({ point: at("TNG005"), fwLive: calm }, "flood");
  assert.equal(may2.level, 1);
  assert.equal(may2.word, "อาจถึงตลิ่ง (FloodWatch)");
  const up = card({ point: at("TNG004"), fwLive: FILE }, "flood", "en");
  // a range, never a countdown: within about 2 × FloodWatch's lag, or sooner (lead-time §6)
  assert.match(up.lines[0], /^⬆️ Water from upstream: ควนกาหลง rose 248 cm in 24 h; its water usually reaches ปะเหลียน .* within about 18 h, or sooner/);
  assert.ok(up.src.some((s) => s.model && /FloodWatch/.test(s.name)));
  const fast = card({ point: at("MDC001"), fwLive: FILE }, "flood");
  assert.equal(fast.level, 1); // normal now (57 % of the bank), a fast rise forecast: เฝ้าระวัง
  assert.equal(fast.word, "น้ำขึ้นเร็ว (FloodWatch)");
  assert.match(fast.lines[0], /จะขึ้นเร็ว ราว 85 ซม\. ใน 24 ชม\./);
  // only a gauge that judges the point: the same forecast 12 km away (beyond the area index's 8 km) says nothing here.
  // Live, 24 Oct 2026: a sluice gate 12.6 km away across the river turned Lat Phrao orange before this rule
  const far = { lat: row("TNG005").lat + 0.11, lon: row("TNG005").lon };
  const fc = card({ point: { ...far, place: nearestTambon(TAMBON, far.lat, far.lon) }, fwLive: calm }, "flood");
  assert.ok(!fc.lines.some((l) => l.includes("📈")) && fc.level === -1, fc.lines.join(" | "));
  // near the bank and over the bank are measured: the gauge lines say them, so no look-ahead line repeats them
  assert.equal(fwWatch(nearFw(fwRows(FILE, NOW), row("STU001").lat, row("STU001").lon), FILE.records), null);
});

test("KI-007: the flood tile reads FloodWatch's own rows when its file is fresh, ThaiWater's otherwise", () => {
  const c = card({ point: at("C.12"), fwLive: FILE }, "flood");
  assert.ok(c.src.some((x) => /ตามที่ FloodWatch อ่าน/.test(x.name)), JSON.stringify(c.src));
  assert.ok(c.lines.some((l) => l.startsWith("สะพานพระราม 8") || l.includes("C.12") || /ต่ำกว่าตลิ่ง 154 ซม\./.test(l)), c.lines.join(" | "));
  // Hat Yai's RID gauges were over 3 h old at 20:10 UTC (FloodWatch: stale): they are not used; HII's SLA007 is
  const hy = card({ point: { lat: 7.0, lon: 100.47, place: nearestTambon(TAMBON, 7.0, 100.47) }, fwLive: FILE }, "flood");
  assert.ok(!hy.lines.some((l) => l.startsWith("บ้านหาดใหญ่ใน")), hy.lines.join(" | "));
  // KI-008: C.12 is a river outside the walls with 1.54 m to spare: listed without a word, and no "91 %" reason or
  // outlook under it either
  assert.ok(!c.lines.some((l) => /91%|FloodWatch คาด/.test(l)), c.lines.join(" | "));
  const tw = assess({ now: Date.parse("2026-10-23T19:50:00Z"), errors: {}, point: at("C.12"), twLevel: jx("tw_wl_bkk.json") }).cards.find((x) => x.id === "flood");
  assert.ok(tw.src.some((x) => /คลังข้อมูลน้ำ/.test(x.name)), JSON.stringify(tw.src));
});

test("a FloodWatch file older than 2 h is missing, never calm (S12's rule)", () => {
  assert.equal(fwRows({ ...FILE, fetched: "2026-10-24T17:00:00Z" }, NOW), null);
  const c = card({ point: at("TNG005"), fwLive: { ...FILE, fetched: "2026-10-24T17:00:00Z" } }, "flood");
  assert.ok(!c.lines.some((l) => l.includes("FloodWatch")), c.lines.join(" | "));
  assert.equal(c.level, -1);
});

test("FloodWatch's 24-h outlook only when it beats no change and its range is narrow", () => {
  assert.equal(fwOutlook({ c24: [0, 0, -0.03, 0.03, 0, "steady"] }), null); // persistence: skill 0
  assert.equal(fwOutlook({ c24: [1, 0.5, 0.1, 1.2, 0.3, "rise"] }), null); // wider than 0.75 m (FloodWatch's WIDE_LIKELY_M)
  assert.deepEqual(fwOutlook({ c24: [1, 0.2, 0.1, 0.3, 0.26, "rise"] }), { dir: 1, median: 0.2, lo: 0.1, hi: 0.3, skill: 0.26 });
});

test("rain over 3 days: hourly snapshots add up; a missing part is unknown, never less", () => {
  const H = 3.6e6;
  const t0 = NOW - 0.5 * H;
  const snap = (dt, v) => ({ at: t0 - dt * H, r: { A: [v, t0 - dt * H, "ก", 7, 100.5], B: [v, t0 - dt * H, "ข", 7.1, 100.5] } });
  const snaps = [snap(48.5, 120), snap(24.3, 200), snap(0, 150)];
  delete snaps[0].r.B; // B has no reading 48 h back
  const rows = rainDays(snaps, NOW);
  assert.deepEqual(rows.find((r) => r[0] === "A").slice(4, 7), [150, 350, 470]);
  assert.deepEqual(rows.find((r) => r[0] === "B").slice(4, 7), [150, 350, null]);
  // a reading more than 90 min off "24 h before" doesn't count
  assert.deepEqual(rainDays([snap(26, 200), snap(0, 150)], NOW).map((r) => r[5]), []);
  assert.equal(rainDays([snap(24, 10), snap(0, 20)], NOW).length, 0, `under ${RAIN_SHOW_MM} mm is not published`);
  // the disk format (mm, minutes before the snapshot) gives the same totals, and drops readings over 3 h old
  const disk = snaps.map((x) => unpackSnap(JSON.parse(JSON.stringify(packSnap(x.at, x.r))), { A: ["ก", 7, 100.5], B: ["ข", 7.1, 100.5] }));
  assert.deepEqual(rainDays(disk, NOW), rows);
  assert.deepEqual(packSnap(t0, { C: [5, t0 - 4 * H] }).r, {});
});

test("collector: ThaiWater's rain_24h parses to readings with their Bangkok times", () => {
  const r = parseRain24(jx("tw_rain_bkk.json"));
  const v = Object.values(r);
  assert.ok(v.length > 20);
  assert.ok(v.every(([mm, t, , lat, lon]) => mm >= 0 && mm < 999990 && Number.isFinite(t) && lat > 5 && lon > 97));
});

test("the rain card shows the measured 3-day total near the point, and nothing from a stopped feed", () => {
  const file = { fetched: "2026-10-24T20:05:00Z", rows: [["X1", "หาดใหญ่", 7.01, 100.47, 150, 350, 470, "2026-10-24T19:45Z"]] };
  const p = { lat: 7.0, lon: 100.47, place: nearestTambon(TAMBON, 7.0, 100.47) };
  const c = card({ point: p, rain3d: file, twRain: { data: [] } }, "rain");
  assert.ok(c.lines.some((l) => l === "ฝนสะสมที่วัดได้ 3 วัน (72 ชม.): 470 มม. ที่หาดใหญ่ (ห่าง 1.1 กม.)"), c.lines.join(" | "));
  assert.equal(nearRainDays({ ...file, fetched: "2026-10-24T17:00:00Z" }, 7.0, 100.47, NOW), null);
  assert.equal(nearRainDays(file, 7.3, 100.47, NOW), null, "farther than 10 km");
});

test("FloodWatch down: the flood card says the gauges come straight from ThaiWater", () => {
  const c = card({ point: at("C.12"), fwDown: "2026-10-24T20:05:00Z" }, "flood");
  assert.ok(c.lines.some((l) => l.startsWith("FloodWatch ไม่ตอบเมื่อตัวเก็บข้อมูลของเว็บนี้ตรวจล่าสุด")), c.lines.join(" | "));
  assert.ok(!card({ point: at("C.12"), fwLive: FILE, fwDown: "2026-10-24T20:05:00Z" }, "flood").lines.some((l) => l.includes("ไม่ตอบ")),
    "a fresh file from an earlier run is still FloodWatch's answer");
});

test("upstream lines A/B/C (floodwatch-hatyai-leadtime §6): Hat Yai's chain, and when to say nothing", () => {
  const ix = Object.fromEntries(FILE.cols.map((k, i) => [k, i]));
  const fresh = "2026-10-24T19:50Z";
  const patch = (changes) => ({ ...FILE, rows: FILE.rows.map((r) => {
    const c = changes[r[0]];
    if (!c) return r;
    const out = [...r];
    for (const [k, v] of Object.entries(c)) out[ix[k]] = v;
    return out;
  }) });
  const hy = { lat: row("X.44").lat, lon: row("X.44").lon, place: nearestTambon(TAMBON, row("X.44").lat, row("X.44").lon) };
  const city = { stale: 0, obs: fresh, status: "normal", freeboard: 2.0 };
  // A: X.90 (6 h above X.44) over its bank and rising, the city's gauge under its bank → เตรียมตัว on the U-Taphao
  const a = card({ point: hy, fwLive: patch({ "X.44": city, "X.90": { stale: 0, obs: fresh, status: "critical", freeboard: -0.3, rise24: 60, r2: 0.8 } }) }, "flood");
  assert.equal(a.level, 2);
  assert.equal(a.word, "น้ำจากต้นน้ำ (FloodWatch)");
  assert.match(a.lines[0], /^⬆️ ต้นน้ำล้นตลิ่งแล้ว: บ้านบางศาลา \(คลองอู่ตะเภา\) สูงกว่าตลิ่ง 30 ซม\. และยังขึ้น \(60 ซม\. ใน 24 ชม\.\) น้ำจากจุดนั้นมักถึงบ้านหาดใหญ่ในภายในราว 12 ชม\. หรือเร็วกว่านั้น/);
  // B: near its bank → ติดตามไว้ at most
  const bb = card({ point: hy, fwLive: patch({ "X.44": city, "X.90": { stale: 0, obs: fresh, status: "warning", freeboard: 0.5, rise24: 60, r2: 0.8 } }) }, "flood");
  assert.equal(bb.level, 1);
  assert.match(bb.lines[0], /^⬆️ ต้นน้ำใกล้ล้นตลิ่ง: บ้านบางศาลา/);
  // C: the city's gauge already over its bank (measured: ทำทันที), upstream still rising → "may rise further", no change
  const cc = card({ point: hy, fwLive: patch({ "X.44": { ...city, status: "critical", freeboard: -0.2 }, "X.90": { stale: 0, obs: fresh, status: "warning", freeboard: 0.4, rise24: 45, r2: 0.9 } }) }, "flood");
  assert.equal(cc.level, 3);
  assert.match(cc.lines[0], /^⬆️ ต้นน้ำยังขึ้นอยู่: บ้านบางศาลา ขึ้น 45 ซม\./);
  // nothing: a one-reading spike (no fit), a twin, a stale upstream gauge (then, with the city at watch, its age)
  const spike = card({ point: hy, fwLive: patch({ "X.44": city, "X.90": { stale: 0, obs: fresh, status: "critical", freeboard: -0.3, rise24: 300, r2: 0.2 } }) }, "flood");
  assert.ok(!spike.lines.some((l) => l.startsWith("⬆️")), spike.lines.join(" | "));
  const twin = card({ point: hy, fwLive: patch({ "X.44": { ...city, twin: "X.90" }, "X.90": { stale: 0, obs: fresh, status: "critical", freeboard: -0.3, rise24: 60, r2: 0.8 } }) }, "flood");
  assert.ok(!twin.lines.some((l) => l.startsWith("⬆️ ต้นน้ำ")), "a twin is the same site, never upstream");
  const late = card({ point: hy, fwLive: patch({ "X.44": { ...city, status: "watch" }, "X.90": { status: "critical", freeboard: -0.3, rise24: 60, r2: 0.8 }, SLA002: { stale: 1 } }) }, "flood");
  assert.ok(late.lines.some((l) => /^ข้อมูลต้นน้ำล่าสุดเมื่อ \d+ ชม\.ก่อน/.test(l)), late.lines.join(" | "));
  assert.ok(!late.lines.some((l) => /ต้นน้ำปกติ|ลดแล้ว/.test(l)), "never calm from missing or falling upstream data");
  // one upstream gauge read in time is an answer: no "late" line beside it (live, Palian, 24 Oct: FloodWatch's own line
  // named a fresh upstream rise and the late line said the upstream data were 5 h old)
  const one = card({ point: hy, fwLive: patch({ "X.44": { ...city, status: "watch" }, "X.90": { status: "critical", freeboard: -0.3, rise24: 60, r2: 0.8 },
    SLA002: { stale: 1 }, "X.174": { stale: 0, obs: fresh, status: "normal", freeboard: 3, rise24: 5, r2: 0.9 } }) }, "flood");
  assert.ok(!one.lines.some((l) => l.startsWith("ข้อมูลต้นน้ำล่าสุด")), one.lines.join(" | "));
});

test("Hat Yai's red-flag rain: more than 300 mm measured in 3 days lifts the rain tile to เตรียมตัว, with the source", () => {
  const p = { lat: 7.0, lon: 100.47, place: nearestTambon(TAMBON, 7.0, 100.47) };
  const f = (r72) => ({ fetched: "2026-10-24T20:05:00Z", rows: [["X1", "หาดใหญ่", 7.01, 100.47, 150, 220, r72, "2026-10-24T19:45Z"]] });
  const hi = card({ point: p, rain3d: f(326), twRain: { data: [] } }, "rain");
  assert.equal(hi.level, 2);
  assert.equal(hi.word, "ฝน 3 วันเกิน 300 มม.");
  assert.ok(hi.lines.some((l) => l.startsWith("ฝนเกิน 300 มม. ใน 3 วัน: หาดใหญ่ใช้ค่านี้เป็นเกณฑ์ธงแดง")), hi.lines.join(" | "));
  const lo = card({ point: p, rain3d: f(290), twRain: { data: [] } }, "rain");
  assert.ok(lo.level < 2 && !lo.lines.some((l) => l.includes("ธงแดง")), "under the line: the total in words only");
});

test("no gauge within 8 km: the flood card has no number and names none as the tile's (live, Hat Yai, 24 Oct)", () => {
  const p = { lat: 7.0, lon: 100.47, place: nearestTambon(TAMBON, 7.0, 100.47) };
  const c = card({ point: p, fwLive: FILE }, "flood");
  assert.equal(c.level, -1);
  assert.ok(!c.value, `value "${c.value}"`);
  assert.ok(!c.lines.some((l) => l.includes("ตัวเลขบนป้ายน้ำท่วม")), c.lines.join(" | "));
});

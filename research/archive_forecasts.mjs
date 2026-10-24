// An archive of the forecasts the page issues (MODELS §7.8, ROADMAP v0.4 "an archive of issued forecasts").
// Run once (a day, or from a timer): for a fixed list of points it fetches what the page fetches — the Open-Meteo
// ECMWF ensemble and CAMS calls built by public/js/sources.js → urls() — and runs the page's own code
// (outlook.buildOutlook, airq.buildAir) on them, so the archive holds exactly the summary the page would have shown at
// that moment, with the issue time and the model run Open-Meteo served. Later runs of a scoring script can then judge
// the page *as issued* (not stitched history, not a re-fit), and any new correction can be re-scored from the raw
// per-member maxima stored with each day.
//
//   node research/archive_forecasts.mjs [--out research/archive] [--raw <dir>] [--no-metar]
//
// Writes <out>/<UTC date>/<point>.json, each {point, issues: [...]} (a second run on the same UTC day appends an
// issue), and <out>/<UTC date>/metar-<HHMM>Z.json (the airports' METARs of the last 36 h, the observations to score
// against). --raw also keeps the full API responses (≈ 0.3 MB per point; keep them out of git).
//
// Calls per run: 12 ensemble + 12 CAMS (Open-Meteo, one per point, 1.5 s apart), 2 Open-Meteo metadata files
// (static), 1 aviationweather.gov METAR request. Never ThaiWater, GISTDA or any source that rate-limits by IP.
// PM2.5: the page anchors CAMS on the nearest PCD station within 15 km and 3 h; this script reads the collector's
// public/data/live/air4thai.json if it is there and fresh (no network call) and otherwise stores CAMS's own daily means
// and the damping multipliers only (the page would show raw CAMS marked "ยังไม่ได้ปรับ" without GISTDA's estimate,
// which this script deliberately does not call).
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const JS = join(REPO, "public", "js");
const { urls } = await import(join(JS, "sources.js"));
const { buildOutlook, heatMembers, memberSeries, perMember, windowLevel, chanceWord, hasAfternoon } = await import(join(JS, "outlook.js"));
const { buildAir, parseAir4Thai, nearestStation, camsPast24, dailyMeans } = await import(join(JS, "airq.js"));
const { HEAT, PM25 } = await import(join(JS, "calibration.js"));
const { rounded } = await import(join(JS, "geo.js"));

const UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)";
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = opt("--out", join(HERE, "archive"));
const RAW = opt("--raw", null);

// The points: the eight airports whose METARs are the real-time check (coordinates from aviationweather.gov's METAR
// records, 24 Oct 2026), and four TMD synoptic stations of the 2026-10-23 validation (GHCNh coordinates), so that
// both kinds of observation can score the archive later.
export const POINTS = [
  { id: "VTBD", name: "Bangkok Don Mueang (airport)", lat: 13.912, lon: 100.607, obs: "METAR VTBD" },
  { id: "VTBS", name: "Bangkok Suvarnabhumi (airport)", lat: 13.686, lon: 100.767, obs: "METAR VTBS; GHCNh THM00048429" },
  { id: "VTCC", name: "Chiang Mai (airport)", lat: 18.767, lon: 98.963, obs: "METAR VTCC" },
  { id: "VTCT", name: "Chiang Rai (airport)", lat: 19.952, lon: 99.883, obs: "METAR VTCT" },
  { id: "VTSP", name: "Phuket (airport)", lat: 8.113, lon: 98.317, obs: "METAR VTSP" },
  { id: "VTSS", name: "Hat Yai (airport)", lat: 6.933, lon: 100.393, obs: "METAR VTSS" },
  { id: "VTUD", name: "Udon Thani (airport)", lat: 17.386, lon: 102.788, obs: "METAR VTUD" },
  { id: "VTUU", name: "Ubon Ratchathani (airport)", lat: 15.251, lon: 104.870, obs: "METAR VTUU" },
  { id: "48455", name: "Bangkok Metropolis (TMD)", lat: 13.7333, lon: 100.5667, obs: "GHCNh THM00048455" },
  { id: "48384", name: "Khon Kaen, Tha Phra (TMD)", lat: 16.3333, lon: 102.8167, obs: "GHCNh THM00048384" },
  { id: "48333", name: "Nan (TMD)", lat: 18.8667, lon: 100.75, obs: "GHCNh THM00048333" },
  { id: "48555", name: "Surat Thani (TMD)", lat: 9.1, lon: 99.6333, obs: "GHCNh THM00048555" },
];

const r2 = (v) => (v == null || Number.isNaN(v) ? null : Math.round(v * 100) / 100);
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function getJSON(url) {
  const t = Date.now();
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 200)}`);
  const j = JSON.parse(text);
  if (j && j.error === true) throw new Error(`Open-Meteo error: ${j.reason}`);
  return { j, text, ms: Date.now() - t };
}

/** Which code produced the summary: the commit, whether the page's modules differ from it, and their hash. */
function provenance() {
  const files = ["sources.js", "outlook.js", "airq.js", "calibration.js", "heat.js", "levels.js", "geo.js"];
  const h = createHash("sha256");
  for (const f of files) h.update(readFileSync(join(JS, f)));
  let commit = null;
  let dirty = null;
  try {
    commit = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    dirty = execFileSync("git", ["-C", REPO, "status", "--porcelain", "--", ...files.map((f) => `public/js/${f}`)], { encoding: "utf8" }).trim() !== "";
  } catch { /* not a git checkout */ }
  return { commit, pageModulesModified: dirty, pageModulesSha256: h.digest("hex").slice(0, 16), heat: HEAT, pm25: PM25 };
}

async function modelRuns() {
  const out = {};
  for (const [k, u] of [["ensemble", "https://ensemble-api.open-meteo.com/data/ecmwf_ifs025_ensemble/static/meta.json"],
    ["cams", "https://air-quality-api.open-meteo.com/data/cams_global/static/meta.json"]]) {
    try {
      const { j } = await getJSON(u);
      const iso = (s) => (s ? new Date(s * 1000).toISOString() : null);
      out[k] = { url: u, initialisation: iso(j.last_run_initialisation_time), available: iso(j.last_run_availability_time) };
    } catch (e) { out[k] = { url: u, error: e.message }; }
  }
  return out;
}

/** The page's summary of one ensemble response, plus each member's raw daily maxima for re-scoring. */
export function heatAndRain(ens, nowMs) {
  const o = buildOutlook(ens, nowMs);
  if (!o) return null;
  const h = ens.hourly;
  const heat = heatMembers(h);
  const rain = memberSeries(h, "precipitation");
  const hourIdx = (i0, i1, hh) => { for (let i = i0; i < i1; i++) if (h.time[i].slice(11, 13) === hh) return i; return -1; };
  const day = (d, k) => {
    const i13 = hourIdx(d.i0, d.i1, "13");
    const i16 = hourIdx(d.i0, d.i1, "16");
    return {
      date: d.date, window: `${h.time[d.i0]}..${h.time[d.i1 - 1]}`, hours: d.hours,
      correction: k >= 2 ? "lead2" : "lead1",
      heat: d.heat ? { p10: r2(d.heat.p10), p50: r2(d.heat.p50), p90: r2(d.heat.p90), rawP50: r2(d.heat.rawP50),
        chanceWarning33: r2(d.heat.chance[2]), chanceDanger42: r2(d.heat.chance[3]), level: windowLevel(d.heat).level } : null,
      heatNote: d.heat ? undefined : "no afternoon hour left in the window: the page shows no heat summary",
      rain24: { chanceHeavy35: r2(d.rain24.chance[2]), chanceVeryHeavy90: r2(d.rain24.chance[3]), word: chanceWord(d.rain24.chance[2]),
        p50: r2(d.rain24.p50), p90: r2(d.rain24.p90) },
      gust: { p50: r2(d.gust.p50), p90: r2(d.gust.p90), chance62: r2(d.gust.chance[2]) },
      tmax: { p50: r2(d.tmax.p50) },
      members: { // raw, uncorrected, one value per member (control first): for re-scoring any correction later
        heatRawMax: perMember(heat, d.i0, d.i1, "max").map(r2),
        heatRaw13or16Max: i13 >= 0 && i16 >= 0 ? heat.map((s) => r2(Math.max(s[i13] ?? -99, s[i16] ?? -99))) : null,
        rainSum: perMember(rain, d.i0, d.i1, "sum").map(r2),
      },
      afternoon: hasAfternoon ? hasAfternoon(h.time, d.i0, d.i1) : null,
    };
  };
  // today's whole calendar day (from 00:00 Bangkok): hours before the issue come from earlier runs, so this is not a
  // forecast; stored only to compare with the day's observed maximum
  const t0 = h.time.findIndex((t) => t.slice(0, 10) === o.days[0].date);
  const t1 = o.days[0].i1;
  return {
    issuedHour: o.issued, members: o.members,
    now: { heatRawP50: r2(o.now.heat), tempP50: r2(o.now.temp) },
    next24: { window: `${h.time[o.next24.i0]}..${h.time[o.next24.i1 - 1]}`,
      heat: o.next24.heat ? { p10: r2(o.next24.heat.p10), p50: r2(o.next24.heat.p50), p90: r2(o.next24.heat.p90),
        chanceDanger42: r2(o.next24.heat.chance[3]) } : null,
      rain24: { chanceHeavy35: r2(o.next24.rain24.chance[2]), word: chanceWord(o.next24.rain24.chance[2]) }, over100: r2(o.next24.over100) },
    days: o.days.map(day),
    todayWholeDayRawHeatMax: t0 >= 0 ? { window: `${h.time[t0]}..${h.time[t1 - 1]}`, members: perMember(heat, t0, t1, "max").map(r2),
      note: "includes hours before the issue time (Open-Meteo fills them from earlier runs): not a forecast" } : null,
  };
}

export function pm25(aq, nowMs, a4t, p) {
  const station = a4t ? nearestStation(a4t, p.lat, p.lon, nowMs) : null;
  const air = buildAir(aq, null, nowMs, station);
  const days = dailyMeans(aq, "pm2_5", nowMs);
  const nowHour = new Date(nowMs + 7 * 3.6e6).toISOString().slice(0, 13); // Bangkok hour
  const prevNow = camsPast24(nowHour, aq.hourly.time, aq.hourly.pm2_5);
  return {
    camsDailyMean: days.map((d) => ({ date: d.date, hours: d.hours, mean: r2(d.mean) })),
    camsPast24EndingNow: r2(prevNow),
    dampedMultiplier: days.map((d, i) => (d.mean == null || prevNow == null ? null
      : r2((Math.max(d.mean, 0.5) / Math.max(prevNow, 0.5)) ** PM25.beta[Math.min(i, PM25.beta.length - 1)]))),
    anchor: station ? { kind: "PCD station", id: station.id, km: r2(station.km), time: station.time, pm25: station.pm25 }
      : { kind: "none", note: "no fresh PCD station within 15 km in the collector's file; GISTDA not called: the page would anchor on GISTDA's estimate" },
    pageOutlook: air.outlook.map((d) => ({ date: d.date, mean: r2(d.mean), band: d.band?.th ?? null, corrected: d.corrected })),
  };
}

async function main() {
  const issuedAt = new Date();
  const nowMs = issuedAt.getTime();
  const date = issuedAt.toISOString().slice(0, 10);
  const dir = join(OUT, date);
  mkdirSync(dir, { recursive: true });
  if (RAW) mkdirSync(RAW, { recursive: true });
  const prov = provenance();
  const runs = await modelRuns();
  let a4t = null;
  let a4tNote = "collector file missing";
  const a4tFile = join(REPO, "public", "data", "live", "air4thai.json");
  if (existsSync(a4tFile)) {
    const ageMin = (nowMs - statSync(a4tFile).mtimeMs) / 6e4;
    a4tNote = `collector file ${ageMin.toFixed(0)} min old`;
    // the collector wraps Air4Thai's answer as {source, url, raw, items, fetched}; the page reads `raw || data` (main.js)
    if (ageMin <= 180) { const j = JSON.parse(readFileSync(a4tFile, "utf8")); a4t = parseAir4Thai(j.raw || j); }
  }
  console.log(`archive ${issuedAt.toISOString()} → ${dir}; ensemble run ${runs.ensemble.initialisation}, CAMS run ${runs.cams.initialisation}; Air4Thai: ${a4tNote}`);
  const summary = [];
  for (const p of POINTS) {
    const u = urls(p.lat, p.lon, { nowMs });
    const rec = { issuedAt: issuedAt.toISOString(), modelRuns: runs, code: prov, rounded: rounded(p.lat, p.lon),
      requests: { ens: u.ens, aq: u.aq }, userAgent: UA };
    try {
      const e = await getJSON(u.ens);
      if (RAW) writeFileSync(join(RAW, `${date}_${p.id}_ens.json.gz`), gzipSync(e.text));
      rec.heatRain = heatAndRain(e.j, nowMs);
    } catch (err) { rec.heatRain = { error: err.message }; }
    await sleep(1500);
    try {
      const a = await getJSON(u.aq);
      if (RAW) writeFileSync(join(RAW, `${date}_${p.id}_aq.json.gz`), gzipSync(a.text));
      rec.pm25 = pm25(a.j, nowMs, a4t, p);
      rec.pm25.air4thai = a4tNote;
    } catch (err) { rec.pm25 = { error: err.message }; }
    await sleep(1500);
    const f = join(dir, `${p.id}.json`);
    const doc = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { point: p, issues: [] };
    doc.issues.push(rec);
    writeFileSync(f, JSON.stringify(doc, null, 1) + "\n");
    const d1 = rec.heatRain?.days?.[1];
    summary.push(`${p.id.padEnd(6)} ${rec.heatRain?.error ? "ENS ERROR " + rec.heatRain.error
      : `tomorrow heat p50 ${d1?.heat?.p50 ?? "-"} (raw ${d1?.heat?.rawP50 ?? "-"}), heavy-rain chance ${d1?.rain24.chanceHeavy35}`}`
      + `${rec.pm25?.error ? " | CAMS ERROR " + rec.pm25.error : ` | CAMS tomorrow ${rec.pm25.camsDailyMean[1]?.mean ?? "-"} µg/m³`}`);
  }
  if (!args.includes("--no-metar")) {
    const ids = POINTS.filter((p) => /^VT/.test(p.id)).map((p) => p.id).join(",");
    const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&hours=36&format=json`;
    try {
      const m = await getJSON(url);
      writeFileSync(join(dir, `metar-${issuedAt.toISOString().slice(11, 16).replace(":", "")}Z.json`),
        JSON.stringify({ fetchedAt: issuedAt.toISOString(), url, reports: m.j }) + "\n");
      summary.push(`METAR: ${m.j.length} reports`);
    } catch (err) { summary.push(`METAR ERROR ${err.message}`); }
  }
  console.log(summary.join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

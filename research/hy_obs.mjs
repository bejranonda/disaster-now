// Hat Yai flood hindcast (2026-10-24): observed daily rain at southern TMD stations, and the long-record climatology.
//
// 1. NOAA NCEI GHCNh hourly files (pipe-separated) -> the 07:00-07:00 Bangkok rain day, exactly as
//    research/hz_rain.py (and research/e1e2_weather.py) build it: the 00 UTC SYNOP's precipitation_24_hour (quality
//    codes in BAD_Q dropped) is the rain of the day before (07:00 D to 07:00 D+1 Bangkok = "day D"); a SYNOP with
//    iR = 3 is dry; else >= 20 hourly amounts summed; else missing.
//    Files: the heat study's downloads (2024-2026, <scratch>/models/dl/ghcnh) and this study's (2023, and Hat Yai
//    airport THU048569-1 2023-2025, <scratch>/hy/obs/ghcnh); see research/logs/hy_fetch_obs-2026-10-24.log.
// 2. GHCN-Daily (by-station CSV, to 2025-08-24 for Thai stations) for Hat Yai 48569 and Songkhla 48568: how often
//    3-day totals of 150 / 250 / 350 mm happen in Oct-Jan, and the largest 1-, 3- and 7-day totals on record.
//    The date alignment of GHCN-Daily against the GHCNh rain day is checked on the overlap (2023-2025) first.
//
//   node research/hy_obs.mjs  -> research/data/hy_obs_daily.csv, research/out/hy_obs.json,
//                                research/logs/hy_obs-2026-10-24.log
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCR = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad";
const DIRS = [join(SCR, "models", "dl", "ghcnh"), join(SCR, "hy", "obs", "ghcnh")];
const GHCND = join(SCR, "hy", "obs", "ghcnd");
const LOG = join(HERE, "logs", "hy_obs-2026-10-24.log");
const lines = [];
const log = (s) => { console.log(s); lines.push(s); };
const BAD_Q = new Set("23679ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
const STATIONS = { "48571": "THM00048571", "48569": "THU048569-1", "48574": "THM00048574", "48560": "THM00048560",
  "48581": "THM00048581", "48554": "THM00048554", "48555": "THM00048555" };
const YEARS = [2023, 2024, 2025, 2026];

const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

function readGhcnh(id) {
  const recs = [];
  for (const y of YEARS) {
    const f = DIRS.map((d) => join(d, `GHCNh_${id}_${y}.psv`)).find((p) => existsSync(p) && readFileSync(p).length > 1000);
    if (!f) continue;
    const txt = readFileSync(f, "utf8").split("\n");
    const h = txt[0].split("|");
    const c = (n) => h.indexOf(n);
    const iD = c("DATE"), i24 = c("precipitation_24_hour"), q24 = c("precipitation_24_hour_Quality_Code");
    const ip = c("precipitation"), qp = c("precipitation_Quality_Code"), iR = c("REM");
    for (let k = 1; k < txt.length; k++) {
      const r = txt[k].split("|");
      if (r.length < h.length / 2) continue;
      const ok = (v, q) => v !== "" && !(q && BAD_Q.has(q[0]));
      recs.push({ t: r[iD], p24: ok(r[i24], r[q24]) ? +r[i24] : null, p: ok(r[ip], r[qp]) ? +r[ip] : null, rem: iR >= 0 ? r[iR] : "" });
    }
  }
  return recs;
}

function dailyFromGhcnh(id) {
  const recs = readGhcnh(id);
  const seen = new Set();
  const byDay = new Map(); // hourly sums per rain day
  const out = new Map();
  for (const x of recs) {
    if (seen.has(x.t)) continue; // keep the first record at a time, as drop_duplicates(keep="first")
    seen.add(x.t);
    const ms = Date.parse(x.t + "Z");
    const rday = new Date(ms - 60e3).toISOString().slice(0, 10); // hour ending t belongs to the UTC day of t - 1 min
    if (x.p != null) { const s = byDay.get(rday) || { sum: 0, n: 0 }; s.sum += x.p; s.n++; byDay.set(rday, s); }
  }
  seen.clear();
  for (const x of recs) {
    if (seen.has(x.t) || !x.t.endsWith("T00:00:00")) continue;
    seen.add(x.t);
    const rday = addDays(x.t.slice(0, 10), -1);
    const m = /SYN\d{3}\d{5}\s+(\d)\d{4}/.exec(x.rem);
    out.set(rday, { p24: x.p24, ir: m ? m[1] : null });
  }
  const rows = [];
  for (const [d, o] of [...out].sort()) {
    let rain = o.p24;
    let src = "p24";
    if (rain == null && o.ir === "3") { rain = 0; src = "iR3"; }
    const hs = byDay.get(d);
    if (rain == null && o.ir == null && hs && hs.n >= 20) { rain = hs.sum; src = "hourly"; }
    if (rain != null) rows.push({ date: d, rain, src });
  }
  return rows;
}

function ghcnd(id) {
  const f = join(GHCND, `${id}.csv`);
  if (!existsSync(f)) return new Map();
  const txt = readFileSync(f, "utf8").split("\n");
  const h = txt[0].split('","').map((s) => s.replaceAll('"', ""));
  const iD = h.indexOf("DATE"), iP = h.indexOf("PRCP"), iA = h.indexOf("PRCP_ATTRIBUTES");
  const m = new Map();
  for (let k = 1; k < txt.length; k++) {
    const r = txt[k].match(/("([^"]*)"|[^,]*)(,|$)/g)?.map((s) => s.replace(/,$/, "").replaceAll('"', "")) || [];
    const p = r[iP]?.trim();
    const q = (r[iA] || "").split(",")[1] || ""; // the quality flag (2nd attribute): blank = passed
    if (p && !q) m.set(r[iD], Number(p) / 10);
  }
  return m;
}

// ---------- 1. the station days ----------
const all = [];
const daily = {};
for (const [wmo, id] of Object.entries(STATIONS)) {
  const rows = dailyFromGhcnh(id);
  daily[wmo] = new Map(rows.map((r) => [r.date, r.rain]));
  rows.forEach((r) => all.push(`${wmo},${r.date},${r.rain.toFixed(1)},${r.src}`));
  log(`${wmo} ${id}: ${rows.length} rain days (${rows[0]?.date}..${rows[rows.length - 1]?.date}), ` +
    `src ${JSON.stringify(rows.reduce((a, r) => ((a[r.src] = (a[r.src] || 0) + 1), a), {}))}`);
}
writeFileSync(join(HERE, "data", "hy_obs_daily.csv"), "station,date,rain_mm,src\n" + all.join("\n") + "\n");

log("\nThe event, rain day D = 07:00 D to 07:00 D+1 Bangkok (mm; '-' = no record):");
const evDays = [];
for (let d = "2025-11-14"; d <= "2025-11-30"; d = addDays(d, 1)) evDays.push(d);
log("date        " + Object.keys(STATIONS).map((s) => s.padStart(7)).join(""));
for (const d of evDays) log(`${d}  ` + Object.keys(STATIONS).map((s) => (daily[s].has(d) ? daily[s].get(d).toFixed(1) : "-").padStart(7)).join(""));
const total = (s, a, b) => { let t = 0, n = 0, miss = 0; for (let d = a; d <= b; d = addDays(d, 1)) { if (daily[s].has(d)) { t += daily[s].get(d); n++; } else miss++; } return { t, n, miss }; };
const ev = {};
for (const s of Object.keys(STATIONS)) {
  const w = total(s, "2025-11-19", "2025-11-25");
  const best3 = Math.max(...evDays.slice(0, -2).map((d, k) => [0, 1, 2].every((j) => daily[s].has(evDays[k + j])) ? [0, 1, 2].reduce((a, j) => a + daily[s].get(evDays[k + j]), 0) : -1));
  ev[s] = { total_19_25: +w.t.toFixed(1), days_with_record: w.n, days_missing: w.miss, max3day: best3 >= 0 ? +best3.toFixed(1) : null };
  log(`${s}: 19-25 Nov total ${w.t.toFixed(1)} mm over ${w.n} recorded days (${w.miss} missing); largest complete 3-day total ${best3 >= 0 ? best3.toFixed(1) : "n/a"} mm`);
}

// ---------- 2. GHCN-Daily: alignment, then climatology ----------
const clim = {};
for (const [wmo, id] of [["48569", "TH000048569"], ["48568", "TH000048568"]]) {
  const m = ghcnd(id);
  if (!m.size) continue;
  const dates = [...m.keys()].sort();
  if (daily[wmo]) {
    for (const shift of [-1, 0, 1]) {
      let n = 0, eq = 0;
      for (const [d, v] of daily[wmo]) {
        const g = m.get(addDays(d, shift));
        if (g == null) continue;
        n++; if (Math.abs(g - v) <= 0.15) eq++;
      }
      log(`${id} vs GHCNh rain day, GHCN-D date = rain day ${shift >= 0 ? "+" : ""}${shift}: ${eq} of ${n} equal within 0.1 mm`);
    }
  }
  // seasons Oct-Jan; 3-day running totals with all three days present
  const yrs = new Set();
  let n3 = 0;
  const c3 = { 150: 0, 250: 0, 350: 0 };
  const ev3 = { 150: [], 250: [], 350: [] };
  const maxes = { d1: [0, ""], d3: [0, ""], d7: [0, ""] };
  for (const d of dates) {
    const mo = +d.slice(5, 7);
    const sum = (k) => { let t = 0; for (let j = 0; j < k; j++) { const v = m.get(addDays(d, j)); if (v == null) return null; t += v; } return t; };
    const s1 = m.get(d), s3 = sum(3), s7 = sum(7);
    if (s1 > maxes.d1[0]) maxes.d1 = [s1, d];
    if (s3 != null && s3 > maxes.d3[0]) maxes.d3 = [s3, d];
    if (s7 != null && s7 > maxes.d7[0]) maxes.d7 = [s7, d];
    if (![10, 11, 12, 1].includes(mo) || s3 == null) continue;
    yrs.add(mo === 1 ? +d.slice(0, 4) - 1 : +d.slice(0, 4));
    n3++;
    for (const t of [150, 250, 350]) if (s3 >= t) { c3[t]++; const last = ev3[t][ev3[t].length - 1]; if (!last || Date.parse(d) - Date.parse(last.end) > 3 * 864e5) ev3[t].push({ start: d, end: d, max: s3 }); else { last.end = d; last.max = Math.max(last.max, s3); } }
  }
  clim[wmo] = { id, first: dates[0], last: dates[dates.length - 1], seasons: yrs.size, windows: n3,
    share3day: Object.fromEntries(Object.entries(c3).map(([t, c]) => [t, +(c / n3).toFixed(4)])),
    episodes: Object.fromEntries(Object.entries(ev3).map(([t, e]) => [t, e.length])),
    episodesPerSeason: Object.fromEntries(Object.entries(ev3).map(([t, e]) => [t, +(e.length / yrs.size).toFixed(2)])),
    top350: ev3[350].map((e) => `${e.start} (${e.max.toFixed(0)} mm)`),
    record: { d1: maxes.d1, d3: maxes.d3, d7: maxes.d7 } };
  log(`\n${id} (${dates[0]}..${dates[dates.length - 1]}), Oct-Jan, ${yrs.size} seasons, ${n3} complete 3-day windows:`);
  log(`  share of windows >= 150 / 250 / 350 mm: ${[150, 250, 350].map((t) => (100 * c3[t] / n3).toFixed(2) + " %").join(" / ")}`);
  log(`  separate episodes (windows more than 3 days apart) >= 150 / 250 / 350 mm: ${[150, 250, 350].map((t) => ev3[t].length).join(" / ")}` +
    ` = ${[150, 250, 350].map((t) => (ev3[t].length / yrs.size).toFixed(2)).join(" / ")} a season`);
  log(`  episodes >= 350 mm: ${clim[wmo].top350.join(", ") || "none"}`);
  log(`  records (any month): 1 day ${maxes.d1[0].toFixed(1)} mm (${maxes.d1[1]}), 3 days ${maxes.d3[0].toFixed(1)} mm (from ${maxes.d3[1]}), 7 days ${maxes.d7[0].toFixed(1)} mm (from ${maxes.d7[1]})`);
}

writeFileSync(join(HERE, "out", "hy_obs.json"), JSON.stringify({ event: ev, climatology: clim }, null, 1));
appendFileSync(LOG, `\n===== ${new Date().toISOString()} node research/hy_obs.mjs\n` + lines.join("\n") + "\n");

#!/usr/bin/env node
// Live cross-checks of the app's outputs against independent sources, at one moment (docs/research/
// crosscheck-live-2026-10-23.md). Each section uses the app's own functions on today's data:
//   A. river gauges: the app's status vs FloodWatch's /api/stations, same codes (as research/crosscheck_floodwatch.mjs)
//   B. TMD's warnings vs the ensemble: for each warned province, the app's chance of heavy rain in the next 24 h
//   C. TMD's earthquake list vs EMSC: the same event (≤ 100 km, ≤ 5 min), magnitudes side by side
//   D. GISTDA's estimate vs the PCD's stations: GISTDA's 24-h mean at each fresh station's own position
// node research/crosscheck_live.mjs <live dir with warnings.json, tmd_quakes.json, air4thai.json> [--fw URL] [--n 30]
import { readFileSync } from "node:fs";
import { nearGauges } from "../public/js/water.js";
import { buildOutlook, chanceWord } from "../public/js/outlook.js";
import { parseAir4Thai, parseGistda } from "../public/js/airq.js";
import { urls } from "../public/js/sources.js";
import { km } from "../public/js/geo.js";

const args = process.argv.slice(2);
const LIVE = args[0];
const FW = args.includes("--fw") ? args[args.indexOf("--fw") + 1] : "https://flood.autobahn.bot/api/stations";
const N = args.includes("--n") ? Number(args[args.indexOf("--n") + 1]) : 30;
const UA = { "user-agent": "disaster-now-crosscheck/0.3 (+https://github.com/bejranonda/disaster-now)" };
const live = (f) => JSON.parse(readFileSync(`${LIVE}/${f}`, "utf8"));
const getJson = async (u) => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(`HTTP ${r.status} ${u.slice(0, 80)}`); return r.json(); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const now = Date.now();
console.log(`cross-check at ${new Date(now).toISOString()}`);

// ---------- A ----------
try {
  const [tw, fw] = await Promise.all([getJson("https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load"), getJson(FW)]);
  const ours = nearGauges(tw, 13, 101, now, { maxKm: 5000, maxAgeH: 6 });
  const NAMES = ["normal", "watch", "warning", "critical"];
  const byCode = new Map((fw.stations || []).map((s) => [s.code, s]));
  let both = 0, same = 0;
  const diff = [];
  for (const g of ours) {
    const f = byCode.get(g.code);
    if (!f || f.status === "unknown" || g.status < 0) continue;
    both++;
    if (NAMES[g.status] === f.status) same++; else diff.push(`${g.code} ours ${NAMES[g.status]} / FloodWatch ${f.status}`);
  }
  console.log(`\nA. gauges: ${both} judged by both, ${same} the same (${(100 * same / both).toFixed(1)} %)`);
  for (const d of diff.slice(0, 10)) console.log(`   ${d}`);
} catch (e) { console.log(`\nA. gauges: not run (${e.message})`); }

// ---------- B ----------
try {
  const T = JSON.parse(readFileSync(new URL("../public/data/tambon.json", import.meta.url), "utf8"));
  const warns = live("warnings.json").items || [];
  console.log(`\nB. ${warns.length} TMD warning(s) in force`);
  for (const w of warns) {
    console.log(`   ${w.event} (${w.severity}), ${w.provinces.length} provinces, until ${w.expires}`);
    const rows = [];
    for (const pv of w.provinces) {
      const p = T.p[pv];
      if (!p) continue;
      const o = buildOutlook(await getJson(urls(p[2], p[3]).ens), now);
      const c = o?.next24?.rain24?.chance?.[2];
      rows.push({ pv: p[1], chance: c, word: c == null ? "–" : chanceWord(c, "en"), p50: o?.next24?.rain24?.p50 });
    }
    for (const r of rows) console.log(`     ${r.pv.padEnd(14)} heavy-rain chance ${r.chance == null ? "–" : `${Math.round(100 * r.chance)} %`} (${r.word}), median 24-h rain ${r.p50?.toFixed(1)} mm`);
    const low = rows.filter((r) => r.chance != null && r.chance < 0.1).length;
    console.log(`     → the ensemble says "low" (< 10 %) in ${low} of ${rows.length} warned provinces`);
  }
} catch (e) { console.log(`\nB. warnings vs ensemble: not run (${e.message})`); }

// ---------- C ----------
try {
  const tq = live("tmd_quakes.json").items || [];
  const since = new Date(now - 8 * 864e5).toISOString().slice(0, 19);
  const em = await getJson(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlat=-8&maxlat=30&minlon=85&maxlon=112&minmag=2&starttime=${since}&limit=500`);
  const ev = (em.features || []).map((f) => ({ t: Date.parse(f.properties.time), lat: f.properties.lat, lon: f.properties.lon, mag: f.properties.mag, region: f.properties.flynn_region }));
  console.log(`\nC. TMD quakes ${tq.length}, EMSC events in the box (8 days) ${ev.length}`);
  let matched = 0;
  const dm = [];
  for (const q of tq) {
    const t = Date.parse(q.time);
    const m = ev.filter((e) => Math.abs(e.t - t) <= 300e3 && km(q.lat, q.lon, e.lat, e.lon) <= 100).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    if (m) { matched++; dm.push(q.mag - m.mag); }
    console.log(`   ${q.time} M${q.mag} ${q.placeTh.slice(0, 30)} → ${m ? `EMSC M${m.mag} ${m.region} (${km(q.lat, q.lon, m.lat, m.lon).toFixed(0)} km apart)` : "no EMSC match"}`);
  }
  if (dm.length) console.log(`   → ${matched} of ${tq.length} matched; TMD − EMSC magnitude: median ${median(dm).toFixed(2)}, range ${Math.min(...dm).toFixed(1)}…${Math.max(...dm).toFixed(1)}`);
} catch (e) { console.log(`\nC. quakes: not run (${e.message})`); }

// ---------- D ----------
try {
  const st = parseAir4Thai(live("air4thai.json").raw).filter((s) => s.pm25 != null && s.time && (now - Date.parse(`${s.time}:00+07:00`)) / 3.6e6 <= 3);
  const pick = st.filter((_, i) => i % Math.max(1, Math.floor(st.length / N)) === 0).slice(0, N);
  const ratios = [];
  const rows = [];
  for (const s of pick) {
    const g = parseGistda(await getJson(urls(s.lat, s.lon).gistda));
    if (!g?.mean24 || !s.pm25) continue;
    ratios.push(g.mean24 / s.pm25);
    rows.push(`${s.id.padEnd(7)} PCD ${s.pm25.toFixed(1)}  GISTDA ${g.mean24.toFixed(1)}  ×${(g.mean24 / s.pm25).toFixed(2)}`);
  }
  console.log(`\nD. GISTDA 24-h estimate at ${ratios.length} fresh PCD stations: median ×${median(ratios).toFixed(2)} (10–90 %: ×${[...ratios].sort((a, b) => a - b)[Math.floor(ratios.length * 0.1)].toFixed(2)}…×${[...ratios].sort((a, b) => a - b)[Math.floor(ratios.length * 0.9)].toFixed(2)}); over ×1.5 at ${ratios.filter((r) => r > 1.5).length}`);
  for (const r of rows.slice(0, 8)) console.log(`   ${r}`);
} catch (e) { console.log(`\nD. GISTDA vs PCD: not run (${e.message})`); }

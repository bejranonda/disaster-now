// Hat Yai flood hindcast (2026-10-24), part 2: would a multi-day or area trigger have fired too often?
// A systematic sample of ECMWF ENS 00 UTC runs (every 4th day, 1 Nov - 31 Dec of 2023, 2024 and 2025; 2023 at
// 0.4 deg, 2024-25 at 0.25 deg; research/hy_fetch_ens_tp.mjs) at southern TMD stations with daily rain in GHCNh
// (research/hy_obs.mjs). For each run, from the 19:00 view: the page's two full days (tomorrow, the day after) and the
// 72 h of d+1..d+3 (forecast 01:00 -> 01:00 Bangkok; observed rain days 07:00 -> 07:00, 6 h later).
//
// Triggers (fixed before any sample result was seen; the cut points are the page's own 10 / 20 / 40 %):
//   T0  the page as it is: P(day > 35 mm) >= 10 % ("มีโอกาส"), >= 20 % (a pre-warning), >= 40 % ("สูง") on d+1 or d+2
//   T1  point:   P(72 h >= X) >= c,       X = 150 / 250 / 350 mm, c = 10 / 20 / 40 %
//   T2  area:    the same for the mean of the 3 x 3 grid points around the station (~75 km square at 0.25 deg)
//   T3  nearby:  the same for the largest of those 9 points ("somewhere within ~40 km")
//   T4  very heavy (page band): P(day > 90 mm) >= 20 % on d+1 or d+2 (the page's existing very-heavy pre-warning)
// Events (observed at the station): E150 / E250 = the 3 rain days d+1..d+3 sum to >= 150 / 250 mm (all 3 days on
// record); for T0 also "heavy day" = d+1 or d+2 >= 35.1 mm.
// A run counts once per station. Stations share weather, so the n below are not independent: read them as counts.
//
//   node research/hy_sample.mjs -> research/out/hy_sample.json, research/logs/hy_sample-2026-10-24.log
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENS = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hy/ens";
const LOG = join(HERE, "logs", "hy_sample-2026-10-24.log");
const lines = [];
const log = (s = "") => { console.log(s); lines.push(s); };
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

const STATIONS = ["48571", "48569", "48574", "48560", "48581", "48554", "48555"]; // with GHCNh daily rain
const OBS = {};
for (const l of readFileSync(join(HERE, "data", "hy_obs_daily.csv"), "utf8").split("\n").slice(1)) {
  if (!l) continue;
  const [st, d, r] = l.split(",");
  (OBS[st] ||= {})[d] = +r;
}
const obsSum = (st, d0, n) => { let t = 0; for (let j = 0; j < n; j++) { const v = OBS[st]?.[addDays(d0, j)]; if (v == null) return null; t += v; } return t; };

function loadRun(file) {
  const tp = {};
  const txt = readFileSync(file, "utf8").split("\n");
  for (let k = 1; k < txt.length; k++) {
    if (!txt[k]) continue;
    const [, step, member, pt, v] = txt[k].split(",");
    ((tp[step] ||= [])[+member] ||= [])[+pt] = +v;
  }
  return tp;
}
const share = (vals, thr) => vals.filter((v) => v >= thr).length / vals.length;

// the runs: every 4th day from 1 Nov; 2025's 17 and 21 Nov come from the case files (same steps)
const schedule = [];
for (const y of [2023, 2024, 2025]) for (let d = `${y}-11-01`; d <= `${y}-12-31`; d = addDays(d, 4)) schedule.push(d);
const fileFor = (d) => {
  const k = d.replaceAll("-", "");
  for (const f of [`sample_0p25_${k}.csv`, `case_0p25_${k}.csv`, `sample_0p4-beta_${k}.csv`]) if (existsSync(join(ENS, f))) return { f: join(ENS, f), res: f.includes("0p4") ? "0p4-beta" : "0p25" };
  return null;
};

const rows = []; // one per run x station
const missingRuns = [];
for (const d of schedule) {
  const ff = fileFor(d);
  if (!ff) { missingRuns.push(d); continue; }
  const PTS = JSON.parse(readFileSync(join(ENS, `points_${ff.res}.json`), "utf8"));
  const g = ff.res === "0p25" ? 0.25 : 0.4;
  const tp = loadRun(ff.f);
  if (![18, 42, 66, 90].every((s) => tp[s])) { missingRuns.push(d + " (steps)"); continue; }
  for (const st of STATIONS) {
    const p0 = PTS.findIndex((p) => p.labels.includes(`st:${st}`));
    if (p0 < 0) continue;
    const near = [];
    for (const da of [-g, 0, g]) for (const db of [-g, 0, g]) {
      const k = PTS.findIndex((p) => Math.abs(p.lat - (PTS[p0].lat + da)) < 1e-3 && Math.abs(p.lon - (PTS[p0].lon + db)) < 1e-3);
      if (k >= 0) near.push(k);
    }
    const tot = (a, b, p) => tp[b].map((mb, m) => mb[p] - tp[a][m][p]);
    const d1 = tot(18, 42, p0), d2 = tot(42, 66, p0), t72 = tot(18, 90, p0);
    const area = tp[90].map((mb, m) => near.reduce((s, p) => s + mb[p] - tp[18][m][p], 0) / near.length);
    const nmax = tp[90].map((mb, m) => Math.max(...near.map((p) => mb[p] - tp[18][m][p])));
    const o1 = OBS[st]?.[addDays(d, 1)], o2 = OBS[st]?.[addDays(d, 2)];
    const o72 = obsSum(st, addDays(d, 1), 3);
    rows.push({ run: d, season: +d.slice(0, 4), res: ff.res, st, nNear: near.length,
      p35: [share(d1, 35.1), share(d2, 35.1)], p90: [share(d1, 90.1), share(d2, 90.1)],
      p72: { point: [150, 250, 350].map((x) => share(t72, x)), area: [150, 250, 350].map((x) => share(area, x)), near: [150, 250, 350].map((x) => share(nmax, x)) },
      med72: t72.slice().sort((a, b) => a - b)[25],
      obs: { d1: o1, d2: o2, t72: o72, heavyDay: o1 == null || o2 == null ? null : Math.max(o1, o2) >= 35.1 } });
  }
}

// ---------- scoring ----------
function score(sel, fire, event) {
  const r = sel.filter((x) => event(x) != null);
  let a = 0, b = 0, c = 0, dd = 0;
  for (const x of r) { const f = fire(x), e = event(x); if (f && e) a++; else if (f) b++; else if (e) c++; else dd++; }
  return { n: r.length, events: a + c, fires: a + b, hits: a, falseAlarms: b, misses: c, pod: a + c ? a / (a + c) : null, far: a + b ? b / (a + b) : null,
    csi: a + b + c ? a / (a + b + c) : null, fireRate: r.length ? (a + b) / r.length : null,
    eventRuns: new Set(r.filter((x) => event(x)).map((x) => x.run)).size, fireRuns: new Set(r.filter((x) => fire(x)).map((x) => x.run)).size };
}
const fmt = (s) => `n ${String(s.n).padStart(3)} ev ${String(s.events).padStart(2)} fire ${String(s.fires).padStart(3)} hit ${String(s.hits).padStart(2)} FA ${String(s.falseAlarms).padStart(3)} miss ${String(s.misses).padStart(2)} | POD ${s.pod == null ? " – " : s.pod.toFixed(2)} FAR ${s.far == null ? " – " : s.far.toFixed(2)} CSI ${s.csi == null ? " – " : s.csi.toFixed(2)} | fires on ${s.fireRate == null ? "–" : (100 * s.fireRate).toFixed(0)}% of rows (${s.fireRuns} runs); events in ${s.eventRuns} runs`;
const E = { E150: (x) => (x.obs.t72 == null ? null : x.obs.t72 >= 150), E250: (x) => (x.obs.t72 == null ? null : x.obs.t72 >= 250), heavyDay: (x) => x.obs.heavyDay };
const TRIG = {
  "T0 page: P(>35) >= 10% on d+1/d+2 (above 'low')": (x) => Math.max(...x.p35) >= 0.1,
  "T0 page: pre-warning P(>35) >= 20% on d+1/d+2": (x) => Math.max(...x.p35) >= 0.2,
  "T0 page: 'high' P(>35) >= 40% on d+1/d+2": (x) => Math.max(...x.p35) >= 0.4,
  "T4 page: very heavy P(>90) >= 20% on d+1/d+2": (x) => Math.max(...x.p90) >= 0.2,
};
// post-hoc (added after the Hat Yai hindcast was read): two heavy days in a row from the page's own day chances
TRIG["T5 post-hoc: P(>35) >= 40% on both d+1 and d+2"] = (x) => Math.min(...x.p35) >= 0.4;
TRIG["T6 post-hoc: P(>35) >= 20% on both d+1 and d+2"] = (x) => Math.min(...x.p35) >= 0.2;
for (const [k, X] of [[0, 150], [1, 250], [2, 350]]) for (const c of [0.1, 0.2, 0.4]) {
  TRIG[`T1 point P(72h>=${X}) >= ${c * 100}%`] = (x) => x.p72.point[k] >= c;
  TRIG[`T2 area  P(72h>=${X}) >= ${c * 100}%`] = (x) => x.p72.area[k] >= c;
  TRIG[`T3 near  P(72h>=${X}) >= ${c * 100}%`] = (x) => x.p72.near[k] >= c;
}

log(`Sample: ${schedule.length} scheduled runs (every 4th day, 1 Nov - 31 Dec 2023/2024/2025); missing: ${missingRuns.join(", ") || "none"}`);
log(`${rows.length} run x station rows; stations ${STATIONS.join(", ")}; 2023 at 0.4 deg, 2024-25 at 0.25 deg`);
const bySeason = (s) => rows.filter((x) => x.season === s);
for (const s of [2023, 2024, 2025]) {
  const r = bySeason(s);
  const ev150 = r.filter((x) => E.E150(x)).length, ev250 = r.filter((x) => E.E250(x)).length, nv = r.filter((x) => x.obs.t72 != null).length;
  log(`  ${s}: ${r.length} rows (${new Set(r.map((x) => x.run)).size} runs), ${nv} with 3 observed days; E150 ${ev150}, E250 ${ev250}`);
}
const out = {};
for (const [sname, sel] of [["2023", bySeason(2023)], ["2024", bySeason(2024)], ["2025", bySeason(2025)], ["2023+2024 (without the Hat Yai season)", rows.filter((x) => x.season !== 2025)], ["all", rows]]) {
  if (!sel.length) continue;
  log(`\n=== ${sname} ===`);
  out[sname] = {};
  for (const [ename, ev] of Object.entries(E)) {
    if (ename === "heavyDay") continue;
    log(`-- event ${ename} (observed 72 h at the station)`);
    for (const [tname, f] of Object.entries(TRIG)) {
      const sc = score(sel, f, ev);
      out[sname][`${tname} | ${ename}`] = sc;
      log(`${tname.padEnd(48)} ${fmt(sc)}`);
    }
  }
  const sc = score(sel, TRIG["T0 page: 'high' P(>35) >= 40% on d+1/d+2"], E.heavyDay);
  log(`-- the page's own event: 'high' vs a heavy day (d+1 or d+2 >= 35.1 mm): ${fmt(sc)}`);
  out[sname]["T0 high | heavyDay"] = sc;
}
// ---------- the protocol: choose on 2024 (no Hat Yai flood), confirm on 2023 (disjoint season), then 2025 ----------
const cand = Object.keys(TRIG).filter((k) => /^T[123] /.test(k));
const s24 = bySeason(2024);
const ranked = cand.map((k) => ({ k, sc: score(s24, TRIG[k], E.E150) })).filter((x) => x.sc.csi != null).sort((a, b) => b.sc.csi - a.sc.csi);
log(`\nChoice on 2024 by CSI against E150 (candidates T1-T3; ties keep the listed order):`);
for (const x of ranked.slice(0, 5)) log(`  ${x.k.padEnd(40)} CSI ${x.sc.csi.toFixed(2)} POD ${x.sc.pod.toFixed(2)} FAR ${x.sc.far == null ? "–" : x.sc.far.toFixed(2)}`);
const chosen = ranked[0].k;
log(`  chosen: ${chosen}`);
const keyT = ["T0 page: pre-warning P(>35) >= 20% on d+1/d+2", "T0 page: 'high' P(>35) >= 40% on d+1/d+2", chosen, "T1 point P(72h>=150) >= 10%", "T1 point P(72h>=150) >= 20%", "T3 near  P(72h>=150) >= 20%", "T3 near  P(72h>=250) >= 20%", "T6 post-hoc: P(>35) >= 20% on both d+1 and d+2", "T5 post-hoc: P(>35) >= 40% on both d+1 and d+2"];
for (const s of [2023, 2024, 2025]) {
  const sel = bySeason(s);
  if (!sel.length) continue;
  log(`\n${s}${s === 2024 ? " (the choosing season)" : s === 2023 ? " (disjoint confirmation)" : " (the Hat Yai season)"}:`);
  for (const k of [...new Set(keyT)]) {
    for (const [en, ev] of [["E150", E.E150], ["E250", E.E250]]) log(`  ${k.padEnd(48)} vs ${en}: ${fmt(score(sel, TRIG[k], ev))}`);
  }
}
// the false alarms and misses of the key triggers, to see whether they were near misses
log(`\nFalse alarms and misses (vs E150) of the key triggers, all seasons: run station obs72`);
for (const k of [...new Set(keyT)]) {
  const fa = rows.filter((x) => x.obs.t72 != null && TRIG[k](x) && !E.E150(x)).map((x) => `${x.run} ${x.st} ${x.obs.t72.toFixed(0)}`);
  const mi = rows.filter((x) => x.obs.t72 != null && !TRIG[k](x) && E.E150(x)).map((x) => `${x.run} ${x.st} ${x.obs.t72.toFixed(0)}`);
  log(`  ${k}\n    false alarms (${fa.length}): ${fa.join("; ") || "none"}\n    misses (${mi.length}): ${mi.join("; ") || "none"}`);
}
log(`\nEvent runs (any station with >= 150 mm in d+1..d+3): ${[...new Set(rows.filter((x) => E.E150(x)).map((x) => x.run))].join(", ")}`);

// the Hat Yai rows, listed
log(`\nHat Yai (Kho Hong 48571, grid 7.0 N 100.5 E) rows: run, P(>35) d+1/d+2, P(72h>=150/250/350) point | area | near, obs 72 h`);
for (const x of rows.filter((y) => y.st === "48571")) {
  const p = (v) => String(Math.round(100 * v)).padStart(3);
  log(`${x.run} ${p(x.p35[0])}${p(x.p35[1])} | ${x.p72.point.map(p).join("")} | ${x.p72.area.map(p).join("")} | ${x.p72.near.map(p).join("")} | med72 ${x.med72.toFixed(0).padStart(4)} obs ${x.obs.t72 == null ? "–" : x.obs.t72.toFixed(0)}`);
}
writeFileSync(join(HERE, "out", "hy_sample.json"), JSON.stringify({ schedule, missingRuns, scores: out, rows }, null, 0));
appendFileSync(LOG, `\n===== ${new Date().toISOString()} node research/hy_sample.mjs\n` + lines.join("\n") + "\n");
void readdirSync;

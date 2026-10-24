// Hat Yai flood hindcast (2026-10-24): what the page's rain method would have shown for Hat Yai from the ECMWF
// ensemble runs of 14-24 Nov 2025 (as issued, research/hy_fetch_ens_tp.mjs), against the rain that fell
// (research/hy_obs.mjs). The page's OWN functions grade every window: outlook.summarize / windowLevel / chanceWord /
// prewarnings and assess.fcLevel (public/js, v0.4.0), so the words below are the page's words.
//
// The view: the 00 UTC run, read at 19:00 Bangkok (12 UTC) the same day: the run reaches Open-Meteo in the
// afternoon (ENS open data ~8 h after the run, [unverified] exact minute). ENS tp is accumulated from the run start;
// a window's total is tp(end) - tp(start), per member. Windows (steps, h from 00 UTC):
//   next 24 h (the tile)        12 -> 36    19:00 today -> 19:00 tomorrow
//   tonight (the table's col 1) 12 -> 18    19:00 -> 01:00 (the page's window ends at 24:00; 3-h steps)
//   day +1 (tomorrow)           18 -> 42    01:00 -> 01:00 Bangkok (the page: 00:00 -> 24:00)
//   day +2 (the day after)      42 -> 66    the table's last column
//   day +3 .. +5                66 -> 90, 90 -> 114, 114 -> 138: NOT on the page (shown here to see how early a
//                               signal existed)
//   72 h from tomorrow          18 -> 90    the multi-day candidate
// Observed rain days run 07:00 -> 07:00 Bangkok, so a forecast day (01:00 -> 01:00) overlaps its rain day by 18 h.
//
// Points: the 0.25 deg grid point the page reads for Hat Yai city (7.0 N, 100.5 E; Kho Hong 48571 and Hat Yai
// airport 48569 share it), Sadao's (6.75, 100.5), and the U-Taphao basin mean (research/data/hy_points.json: six
// points, the basin outline approximated [unverified]); neighbourhood = any of the 9 points within ~40 km of Hat Yai.
//
//   node research/hy_hindcast.mjs -> research/out/hy_hindcast.json, research/logs/hy_hindcast-2026-10-24.log
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarize, windowLevel, chanceWord, chanceText, prewarnings } from "../public/js/outlook.js";
import { fcLevel, MODEL_MAX } from "../public/js/assess.js";
import { scale } from "../public/js/levels.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENS = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hy/ens";
const LOG = join(HERE, "logs", "hy_hindcast-2026-10-24.log");
const lines = [];
const log = (s = "") => { console.log(s); lines.push(s); };
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

// ---------- data ----------
const PTS = JSON.parse(readFileSync(join(ENS, "points_0p25.json"), "utf8"));
const P = JSON.parse(readFileSync(join(HERE, "data", "hy_points.json"), "utf8"));
const at = (lat, lon) => PTS.findIndex((p) => Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lon - lon) < 1e-6);
const HY = at(7.0, 100.5);
const SADAO = at(6.75, 100.5);
const BASIN = P.basin.points.map(([a, b]) => at(a, b));
const NEAR = [];
for (const da of [-0.25, 0, 0.25]) for (const db of [-0.25, 0, 0.25]) NEAR.push(at(7.0 + da, 100.5 + db));
if ([HY, SADAO, ...BASIN, ...NEAR].some((k) => k < 0)) throw new Error("a point is missing from the extract");

/** tp[step][member][pt] (mm) for one run file. */
export function loadRun(file) {
  const tp = {};
  const txt = readFileSync(file, "utf8").split("\n");
  for (let k = 1; k < txt.length; k++) {
    if (!txt[k]) continue;
    const [, step, member, pt, v] = txt[k].split(",");
    ((tp[step] ||= [])[+member] ||= [])[+pt] = +v;
  }
  return tp;
}
/** Per-member window totals at one point (or the mean of several). */
export function totals(tp, a, b, pts) {
  if (!tp[a] && a !== 0) return null;
  if (!tp[b]) return null;
  const ps = Array.isArray(pts) ? pts : [pts];
  return tp[b].map((mb, m) => ps.reduce((s, p) => s + (mb[p] - (a === 0 ? 0 : tp[a][m][p])), 0) / ps.length);
}
/** Per-member max over several points of the window total (the "somewhere within ~40 km" event). */
export function maxTotals(tp, a, b, pts) {
  if (!tp[a] || !tp[b]) return null;
  return tp[b].map((mb, m) => Math.max(...pts.map((p) => mb[p] - tp[a][m][p])));
}
const share = (vals, thr) => vals.filter((v) => v >= thr).length / vals.length;
const q = (vals, p) => { const s = [...vals].sort((x, y) => x - y); const i = (s.length - 1) * p; return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i)); };

const OBS = {};
for (const l of readFileSync(join(HERE, "data", "hy_obs_daily.csv"), "utf8").split("\n").slice(1)) {
  if (!l) continue;
  const [st, d, r] = l.split(",");
  (OBS[st] ||= {})[d] = +r;
}
const obs = (st, d) => OBS[st]?.[d];
const obsSum = (st, d0, n) => { let t = 0; for (let j = 0; j < n; j++) { const v = obs(st, addDays(d0, j)); if (v == null) return null; t += v; } return t; };

const WORDS = (lvl) => (lvl < 0 ? "–" : scale(lvl).th);
const WORDS_EN = (lvl) => (lvl < 0 ? "–" : scale(lvl).en);

// ---------- per run ----------
const runs = [];
for (let d = "2025-11-14"; d <= "2025-11-24"; d = addDays(d, 1)) {
  const f = join(ENS, `case_0p25_${d.replaceAll("-", "")}.csv`);
  if (!existsSync(f)) { log(`missing ${f}`); continue; }
  const tp = loadRun(f);
  const win = (a, b, pts = HY) => totals(tp, a, b, pts);
  const days = [[12, 18], [18, 42], [42, 66], [66, 90], [90, 114], [114, 138]];
  const s = (vals) => summarize("rain24", vals);
  const dayS = days.map(([a, b]) => { const v = win(a, b); return v ? s(v) : null; });
  const next24 = s(win(12, 36));
  // the page's outlook object for its three windows (tonight, tomorrow, the day after); no heat or gust: rain only
  const outlook = { days: dayS.slice(0, 3).map((x, i) => ({ date: addDays(d, i), rain24: x, heat: null, gust: summarize("gust", []) })) };
  const pre = prewarnings(outlook).filter((x) => x.hazard === "rain24");
  const tile = Math.min(MODEL_MAX, windowLevel(next24).level);
  const r = {
    run: d,
    tile: { level: tile, word: WORDS(tile), heavy: next24.chance[2], veryHeavy: next24.chance[3], chanceWord: chanceWord(next24.chance[2]), median: next24.p50, p90: next24.p90 },
    days: dayS.map((x, i) => x && ({ date: addDays(d, i), onPage: i <= 2, heavy: x.chance[2], veryHeavy: x.chance[3], word: chanceWord(x.chance[2]),
      level: fcLevel("rain24", x), p10: x.p10, p50: x.p50, p90: x.p90 })),
    prewarnings: pre.map((x) => ({ day: x.day, date: x.date, level: x.level, chance: x.chance, text: `${x.level === 3 ? "ฝนหนักมาก (> 90 มม.)" : "ฝนหนัก (> 35 มม.)"} ${["คืนนี้", "พรุ่งนี้", "มะรืนนี้"][x.day]} โอกาส ${chanceText(x.chance)}` })),
  };
  // multi-day and area candidates (research only)
  const m72 = win(18, 90);
  const b72 = win(18, 90, BASIN);
  const n72 = maxTotals(tp, 18, 90, NEAR);
  const s72 = win(18, 90, SADAO);
  const day1b = win(18, 42, BASIN);
  const day1n = maxTotals(tp, 18, 42, NEAR);
  r.multi = {
    point72: { p10: q(m72, 0.1), p50: q(m72, 0.5), p90: q(m72, 0.9), max: Math.max(...m72), ge150: share(m72, 150), ge250: share(m72, 250), ge350: share(m72, 350) },
    basin72: { p10: q(b72, 0.1), p50: q(b72, 0.5), p90: q(b72, 0.9), max: Math.max(...b72), ge150: share(b72, 150), ge250: share(b72, 250), ge350: share(b72, 350) },
    near72: { p50: q(n72, 0.5), ge150: share(n72, 150), ge250: share(n72, 250), ge350: share(n72, 350) },
    sadao72: { p50: q(s72, 0.5), ge150: share(s72, 150), ge250: share(s72, 250) },
    basinDay1: { ge35: share(day1b, 35.1), ge90: share(day1b, 90.1) },
    nearDay1: { ge35: share(day1n, 35.1), ge90: share(day1n, 90.1) },
  };
  if (tp[138]) {
    const m5 = win(18, 138), b5 = win(18, 138, BASIN);
    r.multi.point5d = { p50: q(m5, 0.5), p90: q(m5, 0.9), ge250: share(m5, 250), ge350: share(m5, 350) };
    r.multi.basin5d = { p50: q(b5, 0.5), p90: q(b5, 0.9), ge250: share(b5, 250), ge350: share(b5, 350) };
    const m3late = win(66, 138), b3late = win(66, 138, BASIN);
    r.multi.point72_d3to5 = { p50: q(m3late, 0.5), ge150: share(m3late, 150), ge250: share(m3late, 250) };
    r.multi.basin72_d3to5 = { p50: q(b3late, 0.5), ge150: share(b3late, 150), ge250: share(b3late, 250) };
  }
  // what fell: rain days d+1..d+3 at Hat Yai airport, Kho Hong, Sadao (07-07)
  r.observed = {
    day1: { "48569": obs("48569", addDays(d, 1)), "48571": obs("48571", addDays(d, 1)), "48574": obs("48574", addDays(d, 1)) },
    next72: { "48569": obsSum("48569", addDays(d, 1), 3), "48571": obsSum("48571", addDays(d, 1), 3), "48574": obsSum("48574", addDays(d, 1), 3) },
  };
  runs.push(r);
}

// ---------- tables ----------
const pct = (p) => (p == null ? "  –" : `${Math.round(100 * p)}`.padStart(3));
const mm = (v) => (v == null ? "–" : v.toFixed(0));
log(`Hat Yai hindcast, ECMWF ENS 00 UTC runs 14-24 Nov 2025, the page's functions (public/js v0.4.0). Grid point 7.0 N 100.5 E.`);
log(`\nA. What the page would have shown at 19:00 on the run day (tile = next 24 h; table = tonight / tomorrow / the day after; capped at ${WORDS(MODEL_MAX)})`);
log(`run    | tile: level, P(>35) word, P(>35)%, P(>90)%, median mm | table words (tonight / tomorrow / day after) | table levels | pre-warnings`);
for (const r of runs) {
  const t = r.tile;
  log(`${r.run.slice(5)} | ${t.word.padEnd(10)} ${t.chanceWord.padEnd(7)} ${pct(t.heavy)} ${pct(t.veryHeavy)} ${mm(t.median).padStart(4)} | ` +
    `${r.days.slice(0, 3).map((x) => x.word).join(" / ").padEnd(22)} | ${r.days.slice(0, 3).map((x) => WORDS(x.level)).join(" / ")} | ` +
    `${r.prewarnings.map((x) => x.text).join("; ") || "(none)"}`);
}
log(`\nB. Chance of > 35 mm in the day (%) at the Hat Yai point by run (rows) and Bangkok day (columns); [x] = on the page's table, (x) = beyond it.`);
const targets = [];
for (let d = "2025-11-14"; d <= "2025-11-28"; d = addDays(d, 1)) targets.push(d);
log("run   " + targets.map((t) => t.slice(8)).map((s) => s.padStart(6)).join(""));
for (const r of runs) {
  log(`${r.run.slice(5)} ` + targets.map((t) => {
    const x = r.days.find((y) => y && y.date === t);
    if (!x || x.date === r.run) return "      "; // tonight's 6 h is not a day
    return (x.onPage ? `[${pct(x.heavy)}]` : `(${pct(x.heavy)})`).padStart(6);
  }).join(""));
}
log("obs48569 " + targets.map((t) => mm(obs("48569", t)).padStart(6)).join("").slice(3));
log("obs48571 " + targets.map((t) => mm(obs("48571", t)).padStart(6)).join("").slice(3));
log(`(observed rain day D = 07:00 D -> 07:00 D+1; forecast day D = 01:00 D -> 01:00 D+1)`);
log(`\nC. Same for > 90 mm (very heavy), %:`);
log("run   " + targets.map((t) => t.slice(8)).map((s) => s.padStart(6)).join(""));
for (const r of runs) {
  log(`${r.run.slice(5)} ` + targets.map((t) => {
    const x = r.days.find((y) => y && y.date === t);
    if (!x || x.date === r.run) return "      ";
    return (x.onPage ? `[${pct(x.veryHeavy)}]` : `(${pct(x.veryHeavy)})`).padStart(6);
  }).join(""));
}
log(`\nD. Ensemble median [10-90 %] of the day's rain at the point, mm, vs what fell (48569 / 48571):`);
for (const r of runs) {
  const x = r.days[1];
  log(`${r.run.slice(5)} tomorrow ${x.date.slice(5)}: ${mm(x.p50)} [${mm(x.p10)}-${mm(x.p90)}] | fell ${mm(r.observed.day1["48569"])} / ${mm(r.observed.day1["48571"])} mm`);
}
log(`\nE. 72 h from tomorrow (forecast 01:00 d+1 -> 01:00 d+4; observed rain days d+1..d+3): median [10-90 %] mm and P(>= 150 / 250 / 350 mm) %`);
log(`run   | point                                  | basin mean                             | any point <= 40 km   | fell 48569 / 48571 / 48574`);
for (const r of runs) {
  const a = r.multi.point72, b = r.multi.basin72, n = r.multi.near72, o = r.observed.next72;
  log(`${r.run.slice(5)} | ${mm(a.p50).padStart(4)} [${mm(a.p10)}-${mm(a.p90)}] max ${mm(a.max).padStart(3)} ${pct(a.ge150)} ${pct(a.ge250)} ${pct(a.ge350)} | ` +
    `${mm(b.p50).padStart(4)} [${mm(b.p10)}-${mm(b.p90)}] max ${mm(b.max).padStart(3)} ${pct(b.ge150)} ${pct(b.ge250)} ${pct(b.ge350)} | ${mm(n.p50).padStart(4)} ${pct(n.ge150)} ${pct(n.ge250)} ${pct(n.ge350)} | ` +
    `${mm(o["48569"])} / ${mm(o["48571"])} / ${mm(o["48574"])}`);
}
log(`\nF. Days 3-5 ahead (beyond the page; runs 14-19 Nov): 72 h of days d+3..d+5 and 5 days d+1..d+5`);
for (const r of runs.filter((x) => x.multi.point5d)) {
  const a = r.multi.point72_d3to5, b = r.multi.basin72_d3to5, c = r.multi.point5d, e = r.multi.basin5d;
  log(`${r.run.slice(5)} | d+3..d+5 point median ${mm(a.p50)} P>=150 ${pct(a.ge150)} P>=250 ${pct(a.ge250)} | basin median ${mm(b.p50)} P>=150 ${pct(b.ge150)} P>=250 ${pct(b.ge250)} | ` +
    `5-day point median ${mm(c.p50)} [p90 ${mm(c.p90)}] P>=250 ${pct(c.ge250)} P>=350 ${pct(c.ge350)} | basin ${mm(e.p50)} [p90 ${mm(e.p90)}] P>=250 ${pct(e.ge250)} P>=350 ${pct(e.ge350)}`);
}
log(`\nG. Tomorrow's chance of heavy / very heavy rain: point vs basin mean vs any point within ~40 km (%)`);
for (const r of runs) log(`${r.run.slice(5)} point ${pct(r.days[1].heavy)} / ${pct(r.days[1].veryHeavy)} | basin ${pct(r.multi.basinDay1.ge35)} / ${pct(r.multi.basinDay1.ge90)} | near ${pct(r.multi.nearDay1.ge35)} / ${pct(r.multi.nearDay1.ge90)}`);

writeFileSync(join(HERE, "out", "hy_hindcast.json"), JSON.stringify({ about: "research/hy_hindcast.mjs, 2026-10-24", points: { HY: PTS[HY], SADAO: PTS[SADAO], basin: BASIN.map((k) => PTS[k]) }, runs }, null, 1));
appendFileSync(LOG, `\n===== ${new Date().toISOString()} node research/hy_hindcast.mjs\n` + lines.join("\n") + "\n");
void WORDS_EN;

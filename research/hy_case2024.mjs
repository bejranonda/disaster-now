// Hat Yai flood hindcast (2026-10-24), the second event: late November 2024 (Kho Hong 48571 had 459 mm in the
// rain days 26-28 Nov 2024, Hat Yai airport 334 mm; research/hy_obs.mjs). Daily 00 UTC ENS runs 22-26 Nov 2024
// (steps 18, 42, 66, 90 only: tomorrow, the day after, d+3 and their 72 h), read as research/hy_hindcast.mjs reads the
// 2025 runs, with the page's own functions. The tile (next 24 h from 19:00) needs steps 12 and 36, which were not
// fetched for these runs, so only the table's two full days and the pre-warnings for them are shown.
//   node research/hy_case2024.mjs -> research/out/hy_case2024.json, research/logs/hy_case2024-2026-10-24.log
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarize, chanceWord, chanceText, prewarnings } from "../public/js/outlook.js";
import { fcLevel } from "../public/js/assess.js";
import { scale } from "../public/js/levels.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENS = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hy/ens";
const LOG = join(HERE, "logs", "hy_case2024-2026-10-24.log");
const lines = [];
const log = (s = "") => { console.log(s); lines.push(s); };
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const PTS = JSON.parse(readFileSync(join(ENS, "points_0p25.json"), "utf8"));
const at = (lat, lon) => PTS.findIndex((p) => Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lon - lon) < 1e-6);
const HY = at(7.0, 100.5);
const NEAR = [];
for (const da of [-0.25, 0, 0.25]) for (const db of [-0.25, 0, 0.25]) NEAR.push(at(7.0 + da, 100.5 + db));
const OBS = {};
for (const l of readFileSync(join(HERE, "data", "hy_obs_daily.csv"), "utf8").split("\n").slice(1)) {
  if (!l) continue;
  const [st, d, r] = l.split(",");
  (OBS[st] ||= {})[d] = +r;
}
const share = (v, t) => v.filter((x) => x >= t).length / v.length;
const q = (vals, p) => { const s = [...vals].sort((x, y) => x - y); const i = (s.length - 1) * p; return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i)); };
const pct = (p) => String(Math.round(100 * p)).padStart(3);

log("Observed rain days (07-07), Kho Hong 48571 / Hat Yai airport 48569 / Sadao 48574 / Yala 48581:");
for (let d = "2024-11-22"; d <= "2024-11-30"; d = addDays(d, 1)) log(`  ${d}: ${["48571", "48569", "48574", "48581"].map((s) => OBS[s]?.[d] ?? "–").join(" / ")}`);
log("\nrun   | tomorrow: P(>35) word, P(>90), median [10-90] | day after: P(>35) word, P(>90) | pre-warnings | 72 h d+1..d+3: point median [10-90], P>=150/250, near P>=150/250 | fell 48571/48569");
const out = [];
for (const d of ["2024-11-21", "2024-11-22", "2024-11-23", "2024-11-24", "2024-11-25", "2024-11-26"]) {
  const f = join(ENS, `sample_0p25_${d.replaceAll("-", "")}.csv`);
  if (!existsSync(f)) { log(`${d}: no file`); continue; }
  const tp = {};
  for (const l of readFileSync(f, "utf8").split("\n").slice(1)) {
    if (!l) continue;
    const [, step, m, pt, v] = l.split(",");
    ((tp[step] ||= [])[+m] ||= [])[+pt] = +v;
  }
  const tot = (a, b, p) => tp[b].map((mb, m) => mb[p] - tp[a][m][p]);
  const d1 = summarize("rain24", tot(18, 42, HY)), d2 = summarize("rain24", tot(42, 66, HY));
  const pre = prewarnings({ days: [{ date: addDays(d, 0), rain24: summarize("rain24", []), heat: null, gust: summarize("gust", []) },
    { date: addDays(d, 1), rain24: d1, heat: null, gust: summarize("gust", []) }, { date: addDays(d, 2), rain24: d2, heat: null, gust: summarize("gust", []) }] })
    .filter((x) => x.hazard === "rain24").map((x) => `${x.level === 3 ? "หนักมาก" : "หนัก"} ${["", "พรุ่งนี้", "มะรืนนี้"][x.day]} ${chanceText(x.chance)}`);
  const t72 = tot(18, 90, HY);
  const n72 = tp[90].map((mb, m) => Math.max(...NEAR.map((p) => mb[p] - tp[18][m][p])));
  const obs = ["48571", "48569"].map((s) => { let t = 0; for (let j = 1; j <= 3; j++) { const v = OBS[s]?.[addDays(d, j)]; if (v == null) return "–"; t += v; } return t.toFixed(0); });
  const r = { run: d, d1: { heavy: d1.chance[2], very: d1.chance[3], word: chanceWord(d1.chance[2]), level: scale(fcLevel("rain24", d1)).th, p10: d1.p10, p50: d1.p50, p90: d1.p90 },
    d2: { heavy: d2.chance[2], very: d2.chance[3], word: chanceWord(d2.chance[2]), level: scale(fcLevel("rain24", d2)).th }, pre,
    p72: { p10: q(t72, 0.1), p50: q(t72, 0.5), p90: q(t72, 0.9), ge150: share(t72, 150), ge250: share(t72, 250) }, near72: { ge150: share(n72, 150), ge250: share(n72, 250) }, obs72: obs };
  out.push(r);
  log(`${d.slice(5)} | ${pct(r.d1.heavy)} ${r.d1.word.padEnd(7)} ${pct(r.d1.very)} ${r.d1.p50.toFixed(0)} [${r.d1.p10.toFixed(0)}-${r.d1.p90.toFixed(0)}] ${r.d1.level} | ${pct(r.d2.heavy)} ${r.d2.word.padEnd(7)} ${pct(r.d2.very)} ${r.d2.level} | ${pre.join("; ") || "(none)"} | ` +
    `${r.p72.p50.toFixed(0)} [${r.p72.p10.toFixed(0)}-${r.p72.p90.toFixed(0)}] ${pct(r.p72.ge150)} ${pct(r.p72.ge250)} | near ${pct(r.near72.ge150)} ${pct(r.near72.ge250)} | ${obs.join(" / ")}`);
}
writeFileSync(join(HERE, "out", "hy_case2024.json"), JSON.stringify(out, null, 1));
appendFileSync(LOG, `\n===== ${new Date().toISOString()} node research/hy_case2024.mjs\n` + lines.join("\n") + "\n");

// Does the page correct the same predictor the heat line was fitted on? The fit used each forecast's max of the
// 13:00 and 16:00 Bangkok values (research/e1e2_weather.py); the page takes each member's max over every hour of the
// window (outlook.perMember). This reads the archive (research/archive_forecasts.mjs) and prints, per point and day,
// the median over members of (all-hours max − max of 13:00/16:00). Run: node research/predictor_hours_check.mjs <archive day dir>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const all = [];
for (const f of readdirSync(dir).filter((x) => /^(VT|48)\w+\.json$/.test(x))) {
  const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const iss = doc.issues[doc.issues.length - 1];
  const parts = [];
  for (const d of iss.heatRain.days) {
    const a = d.members.heatRawMax;
    const b = d.members.heatRaw13or16Max;
    if (!b) { parts.push(`${d.date}: no 13:00/16:00 in window`); continue; }
    const diff = a.map((v, i) => v - b[i]).sort((x, y) => x - y);
    all.push(...diff);
    parts.push(`${d.date}: median ${diff[Math.floor(diff.length / 2)].toFixed(2)}, max ${diff[diff.length - 1].toFixed(2)}, share > 0.1 °C ${(diff.filter((x) => x > 0.1).length / diff.length * 100).toFixed(0)} %`);
  }
  console.log(`${doc.point.id.padEnd(6)} ${parts.join(" | ")}`);
}
all.sort((x, y) => x - y);
console.log(`all member-days: n=${all.length}, mean ${(all.reduce((s, v) => s + v, 0) / all.length).toFixed(3)} °C, median ${all[Math.floor(all.length / 2)].toFixed(2)}, 90th pct ${all[Math.floor(all.length * 0.9)].toFixed(2)}, max ${all[all.length - 1].toFixed(2)}`);

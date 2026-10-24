// One-off repair of the PM2.5 part of an archive day (research/archive_forecasts.mjs), offline, no network call:
// the 24 Oct 08:05 UTC run passed the collector's wrapped Air4Thai file to parseAir4Thai, so no PCD anchor was found
// (fixed in the script: the page reads `raw || data`). This recomputes each issue's pm25 block from the saved CAMS
// response (--raw dir of that run) and the same collector file, with the issue's own time, and says so in the record.
//   node research/archive_recompute_pm25.mjs <archive day dir> <raw dir>
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const { pm25 } = await import(join(HERE, "archive_forecasts.mjs"));
const { parseAir4Thai } = await import(join(HERE, "..", "public", "js", "airq.js"));
const [dayDir, rawDir] = process.argv.slice(2);
const a4tFile = join(HERE, "..", "public", "data", "live", "air4thai.json");
const j = JSON.parse(readFileSync(a4tFile, "utf8"));
const a4t = parseAir4Thai(j.raw || j);
const mtime = new Date(statSync(a4tFile).mtimeMs).toISOString();
for (const f of readdirSync(dayDir).filter((x) => /^(VT|48)\w+\.json$/.test(x))) {
  const doc = JSON.parse(readFileSync(join(dayDir, f), "utf8"));
  const id = doc.point.id;
  const rf = readdirSync(rawDir).find((x) => x.endsWith(`_${id}_aq.json.gz`));
  for (const iss of doc.issues) {
    const nowMs = Date.parse(iss.issuedAt);
    if (Date.parse(mtime) > nowMs) { console.log(`${id}: collector file is newer than the issue; not recomputed`); continue; }
    const aq = JSON.parse(gunzipSync(readFileSync(join(rawDir, rf))).toString("utf8"));
    const before = iss.pm25?.anchor?.kind;
    iss.pm25 = { ...pm25(aq, nowMs, a4t, doc.point), air4thai: `collector file of ${mtime} (${((nowMs - Date.parse(mtime)) / 6e4).toFixed(0)} min before the issue)`,
      recomputed: `${new Date().toISOString()}, offline, from the saved CAMS response and the same collector file: the first run did not unwrap the collector's Air4Thai file` };
    console.log(`${id.padEnd(6)} anchor ${before} → ${iss.pm25.anchor.kind}${iss.pm25.anchor.id ? ` ${iss.pm25.anchor.id} ${iss.pm25.anchor.km} km, ${iss.pm25.anchor.pm25} µg/m³ at ${iss.pm25.anchor.time}` : ""}; outlook ${iss.pm25.pageOutlook.map((d) => `${d.date.slice(5)} ${d.mean}${d.corrected ? "" : " (raw)"}`).join(", ")}`);
  }
  writeFileSync(join(dayDir, f), JSON.stringify(doc, null, 1) + "\n");
}

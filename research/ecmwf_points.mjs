// Point values from ECMWF open-data HRES forecasts, as issued (CC BY 4.0), for every Thai GHCNh station and the eight
// METAR airports (research/data/airports_metar.json).
// The Node twin of research/ecmwf_open.py (which needs eccodes, numpy and pandas; this host has none of them).
// Same source (the Google Cloud mirror of the ECMWF open-data archive, storage.googleapis.com/ecmwf-open-data),
// same 00 UTC runs and steps, same nearest 0.25° grid point; one field per HTTP byte-range request, decoded with
// research/lib/grib2_ccsds.mjs; only the station values are kept.
//
//   node research/ecmwf_points.mjs <start YYYY-MM-DD> <end YYYY-MM-DD> [workers=6]
//
// Steps: 30, 33 (13:00, 16:00 Bangkok tomorrow = "day 1") and 54, 57 (the day after = "day 2"); params 2t, 2d.
// Output (resumable): <scratch>/ecmwf_points2/oper_YYYYMMDD.csv with date,step,param,member,station,value (K),
// the same columns as research/ecmwf_open.py writes. Log: research/logs/ecmwf_points-2026-10-24.log.
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { valuesAt, gridIndex } from "./lib/grib2_ccsds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)";
const BUCKET = "https://storage.googleapis.com/ecmwf-open-data";
const SCRATCH = process.env.DN_SCRATCH || "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models";
const OUTDIR = join(SCRATCH, "ecmwf_points2"); // v2: GHCNh stations + the METAR airports
const LOG = join(HERE, "logs", "ecmwf_points-2026-10-24.log");
mkdirSync(OUTDIR, { recursive: true });
const log = (s) => { console.log(s); appendFileSync(LOG, s + "\n"); };

const ST = [...JSON.parse(readFileSync(join(HERE, "data", "thai_stations_regions.json"), "utf8")).stations,
  ...JSON.parse(readFileSync(join(HERE, "data", "airports_metar.json"), "utf8")).stations];
const IDX = ST.map((s) => [s.id, gridIndex(s.lat, s.lon)]);
const PLAN = { 30: ["2t", "2d"], 33: ["2t", "2d"], 54: ["2t", "2d"], 57: ["2t", "2d"] };
let bytes = 0;
let requests = 0;

async function fetchBuf(url, range, tries = 6) {
  for (let k = 0; k < tries; k++) {
    try {
      requests++;
      const r = await fetch(url, { headers: { "user-agent": UA, ...(range ? { range: `bytes=${range[0]}-${range[1]}` } : {}) } });
      if (r.status === 200 || r.status === 206) { const b = Buffer.from(await r.arrayBuffer()); bytes += b.length; return b; }
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 5000 * 2 ** k)); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (k === tries - 1) throw e;
      await new Promise((ok) => setTimeout(ok, 5000 * 2 ** k));
    }
  }
  throw new Error(`giving up on ${url}`);
}

async function runDay(day) {
  const d = day.replaceAll("-", "");
  const out = join(OUTDIR, `oper_${d}.csv`);
  if (existsSync(out)) return "cached";
  const rows = ["date,step,param,member,station,value"];
  for (const [step, params] of Object.entries(PLAN)) {
    const base = `${BUCKET}/${d}/00z/ifs/0p25/oper/${d}000000-${step}h-oper-fc`;
    const idx = await fetchBuf(`${base}.index`);
    if (!idx) return `missing step ${step}`;
    const recs = idx.toString("utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l))
      .filter((r) => params.includes(r.param) && r.type === "fc" && r.levtype === "sfc");
    if (recs.length !== params.length) return `step ${step}: ${recs.length} of ${params.length} fields in the index`;
    for (const r of recs) {
      const buf = await fetchBuf(`${base}.grib2`, [r._offset, r._offset + r._length - 1]);
      const { meta, values } = valuesAt(buf, IDX.map(([, i]) => i));
      if (meta.grid.Ni !== 1440 || meta.grid.Lo1 !== 180 || meta.grid.La1 !== 90) throw new Error(`unexpected grid ${JSON.stringify(meta.grid)}`);
      IDX.forEach(([id], k) => rows.push(`${d},${step},${r.param},0,${id},${values[k].toFixed(4)}`));
    }
  }
  writeFileSync(out + ".tmp", rows.join("\n") + "\n");
  renameSync(out + ".tmp", out);
  return `${rows.length - 1} values`;
}

const [start, end, workers = "6"] = process.argv.slice(2);
const days = [];
for (let t = Date.parse(start + "T00:00:00Z"); t <= Date.parse(end + "T00:00:00Z"); t += 864e5) days.push(new Date(t).toISOString().slice(0, 10));
log(`\n===== run ${new Date().toISOString()} : ${start}..${end}, ${days.length} runs (00 UTC), ${workers} workers, ${IDX.length} stations`);
const t0 = Date.now();
let next = 0;
let done = 0;
async function worker() {
  while (next < days.length) {
    const day = days[next++];
    let msg;
    try { msg = await runDay(day); } catch (e) { msg = `ERROR ${e.message}`; }
    done++;
    if (done % 10 === 0 || /ERROR|missing|of/.test(msg)) log(`  [${done}/${days.length}] ${day} ${msg} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}
await Promise.all(Array.from({ length: +workers }, worker));
log(`done ${start}..${end} in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${requests} requests, ${(bytes / 1e6).toFixed(0)} MB`);

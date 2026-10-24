// Hat Yai flood hindcast (2026-10-24): ECMWF ENS total precipitation (tp, accumulated from the run start) for all
// 51 members (control = member 0, perturbed 1-50), as issued, at the grid points of research/data/hy_points.json.
// Source: ECMWF open data (CC BY 4.0), Google Cloud mirror storage.googleapis.com/ecmwf-open-data, 00 UTC runs:
//   0.25 deg (from 2024): <YYYYMMDD>/00z/ifs/0p25/enfo/<YYYYMMDD>000000-<step>h-enfo-ef.{index,grib2}
//   0.4 deg (2023):       <YYYYMMDD>/00z/0p4-beta/enfo/<YYYYMMDD>000000-<step>h-enfo-ef.{index,grib2}
// One byte-range request per field, for only its first ~half (the grid scans from 90 N; southern Thailand is reached
// at ~46 % of the message): research/hy_grib.mjs decodes it and asks for more bytes when needed.
//
//   node research/hy_fetch_ens_tp.mjs <tag> <res 0p25|0p4-beta> <steps comma list> <date> [<date> ...] | --range A B every
//   e.g. node research/hy_fetch_ens_tp.mjs case 0p25 12,18,36,42,66,90,114,138 --range 2025-11-15 2025-11-23 1
//
// Output (resumable): <scratch>/hy/ens/<tag>_<res>_<YYYYMMDD>.csv: run,step,member,pt,value_mm (pt = index in the
// points file the run wrote, <scratch>/hy/ens/points_<res>.json). Ledger: research/logs/hy_fetch_ens_tp-2026-10-24.log.
// Rules (task brief): honest User-Agent, <= 6 concurrent requests, stop past BUDGET_MB.
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gridIndex } from "./lib/grib2_ccsds.mjs";
import { valuesAtPartial, Truncated } from "./hy_grib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)";
const BUCKET = "https://storage.googleapis.com/ecmwf-open-data";
const SCRATCH = process.env.HY_SCRATCH || "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hy";
const OUT = join(SCRATCH, "ens");
const IDXDIR = join(SCRATCH, "ens", "index");
const LOG = join(HERE, "logs", "hy_fetch_ens_tp-2026-10-24.log");
const LEDGER = join(SCRATCH, "ens", "bytes_total.txt"); // running total across invocations
const BUDGET_MB = Number(process.env.HY_BUDGET_MB || 5200);
const WORKERS = Number(process.env.HY_WORKERS || 6);
mkdirSync(IDXDIR, { recursive: true });
const log = (s) => { console.log(s); appendFileSync(LOG, s + "\n"); };

const GRIDS = { "0p25": { Ni: 1440, Nj: 721, d: 0.25 }, "0p4-beta": { Ni: 900, Nj: 451, d: 0.4 } };
let bytes = 0;
let requests = 0;
const prior = existsSync(LEDGER) ? Number(readFileSync(LEDGER, "utf8")) || 0 : 0;

/** The points for one grid: each station's nearest grid point, and every grid point inside the box. */
function pointsFor(res) {
  const P = JSON.parse(readFileSync(join(HERE, "data", "hy_points.json"), "utf8"));
  const g = GRIDS[res];
  const grid = { Ni: g.Ni, La1: 90, Lo1: 180, d: g.d };
  const pts = [];
  const seen = new Map();
  const add = (lat, lon, label) => {
    const idx = gridIndex(lat, lon, grid);
    const j = Math.floor(idx / g.Ni);
    const i = idx % g.Ni;
    const glat = +(90 - j * g.d).toFixed(3);
    let glon = (180 + i * g.d) % 360; // Lo1 = 180 (i.e. -180)
    if (glon > 180) glon -= 360;
    glon = +glon.toFixed(3);
    if (!seen.has(idx)) { seen.set(idx, pts.length); pts.push({ idx, lat: glat, lon: glon, labels: [] }); }
    pts[seen.get(idx)].labels.push(label);
  };
  for (const s of P.stations) add(s.lat, s.lon, `st:${s.id}`);
  const { lat0, lat1, lon0, lon1 } = P.box;
  for (let la = Math.ceil(lat0 / g.d) * g.d; la <= lat1 + 1e-9; la += g.d)
    for (let lo = Math.ceil(lon0 / g.d) * g.d; lo <= lon1 + 1e-9; lo += g.d) add(+la.toFixed(3), +lo.toFixed(3), "box");
  return pts;
}

async function get(url, range, tries = 6) {
  for (let k = 0; k < tries; k++) {
    try {
      requests++;
      const r = await fetch(url, { headers: { "user-agent": UA, ...(range ? { range: `bytes=${range[0]}-${range[1]}` } : {}) } });
      if (r.status === 404) return null;
      if (r.status === 200 || r.status === 206) {
        const b = Buffer.from(await r.arrayBuffer());
        bytes += b.length;
        if (range && (r.status !== 206 || b.length !== range[1] - range[0] + 1)) throw new Error(`range answered ${r.status} with ${b.length} bytes`);
        return b;
      }
      if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 4000 * 2 ** k)); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (k === tries - 1) throw e;
      await new Promise((ok) => setTimeout(ok, 4000 * 2 ** k));
    }
  }
  throw new Error(`giving up on ${url}`);
}

const base = (res, d, step) => (res === "0p25"
  ? `${BUCKET}/${d}/00z/ifs/0p25/enfo/${d}000000-${step}h-enfo-ef`
  : `${BUCKET}/${d}/00z/0p4-beta/enfo/${d}000000-${step}h-enfo-ef`);

async function indexFor(res, d, step) {
  const f = join(IDXDIR, `${res}_${d}_${step}.tp.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const buf = await get(`${base(res, d, step)}.index`);
  if (!buf) return null;
  const recs = buf.toString("utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l))
    .filter((r) => r.param === "tp" && (r.type === "cf" || r.type === "pf") && r.levtype === "sfc")
    .map((r) => ({ member: r.type === "cf" ? 0 : +r.number, offset: r._offset, length: r._length }));
  writeFileSync(f, JSON.stringify(recs));
  return recs;
}

/** One field: the first FRAC of its bytes, more if the decoder runs out. */
async function field(url, rec, indices, res) {
  let have = Buffer.alloc(0);
  for (const frac of [0.47, 0.6, 0.8, 1.0]) {
    const end = Math.min(rec.length, Math.ceil(rec.length * frac)) - 1;
    if (end < have.length) continue;
    const more = await get(url, [rec.offset + have.length, rec.offset + end]);
    have = Buffer.concat([have, more]);
    try {
      const o = valuesAtPartial(have, indices);
      const g = GRIDS[res];
      if (o.meta.grid.Ni !== g.Ni || o.meta.grid.Nj !== g.Nj || o.meta.grid.La1 !== 90 || o.meta.grid.Lo1 !== 180) throw new Error(`unexpected grid ${JSON.stringify(o.meta.grid)}`);
      return o.values;
    } catch (e) {
      if (!(e instanceof Truncated)) throw e;
    }
  }
  throw new Error("field still truncated at 100 %");
}

async function runDay(tag, res, steps, day, pts) {
  const d = day.replaceAll("-", "");
  const out = join(OUT, `${tag}_${res}_${d}.csv`);
  if (existsSync(out)) return "cached";
  const rows = ["run,step,member,pt,value_mm"];
  const indices = pts.map((p) => p.idx);
  for (const step of steps) {
    const recs = await indexFor(res, d, step);
    if (!recs) return `missing step ${step}`;
    if (recs.length !== 51) return `step ${step}: ${recs.length} of 51 tp fields in the index`;
    const url = `${base(res, d, step)}.grib2`;
    const tasks = recs.map((rec) => async () => {
      const vals = await field(url, rec, indices, res);
      vals.forEach((v, k) => rows.push(`${d},${step},${rec.member},${k},${(v * 1000).toFixed(2)}`));
    });
    let next = 0;
    await Promise.all(Array.from({ length: WORKERS }, async () => { while (next < tasks.length) await tasks[next++](); }));
    if ((prior + bytes) / 1e6 > BUDGET_MB) throw new Error(`download budget ${BUDGET_MB} MB reached`);
  }
  writeFileSync(out + ".tmp", rows.join("\n") + "\n");
  renameSync(out + ".tmp", out);
  return `${rows.length - 1} values`;
}

async function selftest() {
  // the partial reader against the library's full decode (research/lib/grib2_ccsds.mjs valuesAt), three whole fields
  const { valuesAt } = await import("./lib/grib2_ccsds.mjs");
  for (const [res, d, step, member] of [["0p25", "20251121", 24, 0], ["0p25", "20251121", 90, 17], ["0p4-beta", "20231201", 42, 33]]) {
    const pts = pointsFor(res);
    const rec = (await indexFor(res, d, step)).find((r) => r.member === member);
    const buf = await get(`${base(res, d, step)}.grib2`, [rec.offset, rec.offset + rec.length - 1]);
    const full = valuesAt(buf, pts.map((p) => p.idx));
    const part = await field(`${base(res, d, step)}.grib2`, rec, pts.map((p) => p.idx), res);
    const same = full.values.every((v, k) => v === part[k]);
    const kh = pts.findIndex((p) => p.labels.includes("st:48571"));
    log(`  selftest ${res} ${d} step ${step} member ${member}: grid ${JSON.stringify(full.meta.grid)}; ${pts.length} points; ` +
      `partial == full: ${same}; Kho Hong point ${pts[kh].lat},${pts[kh].lon} tp ${(full.values[kh] * 1000).toFixed(2)} mm`);
    if (!same) throw new Error("selftest failed");
  }
}

if (process.argv[2] === "selftest") {
  log(`\n===== ${new Date().toISOString()} selftest`);
  try { await selftest(); } finally { writeFileSync(LEDGER, String(prior + bytes)); log(`selftest: ${requests} requests, ${(bytes / 1e6).toFixed(1)} MB`); }
  process.exit(0);
}
const [tag, res, stepArg, ...rest] = process.argv.slice(2);
if (!GRIDS[res]) throw new Error("res must be 0p25 or 0p4-beta");
const steps = stepArg.split(",").map(Number);
let days = rest;
if (rest[0] === "--range") {
  const [, a, b, every = "1"] = rest;
  days = [];
  for (let t = Date.parse(a + "T00:00:00Z"); t <= Date.parse(b + "T00:00:00Z"); t += +every * 864e5) days.push(new Date(t).toISOString().slice(0, 10));
}
const pts = pointsFor(res);
writeFileSync(join(OUT, `points_${res}.json`), JSON.stringify(pts));
log(`\n===== ${new Date().toISOString()} ${tag} ${res} steps ${steps.join(",")}: ${days.length} runs (${days[0]}..${days[days.length - 1]}), ${pts.length} points, prior total ${(prior / 1e6).toFixed(0)} MB`);
const t0 = Date.now();
try {
  for (const day of days) {
    let msg;
    try { msg = await runDay(tag, res, steps, day, pts); } catch (e) { msg = `ERROR ${e.message}`; }
    log(`  ${day} ${msg} (${((Date.now() - t0) / 1000).toFixed(0)} s, ${(bytes / 1e6).toFixed(0)} MB this call)`);
    if (/budget/.test(msg)) break;
  }
} finally {
  writeFileSync(LEDGER, String(prior + bytes));
  log(`done ${tag}: ${requests} requests, ${(bytes / 1e6).toFixed(0)} MB this call, ${((prior + bytes) / 1e6).toFixed(0)} MB in all`);
}

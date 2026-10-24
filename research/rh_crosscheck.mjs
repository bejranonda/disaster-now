// Same RH treatment? Open-Meteo's ensemble members 01–03 (the page's input: temperature_2m_memberNN and
// relative_humidity_2m_memberNN) against the ECMWF open-data GRIB perturbed members 1–3 (the Oct 2026 "-ef" files
// carry no control) (2t, 2d → RH with the Magnus form 17.625/243.04 used by the
// validation, research/e1e2_weather.py), same run, same grid point, same valid hour; and the heat index from each.
//   node research/rh_crosscheck.mjs <archive raw dir> <run YYYYMMDD> <run hour HH> <step,step,...>
// 6 GRIB fields per step (one byte-range request each), honest User-Agent. Log: tee to research/logs/.
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { valuesAt, gridIndex } from "./lib/grib2_ccsds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { heatIndexC } = await import(join(HERE, "..", "public", "js", "heat.js"));
const { POINTS } = await import(join(HERE, "archive_forecasts.mjs"));
const UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)";
const [rawDir, run, hh, stepsArg] = process.argv.slice(2);
const rhFromTd = (t, td) => Math.max(0, Math.min(100, 100 * Math.exp((17.625 * td) / (243.04 + td) - (17.625 * t) / (243.04 + t))));
const get = async (url, range) => {
  const r = await fetch(url, { headers: { "user-agent": UA, ...(range ? { range: `bytes=${range[0]}-${range[1]}` } : {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
};
const ens = Object.fromEntries(POINTS.map((p) => {
  const f = readdirSync(rawDir).find((x) => x.endsWith(`_${p.id}_ens.json.gz`));
  return [p.id, JSON.parse(gunzipSync(readFileSync(join(rawDir, f))).toString("utf8"))];
}));
const diffs = { t: [], rh: [], hi: [] };
for (const step of stepsArg.split(",").map(Number)) {
  const base = `https://storage.googleapis.com/ecmwf-open-data/${run}/${hh}z/ifs/0p25/enfo/${run}${hh}0000-${step}h-enfo-ef`;
  const idx = (await get(`${base}.index`)).toString("utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  for (const mem of [1, 2, 3]) {
  const vals = {};
  for (const param of ["2t", "2d"]) {
    const rec = idx.find((r) => r.param === param && r.type === "pf" && +r.number === mem && r.levtype === "sfc");
    const buf = await get(`${base}.grib2`, [rec._offset, rec._offset + rec._length - 1]);
    // Open-Meteo answers with the grid point it used; read the GRIB at that same point
    vals[param] = valuesAt(buf, POINTS.map((p) => gridIndex(ens[p.id].latitude, ens[p.id].longitude))).values.map((v) => v - 273.15);
  }
  const mk = `_member${String(mem).padStart(2, "0")}`;
  const valid = new Date(Date.UTC(+run.slice(0, 4), +run.slice(4, 6) - 1, +run.slice(6, 8), +hh) + step * 3.6e6);
  const bkk = new Date(valid.getTime() + 7 * 3.6e6).toISOString().slice(0, 13) + ":00";
  console.log(`\nrun ${run} ${hh}Z step ${step} member ${mem}: valid ${valid.toISOString().slice(0, 16)}Z = ${bkk} Bangkok`);
  POINTS.forEach((p, k) => {
    const h = ens[p.id].hourly;
    const i = h.time.indexOf(bkk);
    const tOM = h[`temperature_2m${mk}`][i];
    const rhOM = h[`relative_humidity_2m${mk}`][i];
    const tG = vals["2t"][k];
    const rhG = rhFromTd(tG, vals["2d"][k]);
    const hiOM = heatIndexC(tOM, rhOM);
    const hiG = heatIndexC(tG, rhG);
    diffs.t.push(tOM - tG); diffs.rh.push(rhOM - rhG); diffs.hi.push(hiOM - hiG);
    console.log(`  ${p.id.padEnd(6)} grid ${ens[p.id].latitude},${ens[p.id].longitude}  T OM ${tOM} GRIB ${tG.toFixed(2)} | RH OM ${rhOM} Magnus ${rhG.toFixed(1)} | HI OM ${hiOM.toFixed(2)} GRIB ${hiG.toFixed(2)} (${(hiOM - hiG >= 0 ? "+" : "") + (hiOM - hiG).toFixed(2)})`);
  });
  }
}
const st = (a) => `mean ${(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3)}, max |·| ${Math.max(...a.map(Math.abs)).toFixed(3)}`;
console.log(`\nOpen-Meteo − GRIB, ${diffs.t.length} point-hours: T ${st(diffs.t)} °C; RH ${st(diffs.rh)} %; HI ${st(diffs.hi)} °C`);

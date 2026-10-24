// As-issued spot check of the heat-index forecasts at eight airports (model check, 24 Oct 2026, task 2).
// A handful of cases: a spot check, not a validation.
//
//   node research/spot_check_metar.mjs <metar.json> <previous-runs.json> <archive raw dir> [dates=2026-10-23,2026-10-24]
//
// Observed: METARs from aviationweather.gov (JSON, last 36 h). Heat index from T and Td with the page's own formula
// (public/js/heat.js); RH from Td with the Magnus form (17.625, 243.04) that research/e1e2_weather.py used for the
// station data. METAR T and Td are whole degrees: a Monte-Carlo of ±0.5 °C (uniform, independent) on every report
// gives the spread that rounding alone puts on the day's maximum. Daily max over the Bangkok day from the reports on
// the hour (as for the hourly synoptic data of the validation) and, separately, from every report.
// Forecast:
//  - HRES (ecmwf_ifs025) from Open-Meteo's previous-runs API: `_previous_day1` = the value predicted 24 h before the
//    valid time, `_previous_day2` = 48 h before (Open-Meteo's docs, read 24 Oct 2026); plain `temperature_2m` = the
//    latest run (lead 0–6 h, close to an analysis). Corrected with calibration.js HEAT lead1 (day 1) / lead2 (day 2).
//  - ENS (the page's model, 51 members) as archived by research/archive_forecasts.mjs at 08:05 UTC, run 18 UTC 23 Oct
//    (available 04:05 UTC = 11:05 Bangkok): today's afternoon is at lead 12–15 h. Each member's day max, corrected and
//    dressed exactly as outlook.summarizeHeat does.
// Writes research/out/spot_check_2026-10-24.json; prints the table (tee it to research/logs/).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const { heatIndexC } = await import(join(HERE, "..", "public", "js", "heat.js"));
const { HEAT, correctHeat, dressedQuantile, dressedChance } = await import(join(HERE, "..", "public", "js", "calibration.js"));

const [metarFile, prevFile, rawDir, datesArg = "2026-10-23,2026-10-24"] = process.argv.slice(2);
const DATES = datesArg.split(",");
const AIRPORTS = JSON.parse(readFileSync(join(HERE, "data", "airports_metar.json"), "utf8")).stations;
const rhFromTd = (t, td) => Math.max(0, Math.min(100, 100 * Math.exp((17.625 * td) / (243.04 + td) - (17.625 * t) / (243.04 + t))));
const band = (x) => (x == null ? null : [27, 33, 42, 52].filter((e) => Math.round(x * 10) / 10 >= e).length);
const BAND_TH = ["ปกติ", "เฝ้าระวัง", "เตือนภัย", "อันตราย", "อันตรายมาก"];
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---- observations
const metar = JSON.parse(readFileSync(metarFile, "utf8"));
const reports = (metar.reports || metar).filter((m) => m.temp != null && m.dewp != null);
function obsDay(icao, date) {
  const rs = reports.filter((m) => m.icaoId === icao)
    .map((m) => ({ ...m, bkk: new Date(m.obsTime * 1000 + 7 * 3.6e6).toISOString() }))
    .filter((m) => m.bkk.slice(0, 10) === date);
  const onHour = rs.filter((m) => m.bkk.slice(14, 16) === "00");
  const hi = (m, dt = 0, dd = 0) => heatIndexC(m.temp + dt, rhFromTd(m.temp + dt, m.dewp + dd));
  const mx = (xs, f = hi) => (xs.length ? Math.max(...xs.map((m) => f(m))) : null);
  const at = (xs) => { let b = null; for (const m of xs) if (!b || hi(m) > hi(b)) b = m; return b; };
  const afternoonHours = new Set(onHour.map((m) => +m.bkk.slice(11, 13)).filter((h) => h >= 11 && h <= 17)).size;
  // rounding: 2000 draws of T, Td ± 0.5 on every on-the-hour report
  const draws = [];
  for (let k = 0; k < 2000 && onHour.length; k++) {
    draws.push(Math.max(...onHour.map((m) => hi(m, rnd() - 0.5, rnd() - 0.5))));
  }
  draws.sort((a, b) => a - b);
  const top = at(onHour);
  return {
    reports: rs.length, onHour: onHour.length, afternoonHours, complete: afternoonHours >= 5, // the afternoon is what a maximum needs
    himax: r1(mx(onHour)), himaxAll: r1(mx(rs)), at: top ? `${top.bkk.slice(11, 16)} ${top.temp}/${top.dewp}` : null,
    tmax: onHour.length ? Math.max(...onHour.map((m) => m.temp)) : null,
    rounding: draws.length ? { mean: r1(draws.reduce((a, b) => a + b, 0) / draws.length), p10: r1(draws[200]), p90: r1(draws[1799]) } : null,
  };
}

// ---- HRES from previous-runs
const prev = JSON.parse(readFileSync(prevFile, "utf8"));
const prevList = Array.isArray(prev) ? prev : [prev];
function hresDay(k, date) {
  const h = prevList[k].hourly;
  const idx = h.time.map((t, i) => [t, i]).filter(([t]) => t.slice(0, 10) === date).map(([, i]) => i);
  const out = { grid: `${prevList[k].latitude},${prevList[k].longitude}` };
  for (const [name, tk, rk] of [["day0", "temperature_2m", "relative_humidity_2m"], ["day1", "temperature_2m_previous_day1", "relative_humidity_2m_previous_day1"],
    ["day2", "temperature_2m_previous_day2", "relative_humidity_2m_previous_day2"]]) {
    const his = idx.map((i) => ({ t: h.time[i], v: heatIndexC(h[tk][i], h[rk][i]) })).filter((x) => x.v != null);
    const raw = his.length ? Math.max(...his.map((x) => x.v)) : null;
    const s1316 = his.filter((x) => ["13", "16"].includes(x.t.slice(11, 13))).map((x) => x.v);
    const c = name === "day2" ? HEAT.lead2 : HEAT.lead1;
    out[name] = { raw: r1(raw), raw1316: r1(s1316.length ? Math.max(...s1316) : null), corrected: name === "day0" ? null : r1(correctHeat(raw, c)) };
  }
  return out;
}

// ---- ENS from the archive
function ensDay(icao, date) {
  const f = readdirSync(rawDir).find((x) => x.endsWith(`_${icao}_ens.json.gz`));
  if (!f) return null;
  const ens = JSON.parse(gunzipSync(readFileSync(join(rawDir, f))).toString("utf8"));
  const h = ens.hourly;
  const idx = h.time.map((t, i) => [t, i]).filter(([t]) => t.slice(0, 10) === date).map(([, i]) => i);
  if (!idx.length) return null;
  const members = [["temperature_2m", "relative_humidity_2m"]];
  for (let m = 1; m <= 50; m++) members.push([`temperature_2m_member${String(m).padStart(2, "0")}`, `relative_humidity_2m_member${String(m).padStart(2, "0")}`]);
  const maxAll = [];
  const max1316 = [];
  for (const [tk, rk] of members) {
    if (!h[tk]) continue;
    const v = idx.map((i) => ({ t: h.time[i], v: heatIndexC(h[tk][i], h[rk][i]) })).filter((x) => x.v != null);
    maxAll.push(Math.max(...v.map((x) => x.v)));
    const s = v.filter((x) => ["13", "16"].includes(x.t.slice(11, 13))).map((x) => x.v);
    if (s.length) max1316.push(Math.max(...s));
  }
  const c = HEAT.lead1;
  const cor = maxAll.map((v) => correctHeat(v, c));
  return { members: maxAll.length, grid: `${ens.latitude},${ens.longitude}`, rawP50: r1(med(maxAll)), raw1316P50: r1(med(max1316)),
    allHoursMinus1316: r1(med(maxAll.map((v, i) => v - max1316[i]))),
    corP50: r1(med(cor)), corP10: r1(dressedQuantile(cor, 0.1, c.sd)), corP90: r1(dressedQuantile(cor, 0.9, c.sd)),
    pDanger42: r1(dressedChance(cor, 42, c.sd)), pWarning33: r1(dressedChance(cor, 33, c.sd)) };
}

const rows = [];
for (const date of DATES) {
  AIRPORTS.forEach((a, k) => {
    const o = obsDay(a.id, date);
    const hr = hresDay(k, date);
    const en = ensDay(a.id, date);
    rows.push({ date, icao: a.id, name: a.name, region: a.region, obs: o, hres: hr, ens: en });
  });
}
const out = { made: new Date().toISOString(), inputs: { metarFile, prevFile, rawDir }, heat: HEAT, rows };
writeFileSync(join(HERE, "out", "spot_check_2026-10-24.json"), JSON.stringify(out, null, 1) + "\n");

const f = (v, w = 5) => (v == null ? "-" : (v > 0 && w < 0 ? "+" : "") + v.toFixed(1)).padStart(Math.abs(w));
const fs = (v) => (v == null ? "    -" : (v >= 0 ? "+" : "") + v.toFixed(1)).padStart(5);
console.log(`spot check — METAR obs vs forecasts (°C heat index, daily max over the Bangkok day); made ${out.made}`);
console.log("date       ICAO  obs(:00) all  rounding10–90  complete | HRES d0 raw | d1 raw→cor (err) | d2 raw→cor (err) | ENS raw p50 (err) → cor p50 [p10–p90] (err) P≥42 | bands obs/d1/ENS");
for (const r of rows) {
  const o = r.obs;
  const d1 = r.hres.day1;
  const d2 = r.hres.day2;
  const e = r.ens;
  const err = (v) => (v == null || o.himax == null ? null : v - o.himax);
  console.log(`${r.date} ${r.icao}  ${f(o.himax)} ${f(o.himaxAll)}  ${o.rounding ? `${f(o.rounding.p10)}–${f(o.rounding.p90)}` : "     -     "}  ${o.complete ? "yes" : `no (${o.onHour} h, ${o.afternoonHours} pm)`} `
    + `| ${f(r.hres.day0.raw)} (${fs(err(r.hres.day0.raw))}) | ${f(d1.raw)}→${f(d1.corrected)} (${fs(err(d1.corrected))}) | ${f(d2.raw)}→${f(d2.corrected)} (${fs(err(d2.corrected))}) `
    + `| ${e ? `${f(e.rawP50)} (${fs(err(e.rawP50))}) → ${f(e.corP50)} [${f(e.corP10)}–${f(e.corP90)}] (${fs(err(e.corP50))}) ${f(e.pDanger42, 4)}` : "-"} `
    + `| ${BAND_TH[band(o.himax)] ?? "-"}/${BAND_TH[band(d1.corrected)] ?? "-"}/${e ? BAND_TH[band(e.corP50)] : "-"}  max at ${o.at}`);
}
// summaries
for (const date of DATES) {
  const R = rows.filter((r) => r.date === date && r.obs.complete && r.obs.himax != null);
  const m = (g) => { const v = R.map(g).filter((x) => x != null); return v.length ? `${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)} (n=${v.length})` : "-"; };
  console.log(`\n${date} complete days: ${R.length}`);
  console.log(`  mean error, HRES day0 raw ${m((r) => r.hres.day0.raw - r.obs.himax)}; day1 raw ${m((r) => r.hres.day1.raw - r.obs.himax)}, corrected ${m((r) => r.hres.day1.corrected - r.obs.himax)}; `
    + `day2 raw ${m((r) => r.hres.day2.raw - r.obs.himax)}, corrected ${m((r) => r.hres.day2.corrected - r.obs.himax)}`);
  console.log(`  mean |error|, day1 corrected ${m((r) => Math.abs(r.hres.day1.corrected - r.obs.himax))}; day2 corrected ${m((r) => Math.abs(r.hres.day2.corrected - r.obs.himax))}`);
  console.log(`  ENS raw p50 error ${m((r) => (r.ens ? r.ens.rawP50 - r.obs.himax : null))}; ENS corrected p50 error ${m((r) => (r.ens ? r.ens.corP50 - r.obs.himax : null))}, |error| ${m((r) => (r.ens ? Math.abs(r.ens.corP50 - r.obs.himax) : null))}`);
  console.log(`  obs inside the dressed ENS 10–90 % range: ${R.filter((r) => r.ens).filter((r) => r.obs.himax >= r.ens.corP10 && r.obs.himax <= r.ens.corP90).length} of ${R.filter((r) => r.ens).length}`);
  console.log(`  ENS: median over members of (max over all hours − max of 13:00/16:00): ${R.filter((r) => r.ens).map((r) => `${r.icao} ${r.ens.allHoursMinus1316}`).join(", ")}`);
  console.log(`  METAR: all reports − on-the-hour max: ${R.map((r) => `${r.icao} ${(r.obs.himaxAll - r.obs.himax).toFixed(1)}`).join(", ")}; rounding spread (p90−p10): ${R.map((r) => `${r.icao} ${(r.obs.rounding.p90 - r.obs.rounding.p10).toFixed(1)}`).join(", ")}`);
}

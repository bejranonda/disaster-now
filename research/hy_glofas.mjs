// Hat Yai flood hindcast (2026-10-24): what GloFAS v4 (Open-Meteo's Flood API) has for Khlong U-Taphao.
// Open-Meteo's docs (read 2026-10-24, https://open-meteo.com/en/docs/flood-api): GloFAS v4 at 0.05 deg, "the largest
// river in a 5 km area"; consolidated (reanalysis) 1984 - July 2022; "seamless combines forecast and consolidated";
// nothing about forecasts archived by issue date. So this asks:
//   1. which 0.05 deg cell carries the U-Taphao at Hat Yai (a 5 x 5 cell search around gauge X.44, Nov 2025);
//   2. the reanalysis at that cell, 1984 - Jul 2022: do the 2000 and 2010 Hat Yai floods stand out?
//   3. the seamless (stitched forecast) series Oct - Dec 2025: does the Nov 2025 flood stand out, and how big?
//   4. whether forecast members for a past date come back (forecast_v4, ensemble=true, Nov 2025).
// Every call is cached, at least 1.1 s apart, honest User-Agent, and appended to the shared ledger
// research/logs/openmeteo-calls-2026-10-24.log with Open-Meteo's weight (max(1, vars/10) x max(1, days/14) x locations).
//   node research/hy_glofas.mjs -> research/out/hy_glofas.json, research/logs/hy_glofas-2026-10-24.log
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)";
const CACHE = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hy/openmeteo";
const LEDGER = join(HERE, "logs", "openmeteo-calls-2026-10-24.log");
const LOG = join(HERE, "logs", "hy_glofas-2026-10-24.log");
mkdirSync(CACHE, { recursive: true });
const lines = [];
const log = (s = "") => { console.log(s); lines.push(s); };
let last = 0;
let calls = 0;

function weight(p) {
  const nv = ["hourly", "daily", "current"].reduce((n, k) => n + (p[k] ? String(p[k]).split(",").length : 0), 0);
  const nloc = String(p.latitude).split(",").length;
  const days = p.start_date ? (Date.parse(p.end_date) - Date.parse(p.start_date)) / 864e5 + 1 : (+p.past_days || 0) + (+p.forecast_days || 7);
  return +(Math.max(1, nv / 10) * Math.max(1, days / 14) * nloc).toFixed(2);
}
async function get(params, label) {
  const url = "https://flood-api.open-meteo.com/v1/flood?" + new URLSearchParams(params).toString().replaceAll("%2C", ",");
  const f = join(CACHE, createHash("sha256").update(url).digest("hex").slice(0, 24) + ".json");
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
  last = Date.now();
  calls++;
  const r = await fetch(url, { headers: { "user-agent": UA } });
  const txt = await r.text();
  appendFileSync(LEDGER, `${new Date().toISOString().slice(0, 19)}Z\t${r.status}\tw=${weight(params)}\thy ${label}\t${url}\n`);
  if (r.status === 429 || /limit/i.test(txt.slice(0, 400))) throw new Error(`stopped: ${r.status} ${txt.slice(0, 300)}`);
  if (r.status !== 200) return { _error: r.status, _text: txt.slice(0, 500) };
  writeFileSync(f, txt);
  return JSON.parse(txt);
}
const series = (js) => js.daily.time.map((t, i) => [t, js.daily.river_discharge[i]]);
const top = (s, n) => [...s].filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]).slice(0, n);

// 1. cell search around X.44 (Ban Hat Yai Nai, 7.00218 N, 100.456062 E: FloodWatch's station list)
const X44 = [7.00218, 100.456062];
const la = [], lo = [];
for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { la.push(+(X44[0] + 0.05 * i).toFixed(3)); lo.push(+(X44[1] + 0.05 * j).toFixed(3)); }
const grid = await get({ latitude: la.join(","), longitude: lo.join(","), daily: "river_discharge", start_date: "2025-11-01", end_date: "2025-12-10", timezone: "Asia/Bangkok" }, "glofas U-Taphao cell search Nov 2025");
const cells = (Array.isArray(grid) ? grid : [grid]).map((js) => {
  const s = series(js);
  const vals = s.map(([, v]) => v).filter((v) => v != null);
  const mx = top(s, 1)[0];
  const km = Math.hypot(js.latitude - X44[0], (js.longitude - X44[1]) * Math.cos(X44[0] * Math.PI / 180)) * 111.2;
  return { lat: js.latitude, lon: js.longitude, km: +km.toFixed(1), mean: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1), max: mx?.[1], maxDate: mx?.[0] };
});
const uniq = [...new Map(cells.map((c) => [`${c.lat},${c.lon}`, c])).values()].sort((a, b) => b.max - a.max);
log(`1. Cell search, 25 points at 0.05 deg around X.44, 1 Nov - 10 Dec 2025 (seamless v4): ${uniq.length} distinct cells returned`);
for (const c of uniq.slice(0, 10)) log(`   ${c.lat}, ${c.lon} (${c.km} km from X.44): mean ${c.mean} m3/s, max ${c.max} on ${c.maxDate}`);
// the main stem: the largest Nov 2025 peak among cells within 6 km of X.44
const main = uniq.filter((c) => c.km <= 6).sort((a, b) => b.max - a.max)[0];
log(`   chosen: ${main.lat}, ${main.lon} (${main.km} km from X.44), the largest peak within 6 km`);

// 2. reanalysis at that cell
const rea = await get({ latitude: main.lat, longitude: main.lon, daily: "river_discharge", start_date: "1984-01-01", end_date: "2022-07-31", models: "consolidated_v4", timezone: "Asia/Bangkok" }, "glofas U-Taphao consolidated_v4 1984-2022");
const rs = series(rea);
const annual = {};
for (const [t, v] of rs) if (v != null) { const y = t.slice(0, 4); if (!annual[y] || v > annual[y][1]) annual[y] = [t, v]; }
const am = Object.values(annual).sort((a, b) => b[1] - a[1]);
log(`\n2. Reanalysis (consolidated_v4) at ${rea.latitude}, ${rea.longitude}: ${rs.length} days ${rs[0][0]}..${rs[rs.length - 1][0]}`);
const yrs = Object.keys(annual).sort();
log(`   non-empty years: ${yrs[0]}..${yrs[yrs.length - 1]} (${yrs.length}; earlier years came back empty, the last is partial)`);
log(`   largest annual maxima: ${am.slice(0, 8).map(([t, v]) => `${t} ${v.toFixed(0)}`).join(", ")}`);
const rank = (date) => am.findIndex(([t]) => t.slice(0, 7) === date) + 1;
for (const [name, ym] of [["Nov 2000 flood", "2000-11"], ["Nov 2010 flood", "2010-11"]]) {
  const inMonth = rs.filter(([t, v]) => t.startsWith(ym) && v != null).sort((a, b) => b[1] - a[1])[0];
  log(`   ${name}: month max ${inMonth ? `${inMonth[1].toFixed(0)} m3/s on ${inMonth[0]}` : "n/a"}; rank of that year's maximum among ${am.length} annual maxima: ${annual[ym.slice(0, 4)] && annual[ym.slice(0, 4)][0].startsWith(ym) ? rank(ym) : "its year's max was in another month"}`);
}

// 3. the stitched forecast series, Oct - Dec 2025
const sea = await get({ latitude: main.lat, longitude: main.lon, daily: "river_discharge", start_date: "2025-10-01", end_date: "2025-12-31", timezone: "Asia/Bangkok" }, "glofas U-Taphao seamless Oct-Dec 2025");
const ss = series(sea);
const sm = top(ss, 1)[0];
log(`\n3. Seamless (stitched forecast) at the same cell, Oct - Dec 2025: max ${sm[1].toFixed(0)} m3/s on ${sm[0]}; vs the reanalysis' largest annual maximum ${am[0][1].toFixed(0)} (${am[0][0]})`);
log(`   daily 15 Nov - 5 Dec: ${ss.filter(([t]) => t >= "2025-11-15" && t <= "2025-12-05").map(([t, v]) => `${t.slice(8)}:${v == null ? "-" : v.toFixed(0)}`).join(" ")}`);
const above = am.filter(([, v]) => v >= sm[1]).length;
log(`   annual maxima 1997-2022 at or above the 2025 stitched peak: ${above} of ${am.length}`);

// 4. forecast members for a past date?
const ens = await get({ latitude: main.lat, longitude: main.lon, daily: "river_discharge", start_date: "2025-11-15", end_date: "2025-11-30", models: "forecast_v4", ensemble: "true", timezone: "Asia/Bangkok" }, "glofas U-Taphao forecast_v4 ensemble Nov 2025");
const keys = ens.daily ? Object.keys(ens.daily).filter((k) => k !== "time") : [];
log(`\n4. forecast_v4 with ensemble=true for 15-30 Nov 2025: ${ens._error ? `HTTP ${ens._error} ${ens._text}` : `${keys.length} series (${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", ..." : ""})`}`);
if (ens.daily) {
  const m = keys.filter((k) => /member/.test(k));
  const day = (t) => ens.daily.time.indexOf(t);
  for (const t of ["2025-11-20", "2025-11-23", "2025-11-26"]) {
    const i = day(t);
    const v = keys.map((k) => ens.daily[k][i]).filter((x) => x != null);
    log(`   ${t}: ${v.length} values, min ${Math.min(...v).toFixed(0)}, max ${Math.max(...v).toFixed(0)} (members ${m.length})`);
  }
}

writeFileSync(join(HERE, "out", "hy_glofas.json"), JSON.stringify({ cells: uniq, chosen: main, reanalysisAnnualMax: am, seamless2025: ss, seamlessPeak: sm, ensembleKeys: keys }, null, 1));
appendFileSync(LOG, `\n===== ${new Date().toISOString()} node research/hy_glofas.mjs (${calls} new calls)\n` + lines.join("\n") + "\n");

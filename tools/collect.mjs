#!/usr/bin/env node
// The collector: the feeds a phone can't read itself (no CORS, or a broken certificate chain), fetched on a schedule
// and written as small static files the page reads from data/live/. It keeps nothing about people: it never sees a
// visitor. Run every 10–30 minutes (never faster than the sources update), from cron, a CI schedule or its own loop
// (docker-compose.yml's `collector` service; docs/SERVER.md):
//   node tools/collect.mjs [--out public/data/live]          once
//   node tools/collect.mjs --every 900                        forever, every 900 s (at least 600)
// LIVE_DIR sets the output folder too (the container's volume).
// Files: warnings.json (TMD CAP by province code), tmd_quakes.json (TMD's earthquake RSS), storms.json (TMD's storm
// tracks), hotspots.json (NASA FIRMS
// VIIRS, Thailand's box), air4thai.json (PCD stations), floodwatch.json (FloodWatch's gauges: status, outlook,
// "⚠️ จับตา" groups, upstream travel times), rain3d.json (rain measured over 2–3 days, from hourly readings of
// ThaiWater's gauges kept in rain_hist.json), index.json (what was written, when, what failed).
// Optional, from the environment (.env locally, docker-compose.yml on the server; nothing is needed):
// - AI_ENABLED=1 + GLM_API_KEY: TMD's Thai warnings get a checked English translation (`en`, tools/translate.mjs),
//   once per warning text, at most AI_DAILY_CALLS GLM calls a UTC day (docs/AI.md).
// - CLOUDFLARE_ACCOUNT_ID + CF_KV_NAMESPACE_ID + CF_KV_TOKEN: the files are also uploaded to Workers KV for the
//   Cloudflare Worker (tools/publish-live.mjs, docs/CLOUDFLARE.md).
import { mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import https from "node:https";
import tls from "node:tls";
import { glmConfig } from "./glm.mjs";
import { translateWarnings } from "./translate.mjs";
import { kvConfig, publishKV } from "./publish-live.mjs";

/** The honest User-Agent: the site's address and, when set, a contact (read at call time: .env loads after import). */
export const ua = (env = process.env) => `disaster-now-collector/0.3 (+https://${env.PUBLIC_HOST || "github.com/bejranonda/disaster-now"}`
  + `${env.CONTACT_EMAIL ? `; contact: ${env.CONTACT_EMAIL}` : ""})`;
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1]
  : process.env.LIVE_DIR || new URL("../public/data/live/", import.meta.url).pathname;
/** The loop's interval: never under 10 minutes (TMD's CAP and FIRMS update every 10–60 min; GUIDELINES §5). */
export const MIN_EVERY_S = 600;
const TIMEOUT = 60000;
// `ca` replaces Node's default list, so keep the host's extra CAs (NODE_EXTRA_CA_CERTS, e.g. a proxy's) in it
const EXTRA_CA = process.env.NODE_EXTRA_CA_CERTS ? [readFileSync(process.env.NODE_EXTRA_CA_CERTS, "utf8")] : [];

/** GET as text, gzip allowed, an honest User-Agent; `ca` adds trusted certificates for one host (Air4Thai). */
export function fetchText(url, { ca } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "user-agent": ua(), "accept-encoding": "identity" }, timeout: TIMEOUT,
      ...(ca ? { ca: [...tls.rootCertificates, ...EXTRA_CA, ...ca] } : {}) }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchText(new URL(res.headers.location, url).href, { ca }));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8").replace(/^﻿/, "")));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

// exact element names: "<value>" must not match "<valueName>"
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : null;
};
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g"))].map((m) => m[1].trim());

// ---------- TMD CAP warnings ----------
/** One CAP 1.2 item → a warning with its province codes (ISO 3166-2 "TH-80" = the DOPA code 80). Times are taken
 *  from the CAP item itself: the RSS list's pubDate is 7 h early (Hazard-huntz docs/09 §4). Polygons are dropped:
 *  they are the provinces' own outlines (1,379 of 1,380 subdistricts agreed, docs/09). */
export function parseCap(xml) {
  const info = tag(xml, "info") || "";
  const provinces = tags(info, "geocode").filter((g) => /ISO3166-2/.test(g)).map((g) => tag(g, "value"))
    .map((v) => Number(String(v).replace("TH-", ""))).filter((n) => n > 0);
  return {
    id: tag(xml, "identifier"), sent: tag(xml, "sent"), status: tag(xml, "status"), msgType: tag(xml, "msgType"),
    event: tag(info, "event"), headline: tag(info, "headline"), description: tag(info, "description"),
    instruction: tag(info, "instruction"), severity: tag(info, "severity"), urgency: tag(info, "urgency"),
    certainty: tag(info, "certainty"), effective: tag(info, "effective"), expires: tag(info, "expires"),
    areaDesc: tag(info, "areaDesc"), web: tag(info, "web"), provinces,
    // CAP 1.2: "sender,identifier,sent" entries, space-separated; an Update or Cancel names what it replaces
    references: (tag(xml, "references") || "").trim().split(/\s+/).map((r) => r.split(",")[1]).filter(Boolean),
  };
}

/** The notices in force: actual, not expired, not a Cancel, and not replaced by a later Update or Cancel that names
 *  them in `<references>`. 0.3.0 ignored references, so a notice TMD had updated or cancelled stayed on the page (on
 *  22 Oct an Update ended an Extreme alert 15 min early; output cross-check X8). */
export function inForce(list, nowMs = Date.now()) {
  const replaced = new Set(list.flatMap((w) => w.references || []));
  return list.filter((w) => w.status === "Actual" && w.msgType !== "Cancel" && !replaced.has(w.id)
    && (!w.expires || Date.parse(w.expires) > nowMs));
}

async function warnings() {
  const url = "https://www.tmd.go.th/api/xml/CAP";
  const rss = await fetchText(url);
  const links = tags(rss, "item").map((it) => tag(it, "link")).filter((l) => l && /\/uploads\/CAP\//.test(l));
  const items = [];
  for (const l of links.slice(0, 20)) {
    try {
      items.push({ ...parseCap(await fetchText(l)), link: l });
    } catch (e) { items.push({ link: l, error: String(e.message || e) }); }
  }
  return { source: "Thai Meteorological Department CAP feed (public domain)", url, items: inForce(items.filter((i) => !i.error)), failed: items.filter((i) => i.error) };
}

// ---------- TMD earthquakes ----------
/** TMD's RSS: the description holds the Bangkok time in CE ("2026-10-24 02:31:21 น."), Lat., Long. and the size;
 *  the title has the place in Thai. */
export function parseTmdQuakes(xml) {
  return tags(xml, "item").map((it) => {
    const title = tag(it, "title") || "";
    const d = tag(it, "description") || "";
    const t = d.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    const ll = d.match(/Lat\.\s*(-?[\d.]+)\s*,\s*Long\.\s*(-?[\d.]+)/);
    const mag = d.match(/ขนาด\s*([\d.]+)/) || title.match(/ขนาด\s*([\d.]+)/);
    const place = title.replace(/^แผ่นดินไหว\s*/, "").replace(/\s*\(.*$/, "").trim();
    if (!t || !ll || !mag) return null;
    return { time: `${t[1]}T${t[2]}+07:00`, lat: Number(ll[1]), lon: Number(ll[2]), mag: Number(mag[1]), placeTh: place,
      place, depth: 10, link: tag(it, "link") };
  }).filter(Boolean);
}

async function tmdQuakes() {
  const url = "https://earthquake.tmd.go.th/feed/rss_inside.xml";
  return { source: "Thai Meteorological Department, earthquake watch", url, items: parseTmdQuakes(await fetchText(url)) };
}

// ---------- TMD storm tracks ----------
/** TMD's storm page calls /api/Weather/StormTrack?stormId=0 ("พายุที่กำลังเกิดขึ้น"): Thai names and TMD's own
 *  track. Its `time` is UTC with no offset (it goes with dateTimeTH +7 h, Buddhist year), wind in knots, forecast rows
 *  marked isPredictData (docs/research/sources-2026-10-23.md gap 1). */
export function parseTmdStorms(j) {
  return ((j && j.stormTrackingData) || []).map((s) => ({
    name: s.name, nameEN: s.nameEN, id: s.id,
    path: (s.path || []).map((p) => ({ t: `${String(p.time).slice(0, 19)}Z`, lat: p.latitude, lon: p.longitude, type: p.type,
      typeEN: p.typeEN, windKt: p.windSpeed || null, forecast: !!p.isPredictData })).filter((p) => p.lat != null && p.lon != null),
  })).filter((s) => s.path.length);
}

async function tmdStorms() {
  const url = "https://www.tmd.go.th/api/Weather/StormTrack?stormId=0";
  return { source: "Thai Meteorological Department, storm tracking", url, items: parseTmdStorms(JSON.parse(await fetchText(url))) };
}

// ---------- NASA FIRMS hotspots ----------
const TH_BOX = { minLat: 5.4, maxLat: 20.6, minLon: 97.2, maxLon: 105.8 };
/** FIRMS VIIRS CSV → hotspots inside Thailand's box; "low" confidence is left out (FIRMS's own class). */
export function parseFirms(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const h = lines[0].split(",");
  const i = (k) => h.indexOf(k);
  const out = [];
  for (const l of lines.slice(1)) {
    const c = l.split(",");
    const lat = Number(c[i("latitude")]);
    const lon = Number(c[i("longitude")]);
    if (!(lat >= TH_BOX.minLat && lat <= TH_BOX.maxLat && lon >= TH_BOX.minLon && lon <= TH_BOX.maxLon)) continue;
    const conf = c[i("confidence")];
    if (conf === "low" || conf === "l") continue;
    const t = c[i("acq_time")].padStart(4, "0");
    out.push({ lat, lon, t: `${c[i("acq_date")]}T${t.slice(0, 2)}:${t.slice(2)}:00Z`, conf, frp: Number(c[i("frp")]), sat: c[i("satellite")] });
  }
  return out;
}

async function hotspots() {
  const files = ["suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv", "noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_24h.csv"];
  const items = [];
  const used = [];
  let ok = 0;
  for (const f of files) {
    const url = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${f}`;
    try { items.push(...parseFirms(await fetchText(url))); used.push(url); ok++; } catch (e) { used.push(`${url} (${e.message})`); }
  }
  // no file read is no data, never "0 hotspots" (the old file stays and the page shows its age)
  if (!ok) throw new Error(`every FIRMS file failed: ${used.join(" ")}`);
  return { source: "NASA FIRMS VIIRS 375 m, last 24 h", url: used.join(" "), items };
}

// ---------- Air4Thai ----------
const LE = ["lets-encrypt-yr1.crt", "lets-encrypt-root-yr-by-x1.crt"].map((f) => readFileSync(new URL(`./certs/${f}`, import.meta.url), "utf8"));
async function air4thai() {
  // The PCD's server leaves out Let's Encrypt's YR1 intermediate (KNOWN_ISSUES KI-002): add the two public
  // intermediates from letsencrypt.org/certificates for this host only; verification stays on.
  const url = "https://air4thai.pcd.go.th/services/getNewAQI_JSON.php";
  const raw = JSON.parse(await fetchText(url, { ca: LE }));
  return { source: "Pollution Control Department (Air4Thai)", url, raw, items: raw.stations?.length ?? 0 };
}

// ---------- FloodWatch's gauges ----------
const FW = "https://flood.autobahn.bot";
/** One compact row per gauge, the columns of floodwatch.json. */
export const FW_COLS = ["code", "name", "river", "lat", "lon", "status", "freeboard", "obs", "stale", "c24", "rise24", "group", "up", "qc", "pct", "agency", "bank", "twin", "r2"];
// FloodWatch's quality notes that make a reading unfit to judge by (its qc.py); "stale" is a column of its own
const FW_QC = new Set(["erratic", "stuck", "suspect_values_hidden", "datum_suspect"]);
const r2 = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Every gauge FloodWatch lists in its "⚠️ จับตา" groups (/api/risks) → [group key, …what the group carries]. A gauge
 *  is in one group only, its worst (FloodWatch risks.py ORDER). */
export function fwGroups(risks) {
  const out = new Map();
  const walk = (key, x, sub) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { for (const y of x) walk(key, y, sub); return; }
    if (x.code && !out.has(x.code)) {
      const extra = key === "may_reach" ? [x.band, x.hours] : key === "upstream" && x.up ? [x.up.code, x.up.name_th, x.up.lag_h, x.up.rise_cm]
        : key === "fast_rise" ? [x.rise_cm] : key === "near_bank" ? [r2(x.pct, 0)] : key === "over_bank" ? [sub || null] : [];
      out.set(x.code, [key, ...extra]);
      return;
    }
    walk(key, x.items, x.sub || sub);
    walk(key, x.provinces, x.sub || sub);
    walk(key, x.gauges, x.sub || sub);
  };
  for (const g of risks?.groups || []) if (g.key !== "rain") walk(g.key, g.items);
  return out;
}

/** FloodWatch's /api/stations + /api/risks → floodwatch.json's rows: its own status (FloodWatch's bank rule), the
 *  measured 24-h change, the 24-h outlook with its skill against "no change", its "⚠️ จับตา" group, and the upstream
 *  gauges with FloodWatch's learned travel time. Gauges without a position, or that FloodWatch rejects, are left out. */
export function parseFloodWatch(stations, risks) {
  const groups = fwGroups(risks);
  const rows = [];
  for (const s of stations?.stations || []) {
    if (s.lat == null || s.lon == null || s.rejected) continue;
    const notes = s.notes || [];
    if (notes.includes("bad_location") || notes.includes("no_location")) continue;
    const c = s.change24;
    rows.push([s.code, s.name_th || s.code, s.river || null, r2(s.lat, 4), r2(s.lon, 4), s.status || "unknown", r2(s.freeboard_m),
      s.obs_time ? s.obs_time.slice(0, 16) + "Z" : null, s.stale ? 1 : 0,
      c ? [c.dir === "rising" ? 1 : c.dir === "falling" ? -1 : 0, r2(c.median), r2(c.likely?.[0]), r2(c.likely?.[1]), r2(c.skill), c.level || null] : null,
      s.observed24?.change_cm ?? null, groups.get(s.code) || null,
      (s.upstream || []).map((u) => [u.code, u.lag_h]), notes.some((n) => FW_QC.has(n)) ? 1 : 0, r2(s.pct_bank, 0), s.agency || null,
      // the bank FloodWatch judges by; the gauge's twin (the same site, another agency: never "upstream"); the measured
      // 24-h change's fit (a single-reading spike has none: 10 Feb 2025 at Hat Yai, floodwatch-hatyai-leadtime §6)
      r2(s.bank_msl), s.twin?.code || null, r2(s.observed24?.r2)]);
  }
  const rec = risks?.records || {};
  const records = Object.fromEntries(["bank_24", "bank_48", "upstream", "fast_rise", "near_24", "computed_at", "window_days"]
    .filter((k) => rec[k] != null).map((k) => [k, rec[k]]));
  return { generated: stations?.generated || null, records, cols: FW_COLS, rows };
}

async function floodwatch() {
  // the owner's sister app: one fetch for the family instead of every phone asking ThaiWater for forecasts it doesn't
  // have (INTEGRATION §3.5); FloodWatch refreshes its gauges every 10 min, this runs every 15
  const url = `${FW}/api/stations`;
  const stations = JSON.parse(await fetchText(url));
  let risks = null;
  try { risks = JSON.parse(await fetchText(`${FW}/api/risks`)); } catch { /* the rows still carry status and outlook */ }
  const out = parseFloodWatch(stations, risks);
  if (!out.rows.length) throw new Error("no gauges in FloodWatch's answer");
  return { source: "FloodWatch (flood.autobahn.bot), from ThaiWater, RID, EGAT and BMA gauges", url, ...out, items: out.rows.length,
    risks: risks ? "ok" : "failed" };
}

// ---------- measured rain over 3 days ----------
const HII = "https://api-v3.thaiwater.net/api/v1/thaiwater30/public";
/** Read ThaiWater's rain_24h (every gauge, a rolling 24-h total at each reading) at most this often. FloodWatch reads
 *  it every 10 min from its own server; once an hour from here keeps the extra load on HII small (KI-029). */
export const RAIN_EVERY_MIN = 55;
const RAIN_KEEP_H = 50;
const RAIN_MATCH_MIN = 90; // a reading counts for "24 h earlier" when it is within 90 min of exactly 24 h before
/** Only gauges with this much in 72 (or 48) hours are published: the line is for the days that add up. */
export const RAIN_SHOW_MM = 50;

/** ThaiWater rain_24h → {code: [rain24, readingMs, name, lat, lon]} (HII's missing code and 0-0 positions dropped). */
export function parseRain24(j) {
  const out = {};
  for (const r of (j && j.data) || []) {
    const s = r.station || {};
    const lat = Number(s.tele_station_lat);
    const lon = Number(s.tele_station_long);
    const v = r.rain_24h == null || r.rain_24h === "" ? null : Number(r.rain_24h);
    const code = s.tele_station_oldcode;
    if (!code || !(lat > 0 && lon > 0) || v == null || !(v >= 0) || v >= 999990) continue;
    const t = r.rainfall_datetime ? Date.parse(`${String(r.rainfall_datetime).replace(" ", "T").slice(0, 16)}:00+07:00`) : NaN;
    if (!Number.isFinite(t)) continue;
    out[code] = [v, t, s.tele_station_name?.th || code, r2(lat, 4), r2(lon, 4)];
  }
  return out;
}

/** From hourly snapshots [{at, r: parseRain24(…)}], each gauge's rolling totals: r24 now, r48 = now + the reading
 *  24 h before, r72 = + 48 h before, each part within RAIN_MATCH_MIN of its time or the total is unknown (null, never
 *  a smaller number). Rows: [code, name, lat, lon, r24, r48, r72, readingISO]. */
export function rainDays(snaps, nowMs, { showMm = RAIN_SHOW_MM } = {}) {
  if (!snaps.length) return [];
  const last = snaps[snaps.length - 1].r;
  const at = (code, t) => {
    let best = null;
    for (const s of snaps) {
      const x = s.r[code];
      if (x && Math.abs(x[1] - t) <= RAIN_MATCH_MIN * 6e4 && (!best || Math.abs(x[1] - t) < Math.abs(best[1] - t))) best = x;
    }
    return best ? best[0] : null;
  };
  const rows = [];
  for (const [code, [v, t, name, lat, lon]] of Object.entries(last)) {
    if (nowMs - t > 3 * 3.6e6) continue; // FloodWatch's 3 h for a measured rain (point.py)
    const d1 = at(code, t - 24 * 3.6e6);
    const d2 = d1 == null ? null : at(code, t - 48 * 3.6e6);
    const r48 = d1 == null ? null : r2(v + d1, 1);
    const r72 = d2 == null ? null : r2(v + d1 + d2, 1);
    if (Math.max(r48 ?? 0, r72 ?? 0) < showMm) continue;
    rows.push([code, name, lat, lon, r2(v, 1), r48, r72, new Date(t).toISOString().slice(0, 16) + "Z"]);
  }
  return rows.sort((a, b) => (b[6] ?? b[5]) - (a[6] ?? a[5]));
}

// The hourly snapshots on disk: {at, r: {code: [mm, minutes before `at`]}}, about 90 KB each, 50 h kept (r72 needs the
// readings 48 h back): a few MB in the collector's own folder, never uploaded
export const packSnap = (at, r) => ({ at, r: Object.fromEntries(Object.entries(r).filter(([, x]) => at - x[1] <= 3 * 3.6e6)
  .map(([k, x]) => [k, [x[0], Math.round((at - x[1]) / 6e4)]])) });
export const unpackSnap = (s, meta = {}) => ({ at: s.at, r: Object.fromEntries(Object.entries(s.r).map(([k, [v, m]]) => [k, [v, s.at - m * 6e4, ...(meta[k] || [])]])) });

async function rain3d() {
  const now = Date.now();
  let lastAt = 0;
  try { lastAt = statSync(`${OUT}/rain_hist.json`).mtimeMs; } catch { /* first run */ }
  if (now - lastAt < RAIN_EVERY_MIN * 6e4) return null; // not due: the published file stays as it is
  const hist = readJson("rain_hist.json") || { snaps: [] };
  const url = `${HII}/rain_24h`;
  const r = parseRain24(JSON.parse(await fetchText(url)));
  if (!Object.keys(r).length) throw new Error("no rain gauges in ThaiWater's answer");
  hist.snaps = [...(hist.snaps || []).filter((x) => now - x.at <= RAIN_KEEP_H * 3.6e6), packSnap(now, r)];
  write("rain_hist.json", { snaps: hist.snaps }); // the collector's own memory: never uploaded (not a job's file)
  const meta = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.slice(2)]));
  const rows = rainDays(hist.snaps.map((x) => unpackSnap(x, meta)), now);
  const hours = Math.round((now - hist.snaps[0].at) / 3.6e6);
  return { source: "ThaiWater (HII) rain gauges, rolling 24-h totals read hourly by this site's collector", url,
    history_h: hours, show_mm: RAIN_SHOW_MM, cols: ["code", "name", "lat", "lon", "r24", "r48", "r72", "t"], rows, items: rows.length };
}

// ---------- main ----------
function write(name, obj) {
  const tmp = `${OUT}/${name}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj));
  renameSync(tmp, `${OUT}/${name}`); // readers never see half a file
}

const readJson = (name) => { try { return JSON.parse(readFileSync(`${OUT}/${name}`, "utf8")); } catch { return null; } };

/** English for the warnings (GLM, checked), within the day's call budget kept in index.json → ai. */
async function addEnglish(data, index) {
  const day = new Date().toISOString().slice(0, 10);
  if (index.ai?.day !== day) index.ai = { day, calls: 0 };
  const budget = { left: Math.max(0, Number(process.env.AI_DAILY_CALLS || 200) - index.ai.calls) };
  const prev = readJson("warnings.json")?.items || [];
  const r = await translateWarnings(data.items, prev, { budget, log: (m) => console.error(m) });
  index.ai.calls += r.calls;
  const n = r.items.filter((w) => w.en).length;
  if (data.items.length) console.log(`warnings.json: English for ${n} of ${data.items.length} (${r.calls} GLM calls this run)`);
  return { ...data, items: r.items };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  let index = { files: {}, failed: {} };
  try { index = JSON.parse(readFileSync(`${OUT}/index.json`, "utf8")); index.failed = {}; } catch { /* first run */ }
  const jobs = { "warnings.json": warnings, "tmd_quakes.json": tmdQuakes, "storms.json": tmdStorms, "hotspots.json": hotspots,
    "air4thai.json": air4thai, "floodwatch.json": floodwatch, "rain3d.json": rain3d };
  const written = [];
  for (const [file, job] of Object.entries(jobs)) {
    try {
      let data = await job();
      if (data == null) continue; // not due this run (rain3d.json: hourly)
      if (file === "warnings.json" && glmConfig()) data = await addEnglish(data, index);
      const fetched = new Date().toISOString();
      write(file, { ...data, fetched });
      index.files[file] = fetched;
      written.push(file);
      console.log(`${file}: ${Array.isArray(data.items) ? data.items.length : data.items} items`);
    } catch (e) {
      index.failed[file] = String(e.message || e); // the old file stays; the page shows its age
      console.error(`${file}: FAILED ${e.message || e}`);
    }
  }
  index.generated = new Date().toISOString();
  // Workers KV for the Cloudflare Worker: this run's files first, then the index that names them (KV's free writes:
  // 1,000 a day; this is at most 8 a run, 7 in the runs rain3d.json isn't due: ≈ 696 a day at 15 min)
  const kv = kvConfig();
  if (kv) {
    const files = written.map((name) => ({ name, text: readFileSync(`${OUT}/${name}`, "utf8"), fetched: index.files[name] }));
    const r = files.length ? await publishKV(kv, files) : { ok: true, n: 0 };
    index.kv = { at: new Date().toISOString(), ok: r.ok, ...(r.ok ? {} : { error: r.error }) };
    console[r.ok ? "log" : "error"](`kv: ${r.ok ? `${r.n} files uploaded` : `FAILED ${r.error}`}`);
  }
  write("index.json", index);
  if (kv) {
    const r = await publishKV(kv, [{ name: "index.json", text: JSON.stringify(index), fetched: index.generated }]);
    if (!r.ok) console.error(`kv: index.json FAILED ${r.error}`);
  }
}

/** --every N: run, wait N seconds, run again; one failed run never stops the loop. SIGTERM ends it between runs. */
async function loop(everyS) {
  let stop = false;
  let wake = null;
  let timer = null;
  for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { stop = true; clearTimeout(timer); if (wake) wake(); });
  while (!stop) {
    const t0 = Date.now();
    try { await main(); } catch (e) { console.error(`run FAILED ${e.message || e}`); }
    console.log(`${new Date().toISOString()} done in ${Math.round((Date.now() - t0) / 1000)} s; next in ${everyS} s`);
    if (stop) break;
    await new Promise((ok) => { wake = ok; timer = setTimeout(ok, everyS * 1000); });
    wake = null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // local runs read .env (docker compose passes the variables itself; a set variable always wins over the file)
  (await import("./env.mjs")).loadEnv();
  const every = args.includes("--every") ? Number(args[args.indexOf("--every") + 1]) : 0;
  if (every) {
    if (!(every >= MIN_EVERY_S)) { console.error(`--every must be at least ${MIN_EVERY_S} seconds`); process.exit(2); }
    loop(every);
  } else main();
}

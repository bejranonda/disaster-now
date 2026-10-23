#!/usr/bin/env node
// The collector: the feeds a phone can't read itself (no CORS, or a broken certificate chain), fetched on a schedule
// and written as small static files the page reads from data/live/. It keeps nothing about people: it never sees a
// visitor. Run every 10–30 minutes (never faster than the sources update), e.g. from cron on the owner's FloodWatch
// server or a CI schedule (docs/DEPLOY.md):
//   node tools/collect.mjs [--out public/data/live]
// Files: warnings.json (TMD CAP by province code), tmd_quakes.json (TMD's earthquake RSS), storms.json (TMD's storm
// tracks), hotspots.json (NASA FIRMS
// VIIRS, Thailand's box), air4thai.json (PCD stations), index.json (what was written, when, what failed).
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import https from "node:https";
import tls from "node:tls";

const UA = "disaster-now-collector/0.1 (+https://github.com/bejranonda/disaster-now)";
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : new URL("../public/data/live/", import.meta.url).pathname;
const TIMEOUT = 60000;
// `ca` replaces Node's default list, so keep the host's extra CAs (NODE_EXTRA_CA_CERTS, e.g. a proxy's) in it
const EXTRA_CA = process.env.NODE_EXTRA_CA_CERTS ? [readFileSync(process.env.NODE_EXTRA_CA_CERTS, "utf8")] : [];

/** GET as text, gzip allowed, an honest User-Agent; `ca` adds trusted certificates for one host (Air4Thai). */
export function fetchText(url, { ca } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "user-agent": UA, "accept-encoding": "identity" }, timeout: TIMEOUT,
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
  };
}

async function warnings() {
  const url = "https://www.tmd.go.th/api/xml/CAP";
  const rss = await fetchText(url);
  const links = tags(rss, "item").map((it) => tag(it, "link")).filter((l) => l && /\/uploads\/CAP\//.test(l));
  const items = [];
  for (const l of links.slice(0, 20)) {
    try {
      const w = parseCap(await fetchText(l));
      const live = !w.expires || Date.parse(w.expires) > Date.now();
      if (w.status === "Actual" && w.msgType !== "Cancel" && live) items.push({ ...w, link: l });
    } catch (e) { items.push({ link: l, error: String(e.message || e) }); }
  }
  return { source: "Thai Meteorological Department CAP feed (public domain)", url, items: items.filter((i) => !i.error), failed: items.filter((i) => i.error) };
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
  for (const f of files) {
    const url = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${f}`;
    try { items.push(...parseFirms(await fetchText(url))); used.push(url); } catch (e) { used.push(`${url} (${e.message})`); }
  }
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

// ---------- main ----------
function write(name, obj) {
  const tmp = `${OUT}/${name}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj));
  renameSync(tmp, `${OUT}/${name}`); // readers never see half a file
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  let index = { files: {}, failed: {} };
  try { index = JSON.parse(readFileSync(`${OUT}/index.json`, "utf8")); index.failed = {}; } catch { /* first run */ }
  const jobs = { "warnings.json": warnings, "tmd_quakes.json": tmdQuakes, "storms.json": tmdStorms, "hotspots.json": hotspots,
    "air4thai.json": air4thai };
  for (const [file, job] of Object.entries(jobs)) {
    try {
      const data = await job();
      const fetched = new Date().toISOString();
      write(file, { ...data, fetched });
      index.files[file] = fetched;
      console.log(`${file}: ${Array.isArray(data.items) ? data.items.length : data.items} items`);
    } catch (e) {
      index.failed[file] = String(e.message || e); // the old file stays; the page shows its age
      console.error(`${file}: FAILED ${e.message || e}`);
    }
  }
  index.generated = new Date().toISOString();
  write("index.json", index);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

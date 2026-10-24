// Every network call the page makes, in one place. Each returns {ok, data, error, url, at}; one failing source
// never stops the others (GUIDELINES rule 8). Points are rounded to ~1 km first (geo.rounded); the exact GPS fix
// never leaves the phone. Responses are cached in sessionStorage for the source's own cadence.

import { rounded } from "./geo.js";

const TIMEOUT_MS = 12000;

// Each source: base URL, cadence (cache minutes) and the credit line the page shows.
export const SOURCES = {
  ens: { url: "https://ensemble-api.open-meteo.com/v1/ensemble", ttl: 30,
    credit: { th: "ECMWF IFS ensemble ผ่าน Open-Meteo (CC BY 4.0)", en: "ECMWF IFS ensemble via Open-Meteo (CC BY 4.0)" } },
  aq: { url: "https://air-quality-api.open-meteo.com/v1/air-quality", ttl: 30,
    credit: { th: "CAMS (Copernicus) ผ่าน Open-Meteo (CC BY 4.0)", en: "CAMS (Copernicus) via Open-Meteo (CC BY 4.0)" } },
  elev: { url: "https://api.open-meteo.com/v1/elevation", ttl: 1440,
    credit: { th: "Copernicus DEM ผ่าน Open-Meteo", en: "Copernicus DEM via Open-Meteo" } },
  gistda: { url: "https://pm25.gistda.or.th/rest/getPm25byLocation", ttl: 20,
    credit: { th: "GISTDA (สทอภ.)", en: "GISTDA" } },
  twRain: { url: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h", ttl: 15,
    credit: { th: "คลังข้อมูลน้ำแห่งชาติ (สสน.)", en: "ThaiWater (HII)" } },
  twLevel: { url: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load", ttl: 15,
    credit: { th: "คลังข้อมูลน้ำแห่งชาติ (สสน.)", en: "ThaiWater (HII)" } },
  hiiFf: { url: "https://fews2.hii.or.th/model-output/data_portal/flashflood/flashflood_report.txt", ttl: 60,
    credit: { th: "ระบบเตือนภัยน้ำป่า สสน.", en: "HII flash-flood report" } },
  emsc: { url: "https://www.seismicportal.eu/fdsnws/event/1/query", ttl: 5,
    credit: { th: "EMSC (CC BY 4.0)", en: "EMSC (CC BY 4.0)" } },
  usgs: { url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", ttl: 5,
    credit: { th: "USGS", en: "U.S. Geological Survey" } },
  gdacs: { url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH", ttl: 30,
    credit: { th: "GDACS (ไม่ใช่ประกาศทางการ)", en: "GDACS (not an official warning)" } },
  dmrSlide: { url: "https://gisportal.dmr.go.th/arcgis/rest/services/HAZARD/VILLLAGE_RISK/MapServer/0/query", ttl: 1440,
    credit: { th: "กรมทรัพยากรธรณี", en: "Department of Mineral Resources" } },
  dmrFault: { url: "https://gisportal.dmr.go.th/arcgis/rest/services/HAZARD/T_ACTIVEFAULT/MapServer/0/query", ttl: 1440,
    credit: { th: "กรมทรัพยากรธรณี", en: "Department of Mineral Resources" } },
  a4t: { url: "https://air4thai.com/forweb/getAQI_JSON.php", ttl: 20,
    credit: { th: "กรมควบคุมมลพิษ (Air4Thai)", en: "Pollution Control Department (Air4Thai)" } },
  jma: { url: "https://www.jma.go.jp/bosai/typhoon/data/targetTc.json", base: "https://www.jma.go.jp/bosai/typhoon/data/", ttl: 30,
    credit: { th: "ศูนย์พายุ JMA โตเกียว (JMA Public Data License)", en: "JMA RSMC Tokyo (JMA Public Data License)" } },
  fw: { url: "https://flood.autobahn.bot/api/point", ttl: 10,
    credit: { th: "FloodWatch (โครงการพี่น้องของเว็บนี้)", en: "FloodWatch (this site's sister project)" } },
  live: { url: "data/live/", ttl: 10,
    credit: { th: "ตัวเก็บข้อมูลของเว็บนี้", en: "this site's collector" } },
};

/** The collector runs every 15 min; its files older than this are treated as missing. KV keeps the last upload while the
 *  server is down, and a stale empty warnings or hotspot list would read as "no warning", "no fire": calm from missing
 *  data (GUIDELINES rule 7; review 24 Oct 2026, S12). */
export const LIVE_MAX_AGE_H = 2;
export const liveFresh = (index, nowMs) => Boolean(index && index.generated
  && nowMs - Date.parse(index.generated) <= LIVE_MAX_AGE_H * 3.6e6 && Date.parse(index.generated) <= nowMs + 6e5);

const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// `sessionStorage` itself throws where site data is blocked: then nothing is cached and every source still answers (T1)
const session = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };
function cacheGet(key, ttlMin) {
  try {
    const hit = JSON.parse(session().getItem(key) || "null");
    if (hit && Date.now() - hit.at < ttlMin * 60e3) return hit;
  } catch { /* private mode or a full store: just fetch */ }
  return null;
}
function cachePut(key, v) {
  try { session().setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

/** GET with a timeout; text or JSON; cached for the source's ttl. */
export async function get(name, url, { as = "json", fetchImpl = globalThis.fetch } = {}) {
  const ttl = SOURCES[name]?.ttl ?? 10;
  const key = `dn:${url}`;
  const hit = session() ? cacheGet(key, ttl) : null;
  if (hit) return { ok: true, data: hit.data, url, at: hit.at, cached: true };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetchImpl(url, { signal: ctl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}`, url };
    const data = as === "text" ? await r.text() : await r.json();
    if (data && data.error === true) return { ok: false, error: data.reason || "error", url }; // Open-Meteo's own errors
    const out = { ok: true, data, url, at: Date.now() };
    if (session()) cachePut(key, { data, at: out.at });
    return out;
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : (e.message || "network"), url };
  } finally {
    clearTimeout(timer);
  }
}

/** URLs for one point. Everything that needs a position gets the rounded one. */
export function urls(lat, lon, { pv, tambon, nowMs = Date.now() } = {}) {
  const p = rounded(lat, lon);
  const since = new Date(nowMs - 7 * 864e5).toISOString().slice(0, 19);
  const d = (ms) => new Date(ms).toISOString().slice(0, 10);
  return {
    ens: `${SOURCES.ens.url}?${qs({ latitude: p.lat, longitude: p.lon,
      hourly: "temperature_2m,relative_humidity_2m,precipitation,wind_gusts_10m", models: "ecmwf_ifs025",
      // the grid cell's own height, as the heat correction was fitted (GRIB values): Open-Meteo's default lapse-rate
      // downscaling moved T by up to +1.27 °C (Surat Thani), the heat index up to +4.6 °C (model check §4.2)
      elevation: "nan", forecast_days: 4, timezone: "Asia/Bangkok" })}`,
    aq: `${SOURCES.aq.url}?${qs({ latitude: p.lat, longitude: p.lon,
      hourly: "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,uv_index,dust",
      past_days: 1, forecast_days: 4, timezone: "Asia/Bangkok" })}`,
    elev: `${SOURCES.elev.url}?${qs({ latitude: p.lat, longitude: p.lon })}`,
    gistda: `${SOURCES.gistda.url}?${qs({ lat: p.lat, lng: p.lon })}`,
    twRain: pv ? `${SOURCES.twRain.url}?province_code=${String(pv).padStart(2, "0")}` : null,
    twLevel: pv ? `${SOURCES.twLevel.url}?province_code=${String(pv).padStart(2, "0")}` : null,
    hiiFf: SOURCES.hiiFf.url,
    // a box around Thailand and its neighbours: Myanmar's Sagaing fault, Laos, Sumatra and the Andaman Sea
    emsc: `${SOURCES.emsc.url}?${qs({ format: "json", minlat: -8, maxlat: 30, minlon: 85, maxlon: 112, minmag: 2.5,
      starttime: since, limit: 300, orderby: "time" })}`,
    usgs: SOURCES.usgs.url,
    gdacs: `${SOURCES.gdacs.url}?${qs({ eventlist: "TC;FL;DR;WF;EQ", alertlevel: "Green;Orange;Red", fromdate: d(nowMs - 10 * 864e5), todate: d(nowMs + 864e5) })}`,
    dmrSlide: `${SOURCES.dmrSlide.url}?${qs({ geometry: `${p.lon},${p.lat}`, geometryType: "esriGeometryPoint", inSR: 4326,
      distance: 3000, units: "esriSRUnit_Meter", spatialRel: "esriSpatialRelIntersects", returnCountOnly: true, f: "json" })}`,
    // the fault layer lists subdistricts within 20 km of an active fault: asked by the subdistrict's code, no position
    dmrFault: tambon ? `${SOURCES.dmrFault.url}?${qs({ where: `TB_CODE='${tambon}'`, outFields: "TB_CODE,F_ZONE_T,F_ZONE_E",
      returnGeometry: false, f: "json" })}` : null,
    live: (file) => `${SOURCES.live.url}${file}`,
  };
}

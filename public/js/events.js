// Official warnings (TMD, through the collector), GDACS's current events, fire hotspots (NASA FIRMS, through the
// collector) and the DMR's landslide and fault layers, for one point. Pure functions.

import { km } from "./geo.js";

/** TMD CAP warnings for one province (the collector relays the CAP items' province codes, KNOWLEDGE §4: TMD's
 *  polygons are the provinces' outlines). Expired items are dropped. */
export function warningsFor(live, pv, nowMs) {
  const items = (live && live.items) || [];
  return items.filter((w) => (w.provinces || []).includes(pv) && (!w.expires || Date.parse(w.expires) > nowMs))
    .map((w) => ({ ...w, level: CAP_LEVEL[w.severity] ?? 1 }));
}
/** CAP severity → the app's level: TMD's own grading, not the app's (Minor/Moderate → watch, Severe → warning,
 *  Extreme → danger). */
export const CAP_LEVEL = { Minor: 1, Moderate: 1, Severe: 2, Extreme: 3, Unknown: 1 };

/** The tile a TMD CAP warning belongs to, from its event (English in TMD's CAP, e.g. "Heavy Rain") or its Thai
 *  headline; null when it matches none (it then lifts the verdict only). */
export function capHazard(w) {
  const t = `${w.event || ""} ${w.headline || ""}`;
  if (/rain|flood|ฝน|น้ำท่วม|น้ำป่า/i.test(t)) return "rain";
  if (/storm|wind|cyclone|typhoon|depression|thunder|พายุ|ลมแรง|คลื่นลม/i.test(t)) return "wind";
  if (/heat|hot|ร้อน/i.test(t)) return "heat";
  return null;
}

/** GDACS event list → current events near the point. Tropical cyclones within 1,000 km, other kinds only when GDACS
 *  lists Thailand. GDACS says it is "not meant to substitute … official" warnings; the app shows it as context. */
export function gdacsNear(j, lat, lon) {
  return ((j && j.features) || []).filter((f) => {
    const p = f.properties || {};
    return p.iscurrent === "true" || p.iscurrent === true;
  }).map((f) => {
    const p = f.properties;
    const [elon, elat] = f.geometry?.coordinates || [];
    return { type: p.eventtype, name: p.name || p.eventname, alert: p.alertlevel, from: p.fromdate, to: p.todate,
      km: elat == null ? null : km(lat, lon, elat, elon), url: p.url?.report, country: p.country };
  }).filter((e) => (e.type === "TC" ? e.km != null && e.km <= 1000 : /Thailand/i.test(e.country || "")));
}

/** Tropical cyclone level by distance (the app's own rule; GDACS's alert colour shown beside it):
 *  ≤ 300 km → warning, ≤ 600 km → watch. */
export function cycloneLevel(e) {
  if (e.km == null) return 0;
  return e.km <= 300 ? 2 : e.km <= 600 ? 1 : 0;
}

/** FIRMS hotspots (collector: [{lat, lon, t, conf, frp}]) within `radius` km in the file's 24 hours. */
export function hotspotsNear(live, lat, lon, radius = 25, nowMs = null) {
  // the collector's file can span 36 h (FIRMS's "24h" file is by pass date): count the last 24 h only (visitor audit V24)
  const rows = ((live && live.items) || []).filter((h) => nowMs == null || !h.t || nowMs - Date.parse(h.t) <= 864e5);
  const near = rows.map((h) => ({ ...h, km: km(lat, lon, h.lat, h.lon) })).filter((h) => h.km <= radius);
  return { count: near.length, nearest: near.sort((a, b) => a.km - b.km)[0] || null, radius };
}
/** Hotspot level: the app's own counting rule (no Thai agency grades hotspots by count; KNOWLEDGE §3). */
export const hotspotLevel = (n) => (n >= 20 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0);

/** ArcGIS REST count answer {"count": n} → n, or null on an error object. */
export const arcCount = (j) => (j && typeof j.count === "number" ? j.count : null);

/** JMA RSMC Tokyo typhoon forecast (www.jma.go.jp/bosai/typhoon/data/TC…/forecast.json, CORS *, JMA Public Data
 *  License 1.0) → the storm's name, where it is now and how close its forecast 70 % circles come to the point.
 *  JMA covers the western North Pacific and the South China Sea only (docs/research/sources-2026-10-23.md gap 1). */
export function jmaStorm(forecast, lat, lon) {
  if (!Array.isArray(forecast)) return null;
  const title = forecast.find((p) => p.part === "title") || {};
  const pos = forecast.filter((p) => Array.isArray(p.center));
  if (!pos.length) return null;
  const now = pos[0];
  let closest = null;
  for (const p of pos) {
    const d = km(lat, lon, p.center[0], p.center[1]);
    const edge = d - (p.probabilityCircle?.radius ?? 0) / 1000; // distance to the edge of the 70 % circle
    if (!closest || edge < closest.edge) closest = { edge, hours: p.advancedHours, time: p.validtime?.UTC };
  }
  return { name: title.name?.en || "", nameJp: title.name?.jp || "", number: title.typhoonNumber, issued: title.issue?.UTC,
    km: km(lat, lon, now.center[0], now.center[1]), closest, lastHours: pos[pos.length - 1].advancedHours };
}
/** A storm's level from its forecast circle (the app's own rule): within 300 km → get ready, within 800 km → watch. */
export const stormLevel = (s) => (!s ? 0 : s.closest.edge <= 300 ? 2 : s.closest.edge <= 800 ? 1 : 0);

/** TMD's storm tracks (collector storms.json) → the nearest point of each storm's track to this point, now and in
 *  TMD's forecast, with the storm's Thai name. */
export function tmdStormsNear(live, lat, lon) {
  return ((live && live.items) || []).map((s) => {
    const obs = s.path.filter((p) => !p.forecast);
    const last = obs[obs.length - 1] || s.path[0];
    const fc = s.path.filter((p) => p.forecast);
    const closest = [last, ...fc].reduce((best, p) => { const d = km(lat, lon, p.lat, p.lon); return !best || d < best.km ? { km: d, t: p.t, type: p.type } : best; }, null);
    return { name: s.name, nameEN: s.nameEN, km: km(lat, lon, last.lat, last.lon), type: last.type, typeEN: last.typeEN, closest };
  }).sort((a, b) => a.closest.km - b.closest.km);
}

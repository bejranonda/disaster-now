// Recent earthquakes around the point: EMSC (regional, small quakes too), USGS (M4.5+) and TMD (through the
// collector), merged; the shaking each may have caused at the point from an intensity-prediction equation
// (content/ipe.js, validated in docs/MODELS.md). Earthquakes cannot be forecast; nothing here predicts one.

import { km, bearing } from "./geo.js";
import { band } from "./levels.js";

/** EMSC fdsnws JSON → [{t, lat, lon, depth, mag, place, src}] */
export function parseEmsc(j) {
  return ((j && j.features) || []).map((f) => {
    const p = f.properties || {};
    return { t: Date.parse(p.time), lat: p.lat, lon: p.lon, depth: Math.abs(p.depth ?? 10), mag: p.mag,
      place: p.flynn_region, src: "EMSC", id: f.id };
  }).filter((q) => q.mag != null && !Number.isNaN(q.t));
}

/** USGS GeoJSON summary feed → the same shape. */
export function parseUsgs(j) {
  return ((j && j.features) || []).map((f) => {
    const [lon, lat, depth] = f.geometry?.coordinates || [];
    const p = f.properties || {};
    return { t: p.time, lat, lon, depth: Math.abs(depth ?? 10), mag: p.mag, place: p.place, src: "USGS", id: f.id,
      url: p.url, tsunami: p.tsunami === 1 };
  }).filter((q) => q.mag != null && q.lat != null);
}

/** One row per quake: the same event within 90 s and 100 km is merged; USGS's magnitude wins for M ≥ 5
 *  (it reviews big events), otherwise the regional agency's. TMD rows (collector) are preferred for Thai names. */
export function mergeQuakes(lists) {
  const all = lists.flat().sort((a, b) => b.mag - a.mag);
  const out = [];
  for (const q of all) {
    const twin = out.find((o) => Math.abs(o.t - q.t) < 90e3 && km(o.lat, o.lon, q.lat, q.lon) < 100);
    if (!twin) { out.push({ ...q, srcs: [q.src] }); continue; }
    twin.srcs.push(q.src);
    if (q.src === "TMD") { twin.placeTh = q.placeTh || q.place; }
    if (q.src === "USGS" && q.mag >= 5) { twin.mag = q.mag; twin.url = q.url; }
    twin.tsunami = twin.tsunami || q.tsunami;
  }
  return out.sort((a, b) => b.t - a.t);
}

/** Hypocentral distance in km. */
export const rhypo = (q, lat, lon) => Math.hypot(km(lat, lon, q.lat, q.lon), q.depth || 10);

/** Estimated intensity (MMI) at the point, or null without coefficients. `ipe` is one of content/ipe.js. */
export function mmiAt(q, lat, lon, ipe) {
  if (!ipe) return null;
  return ipe.mmi(q.mag, rhypo(q, lat, lon), q.depth || 10);
}

/** Quakes worth a line for this point: within `days`, and either estimated to be felt or within 300 km.
 *  Sorted by the shaking they may have caused, then by time. */
export function quakesForPoint(quakes, lat, lon, nowMs, ipe, { days = 7 } = {}) {
  return quakes.filter((q) => nowMs - q.t <= days * 864e5 && q.t <= nowMs + 6e5).map((q) => {
    const d = km(lat, lon, q.lat, q.lon);
    const mmi = mmiAt(q, lat, lon, ipe);
    return { ...q, km: d, dir: bearing(lat, lon, q.lat, q.lon), mmi, band: band("mmi", mmi) };
  }).filter((q) => (q.mmi != null && q.mmi >= 2.5) || q.km <= 300)
    .sort((a, b) => (b.mmi ?? 0) - (a.mmi ?? 0) || b.t - a.t);
}

/** Andaman-coast provinces (the coast the 2004 tsunami struck): Ranong, Phang Nga, Phuket, Krabi, Trang, Satun. */
export const ANDAMAN_PROVINCES = [85, 82, 83, 81, 92, 91];

/** A tsunami line is shown only for a big undersea-region quake in the Indian Ocean in the last 6 h and only in
 *  Andaman provinces; the line points to DDPM's official warning, it never says a wave is or isn't coming. */
export function tsunamiWatch(quakes, pv, nowMs) {
  if (!ANDAMAN_PROVINCES.includes(pv)) return null;
  return quakes.find((q) => q.mag >= 6.5 && nowMs - q.t <= 6 * 3.6e6 && q.lon >= 88 && q.lon <= 100 && q.lat >= -8 && q.lat <= 16) || null;
}

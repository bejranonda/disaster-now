// Dust and other pollution at the point. Now: the nearest PCD (Air4Thai) station, a measurement, when one is
// close and fresh; otherwise GISTDA's estimate for the point (satellite and model; on 24 Oct 2026 it read a median
// 1.31× the PCD stations in 60 provinces, KNOWLEDGE §5). Next days: CAMS (Copernicus, via Open-Meteo's air-quality
// API), corrected by how far CAMS was from the measurement over the past 24 hours. Pure functions.

import { band } from "./levels.js";
import { km } from "./geo.js";
import { dayWindows, nowIndex } from "./outlook.js";
import { PM25, lognormalExceed } from "./calibration.js";

const fnum = (v) => (v == null || v === "" || Number(v) < 0 ? null : Number(v)); // Air4Thai writes -1 for "not measured"

/** Air4Thai getNewAQI_JSON → stations [{id, name, area, lat, lon, time, pm25, pm10, o3, co, no2, so2, aqi}].
 *  AQILast's PM2.5 is the 24-hour mean PCD's colours are judged on (Hazard-huntz KNOWLEDGE; 170 of 170 colours
 *  matched on 21 Oct 2026). Times are Bangkok time. */
export function parseAir4Thai(j) {
  return ((j && j.stations) || []).map((s) => {
    const a = s.AQILast || {};
    const v = (k) => fnum(a[k]?.value);
    const sub = Object.fromEntries(["PM25", "PM10", "O3", "CO", "NO2", "SO2"].map((k) => [k, fnum(a[k]?.aqi)]));
    return { id: s.stationID, name: { th: s.nameTH, en: s.nameEN }, area: { th: s.areaTH, en: s.areaEN },
      lat: Number(s.lat), lon: Number(s.long), time: a.date && a.time ? `${a.date}T${a.time}` : null,
      pm25: v("PM25"), pm10: v("PM10"), o3: v("O3"), co: v("CO"), no2: v("NO2"), so2: v("SO2"),
      aqi: fnum(a.AQI?.aqi), aqiParam: a.AQI?.param || null, sub };
  }).filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lon));
}

/** The nearest station with a fresh PM2.5 reading within `maxKm` (55 % of subdistricts have none within 25 km,
 *  Hazard-huntz docs/09), with its distance and age; null otherwise. */
export function nearestStation(stations, lat, lon, nowMs, { maxKm = 15, maxAgeH = 3, has = (s) => s.pm25 != null } = {}) {
  let best = null;
  for (const s of stations) {
    if (!has(s) || !s.time) continue;
    const ageH = (nowMs - Date.parse(`${s.time}:00+07:00`)) / 3.6e6;
    if (ageH > maxAgeH || ageH < -1) continue;
    const d = km(lat, lon, s.lat, s.lon);
    if (d <= maxKm && (!best || d < best.km)) best = { ...s, km: d, ageH };
  }
  return best;
}

/** CAMS's mean over the 24 hours that end at a Bangkok time "YYYY-MM-DDTHH:MM" (null if fewer than `minHours`). */
export function camsPast24(endLocal, camsTimes, camsPm, minHours = 18) {
  const end = camsTimes.findIndex((t) => t.slice(0, 13) === String(endLocal).slice(0, 13));
  if (end < 0) return null;
  const vals = camsPm.slice(Math.max(0, end - 23), end + 1).filter((v) => v != null);
  return vals.length >= minHours ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** The validated PM2.5 outlook (calibration.PM25, MODELS.md §1): measured 24-h mean × (CAMS(day) ÷ CAMS(past 24 h))^β,
 *  β per day ahead. Beat persistence, the ratio method and raw CAMS on disjoint stations and on the newest season. */
export function dampedOutlook(measured, camsPrev, camsDays, beta = PM25.beta) {
  return camsDays.map((d, i) => ({ ...d, mean: d.mean == null || measured == null || camsPrev == null ? null
    : measured * (Math.max(d.mean, 0.5) / Math.max(camsPrev, 0.5)) ** beta[Math.min(i, beta.length - 1)] }));
}

/** Ratio of a measured 24-hour mean to CAMS's mean over the 24 hours that end at the measurement, clipped. The app's
 *  first correction: worse than persistence in the validation (MODELS.md §1), kept for the record and the tests. */
export function camsRatioMean(mean24, endLocal, camsTimes, camsPm, { lo = 0.5, hi = 3, minHours = 18 } = {}) {
  const end = camsTimes.findIndex((t) => t.slice(0, 13) === String(endLocal).slice(0, 13));
  if (mean24 == null || end < 0) return null;
  const vals = camsPm.slice(Math.max(0, end - 23), end + 1).filter((v) => v != null);
  const m = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  if (vals.length < minHours || !m) return null;
  return { ratio: Math.min(hi, Math.max(lo, mean24 / m)), raw: mean24 / m, hours: vals.length };
}

/** GISTDA getPm25byLocation → {now, mean24, hours: [{t, v}], place}. GISTDA writes Bangkok time with a "Z" on the
 *  end (seen 21 and 23 Oct 2026: "2026-10-24T02:00:00.000Z" at 19:47 UTC), so the "Z" is dropped, never trusted. */
export function parseGistda(j) {
  const d = j && j.data;
  if (!d || d.pm25 == null) return null;
  const hours = (d.graphHistory24hrs || []).map(([v, t]) => ({ t: String(t).slice(0, 16), v }))
    .filter((x) => x.v != null && x.v >= 0);
  return {
    now: d.pm25, mean24: d.pm25Avg24hrs ?? null, hours,
    time: hours.length ? hours[hours.length - 1].t : null,
    place: d.loc ? { th: d.loc.loctext, en: d.loc.loctext_en, tb: d.loc.tb_idn, pv: d.loc.pv_idn } : null,
  };
}

/** The app's CAMS correction (KNOWLEDGE §5): measured ÷ modelled over the same past hours, clipped to [lo, hi].
 *  Null when fewer than `minHours` hours overlap. */
export function camsRatio(gistdaHours, camsTimes, camsPm, { lo = 0.5, hi = 3, minHours = 12 } = {}) {
  const idx = new Map(camsTimes.map((t, i) => [t.slice(0, 13), i]));
  let obs = 0;
  let mod = 0;
  let n = 0;
  for (const { t, v } of gistdaHours) {
    const i = idx.get(t.slice(0, 13));
    if (i == null || camsPm[i] == null) continue;
    obs += v;
    mod += camsPm[i];
    n++;
  }
  if (n < minHours || mod <= 0) return null;
  return { ratio: Math.min(hi, Math.max(lo, obs / mod)), raw: obs / mod, hours: n };
}

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/** Daily means (today's rest, tomorrow, the day after) of a CAMS variable, optionally scaled. */
export function dailyMeans(aq, v, nowMs, scale = 1) {
  const h = aq.hourly;
  const i0 = nowIndex(h.time, aq.utc_offset_seconds || 0, nowMs);
  if (i0 < 0) return [];
  return dayWindows(h.time, i0).map((d) => {
    const vals = h[v].slice(d.i0, d.i1).filter((x) => x != null);
    const m = mean(vals);
    return { date: d.date, hours: vals.length, mean: m == null ? null : m * scale };
  });
}

export function dailyMax(aq, v, nowMs) {
  const h = aq.hourly;
  const i0 = nowIndex(h.time, aq.utc_offset_seconds || 0, nowMs);
  if (i0 < 0) return [];
  // the rest of today, like every other column of the table: 0.3.0 kept the whole calendar day, so at 15:00 the
  // table said "10" beside a tile that said "UV 2, low" about a noon that had passed (visitor audit U16)
  return dayWindows(h.time, i0).map((d) => {
    const vals = h[v].slice(d.i0, d.i1).filter((x) => x != null);
    return { date: d.date, max: vals.length ? Math.max(...vals) : null };
  });
}

/** The chance that a day's mean reaches PCD's "เริ่มมีผลกระทบ" (37.5) and "มีผลกระทบ" (75) bands, inside the domain it
 *  was tested on only: tomorrow or the day after (not the rest of today), Dec–Apr, a damped forecast from a PCD station
 *  (calibration.PM25.chance; predict-air-2026-10-24 §7.1). */
export function dustChance(d, i) {
  const c = PM25.chance;
  if (i < 1 || i >= c.sigma.length || d.mean == null || !c.months.includes(Number(String(d.date).slice(5, 7)))) return null;
  return { warn: lognormalExceed(d.mean, 37.5, c.sigma[i]), harm: lognormalExceed(d.mean, 75, c.sigma[i]) };
}

/** Everything the dust, pollution and UV cards need. `station` is nearestStation()'s answer or null. */
export function buildAir(aq, gistda, nowMs = Date.now(), station = null) {
  const out = { pm25: null, estimate: null, station, outlook: [], ratio: null, pollutants: null, uv: [] };
  if (gistda) out.estimate = { ...gistda, band: band("pm25", gistda.mean24 ?? gistda.now) };
  if (station) {
    out.pm25 = { kind: "station", mean24: station.pm25, time: station.time, km: station.km, band: band("pm25", station.pm25) };
  } else if (gistda) {
    out.pm25 = { kind: "estimate", mean24: gistda.mean24 ?? gistda.now, now: gistda.now, time: gistda.time,
      band: band("pm25", gistda.mean24 ?? gistda.now) };
  }
  if (aq && aq.hourly) {
    // the damped outlook needs the measurement and CAMS over the same past 24 hours
    const measured = station ? station.pm25 : gistda ? (gistda.mean24 ?? gistda.now) : null;
    const endLocal = station ? station.time : gistda ? gistda.time : null;
    const camsPrev = endLocal ? camsPast24(endLocal, aq.hourly.time, aq.hourly.pm2_5) : null;
    const days = dailyMeans(aq, "pm2_5", nowMs);
    const damped = measured != null && camsPrev != null;
    out.ratio = damped ? { method: "damped", measured, camsPrev, basis: station ? "station" : "estimate" } : null;
    out.outlook = (damped ? dampedOutlook(measured, camsPrev, days) : days)
      .map((d, i) => ({ ...d, band: band("pm25", d.mean), corrected: damped,
        chance: damped && station ? dustChance(d, i) : null }));
    out.uv = dailyMax(aq, "uv_index", nowMs).map((d) => ({ ...d, band: band("uv", d.max) }));
    const i = nowIndex(aq.hourly.time, aq.utc_offset_seconds || 0, nowMs);
    out.uvNow = i >= 0 ? aq.hourly.uv_index?.[i] ?? null : null;
    if (i >= 0) {
      const pick = (k) => aq.hourly[k]?.[i] ?? null;
      out.pollutants = {
        time: aq.hourly.time[i], pm10: pick("pm10"), o3: pick("ozone"), no2: pick("nitrogen_dioxide"),
        so2: pick("sulphur_dioxide"), co: pick("carbon_monoxide"), dust: pick("dust"), camsPm25: pick("pm2_5"),
      };
    }
  }
  return out;
}

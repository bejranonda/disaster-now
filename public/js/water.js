// Rain measured near the point, river gauges near the point, and HII's flash-flood list. Pure parsers for the
// ThaiWater (HII) and FloodWatch responses; levels follow FloodWatch's rules so both apps agree.

import { km } from "./geo.js";
import { band, riverLevel } from "./levels.js";

const num = (v) => (v == null || v === "" ? null : Number(v));
// HII writes Bangkok time with no offset ("2026-10-24 02:00"); anything else is not trusted (KNOWLEDGE §4).
export const hiiTime = (s) => (s ? `${String(s).replace(" ", "T").slice(0, 16)}` : null);
const MISSING = (v) => v == null || v >= 999990 || v < 0; // 999999 is HII's missing-value code

/** Gauges of ThaiWater's rain_24h near the point, nearest first. rain_24h is a rolling 24-hour total at each
 *  reading (FloodWatch SOURCES.md, rain_obs). FloodWatch's measured_rain limits, so both apps name the same gauge:
 *  within 10 km (convective cells) and read in the last 3 h (src/floodwatch/point.py). */
export function nearRain(j, lat, lon, nowMs, { maxKm = 10, maxAgeH = 3 } = {}) {
  const rows = (j && j.data) || [];
  const out = [];
  for (const r of rows) {
    const s = r.station || {};
    const la = num(s.tele_station_lat);
    const lo = num(s.tele_station_long);
    const v = num(r.rain_24h);
    if (la == null || lo == null || MISSING(v)) continue;
    const t = hiiTime(r.rainfall_datetime);
    const ageH = t ? (nowMs - (Date.parse(`${t}:00+07:00`))) / 3.6e6 : null;
    if (ageH == null || ageH > maxAgeH || ageH < -1) continue;
    const d = km(lat, lon, la, lo);
    if (d > maxKm) continue;
    out.push({ name: s.tele_station_name?.th || s.tele_station_oldcode, code: s.tele_station_oldcode,
      agency: r.agency?.agency_shortname?.th, km: d, rain24: v, rain1h: num(r.rain_1h), time: t, ageH,
      band: band("rain24", v) });
  }
  return out.sort((a, b) => a.km - b.km);
}

/** Water-level gauges of ThaiWater's waterlevel_load near the point, judged by FloodWatch's bank rule against
 *  min_bank (ONWR's bank, FloodWatch D-199). ThaiWater's own situation_level is not used: it counts % of the
 *  bank above the river bed, so a deep river reads "high" while 1.3 m below its bank (C.12, 24 Oct 2026). */
export function nearGauges(j, lat, lon, nowMs, { maxKm = 20, maxAgeH = 3 } = {}) { // 3 h = FloodWatch's STALE_MIN 180
  const rows = j?.waterlevel_data?.data || [];
  const out = [];
  for (const r of rows) {
    const s = r.station || {};
    const la = num(s.tele_station_lat);
    const lo = num(s.tele_station_long);
    const lvl = num(r.waterlevel_msl);
    if (la == null || lo == null || lvl == null || MISSING(lvl)) continue;
    const t = hiiTime(r.waterlevel_datetime);
    const ageH = t ? (nowMs - Date.parse(`${t}:00+07:00`)) / 3.6e6 : null;
    const d = km(lat, lon, la, lo);
    if (d > maxKm) continue;
    const bank = num(s.min_bank);
    // ThaiWater writes 0 for "no bed level" on many gauges; FloodWatch drops it too (its collector's `or` treats 0 as
    // missing), so 0 is no bed here: the cross-check found 11 of 15 disagreements were exactly this (KNOWLEDGE §6)
    const ground = num(s.ground_level) || null;
    const stale = ageH == null || ageH > maxAgeH;
    const st = stale ? { level: -1, pct: null } : riverLevel(lvl, bank, ground);
    const prev = num(r.waterlevel_msl_previous);
    out.push({ name: s.tele_station_name?.th || s.tele_station_oldcode, code: s.tele_station_oldcode,
      // only the agency's river name: a basin name ("ลุ่มน้ำ…") would make waterWord() call a river a canal in the polders
      river: r.river_name || null, basin: r.basin?.basin_name?.th || null, agency: r.agency?.agency_shortname?.th?.trim(),
      km: d, level: lvl, bank, freeboard: bank == null ? null : bank - lvl, pct: st.pct, status: st.level,
      change: prev == null ? null : lvl - prev, time: t, ageH, stale });
  }
  return out.sort((a, b) => a.km - b.km);
}

/** HII's flash-flood report (fews2.hii.or.th flashflood_report.txt): a CSV with Thai headers, one row per
 *  subdistrict at risk tonight; header only when none. Returns rows with the 6-digit DOPA subdistrict code. */
export function parseFlashFlood(text) {
  const lines = String(text || "").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const cells = (l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
  const hdr = cells(lines[0]);
  const col = (name) => hdr.findIndex((h) => h.includes(name));
  const iCode = col("รหัสตำบล");
  const iFfpi = col("FFPI");
  const iRain = col("ฝนสะสม");
  return lines.slice(1).map((l) => {
    const c = cells(l);
    return { code: Number(c[iCode]), province: c[col("จังหวัด")], amphoe: c[col("อำเภอ")], tambon: c[col("ตำบล")],
      ffpi: num(c[iFfpi]), rainNextDay: num(c[iRain]) };
  }).filter((r) => r.code);
}

/** FloodWatch's /api/point (if FloodWatch ever sends CORS for this site, or through the collector): the nearest
 *  river gauge's status and its 24-hour outlook, in FloodWatch's own words. */
export function parseFloodWatchPoint(j) {
  if (!j) return null;
  const nr = j.nearest_river?.station;
  return {
    area: j.area?.category ?? null,
    river: nr ? { name: nr.name_th, km: j.nearest_river.distance_km, status: nr.status, freeboard: nr.freeboard_m,
      change24: nr.change24 ? { dir: nr.change24.dir, likely: nr.change24.likely } : null, time: nr.obs_time } : null,
    rain: j.rain_measured ? { name: j.rain_measured.name_th, km: j.rain_measured.distance_km,
      rain24: j.rain_measured.rain_24h, time: j.rain_measured.obs_time } : null,
  };
}

/** FloodWatch status words → the app's levels (FloodWatch: normal / watch / warning / critical). */
export const FW_LEVEL = { normal: 0, watch: 1, warning: 2, critical: 3, unknown: -1 };

// ---------- FloodWatch's point check, mirrored (src/floodwatch/point.py, read 2026-10-23) ----------
// No water surface is drawn over land (FloodWatch D-019): the gauges around a point are summarised as an "area
// category". In Bangkok and its five neighbours the polder walls split rivers from canals, so only canal gauges speak
// for a point there (D-059); elsewhere every waterway does (D-064).
export const POLDER_PROVINCES = [10, 11, 12, 13, 73, 74]; // กรุงเทพฯ สมุทรปราการ นนทบุรี ปทุมธานี นครปฐม สมุทรสาคร
const WORDS = [["แม่น้ำ", "แม่น้ำ"], ["แคว", "แม่น้ำ"], ["น้ำ", "แม่น้ำ"], ["คลอง", "คลอง"], ["คู", "คลอง"],
  ["ลำ", "ลำน้ำ"], ["ห้วย", "ลำน้ำ"], ["เหมือง", "ลำน้ำ"], ["ร่อง", "ลำน้ำ"], ["บึง", "บึง"]];
/** FloodWatch's water_word: from the river name the agency gives, never guessed from the station name. */
export function waterWord(g, polder) {
  const river = String(g.river || "").trim();
  for (const [p, w] of WORDS) if (river.startsWith(p)) return w;
  return polder ? "คลอง" : "ลำน้ำ";
}
const RADIUS_KM = 8;
const NEAR_KM = 3;
const CHECK_KM = 5;

/** FloodWatch's area_index on the gauges we have: inverse-distance-weighted status of the up-to-3 fresh gauges
 *  within 3 km (else all within 8 km), rounded to a category, with FloodWatch's confidence rules. */
export function areaIndex(gauges, pv) {
  const polder = POLDER_PROVINCES.includes(pv);
  const near = gauges.filter((g) => !g.stale && g.status >= 0 && g.km <= RADIUS_KM)
    .filter((g) => !polder || ["คลอง", "บึง"].includes(waterWord(g, polder)))
    .sort((a, b) => a.km - b.km);
  if (!near.length) return { category: null, confidence: "none", n: 0, polder };
  const close = near.filter((g) => g.km <= NEAR_KM).slice(0, 3);
  const basis = close.length ? close : near;
  const w = basis.map((g) => 1 / Math.max(g.km, 0.3) ** 2);
  const score = basis.reduce((s, g, i) => s + w[i] * g.status, 0) / w.reduce((a, b) => a + b, 0);
  const ranks = basis.map((g) => g.status);
  const spread = Math.max(...ranks) - Math.min(...ranks);
  const outvoted = close.length ? near.some((g) => g.km > NEAR_KM && g.km <= CHECK_KM && Math.abs(g.status - close[0].status) >= 2) : false;
  let confidence = "very_low";
  if (close.length >= 2 && spread <= 1) confidence = "medium";
  else if (close.length && spread <= 1 && !outvoted) confidence = "low";
  else if (!close.length && near[0].km <= 5 && near.length >= 2 && spread <= 1) confidence = "low";
  return { category: Math.min(3, Math.round(score)), score, confidence, n: near.length, nClose: close.length,
    nearestKm: near[0].km, polder, basis };
}

// ---------- FloodWatch's own gauges, through this site's collector (data/live/floodwatch.json) ----------
// FloodWatch's status, outlook and "⚠️ จับตา" groups, so this page says what FloodWatch says (INTEGRATION §3). The
// measured tile above stays on ThaiWater, read from the phone: if FloodWatch's server is down, the page still judges
// the gauges, and only FloodWatch's lines go missing.

/** floodwatch.json → {byCode, rows, records, generated}, or null when the file is missing or older than 2 h. */
export function fwRows(file, nowMs) {
  if (!file || !Array.isArray(file.rows) || !Array.isArray(file.cols)) return null;
  const at = Date.parse(file.fetched || file.generated);
  if (!(nowMs - at <= 2 * 3.6e6)) return null; // a stopped feed is missing, not calm (S12)
  const ix = Object.fromEntries(file.cols.map((k, i) => [k, i]));
  const rows = file.rows.map((r) => ({ code: r[ix.code], name: r[ix.name], river: r[ix.river], lat: r[ix.lat], lon: r[ix.lon],
    status: r[ix.status], freeboard: r[ix.freeboard], obs: r[ix.obs], stale: !!r[ix.stale], c24: r[ix.c24], rise24: r[ix.rise24],
    group: r[ix.group], up: r[ix.up] || [], qc: !!r[ix.qc], pct: ix.pct == null ? null : r[ix.pct], agency: ix.agency == null ? null : r[ix.agency],
    bank: ix.bank == null ? null : r[ix.bank], twin: ix.twin == null ? null : r[ix.twin], r2: ix.r2 == null ? null : r[ix.r2] }));
  return { rows, byCode: Object.fromEntries(rows.map((r) => [r.code, r])), records: file.records || {}, generated: file.generated };
}

/** FloodWatch's gauges within `maxKm` of the point that can be judged (fresh, no quality note), nearest first. */
export function nearFw(fw, lat, lon, maxKm = 20) {
  if (!fw) return [];
  return fw.rows.filter((r) => !r.stale && !r.qc).map((r) => ({ ...r, km: km(lat, lon, r.lat, r.lon) }))
    .filter((r) => r.km <= maxKm).sort((a, b) => a.km - b.km);
}

/** FloodWatch's "⚠️ จับตา" groups this page repeats, worst first (FloodWatch risks.py ORDER). Over the bank and near
 *  the bank are measured, and the gauge lines already say them; these three look ahead. */
export const FW_AHEAD = ["may_reach", "upstream", "fast_rise"];

/** The worst look-ahead group among the near gauges: {key, gauge, record} with FloodWatch's own track record (its
 *  /api/risks `records`: how often the group came true in the last 30 days), or null. */
export function fwWatch(near, records = {}) {
  for (const key of FW_AHEAD) {
    const g = near.find((r) => r.group && r.group[0] === key);
    if (!g) continue;
    const rec = key === "may_reach" ? records[`bank_${g.group[2] === 48 ? 48 : 24}`]?.[g.group[1]] : records[key];
    return { key, gauge: g, record: rec && rec.n ? { hit: rec.hit, n: rec.n, days: records.window_days || 30 } : null };
  }
  return null;
}

/** FloodWatch's 24-h outlook for one gauge, when it beats "no change" and its likely range is narrow enough to say
 *  (FloodWatch hides wider than 0.75 m, its WIDE_LIKELY_M): {dir, lo, hi, skill} in metres, or null. */
export function fwOutlook(row) {
  const c = row && row.c24;
  if (!c || !(c[4] > 0) || c[2] == null || c[3] == null || c[3] - c[2] > 0.75) return null;
  return { dir: c[0], median: c[1], lo: c[2], hi: c[3], skill: c[4] };
}

// ---------- measured rain over 3 days (data/live/rain3d.json, the collector's hourly reading of ThaiWater) ----------
/** rain3d.json → the nearest gauge within `maxKm` that had RAIN_SHOW_MM or more in 48–72 h: {name, km, r24, r48, r72,
 *  time}, or null. A gauge not in the file had less, or not enough readings to add up: no line, never "dry". */
export function nearRainDays(file, lat, lon, nowMs, { maxKm = 10 } = {}) {
  if (!file || !Array.isArray(file.rows)) return null;
  if (!(nowMs - Date.parse(file.fetched) <= 2 * 3.6e6)) return null;
  let best = null;
  for (const [code, name, la, lo, r24, r48, r72, t] of file.rows) {
    const d = km(lat, lon, la, lo);
    if (d <= maxKm && (!best || d < best.km)) best = { code, name, km: d, r24, r48, r72, time: t };
  }
  return best;
}

/** FloodWatch's rows near the point in nearGauges()'s shape, so the area index and the gauge lines read FloodWatch's
 *  own judgement: its bank (ONWR's where it has one), its quality checks, and BMA's canal gauges, which ThaiWater's
 *  province list doesn't carry (KI-007: 8 Bangkok gauges there, 201 BMA gauges in FloodWatch on 24 Oct 2026). */
export function fwGauges(fw, lat, lon, nowMs, { maxKm = 20 } = {}) {
  if (!fw) return [];
  const out = [];
  for (const r of fw.rows) {
    if (r.qc || r.status == null) continue;
    const d = km(lat, lon, r.lat, r.lon);
    if (d > maxKm) continue;
    const t = r.obs ? Date.parse(r.obs) : NaN;
    const ageH = Number.isFinite(t) ? (nowMs - t) / 3.6e6 : null;
    const stale = r.stale || ageH == null || ageH > 3;
    out.push({ name: r.name, code: r.code, river: r.river, agency: r.agency, km: d, level: null, bank: null, freeboard: r.freeboard,
      pct: r.pct, status: stale ? -1 : (FW_LEVEL[r.status] ?? -1), change: null,
      time: Number.isFinite(t) ? new Date(t + 7 * 3.6e6).toISOString().slice(0, 16) : null, ageH, stale, fw: true });
  }
  return out.sort((a, b) => a.km - b.km);
}

// ---------- "water from upstream": this page's own lines on FloodWatch's gauges (floodwatch-hatyai-leadtime §6) ----------
const UP_LAG = [3, 47]; // FloodWatch learns lags up to 48 h: under 3 h is the same site, 48 the search limit
const UP_MAX_KM = 50; // X.174's "upstream" MOU510 was in another catchment
const UP_RISE_CM = 30; // FloodWatch's UP_RISE_CM (risks.py)
const UP_FIT = 0.5; // FloodWatch's own fit rule for a measured rise

/** For the gauges that judge the point (`basis`, FloodWatch rows), the strongest upstream signal:
 *  A: an upstream gauge over its bank and still rising, the point's gauge under its bank;
 *  B: an upstream gauge near its bank (FloodWatch "warning") and rising;
 *  C: the point's gauge already over its bank and an upstream gauge still rising ("more is coming").
 *  The range is "within about 2 × lag h, or sooner": the measured X.90 → X.44 times were 0–11 h for a 6-h lag.
 *  `late` when every usable upstream gauge is too old to judge (said, never calm). → {kind, g, u, lag, hi, rise} | {kind: "late", ageH} | null */
export function upstreamSignal(fw, basis, nowMs) {
  if (!fw || !basis?.length) return null;
  let best = null;
  let lateAge = null;
  let anyFresh = false; // one usable upstream gauge read in time is an answer: "late" only when none is
  const rank = { A: 3, B: 2, C: 1 };
  for (const b of basis) {
    const g = fw.byCode[b.code];
    if (!g) continue;
    for (const [code, lag] of g.up || []) {
      const u = fw.byCode[code];
      if (!u || lag == null || lag < UP_LAG[0] || lag > UP_LAG[1] || u.code === g.twin || u.twin === g.code) continue;
      if (km(g.lat, g.lon, u.lat, u.lon) > UP_MAX_KM || u.qc) continue;
      const ageH = u.obs ? (nowMs - Date.parse(u.obs)) / 3.6e6 : null;
      if (u.stale || ageH == null || ageH > 3) { lateAge = lateAge == null ? ageH : Math.min(lateAge, ageH ?? lateAge); continue; }
      anyFresh = true;
      if (!(u.rise24 >= UP_RISE_CM) || (u.r2 != null && u.r2 < UP_FIT)) continue;
      const gOver = g.freeboard != null && g.freeboard <= 0;
      const kind = gOver ? "C" : u.status === "critical" || (u.freeboard != null && u.freeboard <= 0) ? "A" : u.status === "warning" ? "B" : null;
      if (!kind) continue;
      const cand = { kind, g, u, lag, hi: Math.round(2 * lag), rise: u.rise24, over: u.freeboard != null && u.freeboard < 0 ? -u.freeboard : 0 };
      if (!best || rank[kind] > rank[best.kind] || (rank[kind] === rank[best.kind] && cand.rise > best.rise)) best = cand;
    }
  }
  if (best) return best;
  const gWatch = basis.some((b) => (fw.byCode[b.code] && FW_LEVEL[fw.byCode[b.code].status] >= 1));
  return gWatch && lateAge != null && !anyFresh ? { kind: "late", ageH: lateAge } : null;
}

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
export function nearGauges(j, lat, lon, nowMs, { maxKm = 20, maxAgeH = 6 } = {}) {
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
      river: r.river_name || r.basin?.basin_name?.th || null, agency: r.agency?.agency_shortname?.th?.trim(),
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

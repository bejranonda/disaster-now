// The 72-hour outlook from the ECMWF ensemble (51 members via Open-Meteo's ensemble API) and what it means for
// each hazard: the middle member's value, a 10–90 % range, and the chance of crossing each band. Pure functions.

import { heatIndexC } from "./heat.js";
import { HAZARDS, CHANCE, band } from "./levels.js";
import { HEAT, correctHeat, dressedChance, dressedQuantile, dewPoint, rhFrom } from "./calibration.js";

/** Control run plus every member for one variable, as arrays aligned with hourly.time. */
export function memberSeries(hourly, v) {
  const out = [];
  if (Array.isArray(hourly[v])) out.push(hourly[v]);
  for (let i = 1; i < 100; i++) {
    const s = hourly[`${v}_member${String(i).padStart(2, "0")}`];
    if (!s) break;
    out.push(s);
  }
  return out;
}

/** Epoch ms of a local "YYYY-MM-DDTHH:MM" time given the response's utc_offset_seconds. */
export const localMs = (t, offsetSec) => Date.parse(`${t}:00Z`) - offsetSec * 1000;

/** Index of the hour that contains `nowMs` (Open-Meteo's hourly values are for the hour starting at `time`). */
export function nowIndex(times, offsetSec, nowMs) {
  let idx = -1;
  for (let i = 0; i < times.length; i++) if (localMs(times[i], offsetSec) <= nowMs) idx = i;
  return idx;
}

/** Calendar days in Bangkok time from now: today (the rest of it), tomorrow, the day after. */
export function dayWindows(times, i0, count = 3) {
  const out = [];
  let i = Math.max(0, i0);
  while (i < times.length && out.length < count) {
    const date = times[i].slice(0, 10);
    let j = i;
    while (j < times.length && times[j].slice(0, 10) === date) j++;
    out.push({ date, i0: i, i1: j, hours: j - i });
    i = j;
  }
  return out;
}

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Per-member reduction over [i0, i1): "max" or "sum"; a member with no value in the window is left out. */
export function perMember(series, i0, i1, how) {
  const vals = [];
  for (const s of series) {
    let acc = null;
    for (let i = i0; i < i1 && i < s.length; i++) {
      const v = s[i];
      if (v == null || Number.isNaN(v)) continue;
      acc = acc == null ? v : how === "sum" ? acc + v : Math.max(acc, v);
    }
    if (acc != null) vals.push(acc);
  }
  return vals;
}

export function stats(vals) {
  const sorted = [...vals].sort((a, b) => a - b);
  return { n: sorted.length, p10: quantile(sorted, 0.1), p50: quantile(sorted, 0.5), p90: quantile(sorted, 0.9) };
}

/** {p10, p50, p90, n, chance: {level: share of members at or above that band}} for one hazard's member values. */
export function summarize(hazard, vals) {
  const { n, p10, p50, p90 } = stats(vals);
  const chance = {};
  for (const b of HAZARDS[hazard].bands) {
    if (b.level < 1 || chance[b.level] != null) continue;
    chance[b.level] = n ? vals.filter((v) => v >= b.min).length / n : null;
  }
  return { n, p10, p50, p90, chance };
}

/** Heat: corrected member values dressed with the correction's tested error, so the range and the chances are as wide
 *  as the validation found them (MODELS.md §1). `method` says which correction ran ("C0" the line, "C6" the cool
 *  season's). */
export function summarizeCorrected(vals, sd, rawVals, method) {
  const sorted = [...vals].sort((a, b) => a - b);
  const chance = {};
  for (const b of HAZARDS.heat.bands) {
    if (b.level < 1 || chance[b.level] != null) continue;
    chance[b.level] = dressedChance(vals, b.min, sd);
  }
  return { n: vals.length, p10: dressedQuantile(vals, 0.1, sd), p50: quantile(sorted, 0.5), p90: dressedQuantile(vals, 0.9, sd),
    chance, rawP50: quantile([...rawVals].sort((a, b) => a - b), 0.5), corrected: true, method };
}

/** The year-round line (C0): each member's raw daily max corrected as HI = a + b·HI_raw. */
export const summarizeHeat = (rawVals, c) => summarizeCorrected(rawVals.map((v) => correctHeat(v, c)), c.sd, rawVals, "C0");

/** The hours the heat correction was fitted on: each forecast's max of 13:00 and 16:00 Bangkok (ECMWF's 06 and 09 UTC
 *  steps; research/out/calibration.json). 0.3.0 took every hour of the window: +0.41 °C on average and up to 8 °C on
 *  showery days, through a line that never saw it (model check 2026-10-24 §4.1). A window holding neither hour has no
 *  daily maximum to correct and gets no heat summary: an evening once became a 30 % "danger" line (S6). */
export const PREDICTOR_HOURS = [13, 16];
const hourOf = (t) => Number(String(t).slice(11, 13));
export const predictorIndex = (times, a, b) => {
  const out = [];
  for (let i = Math.max(0, a); i < b && i < times.length; i++) if (PREDICTOR_HOURS.includes(hourOf(times[i]))) out.push(i);
  return out;
};
export const hasAfternoon = (times, a, b) => predictorIndex(times, a, b).length > 0;

/** Each member's maximum over the given hour indices (a member with no value there is left out). */
export function perMemberAt(series, idx) {
  const vals = [];
  for (const s of series) {
    let acc = null;
    for (const i of idx) { const v = s[i]; if (v != null && !Number.isNaN(v)) acc = acc == null ? v : Math.max(acc, v); }
    if (acc != null) vals.push(acc);
  }
  return vals;
}

/** C6's heat index per member and hour: the member's T and dew point corrected first (calibration.HEAT.cool), then the
 *  NWS heat index of the corrected pair. The offset c is added after the max. */
export function heatMembersCorrectedInputs(hourly, k) {
  const t = memberSeries(hourly, "temperature_2m");
  const rh = memberSeries(hourly, "relative_humidity_2m");
  return t.map((ts, m) => ts.map((v, i) => {
    const r = rh[m]?.[i];
    if (v == null || r == null) return null;
    const t2 = v + k.dT;
    return heatIndexC(t2, rhFrom(t2, dewPoint(v, r) + k.dTd));
  }));
}

/** The level a window gets from its members (GUIDELINES rule 6): the highest level at least half the members reach;
 *  if a level of "warning" or worse is only possible (≥ 20 %), the window is at least "watch". */
export function windowLevel(s) {
  if (!s || !s.n) return { level: -1, possible: null };
  let likely = 0;
  let possible = 0;
  for (const [lvl, p] of Object.entries(s.chance)) {
    if (p >= CHANCE.likely) likely = Math.max(likely, +lvl);
    if (p >= CHANCE.possible) possible = Math.max(possible, +lvl);
  }
  const level = possible >= 2 && likely < 1 ? 1 : likely;
  return { level, possible: possible > likely ? possible : null, chancePossible: possible > likely ? s.chance[possible] : null };
}

/** Heat index for every member and hour, from the members' own temperature and humidity. */
export function heatMembers(hourly) {
  const t = memberSeries(hourly, "temperature_2m");
  const rh = memberSeries(hourly, "relative_humidity_2m");
  return t.map((ts, m) => ts.map((v, i) => heatIndexC(v, rh[m]?.[i])));
}

/** Everything the page shows from one ensemble response. `nowMs` is injectable for tests. */
export function buildOutlook(ens, nowMs = Date.now()) {
  const h = ens.hourly;
  const off = ens.utc_offset_seconds || 0;
  const i0 = nowIndex(h.time, off, nowMs);
  if (i0 < 0 || i0 >= h.time.length - 1) return null;
  const heat = heatMembers(h);
  const rain = memberSeries(h, "precipitation");
  const gust = memberSeries(h, "wind_gusts_10m");
  const temp = memberSeries(h, "temperature_2m");
  const at = (series, i) => {
    const v = series.map((s) => s[i]).filter((x) => x != null).sort((a, b) => a - b);
    return quantile(v, 0.5);
  };
  const share = (vals, thr) => (vals.length ? vals.filter((v) => v > thr).length / vals.length : null);
  // the cool season's inputs, per lead (calibration.HEAT.cool: Nov–Feb, provisional)
  const coolIn = { lead1: heatMembersCorrectedInputs(h, HEAT.cool.lead1), lead2: heatMembersCorrectedInputs(h, HEAT.cool.lead2) };
  /** One window's heat, at the fitted hours, by the correction for its month (C6 Nov–Feb, else the line). */
  const heatWin = (a, b, lead) => {
    const idx = predictorIndex(h.time, a, b);
    if (!idx.length) return null;
    const raw = perMemberAt(heat, idx);
    if (HEAT.cool.months.includes(Number(h.time[idx[0]].slice(5, 7)))) {
      const k = HEAT.cool[lead];
      return summarizeCorrected(perMemberAt(coolIn[lead], idx).map((v) => v + k.c), k.sd, raw, "C6");
    }
    return summarizeHeat(raw, HEAT[lead]);
  };
  const win = (a, b, lead = "lead1") => ({
    heat: heatWin(a, b, lead),
    rain24: summarize("rain24", perMember(rain, a, b, "sum")),
    gust: summarize("gust", perMember(gust, a, b, "max")),
    tmax: stats(perMember(temp, a, b, "max")), // air temperature, for TMD's "อากาศร้อน / ร้อนจัด" words only
  });
  const days = dayWindows(h.time, i0).map((d, k) => ({ ...d, ...win(d.i0, d.i1, k >= 2 ? "lead2" : "lead1") }));
  return {
    issued: h.time[i0], members: heat.length,
    now: { time: h.time[i0], heat: at(heat, i0), temp: at(temp, i0) },
    next24: { i0, i1: Math.min(i0 + 24, h.time.length), ...win(i0, Math.min(i0 + 24, h.time.length)),
      over100: share(perMember(rain, i0, Math.min(i0 + 24, h.time.length), "sum"), 100) }, // DMR's landslide trigger
    days,
    hourly: { time: h.time.slice(i0, i0 + 72), heat: h.time.slice(i0, i0 + 72).map((_, k) => at(heat, i0 + k)),
      rain: h.time.slice(i0, i0 + 72).map((_, k) => at(rain, i0 + k)) },
  };
}

/** Pre-warnings: the things the next three days might bring that are worse than the routine, each with its day
 *  and its chance (never a countdown, GUIDELINES rule 4). `extra` lets other hazards (dust) add their own. */
export function prewarnings(outlook, extra = []) {
  if (!outlook) return extra;
  const out = [];
  outlook.days.forEach((d, di) => {
    // อันตราย (≥ 42 °C) is level 2 since 0.6.0 (the DOH's orange, D-053); no afternoon left in the window: no line (S6)
    const heat = d.heat ? d.heat.chance[2] : null;
    if (heat >= CHANCE.possible) out.push({ hazard: "heat", day: di, date: d.date, level: 2, chance: heat, value: d.heat.p90 });
    const r3 = d.rain24.chance[3];
    const r2 = d.rain24.chance[2];
    // both lines when heavy rain is likelier than very heavy (visitor audit V8: "very heavy 30%" hid "heavy over 90%")
    if (r2 >= CHANCE.possible && (r3 < CHANCE.possible || r2 - r3 >= 0.2)) out.push({ hazard: "rain24", day: di, date: d.date, level: 2, chance: r2, value: d.rain24.p90 });
    if (r3 >= CHANCE.possible) out.push({ hazard: "rain24", day: di, date: d.date, level: 3, chance: r3, value: d.rain24.p90 });
    const g = d.gust.chance[2];
    if (g >= CHANCE.possible) out.push({ hazard: "gust", day: di, date: d.date, level: 2, chance: g, value: d.gust.p90 });
  });
  return [...out, ...extra].sort((a, b) => a.day - b.day || b.level - a.level);
}

/** "โอกาส ~40%": the ensemble's share rounded to tens, never 0 or 100 (51 members can't be sure). */
export function chanceText(p, lang = "th") {
  if (p == null) return "";
  if (p < 0.1) return lang === "en" ? "under 10%" : "ไม่ถึง 10%";
  if (p > 0.9) return lang === "en" ? "over 90%" : "เกิน 90%";
  return `${Math.round(p * 10) * 10}%`;
}

/** Three words for a chance of heavy rain, at the validation's cut points (forecast-validation §4: below 10 % "ต่ำ",
 *  10–40 % "มีโอกาส", 40 % and more "สูง"; the top word rests on 4–10 cases a year). Never a "no". */
export const RAIN_WORD_CUTS = [0.1, 0.4];
export function chanceWord(p, lang = "th") {
  if (p == null) return "–";
  const i = p >= RAIN_WORD_CUTS[1] ? 2 : p >= RAIN_WORD_CUTS[0] ? 1 : 0;
  return (lang === "en" ? ["low", "possible", "high"] : ["ต่ำ", "มีโอกาส", "สูง"])[i];
}

export { band };

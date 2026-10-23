// Cut points for every hazard, mapped onto the app's one scale. Every official band keeps its own words; the
// mapping of a band onto the app's level is the app's own choice where no agency gives one (docs/KNOWLEDGE.md §3,
// docs/research/thresholds-2026-10-23.md). Change a number only with a source (GUIDELINES rule 1).

/** The app's scale: four levels named by what to do, the same for every hazard (GUIDELINES rule 5; the UX scout,
 *  docs/research/ux-scout-2026-10-23.md §5a). Each tile's main word is the agency's own band word; the app's level is
 *  never milder than that word. Never "ปลอดภัย": "ยัง" says it can change. */
export const SCALE = [
  { level: 0, key: "ok", th: "ยังไม่น่าห่วง", en: "Nothing notable yet" },
  { level: 1, key: "watch", th: "ติดตามไว้", en: "Keep an eye on it" },
  { level: 2, key: "warn", th: "เตรียมตัว", en: "Get ready" },
  { level: 3, key: "danger", th: "ทำทันที", en: "Act now" },
];
export const UNKNOWN = { level: -1, key: "none", th: "ไม่มีข้อมูล", en: "No data" };

// bands: ascending `min` (inclusive), compared after rounding the value to `step` (the source's own resolution:
// PCD's edges are 25.0 / 25.1, WHO's UV index is a whole number). `th`/`en` are the source's own words.
export const HAZARDS = {
  heat: { // heat index, °C, hourly; the day's peak is what counts
    unit: "°C", step: 0.1, src: ["tmd-heatindex"],
    bands: [
      { min: -Infinity, level: 0, th: "ปกติ", en: "Normal" },
      { min: 27.0, level: 1, th: "เฝ้าระวัง", en: "Caution" },
      { min: 33.0, level: 2, th: "เตือนภัย", en: "Extreme caution" },
      { min: 42.0, level: 3, th: "อันตราย", en: "Danger" },
      { min: 52.0, level: 3, th: "อันตรายมาก", en: "Extreme danger" },
    ],
  },
  pm25: { // PM2.5, µg/m³, 24-hour mean (PCD's Thai AQI bands, 2023)
    unit: "µg/m³", step: 0.1, src: ["pcd-aqi-2566"],
    bands: [
      { min: -Infinity, level: 0, th: "ดีมาก", en: "Very good" },
      { min: 15.1, level: 0, th: "ดี", en: "Good" },
      { min: 25.1, level: 1, th: "ปานกลาง", en: "Moderate" },
      { min: 37.6, level: 2, th: "เริ่มมีผลกระทบต่อสุขภาพ", en: "Starting to affect health" },
      { min: 75.1, level: 3, th: "มีผลกระทบต่อสุขภาพ", en: "Affects health" },
    ],
  },
  aqi: { // PCD's Thai air quality index (AQI, the highest of its pollutants' sub-indices), as Air4Thai shows it
    unit: "", step: 1, src: ["pcd-aqi-2566"],
    bands: [
      { min: -Infinity, level: 0, th: "ดีมาก", en: "Very good" },
      { min: 26, level: 0, th: "ดี", en: "Good" },
      { min: 51, level: 1, th: "ปานกลาง", en: "Moderate" },
      { min: 101, level: 2, th: "เริ่มมีผลกระทบต่อสุขภาพ", en: "Starting to affect health" },
      { min: 201, level: 3, th: "มีผลกระทบต่อสุขภาพ", en: "Affects health" },
    ],
  },
  uv: { // UV index, the day's peak (WHO Global Solar UV Index categories)
    unit: "", step: 1, src: ["who-uvi"],
    bands: [
      { min: -Infinity, level: 0, th: "ต่ำ", en: "Low" },
      { min: 3, level: 0, th: "ปานกลาง", en: "Moderate" },
      { min: 6, level: 1, th: "สูง", en: "High" },
      { min: 8, level: 2, th: "สูงมาก", en: "Very high" },
      { min: 11, level: 3, th: "สูงที่สุด", en: "Extreme" },
    ],
  },
  rain24: { // rain in 24 hours, mm (TMD's words for a day's rain)
    unit: "mm", step: 0.1, src: ["tmd-rain-words"],
    bands: [
      { min: -Infinity, level: 0, th: "ไม่มีฝน", en: "No rain" },
      { min: 0.1, level: 0, th: "ฝนเล็กน้อย", en: "Light rain" },
      { min: 10.1, level: 0, th: "ฝนปานกลาง", en: "Moderate rain" },
      { min: 35.1, level: 2, th: "ฝนหนัก", en: "Heavy rain" },
      { min: 90.1, level: 3, th: "ฝนหนักมาก", en: "Very heavy rain" },
    ],
  },
  gust: { // strongest gust, km/h (Beaufort scale; using it for gusts is the app's own, cautious choice)
    unit: "km/h", step: 1, src: ["wmo-beaufort"],
    bands: [
      { min: -Infinity, level: 0, th: "ลมปกติ", en: "Normal wind" },
      { min: 39, level: 1, th: "ลมแรง", en: "Strong wind" },
      { min: 62, level: 2, th: "ลมแรงมาก", en: "Gale" },
      { min: 89, level: 3, th: "ลมพายุ", en: "Storm-force wind" },
      { min: 118, level: 3, th: "ลมพายุรุนแรง", en: "Hurricane-force wind" },
    ],
  },
  mmi: { // shaking intensity at the point (Modified Mercalli, estimated from magnitude and distance)
    unit: "", step: 0.1, src: ["usgs-mmi"],
    bands: [
      { min: -Infinity, level: 0, th: "ไม่น่ารู้สึก", en: "Probably not felt" },
      { min: 2.5, level: 1, th: "อาจรู้สึกได้เบา ๆ", en: "May be felt weakly" },
      { min: 4.5, level: 2, th: "รู้สึกได้ชัด", en: "Felt clearly" },
      { min: 5.5, level: 3, th: "สั่นแรง ของอาจตก", en: "Strong shaking" },
      { min: 6.5, level: 3, th: "สั่นรุนแรง อาจเสียหาย", en: "Very strong shaking" },
    ],
  },
};

export function roundTo(v, step = 0.1) {
  const d = step < 1 ? String(step).split(".")[1].length : 0;
  return +(Math.round(v / step) * step).toFixed(d) + 0; // toFixed: 251 × 0.1 must read 25.1, not 25.099…; + 0: no -0
}

/** The band (with its app level) for a value, or UNKNOWN. */
export function band(hazard, value) {
  const h = HAZARDS[hazard];
  if (!h || value == null || Number.isNaN(value)) return { ...UNKNOWN };
  const v = roundTo(value, h.step);
  let hit = h.bands[0];
  for (const b of h.bands) if (v >= b.min) hit = b;
  return { ...hit, key: SCALE[hit.level].key };
}

export const scale = (level) => (level == null || level < 0 ? UNKNOWN : SCALE[Math.min(level, 3)]);

/** River gauges: FloodWatch's own rule (src/floodwatch/forecast classify_status, read 2026-10-23), so a gauge reads
 *  the same here as on flood.autobahn.bot: at or over the bank → danger; ≥ 90 % of the bank above the bed → warning;
 *  ≥ 70 % → watch. FloodWatch marks these cut points as heuristic. The bank is ONWR's min_bank where ThaiWater gives it. */
export function riverLevel(levelMsl, bankMsl, groundMsl) {
  if (levelMsl == null || bankMsl == null) return { level: -1, pct: null };
  const pct = groundMsl != null && bankMsl > groundMsl ? ((levelMsl - groundMsl) / (bankMsl - groundMsl)) * 100 : null;
  if (levelMsl >= bankMsl) return { level: 3, pct };
  if (pct == null) return { level: bankMsl - levelMsl < 0.3 ? 2 : 0, pct };
  if (pct >= 90) return { level: 2, pct };
  if (pct >= 70) return { level: 1, pct };
  return { level: 0, pct };
}

/** FloodWatch's own words for a gauge's status (web/app.js STATUS, read 2026-10-23), so a gauge reads the same in
 *  both apps: blue means water in the channel, not "safe" (FloodWatch D-036). */
export const RIVER_WORDS = [
  { th: "ยังรับน้ำได้", en: "Room in the channel" },
  { th: "เฝ้าระวัง", en: "Watch" },
  { th: "ใกล้ล้นตลิ่ง", en: "Near the bank" },
  { th: "ล้นตลิ่ง", en: "Over the bank" },
];

/** Probability cut points the app uses to turn an ensemble into a level (its own choice, GUIDELINES rule 6):
 *  a level counts from the "likely" chance; a "possible" chance lifts the card to watch at most. */
export const CHANCE = { likely: 0.5, possible: 0.2 };

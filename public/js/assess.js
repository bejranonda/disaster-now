// From every source's response to what the page says: one card per hazard (level, value, lines, 3-day chips,
// sources with their times), the overall verdict, the pre-warnings and the place's long-term profile.
// Pure: same inputs → same words, so tests can check the page against the sources (test/assess.test.mjs).

import { band, scale, roundTo, HAZARDS, RIVER_WORDS } from "./levels.js";
import { buildOutlook, prewarnings, windowLevel, chanceText, chanceWord } from "./outlook.js";
import { parseGistda, parseAir4Thai, nearestStation, buildAir } from "./airq.js";
import { nearRain, nearGauges, parseFlashFlood, parseFloodWatchPoint, FW_LEVEL, areaIndex, waterWord, POLDER_PROVINCES } from "./water.js";
import { parseEmsc, parseUsgs, mergeQuakes, quakesForPoint, tsunamiWatch } from "./quake.js";
import { warningsFor, capHazard, gdacsNear, cycloneLevel, hotspotsNear, hotspotLevel, arcCount, jmaStorm, stormLevel, tmdStormsNear } from "./events.js";
import { actionFor } from "./actions.js";
import { compass } from "./geo.js";

export const GUIDE = "https://baanrodmai.autobahn.bot"; // the sister app's "what to do" pages (Hazard-huntz)
export const FLOODWATCH = "https://flood.autobahn.bot";

const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? "–"
  : Math.abs(v) >= 1000 ? Number(v).toLocaleString("en-US", { maximumFractionDigits: d }) : Number(v).toFixed(d));
const DAY_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "วันนี้" / "พรุ่งนี้" / "จ. 26" for the outlook's day index. The first window is the rest of today, so from 18:00
 *  Bangkok time it is "คืนนี้" (KI-025: "วันนี้ 33°" at 20:00 read as the day's heat). `nowMs` is optional. */
export function dayName(i, date, lang, nowMs = null) {
  const d = new Date(`${date}T12:00:00+07:00`);
  const wd = (lang === "en" ? DAY_EN : DAY_TH)[d.getUTCDay()];
  const night = i === 0 && nowMs != null && isEvening(nowMs);
  if (lang === "en") return night ? "Tonight" : ["Today", "Tomorrow", `${wd} ${d.getUTCDate()}`][i] || `${wd} ${d.getUTCDate()}`;
  return night ? "คืนนี้" : ["วันนี้", "พรุ่งนี้", `${wd} ${d.getUTCDate()}`][i] || `${wd} ${d.getUTCDate()}`;
}

/** 18:00 or later in Bangkok: the rest of today is the night. */
export const isEvening = (nowMs) => new Date(nowMs + 7 * 3.6e6).getUTCHours() >= 18;

/** "02:00 น. วันนี้" / "02:00, 24 Oct" from a Bangkok "YYYY-MM-DDTHH:MM". */
export function timeText(local, nowMs, lang) {
  if (!local) return "";
  const today = new Date(nowMs + 7 * 3.6e6).toISOString().slice(0, 10);
  const hm = local.slice(11, 16);
  const [y, m, d] = local.slice(0, 10).split("-").map(Number);
  if (lang === "en") return local.slice(0, 10) === today ? `${hm} today` : `${hm}, ${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
  return local.slice(0, 10) === today ? `${hm} น. วันนี้` : `${hm} น. ${d} ${MONTH_TH[m - 1]}`;
  // (y is unused: the app never shows data a year old)
}

const ageText = (hours, lang) => {
  if (hours == null) return "";
  const m = Math.round(hours * 60);
  if (lang === "en") return m < 60 ? `${m} min ago` : `${Math.round(hours)} h ago`;
  return m < 60 ? `${m} นาทีที่แล้ว` : `${Math.round(hours)} ชม.ที่แล้ว`;
};

/** Bangkok local "YYYY-MM-DDTHH:MM" for an epoch ms. */
export const localOf = (ms) => new Date(ms + 7 * 3.6e6).toISOString().slice(0, 16);

export function assess(b, lang = "th", ipe = null) {
  const L = (th, en) => (lang === "en" ? en : th);
  const now = b.now;
  const { lat, lon } = b.point;
  const place = b.point.place;
  const word = (bd) => (bd ? (lang === "en" ? bd.en : bd.th) : "");
  // บ้านรอดไหม's guide in the page's language: its /en/ pages exist (200), and 0.3.0 sent English readers to the Thai
  // ones through a no-op (output cross-check X10)
  const guide = (path) => `${GUIDE}${lang === "en" ? "/en" : ""}/${path}`;
  const cards = [];
  const extraPre = [];
  // UV's days, capped like every forecast; the first is the rest of today, like every other column (U16)
  const uvDay = (d, i) => ({ name: dayName(i, d.date, lang, now), level: Math.min(MODEL_MAX, d.band.level), text: fmt(d.max) });

  const ens = b.ens ? buildOutlook(b.ens, now) : null;
  const gistda = b.gistda ? parseGistda(b.gistda) : null;
  const stations = b.a4t ? parseAir4Thai(b.a4t) : [];
  const station = stations.length ? nearestStation(stations, lat, lon, now) : null;
  const air = buildAir(b.aq, gistda, now, station);

  // ---------- heat ----------
  {
    const c = { id: "heat", icon: "🌡️", title: L("ความร้อน (ดัชนีความร้อน)", "Heat (heat index)"), short: L("ความร้อน", "Heat"), level: -1,
      link: { href: guide("hot"), text: L("ร้อนแบบนี้ ทำอย่างไร", "What to do in this heat") }, src: [] };
    if (ens) {
      // the number is the afternoon its label names: today's while today's window still holds one (before 16:00),
      // else tomorrow's. The next 24 h's maximum could be tomorrow's peak under "บ่ายนี้" (visitor audit U25), and the
      // table and the chips show these same windows (fcLevel)
      const pm = new Date(now + 7 * 3.6e6).getUTCHours() < 16 && Boolean(ens.days[0]?.heat);
      const w = (pm ? ens.days[0].heat : ens.days[1]?.heat) || ens.next24.heat;
      c.level = fcLevel("heat", w);
      c.word = word(band("heat", w.p50));
      // U3: a bare "43 °C" reads as the air temperature, several degrees below the heat index
      const when = pm ? L("บ่ายนี้", "This afternoon") : L("บ่ายพรุ่งนี้", "Tomorrow afternoon");
      c.value = L(`${when} รู้สึกเหมือน ${heatNum(w.p50)}\u00a0°C`, `${when}: feels like ${heatNum(w.p50)}\u00a0°C`);
      c.action = actionFor("heat", w.p50, lang);
      c.lines = [
        L(`${when}ราว ${fmt(w.p10)}–${fmt(w.p90)}\u00a0°C (ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก ไม่ใช่อุณหภูมิอากาศ)`,
          `${when} about ${fmt(w.p10)}–${fmt(w.p90)}\u00a0°C (the heat index: how hot it feels, not the air temperature)`),
        // the raw model reads 3–5 °C low in Thailand: only corrected numbers are shown (MODELS.md §1)
        L("ปรับแก้ตามสถานีวัดของกรมอุตุฯ แล้ว: แบบจำลองดิบมักต่ำกว่าค่าวัดจริงราว 3–5 °C",
          "Corrected to TMD's stations: the raw model usually reads 3–5 °C low"),
      ];
      // what each correction scored on stations it wasn't fitted on (docs/research/model-check-2026-10-24.md)
      c.note = w.method === "C6"
        ? L("ฤดูหนาว (พ.ย.–ก.พ.) ใช้สูตรปรับแก้ชั่วคราว: ทดสอบย้อนหลังกับสถานีที่ไม่ได้ใช้ปรับ พลาดราว ±1.5 °C แต่ยังไม่ได้ทดสอบแบบพยากรณ์จริง (สูตรทั้งปีสูงเกินจริง 3–4 °C ในฤดูนี้) วันที่ 3 ยังไม่ได้ทดสอบ",
          "Cool season (Nov–Feb): a provisional correction; tested back on stations it wasn't fitted on, a typical miss of ±1.5 °C, not yet tested as issued (the year-round line read 3–4 °C high in this season); day 3 is untested")
        : L("ความแม่นยำที่ทดสอบกับสถานีที่ไม่ได้ใช้ปรับ (2025–26): พลาดราว ±2.5 °C และมักสูงกว่าจริงเล็กน้อย วันที่ 3 ยังไม่ได้ทดสอบ",
          "Tested on stations it wasn't fitted on (2025–26): a typical miss of ±2.5 °C, usually a little high; day 3 is untested");
      if (w.chance[3] >= 0.1) c.lines.push(L(`โอกาสถึงระดับอันตราย (≥ 42 °C) ${chanceText(w.chance[3], lang)}`, `Chance of danger level (≥ 42 °C): ${chanceText(w.chance[3], lang)}`));
      // a window with no afternoon left has no heat summary (outlook.hasAfternoon, S6): those days are left out
      c.days = ens.days.map((d, i) => (d.heat ? { name: dayName(i, d.date, lang, now), date: d.date, level: fcLevel("heat", d.heat), text: `${heatNum(d.heat.p50)}°` } : null)).filter(Boolean);
      // no clock: Open-Meteo doesn't say which run it served (visitor audit V25)
      c.src.push({ name: L("พยากรณ์ล่าสุดที่มี: แบบจำลอง ECMWF 51 ชุด ปรับตามสถานีวัด", "Latest available forecast: ECMWF ensemble, 51 runs, corrected to stations"), model: true });
    } else c.error = b.errors?.ens;
    cards.push(c);
  }

  // ---------- PM2.5 ----------
  {
    const c = { id: "pm25", icon: "😷", title: L("ฝุ่น PM2.5", "Dust (PM2.5)"), short: L("ฝุ่น PM2.5", "PM2.5"), level: -1,
      link: { href: guide("air"), text: L("ฝุ่นวันนี้ ต้องทำอะไร", "What to do about today's dust") }, src: [] };
    if (air.pm25) {
      const p = air.pm25;
      c.level = p.band.level;
      c.word = word(p.band);
      c.value = `${fmt(p.mean24, 1)}\u00a0µg/m³`;
      c.action = actionFor("pm25", p.mean24, lang);
      c.lines = [];
      if (p.kind === "station") {
        c.lines.push(L(`ค่าเฉลี่ย 24 ชม. ที่สถานีวัด ${station.name.th} (ห่าง ${fmt(station.km, 1)} กม.)`,
          `24-h mean at the ${station.name.en || station.name.th} station (${fmt(station.km, 1)} km away)`));
        c.src.push({ name: L("สถานีตรวจวัด คพ. (Air4Thai)", "PCD station (Air4Thai)"), time: timeText(p.time, now, lang), ageH: station.ageH });
        // GISTDA's estimate is not shown beside a measurement: on 24 Oct 2026 it read 1.3× the stations (KNOWLEDGE §5)
      } else {
        // the audit (output-crosscheck M1): a failed Air4Thai read must not be worded as "no station here"
        const late = b.a4t ? nearestStation(stations, lat, lon, now, { maxAgeH: 48 }) : null;
        if (late) {
          c.lines.push(L(`สถานีใกล้สุด ${late.name.th} (ห่าง ${fmt(late.km, 1)} กม.) ยังไม่ส่งข้อมูลมา ${fmt(late.ageH)} ชม.: ค่าล่าสุด ${fmt(late.pm25, 1)} (${word(band("pm25", late.pm25))})`,
            `The nearest station, ${late.name.en || late.name.th} (${fmt(late.km, 1)} km), hasn't reported for ${fmt(late.ageH)} h: last ${fmt(late.pm25, 1)} (${word(band("pm25", late.pm25))})`));
        }
        c.lines.push(b.a4t
          ? L("ไม่มีสถานีวัดของ คพ. ที่ส่งข้อมูลใน 3 ชม. ในรัศมี 15 กม. ใช้ค่าประมาณ 24 ชม. จากดาวเทียมของ GISTDA",
            "No PCD station reporting within 15 km in the last 3 h: GISTDA's 24-h satellite estimate")
          : L(`ดึงข้อมูลสถานีวัดของ คพ. ไม่ได้ตอนนี้${b.errors?.a4t ? ` (${b.errors.a4t})` : ""} ใช้ค่าประมาณ 24 ชม. จากดาวเทียมของ GISTDA แทน`,
            `PCD station data couldn't be read now${b.errors?.a4t ? ` (${b.errors.a4t})` : ""}: GISTDA's 24-h satellite estimate instead`));
        c.note = L("ค่าประมาณอาจต่างจากสถานีวัดมาก (24 ต.ค. 2569 ใน 60 จังหวัด มัธยฐานสูงกว่าสถานี 1.3 เท่า)", "Estimates can differ a lot from stations (24 Oct 2026, 60 provinces: a median 1.3× the stations)");
        c.src.push({ name: "GISTDA", time: timeText(p.time, now, lang), model: true });
      }
      if (air.outlook.length) {
        // forecasts: capped like the others; today's says "คาด" so it isn't read against the measured value above
        c.days = air.outlook.map((d, i) => (i === 0 ? { name: dayName(i, d.date, lang, now), level: Math.min(MODEL_MAX, d.band.level), text: fmt(d.mean), sub: L("คาด", "expected") }
          : { name: dayName(i, d.date, lang, now), level: Math.min(MODEL_MAX, d.band.level), text: word(d.band), sub: L("อาจเปลี่ยน", "may change") }));
        // X14: adjusted to a station's measurement (validated, MODELS §2) or to GISTDA's estimate (untested)
        const basis = air.ratio?.basis === "estimate";
        c.src.push({ name: L(`แบบจำลอง CAMS${!air.ratio ? " (ยังไม่ได้ปรับ: ต่ำกว่าค่าจริง)" : basis ? " ปรับตามค่าประมาณของ GISTDA (วิธีนี้ยังไม่ได้ทดสอบกับค่าประมาณ)" : " ปรับตามค่าวัดล่าสุด"}`,
          `CAMS model${!air.ratio ? " (unadjusted: reads low)" : basis ? ", adjusted to GISTDA's estimate (the method is untested on estimates)" : ", adjusted to the latest measurement"}`), model: true });
        air.outlook.forEach((d, i) => {
          if (i > 0 && d.band.level >= 2) extraPre.push({ hazard: "pm25", day: i, date: d.date, level: d.band.level, value: d.mean });
        });
      }
    } else c.error = b.errors?.gistda || b.errors?.a4t;
    cards.push(c);
  }

  // ---------- other pollution ----------
  {
    const c = { id: "air", icon: "🏭", title: L("มลพิษอากาศอื่น ๆ", "Other air pollution"), short: L("มลพิษอื่น", "Other pollution"), level: -1, src: [],
      link: { href: guide("mask"), text: L("ใส่หน้ากากไหม แบบไหน", "Which mask, and when") } };
    // PM2.5 has its own card: this one is graded by the other pollutants' PCD sub-indices only, at the nearest
    // station that measures any of them (many Bangkok stations measure PM2.5 only)
    const notPm = (s) => Object.entries(s.sub || {}).filter(([k, v]) => k !== "PM25" && v != null);
    const st2 = stations.length ? nearestStation(stations, lat, lon, now, { has: (s) => notPm(s).length > 0 }) : null;
    const others = st2 ? notPm(st2) : [];
    const station = st2;
    if (others.length) {
      const [worstK, worstV] = others.sort((x, y) => y[1] - x[1])[0];
      const bd = band("aqi", worstV);
      c.level = bd.level;
      c.word = word(bd);
      c.value = `AQI ${fmt(worstV)}`;
      const NAME = { PM10: "PM10", O3: "โอโซน", CO: "CO", NO2: "NO₂", SO2: "SO₂" };
      const NAME_EN = { PM10: "PM10", O3: "ozone", CO: "CO", NO2: "NO₂", SO2: "SO₂" };
      c.lines = [L(`ดัชนีคุณภาพอากาศของ คพ. ไม่นับ PM2.5: สูงสุดคือ ${NAME[worstK]} ที่สถานี ${station.name.th} (ห่าง ${fmt(station.km, 1)} กม.)`,
        `PCD's air quality index without PM2.5: highest is ${NAME_EN[worstK]} at ${station.name.en || station.name.th} (${fmt(station.km, 1)} km)`),
      // PCD's sub-indices (AQI), not concentrations: "PM10 25" was the index of 50 µg/m³ (output cross-check X13)
      L("ดัชนีย่อย (AQI): ", "Sub-indices (AQI): ") + others.map(([k, v]) => `${lang === "en" ? NAME_EN[k] : NAME[k]} ${fmt(v)}`).join(" · ")];
      c.src.push({ name: L("สถานีตรวจวัด คพ. (Air4Thai)", "PCD station (Air4Thai)"), time: timeText(station.time, now, lang) });
    } else if (air.pollutants) {
      const p = air.pollutants;
      c.word = L("ค่าจากแบบจำลอง ไม่มีระดับทางการ", "Model values, no official level");
      c.value = `O₃ ${fmt(p.o3)}`;
      c.lines = [b.a4t ? L("ไม่มีสถานีวัดก๊าซอื่นในรัศมี 15 กม.: ค่าจากแบบจำลอง CAMS (µg/m³)", "No station measuring other gases within 15 km: CAMS model values (µg/m³)")
        : L("ดึงข้อมูลสถานีวัดของ คพ. ไม่ได้ตอนนี้: ค่าจากแบบจำลอง CAMS (µg/m³)", "PCD station data couldn't be read now: CAMS model values (µg/m³)"),
        `PM10 ${fmt(p.pm10)} · O₃ ${fmt(p.o3)} · NO₂ ${fmt(p.no2)} · SO₂ ${fmt(p.so2)} · CO ${fmt(p.co)}`];
      c.src.push({ name: "CAMS", time: timeText(p.time, now, lang), model: true });
    } else c.error = b.errors?.aq;
    cards.push(c);
  }

  // ---------- UV ----------
  {
    const c = { id: "uv", icon: "☀️", title: L("รังสี UV", "UV"), short: "UV", level: -1, src: [] };
    if (air.uv.length) {
      // the level comes from the UV now, not from the day's peak: on 24 Oct 2026 every one of TMD's 77 stations had a
      // clear-sky peak of 8 or more (thresholds §3.2), so a peak-based tile would be orange every day
      const hour = Number(localOf(now).slice(11, 13));
      const day = hour >= 6 && hour < 18;
      const cur = air.uvNow;
      const u = day ? { max: cur, band: band("uv", cur) } : { max: 0, band: band("uv", 0) };
      // the next daylight: today's before 16:00 (also before dawn), tomorrow's after (output-crosscheck M3)
      // from 13:00 today's noon has passed: name tomorrow's (U16; M3's rule was 16:00 for a whole-day "today")
      const peak = hour >= 13 && air.uv[1] ? { ...air.uv[1], when: L("พรุ่งนี้", "tomorrow") } : { ...air.uv[0], when: L("วันนี้", "today") };
      c.level = Math.min(MODEL_MAX, u.band.level); // CAMS's UV is a model value: "ทำทันที" needs a measurement
      c.word = day ? word(u.band) : L("กลางคืน", "Night");
      c.value = day ? `UV ${fmt(cur)}` : L(`${peak.when}สูงสุด ${fmt(peak.max)}`, `${peak.when === "today" ? "Today" : "Tomorrow"} up to ${fmt(peak.max)}`);
      c.lines = [L(`สูงสุด${peak.when}ราว ${fmt(peak.max)} (${word(peak.band)}) ช่วงเที่ยง เมฆมากจะต่ำกว่านี้`,
        `${peak.when === "today" ? "Today's" : "Tomorrow's"} peak about ${fmt(peak.max)} (${word(peak.band)}) around noon; lower under cloud`)];
      if (peak.max >= 6) c.lines.push(L("ช่วงสาย–บ่ายเลี่ยงแดดจัด สวมหมวก ทาครีมกันแดด (คำแนะนำ WHO)", "Late morning to afternoon: seek shade, wear a hat, use sunscreen (WHO)"));
      c.days = air.uv.map((d, i) => uvDay(d, i));
      c.src.push({ name: "CAMS", model: true });
    } else c.error = b.errors?.aq;
    cards.push(c);
  }

  // ---------- rain ----------
  const rainNear = b.twRain ? nearRain(b.twRain, lat, lon, now) : [];
  {
    const c = { id: "rain", icon: "🌧️", title: L("ฝน", "Rain"), short: L("ฝน", "Rain"), level: -1, lines: [], src: [],
      link: { href: guide("flood"), text: L("ฝนหนัก น้ำท่วม ทำอย่างไร", "What to do about heavy rain and floods") } };
    let lvObs = -1;
    if (rainNear.length) {
      const r = rainNear[0];
      lvObs = r.band.level;
      c.lines.push(L(`วัดได้ ${fmt(r.rain24, 1)} มม. ใน 24 ชม. ที่ผ่านมา ที่${r.name} (ห่าง ${fmt(r.km, 1)} กม.)`,
        `${fmt(r.rain24, 1)} mm measured in the last 24 h at ${r.name} (${fmt(r.km, 1)} km away)`));
      c.src.push({ name: L("สถานีวัดฝน (คลังข้อมูลน้ำแห่งชาติ)", "Rain gauge (ThaiWater)"), time: timeText(r.time, now, lang), ageH: r.ageH });
    } else if (b.twRain) c.lines.push(L("ไม่มีสถานีวัดฝนที่ส่งข้อมูลใน 3 ชม. ในรัศมี 10 กม.", "No rain gauge reporting within 10 km in the last 3 h"));
    if (ens) {
      const w = ens.next24.rain24;
      const lv = windowLevel(w);
      c.level = Math.max(lvObs, Math.min(MODEL_MAX, lv.level));
      // the validation (MODELS.md §3): a point's rain amount and yes/no have almost no skill 1–2 days ahead, so the tile
      // gives the chance of heavy rain in three words; the amount stays in the detail as a rough range
      c.value = L(`โอกาสฝนหนัก ${chanceWord(w.chance[2], "th")}`, `Heavy rain: ${chanceWord(w.chance[2], "en")} chance`);
      // the gauge's word only when the measurement raised the tile: "ไม่มีฝน" from yesterday read as today's forecast (U5)
      c.word = rainNear.length && lvObs > lv.level ? word(rainNear[0].band) : word(scale(c.level));
      const bound = w.chance[2] < 0.1 || w.chance[2] > 0.9; // "ราว ไม่ถึง 10%" said "about under" (U21)
      c.lines.unshift(L(`24 ชม. ข้างหน้า: โอกาสฝนหนัก (> 35 มม. ใน 24 ชม.) ในพื้นที่${bound ? "" : "ราว"} ${chanceText(w.chance[2], lang)} · ฝนหนักเกิดได้แม้วันที่คาดว่าโอกาสต่ำ`,
        `Next 24 h: chance of heavy rain (> 35 mm in 24 h) in the area${bound ? "" : " about"} ${chanceText(w.chance[2], lang)} · heavy rain can come even on a "low" day`));
      c.days = ens.days.map((d, i) => ({ name: dayName(i, d.date, lang, now), date: d.date, level: fcLevel("rain24", d.rain24),
        text: chanceWord(d.rain24.chance[2], lang), sub: L("ฝนหนัก", "heavy") }));
      c.src.push({ name: L("แบบจำลอง ECMWF 51 ชุด", "ECMWF ensemble, 51 runs"), model: true });
    } else {
      c.level = lvObs >= 1 ? lvObs : -1; // no forecast: a dry gauge yesterday is not "calm" for the next 24 h
      if (c.level >= 0) c.word = word(rainNear[0].band);
      c.error = b.errors?.ens;
    }
    if (lvObs >= 2) c.lines.push(L("ฝนหนักเมื่อ 24 ชม. ที่ผ่านมา ระวังน้ำท่วมขังและน้ำป่า", "Heavy rain in the last 24 h: watch for flooding"));
    // the validation's honest number (MODELS.md §3): at a single station, heavy rain 1–2 days ahead is mostly missed
    if (ens) c.note = L("ฝนหนักเฉพาะจุดพยากรณ์ล่วงหน้าได้ไม่แม่น: ปี 2026 แบบจำลองจับวันฝนหนักที่สถานีได้ราว 1 ใน 8 ดูประกาศกรมอุตุฯ ประกอบ",
      "Heavy rain at one place is hard to forecast: in 2026 the model caught about 1 in 8 heavy-rain days at stations; check TMD's warnings too");
    cards.push(c);
  }

  // ---------- wind and storms ----------
  {
    const c = { id: "wind", icon: "💨", title: L("ลมแรงและพายุ", "Wind and storms"), short: L("ลม พายุ", "Wind, storms"), level: -1, lines: [], src: [],
      link: { href: guide("storm"), text: L("พายุ ลมแรง ทำอย่างไร", "What to do in strong wind") } };
    if (ens) {
      const w = ens.next24.gust;
      const lv = windowLevel(w);
      c.level = Math.min(MODEL_MAX, Math.max(band("gust", w.p50).level, lv.level));
      c.word = GUST_WORDS[c.level] ? word(GUST_WORDS[c.level]) : "";
      c.value = L(`กระโชก ${fmt(w.p50)} กม./ชม.`, `gusts ${fmt(w.p50)} km/h`);
      c.lines.push(L(`ลมกระโชกแรงสุดใน 24 ชม. ราว ${fmt(w.p10)}–${fmt(w.p90)} กม./ชม. (กรมอุตุฯ เรียกลมระดับนี้ว่า "${band("gust", w.p50).th}")`,
        `Strongest gust in 24 h about ${fmt(w.p10)}–${fmt(w.p90)} km/h (TMD's word for it: "${band("gust", w.p50).en}")`));
      c.days = ens.days.map((d, i) => ({ name: dayName(i, d.date, lang, now), date: d.date, level: fcLevel("gust", d.gust), text: fmt(d.gust.p50) }));
      c.src.push({ name: L("แบบจำลอง ECMWF 51 ชุด", "ECMWF ensemble, 51 runs"), model: true });
      c.note = L("ลมกระโชกจากแบบจำลอง ยังไม่ได้ตรวจสอบความแม่นยำ (ไม่มีข้อมูลลมกระโชกจากสถานีให้เทียบ)", "Model gusts, not yet checked for accuracy (no station gust records to compare)");
    } else c.error = b.errors?.ens;
    const gustLevel = c.level;
    // tropical cyclones: JMA's forecast circles (western Pacific, South China Sea), GDACS for the rest
    const tmdNames = new Set(((b.storms && b.storms.items) || []).map((x) => String(x.nameEN || "").toLowerCase()));
    const storms = (b.jma || []).map((f) => jmaStorm(f, lat, lon)).filter(Boolean)
      .filter((x) => !tmdNames.has(x.name.toLowerCase())) // TMD's own track wins for a storm both carry
      .sort((a, z) => a.closest.edge - z.closest.edge);
    if (storms.length && storms[0].closest.edge <= STORM_SHOW_KM) {
      const st = storms[0];
      c.level = Math.max(c.level, stormLevel(st));
      const near = st.closest.edge <= 0 ? L("จุดนี้อยู่ในวงคาดการณ์", "this point is inside the forecast circle")
        : L(`วงคาดการณ์เข้าใกล้สุดราว ${fmt(Math.round(st.closest.edge / 10) * 10)} กม.`, `its forecast circle comes within about ${fmt(Math.round(st.closest.edge / 10) * 10)} km`);
      c.lines.push(L(`พายุ ${st.name} อยู่ห่างราว ${fmt(Math.round(st.km / 10) * 10)} กม. ${near} ใน ${st.lastHours} ชม.`,
        `Storm ${st.name} is about ${fmt(Math.round(st.km / 10) * 10)} km away; ${near} within ${st.lastHours} h`));
      c.src.push({ name: L("ศูนย์พายุ JMA (โตเกียว)", "JMA RSMC Tokyo") });
    }
    // TMD's own track (collector) names the storm in Thai; the official words lead (GUIDELINES rule 2)
    const tmdS = b.storms ? tmdStormsNear(b.storms, lat, lon) : [];
    if (tmdS.length && tmdS[0].closest.km <= STORM_SHOW_KM) {
      const st = tmdS[0];
      const lv = st.closest.km <= 300 ? 2 : st.closest.km <= 800 ? 1 : 0;
      c.level = Math.max(c.level, lv);
      c.lines.unshift(L(`กรมอุตุฯ: ${st.type} "${st.name}" ห่างราว ${fmt(Math.round(st.km / 10) * 10)} กม. เส้นทางคาดการณ์เข้าใกล้สุดราว ${fmt(Math.round(st.closest.km / 10) * 10)} กม.`,
        `TMD: ${st.typeEN} "${st.nameEN}" about ${fmt(Math.round(st.km / 10) * 10)} km away; its forecast track comes within about ${fmt(Math.round(st.closest.km / 10) * 10)} km`));
      c.src.push({ name: L("กรมอุตุนิยมวิทยา (เส้นทางพายุ)", "TMD storm track") });
    }
    if (b.gdacs) {
      const tcs = gdacsNear(b.gdacs, lat, lon).filter((e) => e.type === "TC" && e.km <= STORM_SHOW_KM).sort((a, z) => a.km - z.km);
      if (tcs.length) {
        const t = tcs[0];
        c.level = Math.max(c.level, cycloneLevel(t));
        c.lines.push(L(`พายุหมุนเขตร้อน ${t.name} ห่างราว ${fmt(t.km)} กม. (GDACS ระดับ ${t.alert})`, `Tropical cyclone ${t.name} about ${fmt(t.km)} km away (GDACS ${t.alert})`));
      } else if (!storms.some((x) => x.closest.edge <= STORM_SHOW_KM) && !tmdS.some((x) => x.closest.km <= STORM_SHOW_KM)) {
        c.lines.push(L("ไม่มีพายุหมุนเขตร้อนในรัศมี 1,500 กม.", "No tropical cyclone within 1,500 km"));
      }
      c.src.push({ name: "GDACS" });
    } else if (b.errors?.gdacs) {
      // a failed source is worded as a failure (GUIDELINES rule 7; visitor audit U24: the line just vanished)
      c.lines.push(L("ตรวจพายุหมุนเขตร้อนจาก GDACS ไม่ได้ตอนนี้", "Couldn't check GDACS for tropical cyclones now"));
    }
    if (gustLevel < 0 && c.level === 0) c.level = -1; // a far storm alone doesn't make the wind "calm" (visitor audit V4)
    cards.push(c);
  }

  // ---------- river and flood ----------
  const gauges = b.twLevel ? nearGauges(b.twLevel, lat, lon, now) : [];
  const ff = b.hiiFf != null ? parseFlashFlood(b.hiiFf) : null;
  const fw = b.floodwatch ? parseFloodWatchPoint(b.floodwatch) : null;
  {
    const c = { id: "flood", icon: "🌊", title: L("น้ำท่วม ระดับน้ำ", "Flood and river level"), short: L("น้ำท่วม", "Flood"), level: -1, lines: [], src: [],
      link: { href: guide("flood"), text: L("ก่อนน้ำมา ทำอย่างไร", "Before the water comes") },
      more: { href: `${FLOODWATCH}/#p=${(Math.round(lat * 100) / 100).toFixed(2)},${(Math.round(lon * 100) / 100).toFixed(2)}`, text: L("ดูระดับน้ำละเอียดที่ FloodWatch", "River detail on FloodWatch") } };
    const fresh = gauges.filter((g) => !g.stale);
    if (fw && (fw.area || fw.river)) {
      // FloodWatch's own area category for the point (BMA's canals included), its nearest river as a line
      c.level = fw.area ? FW_LEVEL[fw.area] ?? -1 : FW_LEVEL[fw.river.status] ?? -1;
      if (fw.area) c.lines.push(L(`ภาพรวมทางน้ำรอบจุดนี้ (FloodWatch): ${word(RIVER_WORDS[Math.max(0, c.level)])}`, `Waterways around this point (FloodWatch): ${word(RIVER_WORDS[Math.max(0, c.level)])}`));
    }
    if (fw && fw.river) {
      c.lines.push(L(`${fw.river.name} (ห่าง ${fmt(fw.river.km, 1)} กม.): ${fw.river.freeboard >= 0 ? `ต่ำกว่าตลิ่ง ${fmt(fw.river.freeboard * 100)} ซม.` : `สูงกว่าตลิ่ง ${fmt(-fw.river.freeboard * 100)} ซม.`}`,
        `${fw.river.name} (${fmt(fw.river.km, 1)} km): ${fw.river.freeboard >= 0 ? `${fmt(fw.river.freeboard * 100)} cm below the bank` : `${fmt(-fw.river.freeboard * 100)} cm over the bank`}`));
      c.src.push({ name: "FloodWatch", time: timeText(localOf(Date.parse(fw.river.time)), now, lang) });
      if (c.level >= 0) c.word = word(RIVER_WORDS[c.level]);
    } else if (fresh.length) {
      // the point's level is FloodWatch's area category (water.areaIndex), not the nearest gauge's own status
      const ai = areaIndex(fresh, place?.pv);
      const polder = POLDER_PROVINCES.includes(place?.pv);
      c.level = ai.category ?? -1; // no gauge close enough is no data, never calm (output-crosscheck M4; FloodWatch says the same)
      const conf = { medium: L("ปานกลาง", "medium"), low: L("ต่ำ", "low"), very_low: L("ต่ำมาก", "very low"), none: L("ไม่มี", "none") }[ai.confidence];
      c.lines.push(ai.category == null
        ? L(polder ? "ไม่มีสถานีวัดน้ำในคลองที่ส่งข้อมูลในรัศมี 8 กม. (ในกรุงเทพฯ และปริมณฑล แม่น้ำนอกแนวคันกั้นน้ำไม่ใช้ตัดสินจุดนี้)" : "ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 8 กม.",
          polder ? "No canal gauge reporting within 8 km (in Bangkok and its neighbours the river outside the walls doesn't judge a point)" : "No water-level gauge reporting within 8 km")
        : L(`ภาพรวมทางน้ำรอบจุดนี้: ${word(RIVER_WORDS[ai.category])} (จาก ${ai.basis.length} สถานี ใกล้สุด ${fmt(ai.nearestKm, 1)} กม. · ความมั่นใจ${conf})`,
          `Waterways around this point: ${word(RIVER_WORDS[ai.category])} (from ${ai.basis.length} gauge${ai.basis.length === 1 ? "" : "s"}, nearest ${fmt(ai.nearestKm, 1)} km · confidence ${conf})`));
      const g = (ai.basis && ai.basis[0]) || fresh[0];
      // the tile's gauge first, named as such (KI-008: the tile's number came from the third line, unnamed)
      for (const x of [g, ...fresh.filter((y) => y !== g)].slice(0, 3)) {
        const fb = x.freeboard == null ? L("ไม่มีระดับตลิ่ง", "no bank level")
          : x.freeboard >= 0 ? L(`ต่ำกว่าตลิ่ง ${fmt(x.freeboard * 100)} ซม.`, `${fmt(x.freeboard * 100)} cm below the bank`)
            : L(`สูงกว่าตลิ่ง ${fmt(-x.freeboard * 100)} ซม.`, `${fmt(-x.freeboard * 100)} cm over the bank`);
        const ww = waterWord(x, polder);
        const outside = polder && !["คลอง", "บึง"].includes(ww);
        const ctx = outside ? L(" (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้)", " (river outside the walls, not used for this point)") : "";
        // KI-008: a river that doesn't judge the point, with a metre or more below its bank, carries no status word
        // (C.12 read "ใกล้ล้นตลิ่ง" at 92 % of bed-to-bank with 1.31 m to spare: one line that alarmed and dismissed itself)
        const st = x.status >= 0 && !(outside && x.freeboard >= 1) ? ` · ${word(RIVER_WORDS[x.status])}` : "";
        const used = x === g && !outside ? L(" · ตัวเลขบนป้ายน้ำท่วม", " · the flood tile's number") : "";
        // (HII's "previous" reading has no stated interval, so no rise/fall is shown: FloodWatch has the trend)
        c.lines.push(`${x.name}${x.river ? ` (${x.river})` : ""} ${L("ห่าง", "")} ${fmt(x.km, 1)} ${L("กม.", "km")}: ${fb}${st}${ctx}${used}`);
      }
      c.value = g.freeboard == null ? "" : g.freeboard >= 0 ? L(`ต่ำกว่าตลิ่ง ${fmt(g.freeboard * 100)} ซม.`, `${fmt(g.freeboard * 100)} cm below bank`) : L(`ล้นตลิ่ง ${fmt(-g.freeboard * 100)} ซม.`, `${fmt(-g.freeboard * 100)} cm over bank`);
      if (g.status >= 1 && g.pct != null && g.level < g.bank) {
        c.lines.push(L(`"${word(RIVER_WORDS[g.status])}" ที่ ${g.name} เพราะน้ำสูง ${fmt(g.pct)}% ของความสูงจากท้องน้ำถึงตลิ่ง (เกณฑ์ FloodWatch: 70% เฝ้าระวัง 90% ใกล้ล้นตลิ่ง)`,
          `"${word(RIVER_WORDS[g.status])}" at ${g.name}: the water is at ${fmt(g.pct)}% of the height from the bed to the bank (FloodWatch's rule: 70% watch, 90% near the bank)`));
      }
      c.src.push({ name: L("สถานีวัดระดับน้ำ (คลังข้อมูลน้ำแห่งชาติ)", "Water-level gauges (ThaiWater)"), time: timeText(fresh[0].time, now, lang), ageH: fresh[0].ageH });
      c.note = L("ใช้เกณฑ์และวิธีเดียวกับ FloodWatch (เทียบตลิ่งของแต่ละสถานี) ไม่ได้บอกว่าบ้านคุณน้ำท่วมหรือไม่",
        "The same rule and method as FloodWatch (each gauge against its own bank); it doesn't say whether your house floods");
      c.word = word(RIVER_WORDS[c.level]);
    } else if (b.twLevel) {
      // no gauge is no data (FloodWatch: "ไม่มีสถานีวัดน้ำใกล้พอ ยังสรุประดับลำน้ำไม่ได้")
      c.lines.push(L("ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลใน 3 ชม. ในรัศมี 20 กม. ยังสรุประดับลำน้ำไม่ได้", "No water-level gauge reporting within 20 km in the last 3 h: the waterways can't be judged"));
    }
    if (ff) {
      const hit = place && ff.find((r) => r.code === place.code);
      if (hit) {
        c.level = Math.max(c.level, 2);
        c.word = L("เสี่ยงน้ำป่า (สสน.)", "Flash-flood risk (HII)");
        c.lines.unshift(L(`⚠️ สสน. ประเมินว่าตำบลนี้มีความเสี่ยงน้ำป่า (FFPI ${fmt(hit.ffpi, 2)}, ฝนคาดการณ์ ${fmt(hit.rainNextDay)} มม.)`,
          `⚠️ HII rates this subdistrict at risk of flash flooding (FFPI ${fmt(hit.ffpi, 2)}, ${fmt(hit.rainNextDay)} mm forecast)`));
        extraPre.push({ hazard: "flash", day: 1, level: 2, value: hit.ffpi });
      } else {
        // V41: say what the report says, without "คืนนี้" or a bare "0 ตำบล"
        c.lines.push(ff.length
          ? L(`น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงในรายงานล่าสุดของ สสน. (มี ${ff.length} ตำบลทั่วประเทศ)`, `Flash flood: not on HII's latest list (${ff.length} subdistricts nationwide)`)
          : L("น้ำป่า: รายงานล่าสุดของ สสน. ไม่มีตำบลเสี่ยงน้ำป่า", "Flash flood: HII's latest report lists no subdistrict at risk"));
      }
      c.src.push({ name: L("รายงานน้ำป่า สสน.", "HII flash-flood report") });
    }
    if (c.level >= 0 && !c.word) c.word = word(scale(c.level));
    if (c.level < 0) c.error = b.errors?.twLevel;
    cards.push(c);
  }

  // ---------- landslide ----------
  {
    const c = { id: "landslide", icon: "⛰️", title: L("ดินถล่ม", "Landslide"), short: L("ดินถล่ม", "Landslide"), level: -1, lines: [], src: [],
      link: { href: guide("landslide"), text: L("น้ำป่า ดินถล่ม ทำอย่างไร", "What to do about landslides") } };
    const n = arcCount(b.dmrSlide);
    if (n != null) {
      const rain = ens ? ens.next24.rain24 : null;
      const obs = rainNear[0]?.rain24 ?? null;
      if (n > 0) {
        // in a mapped risk area the level follows the rain: DMR's own trigger is more than 100 mm in 24 h (thresholds §6);
        // 35.1–100 mm (TMD's heavy rain) is "watch" (the app's choice)
        const p100 = ens ? ens.next24.over100 : 0;
        const heavy = rain ? rain.chance[2] : 0;
        c.level = (obs != null && obs > LANDSLIDE_RAIN_MM) || p100 >= 0.5 ? 2
          : (obs != null && obs >= 35.1) || p100 >= 0.2 || heavy >= 0.5 ? 1 : 0;
        if (p100 >= 0.1) c.lines.push(L(`โอกาสฝนเกิน 100 มม. ใน 24 ชม. (เกณฑ์เตือนของ ทธ.) ${chanceText(p100, lang)}`, `Chance of over 100 mm in 24 h (DMR's trigger): ${chanceText(p100, lang)}`));
        // the data is "risk villages within 3 km", not "your home is in a risk area" (visitor audit U14)
        c.word = c.level ? word(scale(c.level)) : L("ใกล้หมู่บ้านเสี่ยง ฝนยังไม่มาก", "Near risk villages, little rain");
        c.lines.push(L(`มีหมู่บ้านเสี่ยงดินถล่ม ${n} แห่งในรัศมี 3 กม. (กรมทรัพยากรธรณี)`, `${n} landslide-risk village${n === 1 ? "" : "s"} within 3 km (DMR)`));
        c.lines.push(L("ฝนตกหนักต่อเนื่อง สังเกตน้ำในลำห้วยขุ่นข้น ดินร้าว ต้นไม้เอียง", "In long heavy rain watch for muddy streams, cracks in the ground, leaning trees"));
      } else {
        c.level = 0;
        c.word = L("ไม่อยู่ใกล้พื้นที่เสี่ยงที่สำรวจ", "Not near a mapped risk area");
        c.lines.push(L("ไม่มีหมู่บ้านเสี่ยงดินถล่มที่ ทธ. สำรวจในรัศมี 3 กม.", "No DMR-mapped landslide-risk village within 3 km"));
      }
      c.src.push({ name: L("กรมทรัพยากรธรณี", "DMR") });
    } else c.error = b.errors?.dmrSlide;
    cards.push(c);
  }

  // ---------- earthquakes ----------
  const quakes = mergeQuakes([b.emsc ? parseEmsc(b.emsc) : [], b.usgs ? parseUsgs(b.usgs) : [], (b.tmdQuakes?.items || []).map((q) => ({ ...q, t: Date.parse(q.time), src: "TMD" }))]);
  {
    const c = { id: "quake", icon: "🌏", title: L("แผ่นดินไหว", "Earthquakes"), short: L("แผ่นดินไหว", "Earthquakes"), level: -1, lines: [], src: [],
      link: { href: guide("quake"), text: L("แผ่นดินไหว ทำอย่างไร", "What to do in an earthquake") } };
    if (b.emsc || b.usgs) {
      const site = place && BKK_METRO.includes(place.pv) ? BKK_MMI_TERM : 0;
      const list = quakesForPoint(quakes, lat, lon, now, ipe, { site });
      const recent = list.filter((q) => now - q.t <= 864e5);
      c.level = recent.length ? Math.max(0, ...recent.map((q) => q.band.level)) : 0;
      // U8: "none reported" above the card's own list of today's quakes contradicted it
      c.word = recent.length && c.level > 0 ? word(recent.sort((a, z) => z.band.level - a.band.level)[0].band)
        : recent.length ? L(`24 ชม. นี้ ${recent.length} ครั้ง ไกลหรือเล็ก`, `${recent.length} in 24 h, far or small`)
          : L("24 ชม. นี้ไม่มีรายงานใกล้ ๆ", "None reported nearby in 24 h");
      for (const q of list.slice(0, 3)) {
        const when = timeText(localOf(q.t), now, lang);
        // the lowest band's words rest on felt reports from M5.5 and larger only (research/data/e4_dyfi_residuals.csv:
        // even below a predicted 1.0, half the reporters felt them); a small quake gets the facts alone (U15)
        const felt = q.mmi != null && (q.band.level > 0 || q.mag >= FELT_WORDS_MIN_MAG) ? ` · ${word(q.band)}` : "";
        c.lines.push(L(`ขนาด ${fmt(q.mag, 1)} ${q.placeTh || q.place || ""} ห่าง ${fmt(q.km)} กม. ทาง${compass(q.dir, "th")} · ${when}${felt}`,
          `M${fmt(q.mag, 1)} ${q.place || ""}, ${fmt(q.km)} km ${compass(q.dir, "en")} · ${when}${felt}`));
      }
      if (!list.length) c.lines.push(L("7 วันนี้ไม่มีแผ่นดินไหวในรัศมี 300 กม. หรือที่ใหญ่พอจะรู้สึกได้ถึงที่นี่", "No quake within 300 km in 7 days, nor one big enough to reach here"));
      c.note = site
        ? L("แผ่นดินไหวพยากรณ์ล่วงหน้าไม่ได้ ความแรงที่จุดนี้ประมาณจากขนาดและระยะทาง และบวกเพิ่มสำหรับกรุงเทพฯ และปริมณฑล (ดินอ่อน คนในพื้นที่เคยรายงานว่าแรงกว่าค่าประมาณ) ตึกสูงอาจรู้สึกแรงกว่านี้",
          "Earthquakes can't be forecast. Shaking here is estimated from size and distance, raised for greater Bangkok (soft clay: people there have reported more than the estimate); tall buildings can feel more")
        : L("แผ่นดินไหวพยากรณ์ล่วงหน้าไม่ได้ ความแรงที่จุดนี้เป็นค่าประมาณจากขนาดและระยะทาง ดินอ่อนและตึกสูงอาจรู้สึกแรงกว่านี้",
          "Earthquakes can't be forecast. Shaking here is estimated from size and distance; soft ground and tall buildings can feel more");
      c.src.push({ name: [b.emsc && "EMSC", b.usgs && "USGS", b.tmdQuakes && L("กรมอุตุฯ", "TMD")].filter(Boolean).join(" · ") });
      const ts = place ? tsunamiWatch(quakes, place.pv, now) : null;
      if (ts) {
        // "watch" only: a tsunami warning is the agencies' (TMD/DDPM towers, Cell Broadcast); the app never says all clear
        c.level = Math.max(c.level, 1);
        c.lines.unshift(L(`แผ่นดินไหวขนาด ${fmt(ts.mag, 1)} ในทะเลอันดามันหรือมหาสมุทรอินเดีย ติดตามประกาศสึนามิของกรมอุตุฯ และ ปภ. ถ้าอยู่ชายฝั่งแล้วรู้สึกสั่นแรง ให้ออกจากชายฝั่งทันทีโดยไม่ต้องรอประกาศ`,
          `M${fmt(ts.mag, 1)} quake in the Andaman Sea / Indian Ocean: follow TMD's and DDPM's tsunami notices. If you felt strong shaking at the coast, leave the coast now without waiting`));
      }
    } else c.error = b.errors?.emsc || b.errors?.usgs;
    cards.push(c);
  }

  // ---------- fire hotspots ----------
  {
    const c = { id: "fire", icon: "🔥", title: L("ไฟป่า จุดความร้อน", "Fires and hotspots"), short: L("ไฟป่า", "Fires"), level: -1, lines: [], src: [],
      link: { href: guide("pm25"), text: L("ควันไฟ ฝุ่น ทำอย่างไร", "What to do about smoke") } };
    if (b.hotspots && b.hotspots.items) {
      const h = hotspotsNear(b.hotspots, lat, lon, 25, now);
      const lastPass = (b.hotspots.items || []).reduce((m, x) => (x.t && x.t > m ? x.t : m), "");
      // the app's own rule (no Thai agency grades hotspots): one within 10 km → watch, within 2 km → get ready
      c.level = !h.nearest ? 0 : h.nearest.km <= 2 ? 2 : h.nearest.km <= 10 ? 1 : 0;
      c.word = h.count ? L(`${h.count} จุด`, `${h.count} hotspot${h.count === 1 ? "" : "s"}`) : L("ไม่พบ", "None");
      c.value = L(`${h.count} จุด`, `${h.count}`);
      c.lines.push(L(`จุดความร้อนจากดาวเทียมในรัศมี 25 กม. ใน 24 ชม.${h.nearest ? ` ใกล้สุดห่าง ${fmt(h.nearest.km, 1)} กม.` : ""}`,
        `Satellite hotspots within 25 km in 24 h${h.nearest ? `; nearest ${fmt(h.nearest.km, 1)} km` : ""}`));
      // the time of the latest satellite pass in the file, not the collector's fetch (visitor audit V24)
      c.src.push({ name: L("NASA FIRMS (VIIRS) ภาพดาวเทียมล่าสุด", "NASA FIRMS (VIIRS), latest pass"), time: lastPass ? timeText(localOf(Date.parse(lastPass)), now, lang) : "" });
    } else {
      c.lines.push(L("ยังไม่มีข้อมูลจุดความร้อน (ต้องเปิดตัวเก็บข้อมูลของเว็บนี้)", "No hotspot data yet (this site's collector isn't running)"));
    }
    cards.push(c);
  }

  // ---------- official warnings and the verdict ----------
  const warnings = b.warnings ? warningsFor(b.warnings, place?.pv, now) : [];
  // An official warning lifts its hazard's tile (GUIDELINES rule 2; cross-check M5): never milder than TMD
  for (const w of warnings) {
    const c = cards.find((x) => x.id === capHazard(w));
    if (!c) continue;
    const until = w.expires ? timeText(localOf(Date.parse(w.expires)), now, lang) : "";
    // The model's milder value beside TMD's word read as a contradiction ("Rain: TMD warning · Heavy rain: low chance",
    // Phuket, 24 Oct 04:50): the tile and the verdict show the notice's end; the model's numbers stay in the card,
    // under a line that says which one to follow (KI-028).
    const milder = c.level >= 0 && c.level < w.level;
    if (w.level >= c.level) {
      c.level = w.level;
      c.word = L("กรมอุตุฯ เตือนภัย", "TMD warning");
      c.value = until ? L(`ถึง ${until}`, `until ${until}`) : "";
    }
    if (milder) c.lines.unshift(L("ตัวเลขจากแบบจำลองด้านล่างเบากว่าประกาศ ให้ยึดประกาศของกรมอุตุฯ",
      "The model's numbers below are milder than the notice: follow TMD's notice"));
    c.lines.unshift(L(`ประกาศกรมอุตุฯ: ${w.headline || w.event}${until ? ` (ถึง ${until})` : ""}`,
      `TMD notice: ${(w.en?.checked && w.en.headline) || w.event || w.headline}${until ? ` (until ${until})` : ""}`));
    c.official = true;
  }
  for (const c of cards) if (c.level >= 0 && !c.word) c.word = word(scale(c.level));
  const graded = cards.filter((c) => c.level >= 0);
  // The verdict is never milder than any tile (GUIDELINES rule 7): its level is the highest one, its headline the worst
  // hazard in the agency's own word, with that hazard's one sourced action.
  const order = ORDER.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  const top = Math.max(-1, ...graded.map((c) => c.level), ...warnings.map((w) => w.level));
  const worst = graded.filter((c) => c.level === top && top > 0)
    .sort((x, y) => (y.official ? 1 : 0) - (x.official ? 1 : 0) || ORDER.indexOf(x.id) - ORDER.indexOf(y.id))[0] || null;
  // the heat band's "เตือนภัย"/"Warning" beside a TMD notice read as an official heat warning (U9): in the verdict it
  // is named as a level ("ระดับเตือนภัย"); the words stay บ้านรอดไหม's (KI-F13)
  const item = (c) => ({ id: c.id, icon: c.icon, short: c.short, level: c.level, value: c.value,
    word: c.id === "heat" && c.level >= 0 && c.word ? L(`ระดับ${c.word}`, `${c.word} level`) : c.word });
  // Missing tiles are never counted as calm (the UX scout §5a): fewer than half answered → no verdict at all
  const enough = graded.length * 2 >= cards.length;
  const verdict = {
    level: !enough ? -1 : top,
    complete: graded.length === cards.length,
    name: !enough ? L("ยังไม่มีข้อมูลพอ", "Not enough data yet") : word(scale(top)),
    worst: worst ? item(worst) : null,
    warning: warnings[0] || null,
    action: worst?.action || null,
    others: order.filter((c) => c.level >= 1 && c !== worst).sort((x, y) => y.level - x.level).map(item),
    missing: [...order.filter((c) => c.level < 0).map((c) => c.short), ...(b.warnings ? [] : [L("ประกาศเตือนภัย", "official warnings")])],
  };
  // a pre-warning keeps the agency's band in its words ("ร้อนระดับอันตราย") but takes a forecast's colour (`tone`)
  const pre = prewarnings(ens, extraPre).map((x) => ({ ...x, tone: Math.min(MODEL_MAX, x.level) }));
  // every cell is a forecast graded as its tile and card grade it (fcLevel); heat is floored like the card (KI-F16)
  const outlook = ens ? ens.days.map((d, i) => ({
    name: dayName(i, d.date, lang, now), date: d.date,
    heat: d.heat ? { level: fcLevel("heat", d.heat), text: `${heatNum(d.heat.p50)}°` } : null,
    rain: { level: fcLevel("rain24", d.rain24), text: chanceWord(d.rain24.chance[2], lang), sub: L("ฝนหนัก", "heavy") },
    gust: { level: fcLevel("gust", d.gust), text: fmt(d.gust.p50) },
    pm25: air.outlook[i] ? { level: Math.min(MODEL_MAX, air.outlook[i].band.level), text: i === 0 ? fmt(air.outlook[i].mean) : word(air.outlook[i].band) } : null,
    uv: air.uv[i] ? uvDay(air.uv[i], i) : null,
  })) : [];
  // A TMD warning in force on a day takes that day's cell: the table said "ต่ำ ฝนหนัก" under a Severe heavy-rain
  // warning in all 11 warned provinces on 24 Oct 2026 (the ensemble gave < 10 %; research/logs/crosscheck-live-2026-10-23.log)
  const COL = { rain: "rain", wind: "gust", heat: "heat" };
  for (const w of warnings) {
    const col = COL[capHazard(w)];
    if (!col) continue;
    outlook.forEach((row, i) => {
      const start = i === 0 ? now : Date.parse(`${row.date}T00:00:00+07:00`);
      if (w.expires && start >= Date.parse(w.expires)) return;
      row[col] = { level: Math.max(row[col]?.level ?? -1, w.level), text: L("📢 เตือนภัย", "📢 TMD warning"), official: true };
    });
    // the card's day chips too: they said "วันนี้ ต่ำ" in blue under a Severe warning (visitor audit U4)
    const cardId = { rain: "rain", gust: "wind", heat: "heat" }[col];
    for (const d of order.find((x) => x.id === cardId)?.days || []) {
      const start = d.date === localOf(now).slice(0, 10) ? now : Date.parse(`${d.date}T00:00:00+07:00`);
      if (!d.date || (w.expires && start >= Date.parse(w.expires))) continue;
      Object.assign(d, { level: Math.max(d.level, w.level), text: L("📢 เตือนภัย", "📢 TMD warning"), sub: "" });
    }
  }

  // ---------- the place itself (long-term) ----------
  const profile = [];
  if (b.elev && Array.isArray(b.elev.elevation)) {
    profile.push({ icon: "📐", text: L(`ความสูงของพื้นที่ราว ${fmt(b.elev.elevation[0])} ม. จากระดับทะเล (ใช้ประกอบเท่านั้น ไม่ได้บอกว่าน้ำท่วมหรือไม่)`,
      `About ${fmt(b.elev.elevation[0])} m above sea level (context only; it doesn't say whether it floods)`) });
  }
  const faultRows = b.dmrFault?.features || null;
  if (faultRows) {
    profile.push(faultRows.length
      ? { icon: "〰️", text: L(`ตำบลนี้อยู่ในรัศมี 20 กม. จากรอยเลื่อนมีพลัง ${faultRows[0].attributes?.F_ZONE_T || ""} (กรมทรัพยากรธรณี)`,
        `Within 20 km of an active fault: ${faultRows[0].attributes?.F_ZONE_E || faultRows[0].attributes?.F_ZONE_T || ""} (DMR)`) }
      : { icon: "〰️", text: L("ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง (รัศมี 20 กม.) ของกรมทรัพยากรธรณี", "Not on DMR's list of subdistricts within 20 km of an active fault") });
  }
  const slideN = arcCount(b.dmrSlide);
  if (slideN) profile.push({ icon: "⛰️", text: L(`หมู่บ้านเสี่ยงดินถล่ม ${slideN} แห่งในรัศมี 3 กม.`, `${slideN} landslide-risk village${slideN === 1 ? "" : "s"} within 3 km`) });
  if (place && [85, 82, 83, 81, 92, 91].includes(place.pv)) {
    profile.push({ icon: "🌊", text: L("จังหวัดชายฝั่งอันดามัน: รู้เส้นทางอพยพสึนามิและจุดรวมพลใกล้บ้าน", "Andaman coast province: know your tsunami evacuation route") });
  }

  return { cards: order, verdict, warnings, pre, outlook, profile, station, quakes: quakes.length, members: ens?.members ?? 0 };
}

/** Fixed order of the tiles and cards (people learn where their tile is; the UX scout §5b): the six the scout put
 *  first, then the rest. */
export const ORDER = ["rain", "flood", "pm25", "heat", "quake", "fire", "wind", "uv", "landslide", "air"];

/** The rain (24 h) above which the DMR's landslide watch applies; see levels.js and KNOWLEDGE §3 (provisional). */
export const LANDSLIDE_RAIN_MM = 100;

/** Storm lines only for storms that come within this distance (the cross-check: 7,000 km away is noise). */
export const STORM_SHOW_KM = 1500;

/** The highest level a model forecast reaches on its own: "เตรียมตัว". "ทำทันที" needs a measurement or an agency's
 *  warning (GUIDELINES rule 2b; the visitor audit V1: a heat-index forecast put "act now" on most October nights). */
export const MODEL_MAX = 2;

/** The heat number shown: floored (it never reads past its band, KI-F16) after the same rounding the band uses
 *  (`levels.band` rounds to 0.1), so 41.978 shows 42 under "อันตราย", not 41 (output cross-check X3). */
export const heatNum = (v) => Math.floor(roundTo(v, HAZARDS.heat.step));

/** A forecast window's level, graded as its tile grades it (the middle member's band, lifted by the chance rule) and
 *  capped like every forecast. The tile, the card's days, the 3-day table and the pre-warnings' colour all use it: in
 *  0.3.0 the table and the pre-warnings showed a heat forecast red while its tile and the verdict were orange (U-series). */
export const fcLevel = (hazard, s) => (s && s.n ? Math.min(MODEL_MAX, Math.max(band(hazard, s.p50).level, windowLevel(s).level)) : -1);

/** Plain gust words for the tile (the visitor audit V16: TMD's Beaufort words such as "พายุเกลอ่อน" read as a storm). */
const GUST_WORDS = [null,
  { th: "ลมกระโชกแรง", en: "Strong gusts" },
  { th: "ลมกระโชกแรงมาก", en: "Very strong gusts" },
  { th: "ลมกระโชกรุนแรง", en: "Violent gusts" }];

/** Bangkok-metro provinces, where the IPE under-predicts felt shaking (soft clay): Bangkok, Samut Prakan, Nonthaburi,
 *  Pathum Thani. The validation's term (MODELS.md §6; research/out/calibration.json → earthquake_felt). */
export const BKK_METRO = [10, 11, 12, 13];
export const BKK_MMI_TERM = 1.06;
/** The lowest felt band's words are said only from this magnitude: the felt reports behind them are all M5.5+ (U15). */
export const FELT_WORDS_MIN_MAG = 5.5;

export { HAZARDS, ageText };

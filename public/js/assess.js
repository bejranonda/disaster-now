// From every source's response to what the page says: one card per hazard (level, value, lines, 3-day chips,
// sources with their times), the overall verdict, the pre-warnings and the place's long-term profile.
// Pure: same inputs → same words, so tests can check the page against the sources (test/assess.test.mjs).

import { band, scale, HAZARDS, RIVER_WORDS } from "./levels.js";
import { buildOutlook, prewarnings, windowLevel, chanceText } from "./outlook.js";
import { parseGistda, parseAir4Thai, nearestStation, buildAir } from "./airq.js";
import { nearRain, nearGauges, parseFlashFlood, parseFloodWatchPoint, FW_LEVEL, areaIndex, waterWord, POLDER_PROVINCES } from "./water.js";
import { parseEmsc, parseUsgs, mergeQuakes, quakesForPoint, tsunamiWatch } from "./quake.js";
import { warningsFor, gdacsNear, cycloneLevel, hotspotsNear, hotspotLevel, arcCount, jmaStorm, stormLevel, tmdStormsNear } from "./events.js";
import { actionFor } from "./actions.js";
import { compass } from "./geo.js";

export const GUIDE = "https://baanrodmai.autobahn.bot"; // the sister app's "what to do" pages (Hazard-huntz)
export const FLOODWATCH = "https://flood.autobahn.bot";

const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? "–"
  : Math.abs(v) >= 1000 ? Number(v).toLocaleString("en-US", { maximumFractionDigits: d }) : Number(v).toFixed(d));
const DAY_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "วันนี้" / "พรุ่งนี้" / "มะรืนนี้ (จ. 26)" for the outlook's day index. */
export function dayName(i, date, lang) {
  const d = new Date(`${date}T12:00:00+07:00`);
  const wd = (lang === "en" ? DAY_EN : DAY_TH)[d.getUTCDay()];
  if (lang === "en") return ["Today", "Tomorrow", `${wd} ${d.getUTCDate()}`][i] || `${wd} ${d.getUTCDate()}`;
  return ["วันนี้", "พรุ่งนี้", `${wd} ${d.getUTCDate()}`][i] || `${wd} ${d.getUTCDate()}`;
}

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
  const cards = [];
  const extraPre = [];

  const ens = b.ens ? buildOutlook(b.ens, now) : null;
  const gistda = b.gistda ? parseGistda(b.gistda) : null;
  const stations = b.a4t ? parseAir4Thai(b.a4t) : [];
  const station = stations.length ? nearestStation(stations, lat, lon, now) : null;
  const air = buildAir(b.aq, gistda, now, station);

  // ---------- heat ----------
  {
    const c = { id: "heat", icon: "🌡️", title: L("ความร้อน (ดัชนีความร้อน)", "Heat (heat index)"), short: L("ความร้อน", "Heat"), level: -1,
      link: { href: `${GUIDE}/hot`, text: L("ร้อนแบบนี้ ทำอย่างไร", "What to do in this heat") }, src: [] };
    if (ens) {
      const w = ens.next24.heat;
      const lv = windowLevel(w);
      const bd = band("heat", w.p50);
      c.level = Math.max(bd.level, lv.level);
      c.word = word(band("heat", w.p50));
      c.value = `${fmt(w.p50)} °C`;
      c.action = actionFor("heat", w.p50, lang);
      c.lines = [
        L(`สูงสุดใน 24 ชม. ข้างหน้า ราว ${fmt(w.p10)}–${fmt(w.p90)} °C (ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก)`,
          `Peak in the next 24 h about ${fmt(w.p10)}–${fmt(w.p90)} °C (heat index: how hot it feels)`),
        L(`อุณหภูมิอากาศสูงสุดราว ${fmt(ens.next24.tmax.p50)} °C · ตอนนี้รู้สึกราว ${fmt(ens.now.heat)} °C`,
          `Air temperature peak about ${fmt(ens.next24.tmax.p50)} °C · feels like ${fmt(ens.now.heat)} °C now`),
      ];
      if (w.chance[3] >= 0.1) c.lines.push(L(`โอกาสถึงระดับอันตราย (≥ 42 °C) ${chanceText(w.chance[3], lang)}`, `Chance of danger level (≥ 42 °C): ${chanceText(w.chance[3], lang)}`));
      c.days = ens.days.map((d, i) => ({ name: dayName(i, d.date, lang), level: band("heat", d.heat.p50).level, text: `${fmt(d.heat.p50)}°` }));
      c.src.push({ name: L("แบบจำลอง ECMWF 51 ชุด", "ECMWF ensemble, 51 runs"), time: timeText(ens.issued, now, lang), model: true });
    } else c.error = b.errors?.ens;
    cards.push(c);
  }

  // ---------- PM2.5 ----------
  {
    const c = { id: "pm25", icon: "😷", title: L("ฝุ่น PM2.5", "Dust (PM2.5)"), short: L("ฝุ่น PM2.5", "PM2.5"), level: -1,
      link: { href: `${GUIDE}/air`, text: L("ฝุ่นวันนี้ ต้องทำอะไร", "What to do about today's dust") }, src: [] };
    if (air.pm25) {
      const p = air.pm25;
      c.level = p.band.level;
      c.word = word(p.band);
      c.value = `${fmt(p.mean24, 1)} µg/m³`;
      c.action = actionFor("pm25", p.mean24, lang);
      c.lines = [];
      if (p.kind === "station") {
        c.lines.push(L(`ค่าเฉลี่ย 24 ชม. ที่สถานีวัด ${station.name.th} (ห่าง ${fmt(station.km, 1)} กม.)`,
          `24-h mean at the ${station.name.en || station.name.th} station (${fmt(station.km, 1)} km away)`));
        c.src.push({ name: L("สถานีตรวจวัด คพ. (Air4Thai)", "PCD station (Air4Thai)"), time: timeText(p.time, now, lang), ageH: station.ageH });
        // GISTDA's estimate is not shown beside a measurement: on 24 Oct 2026 it read 1.3× the stations (KNOWLEDGE §5)
      } else {
        c.lines.push(L("ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. ใช้ค่าประมาณ 24 ชม. จากดาวเทียมของ GISTDA",
          "No PCD station within 15 km: GISTDA's 24-h satellite estimate"));
        c.note = L("ค่าประมาณมักต่างจากสถานีวัด (24 ต.ค. 2569 สูงกว่าสถานีราว 1.3 เท่า)", "Estimates can differ from stations (on 24 Oct 2026 about 1.3× higher)");
        c.src.push({ name: "GISTDA", time: timeText(p.time, now, lang), model: true });
      }
      if (air.outlook.length) {
        c.days = air.outlook.map((d, i) => ({ name: dayName(i, d.date, lang), level: d.band.level, text: fmt(d.mean) }));
        c.src.push({ name: L(`แบบจำลอง CAMS${air.ratio ? " ปรับตามค่าวัด" : ""}`, `CAMS model${air.ratio ? ", adjusted to the measurement" : ""}`), model: true });
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
      link: { href: `${GUIDE}/mask`, text: L("ใส่หน้ากากไหม แบบไหน", "Which mask, and when") } };
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
      others.map(([k, v]) => `${lang === "en" ? NAME_EN[k] : NAME[k]} ${fmt(v)}`).join(" · ")];
      c.src.push({ name: L("สถานีตรวจวัด คพ. (Air4Thai)", "PCD station (Air4Thai)"), time: timeText(station.time, now, lang) });
    } else if (air.pollutants) {
      const p = air.pollutants;
      c.word = L("ค่าจากแบบจำลอง ไม่มีระดับทางการ", "Model values, no official level");
      c.value = `O₃ ${fmt(p.o3)}`;
      c.lines = [L("ไม่มีสถานีวัดใกล้ ๆ: ค่าจากแบบจำลอง CAMS (µg/m³)", "No station nearby: CAMS model values (µg/m³)"),
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
      const peak = hour >= 16 && air.uv[1] ? { ...air.uv[1], when: L("พรุ่งนี้", "tomorrow") } : { ...air.uv[0], when: L("วันนี้", "today") };
      c.level = u.band.level;
      c.word = day ? word(u.band) : L("กลางคืน", "Night");
      c.value = day ? `UV ${fmt(cur)}` : L(`พรุ่งนี้สูงสุด ${fmt(air.uv[1]?.max)}`, `Tomorrow up to ${fmt(air.uv[1]?.max)}`);
      c.lines = [L(`สูงสุด${peak.when}ราว ${fmt(peak.max)} (${word(peak.band)}) ช่วงเที่ยง เมฆมากจะต่ำกว่านี้`,
        `${peak.when === "today" ? "Today's" : "Tomorrow's"} peak about ${fmt(peak.max)} (${word(peak.band)}) around noon; lower under cloud`)];
      if (peak.max >= 6) c.lines.push(L("ช่วงสาย–บ่ายเลี่ยงแดดจัด สวมหมวก ทาครีมกันแดด (คำแนะนำ WHO)", "Late morning to afternoon: seek shade, wear a hat, use sunscreen (WHO)"));
      c.days = air.uv.map((d, i) => ({ name: dayName(i, d.date, lang), level: d.band.level, text: fmt(d.max) }));
      c.src.push({ name: "CAMS", model: true });
    } else c.error = b.errors?.aq;
    cards.push(c);
  }

  // ---------- rain ----------
  const rainNear = b.twRain ? nearRain(b.twRain, lat, lon, now) : [];
  {
    const c = { id: "rain", icon: "🌧️", title: L("ฝน", "Rain"), short: L("ฝน", "Rain"), level: -1, lines: [], src: [],
      link: { href: `${GUIDE}/storm`, text: L("พายุ ฝนหนัก ทำอย่างไร", "What to do in a storm") } };
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
      c.level = Math.max(lvObs, lv.level);
      c.value = L(`${fmt(w.p50, 0)} มม.`, `${fmt(w.p50, 0)} mm`);
      c.word = word(band("rain24", w.p50));
      c.lines.unshift(L(`24 ชม. ข้างหน้า: น่าจะ ${fmt(w.p50)} มม. (ช่วง ${fmt(w.p10)}–${fmt(w.p90)} มม.) · โอกาสฝนหนัก (> 35 มม.) ${chanceText(w.chance[2], lang)}`,
        `Next 24 h: likely ${fmt(w.p50)} mm (range ${fmt(w.p10)}–${fmt(w.p90)} mm) · chance of heavy rain (> 35 mm): ${chanceText(w.chance[2], lang)}`));
      c.days = ens.days.map((d, i) => ({ name: dayName(i, d.date, lang), level: windowLevel(d.rain24).level,
        text: `${fmt(d.rain24.p50)}`, sub: d.rain24.chance[2] >= 0.1 ? chanceText(d.rain24.chance[2], lang) : "" }));
      c.src.push({ name: L("แบบจำลอง ECMWF 51 ชุด", "ECMWF ensemble, 51 runs"), model: true });
    } else {
      c.level = lvObs;
      c.error = b.errors?.ens;
    }
    if (lvObs >= 2) c.lines.push(L("ฝนหนักเมื่อ 24 ชม. ที่ผ่านมา ระวังน้ำท่วมขังและน้ำป่า", "Heavy rain in the last 24 h: watch for flooding"));
    cards.push(c);
  }

  // ---------- wind and storms ----------
  {
    const c = { id: "wind", icon: "💨", title: L("ลมแรงและพายุ", "Wind and storms"), short: L("ลม พายุ", "Wind, storms"), level: -1, lines: [], src: [],
      link: { href: `${GUIDE}/storm`, text: L("พายุ ลมแรง ทำอย่างไร", "What to do in strong wind") } };
    if (ens) {
      const w = ens.next24.gust;
      const lv = windowLevel(w);
      c.level = Math.max(band("gust", w.p50).level, lv.level);
      c.word = word(band("gust", w.p50));
      c.value = L(`${fmt(w.p50)} กม./ชม.`, `${fmt(w.p50)} km/h`);
      c.lines.push(L(`ลมกระโชกแรงสุดใน 24 ชม. ราว ${fmt(w.p10)}–${fmt(w.p90)} กม./ชม.`, `Strongest gust in 24 h about ${fmt(w.p10)}–${fmt(w.p90)} km/h`));
      c.days = ens.days.map((d, i) => ({ name: dayName(i, d.date, lang), level: windowLevel(d.gust).level, text: fmt(d.gust.p50) }));
      c.src.push({ name: L("แบบจำลอง ECMWF 51 ชุด", "ECMWF ensemble, 51 runs"), model: true });
    } else c.error = b.errors?.ens;
    // tropical cyclones: JMA's forecast circles (western Pacific, South China Sea), GDACS for the rest
    const tmdNames = new Set(((b.storms && b.storms.items) || []).map((x) => String(x.nameEN || "").toLowerCase()));
    const storms = (b.jma || []).map((f) => jmaStorm(f, lat, lon)).filter(Boolean)
      .filter((x) => !tmdNames.has(x.name.toLowerCase())) // TMD's own track wins for a storm both carry
      .sort((a, z) => a.closest.edge - z.closest.edge);
    if (storms.length) {
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
    if (tmdS.length) {
      const st = tmdS[0];
      const lv = st.closest.km <= 300 ? 2 : st.closest.km <= 800 ? 1 : 0;
      c.level = Math.max(c.level, lv);
      c.lines.unshift(L(`กรมอุตุฯ: ${st.type} "${st.name}" ห่างราว ${fmt(Math.round(st.km / 10) * 10)} กม. เส้นทางคาดการณ์เข้าใกล้สุดราว ${fmt(Math.round(st.closest.km / 10) * 10)} กม.`,
        `TMD: ${st.typeEN} "${st.nameEN}" about ${fmt(Math.round(st.km / 10) * 10)} km away; its forecast track comes within about ${fmt(Math.round(st.closest.km / 10) * 10)} km`));
      c.src.push({ name: L("กรมอุตุนิยมวิทยา (เส้นทางพายุ)", "TMD storm track") });
    }
    if (b.gdacs) {
      const tcs = gdacsNear(b.gdacs, lat, lon).filter((e) => e.type === "TC").sort((a, z) => a.km - z.km);
      if (tcs.length) {
        const t = tcs[0];
        c.level = Math.max(c.level, cycloneLevel(t));
        c.lines.push(L(`พายุหมุนเขตร้อน ${t.name} ห่างราว ${fmt(t.km)} กม. (GDACS ระดับ ${t.alert})`, `Tropical cyclone ${t.name} about ${fmt(t.km)} km away (GDACS ${t.alert})`));
      } else if (!storms.some((x) => x.closest.edge <= 1000)) c.lines.push(L("ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม.", "No tropical cyclone within 1,000 km"));
      c.src.push({ name: "GDACS" });
    }
    cards.push(c);
  }

  // ---------- river and flood ----------
  const gauges = b.twLevel ? nearGauges(b.twLevel, lat, lon, now) : [];
  const ff = b.hiiFf != null ? parseFlashFlood(b.hiiFf) : null;
  const fw = b.floodwatch ? parseFloodWatchPoint(b.floodwatch) : null;
  {
    const c = { id: "flood", icon: "🌊", title: L("น้ำท่วม ระดับน้ำ", "Flood and river level"), short: L("น้ำท่วม", "Flood"), level: -1, lines: [], src: [],
      link: { href: `${GUIDE}/flood`, text: L("ก่อนน้ำมา ทำอย่างไร", "Before the water comes") },
      more: { href: `${FLOODWATCH}/#p=${lat.toFixed(4)},${lon.toFixed(4)}`, text: L("ดูระดับน้ำละเอียดที่ FloodWatch", "River detail on FloodWatch") } };
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
      c.level = ai.category ?? 0;
      const conf = { medium: L("ปานกลาง", "medium"), low: L("ต่ำ", "low"), very_low: L("ต่ำมาก", "very low"), none: L("ไม่มี", "none") }[ai.confidence];
      c.lines.push(ai.category == null
        ? L(polder ? "ไม่มีสถานีวัดน้ำในคลองที่ส่งข้อมูลในรัศมี 8 กม. (ในกรุงเทพฯ และปริมณฑล แม่น้ำนอกแนวคันกั้นน้ำไม่ใช้ตัดสินจุดนี้)" : "ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 8 กม.",
          polder ? "No canal gauge reporting within 8 km (in Bangkok and its neighbours the river outside the walls doesn't judge a point)" : "No water-level gauge reporting within 8 km")
        : L(`ภาพรวมทางน้ำรอบจุดนี้: ${word(RIVER_WORDS[ai.category])} (จาก ${ai.basis.length} สถานี ใกล้สุด ${fmt(ai.nearestKm, 1)} กม. · ความมั่นใจ${conf})`,
          `Waterways around this point: ${word(RIVER_WORDS[ai.category])} (from ${ai.basis.length} gauge(s), nearest ${fmt(ai.nearestKm, 1)} km · confidence ${conf})`));
      for (const x of fresh.slice(0, 3)) {
        const fb = x.freeboard == null ? L("ไม่มีระดับตลิ่ง", "no bank level")
          : x.freeboard >= 0 ? L(`ต่ำกว่าตลิ่ง ${fmt(x.freeboard * 100)} ซม.`, `${fmt(x.freeboard * 100)} cm below the bank`)
            : L(`สูงกว่าตลิ่ง ${fmt(-x.freeboard * 100)} ซม.`, `${fmt(-x.freeboard * 100)} cm over the bank`);
        const ww = waterWord(x, polder);
        const ctx = polder && !["คลอง", "บึง"].includes(ww) ? L(" (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้)", " (river outside the walls, not used for this point)") : "";
        const st = x.status >= 0 ? ` · ${word(RIVER_WORDS[x.status])}` : "";
        // (HII's "previous" reading has no stated interval, so no rise/fall is shown: FloodWatch has the trend)
        c.lines.push(`${x.name}${x.river ? ` (${x.river})` : ""} ${L("ห่าง", "")} ${fmt(x.km, 1)} ${L("กม.", "km")}: ${fb}${st}${ctx}`);
      }
      const g = (ai.basis && ai.basis[0]) || fresh[0];
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
      c.level = 0;
      c.word = L("ไม่มีสถานีวัดใกล้", "No gauge nearby");
      c.lines.push(L("ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 20 กม.", "No water-level gauge reporting within 20 km"));
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
        c.lines.push(L(`น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (${ff.length} ตำบลทั่วประเทศ)`, `Flash flood: not on HII's list tonight (${ff.length} subdistricts nationwide)`));
        if (c.level < 0) c.level = 0;
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
      link: { href: `${GUIDE}/landslide`, text: L("น้ำป่า ดินถล่ม ทำอย่างไร", "What to do about landslides") } };
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
        c.word = c.level ? word(scale(c.level)) : L("พื้นที่เสี่ยง ฝนยังไม่มาก", "Risk area, little rain");
        c.lines.push(L(`มีหมู่บ้านเสี่ยงดินถล่ม ${n} แห่งในรัศมี 3 กม. (กรมทรัพยากรธรณี)`, `${n} landslide-risk village(s) within 3 km (DMR)`));
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
      link: { href: `${GUIDE}/quake`, text: L("แผ่นดินไหว ทำอย่างไร", "What to do in an earthquake") } };
    if (b.emsc || b.usgs) {
      const list = quakesForPoint(quakes, lat, lon, now, ipe);
      const recent = list.filter((q) => now - q.t <= 864e5);
      c.level = recent.length ? Math.max(0, ...recent.map((q) => q.band.level)) : 0;
      c.word = recent.length && c.level > 0 ? word(recent.sort((a, z) => z.band.level - a.band.level)[0].band) : L("ไม่มีที่น่ารู้สึกได้ใน 24 ชม.", "None likely felt in 24 h");
      for (const q of list.slice(0, 3)) {
        const when = timeText(localOf(q.t), now, lang);
        const felt = q.mmi != null ? ` · ${word(q.band)}` : "";
        c.lines.push(L(`ขนาด ${fmt(q.mag, 1)} ${q.placeTh || q.place || ""} ห่าง ${fmt(q.km)} กม. ทาง${compass(q.dir, "th")} · ${when}${felt}`,
          `M${fmt(q.mag, 1)} ${q.place || ""}, ${fmt(q.km)} km ${compass(q.dir, "en")} · ${when}${felt}`));
      }
      if (!list.length) c.lines.push(L("ไม่มีแผ่นดินไหวในรัศมี 300 กม. ใน 7 วัน ที่น่าจะรู้สึกได้", "No quake within 300 km in 7 days that was likely felt"));
      c.note = L("แผ่นดินไหวพยากรณ์ล่วงหน้าไม่ได้ ความแรงที่จุดนี้เป็นค่าประมาณจากขนาดและระยะทาง ดินอ่อน (เช่น กรุงเทพฯ) และตึกสูงอาจสั่นแรงกว่านี้",
        "Earthquakes can't be forecast. Shaking here is estimated from size and distance; soft ground (e.g. Bangkok) and tall buildings can shake more");
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
      link: { href: `${GUIDE}/pm25`, text: L("ควันไฟ ฝุ่น ทำอย่างไร", "What to do about smoke") } };
    if (b.hotspots && b.hotspots.items) {
      const h = hotspotsNear(b.hotspots, lat, lon, 25);
      // the app's own rule (no Thai agency grades hotspots): one within 10 km → watch, within 2 km → get ready
      c.level = !h.nearest ? 0 : h.nearest.km <= 2 ? 2 : h.nearest.km <= 10 ? 1 : 0;
      c.word = h.count ? L(`${h.count} จุด`, `${h.count} hotspot(s)`) : L("ไม่พบ", "None");
      c.value = L(`${h.count} จุด`, `${h.count}`);
      c.lines.push(L(`จุดความร้อนจากดาวเทียมในรัศมี 25 กม. ใน 24 ชม.${h.nearest ? ` ใกล้สุดห่าง ${fmt(h.nearest.km, 1)} กม.` : ""}`,
        `Satellite hotspots within 25 km in 24 h${h.nearest ? `; nearest ${fmt(h.nearest.km, 1)} km` : ""}`));
      c.src.push({ name: "NASA FIRMS (VIIRS)", time: b.hotspots.fetched ? timeText(localOf(Date.parse(b.hotspots.fetched)), now, lang) : "" });
    } else {
      c.lines.push(L("ยังไม่มีข้อมูลจุดความร้อน (ต้องเปิดตัวเก็บข้อมูลของเว็บนี้)", "No hotspot data yet (this site's collector isn't running)"));
    }
    cards.push(c);
  }

  // ---------- official warnings and the verdict ----------
  const warnings = b.warnings ? warningsFor(b.warnings, place?.pv, now) : [];
  for (const c of cards) if (c.level >= 0 && !c.word) c.word = word(scale(c.level));
  const graded = cards.filter((c) => c.level >= 0);
  // The verdict is never milder than any tile (GUIDELINES rule 7): its level is the highest one, its headline the worst
  // hazard in the agency's own word, with that hazard's one sourced action.
  const order = ORDER.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  const top = Math.max(-1, ...graded.map((c) => c.level), ...warnings.map((w) => w.level));
  const worst = graded.filter((c) => c.level === top && top > 0).sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id))[0] || null;
  const item = (c) => ({ id: c.id, icon: c.icon, short: c.short, level: c.level, word: c.word, value: c.value });
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
    missing: order.filter((c) => c.level < 0).map((c) => c.short),
  };
  const pre = prewarnings(ens, extraPre);
  const outlook = ens ? ens.days.map((d, i) => ({
    name: dayName(i, d.date, lang), date: d.date,
    heat: { level: band("heat", d.heat.p50).level, text: `${fmt(d.heat.p50)}°` },
    rain: { level: windowLevel(d.rain24).level, text: fmt(d.rain24.p50), sub: d.rain24.chance[2] >= 0.1 ? chanceText(d.rain24.chance[2], lang) : "" },
    gust: { level: windowLevel(d.gust).level, text: fmt(d.gust.p50) },
    pm25: air.outlook[i] ? { level: air.outlook[i].band.level, text: fmt(air.outlook[i].mean) } : null,
    uv: air.uv[i] ? { level: air.uv[i].band.level, text: fmt(air.uv[i].max) } : null,
  })) : [];

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
  if (slideN) profile.push({ icon: "⛰️", text: L(`หมู่บ้านเสี่ยงดินถล่ม ${slideN} แห่งในรัศมี 3 กม.`, `${slideN} landslide-risk village(s) within 3 km`) });
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

export { HAZARDS, ageText };

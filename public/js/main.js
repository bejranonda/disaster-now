// The page: choose a point (GPS, search, a saved place or a #p= link), fetch every source in parallel, and draw
// the cards as each answer arrives. All judgement is in assess.js; this file only fetches and draws.

import { inThailand, nearestTambon, placeLabel, placeParts, rounded } from "./geo.js";
import { get, urls, SOURCES, liveFresh } from "./sources.js";
import { assess, timeText, localOf, shareMessage, changesSince, lookOf, listLevel } from "./assess.js";
import { localSearch, hitLabel, hitPlace, osmSearch, loadPlaces, savePlace, removePlace } from "./places.js";
import { makeT } from "./i18n.js";
import { scale } from "./levels.js";
import { IPE } from "./ipe.js";

export const VERSION = "0.7.1";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LV = (l) => (l == null || l < 0 ? "none" : scale(l).key);
const TMD_WARNINGS = "https://www.tmd.go.th/warning-and-events/warnings"; // 200, text/html (24 Oct 2026)
const TMD_WARNINGS_EN = "https://www.tmd.go.th/en/warning-and-events/warnings";

let lang = "th";
try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem("dn:lang") || "th"; } catch { /* storage blocked */ }
if (lang !== "en") lang = "th";
let t = makeT(lang);
let tambon = null;
let current = null; // {lat, lon, name, source, place}
let bundle = null;
let lastVerdict = null; // the verdict's last HTML: the live region is rewritten only when it changes (U11)
// "What changed since you last looked", per load: the last look's levels for this subdistrict, read once (UX §5.3)
let seen = null;
const SEEN_KEY = "dn:seen";
const SEEN_MAX = 5; // places kept, by subdistrict code; levels and a time only, never a position, never sent
function readSeen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch { return {}; } }
function writeSeen(code, look) {
  try {
    const all = { ...readSeen(), [code]: look };
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, SEEN_MAX);
    localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* private mode: no memory, no line */ }
}
let loadSeq = 0;
let lastLoad = 0;

// ---------- static text ----------
function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-t-ph]").forEach((el) => { el.placeholder = t(el.dataset.tPh); });
  document.querySelectorAll("[data-t-title]").forEach((el) => { el.title = t(el.dataset.tTitle); el.setAttribute("aria-label", t(el.dataset.tTitle)); });
  $("#lang").textContent = lang === "en" ? "ไทย" : "EN";
  $("#lang").lang = lang === "en" ? "th" : "en";
  document.title = `${t("brand")}${lang === "en" ? "" : " · Thai Risk"}`;
  $("#ver").textContent = `v${VERSION}`;
  $("#about").innerHTML = aboutHtml();
}

function aboutHtml() {
  const rows = Object.entries(SOURCES).filter(([k]) => k !== "live").map(([, s]) => `<li>${esc(s.credit[lang])}</li>`).join("");
  return lang === "en"
    ? `<p>Each card names its source and the time of its data. Models (forecasts and estimates) are marked; a measured value is preferred when one is close.</p>
       <ul>${rows}<li>Subdistricts: HDX COD-AB (Royal Thai Survey Department, OCHA), CC BY-IGO</li><li>Place search: Photon (komoot), then Nominatim; data © OpenStreetMap contributors</li></ul>
       <p><b>Privacy:</b> this site keeps nothing about you. Your exact location stays on this phone; providers that need a point get it rounded to ~1 km. Saved places stay in this browser only. What you type goes to Photon (komoot) only when you press search.</p>
       <p>Each hazard is graded by its agency's own bands. A forecast alone goes up to "Get ready"; "Act now" needs a measurement or an official warning.</p>`
    : `<p>ทุกการ์ดบอกแหล่งข้อมูลและเวลาของข้อมูล ค่าจากแบบจำลอง (พยากรณ์และค่าประมาณ) มีป้ายบอก และใช้ค่าวัดจริงก่อนเมื่อมีสถานีใกล้</p>
       <ul>${rows}<li>ตำบล อำเภอ จังหวัด: HDX COD-AB (กรมแผนที่ทหาร, OCHA) CC BY-IGO</li><li>ค้นหาสถานที่: Photon (komoot) แล้วจึง Nominatim ข้อมูล © ผู้ร่วมสร้าง OpenStreetMap</li></ul>
       <p><b>ความเป็นส่วนตัว:</b> เว็บนี้ไม่เก็บข้อมูลใด ๆ ของคุณ ตำแหน่งจริงอยู่ในเครื่องคุณ แหล่งข้อมูลที่ต้องใช้จุดจะได้แบบปัดเศษ ~1 กม. ที่บันทึกไว้อยู่ในเบราว์เซอร์นี้เท่านั้น คำที่พิมพ์ส่งไปที่ Photon (komoot) เมื่อกดค้นหาเท่านั้น</p>
       <p>แต่ละเรื่องใช้เกณฑ์ของหน่วยงานนั้น ค่าพยากรณ์อย่างเดียวขึ้นได้ถึง "เตรียมตัว" ส่วน "ทำทันที" ต้องมีค่าวัดจริงหรือประกาศเตือนภัยของหน่วยงาน</p>`;
}

// ---------- runtime settings (config.json; the page works without it) ----------
let configP = null;
const config = () => (configP ||= fetch("config.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
async function geocoderOrder() {
  const g = (await config()).geocoder || "photon";
  return g === "off" ? [] : g === "photon" ? ["photon", "nominatim"] : [g];
}

// ---------- the subdistrict table, loaded once ----------
let tambonP = null;
function loadTambon() {
  if (!tambonP) tambonP = fetch("data/tambon.json").then((r) => r.json()).then((d) => (tambon = d));
  return tambonP;
}

// ---------- messages ----------
function say(msg) {
  const el = $("#finder-msg");
  el.hidden = !msg;
  el.textContent = msg || "";
}

// ---------- choosing a point ----------
const inLine = () => /\bLine\//.test(navigator.userAgent);
function locate() {
  if (!navigator.geolocation) { say(t("geoNone")); lineHint(); $("#q").focus(); return; }
  const btn = $("#gps");
  if (btn.getAttribute("aria-busy") === "true") return; // one request at a time (T15)
  say(t("locating"));
  btn.setAttribute("aria-busy", "true");
  const done = () => btn.removeAttribute("aria-busy");
  navigator.geolocation.getCurrentPosition(
    (pos) => { done(); say(""); choose({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: t("gpsLabel"), source: "gps", acc: pos.coords.accuracy }); },
    (err) => {
      done();
      // inside LINE the permission is LINE's own app permission, not a site setting (T4)
      say(err.code === 1 ? t(inLine() ? "geoDeniedLine" : "geoDenied") : t("geoFail"));
      lineHint();
      $("#q").focus();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
  );
}

/** LINE's in-app browser: offer the phone's own browser, where location usually works. */
function lineHint() {
  if (!inLine()) return;
  const u = new URL(location.href);
  u.searchParams.set("openExternalBrowser", "1");
  $("#finder-msg").insertAdjacentHTML("beforeend", ` <a href="${esc(u.href)}">${esc(t("openBrowser"))}</a>`);
}

async function choose(p) {
  if (!inThailand(p.lat, p.lon)) { say(t("outside")); return; }
  $("#results").hidden = true;
  current = { ...p };
  try { localStorage.setItem("dn:last", JSON.stringify({ lat: p.lat, lon: p.lon, name: p.source === "gps" ? "" : p.name })); } catch { /* ignore */ }
  if (p.source === "tambon" && p.code) history.replaceState(null, "", `#t=${p.code}`);
  else if (p.source === "search") {
    const r = rounded(p.lat, p.lon);
    history.replaceState(null, "", `#p=${r.lat},${r.lon}${p.name ? `,${encodeURIComponent(p.name)}` : ""}`);
  }
  await load();
}

// ---------- fetching ----------
async function load() {
  const seq = ++loadSeq;
  lastLoad = Date.now();
  const p = current;
  bundle = { now: Date.now(), point: p, errors: {} };
  seen = { prev: undefined, stored: false };
  setTimeout(() => { if (seq === loadSeq) { bundle.waitOver = true; schedule(); } }, 5000);
  const u0 = urls(p.lat, p.lon);
  const jobs = [
    ["ens", u0.ens], ["aq", u0.aq], ["gistda", u0.gistda], ["hiiFf", u0.hiiFf, "text"], ["emsc", u0.emsc], ["usgs", u0.usgs],
    ["gdacs", u0.gdacs], ["dmrSlide", u0.dmrSlide], ["elev", u0.elev],
  ];
  // FloodWatch's own point check, once FloodWatch sends CORS for this site (config.json → floodwatchPoint)
  config().then((cfg) => {
    if (!cfg.floodwatchPoint) return;
    const r = rounded(p.lat, p.lon);
    get("fw", `https://flood.autobahn.bot/api/point?lat=${r.lat}&lon=${r.lon}`).then((x) => {
      if (seq === loadSeq && x.ok) { bundle.floodwatch = x.data; done(); }
    });
  });
  const done = () => { if (seq === loadSeq && bundle.point.place !== undefined) schedule(); };
  const run = (list) => {
    for (const [k, url, as] of list) {
      get(k, url, { as }).then((r) => {
        if (seq !== loadSeq) return;
        if (r.ok) bundle[k] = r.data; else bundle.errors[k] = r.error;
        done();
      });
    }
  };
  run(jobs);
  const live = liveFiles(u0);
  const jma = jmaStorms().then((list) => { if (seq === loadSeq) bundle.jma = list; });
  live.then(done);
  jma.then(done);
  await loadTambon();
  if (seq !== loadSeq) return;
  p.place = nearestTambon(tambon, p.lat, p.lon);
  // keep the place in the address bar, as its subdistrict code (the share link's own form, never the fix), so LINE's
  // own ⋯ → Share or Copy link sends the place, not the welcome page (T9)
  if ((p.source === "gps" || p.source === "saved") && p.place?.code) history.replaceState(null, "", `${location.pathname}${location.search}#t=${p.place.code}`);
  $("#welcome").hidden = true;
  document.documentElement.classList.remove("opening");
  $("#report").hidden = false;
  $("#report-head").hidden = false;
  $(".finder").classList.add("has-place");
  renderPlace();
  render(true);
  const u = urls(p.lat, p.lon, { pv: p.place?.pv, tambon: p.place?.code });
  run([["twRain", u.twRain], ["twLevel", u.twLevel], ["dmrFault", u.dmrFault]].filter((j) => j[1]));
}

/** JMA's current typhoons: the list, then each storm's forecast (each under 1 KB, CORS *). */
async function jmaStorms() {
  const list = await get("jma", SOURCES.jma.url);
  if (!list.ok || !Array.isArray(list.data)) return [];
  const out = await Promise.all(list.data.slice(0, 4).map((x) => get("jma", `${SOURCES.jma.base}${x.tropicalCyclone}/forecast.json`)));
  return out.filter((r) => r.ok).map((r) => r.data);
}

/** The collector's files (data/live/), if this deployment runs it: official warnings, hotspots, TMD quakes, Air4Thai.
 *  Without them, Air4Thai is read from its CORS mirror (its certificate chain is broken: KNOWN_ISSUES KI-002). */
async function liveFiles(u) {
  const idx = await get("live", u.live("index.json"));
  // files from a collector that stopped are missing, not calm (S12): KV keeps the last upload forever
  const fresh = idx.ok && liveFresh(idx.data, bundle.now);
  if (idx.ok && !fresh) bundle.errors.live = "stale";
  const files = fresh ? idx.data.files || {} : {};
  // FloodWatch didn't answer the collector's last run: the flood card says so (UX study §6.3), without a call per visitor
  if (fresh && idx.data.failed?.["floodwatch.json"]) bundle.fwDown = idx.data.generated;
  const want = { warnings: "warnings.json", hotspots: "hotspots.json", tmdQuakes: "tmd_quakes.json", storms: "storms.json", a4t: "air4thai.json",
    fwLive: "floodwatch.json", rain3d: "rain3d.json" };
  await Promise.all(Object.entries(want).map(async ([k, f]) => {
    if (!files[f]) return;
    const r = await get("live", u.live(f));
    if (r.ok) bundle[k] = k === "a4t" ? r.data.raw || r.data : r.data;
  }));
  bundle.liveDone = true;
  if (!bundle.a4t) {
    const r = await get("a4t", SOURCES.a4t.url);
    if (r.ok) bundle.a4t = r.data; else bundle.errors.a4t = r.error;
  }
}

let raf = 0;
function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => render(false));
}

// ---------- drawing ----------
// ---------- drawing helpers (0.7.0: this site's icons and its staff-gauge level glyph, no emoji in the interface) ----------
/** A symbol from index.html's sprite. */
const svg = (id, cls = "") => `<svg class="ic${cls ? ` ${cls}` : ""}" aria-hidden="true"><use href="#${id}"/></svg>`;
const ICON = { heat: "i-heat", pm25: "i-pm25", air: "i-air", uv: "i-uv", rain: "i-rain", flood: "i-flood", wind: "i-wind",
  landslide: "i-landslide", quake: "i-quake", fire: "i-fire" };
const icon = (id) => svg(ICON[id] || "i-info");
const PROFILE_ICON = { "📐": "i-place", "〰️": "i-quake", "🏢": "i-quake", "⛰️": "i-landslide", "🌊": "i-flood" };
/** The staff gauge: a water-level pole filled from the bottom (blue, yellow, orange, red) up to the level, so a level
 *  reads by height as well as colour; dashed and empty for no data. Its word is its label for screen readers. */
const gauge = (l, big = false) => `<span class="gauge g${l == null || l < 0 ? "n" : Math.min(3, l)}${big ? " big" : ""}" role="img" aria-label="${esc(l == null || l < 0 ? t("noData") : scale(l)[lang])}"><i></i><i></i><i></i><i></i></span>`;
/** A data line or cell that starts with an emoji (assess.js keeps them: the share text goes to LINE as plain text) is
 *  drawn with this site's icon instead. */
const LEAD = [["📈", "i-trend"], ["⬆️", "i-up"], ["⚠️", "i-notice"], ["📱", "i-mobile"], ["📢", "i-notice"]];
function rich(s) {
  const str = String(s ?? "");
  for (const [e, id] of LEAD) if (str.startsWith(e)) return `${svg(id, "lead")}${esc(str.slice(e.length).trimStart())}`;
  return esc(str);
}
let infoSeq = 0;
/** ⓘ: a source or method one tap away (touch has no hover): a button that shows the text under its line. */
function info(text, { html = false, label = t("whereFrom") } = {}) {
  const id = `info-${++infoSeq}`;
  return { btn: `<button type="button" class="info" aria-expanded="false" aria-controls="${id}">${svg("i-info")}<span class="sr-only">${esc(label)}</span></button>`,
    box: `<div class="info-text" id="${id}" hidden>${html ? text : esc(text)}</div>` };
}
/** A value that comes from a model, not a measurement, says so on the row and the hero (GUIDELINES rule 3; redesign
 *  audit R10): the forecast hazards, CAMS's UV, GISTDA's or CAMS's dust when no PCD station leads. */
function faceTag(c, { calmToo = false } = {}) {
  // on the row face only where a model value asks for attention; a calm row keeps it in its sources (less ink)
  if (!c || c.level < 0 || c.official || (!calmToo && c.level < 1)) return "";
  if (["heat", "rain", "wind"].includes(c.id) && c.src.some((x) => x.model)) return t("tagForecast");
  if (c.id === "uv") return t("tagModel");
  if ((c.id === "pm25" || c.id === "air") && c.src[0]?.model) return t("tagEstimate");
  return "";
}

function renderPlace() {
  const p = current;
  const label = p.place ? placeLabel(p.place, lang) : "";
  // GPS: the subdistrict is the headline, "my location" the subtitle; a named place keeps its name on top
  const named = p.source !== "gps" && p.name && p.name !== label ? p.name : "";
  const r2 = rounded(p.lat, p.lon);
  const xy = `${r2.lat.toFixed(2)}, ${r2.lon.toFixed(2)}`;
  // U17 (GUIDELINES §2): coordinates only for a searched public place, never for a GPS fix or a saved place (a "บ้าน"
  // screenshot travels in family groups), nor for a subdistrict, whose name says where it is
  const showXY = p.source === "search";
  // the subdistrict as the title and its district and province under it: the whole label wrapped to three lines at 360 px
  const [tName, tRest] = placeParts(p.place, lang);
  $("#place-name").textContent = named || tName || (showXY ? xy : "");
  const acc = p.source === "gps" && p.acc ? ` (±${p.acc < 1000 ? `${Math.round(p.acc)} ${lang === "en" ? "m" : "ม."}` : `${(p.acc / 1000).toFixed(1)} ${lang === "en" ? "km" : "กม."}`})` : "";
  const parts = [named ? `${t("nearT")} ${label}` : tRest, showXY ? xy : ""].filter(Boolean).map(esc);
  $("#place-sub").innerHTML = (p.source === "gps" ? `<span class="gpsl">${svg("i-locate")} ${esc(`${t("gpsLabel")}${acc}`)}</span>${parts.length ? "<br>" : ""}` : "")
    + parts.join(", ")
    + (p.source === "gps" ? ` <button type="button" class="linkbtn" id="notthis">${esc(t("notThis"))}</button>` : "")
    // an approximate fix (Android "Approximate", iOS "Precise: Off", ±5 km) can name the wrong subdistrict (T14, KI-006)
    + (p.source === "gps" && p.acc > 2000 ? `<br>${esc(t(inLine() ? "approxLine" : "approx"))}` : "");
  $("#notthis")?.addEventListener("click", () => { openFinder(); say(t("pickYourself")); });
  const saved = loadPlaces().some((x) => Math.abs(x.lat - p.lat) < 0.001 && Math.abs(x.lon - p.lon) < 0.001);
  const sv = $("#save");
  sv.dataset.saved = saved ? "1" : "";
  sv.setAttribute("aria-pressed", String(saved));
  sv.title = saved ? t("saved") : t("save");
  sv.setAttribute("aria-label", sv.title);
  renderSaved();
}

function render(first) {
  if (!bundle) return;
  const r = assess(bundle, lang, IPE);
  // verdict: the level by what to do, the worst hazard in the agency's word, its one sourced action
  const v = r.verdict;
  const vEl = $("#verdict");
  // No level until the forecast, the air quality and the warnings have answered (or failed), or 5 s have passed: an
  // early verdict from the first few sources was milder or about another hazard (KI-026, visitor audit V21)
  const settled = bundle.waitOver || (["ens", "aq"].every((k) => bundle[k] || bundle.errors[k]) && bundle.liveDone);
  if (!settled) {
    vEl.className = "hero lv-none hatch";
    vEl.innerHTML = `<div class="hero-top">${gauge(-1, true)}<p class="vtitle">${esc(t("loadingN", { n: r.cards.filter((c) => c.level >= 0).length, m: r.cards.length }))}</p></div>`;
  } else vEl.className = `hero lv-${first && v.level < 0 ? "none" : LV(v.level)}${v.level < 0 ? " hatch" : ""}`;
  const warnHead = (w) => (lang === "en" ? (w.en?.checked ? w.en.headline : w.event) : w.headline || w.event);
  const worstCard = v.worst ? r.cards.find((c) => c.id === v.worst.id) : null;
  const wTag = faceTag(worstCard);
  // a forecast alone tops out at เตรียมตัว: said where "ระดับอันตราย" sits beside "เตรียมตัว" (redesign audit R11)
  const capTip = wTag && wTag === t("tagForecast") ? info(t("capNote"), { label: t("whyLevel") }) : null;
  const head = v.worst ? `<p class="vhead">${icon(v.worst.id)}<span>${esc(v.worst.short)}: ${esc(v.worst.word)}${v.worst.value ? `<br><span class="vval">${esc(v.worst.value)}</span>` : ""}${wTag ? ` <span class="tag">${esc(wTag)}</span>` : ""}</span>${capTip ? capTip.btn : ""}</p>${capTip ? capTip.box : ""}`
    : v.warning ? `<p class="vhead">${svg("i-notice")}<span>${esc(warnHead(v.warning))}</span></p>`
      : v.level === 0 ? `<p class="vhead"><span>${esc(t(v.complete ? "allQuiet" : "quietSoFar"))}</span></p>` : "";
  // U11: the verdict is an aria-live region; it was rewritten 12 times in 14 s on one load. It is busy (silent) until
  // settled, and rewritten only when its text changes
  vEl.setAttribute("aria-busy", settled ? "false" : "true");
  infoSeq = 0;
  let vHtml = null;
  if (settled && first && v.level < 0) vHtml = `<div class="hero-top">${gauge(-1, true)}<p class="vtitle">${esc(t("loading"))}</p></div>`;
  else if (settled) {
    const actSrc = v.action ? info(`${t("whereFrom")}: ${v.action.src.map((x) => (x.kind === "official" ? t("official") : t("news"))).filter((x, i, a) => a.indexOf(x) === i).join(", ")}`) : null;
    const body = [
      v.action ? `<p class="vact"><span class="do" aria-hidden="true"></span><span>${esc(v.action.text)}</span>${actSrc.btn}</p>${actSrc.box}` : "",
      // a mask line never goes out without the under-2 line (บ้านรอดไหม F129; cross-check H1)
      v.action?.baby ? `<p class="vact baby"><span class="do" aria-hidden="true"></span><span>${esc(v.action.baby.text)}</span></p>` : "",
      // the other hazards at the verdict's level, named (0.6.0's "เรื่องอื่น"; redesign audit R3)
      (() => {
        const same = v.level >= 1 ? v.others.filter((o) => o.level === v.level) : [];
        return same.length ? `<p class="vmore">${esc(t("alsoSame"))} ${same.map((o) => `<b>${esc(o.short)}</b> ${esc(o.word)}`).join(", ")}</p>` : "";
      })(),
      // the worst coming day when it is above the verdict, or another hazard reaching it: words and the gauge, never the
      // verdict's colour (UX study §5.2)
      v.ahead ? `<p class="vahead">${svg("i-ahead")}<span>${esc(t("aheadL"))} <b>${esc(v.ahead.text)}</b></span>${gauge(v.ahead.level)}</p>` : "",
      // missing is never calm: named here, and where to look for unchecked warnings said in full (redesign audit R4)
      v.missing.length ? `<p class="vmiss">${gauge(-1)}<span>${esc(t("missing"))} ${esc(v.missing.join(", "))}${!bundle.warnings && bundle.liveDone ? ` (${esc(t("warnLook"))})` : ""}</span></p>` : "",
    ].filter(Boolean).join("");
    vHtml = `<div class="hero-top">${gauge(v.level, true)}<div><p class="vname">${esc(v.name)}</p>${head}</div></div>`
      + (body ? `<div class="hero-body">${body}</div>` : "");
  }
  if (vHtml != null && vHtml !== lastVerdict) { vEl.innerHTML = vHtml; lastVerdict = vHtml; }
  else if (vHtml == null) lastVerdict = null;
  // what changed since the last look at this subdistrict: read the last look once per load, store this one once settled
  const code = current?.place?.code;
  if (settled && code && v.level >= 0 && seen) {
    if (seen.prev === undefined) seen.prev = readSeen()[code] || null;
    if (!seen.stored && bundle.liveDone && bundle.waitOver) { writeSeen(code, lookOf(r, bundle.now)); seen.stored = true; }
  }
  const ch = settled && seen?.prev ? changesSince(seen.prev, r) : [];
  const chEl = $("#changes");
  chEl.hidden = !ch.length;
  chEl.innerHTML = ch.length ? `${svg("i-changed")}<span>${esc(t("changedSince", { t: timeText(localOf(seen.prev.at), bundle.now, lang) }))} `
    + ch.map((x) => `<span class="chg">${esc(x.short)} ${esc(scale(x.from)[lang])} ${x.to > x.from ? "↑" : "↓"} <b>${esc(scale(x.to)[lang])}</b></span>`).join(", ") + "</span>" : "";
  // official warnings: TMD's own words lead, under the hero
  const when = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? timeText(localOf(Date.parse(iso)), bundle.now, lang) : "");
  $("#warnings").innerHTML = r.warnings.map((w) => {
    // English page: the collector's checked machine translation when there is one (docs/AI.md §2), else TMD's Thai
    const en = lang === "en" && w.en?.checked ? w.en : null;
    return `<div class="warn lv-${LV(w.level)}"><p class="warn-h">${svg("i-notice")}${esc(t("officialNow"))}</p>`
      + `<p><b>${esc(en ? en.headline || w.event : lang === "en" ? `${w.event || ""} (in Thai)` : w.headline || w.event)}</b></p>`
      + `<p class="small muted">${w.sent ? `${esc(t("issued"))} ${esc(when(w.sent))}` : ""}${w.expires ? `, ${esc(t("until"))} ${esc(when(w.expires))}` : ""}</p>`
      + `${(en ? en.instruction : w.instruction) ? `<p>${esc(en ? en.instruction : w.instruction)}</p>` : ""}`
      + `${(en ? en.description : w.description) ? `<details><summary>${esc(t(en ? "readNoticeEn" : "readNotice"))}</summary><p class="small">${esc(en ? en.description : w.description)}</p></details>` : ""}`
      + (en ? `<p class="small muted mt">${esc(t("machineTr"))}</p><details lang="th"><summary>${esc(t("thaiOriginal"))}</summary><p class="small">${esc([w.headline, w.instruction, w.description].filter(Boolean).join("\n\n"))}</p></details>` : "")
      // TMD's warnings page in the page's language: the CAP item's link is a raw XML file (visitor audit U10)
      + `<a class="how" href="${esc(lang === "en" ? TMD_WARNINGS_EN : TMD_WARNINGS)}" target="_blank" rel="noopener">${esc(t("fullNotice"))}${svg("i-ext")}</a></div>`;
  }).join("");
  // every hazard, sorted by concern (the owner, 25 Oct 2026), grouped: needs attention, no data (never calm), calm.
  // A row opens in place; rows the visitor opened stay open when new answers redraw the list
  const open = new Set([...document.querySelectorAll("#cards details[open]")].map((d) => d.id));
  // grouped by the scale's own words, each row by the worse of today and its coming days (redesign audit R1, R5); until
  // the sources have settled the rows keep the fixed order with no groups, so nothing jumps under a finger (R8)
  const groups = [[3, (c) => listLevel(c) === 3], [2, (c) => listLevel(c) === 2], [1, (c) => listLevel(c) === 1],
    [-1, (c) => listLevel(c) < 1 && c.level < 0], [0, (c) => listLevel(c) === 0]];
  const word = (l) => (l < 0 ? t("noData") : scale(l)[lang]);
  $("#cards").innerHTML = !settled ? r.cards.map((c) => rowHtml(c, open.has(`card-${c.id}`))).join("")
    : groups.map(([l, f]) => {
      const g = r.byConcern.filter(f);
      return g.length ? `<h3 class="grp lv-${LV(l)}">${l >= 0 ? gauge(l) : gauge(-1)}<span>${esc(word(l))}</span><span class="n">${g.length}</span></h3>${g.map((c) => rowHtml(c, open.has(`card-${c.id}`))).join("")}` : "";
    }).join("");
  // the 3-day table, folded: the same graded cells as each row's days (assess.fcLevel)
  $("#outlook").innerHTML = r.outlook.length ? outlookHtml(r.outlook) : "";
  $("#outlook-box").hidden = !r.outlook.length;
  // the place's long-term profile, folded
  $("#profile-wrap").hidden = !r.profile.length;
  $("#profile").innerHTML = r.profile.map((p) => `<li>${svg(PROFILE_ICON[p.icon] || "i-place")} ${esc(p.text)}</li>`).join("");
  const rp = rounded(current.lat, current.lon);
  const anyData = r.cards.some((c) => c.level >= 0);
  $("#updated").textContent = !anyData ? t("triedAt", { t: new Date(bundle.now).toLocaleTimeString(lang === "en" ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) }) : t("updated", { t: new Date(bundle.now).toLocaleTimeString(lang === "en" ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }), m: r.members || "–",
    p: current.source === "search" ? `${rp.lat.toFixed(2)}, ${rp.lon.toFixed(2)}` : t("roundedKm") }); // U17
}

/** One hazard's row: its icon on a token tinted by its level, its name, the agency's word and the value, the gauge;
 *  opened, the detail (the sourced action, the lines, the coming days, the method note, the sources, the links). */
function rowHtml(c, isOpen) {
  const lv = LV(c.level);
  // the heat band's "เตือนภัย" beside a TMD notice reads as an official warning (U9): named as a level, as in the hero
  const word = c.level < 0 ? (c.error ? t("failed") : t("noData")) : c.id === "heat" && !c.official && c.word ? L2(`ระดับ${c.word}`, `${c.word} level`) : c.word || "";
  const value = c.level >= 0 && c.value ? c.value : "";
  const tag = faceTag(c);
  // a coming day above today's level, on the row itself, named with its day and level (R1)
  const badge = c.ahead && c.ahead.level > Math.max(c.level, 0)
    ? `<span class="badge lv-${LV(c.ahead.level)}">${gauge(c.ahead.level)}${esc(c.ahead.official ? `${c.ahead.name} ${t("tmdShort")}` : `${c.ahead.name} ${scale(c.ahead.level)[lang]}`)}</span>` : "";
  // UV's day peaks are information, not a level: no gauge, no colour (R2)
  const dayCell = (d) => (d.info ? `<div class="day info"><span class="dn">${esc(d.name)}</span><span class="dv">${rich(d.text)}</span>${d.sub ? `<small>${esc(d.sub)}</small>` : ""}</div>`
    : `<div class="day lv-${LV(d.level)}"><span class="dn">${esc(d.name)}</span><span class="dv">${gauge(d.level)}${rich(d.text)}</span>${d.sub ? `<small>${esc(d.sub)}</small>` : ""}</div>`);
  const days = c.days?.length ? `<div class="days">${c.days.map(dayCell).join("")}</div>` : "";
  const age = (s) => (s.ageH != null && s.ageH >= 1 ? ` <span class="old">${esc(t("hoursOld", { h: Math.round(s.ageH) }))}</span>` : "");
  const mtag = (s) => (s.model && !/แบบจำลอง|model|ensemble/i.test(s.name) ? ` <span class="tag">${esc(t("model"))}</span>` : ""); // R9: never twice
  const src = c.src.length ? `<p class="src">${esc(t("source"))}: ${c.src.map((s) => `${esc(s.name)}${s.time ? `, ${esc(s.time)}` : ""}${age(s)}${mtag(s)}`).join("; ")}</p>` : "";
  // the method note and the sources: one real toggle at the end, as in the hero (R9)
  const ref = c.note || src ? (() => { const x = info(`${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}${src}`, { html: true, label: t("refH") });
    return `<p class="refrow"><span>${esc(t("refH"))}</span>${x.btn}</p>${x.box}`; })() : "";
  const links = [c.link && `<a class="how" href="${esc(c.link.href)}" target="_blank" rel="noopener">${esc(c.link.text)}${svg("i-ext")}</a>`,
    c.more && `<a class="how" href="${esc(c.more.href)}" target="_blank" rel="noopener">${esc(c.more.text)}${svg("i-ext")}</a>`].filter(Boolean).join("");
  return `<details class="card lv-${lv}" id="card-${c.id}"${isOpen ? " open" : ""}>
    <summary class="row">${gauge(c.level)}<span class="token${c.level < 0 ? " hatch" : ""}">${icon(c.id)}</span>
      <span class="row-main"><span class="row-name">${esc(c.title)}${badge}</span><span class="row-sub"><span class="w">${esc(word)}</span>${value ? `<span class="v">${esc(value)}</span>` : ""}${tag ? ` <span class="tag">${esc(tag)}</span>` : ""}</span></span>
      ${svg("i-chev", "chev")}</summary>
    <div class="detail">
    ${c.action ? `<p class="act"><span class="do" aria-hidden="true"></span><span>${esc(c.action.text)}</span></p>` : ""}
    ${c.action?.baby ? `<p class="act baby"><span class="do" aria-hidden="true"></span><span>${esc(c.action.baby.text)}</span></p>` : ""}
    ${c.lines && c.lines.length ? `<ul class="lines">${c.lines.filter(Boolean).map((l) => `<li>${rich(l)}</li>`).join("")}</ul>` : ""}
    ${c.error && c.level < 0 && !(c.lines || []).length ? `<p class="failnote">${esc(errWord(c.error))}</p>` : ""}
    ${days}
    ${links ? `<div class="acts">${links}</div>` : ""}
    ${ref}
    </div>
  </details>`;
}
const L2 = (th, en) => (lang === "en" ? en : th);

/** A fetch error in words a visitor reads (not "timeout", "HTTP 500"). */
function errWord(e) {
  const s = String(e || "");
  const m = s.match(/HTTP (\d+)/);
  if (/timeout|abort/i.test(s)) return t("errTimeout");
  if (m) return t("errHttp", { c: m[1] });
  return t("errNet");
}

function outlookHtml(rows) {
  // the row's name says what a rain cell is ("โอกาสฝนหนัก"); a gauge in every cell and the level's word for screen
  // readers: colour is never the only signal (KI-025)
  const cell = (x) => (x && x.info ? `<td class="info"><span class="cell">${rich(x.text)}</span></td>` : x ? `<td class="lv-${LV(x.level)}"><span class="cell">${gauge(x.level)}${rich(x.text)}</span>`
    + `${x.level >= 0 ? `<span class="sr-only"> (${esc(scale(x.level)[lang])})</span>` : ""}</td>` : "<td class='lv-none'>–</td>");
  return `<table class="outlook"><thead><tr><th></th>${rows.map((r) => `<th>${esc(r.name)}</th>`).join("")}</tr></thead><tbody>
    <tr><th>${icon("heat")} ${esc(t("rowHeat"))}</th>${rows.map((r) => cell(r.heat)).join("")}</tr>
    <tr><th>${icon("rain")} ${esc(t("rowRain"))}</th>${rows.map((r) => cell(r.rain)).join("")}</tr>
    <tr><th>${icon("pm25")} ${esc(t("rowPm"))}</th>${rows.map((r) => cell(r.pm25)).join("")}</tr>
    <tr><th>${icon("uv")} ${esc(t("rowUv"))}</th>${rows.map((r) => cell(r.uv)).join("")}</tr>
    <tr><th>${icon("wind")} ${esc(t("rowGust"))}</th>${rows.map((r) => cell(r.gust)).join("")}</tr>
  </tbody></table>`;
}

// ---------- saved places ----------
function renderSaved() {
  const list = loadPlaces();
  const el = $("#saved");
  el.hidden = !list.length;
  el.innerHTML = list.map((p, i) => `<span class="sp"><button type="button" class="chip" data-i="${i}">${svg("i-star")}${esc(p.name)}</button><button type="button" class="x" data-x="${i}" aria-label="${esc(t("remove"))} ${esc(p.name)}">×</button></span>`).join("");
  el.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { const p = list[+b.dataset.i]; choose({ ...p, source: "saved" }); }));
  el.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => { removePlace(+b.dataset.x); renderSaved(); if (current) renderPlace(); }));
}

// ---------- search ----------
async function onInput() {
  const q = $("#q").value.trim();
  const ul = $("#results");
  if (q.length < 2) { ul.hidden = true; return; }
  await loadTambon();
  const hits = localSearch(tambon, q);
  ul.hidden = false;
  ul.innerHTML = hits.map((h, i) => `<li><button type="button" class="hit" data-i="${i}">${svg("i-place")}<span>${esc(hitLabel(h, lang))}</span></button></li>`).join("")
    + `<li><button type="button" class="hit osm" id="osm">${svg("i-search")}<span>${esc(t("osmBtn", { q }))}</span></button><div id="osm-res"></div></li>`;
  ul.querySelectorAll(".hit[data-i]").forEach((b) => b.addEventListener("click", () => {
    const h = hits[+b.dataset.i];
    choose(hitPlace(h));
  }));
  $("#osm").addEventListener("click", () => osm(q));
}

async function osm(q) {
  const box = $("#osm-res") || $("#results");
  $("#results").hidden = false;
  box.innerHTML = `<p class="muted">${esc(t("osmWait"))}</p>`;
  try {
    const res = await osmSearch(q, lang, fetch, await geocoderOrder());
    box.innerHTML = res.length ? res.map((r, i) => `<button type="button" class="hit" data-o="${i}">${svg("i-search")}<span>${esc(r.name)} <span class="muted">${esc(r.area)}</span></span></button>`).join("") + `<p class="muted small">${esc(t("osmCredit"))}</p>`
      : `<p class="muted">${esc(t("osmNone"))}</p>`;
    box.querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => {
      const r = res[+b.dataset.o];
      choose({ lat: r.lat, lon: r.lon, name: r.name, source: "search" });
    }));
  } catch (e) {
    box.innerHTML = `<p class="muted">${esc(t("osmFail", { e: e.message }))}</p>`;
  }
}

// ---------- events ----------
$("#gps").addEventListener("click", locate);
/** Unfold the finder (it folds to "🔎 ดูที่อื่น" while a place is open, KI-022) and put the cursor in search. */
function openFinder() {
  $(".finder").classList.remove("has-place");
  $("#q").focus();
}
$("#change").addEventListener("click", openFinder);
$("#q").addEventListener("input", onInput);
$("#q").addEventListener("focus", loadTambon, { once: true });
$("#search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (q.length < 2) return;
  await loadTambon();
  await onInput();
  const hits = localSearch(tambon, q, 1);
  // an exact subdistrict/district/province name goes straight there; anything else asks OpenStreetMap
  if (hits.length && hits[0].key.split("|").includes(q.replace(/\s/g, "").toLowerCase().replace(/^(ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|แขวง|เขต)/, ""))) {
    choose(hitPlace(hits[0]));
  } else osm(q);
});
$("#refresh").addEventListener("click", () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith("dn:")).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } if (current) load(); });
$("#save").addEventListener("click", () => {
  if (!current) return;
  const list = loadPlaces();
  const i = list.findIndex((x) => Math.abs(x.lat - current.lat) < 0.001 && Math.abs(x.lon - current.lon) < 0.001);
  if (i >= 0) { removePlace(i); renderPlace(); return; }
  const def = current.source === "gps" ? (lang === "en" ? "Home" : "บ้าน") : (current.name || placeLabel(current.place, lang));
  // an in-app WebView without a prompt panel answers null at once (WKWebView): save under the default name, and say so
  const t0 = Date.now();
  let name = null;
  try { name = window.prompt(t("namePrompt"), def); } catch { /* no prompts here */ }
  if (name == null && Date.now() - t0 > 300) return; // the person cancelled
  savePlace({ name: (name || "").trim() || def, lat: current.lat, lon: current.lon });
  renderPlace();
  if (name == null) { say(t("savedAs", { n: def })); setTimeout(() => say(""), 3000); }
});
/** The link to share: a GPS fix or a saved place goes by its subdistrict code only (#t=100101), so a family group
 *  sees the subdistrict, never the house (the UX scout §4c.6); a searched public place keeps its rounded point. */
function shareUrl() {
  const base = `${location.origin}${location.pathname}`;
  if ((current.source === "gps" || current.source === "saved" || current.source === "tambon") && current.place) return `${base}#t=${current.place.code}`;
  // a searched street or landmark keeps its rounded point and name
  const r = rounded(current.lat, current.lon);
  return `${base}#p=${r.lat},${r.lon}${current.name ? `,${encodeURIComponent(current.name)}` : ""}`;
}
const shareName = () => (current.name && current.source === "search" ? current.name : placeLabel(current.place, lang));
/** The share text with its own time and the five elements (assess.shareMessage); `url` null for navigator.share,
 *  which takes the link separately. */
function shareText(url = null) {
  const r = bundle ? assess(bundle, lang, IPE) : null;
  const d = new Date(bundle?.now || Date.now()).toLocaleString(lang === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  return shareMessage(r, { name: shareName(), when: d, url, lang });
}
$("#share").addEventListener("click", async () => {
  if (!current) return;
  const url = shareUrl();
  const text = shareText();
  // LINE's Android WebView has no Web Share: send it the way "ส่งใน LINE" does (T2)
  if (!navigator.share && inLine()) { $("#line").click(); return; }
  try {
    if (navigator.share) await navigator.share({ title: t("brand"), text, url });
    else { await navigator.clipboard.writeText(shareText(url)); say(t("copied")); setTimeout(() => say(""), 2500); }
  } catch (e) {
    if (e && e.name === "AbortError") return; // the person closed the share sheet
    say(`${t("copyFail")} ${url}`); // never silent: the link to copy by hand
  }
});
$("#line").addEventListener("click", () => {
  if (!current) return;
  // LINE's share URL scheme (developers.line.biz, "Using LINE URL scheme"; https://line.me/R/share answered 302 on 23 Oct 2026)
  window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText(shareUrl()))}`, "_blank", "noopener");
});
$("#lang").addEventListener("click", () => {
  lang = lang === "en" ? "th" : "en";
  t = makeT(lang);
  try { localStorage.setItem("dn:lang", lang); } catch { /* ignore */ }
  applyStatic();
  if (current) { renderPlace(); render(false); }
  if ($("#q").value.trim().length >= 2) onInput();
});
$("#bigger").addEventListener("click", () => {
  const on = !document.documentElement.classList.contains("bigger");
  document.documentElement.classList.toggle("bigger", on);
  $("#bigger").setAttribute("aria-pressed", String(on));
  try { localStorage.setItem("dn:bigger", on ? "1" : ""); } catch { /* ignore */ }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && current && Date.now() - lastLoad > 15 * 60e3) load();
});
window.addEventListener("hashchange", fromHash);
// ⓘ: show or hide its text (touch has no hover, so no tooltips)
document.addEventListener("click", (e) => {
  const b = e.target.closest?.(".info");
  if (!b) return;
  e.preventDefault();
  const box = document.getElementById(b.getAttribute("aria-controls"));
  const on = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(on));
  if (box) box.hidden = !on;
});
// a link to a hazard opens its row and scrolls to it, keeping the place's #t= in the address bar: "#card-pm25" there
// made LINE's own Share send the welcome page (T9); the row takes focus so a screen reader follows
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href^="#card-"]');
  if (!a) return;
  const el = document.getElementById(a.getAttribute("href").slice(1));
  if (!el) return;
  e.preventDefault();
  if (el.tagName === "DETAILS") el.open = true;
  let still = false;
  try { still = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* old browsers */ }
  el.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
});

function fromHash() {
  const tm = location.hash.match(/^#t=(\d{6})$/);
  if (tm) {
    loadTambon().then(() => {
      const row = tambon.t.find((r) => r[0] === +tm[1]);
      if (row) choose({ lat: row[3], lon: row[4], name: "", source: "tambon", code: row[0] });
      else { document.documentElement.classList.remove("opening"); say(t("badCode")); }
    });
    return true;
  }
  const m = location.hash.match(/^#p=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.*))?$/);
  if (!m) return false;
  const name = m[3] ? decodeURIComponent(m[3]).slice(0, 60) : "";
  choose({ lat: +m[1], lon: +m[2], name, source: "hash" });
  return true;
}

// ---------- start ----------
try { if (localStorage.getItem("dn:bigger")) { document.documentElement.classList.add("bigger"); $("#bigger").setAttribute("aria-pressed", "true"); } } catch { /* ignore */ }
applyStatic();
renderSaved();
if (!fromHash()) {
  // the habit: open the app, see home. The first saved place, else the last place looked at.
  const saved = loadPlaces();
  let last = null;
  try { last = JSON.parse(localStorage.getItem("dn:last") || "null"); } catch { /* ignore */ }
  if (saved.length) choose({ ...saved[0], source: "saved" });
  else if (last && typeof last.lat === "number") choose({ ...last, source: "saved" });
}
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

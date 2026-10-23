// The page: choose a point (GPS, search, a saved place or a #p= link), fetch every source in parallel, and draw
// the cards as each answer arrives. All judgement is in assess.js; this file only fetches and draws.

import { inThailand, nearestTambon, placeLabel, rounded } from "./geo.js";
import { get, urls, SOURCES } from "./sources.js";
import { assess, timeText, localOf } from "./assess.js";
import { localSearch, hitLabel, osmSearch, loadPlaces, savePlace, removePlace } from "./places.js";
import { STR, makeT, PRE_WHAT, PRE_ICON } from "./i18n.js";
import { scale } from "./levels.js";
import { dayName } from "./assess.js";
import { IPE } from "./ipe.js";

export const VERSION = "0.2.0";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LV = (l) => (l == null || l < 0 ? "none" : scale(l).key);

let lang = "th";
try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem("dn:lang") || "th"; } catch { /* storage blocked */ }
if (lang !== "en") lang = "th";
let t = makeT(lang);
let tambon = null;
let current = null; // {lat, lon, name, source, place}
let bundle = null;
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
  document.title = `${t("brand")}${lang === "en" ? "" : " · Disaster Now"}`;
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
function locate() {
  if (!navigator.geolocation) { say(t("geoNone")); lineHint(); $("#q").focus(); return; }
  say(t("locating"));
  navigator.geolocation.getCurrentPosition(
    (pos) => { say(""); choose({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: t("gpsLabel"), source: "gps", acc: pos.coords.accuracy }); },
    (err) => {
      say(err.code === 1 ? t("geoDenied") : t("geoFail"));
      lineHint();
      $("#q").focus();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
  );
}

/** LINE's in-app browser: offer the phone's own browser, where location usually works. */
function lineHint() {
  if (!/\bLine\//.test(navigator.userAgent)) return;
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
  $("#welcome").hidden = true;
  $("#report").hidden = false;
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
  const files = idx.ok ? idx.data.files || {} : {};
  const want = { warnings: "warnings.json", hotspots: "hotspots.json", tmdQuakes: "tmd_quakes.json", storms: "storms.json", a4t: "air4thai.json" };
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
function renderPlace() {
  const p = current;
  const label = p.place ? placeLabel(p.place, lang) : "";
  // GPS: the subdistrict is the headline, "my location" the subtitle; a named place keeps its name on top
  const named = p.source !== "gps" && p.name && p.name !== label ? p.name : "";
  const r2 = rounded(p.lat, p.lon);
  $("#place-name").textContent = named || label || `${r2.lat}, ${r2.lon}`;
  const acc = p.source === "gps" && p.acc ? ` (±${p.acc < 1000 ? `${Math.round(p.acc)} ${lang === "en" ? "m" : "ม."}` : `${(p.acc / 1000).toFixed(1)} ${lang === "en" ? "km" : "กม."}`})` : "";
  $("#place-sub").innerHTML = esc([p.source === "gps" ? `📍 ${t("gpsLabel")}${acc}` : "", named ? `${t("nearT")} ${label}` : "",
    p.source === "gps" ? "" : `${r2.lat}, ${r2.lon}`].filter(Boolean).join(" · "))
    + (p.source === "gps" ? ` · <button type="button" class="linkbtn" id="notthis">${esc(t("notThis"))}</button>` : "");
  $("#notthis")?.addEventListener("click", () => { $("#q").focus(); say(t("pickYourself")); });
  const saved = loadPlaces().some((x) => Math.abs(x.lat - p.lat) < 0.001 && Math.abs(x.lon - p.lon) < 0.001);
  $("#save").innerHTML = `${saved ? "★" : "☆"} <span>${esc(saved ? t("saved") : t("save"))}</span>`;
  renderSaved();
}

function render(first) {
  if (!bundle) return;
  const r = assess(bundle, lang, IPE);
  // verdict: the level by what to do, the worst hazard in the agency's word, its one sourced action
  const v = r.verdict;
  const vEl = $("#verdict");
  vEl.className = `verdict lv-${first && v.level < 0 ? "none" : LV(v.level)}`;
  const chip = (i) => `<a class="vchip lv-${LV(i.level)}" href="#card-${i.id}">${i.icon} ${esc(i.short)}: <b>${esc(i.word)}</b></a>`;
  const head = v.worst ? `${v.worst.icon} ${esc(v.worst.short)}: ${esc(v.worst.word)}${v.worst.value ? ` · ${esc(v.worst.value)}` : ""}`
    : v.warning ? `📢 ${esc(v.warning.headline || v.warning.event)}` : v.level === 0 ? esc(t(v.complete ? "allQuiet" : "quietSoFar")) : "";
  vEl.innerHTML = first && v.level < 0 ? `<div class="vtitle">${esc(t("loading"))}</div>`
    : `<div class="vtop"><span class="meter" aria-hidden="true">${meter(v.level)}</span><span class="vname">${esc(v.name)}</span></div>`
      + (head ? `<div class="vhead">${head}</div>` : "")
      + (v.action ? `<div class="vact">👉 ${esc(v.action.text)} <span class="muted small">(${esc(v.action.src.map((x) => x.kind === "official" ? t("official") : t("news")).filter((x, i, a) => a.indexOf(x) === i).join(", "))})</span></div>` : "")
      // a mask line never goes out without the under-2 line (บ้านรอดไหม F129; cross-check H1)
      + (v.action?.baby ? `<div class="vact baby">👶 ${esc(v.action.baby.text)}</div>` : "")
      + (v.others.length ? `<div class="vchips"><span class="muted small">${esc(t("alsoL"))}</span>${v.others.map(chip).join("")}</div>` : "")
      + (v.missing.length ? `<div class="vmiss">${esc(t("missing"))} ${esc(v.missing.join(", "))}</div>` : "");
  // tiles: every hazard at a glance, in a fixed order
  $("#tiles").innerHTML = r.cards.map((c) => `<a class="tile lv-${LV(c.level)}" href="#card-${c.id}">
      <span class="tt"><span aria-hidden="true">${c.icon}</span> ${esc(c.short)}</span>
      <span class="tw">${esc(c.level < 0 ? (c.error ? t("failed") : t("noData")) : c.word || "")}</span>
      ${c.value ? `<span class="tv">${esc(c.value)}</span>` : ""}
      <span class="meter" aria-label="${esc(c.level < 0 ? t("noData") : scale(c.level)[lang])}">${meter(c.level)}</span></a>`).join("");
  // official warnings
  const when = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? timeText(localOf(Date.parse(iso)), bundle.now, lang) : "");
  $("#warnings").innerHTML = r.warnings.map((w) => `<div class="warn lv-${LV(w.level)}"><b>${esc(t("officialNow"))}</b><br>`
    + `${esc(lang === "en" ? `${w.event || ""} (in Thai)` : w.headline || w.event)}`
    + `<br><span class="small">${w.sent ? `${esc(t("issued"))} ${esc(when(w.sent))}` : ""}${w.expires ? ` · ${esc(t("until"))} ${esc(when(w.expires))}` : ""}</span>`
    + `${w.instruction ? `<p>${esc(w.instruction)}</p>` : ""}`
    + `${w.description ? `<details><summary>${esc(t("readNotice"))}</summary><p class="small">${esc(w.description)}</p></details>` : ""}`
    + `${w.link || w.web ? `<a class="how" href="${esc(w.link || w.web)}" target="_blank" rel="noopener">${esc(t("fullNotice"))} →</a>` : ""}</div>`).join("")
    + (bundle.warnings || !bundle.liveDone ? "" : `<div class="warn lv-none">${esc(t("warnUnknown"))}</div>`);
  // pre-warnings
  const pre = r.pre.filter((x) => PRE_WHAT[x.hazard]?.[x.level]);
  $("#pre-wrap").hidden = !bundle.ens && !pre.length;
  const official = r.warnings.map((w) => `<li class="lv-${LV(w.level)}">📢 ${esc(lang === "en" ? `TMD: ${w.event || ""}` : `กรมอุตุฯ: ${w.headline || w.event}`)}${w.expires ? ` · ${esc(t("until"))} ${esc(when(w.expires))}` : ""}</li>`).join("");
  $("#pre").innerHTML = official + (pre.length ? pre.map((x) => {
    const what = PRE_WHAT[x.hazard][x.level][lang];
    const date = x.date || r.outlook[x.day]?.date;
    const day = date ? dayName(x.day, date, lang) : "";
    const key = x.chance != null ? "preItem" : "preItemNoP";
    return `<li class="lv-${LV(x.level)}">${esc(t(key, { icon: PRE_ICON[x.hazard], what, day, p: x.chance != null ? chancePct(x.chance) : "" }))}</li>`;
  }).join("") : official ? "" : `<li class="lv-ok">${esc(t("preNone"))}</li>`);
  // detail cards in the same fixed order as the tiles
  $("#cards").innerHTML = r.cards.map(cardHtml).join("");
  // outlook table
  $("#outlook").innerHTML = r.outlook.length ? outlookHtml(r.outlook) : "";
  // profile
  $("#profile-wrap").hidden = !r.profile.length;
  $("#profile").innerHTML = r.profile.map((p) => `<li><span aria-hidden="true">${p.icon}</span> ${esc(p.text)}</li>`).join("");
  const rp = rounded(current.lat, current.lon);
  $("#updated").textContent = t("updated", { t: new Date(bundle.now).toLocaleTimeString(lang === "en" ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }), m: r.members || "–", p: `${rp.lat}, ${rp.lon}` });
}

/** ●●○○: the level counted in dots, so it reads without colour; dashes for no data. */
const meter = (l) => (l == null || l < 0 ? "– – – –" : "●".repeat(l + 1) + "○".repeat(3 - Math.min(l, 3)));

const chancePct = (p) => (p < 0.1 ? (lang === "en" ? "under 10%" : "ไม่ถึง 10%") : p > 0.9 ? (lang === "en" ? "over 90%" : "เกิน 90%") : `${Math.round(p * 10) * 10}%`);

function cardHtml(c) {
  const lv = LV(c.level);
  const word = c.level < 0 ? (c.error ? t("failed") : STR.missing[lang].replace(":", "")) : c.word;
  const days = c.days ? `<div class="days">${c.days.map((d) => `<span class="day lv-${LV(d.level)}"><b>${esc(d.name)}</b> ${esc(d.text)}${d.sub ? `<small>${esc(d.sub)}</small>` : ""}</span>`).join("")}</div>` : "";
  const age = (s) => (s.ageH != null && s.ageH >= 1 ? ` <span class="old">⏱ ${esc(t("hoursOld", { h: Math.round(s.ageH) }))}</span>` : "");
  const src = c.src.length ? `<div class="src">${esc(t("source"))}: ${c.src.map((s) => `${esc(s.name)}${s.time ? ` · ${esc(s.time)}` : ""}${age(s)}${s.model ? ` <span class="tag">${esc(t("model"))}</span>` : ""}`).join(" | ")}</div>` : "";
  const links = [c.link && `<a class="how" href="${esc(c.link.href)}${lang === "en" ? "" : ""}" target="_blank" rel="noopener">${esc(c.link.text)} →</a>`,
    c.more && `<a class="how" href="${esc(c.more.href)}" target="_blank" rel="noopener">${esc(c.more.text)} →</a>`].filter(Boolean).join("");
  return `<article class="card lv-${lv}" id="card-${c.id}">
    <header><span class="ic" aria-hidden="true">${c.icon}</span><h3>${esc(c.title)}</h3><span class="pill lv-${lv}">${esc(word || "")}<span class="meter" aria-hidden="true">${meter(c.level)}</span></span></header>
    ${c.value ? `<div class="val">${esc(c.value)}</div>` : ""}
    ${c.action ? `<p class="act">👉 ${esc(c.action.text)}</p>` : ""}
    ${c.action?.baby ? `<p class="act baby">👶 ${esc(c.action.baby.text)}</p>` : ""}
    ${c.lines && c.lines.length ? `<ul class="lines">${c.lines.filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
    ${c.error && c.level < 0 ? `<p class="muted small">${esc(t("failed"))} (${esc(errWord(c.error))})</p>` : ""}
    ${days}
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
    ${src}
    ${links ? `<div class="acts">${links}</div>` : ""}
  </article>`;
}

/** A fetch error in words a visitor reads (not "timeout", "HTTP 500"). */
function errWord(e) {
  const s = String(e || "");
  const m = s.match(/HTTP (\d+)/);
  if (/timeout|abort/i.test(s)) return t("errTimeout");
  if (m) return t("errHttp", { c: m[1] });
  return t("errNet");
}

function outlookHtml(rows) {
  const cell = (x, sub) => (x ? `<td class="lv-${LV(x.level)}">${esc(x.text)}${sub && x.sub ? `<small>${esc(t("heavyChance"))} ${esc(x.sub)}</small>` : ""}</td>` : "<td class='lv-none'>–</td>");
  return `<table class="outlook"><thead><tr><th></th>${rows.map((r) => `<th>${esc(r.name)}</th>`).join("")}</tr></thead><tbody>
    <tr><th>${esc(t("rowHeat"))}</th>${rows.map((r) => cell(r.heat)).join("")}</tr>
    <tr><th>${esc(t("rowRain"))}</th>${rows.map((r) => cell(r.rain, true)).join("")}</tr>
    <tr><th>${esc(t("rowPm"))}</th>${rows.map((r) => cell(r.pm25)).join("")}</tr>
    <tr><th>${esc(t("rowUv"))}</th>${rows.map((r) => cell(r.uv)).join("")}</tr>
    <tr><th>${esc(t("rowGust"))}</th>${rows.map((r) => cell(r.gust)).join("")}</tr>
  </tbody></table>`;
}

// ---------- saved places ----------
function renderSaved() {
  const list = loadPlaces();
  const el = $("#saved");
  el.hidden = !list.length;
  el.innerHTML = list.map((p, i) => `<span class="sp"><button type="button" class="btn chip" data-i="${i}">⭐ ${esc(p.name)}</button><button type="button" class="x" data-x="${i}" aria-label="${esc(t("remove"))} ${esc(p.name)}">×</button></span>`).join("");
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
  ul.innerHTML = hits.map((h, i) => `<li><button type="button" class="hit" data-i="${i}">📌 ${esc(hitLabel(h, lang))}</button></li>`).join("")
    + `<li><button type="button" class="hit osm" id="osm">${esc(t("osmBtn", { q }))}</button><div id="osm-res"></div></li>`;
  ul.querySelectorAll(".hit[data-i]").forEach((b) => b.addEventListener("click", () => {
    const h = hits[+b.dataset.i];
    choose(h.kind === "t" ? { lat: h.lat, lon: h.lon, name: "", source: "tambon", code: h.code } : { lat: h.lat, lon: h.lon, name: hitLabel(h, lang), source: "search" });
  }));
  $("#osm").addEventListener("click", () => osm(q));
}

async function osm(q) {
  const box = $("#osm-res") || $("#results");
  $("#results").hidden = false;
  box.innerHTML = `<p class="muted">${esc(t("osmWait"))}</p>`;
  try {
    const res = await osmSearch(q, lang, fetch, await geocoderOrder());
    box.innerHTML = res.length ? res.map((r, i) => `<button type="button" class="hit" data-o="${i}">📍 ${esc(r.name)} <span class="muted">${esc(r.area)}</span></button>`).join("") + `<p class="muted small">${esc(t("osmCredit"))}</p>`
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
    const h = hits[0];
    choose(h.kind === "t" ? { lat: h.lat, lon: h.lon, name: "", source: "tambon", code: h.code } : { lat: h.lat, lon: h.lon, name: hitLabel(h, lang), source: "search" });
  } else osm(q);
});
$("#refresh").addEventListener("click", () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith("dn:")).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } if (current) load(); });
$("#save").addEventListener("click", () => {
  if (!current) return;
  const list = loadPlaces();
  const i = list.findIndex((x) => Math.abs(x.lat - current.lat) < 0.001 && Math.abs(x.lon - current.lon) < 0.001);
  if (i >= 0) { removePlace(i); renderPlace(); return; }
  const def = current.source === "gps" ? (lang === "en" ? "Home" : "บ้าน") : (current.name || placeLabel(current.place, lang));
  const name = window.prompt(t("namePrompt"), def);
  if (name == null) return;
  savePlace({ name: name.trim() || def, lat: current.lat, lon: current.lon });
  renderPlace();
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
function shareText() {
  const r = bundle ? assess(bundle, lang, IPE) : null;
  const v = r?.verdict;
  const d = new Date(bundle?.now || Date.now()).toLocaleString(lang === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  const what = v && v.level >= 0 ? `${v.name}${v.worst ? ` · ${v.worst.short}: ${v.worst.word}` : ""}` : "";
  return t("shareText", { n: shareName(), d, v: what ? ` ${what}` : "" });
}
$("#share").addEventListener("click", async () => {
  if (!current) return;
  const url = shareUrl();
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ title: t("brand"), text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); say(t("copied")); setTimeout(() => say(""), 2500); }
  } catch { /* the person closed the share sheet */ }
});
$("#line").addEventListener("click", () => {
  if (!current) return;
  // LINE's share URL scheme (developers.line.biz, "Using LINE URL scheme"; https://line.me/R/share answered 302 on 23 Oct 2026)
  window.open(`https://line.me/R/share?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`, "_blank", "noopener");
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

function fromHash() {
  const tm = location.hash.match(/^#t=(\d{6})$/);
  if (tm) {
    loadTambon().then(() => {
      const row = tambon.t.find((r) => r[0] === +tm[1]);
      if (row) choose({ lat: row[3], lon: row[4], name: "", source: "tambon", code: row[0] });
      else say(t("badCode"));
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

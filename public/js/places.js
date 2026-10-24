// Finding a place: instant matches from the 7,425 subdistricts on the phone, then OpenStreetMap on Enter for
// sois, roads and landmarks — FloodWatch's pattern (its geocode.py and app.js placeSearch, D-032), without a
// server: the browser asks Nominatim only when the person presses search, never per keystroke (Nominatim's usage
// policy forbids autocomplete). Queries are never logged or stored by this site; it has no server.

import { describe, km } from "./geo.js";

const PREFIX = /^(ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|แขวง|เขต|กิ่งอำเภอ)\s*/;
export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFC").replace(/\s+/g, "").replace(/[.,]/g, "");
}
const strip = (s) => String(s || "").trim().replace(PREFIX, "");

let index = null;
/** Build the search index once: subdistricts, districts and provinces. A district or province opens at its seat, a
 *  subdistrict (`seat`): the district's xx01 (its lowest code where xx01 no longer exists, 14 of 928) and the
 *  province's pv0101, the capital's town subdistrict (ศรีภูมิ, ตลาดใหญ่, ในเมือง …). The geographic centre it used before
 *  put "เชียงใหม่" on a mountain 40 km from the city, at 994 m (visitor audit U2). */
export function buildIndex(data) {
  if (index && index.data === data) return index;
  const rows = [];
  const byCode = new Map();
  const first = new Map(); // district → its lowest subdistrict code
  for (const t of data.t) {
    const p = describe(data, t);
    rows.push({ kind: "t", key: norm(t[1]) + "|" + norm(t[2]), name: p, lat: t[3], lon: t[4], code: t[0] });
    byCode.set(t[0], t);
    const a = Math.floor(t[0] / 100);
    if (!first.has(a) || t[0] < first.get(a)) first.set(a, t[0]);
  }
  const seatOf = (code) => byCode.get(code);
  for (const [code, low] of first) {
    const [th, en] = data.a[String(code)];
    const s = seatOf(code * 100 + 1) || seatOf(low);
    rows.push({ kind: "a", key: norm(th) + "|" + norm(en), name: describe(data, s), lat: s[3], lon: s[4], code, seat: s[0] });
  }
  for (const [code, v] of Object.entries(data.p)) {
    const low = Math.min(...[...first.values()].filter((c) => Math.floor(c / 10000) === +code));
    const s = seatOf(+code * 10000 + 101) || seatOf(low);
    rows.push({ kind: "p", key: norm(v[0]) + "|" + norm(v[1]), name: { province: { th: v[0], en: v[1] }, pv: +code }, lat: s[3], lon: s[4], code: +code, seat: s[0] });
  }
  index = { data, rows };
  return index;
}

/** What choosing a hit opens: always a subdistrict by its code, so the header is drawn in the page's language and a
 *  shared link carries `#t=` (U2, U20). */
export const hitPlace = (h) => ({ lat: h.lat, lon: h.lon, name: "", source: "tambon", code: h.kind === "t" ? h.code : h.seat });

/** Local matches for what was typed: whole words first ("บางกะปิ" before "บางกะปิใต้"), provinces and districts
 *  before subdistricts, at most `limit`. Several words narrow down: "บางรัก กรุงเทพ". */
export function localSearch(data, q, limit = 8) {
  const words = String(q || "").trim().split(/\s+/).map(strip).map(norm).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const { rows } = buildIndex(data);
  const first = words[0];
  const rest = words.slice(1);
  const hits = [];
  for (const r of rows) {
    if (!r.key.includes(first)) continue;
    if (rest.length) {
      const ctx = norm([r.name.amphoe?.th, r.name.amphoe?.en, r.name.province?.th, r.name.province?.en].join("|"));
      if (!rest.every((w) => ctx.includes(w) || r.key.includes(w))) continue;
    }
    const exact = r.key.split("|").some((k) => k === first);
    hits.push({ r, score: (exact ? 0 : 10) + { p: 0, a: 1, t: 2 }[r.kind] });
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map(({ r }) => r);
}

/** Label of a local hit: "ต.ลาดพร้าว อ.ลาดพร้าว กรุงเทพมหานคร". */
export function hitLabel(r, lang = "th") {
  const n = r.name;
  const bkk = n.pv === 10;
  if (lang === "en") {
    if (r.kind === "p") return `${n.province.en}, town centre`;
    if (r.kind === "a") return `${n.amphoe.en}, ${n.province.en}`;
    return `${n.tambon.en}, ${n.amphoe.en}, ${n.province.en}`;
  }
  if (r.kind === "p") return `จังหวัด${n.province.th} (ตัวเมือง)`;
  if (r.kind === "a") return `${bkk ? "เขต" : "อ."}${n.amphoe.th} ${bkk ? "" : "จ."}${n.province.th}`;
  return `${bkk ? "แขวง" : "ต."}${n.tambon.th} ${bkk ? "เขต" : "อ."}${n.amphoe.th} ${bkk ? "" : "จ."}${n.province.th}`;
}

// How people write Thai addresses vs how OSM names them (FloodWatch geocode.py ALIASES, 2026-09-26).
const ALIASES = [[/(^|\s)ซ\.\s*/g, "$1ซอย"], [/(^|\s)ถ\.\s*/g, "$1ถนน"], [/พหล(?!โยธิน)/g, "พหลโยธิน"]];
/** Queries to send: a name ending in a number without "ซอย" is usually a soi ("ลาดพร้าว 71" is "ซอยลาดพร้าว 71"). */
export function variants(q) {
  let s = String(q || "").split(/\s+/).join(" ").trim();
  for (const [pat, rep] of ALIASES) s = s.replace(pat, rep);
  const out = [s];
  if (/\d+$/.test(s) && !s.startsWith("ซอย") && !s.startsWith("ถนน")) out.push(`ซอย${s}`);
  return out;
}

/** Nominatim jsonv2 rows → [{name, area, lat, lon}] (FloodWatch geocode.parse). */
export function parseNominatim(rows) {
  const out = [];
  for (const r of rows || []) {
    const parts = String(r.display_name || "").split(",").map((p) => p.trim()).filter(Boolean);
    const lat = Math.round(Number(r.lat) * 1e5) / 1e5;
    const lon = Math.round(Number(r.lon) * 1e5) / 1e5;
    if (!parts.length || Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const area = parts.slice(1, 4).filter((p) => !/^\d+$/.test(p) && p !== "ประเทศไทย" && p !== "Thailand").join(", ");
    if (out.some((o) => o.name === parts[0] && Math.abs(o.lat - lat) < 0.001 && Math.abs(o.lon - lon) < 0.001)) continue;
    out.push({ name: parts[0], area, lat, lon });
  }
  return out;
}

/** Photon GeoJSON → [{name, area, lat, lon}]. Photon has no Thai language option (lang=th is refused), but its
 *  default answer is OSM's local name, which is Thai in Thailand (UX scout §4b, 23 Oct 2026). */
export function parsePhoton(j) {
  return ((j && j.features) || []).map((f) => {
    const p = f.properties || {};
    const [lon, lat] = f.geometry?.coordinates || [];
    const name = p.name || [p.street, p.housenumber].filter(Boolean).join(" ");
    const area = [p.district, p.city, p.county, p.state].filter((x, i, a) => x && a.indexOf(x) === i && x !== name).slice(0, 3).join(", ");
    return { name, area, lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5 };
  }).filter((r) => r.name && !Number.isNaN(r.lat) && !Number.isNaN(r.lon) && r.lat > 5 && r.lat < 21 && r.lon > 97 && r.lon < 106);
}

// Which service answers a street search: config.json → geocoder ("photon" | "nominatim" | "floodwatch" | "off"), so
// komoot or the OSMF can be obeyed at once without a code change (Nominatim's policy asks for that switch).
const GEOCODERS = {
  photon: (v) => [`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&limit=6&bbox=97.3,5.6,105.7,20.5&lat=13.75&lon=100.5`, parsePhoton],
  nominatim: (v, lang) => [`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=th&accept-language=${lang === "en" ? "en" : "th"}&q=${encodeURIComponent(v)}`, parseNominatim],
  // FloodWatch's own /api/geocode (throttled to Nominatim's limit, cached, queries never logged: its D-032), once it
  // sends CORS for this site: docs/INTEGRATION.md
  floodwatch: (v) => [`https://flood.autobahn.bot/api/geocode?q=${encodeURIComponent(v)}`, (j) => (j?.results || [])],
};

let lastCall = 0;
/** Street-level search on Enter only (never per keystroke), FloodWatch's soi variants, ≥ 1.1 s between calls,
 *  Thailand only; Photon first, Nominatim if Photon fails. */
export async function osmSearch(q, lang = "th", fetchImpl = globalThis.fetch, order = ["photon", "nominatim"]) {
  const res = [];
  let lastErr = null;
  for (const name of order) {
    if (!GEOCODERS[name]) continue;
    try {
      for (const v of variants(q)) {
        const wait = lastCall + 1100 - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastCall = Date.now();
        const [url, parse] = GEOCODERS[name](v, lang);
        const r = await fetchImpl(url, { referrerPolicy: "strict-origin-when-cross-origin" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        for (const h of parse(await r.json())) {
          if (!res.some((x) => x.name === h.name && km(x.lat, x.lon, h.lat, h.lon) < 0.1)) res.push(h);
        }
      }
      lastErr = null;
      break;
    } catch (e) { lastErr = e; }
  }
  if (lastErr && !res.length) throw lastErr;
  const wanted = new Set(variants(q).map((v) => v.replace(/\s/g, "")));
  return res.sort((a, b) => !wanted.has(a.name.replace(/\s/g, "")) - !wanted.has(b.name.replace(/\s/g, ""))).slice(0, 6);
}

// ---------- saved places (on this phone only) ----------
const KEY = "dn:places";
export function loadPlaces(store = globalThis.localStorage) {
  try { return JSON.parse(store.getItem(KEY) || "[]").filter((p) => p && typeof p.lat === "number"); } catch { return []; }
}
export function savePlace(p, store = globalThis.localStorage) {
  const list = loadPlaces(store).filter((x) => Math.abs(x.lat - p.lat) > 0.001 || Math.abs(x.lon - p.lon) > 0.001);
  list.unshift({ name: String(p.name || "").slice(0, 40), lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4 });
  try { store.setItem(KEY, JSON.stringify(list.slice(0, 5))); } catch { /* full or blocked */ }
  return list.slice(0, 5);
}
export function removePlace(i, store = globalThis.localStorage) {
  const list = loadPlaces(store);
  list.splice(i, 1);
  try { store.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}

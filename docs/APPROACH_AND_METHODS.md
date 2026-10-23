# Approach and methods

How Disaster Now was researched, built and checked, and how each hazard is computed. The numbers behind the methods are in [KNOWLEDGE.md](KNOWLEDGE.md); the forecast skill is in [MODELS.md](MODELS.md).

## 1. How the work was done (23 Oct 2026, one agent session)

1. **Learn from the owner's two apps first.** FloodWatch (`flood2026-research`) for reading Thai agency APIs (its evidence rule, its time rules, its bank and point rules, its place search); Hazard-huntz for the "around my home" research it had already done on 21 Oct (113 live calls, docs/08 and docs/09) and its sourced advice.
2. **Re-test the sources live** from this session's host (26 calls at 19:47 UTC) before using any, recording status, size and CORS.
3. **Four researchers in parallel** (independent agents with written briefs): Thai thresholds with evidence; data sources the earlier research hadn't covered; UX of apps people open often, and Thai readers; forecast validation against observations. Their full records are in [research/](research/).
4. **Build** the page and its tests while they worked, then adopt their findings (the action-named levels, Photon before Nominatim, codes instead of coordinates in shared links, JMA storms, the researched bands, the AWW12 intensity equation).
5. **Check** with unit tests on saved live responses, a scripted visitor walk in headless Chromium, a gauge-by-gauge cross-check against FloodWatch, and two more independent agents: a visitor audit (personas, the UX scout's 12-task script) and an output audit (every number on the page against its source, recomputed).

## 2. Architecture

```
 the phone                                             the collector (optional, any small server)
 ─────────                                             ──────────────────────────────────────────
 GPS fix ─┐                                            every 15 min: TMD CAP, TMD quakes, TMD storms,
 search ──┼─► point (lat, lon) ─► nearest of 7,425     NASA FIRMS, Air4Thai (certificate fixed)
 #t= / #p=┘   subdistrict centres (data/tambon.json)        │ writes data/live/*.json (static, CORS)
                     │                                       ▼
                     ├─► rounded to ~1 km ─► Open-Meteo ensemble + air quality, GISTDA, DMR
                     ├─► province code ─► ThaiWater rain and levels, TMD warnings (live file)
                     ├─► subdistrict code ─► HII flash-flood list, DMR fault list
                     └─► nothing ─► EMSC, USGS, GDACS, JMA (regional lists, distance on the phone)
                                  │
                     assess.js: one pure function from all answers to tiles, verdict, outlook
```

- **No server of its own.** Every call goes from the phone to the source, or to the collector's static files. Load doesn't grow on any server of ours with visitors; each visitor's own IP carries Open-Meteo's per-IP limit.
- **Progressive:** twelve calls start at once; the page redraws as each answers (12 s timeout each); a failure is one grey tile.
- **Pure logic, tested:** `geo`, `heat`, `levels`, `outlook`, `airq`, `water`, `quake`, `events`, `places`, `actions` and `assess` are pure modules; `main.js` only fetches and draws; `sources.js` holds every URL.

## 3. The point, the place and privacy

- **GPS** (`navigator.geolocation`, on a tap only, low accuracy, 10 min cache) or **search** (instant on 7,425 subdistricts, 928 districts and 77 provinces on the phone; Enter → Photon, then Nominatim, with FloodWatch's soi variants) or a **link** (`#t=` code, `#p=` point) or a **saved place**.
- **The subdistrict** is the nearest centre (HDX COD-AB), named "แขวง/เขต" in Bangkok, "ต./อ./จ." elsewhere, with "ไม่ใช่ตำบลนี้?" after a GPS fix.
- **What leaves the phone:** a point rounded to 2 decimals (~1.1 km) to Open-Meteo, GISTDA and the DMR; a province code to ThaiWater; a subdistrict code to the DMR's fault list; the typed text to Photon/Nominatim when the person presses search; nothing else.

## 4. Each hazard

| Tile | Now | 3-day outlook | Level |
|---|---|---|---|
| 🌧️ Rain | nearest ThaiWater gauge ≤ 10 km read ≤ 3 h ago (FloodWatch's measured_rain) | ensemble: each member's rain summed over the next 24 h and each calendar day; median, 10–90 % range, share of members > 35 mm and > 90 mm | the higher of the measured 24 h band and the forecast window's level (TMD rain words, one app level below each TMD class) |
| 🌊 Flood | ThaiWater gauges ≤ 20 km judged by FloodWatch's bank rule; the point's level is FloodWatch's area index (IDW of the up-to-3 gauges within 3 km, else within 8 km; in Bangkok and its five neighbours canals only); HII's flash-flood list by subdistrict code | — (FloodWatch has 24–72 h; linked) | area category; HII listing → at least เตรียมตัว |
| 😷 PM2.5 | nearest PCD station ≤ 15 km, ≤ 3 h old (24-h mean); else GISTDA's estimate at the point | CAMS daily means × (measured ÷ CAMS over the past 24 h, clipped 0.5–3) | PCD 2023 bands |
| 🌡️ Heat | heat index (NWS: Steadman, then Rothfusz with its adjustments) per member per hour from the member's own T and RH | the day's max per member; median, range, share ≥ 42 °C | DOH/TMD bands on the median, lifted by the chance rule |
| 🌏 Earthquakes | EMSC (region) + USGS (M4.5+) + TMD (collector), merged within 90 s and 100 km; AWW12 intensity at the point from magnitude and hypocentral distance | none: "พยากรณ์ล่วงหน้าไม่ได้" | the highest estimated MMI in the last 24 h (ShakeMap words); Andaman provinces: a watch line after an M ≥ 6.5 in the Indian Ocean within 6 h |
| 🔥 Fires | FIRMS VIIRS hotspots (nominal + high) from the collector, within 25 km | — | nearest within 10 km → ติดตามไว้, within 2 km → เตรียมตัว (the app's own) |
| 💨 Wind, storms | ensemble gusts (max per member) | the same per day | TMD's Beaufort words, grouped (the app's own); a storm (TMD track, JMA 70 % circle, GDACS) within 800 km → ติดตามไว้, 300 km → เตรียมตัว |
| ☀️ UV | CAMS UV index now (daylight 06–18) | the day's peak | WHO categories by WHO's advice tiers; from the value now, not the peak |
| ⛰️ Landslide | DMR risk villages within 3 km; rain measured and forecast | — | in a risk area: > 100 mm in 24 h (DMR's trigger; measured, or ≥ 50 % of members) → เตรียมตัว; heavy rain or ≥ 20 % → ติดตามไว้ |
| 🏭 Other pollution | nearest PCD station measuring PM10/O₃/CO/NO₂/SO₂ (the highest sub-index without PM2.5); else CAMS values, ungraded | — | PCD AQI bands |

**The chance rule** (`outlook.windowLevel`): a window's level is the highest level at least half the 51 members reach; if เตรียมตัว or worse is reached by at least 20 %, the window is at least ติดตามไว้. **Pre-warnings** list, by day, the cases where at least 20 % of members reach danger heat (≥ 42 °C), heavy or very heavy rain, or gale gusts (≥ 62 km/h), plus PM2.5 ≥ orange in the corrected outlook and an HII flash-flood listing.

**The verdict** takes the highest tile (and any TMD warning for the province), names the worst hazard in the agency's word with its one sourced action (บ้านรอดไหม's lines), lists the other tiles at ติดตามไว้ or above, and lists what has no data. With fewer than half the tiles answering it gives no verdict.

## 5. How it was checked

| Check | What it proves | Where |
|---|---|---|
| Unit tests (33) on responses saved from live calls | parsers, time rules, bands, the chance rule, FloodWatch's rules, the IPE, search, the collector's parsers, every string in two languages; page values equal source values for Bangkok | `test/*.test.mjs` |
| Visitor walk (23 checks) in headless Chromium, clock pinned | the flows: welcome → GPS → report; English; local and street search; saved place on reopen; 320 px with larger text; every source down; no page errors; tap targets ≥ 44 px; no horizontal scroll | `tools/smoke.mjs` |
| The same walk on the real sources | that today's live answers parse and read sensibly | `npm run smoke -- --live` |
| FloodWatch cross-check | gauge statuses agree with FloodWatch's (691 of 693) | `research/crosscheck_floodwatch.mjs` |
| GISTDA vs PCD | which PM2.5 to trust at a point | KNOWLEDGE §5 |
| Advice sync | lines and bands equal บ้านรอดไหม's | `tools/check-advice.mjs` |
| Independent visitor audit and output audit | a reading by agents who didn't build it | [research/visitor-audit-2026-10-23.md](research/visitor-audit-2026-10-23.md), [research/output-crosscheck-2026-10-23.md](research/output-crosscheck-2026-10-23.md) |
| Forecast validation (PM2.5 correction, felt intensity, heat and rain where archives allowed) | whether the outlook and its corrections beat persistence, on a disjoint sample | [MODELS.md](MODELS.md), `research/` |

## 6. Method rules carried from the sister projects

- **Choose earlier, score later, confirm on a disjoint sample; the newest season counts** (FloodWatch GUIDELINES §4).
- **"No record" is not "safe"** (Hazard-huntz docs/08 §4): a subdistrict not on the DMR's list may still slide; a quiet tile says "ยังไม่น่าห่วง", never "ปลอดภัย".
- **Old readings are common** (Hazard-huntz docs/09: 15 % of Air4Thai, 18 % of ThaiWater, 50 % of FloodWatch's gauges older than 3 h at 03:45): every row carries its age.

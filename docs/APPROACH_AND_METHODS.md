# Approach and methods

How Disaster Now was researched, built and checked, and how each hazard is computed. The numbers behind the methods are in [KNOWLEDGE.md](KNOWLEDGE.md); the forecast skill is in [MODELS.md](MODELS.md).

## 1. How the work was done (23 Oct 2026, one agent session)

1. **Learn from the owner's two apps first.** FloodWatch (`flood2026-research`) for reading Thai agency APIs (its evidence rule, its time rules, its bank and point rules, its place search); Hazard-huntz for the "around my home" research it had already done on 21 Oct (113 live calls, docs/08 and docs/09) and its sourced advice.
2. **Re-test the sources live** from this session's host (26 calls at 19:47 UTC) before using any, recording status, size and CORS.
3. **Four researchers in parallel** (independent agents with written briefs): Thai thresholds with evidence; data sources the earlier research hadn't covered; UX of apps people open often, and Thai readers; forecast validation against observations. Their full records are in [research/](research/).
4. **Build** the page and its tests while they worked, then adopt their findings (the action-named levels, Photon before Nominatim, codes instead of coordinates in shared links, JMA storms, the researched bands, the AWW12 intensity equation).
5. **Check** with unit tests on saved live responses, a scripted visitor walk in headless Chromium, a gauge-by-gauge cross-check against FloodWatch, and two more independent agents: a visitor audit (personas, the UX scout's 12-task script) and an output audit (every number on the page against its source, recomputed).
6. **Adopt what the checks found** (0.2.0): the validation's corrections and words (heat corrected per member and dressed, the damped PM2.5 ratio, rain as three words, the felt-intensity words and the Bangkok term); the output audit's M1–M5 and H1–H4; the visitor audit's four blockers and most majors. Each fix got a unit test named after its finding (`test/audit.test.mjs`); what is left is in KNOWN_ISSUES with the finding's ID.
7. **Make it server-ready** (0.2.0): one image, a compose stack in FloodWatch's pattern, a collector loop, a health check, tested in Docker in the session ([SERVER.md](SERVER.md)).

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
| 🌧️ Rain | nearest ThaiWater gauge ≤ 10 km read ≤ 3 h ago (FloodWatch's measured_rain) | ensemble: each member's rain summed over the next 24 h and each calendar day; the share of members > 35 mm shown as ต่ำ / มีโอกาส / สูง (cut points 10 % and 40 %), no amount | the higher of the measured 24 h band and the forecast window's level (capped at เตรียมตัว); a TMD rain warning lifts it |
| 🌊 Flood | ThaiWater gauges ≤ 20 km judged by FloodWatch's bank rule; the point's level is FloodWatch's area index (IDW of the up-to-3 gauges within 3 km, else within 8 km; in Bangkok and its five neighbours canals only); HII's flash-flood list by subdistrict code | — (FloodWatch has 24–72 h; linked) | area category; HII listing → at least เตรียมตัว |
| 😷 PM2.5 | nearest PCD station ≤ 15 km, ≤ 3 h old (24-h mean); else GISTDA's estimate at the point, with a late station's last reading beside it | the damped ratio: measured × (CAMS(day) ÷ CAMS(past 24 h))^β, β 0.45 / 0.55 / 0.55; day 1 a number, days 2–3 the band word "อาจเปลี่ยน" | PCD 2023 bands |
| 🌡️ Heat | heat index (NWS: Steadman, then Rothfusz with its adjustments) per member per hour from the member's own T and RH | the window's max per member, **corrected** (a + b·HI) and **dressed** (SD 2.95 °C); corrected median, dressed 10–90 % range and chance of ≥ 42 °C | DOH/TMD bands on the corrected median, lifted by the chance rule, capped at เตรียมตัว without an agency heat warning |
| 🌏 Earthquakes | EMSC (region) + USGS (M4.5+) + TMD (collector), merged within 90 s and 100 km; AWW12 intensity at the point from magnitude and hypocentral distance, + 1.06 MMI in greater Bangkok within 1,600 km | none: "พยากรณ์ล่วงหน้าไม่ได้" | the highest estimated MMI in the last 24 h in the validated words (2.5 "อาจรู้สึกได้", 4.5 "รู้สึกได้ชัด"); Andaman provinces: a watch line after an M ≥ 6.5 in the Indian Ocean within 6 h |
| 🔥 Fires | FIRMS VIIRS hotspots (nominal + high) from the collector, within 25 km | — | nearest within 10 km → ติดตามไว้, within 2 km → เตรียมตัว (the app's own) |
| 💨 Wind, storms | ensemble gusts (max per member), labelled not validated | the same per day | plain gust words on the tile (TMD's Beaufort word in the card), grouped (the app's own), capped at เตรียมตัว; a storm (TMD track, JMA 70 % circle, GDACS) within 800 km → ติดตามไว้, 300 km → เตรียมตัว; lines only within 1,500 km |
| ☀️ UV | CAMS UV index now (daylight 06–18) | the day's peak | WHO categories by WHO's advice tiers; from the value now, not the peak |
| ⛰️ Landslide | DMR risk villages within 3 km; rain measured and forecast | — | in a risk area: > 100 mm in 24 h (DMR's trigger; measured, or ≥ 50 % of members) → เตรียมตัว; heavy rain or ≥ 20 % → ติดตามไว้ |
| 🏭 Other pollution | nearest PCD station measuring PM10/O₃/CO/NO₂/SO₂ (the highest sub-index without PM2.5); else CAMS values, ungraded | — | PCD AQI bands |

**The chance rule** (`outlook.windowLevel`): a window's level is the highest level at least half the 51 members reach; if เตรียมตัว or worse is reached by at least 20 %, the window is at least ติดตามไว้. **Pre-warnings** list, by day, the cases where at least 20 % of members reach danger heat (≥ 42 °C), heavy or very heavy rain, or gale gusts (≥ 62 km/h), plus PM2.5 ≥ orange in the corrected outlook and an HII flash-flood listing.

**The verdict** takes the highest tile (and any TMD warning for the province, which also lifts its hazard's tile), names the worst hazard in the agency's word with its one sourced action (บ้านรอดไหม's lines; a mask line always with the under-2 line), prefers a tile an official warning lifted over a model-only tile of the same level, lists the other tiles at ติดตามไว้ or above, and lists what has no data (including unchecked warnings). With fewer than half the tiles answering it gives no verdict.

## 5. How it was checked

| Check | What it proves | Where |
|---|---|---|
| Unit tests (46) on responses saved from live calls | parsers, time rules, bands, the chance rule, FloodWatch's rules, the IPE, search, the collector's parsers, every string in two languages; page values equal source values for Bangkok; one test per fixed audit finding; the service worker's shell against the import graph | `test/*.test.mjs` |
| Visitor walk (23 checks) in headless Chromium, clock pinned | the flows: welcome → GPS → report; English; local and street search; saved place on reopen; 320 px with larger text; every source down; no page errors; tap targets ≥ 44 px; no horizontal scroll | `tools/smoke.mjs` |
| The same walk on the real sources | that today's live answers parse and read sensibly | `npm run smoke -- --live` |
| FloodWatch cross-check | gauge statuses agree with FloodWatch's (691 of 693) | `research/crosscheck_floodwatch.mjs` |
| GISTDA vs PCD | which PM2.5 to trust at a point | KNOWLEDGE §5 |
| Advice sync | lines and bands equal บ้านรอดไหม's | `tools/check-advice.mjs` |
| Independent visitor audit and output audit | a reading by agents who didn't build it | [research/visitor-audit-2026-10-23.md](research/visitor-audit-2026-10-23.md), [research/output-crosscheck-2026-10-23.md](research/output-crosscheck-2026-10-23.md) |
| Forecast validation (heat and rain against TMD stations with ECMWF's forecasts as issued, PM2.5 against Air4Thai, felt intensity against USGS DYFI) | whether the outlook and its corrections beat raw and persistence, on disjoint stations and the newest season | [MODELS.md](MODELS.md), `research/` |
| Docker stack | the image builds, both containers report healthy, the collector writes its files and stops cleanly | [SERVER.md](SERVER.md) |

## 6. Method rules carried from the sister projects

- **Choose earlier, score later, confirm on a disjoint sample; the newest season counts** (FloodWatch GUIDELINES §4).
- **"No record" is not "safe"** (Hazard-huntz docs/08 §4): a subdistrict not on the DMR's list may still slide; a quiet tile says "ยังไม่น่าห่วง", never "ปลอดภัย".
- **Old readings are common** (Hazard-huntz docs/09: 15 % of Air4Thai, 18 % of ThaiWater, 50 % of FloodWatch's gauges older than 3 h at 03:45): every row carries its age.

## 7. On a server (0.2.0)

The same static page, plus a loop. `tools/serve.mjs` serves `public/` with `_headers` applied and no request logs; `tools/collect.mjs --every 900` refreshes `data/live/` in a shared volume; `tools/health.mjs` checks both; `docker-compose.yml` binds the page to 127.0.0.1 and leaves public traffic to a Cloudflare tunnel or the host's proxy, as FloodWatch does. What a server should add next, in order (Air4Thai from Thailand, district forecast files, a GDACS digest, national files by code, an as-issued archive), is in [SERVER.md §6](SERVER.md#6-what-to-build-on-the-server-next).

## 8. Cloudflare, GLM and the live cross-check (0.3.0)

- **Cloudflare** ([CLOUDFLARE.md](CLOUDFLARE.md)): the page as Workers static assets at the edge; one small Worker
  serves `/data/live/*` from KV; the collector runs on a server and uploads its files in one bulk PUT per run (a
  server of its own since D-040, §9). Chosen over a tunnel (every view would cross to the server; FloodWatch's token was in the copied `.env`), Pages
  (a second product for the same job) and a Worker cron (10 ms CPU on Free). Verified with a wrangler dry run and
  `wrangler dev` on the real files, plus unit tests that compare the Worker's headers with `_headers`.
- **GLM** ([AI.md](AI.md)): found by asking where an AI adds value without writing a safety word. The answer was
  English for TMD's Thai-only warnings. Method: rules decide everything; GLM translates three fields; a deterministic
  check rejects lost or added numbers, leftover Thai, added comfort, wrong region words and odd lengths; one retry with
  the reason; cache by text hash; a daily cap; a label and the Thai original on the page. The check was grown from a
  failure seen on live text ("lower South" for ภาคใต้ตอนกลาง), then measured (6 of 6).
- **Cross-validation** (`research/crosscheck_live.mjs`, [research/crosscheck-live-2026-10-23.md](research/crosscheck-live-2026-10-23.md)):
  the app's own functions on one moment's data against independent sources — FloodWatch's gauges, TMD's warnings
  vs the ensemble, TMD vs EMSC quakes, GISTDA vs PCD. The warning comparison found the session's most important
  defect (KI-F25), which no unit test had looked for.
- **Visitor walks** on the running stack (360 × 640 in LINE, 390 × 844 on an iPhone, Thai and English; Bangkok,
  Phuket, Chiang Mai), recording every verdict state over time. That's how the interim heat headline before the
  warnings arrived (KI-F24) and the "mm" label over chance words (KI-F26) were seen.

## 9. Moving to a server of its own (24 Oct 2026)

- **What happened:** 0.3.0's stack was set up on FloodWatch's production server by mistake. The owner is moving it to a
  dedicated server for risk and replacing the Cloudflare token (D-040, D-041).
- **Why moving is cheap:** the stack is stateless.
  - The repository is the source.
  - `data/live/` refills within 15 minutes, and KV keeps the last upload meanwhile.
  - The page lives on Cloudflare's edge, not on the server.
  - So the move is: clone, a fresh `.env`, `npm run cf:setup`, `docker compose up`. Nothing is migrated except code.
- **Method: re-issue, don't copy.** Secrets aren't carried from the old server.
  - New tokens are made for this project's jobs.
  - The old ones are left to their owner (FloodWatch) until it's checked whether they're still used.
- **Method: a guard instead of a reminder.** `tools/preflight.mjs` turns the lesson into a check that fails on
  FloodWatch's host.
  - It separates gathering facts on the host from judging them (`assess(facts)` is pure), so the tests run it on
    "FloodWatch's server" and "a clean risk server" without either machine.
  - It also compares the KV id in `wrangler.jsonc` with the one in `.env`. A mismatch would make both sides look
    healthy while the page served stale files.
- **Leaving the old host:**
  - Push first: 0.3.0 existed only in that checkout.
  - Then remove only what this project created there (checked by image layer, so no FloodWatch image loses its base).
  - Record the host-specific results as the host's: Air4Thai's 173 stations and ThaiWater's 429 are measured again on
    the new server.

## 10. Three audits and a model check on the new host (24 Oct 2026, 0.4.0)

- **Independent reads, not anchored on the builder's.** Three agents got the code and the rules but not the session's
  own findings: a visitor audit (five personas, 360 × 640 in LINE, 390, 320 with ก+, Thai and English; at most 8 page
  loads), an output cross-check (every number recomputed from the sources at six points), and a model check (the heat
  correction by region and season on 90,481 station-days). They found the same top problem the session had (one
  forecast in three colours), and many it hadn't (the province search, the CAP references, the cool season).
- **The model check's protocol was pre-registered** before scoring (fit Oct 2024–Sep 2025, score Oct 2025–Oct 2026,
  confirm on 53 new stations and 8 airports). Its winner failed the safety rule and didn't ship; the post-hoc C6 shipped
  only for the season where the current line was worse than raw, by the owner's choice, labelled provisional, with an
  as-issued re-test pre-registered (MODELS §1.1).
- **Compute what was validated.** The check compared the page's inputs with the fit's: the hours (13:00/16:00 vs every
  hour) and Open-Meteo's elevation downscaling differed. The page now asks for exactly what was fitted, and a unit test
  checks the JavaScript against the research code's value to four decimals.
- **Walk the clock.** The fixture walk's 02:50 clock hid the evening false alarm (S6) for two releases; the walk now has
  an 18:30 page, and layout probes measure the elements that overflow instead of guessing.
- **Research on a shared production host:** venvs in the scratchpad, `nice -n 19`, memory and download caps, no
  ThaiWater calls, an Open-Meteo budget per agent logged in `research/logs/openmeteo-calls-2026-10-24.log`;
  BrainPlatform's web was checked while they ran.
- **A permission denied is reported, not routed around:** the refused deploy became an owner action and a probe that
  tests the permission read-only.

## 11. Live, and FloodWatch as a source (24 Oct 2026, evening, 0.6.0)

- **Use the sister app's API server-side.** FloodWatch sends no CORS, which mattered only for the browser. The collector
  reads `/api/stations` and `/api/risks` every 15 min and publishes one file; the page reads FloodWatch's own rows and
  words while the file is fresh and falls back to ThaiWater from the phone when it isn't, so it backs FloodWatch up
  rather than depending on it. No visitor's position goes to FloodWatch (its `/api/point` stays unused).
- **Its record, not its band.** FloodWatch's bank chances run high in the middle band (25–50 % came true 14 %); the
  page quotes how often each group came true in its last 30 days, as FloodWatch does (its D-077), and lets a forecast
  lift a tile only to เตรียมตัว.
- **A rule validated on one basin is marked as such.** The upstream rule A lifts to เตรียมตัว only on the U-Taphao,
  where it caught 5 of 5 floods in 30 seasons; elsewhere it lifts to ติดตามไว้ until a record exists. Hat Yai's own
  red-flag rain (300 mm in 3 days) is quoted as Hat Yai's.
- **Count a rule's firings nationwide on today's data before shipping it**, and read them: that is how the over-reach
  (a gauge 12.6 km away across the river) and a contradiction ("upstream rose" beside "upstream data are 5 h old") were
  found after every fixture test passed.
- **Follow the agency's colours.** The heat bands were one step above the DOH's own colours since 0.1; nobody had
  compared them until the UX study read the DOH's statement and บ้านรอดไหม's `/hot`. PM2.5 had followed PCD's all along.
- **Independent studies with narrow briefs**, run in parallel with the build (lead time, D11, UX, devices); each wrote
  one report and its scripts, and the build took what their evidence carried: the D11 study's "words and links" stays
  the owner's to approve because AGENTS.md reserves that wording.
- **Deploy when the permission exists, not before:** the token's *Workers Scripts: Edit* arrived during the session; the
  probe said "allowed", 0.5.0 went live at once and 0.6.0 at the end, each checked from the edge.


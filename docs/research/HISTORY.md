# Research and build history

What was done, in order, with the evidence for each step, every design decision with its reason, and the dead ends. Session of **23 Oct 2026** (UTC; Bangkok = UTC+7, so the night of 23–24 Oct there). One lead agent built and integrated; six independent agents researched and audited ([briefs-2026-10-23.md](briefs-2026-10-23.md)). Host: a cloud container whose traffic leaves through an agent proxy outside Thailand. Times come from the session log, file modification times and git.

## 1. Timeline

| UTC | Step | Evidence |
|---|---|---|
| 19:39 | Session start. `disaster-now` empty (no commits). Read the owner's two apps: Hazard-huntz `docs/08-open-data.md`, `docs/09-server.md` (the "around my home" research of 21 Oct, 113 live calls), FloodWatch's place search (`src/floodwatch/geocode.py`, `web/app.js` `placeSearch`, D-032) | — |
| 19:45 | Open-Meteo: `api.open-meteo.com` answered once, then "Daily API request limit exceeded" for the shared proxy IP; `previous-runs-api` and `historical-forecast-api` the same; `archive-api` timed out; `air-quality-api`, `ensemble-api`, `flood-api`, `geocoding-api` answered | [probe log](../../research/logs/probe-2026-10-23.log) footer |
| 19:47–19:48 | **Probe of 26 sources** in parallel, honest User-Agent, `Origin` header: CORS `*` for USGS, EMSC, BMKG, HII, GISTDA (province and point), GDACS, Nominatim, Photon, HDX; origin reflected for ThaiWater and the DMR; none for TMD, FIRMS, FloodWatch, Meteostat; Air4Thai's mirror failed TLS | [probe log](../../research/logs/probe-2026-10-23.log), `research/raw/probe-2026-10-23.tar.gz`, `research/probe_sources.sh` |
| 19:48–19:50 | Read the answers: GISTDA's point answer has 24 hourly values, a 24-h mean and DOPA codes, and its "…Z" is Bangkok time; FloodWatch's `/api/point` has an area category; HII's flash-flood list was empty; the DMR's fault layer holds 1,329 subdistricts | `test/fixtures/` |
| ≈ 19:50 | **Researchers 1–3 launched** (thresholds, sources, UX) | briefs §1–3 |
| 19:50–19:52 | Observation archives for validation: NOAA ISD's 2026 files absent on S3 (2025 present); Meteostat's Bangkok files end in Feb–Mar 2026; Air4Thai's history API answered `OK` with no rows; the Air4Thai chain fixed with Let's Encrypt's YR1 and Root YR | dead ends §4 |
| 19:52 | The ensemble API: 200, 20.8 KB gzip for 3 days, 51 members × 5 variables | `test/fixtures/ens_bkk.json` (4-day call 19:55) |
| ≈ 19:53 | **Researcher 4 launched** (forecast validation) | brief §4 |
| 19:53–19:55 | HDX COD-AB workbook (1,850,520 bytes, sha256 `7d23fca9…`) → `public/data/tambon.json` (77 / 928 / 7,425). GISTDA's `tb_idn` 100103 = HDX `TH100103` | `tools/build_tambon.py` |
| 19:55 | Fixtures saved from live calls (ensemble, air quality, GISTDA, ThaiWater, HII, EMSC, USGS, GDACS, FloodWatch point, TMD CAP and quakes) | `test/fixtures/` |
| 19:55–20:00 | Core modules (geo, heat, levels, outlook, airq, water, quake, events, sources); **19 unit tests passed on the first run** | `test/core.test.mjs` |
| ≈ 20:00 | First outlook for Bangkok's old town: heat index median 38–39 °C for 24–26 Oct, rain 2–4 mm a day, gusts 25–27 km/h; GISTDA 52.6 µg/m³ now, 46.4 (24 h) vs CAMS 14.6 | KNOWLEDGE §9 |
| 20:03 | Air4Thai read with the chain fix: five PCD stations within 2.3 km read 27.0–33.3 µg/m³ (24 h) → **GISTDA vs PCD in 60 provinces: median ratio 1.31** → decision D-004 | `research/gistda_vs_pcd.py`, [log](../../research/logs/gistda-vs-pcd-2026-10-23.log) |
| 20:05–20:10 | `assess.js` (cards from all answers). Its first verdict said "ควรระวัง 5 เรื่อง" for a calm night (heat, UV, a full deep river, moderate dust) → the "crying wolf" question (D-007); found FloodWatch marks C.12 "warning" at 1.31 m of freeboard | KNOWLEDGE §6 |
| 20:10–20:14 | The page (HTML, CSS, `main.js`, strings, local search + Nominatim, saved places, service worker); a static server; the visitor walk in headless Chromium (playwright-core 1.56.1, Chromium at `/opt/pw-browsers/chromium`). First run: 3 failures (GPS headline said "ตำแหน่งของฉัน", card count, 10 links 32 px tall), fixed; then a 320 px overflow with larger text, fixed | `tools/smoke.mjs`, KNOWN_ISSUES KI-F03, F04 |
| 20:15 | **UX scout returned** | [ux-scout](ux-scout-2026-10-23.md) |
| 20:15–20:16 | The collector, first runs: TMD CAP gave no provinces (the regex for `<value>` also matched `<valueName>`), fixed → 11 southern provinces; Air4Thai failed "self-signed certificate in chain" because passing `ca` dropped the host's own extra CA, fixed (keeps `NODE_EXTRA_CA_CERTS`) → then the PCD's server answered 503; TMD quakes 10, FIRMS 303 | `tools/collect.mjs` |
| 20:16 | **Sources scout returned** | [sources](sources-2026-10-23.md) |
| 20:16–20:22 | Adopted the scouts' findings: levels named by action, the agency's word on the tile, the fixed tile grid, the 4-dot meter, blue/yellow/orange/crimson, Photon before Nominatim with a `config.json` switch, links by subdistrict code, a LINE button, "ไม่ใช่ตำบลนี้?", the LINE external-browser hint, JMA storms, TMD's storm track in the collector, `Permissions-Policy: geolocation=(self)` | D-005 … D-012 |
| 20:22 | Visitor perspective on the new verdict: "เตรียมตัว: น้ำท่วม: ใกล้ล้นตลิ่ง" for the old town, while FloodWatch's own `/api/point` said "normal" for the same point → **mirrored FloodWatch's point rule** (`area_index`; in Bangkok and its five neighbours, canals only) → "ยังรับน้ำได้" | D-013 |
| 20:23–20:24 | **FloodWatch cross-check** on all gauges: 97.8 % (678/693) → ThaiWater's `ground_level: 0` = no bed → **99.7 % (691/693)** | [log](../../research/logs/crosscheck-floodwatch-2026-10-23.log), archived inputs in `research/data/` |
| 20:24–20:26 | Rain-gauge limits set to FloodWatch's (10 km, 3 h): the same gauge and amount as FloodWatch's point check. **Live walk on the real sources**: every tile answered (Air4Thai's mirror read in Chromium); a bug found: with all sources down the verdict called the page calm, fixed (D-008) | KI-F02 |
| 20:27 | First commit (local) | `git log` |
| ≈ 20:28 | **Auditors 5 and 6 launched** (visitor audit, output cross-check) | briefs §5–6 |
| 20:29 | **Thresholds researcher returned** → applied: UV graded on the value now and by WHO's advice tiers; moderate rain → ติดตามไว้; TMD's Beaufort words for gusts; MMI cut points 3 / 5 / 6; the AWW12 coefficients (OpenQuake 3.26.2, two researchers agreed); the DMR's 100 mm landslide trigger; fires by distance; the tsunami watch with TMD's "leave the coast" advice; CAP Severe → เตรียมตัว | D-014 … D-018 |
| 20:30–20:40 | Docs; `npm run check:advice` (บ้านรอดไหม's `content/kit.json` answers with CORS `*`; all 9 lines and both band sets match, live and local); `public/_headers`; a Markdown link checker; screenshots | `tools/check-advice.mjs`, `tools/check-docs.mjs` |
| 20:40 | Two commits pushed; the branch `claude/dazzling-goldberg-z8pq18` created on the empty repository; the validation researcher's interim files committed | `git log` |
| 20:40–20:47 | **Research record** (the owner: "record the research history, methods and results and details as much as we can"): the probe log rebuilt from the saved headers; the GISTDA–PCD script and the FloodWatch cross-check re-run from committed inputs (both reproduce); the UX palette check re-run on the shipped palette (reproduces 5.2–11.2 : 1, 18.4–24.5); the briefs; the raw call records archived with cookies and request ids stripped | this file, `research/` |

The forecast-validation and audit results, and what was changed because of them, are in §5 (added when they returned).

## 2. Decisions

| ID | Decision | Why | Evidence |
|---|---|---|---|
| D-001 | A **static page with no server**; the phone calls sources with CORS; a separate collector for the rest | free, no per-visitor load on any server of ours, no personal data held; Hazard-huntz docs/09: "a server's best job is to publish files, not to know people" | SOURCES §1–2 |
| D-002 | **The ECMWF ensemble (51 members)** for heat, rain and gusts, not a deterministic run | honest chances and ranges for free; the deterministic host was over its limit for the research IP | KNOWLEDGE §9 |
| D-003 | **Points rounded to 2 decimals (~1.1 km)** before any provider | the models are 9–40 km grids; FloodWatch rounds the same way before its reverse lookup | `geo.rounded` |
| D-004 | **PCD station first** (≤ 15 km, ≤ 3 h), GISTDA's estimate only where none; GISTDA's number not shown beside a station | GISTDA read 1.31× the stations (60 provinces) | KNOWLEDGE §5 |
| D-005 | **Four levels named by what to do** (ยังไม่น่าห่วง · ติดตามไว้ · เตรียมตัว · ทำทันที), a 4-dot meter, never "ปลอดภัย" | the agencies' words collide across hazards (TMD's เตือนภัย ≠ PCD's ส้ม); action names don't; colour never alone | UX scout §5a |
| D-006 | **The agency's word leads the tile; the app is never milder** | inconsistent warnings lower action (a Swiss study the scout cites) | UX scout §2 |
| D-007 | **No "everyday care" demotion** of heat and UV in the verdict (tried, then dropped) | it made the verdict milder than a tile; instead UV is graded on the value now (D-015) and the heat question goes to the owner | OWNER_ACTIONS D1 |
| D-008 | **Missing data is never calm**: under half the tiles → no verdict | found by the "all sources down" walk | KI-F02 |
| D-009 | **A fixed tile order** (rain, flood, PM2.5, heat, earthquakes, fires, then wind, UV, landslide, other pollution) | people learn where their tile is | UX scout §5b |
| D-010 | **Photon first, Nominatim as fallback, switchable** in `config.json` | Nominatim's 1 request a second is for the whole app; its policy asks for a switch | UX scout §4b |
| D-011 | **Share a GPS fix or a saved place by subdistrict code** (`#t=`) | a family group should see the subdistrict, not the house | UX scout §4c.6 |
| D-012 | **JMA's typhoon forecast on the phone, TMD's storm track in the collector**, GDACS as context | small, CORS (JMA); the official Thai name and track (TMD) | sources scout gap 1 |
| D-013 | **Rivers exactly as FloodWatch reads them**: its bank rule, its words, its point rule, its rain-gauge limits, its `ground_level 0` reading | the owner asked for consistency with the current app; two apps must not disagree on the same gauge | 691/693 cross-check |
| D-014 | **AWW12 (hypocentral)** for felt intensity, with a soft-ground warning | coefficients readable from open code; DYFI comparison in MODELS.md | thresholds §8.4 |
| D-015 | **UV from the value now**, grouped by WHO's advice tiers | every TMD station's clear-sky peak was ≥ 8 that day | thresholds §3.2 |
| D-016 | **Landslide by the DMR's own trigger** (> 100 mm in 24 h in a risk area) | the only published number | thresholds §6 |
| D-017 | **CAP Severe → เตรียมตัว** (not ทำทันที) | TMD marks its routine heavy-rain product Severe | thresholds §11 |
| D-018 | **Fires graded by distance** (10 km / 2 km), the app's own | no Thai agency grades hotspots | thresholds §9 |
| D-019 | **One sourced action line**, copied from บ้านรอดไหม, checked by `check:advice` | never write a new safety line without a source | `actions.js` |

## 3. What the researchers found (short)

- **Thresholds** ([full](thresholds-2026-10-23.md)): PCD 2023 bands for PM2.5, PM10, CO, O₃, NO₂, SO₂ and the AQI ✅ re-read; TMD's rain words, hot-day words and Beaufort words ✅; WHO UV ✅; TMD cyclone classes ✅ (64 vs 65 kt conflict); the DMR's 100 mm trigger ✅; ThaiWater's situation classes ✅; AWW12 coefficients ✅ from code; heat-index bands ⚠️ via news; FFPI classes, DWR thresholds, the TMD heat formula **[unverified]**; no open tsunami-risk list; `ndwc.go.th` doesn't exist. Surprises: TMD's "ลมแรง" is Beaufort 5 only; TMD publishes a clear-sky UV CSV; TMD marks routine heavy rain Severe.
- **Sources** ([full](sources-2026-10-23.md), 110 calls 19:52–20:11): JMA typhoon JSON, JTWC text, GDACS geometry (slow), ONWR's flood-warning tiles, GFM and VIIRS flood pixels, GWIS fire danger, DMR flash-flood class and sinkholes, HII tides from the phone; TMD's keyless XML, Air4Thai (fixed), ThaiWater salinity, LHASA, ThinkHazard via a collector; GISTDA keyed, ONWR's API DNS, RSMC New Delhi TLS, Blitzortung and ASMC terms, Noise4Thai expired, no open lightning feed.
- **UX** ([full](ux-scout-2026-10-23.md)): 20 apps compared; the levels and palette (checked for colour blindness); the one-page layout; FloodWatch's search adapted to a static page (local list, Photon on Enter); privacy settings for the host; a 12-task visitor script.

## 4. Dead ends (so nobody repeats them)

| Tried | Result |
|---|---|
| Open-Meteo `api.` / `previous-runs-api.` / `historical-forecast-api.` from the research IP | "Daily API request limit exceeded" (the IP is shared); the validation researcher used ECMWF's open data on AWS instead (MODELS.md) |
| NOAA ISD 2026 for Bangkok (`noaa-global-hourly-pds`, key `2026/48455…`) | no key; 2025 files exist |
| Meteostat bulk for Bangkok | ends 19 Mar 2026 (daily) and 9 Feb 2026 (hourly); no precipitation column filled |
| Air4Thai history API `webV2/history/api/data.php?…&type=hr` | `{"result":"OK"… "data":[]}` for the parameters tried |
| Air4Thai with curl's default bundle | `unable to get local issuer certificate`; with the two Let's Encrypt certificates added, 200; later 503 from the PCD's server |
| FloodWatch `/api/point`, `/api/stations`, `/api/geocode` from a browser | no CORS header |
| Deploying | no Cloudflare authorisation in this session |
| A verdict that demotes routine heat and UV | contradicted "never milder than a tile"; dropped (D-007) |

## 5. Forecast validation and the audits

*Filled in when the three remaining agents return.*

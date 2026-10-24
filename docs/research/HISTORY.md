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

The forecast-validation and audit results, and what was changed because of them, are in §5.

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

Three independent agents returned between 20:56 and 21:04 UTC. Their reports are [forecast-validation-2026-10-23.md](forecast-validation-2026-10-23.md), [output-crosscheck-2026-10-23.md](output-crosscheck-2026-10-23.md) and [visitor-audit-2026-10-23.md](visitor-audit-2026-10-23.md). The raw material is in `research/` (scripts, `logs/`, `out/*.json`) and `research/raw/output-crosscheck-2026-10-23.tar.gz`, which holds the cross-check's scripts, its per-point results and the code it audited, with sha256 sums.

### 5.1 What they found

| Agent | Method | Headline result |
|---|---|---|
| Forecast validation | ECMWF forecasts as issued (22 GB of open-data byte ranges from the Google Cloud mirror; Open-Meteo was rate-limited for the shared IP), 18 TMD stations (NOAA GHCNh), Air4Thai daily and hourly history, USGS DYFI; fit on A, test on later periods, disjoint stations and the newest season; block bootstrap for "made worse" | heat raw ~5 °C low → corrected MAE 2.4 °C; PM2.5: the planned ratio lost to persistence, a damped ratio (post-hoc) won every test; rain at a point barely skilful (POD 0.04–0.13); gusts unvalidatable; felt intensity MAE 0.96 MMI, Bangkok + 1.06 |
| Output cross-check | 6 points (Bangkok, Chiang Mai, Hat Yai, Phuket, Ubon, Mae Sai), every number on the page against an independent fetch and computation seconds later | 292 of 308 items match; the 15 mismatches came from five code paths (M1–M5), not from sources; plus four consistency findings with บ้านรอดไหม (H1–H4) |
| Visitor audit | 7 places, personas (older relative in LINE, Hat Yai resident, Chiang Mai runner, expat), the UX scout's 12-task script, throttling, offline, dark mode, 320–390 px | 41 findings (4 blockers, 23 major, 14 minor); 1 task passed, 2 nearly, 9 failed |

### 5.2 Decisions taken because of them (0.2.0)

| ID | Decision | Why | Evidence |
|---|---|---|---|
| D-020 | **Show only the corrected heat index**, per member, dressed with SD 2.95 °C | raw read 4.7–5.9 °C low and caught 0–6 % of danger days; corrected: 2.4 °C, POD 0.65–0.86, 0 of 18 stations made worse | MODELS §1, `calibration.js` |
| D-021 | **PM2.5 by the damped ratio** (β 0.45 / 0.55 / 0.55) instead of the planned ratio | the planned ratio was worse than persistence at 4 of 10 stations; the damped one at none; post-hoc, so re-test as issued | MODELS §2 |
| D-022 | **Rain as three chance words**, no forecast amounts | point POD 0.04–0.13; ENS Brier skill around zero | MODELS §3 |
| D-023 | **Felt words from the Thai reports, + 1.06 MMI in greater Bangkok** (within 1,600 km) | Bangkok under-predicted in all 12 crustal events; "not felt" was told to cities that felt it | MODELS §5 |
| D-024 | **A forecast alone tops out at เตรียมตัว** (`MODEL_MAX`) | "ทำทันที" on most October nights for tomorrow's heat (V1); keeps the agency's word, drops the "act now" | KNOWN_ISSUES KI-F07 |
| D-025 | **A CAP warning lifts its tile and leads** | a Severe heavy-rain warning sat under a heat verdict (M5, V2) | KI-F08 |
| D-026 | **A tile is graded only from its primary source** | a failed forecast or gauge feed read as calm (V4, M4) | KI-F10 |
| D-027 | **No coordinates on screen for a GPS place; the FloodWatch link rounded** | screenshots in family groups; the link carried 4 decimals (V10) | KI-F14 |
| D-028 | **The service worker's shell is checked against the imports by a test** | one missing file killed the page offline (V3) | KI-F09 |
| D-029 | **Server-ready as a Docker stack in FloodWatch's pattern** (the owner: "make it ready to develop in server further") | one image, localhost bind, tunnel profile, collector loop with a 600 s floor, health checks; tested in the session | [SERVER.md](../SERVER.md) |

### 5.3 Timeline after the first push

| UTC (23 Oct) | What | Where |
|---|---|---|
| 20:47–20:57 | The validation researcher's interim and final files; `calibration.js` written from `research/out/calibration.json`; heat shown corrected only | `git log`, `research/out/` |
| 21:00 | The output cross-check returned → M1–M5, H1–H4 fixed | KNOWN_ISSUES KI-F08 … F15 |
| 21:04 | The visitor audit returned → V1–V4 and most majors fixed, one unit test per finding (`test/audit.test.mjs`) | KI-F07 … F22 |
| 21:10–21:13 | Docker: the image built from Amazon's mirror of `node:22-alpine` (Docker Hub rate-limited), both containers healthy, the collector wrote 4 of 5 files in 8 s (Air4Thai 503); found and fixed: FIRMS failing wrote "0 hotspots" | SERVER.md, KI-F21 |
| 21:13–21:15 | The visitor walk on fixtures and on live sources (Air4Thai read in Chromium; the Bangkok term met a far M7.0, giving KI-023, then fixed); screenshots refreshed | `npm run smoke`, `-- --live` |
| 21:15– | Docs: MODELS, SERVER, HANDOFF written; KNOWN_ISSUES rewritten with the audits' IDs; the rest updated; v0.2.0 | this commit |

### 5.4 Dead ends added

| Tried | Result |
|---|---|
| A gradient-boosted PM2.5 model | won its choosing month, failed every later test (trees can't extrapolate to burning-season levels) |
| A tuned HRES rain threshold | raised CSI at A, not at B; forecasts "heavy" 2.5–5× as often as it happens |
| Docker Hub for `node:22-alpine` | HTTP 429 (anonymous limit); `public.ecr.aws/docker/library/node:22-alpine` worked |
| nginx in the sandbox | "Data limit exceeded" on start; the Node static server is used instead (and applies `_headers` itself) |
| The collector through the session's proxy | every TLS call "self-signed certificate in certificate chain" until the proxy's CA was mounted (sandbox only) |

## 6. The second session (23 Oct 2026, 21:36–22:30 UTC, 0.3.0): Cloudflare, GLM, risk.autobahn.bot

Run on the owner's FloodWatch server (Germany), with the owner's `.env` and a running FloodWatch beside it.

### Timeline

| UTC | What happened | Evidence |
|---|---|---|
| 21:36 | Pulled 0.2.0 (`main` now exists on the remote, equal to the work branch). The owner's local `.env.example` (FloodWatch's template) blocked the pull; it was moved aside | `git log` |
| 21:38 | Baseline: 46 of 46 unit tests; the walk's 23 checks on fixtures and live. Live: ThaiWater 429 on the flood tile | smoke logs |
| 21:43 | **The collector from this server: 5 of 5 files, Air4Thai 173 stations** (A6 done) | `index.json` |
| 21:44 | `.env` found to be FloodWatch's (41 names, 27 FloodWatch-only, **its live tunnel token**, bejranonda.com's zone id); rewritten to this project's names, the original kept aside (git-ignored, mode 600). Probes: token valid, zone visible, `risk.autobahn.bot` free, Workers readable, **KV 401**; GLM answers | `tools/env-check.mjs --probe` |
| 21:45–21:50 | GLM research (Z.ai docs, pricing, data terms; FloodWatch's own measurements). The translation built; the first live run found "lower South" for ภาคใต้ตอนกลาง (1 of 3) → the region rule → 6 of 6 | [AI.md](../AI.md) |
| 21:50–21:57 | Worker, `wrangler.jsonc`, KV upload, setup and deploy scripts; dry run (Node 22 in Docker), `wrangler dev` (Debian image) on the real files | [CLOUDFLARE.md](../CLOUDFLARE.md) |
| 21:57 | **Phuket in English through the Worker:** the translated warning showed, but the verdict read "Rain: TMD warning · Heavy rain: low chance" → KI-F25 | screenshot |
| 21:58–22:02 | The verdict on the first screen (KI-F23), no interim verdict (KI-F24), three new smoke checks, version 0.3.0, Open Graph tags and PNG icons | smoke |
| 22:02–22:04 | The copy first-reader: 95 of 207 flagged, three harmful suggestions, none applied | [copy review](copy-review-glm-2026-10-23.md) |
| 22:04 | **Docker stack on this server:** both healthy, 5 of 5, GLM English in 1 call (0 on re-run) | `docker compose logs` |
| 22:06 | **Live cross-check:** the ensemble "low" in all 11 provinces TMD warned; quakes agree; GISTDA ×1.27; ThaiWater 429 | [crosscheck-live](crosscheck-live-2026-10-23.md) |
| 22:08–22:12 | The 3-day table under a warning, moved above the cards, its "mm" label and doubled word fixed (KI-F26); live walks in Bangkok (360 × 640 LINE), Phuket (EN, iPhone) and Chiang Mai | `research/logs/` |
| 22:12– | Docs, the stack stopped, commit | this file |

### Decisions

| ID | Decision | Why | Where |
|---|---|---|---|
| D-030 | **Public at `risk.autobahn.bot`** (the owner's pick, kept: short, readable; the LINE card carries the Thai name) | the owner: "Our project might be risk.autobahn.bot you can suggest and improve" | OWNER_ACTIONS A1 |
| D-031 | **Cloudflare Workers static assets + KV, collector on FloodWatch's server; no tunnel** (the server part superseded by D-040) | the edge is near the visitor; the page survives the server; no inbound path; FloodWatch's token stays FloodWatch's | [CLOUDFLARE.md §1](../CLOUDFLARE.md#1-the-recommendation-frankly) |
| D-032 | **`.env` holds this project's variables only; each service gets only its own** | the copied file carried FloodWatch's secrets and live tunnel token | `.env.example`, `docker-compose.yml` |
| D-033 | **GLM translates TMD's warnings for the English page, checked; nothing else on a visitor's path** | TMD's CAP is Thai only, and the warned provinces are full of visitors; the agencies' words stay the product | [AI.md §2.1](../AI.md#21-english-for-tmds-warnings-collector-toolstranslatemjs) |
| D-034 | **The translation check includes TMD's region words** | "lower South" for ภาคใต้ตอนกลาง passed a numbers-only check | `tools/translate.mjs` `REGIONS` |
| D-035 | **The copy reviewer's suggestions are prompts, never applied unread** | 3 of its 95 were harmful (privacy, placeholder, hotline) | GUIDELINES §10 |
| D-036 | **A TMD warning takes the tile's value and the table's cells; the model's milder numbers stay in the card under a "follow TMD" line** | the ensemble said "low" in all 11 warned provinces, and the page said both in one line | KI-F25 |
| D-037 | **No verdict level before the forecast, air quality and warnings answer, or 5 s** | a heat headline showed for a second before the warning's | KI-F24 |
| D-038 | **The finder folds while a place is open; the buttons go under the verdict** | the verdict ended at 642 px on a 360 × 640 screen | KI-F23 |
| D-039 | **No deploy without the owner** | a new public hostname is outward-facing; the token can't write KV anyway | OWNER_ACTIONS A9, A10 |

### Dead ends

| Tried | Result |
|---|---|
| `npx wrangler@4.148.0` on the host | needs Node ≥ 22 (the host has 20) → `node:22` in Docker |
| `wrangler dev` in `node:22-alpine` | workerd `ENOENT` (it needs glibc) → `node:22-bookworm-slim` |
| A gauge cross-check from this server | ThaiWater HTTP 429 (KI-029); not retried, to spare FloodWatch's quota |

## 7. The move (24 Oct 2026, ≈ 06:30–07:00 UTC)

Run on FloodWatch's server for the last time, at the owner's word:
- "sorry, I deployed in the wrong server. I will move to new server especially for risk, and change the cloudflare token";
- then "Make it ready to deploy in new server, at the end merge and push to remote, then clean up the project in this server."

### Timeline

| Step | What happened | Evidence |
|---|---|---|
| 1 | The docs named the old host in about 20 places ("the owner's server", "FloodWatch's server", Germany, `127.0.0.1:3000`); each was rewritten to "the risk server" or marked as that host's result | `grep` |
| 2 | `tools/preflight.mjs` written. On FloodWatch's server: ❌ "FloodWatch runs on this host", exit 1 | its output |
| 3 | 61 of 61 unit tests (2 new); SERVER.md §2 rewritten as the risk server's runbook | `npm test` |
| 4 | Leftovers checked before removal: `node:22-alpine` sits only under `disaster-now:local`; no image is built on `node:22-bookworm-slim`; the Chromium in `/root/.cache` dates from May 2026, before the project | `docker image inspect` (RootFS layers), `ls -l` |
| 5 | Removed this project's volume and images; commit; `main` fast-forwarded to the work branch and both pushed | `git log`, `git ls-remote` |
| 6 | Deleting the checkout `/root/disaster-now` was **blocked** by Claude Code's safety check (an agent may not remove its own working directory). Left to the owner (A11). The docs pushed in step 5 had already called it done; a second commit corrected them | the tool's refusal |

### Decisions

| ID | Decision | Why | Where |
|---|---|---|---|
| D-040 | **A server of its own for risk; nothing of this app on FloodWatch's** (the owner) | shared IP limits (KI-029), shared Docker and disk, a copied `.env`; the page is on the edge anyway, so the server runs only the collector | [SERVER.md §2](../SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server), GUIDELINES §8 |
| D-041 | **New tokens, issued for this project, never copied; the old one left to FloodWatch until checked** | the old token came from FloodWatch's `.env`, and FloodWatch may deploy with it | OWNER_ACTIONS A9 |
| D-042 | **A preflight that fails on FloodWatch's host** | a check beats a reminder: the docs already said "FloodWatch's server", and the stack still ran there | `tools/preflight.mjs` |
| D-043 | **`main` fast-forwarded to the work branch and pushed; the checkout's deletion left to the owner** (the agent's was blocked) | the owner: "merge and push to remote, then clean up the project in this server" | OWNER_ACTIONS A8, A13 |

## 8. The new host, the name and the model check (24 Oct 2026, ≈ 07:40–09:40 UTC, 0.4.0)

The owner moved the project to `autobahn-bot` with a new Cloudflare token and asked for a full review: the name, UI/UX
as a visitor, output and model cross-validation, integration, frank feedback. Mid-session they added deep research on
predicting earthquakes, pollution and other disasters, PNSN's four categories (prediction, early warning, probabilities,
forecasts), and the Hat Yai flood of late 2025.

### Timeline

| # | What | Evidence |
|---|---|---|
| 1 | `npm run preflight`: no ❌; the host also runs BrainPlatform's production; `.env` 644 → 600 | its output |
| 2 | 61 tests, 29 fixture checks pass; Cloudflare token valid but KV 401; the owner adds KV | `env-check --probe` |
| 3 | The owner answers three questions: run the collector here, deploy at the end, the name ภัยรอบบ้าน · Thai Risk | the session |
| 4 | `cf:setup` creates the KV namespace; `docker compose up`: Air4Thai 173 stations | collector log |
| 5 | Baseline live walk; three independent agents start (visitor UX, output cross-check, model check) | their reports |
| 6 | The session's own review: S1–S11 (forecast colours, the 320 px table, the evening heat false alarm S6 …) | [review](review-2026-10-24.md) |
| 7 | Visitor audit U1–U25 and output cross-check X1–X19 fixed or recorded; 139 of 144 numbers equal the sources | their reports |
| 8 | Four research agents start (earthquakes, air quality, other hazards, the Hat Yai hindcast) | `research/eq_*`, `aq_*`, `hz_*`, `hy_*` |
| 9 | The model check: the heat line is 3–4 °C hot in Nov–Feb, worse than raw; the page's inputs differ from the fit | [model check](model-check-2026-10-24.md) |
| 10 | The owner chooses C6 for Nov–Feb; 13:00/16:00 and `elevation=nan`; JS equals the research code to 4 decimals | tests |
| 11 | Stale collector files treated as missing (S12); one live walk at 16:21 Bangkok passes | smoke |
| 12 | `cf:deploy` **refused** (403, no Workers Scripts: Edit); nothing created; `env-check --probe` now tests it (S13) | wrangler log, probe |

### Decisions

| ID | Decision | Why | Where |
|---|---|---|---|
| D-044 | **The name ภัยรอบบ้าน · Thai Risk** (the owner, from the session's options) | "Thai Risk" alone reads as a country-risk rating and, beside ThaiWater, as official; "Disaster Now" said "disaster" on a calm day; the Thai name fits 320 px | OWNER_ACTIONS A2 |
| D-045 | **The collector on `autobahn-bot`, beside BrainPlatform** (the owner); D-040 amended to "never FloodWatch's server; another app's only with the owner's yes and no shared sources, `.env` or tunnel" | BrainPlatform calls none of this app's sources; the rule's reasons were FloodWatch's | GUIDELINES §8 |
| D-046 | **Heat: C6 for Nov–Feb, provisional; the page computes the fitted predictor (13:00/16:00, grid height)** (the owner chose C6 over "keep and reword") | the line was worse than raw in the cool season; C5, pre-registered, failed its safety rule | MODELS §1.1, KI-037 |
| D-047 | **One grading for every view of a forecast** (`assess.fcLevel`), and a correction only inside its fitted domain | the table and pre-warnings were red beside an orange tile; an evening became "danger heat" | GUIDELINES 3b, 3e |
| D-048 | **A province or district found by name opens its seat's subdistrict** | Chiang Mai's centre was a mountain 40 km from town | KNOWLEDGE §7 |
| D-049 | **Collector files older than 2 h are missing** | KV keeps the last upload; an empty stale list reads as calm | `sources.liveFresh` |

# Changelog

## Unreleased

**From the prediction research** ([predict-air](docs/research/predict-air-2026-10-24.md)):
- **The chance of a dust day,** Dec–Apr, tomorrow and the day after, from a PCD station only: "พรุ่งนี้
  โอกาสที่ฝุ่นเฉลี่ยทั้งวันจะถึงระดับ “เริ่มมีผลกระทบต่อสุขภาพ” ราว 40%" (lognormal dressing of the damped ratio, σ 0.343 / 0.380;
  Brier skill +0.10 to +0.24 vs persistence on disjoint stations); provisional (KI-038). The dust pre-warning carries it.
- **PCD's 7-day dust forecast** linked from the dust card, the visitor's region (an image; never parsed).
- **Earthquakes** ([predict-earthquake](docs/research/predict-earthquake-2026-10-24.md)): aftershock chances tested on
  this region had no skill over the base rate, so the page computes none. The card now says what can't be predicted
  ("เมื่อไร ที่ไหน แรงแค่ไหน") and where early warning exists (Android's earthquake alerts, M4.5+, verified on Google's
  page). The Bangkok +1.06 term applies only to crustal quakes, the domain it was fitted on (offshore subduction quakes
  over-predicted Bangkok by 2–3 MMI). The place profile shows the province's seismic zone from the 2564 regulation
  (43 provinces read from the Royal Gazette), labelled long-term hazard, not a prediction. The rule change for
  aftershock words and links is the owner's (D11).
- Tests: 88.

## 0.4.0 (24 Oct 2026, not deployed): ภัยรอบบ้าน · Thai Risk, one grading for every forecast view, the cool-season heat fix

**The name** (A2, D-044): **ภัยรอบบ้าน · Thai Risk**. The Thai name fits the 320 px header on one line; "Thai Risk"
matches `risk.autobahn.bot`; the footer says "โครงการทดลองอิสระ ไม่ใช่เว็บของหน่วยงานรัฐ" / "not a government site".
The preview card and icons are re-rendered. The code name `disaster-now` stays (repository, Worker, KV, Docker).

**The host** (D-045): `autobahn-bot`, which also runs BrainPlatform. The owner chose to run the collector here; D-040
now says what it guards against (never FloodWatch's server; another app's only with the owner's yes and no shared
sources, `.env` or tunnel). Node 24, Docker 29, Chromium at `~/.cache/ms-playwright/chromium-1217`; Air4Thai 173
stations and ThaiWater answering from it. `npm run cf:setup` created the KV namespace (`wrangler.jsonc`).

**Consistency: one forecast, one level, everywhere** ([review](docs/research/review-2026-10-24.md),
[visitor audit](docs/research/visitor-audit-2026-10-24.md)):
- `assess.fcLevel` grades a forecast window for the tile, the card's day chips and the 3-day table; pre-warnings keep
  the agency's band in their words but a forecast's colour. In 0.3.0 the table and pre-warnings were red beside an
  orange tile and verdict (S1, U1).
- The table's heat number is floored like the card's (S2). The heat tile names the afternoon whose number it shows
  (today's before 16:00, else tomorrow's), the same window as the table (U25).
- The first column is "คืนนี้" from 18:00 (S3); UV's first day is the rest of today like every other row (U16).
- Today's dust chip says "คาด"; the table's note says the first column is the rest of today and dust is an
  expectation, not a measurement (S4, U6).
- Under a TMD warning the card's day chips say "📢 เตือนภัย" as the table does (U4).

**Heat, from the model check** ([research/model-check-2026-10-24.md](docs/research/model-check-2026-10-24.md), MODELS §1.1):
- The year-round line read 3–4 °C hot from November to February, worse than no correction on 53 stations it never saw
  (MAE 3.56 vs 3.07 °C), with false "เตือนภัย" on about half the northern days. **Nov–Feb now uses C6** (corrected T
  and Td, then the heat index; MAE 1.53 °C, danger days kept 7 of 29 vs 8): provisional and post-hoc, the owner's choice
  (D-046), to be scored as issued at the end of November and in March. Mar–Oct keeps the line.
- The page now computes what the line was fitted on: each member's max of **13:00 and 16:00** (it took every hour,
  +0.41 °C on average) and the grid cell's own height (`elevation=nan`; Open-Meteo's downscaling moved Surat Thani's
  temperature +1.27 °C).
- The card's accuracy line says what was measured: ±2.5 °C and "usually a little high" in Mar–Oct; ±1.5 °C, provisional,
  in Nov–Feb; the raw model "3–5 °C low".
- `research/archive_forecasts.mjs` saves the page's own forecast for 12 points with every member's raw maxima, for
  the as-issued scoring.

**A false alarm removed (S6):** from 16:00 the "today" heat window had no afternoon, and the daily-maximum correction
turned an evening's raw 34.9 °C into 40.5 °C with a 31 % chance of "อันตราย". Such a window now has no heat summary
(`outlook.hasAfternoon`). The walk has an 18:30 page.

**Words that say what the data says:**
- Heat is "รู้สึกเหมือน 43 °C" / "feels like" (U3); the table row is "ร้อนที่รู้สึก"; in the verdict the band is a
  level ("ระดับเตือนภัย"), so it isn't read as TMD's notice (U9).
- The rain tile's word is the gauge's only when the gauge raised it ("ไม่มีฝน" read as today's forecast, U5);
  no "about under 10%" (U21).
- The quake tile counts today's far or small quakes instead of "none reported" above them (U8); the lowest felt words
  only from M5.5, the size the felt reports behind them come from (U15).
- Landslide: "ใกล้หมู่บ้านเสี่ยง" instead of "พื้นที่เสี่ยง" (U14). GDACS failing is said (U24).
- A tile without a level shows no number (U13, U12).
- The flood card names the tile's gauge first; a river that doesn't judge the point loses its status word with 1 m or
  more to spare (KI-008, S10).

**Search** (U2, U20): a province opens its town's subdistrict (ต.ศรีภูมิ, not a mountain 40 km away at 994 m), a district
its seat, by code (`#t=`), labelled in the page's language.

**Layout and access:**
- The 3-day table fits 320 px with ก+ (it hid tomorrow; S5, U7), with dots in every cell and the level's word for
  screen readers (KI-025).
- Tap targets 44 × 44 both ways: ↻ and the hotline numbers (V28, S9); the warning's toggles (U23).
- Contrast: the LINE button 7.3:1 (was 2.26), level-0 words and dots 6.0:1 (was 4.44) (U18); a focus ring in the
  link colour (U22); two undefined CSS variables (U19).
- The verdict's live region speaks once it has settled (U11). TMD's "full notice" opens its warnings page, not the
  CAP XML (U10).

**Privacy** (U17): no coordinates on screen for a GPS or saved place, not even rounded.

**The deploy was refused** (09:23 UTC): the owner's new token lacks *Workers Scripts: Edit*; nothing was created on
Cloudflare. `node tools/env-check.mjs --probe` now tests the deploy permission with a read-only call (S13).

**Collector files that stopped are missing, not calm** (S12): the page ignores `data/live/` files when `index.json` is
more than 2 h old (`sources.liveFresh`); KV keeps the last upload forever, and a stale empty list read as "no warning".

**Tests:** 82 unit tests (61 before); the walk adds the table's box at 320 px, tap targets both ways, the evening,
no-data tiles and no coordinates for a GPS place. `test/cloud.test.mjs` no longer assumes the placeholder KV id (S7).

**Docs:** GUIDELINES 3b, 3e, §2, §6 ("walk the clock"), §8 (D-045); FRANK_FEEDBACK §7.

### Earlier on 24 Oct (in 0.4.0): the move off FloodWatch's server

**The move to a server of its own** (24 Oct 2026; D-040 … D-043):
- 0.3.0's stack had been set up on FloodWatch's production server by mistake. The owner is moving it to a dedicated
  server for risk and replacing the Cloudflare token.
- `npm run preflight` (`tools/preflight.mjs`) checks whether a host is ready. It is read-only and prints no values; 2 tests.
  - It **fails** on a host running FloodWatch's containers, without `.env` or a deploy token, or when `wrangler.jsonc`
    and `.env` name different KV namespaces.
  - It **warns** on other apps' containers, a `.env` others can read, names this project doesn't read (a copied
    file), or the placeholder KV id.
- [docs/SERVER.md §2](docs/SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server) is the risk server's runbook:
  - what the server needs;
  - the fresh `.env`, with where each value comes from;
  - install and go live, with "done when";
  - what was removed from FloodWatch's server.
- **Docs:**
  - "the risk server" wherever the collector's host was FloodWatch's;
  - Air4Thai's 173 stations and ThaiWater's 429 marked as that host's results;
  - OWNER_ACTIONS: A6 open again, A7 decided, A9 new tokens, A11 and A13 done, new A12;
  - KNOWN_ISSUES: KI-029 updated, new KI-032;
  - GUIDELINES §8 "one server per app" and "re-issue, don't copy", and §9 "push before leaving a server";
  - APPROACH §9;
  - FRANK_FEEDBACK §6;
  - HISTORY §7.
- **Comments** in `.env.example` (fresh on every server; a GLM key of its own), `docker-compose.yml` and `tools/cf-deploy.mjs`.
- **Git and cleanup:**
  - `main` was fast-forwarded to the work branch, and both were pushed.
  - Then this project's Docker volume and images were removed from FloodWatch's server; FloodWatch was left untouched.
  - The checkout itself (with `.env` and `.env.floodwatch-original`) is the owner's to delete: Claude Code's safety
    check stops an agent from removing its own working directory (A11).

## 0.3.0 (23 Oct 2026, not deployed): Cloudflare-ready at risk.autobahn.bot, GLM English for TMD's warnings, the live cross-check's fixes

**Cloudflare** ([docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)), prepared and tested locally:
- The page as Workers static assets at the edge (`wrangler.jsonc`: `risk.autobahn.bot`, `run_worker_first: ["/data/live/*"]`, no logs).
- `worker/index.mjs` serves `/data/live/*` from KV with `_headers`' headers, ETag/304, 404, 405 and a 60 s edge cache.
- The collector uploads its files to KV in one bulk PUT per run (`tools/publish-live.mjs`).
- `npm run cf:setup` (KV namespace), `npm run cf:deploy` (pinned wrangler 4.148.0, falls back to Docker on Node 20).
- Checked with a dry run, `wrangler dev` on the real files and unit tests. **Not deployed:** the token can't write KV (OWNER_ACTIONS A9).

**GLM** ([docs/AI.md](docs/AI.md)), researched (models, prices, data terms, the family's measurements) and used in two places:
- The collector translates TMD's Thai-only warnings for the English page (`tools/translate.mjs`).
  - It is checked for numbers, Buddhist-era years, leftover Thai, added reassurance, TMD's region words and length.
  - One call per text, a daily cap, labelled as machine translation, with the Thai original one tap away.
  - Measured: 6 of 6 accepted, median 3.4 s.
- `npm run ai:review-copy` gives a first reading of the Thai copy for the native reviewer.
  - 95 of 207 strings flagged; three suggestions were harmful; none applied.

**The live cross-check** ([docs/research/crosscheck-live-2026-10-23.md](docs/research/crosscheck-live-2026-10-23.md), `research/crosscheck_live.mjs`):
- Under TMD's Severe heavy-rain notice, the ensemble said "low" in all 11 warned provinces, and the page said
  "TMD warning · Heavy rain: low chance". Now the notice takes the tile's value ("until 08:00 today") and the 3-day
  table's cells ("📢 เตือนภัย"), and the card says the model is milder and to follow TMD (KI-F25).
- TMD's and EMSC's quakes agree where both report (M4.2 Laos, 0 km).
- GISTDA's estimate is ×1.27 the PCD's stations (second snapshot).
- ThaiWater rate-limits the server FloodWatch shares (KI-029).

**Visitor fixes:**
- The verdict on the first screen of a 360 × 640 LINE phone (504 px, was 642): the finder folds to "🔎 ดูที่อื่น" while a place is open (KI-F23).
- No verdict level until the forecast, air quality and warnings answer, or 5 s ("กำลังดึงข้อมูล (n จาก 10 เรื่อง)", KI-F24).
- The 3-day table moved above the cards. Its rain row is now "โอกาสฝนหนัก" with one word per cell, instead of
  "ฝน มม." with the word doubled, and its note is corrected (KI-F26).
- Link previews: Open Graph tags and a 1200 × 630 card (`public/og.png`); PNG icons for Android and iPhone (`tools/make-images.mjs`).

**Server and secrets:**
- `.env.example` rewritten for this project: public host, Cloudflare, KV, GLM, optional keys.
- `.env` is git-ignored with every copy (`.env.*`), plus `.wrangler/` and `.dev.vars`.
- `tools/env-check.mjs` (states, never values; `--probe` tests the keys) and `tools/env.mjs`.
- docker-compose.yml passes the collector only its own variables.
- The collector's User-Agent names `risk.autobahn.bot` and an optional contact.
- Ran on the owner's server: 5 of 5 files, **Air4Thai 173 stations** (A6 done).

**Checks:** 59 unit tests (13 new in `test/cloud.test.mjs`, plus the warning-lift test widened); the visitor walk now
has 29 checks (new: the folded finder, the verdict at 360 × 640 in LINE, no interim verdict, the English warning, no
model chance beside the warning).

## 0.2.0 (23 Oct 2026, not deployed): validated forecasts, the audits' fixes, server-ready

**Forecasts, as the validation found them** ([docs/MODELS.md](docs/MODELS.md)):
- **Heat index corrected:** the raw ensemble read about 5 °C low against TMD's stations. Each member is now corrected (HI = 10.4 + 0.86·HI_raw) and dressed (SD 2.95 °C): held-out MAE fell from 4.7–5.1 to 2.4 °C, and the 10–90 % range held 82 %. Only corrected values are shown, with the window ("บ่ายนี้") and the tested skill.
- **PM2.5 by the damped ratio** (measured × CAMS change^0.45–0.55), which beat persistence, the planned ratio and raw CAMS on every disjoint test. Days 2–3 show the band word with "อาจเปลี่ยน".
- **Rain as three words** (โอกาสฝนหนัก ต่ำ / มีโอกาส / สูง at 10 % and 40 %), no forecast amounts: a point's heavy rain 1–2 days ahead is mostly missed.
- **Quakes in the validated words** ("อาจรู้สึกได้" from 2.5, "รู้สึกได้ชัด" from 4.5), with + 1.06 MMI in greater Bangkok within 1,600 km. Never "ไม่รู้สึก", never damage words.
- **Gusts** labelled not validated.

**Levels:**
- A forecast alone stops at เตรียมตัว; "ทำทันที" needs a measurement or an agency warning.
- A TMD warning lifts its hazard's tile, leads the verdict and heads the pre-warnings.
- Missing data is never calm: rain and wind need the forecast, flood needs gauges, unchecked warnings are listed as missing.

**The output cross-check's findings fixed (M1–M5, H1–H4):**
- Air4Thai failures are worded as failures, and a late station is shown with its age.
- UV names today's peak before dawn.
- No gauge means no data.
- CAP warnings lift tiles.
- The under-2 line follows every mask line.
- English heat words are บ้านรอดไหม's.
- The rain card links to the flood guide.

**The visitor audit's blockers and most majors fixed:**
- V1–V4: never "act now" from a forecast, warnings first, offline works (every module cached, tested), no calm from missing data.
- V7–V11: UV, both rain lines in the pre-warnings, late stations, no coordinates on screen for GPS and a rounded FloodWatch link, Photon named as the receiver of search text.
- V14–V16: the warning box shows TMD's instruction, times and link.
- V20: share text with the date, level and hazard; subdistricts by `#t=`.
- V22–V26: point requests start before the subdistrict table, dark-mode age badge, hotspots over 24 h by pass time, no misleading model clock, floored heat numbers.
- V30, V36, V41.

The rest is in [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) (KI-022 … KI-027).

**Server-ready** ([docs/SERVER.md](docs/SERVER.md)):
- `Dockerfile` and `docker-compose.yml` (web on 127.0.0.1:8090, the collector every 15 min, an optional Cloudflare tunnel), `.env.example`.
- `tools/health.mjs`.
- The collector's `--every` loop (600 s floor, clean SIGTERM, `LIVE_DIR`).
- `tools/serve.mjs` for production: `_headers` applied, gzip, ETag, no request logs.
- Tested in Docker: both containers healthy, 4 of 5 collector files written (Air4Thai 503).

**Collector:** when no FIRMS file is read, the run fails for that file instead of writing "0 hotspots".

**Checks:** 46 unit tests (12 new, one per fixed finding); the 23-check visitor walk on fixtures and on live sources.

## 0.1.0 (23 Oct 2026, not deployed)

First version, built and checked in one agent session.

- **The page:** GPS (on a tap) or search → the point → the nearest of 7,425 subdistricts (on the phone) → a verdict, ten hazard tiles in a fixed order (rain, flood, PM2.5, heat, earthquakes, fires, wind and storms, UV, landslide, other pollution), detail cards, pre-warnings, a 3-day table, a long-term place profile and official channels. Thai and English, larger text (ก+), dark mode, installable (manifest, offline shell).
- **Levels named by what to do** (ยังไม่น่าห่วง · ติดตามไว้ · เตรียมตัว · ทำทันที) with a 4-dot meter; every tile leads with the agency's own word; the verdict is never milder than a tile; missing data is never calm.
- **Forecasts:** the ECMWF ensemble (51 members via Open-Meteo) for heat index, rain and gusts, as a median, a 10–90 % range and chances; CAMS PM2.5 corrected by the nearest measurement; AWW12 felt intensity for quakes.
- **Measurements first:** PCD stations (Air4Thai) before GISTDA's estimate; ThaiWater rain gauges and water levels, judged by FloodWatch's own bank and point rules; HII's flash-flood list; EMSC, USGS, JMA, GDACS; DMR landslide villages and fault subdistricts.
- **Search:** instant matches on subdistricts, districts and provinces; Enter → Photon, then Nominatim, with FloodWatch's soi variants; the geocoder is switchable in `config.json`.
- **Privacy:** the exact fix never leaves the phone (providers get ~1 km); shared links carry a subdistrict code; saved places stay in the browser; no server, cookies or analytics.
- **The collector** (`tools/collect.mjs`) for TMD warnings (CAP, by province code), TMD quakes and storm tracks, NASA FIRMS hotspots and Air4Thai (certificate chain fixed for that host only).
- **Checks:** 34 unit tests on saved live responses; a 23-check visitor walk in headless Chromium; a gauge cross-check with FloodWatch (691 of 693 agree); an advice-sync check with บ้านรอดไหม; independent visitor and output audits; forecast validation (docs/MODELS.md).
- **Research recorded** in `docs/research/`: thresholds, sources, UX, forecast validation, audits.

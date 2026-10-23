# Changelog

## Unreleased

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

# Changelog

## Unreleased

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

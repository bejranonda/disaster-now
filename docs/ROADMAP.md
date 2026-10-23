# Roadmap

Each item has a "done when". **AI-ready** items need nothing from the owner; **owner** items wait for [OWNER_ACTIONS.md](OWNER_ACTIONS.md).

## Done

- **v0.1.0 (23 Oct 2026):** the page, ten tiles, the verdict, the 3-day outlook and pre-warnings from the ECMWF ensemble, search, saved places, sharing by subdistrict code, Thai and English, the collector, unit tests, the visitor walk, the FloodWatch cross-check.
- **v0.2.0 (23 Oct 2026):** validated forecasts (the heat correction, the damped PM2.5 ratio, rain words, felt words with the Bangkok term), the output cross-check's and the visitor audit's main findings, and a Docker stack for the server.

See [CHANGELOG.md](../CHANGELOG.md).

## v0.3: live (owner)

1. **Put it on a server** (A1, A3, A7) following [SERVER.md](SERVER.md): `docker compose up -d --build` on FloodWatch's server, a public hostname through a tunnel. *Done when* the URL answers, `data/live/index.json` is fresh, and the fire, warning and storm tiles show data.
2. **Air4Thai from Thailand** (A6). *Done when* `index.json` lists `air4thai.json` with 170 or more stations.
3. **Real-phone test** inside LINE (A4). *Done when* the 12 tasks of the UX scout's script pass on an Android and an iPhone.
4. **FloodWatch CORS** for `/api/point` and `/api/geocode` (B1, B2), then flip `public/config.json`. *Done when* the flood tile names FloodWatch as its source for a Bangkok point.

## v0.3 also: what the audits left (AI-ready)

In order. Each item names its known issue and audit finding.

1. **The verdict above the fold at 360 × 640** (KI-022, V5). *Done when* the smoke test measures the verdict's bottom under 640 px at 360 × 640 with a LINE user agent.
2. **No interim milder verdict** (KI-026, V21). *Done when* a throttled smoke run shows no level before the ensemble, air quality and warnings have answered or 5 s have passed.
3. **The 3-day table** above the cards, with meters, words and "คืนนี้" (KI-025, V13). *Done when* the table is within two screens at 390 px and every cell has dots and a word.
4. **Thai place names and units in Thai mode** (KI-024, V12). *Done when* no Latin capitals appear in a Thai quake line, and dust reads "มคก./ลบ.ม.".
5. **Search that finds local names** (KI-012, V19): bias Photon by the last place, expand "ม.", a landmark list. *Done when* "ม.เชียงใหม่" and "นิมมาน" find Chiang Mai University and the road.
6. **The flood line that contradicts itself** (KI-008, V17). *Done when* the tile names its gauge and a river line with 1 m or more of freeboard carries no "ใกล้ล้นตลิ่ง".
7. **The polish list** (KI-027): tap widths, rem sizes, line breaks, one name per hazard, saved places, at-risk dust lines (from บ้านรอดไหม's `kit.json → air`), a retry, the welcome screen with TMD's notices.
8. **Fixtures for bad days** (KI-020): a wet, a smoky, a warning and a felt-quake state for the smoke walk, from the visitor audit's states.

## v0.4: the server's own jobs (AI-ready once the server exists)

From [SERVER.md §6](SERVER.md#6-what-to-build-on-the-server-next):
1. A GDACS digest (KI-016).
2. **District forecast files**: the ensemble and CAMS once per district centre (928) after each ECMWF run, published as `data/live/district/<code>.json`. *Done when* the page reads the district file first and calls Open-Meteo only if it's missing. Then no point leaves the phone for the weather (KI-011).
3. National files by code (ThaiWater by province, HII, a DMR profile).
4. An archive of the issued forecasts and collector files, for the validation's re-tests.

## v0.5: more of the situation (AI-ready unless marked)

1. **ONWR's official flood warning** for the point, today to +3 days, from its tile service (CORS reflected; research/sources gap 2), after the owner asks ONWR (C4). *Done when* the flood tile quotes ONWR's word for the point's tile and its update time.
2. **"Water seen near you"**: Copernicus GFM and NASA VIIRS flood pixels, worded "เห็นน้ำ" / "เมฆบัง", never "ไม่ท่วม". *Done when* a point in a GFM flood polygon shows the satellite pass time.
3. **JTWC's Indian Ocean bulletins** for the Andaman Sea and the Bay of Bengal (JMA doesn't cover them). *Done when* a parser has a saved bulletin as a test.
4. **TMD's keyless XML in the collector**: the announcement text (`storm-tracking`), regional forecasts, and TMD's clear-sky UV CSV (77 stations, 7 days). *Done when* the UV tile can use TMD's own forecast.
5. **The place profile per subdistrict at build time**: DMR flash-flood class and sinkholes, ThinkHazard's district levels (labelled "ภาพรวมระดับโลก ปี 2020"), and GISTDA's flood years once keyed (C2). *Done when* `data/profile.json` exists and the profile lists them with sources.
6. **Air4Thai's full pollutants and ThaiWater's salinity** (สำแล) in the collector.
7. **A map** (Leaflet, loaded only when asked) to pick a point by tapping, as FloodWatch does. The UX scout advised against a map on the first screen.
8. **Measure the nearest-centre error** near district borders from the boundary file (KI-006).

## v0.6: forecasts ([MODELS.md §7](MODELS.md#7-what-is-still-to-test))

1. **Re-test the damped PM2.5 ratio as issued** in the 2026–27 dry season (it was chosen post-hoc), from the server's archive.
2. **Test the heat correction at 72 h** and on the deterministic fallback.
3. **A neighbourhood rain chance** ("within 25 km"), which may score better than a point.
4. **Gusts** against any station records that carry them.
5. **Reliability of the ensemble's chances** before changing the chance rule.
6. **The quake words** after the next felt event, and a site term for other soft basins (KI-010).

## Not planned (and why)

- **Push notifications:** they need a server keeping subscriptions (PDPA) and don't work inside LINE's browser. Official Cell Broadcast and LINE ALERT exist.
- **An earthquake forecast:** none exists.
- **An "AI summary":** the tiles' words are the agencies'; an AI paraphrase would add risk (FloodWatch D-022).

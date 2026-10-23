# Roadmap

Each item has a "done when". **AI-ready** items need nothing from the owner; **owner** items wait for [OWNER_ACTIONS.md](OWNER_ACTIONS.md).

## v0.1.0 (23 Oct 2026): built, not deployed

The page, ten tiles, the verdict, the 3-day outlook and pre-warnings from the ECMWF ensemble, search (subdistricts on the phone, Photon/Nominatim on Enter), saved places, sharing by subdistrict code, Thai and English, the collector, unit tests, the visitor walk, the FloodWatch cross-check. See [CHANGELOG.md](../CHANGELOG.md).

## v0.2: live (owner)

1. **Deploy** (A1) and **run the collector** on FloodWatch's server (A3). *Done when* the URL answers, `data/live/index.json` is fresh, and the fire, warning and storm tiles show data.
2. **Real-phone test** inside LINE (A4). *Done when* the 12 tasks pass on an Android and an iPhone.
3. **FloodWatch CORS** for `/api/point` and `/api/geocode` (B1, B2), then flip `public/config.json`. *Done when* the flood tile names FloodWatch as its source for a Bangkok point.

## v0.3: more of the situation (AI-ready unless marked)

1. **ONWR's official flood warning** for the point, today to +3 days, from its tile service (CORS reflected; research/sources gap 2) — after the owner asks ONWR (C4). *Done when* the flood tile quotes ONWR's word for the point's tile and its update time.
2. **"Water seen near you"**: Copernicus GFM and NASA VIIRS flood pixels, worded "เห็นน้ำ" / "เมฆบัง", never "ไม่ท่วม". *Done when* a point in a GFM flood polygon shows the satellite pass time.
3. **JTWC's Indian Ocean bulletins** for the Andaman Sea and the Bay of Bengal (JMA doesn't cover them). *Done when* a parser has a saved bulletin as a test.
4. **TMD's keyless XML in the collector**: the announcement text (`storm-tracking`), regional forecasts, TMD's clear-sky UV CSV (77 stations, 7 days). *Done when* the UV tile can use TMD's own forecast.
5. **The place profile per subdistrict at build time**: DMR flash-flood class and sinkholes, ThinkHazard's district levels (labelled "ภาพรวมระดับโลก ปี 2020"), and GISTDA's flood years once keyed (C2). *Done when* `data/profile.json` exists and the profile lists them with sources.
6. **Air4Thai's full pollutants and ThaiWater's salinity** (สำแล) in the collector.
7. **A map** (Leaflet, loaded only when asked) to pick a point by tapping, as FloodWatch does. The UX scout advised against a map on the first screen.
8. **District forecast files from the collector** (KI-011): the ensemble and CAMS fetched once per district centre (928) after each ECMWF run, published as `data/live/district/<code>.json`. *Done when* the page reads the district file first and calls Open-Meteo only if it's missing; then no point leaves the phone for the weather, and Open-Meteo's per-IP limit is the collector's alone.
9. **Measure the nearest-centre error** near district borders from the boundary file (437 MB GeoJSON, offline), and ship a point-in-polygon province file if it matters for TMD warnings.

## v0.4: forecasts ([MODELS.md](MODELS.md))

1. **Ship the PM2.5 correction that won on the disjoint test** (MODELS §1), with its coefficients in `research/out/calibration.json`, and say "ปรับตามค่าวัด" on screen.
2. **Heat-index and heavy-rain skill at 24 and 48 h** once a forecast archive is reachable (Open-Meteo's previous-runs API refused the shared research IP; ECMWF open data on AWS is the other way). *Done when* POD/FAR at ≥ 42 °C and ≥ 35 mm are measured on a disjoint season and shown in MODELS.md.
3. **Reliability of the ensemble's chances** (are "40 %" days wet 40 % of the time?) before changing the chance rule.
4. **A site term for felt intensity in Bangkok** (soft clay), only if DYFI data support it.

## Not planned (and why)

- **Push notifications:** need a server keeping subscriptions (PDPA) and don't work inside LINE's browser; official Cell Broadcast and LINE ALERT exist.
- **An earthquake forecast:** none exists.
- **An "AI summary":** the tiles' words are the agencies'; an AI paraphrase would add risk (FloodWatch D-022).

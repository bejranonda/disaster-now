# Changelog

## Unreleased

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

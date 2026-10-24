# research/

Scripts, logs and small data behind the numbers in `docs/`. Every script says at its top how to run it. Big downloads stayed in the session's scratchpad; only small derived files are here.

- `probe_sources.sh` — re-test the app's sources (one call each).
- `gistda_vs_pcd.py` — GISTDA's PM2.5 estimate vs the PCD's stations by province.
- `crosscheck_floodwatch.mjs` — this app's gauge statuses vs FloodWatch's (`--now` to replay the archived inputs in `data/`).
- `ux_palette_check.py` — the level colours under colour-blindness simulation, and their contrast.
- `tc_distance.py` — distance from a point to a storm's track (the sources scout's).
- `heat_index.py`, `common.py`, `e1e2_weather.py`, `e3_pm25.py`, `e4_quake_ipe.py`, `ecmwf_open.py`, `crosscheck_openmeteo_grib.py` — the forecast validation (docs/research/forecast-validation-2026-10-23.md, docs/MODELS.md).
- `logs/` — the output of every run, with the command and time at the top.
- `out/` — machine-readable results (`calibration.json` is what the app may use).
- `data/` — small derived tables and the archived cross-check inputs.
- `raw/` — the scouts' raw call records (headers, errors and small bodies; cookies and request ids stripped).

Model check of 24 Oct 2026 (docs/research/model-check-2026-10-24.md):
- `lib/grib2_ccsds.mjs`: a pure-Node GRIB2 reader for ECMWF open data (CCSDS/AEC packing), with no eccodes needed. `ecmwf_points.mjs` (HRES) and `ecmwf_ens_points.mjs` (ENS, 51 members) use it to keep station values only.
- `fetch_ghcnh.py`, `fetch_iem_metar.py`: NCEI GHCNh station files and IEM's METAR history (8 airports), into the scratchpad.
- `heat_region_season.py`: the pre-registered test of the heat line by region and season. Its tables come from `model_check_tables.py`, and its pipelines are checked against the 23 Oct study by `obs_pipeline_check.py`.
- Post-hoc and descriptive checks: `heat_cool_posthoc.py`, `heat_tdtd_posthoc.py` (C6), `heat_ens_cool.py` (the page's ensemble method in Nov–Feb), `heat_cool_danger_days.py`, `heat_extra_checks.py`, `heat_sensitivity_check.py`, `bangkok_october_check.py`.
- `archive_forecasts.mjs`: run it once a day to save the page's own forecast summary for 12 points into `archive/<UTC date>/`. It makes 24 Open-Meteo calls and never calls ThaiWater. `archive_recompute_pm25.mjs` was the offline repair of the first run's PM2.5 block.
- `spot_check_metar.mjs` (METAR vs forecasts), `predictor_hours_check.mjs` (all-hours vs 13:00/16:00 max), `rh_crosscheck.mjs` (Open-Meteo vs GRIB members: RH and the elevation offset).

## The prediction research of 24 Oct 2026 (0.5.0)

Each study's scripts carry a prefix, write logs to `logs/<script>-2026-10-24.log` and results to `out/`:
- `aq_*.py`: PM2.5 and pollution (calibrated chances, weather and fire predictors, PM10 and ozone):
  [predict-air](../docs/research/predict-air-2026-10-24.md).
- `eq_*.py`: earthquakes (ComCat catalogue, aftershock forecasts against the base rate, felt-shaking rates, the 2564
  zones read from the Royal Gazette): [predict-earthquake](../docs/research/predict-earthquake-2026-10-24.md). Raw
  downloads (`data/eq_dyfi/raw/`, `data/eq_oaf/*.json`, `data/eq_opensha_oaf/`) are git-ignored; `eq_fetch_*.py`
  re-fetches them.
- `hz_*.py`: fire weather, neighbourhood rain, GloFAS, drought: [predict-hazards](../docs/research/predict-hazards-2026-10-24.md).
- `hy_*.mjs`: the Hat Yai flood of Nov 2025, a hindcast on ECMWF ensemble runs as issued (the 62 MB of extracted
  values stayed in the session scratchpad; `hy_fetch_ens_tp.mjs` re-reads them from ECMWF's open-data mirror):
  [hatyai-flood-2025-hindcast](../docs/research/hatyai-flood-2025-hindcast.md).


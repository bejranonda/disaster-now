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

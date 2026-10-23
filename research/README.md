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

# Research records (23 Oct 2026)

Everything researched for Disaster Now, kept as it was found. Start with [HISTORY.md](HISTORY.md) (the timeline, the decisions and the dead ends); [briefs-2026-10-23.md](briefs-2026-10-23.md) has what each researcher was asked. The app's distilled reference is [../KNOWLEDGE.md](../KNOWLEDGE.md).

| Record | Who | What it holds | Reproduce |
|---|---|---|---|
| [HISTORY.md](HISTORY.md) | lead | timeline, 19 decisions with reasons, researchers' findings in short, dead ends | — |
| [briefs-2026-10-23.md](briefs-2026-10-23.md) | lead | the six researchers' briefs | give the same brief to a new agent |
| [thresholds-2026-10-23.md](thresholds-2026-10-23.md), [.json](thresholds-2026-10-23.json) | researcher 1 | the official cut points for every hazard, with Thai quotes, URLs and status; the recommended level scheme; 51 sources | re-open the URLs listed |
| [sources-2026-10-23.md](sources-2026-10-23.md) | researcher 2 | 110 live calls (19:52–20:11 UTC) on the gaps the earlier research left; every call in its appendix | `research/raw/sources-scout-2026-10-23.tar.gz` (headers, errors, small bodies; cookies stripped) |
| [ux-scout-2026-10-23.md](ux-scout-2026-10-23.md) | researcher 3 | 20 apps compared, risk-communication evidence, Thai audience rules, FloodWatch's search adapted, the 390 px layout, a 12-task visitor script | `python3 -I research/ux_palette_check.py` |
| [forecast-validation-2026-10-23.md](forecast-validation-2026-10-23.md) | researcher 4 | PM2.5 (CAMS vs PCD, corrections), felt intensity (AWW12 vs DYFI), heat and rain skill | `research/e*.py`, logs in `research/logs/` |
| [visitor-audit-2026-10-23.md](visitor-audit-2026-10-23.md) | auditor 5 | personas, the 12-task script, findings | `npm run smoke`, the personas' steps |
| [output-crosscheck-2026-10-23.md](output-crosscheck-2026-10-23.md) | auditor 6 | every number on the page vs its source, recomputed; consistency with FloodWatch and บ้านรอดไหม | the commands in the record |

**The lead's own measurements** (in `research/`):

| Script | Result | Log |
|---|---|---|
| `probe_sources.sh` | 26 sources: status, size, CORS (19:47 UTC) | `logs/probe-2026-10-23.log`, `raw/probe-2026-10-23.tar.gz` |
| `gistda_vs_pcd.py` on `test/fixtures/` | GISTDA/PCD median 1.31 (IQR 0.98–1.56) in 60 provinces; same app level in 44 | `logs/gistda-vs-pcd-2026-10-23.log` |
| `crosscheck_floodwatch.mjs` on `data/*_2026-10-23T2023Z.json.gz` | 691 of 693 gauges agree with FloodWatch | `logs/crosscheck-floodwatch-2026-10-23.log` |
| `ux_palette_check.py` | contrast 5.2–11.2 : 1; smallest colour difference 18.4 (tritan) | `logs/ux-palette-2026-10-23.log` |
| `tc_distance.py` (sources scout) | distance from a point to a storm's track and 70 % circles | in the sources record |

Earlier research this builds on (other repositories): Hazard-huntz `docs/08-open-data.md`, `docs/09-server.md`, `docs/research/open-data-2026-10-21.md`, `docs/research/server-2026-10-21.md` (21 Oct 2026, 113 live calls, the PDPA and hosting); FloodWatch `docs/SOURCES.md`, `docs/KNOWLEDGE.md`, `src/floodwatch/point.py`, `geocode.py`.

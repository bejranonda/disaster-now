"""Experiment C, two more cheap calls (hazards research, 2026-10-24): (1) the Nan main-stem cell found by
research/hz_glofas.py during the August 2026 Nan flood (news: 2 dead, 16,000 affected by 19 Aug 2026); (2) what the
Flood API serves as a forecast today (30 days, ensemble statistics) at the same cell.
Weights: 2.2 + 2.1 (ledger research/logs/openmeteo-calls-2026-10-24.log).
Run: python -I research/hz_glofas_now.py -> research/logs/hz_glofas-2026-10-24.log (appended)
"""
from __future__ import annotations

import datetime as dt
import pathlib
import sys

import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from hz_openmeteo import get, spent  # noqa: E402

LOGF = HERE / "logs" / "hz_glofas-2026-10-24.log"
CELL = (18.775, 100.725)  # Nan main-stem cell nearest N.1 (research/hz_glofas.py, second choice rule)
lines = [f"===== hz_glofas_now {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ}"]
js = get("https://flood-api.open-meteo.com/v1/flood",
         dict(latitude=CELL[0], longitude=CELL[1], daily="river_discharge", start_date="2026-08-01", end_date="2026-08-31",
              timezone="GMT"), "C glofas nan best cell 2026-08")
s = pd.Series(js["daily"]["river_discharge"], index=pd.to_datetime(js["daily"]["time"]), dtype=float)
lines.append(f"Nan cell {CELL}, Aug 2026: max {s.max():.0f} m3/s on {s.idxmax():%Y-%m-%d}; daily "
             + " ".join(f"{d:%d}:{v:.0f}" for d, v in s.items()))
v = "river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_min,river_discharge_p25,river_discharge_p75"
js2 = get("https://flood-api.open-meteo.com/v1/flood",
          dict(latitude=CELL[0], longitude=CELL[1], daily=v, forecast_days=30, timezone="GMT"), "C glofas nan best cell forecast 30 d")
f = pd.DataFrame(js2.get("daily", {}))
lines.append(f"forecast at the Nan cell (asked {dt.date.today()}): {len(f)} days from {f.time.iloc[0] if len(f) else '-'}; columns {list(f.columns)}")
if len(f):
    for k in (0, 1, 2, 3, 6, 13, 29):
        if k < len(f):
            r = f.iloc[k]
            lines.append("  " + ", ".join(f"{c} {r[c]}" for c in f.columns))
lines.append(f"weight spent by this task so far: {spent():.1f}")
print("\n".join(lines))
with LOGF.open("a") as fh:
    fh.write("\n".join(lines) + "\n")

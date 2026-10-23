"""Cross-check: are the values the app fetches from Open-Meteo's ensemble API
(models=ecmwf_ifs025) the same numbers as the ECMWF open-data GRIB fields this research
verified (nearest 0.25° point)? One Open-Meteo call; GRIB fields of three recent runs.

Run:  python3 research/crosscheck_openmeteo_grib.py
Writes research/logs/crosscheck_openmeteo_grib-2026-10-23.log.
"""
from __future__ import annotations

import datetime as dt
import json
import sys

import numpy as np

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import Log, om_get  # noqa: E402
from ecmwf_open import BUCKET, IDX, decode_points, fetch  # noqa: E402

L = Log("crosscheck_openmeteo_grib")
ST = "THM00048455"
LAT, LON = 13.7333, 100.5667
VALID = dt.datetime(2026, 10, 24, 12)       # a valid time covered by the 00, 06 and 12 UTC runs of 23 Oct


def main():
    j = om_get("https://ensemble-api.open-meteo.com/v1/ensemble",
               dict(latitude=LAT, longitude=LON, hourly="temperature_2m", models="ecmwf_ifs025",
                    timezone="GMT", forecast_days=3),
               "crosscheck: ensemble API now, Bangkok (48455)")
    h = j["hourly"]
    L.w(f"Open-Meteo grid point {j['latitude']},{j['longitude']} elevation {j.get('elevation')} m; "
        f"members {sum(1 for k in h if k.startswith('temperature_2m'))}")
    i = h["time"].index(VALID.strftime("%Y-%m-%dT%H:%M"))
    om = np.array([h[k][i] for k in sorted(h) if k.startswith("temperature_2m")], float)
    om_by_member = {int(k.split("member")[1]): h[k][i] for k in h if k.startswith("temperature_2m_member")}
    L.w(f"Open-Meteo T2m at {VALID:%Y-%m-%d %H} UTC: median {np.median(om):.2f}, min {om.min():.2f}, max {om.max():.2f}")
    best = None
    for run in (0, 6, 12):
        step = int((VALID - dt.datetime(2026, 10, 23, run)).total_seconds() // 3600)
        base = f"{BUCKET}/20261023/{run:02d}z/ifs/0p25/enfo/20261023{run:02d}0000-{step}h-enfo-ef"
        idx = fetch(base + ".index")
        recs = [json.loads(l) for l in idx.decode().splitlines() if l.startswith("{")]
        recs = [r for r in recs if r.get("param") == "2t" and r.get("levtype") == "sfc"]
        vals = {}
        for r in recs:
            buf = fetch(base + ".grib2", (r["_offset"], r["_offset"] + r["_length"] - 1))
            _, pts = decode_points(buf)
            vals[int(r.get("number", 0))] = pts[ST] - 273.15
        g = np.array(list(vals.values()))
        common_m = sorted(set(vals) & set(om_by_member))
        d = np.array([om_by_member[m] - vals[m] for m in common_m]) if common_m else None
        L.w(f"GRIB {run:02d}z step {step}: {len(g)} members, median {np.median(g):.2f}, min {g.min():.2f}, max {g.max():.2f}"
            + (f"; member-by-member difference Open-Meteo − GRIB (members 1–50; the -ef files hold no control): mean {d.mean():+.3f}, max |d| {np.abs(d).max():.3f} °C" if d is not None else ""))
        if d is not None and (best is None or np.abs(d).mean() < best[1]):
            best = (run, np.abs(d).mean())
    L.w(f"closest run: {best[0]:02d}z (mean |difference| {best[1]:.3f} °C)")


if __name__ == "__main__":
    main()

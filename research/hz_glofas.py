"""Experiment C (feasibility): what Open-Meteo's Flood API (GloFAS v4, 0.05 deg, default "seamless") returns for Thai
rivers, and whether its discharge lines up with known 2024 floods (hazards research, 2026-10-24).

One call per site (daily river_discharge, 2024-01-01..2025-12-31, weight 52.2), plus Aug-Nov 2022 for the Mun and the
Chao Phraya (weight 8.7 each); research/hz_openmeteo.py keeps the ledger. Open-Meteo picks "the largest river in a
5 km area" and returns the cell centre, which is logged. No ThaiWater calls.
Event dates are from news reports, cited in the report (docs/research/predict-hazards-2026-10-24.md); they are
compared with the dates of the series' peaks, not with measured discharge (none was read).
Run: python -I research/hz_glofas.py -> research/logs/hz_glofas-2026-10-24.log, research/out/hz_glofas.json
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import sys

import numpy as np
import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from hz_openmeteo import get, spent  # noqa: E402

LOGF = HERE / "logs" / "hz_glofas-2026-10-24.log"
# site: (lat, lon, river, place)
SITES = {
    "kok_chiangrai": (19.92, 99.83, "Kok", "Chiang Rai city"),
    "sai_maesai": (20.43, 99.88, "Sai", "Mae Sai"),
    "ping_chiangmai": (18.79, 99.00, "Ping", "Chiang Mai city (P.1)"),
    "nan_nan": (18.78, 100.78, "Nan", "Nan city (N.1)"),
    "yom_sukhothai": (17.01, 99.82, "Yom", "Sukhothai city"),
    "chaophraya_nakhonsawan": (15.70, 100.13, "Chao Phraya", "Nakhon Sawan (C.2)"),
    "chaophraya_bangkok": (13.75, 100.49, "Chao Phraya", "Bangkok"),
    "mun_ubon": (15.23, 104.86, "Mun", "Ubon Ratchathani (M.7)"),
}
EXTRA = {"mun_ubon": ("2022-08-01", "2022-11-30"), "chaophraya_nakhonsawan": ("2022-08-01", "2022-11-30")}
SEARCH = ["ping_chiangmai", "nan_nan", "yom_sukhothai", "chaophraya_nakhonsawan"]  # cells that came back as side cells
lines = []


def cell_search(site):
    """Added after the first run: the default cell was a side cell at 4 sites (median 0-10 m3/s on big rivers).
    Ask a 5 x 5 grid (0.05 deg, +-0.1 deg) for 20 Sep - 3 Oct 2024 in one call (weight 25) and keep the main-stem cell nearest
    the gauge; then read 1 Aug - 31 Oct 2024 there."""
    lat, lon, *_ = SITES[site]
    la = [round(lat + 0.05 * i, 3) for i in range(-2, 3) for j in range(-2, 3)]
    lo = [round(lon + 0.05 * j, 3) for i in range(-2, 3) for j in range(-2, 3)]
    js = get("https://flood-api.open-meteo.com/v1/flood",
             dict(latitude=",".join(map(str, la)), longitude=",".join(map(str, lo)), daily="river_discharge",
                  start_date="2024-09-20", end_date="2024-10-03", timezone="GMT"), f"C glofas cell search {site}")
    mean = lambda r: float(np.nanmean(np.array(r["daily"]["river_discharge"], dtype=float)))  # noqa: E731
    top = max(mean(r) for r in js)
    # the largest cell drifts downstream (rivers grow), so take the cell nearest the gauge among the main-stem cells
    # (mean >= half the largest in the grid); the second run's choice, after the first picked cells 13-18 km downstream
    dist = lambda r: float(np.hypot(r["latitude"] - lat, (r["longitude"] - lon) * np.cos(np.radians(lat))))  # noqa: E731
    best = min((r for r in js if mean(r) >= 0.5 * top), key=dist)
    means = sorted((mean(r) for r in js), reverse=True)
    big = max(js, key=mean)  # the first run's choice, kept in the log for the record
    log(f"  {site}: the largest-flow cell {big['latitude']:.3f},{big['longitude']:.3f} is "
        f"{111.2 * dist(big):.1f} km from the gauge (first-run choice, rejected: it drifts downstream)")
    return best["latitude"], best["longitude"], means


def log(s=""):
    print(s, flush=True)
    lines.append(s)


def series(site, start, end):
    lat, lon, *_ = SITES[site]
    js = get("https://flood-api.open-meteo.com/v1/flood",
             dict(latitude=lat, longitude=lon, daily="river_discharge", start_date=start, end_date=end, timezone="GMT"),
             f"C glofas {site} {start}..{end}")
    if "daily" not in js:
        return js, None
    s = pd.Series(js["daily"]["river_discharge"], index=pd.to_datetime(js["daily"]["time"]), dtype=float)
    return js, s


def main():
    log(f"===== hz_glofas {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ}")
    res = {}
    for site, (lat, lon, river, place) in SITES.items():
        js, s = series(site, "2024-01-01", "2025-12-31")
        if s is None:
            log(f"{site}: no data {js}")
            continue
        km = 111.2 * np.hypot(js["latitude"] - lat, (js["longitude"] - lon) * np.cos(np.radians(lat)))
        log(f"\n{site} ({river} at {place}): asked {lat},{lon}; cell {js['latitude']:.3f},{js['longitude']:.3f} ({km:.1f} km away); "
            f"n {s.notna().sum()} days, {s.isna().sum()} missing")
        log(f"  2024-25 discharge m3/s: median {s.median():.0f}, p90 {s.quantile(0.9):.0f}, max {s.max():.0f} on {s.idxmax():%Y-%m-%d}")
        for y in (2024, 2025):
            sy = s[s.index.year == y]
            top = sy.sort_values(ascending=False)
            peaks = []
            for d, v in top.items():  # three largest separate peaks (>= 10 days apart)
                if all(abs((d - p[0]).days) >= 10 for p in peaks):
                    peaks.append((d, v))
                if len(peaks) == 3:
                    break
            log(f"  {y}: annual max {sy.max():.0f} on {sy.idxmax():%Y-%m-%d}; top peaks " +
                ", ".join(f"{d:%d %b} {v:.0f}" for d, v in peaks) + f"; ratio of max to median {sy.max() / max(sy.median(), 1e-6):.1f}")
        # monthly means 2024 (Jul-Nov) to show the shape
        m = s["2024-07-01":"2024-11-30"].resample("MS").mean()
        log("  2024 Jul-Nov monthly mean: " + ", ".join(f"{d:%b} {v:.0f}" for d, v in m.items()))
        res[site] = dict(cell=[js["latitude"], js["longitude"]], km=round(float(km), 1), median=float(s.median()),
                         max=float(s.max()), max_date=f"{s.idxmax():%Y-%m-%d}",
                         daily_2024_aug_oct={f"{d:%Y-%m-%d}": round(float(v), 1) for d, v in s["2024-08-01":"2024-10-31"].items()})
        if site in EXTRA:
            js2, s2 = series(site, *EXTRA[site])
            if s2 is not None:
                log(f"  {EXTRA[site][0]}..{EXTRA[site][1]}: max {s2.max():.0f} on {s2.idxmax():%Y-%m-%d}; "
                    f"vs the 2024-25 max {s.max():.0f}")
                res[site]["max_2022_aug_nov"] = [float(s2.max()), f"{s2.idxmax():%Y-%m-%d}"]
    log("\nCell search (added after the first run) for the sites that returned a side cell:")
    for site in SEARCH:
        blat, blon, means = cell_search(site)
        js = get("https://flood-api.open-meteo.com/v1/flood",
                 dict(latitude=blat, longitude=blon, daily="river_discharge", start_date="2024-08-01", end_date="2024-10-31",
                      timezone="GMT"), f"C glofas {site} best cell 2024-08..10")
        s = pd.Series(js["daily"]["river_discharge"], index=pd.to_datetime(js["daily"]["time"]), dtype=float)
        lat, lon, river, place = SITES[site]
        km = 111.2 * np.hypot(blat - lat, (blon - lon) * np.cos(np.radians(lat)))
        top = []
        for d, v in s.sort_values(ascending=False).items():
            if all(abs((d - p[0]).days) >= 10 for p in top):
                top.append((d, v))
            if len(top) == 3:
                break
        log(f"  {site}: best cell {blat:.3f},{blon:.3f} ({km:.1f} km from the gauge); 25-cell means (20 Sep-3 Oct 2024) top 5 "
            f"{[round(m) for m in means[:5]]}; Aug-Oct 2024 max {s.max():.0f} on {s.idxmax():%Y-%m-%d}; peaks "
            + ", ".join(f"{d:%d %b} {v:.0f}" for d, v in top))
        res.setdefault(site, {})["best_cell"] = dict(cell=[blat, blon], km=round(float(km), 1), max=float(s.max()),
                                                    max_date=f"{s.idxmax():%Y-%m-%d}",
                                                    daily={f"{d:%Y-%m-%d}": round(float(v), 1) for d, v in s.items()})
        if site == "chaophraya_nakhonsawan":
            js2 = get("https://flood-api.open-meteo.com/v1/flood",
                      dict(latitude=blat, longitude=blon, daily="river_discharge", start_date="2022-08-01", end_date="2022-11-30",
                           timezone="GMT"), f"C glofas {site} best cell 2022-08..11")
            s2 = pd.Series(js2["daily"]["river_discharge"], index=pd.to_datetime(js2["daily"]["time"]), dtype=float)
            log(f"    2022 Aug-Nov at the best cell: max {s2.max():.0f} on {s2.idxmax():%Y-%m-%d}")
    log(f"\nOpen-Meteo weight spent by this task so far: {spent():.1f}")
    (HERE / "out" / "hz_glofas.json").write_text(json.dumps(res, indent=1))
    with LOGF.open("a") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()

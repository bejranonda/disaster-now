"""Does GWIS's fire danger (layer nasa_geos5.query: the FWI the page could quote) match the ERA5-based FWI that
Experiment A validated?  Chiang Mai and Nan, 1 Jan - 30 Apr 2026 (hazards research, 2026-10-24).

GWIS: one GetFeatureInfo a day and point, 1.5 s apart (values FWI, FFMC, DMC, DC, ISI, BUI: order verified in
research/hz_gwis_probe.py). What GWIS stores for a past date (analysis or the day-1 forecast) is not documented in
what was read [unverified]. ERA5: research/hz_fire_fetch.py's call for season 2026 (weight 10.9 a point) and the same
FWI code (research/hz_fwi.py), started 1 Dec 2025.
Run: python -I research/hz_gwis_vs_era5.py -> research/logs/hz_gwis_vs_era5-2026-10-24.log, research/data/hz_gwis_era5_2026.csv
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import sys
import time

import numpy as np
import pandas as pd
import requests

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import hz_fwi  # noqa: E402
from hz_fire_fetch import HOURLY, POINTS  # noqa: E402
from hz_openmeteo import HZ, get  # noqa: E402

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
LOGF = HERE / "logs" / "hz_gwis_vs_era5-2026-10-24.log"
OUT = HERE / "data" / "hz_gwis_era5_2026.csv"
CACHE = HZ / "gwis"
CACHE.mkdir(parents=True, exist_ok=True)
BASE = ("https://maps.effis.emergency.copernicus.eu/gwis?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo"
        "&LAYERS=nasa_geos5.query&QUERY_LAYERS=nasa_geos5.query&STYLES=&SRS=EPSG:4326&WIDTH=3&HEIGHT=3&X=1&Y=1"
        "&INFO_FORMAT=text/plain")
lines = []


def log(s):
    print(s, flush=True)
    lines.append(s)


def gwis(name, lat, lon, day):
    f = CACHE / f"{name}_{day}.json"
    if f.exists():
        return json.loads(f.read_text())
    u = f"{BASE}&BBOX={lon - 0.05:.2f},{lat - 0.05:.2f},{lon + 0.05:.2f},{lat + 0.05:.2f}&TIME={day}"
    r = requests.get(u, headers={"User-Agent": UA}, timeout=60)
    time.sleep(1.5)
    m = re.search(r"value_list = '([^']+)'", r.text)
    v = [float(x) for x in m.group(1).split(",")] if m else None
    f.write_text(json.dumps(v))
    return v


def era5(name, lat, lon):
    js = get("https://archive-api.open-meteo.com/v1/archive",
             dict(latitude=lat, longitude=lon, start_date="2025-12-01", end_date="2026-04-30", hourly=HOURLY, models="era5",
                  timezone="Asia/Bangkok"), f"A fire ERA5 {name} 2026 (GWIS check)")
    h = pd.DataFrame(js["hourly"])
    h["time"] = pd.to_datetime(h["time"])
    h = h.set_index("time")
    r24 = h["precipitation"].rolling(24).sum()
    noon = h[h.index.hour == 12].copy()
    noon["rain24"] = r24.reindex(noon.index).fillna(0)
    days = [(d.month, t, rh, w, r) for d, t, rh, w, r in zip(noon.index, noon.temperature_2m, noon.relative_humidity_2m,
                                                              noon.wind_speed_10m, noon.rain24)]
    c = pd.DataFrame(hz_fwi.series(days, lat), index=noon.index.normalize())
    return c


def main():
    log(f"===== hz_gwis_vs_era5 {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ}")
    rows = []
    for name in ("chiang_mai", "nan"):
        lat, lon, _ = POINTS[name]
        e = era5(name, lat, lon)
        for d in pd.date_range("2026-01-01", "2026-04-30"):
            v = gwis(name, lat, lon, f"{d:%Y-%m-%d}")
            if v is None:
                continue
            r = dict(point=name, date=d, g_fwi=v[0], g_ffmc=v[1], g_dmc=v[2], g_dc=v[3], g_isi=v[4], g_bui=v[5])
            if d in e.index:
                r.update({f"e_{k}": float(e.loc[d, k]) for k in ("fwi", "ffmc", "dmc", "dc", "isi", "bui")})
            rows.append(r)
    df = pd.DataFrame(rows).dropna()
    df.to_csv(OUT, index=False, float_format="%.3f")
    log(f"days with both: {len(df)} ({df.groupby('point').size().to_dict()})")
    for k in ("fwi", "ffmc", "dmc", "dc", "isi", "bui"):
        g, e = df[f"g_{k}"], df[f"e_{k}"]
        log(f"  {k.upper():4s}: GWIS mean {g.mean():7.1f}  ERA5 mean {e.mean():7.1f}  Pearson r {np.corrcoef(g, e)[0, 1]:.2f}  "
            f"Spearman {g.rank().corr(e.rank()):.2f}  median |diff| {np.median(np.abs(g - e)):.1f}")
    for thr in (21.3, 29.0, 38.0):
        a, b = df.g_fwi >= thr, df.e_fwi >= thr
        log(f"  FWI >= {thr}: GWIS says yes on {a.mean():.2f} of days, ERA5 on {b.mean():.2f}; agree on {np.mean(a == b):.2f}")
    for thr in (21.3, 29.0, 38.0):  # the GWIS value at the same rank as the ERA5 threshold (quantile mapping, 2 points x 1 season)
        share = float((df.e_fwi >= thr).mean())
        q = float(df.g_fwi.quantile(1 - share)) if 0 < share < 1 else float("nan")
        log(f"  ERA5 FWI >= {thr} on {share:.2f} of days; GWIS FWI at the same rank: {q:.1f}")
    for p, g in df.groupby("point"):
        log(f"  {p}: FWI r {np.corrcoef(g.g_fwi, g.e_fwi)[0, 1]:.2f}, mean GWIS {g.g_fwi.mean():.1f} vs ERA5 {g.e_fwi.mean():.1f}")
    with LOGF.open("a") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()

"""Experiment A weather: ERA5 hourly at 10 northern Thai points, 1 Dec - 30 Apr of the 2020-2025 dry seasons.

Open-Meteo historical weather API (archive-api.open-meteo.com, models=era5, 0.25 deg reanalysis), local time
(Asia/Bangkok). 10 variables, one call per point and season: weight 10.9 each, about 650 for all 60
(research/hz_openmeteo.py keeps the ledger). Run: python -I research/hz_fire_fetch.py
"""
from __future__ import annotations

import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from hz_openmeteo import get, spent  # noqa: E402

# name: (lat, lon, sample).  Town centres (approximate, 2 decimals), each 25 km disc inside Thailand and
# at least 50 km from the next point.  A chooses, B confirms.
POINTS = {
    "chiang_mai": (18.79, 98.98, "A"), "lampang": (18.29, 99.50, "A"), "phayao": (19.17, 99.90, "A"),
    "tak": (16.88, 99.13, "A"), "hot": (18.19, 98.61, "A"),
    "chiang_rai": (19.91, 99.83, "B"), "nan": (18.78, 100.78, "B"), "phrae": (18.14, 100.14, "B"),
    "pai": (19.36, 98.44, "B"), "uttaradit": (17.62, 100.10, "B"),
}
SEASONS = list(range(2020, 2026))  # season Y = 1 Dec (Y-1) .. 30 Apr Y
HOURLY = ("temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,vapour_pressure_deficit,"
          "soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,et0_fao_evapotranspiration,shortwave_radiation,dew_point_2m")


def fetch(name, y):
    lat, lon, _ = POINTS[name]
    p = dict(latitude=lat, longitude=lon, start_date=f"{y - 1}-12-01", end_date=f"{y}-04-30",
             hourly=HOURLY, models="era5", timezone="Asia/Bangkok")
    return get("https://archive-api.open-meteo.com/v1/archive", p, f"A fire ERA5 {name} {y}")


if __name__ == "__main__":
    only = sys.argv[1:] or None
    for n in POINTS:
        if only and n not in only:
            continue
        for y in SEASONS:
            js = fetch(n, y)
            ok = "hourly" in js
            print(n, y, "ok" if ok else js, f"spent {spent():.1f}", flush=True)
            if not ok:
                sys.exit(1)

"""Probe the data the air-quality study can use (docs/research/predict-air-2026-10-24.md §2).

Run:  <venv>/bin/python -I research/aq_probe.py
Writes research/logs/aq_probe-2026-10-24.log. Answers are cached in the scratchpad.

1. Air4Thai's yearly daily-mean spreadsheets: which years and which parameters exist
   (https://air4thai.net/daily_download/<param>/<year>.xlsx, the history page's links).
2. NASA FIRMS's yearly country archives (https://firms.modaps.eosdis.nasa.gov/data/country/): listing, no key.
3. Open-Meteo air quality (CAMS): how far back start_date goes (one deliberately early request; its error names the range).
4. Open-Meteo historical weather (ERA5): the variables answer for one day.
"""
from __future__ import annotations

import io
import json
import re
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
import requests  # noqa: E402

from aq_common import UA, Log, _polite, air4thai_ca, get, om_get  # noqa: E402

L = Log("aq_probe")


def main():
    import pandas as pd
    ca = air4thai_ca()
    L.w("## 1. Air4Thai daily_download spreadsheets")
    for param in ("PM2.5", "PM10", "O3", "NO2", "CO", "SO2"):
        for y in ([2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2015, 2011] if param == "PM2.5" else [2026, 2025, 2023]):
            url = f"https://air4thai.net/daily_download/{param}/{y}.xlsx"
            try:
                b = get(url, verify=ca, binary=True)
            except Exception as ex:  # noqa: BLE001
                L.w(f"  {param} {y}: error {type(ex).__name__}: {str(ex)[:120]}")
                continue
            if b is None:
                L.w(f"  {param} {y}: 404")
                continue
            try:
                x = pd.read_excel(io.BytesIO(b), header=0)
                d = pd.to_datetime(x.iloc[:, 0], errors="coerce")
                L.w(f"  {param} {y}: {len(b)/1e6:.2f} MB, {x.shape[1]-1} station columns, rows {d.notna().sum()} "
                    f"({d.min().date() if d.notna().any() else '-'}..{d.max().date() if d.notna().any() else '-'}); "
                    f"first columns {list(x.columns[:6])}")
            except Exception as ex:  # noqa: BLE001
                L.w(f"  {param} {y}: {len(b)} bytes, not a sheet ({type(ex).__name__}): {b[:80]!r}")

    L.w("\n## 2. FIRMS country archives")
    for url in ("https://firms.modaps.eosdis.nasa.gov/data/country/",
                "https://firms.modaps.eosdis.nasa.gov/data/country/zips/"):
        _polite(url)
        r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        L.w(f"  GET {url} → {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes")
        names = sorted(set(re.findall(r'href="([^"?]+)"', r.text)))
        L.w(f"    links ({len(names)}): {names[:60]}")

    L.w("\n## 3. Open-Meteo air quality: how far back")
    try:
        j = om_get("https://air-quality-api.open-meteo.com/v1/air-quality",
                   dict(latitude=18.79, longitude=98.99, hourly="pm2_5", domains="cams_global", timezone="Asia/Bangkok",
                        start_date="2020-01-01", end_date="2020-01-02"), "aq_probe CAMS range (deliberately early)")
        L.w(f"  answered: {str(j)[:300]}")
    except Exception as ex:  # noqa: BLE001
        L.w(f"  {type(ex).__name__}: {str(ex)[:400]}")

    L.w("\n## 4. Open-Meteo archive (ERA5) variables for one day")
    hv = ("boundary_layer_height,wind_speed_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,precipitation,"
          "relative_humidity_2m,temperature_2m,surface_pressure,cloud_cover")
    try:
        j = om_get("https://archive-api.open-meteo.com/v1/archive",
                   dict(latitude=18.79, longitude=98.99, hourly=hv, models="era5", timezone="Asia/Bangkok",
                        start_date="2023-03-15", end_date="2023-03-15"), "aq_probe ERA5 variables (one day)")
        h = j.get("hourly", {})
        for k in hv.split(","):
            v = h.get(k)
            L.w(f"  {k}: {'missing' if v is None else str(v[:24:4])}")
        L.w(f"  grid {j.get('latitude')},{j.get('longitude')} elevation {j.get('elevation')}")
    except Exception as ex:  # noqa: BLE001
        L.w(f"  {type(ex).__name__}: {str(ex)[:400]}")

    L.w("\n## 6. Air4Thai hourly history: how far back for O3 (station 50t, one day each)")
    for day in ("2026-03-01", "2026-07-01", "2026-08-01"):
        txt = get("https://air4thai.com/forweb/getHistoryData.php",
                  dict(stationID="50t", param="O3", type="hr", sdate=day, edate=day, stime="00", etime="23"), verify=ca)
        st = json.loads(txt).get("stations") or [{}]
        L.w(f"  {day}: {len(st[0].get('data', []))} hourly values")

    L.w("\n## 7. FIRMS yearly country files (HEAD)")
    base = "https://firms.modaps.eosdis.nasa.gov/data/country/"
    for path in ("viirs-snpp/2021/viirs-snpp_2021_Thailand.csv", "viirs-snpp/2026/viirs-snpp_2026_Thailand.csv",
                 "modis/2026/modis_2026_Thailand.csv", "viirs-noaa20/2026/viirs-noaa20_2026_Thailand.csv",
                 "viirs-snpp/2023/viirs-snpp_2023_Laos.csv", "viirs-snpp/2023/viirs-snpp_2023_Lao_PDR.csv"):
        _polite(base)
        r = requests.head(base + path, headers={"User-Agent": UA}, timeout=60, allow_redirects=True)
        L.w(f"  {path}: {r.status_code}, {r.headers.get('content-length')} bytes")


if __name__ == "__main__":
    main()

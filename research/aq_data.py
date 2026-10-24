"""Build the daily table for the air-quality study (docs/research/predict-air-2026-10-24.md §2).

Run:  <venv>/bin/python -I research/aq_data.py          (fetches what is not cached, then builds)
Writes research/data/aq_daily.csv.gz, research/logs/aq_data-2026-10-24.log.

One row per station and day, four haze seasons (S1 = Dec 2022–Apr 2023 … S4 = Dec 2025–Apr 2026, with a
few days of November for the lags):
- obs_pm25, obs_pm10: Air4Thai's daily means (https://air4thai.net/daily_download/<PM2.5|PM10>/<year>.xlsx,
  preliminary QC), all years 2019–2026 for the climatology.
- cams_*: CAMS global via Open-Meteo's air-quality API (stitched from short-lead forecasts: an upper bound for a
  forecast as issued); daily means from >= 18 hours; ozone also as the day's maximum 8-h mean.
- era5_*: ERA5 via Open-Meteo's archive API (models=era5): boundary-layer height, wind, rain, humidity…
  As predictors for the TARGET day these are "perfect prognosis" (the real page would have a forecast instead).
- fire_*: NASA FIRMS VIIRS S-NPP yearly country archives (Thailand, Myanmar, Lao PDR, Cambodia; no key;
  https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/<y>/viirs-snpp_<y>_<Country>.csv); detections with
  confidence nominal or high and type 0 (vegetation fire), counted per Bangkok-time day in rings around the
  station and in the upwind sector (±45° of the day's mean 100-m wind direction, within 600 km). No 2026 file
  exists yet (checked 2026-10-24), so S4 has no fire features.
"""
from __future__ import annotations

import io
import json
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import DATA, DL, Log, air4thai_ca, bearing_deg, get, haversine_km, om_get, om_spent  # noqa: E402

L = Log("aq_data")

# sample A = fit and choose; sample B = disjoint confirmation (e3's A and B kept, more of the north added)
STATIONS = {
    "35t": ("north", "Chiang Mai", "A"), "37t": ("north", "Lampang", "A"), "70t": ("north", "Phayao", "A"),
    "50t": ("bangkok", "Bangkok Pathum Wan", "A"), "46t": ("northeast", "Khon Kaen", "A"),
    "44t": ("south", "Hat Yai", "A"),
    "57t": ("north", "Chiang Rai", "B"), "67t": ("north", "Nan", "B"), "58t": ("north", "Mae Hong Son", "B"),
    "69t": ("north", "Phrae", "B"), "05t": ("bangkok", "Bangkok Bang Na", "B"),
    "41t": ("central", "Nakhon Sawan", "B"), "83t": ("northeast", "Ubon Ratchathani", "B"),
    "42t": ("south", "Surat Thani", "B"),
}
SEASONS = {"S1": ("2022-11-25", "2023-04-30"), "S2": ("2023-11-25", "2024-04-30"),
           "S3": ("2024-11-25", "2025-04-30"), "S4": ("2025-11-25", "2026-04-30")}
CAMS_VARS = "pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide,sulphur_dioxide,dust,aerosol_optical_depth"
ERA5_VARS = ("boundary_layer_height,wind_speed_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,"
             "precipitation,relative_humidity_2m,temperature_2m,cloud_cover,surface_pressure")
FIRMS = "https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{y}/viirs-snpp_{y}_{c}.csv"
COUNTRIES = ["Thailand", "Myanmar", "Lao_PDR", "Cambodia"]


def meta():
    st = json.loads(get("https://air4thai.pcd.go.th/services/getNewAQI_JSON.php", verify=air4thai_ca()))["stations"]
    st = {s["stationID"].lower(): s for s in st}
    m = {}
    for sid, (reg, name, smp) in STATIONS.items():
        s = st[sid]
        m[sid] = dict(lat=float(s["lat"]), lon=float(s["long"]), region=reg, name=name, sample=smp,
                      name_en=s["nameEN"].strip())
    return m


def air4thai_daily(param: str, years) -> pd.DataFrame:
    ca = air4thai_ca()
    out = []
    for y in years:
        b = get(f"https://air4thai.net/daily_download/{param}/{y}.xlsx", verify=ca, binary=True)
        if b is None:
            L.w(f"  {param} {y}: 404")
            continue
        x = pd.read_excel(io.BytesIO(b), header=0)
        x.columns = [str(c).strip().lower() for c in x.columns]
        x = x.rename(columns={x.columns[0]: "date"})
        x = x[pd.to_datetime(x["date"], errors="coerce").notna()].copy()
        x["date"] = pd.to_datetime(x["date"]).dt.normalize()
        keep = [c for c in x.columns if c in STATIONS]
        m = x[["date"] + keep].melt(id_vars="date", var_name="sid", value_name="v")
        m["v"] = pd.to_numeric(m["v"], errors="coerce")
        out.append(m[m.v >= 0].dropna())
    d = pd.concat(out).drop_duplicates(["sid", "date"])
    return d


def cams(m) -> pd.DataFrame:
    rows = []
    for sid, s in m.items():
        for sn, (a, b) in SEASONS.items():
            j = om_get("https://air-quality-api.open-meteo.com/v1/air-quality",
                       dict(latitude=round(s["lat"], 4), longitude=round(s["lon"], 4), hourly=CAMS_VARS,
                            domains="cams_global", timezone="Asia/Bangkok", start_date=a, end_date=b),
                       f"aq_data CAMS {sid} {sn}")
            h = pd.DataFrame(j["hourly"])
            h["time"] = pd.to_datetime(h["time"])
            h["sid"] = sid
            h["grid"] = f"{j['latitude']:.2f},{j['longitude']:.2f}"
            rows.append(h)
    h = pd.concat(rows)
    for c in CAMS_VARS.split(","):
        h[c] = pd.to_numeric(h[c], errors="coerce")
    h["date"] = h.time.dt.normalize()
    out = []
    for (sid, date), g in h.groupby(["sid", "date"]):
        r = dict(sid=sid, date=date, cams_grid=g.grid.iloc[0], cams_n=int(g.pm2_5.notna().sum()))
        for c in CAMS_VARS.split(","):
            r[f"cams_{c}"] = g[c].mean() if g[c].notna().sum() >= 18 else np.nan
        out.append(r)
    d = pd.DataFrame(out)
    # ozone: maximum 8-h running mean within the day (Thai standard is an 8-h mean)
    o3 = []
    for sid, g in h.sort_values("time").groupby("sid"):
        g = g.set_index("time")
        r8 = g["ozone"].rolling("8h", min_periods=6).mean()
        o3.append(pd.DataFrame({"sid": sid, "date": r8.index.normalize(), "o3_8h": r8.values}))
    o3 = pd.concat(o3).groupby(["sid", "date"]).o3_8h.max().rename("cams_ozone_max8h").reset_index()
    return d.merge(o3, on=["sid", "date"], how="left")


def era5(m) -> pd.DataFrame:
    rows = []
    for sid, s in m.items():
        for sn, (a, b) in SEASONS.items():
            j = om_get("https://archive-api.open-meteo.com/v1/archive",
                       dict(latitude=round(s["lat"], 4), longitude=round(s["lon"], 4), hourly=ERA5_VARS, models="era5",
                            wind_speed_unit="ms", timezone="Asia/Bangkok", start_date=a, end_date=b),
                       f"aq_data ERA5 {sid} {sn}")
            h = pd.DataFrame(j["hourly"])
            h["time"] = pd.to_datetime(h["time"])
            h["sid"] = sid
            rows.append(h)
    h = pd.concat(rows)
    h["date"] = h.time.dt.normalize()
    h["hour"] = h.time.dt.hour
    rad = np.radians(h.wind_direction_100m)
    # wind blows FROM wind_direction; u, v = components of the vector the air moves along
    h["u100"] = -h.wind_speed_100m * np.sin(rad)
    h["v100"] = -h.wind_speed_100m * np.cos(rad)
    h["vent"] = h.boundary_layer_height * h.wind_speed_100m
    day = h[(h.hour >= 10) & (h.hour <= 17)]
    g, gd = h.groupby(["sid", "date"]), day.groupby(["sid", "date"])
    d = pd.DataFrame({
        "era5_blh_mean": g.boundary_layer_height.mean(), "era5_blh_max": g.boundary_layer_height.max(),
        "era5_blh_day": gd.boundary_layer_height.mean(), "era5_vent_day": gd.vent.mean(),
        "era5_ws10": g.wind_speed_10m.mean(), "era5_ws100": g.wind_speed_100m.mean(),
        "era5_u100": g.u100.mean(), "era5_v100": g.v100.mean(),
        "era5_rain": g.precipitation.sum(), "era5_rh": g.relative_humidity_2m.mean(),
        "era5_t2m": g.temperature_2m.mean(), "era5_dtr": g.temperature_2m.max() - g.temperature_2m.min(),
        "era5_cloud": g.cloud_cover.mean(), "era5_sp": g.surface_pressure.mean(), "era5_n": g.temperature_2m.count(),
    }).reset_index()
    # the direction the day's mean 100-m wind comes FROM
    d["era5_dir100_from"] = (np.degrees(np.arctan2(-d.era5_u100, -d.era5_v100)) + 360) % 360
    return d


def firms_points() -> pd.DataFrame:
    """Vegetation-fire detections (nominal/high confidence), Bangkok-time date, within the seasons' months."""
    out = []
    fdir = DL / "firms"
    fdir.mkdir(parents=True, exist_ok=True)
    for y in (2022, 2023, 2024, 2025):
        for c in COUNTRIES:
            f = fdir / f"viirs-snpp_{y}_{c}.csv"
            if not f.exists():
                b = get(FIRMS.format(y=y, c=c), binary=True, cache=False, timeout=600)
                if b is None:
                    L.w(f"  FIRMS {y} {c}: 404")
                    continue
                f.write_bytes(b)
            x = pd.read_csv(f, usecols=["latitude", "longitude", "acq_date", "acq_time", "confidence", "type", "frp"],
                            dtype={"acq_time": str, "confidence": str})
            n0 = len(x)
            t = pd.to_datetime(x.acq_date + " " + x.acq_time.str.zfill(4), format="%Y-%m-%d %H%M") + pd.Timedelta(hours=7)
            x["date"] = t.dt.normalize()
            x = x[x.confidence.isin(["n", "h"]) & (x["type"] == 0) & (x.date.dt.month.isin([11, 12, 1, 2, 3, 4]))]
            L.w(f"  FIRMS {y} {c}: {f.stat().st_size/1e6:.1f} MB, {n0} detections, {len(x)} kept "
                f"(nominal/high, vegetation, Nov–Apr); dates {x.date.min().date() if len(x) else '-'}.."
                f"{x.date.max().date() if len(x) else '-'}")
            out.append(x[["latitude", "longitude", "date", "frp"]].assign(country=c))
    return pd.concat(out)


def fire_features(m, fp: pd.DataFrame, e5: pd.DataFrame) -> pd.DataFrame:
    rows = []
    fp = fp.sort_values("date")
    by_day = {d: g for d, g in fp.groupby("date")}
    wdir = e5.set_index(["sid", "date"]).era5_dir100_from
    for sid, s in m.items():
        dist_all = None
        for d, g in by_day.items():
            dist = haversine_km(s["lat"], s["lon"], g.latitude.values, g.longitude.values)
            brg = bearing_deg(s["lat"], s["lon"], g.latitude.values, g.longitude.values)
            r = dict(sid=sid, date=d, fire_50=int((dist <= 50).sum()), fire_150=int((dist <= 150).sum()),
                     fire_300=int((dist <= 300).sum()), fire_600=int((dist <= 600).sum()),
                     frp_300=float(g.frp.values[dist <= 300].sum()))
            wd = wdir.get((sid, d), np.nan)
            if not np.isnan(wd):
                diff = np.abs((brg - wd + 180) % 360 - 180)   # fires lying in the direction the wind comes from
                r["fire_up600"] = int(((dist <= 600) & (diff <= 45)).sum())
            else:
                r["fire_up600"] = np.nan
            rows.append(r)
        del dist_all
    return pd.DataFrame(rows)


def main():
    m = meta()
    for sid, s in m.items():
        L.w(f"station {sid} {s['sample']} {s['region']:9s} {s['name']:20s} {s['lat']:.4f},{s['lon']:.4f} {s['name_en']}")
    pm25 = air4thai_daily("PM2.5", range(2019, 2027)).rename(columns={"v": "obs_pm25"})
    pm10 = air4thai_daily("PM10", range(2019, 2027)).rename(columns={"v": "obs_pm10"})
    L.w(f"Air4Thai PM2.5 daily rows {len(pm25)} ({pm25.date.min().date()}..{pm25.date.max().date()}); "
        f"PM10 rows {len(pm10)} at {sorted(pm10.sid.unique())}")
    obs = pm25.merge(pm10, on=["sid", "date"], how="outer")
    obs.to_csv(DATA / "aq_obs_daily_2019_2026.csv.gz", index=False, float_format="%.1f")

    c = cams(m)
    L.w(f"CAMS daily rows {len(c)}; grids: " + ", ".join(f"{k}={v}" for k, v in c.groupby('sid').cams_grid.first().items()))
    L.w(f"Open-Meteo weighted calls by this study so far: {om_spent():.1f}")
    e5 = era5(m)
    L.w(f"ERA5 daily rows {len(e5)}; Open-Meteo weighted calls so far: {om_spent():.1f}")
    fp = firms_points()
    L.w(f"FIRMS kept detections: {len(fp)}")
    ff = fire_features(m, fp, e5)
    L.w(f"fire feature rows {len(ff)}")

    seasons = []
    for sn, (a, b) in SEASONS.items():
        seasons.append(pd.DataFrame({"date": pd.date_range(a, b, freq="D"), "season": sn}))
    cal = pd.concat(seasons)
    rows = []
    for sid in m:
        rows.append(cal.assign(sid=sid))
    d = pd.concat(rows)
    d = d.merge(obs, on=["sid", "date"], how="left").merge(c, on=["sid", "date"], how="left")
    d = d.merge(e5, on=["sid", "date"], how="left").merge(ff, on=["sid", "date"], how="left")
    fire_cols = [k for k in d.columns if k.startswith("fire_") or k.startswith("frp_")]
    # a day in a season with a FIRMS file but no detection near the station is a real 0, not missing
    has_file = d.season.isin(["S1", "S2", "S3"])
    for k in fire_cols:
        d.loc[has_file & d[k].isna(), k] = 0
        d.loc[~has_file, k] = np.nan
    d.loc[d.era5_dir100_from.isna(), "fire_up600"] = np.nan   # no wind, no upwind sector
    d["sample"] = d.sid.map(lambda s: m[s]["sample"])
    d["region"] = d.sid.map(lambda s: m[s]["region"])
    d["lat"] = d.sid.map(lambda s: m[s]["lat"])
    d = d.sort_values(["sid", "date"])
    d.to_csv(DATA / "aq_daily.csv.gz", index=False, float_format="%.4g")
    (DATA / "aq_stations.json").write_text(json.dumps(m, indent=1))
    L.w(f"wrote {DATA / 'aq_daily.csv.gz'}: {len(d)} rows, {d.obs_pm25.notna().sum()} with PM2.5, "
        f"{d.cams_pm2_5.notna().sum()} with CAMS, {d.era5_blh_mean.notna().sum()} with ERA5, "
        f"{d.fire_300.notna().sum()} with fire features")
    L.w(f"Open-Meteo weighted calls by this study: {om_spent():.1f}")


if __name__ == "__main__":
    main()

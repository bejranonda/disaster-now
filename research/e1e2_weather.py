"""E1 heat index and E2 heavy rain: ECMWF forecasts as issued vs Thai station observations.

Run (after research/ecmwf_open.py has fetched the runs; see its docstring):
    python3 research/e1e2_weather.py
Writes research/logs/e1e2_weather-2026-10-23.log, research/out/e1e2_results.json,
research/data/e1e2_daily.csv (station-day pairs, < 1 MB).

Forecasts: ECMWF IFS HRES 0.25° (open data; the model Open-Meteo serves as `ecmwf_ifs025`),
00 UTC runs (07:00 Bangkok), nearest grid point, as issued:
  heat  day 1 = max HI at steps 30 and 33 (13:00, 16:00 Bangkok tomorrow), day 2 = steps 54, 57;
  rain  day 0 = steps 0–24 (the 07–07 day that starts at the run time: optimistic, the run is
        published ~6–7 h after its start), day 1 = steps 24–48, day 2 = steps 48–72.
  ENS (51 members) where fetched: probabilities = fraction of members over the threshold.
Observations: NOAA NCEI GHCNh hourly (Global Historical Climatology Network hourly),
https://www.ncei.noaa.gov/oa/global-historical-climatology-network/hourly/access/by-year/<year>/psv/
  HI from hourly temperature and dew point (or RH) with research/heat_index.py;
  daily max over the Bangkok day (17–16 UTC); also the max of the 06 and 09 UTC hours (same
  hours as the forecast) to separate the sampling of two hours from the model's error.
  24-h rain = "precipitation_24_hour" in the 00 UTC report (07:00 Bangkok, 24 h ending then).
  Without it: a SYNOP (FM-12) report with iR = 3 ("no precipitation") counts as 0; in 2026 the
  stations report in BUFR (FM-94), whose 00 UTC report often lacks the 24-h total on rainy
  days, so the 24 one-hour amounts are summed when >= 20 of them exist; otherwise the day is
  missing (never assumed dry). A day without a 00 UTC report is missing. Gusts: no gust values in
  these stations' GHCNh records (checked 2026-10-23), so gusts are not validated.
Protocol (FloodWatch GUIDELINES §4): fit/choose on 2025 (Mar–Oct) at sample A stations,
score on 2026 (Mar–Oct 20) at sample A, confirm on the disjoint sample B stations;
"made worse" = MAE rise > 3 % and moving-block bootstrap (7-day blocks) lower 5 % bound > 0.
"""
from __future__ import annotations

import glob
import json
import re
import sys
import warnings

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import DATA, OUT, SCRATCH, Log, block_bootstrap_rise  # noqa: E402
from ecmwf_open import OUTDIR, STATIONS  # noqa: E402
import heat_index as H  # noqa: E402

warnings.filterwarnings("ignore")
L = Log("e1e2_weather")
GH = SCRATCH / "raw" / "ghcnh"
SAMPLE_A = ["THM00048455", "THM00048304", "THM00048334", "THM00048384", "THM00048409",
            "THM00048478", "THM00048555", "THM00048564"]
SAMPLE_B = [s for s in STATIONS if s not in SAMPLE_A]
HI_BANDS = [27.0, 33.0, 42.0, 52.0]
HI_THR = [33.0, 42.0]
RAIN_THR = [35.1, 90.1]
BAD_Q = set("23679ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")

vhi = np.vectorize(H.heat_index_c)


def rh_from_td(t, td):
    a, b = 17.625, 243.04
    return np.clip(100.0 * np.exp(a * td / (b + td) - a * t / (b + t)), 0, 100)


# ------------------------------------------------------------------ observations
def read_obs(station, year):
    f = GH / f"GHCNh_{station}_{year}.psv"
    if not f.exists():
        return None
    use = ["DATE", "temperature", "temperature_Quality_Code", "dew_point_temperature",
           "dew_point_temperature_Quality_Code", "relative_humidity", "precipitation_24_hour",
           "precipitation_24_hour_Quality_Code", "precipitation", "precipitation_Quality_Code", "REM"]
    x = pd.read_csv(f, sep="|", low_memory=False, usecols=lambda c: c in use)
    x["t"] = pd.to_datetime(x.DATE)
    for v in ("temperature", "dew_point_temperature", "precipitation_24_hour", "precipitation"):
        q = x[f"{v}_Quality_Code"].astype(str)
        bad = q.str[0].isin(BAD_Q) & (q != "nan")
        x.loc[bad, v] = np.nan
    x = x.sort_values("t").drop_duplicates("t", keep="first")
    return x


def obs_daily(station, years):
    frames = [read_obs(station, y) for y in years]
    frames = [f for f in frames if f is not None]
    if not frames:
        return None
    x = pd.concat(frames)
    t, td = x.temperature.values, x.dew_point_temperature.values
    rh = np.where(np.isnan(td), x.relative_humidity.values, rh_from_td(t, td))
    ok = ~np.isnan(t) & ~np.isnan(rh) & (t > -10) & (t < 50)
    x["hi"] = np.nan
    x.loc[ok, "hi"] = vhi(t[ok], rh[ok])
    x["lday"] = (x.t + pd.Timedelta(hours=7)).dt.date           # Bangkok day
    x["uh"] = x.t.dt.hour
    x["minute"] = x.t.dt.minute
    xh = x[x.minute == 0]
    day = xh.groupby("lday").agg(himax=("hi", "max"), tmax=("temperature", "max"), nhi=("hi", "count"))
    mid = xh[xh.uh.between(4, 10)].groupby("lday").hi.count().rename("nmid")
    s1316 = xh[xh.uh.isin([6, 9])].groupby("lday").agg(hi1316=("hi", "max"), n1316=("hi", "count"))
    day = day.join(mid).join(s1316)
    day.loc[(day.nhi < 16) | (day.nmid.fillna(0) < 5), ["himax", "tmax"]] = np.nan
    day.loc[day.n1316.fillna(0) < 2, "hi1316"] = np.nan
    # rain: 00 UTC report
    z = xh[xh.uh == 0].copy()
    z["rday"] = (z.t - pd.Timedelta(days=1)).dt.date            # window D 00 UTC → D+1 00 UTC

    def ir_of(rem):
        # GHCNh keeps the SYNOP text in REM as "SYN<3 digits><5-digit station> iRixhVV ..."
        m = re.match(r"SYN\d{3}\d{5}\s+(\d)\d{4}", str(rem))
        return m.group(1) if m else None
    z["ir"] = z.REM.map(ir_of)
    # one-hour amounts (BUFR) summed over the window (01..24 UTC hours ending in it)
    x["rday"] = (x.t - pd.Timedelta(minutes=1)).dt.floor("D").dt.date
    hs = x.groupby("rday").precipitation.agg(["sum", "count"])
    z = z.join(hs, on="rday")
    z["rain"] = z.precipitation_24_hour
    m0 = z.rain.isna() & (z.ir == "3")
    z.loc[m0, "rain"] = 0.0
    mh = z.rain.isna() & z.ir.isna() & (z["count"].fillna(0) >= 20)
    z.loc[mh, "rain"] = z.loc[mh, "sum"]
    z["rain_src"] = np.where(z.precipitation_24_hour.notna(), "p24", np.where(m0, "iR3", np.where(mh, "hourly", "missing")))
    rain = z.set_index("rday")[["rain", "rain_src"]]
    day = day.join(rain, how="outer")
    day.index.name = "date"
    day = day.reset_index()
    day["station"] = station
    return day


# ------------------------------------------------------------------ forecasts
def fc_oper():
    files = sorted(glob.glob(str(OUTDIR / "oper_*.csv")))
    d = pd.concat([pd.read_csv(f, dtype={"date": str}) for f in files])
    d["run"] = pd.to_datetime(d.date, format="%Y%m%d").dt.date
    p = d.pivot_table(index=["run", "station"], columns=["param", "step"], values="value").reset_index()
    out = pd.DataFrame({"run": p["run"], "station": p["station"]})
    for lead, steps in ((1, (30, 33)), (2, (54, 57))):
        his = []
        for s in steps:
            t = p[("2t", s)].values - 273.15
            td = p[("2d", s)].values - 273.15
            his.append(vhi(t, rh_from_td(t, td)))
        out[f"hi_fc{lead}"] = np.nanmax(np.vstack(his), axis=0)
        out[f"t_fc{lead}"] = np.nanmax(np.vstack([p[("2t", s)].values - 273.15 for s in steps]), axis=0)
    tp = {s: p[("tp", s)].values * 1000.0 for s in (24, 48, 72)}
    out["rain_fc0"] = tp[24]
    out["rain_fc1"] = np.maximum(tp[48] - tp[24], 0)
    out["rain_fc2"] = np.maximum(tp[72] - tp[48], 0)
    return out


def fc_enfo(kind):
    files = sorted(glob.glob(str(OUTDIR / f"{kind}_*.csv")))
    if not files:
        return None
    d = pd.concat([pd.read_csv(f, dtype={"date": str}) for f in files])
    d["run"] = pd.to_datetime(d.date, format="%Y%m%d").dt.date
    return d


# ------------------------------------------------------------------ scoring
def band(x, edges):
    return np.digitize(np.round(np.asarray(x, float), 1), np.array(edges) - 0.05)


def cont(y, p, edges=None, thr=()):
    y, p = np.asarray(y, float), np.asarray(p, float)
    m = ~(np.isnan(y) | np.isnan(p))
    y, p = y[m], p[m]
    r = dict(n=int(m.sum()))
    if r["n"] == 0:
        return r
    r.update(mae=float(np.mean(np.abs(p - y))), bias=float(np.mean(p - y)),
             rmse=float(np.sqrt(np.mean((p - y) ** 2))))
    if edges is not None:
        r["band_agree"] = float(np.mean(band(p, edges) == band(y, edges)))
    for t in thr:
        r[f"ge{t}"] = cat(y >= t, p >= t)
    return r


def cat(o, f):
    o, f = np.asarray(o, bool), np.asarray(f, bool)
    h, mi, fa = int(np.sum(o & f)), int(np.sum(o & ~f)), int(np.sum(~o & f))
    return dict(events=int(o.sum()), forecasts=int(f.sum()), hits=h, misses=mi, false_alarms=fa,
                POD=h / (h + mi) if h + mi else None, FAR=fa / (h + fa) if h + fa else None,
                CSI=h / (h + mi + fa) if h + mi + fa else None,
                freq_bias=(h + fa) / (h + mi) if h + mi else None)


def brier(o, pr):
    o, pr = np.asarray(o, float), np.asarray(pr, float)
    m = ~(np.isnan(o) | np.isnan(pr))
    return float(np.mean((pr[m] - o[m]) ** 2)), int(m.sum())


def f2(v):
    return "  -  " if v is None else f"{v:5.2f}"


def fmt_cont(r, thr=()):
    if r.get("n", 0) == 0:
        return "n=0"
    s = f"n={r['n']:5d} MAE={r['mae']:5.2f} bias={r['bias']:+5.2f} RMSE={r['rmse']:5.2f}"
    if "band_agree" in r:
        s += f" band={100 * r['band_agree']:5.1f}%"
    for t in thr:
        c = r[f"ge{t}"]
        s += f" | ≥{t}: ev={c['events']:4d} POD={f2(c['POD'])} FAR={f2(c['FAR'])} CSI={f2(c['CSI'])} fb={f2(c['freq_bias'])}"
    return s


def main():
    res = {"stations": {s: dict(lat=v[0], lon=v[1], elev=v[2], name=v[3],
                                sample="A" if s in SAMPLE_A else "B") for s, v in STATIONS.items()}}
    L.w(f"sample A (fit/choose): {SAMPLE_A}\nsample B (held out): {SAMPLE_B}")
    obs = []
    for s in STATIONS:
        o = obs_daily(s, [2020, 2021, 2022, 2023, 2024, 2025, 2026])
        if o is not None:
            obs.append(o)
    obs = pd.concat(obs)
    obs["date"] = pd.to_datetime(obs.date).dt.date
    obs["month"] = pd.to_datetime(obs.date).dt.month
    obs["year"] = pd.to_datetime(obs.date).dt.year
    L.w(f"observed station-days: {len(obs)}; with HI max: {obs.himax.notna().sum()}; with rain: {obs.rain.notna().sum()}; "
        f"years {sorted(obs.year.unique())}")
    for y, g in obs.groupby("year"):
        L.w(f"  {y}: HI days {g.himax.notna().sum():6d}  rain days {g.rain.notna().sum():6d}  rain≥35.1 {int((g.rain >= 35.1).sum()):4d}"
            f"  ≥90.1 {int((g.rain >= 90.1).sum()):3d}  HI≥42 {int((g.himax >= 42).sum()):5d}")
    clim_years = obs[obs.year.between(2020, 2024)]
    clim = clim_years.groupby(["station", "month"]).agg(
        hi_clim=("himax", "mean"), p35=("rain", lambda v: np.nanmean(v >= 35.1) if v.notna().any() else np.nan),
        p90=("rain", lambda v: np.nanmean(v >= 90.1) if v.notna().any() else np.nan),
        p_hi42=("himax", lambda v: np.nanmean(v >= 42) if v.notna().any() else np.nan),
        n_clim=("himax", "count")).reset_index()
    L.w(f"climatology from 2020–2024: {int(clim.n_clim.sum())} HI station-days")

    fc = fc_oper()
    L.w(f"HRES runs: {fc.run.nunique()} ({fc.run.min()}..{fc.run.max()})")
    ob = obs.set_index(["station", "date"])
    rows = []
    for lead in (1, 2):
        g = fc[["run", "station", f"hi_fc{lead}", f"t_fc{lead}"]].copy()
        g["date"] = (pd.to_datetime(g.run) + pd.Timedelta(days=lead)).dt.date
        g["lead"] = lead
        g = g.rename(columns={f"hi_fc{lead}": "hi_fc", f"t_fc{lead}": "t_fc"})
        rows.append(g)
    heat = pd.concat(rows)
    heat = heat.join(ob[["himax", "hi1316", "tmax", "month", "year"]], on=["station", "date"])
    # persistence: observed max on the issue day (run date) and the day before
    pers = ob["himax"].rename("pers0")
    heat = heat.join(pers, on=["station", "run"])
    prev = obs[["station", "date", "himax"]].copy()
    prev["date"] = (pd.to_datetime(prev.date) + pd.Timedelta(days=1)).dt.date
    heat = heat.join(prev.set_index(["station", "date"]).himax.rename("pers_m1"), on=["station", "run"])
    heat = heat.merge(clim[["station", "month", "hi_clim", "p_hi42"]], on=["station", "month"], how="left")
    # the model's own forecast for the issue day, from the run of the day before (lead 1)
    today = fc[["run", "station", "hi_fc1"]].copy()
    today["run"] = (pd.to_datetime(today.run) + pd.Timedelta(days=1)).dt.date
    heat = heat.merge(today.rename(columns={"hi_fc1": "hi_fc_today"}), on=["run", "station"], how="left")
    heat["sample"] = np.where(heat.station.isin(SAMPLE_A), "A", "B")
    heat = heat[heat.month.between(3, 10)]

    # ---------------- E1 heat
    L.w("\n================ E1 heat index (daily max, °C) ================")
    fit = heat[(heat.year == 2025) & (heat["sample"] == "A")].dropna(subset=["himax", "hi_fc"])
    coefs = {}
    for lead in (1, 2):
        g = fit[fit.lead == lead]
        b, a = np.polyfit(g.hi_fc, g.himax, 1)
        coefs[lead] = dict(a=float(a), b=float(b), n=int(len(g)))
        per = {}
        for s, gs in g.groupby("station"):
            bb, aa = np.polyfit(gs.hi_fc, gs.himax, 1)
            per[s] = dict(a=float(aa), b=float(bb), n=int(len(gs)))
        coefs[f"per_station_{lead}"] = per
        L.w(f"fit 2025 sample A lead {lead}: HI_obs ≈ {a:+.2f} + {b:.3f} × HI_fc (n={len(g)}); "
            f"per station a/b: " + ", ".join(f"{s[-5:]} {v['a']:+.1f}/{v['b']:.2f}" for s, v in per.items()))
    # POST-HOC candidates (added after the first run showed persistence beating the linear
    # correction; fitted on the same 2025 sample-A rows only): a blend with persistence, and
    # persistence moved by the model's own predicted change (damped by beta).
    post = {}
    for lead in (1, 2):
        g = fit[fit.lead == lead].dropna(subset=["pers0"])
        X = np.c_[np.ones(len(g)), g.hi_fc, g.pers0]
        bb, *_ = np.linalg.lstsq(X, g.himax.values, rcond=None)
        post[f"blend_{lead}"] = dict(a=float(bb[0]), b_fc=float(bb[1]), c_persist=float(bb[2]), n=int(len(g)))
        g2 = g.dropna(subset=["hi_fc_today"])
        grid = np.round(np.arange(0, 1.51, 0.05), 2)
        errs = [np.mean(np.abs(g2.pers0 + be * (g2.hi_fc - g2.hi_fc_today) - g2.himax)) for be in grid]
        post[f"delta_{lead}"] = dict(beta=float(grid[int(np.argmin(errs))]), n=int(len(g2)))
        L.w(f"post-hoc fit 2025 A lead {lead}: blend HI ≈ {bb[0]:+.2f} + {bb[1]:.3f}·fc + {bb[2]:.3f}·persist (n={len(g)}); "
            f"persist + β·Δfc with β={post[f'delta_{lead}']['beta']} (n={len(g2)})")
    coefs["posthoc"] = post
    res["heat_linear_fit_2025_A"] = coefs

    def heat_preds(df):
        out = {"raw": df.hi_fc.values, "persist(issue day)": df.pers0.values,
               "persist(day before)": df.pers_m1.values, "climatology": df.hi_clim.values}
        lin = np.full(len(df), np.nan)
        lps = np.full(len(df), np.nan)
        for lead in (1, 2):
            m = (df.lead == lead).values
            lin[m] = coefs[lead]["a"] + coefs[lead]["b"] * df.hi_fc.values[m]
            for s, v in coefs[f"per_station_{lead}"].items():
                mm = m & (df.station == s).values
                lps[mm] = v["a"] + v["b"] * df.hi_fc.values[mm]
        out["linear national"] = lin
        out["linear per station"] = lps
        bl = np.full(len(df), np.nan)
        dl = np.full(len(df), np.nan)
        for lead in (1, 2):
            m = (df.lead == lead).values
            c = coefs["posthoc"][f"blend_{lead}"]
            bl[m] = c["a"] + c["b_fc"] * df.hi_fc.values[m] + c["c_persist"] * df.pers0.values[m]
            be = coefs["posthoc"][f"delta_{lead}"]["beta"]
            dl[m] = df.pers0.values[m] + be * (df.hi_fc.values[m] - df.hi_fc_today.values[m])
        out["blend+persist (post-hoc)"] = bl
        out["persist+β·Δfc (post-hoc)"] = dl
        return out

    res["heat"] = {}
    sets = {"2025 A (fit)": (heat.year == 2025) & (heat["sample"] == "A"),
            "2026 A (later)": (heat.year == 2026) & (heat["sample"] == "A"),
            "2026 B (later, held-out stations)": (heat.year == 2026) & (heat["sample"] == "B"),
            "2026 A+B hot season Mar–May": (heat.year == 2026) & heat.month.between(3, 5),
            "2025 B (same period, held-out)": (heat.year == 2025) & (heat["sample"] == "B")}
    for name, m in sets.items():
        for lead in (1, 2):
            g = heat[m & (heat.lead == lead)].dropna(subset=["himax", "hi_fc"])
            if not len(g):
                continue
            L.w(f"\n## {name}, lead day {lead} ({'30–33' if lead == 1 else '54–57'} h), obs = daily max HI")
            pr = heat_preds(g)
            res["heat"][f"{name}|lead{lead}"] = {}
            for k, p in pr.items():
                if k == "linear per station" and "B" in name and "A+B" not in name:
                    continue
                r = cont(g.himax, p, HI_BANDS, HI_THR)
                res["heat"][f"{name}|lead{lead}"][k] = r
                L.w(f"  {k:22s} {fmt_cont(r, HI_THR)}")
            r = cont(g.hi1316, g.hi_fc, HI_BANDS, HI_THR)
            res["heat"][f"{name}|lead{lead}"]["raw_vs_obs_at_13_16"] = r
            L.w(f"  {'raw vs obs 13/16 h':22s} {fmt_cont(r, HI_THR)}")
    # made worse per station (2026)
    L.w("\n## 2026, per station: linear national vs raw and vs persistence (made worse = >3 % and bootstrap > 0)")
    res["heat_per_station_2026"] = {}
    for s in STATIONS:
        for lead in (1, 2):
            g = heat[(heat.year == 2026) & (heat.station == s) & (heat.lead == lead)].dropna(subset=["himax", "hi_fc", "pers0"]).sort_values("date")
            if len(g) < 30:
                continue
            pr = heat_preds(g)
            e = {k: pr[k] - g.himax.values for k in pr}
            rec = {k: float(np.nanmean(np.abs(v))) for k, v in e.items()}
            rec["n"] = int(len(g))
            for new, old in (("linear national", "raw"), ("linear national", "persist(issue day)"), ("raw", "persist(issue day)"),
                             ("blend+persist (post-hoc)", "persist(issue day)"), ("persist+β·Δfc (post-hoc)", "persist(issue day)")):
                rise, lo = block_bootstrap_rise(e[new], e[old], block=7)
                rec[f"{new} vs {old}"] = dict(rise_pct=rise, worse=bool(rise > 3 and lo > 0))
            res["heat_per_station_2026"][f"{s}|lead{lead}"] = rec
            if lead == 1:
                L.w(f"  {s} {STATIONS[s][3][:18]:18s} {'A' if s in SAMPLE_A else 'B'} n={rec['n']:3d} MAE raw {rec['raw']:.2f} "
                    f"lin {rec['linear national']:.2f} persist {rec['persist(issue day)']:.2f} clim {rec['climatology']:.2f} | "
                    f"lin vs raw {rec['linear national vs raw']['rise_pct']:+.1f}%{' WORSE' if rec['linear national vs raw']['worse'] else ''}"
                    f" | raw vs persist {rec['raw vs persist(issue day)']['rise_pct']:+.1f}%{' WORSE' if rec['raw vs persist(issue day)']['worse'] else ''}"
                    f" | blend {rec['blend+persist (post-hoc)']:.2f} vs persist {rec['blend+persist (post-hoc) vs persist(issue day)']['rise_pct']:+.1f}%"
                    f"{' WORSE' if rec['blend+persist (post-hoc) vs persist(issue day)']['worse'] else ''}")
    for lead in (1, 2):
        for key in ("linear national vs raw", "linear national vs persist(issue day)", "raw vs persist(issue day)",
                    "blend+persist (post-hoc) vs persist(issue day)", "persist+β·Δfc (post-hoc) vs persist(issue day)"):
            w = [k.split("|")[0] for k, v in res["heat_per_station_2026"].items() if k.endswith(f"lead{lead}") and v[key]["worse"]]
            L.w(f"  lead {lead}: {key}: made worse at {len(w)} of 18 stations {w}")

    # ---------------- E2 rain
    L.w("\n================ E2 24-h rain (07–07 Bangkok), mm ================")
    rrows = []
    for lead in (0, 1, 2):
        g = fc[["run", "station", f"rain_fc{lead}"]].rename(columns={f"rain_fc{lead}": "rain_fc"}).copy()
        g["date"] = (pd.to_datetime(g.run) + pd.Timedelta(days=lead)).dt.date
        g["lead"] = lead
        rrows.append(g)
    rain = pd.concat(rrows).join(ob[["rain", "month", "year"]], on=["station", "date"])
    prevr = obs[["station", "date", "rain"]].copy()
    prevr["date"] = (pd.to_datetime(prevr.date) + pd.Timedelta(days=1)).dt.date
    rain = rain.join(prevr.set_index(["station", "date"]).rain.rename("rain_pers"), on=["station", "run"])
    rain = rain.merge(clim[["station", "month", "p35", "p90"]], on=["station", "month"], how="left")
    rain["sample"] = np.where(rain.station.isin(SAMPLE_A), "A", "B")
    rain = rain[rain.month.between(3, 10)].dropna(subset=["rain", "rain_fc"])
    # choose the HRES threshold on 2025 sample A (max CSI), per event threshold and lead
    tuned = {}
    for thr in RAIN_THR:
        for lead in (0, 1, 2):
            g = rain[(rain.year == 2024) & (rain["sample"] == "A") & (rain.lead == lead)]
            best = (None, -1)
            for t in np.arange(5, 120.1, 2.5):
                c = cat(g.rain >= thr, g.rain_fc >= t)
                if c["CSI"] is not None and c["CSI"] > best[1]:
                    best = (float(t), c["CSI"])
            tuned[f"{thr}|{lead}"] = dict(threshold=best[0], csi_2024A=best[1], events_2024A=int((g.rain >= thr).sum()))
            L.w(f"tuned on 2024 A: event ≥{thr} lead {lead}: forecast threshold {best[0]} mm (CSI {best[1]:.3f}, "
                f"{int((g.rain >= thr).sum())} events)")
    res["rain_tuned_threshold_2024A"] = tuned
    res["rain"] = {}
    # 2024–2025 rain days come from SYNOP reports (dry days identifiable); 2026 reports are BUFR
    # and most dry days cannot be told from missing ones, so 2026 keeps only resolvable days
    # (dry days under-represented: its POD is indicative, its FAR and Brier are not comparable).
    rsets = {"2024 A (fit)": (rain.year == 2024) & (rain["sample"] == "A"),
             "2025 A (later)": (rain.year == 2025) & (rain["sample"] == "A"),
             "2025 B (later, held-out stations)": (rain.year == 2025) & (rain["sample"] == "B"),
             "2024 B (same period, held-out)": (rain.year == 2024) & (rain["sample"] == "B"),
             "2026 A+B (newest, partial: BUFR)": (rain.year == 2026)}
    L.w("rain-day sources by year: " + json.dumps({int(y): g.rain_src.value_counts().to_dict()
                                                    for y, g in obs[obs.month.between(3, 10)].groupby("year") if y >= 2024}))
    for name, m in rsets.items():
        for lead in (0, 1, 2):
            g = rain[m & (rain.lead == lead)]
            if not len(g):
                continue
            L.w(f"\n## {name}, lead {lead} (steps {24 * lead}–{24 * lead + 24} h{', optimistic' if lead == 0 else ''}), n={len(g)} station-days")
            rec = {}
            r = cont(g.rain, g.rain_fc)
            rec["continuous"] = r
            L.w(f"  amounts: MAE={r['mae']:.2f} bias={r['bias']:+.2f} mm; obs mean {g.rain.mean():.2f}, fc mean {g.rain_fc.mean():.2f}")
            for thr in RAIN_THR:
                o = g.rain >= thr
                c_raw = cat(o, g.rain_fc >= thr)
                tt = tuned[f"{thr}|{lead}"]["threshold"]
                c_t = cat(o, g.rain_fc >= tt)
                c_p = cat(o, g.rain_pers >= thr)
                pc = g.p35 if thr == 35.1 else g.p90
                b_clim, nb = brier(o, pc)
                b_raw, _ = brier(o, (g.rain_fc >= thr).astype(float))
                b_tuned, _ = brier(o, (g.rain_fc >= tt).astype(float))
                rec[f"ge{thr}"] = dict(raw=c_raw, tuned=c_t, tuned_threshold=tt, persistence=c_p,
                                       brier_climatology=b_clim, brier_raw_yesno=b_raw, brier_tuned_yesno=b_tuned, n=nb)
                L.w(f"  ≥{thr}: events {c_raw['events']:3d} | raw POD={f2(c_raw['POD'])} FAR={f2(c_raw['FAR'])} CSI={f2(c_raw['CSI'])} "
                    f"fb={f2(c_raw['freq_bias'])} | tuned(≥{tt}) POD={f2(c_t['POD'])} FAR={f2(c_t['FAR'])} CSI={f2(c_t['CSI'])} fb={f2(c_t['freq_bias'])}"
                    f" | persistence CSI={f2(c_p['CSI'])} | Brier clim {b_clim:.4f} raw {b_raw:.4f} tuned {b_tuned:.4f}")
            res["rain"][f"{name}|lead{lead}"] = rec

    # ---------------- ENS probabilities
    res["ens"] = {}
    er = fc_enfo("enfo-rain")
    if er is not None:
        L.w("\n================ ENS rain probabilities (51 members) ================")
        p = er.pivot_table(index=["run", "station", "member"], columns="step", values="value").reset_index()
        p["fc1"] = np.maximum(p[48] - p[24], 0) * 1000
        p["fc2"] = np.maximum(p[72] - p[48], 0) * 1000
        p["fc0"] = p[24] * 1000
        L.w(f"ENS rain runs: {p.run.nunique()} ({p.run.min()}..{p.run.max()}), members per run-station: {p.groupby(['run','station']).size().median()}")
        for (yr, lead) in [(y, l) for y in sorted(pd.to_datetime(p.run).dt.year.unique()) for l in (0, 1, 2)]:
            agg = p[pd.to_datetime(p.run).dt.year == yr].groupby(["run", "station"])[f"fc{lead}"].agg(
                med="median", p35=lambda v: np.mean(v >= 35.1), p90=lambda v: np.mean(v >= 90.1),
                q10=lambda v: np.quantile(v, 0.1), q90=lambda v: np.quantile(v, 0.9)).reset_index()
            agg["date"] = (pd.to_datetime(agg.run) + pd.Timedelta(days=lead)).dt.date
            agg = agg.join(ob[["rain", "month"]], on=["station", "date"]).dropna(subset=["rain"])
            agg = agg.merge(clim[["station", "month", "p35", "p90"]].rename(columns={"p35": "c35", "p90": "c90"}),
                            on=["station", "month"], how="left")
            rec = dict(n=int(len(agg)), median=cont(agg.rain, agg.med),
                       cover_10_90=float(np.mean((agg.rain >= agg.q10) & (agg.rain <= agg.q90))))
            for thr, pc, cc in ((35.1, "p35", "c35"), (90.1, "p90", "c90")):
                o = (agg.rain >= thr).astype(float)
                bs, n = brier(o, agg[pc])
                bc, _ = brier(o, agg[cc])
                rel = []
                for a, b in ((0, 0.001), (0.001, 0.1), (0.1, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 1.01)):
                    mm = (agg[pc] >= a) & (agg[pc] < b)
                    if mm.sum():
                        rel.append(dict(bin=[a, b], n=int(mm.sum()), mean_p=float(agg[pc][mm].mean()), obs_freq=float(o[mm].mean())))
                rec[f"ge{thr}"] = dict(events=int(o.sum()), brier=bs, brier_clim=bc,
                                       bss=(1 - bs / bc) if bc else None, reliability=rel)
                L.w(f"  {yr} lead {lead} ≥{thr}: n={n} events={int(o.sum())} Brier ENS {bs:.4f} clim {bc:.4f} BSS {(1 - bs / bc) if bc else float('nan'):+.3f}")
                for rr in rel:
                    L.w(f"      P in [{rr['bin'][0]:.3f},{rr['bin'][1]:.2f}): n={rr['n']:4d} mean P={rr['mean_p']:.3f} observed {rr['obs_freq']:.3f}")
            L.w(f"  {yr} lead {lead}: ENS median MAE {rec['median']['mae']:.2f} mm, 10–90 % range held {100 * rec['cover_10_90']:.1f} % (n={rec['n']})")
            res["ens"][f"rain|{yr}|lead{lead}"] = rec
    eh = fc_enfo("enfo-heat")
    if eh is not None:
        L.w("\n================ ENS heat probabilities (51 members, day 1) ================")
        p = eh.pivot_table(index=["run", "station", "member"], columns=["param", "step"], values="value").reset_index()
        his = []
        for s in (30, 33):
            t = p[("2t", s)].values - 273.15
            td = p[("2d", s)].values - 273.15
            his.append(vhi(t, rh_from_td(t, td)))
        p["hi"] = np.nanmax(np.vstack(his), axis=0)
        p.columns = ["_".join(str(c) for c in col if c != "") if isinstance(col, tuple) else col for col in p.columns]
        # the national linear correction fitted on HRES 2025 sample A (lead 1), applied to every member
        p["hi_cal"] = coefs[1]["a"] + coefs[1]["b"] * p["hi"]
        L.w(f"ENS heat: correction applied per member = HRES 2025 national lead-1 fit ({coefs[1]['a']:+.2f} + {coefs[1]['b']:.3f}·HI)")
        for col, label in (("hi", "raw"), ("hi_cal", "corrected")):
            agg = p.groupby(["run", "station"])[col].agg(med="median", p42=lambda v: np.mean(v >= 42), p33=lambda v: np.mean(v >= 33),
                                                         q10=lambda v: np.quantile(v, 0.1), q90=lambda v: np.quantile(v, 0.9)).reset_index()
            agg["date"] = (pd.to_datetime(agg.run) + pd.Timedelta(days=1)).dt.date
            agg = agg.join(ob[["himax", "month"]], on=["station", "date"]).dropna(subset=["himax"])
            agg = agg.merge(clim[["station", "month", "p_hi42"]], on=["station", "month"], how="left")
            agg["sample"] = np.where(agg.station.isin(SAMPLE_A), "A", "B")
            for smp in ("A", "B", "A+B"):
                g = agg if smp == "A+B" else agg[agg["sample"] == smp]
                L.w(f"\n  ENS heat {label}, sample {smp}: runs {g.run.nunique()}, station-days {len(g)}")
                rec = dict(n=int(len(g)), median=cont(g.himax, g.med, HI_BANDS, HI_THR),
                           cover_10_90=float(np.mean((g.himax >= g.q10) & (g.himax <= g.q90))))
                for thr, pc in ((42.0, "p42"), (33.0, "p33")):
                    o = (g.himax >= thr).astype(float)
                    bs, n = brier(o, g[pc])
                    bc = brier(o, g.p_hi42)[0] if thr == 42.0 else None
                    rel = []
                    for a, b in ((0, 0.001), (0.001, 0.1), (0.1, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.01)):
                        mm = (g[pc] >= a) & (g[pc] < b)
                        if mm.sum():
                            rel.append(dict(bin=[a, b], n=int(mm.sum()), mean_p=float(g[pc][mm].mean()), obs_freq=float(o[mm].mean())))
                    rec[f"ge{thr}"] = dict(events=int(o.sum()), brier=bs, brier_clim=bc,
                                           bss=(1 - bs / bc) if bc else None, reliability=rel)
                    L.w(f"    P(HI≥{thr}): events {int(o.sum())} of {n}; Brier {bs:.4f}"
                        + (f", climatology (2024 station-month frequency) {bc:.4f}, BSS {1 - bs / bc:+.3f}" if bc else ""))
                    for rr in rel:
                        L.w(f"      P in [{rr['bin'][0]:.3f},{rr['bin'][1]:.2f}): n={rr['n']:4d} mean P={rr['mean_p']:.3f} observed {rr['obs_freq']:.3f}")
                L.w(f"    median: {fmt_cont(rec['median'], HI_THR)}; 10–90 % range held {100 * rec['cover_10_90']:.1f} %")
                res["ens"][f"heat|{label}|{smp}|lead1"] = rec

    # small derived CSV
    keep = heat[["station", "date", "lead", "hi_fc", "himax", "hi1316", "pers0"]].merge(
        rain[rain.lead == 1][["station", "date", "rain_fc", "rain"]], on=["station", "date"], how="outer")
    keep.to_csv(DATA / "e1e2_daily.csv", index=False, float_format="%.2f")
    (OUT / "e1e2_results.json").write_text(json.dumps(res, indent=1, default=str))
    L.w(f"\nwrote {OUT / 'e1e2_results.json'} and {DATA / 'e1e2_daily.csv'}")


if __name__ == "__main__":
    main()

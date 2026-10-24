"""Forecast rows and scores shared by research/aq_expA.py and research/aq_expB.py. Not run on its own.

Issue at 00:00 Bangkok on day I with observations to the end of day I-1 (as research/e3_pm25.py):
lead k = 1, 2, 3 → target day d = I + k - 1; persistence = obs(d - k); CAMS's past day = CAMS(d - k).
The page's method (public/js/airq.js → dampedOutlook, MODELS.md §2):
    damped = persistence × (max(CAMS(d), 0.5) / max(CAMS(d-k), 0.5)) ** beta_k,  beta = 0.45, 0.55, 0.55.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from aq_common import DATA

BETA = {1: 0.45, 2: 0.55, 3: 0.55}          # shipped (public/js/calibration.js, research/out/e3_results.json)
BANDS = [15.0, 25.0, 37.5, 75.0]            # PCD 2023 bands for the 24-h mean
THR = [37.5, 75.0]                          # events: obs > 37.5 (เริ่มมีผลกระทบฯ or worse), obs > 75 (มีผลกระทบฯ)
TEST_MONTHS = [12, 1, 2, 3, 4]


def band(x):
    return np.digitize(np.round(np.asarray(x, float), 1), np.array(BANDS) + 0.05)


def load():
    d = pd.read_csv(DATA / "aq_daily.csv.gz", parse_dates=["date"])
    return d


def climatology(cutoff: str) -> pd.DataFrame:
    """Station × calendar-month climatology from Air4Thai daily means 2019-01-01 .. cutoff (exclusive):
    median, and the frequency of obs > 37.5 and > 75 with a (k + 0.5) / (n + 1) shrink."""
    o = pd.read_csv(DATA / "aq_obs_daily_2019_2026.csv.gz", parse_dates=["date"]).dropna(subset=["obs_pm25"])
    o = o[o.date < cutoff]
    o["month"] = o.date.dt.month
    g = o.groupby(["sid", "month"]).obs_pm25
    c = pd.DataFrame({"clim_med": g.median(), "clim_n": g.size(),
                      "clim_p37": (g.apply(lambda v: (v > 37.5).sum()) + 0.5) / (g.size() + 1),
                      "clim_p75": (g.apply(lambda v: (v > 75.0).sum()) + 0.5) / (g.size() + 1)}).reset_index()
    return c


def build_rows(d: pd.DataFrame, clim: pd.DataFrame | None = None, months=TEST_MONTHS) -> pd.DataFrame:
    """One row per station, target day and lead, with persistence, CAMS, the damped forecast and lagged
    predictors (all predictors are at d-k, i.e. known at issue, except the target-day CAMS and the
    target-day ERA5 columns, which stand for a forecast: CAMS as stitched short-lead, ERA5 as perfect prognosis)."""
    out = []
    era = [c for c in d.columns if c.startswith("era5_")]
    fire = [c for c in d.columns if c.startswith("fire_") or c.startswith("frp_")]
    for sid, g in d.groupby("sid"):
        g = g.set_index("date").sort_index()
        g = g.reindex(pd.date_range(g.index.min(), g.index.max(), freq="D"))
        for k in (1, 2, 3):
            r = pd.DataFrame({"sid": sid, "date": g.index, "lead": k, "season": g["season"].ffill().bfill().values,
                              "sample": g["sample"].ffill().bfill().values, "region": g["region"].ffill().bfill().values,
                              "obs": g["obs_pm25"].values, "cams": g["cams_pm2_5"].values,
                              "persist": g["obs_pm25"].shift(k).values, "obs_lag2": g["obs_pm25"].shift(k + 1).values,
                              "cams_prev": g["cams_pm2_5"].shift(k).values})
            for c in era:   # target day (perfect prognosis) and the last observed day
                r[c] = g[c].values
                r[c + "_prev"] = g[c].shift(k).values
            for c in fire:  # known at issue: the last observed day, and the day before
                r[c + "_prev"] = g[c].shift(k).values
                r[c + "_prev2"] = g[c].shift(k + 1).values
            out.append(r)
    r = pd.concat(out, ignore_index=True)
    r = r[r.date.dt.month.isin(months)]
    r = r.dropna(subset=["obs", "persist", "cams", "cams_prev"])
    r = r[(r.persist > 0) & (r.obs > 0)]
    r["lr"] = np.log(r.cams.clip(lower=0.5) / r.cams_prev.clip(lower=0.5))
    r["damped"] = r.persist * np.exp(r.lead.map(BETA) * r.lr)
    r["month"] = r.date.dt.month
    if clim is not None:
        r = r.merge(clim, on=["sid", "month"], how="left")
    return r.reset_index(drop=True)


def blocks(df: pd.DataFrame, size: int = 5) -> np.ndarray:
    """Block ids: runs of `size` consecutive days within a station, season and lead."""
    key = df.sid.astype(str) + "|" + df.season.astype(str) + "|" + df.lead.astype(str)
    day = (df.date - df.date.min()).dt.days.values // size
    return pd.factorize(key + "|" + pd.Series(day, index=df.index).astype(str))[0]


def boot_stat(fn, df: pd.DataFrame, n: int = 2000, seed: int = 7, size: int = 5):
    """Moving-block-style bootstrap over blocks of `size` days within station-season: returns (stat, lo5, hi95)
    where fn(index array) → statistic on the rows at those positions."""
    b = blocks(df, size)
    groups = [np.flatnonzero(b == i) for i in range(b.max() + 1)]
    rng = np.random.default_rng(seed)
    stat = fn(np.arange(len(df)))
    reps = []
    for _ in range(n):
        ii = rng.integers(0, len(groups), len(groups))
        reps.append(fn(np.concatenate([groups[i] for i in ii])))
    lo, hi = np.nanquantile(reps, [0.05, 0.95])
    return float(stat), float(lo), float(hi)

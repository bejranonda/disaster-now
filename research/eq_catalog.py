"""Experiment A: the regional catalog — magnitude of completeness over time, Gutenberg-Richter b-value,
Gardner-Knopoff declustering.

Run:  nice -n 19 <venv>/bin/python -I research/eq_catalog.py
Input:  research/data/eq_comcat/comcat_0-30N_88-110E_1973-2026_M4.csv.gz (eq_fetch_catalog.py)
Output: research/out/eq_catalog_results.json,
        research/data/eq_comcat/comcat_declustered_flags.csv.gz (id, cluster, flag: 0 mainshock/independent,
        1 aftershock, -1 foreshock), research/logs/eq_catalog-2026-10-24.log

Methods (all standard, cited in docs/research/predict-earthquake-2026-10-24.md):
- magnitudes are ComCat's preferred magnitude (mostly NEIC mb; Mw for larger events), rounded to 0.1;
- Mc by maximum curvature + 0.2 (MAXC; Woessner & Wiemer 2005, BSSA 95:684) and by goodness of fit at 90 % / 95 %
  (GFT; Wiemer & Wyss 2000, BSSA 90:859), per period; 200 bootstrap resamples for MAXC's spread;
- b-value: Aki (1965) maximum likelihood with Utsu's half-bin correction, b = log10(e) / (mean(M) - (Mc - dM/2)),
  uncertainty Shi & Bolt (1982) and bootstrap;
- declustering: Gardner & Knopoff (1974) windows as fitted in OpenQuake hmtk
  (distance_time_windows.py, GardnerKnopoffWindow: L = 10^(0.1238 M + 0.983) km; T = 10^(0.032 M + 2.7389) days
  for M >= 6.5, else 10^(0.5409 M - 0.547) days), the hmtk algorithm (largest first; fore- and aftershocks in the
  same window, fs_time_prop = 1.0), with exact times instead of decimal years from y/m/d.
"""
from __future__ import annotations

import gzip
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import DATA, OUT, Log, haversine_km  # noqa: E402

L = Log("eq_catalog")
RNG = np.random.default_rng(20261024)
DM = 0.1
CAT = DATA / "eq_comcat" / "comcat_0-30N_88-110E_1973-2026_M4.csv.gz"


def load():
    d = pd.read_csv(CAT)
    d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
    d["m"] = (d.mag / DM).round() * DM
    d["yr"] = d.t.dt.year + (d.t.dt.day_of_year - 1) / 365.25
    d["days"] = (d.t - pd.Timestamp("1973-01-01", tz="UTC")).dt.total_seconds() / 86400.0
    return d.sort_values("t").reset_index(drop=True)


def maxc(m):
    bins = np.round(np.arange(4.0, 9.6, DM), 1)
    h = np.array([(np.abs(m - b) < DM / 2).sum() for b in bins])
    return round(float(bins[np.argmax(h)]) + 0.2, 1)


def bval(m, mc):
    x = m[m >= mc - 1e-9]
    n = len(x)
    if n < 25:
        return np.nan, np.nan, n
    b = np.log10(np.e) / (x.mean() - (mc - DM / 2))
    sb = 2.3 * b ** 2 * np.sqrt(((x - x.mean()) ** 2).sum() / (n * (n - 1)))  # Shi & Bolt (1982)
    return float(b), float(sb), n


def gft(m, level):
    """Wiemer & Wyss (2000): first Mc with R >= level; also the best R reached and its Mc (R = 100 - 100*sum|obs-syn|/sum obs)."""
    best = (-1.0, np.nan)
    hit = np.nan
    for mc in np.round(np.arange(4.0, 6.01, DM), 1):
        x = m[m >= mc - 1e-9]
        if len(x) < 50:
            break
        b, _, n = bval(m, mc)
        bins = np.round(np.arange(mc, x.max() + DM / 2, DM), 1)
        obs = np.array([(np.abs(x - bb) < DM / 2).sum() for bb in bins])
        cum = 10 ** (np.log10(n) + b * mc - b * bins)   # expected N(>= bin), = n at Mc
        syn = cum - np.append(cum[1:], 0.0)
        R = 100 - 100 * np.abs(obs - syn).sum() / obs.sum()
        if R > best[0]:
            best = (float(R), float(mc))
        if R >= level and hit != hit:
            hit = float(mc)
    return hit, best


def decluster_gk(d, fs_time_prop=1.0):
    m = d.m.values
    lat, lon, days = d.latitude.values, d.longitude.values, d.days.values
    sw_space = 10 ** (0.1238 * m + 0.983)
    sw_time = np.where(m >= 6.5, 10 ** (0.032 * m + 2.7389), 10 ** (0.5409 * m - 0.547))
    order = np.argsort(-m, kind="stable")
    vcl = np.zeros(len(d), int)
    flag = np.zeros(len(d), int)
    k = 0
    for i in order:
        if vcl[i] != 0:
            continue
        dt = days - days[i]
        sel = (vcl == 0) & (dt >= -sw_time[i] * fs_time_prop) & (dt <= sw_time[i])
        idx = np.where(sel)[0]
        idx = idx[haversine_km(lat[i], lon[i], lat[idx], lon[idx]) <= sw_space[i]]
        idx = idx[idx != i]
        if len(idx):
            k += 1
            vcl[idx] = k
            vcl[i] = k
            flag[idx] = np.where(dt[idx] >= 0, 1, -1)
            flag[i] = 0
    return vcl, flag


d = load()
L(f"catalog: {len(d)} events M>=4.0, {d.t.min()} .. {d.t.max()}")
L("magnitude types among M>=6.0: " + d[d.m >= 6].magType.value_counts().to_dict().__repr__())
res = {"n": int(len(d)), "periods": []}

L("\n== Mc and b by period (whole box, all events) ==")
L(f"{'period':>11} {'n':>5} {'Mc_maxc':>7} {'boot_p10-p90':>12} {'Mc_gft90':>8} {'GFT best R@Mc':>14} {'b(Mc_maxc)':>14} {'n>=Mc':>6}")
periods = [(1973, 1980), (1980, 1985), (1985, 1990), (1990, 1995), (1995, 2000), (2000, 2005), (2005, 2010),
           (2010, 2015), (2015, 2020), (2020, 2027)]
mc_by_period = {}
for a, b in periods:
    x = d[(d.yr >= a) & (d.yr < b)].m.values
    mc = maxc(x)
    boots = [maxc(RNG.choice(x, len(x))) for _ in range(200)]
    (g90, best), (g95, _) = gft(x, 90), gft(x, 95)
    bb, sb, n = bval(x, mc)
    mc_by_period[(a, b)] = mc
    L(f"{a}-{b - 1:>4} {len(x):>5} {mc:>7.1f} {np.percentile(boots, 10):>5.1f}-{np.percentile(boots, 90):<5.1f}"
      f" {g90:>8.1f} {best[0]:>8.1f}@{best[1]:<5.1f} {bb:>7.2f}±{sb:<5.2f} {n:>6}")
    res["periods"].append(dict(period=f"{a}-{b - 1}", n=int(len(x)), mc_maxc=mc,
                               mc_boot_p10=float(np.percentile(boots, 10)), mc_boot_p90=float(np.percentile(boots, 90)),
                               mc_gft90=g90, mc_gft95=g95, gft_best_R=best[0], gft_best_mc=best[1], b=bb, b_sd=sb, n_above=n))

# Sub-box near Thailand (5-22 N, 95-106 E): is completeness different on the mainland?
L("\n== Mc, sub-box 5-22 N, 95-106 E (Thailand and immediate neighbours) ==")
sub = d[(d.latitude.between(5, 22)) & (d.longitude.between(95, 106))]
res["sub_periods"] = []
for a, b in [(1973, 1990), (1990, 2005), (2005, 2015), (2015, 2027)]:
    x = sub[(sub.yr >= a) & (sub.yr < b)].m.values
    mc = maxc(x)
    bb, sb, n = bval(x, mc)
    g = gft(x, 90)
    L(f"{a}-{b - 1}: n={len(x)} Mc_maxc={mc:.1f} GFT90={g[0]} (best R {g[1][0]:.1f} at {g[1][1]}) b={bb:.2f}±{sb:.2f} (n>=Mc {n})")
    res["sub_periods"].append(dict(period=f"{a}-{b - 1}", n=int(len(x)), mc_maxc=mc, b=bb, b_sd=sb, n_above=n))

# The completeness model used downstream (stated before the experiments, not tuned on them): MAXC + 0.2 per period.
# GFT is reported but cannot be used: the mb distribution is heaped (e.g. more events at 4.9 than at 4.8), so R never
# reaches 90 % (best R in the table above).
mc_model = [dict(period=p["period"], mc=round(p["mc_maxc"], 1)) for p in res["periods"]]
res["mc_model"] = mc_model
L("\nMc model used downstream (MAXC + 0.2 per period): " + ", ".join(f"{m['period']}: {m['mc']}" for m in mc_model))


def mc_at(yr):
    for (a, b), m in zip(periods, mc_model):
        if a <= yr < b:
            return m["mc"]
    return mc_model[-1]["mc"]


d["mc_t"] = [mc_at(y) for y in d.yr]

# b with time-varying completeness: each event above its own period's Mc.
def b_tv(df):
    x = df[df.m >= df.mc_t - 1e-9]
    dev = x.m.values - (x.mc_t.values - DM / 2)
    b = np.log10(np.e) / dev.mean()
    boots = [np.log10(np.e) / RNG.choice(dev, len(dev)).mean() for _ in range(1000)]
    return float(b), float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5)), int(len(x))

b_all = b_tv(d)
L(f"\nb-value, whole catalog, time-varying Mc: b = {b_all[0]:.3f} (95% bootstrap {b_all[1]:.3f}-{b_all[2]:.3f}), n = {b_all[3]}")

L("\n== Gardner-Knopoff declustering ==")
vcl, flag = decluster_gk(d)
d["cluster"], d["flag"] = vcl, flag
ind = d[d.flag == 0]
L(f"independent (mainshocks + singletons): {len(ind)} of {len(d)} ({100 * len(ind) / len(d):.1f} %); "
  f"aftershocks {int((flag == 1).sum())}, foreshocks {int((flag == -1).sum())}, clusters {int(vcl.max())}")
b_dec = b_tv(ind)
L(f"b-value, declustered, time-varying Mc: b = {b_dec[0]:.3f} (95% {b_dec[1]:.3f}-{b_dec[2]:.3f}), n = {b_dec[3]}")
res["b_all"] = dict(b=b_all[0], lo=b_all[1], hi=b_all[2], n=b_all[3])
res["b_declustered"] = dict(b=b_dec[0], lo=b_dec[1], hi=b_dec[2], n=b_dec[3])
res["declustering"] = dict(independent=int(len(ind)), aftershocks=int((flag == 1).sum()),
                           foreshocks=int((flag == -1).sum()), clusters=int(vcl.max()))

# Rates of independent events above thresholds, in the period each threshold is complete.
L("\n== Annual rates of independent events (declustered), whole box ==")
res["rates"] = []
END_YR = 2026 + 296 / 365.25
for mt in (4.5, 5.0, 5.5, 6.0, 6.5, 7.0):
    # only the periods in which this magnitude is complete (Mc model above) count, in events and in years
    ok = [(a, min(b, END_YR)) for (a, b), mm in zip(periods, mc_model) if mm["mc"] <= mt + 1e-9]
    n = sum(int(((ind.m >= mt - 1e-9) & (ind.yr >= a) & (ind.yr < b)).sum()) for a, b in ok)
    yrs = sum(b - a for a, b in ok)
    L(f"M>={mt}: complete in {len(ok)} of {len(periods)} periods ({yrs:.1f} yr); {n} independent events "
      f"-> {n / yrs:.2f}/yr" if yrs else f"M>={mt}: never complete")
    res["rates"].append(dict(m=mt, periods=len(ok), n=n, years=yrs, per_year=n / yrs if yrs else None))

L("\nLargest 25 events in the box:")
L(d.sort_values("m", ascending=False).head(25)[["time", "latitude", "longitude", "depth", "m", "magType", "flag",
                                                 "place"]].to_string())
L("\nLargest events within 600 km of Bangkok (13.75N 100.49E):")
dd = haversine_km(13.7516, 100.492, d.latitude.values, d.longitude.values)
L(d.assign(km=dd)[dd < 600].sort_values("m", ascending=False).head(15)[["time", "latitude", "longitude", "depth", "m",
                                                                         "km", "place"]].to_string())

with gzip.open(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz", "wt") as f:
    d[["id", "time", "latitude", "longitude", "depth", "m", "magType", "mc_t", "cluster", "flag"]].to_csv(f, index=False)
(OUT / "eq_catalog_results.json").write_text(json.dumps(res, indent=1, default=float))
L("wrote research/out/eq_catalog_results.json and research/data/eq_comcat/comcat_declustered_flags.csv.gz")

"""Experiment B: how well do Reasenberg-Jones aftershock probabilities forecast "at least one quake >= M5 (or >= M4)
near the mainshock within 7 or 30 days", for M >= 5.5 mainshocks in the box 0-30 N, 88-110 E?

Run:  nice -n 19 <venv>/bin/python -I research/eq_aftershock.py            (the pre-registered design below)
      ... research/eq_aftershock.py --tag r2 --radius-mult 2 --radius-min 20   (POST-HOC sensitivity runs; also
      --ts-hours 24, --max-depth 70; each writes its own log/out files with the tag)
Inputs: research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py),
        research/data/eq_opensha_oaf/ (USGS OAF code and parameter files, CC0, commit fdfbaef1).
Writes research/out/eq_aftershock_results.json, research/data/eq_aftershock_sequences.csv,
       research/logs/eq_aftershock-2026-10-24.log.

Design (fixed before any score was computed):
- Mainshocks: Gardner-Knopoff-independent events (eq_catalog.py) with M >= 5.5 whose search circle lies inside the box.
- Search circle (as USGS's operational code, MagCompPage_ParametersFetch.json "WORLD"): radius
  clip(10^(0.69 M - 3.22), 10, 2000) km (Wells & Coppersmith 1994 "All" rupture length) around the epicentre
  (USGS centres it on the aftershock centroid; with a forecast 1 h after the mainshock we keep the epicentre).
- Forecast issued 1 h after the mainshock (t_s = 1/24 day); windows (t_s, t_s + 7 d] and (t_s, t_s + 30 d].
- Event to forecast: at least one ComCat event M >= 5.0 (or >= 4.0) in the circle in the window (any event, whether
  or not "an aftershock"; this is the question a visitor would ask).
- Split: training = mainshocks before 2015-01-01; test = 2015-01-01 onwards with the whole window inside the catalog.
- Models:
  G  "Page generic": Reasenberg & Jones (1989) with Page et al. (2016) generic parameters for the epicentre's regime
     (USGS's PageEtAlGenericParams_032116.csv / GenericRJ_ParametersFetch.json; regime from TectonicRegimeTable.dat),
     a-value ~ Normal(aValue_mean, sigma(M)), sigma(M) = sqrt(sigma0^2 + sigma1^2 / 10^max(M,6)) as in
     GenericRJ_Parameters.java; P = sum_a w(a) [1 - exp(-N(a))] on a grid -4.5..-0.5 step 0.01 (the code's grid).
  R  "regional refit": the same form, one a-value distribution (mean, sigma) and p for the whole box (b = 1, c = 0.018
     fixed as Page et al.), fitted by maximum marginal likelihood on the training sequences' counts of events
     M >= Mc(t) in (t_s, 30 d], Mc(t) = max(catalog Mc of the period [eq_catalog.py], 0.5 M - 0.25 - log10 t)
     (Page et al. 2016's form, USGS capF 0.5, capG 0.25, capH 1.0).
  B0 "base rate": the training share of sequences with the event (the naive baseline).
  B1 "base rate by magnitude": the training share per mainshock-magnitude bin 5.5-6, 6-6.5, 6.5-7, >= 7.
- Scores: Brier score, Brier skill score vs B0, mean log score (natural log, probabilities clipped to [0.001, 0.999]),
  reliability table, paired bootstrap (2,000 resamples of sequences) for the score difference vs B0.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.optimize import minimize  # noqa: E402
from scipy.stats import poisson  # noqa: E402

from eq_common import DATA, OUT, Log, haversine_km  # noqa: E402
from eq_regime import regime  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--tag", default="")
ap.add_argument("--radius-mult", type=float, default=1.0)
ap.add_argument("--radius-min", type=float, default=10.0)
ap.add_argument("--ts-hours", type=float, default=1.0)
ap.add_argument("--max-depth", type=float, default=1e9)
ARGS = ap.parse_args()
SUFFIX = f"_{ARGS.tag}" if ARGS.tag else ""
L = Log("eq_aftershock" + SUFFIX)
if ARGS.tag:
    L(f"POST-HOC SENSITIVITY RUN (chosen after seeing the pre-registered results): {vars(ARGS)}")
RNG = np.random.default_rng(20261024)
TS = ARGS.ts_hours / 24.0
WINDOWS = (7.0, 30.0)
THRESH = (5.0, 4.0)
SPLIT = pd.Timestamp("2015-01-01", tz="UTC")
CAT_END = pd.Timestamp("2026-10-23T17:06:25Z")
BOX = (0.0, 30.0, 88.0, 110.0)
AGRID = np.round(np.arange(-4.5, -0.5 + 1e-9, 0.01), 2)

gp = pd.read_csv(DATA / "eq_opensha_oaf" / "PageEtAlGenericParams_032116.csv")
gp["regionName"] = gp.regionName.str.strip()
GP = gp.set_index("regionName").to_dict("index")

d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
tdays = (d.t - d.t.min()).dt.total_seconds().values / 86400.0


def radius(m):
    return float(np.clip(ARGS.radius_mult * 10 ** (0.69 * m - 3.22), ARGS.radius_min, 2000.0))


def inside_box(lat, lon, r):
    dlat = r / 111.2
    dlon = r / (111.2 * np.cos(np.radians(lat)))
    return lat - dlat >= BOX[0] and lat + dlat <= BOX[1] and lon - dlon >= BOX[2] and lon + dlon <= BOX[3]


def omori_int(t1, t2, p, c):
    if abs(p - 1.0) < 1e-9:
        return np.log((t2 + c) / (t1 + c))
    return ((t2 + c) ** (1 - p) - (t1 + c) ** (1 - p)) / (1 - p)


def sigma_m(row, m):
    return float(np.sqrt(row["aValue_Sigma0"] ** 2 + row["aValue_Sigma1"] ** 2 / 10 ** max(m, 6.0)))


def prob(mean_a, sig, b, p, c, mm, mt, t1, t2):
    w = np.exp(-(AGRID - mean_a) ** 2 / (2 * sig ** 2))
    w /= w.sum()
    n = 10 ** (AGRID + b * (mm - mt)) * omori_int(t1, t2, p, c)
    return float((w * (1 - np.exp(-n))).sum())


# ---------- mainshocks and their sequences ----------
ms = d[(d.flag == 0) & (d.m >= 5.5) & (d.depth <= ARGS.max_depth)].copy()
rows = []
for i, e in ms.iterrows():
    r = radius(e.m)
    if not inside_box(e.latitude, e.longitude, r):
        continue
    if e.t >= CAT_END - pd.Timedelta(days=7) - pd.Timedelta(hours=ARGS.ts_hours):
        continue
    t0 = tdays[i]
    sel = np.where((tdays > t0) & (tdays <= t0 + 400))[0]
    dist = haversine_km(e.latitude, e.longitude, d.latitude.values[sel], d.longitude.values[sel])
    sel = sel[dist <= r]
    dt = tdays[sel] - t0
    mags = d.m.values[sel]
    rec = dict(id=e.id, time=e.time, lat=e.latitude, lon=e.longitude, depth=e.depth, m=e.m, mc_cat=e.mc_t,
               regime=regime(e.latitude, e.longitude), radius_km=r,
               full30=bool(e.t + pd.Timedelta(days=30, hours=ARGS.ts_hours) <= CAT_END))
    for T in WINDOWS:
        for mt in THRESH:
            rec[f"y_M{mt:g}_{T:g}d"] = int(((dt > TS) & (dt <= TS + T) & (mags >= mt - 1e-9)).sum() > 0)
    # counts above the time-dependent completeness, for the refit
    mc_t = np.maximum(e.mc_t, 0.5 * e.m - 0.25 - np.log10(np.maximum(dt, 1e-6)))
    rec["n_fit"] = int(((dt > TS) & (dt <= TS + 30.0) & (mags >= mc_t - 1e-9)).sum())
    rec["max_after_30d"] = float(mags[(dt > TS) & (dt <= TS + 30)].max()) if ((dt > TS) & (dt <= TS + 30)).any() else np.nan
    rows.append(rec)
S = pd.DataFrame(rows)
S["t"] = pd.to_datetime(S.time, utc=True, format="ISO8601")
S["set"] = np.where(S.t < SPLIT, "train", "test")
L(f"mainshocks M>=5.5, GK-independent: {len(ms)}; with circle inside the box and >= 7 d of catalog after: {len(S)}")
L("by set: " + S.set.value_counts().to_dict().__repr__())
L("by regime:\n" + pd.crosstab(S.regime, S.set).to_string())
L("depth > 70 km: " + str(int((S.depth > 70).sum())))


# ---------- the regional refit (training only) ----------
def expected_obs_counts(row, a, p, c=0.018, b=1.0):
    tt = np.geomspace(TS, TS + 30.0, 121)
    mid = np.sqrt(tt[:-1] * tt[1:])
    mc = np.maximum(row.mc_cat, 0.5 * row.m - 0.25 - np.log10(mid))
    seg = omori_int(tt[:-1], tt[1:], p, c)
    return 10 ** a * (10 ** (b * (row.m - mc)) * seg).sum()


tr = S[S.set == "train"].reset_index(drop=True)


def negll(theta):
    mu, lsig, p = theta
    sig = np.exp(lsig)
    if not (0.3 < p < 1.8):
        return 1e12
    w = np.exp(-(AGRID - mu) ** 2 / (2 * sig ** 2))
    w /= w.sum()
    tot = 0.0
    for _, r in tr.iterrows():
        unit = expected_obs_counts(r, 0.0, p)
        lam = 10 ** AGRID * unit
        lik = (w * poisson.pmf(r.n_fit, lam)).sum()
        tot -= np.log(max(lik, 1e-300))
    return tot


fit = minimize(negll, x0=[-2.4, np.log(0.6), 0.95], method="Nelder-Mead",
               options=dict(xatol=1e-3, fatol=1e-3, maxiter=400))
MU, SIG, PFIT = fit.x[0], float(np.exp(fit.x[1])), fit.x[2]
L(f"\nregional refit on {len(tr)} training sequences (counts above Mc(t) in ({ARGS.ts_hours:g} h, +30 d]): "
  f"a_mean = {MU:.3f}, sigma_a = {SIG:.3f}, p = {PFIT:.3f} (b = 1, c = 0.018 fixed); success={fit.success}, "
  f"-logL={fit.fun:.1f}")
L(f"training sequences with zero counted events: {int((tr.n_fit == 0).sum())} of {len(tr)}; "
  f"median count {tr.n_fit.median():.0f}, max {tr.n_fit.max()}")

# ---------- forecasts ----------
for T in WINDOWS:
    for mt in THRESH:
        k = f"M{mt:g}_{T:g}d"
        S[f"G_{k}"] = [prob(GP[r.regime]["aValue_Mean"], sigma_m(GP[r.regime], r.m), GP[r.regime]["bValue"],
                            GP[r.regime]["pValue_MaxLike"], GP[r.regime]["cValue"], r.m, mt, TS, TS + T)
                       for r in S.itertuples()]
        S[f"R_{k}"] = [prob(MU, SIG, 1.0, PFIT, 0.018, r.m, mt, TS, TS + T) for r in S.itertuples()]
        base = tr[f"y_{k}"].mean()
        S[f"B0_{k}"] = base
        bins = [5.5, 6.0, 6.5, 7.0, 10]
        tr_bin = pd.cut(tr.m, bins, right=False)
        rates = tr.groupby(tr_bin, observed=False)[f"y_{k}"].mean()
        S[f"B1_{k}"] = [float(rates.iloc[int(np.digitize(m, bins) - 1)]) for m in S.m]


def scores(y, p):
    p = np.clip(np.asarray(p, float), 0.001, 0.999)
    y = np.asarray(y, float)
    return np.mean((p - y) ** 2), np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))


res = {"design": __doc__, "n_mainshocks": int(len(S)), "refit": dict(a_mean=MU, sigma_a=SIG, p=PFIT, n_train=len(tr)),
       "results": []}
for setname in ("test", "train"):
    X = S[(S.set == setname)]
    L(f"\n===== {setname.upper()} set =====")
    for T in WINDOWS:
        Xw = X[X.full30] if T == 30.0 else X
        for mt in THRESH:
            k = f"M{mt:g}_{T:g}d"
            y = Xw[f"y_{k}"].values
            L(f"\n-- event: >= 1 quake M>={mt:g} within {T:g} d (from {ARGS.ts_hours:g} h after), n = {len(y)}, observed {int(y.sum())} "
              f"({100 * y.mean():.1f} %)")
            L(f"{'model':>6} {'mean p':>7} {'Brier':>7} {'BSS':>6} {'logS':>7}   bootstrap 95% of Brier(B0)-Brier(model)")
            b0 = scores(y, Xw[f"B0_{k}"])[0]
            for mdl in ("B0", "B1", "G", "R"):
                pp = Xw[f"{mdl}_{k}"].values
                bs, ls = scores(y, pp)
                diffs = []
                for _ in range(2000):
                    ii = RNG.integers(0, len(y), len(y))
                    diffs.append(scores(y[ii], Xw[f"B0_{k}"].values[ii])[0] - scores(y[ii], pp[ii])[0])
                lo, hi = np.percentile(diffs, [2.5, 97.5])
                bss = 1 - bs / b0 if b0 > 0 else np.nan
                L(f"{mdl:>6} {pp.mean():7.3f} {bs:7.4f} {bss:6.3f} {ls:7.4f}   {lo:+.4f} .. {hi:+.4f}")
                res["results"].append(dict(set=setname, event=k, model=mdl, n=int(len(y)), observed=int(y.sum()),
                                           mean_p=float(pp.mean()), brier=bs, bss=bss, log=ls,
                                           dbrier_lo=float(lo), dbrier_hi=float(hi)))
            if setname == "test":
                for mdl in ("G", "R"):
                    pp = Xw[f"{mdl}_{k}"].values
                    edges = [0, 0.05, 0.1, 0.2, 0.4, 0.7, 1.0001]
                    cut = pd.cut(pp, edges, right=False)
                    tab = pd.DataFrame(dict(p=pp, y=y, b=cut)).groupby("b", observed=True).agg(
                        n=("y", "size"), mean_p=("p", "mean"), obs=("y", "mean"))
                    L(f"   reliability {mdl}: " + "; ".join(f"[{iv.left:.2f},{iv.right:.2f}) n={r.n} p={r.mean_p:.2f} "
                                                         f"obs={r.obs:.2f}" for iv, r in tab.iterrows()))

# by regime and depth, all sequences (train + test): forecast mean vs observed share (descriptive)
L("\nM>=5 within 7 d, all sequences 1973-2026, by Page regime and by depth: n, observed share, mean G, mean R")
for name, grp in list(S.groupby("regime")) + [("depth<=70", S[S.depth <= 70]), ("depth>70", S[S.depth > 70])]:
    L(f"  {name:>13}: n={len(grp):3d} observed {grp.y_M5_7d.mean():.2f}  G {grp.G_M5_7d.mean():.2f}  R {grp.R_M5_7d.mean():.2f}")

# the empirical history by mainshock magnitude (what B1 uses), train and test
L("\nshare of sequences with the event, by mainshock magnitude (train 1973-2014 | test 2015-2026):")
bins = [5.5, 6.0, 6.5, 7.0, 10]
for k in [f"M{mt:g}_{T:g}d" for T in WINDOWS for mt in THRESH]:
    parts = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        a = S[(S.set == "train") & (S.m >= lo) & (S.m < hi)][f"y_{k}"]
        X30 = S[(S.set == "test") & (S.m >= lo) & (S.m < hi)]
        b = (X30[X30.full30] if k.endswith("30d") else X30)[f"y_{k}"]
        parts.append(f"M{lo:g}-{hi if hi < 10 else '':}: {int(a.sum())}/{len(a)} | {int(b.sum())}/{len(b)}")
    L(f"  {k}: " + "; ".join(parts))
    res.setdefault("by_mag", {})[k] = parts

# the 2025 M7.7 and the largest test mainshocks
L("\nlargest test-set mainshocks (forecasts G / R, outcomes):")
cols = ["time", "m", "depth", "regime", "radius_km"]
for r in S[S.set == "test"].sort_values("m", ascending=False).head(12).itertuples():
    L(f"{r.time[:10]} M{r.m:.1f} {r.regime:13s} R={r.radius_km:5.0f} km | M5 7d: G {getattr(r, 'G_M5_7d'):.2f} "
      f"R {getattr(r, 'R_M5_7d'):.2f} obs {getattr(r, 'y_M5_7d')} | M5 30d: G {getattr(r, 'G_M5_30d'):.2f} "
      f"R {getattr(r, 'R_M5_30d'):.2f} obs {getattr(r, 'y_M5_30d')} | max M in 30 d {r.max_after_30d}")
S.drop(columns=["t"]).to_csv(DATA / f"eq_aftershock_sequences{SUFFIX}.csv", index=False)
(OUT / f"eq_aftershock_results{SUFFIX}.json").write_text(json.dumps(res, indent=1, default=float))
L(f"\nwrote research/data/eq_aftershock_sequences{SUFFIX}.csv and research/out/eq_aftershock_results{SUFFIX}.json")

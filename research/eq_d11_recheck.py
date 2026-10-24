"""D11 study, part 1: how robust is the earlier "aftershock chances had no skill here" verdict
(docs/research/predict-earthquake-2026-10-24.md §4), and does it survive the changes a real page would face?

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_recheck.py
Inputs: research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py),
        research/data/eq_aftershock_sequences.csv (eq_aftershock.py, the earlier study's per-sequence forecasts),
        research/data/eq_opensha_oaf/ (USGS OAF code's parameter files, CC0, commit fdfbaef1).
Writes research/out/eq_d11_recheck.json, research/out/eq_d11_realtime_sequences.csv.gz,
       research/logs/eq_d11_recheck-2026-10-24.log.

Design (fixed before any score was computed in this script):
1. POWER of the earlier test: if the regional refit R (or the by-magnitude base rate B1) were the TRUE probabilities
   on the 69 test sequences, how often would the earlier criterion (paired bootstrap 95 % interval of
   Brier(B0) - Brier(model) above zero) detect it?  2,000 simulated outcome sets x 1,000 bootstrap resamples.
2. A REAL-TIME trigger set: the earlier study used Gardner-Knopoff "independent" mainshocks, chosen with hindsight
   (an M5.6 followed by a larger quake is a "foreshock" and was dropped, though a page would have shown a line after
   it). Here: every ComCat event M >= 5.5, dropped only if an event at least as large lies within 7 days before it and
   within that event's circle (a line would already be on screen). Same circles (USGS's 10^(0.69 M - 3.22) km,
   10..2000 km), same targets (>= 1 event M >= 5 / M >= 4 in the circle), same split (test from 2015-01-01).
3. CROSS-VALIDATION by era to raise n: eras 1973-89, 1990-99, 2000-09, 2010-14, 2015-26; R and B1 refitted without
   the scored era, scored on it; pooled over all real-time sequences. (Not prospective: later eras train earlier ones.)
4. The SEQUENCE UPDATE the earlier study did not test (USGS's forecasts update on the first aftershocks): forecasts
   issued 1 day after the trigger, window (1 d, 8 d]; the a-value prior (Page generic for the regime, or the
   regional refit) updated with the count of events M >= Mc(t) in (1.44 min, 1 d], Mc(t) = max(catalog Mc,
   0.5 M - 0.25 - log10 t) as in Page et al. 2016 / USGS; p and c held at the prior's values; Poisson likelihood
   on the a-value grid -4.5..-0.5. Baselines issued at the same time: B0 (training share), B1 (by magnitude).
   "Say nothing" is scored as p = 0 (Brier = observed share; its log score is minus infinity whenever a quake came).
Scores: Brier, Brier skill vs B0, mean log score (p clipped to [0.001, 0.999]), paired bootstrap (2,000) 95 % of
Brier(B0) - Brier(model) (positive = beats the base rate), reliability.
"""
from __future__ import annotations

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

L = Log("eq_d11_recheck")
RNG = np.random.default_rng(20261024)
BOX = (0.0, 30.0, 88.0, 110.0)
CAT_END = pd.Timestamp("2026-10-23T17:06:25Z")
SPLIT = pd.Timestamp("2015-01-01", tz="UTC")
AGRID = np.round(np.arange(-4.5, -0.5 + 1e-9, 0.01), 2)
TS_H = 1.0 / 24.0
T_EARLY0 = 1e-3          # days (1.44 min): earliest aftershock counted for the update
ERAS = [(1973, 1989), (1990, 1999), (2000, 2009), (2010, 2014), (2015, 2026)]


def scores(y, p):
    p = np.clip(np.asarray(p, float), 0.001, 0.999)
    y = np.asarray(y, float)
    return float(np.mean((p - y) ** 2)), float(np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def boot_diff(y, pb, pm, n=2000):
    y, pb, pm = (np.asarray(a, float) for a in (y, pb, pm))
    ii = RNG.integers(0, len(y), (n, len(y)))
    db = ((pb[ii] - y[ii]) ** 2).mean(1) - ((pm[ii] - y[ii]) ** 2).mean(1)
    return np.percentile(db, [2.5, 97.5])


# ---------------- 1. power of the earlier test ----------------
L("=== 1. Power of the earlier test (69 test sequences, eq_aftershock_sequences.csv) ===")
E = pd.read_csv(DATA / "eq_aftershock_sequences.csv")
ET = E[E.set == "test"].reset_index(drop=True)
res = {"power": {}}
for k in ("M5_7d", "M4_7d", "M5_30d", "M4_30d"):
    X = ET[ET.full30] if k.endswith("30d") else ET
    pb = X[f"B0_{k}"].values
    for truth in ("R", "B1"):
        pt = X[f"{truth}_{k}"].values
        nsim, nb = 2000, 1000
        det, bss_true = 0, []
        Y = (RNG.random((nsim, len(pt))) < pt).astype(float)
        for s in range(nsim):
            y = Y[s]
            ii = RNG.integers(0, len(y), (nb, len(y)))
            db = ((pb[ii] - y[ii]) ** 2).mean(1) - ((pt[ii] - y[ii]) ** 2).mean(1)
            if np.percentile(db, 2.5) > 0:
                det += 1
            b0 = np.mean((pb - y) ** 2)
            bss_true.append(1 - np.mean((pt - y) ** 2) / b0 if b0 > 0 else np.nan)
        exp_bss = float(np.nanmean(bss_true))
        # the BSS a calibrated forecast would have in expectation, from the probabilities alone
        e_b0 = float(np.mean(pt * (1 - pb) ** 2 + (1 - pt) * pb ** 2))
        e_bm = float(np.mean(pt * (1 - pt)))
        L(f"{k:7s} truth={truth:2s}: n={len(pt)}, expected events {pt.sum():.1f}; expected BSS if true "
          f"{1 - e_bm / e_b0:+.3f} (simulated mean {exp_bss:+.3f}); detected (95 % lower bound > 0) in "
          f"{100 * det / nsim:.1f} % of {nsim} simulations")
        res["power"][f"{k}|{truth}"] = dict(n=int(len(pt)), exp_events=float(pt.sum()), exp_bss=1 - e_bm / e_b0,
                                            power=det / nsim)

# ---------------- 2. the real-time trigger set ----------------
gp = pd.read_csv(DATA / "eq_opensha_oaf" / "PageEtAlGenericParams_032116.csv")
gp["regionName"] = gp.regionName.str.strip()
GP = gp.set_index("regionName").to_dict("index")
d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
tdays = (d.t - d.t.min()).dt.total_seconds().values / 86400.0
LAT, LON, MAG = d.latitude.values, d.longitude.values, d.m.values


def radius(m):
    return float(np.clip(10 ** (0.69 * m - 3.22), 10.0, 2000.0))


def inside_box(lat, lon, r):
    dlat = r / 111.2
    dlon = r / (111.2 * np.cos(np.radians(lat)))
    return lat - dlat >= BOX[0] and lat + dlat <= BOX[1] and lon - dlon >= BOX[2] and lon + dlon <= BOX[3]


def omori_int(t1, t2, p, c):
    if abs(p - 1.0) < 1e-9:
        return np.log((t2 + c) / (t1 + c))
    return ((t2 + c) ** (1 - p) - (t1 + c) ** (1 - p)) / (1 - p)


def unit_counts(m, mc_cat, p, c, t1, t2, b=1.0, nseg=160):
    """Expected count above Mc(t) in (t1, t2] for a = 0 (multiply by 10^a)."""
    tt = np.geomspace(t1, t2, nseg + 1)
    mid = np.sqrt(tt[:-1] * tt[1:])
    mc = np.maximum(mc_cat, 0.5 * m - 0.25 - np.log10(mid))
    return float((10 ** (b * (m - mc)) * omori_int(tt[:-1], tt[1:], p, c)).sum())


def prior_w(mean_a, sig):
    w = np.exp(-(AGRID - mean_a) ** 2 / (2 * sig ** 2))
    return w / w.sum()


def p_window(w, b, p, c, mm, mt, t1, t2):
    n = 10 ** (AGRID + b * (mm - mt)) * omori_int(t1, t2, p, c)
    return float((w * (1 - np.exp(-n))).sum())


def sigma_m(row, m):
    return float(np.sqrt(row["aValue_Sigma0"] ** 2 + row["aValue_Sigma1"] ** 2 / 10 ** max(m, 6.0)))


cand = np.where(MAG >= 5.5)[0]
rows = []
for i in cand:
    m, r = MAG[i], radius(MAG[i])
    if not inside_box(LAT[i], LON[i], r):
        continue
    if d.t[i] >= CAT_END - pd.Timedelta(days=8, hours=1):
        continue
    # dropped if an event at least as large lies within 7 d before it and within that event's circle
    prev = np.where((tdays < tdays[i]) & (tdays >= tdays[i] - 7.0) & (MAG >= m - 1e-9))[0]
    if len(prev):
        dd = haversine_km(LAT[i], LON[i], LAT[prev], LON[prev])
        if (dd <= np.array([radius(x) for x in MAG[prev]])).any():
            continue
    t0 = tdays[i]
    sel = np.where((tdays > t0) & (tdays <= t0 + 40))[0]
    dist = haversine_km(LAT[i], LON[i], LAT[sel], LON[sel])
    sel = sel[dist <= r]
    dt_ = tdays[sel] - t0
    mags = MAG[sel]
    rec = dict(id=d.id[i], time=d.time[i], lat=LAT[i], lon=LON[i], depth=d.depth[i], m=m, mc_cat=d.mc_t[i],
               flag=int(d.flag[i]), regime=regime(LAT[i], LON[i]), radius_km=r, yr=d.t[i].year,
               full30=bool(d.t[i] + pd.Timedelta(days=31) <= CAT_END))
    for tsn, ts in (("1h", TS_H), ("1d", 1.0)):
        for T in (7.0, 30.0):
            for mt in (5.0, 4.0):
                rec[f"y_{tsn}_M{mt:g}_{T:g}d"] = int(((dt_ > ts) & (dt_ <= ts + T) & (mags >= mt - 1e-9)).sum() > 0)
    mct = np.maximum(d.mc_t[i], 0.5 * m - 0.25 - np.log10(np.maximum(dt_, 1e-6)))
    rec["n_fit"] = int(((dt_ > TS_H) & (dt_ <= TS_H + 30.0) & (mags >= mct - 1e-9)).sum())
    rec["n_early"] = int(((dt_ > T_EARLY0) & (dt_ <= 1.0) & (mags >= mct - 1e-9)).sum())
    rec["larger_7d"] = int(((dt_ > 0) & (dt_ <= 7.0) & (mags > m + 1e-9)).sum() > 0)
    rows.append(rec)
S = pd.DataFrame(rows)
S["t"] = pd.to_datetime(S.time, utc=True, format="ISO8601")
S["set"] = np.where(S.t < SPLIT, "train", "test")
S["era"] = [next(k for k, (a, b) in enumerate(ERAS) if a <= y <= b) for y in S.yr]
L(f"\n=== 2. Real-time trigger set: {len(S)} sequences (earlier study: 391); by set "
  f"{S.set.value_counts().to_dict()}; Gardner-Knopoff flag of the triggers: "
  f"{S.flag.value_counts().to_dict()} (0 independent, -1 'foreshock', 1 'aftershock')")
L(f"followed by a LARGER quake within 7 d inside the circle: {int(S.larger_7d.sum())} of {len(S)} "
  f"({100 * S.larger_7d.mean():.1f} %); train {S[S.set == 'train'].larger_7d.mean():.3f}, "
  f"test {S[S.set == 'test'].larger_7d.mean():.3f}")
for lo, hi in ((5.5, 6.0), (6.0, 6.5), (6.5, 7.0), (7.0, 10)):
    g = S[(S.m >= lo) & (S.m < hi)]
    L(f"   M{lo}-{hi if hi < 10 else ''}: larger within 7 d {int(g.larger_7d.sum())}/{len(g)}")
res["realtime"] = dict(n=int(len(S)), by_set=S.set.value_counts().to_dict(), flags=S.flag.value_counts().to_dict(),
                       larger_7d=float(S.larger_7d.mean()))


# ---------- regional refit (a-mean, sigma, p), as eq_aftershock.py, vectorised ----------
def fit_regional(tr):
    tt = np.geomspace(TS_H, TS_H + 30.0, 121)
    mid = np.sqrt(tt[:-1] * tt[1:])
    mc = np.maximum(tr.mc_cat.values[:, None], 0.5 * tr.m.values[:, None] - 0.25 - np.log10(mid)[None, :])
    mag_fac = 10 ** (tr.m.values[:, None] - mc)
    nobs = tr.n_fit.values

    def negll(theta):
        mu, lsig, p = theta
        if not (0.3 < p < 1.8):
            return 1e12
        w = prior_w(mu, np.exp(lsig))
        unit = (mag_fac * omori_int(tt[:-1], tt[1:], p, 0.018)[None, :]).sum(1)
        lam = 10 ** AGRID[None, :] * unit[:, None]
        lik = (poisson.pmf(nobs[:, None], lam) * w[None, :]).sum(1)
        return -np.log(np.maximum(lik, 1e-300)).sum()

    f = minimize(negll, x0=[-2.6, np.log(0.6), 0.9], method="Nelder-Mead",
                 options=dict(xatol=1e-3, fatol=1e-3, maxiter=600))
    return float(f.x[0]), float(np.exp(f.x[1])), float(f.x[2])


def forecasts(S, train, tag):
    """Add G, R, B0, B1 (issued 1 h) and GU, RU, B0, B1 (issued 1 d, with the first-day update) columns."""
    mu, sig, pr = fit_regional(train)
    out = {}
    bins = [5.5, 6.0, 6.5, 7.0, 10]
    for r in S.itertuples():
        g = GP[r.regime]
        wG = prior_w(g["aValue_Mean"], sigma_m(g, r.m))
        wR = prior_w(mu, sig)
        uG = unit_counts(r.m, r.mc_cat, g["pValue_MaxLike"], g["cValue"], T_EARLY0, 1.0)
        uR = unit_counts(r.m, r.mc_cat, pr, 0.018, T_EARLY0, 1.0)
        lG = poisson.pmf(r.n_early, 10 ** AGRID * uG)
        lR = poisson.pmf(r.n_early, 10 ** AGRID * uR)
        wGU = wG * lG / max((wG * lG).sum(), 1e-300)
        wRU = wR * lR / max((wR * lR).sum(), 1e-300)
        o = {}
        for T in (7.0, 30.0):
            for mt in (5.0, 4.0):
                k = f"M{mt:g}_{T:g}d"
                o[f"G_1h_{k}"] = p_window(wG, 1.0, g["pValue_MaxLike"], g["cValue"], r.m, mt, TS_H, TS_H + T)
                o[f"R_1h_{k}"] = p_window(wR, 1.0, pr, 0.018, r.m, mt, TS_H, TS_H + T)
                o[f"G_1d_{k}"] = p_window(wG, 1.0, g["pValue_MaxLike"], g["cValue"], r.m, mt, 1.0, 1.0 + T)
                o[f"GU_1d_{k}"] = p_window(wGU, 1.0, g["pValue_MaxLike"], g["cValue"], r.m, mt, 1.0, 1.0 + T)
                o[f"RU_1d_{k}"] = p_window(wRU, 1.0, pr, 0.018, r.m, mt, 1.0, 1.0 + T)
        out[r.Index] = o
    F = pd.DataFrame.from_dict(out, orient="index")
    for tsn in ("1h", "1d"):
        for T in (7.0, 30.0):
            for mt in (5.0, 4.0):
                k = f"M{mt:g}_{T:g}d"
                yk = f"y_{tsn}_{k}"
                trw = train[train.full30] if T == 30.0 else train
                F[f"B0_{tsn}_{k}"] = trw[yk].mean()
                rates = trw.groupby(pd.cut(trw.m, bins, right=False), observed=False)[yk].mean()
                rates = rates.fillna(trw[yk].mean())
                F[f"B1_{tsn}_{k}"] = [float(rates.iloc[int(np.digitize(m, bins) - 1)]) for m in S.m]
    L(f"   [{tag}] regional refit on {len(train)} sequences: a_mean {mu:.3f}, sigma {sig:.3f}, p {pr:.3f}")
    return F, dict(a_mean=mu, sigma=sig, p=pr, n=int(len(train)))


def score_block(X, F, label, store):
    for tsn, models in (("1h", ("B0", "B1", "G", "R")), ("1d", ("B0", "B1", "G", "GU", "RU"))):
        for T in (7.0, 30.0):
            Xw = X[X.full30] if T == 30.0 else X
            Fw = F.loc[Xw.index]
            for mt in (5.0, 4.0):
                k = f"M{mt:g}_{T:g}d"
                y = Xw[f"y_{tsn}_{k}"].values
                pb = Fw[f"B0_{tsn}_{k}"].values
                b0 = np.mean((pb - y) ** 2)
                L(f"\n-- [{label}] issued {tsn} after, >= 1 M>={mt:g} within {T:g} d: n = {len(y)}, observed "
                  f"{int(y.sum())} ({100 * y.mean():.1f} %); say-nothing (p = 0) Brier {y.mean():.4f}")
                for mdl in models:
                    pm = Fw[f"{mdl}_{tsn}_{k}"].values
                    bs, ls = scores(y, pm)
                    lo, hi = boot_diff(y, pb, pm)
                    L(f"   {mdl:>3}: mean p {pm.mean():.3f}  Brier {bs:.4f}  BSS {1 - bs / b0:+.3f}  log {ls:.4f}  "
                      f"95 % Brier(B0)-Brier {lo:+.4f} .. {hi:+.4f}")
                    store.append(dict(block=label, issued=tsn, event=k, model=mdl, n=int(len(y)), obs=int(y.sum()),
                                      mean_p=float(pm.mean()), brier=bs, bss=1 - bs / b0, log=ls, lo=float(lo),
                                      hi=float(hi)))
                    if mdl in ("GU", "RU", "G") and label == "test" and k == "M5_7d":
                        edges = [0, 0.05, 0.1, 0.2, 0.4, 0.7, 1.0001]
                        tab = pd.DataFrame(dict(p=pm, y=y, b=pd.cut(pm, edges, right=False))).groupby(
                            "b", observed=True).agg(n=("y", "size"), mp=("p", "mean"), ob=("y", "mean"))
                        L("        reliability: " + "; ".join(f"[{iv.left:.2f},{iv.right:.2f}) n={int(rr.n)} "
                                                           f"p={rr.mp:.2f} obs={rr.ob:.2f}" for iv, rr in tab.iterrows()))


store = []
tr = S[S.set == "train"]
F, fitinfo = forecasts(S, tr, "split 2015")
res["realtime"]["refit"] = fitinfo
L("\n=== 2b. Real-time set, test 2015-2026 (pre-registered split) ===")
score_block(S[S.set == "test"], F, "test", store)

L("\n=== 3. Leave-one-era-out cross-validation, all real-time sequences ===")
FCV = []
for k, (a, b) in enumerate(ERAS):
    Fk, _ = forecasts(S[S.era == k], S[S.era != k], f"era {a}-{b} held out")
    FCV.append(Fk)
FCV = pd.concat(FCV).loc[S.index]
score_block(S, FCV, "cv-all", store)

L("\n=== 4. Distribution of first-day counts used by the update (test set) ===")
X = S[S.set == "test"]
L(f"n_early (events >= Mc(t) in (1.4 min, 1 d]): zero in {int((X.n_early == 0).sum())} of {len(X)}; "
  f"median {X.n_early.median():.0f}; max {X.n_early.max()}")
L("largest test triggers (issued 1 d; M>=5 in 7 d): G / GU / RU / B1 / observed")
for r in X.sort_values("m", ascending=False).head(10).itertuples():
    L(f"   {r.time[:10]} M{r.m:.1f} {r.regime:12s} n_early={r.n_early:3d}  G {F.loc[r.Index, 'G_1d_M5_7d']:.2f}  "
      f"GU {F.loc[r.Index, 'GU_1d_M5_7d']:.2f}  RU {F.loc[r.Index, 'RU_1d_M5_7d']:.2f}  "
      f"B1 {F.loc[r.Index, 'B1_1d_M5_7d']:.2f}  obs {r.y_1d_M5_7d}")
res["scores"] = store
S.drop(columns=["t"]).join(F).to_csv(OUT / "eq_d11_realtime_sequences.csv.gz", index=False, compression="gzip")
(OUT / "eq_d11_recheck.json").write_text(json.dumps(res, indent=1, default=float))
L("\nwrote research/out/eq_d11_recheck.json and research/out/eq_d11_realtime_sequences.csv.gz")

"""Experiment B: do weather (ERA5) and fires (NASA FIRMS) improve the day-1 and day-2 PM2.5 forecast beyond the
page's damped ratio? (docs/research/predict-air-2026-10-24.md §5)

Run:  <venv>/bin/python -I research/aq_expB.py      (needs research/data/aq_daily.csv.gz from aq_data.py)
Writes research/logs/aq_expB-2026-10-24.log and research/out/aq_expB_results.json.

Protocol (fixed before any test score was looked at):
- Target: z = log(obs(d)) - log(persistence); a model predicts z, the forecast is persistence × exp(z_hat).
  Target days Dec–Apr; leads 1, 2 (3 reported for completeness).
- Feature sets (all standardised on the fitting rows):
    stat : lr = log CAMS change (as the damped ratio), mr = log(persistence / station-month median 2019 → before
           the season fitted), lag = log(obs(d-k) / obs(d-k-1))
    met  : ERA5 of the TARGET day relative to the last observed day (perfect prognosis = an upper bound: the page
           would have a forecast): rain (log1p) of the target and last days, d 10-m and 100-m wind, d humidity,
           d surface pressure, d diurnal temperature range (a stability proxy)
    blh  : d log daytime boundary-layer height, d log daytime ventilation (BLH × 100-m wind), log ventilation of
           the target day. Open-Meteo's ERA5 has no BLH from 2024-01-02 to 2024-04-30 (aq_probe §4b, also for
           era5_seamless and ecmwf_ifs), so models with blh are fitted on S1 + Dec 2023 only (decided before testing)
    fire : FIRMS VIIRS S-NPP detections of the last observed day (known at issue): log1p within 50 and 300 km,
           log1p in the upwind sector within 600 km, and the change from the day before (S1–S3 only: no 2026 file)
- Models: climatology (station-month median 2019 → before the test season); raw CAMS; persistence; damped (shipped beta); damped_refit (beta refitted on the fitting rows); ridge on stat,
  stat+met, stat+met+blh, stat+fire, stat+met+fire; median (quantile) regression on stat+met+fire; a small
  gradient-boosted model on stat+met+fire (comparison only).
- POST-HOC (added after the first test run showed the ridge "stat" core losing to the damped ratio in S4):
  damped_met / damped_fire keep the damped ratio as a fixed offset and fit a ridge correction on met (or fire)
  only: z - beta_k * lr = ridge(features).
- Fit on sample A, S1+S2; the ridge penalty is chosen by leave-one-season-out (S1↔S2) MAE. Score untouched:
  A-S3, B-S3 (disjoint stations, later season: the decisive test for fire), B-S4 / A-S4 (newest season, no fire
  features), and the north. Every model against persistence and the damped ratio: MAE with a 90 % interval for
  the difference from a bootstrap over 5-day blocks within station-season; stations made worse than the damped
  ratio (MAE rise > 3 % and the 5 % bound of the rise above 0).
"""
from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import QuantileRegressor, Ridge

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import OUT, Log, clean  # noqa: E402
from aq_rows import BETA, THR, band, boot_stat, build_rows, climatology, load  # noqa: E402

L = Log("aq_expB")
STAT = ["lr", "mr", "lag"]
MET = ["rain", "rain_prev", "d_ws", "d_ws100", "d_rh", "d_sp", "d_dtr"]
BLH = ["d_blh", "d_vent", "vent"]
FIRE = ["f50", "f300", "fup", "df300"]
POSTHOC = {"damped_met": MET, "damped_fire": FIRE}
SETS = {"ridge_stat": STAT, "ridge_met": STAT + MET, "ridge_metblh": STAT + MET + BLH, "ridge_fire": STAT + FIRE,
        "ridge_all": STAT + MET + FIRE}


def add_features(r: pd.DataFrame) -> pd.DataFrame:
    r = r.copy()
    r["mr"] = np.log(r.persist / r.clim_med.clip(lower=1))
    r["lag"] = np.log(r.persist.clip(lower=0.5) / r.obs_lag2.clip(lower=0.5))
    lg = lambda v: np.log(np.clip(v, 10, None))  # noqa: E731
    r["d_blh"] = lg(r.era5_blh_day) - lg(r.era5_blh_day_prev)
    r["d_vent"] = lg(r.era5_vent_day) - lg(r.era5_vent_day_prev)
    r["vent"] = lg(r.era5_vent_day)
    r["rain"] = np.log1p(r.era5_rain)
    r["rain_prev"] = np.log1p(r.era5_rain_prev)
    r["d_ws"] = r.era5_ws10 - r.era5_ws10_prev
    r["d_ws100"] = r.era5_ws100 - r.era5_ws100_prev
    r["d_dtr"] = r.era5_dtr - r.era5_dtr_prev
    r["d_rh"] = r.era5_rh - r.era5_rh_prev
    r["d_sp"] = r.era5_sp - r.era5_sp_prev
    if "fire_300_prev" in r:
        r["f50"] = np.log1p(r.fire_50_prev)
        r["f300"] = np.log1p(r.fire_300_prev)
        r["fup"] = np.log1p(r.fire_up600_prev)
        r["df300"] = np.log1p(r.fire_300_prev) - np.log1p(r.fire_300_prev2)
    r["z"] = np.log(r.obs / r.persist)
    return r


class Std:
    def __init__(self, X):
        self.m, self.s = X.mean(0), X.std(0) + 1e-9

    def __call__(self, X):
        return (X - self.m) / self.s


def fit_model(name, tr, alpha=None):
    if name == "persist":
        return None
    if name == "damped_refit":
        grid = np.round(np.arange(0, 1.51, 0.05), 2)
        lp, lo = np.log(tr.persist.values), np.log(tr.obs.values)
        errs = [np.mean(np.abs(lp + b * tr.lr.values - lo)) for b in grid]
        return float(grid[int(np.argmin(errs))])
    if name.startswith("ridge"):
        cols = SETS[name]
        X = tr[cols].values
        sc = Std(X)
        return (Ridge(alpha=alpha).fit(sc(X), tr.z.values), sc, cols)
    if name in POSTHOC:
        cols = POSTHOC[name]
        X = tr[cols].values
        sc = Std(X)
        off = tr.lead.map(BETA).values * tr.lr.values
        return (Ridge(alpha=alpha).fit(sc(X), tr.z.values - off), sc, cols, "offset")
    if name == "qr_all":
        cols = STAT + MET + FIRE
        X = tr[cols].values
        sc = Std(X)
        return (QuantileRegressor(quantile=0.5, alpha=alpha, solver="highs").fit(sc(X), tr.z.values), sc, cols)
    if name == "gbm_all":
        cols = STAT + MET + FIRE + ["lp"]
        t = tr.assign(lp=np.log(tr.persist))
        m = HistGradientBoostingRegressor(loss="absolute_error", max_iter=200, learning_rate=0.05, max_leaf_nodes=15,
                                          min_samples_leaf=20, random_state=0).fit(t[cols].values, t.z.values)
        return (m, None, cols)
    raise ValueError(name)


def predict(name, par, df):
    if name == "persist":
        return df.persist.values
    if name == "raw_cams":
        return df.cams.values
    if name == "clim":
        return df.clim_med.values
    if name == "damped":
        return df.damped.values
    if name == "damped_refit":
        return df.persist.values * np.exp(par * df.lr.values)
    m, sc, cols = par[:3]
    X = df.assign(lp=np.log(df.persist))[cols].values
    z = m.predict(sc(X) if sc is not None else X)
    if len(par) == 4:
        z = z + df.lead.map(BETA).values * df.lr.values
    return df.persist.values * np.exp(z)


def needs(name):
    if name in ("persist", "damped", "damped_refit", "raw_cams", "clim"):
        return ["lr"]
    if name.startswith("ridge"):
        return SETS[name]
    if name in POSTHOC:
        return ["lr"] + POSTHOC[name]
    return STAT + MET + FIRE


def scores(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    r = dict(n=int(len(y)), mae=float(np.mean(np.abs(p - y))), bias=float(np.mean(p - y)),
             band=float(np.mean(band(p) == band(y))))
    for T in THR:
        o, f = y > T, p > T
        h, mi, fa = int((o & f).sum()), int((o & ~f).sum()), int((~o & f).sum())
        r[f">{T}"] = dict(events=int(o.sum()), POD=h / (h + mi) if h + mi else None, FAR=fa / (h + fa) if h + fa else None,
                          CSI=h / (h + mi + fa) if h + mi + fa else None)
    return r


def station_worse(df, p_new, p_old, n=1000, seed=3):
    """Stations where the new forecast's MAE rises > 3 % over the old and the 5 % bound of the rise is > 0."""
    worse = []
    rng = np.random.default_rng(seed)
    for sid in df.sid.unique():
        m = (df.sid == sid).values
        a, b = np.abs(p_new[m] - df.obs.values[m]), np.abs(p_old[m] - df.obs.values[m])
        if len(a) < 20 or b.mean() == 0:
            continue
        rise = 100 * (a.mean() / b.mean() - 1)
        dlt = a - b
        nb = int(np.ceil(len(dlt) / 5))
        st = rng.integers(0, len(dlt) - 4, size=(n, nb))
        idx = (st[:, :, None] + np.arange(5)).reshape(n, -1)[:, :len(dlt)]
        lo = np.quantile(dlt[idx].mean(1), 0.05)
        if rise > 3 and lo > 0:
            worse.append(f"{sid}({rise:+.0f}%)")
    return worse


def main():
    d = load()
    rows_fit = add_features(build_rows(d, climatology("2022-11-25")))     # climatology before S1 for fitting
    rows_t = add_features(build_rows(d, climatology("2024-06-30")))       # before S3 for the tests
    A = rows_fit[(rows_fit["sample"] == "A") & rows_fit.season.isin(["S1", "S2"])]
    models = ["clim", "raw_cams", "persist", "damped", "damped_refit", "ridge_stat", "ridge_met", "ridge_metblh", "ridge_fire", "ridge_all",
              "qr_all", "gbm_all", "damped_met", "damped_fire"]
    res = {"protocol": __doc__, "alpha": {}, "coef": {}, "tests": {}}
    pars = {}
    for k in (1, 2, 3):
        L.w(f"\n## lead {k}: fitting rows (sample A, S1+S2)")
        for name in models[4:]:
            tr = A[A.lead == k].dropna(subset=needs(name))
            alpha = None
            if name.startswith("ridge") or name == "qr_all" or name in POSTHOC:
                grid = [0.1, 1, 10, 100, 1000] if name != "qr_all" else [0.0, 0.001, 0.01, 0.05]
                cv = {}
                for a in grid:
                    err = []
                    for s_fit, s_val in (("S1", "S2"), ("S2", "S1")):
                        f_ = fit_model(name, tr[tr.season == s_fit], a)
                        v = tr[tr.season == s_val]
                        err.append(np.mean(np.abs(predict(name, f_, v) - v.obs.values)))
                    cv[a] = float(np.mean(err))
                alpha = min(cv, key=cv.get)
                res["alpha"][f"{name}|lead{k}"] = dict(chosen=alpha, cv_mae=cv)
                L.w(f"  {name:12s} n={len(tr)} (S1 {int((tr.season=='S1').sum())}, S2 {int((tr.season=='S2').sum())}) "
                    f"leave-one-season-out MAE by penalty {cv} → {alpha}")
            pars[(name, k)] = fit_model(name, tr, alpha)
            if name.startswith("ridge") or name == "qr_all" or name in POSTHOC:
                m, sc, cols = pars[(name, k)][:3]
                coef = dict(zip(cols, [float(c) for c in m.coef_]))
                res["coef"][f"{name}|lead{k}"] = dict(intercept=float(m.intercept_), **coef)
                L.w(f"  {name:12s} standardised coefficients: intercept {float(m.intercept_):+.3f} "
                    + " ".join(f"{c}={v:+.3f}" for c, v in coef.items()))
            if name == "damped_refit":
                L.w(f"  damped_refit beta = {pars[(name, k)]} (shipped {dict(zip((1,2,3),(0.45,0.55,0.55)))[k]})")
        # choosing-period MAE (leave-one-season-out) for the record
    R = rows_t
    tests = {
        "A-S3 (later season, fit stations)": R[(R["sample"] == "A") & (R.season == "S3")],
        "B-S3 (later season, disjoint stations)": R[(R["sample"] == "B") & (R.season == "S3")],
        "B-S4 (newest season, disjoint stations; no fire data)": R[(R["sample"] == "B") & (R.season == "S4")],
        "A-S4 (newest season, fit stations; no fire data)": R[(R["sample"] == "A") & (R.season == "S4")],
        "north-B-S3 (Chiang Rai, Nan, Mae Hong Son, Phrae)": R[(R["sample"] == "B") & (R.region == "north") & (R.season == "S3")],
        "north-B-S4": R[(R["sample"] == "B") & (R.region == "north") & (R.season == "S4")],
        "north-A-S3 (Chiang Mai, Lampang, Phayao)": R[(R["sample"] == "A") & (R.region == "north") & (R.season == "S3")],
    }
    for tname, df in tests.items():
        L.w(f"\n## {tname}")
        res["tests"][tname] = {}
        for k in (1, 2, 3):
            g0 = df[df.lead == k]
            avail = [m for m in models if g0[needs(m)].notna().all(axis=1).mean() > 0.9]
            cols = sorted(set(sum((needs(m) for m in avail), [])))
            g = g0.dropna(subset=cols).reset_index(drop=True)
            if len(g) < 30:
                continue
            P = {m: predict(m, pars.get((m, k)), g) for m in avail}
            rec = {}
            L.w(f" lead {k}: n={len(g)} (rows with every feature these models use; models: {', '.join(avail)})")
            for m in avail:
                s = scores(g.obs, P[m])
                eo = np.abs(P[m] - g.obs.values)
                for ref in ("damped", "persist"):
                    if m == ref:
                        continue
                    er = np.abs(P[ref] - g.obs.values)
                    s[f"dMAE_vs_{ref}"] = boot_stat(lambda ii, eo=eo, er=er: float(np.mean(eo[ii] - er[ii])), g)
                if m != "damped":
                    s["stations_worse_than_damped"] = station_worse(g, P[m], P["damped"])
                rec[m] = s
                dd = s.get("dMAE_vs_damped")
                dp = s.get("dMAE_vs_persist")
                L.w(f"   {m:12s} MAE={s['mae']:6.2f} bias={s['bias']:+6.2f} band={100*s['band']:4.1f}% "
                    f"CSI>37.5={s['>37.5']['CSI'] if s['>37.5']['CSI'] is None else round(s['>37.5']['CSI'],2)} "
                    f"POD>75={s['>75.0']['POD'] if s['>75.0']['POD'] is None else round(s['>75.0']['POD'],2)} "
                    f"FAR>75={s['>75.0']['FAR'] if s['>75.0']['FAR'] is None else round(s['>75.0']['FAR'],2)}"
                    + (f" | vs damped {dd[0]:+5.2f} [{dd[1]:+5.2f},{dd[2]:+5.2f}]" if dd else "")
                    + (f" | vs persist {dp[0]:+5.2f} [{dp[1]:+5.2f},{dp[2]:+5.2f}]" if dp else "")
                    + (f" | worse than damped at {s['stations_worse_than_damped']}" if s.get("stations_worse_than_damped") else ""))
            # what each new data source adds over the same model without it (paired, same rows)
            for new, old in (("ridge_fire", "ridge_stat"), ("ridge_all", "ridge_met"), ("ridge_met", "ridge_stat"),
                             ("ridge_metblh", "ridge_met"), ("ridge_stat", "damped"), ("damped_met", "damped"),
                             ("damped_fire", "damped")):
                if new in P and old in P:
                    en, eo_ = np.abs(P[new] - g.obs.values), np.abs(P[old] - g.obs.values)
                    st = boot_stat(lambda ii, en=en, eo_=eo_: float(np.mean(en[ii] - eo_[ii])), g)
                    rec[f"increment_{new}_over_{old}"] = st
                    L.w(f"   increment {new:12s} over {old:10s}: dMAE {st[0]:+5.2f} [{st[1]:+5.2f},{st[2]:+5.2f}]")
            res["tests"][tname][f"lead{k}"] = rec
    (OUT / "aq_expB_results.json").write_text(json.dumps(clean(res), indent=1, default=str))
    L.w(f"\nwrote {OUT / 'aq_expB_results.json'}")


if __name__ == "__main__":
    main()

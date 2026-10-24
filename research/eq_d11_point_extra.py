"""D11 study, part 3b: three checks on the point chances of eq_d11_point.py.

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_point_extra.py   (after eq_d11_point.py)
Inputs: research/out/eq_d11_point_windows.csv.gz, research/data/eq_dyfi/city_event_pairs.csv (eq_felt_validate.py),
        research/data/eq_comcat/comcat_declustered_flags.csv.gz, public/data/tambon.json.
Writes research/out/eq_d11_point_extra.json, research/logs/eq_d11_point_extra-2026-10-24.log.

1. POST-HOC (chosen after seeing that the page's own intensity estimate said no aftershock of the 2025 M7.7 reached
   2.5 in Thailand while DYFI holds Thai reports of some): the triggered test windows scored against what people
   reported to USGS "Did You Feel It?" within 20 km of the city (response-weighted CDI >= 2.5, and >= 4.0; any number
   of responses; DYFI is a floor: no report is not "not felt").
2. POWER (fixed before running): with the ETAS chances as the truth, how often would the block-bootstrap test
   (95 % interval of Brier(C) - Brier(E) above zero) detect ETAS's skill over the climatology, for the test set's
   trigger quakes resampled to k = 1, 3, 10, 30 times as many (about 12 x k years of data)?
3. MACHINE LEARNING on the catalogue (fixed before running; no tuning): weekly windows at the 15 cities, target A
   (M >= 5 within 300 km in 7 d) and B (estimated intensity >= 2.5), features from quakes before the week (counts
   within 300 km in 7 / 30 / 365 d, within 1,000 km in 7 d, largest magnitude within 300 km in 7 d, largest estimated
   intensity at the city in 7 d, the city's training climatology); logistic regression (L2, C = 1) and gradient-boosted
   trees (scikit-learn HistGradientBoosting, depth 3, 200 iterations, rate 0.05); trained 1980-2014 (B: 1995-2014),
   scored on the 2015-2026 weeks against the climatology and ETAS.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.ensemble import HistGradientBoostingClassifier  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, SITE_MAX_KM, Log, cities, haversine_km, ipe_mmi  # noqa: E402

L = Log("eq_d11_point_extra")
RNG = np.random.default_rng(20261024)
T_ORIGIN = pd.Timestamp("1973-01-01", tz="UTC")
R = pd.read_csv(OUT / "eq_d11_point_windows.csv.gz")
res = {}


def sc(y, p):
    p = np.clip(np.asarray(p, float), 0.0005, 0.9995)
    return float(np.mean((p - y) ** 2)), float(np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def block_boot(y, pm, pc, blocks, n=2000):
    ub = np.unique(blocks)
    idx = {b: np.where(blocks == b)[0] for b in ub}
    out = []
    for _ in range(n):
        pick = np.concatenate([idx[b] for b in RNG.choice(ub, len(ub))])
        out.append(np.mean((pc[pick] - y[pick]) ** 2) - np.mean((pm[pick] - y[pick]) ** 2))
    return np.percentile(out, [2.5, 97.5])


# ---------- 1. DYFI outcomes (post-hoc) ----------
P = pd.read_csv(DATA / "eq_dyfi" / "city_event_pairs.csv")
P["td"] = (pd.to_datetime(P.time, unit="ms", utc=True) - T_ORIGIN).dt.total_seconds() / 86400.0
L("=== 1. POST-HOC: triggered test windows against DYFI reports (CDI within 20 km of the city) ===")
res["dyfi"] = []
for sch in ("T6", "T55"):
    X = R[(R.scheme == sch) & (R.set == "test")].copy()
    for thr, tg in ((2.5, "B"), (4.0, "C")):
        y = []
        for r in X.itertuples():
            q = P[(P.city == r.city) & (P.td > r.t) & (P.td <= r.t + 7.0) & (P.cdi >= thr)]
            y.append(int(len(q) > 0))
        y = np.array(y, float)
        L(f"\n-- {sch} test, reported CDI >= {thr} in the window: {int(y.sum())} of {len(y)} windows "
          f"({X.block.nunique()} trigger quakes)")
        for r in X[y == 1].itertuples():
            q = P[(P.city == r.city) & (P.td > r.t) & (P.td <= r.t + 7.0) & (P.cdi >= thr)]
            L(f"     {r.city} after the M{r.trig_m:.1f} of {r.trig_time[:16]}: " +
              "; ".join(f"M{x.mag:.1f} CDI {x.cdi:.1f} ({x.nresp} responses)" for x in q.itertuples()))
        bc, _ = sc(y, X[f"C_{tg}"].values)
        for mdl in ("C", "BT", "E", "GP"):
            pm = X[f"{mdl}_{tg}"].values
            bs, ls = sc(y, pm)
            lo, hi = block_boot(y, pm, X[f"C_{tg}"].values, X.block.astype(str).values) if mdl != "C" else (0, 0)
            L(f"   {mdl:>3}: mean p {pm.mean():.3f}  Brier {bs:.4f}  BSS vs C {1 - bs / bc:+.3f}  log {ls:.4f}  "
              f"95 % Brier(C)-Brier {lo:+.4f} .. {hi:+.4f}")
            res["dyfi"].append(dict(scheme=sch, thr=thr, model=mdl, n=int(len(y)), obs=int(y.sum()),
                                    mean_p=float(pm.mean()), brier=bs, bss=1 - bs / bc, lo=float(lo), hi=float(hi)))

# ---------- 2. power ----------
L("\n=== 2. Power: ETAS chances taken as the truth; trigger quakes resampled k times ===")
res["power"] = []
for sch in ("T6", "T55"):
    X = R[(R.scheme == sch) & (R.set == "test")].reset_index(drop=True)
    blocks = X.block.astype(str).values
    ub = np.unique(blocks)
    idx = {b: np.where(blocks == b)[0] for b in ub}
    for tg in ("A", "B", "C"):
        pe, pc = X[f"E_{tg}"].values, X[f"C_{tg}"].values
        for k in (1, 3, 10, 30):
            det, nsim = 0, 300
            for _ in range(nsim):
                parts = [idx[b] for b in RNG.choice(ub, len(ub) * k)]
                n_g = np.array([len(q) for q in parts], float)
                sc_g, se_g = np.empty(len(parts)), np.empty(len(parts))
                for g, q in enumerate(parts):
                    y = (RNG.random(len(q)) < pe[q]).astype(float)
                    sc_g[g] = ((pc[q] - y) ** 2).sum()
                    se_g[g] = ((pe[q] - y) ** 2).sum()
                gs = RNG.integers(0, len(parts), (300, len(parts)))
                diffs = (sc_g[gs].sum(1) - se_g[gs].sum(1)) / n_g[gs].sum(1)
                if np.percentile(diffs, 2.5) > 0:
                    det += 1
            L(f"   {sch} target {tg}: k={k:2d} (~{X.block.nunique() * k} trigger quakes, ~{12 * k} years): "
              f"skill detected in {100 * det / nsim:.0f} % of {nsim} simulations")
            res["power"].append(dict(scheme=sch, target=tg, k=k, quakes=int(X.block.nunique() * k), power=det / nsim))

# ---------- 3. machine learning on catalogue features ----------
L("\n=== 3. Machine learning on catalogue features, weekly windows ===")
d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
d["td"] = (d.t - T_ORIGIN).dt.total_seconds() / 86400.0
d["depth"] = d.depth.abs().fillna(10.0)
TEST0 = (pd.Timestamp("2015-01-01", tz="UTC") - T_ORIGIN).days
TEST1 = (pd.Timestamp("2026-10-16", tz="UTC") - T_ORIGIN).days
rows = []
for c in cities():
    dist = haversine_km(c["lat"], c["lon"], d.latitude.values, d.longitude.values)
    mmi = ipe_mmi(d.m.values, np.hypot(dist, d.depth.values))
    if c["bkk"]:
        mmi = mmi + np.where((dist <= SITE_MAX_KM) & (d.depth.values <= 40) & (d.longitude.values > 94.5) & (d.latitude.values > 12), BKK_MMI_TERM, 0.0)
    m5 = d.m.values >= 5.0 - 1e-9
    m45 = d.m.values >= 4.5 - 1e-9
    tA = np.sort(d.td.values[m5 & (dist <= 300)])
    tB = np.sort(d.td.values[m45 & (mmi >= 2.5)])
    near = m5 & (dist <= 300)
    far = m5 & (dist <= 1000)
    tn, mn = d.td.values[near], d.m.values[near]
    tf = d.td.values[far]
    tm, mm_ = d.td.values[m45], mmi[m45]
    t80 = (pd.Timestamp("1980-01-01", tz="UTC") - T_ORIGIN).days
    for t in np.arange(TEST0 - 7.0 * np.floor((TEST0 - t80) / 7.0), TEST1 - 7 + 1e-9, 7.0):   # aligned with eq_d11_point's weeks
        def cnt(tt, a):
            return np.searchsorted(tt, t, side="right") - np.searchsorted(tt, t - a, side="right")
        k7 = (tn > t - 7) & (tn <= t)
        km = (tm > t - 7) & (tm <= t)
        rows.append(dict(city=c["name"], t=t, yA=int(np.searchsorted(tA, t + 7, side="right") - np.searchsorted(tA, t, side="right") > 0),
                         yB=int(np.searchsorted(tB, t + 7, side="right") - np.searchsorted(tB, t, side="right") > 0),
                         n7=np.log1p(cnt(tn, 7)), n30=np.log1p(cnt(tn, 30)), n365=np.log1p(cnt(tn, 365)),
                         nf7=np.log1p(cnt(np.sort(tf), 7)), mx7=(mn[k7].max() - 4.5) if k7.any() else 0.0,
                         mmi7=mm_[km].max() if km.any() else 0.0))
M = pd.DataFrame(rows)
for tg, start in (("A", 0), ("B", (pd.Timestamp("1995-01-01", tz="UTC") - T_ORIGIN).days)):
    tr = M[(M.t >= start) & (M.t < TEST0 - 7)]
    clim = tr.groupby("city")[f"y{tg}"].mean()
    M[f"clim{tg}"] = M.city.map(clim)
    feats = ["n7", "n30", "n365", "nf7", "mx7", "mmi7", f"clim{tg}"]
    tr = M[(M.t >= start) & (M.t < TEST0 - 7)]
    te = M[(M.t >= TEST0) & (M.t <= TEST1 - 7)].copy()
    lr = LogisticRegression(C=1.0, max_iter=2000).fit(tr[feats], tr[f"y{tg}"])
    gb = HistGradientBoostingClassifier(max_depth=3, max_iter=200, learning_rate=0.05, random_state=0).fit(tr[feats], tr[f"y{tg}"])
    te["LR"] = lr.predict_proba(te[feats])[:, 1]
    te["GB"] = gb.predict_proba(te[feats])[:, 1]
    W = R[R.scheme == "W"][["city", "t", f"E_{tg}", f"y_{tg}"]]
    te["tk"] = te.t.round(3); W = W.assign(tk=W.t.round(3))
    te = te.merge(W[["city", "tk", f"E_{tg}", f"y_{tg}"]], on=["city", "tk"], how="left")
    ok = te[f"E_{tg}"].notna()
    te = te[ok]
    y = te[f"y{tg}"].values.astype(float)
    L(f"\n-- target {tg}: training weeks {len(tr)} (events {int(tr[f'y{tg}'].sum())}), test weeks {len(te)} (events "
      f"{int(y.sum())}); outcome check vs eq_d11_point: {int((te[f'y_{tg}'].values == y).all())}")
    bc, lc = sc(y, te[f"clim{tg}"].values)
    for mdl, col in (("climatology", f"clim{tg}"), ("ETAS", f"E_{tg}"), ("logistic", "LR"), ("boosted trees", "GB")):
        bs, ls = sc(y, te[col].values)
        lo, hi = block_boot(y, te[col].values, te[f"clim{tg}"].values, te.t.round(3).astype(str).values) if col != f"clim{tg}" else (0, 0)
        L(f"   {mdl:13s} mean p {te[col].mean():.4f}  Brier {bs:.5f}  BSS {1 - bs / bc:+.3f}  log {ls:.4f} "
          f"(gain vs climatology {ls - lc:+.4f} nats/week)  95 % Brier(C)-Brier {lo:+.5f} .. {hi:+.5f}")
        res.setdefault("ml", []).append(dict(target=tg, model=mdl, brier=bs, bss=1 - bs / bc, log=ls, gain=ls - lc,
                                             lo=float(lo), hi=float(hi), n=int(len(te)), events=int(y.sum())))
(OUT / "eq_d11_point_extra.json").write_text(json.dumps(res, indent=1, default=float))
L("\nwrote research/out/eq_d11_point_extra.json")

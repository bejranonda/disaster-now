"""D11 study, part 3: the chances a page would show FOR A PLACE IN THAILAND, scored on 2015-2026.

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_point.py      (after eq_d11_etas.py)
Inputs: research/data/eq_comcat/comcat_declustered_flags.csv.gz, research/out/eq_d11_etas.json and _grids.npz,
        research/data/eq_opensha_oaf/ (Page et al. 2016 generic parameters), public/data/tambon.json (city points).
Writes research/out/eq_d11_point.json, research/out/eq_d11_point_windows.csv.gz, research/logs/eq_d11_point-2026-10-24.log.

Design (fixed before any point score was computed):
Points: the earlier study's 15 Thai cities (central tambon, eq_common.CITIES).
Targets, window 7 days:
  A  >= 1 ComCat quake M >= 5.0 within 300 km of the point (the quake card's radius);
  B  >= 1 ComCat quake M >= 4.5 whose page-estimated intensity at the point is >= 2.5 ("อาจรู้สึกได้");
  C  >= 1 ComCat quake M >= 4.5 whose page-estimated intensity at the point is >= 4.0 (MMI IV).
  Page intensity = public/js/ipe.js (AWW12, hypocentral) + 1.06 for Bangkok when the quake is within 1,600 km and in
  the term's domain (depth <= 40 km, east of 94.5 E, north of 12 N), as assess.js / quake.js do.
Schemes:
  W  weekly: issued every 7 days from 2015-01-01 00:00 UTC (the unconditional question "this week");
  T  triggered: issued 1 h after each ComCat quake M >= 6.0 that the card would list at the point (within 300 km or
     estimated intensity >= 2.5 there), per point, non-overlapping (a trigger inside a running window is skipped).
     Secondary: M >= 5.5. Training triggers 1980-2014, test 2015-01-01 .. 2026-10-16.
Models:
  Z  "say nothing": p = 0.
  C  the point's climatology: share of training weeks with the event (A: 1980-2014; B, C: 1995-2014, ComCat being
     complete from about M 4.5 only since the mid-1990s).
  E  ETAS (eq_d11_etas.py, frozen 1980-2014 fit): P = 1 - exp(-Lambda), Lambda = background + every earlier M >= 5
     quake's triggered rate integrated over the window and over the target (A: the 300-km disc; B, C: for each
     magnitude bin the disc where the estimated intensity reaches the threshold, quakes at the parent's depth, the
     background at the local median depth); magnitudes G-R with the fit's b, extended down to M 4.5 for B, C;
     first generation only (aftershocks of aftershocks inside the window are left out; this under-states P).
  T-scheme only:
  BT the training share of triggered windows with the event, pooled over the 15 cities ("history after quakes like
     this"); B1T the same by trigger magnitude bin (6-6.5, 6.5-7, >= 7).
  GP "the agency's generic forecast recomputed for the point": Page et al. 2016 generic Reasenberg-Jones for the
     trigger's regime (what USGS issues by default), aftershocks spread uniformly over USGS's circle
     10^(0.69 M - 3.22) km around the epicentre, magnitudes b = 1 down to M 4.5, at the trigger's depth;
     combined with the climatology: P = 1 - (1 - C) E_a[exp(-N_a)].
Scores: Brier, Brier skill vs C, mean log score (p clipped to [0.0005, 0.9995]), information gain over C (nats per
  window), block bootstrap 95 % of Brier(C) - Brier(model) (blocks: issue weeks for W, trigger quakes for T),
  reliability; and what the page would have shown (the distribution of P).
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, SITE_MAX_KM, Log, cities, haversine_km, ipe_mmi  # noqa: E402
from eq_regime import regime  # noqa: E402

L = Log("eq_d11_point")
RNG = np.random.default_rng(20261024)
T_ORIGIN = pd.Timestamp("1973-01-01", tz="UTC")
TEST0, TEST1 = pd.Timestamp("2015-01-01", tz="UTC"), pd.Timestamp("2026-10-16", tz="UTC")
W = 7.0
TS = 1.0 / 24.0
MB = np.round(np.arange(4.5, 9.2, 0.1), 1)               # magnitude bins (left edges) for B, C
THR = dict(B=2.5, C=4.0)
KD = 2000

J = json.loads((OUT / "eq_d11_etas.json").read_text())
P = J["params"]
BETA, M0 = J["beta"], J["M0"]
G = np.load(OUT / "eq_d11_etas_grids.npz")
U, GLAT, GLON = G["U"], G["GLAT"], G["GLON"]
GX, GY = np.meshgrid(GLON, GLAT)
CELL_KM2 = (0.1 * 111.2) * (0.1 * 111.2 * np.cos(np.radians(GY)))

d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
d["td"] = (d.t - T_ORIGIN).dt.total_seconds() / 86400.0
d["depth"] = d.depth.abs().fillna(10.0)
ev = d[d.m >= M0 - 1e-9].reset_index(drop=True)         # ETAS parents
o45 = d[d.m >= 4.5 - 1e-9].reset_index(drop=True)        # outcome quakes for B, C
CITY = cities()


def days(ts):
    return (ts - T_ORIGIN).total_seconds() / 86400.0


def in_site_domain(lat, lon, depth):
    return (depth <= 40) & (lon > 94.5) & (lat > 12)


def page_mmi(m, lat, lon, depth, c):
    dist = haversine_km(c["lat"], c["lon"], lat, lon)
    mmi = ipe_mmi(m, np.hypot(dist, np.maximum(depth, 0.0)))
    if c["bkk"]:
        mmi = mmi + np.where((dist <= SITE_MAX_KM) & in_site_domain(lat, lon, depth), BKK_MMI_TERM, 0.0)
    return mmi, dist


# hypocentral distance at which the equation falls to a threshold, per magnitude bin (bin centre)
RH = np.geomspace(1.0, 5000.0, 4000)


def rhypo_at(thr):
    out = []
    for m in MB + 0.05:
        v = ipe_mmi(m, RH)
        k = np.where(v >= thr)[0]
        out.append(RH[k[-1]] if len(k) else 0.0)
    return np.array(out)


RHT = {k: {s: rhypo_at(v - s) for s in (0.0, BKK_MMI_TERM)} for k, v in THR.items()}
WB = np.exp(-BETA * (MB - M0)) - np.exp(-BETA * (MB + 0.1 - M0))     # rate per bin relative to N(M >= M0)


def Gcum(t):
    return 1.0 - (1.0 + np.maximum(t, 0.0) / P["c"]) ** (1.0 - P["p"])


# ---------- per point: the spatial factors of every parent and of the background ----------
UD, TH = RNG.random(KD), RNG.random(KD) * 2 * np.pi


def kernel_draw_dist(c):
    """distance (km) from the point to KD kernel draws of every parent: (n_parents, KD) float32"""
    mi = ev.m.values - M0
    s = P["D"] * np.exp(P["gamma"] * mi / 2.0)
    out = np.empty((len(ev), KD), np.float32)
    for a in range(0, len(ev), 400):
        b = min(a + 400, len(ev))
        r = np.minimum(s[a:b, None] * np.sqrt(UD[None, :] ** (1.0 / (1.0 - P["q"])) - 1.0), 3000.0)
        la = ev.latitude.values[a:b, None] + r * np.sin(TH)[None, :] / 111.2
        lo = ev.longitude.values[a:b, None] + r * np.cos(TH)[None, :] / (111.2 * np.cos(np.radians(ev.latitude.values[a:b]))[:, None])
        out[a:b] = haversine_km(c["lat"], c["lon"], la, lo)
    return out


# local median depth for the background (10 nearest M >= 5 epicentres 1973-2014)
trn = ev[ev.t < TEST0]
CELL_DEPTH = np.empty(GX.size)
gx, gy = GX.ravel(), GY.ravel()
for a in range(0, gx.size, 2000):
    dd = haversine_km(gy[a:a + 2000, None], gx[a:a + 2000, None], trn.latitude.values[None, :], trn.longitude.values[None, :])
    nn = np.argsort(dd, axis=1)[:, :10]
    CELL_DEPTH[a:a + 2000] = np.median(trn.depth.values[nn], axis=1)
CELL_DEPTH = CELL_DEPTH.reshape(GX.shape)


def factors(c):
    """F[target] per parent, and the background's share Ub[target] (per unit of mu)."""
    dist = kernel_draw_dist(c)
    out = {"A": (dist <= 300.0).mean(1)}
    pdist = haversine_km(c["lat"], c["lon"], ev.latitude.values, ev.longitude.values)
    site_ok = c["bkk"] & (pdist <= SITE_MAX_KM) & in_site_domain(ev.latitude.values, ev.longitude.values, ev.depth.values)
    for k in ("B", "C"):
        F = np.zeros(len(ev))
        for s_, mask in ((0.0, ~site_ok), (BKK_MMI_TERM, site_ok)):
            if not mask.any():
                continue
            rh = RHT[k][s_]
            h = ev.depth.values[mask]
            re = np.sqrt(np.maximum(rh[None, :] ** 2 - h[:, None] ** 2, 0.0)) * (rh[None, :] > h[:, None])  # (n, bins)
            ds = np.sort(dist[mask], axis=1)
            frac = np.stack([np.searchsorted(ds[i], re[i], side="right") / KD for i in range(len(ds))])
            F[mask] = (frac * WB[None, :]).sum(1)
        out[k] = F
    # background
    gd = haversine_km(c["lat"], c["lon"], GY, GX)
    mass = U * CELL_KM2
    ub = {"A": float(mass[gd <= 300.0].sum())}
    gsite = c["bkk"] & (gd <= SITE_MAX_KM) & in_site_domain(GY, GX, CELL_DEPTH)
    for k in ("B", "C"):
        tot = 0.0
        for s_, mask in ((0.0, ~gsite), (BKK_MMI_TERM, gsite)):
            rh = RHT[k][s_]
            h = CELL_DEPTH[mask]
            re = np.sqrt(np.maximum(rh[None, :] ** 2 - h[:, None] ** 2, 0.0)) * (rh[None, :] > h[:, None])
            hit = gd[mask][:, None] <= re
            tot += float((mass[mask][:, None] * hit * WB[None, :]).sum())
        ub[k] = tot
    return out, ub


# ---------- outcomes ----------
def outcomes(c):
    """per target: arrays of outcome-quake times (days)"""
    oa = ev[haversine_km(c["lat"], c["lon"], ev.latitude.values, ev.longitude.values) <= 300.0].td.values
    mm, _ = page_mmi(o45.m.values, o45.latitude.values, o45.longitude.values, o45.depth.values, c)
    return {"A": np.sort(oa), "B": np.sort(o45.td.values[mm >= THR["B"]]), "C": np.sort(o45.td.values[mm >= THR["C"]])}


def any_in(times, t1, t2):
    a = np.searchsorted(times, t1, side="right")
    b = np.searchsorted(times, t2, side="right")
    return (b - a) > 0


def etas_lambda(F, ub, t_issue):
    """Lambda over (t, t + W] for each issue time, per target."""
    tp = ev.td.values
    kap = P["A"] * np.exp(P["alpha"] * (ev.m.values - M0))
    out = {}
    for k in ("A", "B", "C"):
        lam = np.empty(len(t_issue))
        for n, t in enumerate(t_issue):
            msk = tp < t
            g = Gcum(t + W - tp[msk]) - Gcum(t - tp[msk])
            lam[n] = (kap[msk] * g * F[k][msk]).sum()
        out[k] = lam + P["mu"] * W * ub[k] * (1.0 if k == "A" else 1.0)
    return out


gp = pd.read_csv(DATA / "eq_opensha_oaf" / "PageEtAlGenericParams_032116.csv")
gp["regionName"] = gp.regionName.str.strip()
GPAR = gp.set_index("regionName").to_dict("index")
AGRID = np.round(np.arange(-4.5, -0.5 + 1e-9, 0.01), 2)
MB_RJ = np.round(np.arange(4.5, 9.2, 0.1), 1)


def omori_int(t1, t2, p, c):
    if abs(p - 1.0) < 1e-9:
        return np.log((t2 + c) / (t1 + c))
    return ((t2 + c) ** (1 - p) - (t1 + c) ** (1 - p)) / (1 - p)


def gp_point(trig, c, k, clim):
    """Page generic R&J recomputed for the point (aftershocks uniform over USGS's circle)."""
    g = GPAR[regime(trig.latitude, trig.longitude)]
    sig = np.sqrt(g["aValue_Sigma0"] ** 2 + g["aValue_Sigma1"] ** 2 / 10 ** max(trig.m, 6.0))
    w = np.exp(-(AGRID - g["aValue_Mean"]) ** 2 / (2 * sig ** 2)); w /= w.sum()
    rad = float(np.clip(10 ** (0.69 * trig.m - 3.22), 10.0, 2000.0))
    n = 4000
    rr = rad * np.sqrt(RNG.random(n)); th = RNG.random(n) * 2 * np.pi
    la = trig.latitude + rr * np.sin(th) / 111.2
    lo = trig.longitude + rr * np.cos(th) / (111.2 * np.cos(np.radians(trig.latitude)))
    dist = haversine_km(c["lat"], c["lon"], la, lo)
    oi = omori_int(TS, TS + W, g["pValue_MaxLike"], g["cValue"])
    if k == "A":
        n5 = 10 ** (AGRID + g["bValue"] * (trig.m - 5.0)) * oi
        lam = n5 * (dist <= 300.0).mean()
    else:
        h = max(trig.depth, 0.0)
        pd_ = haversine_km(c["lat"], c["lon"], trig.latitude, trig.longitude)
        s_ = BKK_MMI_TERM if (c["bkk"] and pd_ <= SITE_MAX_KM and in_site_domain(trig.latitude, trig.longitude, h)) else 0.0
        rh = RHT[k][s_]
        re = np.sqrt(np.maximum(rh ** 2 - h ** 2, 0.0)) * (rh > h)
        frac = np.array([(dist <= r).mean() for r in re])
        wb = 10 ** (-g["bValue"] * (MB_RJ - trig.m)) - 10 ** (-g["bValue"] * (MB_RJ + 0.1 - trig.m))
        lam = 10 ** AGRID * oi * (wb * frac).sum()
    return float(1 - (1 - clim) * (w * np.exp(-lam)).sum())


# ---------- run ----------
rows = []
summary = {}
for c in CITY:
    F, ub = factors(c)
    OC = outcomes(c)
    # climatology from training weeks
    clim = {}
    for k, start in (("A", "1980-01-01"), ("B", "1995-01-01"), ("C", "1995-01-01")):
        tw = np.arange(days(pd.Timestamp(start, tz="UTC")), days(TEST0) - W + 1e-9, W)
        clim[k] = float(np.mean([any_in(OC[k], t, t + W) for t in tw]))
    # weekly test windows
    tw = np.arange(days(TEST0), days(TEST1) - W + 1e-9, W)
    lam = etas_lambda(F, ub, tw)
    for n, t in enumerate(tw):
        r = dict(city=c["name"], scheme="W", t=t, block=n, trig_m=np.nan)
        for k in ("A", "B", "C"):
            r[f"y_{k}"] = int(any_in(OC[k], t, t + W)); r[f"C_{k}"] = clim[k]; r[f"E_{k}"] = 1 - np.exp(-lam[k][n])
        rows.append(r)
    # triggered windows (train + test), M >= 6.0 primary and M >= 5.5 secondary
    for mmin, sch in ((6.0, "T6"), (5.5, "T55")):
        cand = d[(d.m >= mmin - 1e-9) & (d.t >= pd.Timestamp("1980-01-01", tz="UTC")) & (d.t < TEST1 - pd.Timedelta(days=8))]
        mm, dist = page_mmi(cand.m.values, cand.latitude.values, cand.longitude.values, cand.depth.values, c)
        cand = cand[(dist <= 300.0) | (mm >= 2.5)]
        last = -1e9
        keep = []
        for tr in cand.itertuples():
            if tr.td < last + TS + W:
                continue
            keep.append(tr); last = tr.td
        if not keep:
            continue
        ti = np.array([k_.td + TS for k_ in keep])
        lamT = etas_lambda(F, ub, ti)
        for n, tr in enumerate(keep):
            t = ti[n]
            r = dict(city=c["name"], scheme=sch, t=t, block=tr.id, trig_m=tr.m, trig_id=tr.id,
                     trig_time=tr.time, set="test" if tr.t >= TEST0 else "train")
            for k in ("A", "B", "C"):
                r[f"y_{k}"] = int(any_in(OC[k], t, t + W)); r[f"C_{k}"] = clim[k]; r[f"E_{k}"] = 1 - np.exp(-lamT[k][n])
                r[f"GP_{k}"] = gp_point(tr, c, k, clim[k])
            rows.append(r)
    summary[c["name"]] = dict(clim=clim, ub=ub)
    L(f"{c['name']:20s} climatology A {clim['A']:.4f}  B {clim['B']:.4f}  C {clim['C']:.4f}; "
      f"test weeks with event A {np.mean([any_in(OC['A'], t, t + W) for t in tw]):.4f} "
      f"B {np.mean([any_in(OC['B'], t, t + W) for t in tw]):.4f} C {np.mean([any_in(OC['C'], t, t + W) for t in tw]):.4f}")

R = pd.DataFrame(rows)
R.loc[R.scheme == "W", "set"] = "test"
# pooled conditional base rates for the triggered schemes (training windows, all cities)
for sch in ("T6", "T55"):
    trw = R[(R.scheme == sch) & (R.set == "train")]
    bins = [5.5, 6.0, 6.5, 7.0, 10]
    for k in ("A", "B", "C"):
        R.loc[R.scheme == sch, f"BT_{k}"] = trw[f"y_{k}"].mean()
        rates = trw.groupby(pd.cut(trw.trig_m, bins, right=False), observed=False)[f"y_{k}"].mean().fillna(trw[f"y_{k}"].mean())
        sel = R.scheme == sch
        R.loc[sel, f"B1T_{k}"] = [float(rates.iloc[int(np.digitize(m, bins) - 1)]) for m in R.loc[sel, "trig_m"]]
    L(f"\n{sch}: training triggered windows {len(trw)} (from {trw.block.nunique()} quakes); share with event "
      f"A {trw.y_A.mean():.3f} B {trw.y_B.mean():.3f} C {trw.y_C.mean():.3f}")


def sc(y, p):
    p = np.clip(np.asarray(p, float), 0.0005, 0.9995)
    return np.mean((p - y) ** 2), np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))


def block_boot(X, mcol, ccol, ycol, n=2000):
    blocks = X.block.astype(str).values
    ub_ = np.unique(blocks)
    idx = {b: np.where(blocks == b)[0] for b in ub_}
    y, pm, pc = X[ycol].values, X[mcol].values, X[ccol].values
    out = []
    for _ in range(n):
        pick = np.concatenate([idx[b] for b in RNG.choice(ub_, len(ub_))])
        out.append(np.mean((pc[pick] - y[pick]) ** 2) - np.mean((pm[pick] - y[pick]) ** 2))
    return np.percentile(out, [2.5, 97.5])


store = []
for sch, models in (("W", ("C", "E")), ("T6", ("C", "BT", "B1T", "E", "GP")), ("T55", ("C", "BT", "B1T", "E", "GP"))):
    for setname in (("test",) if sch == "W" else ("test", "train")):
        X = R[(R.scheme == sch) & (R.set == setname)]
        if not len(X):
            continue
        for k in ("A", "B", "C"):
            y = X[f"y_{k}"].values
            bc, lc = sc(y, X[f"C_{k}"].values)
            L(f"\n-- {sch} {setname} target {k}: n = {len(X)} windows ({X.block.nunique()} blocks), observed {int(y.sum())} "
              f"({100 * y.mean():.2f} %); say nothing (p = 0) Brier {y.mean():.5f}")
            for mdl in models:
                pm = X[f"{mdl}_{k}"].values
                bs, ls = sc(y, pm)
                lo, hi = block_boot(X, f"{mdl}_{k}", f"C_{k}", f"y_{k}") if mdl != "C" else (0.0, 0.0)
                L(f"   {mdl:>3}: mean p {pm.mean():.4f} (median {np.median(pm):.4f}, max {pm.max():.3f})  Brier {bs:.5f}  "
                  f"BSS {1 - bs / bc:+.3f}  log {ls:.4f}  gain vs C {ls - lc:+.4f} nats/window  "
                  f"95 % Brier(C)-Brier {lo:+.5f} .. {hi:+.5f}")
                store.append(dict(scheme=sch, set=setname, target=k, model=mdl, n=int(len(X)), blocks=int(X.block.nunique()),
                                  obs=int(y.sum()), mean_p=float(pm.mean()), median_p=float(np.median(pm)), max_p=float(pm.max()),
                                  brier=float(bs), bss=float(1 - bs / bc), log=float(ls), gain=float(ls - lc),
                                  lo=float(lo), hi=float(hi)))
                if mdl in ("E", "GP") and setname == "test":
                    edges = [0, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0001]
                    tab = pd.DataFrame(dict(p=pm, y=y, b=pd.cut(pm, edges, right=False))).groupby("b", observed=True).agg(
                        n=("y", "size"), mp=("p", "mean"), ob=("y", "mean"))
                    L("        reliability: " + "; ".join(f"[{iv.left:g},{iv.right:g}) n={int(rr.n)} p={rr.mp:.3f} obs={rr.ob:.3f}"
                                                       for iv, rr in tab.iterrows()))

# what the page would show: the share of windows where P would round to >= 10 % (the page's chance rule)
L("\n=== What a page would have shown (test) ===")
for sch in ("W", "T6"):
    X = R[(R.scheme == sch) & (R.set == "test")]
    for k in ("A", "B", "C"):
        for mdl in ("E",) + (("GP",) if sch != "W" else ()):
            pm = X[f"{mdl}_{k}"].values
            L(f"{sch} {k} {mdl}: P >= 5 % (would round to >= 10 %) in {100 * np.mean(pm >= 0.05):.1f} % of windows; "
              f"P >= 1 % in {100 * np.mean(pm >= 0.01):.1f} %; ratio to climatology median "
              f"{np.median(pm / np.maximum(X[f'C_{k}'].values, 1e-6)):.1f}, max {np.max(pm / np.maximum(X[f'C_{k}'].values, 1e-6)):.0f}")

# the named sequences
L("\n=== Case studies (triggered windows, M >= 6.0 scheme) ===")
named = {"2014-05-05": "Chiang Rai M6.1 (in the ETAS training years)", "2019-11-20": "Sainyabuli, Laos M6.2",
         "2025-03-28": "Sagaing (Mandalay) M7.7"}
for day, nm in named.items():
    X = R[(R.scheme == "T6") & R.trig_time.astype(str).str.startswith(day)]
    if not len(X):
        L(f"{nm}: no triggered window"); continue
    L(f"{nm} (trigger M{X.trig_m.iloc[0]:.1f}, {X.trig_time.iloc[0]}):")
    for r in X.itertuples():
        L(f"   {r.city:18s} A: C {r.C_A:.3f} E {r.E_A:.3f} GP {r.GP_A:.3f} obs {r.y_A} | B: C {r.C_B:.3f} E {r.E_B:.3f} "
          f"GP {r.GP_B:.3f} obs {r.y_B} | C: C {r.C_C:.4f} E {r.E_C:.4f} GP {r.GP_C:.4f} obs {r.y_C}")
R.to_csv(OUT / "eq_d11_point_windows.csv.gz", index=False, compression="gzip")
(OUT / "eq_d11_point.json").write_text(json.dumps(dict(scores=store, cities=summary), indent=1, default=float))
L("\nwrote research/out/eq_d11_point.json and research/out/eq_d11_point_windows.csv.gz")

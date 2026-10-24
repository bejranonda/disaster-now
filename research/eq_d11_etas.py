"""D11 study, part 2: a space-time ETAS model of the regional ComCat catalogue, fitted on 1980-2014 and frozen,
then scored on 2015-2026 for the whole region against a time-independent (Poisson) model.

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_etas.py
Input:  research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py: ComCat, box 0-30 N, 88-110 E,
        M >= 4, 1973-2026, with Gardner-Knopoff flags).
Writes research/out/eq_d11_etas.json (parameters, region-level scores), research/logs/eq_d11_etas-2026-10-24.log.

Model (Ogata 1998 space-time ETAS, isotropic power-law kernel; fixed before fitting):
  lambda(t, x) = mu u(x) + sum_{t_i < t} A exp(alpha (m_i - M0)) g(t - t_i) f(x - x_i | m_i)
  g(t) = (p - 1)/c (1 + t/c)^-p;  f(r | m) = (q - 1)/(pi s^2) (1 + r^2/s^2)^-q,  s^2 = D^2 exp(gamma (m - M0))
  M0 = 5.0 (ComCat complete here from about M 4.5-5.0 since 1973, earlier study §3); magnitudes G-R with the
  Aki-Utsu b of the M >= 5 events 1973-2014; u(x): Gaussian-smoothed (100 km) Gardner-Knopoff-independent M >= 5
  epicentres 1973-2014 plus a 5 % uniform floor (the bandwidth and floor the earlier study chose, §6), on a 0.1 deg grid
  over the target region 1-29 N, 89-109 E, normalised to 1 there.
  Fit: targets M >= 5 inside the target region, 1980-01-01 .. 2015-01-01; parents every M >= 5 in the whole box
  since 1973 (pairs within 20 years and 2,000 km); the integral of each parent's kernel over the region by 256 fixed
  random draws. Maximum likelihood, L-BFGS-B on transformed parameters.
Region-level test, 2015-01-01 .. 2026-10-16 (parameters frozen): information gain per test event of ETAS over the
  Poisson model "training rate of ALL M >= 5 events x smoothed density of ALL M >= 5 epicentres" (continuous time,
  parents include every earlier event); and daily-updated forecasts (each day's expected count from events before
  the day), with a Poisson log-likelihood per day and the number of days ETAS gave a higher daily rate than the
  Poisson model when a quake came / did not come.
"""
from __future__ import annotations

import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.optimize import minimize  # noqa: E402

from eq_common import DATA, OUT, Log, haversine_km  # noqa: E402

L = Log("eq_d11_etas")
RNG = np.random.default_rng(20261024)
M0 = 5.0
T_ORIGIN = pd.Timestamp("1973-01-01", tz="UTC")
FIT0, FIT1 = pd.Timestamp("1980-01-01", tz="UTC"), pd.Timestamp("2015-01-01", tz="UTC")
TEST1 = pd.Timestamp("2026-10-16", tz="UTC")
REG = (1.0, 29.0, 89.0, 109.0)
KDRAW = 256
MAXDT, MAXR = 20 * 365.25, 2000.0


def days(ts):
    return (ts - T_ORIGIN).total_seconds() / 86400.0


d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
d["td"] = (d.t - T_ORIGIN).dt.total_seconds() / 86400.0
ev = d[d.m >= M0 - 1e-9].reset_index(drop=True)
ev["inreg"] = ev.latitude.between(REG[0], REG[1]) & ev.longitude.between(REG[2], REG[3])
L(f"events M >= {M0}: {len(ev)} ({ev.t.min().date()} .. {ev.t.max().date()}); inside the target region "
  f"{int(ev.inreg.sum())}")

# ---- b-value (Aki-Utsu, M >= 5, 1973-2014) ----
mtr = ev[ev.t < FIT1].m.values
B = np.log10(np.e) / (mtr.mean() - (M0 - 0.05))
BETA = B * np.log(10)
L(f"b (Aki-Utsu, M>=5, 1973-2014, all events, n={len(mtr)}): {B:.3f}  -> beta {BETA:.3f}")

# ---- background density u on a 0.1 deg grid ----
GLAT = np.arange(REG[0] + 0.05, REG[1], 0.1)
GLON = np.arange(REG[2] + 0.05, REG[3], 0.1)
GX, GY = np.meshgrid(GLON, GLAT)
CELL_KM2 = (0.1 * 111.2) * (0.1 * 111.2 * np.cos(np.radians(GY)))


def smooth_density(lat, lon, bw=100.0, floor=0.05):
    acc = np.zeros(GX.shape)
    for a, b in zip(lat, lon):
        dd = haversine_km(a, b, GY, GX)
        acc += np.exp(-dd ** 2 / (2 * bw ** 2))
    acc = acc / (acc * CELL_KM2).sum()
    unif = 1.0 / CELL_KM2.sum()
    return (1 - floor) * acc + floor * unif          # per km^2, integrates to 1 over the region


bg_src = d[(d.flag == 0) & (d.m >= M0 - 1e-9) & (d.t < FIT1)]
U = smooth_density(bg_src.latitude.values, bg_src.longitude.values)
all_src = ev[ev.t < FIT1]
U_ALL = smooth_density(all_src.latitude.values, all_src.longitude.values)
L(f"background from {len(bg_src)} independent M>=5 epicentres 1973-2014; Poisson-baseline density from all "
  f"{len(all_src)} M>=5 epicentres")


def u_at(G, lat, lon):
    i = np.clip(np.round((np.asarray(lat) - GLAT[0]) / 0.1).astype(int), 0, len(GLAT) - 1)
    j = np.clip(np.round((np.asarray(lon) - GLON[0]) / 0.1).astype(int), 0, len(GLON) - 1)
    return G[i, j]


# ---- pairs ----
def build_pairs(tgt_idx, par_max_t):
    """For target events tgt_idx (indices into ev), all earlier events within MAXDT and MAXR."""
    tdv, la, lo = ev.td.values, ev.latitude.values, ev.longitude.values
    I, J, DT, R2 = [], [], [], []
    for j in tgt_idx:
        lo_i = np.searchsorted(tdv, tdv[j] - MAXDT)
        cand = np.arange(lo_i, j)
        cand = cand[tdv[cand] < tdv[j]]
        if not len(cand):
            continue
        dd = haversine_km(la[j], lo[j], la[cand], lo[cand])
        k = dd <= MAXR
        I.append(cand[k]); J.append(np.full(k.sum(), j)); DT.append(tdv[j] - tdv[cand[k]]); R2.append(dd[k] ** 2)
    return (np.concatenate(I).astype(np.int32), np.concatenate(J).astype(np.int32),
            np.concatenate(DT).astype(np.float64), np.concatenate(R2).astype(np.float64))


tfit = ev.index[(ev.t >= FIT0) & (ev.t < FIT1) & ev.inreg].values
t0 = time.time()
PI, PJ, PDT, PR2 = build_pairs(tfit, None)
L(f"fit targets: {len(tfit)}; pairs: {len(PI):,} ({time.time() - t0:.0f} s)")
MI = ev.m.values - M0
UJ = u_at(U, ev.latitude.values, ev.longitude.values)
TF0, TF1 = days(FIT0), days(FIT1)
par = ev.index[ev.t < FIT1].values                       # parents for the integral
UD, TH = RNG.random(KDRAW), RNG.random(KDRAW) * 2 * np.pi


def frac_inside(idx, D, gam, q):
    s = D * np.exp(gam * MI[idx] / 2.0)
    r = s[:, None] * np.sqrt(UD[None, :] ** (1.0 / (1.0 - q)) - 1.0)
    la = ev.latitude.values[idx][:, None] + r * np.sin(TH)[None, :] / 111.2
    lo = ev.longitude.values[idx][:, None] + r * np.cos(TH)[None, :] / (111.2 * np.cos(np.radians(ev.latitude.values[idx]))[:, None])
    ok = (la >= REG[0]) & (la <= REG[1]) & (lo >= REG[2]) & (lo <= REG[3])
    return ok.mean(1)


def unpack(th):
    lmu, lA, al, lc, lpm1, lD, gam, lqm1 = th
    return dict(mu=np.exp(lmu), A=np.exp(lA), alpha=al, c=np.exp(lc), p=1 + np.exp(lpm1), D=np.exp(lD), gamma=gam,
                q=1 + np.exp(lqm1))


def Gcum(t, c, p):
    return 1.0 - (1.0 + t / c) ** (1.0 - p)


def negll(th, verbose=False):
    P = unpack(th)
    mu, A, al, c, p, D, gam, q = (P[k] for k in ("mu", "A", "alpha", "c", "p", "D", "gamma", "q"))
    if not (0 < al < 4 and 0 <= gam < 4):
        return 1e12
    k = A * np.exp(al * MI[PI])
    s2 = D ** 2 * np.exp(gam * MI[PI])
    trig = k * (p - 1) / c * (1 + PDT / c) ** (-p) * (q - 1) / (np.pi * s2) * (1 + PR2 / s2) ** (-q)
    lam = mu * UJ[tfit] + np.bincount(np.searchsorted(tfit, PJ), weights=trig, minlength=len(tfit))
    ll = np.log(np.maximum(lam, 1e-300)).sum()
    tp = ev.td.values[par]
    integ = mu * (TF1 - TF0)
    fr = frac_inside(par, D, gam, q)
    g = Gcum(TF1 - tp, c, p) - Gcum(np.maximum(TF0, tp) - tp, c, p)
    integ += (A * np.exp(al * MI[par]) * g * fr).sum()
    return -(ll - integ)


nbg = len(bg_src[bg_src.t >= FIT0]) / (TF1 - TF0)
x0 = np.array([np.log(nbg), np.log(0.3), 1.5, np.log(0.01), np.log(0.1), np.log(10.0), 1.0, np.log(0.5)])
t0 = time.time()
fit = minimize(negll, x0, method="L-BFGS-B",
               bounds=[(-10, 5), (-8, 3), (0.1, 3.5), (np.log(1e-4), np.log(2.0)), (np.log(1e-3), np.log(1.5)),
                       (np.log(0.5), np.log(200)), (0.0, 3.5), (np.log(0.05), np.log(5.0))],
               options=dict(maxiter=500))
PAR = unpack(fit.x)
L(f"\nETAS fit ({time.time() - t0:.0f} s, success={fit.success}, {fit.message}): -logL = {fit.fun:.1f}")
for k_, v in PAR.items():
    L(f"   {k_:6s} = {v:.4g}")
br = PAR["A"] * BETA / (BETA - PAR["alpha"]) if BETA > PAR["alpha"] else float("inf")
mmax = 9.2
trunc = PAR["A"] * BETA * (1 - np.exp(-(BETA - PAR["alpha"]) * (mmax - M0))) / ((BETA - PAR["alpha"]) * (1 - np.exp(-BETA * (mmax - M0))))
L(f"   branching ratio (untruncated G-R) {br:.3f}; truncated at M{mmax}: {trunc:.3f}")
L(f"   background share of fit-period events: {PAR['mu'] * (TF1 - TF0) / len(tfit):.3f}")
L(f"   expected direct M>=5 aftershocks of an M6 / M7 / M7.7: {PAR['A'] * np.exp(PAR['alpha'] * 1):.2f} / "
  f"{PAR['A'] * np.exp(PAR['alpha'] * 2):.2f} / {PAR['A'] * np.exp(PAR['alpha'] * 2.7):.2f}")
L(f"   kernel scale s for M5 / M6 / M7: {PAR['D']:.1f} / {PAR['D'] * np.exp(PAR['gamma'] / 2):.1f} / "
  f"{PAR['D'] * np.exp(PAR['gamma']):.1f} km")

# ---------- region-level test, 2015-01-01 .. 2026-10-16 ----------
TT0, TT1 = days(FIT1), days(TEST1)
ttest = ev.index[(ev.t >= FIT1) & (ev.t < TEST1) & ev.inreg].values
QI, QJ, QDT, QR2 = build_pairs(ttest, None)
P = PAR


def lam_events(tidx, I, J, DT, R2):
    k = P["A"] * np.exp(P["alpha"] * MI[I])
    s2 = P["D"] ** 2 * np.exp(P["gamma"] * MI[I])
    trig = k * (P["p"] - 1) / P["c"] * (1 + DT / P["c"]) ** (-P["p"]) * (P["q"] - 1) / (np.pi * s2) * (1 + R2 / s2) ** (-P["q"])
    return P["mu"] * UJ[tidx] + np.bincount(np.searchsorted(tidx, J), weights=trig, minlength=len(tidx))


lam_t = lam_events(ttest, QI, QJ, QDT, QR2)
partest = ev.index[ev.t < TEST1].values
tp = ev.td.values[partest]
fr = frac_inside(partest, P["D"], P["gamma"], P["q"])
integ_etas = P["mu"] * (TT1 - TT0) + (P["A"] * np.exp(P["alpha"] * MI[partest]) *
                                     (Gcum(TT1 - tp, P["c"], P["p"]) - Gcum(np.maximum(TT0, tp) - tp, P["c"], P["p"])) * fr).sum()
rate_pois = ((ev.t >= FIT0) & (ev.t < FIT1) & ev.inreg).sum() / (TF1 - TF0)
lam_p = rate_pois * u_at(U_ALL, ev.latitude.values[ttest], ev.longitude.values[ttest])
integ_pois = rate_pois * (TT1 - TT0)
ll_e = np.log(lam_t).sum() - integ_etas
ll_p = np.log(lam_p).sum() - integ_pois
N = len(ttest)
L(f"\n=== Region-level test 2015-01-01 .. 2026-10-16: {N} M>=5 events in the target region ===")
L(f"expected count: ETAS {integ_etas:.0f}, Poisson (training rate of all events) {integ_pois:.0f}, observed {N}")
L(f"log-likelihood: ETAS {ll_e:.1f}, Poisson {ll_p:.1f}; information gain per event {(ll_e - ll_p) / N:.3f} nats "
  f"({(ll_e - ll_p) / N / np.log(2):.3f} bits), probability gain per event {np.exp((ll_e - ll_p) / N):.2f}")

# daily-updated forecasts
day_edges = np.arange(TT0, TT1 + 1e-9, 1.0)
nd = len(day_edges) - 1
obs_day = np.histogram(ev.td.values[ttest], bins=day_edges)[0]
exp_day = np.zeros(nd)
mi_all = MI[partest]
kk = P["A"] * np.exp(P["alpha"] * mi_all)
for k_ in range(nd):
    a, b = day_edges[k_], day_edges[k_ + 1]
    m_ = tp < a
    g = Gcum(b - tp[m_], P["c"], P["p"]) - Gcum(a - tp[m_], P["c"], P["p"])
    exp_day[k_] = P["mu"] + (kk[m_] * g * fr[m_]).sum()
from scipy.stats import poisson as _po  # noqa: E402
lld_e = _po.logpmf(obs_day, exp_day).sum()
lld_p = _po.logpmf(obs_day, rate_pois).sum()
# day-level "probability of >= 1 M>=5 somewhere in the region tomorrow"
pe, pp = 1 - np.exp(-exp_day), 1 - np.exp(-rate_pois)
yy = (obs_day > 0).astype(float)
L(f"daily-updated: {nd} days, {int(yy.sum())} with >= 1 event; Poisson log-lik ETAS {lld_e:.1f} vs Poisson {lld_p:.1f} "
  f"(gain {lld_e - lld_p:+.1f} nats over {nd} days)")
L(f"   P(>=1 M>=5 in the region in the day): Brier ETAS {np.mean((pe - yy) ** 2):.4f}, Poisson {np.mean((pp - yy) ** 2):.4f}, "
  f"BSS {1 - np.mean((pe - yy) ** 2) / np.mean((pp - yy) ** 2):+.3f}; mean p ETAS {pe.mean():.3f}, Poisson {pp:.3f}, "
  f"observed {yy.mean():.3f}")
for lo_, hi_ in ((0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)):
    m_ = (pe >= lo_) & (pe < hi_)
    if m_.any():
        L(f"   reliability ETAS daily [{lo_:.1f},{hi_:.1f}): n={int(m_.sum())} mean p {pe[m_].mean():.3f} observed {yy[m_].mean():.3f}")
out = dict(params=PAR, b=B, beta=BETA, branching=br, branching_trunc=float(trunc), n_fit=int(len(tfit)),
           negll=float(fit.fun), test=dict(n=int(N), exp_etas=float(integ_etas), exp_pois=float(integ_pois),
                                          ll_etas=float(ll_e), ll_pois=float(ll_p), igpe_nats=float((ll_e - ll_p) / N),
                                          daily_ll_etas=float(lld_e), daily_ll_pois=float(lld_p),
                                          daily_brier_etas=float(np.mean((pe - yy) ** 2)),
                                          daily_brier_pois=float(np.mean((pp - yy) ** 2))),
           rate_pois=float(rate_pois), grid=dict(reg=REG, step=0.1), M0=M0)
(OUT / "eq_d11_etas.json").write_text(json.dumps(out, indent=1, default=float))
np.savez_compressed(DATA.parent / "out" / "eq_d11_etas_grids.npz", U=U, U_ALL=U_ALL, GLAT=GLAT, GLON=GLON)
L("\nwrote research/out/eq_d11_etas.json and research/out/eq_d11_etas_grids.npz")

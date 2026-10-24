"""D11 study, part 5: do "other parameters" carry usable short-term information in this region's catalogue?
Tides (lunar semi-diurnal and fortnightly phase), season (the monsoon's hydrological load), foreshocks (the chance
that a quake is followed by a larger one), and whether a real-time b-value is even measurable here.

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_other.py   (after eq_d11_etas.py, eq_d11_recheck.py)
Inputs: research/data/eq_comcat/comcat_declustered_flags.csv.gz, research/out/eq_d11_etas.json and _grids.npz,
        research/out/eq_d11_realtime_sequences.csv.gz.
Writes research/out/eq_d11_other.json, research/logs/eq_d11_other-2026-10-24.log.

Design (fixed before results):
- TIDES: Gardner-Knopoff-independent M >= 5 events 1973-2026 (and the shallow ones, depth <= 40 km). Moon and Sun from
  the Astronomical Almanac's low-precision formulae (Moon about 0.3 deg); phases: semi-diurnal lunar 2 x (lunar hour
  angle at the epicentre), semi-diurnal solar 2 x (solar hour angle), fortnightly 2 x (Moon - Sun elongation; 0 = new
  or full Moon, spring tides). Schuster test p = exp(-R^2/N); modulation amplitude a = 2R/N for a rate
  1 + a cos(phase - phase0), i.e. the best-phase probability gain is at most about 1 + a. (Tidal stress on the actual
  faults, as Ide et al. 2016 used, needs focal mechanisms: not done.)
- SEASON: the same events, phase = 2 pi x day of year / 365.25; whole box and the mainland north of 18 N (the
  monsoon-loaded Himalaya-Burma-Yunnan belt, where Bollinger et al. 2007 saw a seasonal signal in Nepal); and the
  ratio of the monsoon (May-October) to the dry-season rate with a 95 % interval.
- FORESHOCKS: every ComCat M >= 5.0 not preceded within 7 days by an event at least as large within 50 km; the share
  followed within 7 days by a LARGER event within 50 km, by magnitude; against the chance of such an event in a random
  7 days at the same place (time-independent rate of all M >= 5 events, eq_d11_etas.py's smoothed density, G-R b)
  -> the probability gain. Train 1973-2014, test 2015-2026.
- REAL-TIME b-VALUE: how many events above completeness a sequence has in its first day/week here.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import DATA, OUT, Log, haversine_km  # noqa: E402

L = Log("eq_d11_other")
d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
d = d.sort_values("t").reset_index(drop=True)
d["depth"] = d.depth.abs().fillna(10.0)
res = {}


def jd(ts):
    return ts.map(lambda x: x.to_julian_date()).values


def moon_sun(J):
    T = (J - 2451545.0) / 36525.0
    r = np.radians
    lam = (218.32 + 481267.881 * T + 6.29 * np.sin(r(135.0 + 477198.87 * T)) - 1.27 * np.sin(r(259.3 - 413335.36 * T))
           + 0.66 * np.sin(r(235.7 + 890534.22 * T)) + 0.21 * np.sin(r(269.9 + 954397.74 * T))
           - 0.19 * np.sin(r(357.5 + 35999.05 * T)) - 0.11 * np.sin(r(186.5 + 966404.03 * T)))
    bet = (5.13 * np.sin(r(93.3 + 483202.02 * T)) + 0.28 * np.sin(r(228.2 + 960400.89 * T))
           - 0.28 * np.sin(r(318.3 + 6003.15 * T)) - 0.17 * np.sin(r(217.6 - 407332.21 * T)))
    n = J - 2451545.0
    Ls = 280.460 + 0.9856474 * n
    g = 357.528 + 0.9856003 * n
    lams = Ls + 1.915 * np.sin(r(g)) + 0.020 * np.sin(r(2 * g))
    eps = r(23.439 - 0.0000004 * n)

    def radec(lm, bt):
        lm, bt = r(lm), r(bt)
        ra = np.degrees(np.arctan2(np.sin(lm) * np.cos(eps) - np.tan(bt) * np.sin(eps), np.cos(lm)))
        dec = np.degrees(np.arcsin(np.sin(bt) * np.cos(eps) + np.cos(bt) * np.sin(eps) * np.sin(lm)))
        return ra % 360, dec

    ram, decm = radec(lam, bet)
    ras, decs = radec(lams, np.zeros_like(lams))
    gmst = (280.46061837 + 360.98564736629 * n) % 360
    return dict(lam_m=lam % 360, lam_s=lams % 360, ra_m=ram, ra_s=ras, gmst=gmst)


def schuster(ph):
    z = np.exp(1j * ph)
    R = np.abs(z.sum())
    N = len(ph)
    return float(np.exp(-R ** 2 / N)), float(2 * R / N), float(np.degrees(np.angle(z.sum())) % 360), N


ind = d[(d.flag == 0) & (d.m >= 5.0 - 1e-9)].copy()
E = moon_sun(jd(ind.t))
H_m = np.radians((E["gmst"] + ind.longitude.values - E["ra_m"]) % 360)
H_s = np.radians((E["gmst"] + ind.longitude.values - E["ra_s"]) % 360)
elong = np.radians((E["lam_m"] - E["lam_s"]) % 360)
L("=== Tides: Schuster test on Gardner-Knopoff-independent M >= 5 events 1973-2026 ===")
L("(p < 0.05 would suggest a tidal modulation; a = modulation amplitude, best-phase gain <= 1 + a; phase0 in degrees)")
res["tides"] = {}
for nm, msk in (("all", np.ones(len(ind), bool)), ("shallow <= 40 km", ind.depth.values <= 40),
                ("M >= 6", ind.m.values >= 6.0 - 1e-9)):
    for ph_nm, ph in (("semi-diurnal lunar (2H_moon)", 2 * H_m), ("semi-diurnal solar (2H_sun)", 2 * H_s),
                      ("fortnightly (2 x elongation)", 2 * elong)):
        p, a, ph0, N = schuster(ph[msk])
        L(f"   {nm:17s} {ph_nm:30s} N={N:5d}  Schuster p={p:.3f}  a={a:.3f}  phase0={ph0:5.0f}")
        res["tides"][f"{nm}|{ph_nm}"] = dict(N=N, p=p, a=a, phase0=ph0)
# sanity check of the ephemeris: new/full Moons should be ~14.77 d apart in elongation phase
L("   ephemeris check: elongation at 2024-04-08 18:17 UTC (a total solar eclipse, Moon-Sun conjunction): "
  f"{float(moon_sun(np.array([pd.Timestamp('2024-04-08T18:17Z').to_julian_date()]))['lam_m'][0] - moon_sun(np.array([pd.Timestamp('2024-04-08T18:17Z').to_julian_date()]))['lam_s'][0]) % 360:.2f} deg")

L("\n=== Season (hydrological / monsoon load): annual phase, Schuster test ===")
res["season"] = {}
doy = ind.t.dt.day_of_year.values
ph = 2 * np.pi * doy / 365.25
mon = ind.t.dt.month.values
years = (ind.t.max() - ind.t.min()).days / 365.25
for nm, msk in (("whole box", np.ones(len(ind), bool)), ("north of 18 N, 92-102 E", (ind.latitude.values >= 18) & ind.longitude.between(92, 102).values),
                ("north of 18 N, shallow <= 40 km", (ind.latitude.values >= 18) & (ind.depth.values <= 40))):
    p, a, ph0, N = schuster(ph[msk])
    wet = int(((mon >= 5) & (mon <= 10) & msk).sum())
    dry = int(msk.sum() - wet)
    ratio = wet / max(dry, 1)
    se = np.sqrt(1 / max(wet, 1) + 1 / max(dry, 1))
    lo, hi = ratio * np.exp(-1.96 * se), ratio * np.exp(1.96 * se)
    L(f"   {nm:32s} N={N:5d} Schuster p={p:.3f} a={a:.3f} peak day-of-year {ph0 / 360 * 365.25:5.0f} | "
      f"May-Oct {wet} vs Nov-Apr {dry}: rate ratio {ratio:.2f} (95 % {lo:.2f}-{hi:.2f}); "
      f"(May-Oct has 184 days vs 181)")
    res["season"][nm] = dict(N=N, p=p, a=a, peak_doy=ph0 / 360 * 365.25, wet=wet, dry=dry, ratio=ratio, lo=lo, hi=hi)

L("\n=== Foreshocks: is a quake followed by a LARGER one within 7 days and 50 km? (real-time view, every M >= 5) ===")
J = json.loads((OUT / "eq_d11_etas.json").read_text())
G = np.load(OUT / "eq_d11_etas_grids.npz")
U_ALL, GLAT, GLON = G["U_ALL"], G["GLAT"], G["GLON"]
BETA, RATE = J["beta"], J["rate_pois"]          # rate of ALL M>=5 per day in the region (1980-2014)


def u_at(lat, lon):
    i = np.clip(np.round((lat - GLAT[0]) / 0.1).astype(int), 0, len(GLAT) - 1)
    j = np.clip(np.round((lon - GLON[0]) / 0.1).astype(int), 0, len(GLON) - 1)
    return U_ALL[i, j]


td = (d.t - d.t.min()).dt.total_seconds().values / 86400.0
LAT, LON, MAG = d.latitude.values, d.longitude.values, d.m.values
REG = J["grid"]["reg"]
rows = []
for i in np.where(MAG >= 5.0 - 1e-9)[0]:
    if not (REG[0] <= LAT[i] <= REG[1] and REG[2] <= LON[i] <= REG[3]):
        continue
    if td[i] > td[-1] - 7:
        continue
    w0 = np.searchsorted(td, td[i] - 7.0)
    prev = np.arange(w0, i)
    prev = prev[(MAG[prev] >= MAG[i] - 1e-9)]
    if len(prev) and (haversine_km(LAT[i], LON[i], LAT[prev], LON[prev]) <= 50).any():
        continue
    w1 = np.searchsorted(td, td[i] + 7.0, side="right")
    nxt = np.arange(i + 1, w1)
    big = nxt[MAG[nxt] > MAG[i] + 1e-9]
    hit = bool(len(big) and (haversine_km(LAT[i], LON[i], LAT[big], LON[big]) <= 50).any())
    # background: expected number of events M > m_i in 50 km and 7 days, time-independent
    lam_bg = RATE * u_at(LAT[i], LON[i]) * np.pi * 50 ** 2 * 7.0 * np.exp(-BETA * (MAG[i] + 0.05 - 5.0))
    rows.append(dict(m=MAG[i], yr=d.t[i].year, hit=hit, p_bg=1 - np.exp(-lam_bg)))
F = pd.DataFrame(rows)
F["set"] = np.where(F.yr < 2015, "train", "test")
res["foreshock"] = {}
for setname in ("train", "test"):
    X = F[F.set == setname]
    L(f"  {setname}: {len(X)} quakes M >= 5; followed by a larger one within 7 d and 50 km: {int(X.hit.sum())} "
      f"({100 * X.hit.mean():.2f} %); time-independent chance at the same places {100 * X.p_bg.mean():.3f} % "
      f"-> gain {X.hit.mean() / X.p_bg.mean():.0f}x")
    for lo, hi in ((5.0, 5.5), (5.5, 6.0), (6.0, 6.5), (6.5, 10)):
        g = X[(X.m >= lo - 1e-9) & (X.m < hi - 1e-9)]
        if len(g):
            L(f"     M{lo}-{hi if hi < 10 else ''}: {int(g.hit.sum())}/{len(g)} = {100 * g.hit.mean():.1f} % "
              f"(time-independent {100 * g.p_bg.mean():.3f} %)")
            res["foreshock"][f"{setname}|{lo}"] = dict(n=int(len(g)), hits=int(g.hit.sum()), share=float(g.hit.mean()),
                                                       p_bg=float(g.p_bg.mean()))
    res["foreshock"][setname] = dict(n=int(len(X)), hits=int(X.hit.sum()), share=float(X.hit.mean()), p_bg=float(X.p_bg.mean()))

L("\n=== Real-time b-value: events above completeness in a sequence's first day / week ===")
S = pd.read_csv(OUT / "eq_d11_realtime_sequences.csv.gz")
L(f"  real-time sequences (M >= 5.5 triggers, circle as USGS): {len(S)}; events >= Mc(t) in the first day: "
  f"median {S.n_early.median():.0f}, 90th percentile {S.n_early.quantile(0.9):.0f}, max {S.n_early.max()}; "
  f"in (1 h, 30 d]: median {S.n_fit.median():.0f}, 90th {S.n_fit.quantile(0.9):.0f}; "
  f"sequences with >= 50 events in 30 d: {int((S.n_fit >= 50).sum())}")
res["bvalue"] = dict(n=int(len(S)), early_median=float(S.n_early.median()), early_p90=float(S.n_early.quantile(0.9)),
                     n30_median=float(S.n_fit.median()), n30_ge50=int((S.n_fit >= 50).sum()))
(OUT / "eq_d11_other.json").write_text(json.dumps(res, indent=1, default=float))
L("\nwrote research/out/eq_d11_other.json")

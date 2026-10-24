"""Experiment C: how often has shaking of MMI III / IV / V been predicted at 15 Thai cities, 1973-2026, from the
regional catalog and the app's own intensity equation?

Run:  nice -n 19 <venv>/bin/python -I research/eq_felt_rates.py
Inputs: research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py), public/data/tambon.json (city points),
        research/data/e4_dyfi_residuals.csv (for the empirical scatter of the equation at Thai cities).
Writes research/out/eq_felt_rates.json, research/data/eq_felt_city_events.csv (every city-event pair predicted >= 2.5),
research/logs/eq_felt_rates-2026-10-24.log.

Design (fixed before results):
- the app's equation: Allen, Wald & Worden (2012) hypocentral (public/js/ipe.js), R = sqrt(epicentral^2 + depth^2),
  plus 1.06 MMI for Bangkok when the quake is within 1,600 km (assess.BKK_MMI_TERM, quake.SITE_MAX_KM);
- events: ComCat 0-30 N, 88-110 E, 1973-01-01 .. 2026-10-23 (53.8 years), each above its period's completeness
  (MAXC + 0.2, eq_catalog.py); main set = declustered (Gardner-Knopoff independent events), also all events;
- counts of events whose predicted MMI reaches 3.0, 4.0, 5.0 (and the app's 2.5 / 4.5 word edges), per 10 years,
  with a 90 % Poisson interval (exact, Garwood);
- "with scatter": the expected number sum_i P(MMI_i >= x) with a normal scatter of sd = the Thai-city residual sd from
  the DYFI reports (e4_dyfi_residuals.csv, crustal events, city rows in Thailand, Bangkok term applied to rows within
  35 km of central Bangkok); also with the equation's own sigma (exp_ownsigma_per10 in the JSON);
- incompleteness check: the share of each count coming from M < 5.0 events, and a rough add-on for quakes below the
  catalog's completeness (G-R extrapolation, b = 1.0, from 3.0 up to each period's Mc, placed at the epicentres of the
  recorded events within 300 km of the city).
- also: the declustered set limited to M >= 5.5 ("d5.5", the domain the app's felt words were validated on,
  assess.FELT_WORDS_MIN_MAG), and, as a POST-HOC sensitivity added after seeing that the M8.6-9.1 offshore quakes
  dominate the southern cities' strongest values (far outside the equation's crustal domain), the declustered set
  without M >= 8.0 ("d<8").
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.stats import chi2, norm  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, SITE_MAX_KM, Log, cities, haversine_km, ipe_mmi, ipe_sigma  # noqa: E402

L = Log("eq_felt_rates")
YEARS = (pd.Timestamp("2026-10-23T17:06Z") - pd.Timestamp("1973-01-01T00:00Z")).total_seconds() / (365.25 * 86400)
THR = [2.5, 3.0, 4.0, 4.5, 5.0]

d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d = d[d.m >= d.mc_t - 1e-9].reset_index(drop=True)
L(f"events above their period's completeness: {len(d)} (independent: {int((d.flag == 0).sum())}); span {YEARS:.2f} yr")

# empirical scatter of the equation at Thai cities (the validation data behind MODELS §5)
e4 = pd.read_csv(DATA / "e4_dyfi_residuals.csv")
th = e4[(e4.group == "crustal") & (e4.kind == "city") & (e4.country == "Thailand")].copy()
# greater Bangkok is approximated as within 35 km of central Bangkok (the file has no province code); those rows get
# the app's +1.06 term, as the app would apply it (assess.BKK_METRO uses the four province codes)
bkm = haversine_km(13.7516, 100.492, th.lat.values, th.lon.values)
th["site"] = np.where(bkm <= 35.0, BKK_MMI_TERM, 0.0)
res = th.cdi - (th.pred_rhypo + th.site)
L(f"Thai city DYFI rows (crustal events): n = {len(th)} ({int((th.site > 0).sum())} within 35 km of Bangkok, +1.06); "
  f"residual mean {res.mean():+.2f}, sd {res.std():.2f}, MAE {res.abs().mean():.2f}")
SD_EMP = float(res.std())


def garwood(k, conf=0.90):
    a = 1 - conf
    lo = 0.0 if k == 0 else chi2.ppf(a / 2, 2 * k) / 2
    hi = chi2.ppf(1 - a / 2, 2 * (k + 1)) / 2
    return lo, hi


# how far each threshold reaches (hypocentral distance, no site term), for orientation
L("\nreach of the equation: largest hypocentral distance (km) at which the median prediction is >= 3.0 / 4.0 / 5.0")
rr = np.arange(1.0, 3000.0, 1.0)
for mag in (3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0):
    v = ipe_mmi(mag, rr)
    reach = [int(rr[v >= t].max()) if (v >= t).any() else 0 for t in (3.0, 4.0, 5.0)]
    L(f"  M{mag}: " + " / ".join(str(x) for x in reach))
out = {"years": YEARS, "sd_emp": SD_EMP, "cities": {}}
pairs = []
L(f"\n{'city':>19} {'set':>5} | per 10 yr (count) at predicted MMI >= 2.5 / 3.0 / 4.0 / 4.5 / 5.0"
  f" | with scatter sd {SD_EMP:.2f}: >=3.0 / 4.0 / 5.0 | share of >=3.0 from M<5")
for c in cities():
    epi = haversine_km(c["lat"], c["lon"], d.latitude.values, d.longitude.values)
    rh = np.sqrt(epi ** 2 + np.abs(d.depth.values) ** 2)
    mmi = ipe_mmi(d.m.values, rh) + (np.where(epi <= SITE_MAX_KM, BKK_MMI_TERM, 0.0) if c["bkk"] else 0.0)
    rec = {}
    for setname, mask in (("decl", d.flag.values == 0), ("all", np.ones(len(d), bool)),
                          ("d5.5", (d.flag.values == 0) & (d.m.values >= 5.5)),
                          ("d<8", (d.flag.values == 0) & (d.m.values < 8.0))):
        x = mmi[mask]
        counts = {t: int((x >= t - 1e-9).sum()) for t in THR}
        exp_sc = {t: float(norm.sf((t - x) / SD_EMP).sum()) for t in (3.0, 4.0, 5.0)}
        exp_own = {t: float(norm.sf((t - x) / ipe_sigma(rh[mask])).sum()) for t in (3.0, 4.0, 5.0)}
        small = float(((x >= 3.0) & (d.m.values[mask] < 5.0)).sum() / max(counts[3.0], 1))
        rec[setname] = dict(counts=counts, per10={t: 10 * k / YEARS for t, k in counts.items()},
                            ci90_per10={t: [10 * v / YEARS for v in garwood(k)] for t, k in counts.items()},
                            exp_scatter_per10={t: 10 * v / YEARS for t, v in exp_sc.items()},
                            exp_ownsigma_per10={t: 10 * v / YEARS for t, v in exp_own.items()},
                            share_ge3_from_m_lt5=small)
        L(f"{c['name']:>19} {setname:>5} | " + " / ".join(f"{10 * counts[t] / YEARS:4.1f}({counts[t]:3d})" for t in THR)
          + " | " + " / ".join(f"{10 * exp_sc[t] / YEARS:4.1f}" for t in (3.0, 4.0, 5.0)) + f" | {100 * small:3.0f} %")
    # incompleteness add-on (declustered): virtual events from 3.0 up to Mc(t) at recorded epicentres within 300 km
    near = (epi <= 300) & (d.flag.values == 0)
    add = {t: 0.0 for t in (3.0, 4.0, 5.0)}
    mags = np.arange(3.05, 5.0, 0.1)
    for i in np.where(near)[0]:
        mc = d.mc_t.values[i]
        # each recorded event >= mc stands for 10^(b (mc - m)) * (1 - 10^-0.1) events per 0.1 bin below mc (b = 1),
        # divided by the number of events >= mc it shares that weight with (here: itself, i.e. one recorded event
        # represents the G-R tail scaled by its own share: weight = 10^(mc - m_bin) * (1-10^-0.1) * 10^-(m_i - mc)... )
        # simplified: the expected number of events per 0.1-unit bin m (< mc) per recorded event above mc is
        # w(m) = (10^-(m - 0.05 - mc) - 10^-(m + 0.05 - mc)) for b = 1
        for m in mags[mags < mc - 1e-9]:
            w = 10 ** (-(m - 0.05 - mc)) - 10 ** (-(m + 0.05 - mc))
            mi = ipe_mmi(m, rh[i]) + (BKK_MMI_TERM if c["bkk"] else 0.0)
            for t in add:
                add[t] += w * (1.0 if mi >= t else 0.0)
    rec["below_mc_addon_per10"] = {t: 10 * v / YEARS for t, v in add.items()}
    L(f"{'':>19} below-Mc add-on (decl, b=1, M3.0-Mc within 300 km, median prediction): "
      + " / ".join(f">={t}: +{10 * v / YEARS:.1f}" for t, v in add.items()) + " per 10 yr")
    top = np.argsort(-mmi)[:5]
    rec["top5"] = [dict(time=d.time.values[i][:10], m=float(d.m.values[i]), km=float(epi[i]), depth=float(d.depth.values[i]),
                        mmi=float(mmi[i]), flag=int(d.flag.values[i])) for i in top]
    L(f"{'':>19} strongest predicted: " + "; ".join(f"{r['time']} M{r['m']:.1f} {r['km']:.0f} km -> {r['mmi']:.1f}"
                                                     for r in rec["top5"]))
    for i in np.where(mmi >= 2.5 - 1e-9)[0]:
        pairs.append(dict(city=c["name"], id=d.id.values[i], time=d.time.values[i], m=d.m.values[i],
                          epi_km=round(float(epi[i]), 1), depth=d.depth.values[i], mmi=round(float(mmi[i]), 2),
                          flag=int(d.flag.values[i])))
    out["cities"][c["name"]] = rec

pd.DataFrame(pairs).to_csv(DATA / "eq_felt_city_events.csv", index=False)
(OUT / "eq_felt_rates.json").write_text(json.dumps(out, indent=1, default=float))
L("\nwrote research/out/eq_felt_rates.json and research/data/eq_felt_city_events.csv")

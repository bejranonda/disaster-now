"""Experiment C2: is a city's past rate of predicted shaking a fair guide to the next decade? (choose on an earlier
period, score on a later one, against a naive baseline)

Run:  nice -n 19 <venv>/bin/python -I research/eq_felt_future.py
Input: research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py); the app's equation (eq_common).
Design (fixed before results):
- declustered events above their period's completeness; predicted MMI at each of the 15 cities as in eq_felt_rates.py;
- training 1973-01-01 .. 2014-12-31 (42.0 yr), test 2015-01-01 .. 2026-10-23 (11.8 yr);
- forecast for the test period: Poisson with the city's training rate x test length ("city rate"); naive baseline:
  the mean training rate of the 15 cities, the same for every city ("flat rate");
- scores: Poisson log-likelihood of the 15 test counts under each, the count tests P(N >= n) and P(N <= n) per city
  (CSEP's N-test idea), for thresholds 2.5, 3.0 and 4.0 MMI. Cities share quakes, so the 15 counts are not independent.
Writes research/out/eq_felt_future.json and research/logs/eq_felt_future-2026-10-24.log.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.stats import poisson  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, SITE_MAX_KM, Log, cities, haversine_km, ipe_mmi  # noqa: E402

L = Log("eq_felt_future")
d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d = d[(d.m >= d.mc_t - 1e-9) & (d.flag == 0)].reset_index(drop=True)
t = pd.to_datetime(d.time, utc=True, format="ISO8601")
split, end, start = pd.Timestamp("2015-01-01", tz="UTC"), pd.Timestamp("2026-10-23T17:06Z"), pd.Timestamp("1973-01-01", tz="UTC")
ytr = (split - start).total_seconds() / (365.25 * 86400)
yte = (end - split).total_seconds() / (365.25 * 86400)
L(f"declustered events above completeness: {len(d)}; training {ytr:.2f} yr, test {yte:.2f} yr")
out = {}
for thr in (2.5, 3.0, 4.0):
    rows = []
    for c in cities():
        epi = haversine_km(c["lat"], c["lon"], d.latitude.values, d.longitude.values)
        rh = np.sqrt(epi ** 2 + np.abs(d.depth.values) ** 2)
        mmi = ipe_mmi(d.m.values, rh) + (np.where(epi <= SITE_MAX_KM, BKK_MMI_TERM, 0.0) if c["bkk"] else 0.0)
        hit = mmi >= thr - 1e-9
        rows.append(dict(city=c["name"], n_train=int((hit & (t < split)).sum()), n_test=int((hit & (t >= split)).sum())))
    R = pd.DataFrame(rows)
    R["exp_city"] = R.n_train / ytr * yte
    R["exp_flat"] = R.n_train.mean() / ytr * yte
    R["p_ge"] = [poisson.sf(n - 1, mu) for n, mu in zip(R.n_test, R.exp_city)]
    R["p_le"] = [poisson.cdf(n, mu) for n, mu in zip(R.n_test, R.exp_city)]
    ll_city = float(poisson.logpmf(R.n_test, np.maximum(R.exp_city, 1e-9)).sum())
    ll_flat = float(poisson.logpmf(R.n_test, R.exp_flat).sum())
    L(f"\n== predicted MMI >= {thr} ==")
    L(R.assign(exp_city=R.exp_city.round(1), exp_flat=R.exp_flat.round(1), p_ge=R.p_ge.round(3),
               p_le=R.p_le.round(3)).to_string(index=False))
    L(f"total test count {R.n_test.sum()} vs expected {R.exp_city.sum():.1f}; log-likelihood city rate {ll_city:.2f}, "
      f"flat rate {ll_flat:.2f} (difference {ll_city - ll_flat:+.2f}); cities with p < 0.05 either side: "
      f"{int(((R.p_ge < 0.05) | (R.p_le < 0.05)).sum())} of 15")
    out[str(thr)] = dict(rows=R.to_dict("records"), ll_city=ll_city, ll_flat=ll_flat)
(OUT / "eq_felt_future.json").write_text(json.dumps(out, indent=1, default=float))
L("\nwrote research/out/eq_felt_future.json")

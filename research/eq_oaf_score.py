"""Experiment B, part 2: USGS's own operational aftershock forecasts for the region, scored against what ComCat
recorded afterwards (a case study: one big sequence, 2025 M7.7 Mandalay, plus one M5.4 in Bangladesh).

Run:  nice -n 19 <venv>/bin/python -I research/eq_oaf_score.py
Inputs: research/data/eq_oaf/*.json (eq_fetch_oaf.py: every version of the ComCat "oaf" product, as issued),
        research/data/eq_comcat/comcat_0-30N_88-110E_1973-2026_M4.csv.gz (outcomes; M >= 4 only, so the
        forecasts' M >= 3 bins cannot be scored, and M >= 4 outcomes are a lower bound: USGS states Mc 4.45-4.95).
Outcome of a forecast bin: >= 1 ComCat event with magnitude >= the bin's magnitude inside the forecast's own circle
(regionCenterLat/Lon, regionRadius) between its timeStart and timeEnd; windows that end after the catalog are skipped.
Count check: is the number of ComCat events inside the forecast's 95 % range (p95minimum..p95maximum)?
The versions overlap in time, so they are not independent tests; this is a case study, not a validation.
Writes research/out/eq_oaf_score.json and research/logs/eq_oaf_score-2026-10-24.log.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import DATA, OUT, Log, haversine_km  # noqa: E402

L = Log("eq_oaf_score")
cat = pd.read_csv(DATA / "eq_comcat" / "comcat_0-30N_88-110E_1973-2026_M4.csv.gz")
EPOCH = pd.Timestamp("1970-01-01", tz="UTC")
cat["ms"] = ((pd.to_datetime(cat.time, utc=True, format="ISO8601") - EPOCH).dt.total_seconds() * 1000).round().astype("int64")
END_MS = int(cat.ms.max())
rows = []
for f in sorted((DATA / "eq_oaf").glob("*.json")):
    ev, upd = f.stem.split("_")
    j = json.loads(f.read_text())
    prm = j["model"]["parameters"]
    dist = haversine_km(prm["regionCenterLat"], prm["regionCenterLon"], cat.latitude.values, cat.longitude.values)
    inside = cat[dist <= prm["regionRadius"]]
    for fc in j["forecast"]:
        t1, t2 = fc["timeStart"], fc["timeEnd"]
        if t2 > END_MS:
            continue
        w = inside[(inside.ms > t1) & (inside.ms <= t2)]
        for b in fc["bins"]:
            if b["magnitude"] < 4:
                continue
            n = int((w.mag >= b["magnitude"] - 1e-9).sum())
            rows.append(dict(event=ev, version=int(upd), issued_h_after=None, label=fc["label"], mag=b["magnitude"],
                             p=b["probability"], lo95=b.get("p95minimum"), hi95=b.get("p95maximum"), n_obs=n,
                             y=int(n > 0), model=j["model"]["name"], radius=prm["regionRadius"], t1=t1))
R = pd.DataFrame(rows)
main_ms = {"us7000pn9s": (pd.Timestamp("2025-03-28T06:20:52.715Z") - EPOCH).total_seconds() * 1000,
           "us6000rpht": (pd.Timestamp("2025-11-21T04:38:28.942Z") - EPOCH).total_seconds() * 1000}
R["issued_h_after"] = [(r.t1 - main_ms[r.event]) / 3.6e6 for r in R.itertuples()]
L(f"{R.event.nunique()} events, {R.version.nunique()} forecast versions with at least one window inside the catalog; "
  f"models: {R.model.unique().tolist()}")
out = {}
L("\n== per window and magnitude (all versions pooled; overlapping, not independent) ==")
L(f"{'event':>11} {'window':>8} {'M>=':>4} {'n':>4} {'mean p':>7} {'obs freq':>8} {'Brier':>7} {'in 95% range':>12}")
for (ev, lab, m), g in R.groupby(["event", "label", "mag"]):
    inr = ((g.n_obs >= g.lo95) & (g.n_obs <= g.hi95)).mean()
    bs = float(((g.p - g.y) ** 2).mean())
    L(f"{ev:>11} {lab:>8} {m:>4.0f} {len(g):>4} {g.p.mean():7.3f} {g.y.mean():8.3f} {bs:7.4f} {inr:12.2f}")
    out[f"{ev}|{lab}|{m:g}"] = dict(n=len(g), mean_p=float(g.p.mean()), obs=float(g.y.mean()), brier=bs, in95=float(inr))

L("\n== the first forecasts after the M7.7 (as issued) ==")
first = R[(R.event == "us7000pn9s")].sort_values("version")
for upd in first.version.unique()[:4]:
    g = first[first.version == upd]
    L(f"issued {pd.Timestamp(int(upd), unit='ms', tz='UTC')} (window starts {g.issued_h_after.iloc[0]:.1f} h after the "
      f"mainshock, circle {g.radius.iloc[0]:.0f} km):")
    for r in g.sort_values(["label", "mag"]).itertuples():
        L(f"   {r.label:>8} M>={r.mag:.0f}: P={r.p:.3f} (95% count {r.lo95}-{r.hi95}) -> observed {r.n_obs}")
L("\n== Bangladesh M5.4 (us6000rpht) ==")
for r in R[R.event == "us6000rpht"].sort_values(["label", "mag"]).itertuples():
    L(f"   {r.label:>8} M>={r.mag:.0f}: P={r.p:.3f} (95% count {r.lo95}-{r.hi95}) -> observed {r.n_obs}")
L("\n== ComCat M>=5 within 500 km of the M7.7 epicentre, first 30 days (time after, distance from the epicentre) ==")
t0 = main_ms["us7000pn9s"]
dd = haversine_km(22.011, 95.9363, cat.latitude.values, cat.longitude.values)
w = cat[(dd <= 500) & (cat.ms > t0) & (cat.ms <= t0 + 30 * 864e5) & (cat.mag >= 5.0)].assign(km=dd[(dd <= 500) & (cat.ms > t0) & (cat.ms <= t0 + 30 * 864e5) & (cat.mag >= 5.0)])
for r in w.sort_values("ms").itertuples():
    L(f"   +{(r.ms - t0) / 3.6e6:8.2f} h  M{r.mag:.1f}  {r.km:5.0f} km  {r.latitude:.2f}N {r.longitude:.2f}E  {r.place}")
L(f"   distances of all M>=4 in 30 d within 500 km: median "
  f"{np.median(dd[(dd <= 500) & (cat.ms > t0) & (cat.ms <= t0 + 30 * 864e5)]):.0f} km, share beyond 124 km "
  f"{np.mean(dd[(dd <= 500) & (cat.ms > t0) & (cat.ms <= t0 + 30 * 864e5)] > 124):.2f}")
(OUT / "eq_oaf_score.json").write_text(json.dumps(out, indent=1))
L("\nwrote research/out/eq_oaf_score.json")

"""D11 study, part 4: USGS's own aftershock forecasts for the 2025 M7.7 Sagaing (Mandalay) quake, recomputed as
"the chance that an aftershock is felt at this place in Thailand", and compared with what ComCat recorded.
A case study (one sequence, 75 overlapping versions), not a validation.

Run:  nice -n 19 <venv>/bin/python -I research/eq_d11_oaf_point.py
Inputs: research/data/eq_oaf/us7000pn9s_*.json (eq_fetch_oaf.py: every version as issued),
        research/data/eq_comcat/comcat_0-30N_88-110E_1973-2026_M4.csv.gz, public/data/tambon.json.
Writes research/out/eq_d11_oaf_point.json, research/logs/eq_d11_oaf_point-2026-10-24.log.

Method (fixed before any result):
- From each version's M >= 5 bin (fractiles of the count in its circle and window), the count distribution N5
  (the fractile values read as equally spaced quantiles); magnitudes above 5 by G-R with the version's own b,
  truncated at M 8.5; depth 10 km (the M7.7's aftershocks were shallow, ComCat).
- Where in the circle: S1 uniform over USGS's circle; S2 the ComCat M >= 4 epicentres inside the circle recorded
  before the version was issued (USGS's own data), each smeared by a 20-km Gaussian.
- At each city: q = chance that one M >= 5 aftershock reaches the page's intensity threshold there (2.5 "อาจรู้สึกได้",
  4.0 MMI IV; Bangkok +1.06, the quake being on land, shallow, east of 94.5 E), and P = 1 - E[(1 - q)^N5].
- Outcome: >= 1 ComCat quake in the version's circle and window whose page intensity at the city reaches the threshold.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, Log, cities, haversine_km, ipe_mmi  # noqa: E402

L = Log("eq_d11_oaf_point")
RNG = np.random.default_rng(20261024)
EPOCH = pd.Timestamp("1970-01-01", tz="UTC")
cat = pd.read_csv(DATA / "eq_comcat" / "comcat_0-30N_88-110E_1973-2026_M4.csv.gz")
cat["ms"] = ((pd.to_datetime(cat.time, utc=True, format="ISO8601") - EPOCH).dt.total_seconds() * 1000).round().astype("int64")
cat["depth"] = cat.depth.abs().fillna(10.0)
END_MS = int(cat.ms.max())
CITY = [c for c in cities() if c["name"] in ("Bangkok", "Chiang Mai", "Chiang Rai", "Mae Hong Son", "Mae Sot (Tak)",
                                              "Nan", "Kanchanaburi", "Khon Kaen")]
THR = (2.5, 4.0)
MGRID = np.round(np.arange(5.0, 8.5, 0.1), 1)


def city_mmi(m, lat, lon, depth, c):
    dist = haversine_km(c["lat"], c["lon"], lat, lon)
    mmi = ipe_mmi(m, np.hypot(dist, depth))
    if c["bkk"]:
        mmi = mmi + np.where((dist <= 1600) & (depth <= 40) & (lon > 94.5) & (lat > 12), BKK_MMI_TERM, 0.0)
    return mmi


rows = []
files = sorted((DATA / "eq_oaf").glob("us7000pn9s_*.json"), key=lambda f: int(f.stem.split("_")[1]))
for vi, f in enumerate(files):
    j = json.loads(f.read_text())
    prm = j["model"]["parameters"]
    b = prm.get("b", 1.0)
    clat, clon, rad = prm["regionCenterLat"], prm["regionCenterLon"], prm["regionRadius"]
    created = j["creationTime"]
    # spatial samples
    n = 3000
    rr = rad * np.sqrt(RNG.random(n)); th = RNG.random(n) * 2 * np.pi
    s1 = (clat + rr * np.sin(th) / 111.2, clon + rr * np.cos(th) / (111.2 * np.cos(np.radians(clat))))
    dd = haversine_km(clat, clon, cat.latitude.values, cat.longitude.values)
    prior = cat[(dd <= rad) & (cat.ms < created) & (cat.ms > created - 400 * 864e5)]
    prior = prior[prior.ms >= 1743142852715 - 1]          # since the mainshock (2025-03-28 06:20:52 UTC)
    if len(prior):
        k = RNG.integers(0, len(prior), n)
        s2 = (prior.latitude.values[k] + RNG.normal(0, 20, n) / 111.2,
              prior.longitude.values[k] + RNG.normal(0, 20, n) / (111.2 * np.cos(np.radians(prior.latitude.values[k]))))
    else:
        s2 = s1
    wm = 10 ** (-b * (MGRID - 5.0)) - 10 ** (-b * (MGRID + 0.1 - 5.0))
    wm = wm / wm.sum()
    inside = cat[dd <= rad]
    for fc in j["forecast"]:
        if fc["timeEnd"] > END_MS:
            continue
        b5 = next((x for x in fc["bins"] if abs(x["magnitude"] - 5.0) < 1e-6), None)
        if b5 is None:
            continue
        fr = np.array(b5["fractileValues"], float)
        win = inside[(inside.ms > fc["timeStart"]) & (inside.ms <= fc["timeEnd"])]
        for c in CITY:
            for thr in THR:
                q = {}
                for nm, (la, lo) in (("S1", s1), ("S2", s2)):
                    hit = np.array([(city_mmi(m + 0.05, la, lo, 10.0, c) >= thr).mean() for m in MGRID])
                    q[nm] = float((wm * hit).sum())
                y = int((city_mmi(win.mag.values, win.latitude.values, win.longitude.values, win.depth.values, c) >= thr).any()) if len(win) else 0
                rows.append(dict(version=vi, created=created, label=fc["label"], city=c["name"], thr=thr,
                                 h_after=(fc["timeStart"] - 1743142852715) / 3.6e6, radius=rad,
                                 p5=b5["probability"], med5=b5.get("median"),
                                 P_S1=float(1 - np.mean((1 - q["S1"]) ** fr)), P_S2=float(1 - np.mean((1 - q["S2"]) ** fr)),
                                 y=y, n_prior=len(prior)))
R = pd.DataFrame(rows)
L(f"{R.version.nunique()} versions of USGS's forecast for the M7.7 with windows inside the catalog")
L("\n== The first versions, 1-week window: P(felt at the city) recomputed (S1 uniform circle / S2 recorded aftershock zone) ==")
for v in sorted(R.version.unique())[:3]:
    g = R[(R.version == v) & (R.label == "1 Week")]
    if not len(g):
        continue
    L(f"version {v}: issued {pd.Timestamp(int(g.created.iloc[0]), unit='ms', tz='UTC')}, window from "
      f"{g.h_after.iloc[0]:.1f} h, circle {g.radius.iloc[0]:.0f} km, P(>=1 M>=5) {g.p5.iloc[0]:.2f}, "
      f"aftershocks recorded so far {g.n_prior.iloc[0]}")
    for r in g.itertuples():
        L(f"   {r.city:16s} MMI>={r.thr}: S1 {r.P_S1:.3f}  S2 {r.P_S2:.3f}  observed {r.y}")
L("\n== All versions pooled (overlapping windows: a case study, not independent tests) ==")
out = {}
for (lab, thr), g in R.groupby(["label", "thr"]):
    for cn, gg in g.groupby("city"):
        L(f"{lab:8s} MMI>={thr} {cn:16s} n={len(gg):3d} mean P S1 {gg.P_S1.mean():.3f} S2 {gg.P_S2.mean():.3f} "
          f"observed share {gg.y.mean():.3f}")
        out[f"{lab}|{thr}|{cn}"] = dict(n=int(len(gg)), S1=float(gg.P_S1.mean()), S2=float(gg.P_S2.mean()), obs=float(gg.y.mean()))
L("\n== ComCat quakes after the first hour that reached MMI >= 2.5 at any of these cities (within 600 km of the epicentre, to 2026-10) ==")
t0 = 1743142852715
dd = haversine_km(22.011, 95.9363, cat.latitude.values, cat.longitude.values)
after = cat[(dd <= 600) & (cat.ms > t0 + 3.6e6)]
for r in after.itertuples():
    hits = []
    for c in CITY:
        mm = float(city_mmi(np.array([r.mag]), np.array([r.latitude]), np.array([r.longitude]), np.array([r.depth]), c)[0])
        if mm >= 2.5:
            hits.append(f"{c['name']} {mm:.1f}")
    if hits:
        L(f"   +{(r.ms - t0) / 864e5:7.1f} d  M{r.mag:.1f} {r.place}: " + ", ".join(hits))
(OUT / "eq_d11_oaf_point.json").write_text(json.dumps(out, indent=1))
L("\nwrote research/out/eq_d11_oaf_point.json")

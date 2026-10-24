"""Experiment C, validation: do the predicted felt-shaking counts (eq_felt_rates.py) agree with what people in the
15 cities actually reported to USGS "Did You Feel It?" (DYFI)?

Run:  nice -n 19 <venv>/bin/python -I research/eq_felt_validate.py   (after eq_fetch_dyfi.py)
Inputs: research/data/eq_dyfi/dyfi_events.csv and raw/<id>_cdi_zip.txt (eq_fetch_dyfi.py),
        research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py).
Design (fixed before results):
- a city's reports = DYFI city aggregates in Thailand whose point lies within 20 km of the city point; per event the
  response-weighted mean CDI and the number of responses;
- the DYFI era = from the first Thai DYFI report in the data to 2026-10-23;
- predicted MMI = the app's equation (+1.06 for Bangkok within 1,600 km), from ComCat's location, depth, magnitude;
- comparisons per city and pooled, thresholds 3.0 / 4.0 on the continuous scale for both CDI and MMI:
  (1) residuals CDI - predicted by magnitude band (< 5.5 is outside the domain the app's words were validated on);
  (2) of the events reported at CDI >= x, the share predicted >= x (and >= x - 0.5);
  (3) counts in the DYFI era: events predicted >= x (all ComCat events M >= 4, every event, aftershocks included,
      since people report aftershocks too) vs events with a DYFI report at CDI >= x. DYFI depends on people choosing
      to report, so its counts are a floor on how often shaking was felt, not the true number.
POST-HOC (added after the first results showed many one-person reports from small, far quakes, e.g. CDI 2 in
Bangkok for an M4.2 1,890 km away): the same counts with >= 3 responses per city-event, and with events M >= 5.5 only
on both sides (the domain of the app's felt words, assess.FELT_WORDS_MIN_MAG).
Writes research/out/eq_felt_validate.json, research/data/eq_dyfi/city_event_pairs.csv,
research/logs/eq_felt_validate-2026-10-24.log.
"""
from __future__ import annotations

import csv
import io
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import BKK_MMI_TERM, DATA, OUT, SITE_MAX_KM, Log, cities, haversine_km, ipe_mmi  # noqa: E402

L = Log("eq_felt_validate")
D = DATA / "eq_dyfi"
ev = pd.read_csv(D / "dyfi_events.csv").set_index("id")
rows = []
nfiles = 0
for f in sorted((D / "raw").glob("*_cdi_zip.txt")):
    eid = f.name.replace("_cdi_zip.txt", "")
    nfiles += 1
    lines = [x for x in f.read_text().splitlines() if x.strip() and not x.startswith("#")]
    for c in csv.reader(io.StringIO("\n".join(lines))):
        try:
            key, cdi, nresp, lat, lon = c[0], float(c[1]), int(c[2]), float(c[4]), float(c[5])
        except (ValueError, IndexError):
            continue
        if "::" not in key or key.split("::")[-1].strip().lower() != "thailand":
            continue
        rows.append(dict(event=eid, key=key, cdi=cdi, nresp=nresp, lat=lat, lon=lon))
T = pd.DataFrame(rows)
L(f"raw files read: {nfiles}; Thai DYFI city rows: {len(T)} from {T.event.nunique()} events")
T = T.join(ev[["time", "mag", "lat", "lon", "depth", "place"]].rename(columns={"lat": "ev_lat", "lon": "ev_lon"}),
           on="event")
T["t"] = pd.to_datetime(T.time, unit="ms", utc=True)
era0 = T.t.min()
L(f"DYFI era (first Thai report): {era0}; Thai reports by event magnitude: "
  + pd.cut(T.drop_duplicates("event").mag, [0, 4.5, 5.0, 5.5, 6.0, 7.0, 10]).value_counts().sort_index().to_dict().__repr__())
end = pd.Timestamp("2026-10-23T17:06Z")
years = (end - era0).total_seconds() / (365.25 * 86400)

cat = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
cat["t"] = pd.to_datetime(cat.time, utc=True, format="ISO8601")
cat = cat[cat.t >= era0]

pairs, out = [], {"era_start": str(era0), "years": years, "cities": {}}
L(f"\nper city, DYFI era {era0.date()} .. 2026-10-23 ({years:.1f} yr)")
L(f"{'city':>19} | events w/ report | CDI>=3 | CDI>=4 || predicted>=3 | predicted>=4 (ComCat M>=4, all events) "
  f"|| of CDI>=3 events: share predicted >=3 / >=2.5 | median resid (CDI-pred)")
for c in cities():
    dkm = haversine_km(c["lat"], c["lon"], T.lat.values, T.lon.values)
    m = T[dkm <= 20.0]
    if len(m):
        g = m.groupby("event").apply(lambda x: pd.Series(dict(
            cdi=np.average(x.cdi, weights=x.nresp), nresp=int(x.nresp.sum()), mag=x.mag.iloc[0],
            ev_lat=x.ev_lat.iloc[0], ev_lon=x.ev_lon.iloc[0], depth=x.depth.iloc[0], time=x.time.iloc[0],
            names="|".join(sorted(set(k.split("::")[0] for k in x.key))))), include_groups=False).reset_index()
        epi = haversine_km(c["lat"], c["lon"], g.ev_lat.values, g.ev_lon.values)
        g["epi_km"] = epi
        g["pred"] = ipe_mmi(g.mag.values, np.sqrt(epi ** 2 + np.abs(g.depth.values) ** 2)) + (
            np.where(epi <= SITE_MAX_KM, BKK_MMI_TERM, 0.0) if c["bkk"] else 0.0)
        g["city"] = c["name"]
        pairs.append(g)
    else:
        g = pd.DataFrame(columns=["cdi", "pred", "mag"])
    epi_c = haversine_km(c["lat"], c["lon"], cat.latitude.values, cat.longitude.values)
    pc = ipe_mmi(cat.m.values, np.sqrt(epi_c ** 2 + np.abs(cat.depth.values) ** 2)) + (
        np.where(epi_c <= SITE_MAX_KM, BKK_MMI_TERM, 0.0) if c["bkk"] else 0.0)
    n3p, n4p = int((pc >= 3.0).sum()), int((pc >= 4.0).sum())
    f3 = g[g.cdi >= 3.0] if len(g) else g
    sh3 = float((f3.pred >= 3.0).mean()) if len(f3) else np.nan
    sh25 = float((f3.pred >= 2.5).mean()) if len(f3) else np.nan
    med = float((g.cdi - g.pred).median()) if len(g) else np.nan
    rec = dict(n_events=int(len(g)), n_cdi3=int((g.cdi >= 3.0).sum()) if len(g) else 0,
               n_cdi4=int((g.cdi >= 4.0).sum()) if len(g) else 0, n_pred3=n3p, n_pred4=n4p,
               share_cdi3_pred3=sh3, share_cdi3_pred25=sh25, median_resid=med,
               names=sorted(set("|".join(g.names).split("|"))) if len(g) else [])
    out["cities"][c["name"]] = rec
    L(f"{c['name']:>19} | {rec['n_events']:>16} | {rec['n_cdi3']:>6} | {rec['n_cdi4']:>6} || {n3p:>12} | {n4p:>12}"
      f"{'':>27}|| {sh3:>5.2f} / {sh25:<5.2f}{'':>22}| {med:+.2f}")
P = pd.concat(pairs, ignore_index=True) if pairs else pd.DataFrame()
P.to_csv(D / "city_event_pairs.csv", index=False)
L("\nDYFI place names matched (within 20 km): " + "; ".join(f"{k}: {', '.join(v['names'][:6])}"
                                                           for k, v in out["cities"].items() if v["names"]))
if len(P):
    P["res"] = P.cdi - P.pred
    L("\npooled city-event pairs, residual CDI - predicted, by magnitude band:")
    for lo, hi in ((0, 5.5), (5.5, 10)):
        q = P[(P.mag >= lo) & (P.mag < hi)]
        L(f"  M {lo}-{hi}: n = {len(q)} pairs ({q.event.nunique()} events), MAE {q.res.abs().mean():.2f}, "
          f"bias {q.res.mean():+.2f}, median {q.res.median():+.2f}")
        out[f"pooled_M{lo}-{hi}"] = dict(n=int(len(q)), events=int(q.event.nunique()), mae=float(q.res.abs().mean()),
                                         bias=float(q.res.mean()))
    for thr in (3.0, 4.0):
        q = P[P.cdi >= thr]
        L(f"  reported CDI >= {thr}: {len(q)} city-events; predicted >= {thr}: {int((q.pred >= thr).sum())} "
          f"({100 * (q.pred >= thr).mean():.0f} %), predicted >= {thr - 0.5}: {int((q.pred >= thr - 0.5).sum())} "
          f"({100 * (q.pred >= thr - 0.5).mean():.0f} %)")
        q2 = P[P.pred >= thr]
        L(f"  predicted >= {thr} among reported city-events: {len(q2)}; of them reported CDI >= {thr}: "
          f"{int((q2.cdi >= thr).sum())} ({100 * (q2.cdi >= thr).mean():.0f} %)")
    tot_p3 = sum(v["n_pred3"] for v in out["cities"].values())
    tot_o3 = sum(v["n_cdi3"] for v in out["cities"].values())
    L(f"\nall 15 cities, DYFI era: predicted >= 3.0 city-events {tot_p3}; DYFI-reported CDI >= 3.0 city-events {tot_o3}")
    L("\nthe 25 city-event pairs with the largest |residual|:")
    L(P.reindex(P.res.abs().sort_values(ascending=False).index).head(25)[
        ["city", "event", "mag", "epi_km", "depth", "cdi", "nresp", "pred", "res"]].round(2).to_string(index=False))
if len(P):
    L("\nPOST-HOC robustness: counts per city in the DYFI era (predicted >= 3.0 vs reported CDI >= 3.0)")
    L(f"{'city':>19} | all reports | >= 3 responses | M >= 5.5 only (pred / rep) | M >= 5.5 and >= 3 responses")
    out["posthoc"] = {}
    for c in cities():
        epi_c = haversine_km(c["lat"], c["lon"], cat.latitude.values, cat.longitude.values)
        pc = ipe_mmi(cat.m.values, np.sqrt(epi_c ** 2 + np.abs(cat.depth.values) ** 2)) + (
            np.where(epi_c <= SITE_MAX_KM, BKK_MMI_TERM, 0.0) if c["bkk"] else 0.0)
        q = P[P.city == c["name"]]
        n_all = int((q.cdi >= 3.0).sum()); n_r3 = int(((q.cdi >= 3.0) & (q.nresp >= 3)).sum())
        p55 = int(((pc >= 3.0) & (cat.m.values >= 5.5)).sum())
        r55 = int(((q.cdi >= 3.0) & (q.mag >= 5.5)).sum()); r55r3 = int(((q.cdi >= 3.0) & (q.mag >= 5.5) & (q.nresp >= 3)).sum())
        out["posthoc"][c["name"]] = dict(pred3=out["cities"][c["name"]]["n_pred3"], rep3=n_all, rep3_r3=n_r3,
                                         pred3_m55=p55, rep3_m55=r55, rep3_m55_r3=r55r3)
        L(f"{c['name']:>19} | {out['cities'][c['name']]['n_pred3']:>3} / {n_all:<3}  | {out['cities'][c['name']]['n_pred3']:>3} / {n_r3:<3}     "
          f"| {p55:>3} / {r55:<3}                  | {p55:>3} / {r55r3:<3}")
    tot = {k: sum(v[k] for v in out["posthoc"].values()) for k in ("pred3", "rep3", "rep3_r3", "pred3_m55", "rep3_m55", "rep3_m55_r3")}
    L(f"{'all 15':>19} | {tot['pred3']} / {tot['rep3']} | {tot['pred3']} / {tot['rep3_r3']} | {tot['pred3_m55']} / {tot['rep3_m55']} | {tot['pred3_m55']} / {tot['rep3_m55_r3']}")
    q = P[(P.mag >= 5.5) & (P.nresp >= 3)]
    L(f"M >= 5.5 pairs with >= 3 responses: n = {len(q)}, MAE {q.res.abs().mean():.2f}, bias {q.res.mean():+.2f}; "
      f"reported CDI >= 3: {int((q.cdi >= 3).sum())}, of them predicted >= 3: {int(((q.cdi >= 3) & (q.pred >= 3)).sum())}, "
      f">= 2.5: {int(((q.cdi >= 3) & (q.pred >= 2.5)).sum())}")
    q = P[(P.mag < 5.5) & (P.nresp >= 3)]
    L(f"M < 5.5 pairs with >= 3 responses: n = {len(q)}, MAE {q.res.abs().mean():.2f}, bias {q.res.mean():+.2f}")
    out["posthoc_total"] = tot
(OUT / "eq_felt_validate.json").write_text(json.dumps(out, indent=1, default=float))
L("\nwrote research/out/eq_felt_validate.json and research/data/eq_dyfi/city_event_pairs.csv")

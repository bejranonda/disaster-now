"""E4 — Was a recent earthquake probably felt at a point? An intensity prediction equation
(IPE) checked against USGS "Did You Feel It?" (DYFI) reports from Thailand and its neighbours.

This is NOT earthquake forecasting: nobody can forecast earthquakes. The IPE only estimates,
after a quake has happened, how strongly it was probably felt at a place.

Run:  python3 research/e4_quake_ipe.py
Writes research/logs/e4_quake_ipe-2026-10-23.log, research/out/e4_results.json,
research/data/e4_dyfi_residuals.csv.

IPE: Allen, Wald & Worden (2012), "Intensity attenuation for active crustal regions",
J. Seismology 16:409–433. Coefficients copied exactly from the GEM OpenQuake engine,
openquake/hazardlib/gsim/allen_2012_ipe.py (git HEAD 91db5142ba7905a33c94483fad8f8467b5d92d6f,
fetched 2026-10-23 from raw.githubusercontent.com/gem/oq-engine/master/...):
  hypocentral form (AllenEtAl2012Rhypo):
     MMI = c0 + c1*M + c2*ln(sqrt(R^2 + Rm^2)) [+ c4*ln(R/50) if R > 50 km],
     Rm = m1 + m2*exp(M - 5);  c0=2.085 c1=1.428 c2=-1.402 c4=0.078 m1=-0.209 m2=2.042
     sigma = s1 + s2/(1 + (R/s3)^2), s1=0.82 s2=0.37 s3=22.9
  rupture-distance form (AllenEtAl2012):
     MMI = c0 + c1*M + c2*ln(sqrt(Rrup^2 + (1 + c3*exp(M - 5))^2));
     c0=3.950 c1=0.913 c2=-1.107 c3=0.813;  sigma: s1=0.72 s2=0.23 s3=44.7
Rrup uses the USGS finite-fault model (FFM.geojson, subfaults with slip >= 10 % of the
maximum) where USGS published one; otherwise Rrup = Rhyp (point source).
Observations: DYFI "cdi_geo.txt" (10-km boxes) and "cdi_zip.txt" (cities, with country)
from the event's dyfi product (https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=…).
"""
from __future__ import annotations

import csv
import io
import json
import math
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import DATA, OUT, Log, get, haversine_km  # noqa: E402

L = Log("e4_quake_ipe")

AWW12_RHYPO = dict(c0=2.085, c1=1.428, c2=-1.402, c4=0.078, m1=-0.209, m2=2.042, s1=0.82, s2=0.37, s3=22.9)
AWW12_RRUP = dict(c0=3.950, c1=0.913, c2=-1.107, c3=0.813, s1=0.72, s2=0.23, s3=44.7)
SOURCE = ("Allen, Wald & Worden (2012) J. Seismol. 16:409-433; coefficients from "
          "https://raw.githubusercontent.com/gem/oq-engine/master/openquake/hazardlib/gsim/allen_2012_ipe.py "
          "(oq-engine HEAD 91db5142ba7905a33c94483fad8f8467b5d92d6f, read 2026-10-23)")

# Shallow mainland events (crustal, the IPE's domain) chosen from an FDSN query
# (1300 km around 15.5N 100.5E, M >= 5.0, DYFI product; see the log) — all M >= 5.5 with
# >= 15 DYFI responses, depth <= 40 km, epicentre east of 94.5E and north of 12N; plus the
# offshore subduction-zone events felt in Thailand, kept as a separate group (outside the
# IPE's tectonic domain).
CRUSTAL = ["us7000pn9s", "us7000pn9z", "usb000qack", "us70006ara", "us70006anm", "usp000hyfx",
           "usp000fc2v", "us6000lp06", "us7000hsg4", "us2000cifa", "us6000gdng", "us7000k9he",
           "usp000jvbq"]
OFFSHORE = ["usp000hdwb", "usp000h05x", "us6000qvpp", "us10007ghm"]


def ipe_rhypo(m, r):
    c = AWW12_RHYPO
    rm = c["m1"] + c["m2"] * np.exp(m - 5.0)
    f = c["c2"] * np.log(np.sqrt(r ** 2 + rm ** 2))
    f = f + np.where(r > 50.0, c["c4"] * np.log(np.maximum(r, 1e-9) / 50.0), 0.0)
    return c["c0"] + c["c1"] * m + f


def ipe_rrup(m, r):
    c = AWW12_RRUP
    return c["c0"] + c["c1"] * m + c["c2"] * np.log(np.sqrt(r ** 2 + (1.0 + c["c3"] * np.exp(m - 5.0)) ** 2))


def sigma(form, r):
    c = AWW12_RHYPO if form == "rhypo" else AWW12_RRUP
    return c["s1"] + c["s2"] / (1.0 + (r / c["s3"]) ** 2)


def read_cdi(txt):
    lines = [l for l in txt.splitlines() if l.strip() and not l.startswith("#")]
    rows = list(csv.reader(io.StringIO("\n".join(lines))))
    out = []
    for r in rows:
        try:
            out.append(dict(key=r[0], cdi=float(r[1]), nresp=int(r[2]), dist_usgs=float(r[3]),
                            lat=float(r[4]), lon=float(r[5]), suspect=r[6], city=r[8] if len(r) > 8 else ""))
        except (ValueError, IndexError):
            continue
    return out


def event(eid):
    d = json.loads(get("https://earthquake.usgs.gov/fdsnws/event/1/query", dict(eventid=eid, format="geojson")))
    p = d["properties"]
    lon, lat, dep = d["geometry"]["coordinates"]
    dy = p["products"]["dyfi"][0]["contents"]
    geo = read_cdi(get(dy["cdi_geo.txt"]["url"])) if "cdi_geo.txt" in dy else []
    zp = read_cdi(get(dy["cdi_zip.txt"]["url"])) if "cdi_zip.txt" in dy else []
    sub = None
    if "finite-fault" in p["products"]:
        ff = p["products"]["finite-fault"][0]["contents"]
        if "FFM.geojson" in ff:
            g = json.loads(get(ff["FFM.geojson"]["url"]))
            cen = np.array([np.array(f["geometry"]["coordinates"][0][:4]).mean(axis=0) for f in g["features"]])
            slip = np.array([f["properties"]["slip"] for f in g["features"]])
            sub = cen[slip >= 0.1 * slip.max()]
    return dict(id=eid, mag=p["mag"], magType=p["magType"], place=p["place"], time=p["time"],
                lon=lon, lat=lat, depth=dep, geo=geo, zip=zp, sub=sub)


def distances(ev, lat, lon):
    epi = haversine_km(ev["lat"], ev["lon"], lat, lon)
    rh = math.sqrt(epi ** 2 + ev["depth"] ** 2)
    if ev["sub"] is not None:
        s = ev["sub"]
        dh = np.array([haversine_km(lat, lon, b, a) for a, b in s[:, :2]])
        rr = float(np.min(np.sqrt(dh ** 2 + (s[:, 2] / 1000.0) ** 2)))
    else:
        rr = rh
    return epi, rh, rr


BANDS = [0, 50, 100, 200, 400, 700, 1000, 1600]


def summarize(df, label, col="res_rhypo"):
    out = {}
    L.w(f"\n## {label}: residual = DYFI CDI − predicted MMI ({col})")
    L.w(f"  {'band km':>10s} {'n':>5s} {'MAE':>6s} {'bias':>6s} {'n_resp':>7s}")
    for a, b in zip(BANDS[:-1], BANDS[1:]):
        dist = df["rrup"] if col == "res_rrup" else df["rhypo"]
        g = df[(dist >= a) & (dist < b)]
        if len(g) == 0:
            continue
        r = dict(n=int(len(g)), mae=float(g[col].abs().mean()), bias=float(g[col].mean()),
                 responses=int(g.nresp.sum()))
        out[f"{a}-{b}"] = r
        L.w(f"  {a:4d}–{b:<5d} {r['n']:5d} {r['mae']:6.2f} {r['bias']:+6.2f} {r['responses']:7d}")
    if len(df):
        r = dict(n=int(len(df)), mae=float(df[col].abs().mean()), bias=float(df[col].mean()),
                 responses=int(df.nresp.sum()))
        out["all"] = r
        L.w(f"  {'all':>10s} {r['n']:5d} {r['mae']:6.2f} {r['bias']:+6.2f} {r['responses']:7d}")
    return out


def wording(pred, lo3=3.0, lo5=5.0):
    return np.where(pred >= lo5, "felt clearly", np.where(pred >= lo3, "may be felt", "probably not felt"))


def main():
    L.w(f"IPE: {SOURCE}")
    q = json.loads(get("https://earthquake.usgs.gov/fdsnws/event/1/query",
                       dict(format="geojson", latitude=15.5, longitude=100.5, maxradiuskm=1300, minmagnitude=5.0,
                            starttime="2000-01-01", endtime="2026-10-23", producttype="dyfi", orderby="time")))
    L.w(f"FDSN query (1300 km around 15.5N 100.5E, M>=5, DYFI): {len(q['features'])} events")
    rows = []
    evmeta = {}
    for group, ids in (("crustal", CRUSTAL), ("offshore", OFFSHORE)):
        for eid in ids:
            ev = event(eid)
            evmeta[eid] = {k: ev[k] for k in ("mag", "magType", "place", "lon", "lat", "depth")}
            evmeta[eid]["group"] = group
            evmeta[eid]["finite_fault"] = ev["sub"] is not None
            L.w(f"{group:8s} {eid} M{ev['mag']} {ev['magType']} {ev['place'][:45]:45s} depth {ev['depth']:.0f} km "
                f"geo boxes {len(ev['geo'])} cities {len(ev['zip'])} finite fault {'yes' if ev['sub'] is not None else 'no'}")
            for kind, recs in (("geo10km", ev["geo"]), ("city", ev["zip"])):
                for r in recs:
                    epi, rh, rr = distances(ev, r["lat"], r["lon"])
                    country = r["key"].split("::")[-1] if kind == "city" and "::" in r["key"] else ""
                    rows.append(dict(event=eid, group=group, kind=kind, mag=ev["mag"], depth=ev["depth"], key=r["key"],
                                     city=r["city"], country=country, lat=r["lat"], lon=r["lon"], cdi=r["cdi"],
                                     nresp=r["nresp"], dist_usgs=r["dist_usgs"], epi=epi, rhypo=rh, rrup=rr))
    df = pd.DataFrame(rows)
    df["pred_rhypo"] = ipe_rhypo(df.mag.values, df.rhypo.values)
    df["pred_rrup"] = ipe_rrup(df.mag.values, df.rrup.values)
    df["res_rhypo"] = df.cdi - df.pred_rhypo
    df["res_rrup"] = df.cdi - df.pred_rrup
    df["sig_rhypo"] = sigma("rhypo", df.rhypo.values)
    dchk = (df.rhypo - df.dist_usgs).abs()
    L.w(f"\nCheck: our hypocentral distance vs DYFI's own column: median |diff| {dchk.median():.1f} km, "
        f"95th pct {dchk.quantile(0.95):.1f} km (n={len(df)})")
    df.to_csv(DATA / "e4_dyfi_residuals.csv", index=False, float_format="%.3f")

    res = {"ipe": {"name": "Allen, Wald & Worden (2012) active crust", "source": SOURCE,
                   "rhypo_form": AWW12_RHYPO, "rrup_form": AWW12_RRUP},
           "events": evmeta, "summaries": {}}
    cr = df[df.group == "crustal"]
    for kind in ("geo10km", "city"):
        for minresp in (1, 3):
            g = cr[(cr.kind == kind) & (cr.nresp >= minresp)]
            for col in ("res_rhypo", "res_rrup"):
                key = f"crustal|{kind}|nresp>={minresp}|{col}"
                res["summaries"][key] = summarize(g, key, col)
    th = cr[(cr.kind == "city") & (cr.country == "Thailand")]
    for col in ("res_rhypo", "res_rrup"):
        res["summaries"][f"crustal|city|Thailand|{col}"] = summarize(th, f"crustal events, cities in Thailand ({col})", col)
    off = df[(df.group == "offshore") & (df.kind == "city")]
    res["summaries"]["offshore|city|res_rhypo"] = summarize(off, "offshore subduction events, cities (outside the IPE's domain)")

    # per event, Thailand cities
    L.w("\n## Per event, cities in Thailand (rhypo form)")
    res["per_event_thailand"] = {}
    for eid, g in th.groupby("event"):
        r = dict(n=int(len(g)), responses=int(g.nresp.sum()), mae=float(g.res_rhypo.abs().mean()),
                 bias=float(g.res_rhypo.mean()), dist_range=[float(g.rhypo.min()), float(g.rhypo.max())])
        res["per_event_thailand"][eid] = r
        L.w(f"  {eid} M{evmeta[eid]['mag']}: n={r['n']:3d} cities, {r['responses']:5d} responses, R {r['dist_range'][0]:.0f}–"
            f"{r['dist_range'][1]:.0f} km, MAE {r['mae']:.2f}, bias {r['bias']:+.2f}")

    # Bangkok
    L.w("\n## Bangkok (soft clay basin) vs other Thai cities at similar distance, 2025-03-28 M7.7")
    bk = df[(df.event == "us7000pn9s")]
    bkc = bk[(bk.kind == "city") & bk.key.str.contains("Bangkok::Bangkok")]
    bkg = bk[(bk.kind == "geo10km") & (bk.city == "Bangkok")]
    for _, r in bkc.iterrows():
        L.w(f"  city {r.key}: CDI {r.cdi} ({r.nresp} responses), Rhyp {r.rhypo:.0f} km, Rrup {r.rrup:.0f} km, "
            f"predicted {r.pred_rhypo:.2f} (rhypo) / {r.pred_rrup:.2f} (rrup), residual {r.res_rhypo:+.2f} / {r.res_rrup:+.2f}")
    L.w(f"  Bangkok 10-km boxes: n={len(bkg)}, responses {bkg.nresp.sum()}, mean CDI {bkg.cdi.mean():.2f}, "
        f"mean residual {bkg.res_rhypo.mean():+.2f} (rhypo) {bkg.res_rrup.mean():+.2f} (rrup)")
    oth = bk[(bk.kind == "city") & (bk.country == "Thailand") & ~bk.key.str.contains("Bangkok::Bangkok")
             & (bk.rhypo.between(800, 1300))]
    L.w(f"  other Thai cities 800–1300 km: n={len(oth)}, responses {oth.nresp.sum()}, mean CDI {oth.cdi.mean():.2f}, "
        f"mean residual {oth.res_rhypo.mean():+.2f} (rhypo)  [single-response cities included; DYFI favours people who felt it]")
    res["bangkok_2025"] = dict(
        city=[dict(cdi=float(r.cdi), nresp=int(r.nresp), rhypo=float(r.rhypo), rrup=float(r.rrup),
                   pred_rhypo=float(r.pred_rhypo), pred_rrup=float(r.pred_rrup)) for _, r in bkc.iterrows()],
        boxes=dict(n=int(len(bkg)), responses=int(bkg.nresp.sum()), mean_cdi=float(bkg.cdi.mean()),
                   mean_res_rhypo=float(bkg.res_rhypo.mean()), mean_res_rrup=float(bkg.res_rrup.mean())),
        other_thai_800_1300=dict(n=int(len(oth)), mean_cdi=float(oth.cdi.mean()) if len(oth) else None,
                                 mean_res_rhypo=float(oth.res_rhypo.mean()) if len(oth) else None))

    # Bangkok basin term: chosen on the events before 2025, scored on the 2025 sequence
    L.w("\n## Bangkok-metro term (Bangkok, Nonthaburi, Samut Prakan, Pathum Thani cities): mean of per-event "
        "response-weighted residuals, fitted on crustal events before 2025, scored on the 2025 events")
    cth = df[(df.kind == "city") & (df.country == "Thailand") & (df.group == "crustal")].copy()
    cth["bkk"] = cth.key.str.contains("::Bangkok::|::Nonthaburi::|::Samut Prakan::|::Pathum Thani::")
    ev_year = {e: pd.Timestamp(int(json.loads(get("https://earthquake.usgs.gov/fdsnws/event/1/query",
                                                   dict(eventid=e, format="geojson")))["properties"]["time"]),
                               unit="ms").year for e in cth.event.unique()}
    cth["year"] = cth.event.map(ev_year)
    per_ev = {}
    for eid, g in cth[cth.bkk].groupby("event"):
        per_ev[eid] = dict(year=int(ev_year[eid]), n=int(len(g)), responses=int(g.nresp.sum()),
                           res_rhypo=float(np.average(g.res_rhypo, weights=g.nresp)),
                           res_rrup=float(np.average(g.res_rrup, weights=g.nresp)))
        L.w(f"  {eid} ({ev_year[eid]}) M{evmeta[eid]['mag']}: {per_ev[eid]['n']} cities, {per_ev[eid]['responses']} responses, "
            f"weighted residual {per_ev[eid]['res_rhypo']:+.2f} (rhypo) {per_ev[eid]['res_rrup']:+.2f} (rrup)")
    fit_ev = [e for e, v in per_ev.items() if v["year"] < 2025]
    test_ev = [e for e, v in per_ev.items() if v["year"] >= 2025]
    term = float(np.mean([per_ev[e]["res_rhypo"] for e in fit_ev]))
    rest = cth[~cth.bkk]
    rest_ev = rest[rest.year < 2025].groupby("event").apply(lambda g: np.average(g.res_rhypo, weights=g.nresp))
    L.w(f"  fitted on {len(fit_ev)} events before 2025: Bangkok-metro term = {term:+.2f} MMI "
        f"(rest of Thailand, same events: mean of per-event weighted residuals {rest_ev.mean():+.2f})")
    for e in test_ev:
        r0 = per_ev[e]["res_rhypo"]
        L.w(f"  test {e}: residual without the term {r0:+.2f}, with it {r0 - term:+.2f}")
    mae0 = float(np.mean([abs(per_ev[e]["res_rhypo"]) for e in test_ev]))
    mae1 = float(np.mean([abs(per_ev[e]["res_rhypo"] - term) for e in test_ev]))
    L.w(f"  2025 test ({len(test_ev)} events, one sequence — a very small sample): event-level |residual| "
        f"{mae0:.2f} → {mae1:.2f} MMI")
    res["bangkok_term"] = dict(value=term, fitted_on=fit_ev, tested_on=test_ev, per_event=per_ev,
                               test_mae_without=mae0, test_mae_with=mae1, rest_of_thailand_mean=float(rest_ev.mean()))
    df["bkk"] = df.key.str.contains("::Bangkok::|::Nonthaburi::|::Samut Prakan::|::Pathum Thani::") | \
        ((df.kind == "geo10km") & (df.city == "Bangkok"))
    df["pred_adj"] = df.pred_rhypo + np.where(df.bkk, term, 0.0)

    # What the reports said, by predicted intensity (Thai cities, crustal events)
    L.w("\n## Share of DYFI city reports at CDI ≥ III and ≥ V by predicted MMI (Thai cities, crustal events; "
        "DYFI over-represents people who felt it, so these shares are upper bounds of 'felt')")
    th2 = df[(df.kind == "city") & (df.country == "Thailand") & (df.group == "crustal")]
    res["by_predicted"] = {}
    for col in ("pred_rhypo", "pred_adj"):
        L.w(f"  predictor {col}:")
        edges = [-9, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 12]
        for a, b in zip(edges[:-1], edges[1:]):
            g = th2[(th2[col] >= a) & (th2[col] < b)]
            if len(g) == 0:
                continue
            r = dict(n=int(len(g)), responses=int(g.nresp.sum()), felt3=float((g.cdi >= 3).mean()),
                     felt3_w=float(np.average(g.cdi >= 3, weights=g.nresp)), felt5=float((g.cdi >= 5).mean()),
                     felt5_w=float(np.average(g.cdi >= 5, weights=g.nresp)))
            res["by_predicted"][f"{col}|{a}-{b}"] = r
            L.w(f"    {a:5.1f}–{b:<5.1f} cities {r['n']:3d} ({r['responses']:4d} resp): CDI≥III {100*r['felt3']:5.1f} % "
                f"(by response {100*r['felt3_w']:5.1f} %), CDI≥V {100*r['felt5']:5.1f} % (by response {100*r['felt5_w']:5.1f} %)")

    # Wording rule check on Thai cities (DYFI: people who reported; "not felt" is under-reported)
    L.w("\n## Wording rule on cities in Thailand, crustal events (pred = rhypo form)")
    res["wording"] = {}
    th = th.assign(pred_adj=th.pred_rhypo + np.where(
        th.key.str.contains("::Bangkok::|::Nonthaburi::|::Samut Prakan::|::Pathum Thani::"), term, 0.0))
    for pcol, lo3, lo5 in (("pred_rhypo", 3.0, 5.0), ("pred_rhypo", 2.5, 4.5), ("pred_rhypo", 3.5, 5.5),
                           ("pred_adj", 3.0, 5.0), ("pred_adj", 2.5, 4.5)):
        pw = wording(th[pcol].values, lo3, lo5)
        ow = wording(th.cdi.values, 3.0, 5.0)  # observed category on the same scale (III and V)
        tab = pd.crosstab(pd.Series(pw, name="predicted"), pd.Series(ow, name="observed CDI"))
        weights = th.nresp.values
        felt = th.cdi.values >= 3.0
        said_not = pw == "probably not felt"
        miss = int(np.sum(felt & said_not))
        miss_resp = int(np.sum(weights[felt & said_not]))
        clear_obs = th.cdi.values >= 5.0
        clear_pred = pw == "felt clearly"
        rec = dict(predictor=pcol, thresholds=[lo3, lo5], n=int(len(th)), felt_cities=int(felt.sum()),
                   felt_but_said_not=miss, felt_but_said_not_responses=miss_resp,
                   cdi_ge5_cities=int(clear_obs.sum()), cdi_ge5_said_clearly=int(np.sum(clear_obs & clear_pred)),
                   said_clearly=int(clear_pred.sum()), said_clearly_and_cdi_lt4=int(np.sum(clear_pred & (th.cdi.values < 4))),
                   table=tab.to_dict())
        res["wording"][f"{pcol}|III={lo3},V={lo5}"] = rec
        L.w(f"  [{pcol}{' = with the Bangkok term, in-sample for pre-2025 events' if pcol == 'pred_adj' else ''}] thresholds predicted ≥{lo3} 'อาจรู้สึกได้', ≥{lo5} 'รู้สึกได้ชัด': cities {rec['n']}, felt (CDI≥III) {rec['felt_cities']}, "
            f"felt but app would say 'probably not felt' {miss} ({miss_resp} responses); CDI≥V {rec['cdi_ge5_cities']}, of which "
            f"said 'clearly' {rec['cdi_ge5_said_clearly']}; said 'clearly' {rec['said_clearly']} (of which CDI<IV {rec['said_clearly_and_cdi_lt4']})")
        L.w("    " + tab.to_string().replace("\n", "\n    "))
    (OUT / "e4_results.json").write_text(json.dumps(res, indent=1, default=float))
    L.w(f"\nwrote {OUT / 'e4_results.json'} and {DATA / 'e4_dyfi_residuals.csv'} ({len(df)} rows)")


if __name__ == "__main__":
    main()

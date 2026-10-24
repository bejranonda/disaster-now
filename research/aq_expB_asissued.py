"""Experiment B, as issued: does the weather correction (damped_met, post-hoc in aq_expB.py) still help when the
target day's weather is a FORECAST, as the page would have it, instead of ERA5? (predict-air-2026-10-24.md §5)

Run:  <venv>/bin/python -I research/aq_expB_asissued.py     (after aq_data.py and aq_expB.py)
Writes research/logs/aq_expB_asissued-2026-10-24.log and research/out/aq_expB_asissued.json.

- Forecasts: Open-Meteo's previous-runs API, ECMWF IFS 0.25 (models=ecmwf_ifs025). For the target day d the
  "_previous_day2" values (the run about two days before each hour: for lead 2, issued at 00:00 of d-1, every hour
  of d comes from a run made before the issue); for the last observed day d-k the latest run's own values (its first
  hours, the closest thing to an analysis that the page could read). Lead 1 uses the same, older, forecast
  (conservative). Daily features as in aq_data.py: rain sum, mean 10-m and 100-m wind, mean humidity, mean surface
  pressure, temperature range.
- The correction is the one fitted in aq_expB.py on ERA5 (sample A, S1+S2), applied unchanged to forecast inputs.
- Test: sample B (disjoint stations), S4 (Dec 2025–Apr 2026, the newest season), leads 1 and 2; the same rows scored
  with ERA5 inputs (the perfect-prognosis upper bound) and with forecast inputs, against the damped ratio.
"""
from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import DATA, OUT, Log, clean, om_get, om_spent  # noqa: E402
from aq_rows import boot_stat, build_rows, climatology, load  # noqa: E402
import aq_expB as B  # noqa: E402

L = Log("aq_expB_asissued")
VARS = ["precipitation", "wind_speed_10m", "wind_speed_100m", "relative_humidity_2m", "surface_pressure", "temperature_2m"]


def forecasts(m, sids, a="2025-11-25", b="2026-04-30"):
    rows = []
    hv = ",".join(VARS + [v + "_previous_day2" for v in VARS])
    for sid in sids:
        s = m[sid]
        j = om_get("https://previous-runs-api.open-meteo.com/v1/forecast",
                   dict(latitude=round(s["lat"], 4), longitude=round(s["lon"], 4), hourly=hv, models="ecmwf_ifs025",
                        wind_speed_unit="ms", timezone="Asia/Bangkok", start_date=a, end_date=b),
                   f"aq_expB_asissued previous-runs {sid} S4")
        h = pd.DataFrame(j["hourly"])
        h["time"] = pd.to_datetime(h["time"])
        h["sid"] = sid
        rows.append(h)
    h = pd.concat(rows)
    h["date"] = h.time.dt.normalize()
    out = []
    for suf, tag in (("", "best"), ("_previous_day2", "p2")):
        g = h.groupby(["sid", "date"])
        n = g["temperature_2m" + suf].count()
        d = pd.DataFrame({
            f"{tag}_rain": g["precipitation" + suf].sum(min_count=18), f"{tag}_ws10": g["wind_speed_10m" + suf].mean(),
            f"{tag}_ws100": g["wind_speed_100m" + suf].mean(), f"{tag}_rh": g["relative_humidity_2m" + suf].mean(),
            f"{tag}_sp": g["surface_pressure" + suf].mean(),
            f"{tag}_dtr": g["temperature_2m" + suf].max() - g["temperature_2m" + suf].min()})
        d[n < 18] = np.nan
        out.append(d)
    return pd.concat(out, axis=1).reset_index()


def main():
    m = json.loads((DATA / "aq_stations.json").read_text())
    sidsB = [s for s, v in m.items() if v["sample"] == "B"]
    fc = forecasts(m, sidsB)
    L.w(f"forecast days: {len(fc)}; with day-2 forecasts {int(fc.p2_rain.notna().sum())}; "
        f"Open-Meteo weighted calls by this study: {om_spent():.1f}")

    d = load()
    # fit exactly as aq_expB.py does (ERA5, sample A, S1+S2)
    rows_fit = B.add_features(build_rows(d, climatology("2022-11-25")))
    A = rows_fit[(rows_fit["sample"] == "A") & rows_fit.season.isin(["S1", "S2"])]
    pars = {}
    for k in (1, 2):
        tr = A[A.lead == k].dropna(subset=B.needs("damped_met"))
        cv = {}
        for a in [0.1, 1, 10, 100, 1000]:
            err = []
            for s_fit, s_val in (("S1", "S2"), ("S2", "S1")):
                f_ = B.fit_model("damped_met", tr[tr.season == s_fit], a)
                v = tr[tr.season == s_val]
                err.append(np.mean(np.abs(B.predict("damped_met", f_, v) - v.obs.values)))
            cv[a] = float(np.mean(err))
        alpha = min(cv, key=cv.get)
        pars[k] = B.fit_model("damped_met", tr, alpha)
        L.w(f"lead {k}: damped_met refitted (alpha {alpha}), coefficients "
            + " ".join(f"{c}={v:+.3f}" for c, v in zip(pars[k][2], pars[k][0].coef_)))

    R = B.add_features(build_rows(d, climatology("2024-06-30")))
    R = R[(R["sample"] == "B") & (R.season == "S4")]
    res = {"protocol": __doc__, "tests": {}}
    for k in (1, 2):
        g = R[R.lead == k].copy()
        g["date_prev"] = g.date - pd.Timedelta(days=k)
        g = g.merge(fc[["sid", "date"] + [c for c in fc.columns if c.startswith("p2_")]], on=["sid", "date"], how="left")
        g = g.merge(fc[["sid", "date"] + [c for c in fc.columns if c.startswith("best_")]].rename(columns={"date": "date_prev"}),
                    on=["sid", "date_prev"], how="left")
        f = g.copy()
        f["rain"] = np.log1p(f.p2_rain)
        f["rain_prev"] = np.log1p(f.best_rain)
        f["d_ws"] = f.p2_ws10 - f.best_ws10
        f["d_ws100"] = f.p2_ws100 - f.best_ws100
        f["d_rh"] = f.p2_rh - f.best_rh
        f["d_sp"] = f.p2_sp - f.best_sp
        f["d_dtr"] = f.p2_dtr - f.best_dtr
        ok = f[B.MET].notna().all(axis=1) & g[B.MET].notna().all(axis=1)
        g, f = g[ok].reset_index(drop=True), f[ok].reset_index(drop=True)
        p_d = g.damped.values
        p_pp = B.predict("damped_met", pars[k], g)
        p_fc = B.predict("damped_met", pars[k], f)
        p_ps = g.persist.values
        o = g.obs.values
        rec = dict(n=int(len(g)))
        for name, p in (("persist", p_ps), ("damped", p_d), ("damped_met_era5", p_pp), ("damped_met_forecast", p_fc)):
            rec[name] = B.scores(o, p)
        for name, p in (("damped_met_era5", p_pp), ("damped_met_forecast", p_fc)):
            e1, e0 = np.abs(p - o), np.abs(p_d - o)
            rec[f"dMAE_{name}_vs_damped"] = boot_stat(lambda ii, e1=e1, e0=e0: float(np.mean(e1[ii] - e0[ii])), g)
            rec[f"stations_worse_{name}"] = B.station_worse(g, p, p_d)
        # how close are forecast and ERA5 features?
        rec["feature_corr_fc_vs_era5"] = {c: float(np.corrcoef(f[c], g[c])[0, 1]) for c in B.MET}
        res["tests"][f"B-S4 lead{k}"] = rec
        L.w(f"\n## B-S4 lead {k}: n={len(g)}")
        for name in ("persist", "damped", "damped_met_era5", "damped_met_forecast"):
            s = rec[name]
            L.w(f"   {name:20s} MAE={s['mae']:6.2f} bias={s['bias']:+6.2f} band={100*s['band']:4.1f}%")
        for name in ("damped_met_era5", "damped_met_forecast"):
            v = rec[f"dMAE_{name}_vs_damped"]
            L.w(f"   {name:20s} vs damped {v[0]:+5.2f} [{v[1]:+5.2f}, {v[2]:+5.2f}]; worse at {rec[f'stations_worse_{name}']}")
        L.w("   feature correlation forecast vs ERA5: " + ", ".join(f"{c} {v:.2f}" for c, v in rec["feature_corr_fc_vs_era5"].items()))
    (OUT / "aq_expB_asissued.json").write_text(json.dumps(clean(res), indent=1, default=str))
    L.w(f"wrote {OUT / 'aq_expB_asissued.json'}; Open-Meteo weighted calls by this study: {om_spent():.1f}")


if __name__ == "__main__":
    main()

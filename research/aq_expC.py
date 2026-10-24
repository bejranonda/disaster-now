"""Experiment C: PM10 and ozone. Do they reach unhealthy levels often enough to need a forecast, and is CAMS
(raw or damped) usable for them against persistence? (docs/research/predict-air-2026-10-24.md §6)

Run:  <venv>/bin/python -I research/aq_expC.py      (after aq_data.py)
Writes research/logs/aq_expC-2026-10-24.log and research/out/aq_expC_results.json.

1. PM10, frequency: Air4Thai's daily PM10 means at every station in the yearly sheets 2019–2026: the share of
   station-days above 120 µg/m³ (PCD AQI > 100, Table 2 of the 2023 notice), and how often PM10 > 120 came on a day
   when the same station's PM2.5 was 37.5 or less (i.e. PM10 alone would have raised the level).
2. PM10, forecast: at the study's stations with PM10 in S3–S4 (Dec 2024–Apr 2026): raw CAMS pm10, persistence and
   the damped ratio with PM2.5's betas, leads 1–2.
3. Ozone: Air4Thai's hourly history goes back only to late July 2026 (aq_probe), so only the wet season can be
   scored: three stations that measure O3 (13t Nonthaburi, 30t Rayong, 38t Mae Mo), 26 Jul–23 Oct 2026; the day's
   maximum 8-h mean (ppb) against CAMS ozone (µg/m³ / 1.96 ppb at 25 °C [conversion assumed]), raw, persistence and
   damped.
"""
from __future__ import annotations

import io
import json
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import OUT, Log, air4thai_ca, clean, get, om_get, om_spent  # noqa: E402
from aq_rows import BETA, load  # noqa: E402

L = Log("aq_expC")
O3_STATIONS = ["13t", "30t", "38t"]


def sheets(param):
    ca = air4thai_ca()
    out = []
    for y in range(2019, 2027):
        b = get(f"https://air4thai.net/daily_download/{param}/{y}.xlsx", verify=ca, binary=True)
        if b is None:
            continue
        x = pd.read_excel(io.BytesIO(b), header=0)
        x.columns = [str(c).strip().lower() for c in x.columns]
        x = x.rename(columns={x.columns[0]: "date"})
        x = x[pd.to_datetime(x["date"], errors="coerce").notna()].copy()
        x["date"] = pd.to_datetime(x["date"]).dt.normalize()
        m = x.melt(id_vars="date", var_name="sid", value_name="v")
        m["v"] = pd.to_numeric(m["v"], errors="coerce")
        out.append(m[m.v >= 0].dropna())
    return pd.concat(out).drop_duplicates(["sid", "date"])


def mae(p, o):
    return float(np.mean(np.abs(np.asarray(p) - np.asarray(o))))


def lead_rows(g, obs, cams, k):
    g = g.set_index("date").sort_index()
    g = g.reindex(pd.date_range(g.index.min(), g.index.max(), freq="D"))
    r = pd.DataFrame({"obs": g[obs], "cams": g[cams], "persist": g[obs].shift(k), "cams_prev": g[cams].shift(k)})
    r = r.dropna()
    r = r[r.persist > 0]
    r["damped"] = r.persist * (r.cams.clip(lower=0.5) / r.cams_prev.clip(lower=0.5)) ** BETA[k]
    return r


def main():
    res = {"protocol": __doc__}
    # ---- 1. frequency
    p10 = sheets("PM10").rename(columns={"v": "pm10"})
    p25 = sheets("PM2.5").rename(columns={"v": "pm25"})
    both = p10.merge(p25, on=["sid", "date"], how="left")
    both["month"] = both.date.dt.month
    L.w(f"## 1. PM10 daily means 2019–2026: {len(p10)} station-days at {p10.sid.nunique()} stations")
    tot = (both.pm10 > 120).mean()
    hz = both[both.month.isin([12, 1, 2, 3, 4])]
    L.w(f"  share of station-days with PM10 > 120 (AQI > 100): all months {100*tot:.2f} %, Dec–Apr {100*(hz.pm10>120).mean():.2f} %, "
        f"> 180 (AQI > 200): {100*(both.pm10>180).mean():.2f} %")
    st = both.groupby("sid").agg(n=("pm10", "size"), d120=("pm10", lambda v: int((v > 120).sum())))
    st["share"] = st.d120 / st.n
    L.w("  stations with the most PM10 > 120 days: " + ", ".join(f"{s} {r.d120} of {r.n} ({100*r.share:.1f} %)"
                                                                for s, r in st.sort_values("share", ascending=False).head(8).iterrows()))
    bb = both.dropna(subset=["pm25"])
    ex = bb[bb.pm10 > 120]
    alone = ex[ex.pm25 <= 37.5]
    L.w(f"  days with PM10 > 120 and a PM2.5 value at the same station: {len(ex)}; of these PM2.5 <= 37.5 (PM10 alone "
        f"would raise the level): {len(alone)} ({100*len(alone)/max(len(ex),1):.1f} %); PM2.5 > 75 on {int((ex.pm25>75).sum())}")
    L.w(f"  for comparison PM2.5 > 37.5 on {100*(bb.pm25>37.5).mean():.1f} % of the same station-days")
    L.w("  where PM10 alone was above 120: " + ", ".join(f"{k} {v}" for k, v in alone.sid.value_counts().head(8).items())
        + f"; months {alone.month.value_counts().sort_index().to_dict()}")
    res["pm10_frequency"] = dict(station_days=int(len(p10)), stations=int(p10.sid.nunique()), share_gt120=float(tot),
                                 share_gt120_DecApr=float((hz.pm10 > 120).mean()), share_gt180=float((both.pm10 > 180).mean()),
                                 exceed_with_pm25=int(len(ex)), exceed_pm25_le_37_5=int(len(alone)),
                                 pm25_gt_37_5_share_same_days=float((bb.pm25 > 37.5).mean()))

    # ---- 2. PM10 forecast at the study stations
    d = load()
    d = d[d.season.isin(["S3", "S4"])]
    L.w("\n## 2. PM10 forecast, S3–S4 (Dec 2024–Apr 2026), study stations with PM10")
    res["pm10_forecast"] = {}
    for k in (1, 2):
        rows = []
        for sid, g in d.groupby("sid"):
            r = lead_rows(g, "obs_pm10", "cams_pm10", k)
            r = r[r.index.month.isin([12, 1, 2, 3, 4])]
            r["sid"] = sid
            rows.append(r)
        r = pd.concat(rows)
        if len(r) < 30:
            continue
        o = r.obs.values
        rec = dict(n=int(len(r)), stations=sorted(r.sid.unique().tolist()), events_gt120=int((o > 120).sum()),
                   mae={m: mae(r[m], o) for m in ("cams", "persist", "damped")},
                   bias={m: float(np.mean(r[m] - o)) for m in ("cams", "persist", "damped")})
        for m in ("cams", "persist", "damped"):
            f = r[m].values > 120
            h, mi, fa = int((f & (o > 120)).sum()), int((~f & (o > 120)).sum()), int((f & (o <= 120)).sum())
            rec[f"gt120_{m}"] = dict(hits=h, misses=mi, false_alarms=fa)
        res["pm10_forecast"][f"lead{k}"] = rec
        L.w(f"  lead {k}: n={rec['n']} at {rec['stations']}; obs > 120 on {rec['events_gt120']} days")
        L.w("    MAE " + " ".join(f"{m}={v:.2f}" for m, v in rec["mae"].items()) + " | bias "
            + " ".join(f"{m}={v:+.2f}" for m, v in rec["bias"].items()))
        L.w("    > 120: " + "; ".join(f"{m} hits {rec[f'gt120_{m}']['hits']} misses {rec[f'gt120_{m}']['misses']} "
                                      f"false alarms {rec[f'gt120_{m}']['false_alarms']}" for m in ("cams", "persist", "damped")))

    # ---- 3. ozone, wet season only
    L.w("\n## 3. Ozone, 26 Jul–23 Oct 2026 (wet season only: the hourly history starts late July)")
    ca = air4thai_ca()
    meta = {s["stationID"].lower(): s for s in json.loads(get("https://air4thai.pcd.go.th/services/getNewAQI_JSON.php", verify=ca))["stations"]}
    obs = []
    for a, b in (("2026-07-26", "2026-08-31"), ("2026-09-01", "2026-09-30"), ("2026-10-01", "2026-10-23")):
        txt = get("https://air4thai.com/forweb/getHistoryData.php",
                  dict(stationID=",".join(O3_STATIONS), param="O3", type="hr", sdate=a, edate=b, stime="00", etime="23"),
                  verify=ca)
        for s in json.loads(txt)["stations"]:
            for r in s["data"]:
                obs.append((s["stationID"].lower(), r["DATETIMEDATA"], r.get("O3")))
    h = pd.DataFrame(obs, columns=["sid", "time", "o3"])
    h["time"] = pd.to_datetime(h.time)
    h["o3"] = pd.to_numeric(h.o3, errors="coerce")
    h = h[h.o3 >= 0].dropna().drop_duplicates(["sid", "time"])
    L.w(f"  Air4Thai hourly O3 rows {len(h)} at {sorted(h.sid.unique())}")
    cams = []
    for sid in O3_STATIONS:
        s = meta[sid]
        j = om_get("https://air-quality-api.open-meteo.com/v1/air-quality",
                   dict(latitude=round(float(s["lat"]), 4), longitude=round(float(s["long"]), 4), hourly="ozone",
                        domains="cams_global", timezone="Asia/Bangkok", start_date="2026-07-26", end_date="2026-10-23"),
                   f"aq_expC CAMS ozone {sid}")
        c = pd.DataFrame({"time": pd.to_datetime(j["hourly"]["time"]), "cams": j["hourly"]["ozone"]})
        c["sid"] = sid
        cams.append(c)
    c = pd.concat(cams)
    c["cams"] = pd.to_numeric(c.cams, errors="coerce") / 1.96
    hh = h.merge(c, on=["sid", "time"], how="outer").sort_values(["sid", "time"])
    daily = []
    for sid, g in hh.groupby("sid"):
        g = g.set_index("time").reindex(pd.date_range(g.time.min(), g.time.max(), freq="h"))
        o8 = g.o3.rolling(8, min_periods=6).mean()
        c8 = g.cams.rolling(8, min_periods=6).mean()
        dd = pd.DataFrame({"o3_8h": o8, "cams_8h": c8})
        dd["date"] = dd.index.normalize()
        dm = dd.groupby("date").agg(o3=("o3_8h", "max"), cams=("cams_8h", "max"), n=("o3_8h", "count")).reset_index()
        dm = dm[dm.n >= 18]
        dm["sid"] = sid
        daily.append(dm)
    od = pd.concat(daily)
    L.w(f"  station-days with a max 8-h O3: {len(od)}; max observed {od.o3.max():.0f} ppb; days > 70 ppb: {int((od.o3>70).sum())}; "
        f"> 50 ppb: {int((od.o3>50).sum())}")
    L.w("  days > 70 ppb: " + "; ".join(f"{r.sid} {r.date.date()} {r.o3:.0f} ppb (CAMS {r.cams:.0f})"
                                        for r in od[od.o3 > 70].itertuples()))
    res["ozone"] = dict(station_days=int(len(od)), max_obs_ppb=float(od.o3.max()), days_gt70=int((od.o3 > 70).sum()),
                        days_gt50=int((od.o3 > 50).sum()))
    for k in (1, 2):
        rows = []
        for sid, g in od.groupby("sid"):
            r = lead_rows(g, "o3", "cams", k)
            r["sid"] = sid
            rows.append(r)
        r = pd.concat(rows)
        o = r.obs.values
        rec = dict(n=int(len(r)), mae={m: mae(r[m], o) for m in ("cams", "persist", "damped")},
                   bias={m: float(np.mean(r[m] - o)) for m in ("cams", "persist", "damped")},
                   corr_cams_obs=float(np.corrcoef(r.cams, o)[0, 1]))
        res["ozone"][f"lead{k}"] = rec
        L.w(f"  lead {k}: n={rec['n']} MAE " + " ".join(f"{m}={v:.1f}" for m, v in rec["mae"].items()) + " ppb | bias "
            + " ".join(f"{m}={v:+.1f}" for m, v in rec["bias"].items()) + f" | corr(CAMS, obs) {rec['corr_cams_obs']:.2f}")
    (OUT / "aq_expC_results.json").write_text(json.dumps(clean(res), indent=1, default=str))
    L.w(f"wrote {OUT / 'aq_expC_results.json'}; Open-Meteo weighted calls by this study: {om_spent():.1f}")


if __name__ == "__main__":
    main()

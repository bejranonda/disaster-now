"""Experiment A: does fire weather (Canadian FWI from ERA5 noon weather) predict high-hotspot days in northern Thailand
better than climatology (day of season) and persistence (yesterday's count)?  Hazards research, 2026-10-24.

Data
  weather   ERA5 hourly via Open-Meteo's archive API (research/hz_fire_fetch.py), 10 points, 1 Dec - 30 Apr of
            the 2020-2025 seasons; noon (12:00 Bangkok) T, RH, 10 m wind, 24-h rain ending at noon -> FWI system
            (research/hz_fwi.py), started each 1 Dec at FFMC 85 / DMC 6 / DC 15.
  hotspots  NASA FIRMS VIIRS S-NPP 375 m yearly archive for Thailand (research/hz_fetch_firms.py), type 0
            (presumed vegetation fire), low confidence left out (as the page's collector does); counted within
            25 km of the point per Bangkok calendar day (day and night passes).
Event      a "high-hotspot day": >= 10 detections within 25 km (fixed before any result was seen; 1 and 30 as
           sensitivity).  Scored days 15 Jan - 30 Apr.
Protocol   (GUIDELINES s7) fit and choose on sample A points, seasons 2020-2022; score on A 2023-2025 (later
           years); confirm on sample B points 2023-2025 (disjoint points and years) and B 2020-2022 (disjoint
           points).  Baselines: climatology = the point's own frequency by day of season in 2020-2022 (+-15 days);
           persistence = logistic on log(1 + yesterday's count).  Models add FWI or one of its codes.
           Moving-block bootstrap (7-day blocks within point-seasons, 2,000 draws) for Brier differences.
Caveat     ERA5 is analysed weather: the FWI here is "perfect forecast" FWI, an upper bound for a forecast FWI.
           Clouds hide fires from VIIRS on wet days, which flatters any rain-sensitive index.
Run: python -I research/hz_fire.py   -> research/logs/hz_fire-2026-10-24.log, research/out/hz_fire.json,
     research/data/hz_fire_daily.csv.gz
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import hz_fwi  # noqa: E402
from hz_fire_fetch import POINTS, SEASONS, fetch  # noqa: E402
from hz_openmeteo import HZ  # noqa: E402

LOGF = HERE / "logs" / "hz_fire-2026-10-24.log"
OUTF = HERE / "out" / "hz_fire.json"
DAILY = HERE / "data" / "hz_fire_daily.csv.gz"
K_MAIN, K_ALT = 10, (1, 30)
RADIUS = 25.0
TRAIN, TEST = [2020, 2021, 2022], [2023, 2024, 2025]
_lines = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    _lines.append(s)


def hav_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi, dl = p2 - p1, np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def weather():
    rows = []
    for name, (lat, lon, smp) in POINTS.items():
        for y in SEASONS:
            js = fetch(name, y)  # cached
            h = pd.DataFrame(js["hourly"])
            h["time"] = pd.to_datetime(h["time"])
            h = h.set_index("time")
            # rain in the 24 h ending at noon: hourly values are the preceding hour's sum, so hours 13:00 (D-1) .. 12:00 (D)
            r24 = h["precipitation"].rolling(24).sum()
            noon = h[h.index.hour == 12].copy()
            noon["rain24"] = r24.reindex(noon.index)
            noon["rain24"] = noon["rain24"].fillna(h["precipitation"].groupby(h.index.date).transform("sum").reindex(noon.index))
            noon["date"] = noon.index.normalize()
            days = [(d.month, t, rh, w, r) for d, t, rh, w, r in zip(noon.date, noon.temperature_2m, noon.relative_humidity_2m,
                                                                        noon.wind_speed_10m, noon.rain24)]
            codes = pd.DataFrame(hz_fwi.series(days, lat), index=noon.index)
            z = pd.concat([noon[["date", "temperature_2m", "relative_humidity_2m", "wind_speed_10m", "rain24",
                                 "vapour_pressure_deficit", "soil_moisture_0_to_7cm"]], codes], axis=1)
            z["point"], z["sample"], z["season"] = name, smp, y
            # days since >= 2 mm in 24 h (a simple dryness count)
            wet = (z.rain24 >= 2.0).values
            ds, c = [], 60
            for wv in wet:
                c = 0 if wv else c + 1
                ds.append(c)
            z["dry_days"] = ds
            rows.append(z.reset_index(drop=True))
    return pd.concat(rows, ignore_index=True)


def hotspots():
    fr = []
    for y in range(2019, 2026):
        f = HZ / "firms" / f"viirs-snpp_{y}_Thailand.csv"
        d = pd.read_csv(f, usecols=["latitude", "longitude", "acq_date", "acq_time", "confidence", "type", "daynight"])
        fr.append(d)
    d = pd.concat(fr, ignore_index=True)
    n0 = len(d)
    d = d[(d.type == 0) & (d.confidence != "l")]
    t = pd.to_datetime(d.acq_date) + pd.to_timedelta(d.acq_time.astype(int) // 100, unit="h") \
        + pd.to_timedelta(d.acq_time.astype(int) % 100, unit="m")
    d = d.assign(ldate=(t + pd.Timedelta(hours=7)).dt.normalize())
    log(f"FIRMS VIIRS S-NPP Thailand 2019-2025: {n0} rows, {len(d)} kept (type 0, confidence n/h)")
    out = []
    for name, (lat, lon, _) in POINTS.items():
        km = hav_km(lat, lon, d.latitude.values, d.longitude.values)
        sel = d[km <= RADIUS]
        c = sel.groupby("ldate").size().rename("count")
        c = c.to_frame()
        c["point"] = name
        out.append(c.reset_index())
    return pd.concat(out, ignore_index=True).rename(columns={"ldate": "date"})


def brier(o, p):
    return float(np.mean((p - o) ** 2))


def scores(o, p, clim):
    o, p, clim = np.asarray(o, float), np.asarray(p, float), np.asarray(clim, float)
    bs, bc = brier(o, p), brier(o, clim)
    auc = roc_auc_score(o, p) if 0 < o.sum() < len(o) else float("nan")
    return dict(n=int(len(o)), events=int(o.sum()), brier=round(bs, 4), bss_vs_clim=round(1 - bs / bc, 3), auc=round(auc, 3))


def cat(o, f):
    o, f = np.asarray(o, bool), np.asarray(f, bool)
    a, b, c = int((o & f).sum()), int((~o & f).sum()), int((o & ~f).sum())
    pod = a / (a + c) if a + c else float("nan")
    far = b / (a + b) if a + b else float("nan")
    csi = a / (a + b + c) if a + b + c else float("nan")
    return dict(hits=a, false_alarms=b, misses=c, pod=round(pod, 3), far=round(far, 3), csi=round(csi, 3))


def block_boot(df, col_a, col_b, nb=2000, block=7, seed=7):
    """Brier(a) - Brier(b) with 7-day blocks inside each point-season; returns (diff, lo95, hi95)."""
    rng = np.random.default_rng(seed)
    blocks = []
    for _, g in df.sort_values("date").groupby(["point", "season"]):
        e = ((g[col_a] - g.o) ** 2 - (g[col_b] - g.o) ** 2).values
        for k in range(0, len(e), block):
            blocks.append(e[k:k + block])
    sums = np.array([b.sum() for b in blocks])
    lens = np.array([len(b) for b in blocks])
    diffs = []
    for _ in range(nb):
        ix = rng.integers(0, len(blocks), len(blocks))
        diffs.append(sums[ix].sum() / lens[ix].sum())
    return float(sums.sum() / lens.sum()), float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))


def main():
    log(f"===== hz_fire run {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ}")
    w = weather()
    hs = hotspots()
    df = w.merge(hs, on=["date", "point"], how="left")
    df["count"] = df["count"].fillna(0).astype(int)
    df = df.sort_values(["point", "date"])
    df["yday"] = df.groupby("point")["count"].shift(1)
    for L_ in (1, 2, 3):
        df[f"lag{L_}"] = df.groupby("point")["count"].shift(L_)
    df["rain_prev"] = df.groupby("point")["rain24"].shift(1)
    df["doy"] = (df.date - pd.to_datetime((df.season - 1).astype(str) + "-12-01")).dt.days  # day of season, 0 = 1 Dec
    df["lag_fwi"] = df.groupby(["point", "season"]).fwi.shift(1)
    DAILY.parent.mkdir(exist_ok=True)
    df.to_csv(DAILY, index=False, float_format="%.3f", compression="gzip")
    sc = df[(df.date.dt.month.isin([1, 2, 3, 4])) & ~((df.date.dt.month == 1) & (df.date.dt.day < 15))].copy()
    sc = sc.dropna(subset=["yday"])
    log(f"scored point-days (15 Jan - 30 Apr): {len(sc)}; seasons {SEASONS}; points A {[p for p, v in POINTS.items() if v[2] == 'A']}, "
        f"B {[p for p, v in POINTS.items() if v[2] == 'B']}")

    # descriptive
    log("\nHotspots within 25 km per scored day, by season (all 10 points):")
    for y, g in sc.groupby("season"):
        log(f"  {y}: mean {g['count'].mean():5.2f}  days >=1 {np.mean(g['count'] >= 1):.2f}  >=10 {np.mean(g['count'] >= 10):.3f}"
            f"  >=30 {np.mean(g['count'] >= 30):.3f}  max {g['count'].max():4d}   FWI mean {g.fwi.mean():5.1f}  FFMC {g.ffmc.mean():5.1f}  DC {g.dc.mean():5.0f}")
    log("By point (all seasons): mean count, share of days >= 10, mean FWI")
    for p, g in sc.groupby("point"):
        log(f"  {p:11s} {POINTS[p][2]}  {g['count'].mean():6.2f}  {np.mean(g['count'] >= 10):.3f}  FWI {g.fwi.mean():5.1f}")
    log("By month (all): mean count, share >= 10, mean FWI, mean FFMC, mean DC")
    for m, g in sc.groupby(sc.date.dt.month):
        log(f"  month {m}: {g['count'].mean():6.2f}  {np.mean(g['count'] >= 10):.3f}  FWI {g.fwi.mean():5.1f}  FFMC {g.ffmc.mean():5.1f}  DC {g.dc.mean():5.0f}")

    res = {"n_scored": int(len(sc)), "radius_km": RADIUS, "by_threshold": {}}
    feats_all = ["fwi", "ffmc", "dmc", "dc", "isi", "bui", "relative_humidity_2m", "vapour_pressure_deficit", "dry_days",
                 "soil_moisture_0_to_7cm", "rain24"]
    for K in (K_MAIN,) + K_ALT:
        log(f"\n================ event: >= {K} hotspots within 25 km ================")
        sc["o"] = (sc["count"] >= K).astype(int)
        # climatology per point from TRAIN seasons, by day of season, +-15 days
        tr_all = sc[sc.season.isin(TRAIN)]
        clim_tab = {}
        for p, g in tr_all.groupby("point"):
            fr = g.groupby("doy").o.mean()
            rows = {}
            for dd in range(0, 160):
                win = fr[(fr.index >= dd - 15) & (fr.index <= dd + 15)]
                rows[dd] = win.mean() if len(win) else np.nan
            clim_tab[p] = rows
        sc["clim"] = [clim_tab[p].get(d, np.nan) for p, d in zip(sc.point, sc.doy)]
        sc["clim"] = sc["clim"].clip(0.005, 0.995).fillna(sc.o.mean())
        sc["clim_logit"] = np.log(sc.clim / (1 - sc.clim))
        sc["lyday"] = np.log1p(sc.yday)
        train = sc[(sc["sample"] == "A") & sc.season.isin(TRAIN)]
        sets = {"A later years (2023-25)": sc[(sc["sample"] == "A") & sc.season.isin(TEST)],
                "B disjoint points, later years (2023-25)": sc[(sc["sample"] == "B") & sc.season.isin(TEST)],
                "B disjoint points, same years (2020-22)": sc[(sc["sample"] == "B") & sc.season.isin(TRAIN)]}
        log(f"train (A, 2020-22): n {len(train)}, events {int(train.o.sum())} ({train.o.mean():.3f})")
        if train.o.sum() < 20:
            log("  too few events to fit; skipped")
            continue
        # choose the single best weather feature on the training set (added to climatology + persistence)
        choose = {}
        for f in feats_all:
            X = train[["clim_logit", "lyday", f]].values
            m = LogisticRegression(C=1e3, max_iter=2000).fit(X, train.o)
            choose[f] = brier(train.o.values, m.predict_proba(X)[:, 1])
        base_m = LogisticRegression(C=1e3, max_iter=2000).fit(train[["clim_logit", "lyday"]].values, train.o)
        base_b = brier(train.o.values, base_m.predict_proba(train[["clim_logit", "lyday"]].values)[:, 1])
        best = min(choose, key=choose.get)
        log("  training Brier, climatology + persistence: " + f"{base_b:.4f}; adding one weather feature: "
            + ", ".join(f"{k} {v:.4f}" for k, v in sorted(choose.items(), key=lambda kv: kv[1])))
        log(f"  chosen on training: {best} (FWI kept as the pre-registered candidate too)")
        models = {
            "persistence": ["lyday"],
            "clim+persistence": ["clim_logit", "lyday"],
            "clim+FWI": ["clim_logit", "fwi"],
            "clim+persistence+FWI": ["clim_logit", "lyday", "fwi"],
            f"clim+persistence+{best}": ["clim_logit", "lyday", best],
            "clim+persistence+FWI(yesterday's weather)": ["clim_logit", "lyday", "lag_fwi"],
        }
        fitted = {}
        for name, cols in models.items():
            t2 = train.dropna(subset=cols)
            fitted[name] = (cols, LogisticRegression(C=1e3, max_iter=2000).fit(t2[cols].values, t2.o))
            log(f"  fit {name}: coef {np.round(fitted[name][1].coef_[0], 3).tolist()} intercept {fitted[name][1].intercept_[0]:.3f}")
        # yes/no rule for the page: FWI >= X, X chosen on training to maximise CSI (alone), for "weather favours fire"
        xs = np.arange(2, 60, 1.0)
        csis = [cat(train.o, train.fwi >= x)["csi"] for x in xs]
        xbest = float(xs[int(np.nanargmax(csis))])
        log(f"  FWI yes/no threshold chosen on training (max CSI): {xbest}")
        kres = {"train": {"n": int(len(train)), "events": int(train.o.sum()), "chosen_feature": best, "fwi_threshold": xbest},
                "sets": {}}
        for sname, s in sets.items():
            s = s.dropna(subset=["lag_fwi"]).copy()
            log(f"\n  -- {sname}: n {len(s)}, events {int(s.o.sum())} ({s.o.mean():.3f})")
            r = {"climatology": scores(s.o, s.clim, s.clim)}
            for name, (cols, m) in fitted.items():
                s[name] = m.predict_proba(s[cols].values)[:, 1]
                r[name] = scores(s.o, s[name], s.clim)
            for name, v in r.items():
                log(f"     {name:44s} Brier {v['brier']:.4f}  BSS vs clim {v['bss_vs_clim']:+.3f}  AUC {v['auc']:.3f}")
            dfb, lo, hi = block_boot(s, "clim+persistence+FWI", "clim+persistence")
            log(f"     Brier(clim+pers+FWI) - Brier(clim+pers) = {dfb:+.5f}  [95% {lo:+.5f}, {hi:+.5f}] (negative = FWI helps)")
            r["fwi_gain_boot"] = dict(diff=round(dfb, 5), lo95=round(lo, 5), hi95=round(hi, 5))
            dfb2, lo2, hi2 = block_boot(s, "clim+FWI", "clim")
            log(f"     Brier(clim+FWI) - Brier(clim) = {dfb2:+.5f}  [95% {lo2:+.5f}, {hi2:+.5f}]")
            r["fwi_vs_clim_boot"] = dict(diff=round(dfb2, 5), lo95=round(lo2, 5), hi95=round(hi2, 5))
            # the page's would-be line: FWI >= X
            yes = s.fwi >= xbest
            c = cat(s.o, yes)
            p_yes, p_no = float(s.o[yes].mean()) if yes.any() else float("nan"), float(s.o[~yes].mean()) if (~yes).any() else float("nan")
            log(f"     rule FWI >= {xbest:g}: says yes on {yes.mean():.2f} of days; P(event | yes) {p_yes:.3f}, P(event | no) {p_no:.3f}; "
                f"POD {c['pod']} FAR {c['far']} CSI {c['csi']}")
            for x_ext in (21.3, 38.0):  # EFFIS class edges ("high", "very high"): external, not chosen on these data
                y2 = s.fwi >= x_ext
                c2 = cat(s.o, y2)
                log(f"     rule FWI >= {x_ext:g} (EFFIS edge): yes on {y2.mean():.2f} of days; P(event | yes) {s.o[y2].mean():.3f}, "
                    f"P(event | no) {s.o[~y2].mean():.3f}; POD {c2['pod']} FAR {c2['far']} CSI {c2['csi']}")
                r[f"rule_fwi_{x_ext:g}"] = dict(share_yes=round(float(y2.mean()), 3), p_event_yes=round(float(s.o[y2].mean()), 3),
                                               p_event_no=round(float(s.o[~y2].mean()), 3), **c2)
            for col, x_as in (("ffmc", 82.0), ("fwi", 13.0)):  # ASEAN FDRS "red" class (MetMalaysia), external cut points
                y3 = s[col] > x_as
                c3 = cat(s.o, y3)
                log(f"     rule {col.upper()} > {x_as:g} (ASEAN FDRS red): yes on {y3.mean():.2f} of days; P(event | yes) {s.o[y3].mean():.3f}, "
                    f"P(event | no) {s.o[~y3].mean() if (~y3).any() else float('nan'):.3f}; POD {c3['pod']} FAR {c3['far']}")
                r[f"rule_asean_{col}"] = dict(share_yes=round(float(y3.mean()), 3), p_event_yes=round(float(s.o[y3].mean()), 3),
                                             p_event_no=round(float(s.o[~y3].mean()), 3) if (~y3).any() else None, **c3)
            pers = cat(s.o, s.yday >= K)
            log(f"     persistence yes/no (yesterday >= {K}): POD {pers['pod']} FAR {pers['far']} CSI {pers['csi']}")
            r["rule_fwi"] = dict(threshold=xbest, share_yes=round(float(yes.mean()), 3), p_event_yes=round(p_yes, 3),
                                 p_event_no=round(p_no, 3), **c)
            r["rule_persistence"] = pers
            # reliability of clim+persistence+FWI
            bins = [0, 0.05, 0.1, 0.2, 0.4, 0.6, 1.01]
            rel = []
            for a, b in zip(bins[:-1], bins[1:]):
                mm = (s["clim+persistence+FWI"] >= a) & (s["clim+persistence+FWI"] < b)
                if mm.sum():
                    rel.append(dict(bin=f"{a:.2f}-{min(b, 1):.2f}", n=int(mm.sum()), forecast=round(float(s.loc[mm, 'clim+persistence+FWI'].mean()), 3),
                                    observed=round(float(s.o[mm].mean()), 3)))
            log("     reliability (clim+pers+FWI): " + "; ".join(f"{x['bin']}: n {x['n']}, fc {x['forecast']}, obs {x['observed']}" for x in rel))
            r["reliability_cpf"] = rel
            kres["sets"][sname] = r
        if K == K_MAIN:
            # Added after the first run (no parameter is chosen on test data): (1) lead time - the latest count the
            # page could know is L days old (L = 1, 2, 3) while FWI is that of the target day (a perfect forecast);
            # (2) the cloud check - only days with < 0.5 mm in the 24 h to noon on the day and the day before.
            kres["lead"] = {}
            for L_ in (1, 2, 3):
                sc[f"llag{L_}"] = np.log1p(sc[f"lag{L_}"])
            train = sc[(sc["sample"] == "A") & sc.season.isin(TRAIN)]
            sets = {"A later years (2023-25)": sc[(sc["sample"] == "A") & sc.season.isin(TEST)],
                    "B disjoint points, later years (2023-25)": sc[(sc["sample"] == "B") & sc.season.isin(TEST)]}
            for tag, filt in (("all days", lambda x: x.index == x.index),
                              ("dry days only (cloud check)", lambda x: (x.rain24 < 0.5) & (x.rain_prev < 0.5))):
                for L_ in (1, 2, 3):
                    c0, c1 = ["clim_logit", f"llag{L_}"], ["clim_logit", f"llag{L_}", "fwi"]
                    tr = train[filt(train)].dropna(subset=c0 + ["fwi"])
                    m0 = LogisticRegression(C=1e3, max_iter=2000).fit(tr[c0].values, tr.o)
                    m1 = LogisticRegression(C=1e3, max_iter=2000).fit(tr[c1].values, tr.o)
                    for sname in ("A later years (2023-25)", "B disjoint points, later years (2023-25)"):
                        s = sets[sname]
                        s = s[filt(s)].dropna(subset=c0 + ["fwi"]).copy()
                        s["p0"], s["p1"] = m0.predict_proba(s[c0].values)[:, 1], m1.predict_proba(s[c1].values)[:, 1]
                        r0, r1 = scores(s.o, s.p0, s.clim), scores(s.o, s.p1, s.clim)
                        d_, lo_, hi_ = block_boot(s, "p1", "p0")
                        log(f"  [{tag}] lead {L_} d, {sname}: n {r0['n']}, events {r0['events']}; BSS clim+count(D-{L_}) {r0['bss_vs_clim']:+.3f}"
                            f" -> +FWI(D) {r1['bss_vs_clim']:+.3f}; AUC {r0['auc']:.3f} -> {r1['auc']:.3f}; dBrier {d_:+.5f} [{lo_:+.5f}, {hi_:+.5f}]")
                        kres["lead"][f"{tag}|{L_}|{sname}"] = dict(n=r0["n"], events=r0["events"], bss_count=r0["bss_vs_clim"],
                                                                  bss_count_fwi=r1["bss_vs_clim"], auc_count=r0["auc"], auc_count_fwi=r1["auc"],
                                                                  dbrier=round(d_, 5), lo95=round(lo_, 5), hi95=round(hi_, 5))
            # the cloud check for FWI against climatology alone (no count known)
            dry = lambda x: (x.rain24 < 0.5) & (x.rain_prev < 0.5)  # noqa: E731
            trd = train[dry(train)]
            mcf = LogisticRegression(C=1e3, max_iter=2000).fit(trd[["clim_logit", "fwi"]].values, trd.o)
            for sname, s in sets.items():
                s = s[dry(s)].copy()
                s["pcf"] = mcf.predict_proba(s[["clim_logit", "fwi"]].values)[:, 1]
                r0, r1 = scores(s.o, s.clim, s.clim), scores(s.o, s.pcf, s.clim)
                d_, lo_, hi_ = block_boot(s, "pcf", "clim")
                q = s.fwi.quantile([0.33, 0.67]).values
                rl, rh = s.o[s.fwi < q[0]].mean(), s.o[s.fwi >= q[1]].mean()
                log(f"  [dry days only (cloud check)] {sname}: clim+FWI BSS vs clim {r1['bss_vs_clim']:+.3f} (AUC {r0['auc']:.3f} -> {r1['auc']:.3f}),"
                    f" dBrier {d_:+.5f} [{lo_:+.5f}, {hi_:+.5f}]; event rate lowest FWI third {rl:.3f}, highest third {rh:.3f} (n {len(s)})")
                kres["lead"][f"dry|clim_fwi|{sname}"] = dict(n=r1["n"], events=r1["events"], bss=r1["bss_vs_clim"], auc_clim=r0["auc"],
                                                            auc_clim_fwi=r1["auc"], rate_low_third=round(float(rl), 3), rate_high_third=round(float(rh), 3))
        # FWI alone: event frequency by FWI class (EFFIS-style class edges, as context only)
        edges = [0, 5.2, 11.2, 21.3, 38.0, 50.0, 1e9]
        tab = []
        for a, b in zip(edges[:-1], edges[1:]):
            mm = (sc.fwi >= a) & (sc.fwi < b)
            tab.append(dict(fwi=f"{a:g}-{b:g}", n=int(mm.sum()), event_rate=round(float(sc.o[mm].mean()), 3) if mm.sum() else None))
        log("  event rate by FWI class (all points and seasons, EFFIS class edges): "
            + "; ".join(f"{x['fwi']}: n {x['n']}, {x['event_rate']}" for x in tab))
        kres["by_fwi_class"] = tab
        # same, within month (does FWI tell anything beyond the calendar?)
        mt = []
        for mth in (2, 3, 4):
            g = sc[sc.date.dt.month == mth]
            q = g.fwi.quantile([0.33, 0.67]).values
            lo_, mid_, hi_ = g[g.fwi < q[0]], g[(g.fwi >= q[0]) & (g.fwi < q[1])], g[g.fwi >= q[1]]
            mt.append(dict(month=mth, fwi_terciles=[round(float(x), 1) for x in q], rate_low=round(float(lo_.o.mean()), 3),
                           rate_mid=round(float(mid_.o.mean()), 3), rate_high=round(float(hi_.o.mean()), 3), n=int(len(g))))
            log(f"  month {mth}: event rate by FWI tercile (edges {np.round(q, 1).tolist()}): low {lo_.o.mean():.3f}, mid {mid_.o.mean():.3f}, high {hi_.o.mean():.3f} (n {len(g)})")
        kres["by_month_tercile"] = mt
        res["by_threshold"][str(K)] = kres
    # season totals vs season-mean FWI (the inter-annual signal)
    st = sc.groupby(["point", "season"]).agg(total=("count", "sum"), fwi=("fwi", "mean"), dc=("dc", "mean")).reset_index()
    rs = st.groupby("point").apply(lambda g: g[["total", "fwi"]].corr(method="spearman").iloc[0, 1], include_groups=False)
    log(f"\nSeason total hotspots vs season-mean FWI, Spearman per point (6 seasons each): "
        + ", ".join(f"{p} {v:+.2f}" for p, v in rs.items()) + f"; median {rs.median():+.2f}")
    res["season_spearman_by_point"] = {p: round(float(v), 2) for p, v in rs.items()}
    OUTF.parent.mkdir(exist_ok=True)
    OUTF.write_text(json.dumps(res, indent=1))
    with LOGF.open("a") as f:
        f.write("\n".join(_lines) + "\n")


if __name__ == "__main__":
    main()

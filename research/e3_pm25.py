"""E3 — PM2.5 outlook: CAMS (Open-Meteo air-quality) vs Air4Thai observations.

Question: how good is the app's planned PM2.5 outlook (CAMS, ratio-corrected with the
latest observation) for the next 24-h means, against persistence and simple blends?

Run:  python3 research/e3_pm25.py            (fetches what is not cached, then analyses)
      DN_SCRATCH=/path/to/scratch python3 research/e3_pm25.py
Writes research/logs/e3_pm25-2026-10-23.log, research/out/e3_results.json,
research/data/e3_pm25_daily.csv (station, day, obs, CAMS daily means).

Data
- Observations, daily 24-h means: Air4Thai "daily_download" spreadsheets
  https://air4thai.net/daily_download/PM2.5/<year>.xlsx (the history page's own links;
  "ผ่านการตรวจสอบในระดับเบื้องต้น" = preliminary QC). 2025 file → Dec 2025; 2026 file → Jan–Jun 2026.
- Observations, hourly: https://air4thai.com/forweb/getHistoryData.php (the parameters the
  air4thai.pcd.go.th/webV3 history page sends: stationID, param=PM25, type=hr, sdate, edate,
  stime=00, etime=23). On 2026-10-23 it returned hours only from about 2026-07-26 onwards
  (earlier dates: "data": []), so hourly work is limited to Sep–Oct 2026.
- CAMS: https://air-quality-api.open-meteo.com/v1/air-quality, hourly pm2_5, domains=cams_global,
  timezone Asia/Bangkok. Its history is stitched from short-lead forecasts, so any CAMS
  skill below is an UPPER BOUND for what a 24–72 h-old forecast would have shown.

Method (issue at 00:00 Bangkok of day I, observations known to the end of day I-1):
  lead k = 1, 2, 3 → target day d = I + k - 1 (0–24 h, 24–48 h, 48–72 h).
  (a) raw     : CAMS daily mean of day d
  (b) persist : observed mean of day I-1
  (c) ratio   : CAMS(d) * clip(obs(I-1) / CAMS(I-1), 0.5, 3)     ← the app's planned correction
  (d) blend   : a + b*persist + c*CAMS(d), OLS per lead (and a log-space variant)
  (e) gbm     : sklearn HistGradientBoosting on persist, obs(I-2), CAMS(d), CAMS(I-1), lat
Choose on the earlier period (fit Dec 2025–Jan 2026, choose on Feb 2026, sample A stations),
refit on Dec–Feb, score later (Mar–Apr 2026) on sample A, confirm on the disjoint sample B
stations and on the newest data (Sep 20–Oct 22 2026, all stations, daily means from hours).
"""
from __future__ import annotations

import io
import json
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import (AIR4THAI_CA, DATA, OUT, Log, block_bootstrap_rise, clean, get,  # noqa: E402
                    ledger_total, om_get)

L = Log("e3_pm25")

# station id: (region, sample). A = choose/fit, B = disjoint confirmation.
STATIONS = {
    "35t": ("north (Chiang Mai)", "A"),
    "50t": ("Bangkok (Pathum Wan)", "A"),
    "46t": ("northeast (Khon Kaen)", "A"),
    "44t": ("south (Hat Yai)", "A"),
    "57t": ("north (Chiang Rai)", "B"),
    "67t": ("north (Nan)", "B"),
    "05t": ("Bangkok (Bang Na)", "B"),
    "41t": ("central (Nakhon Sawan)", "B"),
    "83t": ("northeast (Ubon Ratchathani)", "B"),
    "42t": ("south (Surat Thani)", "B"),
}
BANDS = [15.0, 25.0, 37.5, 75.0]   # PCD 2023 24-h mean bands: ≤15 | 15.1–25 | 25.1–37.5 | 37.6–75 | ≥75.1
THR = [37.6, 75.1]
CAMS_RANGES = [("2025-11-26", "2026-04-30"), ("2026-09-15", "2026-10-23")]


def band(x):
    # values are reported to 0.1, so "≤ 15.0" is band 0, 15.1 band 1 …
    return np.digitize(np.round(x, 1), np.array(BANDS) + 0.05)


# ---------------------------------------------------------------- fetch
def station_meta():
    txt = get("https://air4thai.pcd.go.th/services/getNewAQI_JSON.php", verify=str(AIR4THAI_CA))
    st = {s["stationID"]: s for s in json.loads(txt)["stations"]}
    meta = {}
    for sid, (reg, smp) in STATIONS.items():
        s = st[sid]
        meta[sid] = dict(lat=float(s["lat"]), lon=float(s["long"]), name=s["nameEN"], region=reg, sample=smp)
    return meta


def obs_daily_xlsx():
    frames = []
    for y in (2025, 2026):
        b = get(f"https://air4thai.net/daily_download/PM2.5/{y}.xlsx", verify=str(AIR4THAI_CA), binary=True)
        x = pd.read_excel(io.BytesIO(b), header=0)
        x = x.rename(columns={x.columns[0]: "date"})
        x = x[pd.to_datetime(x["date"], errors="coerce").notna()].copy()
        x["date"] = pd.to_datetime(x["date"]).dt.date
        frames.append(x)
    x = pd.concat(frames)
    out = []
    for sid in STATIONS:
        col = sid.upper()
        v = pd.to_numeric(x[col], errors="coerce")
        out.append(pd.DataFrame({"sid": sid, "date": x["date"].values, "obs": v.values}))
    d = pd.concat(out).dropna()
    d = d[d.obs >= 0]
    return d


def obs_hourly_api(start="2026-09-15", end="2026-10-23"):
    ids = ",".join(STATIONS)
    rows = []
    months = pd.date_range(start, end, freq="MS").union([pd.Timestamp(start)])
    edges = sorted(set([pd.Timestamp(start)] + [m for m in months if m > pd.Timestamp(start)]))
    edges.append(pd.Timestamp(end) + pd.Timedelta(days=1))
    for a, b in zip(edges[:-1], edges[1:]):
        s, e = a.strftime("%Y-%m-%d"), (b - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
        txt = get("https://air4thai.com/forweb/getHistoryData.php",
                  dict(stationID=ids, param="PM25", type="hr", sdate=s, edate=e, stime="00", etime="23"),
                  verify=str(AIR4THAI_CA))
        for st in json.loads(txt)["stations"]:
            for r in st["data"]:
                rows.append((st["stationID"], r["DATETIMEDATA"], r.get("PM25")))
    h = pd.DataFrame(rows, columns=["sid", "time", "obs"])
    h["time"] = pd.to_datetime(h["time"])
    h["obs"] = pd.to_numeric(h["obs"], errors="coerce")
    h = h[(h.obs >= 0)].dropna().drop_duplicates(["sid", "time"])
    return h


def cams_hourly(meta):
    rows = []
    for sid, m in meta.items():
        for s, e in CAMS_RANGES:
            j = om_get("https://air-quality-api.open-meteo.com/v1/air-quality",
                       dict(latitude=m["lat"], longitude=m["lon"], hourly="pm2_5", domains="cams_global",
                            timezone="Asia/Bangkok", start_date=s, end_date=e),
                       f"E3 CAMS {sid} {s}..{e}")
            t = pd.to_datetime(j["hourly"]["time"])
            rows.append(pd.DataFrame({"sid": sid, "time": t, "cams": j["hourly"]["pm2_5"],
                                      "grid_lat": j["latitude"], "grid_lon": j["longitude"]}))
    c = pd.concat(rows)
    c["cams"] = pd.to_numeric(c["cams"], errors="coerce")
    return c.dropna(subset=["cams"])


# ---------------------------------------------------------------- scoring
def scores(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    m = ~(np.isnan(y) | np.isnan(p))
    y, p = y[m], p[m]
    r = dict(n=int(len(y)), mae=float(np.mean(np.abs(p - y))), bias=float(np.mean(p - y)),
             rmse=float(np.sqrt(np.mean((p - y) ** 2))), band_agree=float(np.mean(band(p) == band(y))))
    for t in THR:
        o, f = y >= t, p >= t
        hits, miss, fa = int(np.sum(o & f)), int(np.sum(o & ~f)), int(np.sum(~o & f))
        r[f"ge{t}"] = dict(obs_events=int(o.sum()), hits=hits, misses=miss, false_alarms=fa,
                           POD=(hits / (hits + miss)) if hits + miss else None,
                           FAR=(fa / (hits + fa)) if hits + fa else None,
                           CSI=(hits / (hits + miss + fa)) if hits + miss + fa else None)
    return r


def fmt(r):
    def f(v):
        return "  -  " if v is None else f"{v:5.2f}"
    s = f"n={r['n']:4d} MAE={r['mae']:6.2f} bias={r['bias']:+6.2f} band={100*r['band_agree']:5.1f}%"
    for t in THR:
        e = r[f"ge{t}"]
        s += f" | ≥{t}: ev={e['obs_events']:3d} POD={f(e['POD'])} FAR={f(e['FAR'])} CSI={f(e['CSI'])}"
    return s


def build_rows(daily):
    """daily: sid, date, obs, cams → rows per (sid, target day, lead)."""
    out = []
    for sid, g in daily.groupby("sid"):
        g = g.set_index("date").sort_index()
        idx = pd.date_range(g.index.min(), g.index.max(), freq="D").date
        g = g.reindex(idx)
        for k in (1, 2, 3):
            # target d, issue I = d-(k-1); persist = obs(I-1) = obs(d-k); cams(I-1) = cams(d-k)
            df = pd.DataFrame({"sid": sid, "date": idx, "lead": k, "obs": g["obs"].values,
                               "cams": g["cams"].values,
                               "persist": g["obs"].shift(k).values,
                               "obs_lag2": g["obs"].shift(k + 1).values,
                               "cams_prev": g["cams"].shift(k).values})
            out.append(df)
    r = pd.concat(out)
    r["ratio"] = np.clip(r["persist"] / r["cams_prev"], 0.5, 3.0)
    r["corr"] = r["cams"] * r["ratio"]
    return r.dropna(subset=["obs", "cams", "persist", "cams_prev"])


def fit_blend(tr, log=False):
    coefs = {}
    for k, g in tr.groupby("lead"):
        if log:
            X = np.c_[np.ones(len(g)), np.log1p(g.persist), np.log1p(g.cams)]
            y = np.log1p(g.obs)
        else:
            X = np.c_[np.ones(len(g)), g.persist, g.cams]
            y = g.obs.values
        b, *_ = np.linalg.lstsq(X, y, rcond=None)
        coefs[int(k)] = [float(v) for v in b]
    return coefs


def apply_blend(df, coefs, log=False):
    p = np.full(len(df), np.nan)
    for k, b in coefs.items():
        m = (df.lead == k).values
        g = df[m]
        if log:
            p[m] = np.expm1(b[0] + b[1] * np.log1p(g.persist) + b[2] * np.log1p(g.cams))
        else:
            p[m] = b[0] + b[1] * g.persist + b[2] * g.cams
    return np.maximum(p, 0)


def fit_damped(tr):
    """POST-HOC candidate (added after the first test run, see the log): persistence scaled by
    CAMS's own predicted change, damped: y = persist * (CAMS(d)/CAMS(I-1))**beta, beta per lead
    fitted by least absolute log error on the fitting rows (grid 0..1.5). beta=0 → persistence,
    beta=1 → the unclipped ratio method. No level shrinkage, so peaks are not pulled down."""
    out = {}
    grid = np.round(np.arange(0, 1.51, 0.05), 2)
    for k, g in tr.groupby("lead"):
        lr = np.log(g.cams.clip(lower=0.5) / g.cams_prev.clip(lower=0.5))
        lp, lo = np.log(g.persist.clip(lower=0.5)), np.log(g.obs.clip(lower=0.5))
        errs = [np.mean(np.abs(lp + b * lr - lo)) for b in grid]
        out[int(k)] = float(grid[int(np.argmin(errs))])
    return out


def apply_damped(df, betas):
    p = np.full(len(df), np.nan)
    for k, b in betas.items():
        m = (df.lead == k).values
        g = df[m]
        p[m] = g.persist.values * (g.cams.clip(lower=0.5).values / g.cams_prev.clip(lower=0.5).values) ** b
    return p


FEATS = ["persist", "obs_lag2", "cams", "cams_prev", "lat", "lead"]


def fit_gbm(tr):
    from sklearn.ensemble import HistGradientBoostingRegressor
    m = HistGradientBoostingRegressor(loss="absolute_error", max_iter=200, learning_rate=0.05,
                                      max_leaf_nodes=15, min_samples_leaf=20, random_state=0)
    t = tr.dropna(subset=FEATS)
    m.fit(t[FEATS].values, t.obs.values)
    return m


def apply_gbm(m, df):
    p = np.full(len(df), np.nan)
    ok = df[FEATS].notna().all(axis=1).values
    p[ok] = m.predict(df.loc[ok, FEATS].values)
    return p


def main():
    from common import ensure_air4thai_ca
    ensure_air4thai_ca()
    meta = station_meta()
    for sid, m in meta.items():
        L.w(f"station {sid} {m['sample']} {m['region']:30s} {m['lat']:.4f},{m['lon']:.4f} {m['name']}")

    od = obs_daily_xlsx()
    oh = obs_hourly_api()
    L.w(f"Air4Thai daily rows {len(od)} ({od.date.min()}..{od.date.max()}); hourly rows {len(oh)} "
        f"({oh.time.min()}..{oh.time.max()})")
    c = cams_hourly(meta)
    L.w(f"CAMS hourly rows {len(c)}; Open-Meteo weighted calls so far (ledger): {ledger_total():.1f}")
    for sid, g in c.groupby("sid"):
        L.w(f"  CAMS grid for {sid}: {g.grid_lat.iloc[0]:.3f},{g.grid_lon.iloc[0]:.3f}")

    c["date"] = c.time.dt.date
    cd = c.groupby(["sid", "date"]).agg(cams=("cams", "mean"), nh=("cams", "size")).reset_index()
    cd = cd[cd.nh >= 18]
    # newest-season daily means from the hourly observations (≥ 18 of 24 hours)
    oh["date"] = oh.time.dt.date
    ohd = oh.groupby(["sid", "date"]).agg(obs=("obs", "mean"), nh=("obs", "size")).reset_index()
    ohd = ohd[ohd.nh >= 18][["sid", "date", "obs"]]
    daily = pd.concat([od, ohd]).drop_duplicates(["sid", "date"], keep="first")
    daily = daily.merge(cd[["sid", "date", "cams"]], on=["sid", "date"], how="inner")
    daily = daily.sort_values(["sid", "date"])
    daily.to_csv(DATA / "e3_pm25_daily.csv", index=False, float_format="%.2f")
    L.w(f"daily obs+CAMS pairs: {len(daily)} → {DATA / 'e3_pm25_daily.csv'}")

    rows = build_rows(daily)
    rows["lat"] = rows.sid.map(lambda s: meta[s]["lat"])
    rows["sample"] = rows.sid.map(lambda s: meta[s]["sample"])
    d = pd.to_datetime(rows.date)
    rows["period"] = np.select(
        [(d >= "2025-12-01") & (d <= "2026-01-31"), (d >= "2026-02-01") & (d <= "2026-02-28"),
         (d >= "2026-03-01") & (d <= "2026-04-30"), (d >= "2026-09-20") & (d <= "2026-10-31")],
        ["train_DecJan", "choose_Feb", "test_MarApr", "newest_Oct"], default="other")

    # ---- choose on Feb (fit on Dec–Jan, sample A)
    A = rows[rows["sample"] == "A"]
    trc, ch = A[A.period == "train_DecJan"], A[A.period == "choose_Feb"]
    L.w(f"\n## Choosing period: fit Dec 2025–Jan 2026 (n={len(trc)} rows, 3 leads), "
        f"choose on Feb 2026 (n={len(ch)}), sample A")
    cand = {}
    bl, blg = fit_blend(trc), fit_blend(trc, log=True)
    gb = fit_gbm(trc)
    dpc = fit_damped(trc)
    preds = dict(raw=ch.cams.values, persist=ch.persist.values, ratio=ch["corr"].values,
                 blend=apply_blend(ch, bl), blend_log=apply_blend(ch, blg, log=True), gbm=apply_gbm(gb, ch),
                 damped_posthoc=apply_damped(ch, dpc))
    for name, p in preds.items():
        r = scores(ch.obs, p)
        cand[name] = r["mae"]
        L.w(f"  {name:9s} {fmt(r)}")
    L.w(f"  (damped_posthoc betas fitted Dec–Jan: {dpc})")
    blends = {k: v for k, v in cand.items() if k in ("blend", "blend_log")}
    best_blend = min(blends, key=blends.get)
    L.w(f"  → blend form chosen on Feb: {best_blend} (MAE {cand[best_blend]:.2f}); "
        f"gbm Feb MAE {cand['gbm']:.2f}")

    # ---- refit on Dec–Feb, score later
    tr = A[A.period.isin(["train_DecJan", "choose_Feb"])]
    blc = fit_blend(tr, log=(best_blend == "blend_log"))
    gb = fit_gbm(tr)
    dp = fit_damped(tr)
    L.w(f"\nfinal damped_posthoc betas (fit Dec–Feb, sample A): {dp}")
    L.w(f"\nfinal {best_blend} coefficients (fit Dec–Feb, sample A, n={len(tr)}): "
        f"{json.dumps(blc)}  [y = a + b*persist + c*CAMS{' in log1p space' if best_blend=='blend_log' else ''}]")

    def predict_all(df):
        return dict(raw=df.cams.values, persist=df.persist.values, ratio=df["corr"].values,
                    blend=apply_blend(df, blc, log=(best_blend == "blend_log")), gbm=apply_gbm(gb, df),
                    damped_posthoc=apply_damped(df, dp))

    results = {"stations": meta, "blend_form": best_blend, "blend_coefs": blc, "damped_posthoc_betas": dp,
               "choose_feb_mae": cand, "tests": {}}
    tests = {
        "A_MarApr (later period, fit stations)": rows[(rows["sample"] == "A") & (rows.period == "test_MarApr")],
        "B_MarApr (later period, disjoint stations)": rows[(rows["sample"] == "B") & (rows.period == "test_MarApr")],
        "B_DecFeb (same period, disjoint stations)": rows[(rows["sample"] == "B") & rows.period.isin(["train_DecJan", "choose_Feb"])],
        "all_Oct2026 (newest, all stations)": rows[rows.period == "newest_Oct"],
    }
    for tname, df in tests.items():
        L.w(f"\n## {tname}")
        results["tests"][tname] = {}
        for k in (1, 2, 3):
            g = df[df.lead == k]
            if len(g) == 0:
                continue
            pr = predict_all(g)
            L.w(f" lead {k} ({24*(k-1)}–{24*k} h):")
            results["tests"][tname][f"lead{k}"] = {}
            for name, p in pr.items():
                r = scores(g.obs, p)
                results["tests"][tname][f"lead{k}"][name] = r
                L.w(f"   {name:8s} {fmt(r)}")

    # ---- per-station "made worse" (ratio and blend vs raw and vs persistence), test MarApr + Oct
    L.w("\n## Per station, lead 1, Mar–Apr 2026: MAE and 'made worse' (rise > 3 % and block-bootstrap "
        "lower 5 % bound > 0; blocks of 5 days)")
    per = {}
    for per_name, pmask in (("MarApr", rows.period == "test_MarApr"), ("Oct2026", rows.period == "newest_Oct")):
        per[per_name] = {}
        for sid in STATIONS:
            for k in (1, 2, 3):
                g = rows[pmask & (rows.sid == sid) & (rows.lead == k)].sort_values("date")
                if len(g) < 10:
                    continue
                pr = predict_all(g)
                e = {n: pr[n] - g.obs.values for n in pr}
                rec = {n: float(np.nanmean(np.abs(v))) for n, v in e.items()}
                rec["n"] = int(len(g))
                for new in ("ratio", "blend", "damped_posthoc"):
                    for old in ("raw", "persist"):
                        rise, lo = block_bootstrap_rise(e[new], e[old], block=5)
                        rec[f"{new}_vs_{old}_rise_pct"] = rise
                        rec[f"{new}_vs_{old}_worse"] = bool(rise > 3 and lo > 0)
                per[per_name].setdefault(sid, {})[f"lead{k}"] = rec
                if k == 1 or per_name == "Oct2026" and k == 1:
                    L.w(f"  {per_name} {sid} {meta[sid]['sample']} n={rec['n']:3d} MAE raw={rec['raw']:6.2f} "
                        f"persist={rec['persist']:6.2f} ratio={rec['ratio']:6.2f} blend={rec['blend']:6.2f} gbm={rec['gbm']:6.2f}"
                        f" | ratio vs raw {rec['ratio_vs_raw_rise_pct']:+6.1f}%{' WORSE' if rec['ratio_vs_raw_worse'] else ''}"
                        f" vs persist {rec['ratio_vs_persist_rise_pct']:+6.1f}%{' WORSE' if rec['ratio_vs_persist_worse'] else ''}"
                        f" | blend vs raw {rec['blend_vs_raw_rise_pct']:+6.1f}%{' WORSE' if rec['blend_vs_raw_worse'] else ''}"
                        f" vs persist {rec['blend_vs_persist_rise_pct']:+6.1f}%{' WORSE' if rec['blend_vs_persist_worse'] else ''}")
    results["per_station"] = per

    # ---- pooled differences with a moving-block bootstrap (per station series, blocks of 5 days)
    L.w("\n## Pooled MAE difference vs persistence, 90 % block-bootstrap interval (blocks of 5 days within station)")
    pooled = {}
    rng = np.random.default_rng(7)
    for tname, df in tests.items():
        for k in (1, 2, 3):
            g = df[df.lead == k].sort_values(["sid", "date"])
            if len(g) < 30:
                continue
            pr = predict_all(g)
            for new in ("raw", "ratio", "blend", "damped_posthoc"):
                d_ = np.abs(pr[new] - g.obs.values) - np.abs(pr["persist"] - g.obs.values)
                ok = ~np.isnan(d_)
                d_, sids = d_[ok], g.sid.values[ok]
                blocks = []
                for s_ in np.unique(sids):
                    v = d_[sids == s_]
                    blocks += [v[i:i + 5] for i in range(0, len(v), 5)]
                bm = np.array([b.sum() for b in blocks]); bn = np.array([len(b) for b in blocks])
                bs = []
                for _ in range(2000):
                    ii = rng.integers(0, len(blocks), len(blocks))
                    bs.append(bm[ii].sum() / bn[ii].sum())
                lo, hi = np.quantile(bs, [0.05, 0.95])
                pooled[f"{tname}|lead{k}|{new}"] = [float(d_.mean()), float(lo), float(hi)]
                L.w(f"  {tname:45s} lead {k} {new:15s} ΔMAE vs persist {d_.mean():+6.2f} [{lo:+6.2f}, {hi:+6.2f}]")
    results["pooled_delta_vs_persist"] = pooled

    # ---- onsets: days that enter ≥ 37.6 / ≥ 75.1 when the last observed day was below (persistence can never catch them)
    L.w("\n## Onsets (diagnostic): target day ≥ threshold while the last observed day (persist) was below it")
    ons = {}
    for tname, df in tests.items():
        for k in (1, 2, 3):
            g = df[df.lead == k]
            pr = predict_all(g)
            for t in THR:
                below = g.persist.values < t
                onset = below & (g.obs.values >= t)
                quiet = below & (g.obs.values < t)
                for new in ("raw", "ratio", "blend", "damped_posthoc"):
                    f = pr[new] >= t
                    hits = int(np.sum(onset & f)); fa = int(np.sum(quiet & f))
                    ons[f"{tname}|lead{k}|{t}|{new}"] = dict(onsets=int(onset.sum()), caught=hits,
                                                             false_alarms_on_quiet=fa, quiet_days=int(quiet.sum()))
                    if onset.sum() or fa:
                        L.w(f"  {tname:45s} lead {k} ≥{t:5.1f} {new:15s} onsets={int(onset.sum()):3d} caught={hits:3d} "
                            f"false alarms={fa:3d} of {int(quiet.sum())} quiet days")
    results["onsets"] = ons
    for per_name in per:
        for new in ("ratio", "blend", "damped_posthoc"):
            for old in ("raw", "persist"):
                for k in (1, 2, 3):
                    w = [s for s, v in per[per_name].items() if f"lead{k}" in v and v[f"lead{k}"][f"{new}_vs_{old}_worse"]]
                    L.w(f"  {per_name} lead {k}: {new} made worse than {old} beyond chance at {len(w)} stations {w}")

    # ---- hourly next-24 h (newest data only: Sep 20 – Oct 22, 2026)
    L.w("\n## Hourly, newest data (2026-09-20 … 2026-10-22), issue every hour, next 1–24 h")
    hh = oh.merge(c[["sid", "time", "cams"]], on=["sid", "time"], how="inner")
    hres = {}
    allrec = {m: [] for m in ("raw", "persist24", "persist1", "ratio")}
    mean_rec = {m: [] for m in ("raw", "persist24", "ratio", "damped_posthoc")}
    beta1 = dp[1]  # lead-1 beta fitted on Dec–Feb daily data; applied unchanged to hourly issues
    for sid, g in hh.groupby("sid"):
        g = g.set_index("time").sort_index()
        full = pd.date_range(g.index.min(), g.index.max(), freq="h")
        g = g.reindex(full)
        o, cm = g.obs.values, g.cams.values
        for i in range(24, len(full) - 24):
            if full[i] < pd.Timestamp("2026-09-20"):
                continue
            past_o, past_c = o[i - 24:i], cm[i - 24:i]
            if np.isnan(past_o).sum() > 6 or np.isnan(o[i - 1]):
                continue
            po = np.nanmean(past_o)
            pc = np.nanmean(past_c)
            ratio = np.clip(po / pc, 0.5, 3.0) if pc > 0 else 1.0
            fut_o, fut_c = o[i:i + 24], cm[i:i + 24]
            ok = ~np.isnan(fut_o) & ~np.isnan(fut_c)
            if ok.sum() < 18:
                continue
            allrec["raw"].append(np.abs(fut_c[ok] - fut_o[ok]))
            allrec["persist24"].append(np.abs(po - fut_o[ok]))
            allrec["persist1"].append(np.abs(o[i - 1] - fut_o[ok]))
            allrec["ratio"].append(np.abs(fut_c[ok] * ratio - fut_o[ok]))
            ym = fut_o[ok].mean()
            mean_rec["raw"].append((fut_c[ok].mean(), ym))
            mean_rec["persist24"].append((po, ym))
            mean_rec["ratio"].append((fut_c[ok].mean() * ratio, ym))
            mean_rec["damped_posthoc"].append((po * (max(fut_c[ok].mean(), 0.5) / max(pc, 0.5)) ** beta1, ym))
    for m, v in allrec.items():
        v = np.concatenate(v) if v else np.array([])
        hres[f"hourly_{m}_mae"] = float(v.mean()) if len(v) else None
        L.w(f"  hourly values, {m:9s}: n={len(v):6d} MAE={v.mean():6.2f}")
    for m, v in mean_rec.items():
        a = np.array(v)
        r = scores(a[:, 1], a[:, 0])
        hres[f"next24mean_{m}"] = r
        L.w(f"  next-24 h mean, {m:9s}: {fmt(r)}  (issues overlap: hourly issues of the same day are not independent)")
    results["hourly_newest"] = hres
    results["openmeteo_weighted_calls_total_ledger"] = ledger_total()
    (OUT / "e3_results.json").write_text(json.dumps(clean(results), indent=1, default=str))
    L.w(f"\nwrote {OUT / 'e3_results.json'}; Open-Meteo ledger total {ledger_total():.1f} weighted calls")


if __name__ == "__main__":
    main()

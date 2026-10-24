"""Experiment B: heavy rain at the point vs "somewhere within 25 km" (neighbourhood), ECMWF as issued, Thai gauges.
Hazards research, 2026-10-24.

Observations  NOAA NCEI GHCNh hourly records of 76 TMD synoptic stations, 2024-2026 (files already downloaded by the
              heat researcher of this session: $GHCNH_DIR; read only). 24-h rain of the 07-07 Bangkok day exactly as
              research/e1e2_weather.py (the 00 UTC report's precipitation_24_hour; a SYNOP with iR = 3 is dry; else
              >= 20 one-hour amounts summed; else missing). 2026 is BUFR-gappy (dry days under-represented): indicative.
Forecasts     research/hz_fetch_ecmwf.py: HRES tp (00 UTC runs, every 3rd day, Apr-Dec 2024 and 2025) and ENS
              probabilities tpg25 / tpg50 / tpg100 (every day, Apr-Dec 2024, 2025, Apr-20 Oct 2026), 0.25 deg box.
              Day 0 = steps 0-24 (optimistic), day 1 = 24-48 (as issued), day 2 = 48-72; window D 00 UTC -> D+1 00 UTC
              is the 07-07 rain day D.
Point         the nearest 0.25 deg grid point (what Open-Meteo's ensemble call returns).
Neighbourhood grid points whose centres lie within r km of the station (r = 25 as the page would say; 40 and 60 as
              sensitivity). HRES: max over the neighbourhood (yes/no) and the fraction of points >= 35.1 (probability).
              ENS: the largest point probability in the neighbourhood (a lower bound of "somewhere within r"), and the
              neighbourhood mean (NEP, Theis et al. 2005; Schwartz & Sobash 2017).
              P(>= 35) for the ENS is not in the open-data products; "P35~" = 0.6 P25 + 0.4 P50 (linear between the
              25 and 50 mm products) is an approximation, checked against the member-based point chance of the
              earlier study (research/forecast-validation-2026-10-23 E2: BSS +0.05 at 24-48 h, 2025).
Event         observed at the gauge (no dense network is open; ThaiWater is not called). So this scores whether the
              neighbourhood forecast predicts rain AT the point better; the "somewhere within 25 km" event itself
              cannot be verified with these data.
Protocol      choose (radius, statistic, word cut points) on 2024 at sample A stations (sorted ids, even positions);
              score on 2025 at A; confirm on 2025 at B (odd positions); 2026 indicative.  Climatology: station-month
              frequency in the other year (2024 for 2025), shrunk to the all-station month frequency with 60
              pseudo-days.  Persistence: the observed rain of the issue day >= threshold.  Paired moving-block
              bootstrap (7-day blocks within stations, 2,000 draws) for Brier differences.
Run: python -I research/hz_rain.py -> research/logs/hz_rain-2026-10-24.log, research/out/hz_rain.json,
     research/data/hz_rain_obs.csv.gz
"""
from __future__ import annotations

import datetime as dt
import glob
import json
import os
import pathlib
import re
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
HERE = pathlib.Path(__file__).resolve().parent
HZ = pathlib.Path(os.environ.get("HZ_DATA", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hz/dl"))
GH = pathlib.Path(os.environ.get("GHCNH_DIR", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models/dl/ghcnh"))
STLIST = GH.parent / "ghcnh-station-list.csv"
EC = HZ / "ecmwf"
LOGF = HERE / "logs" / "hz_rain-2026-10-24.log"
OBSF = HERE / "data" / "hz_rain_obs.csv.gz"
BAD_Q = set("23679ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
LAT0, LON0 = 22.0, 96.0
NJ, NI = 73, 45
_lines = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    _lines.append(s)


# ------------------------------------------------------------------ observations (logic of research/e1e2_weather.py)
def read_rain(station, year):
    f = GH / f"GHCNh_{station}_{year}.psv"
    if not f.exists():
        return None
    use = ["DATE", "precipitation_24_hour", "precipitation_24_hour_Quality_Code", "precipitation", "precipitation_Quality_Code", "REM"]
    x = pd.read_csv(f, sep="|", low_memory=False, usecols=lambda c: c in use)
    x["t"] = pd.to_datetime(x.DATE)
    for v in ("precipitation_24_hour", "precipitation"):
        q = x[f"{v}_Quality_Code"].astype(str)
        x.loc[q.str[0].isin(BAD_Q) & (q != "nan"), v] = np.nan
    return x.sort_values("t").drop_duplicates("t", keep="first")


def obs_daily(station):
    fr = [read_rain(station, y) for y in (2024, 2025, 2026)]
    fr = [f for f in fr if f is not None]
    if not fr:
        return None
    x = pd.concat(fr)
    xh = x[x.t.dt.minute == 0]
    z = xh[xh.t.dt.hour == 0].copy()
    z["rday"] = (z.t - pd.Timedelta(days=1)).dt.date

    def ir_of(rem):
        m = re.match(r"SYN\d{3}\d{5}\s+(\d)\d{4}", str(rem))
        return m.group(1) if m else None
    z["ir"] = z.REM.map(ir_of)
    x["rday"] = (x.t - pd.Timedelta(minutes=1)).dt.floor("D").dt.date
    hs = x.groupby("rday").precipitation.agg(["sum", "count"])
    z = z.join(hs, on="rday")
    z["rain"] = z.precipitation_24_hour
    m0 = z.rain.isna() & (z.ir == "3")
    z.loc[m0, "rain"] = 0.0
    mh = z.rain.isna() & z.ir.isna() & (z["count"].fillna(0) >= 20)
    z.loc[mh, "rain"] = z.loc[mh, "sum"]
    z["src"] = np.where(z.precipitation_24_hour.notna(), "p24", np.where(m0, "iR3", np.where(mh, "hourly", "missing")))
    d = z[["rday", "rain", "src"]].rename(columns={"rday": "date"})
    d["station"] = station
    return d


def load_obs():
    if OBSF.exists():
        o = pd.read_csv(OBSF, parse_dates=["date"])
        return o
    ids = sorted({re.match(r"GHCNh_(THM\d+)_", pathlib.Path(f).name).group(1) for f in glob.glob(str(GH / "GHCNh_THM*_*.psv"))})
    rows = [obs_daily(s) for s in ids]
    o = pd.concat([r for r in rows if r is not None], ignore_index=True)
    o["date"] = pd.to_datetime(o.date)
    o = o.dropna(subset=["rain"])
    OBSF.parent.mkdir(exist_ok=True)
    o.to_csv(OBSF, index=False, compression="gzip")
    return o


# ------------------------------------------------------------------ geometry
def hav(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


GLAT = LAT0 - 0.25 * np.arange(NJ)
GLON = LON0 + 0.25 * np.arange(NI)
LA, LO = np.meshgrid(GLAT, GLON, indexing="ij")


def neighbourhoods(lat, lon, radii=(25, 40, 60)):
    d = hav(lat, lon, LA, LO)
    near = np.unravel_index(np.argmin(d), d.shape)
    out = {"point": (np.array([near[0]]), np.array([near[1]])), "point_km": float(d[near])}
    for r in radii:
        m = d <= r
        m[near] = True
        out[r] = np.where(m)
    return out


# ------------------------------------------------------------------ scores
def cat(o, f):
    o, f = np.asarray(o, bool), np.asarray(f, bool)
    a, b, c = int((o & f).sum()), int((~o & f).sum()), int((o & ~f).sum())
    pod = a / (a + c) if a + c else np.nan
    far = b / (a + b) if a + b else np.nan
    csi = a / (a + b + c) if a + b + c else np.nan
    bias = (a + b) / (a + c) if a + c else np.nan
    return dict(hits=a, false_alarms=b, misses=c, pod=round(pod, 3), far=round(far, 3), csi=round(csi, 3), bias=round(bias, 2))


def brier(o, p):
    return float(np.mean((np.asarray(p, float) - np.asarray(o, float)) ** 2))


def boot_diff(df, a, b, nb=2000, block=7, seed=11):
    rng = np.random.default_rng(seed)
    sums, lens = [], []
    for _, g in df.sort_values("date").groupby("station"):
        e = ((g[a] - g.o) ** 2 - (g[b] - g.o) ** 2).values
        for k in range(0, len(e), block):
            sums.append(e[k:k + block].sum())
            lens.append(len(e[k:k + block]))
    sums, lens = np.array(sums), np.array(lens)
    ds = []
    for _ in range(nb):
        ix = rng.integers(0, len(sums), len(sums))
        ds.append(sums[ix].sum() / lens[ix].sum())
    return float(sums.sum() / lens.sum()), float(np.percentile(ds, 2.5)), float(np.percentile(ds, 97.5))


def reliability(o, p, bins=(0, 0.001, 0.1, 0.2, 0.4, 0.6, 1.001)):
    o, p = np.asarray(o, float), np.asarray(p, float)
    out = []
    for a, b in zip(bins[:-1], bins[1:]):
        m = (p >= a) & (p < b)
        if m.sum():
            out.append((f"{a:.2f}-{min(b, 1):.2f}", int(m.sum()), round(float(p[m].mean()), 3), round(float(o[m].mean()), 3)))
    return out


def words(o, p):
    """The page's three words: below 10 % 'ต่ำ', 10-40 % 'มีโอกาส', 40 % and more 'สูง'."""
    o, p = np.asarray(o, float), np.asarray(p, float)
    res = {}
    for name, m in (("low <10%", p < 0.1), ("possible 10-40%", (p >= 0.1) & (p < 0.4)), ("high >=40%", p >= 0.4)):
        res[name] = dict(n=int(m.sum()), share=round(float(m.mean()), 3), observed=round(float(o[m].mean()), 3) if m.sum() else None,
                         events=int(o[m].sum()), share_of_events=round(float(o[m].sum() / max(o.sum(), 1)), 3))
    return res


# ------------------------------------------------------------------ main
def main():
    log(f"===== hz_rain {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ}")
    obs = load_obs()
    st = pd.read_csv(STLIST, usecols=["GHCN_ID", "LATITUDE", "LONGITUDE", "NAME"]).set_index("GHCN_ID")
    ids = sorted(obs.station.unique())
    samp = {s: ("A" if k % 2 == 0 else "B") for k, s in enumerate(ids)}
    log(f"stations with rain days: {len(ids)} (A {sum(v == 'A' for v in samp.values())}, B {sum(v == 'B' for v in samp.values())}); "
        f"rain days by year: {obs.groupby(obs.date.dt.year).size().to_dict()}; by source: {obs.src.value_counts().to_dict()}")
    nb = {s: neighbourhoods(st.loc[s, "LATITUDE"], st.loc[s, "LONGITUDE"]) for s in ids}
    log("grid points in the neighbourhood (median, min-max): " + "; ".join(
        f"{r} km {int(np.median([len(nb[s][r][0]) for s in ids]))} ({min(len(nb[s][r][0]) for s in ids)}-{max(len(nb[s][r][0]) for s in ids)})"
        for r in (25, 40, 60)) + f"; nearest point {np.median([nb[s]['point_km'] for s in ids]):.1f} km (median)")

    # forecasts -> long table: station, date (rain day), lead, kind, values
    rows = []
    for f in sorted(EC.glob("*.npz")):
        kind, ds = f.stem.split("_")
        run = pd.Timestamp(dt.datetime.strptime(ds, "%Y%m%d"))
        z = np.load(f)
        if kind == "oper":
            day = {0: z["tp_24"], 1: z["tp_48"] - z["tp_24"], 2: z["tp_72"] - z["tp_48"]}
            for lead, a in day.items():
                a = np.maximum(a, 0)
                for s in ids:
                    n = nb[s]
                    r = dict(station=s, date=run + pd.Timedelta(days=lead), lead=lead, kind="hres", run=run,
                             pt=float(a[n["point"]][0]))
                    for rad in (25, 40, 60):
                        v = a[n[rad]]
                        r[f"max{rad}"] = float(v.max())
                        r[f"frac{rad}"] = float((v >= 35.1).mean())
                    rows.append(r)
        else:
            for lead, w in ((0, "0-24"), (1, "24-48"), (2, "48-72")):
                for s in ids:
                    n = nb[s]
                    r = dict(station=s, date=run + pd.Timedelta(days=lead), lead=lead, kind="ens", run=run)
                    for thr in (25, 50, 100):
                        a = z[f"tpg{thr}_{w}"] / 100.0
                        r[f"p{thr}_pt"] = float(a[n["point"]][0])
                        for rad in (25, 40, 60):
                            v = a[n[rad]]
                            r[f"p{thr}_max{rad}"] = float(v.max())
                            r[f"p{thr}_mean{rad}"] = float(v.mean())
                    rows.append(r)
    fc = pd.DataFrame(rows)
    log(f"forecast rows: HRES {int((fc.kind == 'hres').sum())}, ENS {int((fc.kind == 'ens').sum())}; "
        f"HRES runs {fc[fc.kind == 'hres'].run.nunique()}, ENS runs {fc[fc.kind == 'ens'].run.nunique()}")
    o = obs[["station", "date", "rain"]]
    df = fc.merge(o, on=["station", "date"], how="inner")
    # persistence: the latest complete 07-07 day when the 00 UTC run is published (~07 UTC): rain day run - 1
    pers = o.assign(run=o.date + pd.Timedelta(days=1)).rename(columns={"rain": "rain_issue_day"})[["station", "run", "rain_issue_day"]]
    df = df.merge(pers, on=["station", "run"], how="left")
    df["sample"] = df.station.map(samp)
    df["year"] = df.date.dt.year
    df["month"] = df.date.dt.month
    df = df[df.month.between(4, 12)]

    # geometry check against the earlier study's HRES day-1 point values (same grid point rule)
    e12 = HERE / "data" / "e1e2_daily.csv"
    if e12.exists():
        old = pd.read_csv(e12, parse_dates=["date"]).dropna(subset=["rain_fc_day1"])
        h1 = df[(df.kind == "hres") & (df.lead == 1)][["station", "date", "pt"]]
        mm = h1.merge(old[["station", "date", "rain_fc_day1"]], on=["station", "date"])
        if len(mm):
            dif = (mm.pt - mm.rain_fc_day1).abs()
            log(f"check vs research/data/e1e2_daily.csv (HRES day 1 at the nearest point): {len(mm)} pairs, "
                f"median |diff| {dif.median():.3f} mm, share within 0.1 mm {np.mean(dif <= 0.1):.3f}")

    # climatology: station-month frequency in the other year, shrunk to the all-station month frequency (60 pseudo-days)
    def clim_table(year, thr):
        g = o[(o.date.dt.year == year) & o.date.dt.month.between(4, 12)].copy()
        g["e"], g["m"] = g.rain >= thr, g.date.dt.month
        pooled = g.groupby("m").e.mean()
        sm = g.groupby(["station", "m"]).e.agg(["sum", "count"]).reset_index()
        sm["p"] = (sm["sum"] + 60 * sm.m.map(pooled)) / (sm["count"] + 60)
        return sm.set_index(["station", "m"]).p, pooled

    res = {}
    log("\nobserved frequency of heavy rain (>= 35.1 mm), Apr-Dec, all stations: " + ", ".join(
        f"{y}: {np.mean(o[(o.date.dt.year == y) & o.date.dt.month.between(4, 12)].rain >= 35.1):.3f} "
        f"(n {int(((o.date.dt.year == y) & o.date.dt.month.between(4, 12)).sum())})" for y in (2024, 2025, 2026)))

    def attach_clim(d, thr, test_year):
        other = 2024 if test_year != 2024 else 2025
        tab, pooled = clim_table(other, thr)
        key = list(zip(d.station, d.month))
        c = np.array([tab.get(k, np.nan) for k in key])
        c = np.where(np.isnan(c), d.month.map(pooled).values, c)
        return np.clip(c, 0.002, 0.998)

    sets = [("2024 A (choose)", 2024, "A"), ("2025 A (later)", 2025, "A"), ("2025 B (disjoint)", 2025, "B"),
            ("2026 A+B (BUFR gaps, indicative)", 2026, None)]

    # ---------------- HRES at 35.1 mm: point vs neighbourhood
    log("\n================ HRES (deterministic) >= 35.1 mm: point vs within r km ================")
    res["hres"] = {}
    for lead in (0, 1, 2):
        for name, y, smp in sets:
            d = df[(df.kind == "hres") & (df.lead == lead) & (df.year == y)]
            if smp:
                d = d[d["sample"] == smp]
            if not len(d):
                continue
            d = d.copy()
            d["o"] = (d.rain >= 35.1).astype(float)
            d["clim"] = attach_clim(d, 35.1, y)
            out = {"n": int(len(d)), "events": int(d.o.sum())}
            line = [f"lead {lead} {name}: n {len(d)}, events {int(d.o.sum())}"]
            for lab, f in (("point", d.pt >= 35.1), ("max25", d.max25 >= 35.1), ("max40", d.max40 >= 35.1), ("max60", d.max60 >= 35.1)):
                c = cat(d.o, f)
                out[lab] = c
                line.append(f"{lab} POD {c['pod']:.2f} FAR {c['far']:.2f} CSI {c['csi']:.3f} bias {c['bias']}")
            pc = cat(d.o, d.rain_issue_day >= 35.1)
            out["persistence"] = pc
            line.append(f"persistence CSI {pc['csi']:.3f}")
            bc = brier(d.o, d.clim)
            for lab in ("point01", "frac25", "frac40", "frac60"):
                p = (d.pt >= 35.1).astype(float) if lab == "point01" else d[lab]
                out[f"bss_{lab}"] = round(1 - brier(d.o, p) / bc, 3)
            line.append("BSS vs clim: point yes/no {bss_point01:+.3f}, fraction25 {bss_frac25:+.3f}, fraction40 {bss_frac40:+.3f}, "
                        "fraction60 {bss_frac60:+.3f}".format(**out))
            log("  " + " | ".join(line))
            res["hres"][f"{lead}|{name}"] = out

    # ---------------- ENS probabilities at 25 and 50 mm (exact products) and P35~
    log("\n================ ENS probabilities: point vs neighbourhood (max / mean of the members' point chances) ================")
    res["ens"] = {}
    ens = df[df.kind == "ens"].copy()
    ens["p35_pt"] = 0.6 * ens.p25_pt + 0.4 * ens.p50_pt
    for rad in (25, 40, 60):
        ens[f"p35_max{rad}"] = 0.6 * ens[f"p25_max{rad}"] + 0.4 * ens[f"p50_max{rad}"]
        ens[f"p35_mean{rad}"] = 0.6 * ens[f"p25_mean{rad}"] + 0.4 * ens[f"p50_mean{rad}"]
    # how good is linear interpolation between two exceedance products? Rebuild P50 from P25 and P100 (a wider bracket
    # than 25-50 for 35 mm, so a pessimistic check of P35~), at the point, days 0-2, 2024-25
    chk = ens[ens.year.isin([2024, 2025])]
    p50i = (2 / 3) * chk.p25_pt + (1 / 3) * chk.p100_pt
    err = (p50i - chk.p50_pt)
    log(f"interpolation check: P50 rebuilt as 2/3 P25 + 1/3 P100 vs the real P50 at the point (n {len(chk)}): mean error {err.mean():+.3f}, "
        f"mean |error| {err.abs().mean():.3f}, 95th pct |error| {err.abs().quantile(0.95):.3f}; "
        f"on days with real P50 >= 0.1: mean |error| {err[chk.p50_pt >= 0.1].abs().mean():.3f} (n {int((chk.p50_pt >= 0.1).sum())}); "
        f"Brier of the rebuilt vs real P50 for >= 50 mm: {brier(chk.rain >= 50, p50i.clip(0, 1)):.5f} vs {brier(chk.rain >= 50, chk.p50_pt):.5f}")
    from sklearn.linear_model import LogisticRegression
    chosen, calib = {}, {}

    def lg(p):
        p = np.clip(np.asarray(p, float), 0.005, 0.995)
        return np.log(p / (1 - p)).reshape(-1, 1)
    for thr, obs_thr in ((25, 25.0), (35, 35.1), (50, 50.0), (100, 100.0)):
        log(f"\n-- event >= {obs_thr} mm at the gauge; forecast P{'35~ (approx.)' if thr == 35 else thr}")
        for lead in (0, 1, 2):
            for name, y, smp in sets:
                d = ens[(ens.lead == lead) & (ens.year == y)]
                if smp:
                    d = d[d["sample"] == smp]
                if not len(d):
                    continue
                d = d.copy()
                d["o"] = (d.rain >= obs_thr).astype(float)
                d["clim"] = attach_clim(d, obs_thr, y)
                bc = brier(d.o, d.clim)
                out = {"n": int(len(d)), "events": int(d.o.sum()), "brier_clim": round(bc, 5)}
                parts = []
                for lab in ["pt"] + [f"{s}{r}" for r in (25, 40, 60) for s in ("max", "mean")]:
                    col = f"p{thr}_{lab}"
                    b = brier(d.o, d[col])
                    out[lab] = dict(brier=round(b, 5), bss=round(1 - b / bc, 3))
                    parts.append(f"{lab} {1 - b / bc:+.3f}")
                labs = ["pt"] + [f"{s_}{r}" for r in (25, 40, 60) for s_ in ("max", "mean")]
                if name.startswith("2024 A"):
                    chosen[(thr, lead)] = min(labs, key=lambda L_: out[L_]["brier"])
                    parts.append(f"(chosen on 2024 A: {chosen[(thr, lead)]})")
                    if d.o.sum() >= 10:  # logistic recalibration of logit(p), fitted here, used on later sets
                        for lab in ("pt", "max25", "mean25"):
                            calib[(thr, lead, lab)] = LogisticRegression(C=1e3, max_iter=1000).fit(lg(d[f"p{thr}_{lab}"]), d.o)
                elif (thr, lead) in chosen:
                    c_ = chosen[(thr, lead)]
                    out["chosen"] = dict(label=c_, bss=out[c_]["bss"])
                    parts.append(f"[chosen {c_}: {out[c_]['bss']:+.3f}]")
                    for lab in ("pt", "max25", "mean25"):
                        if (thr, lead, lab) in calib:
                            pc = calib[(thr, lead, lab)].predict_proba(lg(d[f"p{thr}_{lab}"]))[:, 1]
                            out[f"{lab}_cal"] = dict(brier=round(brier(d.o, pc), 5), bss=round(1 - brier(d.o, pc) / bc, 3))
                            d[f"cal_{lab}"] = pc
                    if "cal_pt" in d and "cal_max25" in d:
                        parts.append(f"[recalibrated: pt {out['pt_cal']['bss']:+.3f}, max25 {out['max25_cal']['bss']:+.3f}, "
                                     f"mean25 {out['mean25_cal']['bss']:+.3f}]")
                        if y == 2025:
                            dd, lo, hi = boot_diff(d, "cal_max25", "cal_pt")
                            out["boot_cal_max25_minus_cal_pt"] = [round(dd, 6), round(lo, 6), round(hi, 6)]
                            parts.append(f"[cal max25-cal pt dBrier {dd:+.5f} ({lo:+.5f},{hi:+.5f})]")
                if thr in (35,) and lead in (1, 2) and y in (2024, 2025):
                    for lab in ("pt", "max25", "mean25"):
                        out[f"rel_{lab}"] = reliability(d.o, d[f"p{thr}_{lab}"])
                        out[f"words_{lab}"] = words(d.o, d[f"p{thr}_{lab}"])
                if y in (2025,) and thr in (25, 35, 50):
                    for lab in ("max25", "mean25"):
                        dd, lo, hi = boot_diff(d, f"p{thr}_{lab}", f"p{thr}_pt")
                        out[f"boot_{lab}_minus_pt"] = [round(dd, 6), round(lo, 6), round(hi, 6)]
                        parts.append(f"[{lab}-pt dBrier {dd:+.5f} ({lo:+.5f},{hi:+.5f})]")
                log(f"  lead {lead} {name}: n {len(d)}, events {int(d.o.sum())}; BSS vs clim: " + ", ".join(parts))
                res["ens"][f"P{thr}|{lead}|{name}"] = out
    # words and reliability for P35~, day 1 and 2, 2025
    log("\n-- the page's three words on P35~ (day 1, 2): share of days and observed heavy-rain frequency in each word")
    for k, v in res["ens"].items():
        if k.startswith("P35|") and "words_pt" in v:
            for lab in ("pt", "max25", "mean25"):
                w = v[f"words_{lab}"]
                log(f"  {k} {lab:6s}: " + "; ".join(f"{a}: {b['share']:.3f} of days, observed {b['observed']}, {b['share_of_events']:.2f} of the events"
                                                    for a, b in w.items()))
            for lab in ("pt", "max25"):
                log(f"  {k} reliability {lab}: " + "; ".join(f"{a}: n {n}, fc {f}, obs {ob}" for a, n, f, ob in v[f"rel_{lab}"]))
    # the landslide tile's rule (assess.js: in a DMR risk area, P(> 100 mm in 24 h) >= 0.2 -> watch, >= 0.5 -> get ready)
    log("\n-- the landslide rule: ENS P(> 100 mm) at the point and the largest within 25 km; what fell at the gauge")
    res["landslide_rule"] = {}
    for lead in (0, 1, 2):
        d = ens[(ens.lead == lead) & ens.year.isin([2024, 2025])]
        for lab in ("pt", "max25"):
            for cut in (0.1, 0.2, 0.5):
                m = d[f"p100_{lab}"] >= cut
                r_ = dict(n=int(len(d)), days=int(m.sum()), obs100=int((d.rain[m] >= 100).sum()), obs35=int((d.rain[m] >= 35.1).sum()),
                          all100=int((d.rain >= 100).sum()))
                res["landslide_rule"][f"{lead}|{lab}|{cut}"] = r_
                log(f"  lead {lead} {lab:5s} P100 >= {cut}: {r_['days']} of {r_['n']} station-days (2024-25); of these, >= 100 mm fell on "
                    f"{r_['obs100']} and >= 35.1 mm on {r_['obs35']}; all >= 100 mm days: {r_['all100']}")
    (HERE / "out" / "hz_rain.json").write_text(json.dumps(res, indent=1, default=str))
    with LOGF.open("a") as f:
        f.write("\n".join(_lines) + "\n")


if __name__ == "__main__":
    main()

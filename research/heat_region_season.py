"""MODELS §7.7 — the heat-index correction by region and season (model check, 24 Oct 2026).

    python3 -I research/heat_region_season.py

The page corrects each ECMWF member's daily-max heat index with one national line (public/js/calibration.js HEAT:
day 1 a = 10.375, b = 0.8647; day 2 a = 11.689, b = 0.826), fitted on 2025 Mar–Oct at 8 stations and tested on
2026 Mar–Oct and on 10 held-out stations. It was never scored per region or for Nov–Feb. This script scores it there
and tests whether a region or season term would do better.

DATA
- Forecasts: ECMWF IFS HRES 00 UTC runs, ECMWF open data as issued (research/ecmwf_points.mjs → <scratch>/
  ecmwf_points2/oper_*.csv), 2024-03-01..2026-10-23, nearest 0.25° point. Day 1 = max HI at steps 30, 33 (13:00, 16:00
  Bangkok the next day), day 2 = steps 54, 57: exactly the predictor the national line was fitted on
  (research/e1e2_weather.py). RH from 2t and 2d with the Magnus form (17.625, 243.04), HI with research/heat_index.py.
- Observations: NOAA NCEI GHCNh hourly (research/fetch_ghcnh.py), TMD synoptic stations; daily max HI over the Bangkok
  day with e1e2_weather.py's rules (on-the-hour reports, quality codes, >= 16 hourly HI values and >= 5 of the
  11–17 h hours). Airports: IEM's METAR archive (research/fetch_iem_metar.py), same rules on the :00 reports.
- Regions: research/data/thai_stations_regions.json (TMD's regions mapped to North, Northeast, Central/Bangkok, East,
  South), airports: research/data/airports_metar.json.

PRE-REGISTERED DESIGN (fixed in this header before any score of this run was computed)
Part A — description: the current correction's error (forecast − observed; positive = too hot) by region × month for
  day 1 and day 2, all stations and periods. Rows of 2025 Mar–Oct at sample A are the national fit's own rows
  (in-sample) and are flagged. Metrics: n, mean error, MAE, band agreement over 27/33/42/52 °C, share of days put in a
  higher / lower band than observed, and for >= 33 (เตือนภัย) and >= 42 (อันตราย): POD, FAR (false alarms ÷ days
  forecast at or above), false-alarm days ÷ all days.
Part B — a region or season term, judged by the protocol (GUIDELINES §7):
  fit/choose: 2024-10-01..2025-09-30 at samples A+B (the 18 stations of the 23 Oct study);
  later:      2025-10-01..2026-10-23 at A+B;
  disjoint:   sample C (every other Thai GHCNh station <= 500 m, no island or marine station, >= 30 pairs) in the
              later period (and, as a second look, the earlier period, where C was never fitted either); airports
              (sample D, METAR) in both periods.
  candidates (additive terms on top of the current line, fitted as mean residuals, per lead):
    C0 current national line (no change)
    C1 season: one offset for Nov–Feb, one for Mar–Oct
    C2 region: one offset per region
    C3 region × season: one offset per region and season
    C4 month: one offset per calendar month
    C5 cool-season refit: a new (a, b) by least squares on Nov–Feb rows, the current line otherwise
  choice: the lowest leave-one-station-out MAE on the fit period (A+B), day 1.
  baselines: raw HRES; persistence (the observed max of the issue day); climatology (the station's mean daily-max HI
    of the same calendar month one year earlier, >= 10 days).
  ship rule: the chosen candidate ships only if, on sample C in the later period, (1) its pooled MAE is below C0's and
    the 90 % interval of ΔMAE (date-block bootstrap, 7-day blocks, 2000 draws) lies below 0; (2) it makes no more
    stations worse than C0 does to it, "worse" = MAE rise > 3 % and the 7-day moving-block bootstrap's lower 5 % bound
    of the rise > 0; (3) on C in Nov–Feb its POD for >= 42 is not lower than C0's by more than 0.05 when there are
    >= 20 such days, and likewise for >= 33. It must hold at both leads for the lead it changes.
Everything added after a first look at these results is marked POST-HOC in the log.

Outputs: research/logs/heat_region_season-2026-10-24.log, research/out/heat_region_season.json,
research/data/model_check_daily.csv.gz (station-day pairs). Plain Python 3 (no numpy/pandas on this host).
"""
from __future__ import annotations

import csv
import datetime as dt
import glob
import gzip
import json
import math
import os
import pathlib
import random
import sys
from collections import defaultdict

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import heat_index as H  # noqa: E402

SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
FC_DIR = pathlib.Path(os.environ.get("DN_FC_DIR", SCRATCH / "ecmwf_points2"))
GH = SCRATCH / "dl" / "ghcnh"
IEM = SCRATCH / "dl" / "iem"
CACHE = SCRATCH / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
LOGF = HERE / "logs" / "heat_region_season-2026-10-24.log"
OUTF = HERE / "out" / "heat_region_season.json"
if os.environ.get("DN_CODE_TEST"):  # a code test on partial data: nothing written to research/
    LOGF = SCRATCH / "code_test.log"
    OUTF = SCRATCH / "code_test.json"

CUR = {1: (10.375, 0.8647), 2: (11.689, 0.826)}   # public/js/calibration.js HEAT lead1, lead2
BANDS = [27.0, 33.0, 42.0, 52.0]
THR = [33.0, 42.0]
REGIONS = ["North", "Northeast", "Central", "East", "South"]
COOL = {11, 12, 1, 2}
BAD_Q = set("23679ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
FIT = (dt.date(2024, 10, 1), dt.date(2025, 9, 30))
LATER = (dt.date(2025, 10, 1), dt.date(2026, 10, 23))
SEASON = lambda m: "cool" if m in COOL else "rest"  # noqa: E731

_logf = open(LOGF, "a")


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    _logf.write(s + "\n")
    _logf.flush()


def rh_from_td(t, td):
    a, b = 17.625, 243.04
    return max(0.0, min(100.0, 100.0 * math.exp(a * td / (b + td) - a * t / (b + t))))


def num(s):
    try:
        v = float(s)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) else v


# ------------------------------------------------------------------ observations
def daily_from_hourly(recs):
    """recs: {utc datetime (on the hour): (t, td_or_None, rh_or_None)} → {bangkok date: dict}."""
    by = defaultdict(list)
    for t_utc, (t, td, rh) in recs.items():
        if t is None or not (-10 < t < 50):
            continue
        r = rh_from_td(t, td) if td is not None else rh
        hi = H.heat_index_c(t, r) if r is not None else None
        by[(t_utc + dt.timedelta(hours=7)).date()].append((t_utc.hour, hi, t, td))
    out = {}
    for d, xs in by.items():
        his = [x[1] for x in xs if x[1] is not None]
        nmid = sum(1 for x in xs if x[1] is not None and 4 <= x[0] <= 10)
        rec = {"himax": max(his) if len(his) >= 16 and nmid >= 5 else None}
        for hh in (6, 9):
            x = [y for y in xs if y[0] == hh]
            rec[f"t{hh:02d}"] = x[0][2] if x else None
            rec[f"td{hh:02d}"] = x[0][3] if x else None
            rec[f"hi{hh:02d}"] = x[0][1] if x else None
        out[d] = rec
    return out


def read_ghcnh(sid):
    recs = {}
    for f in sorted(GH.glob(f"GHCNh_{sid}_*.psv")):
        with open(f, newline="") as fh:
            rd = csv.reader(fh, delimiter="|")
            hdr = next(rd)
            ix = {k: i for i, k in enumerate(hdr)}
            for row in rd:
                try:
                    tm = dt.datetime.fromisoformat(row[ix["DATE"]])
                except ValueError:
                    continue
                if tm.minute != 0 or tm in recs:
                    continue

                def val(k):
                    v = num(row[ix[k]])
                    q = row[ix[k + "_Quality_Code"]] if (k + "_Quality_Code") in ix else ""
                    if v is not None and q and q[0] in BAD_Q:
                        return None
                    return v
                recs[tm] = (val("temperature"), val("dew_point_temperature"), num(row[ix["relative_humidity"]]))
    return daily_from_hourly(recs) if recs else {}


def read_iem(icao):
    fs = sorted(IEM.glob(f"{icao}_*.csv"))
    recs = {}
    for f in fs:
        with open(f, newline="") as fh:
            for row in csv.DictReader(fh):
                try:
                    tm = dt.datetime.strptime(row["valid"], "%Y-%m-%d %H:%M")
                except ValueError:
                    continue
                if tm.minute != 0 or tm in recs:
                    continue
                recs[tm] = (num(row["tmpc"]), num(row["dwpc"]), None)
    return daily_from_hourly(recs) if recs else {}


# ------------------------------------------------------------------ forecasts
def read_fc():
    cache = CACHE / f"fc_hi_{FC_DIR.name}.json"
    files = sorted(glob.glob(str(FC_DIR / "oper_*.csv")))
    if cache.exists():
        c = json.load(open(cache))
        if c.get("nfiles") == len(files):
            return {tuple(k.split("|")): v for k, v in c["fc"].items()}, c["nfiles"]
    fc = {}
    for f in files:
        v = defaultdict(dict)
        with open(f) as fh:
            for r in csv.DictReader(fh):
                v[(r["station"], int(r["step"]))][r["param"]] = float(r["value"]) - 273.15
        run = dt.date(int(f[-12:-8]), int(f[-8:-6]), int(f[-6:-4]))
        for st in {k[0] for k in v}:
            for lead, steps in ((1, (30, 33)), (2, (54, 57))):
                his, ts, tds = [], [], []
                for s in steps:
                    x = v.get((st, s), {})
                    if "2t" in x and "2d" in x:
                        his.append(H.heat_index_c(x["2t"], rh_from_td(x["2t"], x["2d"])))
                        ts.append(x["2t"])
                        tds.append(x["2d"])
                if len(his) == 2:
                    vd = (run + dt.timedelta(days=lead)).isoformat()
                    fc[(st, vd, str(lead))] = [max(his), ts[0], tds[0], ts[1], tds[1], run.isoformat()]
    json.dump({"nfiles": len(files), "fc": {"|".join(k): v for k, v in fc.items()}}, open(cache, "w"))
    return fc, len(files)


# ------------------------------------------------------------------ scoring helpers
def band(x):
    x = round(x, 1)
    return sum(1 for e in BANDS if x >= e)


def scores(rows, key):
    """rows: dicts with 'obs' and key → metrics."""
    pr = [(r[key], r["obs"]) for r in rows if r.get(key) is not None and r["obs"] is not None]
    n = len(pr)
    if not n:
        return {"n": 0}
    e = [p - y for p, y in pr]
    out = {"n": n, "bias": sum(e) / n, "mae": sum(abs(x) for x in e) / n}
    bp = [(band(p), band(y)) for p, y in pr]
    out["band_agree"] = sum(1 for a, b in bp if a == b) / n
    out["band_high"] = sum(1 for a, b in bp if a > b) / n
    out["band_low"] = sum(1 for a, b in bp if a < b) / n
    for t in THR:
        h = sum(1 for p, y in pr if p >= t and y >= t)
        m = sum(1 for p, y in pr if p < t and y >= t)
        fa = sum(1 for p, y in pr if p >= t and y < t)
        out[f"ge{t:.0f}"] = {"events": h + m, "forecasts": h + fa, "hits": h, "misses": m, "false_alarms": fa,
                             "POD": h / (h + m) if h + m else None, "FAR": fa / (h + fa) if h + fa else None,
                             "fa_share": fa / n}
    return out


def f(v, w=5, p=2):
    return "-".rjust(w) if v is None else f"{v:{w}.{p}f}"


def line(name, s):
    if not s.get("n"):
        return f"{name:<34} n=0"
    g33, g42 = s["ge33"], s["ge42"]
    return (f"{name:<34} n={s['n']:5d} bias={s['bias']:+5.2f} MAE={s['mae']:5.2f} band={100 * s['band_agree']:4.0f}% "
            f"hi/lo={100 * s['band_high']:3.0f}/{100 * s['band_low']:3.0f}% | ≥33 ev={g33['events']:4d} POD={f(g33['POD'], 4)} "
            f"FAR={f(g33['FAR'], 4)} fa%={100 * g33['fa_share']:4.1f} | ≥42 ev={g42['events']:4d} POD={f(g42['POD'], 4)} "
            f"FAR={f(g42['FAR'], 4)} fa%={100 * g42['fa_share']:4.1f}")


def date_block_delta(rows, k_new, k_old, block=7, n=2000, seed=1):
    """Pooled MAE(new) − MAE(old) and its 90 % interval from a moving-block bootstrap over dates."""
    per = defaultdict(lambda: [0.0, 0])
    for r in rows:
        if r.get(k_new) is None or r.get(k_old) is None or r["obs"] is None:
            continue
        p = per[r["date"]]
        p[0] += abs(r[k_new] - r["obs"]) - abs(r[k_old] - r["obs"])
        p[1] += 1
    dates = sorted(per)
    if len(dates) < 2 * block:
        return None
    tot = sum(per[d][0] for d in dates) / sum(per[d][1] for d in dates)
    rng = random.Random(seed)
    nb = math.ceil(len(dates) / block)
    boots = []
    for _ in range(n):
        s = c = 0.0
        for _b in range(nb):
            i0 = rng.randrange(0, len(dates) - block + 1)
            for d in dates[i0:i0 + block]:
                s += per[d][0]
                c += per[d][1]
        boots.append(s / c)
    boots.sort()
    return {"delta": tot, "lo90": boots[int(0.05 * n)], "hi90": boots[int(0.95 * n) - 1]}


def made_worse(rows_station, k_new, k_old, block=7, n=2000, seed=1):
    pr = sorted((r["date"], abs(r[k_new] - r["obs"]), abs(r[k_old] - r["obs"])) for r in rows_station
                if r.get(k_new) is not None and r.get(k_old) is not None and r["obs"] is not None)
    if len(pr) < 2 * block:
        return None
    a = [x[1] for x in pr]
    b = [x[2] for x in pr]
    if sum(b) == 0:
        return None
    rise = 100 * (sum(a) / sum(b) - 1)
    d = [x - y for x, y in zip(a, b)]
    rng = random.Random(seed)
    nb = math.ceil(len(d) / block)
    boots = []
    for _ in range(n):
        idx = []
        for _b in range(nb):
            i0 = rng.randrange(0, len(d) - block + 1)
            idx.extend(range(i0, i0 + block))
        idx = idx[:len(d)]
        boots.append(sum(d[i] for i in idx) / len(idx))
    boots.sort()
    lo5 = boots[int(0.05 * n)]
    return {"n": len(d), "rise_pct": rise, "lo5": lo5, "worse": rise > 3 and lo5 > 0}


# ------------------------------------------------------------------ candidates
def resid(r):
    return r["obs"] - r["cur"]


def fit_candidates(rows):
    """rows: fit-period rows of one lead (with 'cur', 'raw', 'obs', 'region', 'month')."""
    def mean_by(keyf):
        acc = defaultdict(lambda: [0.0, 0])
        for r in rows:
            a = acc[keyf(r)]
            a[0] += resid(r)
            a[1] += 1
        return {k: v[0] / v[1] for k, v in acc.items() if v[1] >= 10}
    c = {"C1": mean_by(lambda r: SEASON(r["month"])), "C2": mean_by(lambda r: r["region"]),
         "C3": mean_by(lambda r: (r["region"], SEASON(r["month"]))), "C4": mean_by(lambda r: r["month"])}
    cool = [(r["raw"], r["obs"]) for r in rows if r["month"] in COOL]
    if len(cool) >= 30:
        mx = sum(x for x, _ in cool) / len(cool)
        my = sum(y for _, y in cool) / len(cool)
        sxx = sum((x - mx) ** 2 for x, _ in cool)
        b = sum((x - mx) * (y - my) for x, y in cool) / sxx
        c["C5"] = {"a": my - b * mx, "b": b, "n": len(cool)}
    return c


def apply(c, name, r):
    if name == "C0":
        return r["cur"]
    if name == "C5":
        p = c["C5"]
        return p["a"] + p["b"] * r["raw"] if r["month"] in COOL else r["cur"]
    key = {"C1": SEASON(r["month"]), "C2": r["region"], "C3": (r["region"], SEASON(r["month"])), "C4": r["month"]}[name]
    return r["cur"] + c[name].get(key, 0.0)


CANDS = ["C0", "C1", "C2", "C3", "C4", "C5"]


def jsonable(c):
    return {k: ({("|".join(map(str, kk)) if isinstance(kk, tuple) else str(kk)): vv for kk, vv in v.items()}
                if isinstance(v, dict) else v) for k, v in c.items()}


# ------------------------------------------------------------------ main
def main():
    log(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} =====")
    st = json.load(open(HERE / "data" / "thai_stations_regions.json"))["stations"]
    ap = json.load(open(HERE / "data" / "airports_metar.json"))["stations"]
    meta = {s["id"]: s for s in st + ap}
    fc, nfiles = read_fc()
    log(f"forecast runs read: {nfiles} files; station-day-lead forecasts: {len(fc)}")

    # observations (cached)
    oc = CACHE / "obs_daily.json"
    if oc.exists():
        obs = {k: {dt.date.fromisoformat(d): v for d, v in x.items()} for k, x in json.load(open(oc)).items()}
    else:
        obs = {}
        for s in st:
            if s["sample"] == "excluded":
                continue
            obs[s["id"]] = read_ghcnh(s["id"])
        for s in ap:
            obs[s["id"]] = read_iem(s["id"])
        json.dump({k: {d.isoformat(): v for d, v in x.items()} for k, x in obs.items()}, open(oc, "w"))
    nobs = {k: sum(1 for v in x.values() if v["himax"] is not None) for k, x in obs.items()}
    log("observed HI-max days per station: " + ", ".join(f"{k[-5:] if k.startswith('THM') else k}:{v}" for k, v in sorted(nobs.items())))

    # station-day rows
    rows = []
    for sid, od in obs.items():
        m = meta[sid]
        for d, o in od.items():
            if o["himax"] is None:
                continue
            for lead in (1, 2):
                x = fc.get((sid, d.isoformat(), str(lead)))
                if not x:
                    continue
                raw, t1, td1, t2, td2, run = x
                a, b = CUR[lead]
                p0 = od.get(dt.date.fromisoformat(run), {}).get("himax")
                rows.append({"station": sid, "region": m["region"], "sample": m["sample"], "date": d, "month": d.month,
                             "lead": lead, "obs": o["himax"], "raw": raw, "cur": a + b * raw, "pers": p0,
                             "dT": [t1 - o["t06"] if o["t06"] is not None else None, t2 - o["t09"] if o["t09"] is not None else None],
                             "dTd": [td1 - o["td06"] if o["td06"] is not None else None, td2 - o["td09"] if o["td09"] is not None else None]})
    # climatology: same station, same calendar month, one year earlier (>= 10 days)
    mm = defaultdict(list)
    for sid, od in obs.items():
        for d, o in od.items():
            if o["himax"] is not None:
                mm[(sid, d.year, d.month)].append(o["himax"])
    for r in rows:
        v = mm.get((r["station"], r["date"].year - 1, r["month"]), [])
        r["clim"] = sum(v) / len(v) if len(v) >= 10 else None
    # sample C needs >= 30 pairs (day 1) to be scored
    cnt = defaultdict(int)
    for r in rows:
        if r["lead"] == 1:
            cnt[r["station"]] += 1
    scored_c = sorted(s for s in cnt if meta[s]["sample"] == "C" and cnt[s] >= 30)
    rows = [r for r in rows if r["sample"] != "C" or r["station"] in scored_c]
    log(f"station-day pairs: {len(rows)} (day 1: {sum(1 for r in rows if r['lead'] == 1)}); sample C stations scored: "
        f"{len(scored_c)} ({', '.join(s[-5:] for s in scored_c)})")
    log(f"dropped C stations (< 30 pairs): {sorted(s[-5:] for s in cnt if meta[s]['sample'] == 'C' and cnt[s] < 30)}")
    for r in rows:
        r["insample"] = r["sample"] == "A" and r["date"].year == 2025 and 3 <= r["month"] <= 10

    # save the pairs
    with gzip.open(SCRATCH / "code_test_daily.csv.gz" if os.environ.get("DN_CODE_TEST") else HERE / "data" / "model_check_daily.csv.gz", "wt", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["station", "region", "sample", "date", "lead", "obs_himax", "fc_raw", "fc_current", "persistence", "climatology"])
        for r in sorted(rows, key=lambda r: (r["station"], r["date"], r["lead"])):
            w.writerow([r["station"], r["region"], r["sample"], r["date"].isoformat(), r["lead"], round(r["obs"], 2),
                        round(r["raw"], 2), round(r["cur"], 2), "" if r["pers"] is None else round(r["pers"], 2),
                        "" if r["clim"] is None else round(r["clim"], 2)])
    res = {"design": __doc__.split("PRE-REGISTERED DESIGN")[1].split("Outputs:")[0].strip(), "current": CUR,
           "stations_scored_C": scored_c, "partA": {}, "partB": {}}

    # ---------------- Part A
    log("\n================ Part A — the current correction by region × month (error = forecast − observed) ================")
    groups = [("Nov", [11]), ("Dec", [12]), ("Jan", [1]), ("Feb", [2]), ("Mar–May", [3, 4, 5]), ("Jun–Sep", [6, 7, 8, 9]), ("Oct", [10]),
              ("Nov–Feb", [11, 12, 1, 2]), ("Mar–Oct", list(range(3, 11)))]
    for lead in (1, 2):
        res["partA"][f"day{lead}"] = {}
        for excl in (False, True):
            tag = "out-of-sample only (2025 Mar–Oct sample A removed)" if excl else "all rows"
            log(f"\n--- day {lead}, {tag}")
            for reg in REGIONS + ["ALL"]:
                for gname, months in groups:
                    sub = [r for r in rows if r["lead"] == lead and r["month"] in months and (reg == "ALL" or r["region"] == reg)
                           and not (excl and r["insample"])]
                    s = {k: scores(sub, k) for k in ("cur", "raw", "pers")}
                    res["partA"][f"day{lead}"][f"{'oos' if excl else 'all'}|{reg}|{gname}"] = s
                    log(line(f"{reg:<9} {gname:<8} current", s["cur"]))
                    if gname in ("Nov–Feb", "Mar–Oct"):
                        log(line(f"{reg:<9} {gname:<8} raw", s["raw"]))
                        log(line(f"{reg:<9} {gname:<8} persistence", s["pers"]))
    # model T and Td error at 13:00 and 16:00 Bangkok (model − observed at the same hours)
    log("\n--- why: model − observed at 13:00/16:00 Bangkok (°C), day 1, all rows")
    diag = {}
    for reg in REGIONS:
        for sea in ("cool", "rest"):
            sub = [r for r in rows if r["lead"] == 1 and r["region"] == reg and SEASON(r["month"]) == sea]
            dT = [x for r in sub for x in r["dT"] if x is not None]
            dTd = [x for r in sub for x in r["dTd"] if x is not None]
            diag[f"{reg}|{sea}"] = {"dT": sum(dT) / len(dT) if dT else None, "dTd": sum(dTd) / len(dTd) if dTd else None, "n": len(dT)}
            log(f"{reg:<9} {sea:<5} n={len(dT):5d}  T {f(diag[f'{reg}|{sea}']['dT'])}  Td {f(diag[f'{reg}|{sea}']['dTd'])}")
    res["partA"]["model_minus_obs_1316"] = diag
    # per station, Nov–Feb, day 1
    log("\n--- per station, Nov–Feb, day 1, current correction (all winters)")
    per = {}
    for sid in sorted({r["station"] for r in rows}, key=lambda s: (REGIONS.index(meta[s]["region"]), s)):
        sub = [r for r in rows if r["station"] == sid and r["lead"] == 1 and r["month"] in COOL]
        s = scores(sub, "cur")
        if s.get("n"):
            per[sid] = {"region": meta[sid]["region"], "sample": meta[sid]["sample"], "name": meta[sid]["name"], **s}
            log(line(f"{sid[-5:] if sid.startswith('THM') else sid} {meta[sid]['sample']} {meta[sid]['region'][:5]} {meta[sid]['name'][:14]}", s))
    res["partA"]["per_station_cool_day1"] = per

    # ---------------- Part B
    log("\n================ Part B — region / season terms (protocol) ================")
    inr = lambda r, p: p[0] <= r["date"] <= p[1]  # noqa: E731
    for lead in (1, 2):
        L = [r for r in rows if r["lead"] == lead]
        fitrows = [r for r in L if r["sample"] in ("A", "B") and inr(r, FIT)]
        cands = fit_candidates(fitrows)
        log(f"\n--- day {lead}: fitted on {len(fitrows)} rows (A+B, {FIT[0]}..{FIT[1]})")
        for k, v in jsonable(cands).items():
            log(f"  {k}: " + json.dumps({kk: round(vv, 3) if isinstance(vv, float) else vv for kk, vv in v.items()}, ensure_ascii=False))
        # leave-one-station-out on the fit period
        loso = {c: [0.0, 0] for c in CANDS}
        for sid in sorted({r["station"] for r in fitrows}):
            cc = fit_candidates([r for r in fitrows if r["station"] != sid])
            for r in fitrows:
                if r["station"] != sid:
                    continue
                for c in CANDS:
                    if c in ("C0",) or c in cc:
                        loso[c][0] += abs(apply(cc, c, r) - r["obs"])
                        loso[c][1] += 1
        loso_mae = {c: v[0] / v[1] for c, v in loso.items() if v[1]}
        loso_cool = {}
        for c in CANDS:
            acc = [0.0, 0]
            for sid in sorted({r["station"] for r in fitrows}):
                cc = fit_candidates([r for r in fitrows if r["station"] != sid])
                if c != "C0" and c not in cc:
                    continue
                for r in fitrows:
                    if r["station"] == sid and r["month"] in COOL:
                        acc[0] += abs(apply(cc, c, r) - r["obs"])
                        acc[1] += 1
            if acc[1]:
                loso_cool[c] = acc[0] / acc[1]
        log("  leave-one-station-out MAE, fit period, all months: " + "  ".join(f"{c} {v:.3f}" for c, v in loso_mae.items()))
        log("  leave-one-station-out MAE, fit period, Nov–Feb:    " + "  ".join(f"{c} {v:.3f}" for c, v in loso_cool.items()))
        chosen = min((c for c in loso_mae if c != "C0"), key=lambda c: loso_mae[c])
        log(f"  chosen (lowest LOSO MAE among C1–C5): {chosen}  (C0 {loso_mae['C0']:.3f} → {chosen} {loso_mae[chosen]:.3f})")
        for r in L:
            for c in CANDS:
                r[c] = apply(cands, c, r) if (c == "C0" or c in cands) else None
        tests = {
            "fit period, A+B (in-sample)": [r for r in L if r["sample"] in ("A", "B") and inr(r, FIT)],
            "later, A+B": [r for r in L if r["sample"] in ("A", "B") and inr(r, LATER)],
            "later, C (disjoint)": [r for r in L if r["sample"] == "C" and inr(r, LATER)],
            "earlier, C (disjoint)": [r for r in L if r["sample"] == "C" and inr(r, FIT)],
            "later, D airports (METAR)": [r for r in L if r["sample"] == "D" and inr(r, LATER)],
            "earlier, D airports (METAR)": [r for r in L if r["sample"] == "D" and inr(r, FIT)],
        }
        out = {"fitted": jsonable(cands), "loso_mae": loso_mae, "loso_mae_cool": loso_cool, "chosen": chosen, "tests": {}}
        for tname, T in tests.items():
            for seas, months in (("all months", None), ("Nov–Feb", COOL), ("Mar–Oct", set(range(3, 11)))):
                sub = [r for r in T if months is None or r["month"] in months]
                log(f"\n  [{tname} | {seas}]")
                sc = {}
                for k in CANDS + ["raw", "pers", "clim"]:
                    sc[k] = scores(sub, k)
                    log("  " + line(k, sc[k]))
                comp = {}
                for k in [chosen, "pers"]:
                    if sub:
                        dd = date_block_delta(sub, k, "C0")
                        if dd:
                            comp[f"{k}-C0"] = dd
                            log(f"    ΔMAE {k} − C0 = {dd['delta']:+.3f} [90 %: {dd['lo90']:+.3f}, {dd['hi90']:+.3f}]")
                out["tests"][f"{tname}|{seas}"] = {"scores": sc, "delta": comp}
        # made worse, per station (disjoint, later period)
        mw = {}
        T = tests["later, C (disjoint)"] + tests["later, D airports (METAR)"]
        for sid in sorted({r["station"] for r in T}):
            sub = [r for r in T if r["station"] == sid]
            w1 = made_worse(sub, chosen, "C0")
            w0 = made_worse(sub, "C0", chosen)
            mw[sid] = {"chosen_vs_C0": w1, "C0_vs_chosen": w0}
        nw1 = sum(1 for v in mw.values() if v["chosen_vs_C0"] and v["chosen_vs_C0"]["worse"])
        nw0 = sum(1 for v in mw.values() if v["C0_vs_chosen"] and v["C0_vs_chosen"]["worse"])
        log(f"\n  made worse beyond chance, later period, C + D ({len(mw)} stations): {chosen} vs C0 at {nw1}; C0 vs {chosen} at {nw0}")
        log("    worse under " + chosen + ": " + ", ".join(f"{k[-5:] if k.startswith('THM') else k} {v['chosen_vs_C0']['rise_pct']:+.0f}%" for k, v in mw.items() if v["chosen_vs_C0"] and v["chosen_vs_C0"]["worse"]))
        log("    worse under C0: " + ", ".join(f"{k[-5:] if k.startswith('THM') else k} {v['C0_vs_chosen']['rise_pct']:+.0f}%" for k, v in mw.items() if v["C0_vs_chosen"] and v["C0_vs_chosen"]["worse"]))
        out["made_worse_later_CD"] = {"chosen_vs_C0": nw1, "C0_vs_chosen": nw0, "per_station": mw}
        # the ship rule
        tC = out["tests"]["later, C (disjoint)|all months"]
        d = tC["delta"].get(f"{chosen}-C0")
        r1 = bool(d and d["delta"] < 0 and d["hi90"] < 0)
        r2 = nw1 <= nw0
        cool = out["tests"]["later, C (disjoint)|Nov–Feb"]["scores"]
        r3 = True
        for t in ("ge42", "ge33"):
            a, b = cool[chosen].get(t, {}), cool["C0"].get(t, {})
            if a and b and b.get("events", 0) >= 20 and a["POD"] is not None and b["POD"] is not None and a["POD"] < b["POD"] - 0.05:
                r3 = False
        out["ship_rule"] = {"1_mae_better_on_C": r1, "2_not_more_stations_worse": r2, "3_POD_kept_in_cool_season": r3,
                            "ships": r1 and r2 and r3}
        log(f"\n  SHIP RULE day {lead} for {chosen}: (1) {r1} (2) {r2} (3) {r3} → {'SHIPS' if r1 and r2 and r3 else 'does not ship'}")
        res["partB"][f"day{lead}"] = out
    json.dump(res, open(OUTF, "w"), indent=1, default=str, ensure_ascii=False)
    log(f"\nwrote {OUTF}")


if __name__ == "__main__":
    main()

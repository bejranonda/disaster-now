"""The page's own method in the cool season: ECMWF ENS (51 members), each member corrected, then dressed
(outlook.summarizeHeat), scored against the stations' daily-max heat index, Nov 2025–Feb 2026 (every 4th 00 UTC run,
day 1 = steps 30/33 as in the fit). Model check of 24 Oct 2026.

  C0  the current line per member (10.375 + 0.8647·HI), dressed SD 2.95 — what the page does (a description);
  C5  the pre-registered cool-season refit (0.560 + 1.0896·HI), dressed SD 2.44 (fit-period cool residual SD);
  C6  POST-HOC input correction (T + 1.658, Td + 1.491, HI, + 0.898), dressed SD 2.86;
  raw the members' median.
Not the page's exact input: the page's members are Open-Meteo's (elevation-downscaled, max over all hours; see the
report §4); here the members are the GRIB values at the nearest grid point and the 13:00/16:00 max, the validated
predictor.

    python3 -I research/heat_ens_cool.py
"""
import csv
import glob
import json
import math
import os
import pathlib
import sys
from collections import defaultdict
import datetime as dt

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import heat_index as H  # noqa: E402

SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
TEST = bool(os.environ.get("DN_CODE_TEST"))  # a code test writes only to the scratchpad
LOG = open(SCRATCH / "code_test_ens.log" if TEST else HERE / "logs" / "heat_ens_cool-2026-10-24.log", "a")
OUT = SCRATCH / "code_test_ens.json" if TEST else HERE / "out" / "heat_ens_cool.json"


def log(s=""):
    print(s, flush=True)
    LOG.write(s + "\n")


def rh(t, td):
    return max(0.0, min(100.0, 100.0 * math.exp(17.625 * td / (243.04 + td) - 17.625 * t / (243.04 + t))))


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def chance(vals, thr, sd):
    return sum(1 - phi((thr - x) / sd) for x in vals) / len(vals)


def dq(vals, q, sd):
    lo, hi = min(vals) - 5 * sd, max(vals) + 5 * sd
    for _ in range(32):
        mid = (lo + hi) / 2
        if 1 - chance(vals, mid, sd) < q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def med(v):
    s = sorted(v)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def level_of(x):
    x = round(x, 1)
    return 3 if x >= 42 else 2 if x >= 33 else 1 if x >= 27 else 0


meta = {s["id"]: s for s in json.load(open(HERE / "data" / "thai_stations_regions.json"))["stations"]
        + json.load(open(HERE / "data" / "airports_metar.json"))["stations"]}
scored_c = set(json.load(open(HERE / "out" / "heat_region_season.json"))["stations_scored_C"])
obs = json.load(open(SCRATCH / "cache" / "obs_daily.json"))
files = sorted(glob.glob(str(SCRATCH / "ecmwf_ens" / "enfo_*.csv")))
log(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}: {len(files)} ENS runs =====")
METHODS = {"C0": 2.95, "C5": 2.44, "C6": 2.86}
recs = []
for f in files:
    run = dt.date(int(f[-12:-8]), int(f[-8:-6]), int(f[-6:-4]))
    vd = (run + dt.timedelta(days=1)).isoformat()
    v = defaultdict(dict)
    with open(f) as fh:
        for r in csv.DictReader(fh):
            v[(r["station"], int(r["member"]), int(r["step"]))][r["param"]] = float(r["value"]) - 273.15
    for sid in {k[0] for k in v}:
        m = meta.get(sid)
        if not m or m["sample"] == "excluded" or (m["sample"] == "C" and sid not in scored_c):
            continue
        o = obs.get(sid, {}).get(vd)
        if not o or o["himax"] is None:
            continue
        raw, c6 = [], []
        for mem in range(51):
            a, b = v.get((sid, mem, 30)), v.get((sid, mem, 33))
            if not a or not b or len(a) < 2 or len(b) < 2:
                continue
            raw.append(max(H.heat_index_c(x["2t"], rh(x["2t"], x["2d"])) for x in (a, b)))
            c6.append(max(H.heat_index_c(x["2t"] + 1.658, rh(x["2t"] + 1.658, x["2d"] + 1.491)) for x in (a, b)) + 0.898)
        if len(raw) < 40:
            continue
        mem = {"raw": raw, "C0": [10.375 + 0.8647 * x for x in raw], "C5": [0.560 + 1.0896 * x for x in raw], "C6": c6}
        rec = {"sid": sid, "sample": m["sample"], "region": m["region"], "date": vd, "obs": o["himax"], "n": len(raw), "rawP50": med(raw)}
        for k, sd in METHODS.items():
            vals = mem[k]
            p = {1: chance(vals, 27, sd), 2: chance(vals, 33, sd), 3: chance(vals, 42, sd)}
            likely = max([lv for lv, q in p.items() if q >= 0.5], default=0)
            possible = max([lv for lv, q in p.items() if q >= 0.2], default=0)
            rec[k] = {"p50": med(vals), "p10": dq(vals, 0.1, sd), "p90": dq(vals, 0.9, sd), "p33": p[2], "p42": p[3],
                      "level": 1 if possible >= 2 and likely < 1 else likely, "possible": possible}
        recs.append(rec)
log(f"station-days scored: {len(recs)}; members per station-day: min {min(r['n'] for r in recs)}")


def summary(R, k):
    n = len(R)
    e = [r[k]["p50"] - r["obs"] for r in R]
    cov = sum(r[k]["p10"] <= r["obs"] <= r[k]["p90"] for r in R) / n
    b33 = sum((r[k]["p33"] - (r["obs"] >= 33)) ** 2 for r in R) / n
    b42 = sum((r[k]["p42"] - (r["obs"] >= 42)) ** 2 for r in R) / n
    lv = [(r[k]["level"], level_of(r["obs"])) for r in R]
    ev42 = [r for r in R if r["obs"] >= 42]
    return {"n": n, "mae": sum(map(abs, e)) / n, "bias": sum(e) / n, "cover10_90": cov, "brier33": b33, "brier42": b42,
            "level_right": sum(a == b for a, b in lv) / n, "level_high": sum(a > b for a, b in lv) / n, "level_low": sum(a < b for a, b in lv) / n,
            "false_likely_warning": sum(r[k]["level"] >= 2 and r["obs"] < 33 for r in R) / n,
            "ge33_named": sum((r[k]["level"] >= 2 or r[k]["possible"] >= 2) for r in R if r["obs"] >= 33) / max(1, sum(r["obs"] >= 33 for r in R)),
            "ge42_events": len(ev42), "ge42_named": sum(r[k]["level"] >= 3 or r[k]["possible"] >= 3 for r in ev42),
            "false_named_danger": sum((r[k]["level"] >= 3 or r[k]["possible"] >= 3) and r["obs"] < 42 for r in R) / n}


out = {}
for gname, keep in (("all", lambda r: True), ("A+B", lambda r: r["sample"] in ("A", "B")), ("C (disjoint)", lambda r: r["sample"] == "C"),
                    ("D airports", lambda r: r["sample"] == "D"), ("North", lambda r: r["region"] == "North"),
                    ("Northeast", lambda r: r["region"] == "Northeast"), ("Central", lambda r: r["region"] == "Central"),
                    ("East", lambda r: r["region"] == "East"), ("South", lambda r: r["region"] == "South")):
    R = [r for r in recs if keep(r)]
    if not R:
        continue
    e = [r["rawP50"] - r["obs"] for r in R]
    log(f"\n[{gname}] n={len(R)}; raw ENS median: MAE {sum(map(abs, e)) / len(e):.2f}, bias {sum(e) / len(e):+.2f}")
    out[gname] = {}
    for k in METHODS:
        s = summary(R, k)
        out[gname][k] = s
        log(f"  {k}: median MAE {s['mae']:.2f} bias {s['bias']:+.2f} | 10–90 % range held {100 * s['cover10_90']:.0f} % | Brier ≥33 {s['brier33']:.3f} ≥42 {s['brier42']:.4f} | "
            f"level right {100 * s['level_right']:.0f} % high {100 * s['level_high']:.0f} % low {100 * s['level_low']:.0f} % | false likely เตือนภัย {100 * s['false_likely_warning']:.0f} % of days | "
            f"≥33 named {s['ge33_named']:.2f} | ≥42 named {s['ge42_named']}/{s['ge42_events']}, named and false {100 * s['false_named_danger']:.1f} %")
json.dump(out, open(OUT, "w"), indent=1)
log(f"wrote {OUT}")

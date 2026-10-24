"""POST-HOC candidate C6 (designed after the pre-registered run was read; its form was fixed before it was scored).

Why: the pre-registered run showed the model's own errors at 13:00/16:00 Bangkok are similar in every season
(T about −1.5 °C, Td about −0.6 to −1.8 °C), while the error of the heat index is not, because the heat index
amplifies T and Td errors in humid heat and barely in dry cool air. A line in heat-index space (the current one)
therefore adds about +5 °C all year — right in April, about 3–5 °C too much in December.
C6 corrects the inputs instead, with three national numbers fitted on the pre-registered fit period (2024-10-01..
2025-09-30, samples A+B, day 1 rows):
    T' = T + dT,  Td' = Td + dTd   (mean observed − model at 06 and 09 UTC)
    HI6 = max over 13:00/16:00 of NWS-HI(T', RH(T', Td'))  (+ c, the mean of observed daily max − HI6)
Day 2 uses the same three numbers refitted on day-2 rows. Scored with the pre-registered sets, against C0 (current)
and C5 (the pre-registered choice), deterministic bands and as the page grades (dressed, SD = C6's own fit-period
residual SD). It cannot ship from this run: it is post-hoc. It is the candidate to pre-register for an as-issued test.

    python3 -I research/heat_tdtd_posthoc.py
"""
import datetime as dt
import json
import math
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import heat_index as H  # noqa: E402

SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
LOG = open(HERE / "logs" / "heat_tdtd_posthoc-2026-10-24.log", "a")
CUR = {1: (10.375, 0.8647), 2: (11.689, 0.826)}
COOL = {11, 12, 1, 2}
R = json.load(open(HERE / "out" / "heat_region_season.json"))


def log(s=""):
    print(s)
    LOG.write(s + "\n")


def rh(t, td):
    a, b = 17.625, 243.04
    return max(0.0, min(100.0, 100.0 * math.exp(a * td / (b + td) - a * t / (b + t))))


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


meta = {s["id"]: s for s in json.load(open(HERE / "data" / "thai_stations_regions.json"))["stations"]
        + json.load(open(HERE / "data" / "airports_metar.json"))["stations"]}
fc = json.load(open(SCRATCH / "cache" / "fc_hi_ecmwf_points2.json"))["fc"]
obs = json.load(open(SCRATCH / "cache" / "obs_daily.json"))
scored_c = set(R["stations_scored_C"])
rows = []
for k, (hi, t1, td1, t2, td2, run) in fc.items():
    sid, d, lead = k.split("|")
    m = meta.get(sid)
    if not m or m["sample"] == "excluded" or (m["sample"] == "C" and sid not in scored_c):
        continue
    o = obs.get(sid, {}).get(d)
    if not o or o["himax"] is None:
        continue
    lead = int(lead)
    rows.append({"sid": sid, "sample": m["sample"], "region": m["region"], "date": d, "month": int(d[5:7]), "lead": lead,
                 "obs": o["himax"], "raw": hi, "t": (t1, t2), "td": (td1, td2), "ot": (o["t06"], o["t09"]), "otd": (o["td06"], o["td09"])})
log(f"\n===== POST-HOC C6 run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}: {len(rows)} station-day-leads =====")
FIT = ("2024-10-01", "2025-09-30")
for lead in (1, 2):
    L = [r for r in rows if r["lead"] == lead]
    fit = [r for r in L if r["sample"] in ("A", "B") and FIT[0] <= r["date"] <= FIT[1]]
    dT = [o - f for r in fit for o, f in zip(r["ot"], r["t"]) if o is not None]
    dTd = [o - f for r in fit for o, f in zip(r["otd"], r["td"]) if o is not None]
    bT, bTd = sum(dT) / len(dT), sum(dTd) / len(dTd)

    def hi6(r):
        return max(H.heat_index_c(t + bT, rh(t + bT, td + bTd)) for t, td in zip(r["t"], r["td"]))
    for r in L:
        r["h6"] = hi6(r)
    c = sum(r["obs"] - r["h6"] for r in fit) / len(fit)
    res = [r["obs"] - r["h6"] - c for r in fit]
    sd6 = math.sqrt(sum(x * x for x in res) / (len(res) - 1))
    c5 = R["partB"][f"day{lead}"]["fitted"]["C5"]
    a0, b0 = CUR[lead]
    for r in L:
        r["C6"] = r["h6"] + c
        r["C0"] = a0 + b0 * r["raw"]
        r["C5"] = c5["a"] + c5["b"] * r["raw"] if r["month"] in COOL else r["C0"]
    log(f"\nday {lead}: fitted on {len(fit)} rows (A+B, {FIT[0]}..{FIT[1]}): dT {bT:+.3f} °C, dTd {bTd:+.3f} °C (n={len(dT)} hours), "
        f"c {c:+.3f} °C; residual SD {sd6:.2f}")
    SD = {"C0": 2.95, "C5": None, "C6": sd6}
    for tname, keep in (("later, A+B", lambda r: r["sample"] in ("A", "B") and r["date"] >= "2025-10-01"),
                        ("later, C (disjoint)", lambda r: r["sample"] == "C" and r["date"] >= "2025-10-01"),
                        ("earlier, C (disjoint)", lambda r: r["sample"] == "C" and r["date"] < "2025-10-01"),
                        ("later, D airports", lambda r: r["sample"] == "D" and r["date"] >= "2025-10-01")):
        for seas, ms in (("all months", None), ("Nov–Feb", COOL), ("Mar–Oct", set(range(3, 11))), ("1–15 Nov + Feb", None)):
            if seas == "1–15 Nov + Feb":
                T = [r for r in L if keep(r) and ((r["month"] == 11 and int(r["date"][8:10]) <= 15) or r["month"] == 2)]
            else:
                T = [r for r in L if keep(r) and (ms is None or r["month"] in ms)]
            if not T:
                continue
            parts = []
            for k in ("C0", "C5", "C6"):
                e = [r[k] - r["obs"] for r in T]
                mae = sum(map(abs, e)) / len(e)
                bias = sum(e) / len(e)
                ev42 = [r for r in T if r["obs"] >= 42]
                hit42 = sum(r[k] >= 42 for r in ev42)
                fa42 = sum(r[k] >= 42 and r["obs"] < 42 for r in T)
                ev33 = [r for r in T if r["obs"] >= 33]
                hit33 = sum(r[k] >= 33 for r in ev33)
                fa33 = sum(r[k] >= 33 and r["obs"] < 33 for r in T)
                s = f"{k} MAE {mae:.2f} bias {bias:+.2f} | ≥33 POD {hit33 / len(ev33) if ev33 else float('nan'):.2f} false {100 * fa33 / len(T):.0f}% | ≥42 {hit42}/{len(ev42)} false {100 * fa42 / len(T):.1f}%"
                if k == "C6":  # graded as the page grades: ≥42 named when the dressed chance is >= 20 %
                    named = sum(1 - phi((42 - r["C6"]) / sd6) >= 0.2 for r in ev42)
                    s += f" (named as possible: {named}/{len(ev42)})"
                if k == "C0":
                    named0 = sum(1 - phi((42 - r["C0"]) / 2.95) >= 0.2 for r in ev42)
                    s += f" (named: {named0}/{len(ev42)})"
                parts.append(s)
            log(f"  [{tname} | {seas}] n={len(T)}\n    " + "\n    ".join(parts))

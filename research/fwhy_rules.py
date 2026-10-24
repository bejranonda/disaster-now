"""Hat Yai lead time, part 4: candidate rules for Thai Risk's "upstream water is coming" line, hour by hour on the
2024-25 water year and Nov 2025 (ThaiWater hourly; the measured 24 h change is level(t) - level(t-24), a stand-in
for FloodWatch's fitted qc.observed24).

Target gauge G = X.44 (Hat Yai city; FloodWatch's learned upstream list: X.90 6 h, X.174 7 h, SLA007 1 h, SLA002 11 h;
SLA007 is left out by the 3-48 h window, SLA002 was not fetched and was silent 19-23 Nov 2025) and G = X.90
(X.173A 7 h, X.174 5 h, SLA003 12 h; SLA002 1 h is its twin and left out).
Rules (fixed before scoring; thresholds are FloodWatch's own: status steps, UP_RISE_CM = 30 cm, lag 3-48 h):
  U-bank : a listed upstream gauge at or over its bank AND its 24 h rise >= 30 cm   -> Thai Risk "เตรียมตัว" line
  U-near : a listed upstream gauge at >= 90 % of its bank depth AND rise >= 30 cm   -> "ติดตามไว้" line
  FW-up  : FloodWatch's own upstream group (G at >= 70 % AND an upstream rise >= 30 cm)
  more   : G already over its bank AND an upstream gauge still rising >= 30 cm in 24 h  -> "more water is coming"
Data are taken as they were later recorded: real-time delays (KI-336) are not modelled here.

    nice -n 19 python3 -I research/fwhy_rules.py > <scratchpad>/agentA/logs/fwhy_rules-2026-10-24.log (logs stay out of the repository)
"""
from __future__ import annotations

import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fwhy_common import BANKS, fmt, hour_key, tw_series  # noqa: E402

H = lambda *a: hour_key(dt.datetime(*a))  # noqa: E731


def lvl(code, p):
    b = BANKS[code]
    return b["ground"] + p / 100 * (b["onwr"] - b["ground"])


def rise24(s, k):
    return s[k] - s[k - 24] if k in s and k - 24 in s else None


def run(name, s, G, ups, k0, k1, events):
    g = s[G]
    rules = {
        "U-bank": lambda k: any(k in s[u] and s[u][k] >= BANKS[u]["onwr"] and (rise24(s[u], k) or 0) >= 0.30 for u in ups),
        "U-near": lambda k: any(k in s[u] and s[u][k] >= lvl(u, 90) and (rise24(s[u], k) or 0) >= 0.30 for u in ups),
        "FW-up": lambda k: k in g and g[k] >= lvl(G, 70) and any((rise24(s[u], k) or 0) >= 0.30 for u in ups),
        "more": lambda k: k in g and g[k] >= BANKS[G]["onwr"] and any((rise24(s[u], k) or 0) >= 0.30 for u in ups),
    }
    print(f"\n== {name}: G {G}, upstream {ups}, {fmt(k0)} {dt.datetime(1970, 1, 1) + dt.timedelta(hours=k0):%Y} → {fmt(k1)} ==")
    for rn, f in rules.items():
        on = [k for k in range(k0, k1) if f(k)]
        eps = []
        for k in on:
            if eps and k - eps[-1][1] <= 72:
                eps[-1][1] = k
            else:
                eps.append([k, k])
        desc = []
        for a, b in eps:
            nxt = next((k for k in range(a, a + 49) if k in g and g[k] >= BANKS[G]["onwr"]), None)
            already = a in g and g[a] >= BANKS[G]["onwr"]
            tag = "G already over its bank" if already else (f"G over its bank {nxt - a:+d} h later" if nxt else "G stayed under its bank (48 h)")
            desc.append(f"{fmt(a)}–{fmt(b)} ({len([k for k in on if a <= k <= b])} h on; {tag})")
        print(f"{rn}: {len(eps)} episode(s): " + "; ".join(desc))
        for en, ek in events.items():
            first = next((k for k in on if k <= ek), None)
            print(f"   lead before {en}: {f'{ek - first:+d} h' if first is not None else 'none'}")


def main():
    y = {c: tw_series(f) for c, f in (("X.44", "X.44_long.json"), ("X.90", "X.90_y2425.json"),
                                      ("X.173A", "X.173A_y2425.json"), ("X.174", "X.174_y2425.json"))}
    e = {c: tw_series(f) for c, f in (("X.44", "X.44_2025.json"), ("X.90", "X.90_2025.json"),
                                      ("X.173A", "X.173A_2025.json"), ("X.174", "X.174_2025.json"),
                                      ("SLA003", "SLA003_2025.json"))}
    y0, y1 = H(2024, 10, 2, 1), H(2025, 9, 30, 23)
    run("2024-25 water year", y, "X.44", ["X.90", "X.174"], y0, y1, {"X.44 ≥ 7.15 on 29 Nov 2024 08:00": H(2024, 11, 29, 8)})
    run("2024-25 water year", y, "X.90", ["X.173A", "X.174"], y0, y1, {"X.90 ≥ 9.34 on 28 Nov 2024 15:00": H(2024, 11, 28, 15)})
    ev = {"E0 city flooding 21 Nov 15:00": H(2025, 11, 21, 15), "E1 X.44 ≥ 7.15 22 Nov 12:00": H(2025, 11, 22, 12),
          "E4 X.44 ≥ 8.68 24 Nov 16:00": H(2025, 11, 24, 16), "E5 peak 25 Nov 10:00": H(2025, 11, 25, 10)}
    run("Nov 2025", e, "X.44", ["X.90", "X.174"], H(2025, 11, 13, 1), H(2025, 12, 3, 23), ev)
    run("Nov 2025", e, "X.90", ["X.173A", "X.174", "SLA003"], H(2025, 11, 13, 1), H(2025, 12, 3, 23),
        {"X.90 ≥ 9.34 22 Nov 08:00": H(2025, 11, 22, 8), "X.44 ≥ 7.15 22 Nov 12:00": H(2025, 11, 22, 12)})


if __name__ == "__main__":
    main()

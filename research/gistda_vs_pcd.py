#!/usr/bin/env python3
"""GISTDA's PM2.5 estimate vs the PCD's stations, province by province, at one moment.

    python3 -I research/gistda_vs_pcd.py test/fixtures/gistda_prov.json test/fixtures/a4t.json

Inputs (committed fixtures, fetched 23 Oct 2026): GISTDA getPm25byProvince at 19:47 UTC (its "02:00Z" = 02:00 Bangkok,
24 Oct) and Air4Thai getNewAQI_JSON at 20:03 UTC (readings of 02:00–03:00 Bangkok). Both are 24-hour means: GISTDA's
pm25Avg24hr and Air4Thai's AQILast PM2.5 (the value PCD's colours are judged on). A station's province is the last part
of its areaTH; Bangkok stations are named by district ("เขต…"). Only stations read on 24 Oct count.
Result: research/logs/gistda-vs-pcd-2026-10-23.log; used in docs/KNOWLEDGE.md §5.
"""
import json
import statistics as st
import sys


def band(v):  # the app's level for a PCD band (0: blue/green, 1: yellow, 2: orange, 3: red)
    return 0 if v <= 25.0 else 1 if v <= 37.5 else 2 if v <= 75.0 else 3


def main(gpath, apath):
    g = {r["pv_tn"]: r for r in json.load(open(gpath, encoding="utf-8"))["data"]}
    stations = json.load(open(apath, encoding="utf-8"))["stations"]
    by_pv = {}
    for s in stations:
        a = s["AQILast"]
        v = float(a["PM25"]["value"])
        if v < 0 or a["date"] != "2026-10-24":
            continue
        pv = s["areaTH"].split(",")[-1].strip().replace("จ.", "")
        if "กรุงเทพ" in s["areaTH"]:
            pv = "กรุงเทพมหานคร"
        by_pv.setdefault(pv, []).append(v)
    pairs = sorted(((pv, st.median(vs), g[pv]["pm25Avg24hr"], len(vs)) for pv, vs in by_pv.items() if pv in g), key=lambda x: -x[3])
    ratios = [gv / pv for _, pv, gv, _ in pairs if pv > 0]
    q = st.quantiles(ratios, n=4)
    print(f"{len(pairs)} provinces with both; GISTDA/PCD ratio median {st.median(ratios):.2f}, IQR {q[0]:.2f}–{q[2]:.2f}, "
          f"min {min(ratios):.2f}, max {max(ratios):.2f}")
    same = sum(band(pv) == band(gv) for _, pv, gv, _ in pairs)
    higher = sum(band(gv) > band(pv) for _, pv, gv, _ in pairs)
    print(f"same app level in {same} of {len(pairs)}; GISTDA a level higher in {higher}, lower in {len(pairs) - same - higher}")
    print("province | PCD median of stations | GISTDA 24-h mean | stations")
    for pv, a, gv, n in pairs:
        print(f"{pv} | {a:.1f} | {gv:.1f} | {n}")


if __name__ == "__main__":
    main(*sys.argv[1:3])

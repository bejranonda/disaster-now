"""Numbers quoted in docs/research/model-check-2026-10-24.md §1.4 and §0, printed from their sources.
    python3 -I research/heat_sensitivity_check.py
"""
import json, math, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import heat_index as H  # noqa: E402
def rh(t, td):
    return max(0, min(100, 100 * math.exp(17.625 * td / (243.04 + td) - 17.625 * t / (243.04 + t))))
print("What the current line adds (a + b·HI − HI), day 1:", {x: round(10.375 + 0.8647 * x - x, 2) for x in (25, 30, 35, 40, 45)})
print("Heat-index change from the same input errors (T +1.66, Td +1.49 °C; the C6 day-1 terms):")
for t, td, what in ((33.0, 25.0, "humid hot afternoon, April-like"), (35.0, 24.0, "hot, humid"), (31.0, 17.0, "dry cool-season afternoon"), (29.0, 14.0, "dry December afternoon, north")):
    h0 = H.heat_index_c(t, rh(t, td))
    h1 = H.heat_index_c(t + 1.66, rh(t + 1.66, td + 1.49))
    print(f"  T {t}, Td {td} ({what}): HI {h0:.1f} → {h1:.1f}  (+{h1 - h0:.1f})")
R = json.load(open(HERE / "out" / "heat_region_season.json"))
A = R["partA"]["day1"]
print("Nov–Feb day-1 MAE / bias by region:", {reg: (round(A[f"all|{reg}|Nov–Feb"]["cur"]["mae"], 2), round(A[f"all|{reg}|Nov–Feb"]["cur"]["bias"], 2)) for reg in ("North", "Northeast", "Central", "East", "South", "ALL")})
print("stations in the per-station Nov–Feb table:", len(R["partA"]["per_station_cool_day1"]))
for lead in (1, 2):
    t = R["partB"][f"day{lead}"]["tests"]["later, C (disjoint)|Nov–Feb"]["scores"]
    for k in ("C0", "C5"):
        g = t[k]["ge33"]
        print(f"day {lead} {k}, later C Nov–Feb: forecasts >= 33 on {g['forecasts']}/{t[k]['n']} = {g['forecasts'] / t[k]['n']:.3f} of days; "
              f"observed >= 33 on {g['events']}/{t[k]['n']} = {g['events'] / t[k]['n']:.3f}; POD {g['POD']:.3f}")

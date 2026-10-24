"""POST-HOC detail for docs/research/model-check-2026-10-24.md: where and when the Nov–Feb days with an observed
daily-max heat index >= 42 °C fall (day-1 rows of research/data/model_check_daily.csv.gz), and what the current
line (C0) and the cool-season refit (C5) forecast on them.   python3 -I research/heat_cool_danger_days.py
"""
import csv, gzip, json, pathlib
from collections import Counter
HERE = pathlib.Path(__file__).resolve().parent
c5 = json.load(open(HERE / "out" / "heat_region_season.json"))["partB"]["day1"]["fitted"]["C5"]
rows = []
with gzip.open(HERE / "data" / "model_check_daily.csv.gz", "rt") as fh:
    for r in csv.DictReader(fh):
        m = int(r["date"][5:7])
        if r["lead"] == "1" and m in (11, 12, 1, 2):
            rows.append(r)
ev = [r for r in rows if float(r["obs_himax"]) >= 42]
print(f"Nov–Feb day-1 station-days: {len(rows)}; observed >= 42: {len(ev)}")
print("by region:", dict(Counter(r["region"] for r in ev)))
print("by month:", dict(Counter(r["date"][5:7] for r in ev)))
print("by half-month:", dict(sorted(Counter(r["date"][5:7] + ("a" if int(r["date"][8:10]) <= 15 else "b") for r in ev).items())))
print("by sample:", dict(Counter(r["sample"] for r in ev)))
share = {}
for reg in ("North", "Northeast", "Central", "East", "South"):
    n = sum(1 for r in rows if r["region"] == reg)
    k = sum(1 for r in ev if r["region"] == reg)
    share[reg] = f"{k}/{n} = {100 * k / n:.1f} %"
print("share of Nov–Feb days >= 42 by region:", share)
d0 = [float(r["fc_current"]) - float(r["obs_himax"]) for r in ev]
d5 = [c5["a"] + c5["b"] * float(r["fc_raw"]) - float(r["obs_himax"]) for r in ev]
print(f"on those days: mean error C0 {sum(d0) / len(d0):+.2f}, C5 {sum(d5) / len(d5):+.2f} °C; "
      f"C0 >= 42 on {sum(float(r['fc_current']) >= 42 for r in ev)}, C5 >= 42 on {sum(c5['a'] + c5['b'] * float(r['fc_raw']) >= 42 for r in ev)}")

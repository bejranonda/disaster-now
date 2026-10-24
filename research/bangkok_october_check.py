"""MODELS §1 says observed Bangkok October days reach >= 42 °C on 48 % of days, April days on 95 %. Recount from the
GHCNh daily maxima (station 48455, Bangkok Metropolis; the observation cache of research/heat_region_season.py).
    python3 -I research/bangkok_october_check.py
"""
import json, os, pathlib
from collections import defaultdict
SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
obs = json.load(open(SCRATCH / "cache" / "obs_daily.json"))["THM00048455"]
c = defaultdict(lambda: [0, 0, 0])
for d, v in obs.items():
    if v["himax"] is None:
        continue
    k = (d[:4], d[5:7])
    c[k][0] += 1
    c[k][1] += v["himax"] >= 42
    c[k][2] += v["himax"] >= 33
for m in ("04", "10", "11", "12", "01", "02"):
    tot = [0, 0, 0]
    parts = []
    for (y, mm), v in sorted(c.items()):
        if mm == m:
            parts.append(f"{y}: {v[1]}/{v[0]} ≥42, {v[2]}/{v[0]} ≥33")
            tot = [a + b for a, b in zip(tot, v)]
    if tot[0]:
        print(f"month {m}: {100 * tot[1] / tot[0]:.0f} % of {tot[0]} days ≥ 42, {100 * tot[2] / tot[0]:.0f} % ≥ 33  ({'; '.join(parts)})")

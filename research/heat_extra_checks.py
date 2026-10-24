"""Descriptive checks of the current heat line for docs/research/model-check-2026-10-24.md (day 1 rows of
research/data/model_check_daily.csv.gz; uses heat_region_season.made_worse, the protocol's rule).
 1. Stations the current line makes worse than raw HRES beyond chance, Nov–Feb and Mar–Oct (MODELS: 0 of 18, Mar–Oct).
 2. Chiang Mai airport (VTCC) and the northern stations in the second half of October (the §7.7 case).
    python3 -I research/heat_extra_checks.py
"""
import csv, gzip, pathlib, sys, datetime as dt
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import os
os.environ.setdefault("DN_CODE_TEST", "")  # heat_region_season writes nothing on import
from heat_region_season import made_worse  # noqa: E402
rows = []
with gzip.open(HERE / "data" / "model_check_daily.csv.gz", "rt") as fh:
    for r in csv.DictReader(fh):
        if r["lead"] != "1":
            continue
        rows.append({"station": r["station"], "sample": r["sample"], "region": r["region"], "date": dt.date.fromisoformat(r["date"]),
                     "obs": float(r["obs_himax"]), "raw": float(r["fc_raw"]), "cur": float(r["fc_current"])})
for name, months in (("Nov–Feb", {11, 12, 1, 2}), ("Mar–Oct", set(range(3, 11)))):
    worse = better = tot = 0
    wl = []
    for sid in sorted({r["station"] for r in rows}):
        sub = [r for r in rows if r["station"] == sid and r["date"].month in months]
        w = made_worse(sub, "cur", "raw")
        b = made_worse(sub, "raw", "cur")
        if w is None:
            continue
        tot += 1
        worse += w["worse"]
        better += b["worse"]
        if w["worse"]:
            wl.append(f"{sid[-5:] if sid.startswith('THM') else sid} {w['rise_pct']:+.0f}%")
    print(f"{name}: current line worse than raw beyond chance at {worse} of {tot} stations; raw worse than the line at {better}")
    if name == "Nov–Feb":
        print("  worse at: " + ", ".join(wl))
print()
for sid in ("VTCC", "VTCT", "THM00048304", "THM00048334", "THM00048310", "THM00048351"):
    for y in (2024, 2025, 2026):
        sub = [r for r in rows if r["station"] == sid and r["date"].year == y and r["date"].month == 10 and r["date"].day >= 16]
        if not sub:
            continue
        e = [r["cur"] - r["obs"] for r in sub]
        er = [r["raw"] - r["obs"] for r in sub]
        fa = sum(1 for r in sub if r["cur"] >= 33 and r["obs"] < 33)
        f42 = sum(1 for r in sub if r["cur"] >= 42 and r["obs"] < 42)
        print(f"{sid:12s} 16–31 Oct {y}: n={len(sub):2d}, obs mean {sum(r['obs'] for r in sub) / len(sub):.1f}, raw error {sum(er) / len(er):+.1f}, "
              f"corrected error {sum(e) / len(e):+.1f}, false ≥33 on {fa}, false ≥42 on {f42}, obs ≥42 on {sum(r['obs'] >= 42 for r in sub)}")

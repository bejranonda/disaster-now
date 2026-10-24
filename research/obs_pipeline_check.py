"""Check the plain-Python observation pipeline of research/heat_region_season.py against the earlier study's
pandas pipeline (research/data/e1e2_daily.csv, column himax = daily-max heat index, rounded to 0.1 °C).
    python3 -I research/obs_pipeline_check.py   (after heat_region_season.py has built its observation cache)
"""
import csv, json, os, pathlib
SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
HERE = pathlib.Path(__file__).resolve().parent
obs = json.load(open(SCRATCH / "cache" / "obs_daily.json"))
n = same = only_old = only_new = 0
diffs = []
for r in csv.DictReader(open(HERE / "data" / "e1e2_daily.csv")):
    o = obs.get(r["station"], {}).get(r["date"])
    new = o["himax"] if o else None
    old = float(r["himax"]) if r["himax"] else None
    if old is None and new is None:
        continue
    if old is None:
        only_new += 1
    elif new is None:
        only_old += 1
    else:
        n += 1
        diffs.append(new - old)
        same += abs(new - old) <= 0.051
print(f"station-days with a daily max in both: {n}; |new − old| <= 0.05 (rounding): {same}; max |diff| {max(map(abs, diffs)):.3f} °C")
print(f"only in the earlier file: {only_old}; only in the new pipeline: {only_new} (the GHCNh files were re-downloaded on 24 Oct; NCEI updates them)")
big = sorted(((abs(d), d) for d in diffs), reverse=True)[:5]
print("largest differences:", [round(d, 2) for _, d in big])

# forecasts: the Node GRIB reader (research/ecmwf_points.mjs + lib/grib2_ccsds.mjs) against the earlier eccodes values
fcf = SCRATCH / "cache" / "fc_hi_ecmwf_points2.json"
if fcf.exists():
    fc = json.load(open(fcf))["fc"]
    d2 = []
    for r in csv.DictReader(open(HERE / "data" / "e1e2_daily.csv")):
        if not r["hi_fc_day1"]:
            continue
        x = fc.get(f"{r['station']}|{r['date']}|1")
        if x:
            d2.append(x[0] - float(r["hi_fc_day1"]))
    print(f"day-1 forecast HI, Node GRIB reader vs the earlier eccodes values: {len(d2)} station-days, "
          f"within 0.05 °C (rounding): {sum(abs(d) <= 0.051 for d in d2)}, max |diff| {max(map(abs, d2)):.3f} °C")

# METAR (whole degrees, airports) vs the nearest TMD synoptic station (tenths): same day, daily-max heat index
PAIRS = [("VTCT", "THM00048304", "Chiang Rai airport vs Chiang Rai agromet, ~15 km"),
         ("VTSS", "THM00048571", "Hat Yai airport vs Kho Hong agromet, ~15 km"),
         ("VTSP", "THM00048564", "Phuket airport vs Phuket, ~27 km"),
         ("VTBD", "THM00048455", "Don Mueang vs Bangkok Metropolis, ~20 km")]
COOL = {"11", "12", "01", "02"}
for a, b, label in PAIRS:
    for name, keep in (("all months", lambda d: True), ("Nov–Feb", lambda d: d[5:7] in COOL)):
        pr = [(obs[a][d]["himax"], obs[b][d]["himax"]) for d in obs.get(a, {}) if keep(d) and d in obs.get(b, {})
              and obs[a][d]["himax"] is not None and obs[b][d]["himax"] is not None]
        if not pr:
            continue
        dd = [x - y for x, y in pr]
        print(f"{label}, {name}: n={len(pr)}, airport − station mean {sum(dd) / len(dd):+.2f} °C, mean |diff| {sum(map(abs, dd)) / len(dd):.2f}")

"""POST-HOC (added after the pre-registered run of research/heat_region_season.py had been read).

The pre-registered rule (3) judged the safety of a cool-season term by the band of the deterministic corrected value.
The page does not grade a heat window that way: it dresses the corrected members with a normal error and takes the
highest level that >= 50 % of the dressed mixture reaches ("likely"), noting a higher level reached by >= 20 %
("possible") and lifting a window to ติดตามไว้ when เตือนภัย or worse is only possible (outlook.windowLevel). This
script grades each Nov–Feb station-day that way, with the HRES value standing in for the ensemble median (the ensemble's
own spread is small next to the dressing: its 10–90 % range held 2 % of observations, MODELS §1), for
  C0 the current line, dressed with SD 2.95 (calibration.js);
  C1 the season offset and C5 the cool-season refit of the pre-registered run, each dressed with the SD of its own
     residuals on the fit period's Nov–Feb rows (samples A+B, 2024-11..2025-02) — no test data used to set it.
Scored on the disjoint sets of the pre-registered design (C later, C earlier, D airports later). Because this was added
after the results were seen, it cannot change the pre-registered verdict; it says what the page would show.

    python3 -I research/heat_cool_posthoc.py
"""
import csv
import gzip
import json
import math
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
R = json.load(open(HERE / "out" / "heat_region_season.json"))
COOL = {11, 12, 1, 2}
LOG = open(HERE / "logs" / "heat_cool_posthoc-2026-10-24.log", "a")


def log(s=""):
    print(s)
    LOG.write(s + "\n")


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def level_of(x):
    x = round(x, 1)
    return 3 if x >= 42 else 2 if x >= 33 else 1 if x >= 27 else 0


def page_level(m, sd):
    p = {1: 1 - phi((27 - m) / sd), 2: 1 - phi((33 - m) / sd), 3: 1 - phi((42 - m) / sd)}
    likely = max([lv for lv, q in p.items() if q >= 0.5], default=0)
    possible = max([lv for lv, q in p.items() if q >= 0.2], default=0)
    lvl = 1 if possible >= 2 and likely < 1 else likely
    return lvl, possible, p


rows = []
with gzip.open(HERE / "data" / "model_check_daily.csv.gz", "rt") as fh:
    for r in csv.DictReader(fh):
        m = int(r["date"][5:7])
        if m not in COOL:
            continue
        rows.append({**r, "month": m, "lead": int(r["lead"]), "obs": float(r["obs_himax"]), "raw": float(r["fc_raw"]),
                     "cur": float(r["fc_current"])})

log(f"\n===== POST-HOC run (cool-season grading as the page grades), {len(rows)} Nov–Feb station-day-leads =====")
for lead in (1, 2):
    B = R["partB"][f"day{lead}"]["fitted"]
    c5 = B["C5"]
    c1 = B["C1"]["cool"]
    L = [r for r in rows if r["lead"] == lead]
    for r in L:
        r["C0"] = r["cur"]
        r["C1"] = r["cur"] + c1
        r["C5"] = c5["a"] + c5["b"] * r["raw"]
    fit = [r for r in L if r["sample"] in ("A", "B") and "2024-11-01" <= r["date"] <= "2025-02-28"]
    sd = {"C0": 2.95}
    for k in ("C1", "C5"):
        e = [r["obs"] - r[k] for r in fit]
        mu = sum(e) / len(e)
        sd[k] = math.sqrt(sum((x - mu) ** 2 for x in e) / (len(e) - 1))
    log(f"\nday {lead}: dressing SD C0 {sd['C0']:.2f} (page), C1 {sd['C1']:.2f}, C5 {sd['C5']:.2f} (fit period Nov–Feb, A+B, n={len(fit)}); "
        f"C5 = {c5['a']:.3f} + {c5['b']:.4f}·HI_raw, C1 = current {c1:+.2f}")
    for tname, keep in (("later, C (disjoint)", lambda r: r["sample"] == "C" and r["date"] >= "2025-10-01"),
                        ("earlier, C (disjoint)", lambda r: r["sample"] == "C" and r["date"] < "2025-10-01"),
                        ("later, D airports", lambda r: r["sample"] == "D" and r["date"] >= "2025-10-01")):
        T = [r for r in L if keep(r)]
        log(f"  [{tname}] n={len(T)}; observed ≥33 on {sum(r['obs'] >= 33 for r in T)} days, ≥42 on {sum(r['obs'] >= 42 for r in T)}")
        for k in ("C0", "C1", "C5"):
            over = under = same = 0
            w33 = h33 = w42 = h42 = ev33 = ev42 = fl33 = fp33 = fl42 = 0
            bs33 = bs42 = 0.0
            for r in T:
                lvl, poss, p = page_level(r[k], sd[k])
                ol = level_of(r["obs"])
                same += lvl == ol
                over += lvl > ol
                under += lvl < ol
                o33, o42 = r["obs"] >= 33, r["obs"] >= 42
                ev33 += o33
                ev42 += o42
                warned33 = lvl >= 2 or poss >= 2          # the page says เตือนภัย is likely, or names it as possible
                warned42 = lvl >= 3 or poss >= 3
                h33 += o33 and warned33
                h42 += o42 and warned42
                fl33 += (not o33) and lvl >= 2             # เตือนภัย shown as the likely level, and it did not happen
                fp33 += (not o33) and warned33
                fl42 += (not o42) and (lvl >= 3 or poss >= 3)
                bs33 += (p[2] - o33) ** 2
                bs42 += (p[3] - o42) ** 2
            n = len(T)
            log(f"    {k}: level right {100 * same / n:4.1f} %, too high {100 * over / n:4.1f} %, too low {100 * under / n:4.1f} % | "
                f"≥33 named (likely or possible) on {h33}/{ev33} = {h33 / ev33:.2f} of the days that reached it; shown likely and false on "
                f"{100 * fl33 / n:4.1f} % of days, named and false on {100 * fp33 / n:4.1f} % | ≥42 named on {h42}/{ev42}"
                f"{'' if not ev42 else f' = {h42 / ev42:.2f}'}, named and false on {100 * fl42 / n:4.1f} % of days | "
                f"Brier ≥33 {bs33 / n:.3f}, ≥42 {bs42 / n:.4f}")

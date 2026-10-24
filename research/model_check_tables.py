"""Markdown tables for docs/research/model-check-2026-10-24.md from research/out/heat_region_season.json.

    python3 -I research/model_check_tables.py > research/logs/model_check_tables-2026-10-24.log

Every number in the report's heat tables is printed here; nothing is computed by hand.
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
R = json.load(open(HERE / "out" / "heat_region_season.json"))
A = R["partA"]
REG = ["North", "Northeast", "Central", "East", "South", "ALL"]
GR = ["Nov", "Dec", "Jan", "Feb", "Mar–May", "Jun–Sep", "Oct"]


def f(v, p=1, sign=False):
    if v is None:
        return "–"
    return f"{v:+.{p}f}" if sign else f"{v:.{p}f}"


def pct(v):
    return "–" if v is None else f"{100 * v:.0f}"


for lead in (1, 2):
    for scope in ("all", "oos"):
        d = A[f"day{lead}"]
        print(f"\n### Day {lead}, current correction, {'all rows' if scope == 'all' else 'out-of-sample rows only'}: mean error / MAE (n)\n")
        print("| Region | " + " | ".join(GR) + " |")
        print("|---|" + "---|" * len(GR))
        for reg in REG:
            cells = []
            for g in GR:
                s = d[f"{scope}|{reg}|{g}"]["cur"]
                cells.append("–" if not s.get("n") else f"{f(s['bias'], 1, True)} / {f(s['mae'])} ({s['n']})")
            print(f"| {reg} | " + " | ".join(cells) + " |")
    d = A[f"day{lead}"]
    print(f"\n### Day {lead}, bands and false alarms, all rows (current correction; raw and persistence for Nov–Feb)\n")
    print("| Region | Season | method | n | band right % | too high % | too low % | ≥33 events | POD≥33 | FAR≥33 | false ≥33, % of days | ≥42 events | POD≥42 | FAR≥42 | false ≥42, % of days |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for reg in REG:
        for g in ("Nov–Feb", "Mar–Oct"):
            for k in (("cur", "raw", "pers") if g == "Nov–Feb" else ("cur",)):
                s = d[f"all|{reg}|{g}"][k]
                if not s.get("n"):
                    continue
                a, b = s["ge33"], s["ge42"]
                print(f"| {reg} | {g} | {k} | {s['n']} | {pct(s['band_agree'])} | {pct(s['band_high'])} | {pct(s['band_low'])} | {a['events']} | "
                      f"{f(a['POD'], 2)} | {f(a['FAR'], 2)} | {pct(a['fa_share'])} | {b['events']} | {f(b['POD'], 2)} | {f(b['FAR'], 2)} | {pct(b['fa_share'])} |")

print("\n### Model − observed at 13:00/16:00 Bangkok, day 1 (°C)\n")
print("| Region | Nov–Feb T | Nov–Feb Td | Mar–Oct T | Mar–Oct Td |")
print("|---|---|---|---|---|")
for reg in REG[:-1]:
    c = A["model_minus_obs_1316"][f"{reg}|cool"]
    r = A["model_minus_obs_1316"][f"{reg}|rest"]
    print(f"| {reg} | {f(c['dT'], 1, True)} | {f(c['dTd'], 1, True)} | {f(r['dT'], 1, True)} | {f(r['dTd'], 1, True)} |")

print("\n### Per station, Nov–Feb, day 1, current correction\n")
print("| Station | sample | region | n | mean error | MAE | band right % | too high % | FAR≥33 | false ≥33 % of days | ≥42 events | false ≥42 % of days |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for sid, s in A["per_station_cool_day1"].items():
    print(f"| {sid[-5:] if sid.startswith('THM') else sid} {s['name'].title()} | {s['sample']} | {s['region']} | {s['n']} | {f(s['bias'], 1, True)} | {f(s['mae'])} | "
          f"{pct(s['band_agree'])} | {pct(s['band_high'])} | {f(s['ge33']['FAR'], 2)} | {pct(s['ge33']['fa_share'])} | {s['ge42']['events']} | {pct(s['ge42']['fa_share'])} |")

for lead in (1, 2):
    B = R["partB"][f"day{lead}"]
    print(f"\n### Part B, day {lead}: chosen {B['chosen']}; LOSO MAE (fit period) "
          + ", ".join(f"{k} {v:.3f}" for k, v in B["loso_mae"].items()) + "; Nov–Feb " + ", ".join(f"{k} {v:.3f}" for k, v in B["loso_mae_cool"].items()))
    print("\n| Test set | season | " + " | ".join(["C0 current", "C1 season", "C2 region", "C3 reg×season", "C4 month", "C5 cool refit", "raw", "persistence", "climatology"]) + " | Δ chosen − C0 [90 %] |")
    print("|---|---|" + "---|" * 10)
    for key, t in B["tests"].items():
        tn, seas = key.split("|")
        sc = t["scores"]
        cells = [("–" if not sc[k].get("n") else f"{sc[k]['mae']:.2f}") for k in ("C0", "C1", "C2", "C3", "C4", "C5", "raw", "pers", "clim")]
        dd = t["delta"].get(f"{B['chosen']}-C0")
        n = sc["C0"].get("n", 0)
        print(f"| {tn} (n={n}) | {seas} | " + " | ".join(cells) + f" | {'–' if not dd else f'{dd['delta']:+.2f} [{dd['lo90']:+.2f}, {dd['hi90']:+.2f}]'} |")
    print(f"\nship rule: {B['ship_rule']}; made worse (later, C+D): chosen vs C0 {B['made_worse_later_CD']['chosen_vs_C0']}, C0 vs chosen {B['made_worse_later_CD']['C0_vs_chosen']}")
    print("fitted terms: " + json.dumps(B["fitted"], ensure_ascii=False))

"""Hat Yai lead time, part 2: the triggers on other seasons.

Two records reach far beyond Nov 2025:
- RID's annual maxima at X.44, X.90, X.173A and X.174 (one value and date per water year; fwhy_common.ANNUAL_MAX):
  a level trigger "fired" in a season when the upstream gauge's maximum passed its threshold; the event is X.44's
  maximum over 7.15 (ONWR's bank, FloodWatch's) or 7.40 (RID's field bank, the city's).
- Hat Yai airport's daily rain (GHCN-Daily TH000048569, 1973 - Aug 2025; the date is the TMD rain day, 07:00 -> 07:00):
  rain triggers in Oct-Jan of every season with >= 90 % of the days on record, against X.44's annual maximum.

    nice -n 19 python3 -I research/fwhy_seasons.py > <scratchpad>/agentA/logs/fwhy_seasons-2026-10-24.log (logs stay out of the repository)

Scoring (per season, so read the counts as seasons, not independent cases):
- hit: an episode that starts 0-7 days before X.44's annual-maximum date, in a season whose maximum passed the bank;
- miss: such a season with no episode in that window;
- false alarm (certain): an episode in a season whose X.44 maximum stayed under the bank;
- outside (unknown): an episode in an event season but outside the window (another rise may have passed the bank).
Thresholds of the city's red flag (X.90 9.30 m, X.173A 16.4 m, rain 200 mm in a day or 300 mm in 3 days;
hatyaicityclimate.org/paper/620) and FloodWatch's status steps (70 % / 90 % of the bank depth) were fixed before
Nov 2025; anything else here is marked post-hoc.
"""
from __future__ import annotations

import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fwhy_common import BANKS, annual_max, ghcnd_daily  # noqa: E402


def pct(code, p):
    b = BANKS[code]
    return b["ground"] + p / 100 * (b["onwr"] - b["ground"])


def level_table():
    x44 = annual_max("X.44")
    print("== A. Level triggers against X.44's annual maximum (RID, water years; seasons by the year they start) ==")
    print("season: X.44 max (date) | X.90 | X.173A | X.174")
    ups = {c: annual_max(c) for c in ("X.90", "X.173A", "X.174")}
    for y in sorted(x44):
        lv, d = x44[y]
        row = [f"{y}: {lv:.2f} ({d:%d %b %Y})"]
        for c in ("X.90", "X.173A", "X.174"):
            v = ups[c].get(y)
            row.append(f"{v[0]:.2f} ({v[1]:%d %b})" if v else "–")
        print(" | ".join(row))
    trig = {
        "X.90 >= 8.00 (city yellow; the 6-h hold not checkable here)": ("X.90", 8.00, False),
        "X.90 >= 9.30 (city red)": ("X.90", 9.30, False), "X.90 >= 9.34 (ONWR bank)": ("X.90", 9.34, False),
        "X.90 at 90 % (8.32)": ("X.90", pct("X.90", 90), False), "X.90 at 70 % (6.27)": ("X.90", pct("X.90", 70), False),
        "X.173A >= 16.13 (bank)": ("X.173A", 16.13, False), "X.173A >= 16.4 (city red)": ("X.173A", 16.4, False),
        "X.173A at 90 % (14.89)": ("X.173A", pct("X.173A", 90), False),
        "X.174 >= 8.88 (bank)": ("X.174", 8.88, False),
        "X.44 at 70 % (4.34)": ("X.44", pct("X.44", 70), False), "X.44 at 90 % (6.21)": ("X.44", pct("X.44", 90), False),
        "X.44 city yellow (5.90)": ("X.44", 5.90, False),
    }
    for ev_thr in (7.15, 7.40):
        for span, (a, b) in {"all seasons on record": (1900, 2024), "2011-2024 (after 2010)": (2011, 2024)}.items():
            print(f"\n-- event X.44 >= {ev_thr}; seasons {span}, Nov 2025 left out --")
            print("trigger | seasons with both | hits | misses | false-alarm seasons | correct quiet | POD | false-alarm ratio")
            for nm, (c, thr, _) in trig.items():
                src = annual_max(c) if c != "X.44" else x44
                hit = miss = fa = cn = 0
                fa_years = []
                for y in sorted(set(src) & set(x44)):
                    if not (a <= y <= b):
                        continue
                    ev = x44[y][0] >= ev_thr
                    fired = src[y][0] >= thr
                    hit += ev and fired
                    miss += ev and not fired
                    fa += fired and not ev
                    cn += not ev and not fired
                    if fired and not ev:
                        fa_years.append(f"{y} ({x44[y][0]:.2f})")
                n = hit + miss + fa + cn
                pod = f"{hit / (hit + miss):.2f}" if hit + miss else "–"
                far = f"{fa / (hit + fa):.2f}" if hit + fa else "–"
                print(f"{nm} | {n} | {hit} | {miss} | {fa} {fa_years} | {cn} | {pod} | {far}")


def episodes_daily(days: list[tuple[dt.date, float]], thr: float, sep_days: int = 3):
    out = []
    for d, v in days:
        if v >= thr:
            if out and (d - out[-1][1]).days <= sep_days:
                out[-1][1] = d
            else:
                out.append([d, d])
    return out


MIN_COVER = 0.6


def rain_table():
    daily = ghcnd_daily("TH000048569")
    x44 = annual_max("X.44")
    print("\n== B. Rain triggers at Hat Yai airport (GHCN-Daily rain day), Oct-Jan, against X.44's annual maximum ==")
    trig = {"1-day >= 100 (city yellow is a basin mean > 100 mm/day; one gauge here)": (1, 100), "1-day >= 150": (1, 150), "1-day >= 200 (city red)": (1, 200), "2-day >= 200": (2, 200),
            "3-day >= 250": (3, 250), "3-day >= 300 (city red)": (3, 300), "3-day >= 400": (3, 400)}
    seasons = []
    for y in sorted(x44):
        if y > 2024:
            continue
        d0, d1 = dt.date(y, 10, 1), dt.date(y + 1, 1, 31)
        n_days = (d1 - d0).days + 1
        have = sum(1 for k in range(n_days) if d0 + dt.timedelta(days=k) in daily)
        seasons.append((y, have / n_days))
    ok = [y for y, f in seasons if f >= MIN_COVER]
    print(f"seasons with >= {MIN_COVER:.0%} of Oct-Jan days on record: {len(ok)} of {len(seasons)}: {ok}")
    print(f"left out (coverage): {[(y, round(f, 2)) for y, f in seasons if f < MIN_COVER]}")
    print("(a sum needs every day of its window: gaps can only hide episodes, so false alarms are lower bounds and a "
          "'miss' may be a gap; each event season's last 8 days are printed below)")
    for y in ok:
        lv, dm = x44[y]
        if lv >= 6.2:
            w = [dm - dt.timedelta(days=k) for k in range(7, -1, -1)]
            print(f"  {y} X.44 {lv:.2f} on {dm}: " + " ".join(f"{daily[x]:.0f}" if x in daily else "–" for x in w))
    for ev_thr in (7.15, 7.40):
        ev_seasons = [y for y in ok if x44[y][0] >= ev_thr]
        print(f"\n-- event X.44 >= {ev_thr}: event seasons in the sample {ev_seasons} (Nov 2025 left out) --")
        print("trigger | episodes / season (all) | hits [lead in days before the X.44 max] | misses | false alarms (certain, in quiet seasons) | outside the window in event seasons | POD | FAR (certain)")
        for nm, (nd, thr) in trig.items():
            hits, misses, fa, outside, n_ep = [], [], 0, 0, 0
            fa_list = []
            for y in ok:
                d0, d1 = dt.date(y, 10, 1), dt.date(y + 1, 1, 31)
                seq = []
                for k in range((d1 - d0).days + 1):
                    d = d0 + dt.timedelta(days=k)
                    vals = [daily.get(d - dt.timedelta(days=j)) for j in range(nd)]
                    if all(v is not None for v in vals):
                        seq.append((d, sum(vals)))
                eps = episodes_daily(seq, thr)
                n_ep += len(eps)
                lv, dmax = x44[y]
                if lv >= ev_thr:
                    win = [e for e in eps if 0 <= (dmax - e[0]).days <= 7]
                    if win:
                        hits.append(f"{y}:{(dmax - win[0][0]).days} d")
                    else:
                        misses.append(str(y))
                    outside += len(eps) - len(win)
                else:
                    fa += len(eps)
                    fa_list += [f"{e[0]:%Y-%m-%d} ({lv:.2f})" for e in eps]
            pod = f"{len(hits) / (len(hits) + len(misses)):.2f}" if hits or misses else "–"
            far = f"{fa / (len(hits) + fa):.2f}" if hits or fa else "–"
            print(f"{nm} | {n_ep / len(ok):.2f} | {len(hits)} {hits} | {len(misses)} {misses} | {fa} | {outside} | {pod} | {far}")
            if ev_thr == 7.15:
                print(f"     false-alarm episodes (season: X.44 max): {fa_list}")


def case2025():
    daily = ghcnd_daily("TH000048569")
    last = max(daily)
    print(f"\nGHCN-Daily TH000048569 ends {last}: Nov 2025 is not in it (the 2025 case uses GHCNh in fwhy_hydro.py).")


if __name__ == "__main__":
    level_table()
    rain_table()
    case2025()

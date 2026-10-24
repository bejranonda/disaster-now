"""Hat Yai lead time, part 1: the U-Taphao hydrographs of Nov 2025 and Nov 2024 from ThaiWater, threshold crossings,
travel times (crossings, wave peaks, cross-correlation of rises) and the lead each simple trigger would have given.

    nice -n 19 python3 -I research/fwhy_hydro.py > <scratchpad>/agentA/logs/fwhy_hydro-2026-10-24.log (logs stay out of the repository)

Inputs: research/fwhy_common.py (ThaiWater answers and GHCNh files in the session scratchpad). Times ICT.
"""
from __future__ import annotations

import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fwhy_common import (BANKS, episodes, first_cross, fmt, ghcnh_p24, hour_key, key_time, roll, tw_series)  # noqa: E402

H = lambda *a: hour_key(dt.datetime(*a))  # noqa: E731


def pct_level(code: str, pct: float, bank_key: str = "onwr") -> float:
    b = BANKS[code]
    return b["ground"] + pct / 100 * (b[bank_key] - b["ground"])


def peaks(s: dict[int, float], start: int, end: int, win: int = 18) -> list[tuple[int, float]]:
    """Local maxima: the highest value within +-win hours."""
    ks = [k for k in sorted(s) if start <= k <= end]
    out = []
    for k in ks:
        nb = [s[j] for j in range(k - win, k + win + 1) if j in s]
        if s[k] == max(nb) and (not out or k - out[-1][0] > win):
            out.append((k, s[k]))
    return out


def xcorr(a: dict[int, float], b: dict[int, float], start: int, end: int, step: int = 3, max_lag: int = 30):
    """Correlation of b's `step`-h rise at t with a's `step`-h rise at t - lag (a leads b by lag), lags 0..max_lag."""
    def d(s, k):
        return s[k] - s[k - step] if k in s and k - step in s else None
    res = []
    for lag in range(0, max_lag + 1):
        xs, ys = [], []
        for k in range(start, end + 1):
            x, y = d(a, k - lag), d(b, k)
            if x is not None and y is not None:
                xs.append(x)
                ys.append(y)
        n = len(xs)
        if n < 30:
            res.append((lag, None, n))
            continue
        mx, my = sum(xs) / n, sum(ys) / n
        sx = sum((x - mx) ** 2 for x in xs) ** 0.5
        sy = sum((y - my) ** 2 for y in ys) ** 0.5
        r = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy) if sx and sy else None
        res.append((lag, r, n))
    best = max((x for x in res if x[1] is not None), key=lambda x: x[1], default=None)
    return best, res


def held(ser, thr, hours, a, b):
    """The hour a level has been at or over thr for `hours` consecutive hours (a missing hour breaks the run)."""
    run = 0
    for k in range(a, b + 1):
        run = run + 1 if ser.get(k, -99) >= thr else 0
        if run >= hours:
            return k
    return None


def lead(trigger: int | None, event: int | None) -> str:
    if trigger is None:
        return "never fired"
    if event is None:
        return "event not reached"
    return f"{event - trigger:+d} h"


def event_block(year: int, files: dict[str, str], t0: int, t1: int):
    s = {c: tw_series(f) for c, f in files.items()}
    print(f"\n######## {year}: ThaiWater hourly levels, window {fmt(t0)} → {fmt(t1)} ICT ########")
    for c, ser in s.items():
        ks = [k for k in ser if t0 <= k <= t1]
        miss = (t1 - t0 + 1) - len(ks)
        pk = max(ks, key=lambda k: ser[k]) if ks else None
        print(f"{c:7s} hours with a value {len(ks)} of {t1 - t0 + 1} (missing {miss}); peak {ser[pk]:.2f} at {fmt(pk)}")

    # 1. crossings
    print("\n-- first crossing after the window start (ICT); 70 % / 90 % are FloodWatch's status steps on ONWR's bank --")
    cross = {}
    for c, ser in s.items():
        b = BANKS[c]
        thr = {"70 %": pct_level(c, 70), "90 %": pct_level(c, 90), "ONWR bank": b["onwr"]}
        for k in ("rid_field", "city_red", "rid_hydro"):
            if k in b and b[k] != b["onwr"]:
                thr[{"rid_field": "RID field bank", "city_red": "city red flag", "rid_hydro": "RID hydro bank"}[k]] = b[k]
        if c == "X.44":
            thr["city yellow (7.40 - 1.5)"] = 7.40 - 1.5
        cross[c] = {}
        row = []
        for nm, v in sorted(thr.items(), key=lambda x: x[1]):
            k = first_cross(ser, v, t0, t1)
            cross[c][nm] = k
            row.append(f"{nm} {v:.2f}: {fmt(k)}")
        print(f"{c:7s} " + " · ".join(row))

    # 2. waves at X.44 and the peaks upstream
    print("\n-- local peaks (highest within ±18 h) --")
    for c, ser in s.items():
        pk = [p for p in peaks(ser, t0, t1) if p[1] > pct_level(c, 50)]
        print(f"{c:7s} " + "; ".join(f"{v:.2f} at {fmt(k)}" for k, v in pk))

    # 3. cross-correlation of 3-h rises over the event window
    print("\n-- cross-correlation of 3-h rises (upstream leads downstream by `lag`), window as above --")
    pairs = [("SLA003", "X.173A"), ("X.173A", "X.90"), ("SLA003", "X.90"), ("X.90", "X.44"), ("X.173A", "X.44"),
             ("SLA003", "X.44"), ("X.174", "X.44")]
    for a, b in pairs:
        if a in s and b in s:
            best, res = xcorr(s[a], s[b], t0, t1)
            near = [f"{lag}:{r:.2f}" for lag, r, n in res if r is not None and best and r >= best[1] - 0.05]
            print(f"{a:6s} → {b:6s}: best lag {best[0]} h (r {best[1]:.2f}, n {best[2]}); lags within 0.05 of the best: {', '.join(near)}")
    return s, cross


def main():
    # ---------------- Nov 2025 ----------------
    f25 = {"SLA003": "SLA003_2025.json", "X.173A": "X.173A_2025.json", "X.90": "X.90_2025.json",
           "X.174": "X.174_2025.json", "X.44": "X.44_2025.json"}
    t0, t1 = H(2025, 11, 18), H(2025, 11, 28)
    s, cr = event_block(2025, f25, t0, t1)
    x44 = s["X.44"]
    # the second wave: the trough between the waves and the second crossing of each bank
    trough = min((k for k in x44 if H(2025, 11, 23) <= k <= H(2025, 11, 24, 6)), key=lambda k: x44[k])
    print(f"\nX.44 trough between the waves: {x44[trough]:.2f} at {fmt(trough)}")
    events = {
        "E1 X.44 ≥ 7.15 (ONWR bank, FloodWatch)": cr["X.44"]["ONWR bank"],
        "E2 X.44 ≥ 7.40 (RID field bank / city)": cr["X.44"]["RID field bank"],
        "E3 X.44 ≥ 7.40 again, wave 2": first_cross(x44, 7.40, trough, t1),
        "E4 X.44 ≥ 8.68 (RID hydro bank)": cr["X.44"]["RID hydro bank"],
        "E5 X.44 peak 9.97": max((k for k in x44 if t0 <= k <= t1), key=lambda k: x44[k]),
        "E0 city flooding from Kho Hong runoff (DWR: 21 Nov 15:00; RID: the night of 21 Nov)": H(2025, 11, 21, 15),
    }
    for k, v in events.items():
        print(f"{k}: {fmt(v)}")

    # rain at Hat Yai airport, Kho Hong, Sadao (GHCNh rolling 24 h, ICT)
    rain = {}
    for sid, nm in (("THU048569-1", "Hat Yai airport 48569"), ("THM00048571", "Kho Hong 48571"), ("THM00048574", "Sadao 48574")):
        p24 = ghcnh_p24(sid, [2024, 2025])
        rain[nm] = {1: p24, 2: roll(p24, 2), 3: roll(p24, 3)}
    print("\n-- measured rain triggers, first hour (ICT, from 17 Nov) the rolling total reached the threshold --")
    rtrig = {}
    for nm, r in rain.items():
        row = []
        for days, thr in ((1, 90), (1, 150), (1, 200), (2, 200), (3, 150), (3, 250), (3, 300), (3, 400)):
            k = first_cross(r[days], thr, H(2025, 11, 17), t1)
            rtrig[(nm, days, thr)] = k
            row.append(f"{24 * days} h ≥ {thr}: {fmt(k)}")
        print(f"{nm}: " + " · ".join(row))

    # the city's yellow flag: X.90 at +8.00 m for 6 consecutive hours (hatyaicityclimate.org/paper/620)
    yellow25 = held(s["X.90"], 8.00, 6, t0, t1)
    # leads of the triggers
    trig = {
        "X.90 ≥ 8.00 for 6 h (city yellow)": yellow25,
        "X.44 at 70 % (FloodWatch 'watch')": cr["X.44"]["70 %"],
        "X.44 at 90 % (FloodWatch 'warning')": cr["X.44"]["90 %"],
        "X.44 1.5 m under RID's 7.40 (city yellow)": cr["X.44"]["city yellow (7.40 - 1.5)"],
        "X.174 (Khlong Wa) over its bank": cr["X.174"]["ONWR bank"],
        "X.90 at 90 %": cr["X.90"]["90 %"],
        "X.90 ≥ 9.30 (city red criterion)": cr["X.90"]["city red flag"],
        "X.90 over ONWR bank 9.34": cr["X.90"]["ONWR bank"],
        "X.173A at 90 %": cr["X.173A"]["90 %"],
        "X.173A over its bank 16.13": cr["X.173A"]["ONWR bank"],
        "X.173A ≥ 16.4 (city red criterion)": cr["X.173A"]["city red flag"],
        "SLA003 at 90 %": cr["SLA003"]["90 %"],
        "SLA003 over its bank 16.59": cr["SLA003"]["ONWR bank"],
        "Hat Yai airport 24 h ≥ 200 mm (city red criterion)": rtrig[("Hat Yai airport 48569", 1, 200)],
        "Hat Yai airport 72 h ≥ 300 mm (city red criterion)": rtrig[("Hat Yai airport 48569", 3, 300)],
        "Hat Yai airport 24 h ≥ 150 mm": rtrig[("Hat Yai airport 48569", 1, 150)],
        "Hat Yai airport 72 h ≥ 250 mm": rtrig[("Hat Yai airport 48569", 3, 250)],
        "Sadao 72 h ≥ 250 mm": rtrig[("Sadao 48574", 3, 250)],
        "Kho Hong 72 h ≥ 250 mm": rtrig[("Kho Hong 48571", 3, 250)],
    }
    print("\n-- 2025: lead of each trigger before each X.44 event (positive = warning ahead) --")
    evk = list(events)
    print("trigger | fired | " + " | ".join(e.split(" ")[0] for e in evk))
    for nm, k in trig.items():
        print(f"{nm} | {fmt(k)} | " + " | ".join(lead(k, events[e]) for e in evk))

    # hourly table for the report: every 3 h, 20-25 Nov
    print("\n-- hourly levels every 3 h (m MSL) and Hat Yai airport rolling 24 / 72 h rain (mm) --")
    print("time | SLA003 | X.173A | X.90 | X.174 | X.44 | HY 24 h | HY 72 h | Sadao 72 h")
    for k in range(H(2025, 11, 19), H(2025, 11, 26, 1), 3):
        def v(c):
            return f"{s[c][k]:.2f}" if k in s[c] else "–"
        def rr(nm, d):
            x = rain[nm][d].get(k) or rain[nm][d].get(k - 1) or rain[nm][d].get(k + 1)
            return f"{x:.0f}" if x is not None else "–"
        print(f"{fmt(k)} | {v('SLA003')} | {v('X.173A')} | {v('X.90')} | {v('X.174')} | {v('X.44')} | "
              f"{rr('Hat Yai airport 48569', 1)} | {rr('Hat Yai airport 48569', 3)} | {rr('Sadao 48574', 3)}")

    # ---------------- Nov 2024 (the out-of-sample event) ----------------
    f24 = {"X.173A": "X.173A_y2425.json", "X.90": "X.90_y2425.json", "X.44": "X.44_long.json"}
    t0b, t1b = H(2024, 11, 20), H(2024, 12, 6)
    s24, cr24 = event_block(2024, f24, t0b, t1b)
    ev24 = {"X.44 ≥ 7.15": cr24["X.44"]["ONWR bank"], "X.44 ≥ 7.40": cr24["X.44"]["RID field bank"],
            "X.44 peak": max((k for k in s24["X.44"] if t0b <= k <= t1b), key=lambda k: s24["X.44"][k])}
    trig24 = {"X.90 ≥ 8.00 for 6 h (city yellow)": held(s24["X.90"], 8.00, 6, t0b, t1b), "X.44 at 70 %": cr24["X.44"]["70 %"], "X.44 at 90 %": cr24["X.44"]["90 %"],
              "X.90 ≥ 9.30 (city red)": cr24["X.90"]["city red flag"], "X.90 over 9.34": cr24["X.90"]["ONWR bank"],
              "X.173A at 90 %": cr24["X.173A"]["90 %"], "X.173A over 16.13": cr24["X.173A"]["ONWR bank"],
              "X.173A ≥ 16.4 (city red)": cr24["X.173A"]["city red flag"]}
    for days, thr in ((1, 150), (1, 200), (3, 250), (3, 300)):
        trig24[f"Hat Yai airport {24 * days} h ≥ {thr}"] = first_cross(rain["Hat Yai airport 48569"][days], thr, H(2024, 11, 20), t1b)
        trig24[f"Sadao {24 * days} h ≥ {thr}"] = first_cross(rain["Sadao 48574"][days], thr, H(2024, 11, 20), t1b)
    print("\n-- 2024: lead of each trigger --")
    print("trigger | fired | " + " | ".join(ev24))
    for nm, k in trig24.items():
        print(f"{nm} | {fmt(k)} | " + " | ".join(lead(k, ev24[e]) for e in ev24))
    print("events 2024: " + "; ".join(f"{e} {fmt(k)}" for e, k in ev24.items()))

    # ---------------- false alarms of the level triggers over the whole 2024-25 hydrological year ----------------
    print("\n-- 2024-25 year (1 Oct 2024 → 30 Sep 2025): separate episodes (72 h apart) of each level trigger, and "
          "whether X.44 reached 7.15 / 7.40 within 48 h of the episode start --")
    y0, y1 = H(2024, 10, 1, 1), H(2025, 9, 30, 23)
    x = s24["X.44"]
    for nm, (c, v) in {"X.173A ≥ 16.13": ("X.173A", 16.13), "X.173A ≥ 16.4": ("X.173A", 16.4),
                       "X.173A at 90 % (14.87)": ("X.173A", pct_level("X.173A", 90)),
                       "X.90 ≥ 9.30": ("X.90", 9.30), "X.90 at 90 % (8.32)": ("X.90", pct_level("X.90", 90)),
                       "X.44 at 70 % (4.34)": ("X.44", pct_level("X.44", 70)),
                       "X.44 at 90 % (6.21)": ("X.44", pct_level("X.44", 90))}.items():
        eps = episodes(s24[c], v, y0, y1)
        desc = []
        for a, b in eps:
            hit1 = first_cross(x, 7.15, a, a + 48)
            hit2 = first_cross(x, 7.40, a, a + 48)
            desc.append(f"{fmt(a)} ({key_time(a).year}) → 7.15 {lead(a, hit1) if hit1 else 'no'} / 7.40 {lead(a, hit2) if hit2 else 'no'}")
        print(f"{nm}: {len(eps)} episode(s): " + "; ".join(desc))
    for nm in rain:
        for days, thr in ((1, 150), (1, 200), (3, 250), (3, 300)):
            eps = episodes(rain[nm][days], thr, y0, y1)
            desc = [f"{fmt(a)} ({key_time(a).year}) → 7.15 {'yes ' + lead(a, first_cross(x, 7.15, a, a + 72)) if first_cross(x, 7.15, a, a + 72) else 'no'}"
                    for a, b in eps]
            print(f"{nm} {24 * days} h ≥ {thr}: {len(eps)} episode(s): " + "; ".join(desc))


if __name__ == "__main__":
    main()

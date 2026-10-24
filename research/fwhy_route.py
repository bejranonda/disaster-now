"""Hat Yai lead time, part 3: how much lead could a simple model reach with upstream LEVELS and MEASURED rain?

An independent check, not FloodWatch's model. Ridge regression (pure Python) of X.44's change over the next h hours
on what is known at hour t:
  M0 "own": X.44 level, its 3 h and 6 h change;
  M1 "+upstream": M0 + X.90 and X.173A levels and their 6 h changes;
  M2 "+rain": M1 + Hat Yai airport's measured rolling 24 h and 72 h rain (GHCNh);
trained on 1 Oct 2024 - 30 Sep 2025 (ThaiWater hourly; the Nov 2024 flood is the only bank-high event in it) and
tested on 12 Nov - 3 Dec 2025 (a later water year: out of sample). The alarm is "the median path reaches the bank
within h hours". A data delay d (RID's hourly readings often arrive hours late, KI-336/KI-545) is simulated by
feeding the model only what was measured by t - d while the alarm is still raised at t.

    nice -n 19 python3 -I research/fwhy_route.py > <scratchpad>/agentA/logs/fwhy_route-2026-10-24.log (logs stay out of the repository)

One event out of sample: read the leads as an illustration of what upstream levels and rain can add, not a skill score.
"""
from __future__ import annotations

import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fwhy_common import fmt, ghcnh_p24, hour_key, roll, tw_series  # noqa: E402

H = lambda *a: hour_key(dt.datetime(*a))  # noqa: E731
RIDGE = 1.0


def solve(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c and M[c][c]:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


def ridge_fit(X, y):
    m = len(X[0])
    mu = [sum(r[j] for r in X) / len(X) for j in range(m)]
    sd = [max(1e-9, (sum((r[j] - mu[j]) ** 2 for r in X) / len(X)) ** 0.5) for j in range(m)]
    Z = [[(r[j] - mu[j]) / sd[j] for j in range(m)] for r in X]
    ym = sum(y) / len(y)
    A = [[sum(z[i] * z[j] for z in Z) + (RIDGE if i == j else 0.0) for j in range(m)] for i in range(m)]
    b = [sum(z[i] * (yy - ym) for z, yy in zip(Z, y)) for i in range(m)]
    w = solve(A, b)
    return lambda r: ym + sum(w[j] * (r[j] - mu[j]) / sd[j] for j in range(m))


def feats(k, s, rain, model):
    x44, x90, x173 = s["X.44"], s["X.90"], s["X.173A"]
    need = [(x44, k), (x44, k - 3), (x44, k - 6)]
    if model >= 1:
        need += [(x90, k), (x90, k - 6), (x173, k), (x173, k - 6)]
    if any(kk not in ser for ser, kk in need):
        return None
    f = [x44[k], x44[k] - x44[k - 3], x44[k] - x44[k - 6]]
    if model >= 1:
        f += [x90[k], x90[k] - x90[k - 6], x173[k], x173[k] - x173[k - 6]]
    if model >= 2:
        p24 = next((rain[1][k + j] for j in (0, -1, -2, -3) if k + j in rain[1]), None)
        p72 = next((rain[3][k + j] for j in (0, -1, -2, -3) if k + j in rain[3]), None)
        if p24 is None or p72 is None:
            return None
        f += [p24, p72]
    return f


def main():
    tr = {"X.44": tw_series("X.44_long.json"), "X.90": tw_series("X.90_y2425.json"), "X.173A": tw_series("X.173A_y2425.json")}
    te = {"X.44": tw_series("X.44_2025.json"), "X.90": tw_series("X.90_2025.json"), "X.173A": tw_series("X.173A_2025.json")}
    p24 = ghcnh_p24("THU048569-1", [2024, 2025])
    rain = {1: p24, 3: roll(p24, 3)}
    tr0, tr1 = H(2024, 10, 2), H(2025, 9, 29)
    te0, te1 = H(2025, 11, 13), H(2025, 12, 1)
    events = {"E1 7.15 (22 Nov 12:00)": H(2025, 11, 22, 12), "E2 7.40 (22 Nov 13:00)": H(2025, 11, 22, 13),
              "E3 7.40 wave 2 (23 Nov 22:00)": H(2025, 11, 23, 22), "E4 8.68 (24 Nov 16:00)": H(2025, 11, 24, 16)}
    for h in (6, 12):
        for model, name in ((0, "M0 own"), (1, "M1 +upstream levels"), (2, "M2 +upstream +measured rain")):
            X, y = [], []
            for k in range(tr0, tr1):
                f = feats(k, tr, rain, model)
                if f is None or k + h not in tr["X.44"]:
                    continue
                X.append(f)
                y.append(tr["X.44"][k + h] - tr["X.44"][k])
            fit = ridge_fit(X, y)
            # training-year check: hours when the alarm (path reaches 7.15 within h) fired, and the Nov 2024 crossing
            def alarm_hours(series, k0, k1, d, bank):
                out = []
                for k in range(k0, k1):
                    f = feats(k - d, series, rain, model)
                    if f is None:
                        continue
                    pred = series["X.44"][k - d] + fit(f)
                    if pred >= bank and series["X.44"].get(k, 0) < bank:
                        out.append(k)
                return out
            tr_alarm = alarm_hours(tr, tr0 + 12, tr1, 0, 7.15)
            eps = []
            for k in tr_alarm:
                if not eps or k - eps[-1][1] > 72:
                    eps.append([k, k])
                else:
                    eps[-1][1] = k
            print(f"\n== h {h} h, {name}: {len(X)} training rows; in the training year the alarm (7.15) fired in "
                  f"{len(eps)} episode(s): " + "; ".join(fmt(a) + f" ({dt.datetime(1970, 1, 1) + dt.timedelta(hours=a):%Y})" for a, _ in eps))
            # mean error on the 2025 rise (issued 19 Nov 00:00 - 25 Nov 10:00)
            errs = []
            for k in range(H(2025, 11, 19), H(2025, 11, 25, 10)):
                f = feats(k, te, rain, model)
                if f is None or k + h not in te["X.44"]:
                    continue
                errs.append(te["X.44"][k + h] - (te["X.44"][k] + fit(f)))
            if errs:
                print(f"   2025 rise: mean error (actual - forecast) {sum(errs) / len(errs):+.2f} m over {len(errs)} issues")
            for d in (0, 2, 4):
                for nm, ek in events.items():
                    bank = 7.15 if "7.15" in nm else (8.68 if "8.68" in nm else 7.40)
                    start = H(2025, 11, 23, 18) if "wave 2" in nm else te0 + 12
                    first = None
                    for k in range(start, ek):
                        f = feats(k - d, te, rain, model)
                        if f is None:
                            continue
                        if te["X.44"][k - d] + fit(f) >= bank:
                            first = k
                            break
                    held = None
                    for k in range(ek - 1, start - 1, -1):
                        f = feats(k - d, te, rain, model)
                        if f is None or te["X.44"][k - d] + fit(f) < bank:
                            break
                        held = k
                    lead = f"{ek - first:+d} h" if first is not None else "none"
                    lead_h = f"{ek - held:+d} h" if held is not None else "none"
                    print(f"   data delay {d} h, {nm}: first alarm {lead}, held without a break {lead_h}")


if __name__ == "__main__":
    main()

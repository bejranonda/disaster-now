"""Shared readers for the FloodWatch / Hat Yai lead-time check (2026-10-24, research/fwhy_*.py).

Pure standard library (no numpy on this host). Inputs stay in the session scratchpad:
- <SCR>/agentA/tw/*.json : ThaiWater `waterlevel_graph` answers (10 calls, logged in <SCR>/agentA/tw/calls.log), times ICT.
- GHCNh hourly files (NOAA NCEI) for Hat Yai airport 48569, Kho Hong 48571, Sadao 48574: rolling 24-h rain
  (`precipitation_24_hour`, UTC; shifted here to ICT).
- GHCN-Daily TH000048569 (Hat Yai airport, to Aug 2025) for the long record.
- RID's annual maxima (WL_Max_Songkla.pdf, re-typed in ANNUAL_MAX below from the extracted text).
"""
from __future__ import annotations

import datetime as dt
import json
import os

SCR = "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad"
TW = os.path.join(SCR, "agentA", "tw")
GHCNH_DIRS = [os.path.join(SCR, "models", "dl", "ghcnh"), os.path.join(SCR, "hy", "obs", "ghcnh"),
              os.path.join(SCR, "agentA", "ghcnh")]
GHCND = os.path.join(SCR, "hy", "obs", "ghcnd")
ICT = dt.timedelta(hours=7)

# Banks and thresholds (m MSL). ONWR's bank is the one FloodWatch and Thai Risk use (FloodWatch D-199).
BANKS = {
    "X.44": {"onwr": 7.15, "rid_field": 7.40, "rid_hydro": 8.68, "ground": -2.204},
    "X.90": {"onwr": 9.34, "rid_field": 9.53, "rid_hydro": 11.25, "city_red": 9.30, "ground": -0.881},
    "X.173A": {"onwr": 16.13, "rid_field": 16.13, "rid_hydro": 16.96, "city_red": 16.4, "ground": 3.748},
    "SLA003": {"onwr": 16.59, "ground": 10.636},
    "X.174": {"onwr": 8.88, "rid_field": 8.88, "rid_hydro": 11.22, "ground": 0.0},
}

# RID annual maxima (water year, Buddhist era -> the calendar year the season starts; level m MSL, date as printed)
# from http://water.rid.go.th/hyd/WLMax/WL_Max_Songkla.pdf (read 24 Oct 2026). A Jan/Feb date belongs to the season
# that began the previous calendar year.
ANNUAL_MAX = {
    "X.44": """2529 5.30 1/12;2530 6.56 11/12;2531 7.47 22/11;2532 2.09 10/11;2533 2.40 28/11;2534 4.37 14/12;2535 6.16 14/11;
2536 5.80 19/12;2537 4.55 3/11;2539 3.21 26/11;2541 5.76 25/1;2542 6.39 8/12;2543 8.77 23/11;2544 5.27 25/12;2545 2.56 2/1;
2546 5.45 12/12;2547 2.61 4/11;2548 7.68 18/12;2549 3.05 9/1;2550 2.54 21/10;2551 5.65 1/12;2552 6.68 23/11;2553 9.10 2/11;
2554 7.05 2/1;2555 1.90 19/4;2556 3.42 6/12;2557 5.42 23/12;2558 2.24 19/9;2559 4.04 2/1;2560 5.62 1/12;2561 2.79 25/10;
2562 2.76 12/11;2563 3.82 4/12;2564 3.82 28/2;2565 5.16 19/12;2566 3.90 29/11;2567 7.26 29/11;2568 9.97 25/11""",
    "X.90": """2531 10.01 22/11;2532 5.72 9/11;2533 4.99 14/12;2534 8.10 14/12;2535 8.77 14/11;2536 8.25 18/12;2537 7.38 2/11;
2538 7.34 29/12;2539 7.64 14/12;2540 7.80 26/8;2541 7.14 25/1;2542 8.37 8/12;2543 10.12 23/11;2544 6.94 24/12;2545 5.30 1/1;
2546 6.96 11/12;2547 4.73 5/11;2548 9.50 18/12;2549 5.94 9/1;2550 5.63 17/12;2551 7.97 2/12;2552 9.55 7/11;2553 11.27 2/11;
2554 10.00 2/1;2555 4.98 3/12;2556 6.26 6/12;2557 8.41 24/12;2558 5.08 19/9;2559 7.40 2/1;2560 8.52 1/12;2561 4.53 25/10;
2562 4.26 11/11;2563 6.97 3/12;2564 5.91 20/11;2565 8.21 19/12;2566 6.73 27/11;2567 10.20 29/11;2568 13.04 25/11""",
    "X.173A": """2549 14.60 16/5;2550 14.50 16/12;2551 15.75 9/12;2552 16.70 7/11;2553 17.46 1/11;2554 17.03 1/1;2555 15.15 3/12;
2556 14.55 7/12;2557 16.19 18/12;2558 15.21 19/9;2559 15.10 2/1;2560 16.24 1/12;2561 14.16 5/1;2562 14.05 11/11;2563 15.09 3/12;
2564 14.97 20/11;2565 15.39 20/12;2566 15.12 27/11;2567 16.83 28/11;2568 18.00 25/11""",
    "X.174": """2532 6.66 14/11;2533 6.63 27/11;2534 6.83 12/12;2535 7.23 14/11;2536 8.28 16/12;2537 7.68 1/11;2538 8.40 2/12;
2539 8.17 22/12;2542 8.60 13/12;2544 8.25 23/12;2545 6.30 6/11;2546 8.79 10/12;2547 6.75 8/11;2548 9.40 18/12;2549 6.38 8/1;
2550 6.25 9/11;2551 11.13 1/12;2552 9.72 22/11;2553 10.40 2/11;2554 9.97 1/1;2555 5.78 18/4;2556 6.99 20/11;2557 7.82 22/12;
2558 4.98 29/1;2559 7.58 1/1;2560 9.08 26/11;2561 6.10 4/1;2562 5.45 10/11;2563 6.66 22/11;2564 7.75 29/11;2565 10.05 18/12;
2566 7.51 26/11;2567 10.24 28/11;2568 11.82 25/11""",
}


def annual_max(code: str) -> dict[int, tuple[float, dt.date]]:
    """{season start year (CE): (level, date)}; RID's water year 25xx starts 1 Apr of 25xx-543."""
    out = {}
    for item in ANNUAL_MAX[code].replace("\n", "").split(";"):
        be, lev, dm = item.split()
        d, m = (int(x) for x in dm.split("/"))
        y = int(be) - 543
        cal = y + 1 if m <= 3 else y
        out[y] = (float(lev), dt.date(cal, m, d))
    return out


def hour_key(t: dt.datetime) -> int:
    return int((t - dt.datetime(1970, 1, 1)).total_seconds() // 3600)


def key_time(k: int) -> dt.datetime:
    return dt.datetime(1970, 1, 1) + dt.timedelta(hours=k)


def fmt(k: int | None) -> str:
    return "—" if k is None else key_time(k).strftime("%d %b %H:%M")


def tw_series(fname: str, max_gap_h: int = 3) -> dict[int, float]:
    """ThaiWater graph -> {ICT hour key: level}; sub-hourly readings averaged into the hour that starts at :00;
    gaps up to max_gap_h hours filled linearly (RID's 00:00 reading is missing every day)."""
    d = json.load(open(os.path.join(TW, fname)))
    acc: dict[int, list[float]] = {}
    for p in (d.get("data") or {}).get("graph_data") or []:
        if p.get("value") is None:
            continue
        t = dt.datetime.strptime(p["datetime"], "%Y-%m-%d %H:%M")
        acc.setdefault(hour_key(t), []).append(float(p["value"]))
    s = {k: sum(v) / len(v) for k, v in acc.items()}
    ks = sorted(s)
    for a, b in zip(ks, ks[1:]):
        if 1 < b - a <= max_gap_h + 1:
            for k in range(a + 1, b):
                s[k] = s[a] + (s[b] - s[a]) * (k - a) / (b - a)
    return s


def first_cross(s: dict[int, float], thr: float, start: int, end: int | None = None) -> int | None:
    for k in sorted(s):
        if k < start or (end is not None and k > end):
            continue
        if s[k] >= thr:
            return k
    return None


def episodes(s: dict[int, float], thr: float, start: int, end: int, sep_h: int = 72) -> list[tuple[int, int]]:
    """Separate exceedance episodes [first hour over, last hour over]; two crossings closer than sep_h are one."""
    out: list[list[int]] = []
    for k in sorted(s):
        if k < start or k > end or s[k] < thr:
            continue
        if out and k - out[-1][1] <= sep_h:
            out[-1][1] = k
        else:
            out.append([k, k])
    return [tuple(x) for x in out]


def ghcnh_p24(station_id: str, years: list[int]) -> dict[int, float]:
    """Rolling 24-h rain (mm) at each report hour, keyed by ICT hour; the first record at a time wins; quality
    codes outside 0/1/4/5 dropped (as research/hy_obs.mjs drops BAD_Q)."""
    out: dict[int, float] = {}
    for y in years:
        f = next((os.path.join(d, f"GHCNh_{station_id}_{y}.psv") for d in GHCNH_DIRS
                  if os.path.exists(os.path.join(d, f"GHCNh_{station_id}_{y}.psv"))
                  and os.path.getsize(os.path.join(d, f"GHCNh_{station_id}_{y}.psv")) > 1000), None)
        if not f:
            continue
        with open(f) as fh:
            h = fh.readline().rstrip("\n").split("|")
            iD, i24, q24 = h.index("DATE"), h.index("precipitation_24_hour"), h.index("precipitation_24_hour_Quality_Code")
            for line in fh:
                r = line.rstrip("\n").split("|")
                if len(r) <= i24 or r[i24] == "":
                    continue
                q = r[q24] if q24 < len(r) else ""
                if q and q[0] not in "0145":
                    continue
                t = dt.datetime.strptime(r[iD][:19], "%Y-%m-%dT%H:%M:%S")
                if t.minute:
                    continue
                k = hour_key(t + ICT)
                out.setdefault(k, float(r[i24]))
    return out


def roll(p24: dict[int, float], days: int, tol_h: int = 1) -> dict[int, float]:
    """Rolling 24*days-hour rain from rolling 24-h reports: P(t) + P(t-24) + ... (each found within +-tol_h)."""
    out = {}
    for k in p24:
        tot, ok = 0.0, True
        for d in range(days):
            kk = k - 24 * d
            v = next((p24[kk + j] for j in (0, -1, 1, -2, 2)[: 2 * tol_h + 1] if kk + j in p24), None)
            if v is None:
                ok = False
                break
            tot += v
        if ok:
            out[k] = tot
    return out


def ghcnd_daily(station: str = "TH000048569") -> dict[dt.date, float]:
    """GHCN-Daily PRCP (mm) by date as printed (the TMD rain day; alignment checked in research/hy_obs.mjs)."""
    import csv
    out = {}
    with open(os.path.join(GHCND, station + ".csv"), newline="") as fh:
        rd = csv.reader(fh)
        h = next(rd)
        iD, iP = h.index("DATE"), h.index("PRCP")
        for r in rd:
            if len(r) <= iP or r[iP].strip() == "":
                continue
            try:
                out[dt.date.fromisoformat(r[iD])] = float(r[iP]) / 10.0  # tenths of mm
            except ValueError:
                continue
    return out

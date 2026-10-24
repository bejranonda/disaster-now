"""Canadian Forest Fire Weather Index (FWI) System, daily, from noon weather (hazards research, 2026-10-24).

Equations: Van Wagner (1987) "Development and structure of the Canadian Forest Fire Weather Index System",
Forestry Technical Report 35, and the reference code of Wang, Anderson & Suddaby (2015), Information Report
NOR-X-424 (as in the R package cffdrs), including its latitude-dependent day-length factors:
DMC uses the 10-30 deg N table, DC uses 1.4 between 20 S and 20 N.
Inputs per day: noon (local standard time) temperature (C), relative humidity (%), 10 m wind (km/h),
rain in the 24 h ending at noon (mm). Start-up values FFMC 85, DMC 6, DC 15 (the standard spring start).
Self-test: python -I research/hz_fwi.py  (Van Wagner & Pickett 1985 first test day: FFMC 87.7, DMC 8.5,
DC 19.0, ISI 10.9, BUI 8.5, FWI 10.1).
"""
from __future__ import annotations

import math

ELL = {  # DMC effective day length by month
    "n33": [6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0],
    "n10": [7.9, 8.4, 8.9, 9.5, 9.9, 10.2, 10.1, 9.7, 9.1, 8.6, 8.1, 7.8],
    "s10": [10.1, 9.6, 9.1, 8.5, 8.1, 7.8, 7.9, 8.3, 8.9, 9.4, 9.9, 10.2],
    "s30": [11.5, 10.5, 9.2, 7.9, 6.8, 6.2, 6.5, 7.4, 8.7, 10.0, 11.2, 11.8],
}
FL_N = [-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6]
FL_S = [6.4, 5.0, 2.4, 0.4, -1.6, -1.6, -1.6, -1.6, -1.6, 0.9, 3.8, 5.8]


def ffmc(t, h, w, r, fo):
    mo = 147.2 * (101.0 - fo) / (59.5 + fo)
    if r > 0.5:
        rf = r - 0.5
        if mo > 150.0:
            mo = mo + 42.5 * rf * math.exp(-100.0 / (251.0 - mo)) * (1.0 - math.exp(-6.93 / rf)) \
                + 0.0015 * (mo - 150.0) ** 2 * math.sqrt(rf)
        else:
            mo = mo + 42.5 * rf * math.exp(-100.0 / (251.0 - mo)) * (1.0 - math.exp(-6.93 / rf))
        mo = min(mo, 250.0)
    ed = 0.942 * h ** 0.679 + 11.0 * math.exp((h - 100.0) / 10.0) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * h))
    if mo > ed:
        ko = 0.424 * (1.0 - (h / 100.0) ** 1.7) + 0.0694 * math.sqrt(w) * (1.0 - (h / 100.0) ** 8)
        kd = ko * 0.581 * math.exp(0.0365 * t)
        m = ed + (mo - ed) * 10.0 ** (-kd)
    else:
        ew = 0.618 * h ** 0.753 + 10.0 * math.exp((h - 100.0) / 10.0) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * h))
        if mo < ew:
            kl = 0.424 * (1.0 - ((100.0 - h) / 100.0) ** 1.7) + 0.0694 * math.sqrt(w) * (1.0 - ((100.0 - h) / 100.0) ** 8)
            kw = kl * 0.581 * math.exp(0.0365 * t)
            m = ew - (ew - mo) * 10.0 ** (-kw)
        else:
            m = mo
    return min(max(59.5 * (250.0 - m) / (147.2 + m), 0.0), 101.0)


def dmc(t, h, r, po, mon, lat):
    t = max(t, -1.1)
    if lat > 33:
        el = ELL["n33"][mon - 1]
    elif lat > 10:
        el = ELL["n10"][mon - 1]
    elif lat < -30:
        el = ELL["s30"][mon - 1]
    elif lat < -10:
        el = ELL["s10"][mon - 1]
    else:
        el = 9.0
    rk = 1.894 * (t + 1.1) * (100.0 - h) * el * 1e-6
    if r > 1.5:
        re = 0.92 * r - 1.27
        mo = 20.0 + math.exp(5.6348 - po / 43.43)
        if po <= 33.0:
            b = 100.0 / (0.5 + 0.3 * po)
        elif po <= 65.0:
            b = 14.0 - 1.3 * math.log(po)
        else:
            b = 6.2 * math.log(po) - 17.2
        mr = mo + 1000.0 * re / (48.77 + b * re)
        pr = max(244.72 - 43.43 * math.log(mr - 20.0), 0.0)
    else:
        pr = po
    return max(pr + 100.0 * rk, 0.0)


def dc(t, r, do, mon, lat):
    t = max(t, -2.8)
    fl = FL_N[mon - 1] if lat > 20 else FL_S[mon - 1] if lat <= -20 else 1.4
    pe = max((0.36 * (t + 2.8) + fl) / 2.0, 0.0)
    if r > 2.8:
        rd = 0.83 * r - 1.27
        qo = 800.0 * math.exp(-do / 400.0)
        qr = qo + 3.937 * rd
        dr = max(400.0 * math.log(800.0 / qr), 0.0)
    else:
        dr = do
    return dr + pe


def isi(fo, w):
    fm = 147.2 * (101.0 - fo) / (59.5 + fo)
    sf = 19.115 * math.exp(-0.1386 * fm) * (1.0 + fm ** 5.31 / 4.93e7)
    return sf * math.exp(0.05039 * w)


def bui(p, d):
    if p == 0 and d == 0:
        return 0.0
    if p <= 0.4 * d:
        u = 0.8 * d * p / (p + 0.4 * d)
    else:
        u = p - (1.0 - 0.8 * d / (p + 0.4 * d)) * (0.92 + (0.0114 * p) ** 1.7)
    return max(u, 0.0)


def fwi(i, u):
    bb = 0.1 * i * (0.626 * u ** 0.809 + 2.0) if u <= 80.0 else 0.1 * i * (1000.0 / (25.0 + 108.64 * math.exp(-0.023 * u)))
    return bb if bb <= 1.0 else math.exp(2.72 * (0.434 * math.log(bb)) ** 0.647)


def series(days, lat, start=(85.0, 6.0, 15.0)):
    """days: iterable of (month, temp, rh, wind_kmh, rain24). Returns a list of dicts with the six codes."""
    fo, po, do = start
    out = []
    for mon, t, h, w, r in days:
        h = min(max(h, 0.0), 100.0)
        f = ffmc(t, h, w, r, fo)
        p = dmc(t, h, r, po, mon, lat)
        d = dc(t, r, do, mon, lat)
        i = isi(f, w)
        u = bui(p, d)
        out.append(dict(ffmc=f, dmc=p, dc=d, isi=i, bui=u, fwi=fwi(i, u)))
        fo, po, do = f, p, d
    return out


if __name__ == "__main__":
    r = series([(4, 17.0, 42.0, 25.0, 0.0)], lat=46.0)[0]
    print({k: round(v, 2) for k, v in r.items()})
    exp = dict(ffmc=87.7, dmc=8.5, dc=19.0, isi=10.9, bui=8.5, fwi=10.1)
    bad = {k: (round(r[k], 2), v) for k, v in exp.items() if abs(r[k] - v) > 0.06}
    print("self-test", "OK" if not bad else f"FAILED {bad}")

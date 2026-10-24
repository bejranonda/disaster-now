"""Experiment D: is WHERE quakes happen forecastable from the past (long-term, not WHEN)? A smoothed-seismicity map
(Gaussian kernel on past epicentres, Frankel 1995 style) scored on later quakes against a uniform map.

Run:  nice -n 19 <venv>/bin/python -I research/eq_spatial.py
Input: research/data/eq_comcat/comcat_declustered_flags.csv.gz (eq_catalog.py).
Design (fixed before results): declustered (Gardner-Knopoff independent) M >= 5.0 epicentres (complete since 1973,
eq_catalog.py); 0.1-degree cells over 0-30 N, 88-110 E; map = (1 - w) * kernel density + w * uniform.
Choose the bandwidth h (10, 25, 50, 75, 100, 150, 200 km) and w (0.01, 0.05, 0.1, 0.2) on 1973-2003 -> 2004-2014;
refit on 1973-2014 with the chosen pair; score on 2015-01-01 .. 2026-10-23.
Score: information gain per test quake over the uniform map (mean log2 of the map's cell probability x cell count),
and the share of test quakes falling in the 10 % of the area the map rates highest.
Writes research/out/eq_spatial.json and research/logs/eq_spatial-2026-10-24.log.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from eq_common import DATA, OUT, Log  # noqa: E402

L = Log("eq_spatial")
d = pd.read_csv(DATA / "eq_comcat" / "comcat_declustered_flags.csv.gz")
d = d[(d.flag == 0) & (d.m >= 5.0)].copy()
d["t"] = pd.to_datetime(d.time, utc=True, format="ISO8601")
lat_c = np.arange(0.05, 30.0, 0.1)
lon_c = np.arange(88.05, 110.0, 0.1)
LON, LAT = np.meshgrid(lon_c, lat_c)
area = np.cos(np.radians(LAT))          # cell area weight
area /= area.sum()


def cell_index(lat, lon):
    i = np.clip(((lat - 0.0) / 0.1).astype(int), 0, len(lat_c) - 1)
    j = np.clip(((lon - 88.0) / 0.1).astype(int), 0, len(lon_c) - 1)
    return i, j


def kmap(ev, h, w):
    dens = np.zeros_like(LAT)
    x = np.radians(LON) * np.cos(np.radians(LAT)) * 6371.0
    y = np.radians(LAT) * 6371.0
    for la, lo in zip(ev.latitude.values, ev.longitude.values):
        ex = np.radians(lo) * np.cos(np.radians(la)) * 6371.0
        ey = np.radians(la) * 6371.0
        # local flat-earth distance (fine at these scales for a kernel)
        dx = (np.radians(LON - lo)) * np.cos(np.radians((LAT + la) / 2)) * 6371.0
        dy = (np.radians(LAT - la)) * 6371.0
        dens += np.exp(-(dx ** 2 + dy ** 2) / (2 * h ** 2))
    dens *= area
    dens /= dens.sum()
    return (1 - w) * dens + w * area


def gain(pmap, ev):
    i, j = cell_index(ev.latitude.values, ev.longitude.values)
    return float(np.mean(np.log2(pmap[i, j] / area[i, j])))


def top10(pmap, ev):
    dens = pmap / area
    order = np.argsort(-dens, axis=None)
    cum = np.cumsum(area.ravel()[order])
    hot = np.zeros(area.size, bool)
    hot[order[cum <= 0.10]] = True
    hot = hot.reshape(area.shape)
    i, j = cell_index(ev.latitude.values, ev.longitude.values)
    return float(hot[i, j].mean())


a = d[d.t < pd.Timestamp("2004-01-01", tz="UTC")]
b = d[(d.t >= pd.Timestamp("2004-01-01", tz="UTC")) & (d.t < pd.Timestamp("2015-01-01", tz="UTC"))]
c = d[d.t >= pd.Timestamp("2015-01-01", tz="UTC")]
L(f"declustered M>=5.0: 1973-2003 {len(a)}, 2004-2014 {len(b)}, 2015-2026 {len(c)}")
best = None
L("choice on 1973-2003 -> 2004-2014 (gain in bits per quake over uniform):")
for h in (10, 25, 50, 75, 100, 150, 200):
    row = []
    for w in (0.01, 0.05, 0.1, 0.2):
        g = gain(kmap(a, h, w), b)
        row.append(f"w={w}: {g:.2f}")
        if best is None or g > best[0]:
            best = (g, h, w)
    L(f"  h={h:3d} km  " + "  ".join(row))
L(f"chosen h = {best[1]} km, w = {best[2]} (validation gain {best[0]:.2f} bits)")
m = kmap(pd.concat([a, b]), best[1], best[2])
g_test = gain(m, c)
t10 = top10(m, c)
L(f"TEST 2015-2026 (n = {len(c)}): information gain {g_test:.2f} bits per quake over uniform "
  f"(x{2 ** g_test:.1f} likelihood per quake); share of test quakes in the map's top 10 % of the area: {100 * t10:.0f} % "
  f"(uniform: 10 %)")
(OUT / "eq_spatial.json").write_text(json.dumps(dict(n=[len(a), len(b), len(c)], h=best[1], w=best[2],
                                                     val_gain=best[0], test_gain=g_test, top10=t10), indent=1))
L("wrote research/out/eq_spatial.json")

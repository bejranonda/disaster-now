"""Tectonic regime (Garcia et al. 2012 regionalization, as used by USGS's operational aftershock forecasts) for a
point, decoded from the USGS OAF code's own lookup table.

Not run on its own; imported by eq_aftershock.py.
Data: research/data/eq_opensha_oaf/TectonicRegimeTable.dat and the format of TectonicRegimeTable.java
(opensha/opensha-oaf, CC0-1.0, commit fdfbaef163f3355201a8df5a56b8bbffaaaf24a5, fetched 2026-10-24): 0.05-degree grid,
-90..90 lat (3,601 rows) and -180..180 lon (7,201 columns); the file holds 15 point counts, then per row the group
count, the group start columns and the domain index of each group (run-length encoding).
Names: STREC names (TectonicRegimeTable.java strec_name) mapped to Page et al. (2016) names (opensha TectonicRegime.java).
"""
from __future__ import annotations

import bisect
import pathlib

D = pathlib.Path(__file__).resolve().parent / "data" / "eq_opensha_oaf"
STREC = ["ACR (deep)", "ACR (hot spot)", "ACR (oceanic boundary)", "ACR (shallow)", "ACR deep (above slab)",
         "ACR oceanic boundary (above slab)", "ACR shallow (above slab)", "SCR (above slab)", "SCR (generic)",
         "SOR (above slab)", "SOR (generic)", "SZ (generic)", "SZ (inland/back-arc)", "SZ (on-shore)",
         "SZ (outer-trench)"]
PAGE = ["ANSR-DEEPCON", "ANSR-HOTSPOT", "ANSR-OCEANBD", "ANSR-SHALCON", "ANSR-ABSLDEC", "ANSR-ABSLOCB",
        "ANSR-ABSLSHC", "SCR-ABVSLAB", "SCR-GENERIC", "SOR-ABVSLAB", "SOR-GENERIC", "SZ-GENERIC", "SZ-INLBACK",
        "SZ-ONSHORE", "SZ-OUTERTR"]
LAT_N, LON_N = 3601, 7201
_cols = _doms = None


def _load():
    global _cols, _doms
    if _cols is not None:
        return
    toks = iter(int(x) for x in (D / "TectonicRegimeTable.dat").read_text().split())
    for _ in range(15):
        next(toks)
    _cols, _doms = [], []
    for _ in range(LAT_N):
        g = next(toks)
        _cols.append([next(toks) for _ in range(g)])
        _doms.append([next(toks) for _ in range(g)])


def regime(lat: float, lon: float) -> str:
    """Page et al. (2016) regime name for a point (row/column rounding as in TectonicRegimeTable.java)."""
    _load()
    row = min(max(int(round((lat + 90.0) / 180.0 * (LAT_N - 1))), 0), LAT_N - 1)
    lo = ((lon + 180.0) % 360.0) - 180.0
    col = int(round((lo + 180.0) / 360.0 * (LON_N - 1)))
    col = LON_N - 1 if col < 0 else (0 if col >= LON_N else col)
    i = bisect.bisect_right(_cols[row], col) - 1
    return PAGE[_doms[row][i]]

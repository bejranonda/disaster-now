"""GWIS fire danger (JRC / Copernicus), layer nasa_geos5.query: forecast horizon, archive depth and the order of the
six values (hazards research, 2026-10-24).

The six values are checked against the FWI System's own algebra: BUI is a function of DMC and DC, and FWI a function of
ISI and BUI (Van Wagner 1987; research/hz_fwi.py), so if value_5 == bui(value_2, value_3) and value_0 == fwi(value_4,
value_5) the order is FWI, FFMC, DMC, DC, ISI, BUI.
Run: python -I research/hz_gwis_probe.py   (about 25 requests, 1.5 s apart) -> research/logs/hz_gwis_probe-2026-10-24.log
"""
from __future__ import annotations

import datetime as dt
import pathlib
import re
import sys
import time

import requests

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import hz_fwi  # noqa: E402

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
LOG = pathlib.Path(__file__).resolve().parent / "logs" / "hz_gwis_probe-2026-10-24.log"
BASE = ("https://maps.effis.emergency.copernicus.eu/gwis?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo"
        "&LAYERS=nasa_geos5.query&QUERY_LAYERS=nasa_geos5.query&STYLES=&SRS=EPSG:4326&WIDTH=3&HEIGHT=3&X=1&Y=1"
        "&INFO_FORMAT=text/plain")
PTS = {"chiang_mai": (18.79, 98.98), "nan": (18.78, 100.78)}
out = []


def log(s):
    print(s, flush=True)
    out.append(s)


def q(lat, lon, day):
    u = f"{BASE}&BBOX={lon - 0.05:.2f},{lat - 0.05:.2f},{lon + 0.05:.2f},{lat + 0.05:.2f}&TIME={day}"
    r = requests.get(u, headers={"User-Agent": UA}, timeout=60)
    time.sleep(1.5)
    m = re.search(r"value_list = '([^']+)'", r.text)
    return [float(x) for x in m.group(1).split(",")] if m else None


log(f"===== {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ} GWIS nasa_geos5.query")
today = dt.date(2026, 10, 24)
lat, lon = PTS["chiang_mai"]
log("forecast horizon (Chiang Mai):")
for k in range(0, 9):
    d = today + dt.timedelta(days=k)
    v = q(lat, lon, d.isoformat())
    log(f"  {d} {'values ' + str([round(x, 2) for x in v]) if v else 'no result'}")
log("archive depth (Chiang Mai), the 15th of each month back from now:")
for back in range(0, 15):
    y, m = today.year, today.month - back
    while m <= 0:
        m += 12
        y -= 1
    d = dt.date(y, m, 15)
    v = q(lat, lon, d.isoformat())
    log(f"  {d} {'values ' + str([round(x, 2) for x in v]) if v else 'no result'}")
log("order check on dry-season days (value_5 vs bui(value_2, value_3); value_0 vs fwi(value_4, value_5)):")
for name, (la, lo) in PTS.items():
    for d in ("2026-02-15", "2026-03-15", "2026-04-01"):
        v = q(la, lo, d)
        if not v:
            log(f"  {name} {d}: no result")
            continue
        b = hz_fwi.bui(v[2], v[3])
        f = hz_fwi.fwi(v[4], v[5])
        log(f"  {name} {d}: values {[round(x, 2) for x in v]}; bui(v2,v3) {b:.2f} vs v5 {v[5]:.2f}; fwi(v4,v5) {f:.2f} vs v0 {v[0]:.2f}")
with LOG.open("a") as fh:
    fh.write("\n".join(out) + "\n")

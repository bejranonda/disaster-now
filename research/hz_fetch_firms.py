"""Experiment A data: NASA FIRMS yearly country archive, VIIRS S-NPP 375 m, Thailand (hazards research, 2026-10-24).

https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/<year>/viirs-snpp_<year>_Thailand.csv
answered without a key (HEAD 200 for 2020-2025, 404 for 2026, research/logs/hz_probe-2026-10-24.log).
S-NPP alone keeps the years comparable (NOAA-20 and NOAA-21 joined later and would inflate counts).
Run: python -I research/hz_fetch_firms.py   (sequential, 2 s apart, honest User-Agent, resumable)
"""
from __future__ import annotations

import datetime as dt
import os
import pathlib
import time

import requests

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
HZ = pathlib.Path(os.environ.get("HZ_DATA", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hz/dl"))
OUT = HZ / "firms"
OUT.mkdir(parents=True, exist_ok=True)
LOG = pathlib.Path(__file__).resolve().parent / "logs" / "hz_fetch_firms-2026-10-24.log"


def log(m):
    line = f"{dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ} {m}"
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


for y in range(2019, 2026):
    f = OUT / f"viirs-snpp_{y}_Thailand.csv"
    if f.exists():
        log(f"{f.name} cached, {f.stat().st_size} bytes")
        continue
    u = f"https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{y}/viirs-snpp_{y}_Thailand.csv"
    r = requests.get(u, headers={"User-Agent": UA}, timeout=300)
    log(f"GET {u} -> {r.status_code}, {len(r.content)} bytes, Last-Modified {r.headers.get('Last-Modified')}")
    if r.status_code == 200:
        f.write_bytes(r.content)
    time.sleep(2)

"""Download NOAA NCEI GHCNh hourly by-year files (pipe-separated) for the Thai stations in
research/data/thai_stations_regions.json. Sequential, honest User-Agent, skips files already present.

    python3 -I research/fetch_ghcnh.py 2024 2025 2026

Files go to the session scratchpad (DN_SCRATCH/dl/ghcnh), never the repository. Log:
research/logs/fetch_ghcnh-2026-10-24.log. Plain Python (urllib), no third-party packages.
"""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)"
SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
GH = SCRATCH / "dl" / "ghcnh"
GH.mkdir(parents=True, exist_ok=True)
BASE = "https://www.ncei.noaa.gov/oa/global-historical-climatology-network/hourly/access/by-year"
LOG = HERE / "logs" / "fetch_ghcnh-2026-10-24.log"


def log(s):
    print(s, flush=True)
    with open(LOG, "a") as f:
        f.write(s + "\n")


def main(years):
    st = json.load(open(HERE / "data" / "thai_stations_regions.json"))["stations"]
    log(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}: years {years}, {len(st)} stations")
    tot = 0
    for y in years:
        for s in st:
            f = GH / f"GHCNh_{s['id']}_{y}.psv"
            if f.exists() and f.stat().st_size > 0:
                continue
            req = urllib.request.Request(f"{BASE}/{y}/psv/{f.name}", headers={"User-Agent": UA})
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    b = r.read()
                    lm = r.headers.get("Last-Modified")
                f.write_bytes(b)
                tot += len(b)
                log(f"  {f.name}: 200, {len(b)} bytes, Last-Modified {lm}")
            except urllib.error.HTTPError as e:
                log(f"  {f.name}: HTTP {e.code}")
    log(f"done: {tot / 1e6:.0f} MB new")


if __name__ == "__main__":
    main([int(a) for a in sys.argv[1:]] or [2024, 2025, 2026])

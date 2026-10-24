"""Download the METAR history of the eight spot-check airports from the Iowa Environmental Mesonet's ASOS/METAR
archive (https://mesonet.agron.iastate.edu/request/download.phtml, global METARs). One request per airport, one at a
time, honest User-Agent; files land in the session scratchpad.

    python3 -I research/fetch_iem_metar.py 2024-03-01 2026-10-24

Columns kept: station, valid (UTC), tmpc, dwpc, metar. Thai METARs give whole-degree T and Td.
Log: research/logs/fetch_iem_metar-2026-10-24.log. Plain Python (urllib).
"""
import datetime as dt
import json
import os
import pathlib
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)"
SCRATCH = pathlib.Path(os.environ.get("DN_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/models"))
OUT = SCRATCH / "dl" / "iem"
OUT.mkdir(parents=True, exist_ok=True)
LOG = HERE / "logs" / "fetch_iem_metar-2026-10-24.log"


def log(s):
    print(s, flush=True)
    with open(LOG, "a") as f:
        f.write(s + "\n")


def main(d0, d1):
    a = dt.date.fromisoformat(d0)
    b = dt.date.fromisoformat(d1)
    ap = json.load(open(HERE / "data" / "airports_metar.json"))["stations"]
    log(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}: {d0}..{d1}, {len(ap)} airports")
    for s in ap:
        f = OUT / f"{s['id']}_{d0}_{d1}.csv"
        if f.exists() and f.stat().st_size > 0:
            continue
        url = ("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?"
               f"station={s['id']}&data=tmpc&data=dwpc&data=metar&year1={a.year}&month1={a.month}&day1={a.day}"
               f"&year2={b.year}&month2={b.month}&day2={b.day}&tz=Etc%2FUTC&format=onlycomma&latlon=no&missing=M"
               "&trace=T&direct=no&report_type=3&report_type=4")
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=600) as r:
            body = r.read()
        f.write_bytes(body)
        log(f"  {s['id']}: {len(body)} bytes, {body.count(b'\n') - 1} reports")
        time.sleep(5)
    log("done")


if __name__ == "__main__":
    main(*sys.argv[1:3])

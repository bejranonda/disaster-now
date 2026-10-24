"""Experiment B data: ECMWF open-data rain forecasts as issued, kept as a Thailand box (hazards research, 2026-10-24).

Source: ECMWF open data (CC BY 4.0), Google Cloud mirror of s3://ecmwf-forecasts
(https://storage.googleapis.com/ecmwf-open-data/<YYYYMMDD>/00z/ifs/0p25/...), as research/ecmwf_open.py.
Each GRIB2 file has a JSON-lines .index (param, step, _offset, _length); one global field is read with one
HTTP byte-range request (the answer must be 206 with the asked length, or the request is dropped: a server that
ignored the range would send a 0.7 GB file). Only the box 4-22 N, 96-107 E (73 x 45 points at 0.25 deg) is kept.

Kinds:
  ep    ENS probabilities (51 members): tpg25, tpg50, tpg100 = P(24-h rain > 25 / 50 / 100 mm), windows
        0-24, 24-48, 48-72 h of the 00 UTC run (all in one "240h-enfo-ep" file). ~0.15 MB of fields + 0.33 MB index a day.
  oper  HRES tp (accumulated from the run start) at steps 24, 48, 72 h: day 1 = 48-24, day 2 = 72-48. ~3.2 MB a day.

Rules: one request at a time, at least 1.1 s apart (one host); honest User-Agent; resumable (one .npz per run day).
Run:
  python -I research/hz_fetch_ecmwf.py ep 2024-04-01 2024-12-31 1
  python -I research/hz_fetch_ecmwf.py oper 2024-04-01 2024-12-31 3
Writes research/logs/hz_fetch_ecmwf-2026-10-24.log; data in $HZ_DATA/ecmwf (scratchpad, not the repo).
"""
from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import sys
import time

import numpy as np
import requests

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
BUCKET = "https://storage.googleapis.com/ecmwf-open-data"
HZ = pathlib.Path(os.environ.get("HZ_DATA", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hz/dl"))
OUT = HZ / "ecmwf"
OUT.mkdir(parents=True, exist_ok=True)
LOG = pathlib.Path(__file__).resolve().parent / "logs" / "hz_fetch_ecmwf-2026-10-24.log"
LAT0, LAT1, LON0, LON1 = 22.0, 4.0, 96.0, 107.0  # box, north to south
GAP = 1.1
_last = [0.0]
_bytes = [0]
S = requests.Session()
S.headers["User-Agent"] = UA


def log(msg):
    line = f"{dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%M:%SZ} {msg}"
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


def get(url, rng=None, tries=5):
    for k in range(tries):
        wait = GAP - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        h = {"Range": f"bytes={rng[0]}-{rng[1]}"} if rng else {}
        try:
            r = S.get(url, headers=h, timeout=120, stream=True)
            if r.status_code == 404:
                r.close()
                return None
            if rng is not None:
                want = rng[1] - rng[0] + 1
                if r.status_code != 206 or int(r.headers.get("Content-Length", -1)) != want:
                    r.close()
                    raise RuntimeError(f"range not honoured: {r.status_code} {r.headers.get('Content-Length')}")
            elif r.status_code != 200 or int(r.headers.get("Content-Length", 0) or 0) > 2_000_000:
                r.close()
                raise RuntimeError(f"unexpected answer {r.status_code} {r.headers.get('Content-Length')}")
            b = r.content
            _bytes[0] += len(b)
            return b
        except (requests.ConnectionError, requests.Timeout) as e:
            log(f"  retry {k + 1} {url} {e.__class__.__name__}")
            time.sleep(5 * 2 ** k)
    raise RuntimeError(f"giving up {url}")


def decode_box(buf):
    import eccodes
    g = eccodes.codes_new_from_message(buf)
    try:
        ni, nj = eccodes.codes_get(g, "Ni"), eccodes.codes_get(g, "Nj")
        la1 = eccodes.codes_get(g, "latitudeOfFirstGridPointInDegrees")
        lo1 = eccodes.codes_get(g, "longitudeOfFirstGridPointInDegrees")
        di = eccodes.codes_get(g, "iDirectionIncrementInDegrees")
        assert abs(di - 0.25) < 1e-6 and ni == 1440 and nj == 721 and abs(la1 - 90) < 1e-6, (ni, nj, la1, di)
        v = eccodes.codes_get_values(g).reshape(nj, ni)
        meta = {k: eccodes.codes_get(g, k) for k in ("shortName", "dataDate", "stepRange")}
    finally:
        eccodes.codes_release(g)
    j0, j1 = int(round((la1 - LAT0) / 0.25)), int(round((la1 - LAT1) / 0.25))
    i0, i1 = int(round(((LON0 - lo1) % 360) / 0.25)), int(round(((LON1 - lo1) % 360) / 0.25))
    return meta, v[j0:j1 + 1, i0:i1 + 1].astype(np.float32)


def run_day(kind, d: dt.date):
    out = OUT / f"{kind}_{d:%Y%m%d}.npz"
    if out.exists():
        return "cached"
    ds = f"{d:%Y%m%d}"
    arrs = {}
    if kind == "ep":
        base = f"{BUCKET}/{ds}/00z/ifs/0p25/enfo/{ds}000000-240h-enfo-ep"
        idx = get(base + ".index")
        if idx is None:
            return "missing"
        recs = [json.loads(x) for x in idx.decode().splitlines() if x.startswith("{")]
        want = {(p, s) for p in ("tpg25", "tpg50", "tpg100") for s in ("0-24", "24-48", "48-72")}
        for r in recs:
            key = (r.get("param"), r.get("step"))
            if key in want:
                meta, box = decode_box(get(base + ".grib2", (r["_offset"], r["_offset"] + r["_length"] - 1)))
                assert meta["stepRange"] == key[1] and str(meta["dataDate"]) == ds, (meta, key)
                arrs[f"{key[0]}_{key[1]}"] = box
        if len(arrs) != len(want):
            return f"incomplete {sorted(arrs)}"
    else:
        for st in (24, 48, 72):
            base = f"{BUCKET}/{ds}/00z/ifs/0p25/oper/{ds}000000-{st}h-oper-fc"
            idx = get(base + ".index")
            if idx is None:
                return "missing"
            recs = [json.loads(x) for x in idx.decode().splitlines() if x.startswith("{")]
            recs = [r for r in recs if r.get("param") == "tp" and r.get("levtype") == "sfc"]
            if len(recs) != 1:
                return f"tp records {len(recs)}"
            r = recs[0]
            meta, box = decode_box(get(base + ".grib2", (r["_offset"], r["_offset"] + r["_length"] - 1)))
            arrs[f"tp_{st}"] = box * 1000.0  # m -> mm
    np.savez_compressed(out.with_suffix(".tmp.npz"), **arrs)
    out.with_suffix(".tmp.npz").rename(out)
    return f"{len(arrs)} fields"


def main(kind, start, end, every=1):
    d0, d1 = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    days = [d0 + dt.timedelta(days=k) for k in range(0, (d1 - d0).days + 1, int(every))]
    log(f"===== {kind} {start}..{end} every {every} d: {len(days)} runs; box {LAT1}-{LAT0} N {LON0}-{LON1} E")
    t0 = time.time()
    for n, d in enumerate(days, 1):
        try:
            msg = run_day(kind, d)
        except Exception as e:  # noqa: BLE001
            msg = f"ERROR {e}"
        if n % 20 == 0 or msg not in ("cached",) and not msg.endswith("fields"):
            log(f"  [{n}/{len(days)}] {d} {msg}  downloaded {_bytes[0] / 1e6:.1f} MB  {time.time() - t0:.0f} s")
    log(f"done {kind} {start}..{end}: downloaded {_bytes[0] / 1e6:.1f} MB in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], a[1], a[2], a[3] if len(a) > 3 else 1)

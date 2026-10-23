"""Point values from ECMWF open-data forecasts, read as issued (CC BY 4.0).

Source: the ECMWF open-data archive. The AWS bucket `ecmwf-forecasts`
(https://registry.opendata.aws/ecmwf-forecasts/) answered most byte-range requests from
this host with HTTP 503 "SlowDown" on 2026-10-23 (3 of 4 test requests), so the same files
are read from the Google Cloud public mirror `gs://ecmwf-open-data`
(https://storage.googleapis.com/ecmwf-open-data/<YYYYMMDD>/00z/ifs/0p25/<stream>/...), which
answered every test request (HTTP 206).

Each run's GRIB2 file comes with a JSON-lines `.index` (param, number, step, _offset, _length),
so a single global field (~0.7–1.4 MB) is fetched with an HTTP byte-range request and only
the values at the stations' nearest 0.25° grid points are kept (nothing else is stored).
The HRES (`oper`, type fc) is the model Open-Meteo serves as `ecmwf_ifs025`; the ENS
(`enfo`, cf + 50 pf) is what the app's ensemble API call returns as 51 members.

Run (downloads, resumable; extracted values cached as CSV in the scratchpad):
    python3 research/ecmwf_open.py oper 2025-03-01 2025-10-31
    python3 research/ecmwf_open.py oper 2026-03-01 2026-10-20
    python3 research/ecmwf_open.py enfo-rain 2026-06-01 2026-10-20 3     # every 3rd day
    python3 research/ecmwf_open.py enfo-heat 2026-03-15 2026-05-15 2
"""
from __future__ import annotations

import concurrent.futures as cf
import datetime as dt
import json
import sys
import threading
import time

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import SCRATCH, UA, Log  # noqa: E402

BUCKET = "https://storage.googleapis.com/ecmwf-open-data"  # mirror of s3://ecmwf-forecasts
OUTDIR = SCRATCH / "ecmwf_points"
OUTDIR.mkdir(parents=True, exist_ok=True)

STATIONS = {  # GHCNh id: (lat, lon, elevation m, name) from ghcnh-station-list.csv (NCEI, read 2026-10-23)
    "THM00048455": (13.7333, 100.5667, 4.0, "BANGKOK METROPOLIS"),
    "THM00048304": (19.8667, 99.7667, 401.0, "CHAING RAI ARGOMET"),
    "THM00048334": (18.3167, 99.2833, 319.0, "LAMPANG AGROMET"),
    "THM00048384": (16.3333, 102.8167, 166.0, "THA PHRA AGROMET"),
    "THM00048409": (15.0853, 104.3306, 129.2, "SI SAKET AGROMET"),
    "THM00048478": (12.6333, 101.35, 5.0, "RAYONG"),
    "THM00048555": (9.1, 99.6333, 37.0, "SURAT THANI AGROMET"),
    "THM00048564": (7.8833, 98.4, 4.0, "PHUKET"),
    "THM00048415": (14.5167, 100.7167, 10.0, "AYUTTHAYA"),
    "THM00048333": (18.8667, 100.75, 264.0, "NAN AGROMET"),
    "THM00048325": (18.1667, 97.9333, 213.0, "MAE SARIANG"),
    "THM00048372": (17.1, 99.8, 50.0, "SUKHOTHAI"),
    "THM00048357": (17.4167, 104.7833, 148.0, "NAKHON PHANOM"),
    "THM00048432": (14.8833, 103.5, 147.0, "SURIN"),
    "THM00048425": (14.4667, 100.1333, 9.0, "SUPHAN BURI"),
    "THM00048554": (8.3592, 100.0594, 3.0, "NAKHONSI THAMMARAT AGROMET"),
    "THM00048571": (7.0, 100.5, 10.0, "KHO HONG AGROMET"),
    "THM00048440": (13.7833, 102.0333, 43.0, "SRAKAEW"),
}


def grid_index(lat, lon):
    """Nearest point of the 0.25° regular_ll grid (first point 90N, 180E→-180, Ni=1440)."""
    j = int(round((90.0 - lat) / 0.25))
    i = int(round(((lon + 180.0) % 360.0) / 0.25)) % 1440
    return j * 1440 + i


IDX = {s: grid_index(v[0], v[1]) for s, v in STATIONS.items()}

# what to fetch per kind: (stream, type list, {step: params}).  00 UTC run = 07:00 Bangkok.
# 2t/2d at steps 30, 33 (54, 57) = 13:00 and 16:00 Bangkok tomorrow (the day after);
# tp at 24/48/72 = accumulations from the run start, so differences give the 07–07 rain days.
KINDS = {
    "oper": ("oper", ["fc"], {24: ["tp"], 30: ["2t", "2d"], 33: ["2t", "2d"], 48: ["tp"],
                              54: ["2t", "2d"], 57: ["2t", "2d"], 72: ["tp"]}),
    "enfo-rain": ("enfo", ["cf", "pf"], {24: ["tp"], 48: ["tp"], 72: ["tp"]}),
    "enfo-heat": ("enfo", ["cf", "pf"], {30: ["2t", "2d"], 33: ["2t", "2d"]}),
}

_sess = threading.local()


def session():
    if not hasattr(_sess, "s"):
        _sess.s = requests.Session()
        _sess.s.headers["User-Agent"] = UA
    return _sess.s


def fetch(url, rng=None, tries=6):
    h = {"Range": f"bytes={rng[0]}-{rng[1]}"} if rng else {}
    for k in range(tries):
        try:
            r = session().get(url, headers=h, timeout=120)
            if r.status_code in (200, 206):
                return r.content
            if r.status_code == 404:
                return None
            if r.status_code in (500, 503) or b"SlowDown" in r.content[:300]:
                time.sleep(5 * 2 ** k)  # S3 asked to slow down: back off
                continue
            r.raise_for_status()
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(5 * 2 ** k)
    raise RuntimeError(f"giving up on {url} {rng}")


def decode_points(buf):
    import eccodes
    g = eccodes.codes_new_from_message(buf)
    try:
        vals = eccodes.codes_get_values(g)
        meta = dict(param=eccodes.codes_get(g, "shortName"), step=eccodes.codes_get(g, "endStep"),
                    date=eccodes.codes_get(g, "dataDate"))
    finally:
        eccodes.codes_release(g)
    return meta, {s: float(vals[i]) for s, i in IDX.items()}


def run_day(kind, day: dt.date, log):
    stream, types, plan = KINDS[kind]
    out = OUTDIR / f"{kind}_{day:%Y%m%d}.csv"
    if out.exists():
        return "cached"
    rows = []
    d = f"{day:%Y%m%d}"
    for st, params in plan.items():
        suffix = "oper-fc" if stream == "oper" else "enfo-ef"
        base = f"{BUCKET}/{d}/00z/ifs/0p25/{stream}/{d}000000-{st}h-{suffix}"
        idx = fetch(base + ".index")
        if idx is None:
            log.w(f"  {kind} {d} step {st}: no index (404)")
            return "missing"
        recs = [json.loads(l) for l in idx.decode().splitlines() if l.startswith("{")]
        recs = [r for r in recs if r.get("param") in params and r.get("type") in types and r.get("levtype") == "sfc"]
        for r in recs:
            buf = fetch(base + ".grib2", (r["_offset"], r["_offset"] + r["_length"] - 1))
            meta, pts = decode_points(buf)
            for s, v in pts.items():
                rows.append((d, st, meta["param"], int(r.get("number", 0) or 0), s, v))
    df = pd.DataFrame(rows, columns=["date", "step", "param", "member", "station", "value"])
    df.to_csv(out.with_suffix(".tmp"), index=False)
    out.with_suffix(".tmp").rename(out)
    return f"{len(df)} values"


def main(kind, start, end, every=1, workers=6):
    log = Log("ecmwf_open_fetch")
    days = [d.date() for d in pd.date_range(start, end, freq=f"{int(every)}D")]
    log.w(f"fetch {kind} {start}..{end} every {every} d: {len(days)} runs (00 UTC), {workers} workers")
    t0 = time.time()
    done = 0
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(run_day, kind, d, log): d for d in days}
        for f in cf.as_completed(futs):
            d = futs[f]
            try:
                msg = f.result()
            except Exception as e:  # noqa: BLE001
                msg = f"ERROR {e}"
            done += 1
            if done % 10 == 0 or "ERROR" in msg or "missing" in msg:
                log.w(f"  [{done}/{len(days)}] {d} {msg}  ({time.time() - t0:.0f} s)")
    log.w(f"done {kind} {start}..{end} in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], a[1], a[2], int(a[3]) if len(a) > 3 else 1, int(a[4]) if len(a) > 4 else 6)

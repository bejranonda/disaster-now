"""Experiment A, step 1: download the regional USGS ComCat catalog.

Run:  nice -n 19 <venv>/bin/python -I research/eq_fetch_catalog.py
Box 0-30 N, 88-110 E (Thailand, Myanmar, Laos, Cambodia, Vietnam, Yunnan, NE India/Bangladesh,
the Andaman-Nicobar arc and northern Sumatra), 1973-01-01 to 2026-10-24, M >= 4.0, type earthquake.
Source: USGS ComCat FDSN event web service, https://earthquake.usgs.gov/fdsnws/event/1/ (documented at
https://earthquake.usgs.gov/fdsnws/event/1/ ; free, no key). One count call per chunk, then one CSV call.
Writes research/data/eq_comcat/comcat_0-30N_88-110E_1973-2026_M4.csv.gz and
research/logs/eq_fetch_catalog-2026-10-24.log.
"""
from __future__ import annotations

import gzip
import io
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pandas as pd  # noqa: E402

from eq_common import DATA, Log, get  # noqa: E402

L = Log("eq_fetch_catalog")
BASE = "https://earthquake.usgs.gov/fdsnws/event/1/"
BOX = dict(minlatitude=0, maxlatitude=30, minlongitude=88, maxlongitude=110, minmagnitude=4.0,
           eventtype="earthquake")
END = "2026-10-24T00:00:00"
CHUNKS = [("1973-01-01", "1990-01-01"), ("1990-01-01", "2000-01-01"), ("2000-01-01", "2004-12-01"),
          ("2004-12-01", "2005-06-01"), ("2005-06-01", "2010-01-01"), ("2010-01-01", "2016-01-01"),
          ("2016-01-01", "2021-01-01"), ("2021-01-01", END)]
OUTDIR = DATA / "eq_comcat"
OUTDIR.mkdir(parents=True, exist_ok=True)

frames = []
for a, b in CHUNKS:
    q = dict(BOX, starttime=a, endtime=b)
    n = int(get(BASE + "count", dict(q, format="text")).strip())
    L(f"chunk {a} .. {b}: count {n}")
    if n >= 20000:
        raise SystemExit("chunk too large; split it")
    txt = get(BASE + "query", dict(q, format="csv", orderby="time-asc"))
    df = pd.read_csv(io.StringIO(txt))
    L(f"   got {len(df)} rows")
    frames.append(df)
cat = pd.concat(frames, ignore_index=True).drop_duplicates("id").sort_values("time").reset_index(drop=True)
L(f"total {len(cat)} events, {cat.time.min()} .. {cat.time.max()}")
L("magType counts:\n" + cat.magType.value_counts().to_string())
L("net counts:\n" + cat.net.value_counts().head(15).to_string())
p = OUTDIR / "comcat_0-30N_88-110E_1973-2026_M4.csv.gz"
with gzip.open(p, "wt") as f:
    cat.to_csv(f, index=False)
L(f"wrote {p} ({p.stat().st_size} bytes)")

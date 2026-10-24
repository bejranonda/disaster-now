"""Shared helpers for the earthquake-forecasting research (disaster-now, 2026-10-24).

Not run on its own; imported by the eq_*.py scripts (which put research/ on sys.path themselves,
because they are run with `python -I`).

- Every request carries the honest User-Agent below and waits at least 1.1 s since the previous
  call to the same host; responses are cached in the session scratchpad so a re-run costs no calls.
- No retries on 4xx/429: the run stops (no evasion).
- The intensity equation is the app's own (public/js/ipe.js): Allen, Wald & Worden (2012),
  hypocentral form, coefficients from OpenQuake allen_2012_ipe.py (KNOWLEDGE §10), plus the
  greater-Bangkok term +1.06 MMI within 1,600 km (assess.BKK_MMI_TERM, quake.SITE_MAX_KM).
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import sys
import time
import urllib.parse

import numpy as np
import requests

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
ROOT = pathlib.Path(__file__).resolve().parent          # research/
REPO = ROOT.parent
LOGS, OUT, DATA = ROOT / "logs", ROOT / "out", ROOT / "data"
for p in (LOGS, OUT, DATA):
    p.mkdir(parents=True, exist_ok=True)
SCRATCH = pathlib.Path(os.environ.get(
    "EQ_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/eq"))
CACHE = SCRATCH / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
CALL_LEDGER = LOGS / "eq_http-calls-2026-10-24.log"
_last_call: dict[str, float] = {}


class Log:
    """Tee to stdout and research/logs/eq_<name>-2026-10-24.log (command and UTC time at the top)."""

    def __init__(self, name: str):
        self.path = LOGS / f"{name}-2026-10-24.log"
        self.f = self.path.open("w")
        self(f"# {' '.join(sys.argv)}")
        self(f"# started {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}")

    def __call__(self, *a):
        s = " ".join(str(x) for x in a)
        print(s, flush=True)
        self.f.write(s + "\n")
        self.f.flush()


def get(url: str, params: dict | None = None, *, binary=False, timeout=180, cache=True):
    """GET with the honest UA, >= 1.1 s per host, on-disk cache. Returns text/bytes, or None on 204/404."""
    full = url + ("?" + urllib.parse.urlencode(params) if params else "")
    k = hashlib.sha256(full.encode()).hexdigest()[:24]
    f = CACHE / (k + (".bin" if binary else ".txt"))
    if cache and f.exists():
        return f.read_bytes() if binary else f.read_text()
    host = urllib.parse.urlparse(url).netloc
    wait = 1.1 - (time.time() - _last_call.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    r = requests.get(full, headers={"User-Agent": UA}, timeout=timeout)
    _last_call[host] = time.time()
    with CALL_LEDGER.open("a") as lf:
        lf.write(f"{dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} {r.status_code} "
                 f"{len(r.content)}B {full}\n")
    if r.status_code in (204, 404):
        return None
    if r.status_code == 429 or r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code} for {full}: {r.text[:300]}")
    if cache:
        if binary:
            f.write_bytes(r.content)
        else:
            f.write_text(r.text)
    return r.content if binary else r.text


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = p2 - p1
    dl = np.radians(np.asarray(lon2) - np.asarray(lon1))
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(np.minimum(1.0, a)))


# --- the app's intensity equation (public/js/ipe.js) ---
AWW12 = dict(c0=2.085, c1=1.428, c2=-1.402, c4=0.078, m1=-0.209, m2=2.042, s1=0.82, s2=0.37, s3=22.9)
BKK_MMI_TERM, SITE_MAX_KM = 1.06, 1600.0


def ipe_mmi(m, rhypo):
    c = AWW12
    m, r = np.asarray(m, float), np.asarray(rhypo, float)
    rm = c["m1"] + c["m2"] * np.exp(m - 5.0)
    out = c["c0"] + c["c1"] * m + c["c2"] * np.log(np.sqrt(r ** 2 + rm ** 2))
    return out + np.where(r > 50.0, c["c4"] * np.log(np.maximum(r, 1e-9) / 50.0), 0.0)


def ipe_sigma(rhypo):
    c = AWW12
    return c["s1"] + c["s2"] / (1.0 + (np.asarray(rhypo, float) / c["s3"]) ** 2)


# The 15 cities: central tambon of each, from the app's own public/data/tambon.json
# (HDX COD-AB Thailand, Royal Thai Survey Department / OCHA); code, English name, BKK-metro flag.
CITIES = [
    (100101, "Bangkok", True), (500101, "Chiang Mai", False), (570101, "Chiang Rai", False),
    (580101, "Mae Hong Son", False), (630601, "Mae Sot (Tak)", False), (710101, "Kanchanaburi", False),
    (830101, "Phuket", False), (850101, "Ranong", False), (400101, "Khon Kaen", False),
    (410101, "Udon Thani", False), (300101, "Nakhon Ratchasima", False), (901101, "Hat Yai (Songkhla)", False),
    (840101, "Surat Thani", False), (340101, "Ubon Ratchathani", False), (550101, "Nan", False),
]


def cities():
    j = json.loads((REPO / "public/data/tambon.json").read_text())
    by = {r[0]: r for r in j["t"]}
    return [dict(code=c, name=n, bkk=b, lat=by[c][3], lon=by[c][4], tambon=by[c][2]) for c, n, b in CITIES]

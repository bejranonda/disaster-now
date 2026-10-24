"""Shared helpers for the air-quality prediction study (docs/research/predict-air-2026-10-24.md).

Not run on its own; imported by the research/aq_*.py scripts.

- Honest User-Agent; at least 1 s between calls to any one host; on-disk cache in the session scratchpad
  (AQ_SCRATCH), so a re-run spends no calls.
- Open-Meteo: every request is appended to research/logs/openmeteo-calls-2026-10-24.log with its weight
  (Open-Meteo counts max(1, vars/10) x max(1, days/14) x locations); the study's cap is 1,500 weighted calls
  (AQ_OM_CAP); a request that would pass it stops the run, and a limit message stops the run (no retry, no evasion).
- Air4Thai: its servers send an incomplete chain; the two public Let's Encrypt intermediates in tools/certs/
  (from letsencrypt.org/certificates) are added to certifi's roots for those hosts only. Verification stays on.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import time
import urllib.parse

import requests

UA = "disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)"
ROOT = pathlib.Path(__file__).resolve().parent            # research/
REPO = ROOT.parent
SCRATCH = pathlib.Path(os.environ.get(
    "AQ_SCRATCH", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/aq"))
CACHE = SCRATCH / "cache"          # HTTP answers (downloaded data: never imported, only parsed)
DL = SCRATCH / "downloads"         # big files (FIRMS archives)
for p in (CACHE, DL):
    p.mkdir(parents=True, exist_ok=True)
LOGS, OUT, DATA = ROOT / "logs", ROOT / "out", ROOT / "data"
LEDGER = LOGS / "openmeteo-calls-2026-10-24.log"
OM_CAP = float(os.environ.get("AQ_OM_CAP", "1500"))
OM_TAG = "aq-study"                # this study's lines in the shared ledger

_last_call: dict[str, float] = {}


def _polite(url: str):
    host = urllib.parse.urlsplit(url).netloc
    wait = 1.05 - (time.time() - _last_call.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    _last_call[host] = time.time()


def air4thai_ca() -> str:
    """certifi's roots + the two Let's Encrypt Gen-Y certificates the collector adds (tools/certs/)."""
    import certifi
    f = SCRATCH / "certs" / "air4thai-ca.pem"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        parts = [pathlib.Path(certifi.where()).read_text()]
        for n in ("lets-encrypt-yr1.crt", "lets-encrypt-root-yr-by-x1.crt"):
            parts.append((REPO / "tools" / "certs" / n).read_text())
        f.write_text("\n".join(parts))
    return str(f)


class RateLimited(RuntimeError):
    pass


def _key(url: str, params: dict | None) -> str:
    return hashlib.sha256((url + "?" + json.dumps(params or {}, sort_keys=True)).encode()).hexdigest()[:24]


def get(url: str, params: dict | None = None, *, verify=True, binary=False, timeout=180, cache=True):
    """GET with the honest UA, the per-host pause and the cache. Returns text / bytes, or None on 404."""
    f = CACHE / (_key(url, params) + (".bin" if binary else ".txt"))
    if cache and f.exists():
        return f.read_bytes() if binary else f.read_text()
    _polite(url)
    r = requests.get(url, params=params, headers={"User-Agent": UA}, verify=verify, timeout=timeout)
    if r.status_code == 404:
        return None
    if r.status_code == 429:
        raise RateLimited(f"{url}: 429 {r.text[:200]}")
    r.raise_for_status()
    if cache:
        (f.write_bytes(r.content) if binary else f.write_text(r.text))
    return r.content if binary else r.text


def om_weight(params: dict) -> float:
    nvars = sum(len(str(params[k]).split(",")) for k in ("hourly", "daily", "current") if params.get(k))
    nloc = len(str(params.get("latitude", "0")).split(","))
    if "start_date" in params and "end_date" in params:
        ndays = (dt.date.fromisoformat(params["end_date"]) - dt.date.fromisoformat(params["start_date"])).days + 1
    else:
        ndays = int(params.get("forecast_days", 7)) + int(params.get("past_days", 0))
    return max(1.0, nvars / 10) * max(1.0, ndays / 14) * nloc


def om_spent() -> float:
    """Weighted Open-Meteo calls this study has made (its own lines in the shared ledger)."""
    if not LEDGER.exists():
        return 0.0
    tot = 0.0
    for line in LEDGER.read_text().splitlines():
        p = line.split("\t")
        if len(p) > 3 and p[1] == OM_TAG and p[2] == "200":
            tot += float(p[3][2:])
    return tot


def om_get(url: str, params: dict, purpose: str) -> dict:
    """Open-Meteo GET: cached, ledgered, capped; stops at the first limit message."""
    f = CACHE / (_key(url, params) + ".txt")
    if not f.exists():
        w = om_weight(params)
        if om_spent() + w > OM_CAP:
            raise RateLimited(f"study cap: {om_spent():.1f} + {w:.1f} > {OM_CAP}")
        _polite(url)
        for attempt in range(3):   # a dropped connection is retried; an HTTP answer never is
            try:
                r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=240)
                break
            except (requests.ConnectionError, requests.Timeout) as ex:
                with open(LEDGER, "a") as lg:
                    lg.write(f"{dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}\t{OM_TAG}\tERR\tw=0\t"
                             f"{purpose}\t{type(ex).__name__} (attempt {attempt + 1})\n")
                if attempt == 2:
                    raise
                time.sleep(15 * (attempt + 1))
        with open(LEDGER, "a") as lg:
            lg.write(f"{dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}\t{OM_TAG}\t{r.status_code}\t"
                     f"w={w:.1f}\t{purpose}\t{r.url}\n")
        if r.status_code != 200:
            if r.status_code == 429 or "limit" in r.text.lower():
                raise RateLimited(r.text[:300])
            raise RuntimeError(f"Open-Meteo {r.status_code}: {r.text[:300]}")
        f.write_text(r.text)
    return json.loads(f.read_text())


class Log:
    """Tee to stdout and research/logs/<name>-2026-10-24.log."""

    def __init__(self, name: str):
        self.path = LOGS / f"{name}-2026-10-24.log"
        self.f = open(self.path, "a")
        import sys
        self.w(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} : "
               f"{' '.join(sys.argv)} =====")

    def w(self, *a):
        s = " ".join(str(x) for x in a)
        print(s, flush=True)
        self.f.write(s + "\n")
        self.f.flush()


def clean(obj):
    """Strict JSON: NaN/inf → None, numpy scalars → Python numbers."""
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v) for v in obj]
    if hasattr(obj, "item") and not isinstance(obj, (str, bytes)):
        try:
            obj = obj.item()
        except (ValueError, AttributeError):
            pass
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


def haversine_km(lat1, lon1, lat2, lon2):
    import numpy as np
    r = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(np.asarray(lon2) - lon1) / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


def bearing_deg(lat1, lon1, lat2, lon2):
    """Initial bearing from point 1 to point(s) 2, degrees from north."""
    import numpy as np
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dl = np.radians(np.asarray(lon2) - lon1)
    x = np.sin(dl) * np.cos(p2)
    y = np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(dl)
    return (np.degrees(np.arctan2(x, y)) + 360) % 360

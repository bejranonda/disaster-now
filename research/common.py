"""Shared helpers for the forecast-validation research (disaster-now, 2026-10-23).

Every request carries the project's honest User-Agent. Responses are cached on disk
(in the session scratchpad, not the repo) so that re-running a script does not spend
Open-Meteo calls again. Every Open-Meteo request is written to a ledger with its
estimated weight (Open-Meteo counts a call as more than one when it asks for more than
10 variables or more than 14 days; weight = max(1, vars/10) * max(1, days/14) * locations).
A response that mentions a request limit stops the run (no retry, no evasion).

Not run on its own; imported by the e*.py scripts.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import time

import requests

UA = "disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)"
ROOT = pathlib.Path(__file__).resolve().parent            # research/
REPO = ROOT.parent
SCRATCH = pathlib.Path(os.environ.get(
    "DN_SCRATCH",
    "/tmp/claude-0/-home-user/d0c0b487-5c79-5ab8-a62d-123ead309e6f/scratchpad/validation"))
CACHE = SCRATCH / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
LOGS = ROOT / "logs"
OUT = ROOT / "out"
DATA = ROOT / "data"
for p in (LOGS, OUT, DATA):
    p.mkdir(parents=True, exist_ok=True)

# Air4Thai's server sends an incomplete chain; the missing Let's Encrypt Gen-Y
# intermediate and its cross-signed root are added to the proxy bundle (verification stays on).
AIR4THAI_CA = SCRATCH / "certs" / "air4thai-ca.pem"


def ensure_air4thai_ca():
    """Build the bundle once: the proxy's CA bundle + Let's Encrypt Gen-Y YR1 + Root YR (cross-signed by ISRG X1)."""
    if AIR4THAI_CA.exists():
        return AIR4THAI_CA
    AIR4THAI_CA.parent.mkdir(parents=True, exist_ok=True)
    parts = [pathlib.Path("/root/.ccr/ca-bundle.crt").read_text()]
    for u in ("https://letsencrypt.org/certs/gen-y/int-yr1.pem", "https://letsencrypt.org/certs/gen-y/root-yr-by-x1.pem"):
        r = requests.get(u, headers={"User-Agent": UA}, timeout=60)
        r.raise_for_status()
        parts.append(r.text)
    AIR4THAI_CA.write_text("\n".join(parts))
    return AIR4THAI_CA

LEDGER = LOGS / "openmeteo-calls-2026-10-23.log"


class RateLimited(RuntimeError):
    pass


def _key(url: str, params: dict | None) -> str:
    s = url + "?" + json.dumps(params or {}, sort_keys=True)
    return hashlib.sha256(s.encode()).hexdigest()[:24]


def get(url: str, params: dict | None = None, *, verify=True, cache=True,
        binary=False, timeout=120, headers=None):
    """GET with the honest UA and an on-disk cache. Returns text, bytes or None (404)."""
    k = _key(url, params)
    f = CACHE / (k + (".bin" if binary else ".txt"))
    if cache and f.exists():
        return f.read_bytes() if binary else f.read_text()
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    r = requests.get(url, params=params, headers=h, verify=verify, timeout=timeout)
    if r.status_code == 404:
        return None
    if r.status_code == 429 or "limit" in r.text[:400].lower() and r.status_code >= 400:
        raise RateLimited(f"{r.status_code} {r.text[:300]}")
    r.raise_for_status()
    if cache:
        if binary:
            f.write_bytes(r.content)
        else:
            f.write_text(r.text)
    return r.content if binary else r.text


def om_weight(params: dict) -> float:
    nvars = 0
    for k in ("hourly", "daily", "current"):
        if k in params and params[k]:
            nvars += len(str(params[k]).split(","))
    nloc = len(str(params.get("latitude", "0")).split(","))
    if "start_date" in params and "end_date" in params:
        d0 = dt.date.fromisoformat(params["start_date"])
        d1 = dt.date.fromisoformat(params["end_date"])
        ndays = (d1 - d0).days + 1
    else:
        ndays = int(params.get("forecast_days", 7)) + int(params.get("past_days", 0))
    return max(1.0, nvars / 10) * max(1.0, ndays / 14) * nloc


def om_get(url: str, params: dict, purpose: str) -> dict:
    """Open-Meteo GET: cached, ledgered, stops at the first limit message."""
    k = _key(url, params)
    f = CACHE / (k + ".txt")
    cached = f.exists()
    w = 0.0 if cached else om_weight(params)
    if not cached:
        h = {"User-Agent": UA}
        for attempt in range(3):  # a dropped connection is retried; an HTTP answer never is
            try:
                r = requests.get(url, params=params, headers=h, timeout=180)
                break
            except (requests.ConnectionError, requests.Timeout) as ex:
                with open(LEDGER, "a") as lg:
                    lg.write(f"{dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}\tERR\t"
                             f"w=0\t{purpose}\tconnection error (attempt {attempt + 1}): {type(ex).__name__}\n")
                if attempt == 2:
                    raise
                time.sleep(10 * (attempt + 1))
        txt = r.text
        status = r.status_code
        with open(LEDGER, "a") as lg:
            lg.write(f"{dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}\t{status}\t"
                     f"w={w:.1f}\t{purpose}\t{r.url}\n")
        if status != 200:
            if "limit" in txt.lower():
                raise RateLimited(txt[:300])
            raise RuntimeError(f"Open-Meteo {status}: {txt[:300]}")
        f.write_text(txt)
        time.sleep(1.0)
    return json.loads(f.read_text())


def ledger_total() -> float:
    if not LEDGER.exists():
        return 0.0
    tot = 0.0
    for line in LEDGER.read_text().splitlines():
        parts = line.split("\t")
        if len(parts) > 2 and parts[1] == "200":
            tot += float(parts[2][2:])
    return tot


class Log:
    """Tee to stdout and a run log under research/logs/."""

    def __init__(self, name: str):
        self.path = LOGS / f"{name}-2026-10-23.log"
        self.f = open(self.path, "a")
        self.w(f"\n===== run {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} =====")

    def w(self, *a):
        s = " ".join(str(x) for x in a)
        print(s)
        self.f.write(s + "\n")
        self.f.flush()


def clean(obj):
    """Make results strict JSON: NaN/inf → None, numpy scalars → Python numbers."""
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
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def block_bootstrap_rise(err_new, err_old, block: int, n: int = 2000, seed: int = 1):
    """Moving-block bootstrap of mean(|err_new|) - mean(|err_old|) on paired, time-ordered
    absolute errors. Returns (observed rise in %, lower 5 % bound of the rise in absolute units).
    Same rule as FloodWatch's model_gate.made_worse: worse = rise > 3 % and lower bound > 0."""
    import numpy as np
    a = np.abs(np.asarray(err_new, float))
    b = np.abs(np.asarray(err_old, float))
    m = ~(np.isnan(a) | np.isnan(b))
    a, b = a[m], b[m]
    nobs = len(a)
    if nobs < 2 * block or b.mean() == 0:
        return (float("nan") if b.mean() == 0 else 100 * (a.mean() / b.mean() - 1)), float("nan")
    d = a - b
    rng = np.random.default_rng(seed)
    nb = int(math.ceil(nobs / block))
    starts = rng.integers(0, nobs - block + 1, size=(n, nb))
    idx = (starts[:, :, None] + np.arange(block)[None, None, :]).reshape(n, -1)[:, :nobs]
    boots = d[idx].mean(axis=1)
    return 100 * (a.mean() / b.mean() - 1), float(np.quantile(boots, 0.05))

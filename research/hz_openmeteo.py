"""Open-Meteo calls for the hazards research (2026-10-24): ERA5 for fire weather, GloFAS (flood API), previous-runs probes.

Every call is cached on disk (re-runs spend nothing) and appended to research/logs/openmeteo-calls-2026-10-24.log
with its weight: Open-Meteo counts a call as max(1, variables/10) x max(1, days/14) x locations.
The task's budget is 1,500 weighted calls in all (this module refuses to go past it). A response that mentions a
limit stops the run: no retry, no evasion. One request at a time, at least 1.1 s apart; honest User-Agent.
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
ROOT = pathlib.Path(__file__).resolve().parent
LEDGER = ROOT / "logs" / "openmeteo-calls-2026-10-24.log"
HZ = pathlib.Path(os.environ.get("HZ_DATA", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hz/dl"))
CACHE = HZ / "openmeteo"
CACHE.mkdir(parents=True, exist_ok=True)
SPENT = CACHE / "_hz_weight_spent.json"
BUDGET = 1500.0
_last = [0.0]


class LimitHit(RuntimeError):
    pass


def weight(params: dict) -> float:
    nv = 0
    for k in ("hourly", "daily", "current"):
        if params.get(k):
            nv += len(str(params[k]).split(","))
    nloc = len(str(params.get("latitude", "0")).split(","))
    if params.get("start_date") and params.get("end_date"):
        days = (dt.date.fromisoformat(params["end_date"]) - dt.date.fromisoformat(params["start_date"])).days + 1
    else:
        days = int(params.get("past_days", 0) or 0) + int(params.get("forecast_days", 7) or 7)
    return round(max(1.0, nv / 10.0) * max(1.0, days / 14.0) * nloc, 2)


def spent() -> float:
    return json.loads(SPENT.read_text())["w"] if SPENT.exists() else 0.0


def get(base: str, params: dict, label: str):
    url = base + "?" + urllib.parse.urlencode(params, safe=",")
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    f = CACHE / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text())
    w = weight(params)
    if spent() + w > BUDGET:
        raise LimitHit(f"own budget: {spent():.1f} + {w} > {BUDGET}")
    wait = 1.1 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    r = requests.get(url, headers={"User-Agent": UA}, timeout=180)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with LEDGER.open("a") as lf:
        lf.write(f"{stamp}\t{r.status_code}\tw={w}\thz {label}\t{url}\n")
    SPENT.write_text(json.dumps({"w": round(spent() + w, 2)}))
    txt = r.text
    if r.status_code == 429 or "limit" in txt[:400].lower():
        raise LimitHit(f"{r.status_code} {txt[:300]}")
    if r.status_code != 200:
        return {"_error": r.status_code, "_text": txt[:500]}
    js = r.json()
    f.write_text(json.dumps(js))
    return js

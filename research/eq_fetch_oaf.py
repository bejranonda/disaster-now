"""Experiment B, step 0: download every version of USGS's operational aftershock forecast (ComCat "oaf"
product) for events in and around the study box, as issued, so that USGS's own forecasts can be scored
against what ComCat later recorded (eq_oaf_score.py).

Run:  nice -n 19 <venv>/bin/python -I research/eq_fetch_oaf.py
Source: https://earthquake.usgs.gov/fdsnws/event/1/query?producttype=oaf (box 10 S-40 N, 80-120 E, since 2015),
then ?eventid=<id>&includesuperseded=true for every version, then each version's forecast.json.
Writes research/data/eq_oaf/<eventid>_<updateTime>.json and research/data/eq_oaf/index.csv.
"""
from __future__ import annotations

import io
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pandas as pd  # noqa: E402

from eq_common import DATA, Log, get  # noqa: E402

L = Log("eq_fetch_oaf")
Q = "https://earthquake.usgs.gov/fdsnws/event/1/query"
D = DATA / "eq_oaf"
D.mkdir(parents=True, exist_ok=True)
ev = pd.read_csv(io.StringIO(get(Q, dict(format="csv", producttype="oaf", minlatitude=-10, maxlatitude=40,
                                          minlongitude=80, maxlongitude=120, starttime="2015-01-01"))))
L(ev[["time", "latitude", "longitude", "depth", "mag", "id", "place"]].to_string())
rows = []
for eid in ev.id:
    j = json.loads(get(Q, dict(eventid=eid, format="geojson", includesuperseded="true")))
    for o in sorted(j["properties"]["products"].get("oaf", []), key=lambda o: o["updateTime"]):
        u = o["contents"]["forecast.json"]["url"]
        f = D / f"{eid}_{o['updateTime']}.json"
        if not f.exists():
            f.write_text(get(u))
        fc = json.loads(f.read_text())
        m = fc.get("model", {})
        rows.append(dict(event=eid, update=o["updateTime"], creation=fc.get("creationTime"),
                         start=fc["forecast"][0]["timeStart"], model=m.get("name"),
                         **{k: m.get("parameters", {}).get(k) for k in ("a", "ams", "b", "p", "c", "Mc", "aSigma",
                                                                         "pSigma", "regionRadius", "regionCenterLat",
                                                                         "regionCenterLon")}))
idx = pd.DataFrame(rows)
idx.to_csv(D / "index.csv", index=False)
L(f"{len(idx)} forecast versions")
L(idx.drop(columns=["creation"]).to_string())

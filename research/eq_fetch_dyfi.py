"""Experiment C, validation data: every USGS "Did You Feel It?" (DYFI) city report from Thailand for events in the
study box 0-30 N, 88-110 E (any magnitude >= 3, 1973-2026), not just the 17 big events in e4_dyfi_residuals.csv.

Run:  nice -n 19 <venv>/bin/python -I research/eq_fetch_dyfi.py
Source: https://earthquake.usgs.gov/fdsnws/event/1/query?producttype=dyfi (the event list, with the summary "felt"
count), then for each event with felt >= 1 the event detail (?eventid=) and its dyfi product's cdi_zip.txt
(city aggregates: location key "City::Country", CDI, number of responses, epicentral distance, lat, lon).
About 2 calls per event at >= 1.1 s per call. Raw files go to research/data/eq_dyfi/raw/.
Writes research/data/eq_dyfi/dyfi_events.csv, research/data/eq_dyfi/dyfi_thailand_city_reports.csv,
research/logs/eq_fetch_dyfi-2026-10-24.log.
"""
from __future__ import annotations

import csv
import io
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pandas as pd  # noqa: E402

from eq_common import DATA, Log, get  # noqa: E402

L = Log("eq_fetch_dyfi")
Q = "https://earthquake.usgs.gov/fdsnws/event/1/query"
D = DATA / "eq_dyfi"
RAW = D / "raw"
RAW.mkdir(parents=True, exist_ok=True)
j = json.loads(get(Q, dict(format="geojson", producttype="dyfi", minlatitude=0, maxlatitude=30, minlongitude=88,
                           maxlongitude=110, minmagnitude=3, starttime="1973-01-01", orderby="time-asc")))
ev = pd.DataFrame([dict(id=f["id"], time=f["properties"]["time"], mag=f["properties"]["mag"],
                        magType=f["properties"]["magType"], felt=f["properties"].get("felt"),
                        cdi=f["properties"].get("cdi"), lon=f["geometry"]["coordinates"][0],
                        lat=f["geometry"]["coordinates"][1], depth=f["geometry"]["coordinates"][2],
                        place=f["properties"]["place"]) for f in j["features"]])
L(f"events with a DYFI product: {len(ev)}; with felt >= 1: {int((ev.felt.fillna(0) >= 1).sum())}")
ev.to_csv(D / "dyfi_events.csv", index=False)
rows = []
todo = ev[ev.felt.fillna(0) >= 1]
for n, r in enumerate(todo.itertuples(), 1):
    fz = RAW / f"{r.id}_cdi_zip.txt"
    if not fz.exists():
        det = json.loads(get(Q, dict(eventid=r.id, format="geojson")))
        dy = det["properties"]["products"].get("dyfi", [{}])[0].get("contents", {})
        txt = get(dy["cdi_zip.txt"]["url"]) if "cdi_zip.txt" in dy else ""
        fz.write_text(txt or "")
    txt = fz.read_text()
    lines = [x for x in txt.splitlines() if x.strip() and not x.startswith("#")]
    for c in csv.reader(io.StringIO("\n".join(lines))):
        try:
            key, cdi, nresp, dist, lat, lon = c[0], float(c[1]), int(c[2]), float(c[3]), float(c[4]), float(c[5])
        except (ValueError, IndexError):
            continue
        country = key.split("::")[-1] if "::" in key else ""
        if country.strip().lower() != "thailand":
            continue
        rows.append(dict(event=r.id, mag=r.mag, magType=r.magType, ev_lat=r.lat, ev_lon=r.lon, depth=r.depth,
                         time=r.time, key=key, city=key.split("::")[0], cdi=cdi, nresp=nresp, dist_usgs=dist,
                         lat=lat, lon=lon))
    if n % 100 == 0:
        L(f"  {n}/{len(todo)} events read, {len(rows)} Thai city rows so far")
out = pd.DataFrame(rows)
out.to_csv(D / "dyfi_thailand_city_reports.csv", index=False)
L(f"Thai city rows: {len(out)} from {out.event.nunique() if len(out) else 0} events")
if len(out):
    L(out.groupby("city").agg(events=("event", "nunique"), max_cdi=("cdi", "max")).sort_values("events",
                                                                                          ascending=False).head(40).to_string())

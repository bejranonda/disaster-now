"""Check the Thai agency air-quality forecasts the literature review named (predict-air-2026-10-24.md §1.4).

Run:  <venv>/bin/python -I research/aq_probe_agency.py
Writes research/logs/aq_probe_agency-2026-10-24.log; the images go to the scratchpad (AQ_SCRATCH/agency/).
One GET per URL, honest User-Agent, 1 s between calls to a host; nothing behind a bot check is tried.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
import requests  # noqa: E402

from aq_common import SCRATCH, UA, Log, _polite, air4thai_ca  # noqa: E402

L = Log("aq_probe_agency")
OUTDIR = SCRATCH / "agency"
OUTDIR.mkdir(parents=True, exist_ok=True)
PCD = ["https://air4thai.pcd.go.th/UpdateV2/forecastImage/forecast_img_bkk.png"] + [
    f"https://air4thai.com/UpdateV2/forecastImage/forecast_img_{r}.png" for r in ("north", "esan", "centralwest", "east", "south")]
TMD_VR = "https://ozone.tmd.go.th/PM2.5/weather/Map/VRATE/daily/vruv_provinces.json"


def fetch(url, verify=True):
    _polite(url)
    return requests.get(url, headers={"User-Agent": UA}, timeout=60, verify=verify)


def main():
    ca = air4thai_ca()
    L.w("## PCD (Air4Thai) 7-day dust forecast images")
    for u in PCD:
        try:
            r = fetch(u, verify=ca)
            f = OUTDIR / u.rsplit("/", 1)[1]
            if r.status_code == 200:
                f.write_bytes(r.content)
            L.w(f"  {u}: {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes, "
                f"last-modified {r.headers.get('last-modified')}, access-control-allow-origin "
                f"{r.headers.get('access-control-allow-origin')}")
        except Exception as ex:  # noqa: BLE001
            L.w(f"  {u}: {type(ex).__name__} {str(ex)[:160]}")
    L.w("\n## Air4Thai station JSON: the 'forecast' field")
    r = fetch("https://air4thai.pcd.go.th/services/getNewAQI_JSON.php", verify=ca)
    st = r.json()["stations"]
    vals = [s.get("forecast") for s in st]
    L.w(f"  {len(st)} stations; 'forecast' present at {sum(v is not None for v in vals)}, non-empty at "
        f"{sum(bool(v) for v in vals)}; example {json.dumps(next((v for v in vals if v), vals[0]), ensure_ascii=False)[:200]}")
    L.w("\n## TMD ventilation-rate forecast by province")
    try:
        r = fetch(TMD_VR)
        L.w(f"  {TMD_VR}: {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes, "
            f"last-modified {r.headers.get('last-modified')}, access-control-allow-origin {r.headers.get('access-control-allow-origin')}")
        j = r.json()
        (OUTDIR / "vruv_provinces.json").write_text(json.dumps(j, ensure_ascii=False))
        if isinstance(j, dict):
            L.w(f"  top-level keys: {list(j)}")
            L.w(f"  source {j.get('source')}, variable {j.get('variable')}, generated {j.get('generated_local')}, "
                f"thresholds {json.dumps(j.get('thresholds_tmd'))}")
            days = j.get("days", [])
            L.w(f"  days: {len(days)} ({', '.join(d['lead'] + ' ' + d['date_local'] for d in days)}); provinces per day "
                f"{len(days[0]['provinces']) if days else 0}")
            if days:
                cm = days[0]["provinces"].get("เชียงใหม่")
                L.w(f"  e.g. Chiang Mai, first day: {json.dumps(cm, ensure_ascii=False)}")
        elif isinstance(j, list):
            L.w(f"  list of {len(j)}; first item: {json.dumps(j[0], ensure_ascii=False)[:600]}")
    except Exception as ex:  # noqa: BLE001
        L.w(f"  {type(ex).__name__} {str(ex)[:200]}")


if __name__ == "__main__":
    main()

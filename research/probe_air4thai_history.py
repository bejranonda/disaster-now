"""How far back does Air4Thai's hourly history go? (E3 data note)

Run:  python3 research/probe_air4thai_history.py
Appends to research/logs/e3_pm25-2026-10-23.log. One request per date (cached), station 35t.
The parameters are the ones the air4thai.pcd.go.th/webV3 history page sends (its chunk 2e034b96).
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import AIR4THAI_CA, Log, get  # noqa: E402

L = Log("e3_pm25")
DATES = ["2025-03-01", "2026-03-01", "2026-04-01", "2026-04-15", "2026-05-01", "2026-07-01", "2026-07-15",
         "2026-07-25", "2026-08-01", "2026-08-10", "2026-09-01", "2026-10-01"]


def main():
    L.w("## Air4Thai hourly-history probe (getHistoryData.php, station 35t, one day each)")
    for d in DATES:
        txt = get("https://air4thai.com/forweb/getHistoryData.php",
                  dict(stationID="35t", param="PM25", type="hr", sdate=d, edate=d, stime="00", etime="23"),
                  verify=str(AIR4THAI_CA))
        n = len(json.loads(txt)["stations"][0]["data"])
        L.w(f"  {d}: {n} hourly values")


if __name__ == "__main__":
    main()

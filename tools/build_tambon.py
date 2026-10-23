#!/usr/bin/env python3
"""Build public/data/tambon.json from the HDX COD-AB Thailand workbook (Royal Thai Survey Department via OCHA).

    python3 tools/build_tambon.py path/to/tha_admin_boundaries.xlsx

Source: https://data.humdata.org/dataset/cod-ab-tha (CC BY-IGO; credit the Royal Thai Survey Department and OCHA).
Workbook read on 2026-10-23: 1,850,520 bytes, sha256 7d23fca9…e529f0, HDX "last_modified" 2026-01-26.
Needs openpyxl. The output is the only thing the page loads: provinces, districts and subdistricts with their DOPA
codes (TH100101 → 100101), Thai and English names and centre points (4 decimals, ~11 m). The page uses it for the
instant place search and to name the nearest subdistrict to a point without sending the point anywhere.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import openpyxl

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "tambon.json"


def rows(ws):
    it = ws.iter_rows(values_only=True)
    hdr = next(it)
    for r in it:
        if r and any(v is not None for v in r):
            yield dict(zip(hdr, r))


def code(pcode: str) -> int:
    return int(pcode[2:])  # "TH100101" → 100101: the DOPA code GISTDA and the DMR use too


def main(path: str) -> None:
    wb = openpyxl.load_workbook(path, read_only=True)
    pv = {code(r["adm1_pcode"]): [r["adm1_name1"], r["adm1_name"], round(r["center_lat"], 4), round(r["center_lon"], 4)]
          for r in rows(wb["tha_admin1"])}
    ap = {code(r["adm2_pcode"]): [r["adm2_name1"], r["adm2_name"]] for r in rows(wb["tha_admin2"])}
    tb = []
    for r in rows(wb["tha_admin3"]):
        c = code(r["adm3_pcode"])
        assert c // 100 in ap and c // 10000 in pv, r["adm3_pcode"]
        tb.append([c, r["adm3_name1"], r["adm3_name"], round(r["center_lat"], 4), round(r["center_lon"], 4)])
    tb.sort()
    out = {
        "source": "HDX COD-AB Thailand (Royal Thai Survey Department, OCHA), CC BY-IGO",
        "url": "https://data.humdata.org/dataset/cod-ab-tha",
        "read": "2026-10-23",
        "fields": {"p": "code: [th, en, lat, lon]", "a": "code: [th, en]", "t": "[code, th, en, lat, lon]"},
        "p": pv, "a": ap, "t": tb,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(pv)} provinces, {len(ap)} districts, {len(tb)} subdistricts → {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main(sys.argv[1])

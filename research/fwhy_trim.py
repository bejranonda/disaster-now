"""A prototype of the trimmed FloodWatch gauge file Thai Risk's collector could publish (2026-10-24; not wired in).

Reads a saved /api/stations answer and writes the proposed shape, then prints the sizes raw and gzipped. Field
meanings are FloodWatch's (src/floodwatch/api/__init__.py, risks.py, forecast/__init__.py at commit 4d700de):
  status      normal / watch (>= 70 % of the bank depth) / warning (>= 90 %) / critical (at or over the bank) / unknown
  o24         qc.observed24: the MEASURED 24 h change, cm (FloodWatch's upstream rule reads this, >= 30 cm)
  c12, c24    the model's change at +12 / +24 h: median, likely (25-75 %), range90 (5-95 %) in m, method, skill vs
              "no change", confidence ("low" / "medium"; there is no "high")
  b24, b48    bank_chance bands ("<5%", "5-25%", "25-50%", ">50%"): FloodWatch's own check found the middle bands
              about 3x too high (25-50 % came true 12 % of the time), so it never prints them as a percent (D-077)
  up          learned upstream gauges [code, lag_h]: the lag (1-48 h) at which their 24 h change best correlates
              with this gauge's 24 h change; statistical, not a routed travel time
  tw          FloodWatch's "same place" twin (another agency's gauge), never an upstream gauge

    python3 -I research/fwhy_trim.py <stations.json> <out.json>
"""
from __future__ import annotations

import gzip
import json
import sys


def r(x, nd=2):
    return None if x is None else round(float(x), nd)


def change(c):
    if not c:
        return None
    out = {"m": r(c.get("median")), "l": [r(v) for v in c.get("likely") or []] or None,
           "r90": [r(v) for v in c.get("range90") or []] or None, "k": c.get("method"),
           "s": r(c.get("skill"), 2), "cf": c.get("confidence")}
    if "proven" in c:
        out["pv"] = c["proven"]
    return out


def trim(st: dict) -> dict:
    return {
        "c": st["code"], "n": st.get("name_th"), "la": r(st.get("lat"), 4), "lo": r(st.get("lon"), 4),
        "rv": st.get("river"), "ag": st.get("agency"), "pv": st.get("province"),
        "bk": r(st.get("bank_msl")), "bs": st.get("bank_source"),
        "lv": r(st.get("level_msl")), "t": st.get("obs_time"), "stale": bool(st.get("stale")),
        "st": st.get("status"), "fb": r(st.get("freeboard_m")), "pct": r(st.get("pct_bank"), 0),
        "o24": (st.get("observed24") or {}).get("change_cm"),
        "c12": change(st.get("change12")), "c24": change(st.get("change24")),
        "b24": st.get("bank_chance24"), "b48": st.get("bank_chance48"), "pk": st.get("peak_h"),
        "up": [[u["code"], u.get("lag_h")] for u in st.get("upstream") or []] or None,
        "tw": (st.get("twin") or {}).get("code"), "ft": st.get("forecast_time"),
        "nt": st.get("notes") or None,
    }


def main(src: str, dst: str):
    d = json.load(open(src))
    rows = [trim(s) for s in d["stations"] if s.get("lat") is not None and s.get("agency") != "BMA"]
    out = {"source": "FloodWatch https://flood.autobahn.bot/api/stations", "generated": d.get("generated"),
           "n": len(rows), "gauges": rows}
    raw = json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode()
    open(dst, "wb").write(raw)
    full = json.dumps(d, ensure_ascii=False, separators=(",", ":")).encode()
    print(f"/api/stations as saved: {len(full):,} B raw, {len(gzip.compress(full, 9)):,} B gzip; {len(d['stations'])} gauges")
    print(f"trimmed (no BMA canals, located only): {len(raw):,} B raw, {len(gzip.compress(raw, 9)):,} B gzip; {len(rows)} gauges")
    south = [g for g in rows if (next((s for s in d["stations"] if s["code"] == g["c"]), {}).get("region")) == "south"]
    rs = json.dumps({"gauges": south}, ensure_ascii=False, separators=(",", ":")).encode()
    print(f"trimmed, the south only: {len(rs):,} B raw, {len(gzip.compress(rs, 9)):,} B gzip; {len(south)} gauges")
    for c in ("X.44", "X.90", "SLA003", "X.173A"):
        g = next((x for x in rows if x["c"] == c), None)
        print(json.dumps(g, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

"""Experiment C, comparison: does the ranking of the 15 cities by predicted felt shaking (eq_felt_rates.py) agree with
Thailand's legal seismic zones?

Run:  nice -n 19 <venv>/bin/python -I research/eq_hazard_compare.py   (after eq_felt_rates.py)
Zones: Ministerial Regulation on seismic design of buildings B.E. 2564 (Royal Gazette vol. 138 part 16 ก p. 13,
4 Mar 2021; https://ratchakitcha.soc.go.th/documents/17159461.pdf, read 2026-10-24), clause 3:
zone 1 "ต้องเฝ้าระวัง" (watch), zone 2 "ระดับปานกลาง" (moderate), zone 3 "ระดับสูง" (high); provinces in no zone = 0.
No numeric hazard (PGA, Ss/S1) per city could be retrieved (GEM's map is an image/licensed grid; the DPT standard
did not load), so only ranks are compared. Spearman rank correlation, with its p-value (n = 15, ties present).
Writes research/logs/eq_hazard_compare-2026-10-24.log.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from scipy.stats import spearmanr  # noqa: E402

from eq_common import OUT, Log  # noqa: E402

L = Log("eq_hazard_compare")
ZONE = {"Bangkok": 2, "Chiang Mai": 3, "Chiang Rai": 3, "Mae Hong Son": 3, "Mae Sot (Tak)": 3, "Kanchanaburi": 3,
        "Phuket": 2, "Ranong": 2, "Khon Kaen": 0, "Udon Thani": 0, "Nakhon Ratchasima": 0, "Hat Yai (Songkhla)": 1,
        "Surat Thani": 1, "Ubon Ratchathani": 0, "Nan": 3}
j = json.loads((OUT / "eq_felt_rates.json").read_text())["cities"]
L(f"{'city':>19} zone | per 10 yr >= III, >= IV (declustered) | >= III, >= IV without M>=8 (post-hoc)")
for c, z in ZONE.items():
    d, s = j[c]["decl"]["per10"], j[c]["d<8"]["per10"]
    L(f"{c:>19}  {z}   | {d['3.0']:5.1f} {d['4.0']:5.1f} | {s['3.0']:5.1f} {s['4.0']:5.1f}")
for label, key, thr in (("decl >= III", "decl", "3.0"), ("decl >= IV", "decl", "4.0"), ("decl >= V", "decl", "5.0"),
                        ("no-M8 >= III", "d<8", "3.0"), ("no-M8 >= IV", "d<8", "4.0")):
    xs = [j[c][key]["per10"][thr] for c in ZONE]
    r, p = spearmanr(list(ZONE.values()), xs)
    L(f"Spearman(zone, {label}) = {r:+.2f} (p = {p:.3f})")
nb = [c for c in ZONE if c != "Bangkok"]
for label, key, thr in (("decl >= III", "decl", "3.0"), ("decl >= IV", "decl", "4.0"), ("no-M8 >= IV", "d<8", "4.0")):
    r, p = spearmanr([ZONE[c] for c in nb], [j[c][key]["per10"][thr] for c in nb])
    L(f"without Bangkok (soft-clay term): Spearman(zone, {label}) = {r:+.2f} (p = {p:.3f})")

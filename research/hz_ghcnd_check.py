"""Why GHCN-Daily was not used for Experiment B (hazards research, 2026-10-24): Thai PRCP coverage in the inventory, and
the yearly completeness of one station (Chiang Mai, TH000048327). Reads files already downloaded to $HZ_DATA/ghcnd
(ghcnd-stations.txt, ghcnd-inventory.txt from https://www.ncei.noaa.gov/pub/data/ghcn/daily/, and
.../global-historical-climatology-network-daily/access/TH000048327.csv). No network.
Run: python -I research/hz_ghcnd_check.py -> research/logs/hz_ghcnd_check-2026-10-24.log"""
import os, pathlib
import pandas as pd
HZ = pathlib.Path(os.environ.get("HZ_DATA", "/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/hz/dl")) / "ghcnd"
LOG = pathlib.Path(__file__).resolve().parent / "logs" / "hz_ghcnd_check-2026-10-24.log"
out = []
for f in ("ghcnd-stations.txt", "ghcnd-inventory.txt", "TH000048327.csv"):
    out.append(f"{f}: {(HZ / f).stat().st_size} bytes")
st = [l for l in (HZ / "ghcnd-stations.txt").read_text().splitlines() if l.startswith("TH")]
inv = [l.split() for l in (HZ / "ghcnd-inventory.txt").read_text().splitlines() if l.startswith("TH") and " PRCP " in l]
last = pd.Series([int(r[5]) for r in inv]).value_counts().sort_index()
out.append(f"Thai stations in GHCN-Daily: {len(st)}; with PRCP: {len(inv)}; last PRCP year: {last.to_dict()}")
out.append(f"PRCP into 2024 or later: {sum(int(r[5]) >= 2024 for r in inv)}")
d = pd.read_csv(HZ / "TH000048327.csv", usecols=["DATE", "PRCP", "PRCP_ATTRIBUTES"], low_memory=False)
d["DATE"] = pd.to_datetime(d.DATE)
g = d.groupby(d.DATE.dt.year).agg(days=("DATE", "size"), with_prcp=("PRCP", "count"))
out.append("Chiang Mai TH000048327 days with PRCP by year: " + ", ".join(f"{y}: {r.with_prcp}/{r.days}" for y, r in g.loc[1990:].iterrows()))
out.append(f"last PRCP value: {d.dropna(subset=['PRCP']).DATE.max():%Y-%m-%d}; source flags 2020+: "
           f"{d[(d.DATE.dt.year >= 2020)].PRCP_ATTRIBUTES.dropna().str.split(',').str[2].value_counts().to_dict()}")
print("\n".join(out))
LOG.write_text("\n".join(out) + "\n")

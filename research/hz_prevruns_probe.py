"""What Open-Meteo's previous-runs API actually serves (hazards research, 2026-10-24): 5 small calls (weight 1 each),
ledger in research/logs/openmeteo-calls-2026-10-24.log. Run: python -I research/hz_prevruns_probe.py
-> research/logs/hz_prevruns_probe-2026-10-24.log"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from hz_openmeteo import get, spent  # noqa: E402
LOG = pathlib.Path(__file__).resolve().parent / "logs" / "hz_prevruns_probe-2026-10-24.log"
out = []
V = "precipitation,precipitation_previous_day1,precipitation_previous_day2,precipitation_previous_day3"
for model, a, b in (("ecmwf_ifs025", "2024-01-01", "2024-01-14"), ("ecmwf_ifs025", "2023-12-01", "2023-12-14"),
                    ("jma_gsm", "2019-07-01", "2019-07-14"),
                    ("ecmwf_ifs025", "2024-06-01", "2024-06-14"), ("ecmwf_ifs025", "2025-06-01", "2025-06-14")):
    js = get("https://previous-runs-api.open-meteo.com/v1/forecast",
             dict(latitude=13.75, longitude=100.5, hourly=V, models=model, start_date=a, end_date=b, timezone="GMT"),
             f"B prevruns probe {model} {a}")
    h = js.get("hourly")
    if not h:
        out.append(f"{model} {a}..{b}: {json.dumps(js)[:300]}")
        continue
    cnt = {k: sum(v is not None for v in vals) for k, vals in h.items() if k != "time"}
    out.append(f"{model} {a}..{b}: {len(h['time'])} hours; non-null per variable {cnt}")
out.append(f"weight spent so far by this task: {spent():.1f}")
print("\n".join(out))
with LOG.open("a") as f:
    f.write("\n".join(out) + "\n")

"""Print the report's tables (docs/research/predict-air-2026-10-24.md) from the experiments' JSON results.

Run:  <venv>/bin/python -I research/aq_tables.py
Reads research/out/aq_expA_results.json, aq_expB_results.json, aq_expB_asissued.json, aq_expC_results.json;
writes Markdown tables to research/logs/aq_tables-2026-10-24.log.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import OUT, Log  # noqa: E402

L = Log("aq_tables")


def ci(v, nd=2):
    return f"{v[0]:+.{nd}f} [{v[1]:+.{nd}f}, {v[2]:+.{nd}f}]"


def main():
    A = json.loads((OUT / "aq_expA_results.json").read_text())
    ref = A["choose"]["reference"]
    L.w(f"## Exp A: Brier and Brier skill (damp_dress = damped ratio dressed with a lognormal error; reference "
        f"persistence = {ref}); chosen on S2: {A['choose']['chosen']}")
    L.w("| Test set | Lead | Event | n | base rate | Brier clim | Brier persistence | Brier damped (page-rounded) | "
        "BSS vs clim | BSS vs persistence |")
    L.w("|---|---|---|---|---|---|---|---|---|---|")
    for t, recs in A["tests"].items():
        for key, r in recs.items():
            lead, T = key.split("|")
            if lead == "lead3":
                continue
            b = r["brier"]
            L.w(f"| {t} | {lead[-1]} | > {T} | {r['n']} | {100*r['base_rate']:.1f} % | {b['clim']:.4f} | {b[ref]:.4f} | "
                f"{b['damp_dress']:.4f} ({r['brier_page_rounded']['damp_dress']:.4f}) | "
                f"{ci(r['BSS_damp_dress_vs_clim'])} | {ci(r['BSS_damp_dress_vs_' + ref])} |")
    L.w("\n## Exp A: reliability as the page would show it (damp_dress, rounded to tens, kept within 10–90 %)")
    for t in ("B-S3S4 pooled (disjoint stations, both later seasons)", "north-B-S3S4 (Chiang Rai, Nan, Mae Hong Son, Phrae)",
              "north-A-S3S4 (Chiang Mai, Lampang, Phayao)", "Oct-2026 quiet (e3 stations, 20 Sep–22 Oct)"):
        for key in ("lead1|37.5", "lead2|37.5", "lead1|75.0", "lead2|75.0"):
            r = A["tests"].get(t, {}).get(key)
            if not r:
                continue
            L.w(f"- {t}, {key}: " + "; ".join(f"{b['shown']} → {100*b['obs_freq']:.0f} % (n {b['n']})"
                                               for b in r["page_reliability_damp_dress"]))
    L.w("\n## Exp A: fitted dressing (sample A, S1+S2)")
    for k in (1, 2, 3):
        p = A["fitted"][f"damp_dress|lead{k}|37.5"]
        L.w(f"- lead {k}: mu = {p['mu']:+.4f}, sd = {p['sd']:.4f}")

    # what the page would show: p = 1 - Phi((ln T - ln f) / sd), mu set to 0 (fitted |mu| <= 0.004)
    from scipy.stats import norm
    import math
    sds = {k: A["fitted"][f"damp_dress|lead{k}|37.5"]["sd"] for k in (1, 2, 3)}
    L.w("\n## Exp A: the chance for a damped forecast f (mu = 0; sd per day as fitted), before rounding")
    L.w("| f µg/m³ | today > 37.5 | tomorrow > 37.5 | day after > 37.5 | today > 75 | tomorrow > 75 | day after > 75 |")
    L.w("|---|---|---|---|---|---|---|")
    for f in (15, 20, 25, 28, 30, 33, 37.5, 42, 50, 60, 75, 90, 110):
        cells = [f"{100*(1-norm.cdf((math.log(T)-math.log(f))/sds[k])):.0f} %" for T in (37.5, 75.0) for k in (1, 2, 3)]
        L.w(f"| {f} | " + " | ".join(cells) + " |")
    for q in (0.05, 0.2, 0.5, 0.95):
        L.w(f"- f at which the chance of > 37.5 reaches {int(q*100)} %: " + ", ".join(
            f"day {k} {37.5*math.exp(-norm.ppf(1 - q)*sds[k]):.1f}" for k in (1, 2, 3))
            + "; of > 75: " + ", ".join(f"day {k} {75*math.exp(-norm.ppf(1 - q)*sds[k]):.1f}" for k in (1, 2, 3)))

    B = json.loads((OUT / "aq_expB_results.json").read_text())
    L.w("\n## Exp B: MAE µg/m³ (n); Δ vs damped with 90 % interval")
    cols = ["clim", "raw_cams", "persist", "damped", "damped_met", "damped_fire", "ridge_stat", "ridge_met", "ridge_fire",
            "ridge_all", "qr_all", "gbm_all"]
    L.w("| Test set | Lead | n | " + " | ".join(cols) + " |")
    L.w("|---|---|---|" + "---|" * len(cols))
    for t, recs in B["tests"].items():
        for lead in ("lead1", "lead2"):
            r = recs.get(lead)
            if not r:
                continue
            n = r["damped"]["n"]
            L.w(f"| {t} | {lead[-1]} | {n} | " + " | ".join(f"{r[c]['mae']:.2f}" if c in r else "–" for c in cols) + " |")
    L.w("\n### Δ MAE vs damped [90 %] and stations made worse")
    for t, recs in B["tests"].items():
        for lead in ("lead1", "lead2"):
            r = recs.get(lead)
            if not r:
                continue
            parts = []
            for c in ("persist", "damped_met", "damped_fire", "ridge_met", "ridge_fire", "ridge_all", "gbm_all"):
                if c in r and "dMAE_vs_damped" in r[c]:
                    w = r[c].get("stations_worse_than_damped") or []
                    parts.append(f"{c} {ci(r[c]['dMAE_vs_damped'])}" + (f" worse at {', '.join(w)}" if w else ""))
            L.w(f"- {t} lead {lead[-1]}: " + "; ".join(parts))
    L.w("\n### What each source adds (paired Δ MAE [90 %])")
    for t, recs in B["tests"].items():
        for lead in ("lead1", "lead2"):
            r = recs.get(lead)
            if not r:
                continue
            inc = {k[len('increment_'):]: v for k, v in r.items() if k.startswith("increment_")}
            L.w(f"- {t} lead {lead[-1]}: " + "; ".join(f"{k} {ci(v)}" for k, v in inc.items()))

    Bi = json.loads((OUT / "aq_expB_asissued.json").read_text())
    L.w("\n## Exp B as issued (B-S4): damped_met with forecast weather")
    for t, r in Bi["tests"].items():
        L.w(f"- {t}: n {r['n']}; MAE persist {r['persist']['mae']:.2f}, damped {r['damped']['mae']:.2f}, "
            f"with ERA5 {r['damped_met_era5']['mae']:.2f} ({ci(r['dMAE_damped_met_era5_vs_damped'])}), "
            f"with forecasts {r['damped_met_forecast']['mae']:.2f} ({ci(r['dMAE_damped_met_forecast_vs_damped'])}); "
            f"band agreement damped {100*r['damped']['band']:.1f} % → {100*r['damped_met_forecast']['band']:.1f} %; "
            f"worse at {r['stations_worse_damped_met_forecast']}")

    C = json.loads((OUT / "aq_expC_results.json").read_text())
    f = C["pm10_frequency"]
    L.w(f"\n## Exp C\n- PM10 > 120: {100*f['share_gt120']:.2f} % of {f['station_days']} station-days at {f['stations']} stations "
        f"(Dec–Apr {100*f['share_gt120_DecApr']:.2f} %); PM2.5 <= 37.5 on {f['exceed_pm25_le_37_5']} of {f['exceed_with_pm25']} such days")
    for lead, r in C["pm10_forecast"].items():
        L.w(f"- PM10 {lead}: n {r['n']} at {r['stations']}: MAE " + ", ".join(f"{k} {v:.2f}" for k, v in r["mae"].items())
            + "; bias " + ", ".join(f"{k} {v:+.2f}" for k, v in r["bias"].items()))
    o = C["ozone"]
    L.w(f"- O3 (26 Jul–23 Oct 2026, 3 stations): {o['station_days']} station-days, max {o['max_obs_ppb']:.0f} ppb, "
        f"{o['days_gt70']} days > 70 ppb")
    for lead in ("lead1", "lead2"):
        r = o[lead]
        L.w(f"- O3 {lead}: n {r['n']}: MAE " + ", ".join(f"{k} {v:.1f}" for k, v in r["mae"].items()) + " ppb; bias "
            + ", ".join(f"{k} {v:+.1f}" for k, v in r["bias"].items()))


if __name__ == "__main__":
    main()

"""Assemble research/out/calibration.json from the experiment results.

Run (after e3_pm25.py, e4_quake_ipe.py and e1e2_weather.py):
    python3 research/build_calibration.py
Every number is copied from research/out/e*_results.json (which the experiment scripts wrote
from running code); the verdict words are this file's and are explained in
docs/research/forecast-validation-2026-10-23.md.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import OUT  # noqa: E402
import heat_index as H  # noqa: E402


def r2(x, n=3):
    if isinstance(x, float):
        return round(x, n)
    if isinstance(x, dict):
        return {k: r2(v, n) for k, v in x.items()}
    if isinstance(x, list):
        return [r2(v, n) for v in x]
    return x


def pick(d, *keys):
    return {k: d[k] for k in keys if k in d}


def cat_short(c):
    return pick(c, "events", "POD", "FAR", "CSI", "freq_bias")


def main():
    e3 = json.loads((OUT / "e3_results.json").read_text())
    e4 = json.loads((OUT / "e4_results.json").read_text())
    e12 = json.loads((OUT / "e1e2_results.json").read_text())
    cal = {"generated": "2026-10-23", "report": "docs/research/forecast-validation-2026-10-23.md",
           "protocol": "choose/fit on an earlier period at sample-A stations, score on a later period, confirm on "
                       "disjoint sample-B stations; 'made worse' = MAE rise > 3 % and moving-block bootstrap lower "
                       "5 % bound > 0 (FloodWatch GUIDELINES §4)"}

    # ---------------- heat index
    hf = e12["heat_linear_fit_2025_A"]
    h = e12["heat"]
    ens = e12.get("ens", {})

    def hrow(name, lead):
        x = h[f"{name}|lead{lead}"]
        out = {}
        for m in ("raw", "linear national", "persist(issue day)", "blend+persist (post-hoc)"):
            if m in x:
                out[m] = dict(n=x[m]["n"], mae=x[m]["mae"], bias=x[m]["bias"], band_agree=x[m]["band_agree"],
                              ge42=cat_short(x[m]["ge42.0"]))
        for k, v in x.items():
            if k.startswith("delta_mae"):
                out[k] = v
        return out

    worse = {}
    for k, v in e12["heat_per_station_2026"].items():
        s, lead = k.split("|")
        if v["linear national vs raw"]["worse"]:
            worse.setdefault(lead, []).append(s)
    cal["heat_index"] = {
        "use_raw": False,
        "why": "the raw ECMWF heat index is about 5 °C too low against the stations' daily maximum (2–3 °C of it "
               "from a too-cold, too-dry afternoon at the grid point; ~1 °C from sampling two afternoon hours), so "
               "raw P(HI >= 42) is almost never above zero on days that reach 42",
        "formula": "NWS heat index (research/heat_index.py), per member, then HI_cal = a + b * HI_raw; daily max over "
                   "the member's afternoon hours",
        "applies_to": "Open-Meteo ensemble, models=ecmwf_ifs025 (checked: its members equal the ECMWF open-data "
                      "GRIB values at the nearest 0.25° point to within 0.07 °C, 2026-10-23). NOT tested for "
                      "best_match or other deterministic models.",
        "lead_day_1": {"a": hf["1"]["a"], "b": hf["1"]["b"], "n_fit": hf["1"]["n"], "resid_sd": hf["1"]["resid_sd"],
                       "use_for_windows_h": "0–24 and 24–48"},
        "lead_day_2": {"a": hf["2"]["a"], "b": hf["2"]["b"], "n_fit": hf["2"]["n"], "resid_sd": hf["2"]["resid_sd"],
                       "use_for_windows_h": "48–72 (fitted on 54–57 h; 72 h not tested)"},
        "probability": {"method": "dress each corrected member with a normal error of SD = lead_day_1.resid_sd and "
                                  "average P(member + error >= threshold) over members; the raw ensemble spread alone "
                                  "is far too narrow (its 10–90 % range held 2 % of observed maxima)",
                        "sd": hf["1"]["resid_sd"], "status": "design chosen after seeing the 2026 ENS spread; SD from 2025 only"},
        "fitted_on": "2025-03-01..2025-10-31, 00 UTC HRES runs, 8 TMD synoptic stations (sample A)",
        "tests": {"2026 A (later)": {"lead1": hrow("2026 A (later)", 1), "lead2": hrow("2026 A (later)", 2)},
                  "2026 B (held-out stations)": {"lead1": hrow("2026 B (later, held-out stations)", 1),
                                                 "lead2": hrow("2026 B (later, held-out stations)", 2)},
                  "2026 hot season Mar–May, A+B": {"lead1": hrow("2026 A+B hot season Mar–May", 1)}},
        "stations_made_worse_than_raw_2026": worse,
        "note": "where an observed maximum for the place exists (a TMD station), 'today's observed maximum' beats "
                "the corrected model by 0.3–0.7 °C MAE at days 1–2; the app has no such observation at most points.",
    }
    for key in ("heat|raw|A+B|lead1", "heat|corrected|A+B|lead1", "heat|corrected+dressed|A+B|lead1",
                "heat|corrected+dressed|A|lead1", "heat|corrected+dressed|B|lead1"):
        if key in ens:
            e = ens[key]
            cal["heat_index"]["tests"].setdefault("ENS 2026-03-15..05-15 every 2nd day, day 1", {})[key.split("|")[1] + "|" + key.split("|")[2]] = {
                "n": e["n"], "median_mae": e["median"]["mae"], "median_bias": e["median"]["bias"],
                "range_10_90_held": e["cover_10_90"],
                "P(HI>=42) brier": e["ge42.0"]["brier"], "bss_vs_2024_station_month": e["ge42.0"]["bss"],
                "bss_vs_sample_base_rate": e["ge42.0"]["bss_vs_base_rate"], "reliability": e["ge42.0"]["reliability"]}
    cal["heat_index"]["test_vectors"] = [dict(t_c=t, rh=rh, hi_c=hi, branch=b) for t, rh, hi, b in H.TEST_VECTORS]
    cal["heat_index"]["levels_c"] = {"เฝ้าระวัง": [27.0, 32.9], "เตือนภัย": [33.0, 41.9], "อันตราย": [42.0, 51.9], "อันตรายมาก": [52.0, None]}

    # ---------------- rain
    rr = e12["rain"]
    tuned = e12["rain_tuned_threshold_2024A"]

    def rrow(name, lead, thr):
        x = rr[f"{name}|lead{lead}"][f"ge{thr}"]
        return {"raw": cat_short(x["raw"]), "tuned": cat_short(x["tuned"]), "tuned_threshold_mm": x["tuned_threshold"],
                "brier_climatology": x["brier_climatology"], "brier_raw_yes_no": x["brier_raw_yesno"]}
    ensr = {k: {"n": v["n"], "events": v["ge35.1"]["events"], "brier": v["ge35.1"]["brier"],
                "bss_vs_climatology": v["ge35.1"]["bss"], "bss_vs_base_rate": v["ge35.1"].get("bss_vs_base_rate"),
                "warning_at_P>=0.1": cat_short(v["ge35.1"]["p_ge_0_1"]) if "p_ge_0_1" in v["ge35.1"] else None,
                "median_mae_mm": v["median"]["mae"], "range_10_90_held": v["cover_10_90"],
                "reliability": v["ge35.1"]["reliability"]}
            for k, v in ens.items() if k.startswith("rain|")}
    cal["rain_24h"] = {
        "use_raw": True,
        "verdict": "do not show a point yes/no or a point amount for heavy rain; show the ENS chance only as a coarse "
                   "word, lead with TMD's own warning, and never make 'no heavy rain' sound safe",
        "why": "at a station, the HRES forecast of >= 35.1 mm in 24 h has POD 0.04–0.13 and CSI 0.03–0.09 at "
               "24–72 h in 2025 (Brier worse than climatology); lowering the forecast threshold (chosen on 2024) "
               "raises POD to ~0.4 but with FAR ~0.9; the ENS probability has a Brier skill near or below zero "
               "against climatology; no correction tried beat raw on the later year by more than chance",
        "thresholds_mm": {"heavy": 35.1, "very_heavy": 90.1, "day": "07:00–07:00 Bangkok (TMD)"},
        "hres_tests": {"2025 A lead1 ≥35.1": rrow("2025 A (later)", 1, 35.1),
                       "2025 B lead1 ≥35.1": rrow("2025 B (later, held-out stations)", 1, 35.1),
                       "2025 A lead2 ≥35.1": rrow("2025 A (later)", 2, 35.1),
                       "2026 A+B (partial) lead1 ≥35.1": rrow("2026 A+B (newest, partial: BUFR)", 1, 35.1)},
        "tuned_thresholds_2024A": tuned,
        "ens_tests": ensr,
    }

    # ---------------- gusts
    cal["wind_gust"] = {"use_raw": True, "validated": False,
                        "why": "no gust observations in the GHCNh records of the 18 stations used (2025–2026), so "
                               "P(gust >= 40 km/h) was not tested; show it as unverified"}

    # ---------------- PM2.5
    t = e3["tests"]
    pmt = {}
    for name in t:
        pmt[name] = {lead: {m: dict(n=v["n"], mae=v["mae"], bias=v["bias"], band_agree=v["band_agree"],
                                    ge37_6=cat_short(v["ge37.6"]), ge75_1=cat_short(v["ge75.1"]))
                            for m, v in t[name][lead].items() if m in ("raw", "persist", "ratio", "blend", "damped_posthoc", "gbm")}
                     for lead in t[name]}
    cal["pm25"] = {
        "use_raw": False,
        "method": "damped ratio: forecast 24-h mean for window k = obs_mean_last_24h * (CAMS_mean(window k) / "
                  "CAMS_mean(last 24 h)) ** beta_k; it is the app's planned ratio correction with the CAMS change "
                  "damped (beta = 1 is the planned method, beta = 0 is persistence)",
        "beta": {"0-24h": e3["damped_posthoc_betas"]["1"], "24-48h": e3["damped_posthoc_betas"]["2"],
                 "48-72h": e3["damped_posthoc_betas"]["3"]},
        "status": "PROVISIONAL: the damped form was added after the first test run (post-hoc); its betas were fitted "
                  "on Dec 2025–Feb 2026 only. Re-test as issued on Dec 2026–Feb 2027 (archive CAMS forecasts as issued) "
                  "before calling it validated.",
        "needs": "a measured or GISTDA-estimated 24-h mean at the point; without one, show no PM2.5 outlook number "
                 "(raw CAMS ran 10–13 µg/m³ low in Mar–Apr 2026 and caught 17–21 % of days >= 75.1)",
        "planned_ratio_method_verdict": "better than raw CAMS but worse than persistence at 0–24 h (made worse beyond "
                                        "chance at 4 of 10 stations in Mar–Apr 2026 and 7 of 10 in Oct 2026)",
        "gbm": "rejected: worse than the blend and than persistence on every disjoint test (it cannot extrapolate to "
               "burning-season levels it never saw)",
        "caveat": "CAMS history from Open-Meteo is stitched short-lead forecasts, so every CAMS-based score here is "
                  "an upper bound for a 24–72 h-old forecast",
        "fitted_on": "Dec 2025–Feb 2026, Air4Thai daily means, 4 stations (sample A: 35t, 50t, 46t, 44t)",
        "tests": pmt,
        "bands_ug_m3": [15.0, 25.0, 37.5, 75.0],
    }

    # ---------------- earthquakes
    bt = e4["bangkok_term"]
    w = e4["wording"]
    cal["earthquake_felt"] = {
        "forecasting": "none: earthquakes cannot be forecast; this only estimates how strongly a quake that has "
                       "happened was probably felt at a point",
        "ipe": e4["ipe"],
        "validation": {k: v for k, v in e4["summaries"].items() if "Thailand" in k or "nresp>=3" in k},
        "bangkok_metro_term_mmi": bt["value"],
        "bangkok_metro_term_detail": {"applies_to": "Bangkok, Nonthaburi, Samut Prakan, Pathum Thani",
                                      "fitted_on_events": bt["fitted_on"], "tested_on_events": bt["tested_on"],
                                      "test_event_mae_without": bt["test_mae_without"],
                                      "test_event_mae_with": bt["test_mae_with"],
                                      "status": "small sample: 10 fitting events, 2 test events of one sequence"},
        "wording_mmi_thresholds": {
            "รู้สึกได้ชัด": 4.5, "อาจรู้สึกได้": 2.5,
            "below": "say 'ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง', never 'not felt'",
            "never": "never claim or rule out damage",
            "predictor": "AWW12 hypocentral form + the Bangkok-metro term",
            "evidence": {k: pick(v, "thresholds", "felt_cities", "felt_but_said_not", "cdi_ge5_cities",
                                 "cdi_ge5_said_clearly", "said_clearly", "said_clearly_and_cdi_lt4")
                         for k, v in w.items()},
            "status": "chosen on the same DYFI reports it is shown on (in-sample wording rule); DYFI over-represents "
                      "people who felt the quake"},
    }

    # ---------------- flood
    cal["flood"] = {"model_here": None,
                    "use": "link to FloodWatch; its skill is its own (docs/research/forecast-validation-2026-10-23.md §5)"}
    (OUT / "calibration.json").write_text(json.dumps(r2(cal, 4), indent=1, ensure_ascii=False))
    print(f"wrote {OUT / 'calibration.json'} ({(OUT / 'calibration.json').stat().st_size} bytes)")


if __name__ == "__main__":
    main()

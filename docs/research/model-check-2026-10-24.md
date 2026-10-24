# Model check: the heat correction by region and season, an as-issued spot check, and a forecast archive (24 Oct 2026)

> Owner: "validate the model outcome, and cross-validate the correction of output and forecasting results."

Independent check of the heat-index correction in `public/js/calibration.js` (MODELS §1, §7.7). It also includes a
spot check of today's forecasts against METARs and the start of an archive of issued forecasts (MODELS §7.8). Every
number below comes from a script in `research/`, and each run's output is in `research/logs/*-2026-10-24.log`.
Nothing in `public/` was changed.

## 0. Verdicts at a glance

| Question | Answer |
|---|---|
| Does the national heat line (HI = 10.375 + 0.8647·HI_raw) hold by region and season? | **Not in Nov–Feb.** It runs **+2.7 to +4.6 °C hot** (by region and month) in the North, Northeast and Central/Bangkok from November to February, and up to +5.3 °C at single stations (all 79 stations and airports; 61 of them never used in a fit). Its MAE there is 3.7–4.1 °C (2.9–4.6 by month), **worse than no correction at all**: on the disjoint stations MAE is 3.56 °C corrected against 3.07 °C raw. It puts a day in a **higher band than observed on 42–58 % of cool-season days** in those regions, and calls เตือนภัย (≥ 33 °C) falsely on 38–49 % of all days. In Mar–Oct it holds roughly as reported at the 18 fit stations, but over all stations it runs +0.9 to +1.9 °C hot in the North, Northeast and Central. |
| The page's own ensemble method, Nov–Feb | On the disjoint stations, the corrected median is +3.28 °C hot. Its 10–90 % range holds 56 % of observations (target 80 %), and "เตือนภัย likely" is false on 43 % of days (North 51 %, Northeast 56 %) (§1.8). |
| Chiang Mai (the §7.7 case) | Chiang Mai airport, Nov–Feb: **+4.7 °C**, a band too high on 72 % of days, false เตือนภัย on 64 % of days. In the second half of October it reads +2.6 to +4.1 °C hot (2024–2026). |
| A region or season term (pre-registered test) | The pre-registered choice, C5 (a Nov–Feb refit, HI = 0.560 + 1.0896·HI_raw at day 1), halves the cool-season error on disjoint stations (3.56 → 1.60 °C). It makes 4 stations worse where the current line makes 44 worse. It **fails the pre-registered safety rule**: it would miss most cool-season danger days (≥ 42 °C), which fall in the **first half of November** and in **February**. **Verdict: do not ship C5.** |
| What to do instead | **Wait, and don't trust the line in Nov–Feb meanwhile.** A post-hoc correction of the inputs (C6: T + 1.66 °C, Td + 1.49 °C, then the heat index, + 0.90 °C; one formula for every month) does as well as C5 in the cool season (MAE 1.53 °C) and keeps the danger days (7 of 29, against the current line's 8). In Mar–Oct its MAE equals the current line's (2.54 vs 2.55 °C), with fewer false อันตราย but fewer deterministic ≥ 42 hits (POD 0.70 vs 0.77). It is post-hoc, so it cannot ship from this run: pre-register it and test it as issued this winter. The owner decides whether to ship it as provisional before then, as was done for PM2.5 (OWNER_ACTIONS). |
| Spot check, 23–24 Oct, 8 airports | Raw ensemble today **−3.2 °C** (raw HRES at day 1: −3.1 on 23 Oct, −3.6 on 24 Oct), not the "about 5 °C" of MODELS §1; airports read cooler than TMD stations. The corrected forecast was **+1.9 to +2.6 °C too hot** on average, too hot at 15 of 16 airport-days, and a band too high (อันตราย for เตือนภัย) at 4 of 8 airports each day. The dressed range held 8 of 8 (§2). |
| Archive | `research/archive_forecasts.mjs`, run once at 08:05 UTC: 12 points, `research/archive/2026-10-24/`. Its PM2.5 block was repaired offline after an unwrap bug (§3). |
| Found in MODELS.md | Five statements are overstated or untested; see §5. |

## 1. The heat correction by region and season (MODELS §7.7)

### 1.1 Data

- **Forecasts:** ECMWF IFS HRES 00 UTC runs from ECMWF open data, as issued, 2024-03-01 to 2026-10-23 (962 runs; 1–5 Mar 2024 lack a field in ECMWF's own index).
  - Same predictor as the national fit: day 1 = max HI at steps 30 and 33 (13:00 and 16:00 Bangkok the next day), day 2 = steps 54 and 57, nearest 0.25° point.
  - This host has no eccodes, numpy or pandas, so the fields are decoded by a pure-Node GRIB2/CCSDS reader (`research/lib/grib2_ccsds.mjs`, `research/ecmwf_points.mjs`).
  - **Checked:** it reproduces all **12,777** day-1 values of the earlier eccodes study within that file's 0.1 °C rounding (max |diff| 0.050 °C, `research/logs/obs_pipeline_check-2026-10-24.log`).
  - Volume: 11,549 byte-range requests, 5.3 GB, Google Cloud mirror.
- **Observations:** NOAA NCEI GHCNh hourly records of every Thai station, 2024–2026 (228 files, 1.0 GB; latest observation 21 Oct 2026).
  - Daily max HI over the Bangkok day, with the earlier study's rules. The plain-Python pipeline reproduces all **6,704** daily maxima of `research/data/e1e2_daily.csv` within rounding.
  - **Airports:** half-hourly METARs of the 8 spot-check airports from the Iowa Environmental Mesonet archive. The :00 reports are used, with the same rules.
- **Stations:**
  - A (8) and B (10): the 23 Oct study's stations.
  - **C (53):** every other Thai GHCNh station ≤ 500 m with ≥ 30 pairs, excluding islands and marine stations. Fixed in `research/data/thai_stations_regions.json` before any score.
  - Four C stations had no usable data: 48326 Mae Jo and 48553 Khanom have no GHCNh file, and 48429 Suvarnabhumi and 48454 Bangkok Port have no dew points.
  - **D (8):** the airports.
  - Chiang Mai's TMD station (Mae Jo 48326) has no GHCNh record, so Chiang Mai is scored at its airport (VTCC).
- **Regions:** TMD's, mapped to North, Northeast, Central/Bangkok, East and South (same file).
- **Pairs:** 90,481 station-day pairs (45,245 at day 1).

### 1.2 Design (pre-registered in the header of `research/heat_region_season.py`)

- **Part A:** the current line's error (forecast − observed; positive = too hot) by region × month.
- **Part B:** additive terms on the current line, fitted as mean residuals:
  - C1: season (Nov–Feb vs Mar–Oct).
  - C2: region.
  - C3: region × season.
  - C4: month.
  - C5: a Nov–Feb refit of (a, b).
- **Fit and choice:** fitted on 2024-10-01..2025-09-30 at A+B. Chosen by leave-one-station-out MAE.
- **Scoring:** on 2025-10-01..2026-10-23 at A+B, and on the disjoint C and D, against raw, persistence (the issue day's observed max) and climatology (same month a year earlier).
- **Ship rule**, all three required:
  1. Pooled MAE better on C (later period), with the 90 % date-block bootstrap interval of ΔMAE below 0.
  2. No more stations made worse than it fixes (> 3 % rise and bootstrap lower bound > 0).
  3. In Nov–Feb on C, POD for ≥ 42 and ≥ 33 not lower than the current line's by more than 0.05, where there are ≥ 20 events.

Anything added after the first run was read is marked **post-hoc** (§1.6–1.7).

### 1.3 Results: the current line by region and month (day 1, all rows; mean error / MAE °C, n)

Out-of-sample rows only (removing the fit's own 2025 Mar–Oct sample-A rows) change no cell by more than 0.2 °C (`research/logs/model_check_tables-2026-10-24.log`).

| Region | Nov | Dec | Jan | Feb | Mar–May | Jun–Sep | Oct |
|---|---|---|---|---|---|---|---|
| North | +3.5 / 3.7 (653) | +3.8 / 3.8 (728) | +4.2 / 4.2 (851) | +3.0 / 3.2 (660) | +1.1 / 2.7 (3183) | +1.6 / 2.9 (4184) | +1.3 / 2.5 (843) |
| Northeast | +3.6 / 3.8 (966) | +4.1 / 4.1 (1084) | +4.6 / 4.6 (1108) | +3.4 / 3.6 (771) | +1.3 / 2.7 (3394) | +1.8 / 2.7 (4202) | +1.9 / 2.6 (1128) |
| Central/Bangkok | +3.6 / 3.7 (733) | +3.7 / 3.8 (867) | +4.3 / 4.3 (882) | +2.7 / 2.9 (587) | +0.9 / 2.4 (2676) | +1.8 / 2.5 (4206) | +1.1 / 2.2 (819) |
| East | +2.0 / 2.8 (292) | +2.5 / 2.6 (376) | +3.0 / 3.2 (376) | +2.1 / 2.5 (224) | −0.6 / 2.4 (921) | +0.1 / 2.0 (1271) | +0.1 / 2.6 (192) |
| South | +1.2 / 2.6 (338) | +1.7 / 2.3 (415) | +2.1 / 2.8 (587) | +1.1 / 2.4 (427) | −0.3 / 2.4 (1941) | +0.6 / 2.2 (2969) | −0.2 / 2.3 (391) |
| All | +3.2 / 3.5 (2982) | +3.5 / 3.6 (3470) | +3.9 / 4.0 (3804) | +2.7 / 3.1 (2669) | +0.8 / 2.6 (12115) | +1.4 / 2.6 (16832) | +1.2 / 2.4 (3373) |

Day 2 has the same pattern, about 0.1–0.3 °C larger in Nov–Feb (Jan, Northeast: +4.9 / 4.9).

**Bands and false alarms, day 1** (TMD bands 27/33/42/52; "false" = forecast at or above, observed below, as a share of all days):

| Region | Season | band right | band too high | false เตือนภัย (≥ 33) | FAR ≥ 33 | ≥ 42 days | POD ≥ 42 | FAR ≥ 42 | false อันตราย (≥ 42) |
|---|---|---|---|---|---|---|---|---|---|
| North | Nov–Feb | 46 % | 53 % | 46 % | 0.57 | 24 | 0.54 | 0.54 | 1 % |
| North | Mar–Oct | 68 % | 25 % | 5 % | 0.05 | 2430 | 0.77 | 0.46 | 19 % |
| Northeast | Nov–Feb | 41 % | 58 % | 49 % | 0.61 | 23 | 0.39 | 0.62 | 0 % |
| Northeast | Mar–Oct | 66 % | 28 % | 5 % | 0.05 | 3081 | 0.84 | 0.44 | 23 % |
| Central/Bangkok | Nov–Feb | 57 % | 42 % | 38 % | 0.39 | 41 | 0.61 | 0.82 | 4 % |
| Central/Bangkok | Mar–Oct | 65 % | 31 % | 1 % | 0.01 | 3499 | 0.90 | 0.43 | 31 % |
| East | Nov–Feb | 70 % | 29 % | 26 % | 0.27 | 15 | 0.00 | 1.00 | 1 % |
| East | Mar–Oct | 70 % | 13 % | 1 % | 0.01 | 928 | 0.59 | 0.35 | 12 % |
| South | Nov–Feb | 84 % | 14 % | 12 % | 0.12 | 46 | 0.11 | 0.77 | 1 % |
| South | Mar–Oct | 63 % | 21 % | 1 % | 0.01 | 1888 | 0.55 | 0.50 | 20 % |
| All | Nov–Feb | 55 % | 44 % | 38 % | 0.43 | 149 | 0.35 | 0.77 | 1 % |
| All | Mar–Oct | 66 % | 25 % | 3 % | 0.03 | 11826 | 0.78 | 0.44 | 23 % |

In Nov–Feb, **raw** HRES gets the band right more often than the corrected forecast in the North (57 % vs 46 %), the Northeast (62 vs 41) and Central (69 vs 57). Persistence gets it right on 75–89 % of days.

**Per station, Nov–Feb, day 1** (selected; all 78 in the log):

| Station | Error | MAE | False เตือนภัย |
|---|---|---|---|
| Chiang Mai airport | +4.7 | 4.7 | 64 % |
| Chiang Rai airport | +4.9 | 4.9 | 55 % |
| Chiang Rai 48304 (A) | +4.2 | 4.2 | 74 % (n = 34) |
| Lampang 48334 (A) | +4.3 | 4.4 | 55 % |
| Bangkok Metropolis 48455 (A) | +3.1 | 3.2 | 22 % (false อันตราย 5 %) |
| Don Mueang | +5.0 | 5.1 | 45 % (false อันตราย 11 %) |
| Nakhon Phanom 48357 (B) | +5.0 | 5.1 | 61 % |
| Buriram | +5.3 | 5.3 | 61 % |
| Phuket 48564 (A) | −0.5 | 1.9 | 2 % |
| Mae Sariang 48325 (B, a valley) | −1.3 | 1.5 | 5 % |

The worst station is Doi Mu Soe (368 m, a ridge): +7.6, with false เตือนภัย on 56 % of days.

**Danger days in the cool season are few and fall at its edges:**
- Of 12,925 Nov–Feb station-days, 149 reached ≥ 42 °C. 107 of them were in November (80 in 1–15 Nov) and 37 in February; only 5 fell in Dec–Jan (`heat_cool_danger_days`).
- Bangkok Metropolis reached ≥ 42 °C on 46 % of October days, 7 % in November, 0 % in December and January, and 3 % in February (`bangkok_october_check`).

### 1.4 Why: the error lives in T and Td, not in the heat index

Model − observed at 13:00 and 16:00 Bangkok, day 1:

| Region | Nov–Feb T | Nov–Feb Td | Mar–Oct T | Mar–Oct Td |
|---|---|---|---|---|
| North | −1.6 | −1.1 | −1.8 | −0.6 |
| Northeast | −1.4 | −1.2 | −1.5 | −0.7 |
| Central/Bangkok | −0.7 | −1.8 | −1.6 | −0.6 |
| East | −1.5 | −1.5 | −2.2 | −0.8 |
| South | −2.0 | −1.0 | −2.0 | −0.8 |

The model's afternoon is about as cold and as dry in December as in April. The heat index, though, amplifies a T and Td error in humid heat much more than in dry cool air.

The same input errors (T +1.66, Td +1.49 °C) are worth +4.4 to +4.7 °C of heat index on a humid hot afternoon, but +1.9 to +2.5 °C on a dry cool-season one (`heat_sensitivity_check`). A line in heat-index space adds +7.0 °C at a raw 25 °C, +6.3 at 30, +5.6 at 35 and +5.0 at 40, all year. That is right for April and 3–5 °C too much for a dry December afternoon. The line has the wrong form for the cool season, and a seasonal intercept only patches it.

### 1.5 Part B: the pre-registered test (day 1; day 2 agrees)

Leave-one-station-out MAE on the fit period:

| | C0 | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|---|
| All months | 2.747 | 2.266 | 2.511 | 2.315 | 2.227 | **2.221** |
| Nov–Feb | 3.355 | 2.044 | 2.418 | 1.940 | 1.931 | 1.935 |

**Chosen: C5.** Fitted coefficients (Nov–Feb only; the current line otherwise):
- day 1: **HI = 0.560 + 1.0896·HI_raw**;
- day 2: **HI = 0.933 + 1.0753·HI_raw**.

The other terms:
- C1: −2.82 °C in Nov–Feb, −0.41 in Mar–Oct.
- C2: North −1.11, Northeast −1.97, Central −1.81, East −2.17, South +0.64.
- C3, C4: in `research/out/heat_region_season.json`.

MAE (°C), day 1:

| Test set | season | C0 current | C1 | C2 | C3 | C4 | **C5** | raw | persistence | climatology | Δ C5 − C0 [90 %] |
|---|---|---|---|---|---|---|---|---|---|---|---|
| later, A+B (n = 3914) | all | 2.67 | 2.17 | 2.33 | 2.10 | 2.14 | 2.17 | 4.53 | 1.71 | 2.52 | −0.50 [−0.73, −0.30] |
| later, A+B (1113) | Nov–Feb | 3.38 | 1.81 | 2.14 | 1.56 | 1.77 | 1.61 | 3.29 | 1.57 | 2.85 | −1.77 [−2.16, −1.49] |
| **later, C disjoint (11327)** | all | 2.88 | 2.23 | 2.42 | 2.20 | 2.21 | 2.24 | 4.15 | 1.65 | 2.34 | **−0.63 [−0.88, −0.40]** |
| **later, C disjoint (3658)** | Nov–Feb | 3.56 | 1.75 | 2.38 | 1.70 | 1.72 | **1.60** | 3.07 | 1.60 | 2.62 | **−1.96 [−2.23, −1.73]** |
| later, C disjoint (7669) | Mar–Oct | 2.55 | 2.45 | 2.44 | 2.43 | 2.44 | 2.55 | 4.66 | 1.68 | 2.19 | 0 (C5 = C0) |
| earlier, C disjoint (4813) | Nov–Feb | 3.45 | 1.75 | 2.34 | 1.75 | 1.67 | 1.62 | 3.12 | 1.71 | 2.97 | −1.83 [−2.15, −1.59] |
| later, D airports (960) | Nov–Feb | 4.28 | 1.95 | 3.22 | 1.96 | 1.91 | 1.74 | 2.21 | 1.44 | 2.27 | −2.54 [−2.83, −2.32] |
| later, D airports (2144) | Mar–Oct | 3.04 | 2.74 | 2.28 | 2.81 | 2.78 | 3.04 | 3.08 | 1.69 | 2.02 | 0 |

**Made worse beyond chance** (later period, C + D, 61 stations): C5 vs C0 at 4 stations; C0 vs C5 at 44.

**The safety rule fails.** On C in Nov–Feb (day 1, deterministic bands):
- ≥ 33: POD 0.99 → 0.87.
- ≥ 42: 8 of 29 days → 1 of 29.

So C5 does not ship (`SHIP RULE … does not ship` at both leads). Every candidate fails at ≥ 33 for a reason worth stating: the current line's POD of 0.99 comes from calling ≥ 33 on 86 % of cool-season days (day 2: 89 %), when it happened on 44 % (C5 calls it on 50 %; `heat_sensitivity_check`).

### 1.6 Post-hoc 1: graded the way the page grades

`research/heat_cool_posthoc.py`. The page doesn't grade by the median's band. It dresses the members and takes the level that ≥ 50 % reach, naming a higher one that ≥ 20 % reach. Graded that way (HRES standing in for the ensemble median; dressing SD from the fit period's cool rows: C5 2.44, C1 2.54, C0 the page's 2.95), on C in the later Nov–Feb (day 1):

| | level right | level too high | level too low | ≥ 33 named (likely or possible) | เตือนภัย shown likely, false (% of days) | ≥ 42 named | อันตราย named, false (% of days) | Brier ≥ 33 / ≥ 42 |
|---|---|---|---|---|---|---|---|---|
| C0 current | 51.8 % | 47.3 % | 0.9 % | 1623/1624 | 42.1 % | 22/29 | 6.8 % | 0.276 / 0.0145 |
| C5 | 77.5 % | 13.7 % | 8.8 % | 1594/1624 (0.98) | 11.0 % | 10/29 | 0.8 % | 0.120 / 0.0072 |

The earlier winter on C gives the same picture: ≥ 42 named on 58/74 days (C0) vs 39/74 (C5).

As the page shows it, C5 keeps the ≥ 33 warnings (0.98 of the days) and cuts the false "likely เตือนภัย" from 42 % to 11 % of days. It still loses about half the cool-season danger days. The safety failure is real, and it sits in early November and February.

### 1.7 Post-hoc 2: correct the inputs, not the heat index (C6)

`research/heat_tdtd_posthoc.py`. Its form was fixed before scoring, from §1.4.
- **Formula:** T' = T + dT, Td' = Td + dTd, then the NWS heat index at 13:00/16:00, max, + c. One formula for every month.
- **Fitted on the fit period (A+B, earlier year):**
  - day 1: **dT = +1.658, dTd = +1.491, c = +0.898 °C** (residual SD 2.86);
  - day 2: dT +1.651, dTd +1.429, c +0.889 (SD 2.93).

Scores (day 1; deterministic bands; "named" = dressed chance ≥ 20 %, as the page would show it):

| Test set | season | C0 MAE (bias) | C5 MAE (bias) | **C6 MAE (bias)** | ≥ 42 hit: C0 / C5 / C6 | C6 ≥ 42 named (C0) | false ≥ 33, C0 / C6 |
|---|---|---|---|---|---|---|---|
| later, C | Nov–Feb (3658) | 3.56 (+3.37) | 1.60 (+0.21) | **1.53 (+0.38)** | 8 / 1 / 7 of 29 | 18 of 29 (22) | 42 % / 11 % |
| later, C | 1–15 Nov + Feb (814) | 2.95 (+2.48) | 1.82 (−0.20) | 1.78 (+0.26) | 8 / 1 / 7 of 27 | 18 (21) | 25 % / 10 % |
| later, C | Mar–Oct (7669) | 2.55 (+0.95) | = C0 | 2.54 (+0.37) | 2311 / 2311 / 2105 of 3009 | 2740 (2828) | 3 % / 2 % |
| earlier, C | Nov–Feb (4813) | 3.45 (+3.23) | 1.62 (+0.24) | 1.56 (+0.39) | 32 / 15 / 22 of 74 | 53 (58) | 36 % / 8 % |
| later, D airports | Nov–Feb (960) | 4.28 (+4.19) | 1.74 (+1.20) | 1.92 (+1.64) | – (1 event) | – | 42 % / 15 % |
| later, A+B | all (3914) | 2.67 (+1.24) | 2.17 (+0.36) | 2.12 (+0.02) | 897 / 896 / 846 of 1177 | 1060 (1095) | 12 % / 4 % |

In the hot season C6 removes most of the line's warm bias (+0.95 → +0.37 °C on C). It calls ≥ 42 deterministically less often (POD 0.77 → 0.70 on C), but names it as possible on 2,740 of 3,009 such days (C0: 2,828), and false อันตราย falls from 21 % to 18 % of days.

### 1.8 The page's own method in the cool season (ensemble, 51 members)

`research/heat_ens_cool.py`. The page corrects each ENS member, takes the median and dresses the members. ENS open
data were fetched for every 4th 00 UTC run, Nov 2025–Feb 2026 (31 runs, 6,180 requests, 4.2 GB), at the validated
predictor (13:00/16:00, GRIB values, no elevation downscaling). That gives 1,487 station-days at day 1. C0 is a
description of the current method; C5 is the pre-registered term, C6 the post-hoc one.

| Set (n) | method | median MAE (bias) | 10–90 % range held | Brier ≥ 33 / ≥ 42 | level right / too high | เตือนภัย likely, false | ≥ 42 named |
|---|---|---|---|---|---|---|---|
| C disjoint (952) | raw | 3.11 (−3.05) | | | | | |
| | **C0 current** | **3.48 (+3.28)** | **56 %** | 0.263 / 0.0151 | 54 % / 45 % | **43 % of days** | 6/8 |
| | C5 | 1.57 (+0.19) | 92 % | 0.114 / 0.0076 | 80 % / 11 % | 9 % | 2/8 |
| | C6 | 1.48 (+0.35) | 95 % | 0.109 / 0.0086 | 81 % / 11 % | 9 % | 4/8 |
| A+B (287) | C0 | 3.26 (+2.99) | 61 % | 0.248 / 0.0158 | 56 % / 42 % | 39 % | 4/4 |
| | C6 | 1.37 (+0.16) | 97 % | 0.112 / 0.0081 | 82 % / 9 % | 8 % | 4/4 |
| D airports (248) | C0 | 4.24 (+4.18) | 35 % | 0.254 / 0.0262 | 51 % / 49 % | 40 % | 1/1 |
| | C6 | 1.82 (+1.64) | 93 % | 0.090 / 0.0151 | 82 % / 17 % | 11 % | 1/1 |
| North (313) | C0 | 3.87 (+3.81) | 46 % | 0.304 / 0.0039 | 43 % / 57 % | **51 %** | 0/0 |
| | C6 | 1.41 (+0.49) | 93 % | 0.116 / 0.0009 | 78 % / 13 % | 9 % | 0/0 |
| Northeast (461) | C0 | 4.12 (+4.07) | 39 % | 0.333 / 0.0089 | 38 % / 62 % | **56 %** | 3/3 |
| | C6 | 1.41 (+0.80) | 98 % | 0.097 / 0.0044 | 84 % / 10 % | 7 % | 3/3 |

On the ensemble, the page's current method misses its own validated range in the cool season: the 10–90 % range
holds 35–61 % of observations, against 82 % in Mar–May 2026. C5 and C6 hold 92–98 %, too wide, because their dressing
SD is the all-season one. A cool-season SD would narrow it; that is untested. C6 names the few danger days that C0
names (C: 4 of 8, C0 6 of 8; Northeast 3 of 3) and C5 names fewer (2 of 8).

### 1.9 Verdict for §7.7

- **Don't ship a region or season term** from this run. The pre-registered winner C5 fails the safety rule, and C6 is post-hoc.
- **Wait, but not passively.** From 1 Nov the page's heat numbers in the North, Northeast and Central will read about 3–4 °C too hot (2.7–4.6 by month; ensemble median +3.3 °C on the disjoint stations), with false เตือนภัย on about 40–50 % of days. The note "พลาดราว ±2.4 °C" is not true there: MAE is 3.7–4.1 °C.
- **Options for the owner:**
  1. **(a) Recommended:** pre-register C6 now with the coefficients above, archive the page's per-member raw maxima every day (§3), and score C0 vs C6 as issued at the end of November and again in March.
  2. **(b)** Ship C6 as provisional and post-hoc now, as was done for PM2.5's damped ratio. It is one formula, its Mar–Oct MAE equals the current line's, and it keeps the cool-season danger days. It has to be re-applied to the ensemble members, and its dressing SD is 2.86.
  3. **(c)** At the least, change the copy for Nov–Feb: say the forecast heat number "อาจสูงเกินจริง" in the cool season, and don't print ±2.4 °C.
- The decision is the owner's (OWNER_ACTIONS).

## 2. As-issued spot check, 23–24 Oct 2026 (8 airports)

A handful of cases, so a spot check, not a validation (`research/spot_check_metar.mjs`, log
`spot_check_metar-2026-10-24.log`, inputs in `research/data/spot-2026-10-24/`).

**Observed:** METARs from aviationweather.gov, fetched at 09:06 UTC (16:06 Bangkok), so 11:00–16:00 is covered on
24 Oct; every airport's maximum fell at 15:00 or earlier.
- Heat index from T and Td with the page's own formula (`heat.js`), RH from Td with the same Magnus form as the
  station data.
- Daily max over the :00 reports.
- METAR's whole-degree T and Td put a 10–90 % spread of 0.9–1.5 °C on each day's maximum (Monte Carlo of ±0.5 °C).

**Forecast:**
- HRES (`ecmwf_ifs025`) from Open-Meteo's previous-runs API: `_previous_day1` = predicted 24 h before the valid time
  (Open-Meteo's docs), `_previous_day2` = 48 h before, plain = the latest run (lead 0–6 h). Corrected with lead1 / lead2.
- ENS (51 members) for 24 Oct from the archive: the run of 18 UTC 23 Oct, available 11:05 Bangkok, so the
  afternoon was at lead 12–15 h. Corrected and dressed as `summarizeHeat` does.
- The ENS numbers are what the page showed for "today" from 11:05 to 15:59 Bangkok, while the window still held the
  afternoon (at 08:05 UTC it already began at 15:00). The `_previous_day1` numbers are what was forecast 24 h ahead.

| Date | Airport | Observed max (time, T/Td) | HRES latest run, raw (error) | Day 1: raw → corrected (error) | Day 2: corrected (error) | ENS raw p50 → corrected p50 [10–90 %] (error) | Band: obs / day 1 / ENS |
|---|---|---|---|---|---|---|---|
| 23 Oct | Don Mueang | 43.3 (14:00, 35/25) | 39.5 (−3.8) | 40.7 → 45.5 (+2.2) | 44.4 (+1.1) | – | อันตราย / อันตราย / – |
| 23 Oct | Suvarnabhumi | 40.7 (09:00, 32/26) | 39.4 (−1.3) | 39.7 → 44.7 (+4.0) | 44.8 (+4.1) | – | เตือนภัย / อันตราย / – |
| 23 Oct | Chiang Mai | 38.3 (14:00, 34/22) | 35.9 (−2.4) | 36.0 → 41.5 (+3.2) | 41.9 (+3.6) | – | เตือนภัย / เตือนภัย / – |
| 23 Oct | Chiang Rai | 38.1 (15:00, 33/23) | 35.1 (−3.0) | 35.8 → 41.3 (+3.2) | 41.3 (+3.2) | – | เตือนภัย / เตือนภัย / – |
| 23 Oct | Phuket | 39.1 (10:00, 31/26) | 35.0 (−4.1) | 32.3 → 38.3 (−0.8) | 39.3 (+0.2) | – | เตือนภัย / เตือนภัย / – |
| 23 Oct | Hat Yai | 39.2 (12:00, 32/25) | 38.4 (−0.8) | 36.5 → 42.0 (+2.8) | 43.3 (+4.1) | – | เตือนภัย / อันตราย / – |
| 23 Oct | Udon Thani | 40.6 (14:00, 35/23) | 37.7 (−2.9) | 37.2 → 42.5 (+1.9) | 42.5 (+1.9) | – | เตือนภัย / อันตราย / – |
| 23 Oct | Ubon | 40.6 (14:00, 34/24) | 36.3 (−4.3) | 36.7 → 42.1 (+1.5) | 41.9 (+1.3) | – | เตือนภัย / อันตราย / – |
| 24 Oct | Don Mueang | 42.0 (13:00, 34/25) | 40.4 (−1.6) | 38.0 → 43.2 (+1.2) | 45.2 (+3.2) | 39.4 → 44.5 [40.5–48.2] (+2.5) | อันตราย / อันตราย / อันตราย |
| 24 Oct | Suvarnabhumi | 40.6 (12:00, 33/25) | 38.9 (−1.7) | 37.1 → 42.5 (+1.9) | 45.3 (+4.7) | 39.1 → 44.2 [40.3–48.2] (+3.6) | เตือนภัย / อันตราย / อันตราย |
| 24 Oct | Chiang Mai | 39.4 (13:00, 34/23) | 36.1 (−3.3) | 36.1 → 41.6 (+2.2) | 42.8 (+3.4) | 36.1 → 41.6 [37.7–45.4] (+2.2) | เตือนภัย / เตือนภัย / เตือนภัย |
| 24 Oct | Chiang Rai | 37.9 (12:00, 32/24) | 35.7 (−2.2) | 36.1 → 41.6 (+3.7) | 41.6 (+3.7) | 36.0 → 41.5 [37.7–45.3] (+3.6) | เตือนภัย / เตือนภัย / เตือนภัย |
| 24 Oct | Phuket | 37.4 (15:00, 30/26) | 32.4 (−5.0) | 32.1 → 38.1 (+0.7) | 38.3 (+0.9) | 32.7 → 38.7 [34.7–42.5] (+1.3) | เตือนภัย / เตือนภัย / เตือนภัย |
| 24 Oct | Hat Yai | 40.6 (11:00, 33/25) | 37.4 (−3.2) | 37.6 → 42.9 (+2.3) | 41.7 (+1.1) | 36.8 → 42.2 [37.7–46.1] (+1.6) | เตือนภัย / อันตราย / อันตราย |
| 24 Oct | Udon Thani | 41.9 (15:00, 36/23) | 37.7 (−4.2) | 37.5 → 42.8 (+0.9) | 43.1 (+1.2) | 37.8 → 43.0 [39.1–46.7] (+1.1) | เตือนภัย / อันตราย / อันตราย |
| 24 Oct | Ubon | 40.6 (12:00, 33/25) | 37.0 (−3.6) | 37.5 → 42.8 (+2.2) | 43.0 (+2.4) | 37.0 → 42.4 [38.6–46.3] (+1.8) | เตือนภัย / อันตราย / อันตราย |

**Mean error** (8 airports a day):

| Date | HRES latest run, raw | Day 1 raw | Day 1 corrected (MAE) | Day 2 raw | Day 2 corrected | ENS raw p50 | ENS corrected p50 |
|---|---|---|---|---|---|---|---|
| 23 Oct | −2.83 | −3.13 | **+2.25** (2.45) | −2.76 | +2.44 | – | – |
| 24 Oct | −3.10 | −3.55 | **+1.89** (1.89) | −2.60 | +2.58 | **−3.19** | **+2.21** |

The observed maximum lay inside the dressed 10–90 % range at 8 of 8 airports on 24 Oct.

**Reading:**
- **Raw is low, but about 3 °C at these airports, not 5.** Raw ENS read −3.2 °C today, and raw HRES −3.1 to −3.6 °C at day 1. MODELS §1 says "about 5 °C low" (MAE 4.7–5.1), against TMD stations. Airports run 0.2–2.6 °C cooler than the nearest TMD station (§4.3), which accounts for much of the difference.
- **The model is cold at the grid point even at lead 0–6 h** (−2.8 to −3.1 °C), so the cold bias is not a lead-time effect.
- **The corrected forecast was too hot at 15 of 16 airport-days** (Phuket on 23 Oct the exception). It put the day one band higher (อันตราย for an observed เตือนภัย) at 4 of 8 airports on each day: Suvarnabhumi, Hat Yai, Udon Thani and Ubon. That agrees with the history at the airports (sample D, later Mar–Oct: current-line bias +2.72 °C, `heat_tdtd_posthoc` log), and partly reflects the airport sites.
- **Chiang Mai, today:** the page's corrected median from 11:05 Bangkok was 41.6 °C (เตือนภัย; P(≥ 42) 0.4). The observed maximum was 39.4 °C. Tomorrow's archived forecast is 42.05 °C, "อันตราย" at the median (§3).

## 3. The archive of issued forecasts (MODELS §7.8, ROADMAP v0.4)

**Script:** `research/archive_forecasts.mjs`.

**What it does:**
- It imports the page's own modules (`sources.urls`, `outlook.buildOutlook`, `airq.buildAir`), so it builds the same URLs (points rounded to 0.01°) and the same summary the page would show at that moment.
- For each of 12 points it writes `research/archive/<UTC date>/<point>.json`, appending an issue when run again on the same day. Each issue holds:
  - **Provenance:** the issue time; the model run Open-Meteo served (from its static `meta.json`: today the ensemble's 18 UTC 23 Oct run, available 04:05 UTC; CAMS 12 UTC 23 Oct); the git commit and a hash of the page modules (flagged "modified": the working tree had uncommitted changes to `outlook.js` and others); the coefficients in use.
  - **Heat, per day:** the corrected p10/p50/p90, the raw p50, the chances of ≥ 33 and ≥ 42, the level, or the "no afternoon" note.
  - **Rain and gusts:** the heavy-rain chance (> 35.1 mm) and its word, the very-heavy chance, gusts.
  - **Every member's raw daily maximum** (all hours, and 13:00/16:00 only) and rain sum, so any later correction can be scored as issued.
  - **PM2.5:** CAMS daily means, the damping multipliers, and the anchored outlook when the collector's Air4Thai file is fresh and a station is within 15 km.
- It also saves the airports' METARs of the last 36 h (`metar-<HHMM>Z.json`), the observations to score against.

**Calls per run:** 12 ensemble + 12 CAMS (one per point, 1.5 s apart, honest UA `disaster-now-research/0.1`), 2 static meta files and 1 aviationweather.gov request. It never calls ThaiWater or GISTDA.

**Run once at 08:05 UTC 24 Oct** (`research/logs/archive_forecasts-2026-10-24.log`). The points are the 8 airports plus Bangkok 48455, Khon Kaen/Tha Phra 48384, Nan 48333 and Surat Thani 48555. Tomorrow's corrected heat medians it recorded:

| Point | Corrected p50 (°C) | Raw p50 (°C) |
|---|---|---|
| Don Mueang | 44.40 | 39.34 |
| Suvarnabhumi | 44.10 | 39.00 |
| Chiang Mai | 42.05 | 36.63 |
| Chiang Rai | 42.31 | 36.93 |
| Phuket | 37.26 | 31.09 |
| Hat Yai | 39.76 | 33.99 |
| Udon Thani | 43.01 | 37.74 |
| Ubon Ratchathani | 42.96 | 37.69 |
| Bangkok 48455 | 43.68 | 38.51 |
| Khon Kaen | 43.18 | 37.94 |
| Nan | 42.87 | 37.57 |
| Surat Thani | 41.05 | 35.48 |

Heavy-rain chance: 0 everywhere except Phuket (0.12) and Hat Yai (0.16).

**PM2.5 repair:** the first run did not unwrap the collector's Air4Thai file (`{source, url, raw, items, fetched}`; the page reads `raw || data`), so it found no PCD anchor anywhere. Fixed in the script. The PM2.5 blocks of this run were recomputed offline by `research/archive_recompute_pm25.mjs`, from the saved CAMS responses and the same collector file (07:50 UTC, 14 min before the issue), and are marked "recomputed".
- 10 of 12 points now have a PCD station within 15 km and a damped outlook. For example, Bangkok 48455 is anchored on bkp119t at 0.37 km: 23.8 µg/m³ now, then 15.7 / 13.5 / 17.4.
- Phuket and Surat Thani have none. There the page would anchor on GISTDA, which the archive does not call, so their archived outlook is raw CAMS (1–2 µg/m³).

**Size and caveats:**
- About 330 KB a run: 12 × ~13 KB plus METARs of 175 KB. Run daily, that is about 120 MB a year, too much for git. Run it from the server's timer into a directory outside the repository (or KV), and commit only monthly scores.
- It must be run daily to be useful.
- It stores the page's summary. Where no PCD station is within 15 km, it lacks GISTDA's PM2.5 anchor.

## 4. Side findings (checked today)

1. **The page corrects a different predictor than the line was fitted on.**
   - The fit used each forecast's max of 13:00 and 16:00 (`calibration.json` says "daily max over the member's afternoon hours"). The page takes each member's max over **every hour** of the window (`outlook.perMember`).
   - On today's archive (12 points, 1,224 member-days) the all-hours max is higher by a mean **+0.41 °C** (median 0.08, 90th percentile 1.28, max 8.25 °C on showery days at Surat Thani and Hat Yai) (`predictor_hours_check`).
   - Through the line's slope (0.8647 × 0.41 ≈ 0.35), the corrected value inherits about 0.35 °C of extra warm bias on average, and several degrees on showery days.
2. **Open-Meteo's elevation downscaling changes the input at hilly or coastal points.**
   - Open-Meteo's ensemble members against the ECMWF GRIB members 1–3 of the same run, same grid point and hour (`rh_crosscheck`, 72 point-hours):
     - **RH is the same treatment** (Magnus; mean difference −0.02 %, max 0.5 % = integer rounding).
     - T differs by a **fixed per-point offset**, the same for every member and hour: ≤ 0.07 °C at flat points, but Surat Thani +1.27 °C, Chiang Rai +0.45, Phuket −0.29, Hat Yai +0.22, Chiang Mai +0.19. That is Open-Meteo's lapse-rate adjustment to its 90 m DEM.
   - At Surat Thani that raised the page's heat index by up to **4.6 °C** in this check, before the correction is applied.
   - The fit never saw this adjustment. Passing `elevation=nan` would match the validated input; otherwise re-validate on downscaled values.
3. **Airports read cooler than the TMD stations the line was fitted on.**
   - Same-day daily-max HI, airport − nearest TMD station (`obs_pipeline_check`):

     | Pair | Difference |
     |---|---|
     | Chiang Rai airport − Chiang Rai agromet | −0.16 °C |
     | Hat Yai − Kho Hong | −1.36 °C |
     | Phuket airport − Phuket | −1.56 °C |
     | Don Mueang − Bangkok Metropolis | −2.64 °C |

   - Part of the airports' warm error is the site: central Bangkok runs hotter than its airports.
   - METAR's whole-degree T and Td spread a day's maximum by 0.9–1.5 °C (10–90 %, Monte Carlo of ±0.5 °C, §2).

## 5. What MODELS.md states too strongly

1. **§0/§1 "0 of 18 stations made worse" and "use with correction" read as year-round.** They hold for Mar–Oct at the 18 fit stations. **In Nov–Feb the current line is worse than raw beyond chance at 39 of 78 stations** (raw is worse than the line at 24). In Mar–Oct it is worse than raw at 8 of 79 (`heat_extra_checks`).
2. **The "±2.4 °C" typical miss and FAR ≥ 42 of 0.34–0.37.**
   - Over all stations, in Mar–Oct, the line runs +0.9 to +1.9 °C hot in the North, Northeast and Central, with **FAR ≥ 42 of 0.43–0.46** and false อันตราย on 19–31 % of days.
   - In Nov–Feb its MAE is 3.7–4.1 °C in the North, Northeast and Central.
   - At the 18 stations in 2026 Mar–Oct it was 2.39–2.41 °C in this run, as reported.
3. **§1 "Open-Meteo's 51 members equal the GRIB values … within 0.074 °C."** This is true at Bangkok, where it was checked, and not where Open-Meteo's elevation downscaling acts (up to 1.27 °C in T at Surat Thani today, §4.2).
4. **§1 step 2, "each member's maximum over the window",** is the page's behaviour, but the line was fitted on two afternoon hours (§4.1). One of the two descriptions needs to change.
5. **§1 "Observed Bangkok October days reach ≥ 42 °C on 48 % of days"**: 46 % on today's files (65 October days, 2024–2026). Not wrong, but the figure that matters next week is November's: 7 %.

Not wrong, and confirmed: raw HRES is cold at the grid point in every season (T −0.7 to −2.2 °C, Td −0.6 to −1.8 °C at 13:00/16:00). Persistence beats every correction where an observed maximum exists. And the national line is a good fit for the hot season at the stations it was fitted on.

## 6. Still untested

- **The ensemble in the cool season** is now checked on one winter (31 runs every 4th day, §1.8), but not as Open-Meteo serves it (elevation-downscaled, all hours), and not in winter 2024–25.
- **C6 as issued,** and C6 on ensemble members.
- **Day 3** (the 72-h window).
- **The deterministic fallback.**
- **Chiang Mai's own TMD station** (not in GHCNh).
- **Station type:** many sample-C stations are rural agromet sites, and part of a "regional" error may be urban vs rural.
- **TMD's own heat-index formula** (KI-004).

## 7. Reproduce

```
node research/ecmwf_points.mjs 2024-03-01 2026-10-23 6          # ECMWF open data → <scratch>/ecmwf_points2 (5.3 GB read, values kept)
python3 -I research/fetch_ghcnh.py 2024 2025 2026                 # GHCNh → <scratch>/dl/ghcnh
python3 -I research/fetch_iem_metar.py 2024-03-01 2026-10-24      # IEM METARs → <scratch>/dl/iem
python3 -I research/heat_region_season.py                         # Part A + B (pre-registered) → out/heat_region_season.json
python3 -I research/model_check_tables.py                         # the tables above
python3 -I research/obs_pipeline_check.py                         # pipelines vs the 23 Oct study; airports vs stations
python3 -I research/heat_cool_posthoc.py                          # POST-HOC: graded as the page grades
python3 -I research/heat_tdtd_posthoc.py                          # POST-HOC: C6
node research/ecmwf_ens_points.mjs 2025-11-01 2026-02-28 4 6      # ENS, 51 members → <scratch>/ecmwf_ens (4.2 GB read)
python3 -I research/heat_ens_cool.py                              # the page's ensemble method in the cool season
python3 -I research/heat_cool_danger_days.py; python3 -I research/heat_extra_checks.py; python3 -I research/bangkok_october_check.py
python3 -I research/heat_sensitivity_check.py                    # figures quoted in §1.4–1.5
node research/archive_forecasts.mjs --raw <scratch>/archive_raw   # the archive (12 + 12 Open-Meteo calls)
node research/archive_recompute_pm25.mjs research/archive/2026-10-24 <scratch>/archive_raw   # the PM2.5 repair (offline)
node research/predictor_hours_check.mjs research/archive/2026-10-24
node research/rh_crosscheck.mjs <scratch>/archive_raw 20261023 18 12,15
node research/spot_check_metar.mjs <metar.json> research/data/spot-2026-10-24/previous_runs_ecmwf_ifs025.json research/data/spot-2026-10-24/ens_raw
```

Small derived data: `research/data/model_check_daily.csv.gz` (station-day pairs), `research/data/thai_stations_regions.json`, `research/data/airports_metar.json`, `research/data/spot-2026-10-24/`. Caches and downloads stay in the session scratchpad.

**Calls made today:**
- Open-Meteo: 12 ensemble + 12 CAMS + 1 previous-runs request for 8 locations (weight ≈ 32), plus 2 static meta files (`research/logs/openmeteo-calls-2026-10-24.log`).
- aviationweather.gov: 3 requests.
- IEM: 9 requests.
- NCEI: 229 files.
- ECMWF open data (Google Cloud mirror): about 22,000 byte-range requests, about 11.6 GB in all:
  - HRES: 11,549 requests and 5.3 GB, plus a first pass of about 1.9 GB stopped at 360 runs to add the airports;
  - ENS: 6,386 requests, 4.4 GB;
  - the RH check: 14 requests.
- No ThaiWater call, no Docker. `npm run preflight` was not run: it calls `docker ps`, and the brief forbade Docker.

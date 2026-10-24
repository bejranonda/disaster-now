# Models: what the forecasts are, and how good they were

The forecasts the page shows, the corrections it applies and the skill each one had against observations. The full report is [research/forecast-validation-2026-10-23.md](research/forecast-validation-2026-10-23.md); the scripts are in `research/` (each run's log is in `research/logs/`, its results in `research/out/*.json`); the numbers the code uses are in `public/js/calibration.js` and come from `research/out/calibration.json`.

**Protocol** (FloodWatch GUIDELINES §4, our [GUIDELINES §7](GUIDELINES.md#7-models-and-forecasts)):
- Fit and choose on an earlier period at one set of stations (sample A).
- Score on a later period, then confirm on a disjoint set of stations (sample B) and on the newest season.
- Compare with persistence and climatology.
- A station counts as "made worse" only if its error rises by more than 3 % **and** a moving-block bootstrap puts the rise above zero at 95 %.
- Anything chosen after a first look at the test results is marked **post-hoc**.

## 0. At a glance

| What the page shows | Method | Verdict | Tested skill (data the fit never saw) |
|---|---|---|---|
| 🌡️ Heat index, today to day 3 | ECMWF ensemble (51 members), NWS heat index per member at **13:00 and 16:00** (grid-cell height), **corrected per member** and **dressed**; **Mar–Oct the line** (C0), **Nov–Feb C6** (corrected T and Td, provisional, post-hoc; since 0.4.0) | ship, corrected only | raw ran **3–5 °C low**. **Mar–Oct, the line, on 53 disjoint stations (2025–26): MAE 2.55 °C, bias +0.95** (+0.9 to +1.9 in the North, Northeast and Central), false อันตราย on 19–31 % of days there (FAR ≥ 42 0.43–0.46). **Nov–Feb the line was 3–4 °C hot and worse than raw** (MAE 3.56 vs 3.07; worse at 39 of 78 stations); **C6 there: MAE 1.53**, danger days 7 of 29 (the line 8); on the ensemble, false "เตือนภัย likely" 9 % of days (the line 43 %). [Model check 2026-10-24](research/model-check-2026-10-24.md) |
| 😷 PM2.5, days 1–3 | latest measured 24-h mean × (CAMS change)^β, the **damped ratio** (post-hoc) | ship (provisional) | day 1 MAE 4.3–6.6 µg/m³ vs persistence 5.2–7.3, raw CAMS 11.8–16.7 (Mar–Apr 2026); best or near best on every test; colour right on about 3 days in 4 |
| 🌧️ Heavy rain | ensemble chance of > 35 mm in 24 h, **as three words only** | words only, no amounts | at a point, heavy rain 1–2 days ahead is mostly missed (HRES POD 0.04–0.13); ensemble Brier skill −0.08 to +0.12; heavy rain fell on 2–6 % of the days the ensemble gave 0 % |
| 💨 Gusts | ensemble gusts | shown, labelled **not validated** | no gust observations were available |
| 🌏 "Was it felt here?" | Allen, Wald & Worden 2012 (hypocentral) **+ 1.06 MMI in greater Bangkok** | ship, soft words | MAE 0.96 MMI over 357 Thai city reports, bias 0.00; Bangkok under-predicted in all 12 crustal events by an average of 1.06 MMI. With that term added, the residual for the 2025 M7.7 fell from 0.95 to −0.11. Nothing forecasts earthquakes |
| 🌊 Rivers | FloodWatch's (linked, not modelled here) | link | FloodWatch's 24 h median beat "no change" by 6.9 % as issued (5–12 Oct 2026); its 90 % range held 90–92 % |

## 1. Heat index

**What is computed** (`outlook.js → summarizeHeat`, `calibration.js → HEAT`):
1. For each of the 51 members, compute the NWS heat index per hour from that member's own temperature and humidity.
2. Take each member's maximum over the window: the next 24 h, then each calendar day.
3. **Correct each member:** HI = a + b·HI_raw, with a = 10.375, b = 0.8647 up to 48 h and a = 11.689, b = 0.826 beyond.
4. **Dress the members:** add a normal error with SD 2.95 °C, the residual SD of the 2025 fit. The ensemble's own spread is far too narrow for a point's daily maximum: its 10–90 % range held 2 % of observations, and 82 % once dressed.
5. The median of the corrected members is the number shown. The 10–90 % range and the chance of ≥ 42 °C come from the dressed mixture.

**Why it reads low:** at the same hours the model's afternoon is 1.9 °C too cold and its dew point 1.0 °C too low at the grid point (8,164 station-hours in 2026), which puts the heat index 3.8 °C low. Sampling two afternoon hours costs about 1 °C more against the true daily maximum. Coastal and valley stations are worst: Mae Sariang −8.9, Surat Thani −6.8, Phuket −5.4 °C.

**Data:**
- Observations: NOAA NCEI GHCNh hourly records from 18 TMD synoptic stations.
  - Sample A: Bangkok 48455, Chiang Rai, Lampang, Khon Kaen, Si Saket, Rayong, Surat Thani, Phuket.
  - Sample B: 10 others.
- Forecasts as issued: ECMWF open data, read from its Google Cloud mirror: 724 HRES runs (2024–2026) and 31 ENS runs (15 Mar–15 May 2026).
- Open-Meteo's 51 members equal the GRIB values member by member within 0.074 °C (`research/crosscheck_openmeteo_grib.py`).

**Results, 2026** (MAE °C):

| Set | raw | corrected | persistence (observed max of the issue day) |
|---|---|---|---|
| A day 1 | 5.12 | **2.36** | 1.74 |
| B day 1 (held out) | 4.77 | **2.45** | 1.81 |
| B day 2 | 4.73 | **2.40** | 2.12 |

Persistence is better still, but the app has no observed maximum at most points (no TMD station feed). **On screen:** the corrected median with the window ("บ่ายนี้ 43 °C"), the range, the chance of อันตราย, and the note "พลาดราว ±2.4 °C … วันที่ 3 ยังไม่ได้ทดสอบ".

**Caveats:**
- The fit used 8 stations.
- The 72-h window is untested: the fit used 54–57 h.
- The correction applies only to `ecmwf_ifs025`.
- The ensemble test covers one hot season.
- TMD's own heat-index formula is **[unverified]** (KI-004).

**What it does to the page:** with the correction, Bangkok's October afternoons read 42–44 °C, "อันตราย". Observed Bangkok October days reach ≥ 42 °C on 48 % of days, April days on 95 % (`research/out/e1e2_results.json`). The level is capped at เตรียมตัว for a forecast alone (§6, KI-005).

### 1.1 The model check of 24 Oct 2026, and what 0.4.0 changed

[research/model-check-2026-10-24.md](research/model-check-2026-10-24.md): 962 ECMWF HRES runs as issued (Mar 2024–Oct
2026), 31 winter ENS runs, 90,481 station-day pairs at 18 fit stations, **53 new disjoint stations** (C) and 8 airports
(D). Every number below comes from its scripts (`research/heat_*.py`, logs `research/logs/*-2026-10-24.log`).

**What this section's first version got wrong or overstated:**
1. "0 of 18 stations made worse" and "MAE 2.4 °C" hold for Mar–Oct at the 18 fit stations. **On 53 disjoint stations in
   Mar–Oct the line's MAE is 2.55 °C with a warm bias of +0.95 °C; in Nov–Feb it is 3.56 °C, worse than raw (3.07),
   at 39 of 78 stations.** The ensemble's 10–90 % range held 35–61 % of observations in the cool season (target 80).
2. "FAR 0.34–0.37" for ≥ 42 °C: over all stations in Mar–Oct it is 0.43–0.46.
3. "Open-Meteo's members equal the GRIB values within 0.074 °C" is true at flat Bangkok only: Open-Meteo shifts T by a
   fixed lapse-rate amount per point (Surat Thani +1.27 °C, Chiang Rai +0.45, Phuket −0.29). **Since 0.4.0 the page
   asks for `elevation=nan`** (the grid cell's own height, what the line was fitted on).
4. The line was fitted on each forecast's max of 13:00 and 16:00; the page took the max over every hour (+0.41 °C on
   average, up to 8.3 °C on showery days). **Since 0.4.0 the page uses 13:00 and 16:00** (`outlook.PREDICTOR_HOURS`), and a
   window holding neither has no heat number (the evening case, KI-F28).
5. "About 5 °C low" raw was about 3 °C at eight airports on 23–24 Oct (airports read 0.2–2.6 °C cooler than the TMD
   station nearby). "48 % of Bangkok October days ≥ 42" is 46 % on the files of 24 Oct; November's is 7 %.

**Why the line fails in the cool season:** the model's afternoon T and Td errors are similar in every season (T −0.7 to
−2.2 °C, Td −0.6 to −1.8 °C), but the heat index magnifies them by about 4.5 °C on a humid hot day and 2 °C on a dry
cool one. A line in heat-index space adds +5 to +7 °C all year: right for April, 3–5 °C too much for December.

**The pre-registered fix failed; a post-hoc one ships provisionally (D-046):**
- Pre-registered (fit Oct 2024–Sep 2025 on A+B; score Oct 2025–Oct 2026; confirm on C and D): **C5**, a Nov–Feb refit
  of the line (HI = 0.560 + 1.0896·HI_raw). MAE 1.60 vs 3.56 on C, but ≥ 42 °C hits fell from 8 to 1 of 29: it failed
  the safety rule and **does not ship**.
- Post-hoc (its form fixed before scoring): **C6**, correct the inputs, not the index: T + 1.658, Td + 1.491 (Magnus
  17.625 / 243.04), the NWS heat index at 13:00/16:00, max, + 0.898 °C (day 1, residual SD 2.86; day 2 +1.651, +1.429,
  +0.889, SD 2.93).

  | Disjoint stations C | the line (C0) MAE (bias) | C6 MAE (bias) | ≥ 42 hits C0 / C6 | false ≥ 33, C0 / C6 |
  |---|---|---|---|---|
  | Nov–Feb, later year (3,658) | 3.56 (+3.37) | **1.53 (+0.38)** | 8 / 7 of 29 | 42 % / 11 % |
  | Nov–Feb, earlier year (4,813) | 3.45 (+3.23) | 1.56 (+0.39) | 32 / 22 of 74 | 36 % / 8 % |
  | Mar–Oct, later year (7,669) | 2.55 (+0.95) | 2.54 (+0.37) | 2,311 / 2,105 of 3,009 | 3 % / 2 % |

  On the winter ensemble (31 runs, 952 disjoint station-days): C6 MAE 1.48 vs the line's 3.48, range held 95 % vs
  56 %, false "เตือนภัย likely" 9 % vs 43 % of days (North 9 % vs 51 %, Northeast 7 % vs 56 %).
- **The owner chose C6 for Nov–Feb only** (24 Oct 2026): the cool season, where the line is worse than raw. Mar–Oct
  keeps the line, which catches more ≥ 42 °C days (POD 0.77 vs 0.70) at the cost of false alarms. The card says
  "สูตรปรับแก้ชั่วคราว" in the cool season.
- **Pre-registered now:** score C0 against C6 as issued, from `research/archive_forecasts.mjs` (run daily), at the end of
  November 2026 and again in March 2027. If C6 loses on MAE or on danger-day hits, revert it.

**A spot check, not a validation (8 airports, 23–24 Oct 2026):** the corrected forecast was too hot on 15 of 16
airport-days and one band too high at 4 of 8 airports each day; the observations fell inside the dressed 10–90 % range
at 8 of 8.

## 2. PM2.5

**What is computed** (`airq.js → dampedOutlook`, `calibration.js → PM25`): forecast(day) = measured 24-h mean × (CAMS(day) ÷ CAMS(past 24 h))^β, with β = 0.45 for day 1 and 0.55 for days 2–3.
- The measured mean is the PCD station's (within 15 km and 3 h), else GISTDA's estimate.
- β = 1 would be the planned ratio method; β = 0 is persistence.
- Without a measured or estimated value, or with under 18 h of CAMS's past day, the page shows raw CAMS marked "ยังไม่ได้ปรับ: ต่ำกว่าค่าจริง".

**Data:**
- Observations: Air4Thai's daily means (the yearly spreadsheets on `air4thai.net`, preliminary QC) and its hourly history (about 3 months back).
- Two disjoint samples of stations: A (Chiang Mai, Bangkok Pathum Wan, Khon Kaen, Hat Yai) and B (Chiang Rai, Nan, Bangkok Bang Na, Nakhon Sawan, Ubon, Surat Thani).
- CAMS: Open-Meteo, stitched from short-lead forecasts, so every CAMS score is an **upper bound**.

**Results** (MAE µg/m³, day 1):

| Test set | raw CAMS | persistence | planned ratio | **damped** |
|---|---|---|---|---|
| A, Mar–Apr 2026 | 11.84 | 5.20 | 6.44 | **4.34** |
| B, Mar–Apr 2026 | 16.72 | 7.31 | 8.76 | **6.55** |
| B, Dec 2025–Feb 2026 | 8.25 | 3.99 | 4.87 | **3.38** |
| all, 20 Sep–22 Oct 2026 | 6.08 | 3.04 | 4.65 | **2.78** |

Days 2–3 (B, Mar–Apr): damped 9.23 and 11.04 vs persistence 11.11 and 13.81. The planned ratio was worse than persistence at 4 of 10 stations in Mar–Apr; the damped ratio at 0 of 10 (1 of 10 in October). A gradient-boosted model won its choosing month and then failed every later test: **rejected**.

**On screen:**
- Day 1 as a number.
- Days 2–3 as the PCD band word with "อาจเปลี่ยน", because they miss by 6–11 µg/m³.
- The source line reads "CAMS ปรับตามค่าวัดล่าสุด".

**Caveats:**
- Post-hoc: re-test it as issued in the 2026–27 dry season, and archive CAMS forecasts from now on.
- It was scored with station means; with GISTDA's estimate as the input it is **[unverified]**.
- October tests only the quiet regime.

## 3. Rain

**What is computed:** for each member, rain summed over the next 24 h and over each calendar day. The page shows the share of members above 35 mm, as one of three words (`outlook.chanceWord`, cut points from the validation):

| Chance of heavy rain | Below 10 % | 10–40 % | 40 % and more |
|---|---|---|---|
| Word | ต่ำ | มีโอกาส | สูง |

- The top word rests on 4–10 cases a year.
- No millimetre amount is shown as a forecast; measured rain from a gauge is shown.
- A TMD warning lifts the tile and comes first.
- The card says "ฝนหนักเกิดได้แม้วันที่คาดว่าโอกาสต่ำ".

**Results, 2025:**
- HRES ≥ 35.1 mm at 24–48 h: POD 0.04 (A) and 0.10 (B), FAR 0.84 / 0.77, CSI 0.03 / 0.07.
- A tuned threshold didn't help on B.
- ENS P(≥ 35.1): Brier skill +0.02 / +0.05 / −0.05 at 0–24, 24–48 and 48–72 h.
- Reliability: P = 0 → 2.1 % observed (628 days); 10–20 % → 17 %; ≥ 60 % → 75 % (n = 4).
- The 2026 season (partial) agrees: POD 0.12.

The chance rule (§6) still lifts the tile when ≥ 20 % of members reach heavy rain. A neighbourhood chance ("within 25 km") was not tested and may score better (ROADMAP).

## 4. Gusts

No gust observations were available in the station records used, so **nothing is validated**. The card says "ยังไม่ได้ตรวจสอบความแม่นยำ".

## 5. Earthquakes: felt intensity, not a forecast

- **Equation:** Allen, Wald & Worden (2012), hypocentral form; coefficients from OpenQuake `allen_2012_ipe.py`, read independently by two researchers (`public/js/ipe.js`, KNOWLEDGE §10).
- **Test data:** 357 Thai city reports from USGS "Did You Feel It?" (2,841 responses, 13 events).
  - MAE 0.96 MMI, bias 0.00.
  - By distance: 0.70 at 200–400 km, 0.99 at 1,000–1,600 km; only 19 records lie within 100 km.

**Greater Bangkok** (Bangkok, Samut Prakan, Nonthaburi, Pathum Thani; `assess.BKK_METRO`):
- Under-predicted in every one of the 12 crustal events that reached it: residual +0.16 to +2.01 MMI.
- A term fitted on the 10 events before 2025 is **+1.06 MMI** (`assess.BKK_MMI_TERM`).
- On the 2025 sequence the event residual fell from 1.47 to 0.52. The M7.7 went from +0.95 to −0.11.
- Long-period shaking of tall buildings on the basin is the likely cause.

**Words** (`levels.js → mmi`; thresholds 2.5 / 4.5 chosen on the same reports, in-sample: re-check after the next felt quake):

| Predicted MMI | Word | Level |
|---|---|---|
| below 2.5 | ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง | 0 |
| 2.5 to 4.5 | อาจรู้สึกได้ | 1 |
| 4.5 and above | รู้สึกได้ชัด | 2 |

- Never "ไม่รู้สึก", and never a word on damage: Thai cities reached CDI VI or more only 5 times, 4 of them single reports.
- A quake gets a line if it is within 300 km or reached 2.5 or more.
- **Range:** the reports behind the Bangkok term reach about 1,600 km, so the term applies only within that distance (`quake.SITE_MAX_KM`, KI-023).

## 6. How a forecast becomes a level

- **The chance rule** (`levels.CHANCE`, `outlook.windowLevel`): a window's level is the highest level at least 50 % of members reach. If เตรียมตัว or worse is reached by at least 20 %, the window is at least ติดตามไว้.
- **A forecast alone tops out at เตรียมตัว** (`assess.MODEL_MAX = 2`, since 0.2.0). "ทำทันที" needs a measurement (PCD's PM2.5, a gauge over its bank, rain measured over 90 mm) or an agency warning (TMD CAP Extreme).
  - Why: the visitor audit found "ทำทันที" on most October nights for the next afternoon's heat (V1).
  - The tile still shows the agency's word for the forecast value ("อันตราย").
- **Pre-warnings** list a day when at least 20 % of members reach danger heat, heavy or very heavy rain (both lines when heavy rain is the likelier one), or gusts of 62 km/h or more.

## 7. What is still to test

Tracked as ROADMAP v0.6:

1. Re-test the damped PM2.5 ratio as issued in the 2026–27 dry season.
2. Test the heat correction at 72 h and on the deterministic fallback.
3. A neighbourhood rain chance.
4. Gusts against any station records that carry them.
5. The reliability of the ensemble chances behind the chance rule.
6. The quake words after the next felt event.
7. ~~**The heat correction by region and season**~~ **done 24 Oct 2026** (§1.1): the line fails in Nov–Feb; C6 ships
   there provisionally. **Still open:** C6 as issued (end of November, March), a cool-season dressing SD (C6's range
   holds 92–98 %, too wide), day 3, the deterministic fallback, and whether a hot-season form beats the line without
   losing danger days.
8. **Province warning vs point chance** (added 0.3.0): on 24 Oct the ensemble said "low" in all 11 provinces under
   TMD's Severe heavy-rain notice ([research/crosscheck-live](research/crosscheck-live-2026-10-23.md)). Archive the
   notices with the app's chance for each warned province (SERVER §6.6), then score both against the next day's gauges:
   which one should the 3-day table trust where the other is silent?

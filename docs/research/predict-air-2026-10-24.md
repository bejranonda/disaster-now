# Predicting PM2.5 and other air pollution at a point: what works (24 Oct 2026)

The owner's question: can the page forecast, or give a risk for, PM2.5 and other pollution near a point, by learning from data, history, existing forecasts and theory? This note answers with the literature (§1) and four experiments run on this server (§2–§6), then says what the page should do (§7). The protocol is [GUIDELINES §7](../GUIDELINES.md#7-models-and-forecasts): choose on an earlier period, score on a later one, confirm on disjoint stations and the newest season, always against persistence and climatology. Every number here comes from a script in `research/aq_*.py`; the last run in each `research/logs/aq_*-2026-10-24.log` is the one cited.

## 0. Verdicts at a glance

| Candidate | Verdict | Evidence (disjoint stations, later seasons) |
|---|---|---|
| **A. Calibrated chance** that tomorrow's or the day after's 24-h mean passes 37.5 (and 75) µg/m³, from the page's own damped forecast | **ship, provisional**, Dec–Apr, station input only | Brier skill vs climatology **+0.35 to +0.79**; vs a calibrated persistence chance **+0.10 to +0.24** (> 37.5, sample B in 2024–25 and 2025–26, days 1–2, intervals above 0); the north on day 1 ties persistence (+0.04 [−0.02, +0.09]). Within about 10 points from 30 % up; "10 %" happened 0–2 % of the time and "20 %" 0–10 % |
| **B1. Weather-aware correction** (rain, wind, humidity, pressure, temperature range, as forecast) | **wait** | Post-hoc. With ECMWF forecasts as issued, tomorrow's MAE 6.57 → 6.31 µg/m³ (−0.26 [−0.40, −0.12]) in the newest season at disjoint stations, one station 7 % worse; day 1 no gain |
| **B2. Fire-aware correction** (NASA FIRMS hotspots, rings and upwind) | **don't ship** | Adds −0.10 [−0.20, −0.01] µg/m³ over the same model without fires (day 1, disjoint, 2024–25), nothing at the fitting stations, nothing at day 2; no 2026 archive to test the newest season |
| **B3. Machine learning** (gradient boosting) on everything | **don't ship** | Worse than the ridge models on every disjoint test, made Surat Thani 24–46 % worse than the damped ratio |
| **C. PM10 / ozone outlook** | PM10 **don't ship**; ozone **wait** | PM10 above 120 µg/m³ on 2.0 % of station-days, and in 94 % of those PM2.5 was already above 37.5 at the same station. Ozone passed 70 ppb (8 h) on 7 station-days in Sep–Oct 2026 at Nonthaburi and Rayong; no dry-season history is open |
| **D. Quoting an agency's forecast** | **ship a link** to PCD's; parse nothing yet | PCD publishes an official 7-day dust forecast every afternoon, but only as six regional PNG images (categories, no numbers, no machine-readable feed, no published skill; checked 24 Oct 2026). TMD's 10-day ventilation forecast by province is open JSON, a weather index rather than a dust forecast |
| **The damped ratio itself** | **keep**, still provisional | One more season (2024–25) and four more northern stations: beat persistence at days 1–3 everywhere except the north on day 1, where it ties |

## 1. The world: what others do and know

Read on 24 Oct 2026 by a literature review run alongside this study. Types: PR peer-reviewed, AG agency page, RP report, NW news. **[unverified]** = seen only in a search snippet. The agency products in §1.4 were checked again by this study (`research/aq_probe_agency.py`, log `aq_probe_agency-2026-10-24.log`).

### 1.1 CAMS in Southeast Asia: thin evidence, low in the burning season

- **CAMS validates surface PM2.5 against no Thai or Southeast Asian network** (US, Europe, China, Chile, Hong Kong and Taiwan networks). For Dec 2025–Feb 2026: global monthly PM2.5 −4.2 %, daily bias −10 % at CNEMC and +57 % at Hong Kong sites; fire emissions from GFAS v1.4. CAMS2_82bis validation report DJF-2026 (RP), https://atmosphere.copernicus.eu/sites/default/files/publications/45_CAMS2_82_bis_2025SC1_D82_bis.1.1.1-DJF2026.pdf
- **Fire emissions run low here.** Over 97–110° E, 15–22.5° N (including northern Thailand) in March 2019, eight fire inventories differed about ninefold in organic carbon, GFAS and GFED "significantly lower" than the rest, and all but FINN under-estimated AOD where AOD > 1. Jin et al., *ACP* 24:367 (2024) (PR), https://acp.copernicus.org/articles/24/367/2024/
- **A Thai WRF-Chem forecast fails the same way:** NARIT's experimental forecast matched Dec 2021–Feb 2022, then over-estimated boundary-layer height and under-estimated PM2.5 in Mar–Apr 2022. Macatangay, WRF Workshop 2022 abstract, https://www2.mmm.ucar.edu/wrf/users/workshops/WS2022/short_abstracts/macatangay.html
- No published study compares CAMS surface PM2.5 with PCD stations; this project's own figures (raw CAMS 8–13 µg/m³ low in Dec–Apr, §3) are the only ones known, and their sign fits the evidence above.

### 1.2 How agencies forecast

- **US (AirNow):** state and local forecasters issue the forecasts with NOAA's CMAQ-based NAQFC as guidance; an analog-ensemble bias correction improved PM2.5 skill but damped day-to-day variability and missed smoke (Huang et al., *Wea. Forecasting* 32:407, 2017, doi:10.1175/WAF-D-16-0118.1, PR). In Philadelphia (ozone, 2015–18) human forecasters scored best (Balashov et al., *Wea. Forecasting* 38, 2023, doi:10.1175/WAF-D-22-0185.1, PR). No published hit rates for AirNow's PM2.5 categories were found.
- **CAMS:** global IFS with data assimilation; station-level bias correction (MOS) exists only for Europe (O3, NO2, PM10, PM2.5, since 17 Jan 2024, CC-BY), https://ads.atmosphere.copernicus.eu/datasets/cams-europe-air-quality-forecasts-optimised-at-observation-sites (AG).
- **Korea (NIER):** daily-mean PM2.5 in four grades for 19 regions, forecasters judging CMAQ output. Next-day grade accuracy in Seoul 2018–20 was **64 %**; for the bad grades 69 % with a 49 % false-alarm rate; a neural network cut RMSE by 2.2–4.1 µg/m³ but did **not** raise next-day grade accuracy. Lee et al., *GMD* 15:3797 (2022) (PR), https://gmd.copernicus.org/articles/15/3797/2022/
- **China:** a multi-model ensemble scored best for 72-h forecasts in 37 cities (Petersen et al., *GMD* 12:1241, 2019, PR); no published category hit rates from CNEMC were found.
- **Probabilities:** no agency checked (PCD, GISTDA, TMD, BMA, AirNow, CAMS, NIER) publishes a calibrated chance of an unhealthy day; all issue categories. Research precedents exist: an analog ensemble on NAQFC gave PM2.5 probabilities that were "reliable and sharp" (Delle Monache et al., *Wea. Forecasting* 2020, doi:10.1175/WAF-D-19-0148.1, PR); ozone-exceedance probabilities trained 2000–11 and evaluated 2015–18 (Balashov et al. 2023, PR). Operational verification is categorical (POD, FAR, CSI; EPA-456/R-03-002, https://humo.airnow.gov/publications/weathercasters/guidelines-developing-air-quality-forecasting-program).

### 1.3 Thai forecasting studies

- Most report in-sample or unclear splits, and none tests day 1–3 on a held-out year against CAMS or persistence:
  - Chiang Mai gradient boosting with PM2.5 and hotspot lags, R² 0.97; lead time and split not stated (Wongsathan & Sabkam, *EASR* 52:473, 2025, PR, https://ph01.tci-thaijo.org/index.php/easr/article/view/260545).
  - WRF-Chem plus random forest for the north, Jan–May 2024 only, R = 0.867 (Chimla et al., *Atmosphere* 16:1304, 2025, PR) **[unverified: abstract snippets]**.
  - Daily values at 16 northern stations, 2018–20: ARIMA beat RNN and LSTM at most stations (Wongrin et al., *PJOES* 32:1419, 2023, PR).
  - Bangkok, 12 stations, 2024 held out, gradient boosting R² 0.935, lead and baseline unclear (Bhatta et al., *Environmental Challenges* 2026, doi:10.1016/j.envc.2026.101442, PR).
- The one study with a chronological split and a persistence baseline (Bangkok, **one hour** ahead) beat persistence by only 5–9 % (Whasphuttisit & Jitsakul, *IJTech* 17:1392, 2026, PR, https://ijtech.eng.ui.ac.id/download/article/8040). That matches this study: persistence is hard to beat, and the gains are in the change, not the level.

### 1.4 Thai agency forecasts the page could quote (checked by this study)

- **PCD (Air4Thai): an official 7-day forecast, as pictures.** Six PNGs, "คาดการณ์สถานการณ์ฝุ่นละออง … 7 วันข้างหน้า":
  - Bangkok: https://air4thai.pcd.go.th/UpdateV2/forecastImage/forecast_img_bkk.png
  - The other regions: `https://air4thai.com/UpdateV2/forecastImage/forecast_img_{north,esan,centralwest,east,south}.png`
  - All six answered 200 at 09:16 UTC, last modified 08:34–08:36 UTC today, so they are renewed daily in the mid-afternoon (Bangkok time). No CORS header.
  - The north's image gives one category per day for the region ("ดี" for 25–31 Oct 2569), the provinces for tomorrow, and "พื้นที่เฝ้าระวัง" (Lampang, Tak) for the later days; the scale is ดีมาก · ดี · ปานกลาง · เริ่มกระทบสุขภาพ · กระทบสุขภาพ. **Categories, no numbers, no data feed:** the `forecast` field of `getNewAQI_JSON.php` was empty at all 173 stations.
  - Method: WRF/WRF-Chem on NSTDA's LANTA supercomputer, "can forecast 7 days ahead" (PCD slides, TMD World Meteorological Day 2026, https://www.tmd.go.th/media/forecast/worldmetday2026/, AG); its evaluation is a visual map comparison (Tridech, https://apctt.org/sites/default/files/2023-10/Dr.%20Sakda%20Tridech.pdf, RP). **No published skill.** No licence stated.
- **TMD: a weather index, not a dust forecast.** https://ozone.tmd.go.th/PM2.5/weather/Map/VRATE/daily/vruv_provinces.json (200, open JSON, no CORS header, generated 13:20 Bangkok today):
  - Source "GFS_TH_DAILYMEAN": **daily-mean ventilation rate for 77 provinces × 10 days**, with TMD's classes (poor < 2,000 · fair 2,000–4,000 · good 4,000–8,000 · very good 8,000–16,000 · excellent ≥ 16,000 m²/s) and Thai class words. Example: Chiang Mai today 386 m²/s, "ไม่ดี".
  - No verification found.
- **GISTDA:** a 3-hour nowcast at the point (`graphPredictByHrs`, which the page already reads), no days-ahead forecast (https://opendata.gistda.or.th/en/dataset/pm2-5, AG, licence "not specified").
- **Others:**
  - BMA: no forecast on official.airbkk.com.
  - CMU CCDC sits behind a bot check (not tried); a "PM2.5 ล่วงหน้า" section is **[unverified]**.
  - PSU AirThai shows 5-day LSTM station forecasts (https://lake.airthai.in.th/th/dashboard/new_forecast; research, no verification).
  - SERVIR-Mekong's "70 % accurate" 3-day forecast is **[unverified]**.

### 1.5 What drives it

- **Biomass burning dominates the northern season.**
  - Transboundary smoke arrives from January and peaks in March: up to 45 % of PM2.5 on average in Chiang Rai and at least half on unhealthy days (2019, WRF-Chem; Inlaung et al., *Toxics* 12:462, 2024, PR).
  - Fires in neighbouring countries gave 23–38 % of mainland Thailand's PM2.5 in Feb–Apr 2019, and Thai non-crop burning 21–36 % in the north (Thongsame et al., *GeoHealth* 2025, doi:10.1029/2024GH001315, PR).
  - Myanmar dominates the west and centre of the upper north (Chantaraprachoom et al., *Atmosphere* 15:1358, 2024, PR).
- **Meteorology sets the day-to-day changes.**
  - Rain on 20–21 Mar 2024 cut northern PM2.5, and 2022's lower peaks followed heavier rain (ASIA-AQ Thailand report, https://espo.nasa.gov/sites/default/files/documents/2026-07/ASIA_AQ_RSSR_Thailand_EN%20_final.pdf, RP).
  - Bangkok's day-to-day variability is mostly meteorological, with stagnant Dec–Feb weather (Aman et al., *Sci. Rep.* 2025, doi:10.1038/s41598-025-99094-6, PR).
  - Low wind, low humidity and heat favour high PM2.5 in the north (Amnuaylojaroen et al., *Atmosphere* 14:538, 2023, PR).
- **Hotspots as a predictor:** about 20 % gain with 1–5-day lags out to about 700 km in one Chiang Mai model (Wongsathan & Sabkam 2025). No study measured what hotspots add on top of a CAMS-based forecast; §5 finds very little.

### 1.6 Ozone, PM10, NO2

- **Ozone:** the 8-h maximum passed 70 ppb at one or more of five northern sites on **50 % of days in Jan–Apr 2024**, and at Bangkok's 13T on 26 days (20 %) (ASIA-AQ report above, RP). Hourly O3 often exceeded in the Bangkok region in 2010–14 while CO, SO2 and NO2 mostly did not (Uttamang et al., *ACP* 18:12581, 2018, PR). CAMS shows a systematic positive surface-ozone bias, tropical sites included (CAMS DJF-2026 report).
- **PM10:** national annual means 38–46 µg/m³, but Na Phra Lan (Saraburi) averaged 97 in 2022 (ONEP data via HISO, https://www.hiso.or.th/thaihealthmonitor/report/, RP); §6 finds the same station.
- **Not confirmed:** PCD's 2024 annual report refused connections, so national exceedance-day counts for 2024 are **[unverified]**.

## 2. Data

**Stations** (Air4Thai; `research/data/aq_stations.json`). Sample **A** (fit and choose): 35t Chiang Mai, 37t Lampang, 70t Phayao, 50t Bangkok Pathum Wan, 46t Khon Kaen, 44t Hat Yai. Sample **B** (disjoint confirmation): 57t Chiang Rai, 67t Nan, 58t Mae Hong Son, 69t Phrae, 05t Bangkok Bang Na, 41t Nakhon Sawan, 83t Ubon Ratchathani, 42t Surat Thani. The e3 study's A and B are kept and four northern stations added (37t, 70t, 58t, 69t): seven of 14 are in the north.

**Seasons.** S1 = Dec 2022–Apr 2023, S2 = Dec 2023–Apr 2024, S3 = Dec 2024–Apr 2025, S4 = Dec 2025–Apr 2026 (the newest), target days Dec–Apr. Days above 37.5 µg/m³ (lead 1, all 14 stations): 51.7 % in S1, 41.1 % S2, 35.1 % S3, 26.2 % S4; in the north 65.8, 54.5, 42.1 and 31.6 %. Above 75: 18.2, 9.6, 4.7 and 8.5 % (north 33.0, 16.9, 7.5, 16.9). The fitting seasons were the dirtier ones.

**What was used, and what was probed** (`research/aq_probe.py`, log `aq_probe-2026-10-24.log`):

| Source | What | Found |
|---|---|---|
| Air4Thai daily sheets `air4thai.net/daily_download/<PM2.5\|PM10>/<year>.xlsx` | 24-h means, preliminary QC | PM2.5 2011–2026 (3 stations in 2011, 66 in 2019, 105 in 2025; 2026 to 30 Jun); PM10 too. **O3, NO2, CO, SO2: 404** (the history page links only PM2.5 and PM10). 36,719 PM2.5 station-days at the 14 stations, 2019–2026 |
| Air4Thai hourly history `air4thai.com/forweb/getHistoryData.php` | hourly values | about 3 months back: O3 at 50t answered for 2026-08-01, not for 07-01 or 03-01 |
| CAMS global via Open-Meteo air quality | hourly pm2_5, pm10, ozone, NO2, CO, SO2, dust, AOD | **values from 2022-08-10** (null on 2022-07-31 and earlier). Stitched from short-lead forecasts, so every CAMS score is an upper bound for a forecast as issued |
| ERA5 via Open-Meteo archive | BLH, wind 10/100 m, rain, RH, T, cloud, pressure | all there, except **boundary-layer height: null 2024-01-02 to 2024-04-30** at all 14 stations, also for `era5_seamless` and `ecmwf_ifs` |
| ECMWF IFS as issued, Open-Meteo previous-runs API | `*_previous_day2` | there for Feb 2025 and Dec 2025 (used for the as-issued test, §5.3) |
| NASA FIRMS VIIRS S-NPP yearly country files `firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/<y>/viirs-snpp_<y>_<Country>.csv` | hotspots | **download without a key**; 2022–2025 used for Thailand, Myanmar, Lao_PDR, Cambodia (16 files, 231 MB); Thailand 2021 exists; **2026: 404** (also MODIS and NOAA-20); Laos is `Lao_PDR`. The listing page `/data/country/` itself is 404; names must be known. 2,481,071 detections kept (nominal or high confidence, vegetation fires, Nov–Apr) |

Open-Meteo: 134 requests, **1,395.4 weighted calls** of the 1,500 allowed, every one in `research/logs/openmeteo-calls-2026-10-24.log` (tag `aq-study`), all answered 200.

**Forecast convention** (as `research/e3_pm25.py`): issue at 00:00 Bangkok on day I with observations to the end of day I−1; lead k = 1, 2, 3 is the 24-h mean of day I+k−1. Persistence = the last observed day; the damped ratio = persistence × (CAMS(day) ÷ CAMS(last observed day))^β with the shipped β 0.45 / 0.55 / 0.55. On the page, "tomorrow" uses β 0.55, so it is scored as lead 2 here (an evening visit is closer to lead 1, which is easier).

## 3. Baselines confirmed: the damped ratio in 2024–25 and 2025–26

MAE µg/m³, Dec–Apr (`aq_expB.py`; climatology = the station's calendar-month median 2019 → before the season):

| Test | Lead | n | climatology | raw CAMS | persistence | **damped** | damped vs persistence |
|---|---|---|---|---|---|---|---|
| A, S3 | 1 | 890 | 11.58 | 11.26 (bias −8.3) | 5.75 | **5.14** | −0.62 [−0.89, −0.36] |
| B, S3 | 1 | 1197 | 14.74 | 14.60 (bias −11.2) | 6.80 | **5.94** | −0.86 [−1.13, −0.57] |
| B, S3 | 2 | 1195 | 14.75 | 14.63 | 10.78 | **8.66** | −2.12 [−2.64, −1.60] |
| B, S4 | 1 | 1166 | 17.00 | 13.06 (bias −9.6) | 5.21 | **4.73** | −0.48 [−0.72, −0.22] |
| B, S4 | 2 | 1163 | 17.00 | 13.06 | 8.08 | **6.58** | −1.50 [−1.95, −1.04] |
| north B, S3 | 1 | 601 | 18.73 | 18.83 | 7.12 | 7.01 | −0.11 [−0.46, +0.22] |
| north B, S4 | 1 | 568 | 25.13 | 18.61 | 6.05 | 5.89 | −0.16 [−0.54, +0.23] |
| north B, S4 | 2 | 566 | 25.16 | 18.63 | 9.57 | **8.40** | −1.17 [−1.94, −0.43] |

Intervals are 90 % from a bootstrap over 5-day blocks within station-season. Raw CAMS still runs 8–11 µg/m³ low. In the north the damped ratio only ties persistence on day 1 and wins from day 2; elsewhere it wins from day 1. Refitting β on S1+S2 gave 0.30 / 0.40 / 0.45 and changed MAE by −0.09 to +0.14 µg/m³: the shipped β holds.

## 4. Experiment A: a calibrated chance of passing 37.5 and 75 µg/m³

**Question.** From the damped ratio's own errors, can the page say "พรุ่งนี้ โอกาสฝุ่นถึงระดับเริ่มมีผลกระทบต่อสุขภาพ ราว 40%" and be right?

**Method** (`research/aq_expA.py`, fixed before any test score was seen). Events: 24-h mean > 37.5 (PCD "เริ่มมีผลกระทบต่อสุขภาพ" or worse) and > 75 ("มีผลกระทบต่อสุขภาพ"). Five candidates were fitted on S1 and scored on S2 at sample A: lognormal dressing of the damped forecast (**damp_dress**, the pre-registered primary: ln obs = ln f + e, e ~ N(μ, σ) per lead), the same with the empirical error distribution (damp_emp), a level-dependent σ (damp_het), logistic regression on ln f (damp_logit), and logistic regression on ln persistence and CAMS's log change (pl_logit). References: climatology (the station's frequency in that calendar month, 2019 → the season before the test) and two persistence-based chances (lognormal around persistence, chosen; logistic on persistence). The protocol picked damp_emp on S2 (mean Brier 0.0618 vs 0.0631 for damp_dress); the two then differed by at most 0.001 on every test, so the simpler damp_dress is reported and recommended (a simplification chosen after seeing the tie, not a gain). Refit on S1+S2 at sample A, then scored untouched.

**Fitted** (sample A, S1+S2): μ = +0.0017 / +0.0029 / +0.0041 and **σ = 0.2406 / 0.3433 / 0.3795** for leads 1 / 2 / 3. The page should use μ = 0 (see §7).

**Brier score and skill** (> 37.5; damp_dress; persistence = the dressed persistence chance; in brackets the Brier score after the page's rounding to tens kept within 10–90 %):

| Test | Lead | n | days > 37.5 | Brier clim | Brier persistence | Brier damped (rounded) | skill vs clim | skill vs persistence |
|---|---|---|---|---|---|---|---|---|
| A, S3 | 2 | 894 | 35.8 % | 0.1818 | 0.1576 | 0.1248 (0.1287) | +0.31 [+0.22, +0.39] | +0.21 [+0.16, +0.26] |
| **B, S3** | 1 | 1200 | 34.7 % | 0.1830 | 0.0901 | 0.0760 (0.0803) | +0.58 [+0.53, +0.64] | +0.16 [+0.11, +0.21] |
| **B, S3** | 2 | 1198 | 34.7 % | 0.1833 | 0.1434 | 0.1094 (0.1127) | +0.40 [+0.33, +0.47] | +0.24 [+0.19, +0.28] |
| **B, S4** | 1 | 1169 | 26.2 % | 0.1786 | 0.0477 | 0.0432 (0.0497) | +0.76 [+0.71, +0.80] | +0.10 [+0.02, +0.16] |
| **B, S4** | 2 | 1168 | 26.1 % | 0.1778 | 0.0733 | 0.0600 (0.0656) | +0.66 [+0.60, +0.71] | +0.18 [+0.11, +0.25] |
| north B, S3+S4 | 1 | 1172 | 37.5 % | 0.2173 | 0.0673 | 0.0647 (0.0699) | +0.70 [+0.65, +0.74] | +0.04 [−0.02, +0.09] |
| north B, S3+S4 | 2 | 1172 | 37.5 % | 0.2167 | 0.1063 | 0.0943 (0.0984) | +0.56 [+0.50, +0.62] | +0.11 [+0.06, +0.16] |
| north A, S3+S4 | 2 | 896 | 36.0 % | 0.2219 | 0.1221 | 0.1079 (0.1109) | +0.51 [+0.43, +0.58] | +0.12 [+0.06, +0.17] |
| quiet, 20 Sep–22 Oct 2026 (e3's 10 stations) | 2 | 327 | 0.3 % | 0.0048 | 0.0079 | 0.0062 (0.0151) | −0.28 [−2.49, +0.13] | +0.21 [−0.41, +0.47] |

> 75 (same sets): skill vs climatology +0.24 to +0.79; vs persistence +0.08 [−0.04, +0.18] (B S3, day 1), +0.10 [−0.02, +0.21] (B S3, day 2), +0.18 [+0.09, +0.26] and +0.21 [+0.10, +0.31] (B S4), +0.07 to +0.11 in the north with intervals touching 0. Logistic forms did better for > 75 (pl_logit vs persistence +0.16 to +0.29, all above 0 on B), but were not chosen on S2. All rows in `research/logs/aq_tables-2026-10-24.log`.

**Reliability as the page would show it** (damp_dress, rounded to tens; sample B, S3+S4 pooled, n ≈ 2,370 per row; "shown → happened"):

| Shown | 10 % | 20 % | 30 % | 40 % | 50 % | 60 % | 70 % | 80 % | 90 % |
|---|---|---|---|---|---|---|---|---|---|
| tomorrow, > 37.5 | 2 % (1090) | 8 % (188) | 19 % (149) | 32 % (128) | 47 % (121) | 50 % (117) | 69 % (99) | 80 % (96) | 95 % (378) |
| lead 1 (an evening visit's tomorrow), > 37.5 | 1 % (1275) | 10 % (133) | 30 % (93) | 28 % (83) | 42 % (93) | 49 % (72) | 73 % (77) | 86 % (92) | 97 % (451) |
| tomorrow, > 75 | 0 % (1978) | 6 % (100) | 11 % (57) | 36 % (42) | 39 % (28) | 38 % (29) | 74 % (23) | 72 % (29) | 89 % (80) |

The north at sample B (tomorrow, > 37.5): 2, 8, 22, 34, 49, 48, 64, 78, 95 %. Read: the chance is honest at the ends and within about 10 points from 30 % up; the "10 %" bin is really 0–3 % and "20 %" 0–10 %, so the low end over-warns. That is the cost of "never 0 %": the floor alone raises the Brier score of > 75 from 0.0149 to 0.0235 (B S4, day 1). In the quiet season the chance stayed at 10 % on 312 of 327 days (tomorrow), but said 20 % or more on 15 days, with one event: it was fitted on Dec–Apr and should stay there.

**Why it works without new data.** The persistence chance alone already has skill vs climatology of +0.45 (A, 2024–25) to +0.73 (B, 2025–26) on day 1 for > 37.5 (a dirty day tends to follow a dirty day); CAMS's predicted change adds the rest. Nothing beyond the page's own two inputs is needed.

## 5. Experiment B: weather and fires as extra predictors

**Method** (`research/aq_expB.py`, fixed before testing except where marked). Target: ln(obs ÷ persistence). Feature sets: *stat* (CAMS's log change, ln(persistence ÷ station-month median), yesterday's trend); *met* (ERA5 of the target day relative to the last observed day: rain of both days, Δ10-m and Δ100-m wind, Δhumidity, Δsurface pressure, Δdiurnal temperature range); *blh* (Δ ln daytime BLH, Δ ln ventilation, ln ventilation; fitted on S1 + Dec 2023 only, because of the ERA5 gap); *fire* (FIRMS of the last observed day: ln(1+n) within 50 and 300 km, in the upwind ±45° sector within 600 km, and the change from the day before). Models: ridge on stat, stat+met, stat+met+blh, stat+fire, all; median (quantile) regression on all; a small gradient-boosted model on all. Fitted at sample A on S1+S2, ridge penalty by leave-one-season-out. Target-day ERA5 is a **perfect forecast** (an upper bound). **Post-hoc** (added after the first run showed the ridge "stat" core losing to the damped ratio in S4): `damped_met` and `damped_fire` keep the damped ratio as a fixed offset and fit a ridge correction on met or fire only.

### 5.1 MAE, µg/m³

| Test | Lead | n | persistence | damped | damped_met † | damped_fire † | ridge stat | ridge met | ridge fire | ridge all | quantile all | GBM all |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A, S3 | 1 | 890 | 5.75 | 5.14 | 4.93 | 5.04 | 4.91 | 4.60 | 4.92 | 4.60 | 4.70 | 4.66 |
| A, S3 | 2 | 888 | 9.04 | 7.46 | 6.87 | 7.37 | 7.28 | 6.52 | 7.33 | 6.57 | 6.48 | 6.82 |
| **B, S3** | 1 | 1197 | 6.80 | 5.94 | 5.54 | 5.83 | 5.75 | 5.24 | 5.65 | 5.19 | 5.31 | 5.46 |
| **B, S3** | 2 | 1195 | 10.78 | 8.66 | 7.68 | 8.59 | 8.53 | 7.30 | 8.46 | 7.27 | 7.19 | 7.90 |
| **B, S4** | 1 | 1166 | 5.21 | 4.73 | 4.69 | – | 4.72 | 4.61 | – | – | – | – |
| **B, S4** | 2 | 1163 | 8.08 | 6.58 | 6.33 | – | 6.96 | 6.54 | – | – | – | – |
| north B, S3 | 1 | 601 | 7.12 | 7.01 | 6.47 | 6.71 | 6.56 | 6.02 | 6.34 | 5.88 | 6.11 | 6.18 |
| north B, S4 | 2 | 566 | 9.57 | 8.40 | 8.05 | – | 8.94 | 8.39 | – | – | – | – |

† post-hoc. – : no FIRMS file for 2026.

### 5.2 What each source adds (paired ΔMAE, 90 % interval; negative = better)

| Test | Lead | met over stat | fire over stat | fire over stat+met | damped_met over damped † | damped_fire over damped † |
|---|---|---|---|---|---|---|
| A, S3 | 1 | −0.30 [−0.45, −0.16] | +0.01 [−0.06, +0.09] | +0.00 [−0.05, +0.05] | −0.21 [−0.32, −0.10] | −0.09 [−0.15, −0.04] |
| B, S3 | 1 | −0.51 [−0.65, −0.37] | −0.10 [−0.20, −0.01] | −0.06 [−0.13, +0.01] | −0.40 [−0.51, −0.29] | −0.12 [−0.19, −0.06] |
| B, S3 | 2 | −1.23 [−1.49, −0.98] | −0.07 [−0.21, +0.06] | −0.04 [−0.17, +0.07] | −0.99 [−1.20, −0.78] | −0.08 [−0.17, +0.01] |
| B, S4 | 1 | −0.12 [−0.21, −0.02] | – | – | −0.04 [−0.11, +0.02] | – |
| B, S4 | 2 | −0.42 [−0.58, −0.26] | – | – | −0.25 [−0.37, −0.13] | – |
| north B, S3 | 1 | −0.53 [−0.77, −0.31] | −0.21 [−0.39, −0.05] | −0.14 [−0.26, −0.02] | −0.54 [−0.73, −0.36] | −0.30 [−0.40, −0.20] |
| north A, S3 | 1 | −0.17 [−0.40, +0.06] | +0.01 [−0.11, +0.13] | −0.01 [−0.09, +0.07] | −0.22 [−0.40, −0.04] | −0.17 [−0.25, −0.09] |

- **Weather** helps, most on day 2, but the gain shrinks from S3 to the newest season: tomorrow −0.99 at B in S3, −0.25 in S4. The free-standing ridge models lost their edge in S4 (ridge stat vs damped +0.38 [−0.06, +0.82] on day 2, ridge met −0.03 [−0.49, +0.38]): what they learnt from the dirty S1–S2 beyond the damped ratio did not carry over. Keeping the damped ratio as a fixed base and correcting only for weather did carry over (post-hoc).
- **Boundary-layer height** made the model worse in S3 (+0.14 to +1.13) and changed little in S4 (−0.29 to +0.26), but it could be fitted on only 959 rows instead of 1,680 (the ERA5 gap): not a fair test of BLH.
- **Fires** add little. In the pre-registered comparison: −0.10 µg/m³ at sample B and −0.21 at its northern stations on day 1, nothing at sample A, nothing significant on day 2. As a post-hoc correction on the damped ratio: −0.08 to −0.30 (2–4 %) in 2024–25. Not testable in the newest season. The likely reason is that CAMS already carries GFAS fire emissions and yesterday's measurement already carries yesterday's smoke.
- **Gradient boosting** made Surat Thani 24–46 % worse than the damped ratio beyond chance (B, S3, all leads); rejected again.

### 5.3 The weather correction as issued

`research/aq_expB_asissued.py`: the same damped_met coefficients (fitted on ERA5, sample A, S1+S2), fed with ECMWF IFS forecasts as issued (Open-Meteo previous-runs API: `_previous_day2` for the target day, every hour from a run before the issue; the latest run's own values for the last observed day), sample B, S4:

| Lead | n | persistence | damped | with ERA5 (perfect) | **with forecasts** | Δ vs damped | band right | stations worse |
|---|---|---|---|---|---|---|---|---|
| 1 | 1169 | 5.20 | 4.73 | 4.69 | 4.70 | −0.03 [−0.11, +0.05] | 76.4 → 76.5 % | 41t (+6 %) |
| 2 | 1168 | 8.07 | 6.57 | 6.32 | **6.31** | −0.26 [−0.40, −0.12] | 68.7 → 70.1 % | 41t (+7 %) |

Forecast and ERA5 features correlate 0.60–0.97. A forecast lost nothing against the perfect one: the gain is small but real for tomorrow. It is post-hoc, it made one disjoint station worse, and the page would need a second weather call; hence **wait** (§7).

## 6. Experiment C: PM10 and ozone

`research/aq_expC.py`.

- **PM10** (Air4Thai daily, 96 stations, 151,808 station-days 2019–2026): above 120 µg/m³ (PCD AQI > 100) on **2.01 %** of station-days (4.27 % in Dec–Apr), above 180 on 0.42 %. Of 3,021 such days with PM2.5 at the same station, PM2.5 was 37.5 or less on only **168 (5.6 %)**, and **157 of those at one station, 24t Na Phra Lan (Saraburi)**, which had PM10 > 120 on 27.5 % of its days. So, outside a few industrial sites, a PM10 warning follows a PM2.5 warning that the page already gives.
- **PM10 forecast** (57t, 58t, 83t, S3+S4, n = 904): MAE raw CAMS 28.13 (bias −26.8), persistence 10.04, damped (PM2.5's β, not refitted) **8.41** on day 1; 28.16 / 15.40 / **11.86** on day 2. The method transfers, but there is little to warn about.
- **Ozone** (13t Nonthaburi, 30t Rayong, 38t Mae Mo; 26 Jul–23 Oct 2026, the only open hourly history; 250 station-days): the day's maximum 8-h mean passed 70 ppb on **7 days** (13t on 7–9 Oct, 30t on 14 Sep, 8, 16 and 23 Oct; highest 93 ppb; unrounded, 13t's 7 Oct was 70.x). CAMS ozone ran **+18 ppb high** on average (correlation 0.64); MAE day 1: CAMS 19.2, persistence 6.8, damped 6.5 ppb; day 2: 19.4 / 8.2 / 7.0. One late wet season at three stations decides nothing about the dry season, when ASIA-AQ found 70 ppb passed on half the days in the north (§1.6); no open dry-season record exists to score a forecast on.
- **NO2, CO, SO2:** not tested (no open history beyond about three months).

## 7. What the page should do

### 7.1 Ship (provisional): the chance of a dust day, tomorrow and the day after

**Formula** (for the window's damped forecast f, already computed by `airq.dampedOutlook`):

p(T) = 1 − Φ( (ln T − ln f) / σ ), T = 37.5 or 75 µg/m³, σ = **0.343** for tomorrow and **0.380** for the day after (fitted 0.3433 and 0.3795; μ set to 0, fitted +0.003 and +0.004).

- μ = 0 makes p(37.5) = 50 % exactly when f = 37.5, so the chance and the band word never disagree.
- Rounded to tens; below 5 % shown as "ต่ำกว่า 10%"; at or above 95 % as "เกิน 90%" (never 0 or 100 %, GUIDELINES rule 4).
- Typical values: f = 28 gives 20 % (tomorrow); 33 → 35 %; 42 → 63 %; 50 → 80 %; 60 → 91 % for > 37.5 and 26 % for > 75; 90 → 70 % for > 75 (`aq_tables` log).
- **Only** Dec–Apr (the fitted domain, rule 3e), **only** when the damped forecast rests on a PCD station within 15 km and 3 h (`out.ratio.basis === "station"`): with GISTDA's estimate as input it is untested, and GISTDA reads about 1.3× the stations (KI-009). No chance for "the rest of today" (it is not a 24-h mean).

**Words** (the band words are PCD's, as in `levels.js`):

- TH: "พรุ่งนี้ โอกาสที่ฝุ่นเฉลี่ยทั้งวันจะถึงระดับ “เริ่มมีผลกระทบต่อสุขภาพ” ราว 40%" and, when p(75) ≥ 10 %, "ถึงระดับ “มีผลกระทบต่อสุขภาพ” ราว 20%". Low end: "ต่ำกว่า 10%". Source line: "โอกาสจากแบบจำลอง CAMS ปรับตามค่าวัดล่าสุด ตรวจกับค่าวัดจริง 2 ฤดูฝุ่น (ธ.ค. 2567–เม.ย. 2569)".
- EN: "Tomorrow: about a 40% chance that the day's mean reaches “Starting to affect health”" and "about 20% that it reaches “Affects health”"; "under 10%". Source line: "A chance from the CAMS model, corrected by the latest measurement; checked against two dust seasons of measurements (Dec 2024–Apr 2026)".

**Rules it touches.**
- *Chance rule* (rule 6): unchanged levels. The chance of > 37.5 reaches 20 % only from f = 28.1 (tomorrow) or 27.2 (day after), already "ปานกลาง" = ติดตามไว้; it reaches 50 % exactly at the band edge. The chance adds words, not levels.
- *A forecast alone tops out at เตรียมตัว* (rule 3b): a 60 % chance of > 75 stays เตรียมตัว.
- *Only validated numbers* (rule 3d): validated on disjoint stations and the newest season, but it inherits the damped ratio's post-hoc status; re-test both as issued in Dec 2026–Apr 2027.
- It can replace "อาจเปลี่ยน" on days 2–3 (MODELS §2) with an honest number.

**Collector:** nothing new to show it. To re-test it as issued: archive, daily during Dec–Apr, the PCD 24-h means at the archive points beside the CAMS forecasts `research/archive_forecasts.mjs` already keeps.

### 7.2 Ship a link, parse nothing: PCD's own forecast

PCD's 7-day forecast is the agency's word on the coming days, but it is a picture. The outlook card can link the visitor's region:
- TH: "คาดการณ์ฝุ่น 7 วันของกรมควบคุมมลพิษ (ภาพ)"
- EN: "PCD's 7-day dust forecast (image)"

The region→image map is the app's choice (bkk, north, esan, centralwest, east, south). Reading categories from the image with AI would put a model on the visitor's path (GUIDELINES §10): don't.

Two things follow from "the agency's word leads":
1. Ask PCD for the forecast as data (an owner action for OWNER_ACTIONS).
2. Once there is a feed, a PCD forecast of "เริ่มกระทบสุขภาพ" for a province must lift that day in the 3-day table, as a TMD warning lifts a tile.

**Collector:**
- Archive the six images daily, Dec–Apr, so that PCD's categories can be scored against the stations later (by a person, off the visitor's path).
- Archive TMD's ventilation JSON daily, to test it as a predictor (§5 could not test ERA5's BLH fairly).

### 7.3 Wait: the weather-aware correction

Re-test as issued in Dec 2026–Apr 2027 with archived ECMWF point forecasts (rain, 10-m and 100-m wind, humidity, surface pressure, temperature) for the archive points. If it holds (tomorrow's MAE down by at least 0.2 µg/m³ with no station worse), it needs one more Open-Meteo call per visit (`api.open-meteo.com/v1/forecast` with `past_days=1`), or those variables added to the ensemble call **[unverified which of them the ensemble API serves]**. No page words until then.

### 7.4 Don't ship: fires, machine learning, PM10

- Fires: 0.1–0.3 µg/m³ at best, and untestable on the newest season until FIRMS publishes its 2026 yearly files. The fires tile keeps showing hotspots as facts.
- Gradient boosting: rejected twice now (e3, and here at Surat Thani).
- PM10: the PM2.5 chance covers 94 % of PM10's unhealthy days, and the "other pollution" card's measured PM10 covers the rest. Without a station, that card falls back to raw CAMS values (`assess.js`, labelled "ค่าจากแบบจำลอง ไม่มีระดับทางการ"). Raw CAMS PM10 ran 27 µg/m³ low in Dec–Apr at three stations (§6); the card's label is right, but the number misleads more than it helps.

### 7.5 Wait: ozone

Ozone does reach "เริ่มมีผลกระทบ" (8-h > 70 ppb) often in the northern dry season (§1.6) and sometimes around Bangkok in October (§6), but no open record exists to score a forecast against. The "other pollution" card already shows the nearest station's measured O3.
- The collector reads Air4Thai every 15 minutes already; keeping each station's hourly O3 (and NO2) in a small archive would give a dry-season record by May 2027.
- Then score the damped ratio against persistence on it.
- Raw CAMS ozone runs +18 ppb high (Aug–Oct 2026, three stations). The card's no-station fallback shows it today, labelled as a model value with no level. Consider dropping the fallback's numbers, or adding that they can be far off, until a dry-season test exists.

## 8. What could not be done

- **Forecasts as issued for CAMS:** none are open for 2022–2026 (Open-Meteo stitches short leads), so every CAMS-based score, the chance included, is an upper bound.
- **Fires in the newest season:** FIRMS has no 2026 yearly file yet; NRT history needs a MAP_KEY, which this study did not use.
- **Boundary-layer height in Jan–Apr 2024:** missing in Open-Meteo's ERA5, IFS and seamless archives, so BLH was fitted on half the rows.
- **Dry-season ozone, NO2, CO, SO2:** no open history beyond about three months.
- **GISTDA's estimate as the input:** not scored (no history of it was collected).
- **PCD's own 7-day forecast:** not scored. It exists only as images, with no archive.
- **CMU CCDC:** behind a bot check, not tried.
- **PCD's annual reports:** the server refused connections, so national exceedance counts are taken from the literature.
- **Daily-window detail:** Air4Thai's daily mean window (00–23 vs 01–24 h) is undocumented; a one-hour shift is immaterial for daily means.

## 9. Reproduce

```
V=<venv>/bin/python                                  # numpy 2.5, pandas 3.1, scikit-learn 1.9, scipy 1.18, statsmodels 0.15, openpyxl
$V -I research/aq_probe.py        # what exists (log aq_probe)
$V -I research/aq_probe_agency.py # PCD's forecast images, Air4Thai's forecast field, TMD's ventilation JSON
$V -I research/aq_data.py         # Air4Thai + CAMS + ERA5 + FIRMS → research/data/aq_daily.csv.gz (Open-Meteo ≈ 1,257 weighted calls the first time)
$V -I research/aq_expA.py         # chances → research/out/aq_expA_results.json
$V -I research/aq_expB.py         # predictors → research/out/aq_expB_results.json
$V -I research/aq_expB_asissued.py  # weather correction with forecasts (108 weighted calls)
$V -I research/aq_expC.py         # PM10 and ozone (19 weighted calls)
$V -I research/aq_tables.py       # the tables above → research/logs/aq_tables-2026-10-24.log
```

Answers are cached in the session scratchpad (`AQ_SCRATCH`), so a re-run costs nothing. Downloads (FIRMS, 231 MB) stay in the scratchpad.

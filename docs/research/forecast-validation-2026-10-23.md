# Forecast validation — how good are the numbers disaster-now will show? (23 Oct 2026)

> Owner: "apply experiments like mathematical models and/or ML to forecast what can happen in the next 12–24 h or
> longer… validate the model outcome, and cross-validate for the correctness of output and forecasting results."

This report measures the forecasts the app will show against observations, and tests whether simple corrections
(statistical / ML) beat them. Every number below comes from running code in `research/` (commands in §9); each run
is logged in `research/logs/<experiment>-2026-10-23.log`. Machine-readable results: `research/out/e3_results.json`,
`e4_results.json`, `e1e2_results.json`; the corrections the app should apply: **`research/out/calibration.json`**.

**Protocol** (FloodWatch `docs/GUIDELINES.md` §4): choose and fit on an earlier period at one set of stations
(sample A), score on a later period, confirm on a disjoint set of stations (sample B) and on the newest season. A
station is "made worse" only if its MAE rises by more than 3 % **and** a moving-block bootstrap (blocks ≥ the
horizon: 5 days for PM2.5, 7 days for heat) puts the rise above zero at 95 % one-sided. A candidate added after a
first look at test results is marked **post-hoc** and its scores are less trustworthy for that reason.

## 0. Verdicts at a glance

| Hazard / what the app shows | Verdict | Key numbers (test data the fit never saw) |
|---|---|---|
| **Heat index** (ECMWF ENS, max per window) | **use with correction** — raw must not be shown | raw is ~5 °C too low: MAE 4.7–5.1 °C, P(HI ≥ 42) caught 0–6 % of days that reached 42. Corrected per member (HI = 10.37 + 0.865·HI_raw): MAE 2.4 °C, ≥ 42 POD 0.65–0.86, FAR 0.34–0.37; 0 of 18 stations made worse. ENS corrected + dressed: Brier skill +0.26 vs the sample base rate, 10–90 % range held 82 % (target 80 %). |
| **PM2.5 outlook** (CAMS) | **use with correction (provisional)** | raw CAMS ran 10–13 µg/m³ low in Mar–Apr 2026, caught 17–21 % of days ≥ 75.1. The planned ratio correction beats raw but loses to persistence at 0–24 h. A damped ratio (post-hoc; β 0.45–0.55) beat persistence on every test: 0–24 h MAE 4.34 vs 5.20 (A) and 6.55 vs 7.31 (B), 48–72 h 11.04 vs 13.81 (B). GBM rejected. |
| **Heavy rain** (≥ 35.1 mm / 24 h at a point) | **don't show as yes/no or amount**; ENS chance as a coarse word only | HRES POD 0.04–0.13, CSI 0.03–0.09 (2025); ENS Brier skill −0.08 to +0.12 vs climatology; heavy rain on 2–6 % of days the ensemble gave P = 0. |
| **Wind gusts** (P ≥ 40 km/h) | **not validated** — label as unverified | no gust observations in the station records used |
| **Earthquake "felt here?"** (IPE, after a quake) | **use, with a Bangkok term and soft wording** | Allen, Wald & Worden (2012): MAE 0.96 MMI over 357 Thai city reports (2,841 responses, 13 events), bias 0.00; Bangkok-metro under-predicted by +1.06 MMI (10 events) → with the term, the 2025 test residual 0.95 → −0.11 MMI. No forecasting of quakes. |
| **Flood** | link to FloodWatch | FloodWatch's own as-issued record: 24 h median −6.9 % error vs "no change" nationwide, 90 % range held 90–92 % (§5) |

## 1. E3 — PM2.5 outlook (CAMS vs Air4Thai)

**Question.** The app plans to show the next 24–72 h PM2.5 from CAMS (Open-Meteo air-quality API), corrected by
ratio = observed 24-h mean / CAMS 24-h mean over the same past hours, clipped to [0.5, 3]. How good is that, and does
anything simple do better?

**Data.**
- Observations: Air4Thai. The history endpoint the brief found returned empty data for March because the hourly
  archive only goes back about three months (and `10t` is not in the history station list). The webV3 history page
  (`air4thai.pcd.go.th/webV3`, chunk `2e034b96`) calls `https://air4thai.com/forweb/getHistoryData.php?stationID=<ids>&param=PM25&type=hr&sdate=YYYY-MM-DD&edate=YYYY-MM-DD&stime=00&etime=23`
  (comma-separated station ids work), with ids from `getHistoryStation.php` (177 stations). Tested 2026-10-23 at 35t:
  24 hourly values for 2026-08-01, 08-10, 09-01, 10-01; **none** for 2026-07-25, 07-15, 07-01, 05-01, 04-15, 04-01,
  03-01 or 2025-03-01 (`probe_air4thai_history.py`); the brief's `webV2/history/api/data.php` address gave the
  same empty list for 35t on 2026-03-01. The same page links yearly daily
  means, `https://air4thai.net/daily_download/PM2.5/<year>.xlsx` ("ผ่านการตรวจสอบในระดับเบื้องต้น", preliminary QC):
  2025 (whole year) and 2026 (1 Jan–30 Jun). TLS: the CA bundle of the brief (proxy bundle + Let's Encrypt `int-yr1` +
  `root-yr-by-x1`) verified all three Air4Thai hosts (.pcd.go.th, .com, .net); verification was never turned off.
- CAMS: `air-quality-api.open-meteo.com/v1/air-quality`, `hourly=pm2_5`, `domains=cams_global`, `timezone=Asia/Bangkok`,
  2025-11-26…2026-04-30 and 2026-09-15…2026-10-23, one call per station and range (20 calls, 139 weighted).
  **Caveat: this history is stitched from short-lead forecasts, so every CAMS-based score below is an upper bound** for
  a 24–72 h-old forecast; persistence is a true as-issued baseline.
- Ten stations, two disjoint samples: **A** (fit/choose) 35t Chiang Mai, 50t Bangkok Pathum Wan, 46t Khon Kaen, 44t Hat
  Yai; **B** (confirm) 57t Chiang Rai, 67t Nan, 05t Bangkok Bang Na, 41t Nakhon Sawan, 83t Ubon Ratchathani, 42t Surat
  Thani. 1,895 station-days with both observation and CAMS.

**Method.** Issue at 00:00 Bangkok on day I with observations to the end of day I−1; lead 1/2/3 = the 24-h means of
days I, I+1, I+2 (0–24, 24–48, 48–72 h). Candidates: (a) raw CAMS; (b) persistence (yesterday's mean); (c) the planned
ratio correction; (d) a blend a + b·persistence + c·CAMS, linear or in log space (log chosen on Feb 2026); (e) sklearn
HistGradientBoosting. Fit Dec 2025–Jan 2026, choose on Feb 2026 (sample A), refit Dec–Feb, then score Mar–Apr 2026
(A and B), Dec–Feb at B, and the newest data Sep 20–Oct 22 2026 (daily means from ≥ 18 hourly values). After the first
full run a **post-hoc** candidate was added: the ratio method with CAMS's change damped,
`forecast = obs_mean_last24h × (CAMS(window)/CAMS(last 24 h))^β`, β per lead fitted on Dec–Feb only (β = 1 is the planned
method, β = 0 is persistence); fitted β = 0.45 / 0.55 / 0.55.

**Results** (MAE µg/m³, bias, band agreement over the PCD 2023 bands 15/25/37.5/75, and categories):

| Test set (n per lead) | Lead | raw CAMS | persistence | planned ratio | log blend | damped ratio (post-hoc) |
|---|---|---|---|---|---|---|
| A, Mar–Apr 2026 (242) | 0–24 h | 11.84 (−9.95), band 50 % | 5.20, 72 % | 6.44, 71 % | 5.17, 76 % | **4.34**, 78 % |
| | 24–48 h | 11.86 | 7.29 | 8.33 | 7.52 | **6.12** |
| | 48–72 h | 11.91 | 8.75 | 9.29 | 8.68 | **6.92** |
| B, Mar–Apr 2026 (363) | 0–24 h | 16.72 (−12.73), 54 % | 7.31, 76 % | 8.76, 70 % | 8.08, 75 % | **6.55**, 78 % |
| | 24–48 h | 16.75 | 11.11 | 11.42 | 11.55 | **9.23** |
| | 48–72 h | 16.77 | 13.81 | 12.50 | 13.45 | **11.04** |
| B, Dec 2025–Feb 2026 (504) | 0–24 h | 8.25 | 3.99 | 4.87 | 3.69 | **3.38** |
| all, Sep 20–Oct 22 2026 (328) | 0–24 h | 6.08 | 3.04 | 4.65 | **2.59** | 2.78 |
| | 48–72 h | 6.05 | 4.92 | 6.64 | **3.58** | 4.06 |

Days ≥ 75.1 µg/m³ (Mar–Apr, 0–24 h): POD raw 0.17 (A, 23 days) / 0.21 (B, 53 days); persistence 0.87 / 0.85; planned
ratio 0.87 / 0.81 (FAR 0.20 / 0.25); damped 0.83 / 0.85 (FAR 0.14 / 0.17). Days ≥ 37.6: CSI raw 0.54 / 0.56,
persistence 0.76 / 0.86, damped 0.83 / 0.89. The log blend under-forecasts peaks (bias −2.4 to −8.0 in Mar–Apr; POD
≥ 75.1 only 0.33–0.51 at 24–72 h), so it loses the season that matters most although it wins October. The GBM won the
choosing month (Feb MAE 3.93) and then failed every later test (A Mar–Apr 8.56, B 14.04, POD ≥ 75.1 = 0): trees cannot
extrapolate to burning-season levels they never saw — **rejected** (it does not beat (d) on the disjoint test).

Pooled MAE difference vs persistence with a 90 % block-bootstrap interval (Mar–Apr, 0–24 h): planned ratio +1.25
[+0.73, +1.76] (A), +1.45 [+0.46, +2.45] (B); damped −0.86 [−1.30, −0.43] (A), −0.76 [−1.33, −0.22] (B); at 48–72 h
damped −1.82 [−2.70, −0.93] (A), −2.77 [−3.93, −1.58] (B); newest (Oct) 0–24 h damped −0.26 [−0.51, −0.02].
**Made worse beyond chance:** the planned ratio vs persistence at 4 of 10 stations at 0–24 h in Mar–Apr (50t, 46t, 44t,
41t) and 7 of 10 in October; the damped ratio vs persistence at 0 of 10 in Mar–Apr and 1 of 10 in October (41t,
0–24 h). Against raw CAMS, the planned ratio was worse beyond chance at 1 station in Mar–Apr (42t, 48–72 h) and at
1–4 stations in October; the damped ratio at none.

Hourly check on the newest data (issue every hour, Sep 20–Oct 22, 7,608 issues; same-day issues overlap, so not
independent): next-24-h mean MAE raw 6.12, persistence of the last 24 h 3.12, planned ratio 4.77, damped (β 0.45) 2.86.

Onsets (the target day crosses a threshold while the last observed day was below — persistence can never catch these;
Mar–Apr, 0–24 h): ≥ 37.6 — A: 12 onsets, raw caught 9 (6 false alarms on 147 quiet days), damped 6 (2), planned ratio
8 (8); B: 13 onsets, raw 5 (19), damped 5 (3). ≥ 75.1 — 3 (A) and 8 (B) onsets; damped caught 1 and 1. The model's
value is in moving the forecast towards a change, not in its level.

**Verdict: use with correction (provisional).** Never show raw CAMS numbers. Replace the planned ratio (β = 1) by the
damped ratio (β = 0.45 at 0–24 h, 0.55 beyond) — it is the same formula with CAMS's predicted change halved, sits
between the planned method and persistence, and beat both on every test set. Because the damped form was chosen after
the first test run, re-test it as issued on the 2026–27 dry season before calling it validated (archive CAMS forecasts
as issued from now on). Without a measured or estimated 24-h mean at the point, show no PM2.5 outlook number.

**Caveats.** CAMS skill is an upper bound (above). The app's observation will be GISTDA's estimate
(`getPm25byLocation`, its "…Z" times are Bangkok time), not an Air4Thai station; the correction was scored with station
means — **[unverified]** with GISTDA as the input. Air4Thai daily means are preliminary QC; the daily window
(00–23 vs 01–24 h) is not documented in the file (a one-hour shift is immaterial for daily means). October is wet:
only 1 day ≥ 37.6 in the newest set, so it tests the quiet regime only.

## 2. E4 — "Was the quake felt here?" (intensity prediction vs Did You Feel It?)

**Nothing here forecasts earthquakes; nobody can.** The IPE only estimates, after a quake, how strongly it was probably
felt at a place.

**IPE.** Allen, Wald & Worden (2012), "Intensity attenuation for active crustal regions", *J. Seismology* 16:409–433.
Coefficients copied from GEM OpenQuake `openquake/hazardlib/gsim/allen_2012_ipe.py` (raw.githubusercontent.com,
oq-engine HEAD `91db5142ba7905a33c94483fad8f8467b5d92d6f`, read 2026-10-23). Hypocentral form (`AllenEtAl2012Rhypo`):
MMI = 2.085 + 1.428·M − 1.402·ln√(R² + Rm²) [+ 0.078·ln(R/50) if R > 50 km], Rm = −0.209 + 2.042·e^(M−5),
σ = 0.82 + 0.37/(1 + (R/22.9)²). Rupture-distance form (`AllenEtAl2012`): MMI = 3.950 + 0.913·M − 1.107·ln√(Rrup² +
(1 + 0.813·e^(M−5))²). Rrup from the USGS finite-fault model (FFM.geojson, subfaults with ≥ 10 % of peak slip) where one
exists (2025 M7.7 and two Andaman events), else Rrup = Rhyp. The app's `public/js/ipe.js` uses the same hypocentral
coefficients.

**Data.** USGS FDSN query (1,300 km around 15.5°N 100.5°E, M ≥ 5, with a DYFI product, 2000–2026): 238 events. Kept:
13 shallow (≤ 40 km) mainland events with M ≥ 5.5 and ≥ 15 responses — 2025-03-28 M7.7 Mandalay (us7000pn9s) and its
M6.7 aftershock, 2014-05-05 M6.1 Mae Lao/Chiang Rai (usb000qack), 2019-11-20 M6.2 and M5.7 Sainyabuli, 2011-03-24 M6.9
Tarlay (usp000hyfx), 2007 M6.3 Laos, 2012 M6.8 Shwebo, 2018 M6.0 Pyu, 2021 M5.5 Laos, 2022 M5.9 and 2023 M5.7 Keng
Tung, 2023 M5.6 Pyapon — plus 4 Andaman–Sumatra events kept apart (outside the IPE's domain). DYFI `cdi_zip.txt`
(cities, with country) and `cdi_geo.txt` (10-km boxes). Our hypocentral distances match DYFI's own column to a median
1.4 km.

**Results** (residual = DYFI CDI − predicted MMI):

| Set | n | MAE | bias |
|---|---|---|---|
| Thai cities, all crustal events, hypocentral form | 357 (2,841 responses) | 0.96 | +0.00 |
| the same, rupture-distance form | 357 | 0.89 | −0.19 |
| all cities ≥ 3 responses (all countries), hypocentral / rupture | 208 | 0.93 / 0.78 | +0.33 / +0.16 |
| 10-km boxes ≥ 3 responses, hypocentral / rupture | 244 | 0.92 / 0.80 | +0.44 / +0.27 |
| Andaman–Sumatra events, cities (outside domain) | 188 | 0.78 | +0.14 |

By distance (Thai cities, hypocentral form): 0–50 km n = 3, MAE 1.26; 50–100 km 16, 1.27; 100–200 km 46, 0.81;
200–400 km 72, 0.70; 400–700 km 79, 0.99; 700–1,000 km 62, 1.21; 1,000–1,600 km 76, 0.99. Small near-field samples:
only 19 Thai city records lie within 100 km of an epicentre.

**Bangkok's soft clay.** Bangkok-metro records (Bangkok, Nonthaburi, Samut Prakan, Pathum Thani) are under-predicted in
every one of the 12 crustal events that reached them (response-weighted residual +0.16 to +2.01 MMI); on the 10 of
them before 2025, the rest of Thailand averages +0.16. 2025 M7.7: Bangkok city CDI 4.7 from 428 responses at Rhyp 1,040 km /
Rrup 665 km, predicted 3.58 / 3.78 (residual +1.12 / +0.92); other Thai cities at 800–1,300 km: mean residual −0.43.
A Bangkok-metro term fitted on the 10 events before 2025 is **+1.06 MMI**; on the 2025 sequence (2 events, one
sequence — a very small test) the event-level |residual| falls from 1.47 to 0.52 (M7.7: +0.95 → −0.11; M6.7: +1.99 →
+0.94). Long-period shaking of tall buildings on the basin is the likely cause; the IPE has no site term.

**Wording rule** (Thai cities, the reports themselves; DYFI over-represents people who felt the quake, so "felt" shares
are upper bounds). Share of city reports at CDI ≥ III by predicted MMI (with the Bangkok term): < 2.0 → 38 %, 2.0–2.5 →
67 %, 2.5–3.0 → 39 %, 3.0–3.5 → 49 %, 3.5–4.0 → 62 %, 4.0–5.0 → 93 %, ≥ 5.0 → 91 %; CDI ≥ V: 0 % below 2.5, 2–6 % at
2.5–4.0, 16 % at 4.0–5.0, 27 % at ≥ 5.0. With thresholds III/V on the raw IPE, 66 of 227 felt cities (587 responses)
would have been told "probably not felt" and only 3 of 24 cities at CDI ≥ V "felt clearly"; with the Bangkok term and
thresholds 2.5/4.5: 29 felt cities (99 responses) told "probably not", 12 of 24 CDI ≥ V cities told "clearly", and 16
of 51 "clearly" cities reported only CDI < IV.

**Verdict: use**, hypocentral form (computable at once from USGS's origin; the rupture form is better but the finite
fault arrives hours later), **plus +1.06 MMI for Bangkok-metro**. Proposed wording: predicted ≥ 4.5 → "รู้สึกได้ชัด";
2.5–4.5 → "อาจรู้สึกได้"; below 2.5 → "ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง" — never "ไม่รู้สึก",
never a claim or denial of damage (Thai cities reached CDI ≥ VI only 5 times, 4 of them single reports). The thresholds
were chosen on the same reports (in-sample): re-check them after the next felt event.

## 3. E1 — Heat index at 24 and 48 h

**Question.** The app computes the NWS heat index per ensemble member from Open-Meteo `ecmwf_ifs025` and shows the
median, the 10–90 % range and P(HI ≥ 42). How close is that to the heat index stations measure?

**Heat index.** `research/heat_index.py` implements the NWS method (WPC page, read 2026-10-23, quoted in its
docstring) with 6 test vectors covering every branch; it agrees with MetPy 1.7.1's independent implementation to
≤ 0.003 °C (log `heat_index-2026-10-23.log`). Vectors (T °C, RH %, HI °C): (25, 50, 24.86) simple formula;
(30, 60, 32.83); (32, 70, 40.41); (35, 75, 53.33); (38, 10, 34.73) low-RH adjustment; (29, 90, 37.23) high-RH adjustment.

**Forecast archive.** (a) Open-Meteo previous-runs was rate-limited for this IP at 19:45 UTC; it was **not retried**
(the retry window opens 00:10 UTC 24 Oct, after this run ended) — and was not needed: (b) the ensemble API accepts past
dates but returned only nulls for 2026-09-01 (one call); (c) **ECMWF open data, as issued**: the AWS bucket answered
3 of 4 byte-range test requests with HTTP 503 "SlowDown", so the same files were read from its Google Cloud mirror
`storage.googleapis.com/ecmwf-open-data` (every request 206). One global field per byte-range request (0.7–1.4 MB),
values kept at each station's nearest 0.25° point only. HRES (`oper`) 00 UTC runs: Mar–Oct 2024, 2025, 2026 (to 20 Oct),
724 runs; ENS 50–51 members: rain Jun–Oct 2025 every 3rd day (51 runs) and Jun–Oct 2026 every 3rd day (48 runs), heat
15 Mar–15 May 2026 every 2nd day (31 runs). (d) NOMADS was not needed.
**Cross-check with what the app fetches** (`crosscheck_openmeteo_grib.py`, one ensemble call, Bangkok): Open-Meteo's
51 members at 2026-10-24 12 UTC equal the 06 UTC ENS run's GRIB values at the same grid point (13.75°N 100.5°E)
member by member within 0.074 °C (rounding). At 20:35 UTC Open-Meteo still served the 06 UTC run, 14.5 h after its
start (one observation): the app should say which run a number comes from.

**Observations.** NOAA NCEI GHCNh hourly (`…/hourly/access/by-year/<year>/psv/GHCNh_<id>_<year>.psv`); the ISD bucket
has no 2026 files (its 2025 Thai files were last updated on 4 Oct 2025). 18 TMD synoptic stations: **A** Bangkok Metropolis 48455,
Chiang Rai 48304, Lampang 48334, Tha Phra (Khon Kaen) 48384, Si Saket 48409, Rayong 48478, Surat Thani 48555,
Phuket 48564; **B** Ayutthaya 48415, Nan 48333, Mae Sariang 48325, Sukhothai 48372, Nakhon Phanom 48357, Surin 48432,
Suphan Buri 48425, Nakhon Si Thammarat 48554, Kho Hong (Hat Yai) 48571, Sa Kaeo 48440. HI hourly from T and dew point;
daily max over the Bangkok day (≥ 16 hours and ≥ 5 of the 11–17 h hours). Forecast HI day 1 = max of steps 30/33
(13:00 and 16:00 Bangkok tomorrow) of the 00 UTC run, day 2 = steps 54/57. Climatology baseline: station-month mean of
2020–2024, in effect 2024 (GHCNh 2020–2023 give only 37 heat-index days for these ids: almost no dew points).

**Method.** Fit HI_obs = a + b·HI_fc on 2025 (Mar–Oct) at sample A (national), and per station; score 2026 Mar–Oct 20
at A and B. All methods are scored on the same rows. Post-hoc (after the first run showed persistence beating the
linear correction): a blend a + b·HI_fc + c·(observed max of the issue day) and persistence + β·(model's predicted
change), fitted on the same 2025 rows.

**Why raw is low.** At the same hours, the model's afternoon is 1.9 °C too cold and its dew point 1.0 °C too low at the
grid point (8,164 station-hours, 2026), giving a heat index 3.8 °C low; sampling two afternoon hours costs about 1 °C
more against the true daily maximum. Coastal and valley stations are worst (Mae Sariang −8.9, Surat Thani −6.8,
Phuket −5.4 °C at the same hours).

**Results, 2026** (MAE °C, bias, band agreement over 27/33/42/52, and days ≥ 42 °C):

| Set, lead | n | raw | linear national | persistence (issue day's observed max) | blend (post-hoc) |
|---|---|---|---|---|---|
| A day 1 | 1,009 | 5.12 (−5.01), band 51 %, ≥42 POD 0.00 | **2.36** (+0.50), 73 %, POD 0.68 FAR 0.34 | 1.74, 84 %, POD 0.81 FAR 0.20 | 1.62, 85 %, POD 0.81 FAR 0.19 |
| A day 2 | 958 | 5.14 (−5.02) | **2.42** (+0.41), POD 0.65 FAR 0.37 | 1.97 | 1.84 |
| B day 1 (held out) | 1,072 | 4.77 (−4.68), 47 %, POD 0.06 | **2.45** (+0.61), 64 %, POD 0.86 FAR 0.37 | 1.81, 79 % | 1.70 |
| B day 2 (held out) | 1,023 | 4.73 (−4.64), POD 0.06 | **2.40** (+0.50), POD 0.85 FAR 0.37 | 2.12 | 1.94 |
| A+B Mar–May day 1 | 898 | 5.74 (−5.65), POD 0.04 | **2.53** (−0.34), POD 0.79 FAR 0.24 | 1.85, POD 0.87 FAR 0.13 | 1.69 |

Per-station linear fits (sample A only) score 1.86 / 1.90 °C at A, but cannot be used at a point without a station.
ΔMAE linear − raw: −2.76 [90 %: −3.07, −2.42] (A day 1), −2.32 [−2.61, −2.00] (B day 1); linear − persistence:
+0.62 [+0.46, +0.79] (A day 1), +0.28 [+0.11, +0.48] (B day 2); blend − persistence: −0.11 to −0.18. Made worse beyond
chance: linear vs raw at **0 of 18** stations (both leads; Kho Hong +12.5 % at day 1, not beyond chance); raw vs
persistence at 18 of 18; linear vs persistence at 9 (day 1) and 6 (day 2) of 18; blend vs persistence at 2 and 3.

**Ensemble (15 Mar–15 May 2026, 26 runs with observations, 422 station-days, day 1):**

| ENS | median MAE (bias) | 10–90 % range held | P(HI ≥ 42) Brier | BSS vs test base rate | BSS vs 2024 station-month |
|---|---|---|---|---|---|
| raw | 5.92 (−5.83) | 2.1 % | 0.591 | −1.52 | −0.21 |
| corrected per member | 2.41 (−0.50) | 21.6 % | 0.210 | +0.10 | +0.57 |
| corrected + dressed (SD 2.95 °C from 2025) | 2.41 | **81.8 %** | **0.175** | **+0.26** | +0.64 |

264 of the 422 days reached 42 °C. Raw ENS gave P = 0 on 349 days, of which 56 % reached 42. Corrected + dressed
reliability: P < 0.1 → 28 % observed (n = 18), 0.1–0.3 → 34 %, 0.3–0.5 → 32 %, 0.5–0.7 → 55 %, 0.7–0.9 → 92 %, ≥ 0.9 → 100 % (n = 11). The
ensemble's own spread is far too narrow for a point's daily maximum; "dressing" each member with the corrected
forecast's tested error (normal, SD 2.95 °C, measured on 2025 HRES) fixes the range (post-hoc design; SD from 2025 only).

**Verdict: use with correction.** Per member: HI_cal = 10.37 + 0.865·HI_raw (0–48 h windows; 11.69 + 0.826·HI for
48–72 h), then probabilities and the 10–90 % range from the members dressed with SD 2.95 °C (`calibration.json →
heat_index`). Where an observed maximum exists for the place (a TMD station), "today's observed maximum" is still
0.3–0.7 °C better at days 1–2, and a blend with it better still; the app has no such observation at most points.
**Caveats:** fitted at 8 stations; the 72-h window is untested (fit at 54–57 h); applies to `ecmwf_ifs025` only — the
deterministic fallback (`best_match`) is **not tested**; the TMD's own heat-index formula is [unverified]
(Hazard-huntz KNOWLEDGE §32.8); ENS heat covers one hot season (2026), every 2nd day.

## 4. E2 — Heavy rain at 24 and 48 h (and gusts)

**Data.** Rain day 07:00–07:00 Bangkok (TMD; bands 0.1–10.0 light, 10.1–35.0 moderate, 35.1–90.0 heavy, ≥ 90.1 very
heavy, confirmed by the parallel researcher, `docs/research/thresholds-2026-10-23.md` §4.1). Observed 24-h rain = the
00 UTC report's `precipitation_24_hour`. A SYNOP with iR = 3 and no 24-h group counts as dry. **In 2026 the stations
report in BUFR**, whose 00 UTC report often lacks the 24-h total on rainy days (e.g. Phuket: 42 days May–Oct with
> 1 mm in hourly amounts but no 24-h total); there the 24 one-hour amounts are summed when ≥ 20 exist, otherwise the
day is missing. 2024–2025 are therefore the reliable test (4,243 and 4,210 resolved station-days Mar–Oct); 2026 keeps
2,002 of 4,104 and under-represents dry days (POD indicative; FAR and Brier not comparable). Forecast: HRES 00 UTC,
steps 0–24 (optimistic: the run is published ~6–7 h after its start), 24–48 (day 1, as issued), 48–72 (day 2).
Climatology: station-month frequency 2020–2024. Fit/choose: 2024 at A; score: 2025 at A and B.

**Results, 2025 (n ≈ 1,900 station-days at A, 2,300 at B per lead; events ≥ 35.1: 84 at A, 71 at B):**

| Lead | HRES ≥ 35.1 POD / FAR / CSI (A; B) | frequency bias | tuned threshold (chosen on 2024) | Brier: HRES yes/no vs climatology |
|---|---|---|---|---|
| 24–48 h | 0.04 / 0.84 / 0.03; 0.10 / 0.77 / 0.07 | 0.23; 0.42 | ≥ 15 mm: POD 0.38 FAR 0.88 CSI 0.10; 0.45 / 0.91 / 0.08 | 0.051 vs 0.042; 0.038 vs 0.030 |
| 48–72 h | 0.08 / 0.70 / 0.07; 0.13 / 0.76 / 0.09 | 0.27; 0.54 | ≥ 17.5 mm: CSI 0.12; 0.09 | 0.049 vs 0.042; 0.040 vs 0.030 |

≥ 90.1 mm (4 events at A, 11 at B in 2025): raw HRES caught 0 and 1. Mean amounts: HRES +0.4 to +2.5 mm/day too wet
on average while missing the heavy days. The tuned threshold raises CSI at A (0.03 → 0.10 at 24–48 h) but hardly at B
(0.07 → 0.08), forecasts "heavy" 2.5–5 times as often as it happens, and its Brier is 3–5 times climatology's — **no
correction is recommended**. The newest season (2026, partial) gives the same picture: ≥ 35.1 POD 0.12 at 24–48 h
(118 events).

**ENS probability P(≥ 35.1)** (Jun–Oct, every 3rd day; 2025: 885 station-days, 33 events at 24–48 h): Brier skill vs
climatology +0.02 (0–24 h), +0.05 (24–48 h), −0.05 (48–72 h); 2026 (partial obs, 318–416 station-days): +0.12, −0.08,
+0.06. As a warning at P ≥ 10 %: POD 0.20–0.44, FAR 0.69–0.87. Reliability (2025, 24–48 h): P = 0 → 2.1 % observed
(628 days), 0–10 % → 5.1 %, 10–20 % → 17 %, 20–40 % → 10 % (n = 10), 40–60 % → 17 % (n = 6), ≥ 60 % → 75 % (n = 4). The
10–90 % range of the members held 27–42 % of observed amounts.

**Verdict: don't show a point heavy-rain yes/no or amount; show the ENS chance only as a coarse word** (below 10 %
"ต่ำ", 10–40 % "มีโอกาส", 40 % and more "โอกาสสูง" — the top word rests on 4–10 cases per year), lead with the TMD's own
warning, and never let "low" read as safe (heavy rain fell on 2–6 % of the days the ensemble gave 0 %). The app's
P(rain_24h ≥ 35 mm) as a number is not supported by these tests. **Caveats:** point verification of a 0.25° grid value is
harsh (rain is patchy); a neighbourhood or area chance ("somewhere within 25 km") was not tested and may score better.

**Gusts: not validated.** The GHCNh records of these 18 stations carry no gust values for 2025–2026; P(gust ≥ 40 km/h)
should be labelled "ยังไม่ได้ตรวจสอบความแม่นยำ".

## 5. Flood — FloodWatch's own validated skill (not modelled here)

From FloodWatch `docs/MODELS.md` (v0.83.0, summary parts only, read 2026-10-23); the app should link to FloodWatch:
- One forecaster per gauge and horizon, chosen by a 45-day rolling backtest; a model is served only if it beats "no
  change" (persistence) by more than 10 % in RMSE, otherwise "no change" is served (§5). On 2026-10-04 "no change" served
  563 of ~994 gauges at 24 h (§5b). The public rows show 24/48/72 h (no 12 h row).
- **As issued, 5–12 Oct 2026** (§12b, re-run 2026-10-12, 1,018 gauges, 67,016 forecasts at 24 h): the issued median's
  error vs "no change" −20.9 % (6 h), −9.7 % (12 h), −6.9 % (24 h), −3.0 % (48 h), −3.5 % (72 h); where a model was
  served −30.5 / −16.0 / −11.4 / −6.0 / −8.5 %; the 90 % range held 90.2–92.2 % and the 50 % range 45.9–56.2 %. On the
  260 Bangkok-area gauges every generation forecast: −15.1 / −4.1 / −4.7 % at 6/12/24 h but +4.2 % (48 h) and +8.2 % (72 h)
  — worse than "no change".
- 22 Oct check (§5d): the 90 % band held 91.2 % of 12,051 cases at 24 h pooled; below 70 % at 78 of 913 gauges where a
  true 90 % band leaves 29 by chance (open, Q107).
- FloodWatch measures at gauges, not at homes; beyond a day its issued gains are small (§12b "What did not, yet").

## 6. Notes on data and budget

- Open-Meteo: 22 calls, 141 weighted (ledger `research/logs/openmeteo-calls-2026-10-23.log`; cached responses are
  not re-spent on re-runs). No limit message was received. Previous-runs was not called (see §3).
- ECMWF open data: about 22 GB of single-field byte ranges (~29,000 fields) from the Google Cloud mirror, 3–6 parallel
  requests; only station point values are kept (scratchpad CSVs). The ENS "-ef" files of Oct 2026 hold 50 perturbed members and no
  control; 2025 files hold 51.
- NCEI GHCNh: 126 station-year files (2020–2026), 0.4 GB, sequential. Air4Thai: about 15 requests in all (station
  lists, the webV3 page and its scripts, history calls) and 3 yearly spreadsheets.
- USGS: 1 FDSN query, 17 event details, 34 DYFI files, 3 finite-fault files.
- Every request carried `disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)`.

## 7. What the app should say about forecast confidence

- **Show measurements first.** For PM2.5 and heat, a measured value at or near the point is the strongest "forecast" for
  tomorrow; the models mostly add the direction of change.
- **Heat:** show the corrected median with its dressed 10–90 % range ("ราว X–Y °C"), the level word, and the chance of อันตราย (≥ 42 °C) as
  "x ใน 10" from the dressed members. Tested typical miss ±2.4 °C at days 1–2; the level word right on about 7 days in 10
  (band agreement 64–73 %). Confidence: "ปานกลาง" for days 1–2; untested beyond 57 h — say so for day 3.
- **PM2.5:** day 1 from the damped ratio, typical miss 4–7 µg/m³ in the burning season and the colour right on about
  3 days in 4 (band agreement 78 % at day 1, 63–71 % at days 2–3); days 2–3 miss 6–11 µg/m³ — show the colour with "อาจเปลี่ยน" rather than a
  number. Never a CAMS number without a measured or estimated value to correct it.
- **Rain:** only "โอกาสฝนหนัก ต่ำ / มีโอกาส / สูง" in the area, the TMD's warning first, and "ฝนหนักเกิดได้แม้วันที่คาดว่า
  โอกาสต่ำ". No mm amounts, no yes/no at the house.
- **Gusts:** "ยังไม่ได้ตรวจสอบความแม่นยำ" beside any gust chance.
- **Earthquakes:** "อาจรู้สึกได้" / "รู้สึกได้ชัด" from the IPE + Bangkok term; nothing forecasts earthquakes; never a
  word on damage.
- **Rivers:** FloodWatch's words and ranges; its ranges held 90–92 % as issued.
- **Time:** say which model run a number comes from; Open-Meteo served a run 14.5 h old at 20:35 UTC on 23 Oct.
- **Ranges and chances, never countdowns**, and no "ปลอดภัย" from a model.

## 8. Not tested, and why

- Open-Meteo previous-runs (a): rate-limited at 19:45 UTC; replaced by the as-issued ECMWF archive (c).
- Wind gusts: no gust observations in the station records used.
- The `best_match` deterministic fallback: not fetched; the heat correction must not be applied to it untested.
- Heat at 72 h; ENS heat outside Mar–May 2026; ENS rain at every day (every 3rd day was sampled).
- PM2.5 with GISTDA's estimate as the correcting observation; CAMS as issued at 24–72 h (only stitched history exists
  on Open-Meteo); the 2026–27 dry season (in the future) as the confirmation of the post-hoc damped ratio.
- Rain as an area/neighbourhood chance; rain in 2026 with complete dry-day observations (BUFR gap).
- Earthquakes: the near field (< 100 km: 19 Thai city records) and any event after 2025.

## 9. Reproduce

```
python3 research/heat_index.py                       # self-test, 6 vectors (+ MetPy check)
python3 research/e3_pm25.py                           # E3 (Air4Thai + CAMS; needs the CA bundle in the scratchpad)
python3 research/probe_air4thai_history.py            # how far back Air4Thai's hourly history goes
python3 research/e4_quake_ipe.py                      # E4 (USGS)
python3 research/ecmwf_open.py oper 2024-03-01 2024-10-31        # and 2025-03-01 2025-10-31, 2026-03-01 2026-10-20
python3 research/ecmwf_open.py enfo-rain 2025-06-01 2025-10-31 3 # and 2026-06-01 2026-10-20 3
python3 research/ecmwf_open.py enfo-heat 2026-03-15 2026-05-15 2
python3 research/e1e2_weather.py                      # E1 + E2 (needs the GHCNh files in the scratchpad)
python3 research/crosscheck_openmeteo_grib.py         # Open-Meteo ensemble vs GRIB, 1 call
python3 research/build_calibration.py                 # research/out/calibration.json
```
Downloads and caches live in the session scratchpad (`DN_SCRATCH` overrides the path); `research/data/` holds the small
derived tables (`e3_pm25_daily.csv`, `e4_dyfi_residuals.csv`, `e1e2_daily.csv`).

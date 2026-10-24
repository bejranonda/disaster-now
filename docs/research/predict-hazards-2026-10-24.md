# Can we forecast hazards at a point? Wildfire, heavy rain, flash flood and landslide, river flood, storms, drought (24 Oct 2026)

A research note for ภัยรอบบ้าน · Thai Risk. The owner asked whether the page can forecast, or give a risk for, disasters near a specific point by learning from data, history, existing forecasts and theories from around the world.

- **Scope:** wildfire, heavy rain, flash flood and landslide, river flood, tropical storms and drought. Heat, earthquakes and air pollution are other researchers' work.
- **Not here:** the Hat Yai flood of late 2025 has its own case study (`docs/research/hatyai-flood-2025-hindcast.md`). The southern stations of Experiment B include late 2025 as ordinary days in the sample; no event-specific result was made.

**Rules followed** (GUIDELINES §1, §7):
- Choose on an earlier period, score on a later one, confirm on disjoint stations and years.
- Always compare with climatology and persistence.
- Anything chosen after a first look is marked **post-hoc**.
- Every number below comes from a script in `research/hz_*.py`, with its log in `research/logs/hz_*-2026-10-24.log`.
- Nothing on the page was changed.
- **Sources** are tagged PR (peer-reviewed), OD (operational documentation), N (news) or O (other); all were read 2026-10-24. "[unverified]" marks what was not confirmed.

## 0. Verdicts at a glance

| Candidate | What was found | Verdict |
|---|---|---|
| **Fire-weather line** ("สภาพอากาศเอื้อต่อไฟป่า") | With perfect weather, FWI beats the calendar clearly: Brier skill **+0.19** on held-out points and years, +0.15–0.16 on dry days only. Yesterday's hotspot count beats it by far (**+0.46–0.48**), and FWI adds little on top (+0.015). The FWI the page could read, GWIS's, runs about 35 % lower than the one tested (mean 16.3 vs 25.1, r 0.72), so the tested thresholds don't transfer. | **Wait.** Archive GWIS (or the Royal Forest Department's own rating) from December, and test it in the 2027 season |
| **Neighbourhood heavy-rain chance** ("within 25 km") | Smoothing the ensemble chance over 25–60 km improves Brier at the point a little (+0.01 to +0.02 skill, significant). The raw "largest chance within 25 km" over-forecasts the point and was worse on sample A. Every version stays at Brier skill ≤ 0.09. The "somewhere within 25 km" event itself can't be verified without a dense gauge network. | **Don't ship.** Keep the point words, which held on 76 stations |
| **The page's three rain words** (existing) | Day 1, 2025: "ต่ำ" was followed by heavy rain on 2.9 % of days, "มีโอกาส" on 14–19 %, "สูง" on 37–43 %. 57–62 % of heavy-rain days fell under "ต่ำ". | **Keep.** The numbers can go into MODELS §3 |
| **GloFAS line** (river discharge) | Peaks fell on the reported flood days at Chiang Rai, Mae Sai and Chiang Mai in 2024. But the API returned a side cell at 4 of 8 gauges, magnitudes are uncalibrated, and the licence says it "does not constitute in any way a flood warning". | **Don't ship here.** Rivers are FloodWatch's: it should test GloFAS (§7) |
| **Drought line** | No open, keyless, official point product was reachable. GISTDA's DRI needs a key, ONWR's API wasn't reachable, and the 1° monthly GDO SPI point query failed. | **Wait** (GISTDA key, ONWR) |
| **Landslide** (DMR's 100 mm rule, with the ensemble's P > 100 mm) | P > 100 mm ≥ 0.2 at day 1 came on 15 of 39,642 station-days, and 10 of those had ≥ 100 mm. That is precise but rare: those 10 are 10 of the 156 days with ≥ 100 mm. P ≥ 0.5 came once, with no hit. | **Keep as is.** Thai antecedent-rain thresholds need measured rain history (wait) |
| **Flash flood** (HII's list) | No archive of HII's lists exists, so it can't be validated. HII publishes no class edges or listing rule. | **Keep quoting HII; start archiving the list** |
| **Storms** | JMA's official 2024 track errors: 71 / 106 / 152 / 245 / 424 km at 24–120 h. Nothing new to compute. | **Nothing new** (JTWC for the Bay of Bengal stays on the roadmap) |
| **Quoting more agency products** | ONWR's numbered notices (ประกาศ สทนช.) and RFD's TFDRS (`fdrs.forest.go.th`) are official, but neither has a stated licence nor a documented open feed. | **Wait for the owner to ask** (§6) |

## 1. The world: open forecast and risk products that cover Thailand

From a literature and product review (about 70 reads, list at the end) and this note's own probes. "Thai validation" means a published skill number for Thailand or mainland SE Asia.

| Product (who) | Status | Open without a key? | Licence for a public page | Thai / regional validation | Page or collector use |
|---|---|---|---|---|---|
| **GloFAS v4** (Copernicus EMS; ECMWF + JRC), 0.05°, ensemble to 30 days, daily [R4] | operational since 26 Jul 2023 | through Open-Meteo's Flood API, yes; directly from EWDS (login offered, requirement not confirmed) | **CEMS-FLOODS licence**: free; republishing and adapting allowed with "Generated using Copernicus Emergency Management Service information [Year]"; "does not constitute in any way a flood warning … only national/regional institutions are authorized" [R3, read and checked]. Open-Meteo's API: CC BY 4.0, non-commercial [R2] | v4 global: median KGE′ 0.70 at 1,995 gauges, worst "in catchments with strongly regulated rivers" [R6]. The ERA5-driven predecessor was poor (KGE skill < 0) in "notable patches in … **Thailand**" (Harrigan et al. 2020, checked) [R7]. **No Thai or Mekong evaluation found** | FloodWatch, not this page (§4, §7) |
| **GWIS / EFFIS fire danger** (JRC, CEMS) | operational | WMS point query, keyless, CORS `*` | EFFIS's EU-owned content CC BY 4.0, third-party content excluded [R12]. The queryable `nasa_geos5` layer is most likely NASA GISS's GFWED (GEOS-5 forecasts, "7-day"/"8-day"), whose page states no licence [R13, read] [unverified that GWIS serves GFWED] | GEFF (ECMWF) in SE Asia: "predictability below 0.2" beyond 10 days (Di Giuseppe et al. 2020) [R15] | the page could read it; **not validated for the page** (§2) |
| **ASEAN FDRS** (Malaysian Meteorological Department since Sep 2003; Canadian codes) [R18] | operational | maps | ASMC's maps "solely for displaying" [R19] | Indonesia/Malaysia: FFMC ≥ 83 covers 13 % of the year and 73 % of fires (de Groot et al. 2007) [R20] | class edges as context; red is FFMC > 82, FWI > 13 [R18, read]. In the north these are red on 91–94 % of the season's days (§2) |
| **Thailand's TFDRS "TFWI"** (Royal Forest Department, Kasetsart WFSRU; HII WRF-ROMS input) [R22, R25] | operational | web portal; its download link answered 404 | none stated | FFMC/FWI calibrated to 4 levels against MODIS fires; no skill numbers in the abstract [R22] | **the agency's own word**: ask RFD (§6) |
| **ECMWF EFI / Shift of Tails** | operational | **no**: not in the free open-data feed [R27] | the whole real-time catalogue has been CC BY 4.0 since 1 Oct 2025, but "delivery … may involve service charges" [R26] | none found for Thailand | not usable now |
| **HII flash-flood list and FFPI** [R29] | operational, daily | yes (`fews2.hii.or.th`, CORS `*`) | not stated | FFPI + 5-day antecedent rain + WRF-ROMS; **no class edges, listing rule or validation published**. A Thai 8-factor FFPI (Wang basin) was validated only qualitatively [R30] | already quoted on the flood tile |
| **DMR landslide warnings** (100 mm in 24 h; the "AP Model") | operational | ArcGIS layers keyless (23 Oct record) | not stated | AP Model numbers unpublished. Peer-reviewed Thai thresholds: north, antecedent 25-day rain 140 mm with an event–duration curve (Chinkulkijniwat et al. 2022) [R33]; south, CR20 100 mm (Salee et al. 2022) [R34]; south, event–duration curves by susceptibility class, AUC 0.71–1.00 (Salee et al. 2022) [R35] | already used (the 100 mm rule) |
| **NASA LHASA v2** (and LHASA-Mekong, SERVIR/ADPC) | research, near-real-time | GeoTIFFs keyless (23 Oct record) | `LICENSE.pdf` names no licence; "best-effort … frequent server downtime" [R45] | v2 global true-positive rate 93 % [R41]. LHASA-Mekong AUC > 0.95 in Myanmar, Laos and Vietnam, **no Thai numbers** [R43] | not now |
| **ONWR (สทนช.)** numbered watch notices | official | notices as documents; the per-area API failed (DNS); tiles undocumented | "License not specified" [R47] | — | quote the notice when ONWR allows (§6) |
| **Storms:** TMD (official), JMA RSMC Tokyo (South China Sea, NW Pacific), RSMC New Delhi (Bay of Bengal), JTWC, GDACS [R48] | operational | JMA, GDACS, JTWC keyless | JMA Public Data License 1.0. GDACS "not meant to substitute … official" alerts [R51]. JTWC: for US government use [unverified, terms page 403] | JMA 2024 mean track error 71 / 106 / 152 / 245 / 424 km at 24 / 48 / 72 / 96 / 120 h [R49, read] | already read (TMD, JMA, GDACS) |
| **Drought:** Copernicus GDO SPI (GPCC, monthly, 1°) [R52]; SPEI Global Drought Monitor [R53]; GISTDA DRI; ONWR drought | operational | GDO yes (its point query failed on 23 Oct); SPEI: "the most recent four weeks are restricted to Licensed Users"; GISTDA keyed | GDO CC BY 4.0; SPEI ODbL / DbCL / CC BY 3.0 | SPEI-1 tracks rain-fed rice yield in the Mun basin, 1984–2013 (Prabnakorn et al. 2018) [R55]; TMD's own SPI maps **not confirmed** | wait (§6) |
| **ThinkHazard** (GFDRR) [R56] | static | yes | levels CC BY, text CC BY-SA; data "published for the last time on Tue Jun 30 15:57:03 2020" | — | place profile only (ROADMAP) |
| **Open-Meteo previous-runs API** (this note's probe, `research/hz_prevruns_probe.py`) | operational | yes | CC BY 4.0, non-commercial | — | deterministic models only, leads 1–7 days ("_previous_dayN" = predicted N × 24 h before). **`ecmwf_ifs025`:** empty for Dec 2023 and Jan 2024, full in Jun 2024 and Jun 2025. **`jma_gsm`:** full in Jul 2019. **No ECMWF ensemble members**; the only ensemble listed is NCEP HGEFS's mean. Not usable for the page's ensemble chance |

**Neighbourhood verification, the methods used in §3:**
- **Neighbourhood probability:** Theis, Hense & Damrath 2005, *Meteorol. Appl.* 12, 257–268, doi:10.1017/S1350482705001763.
- **Neighbourhood ensemble probabilities:** Schwartz & Sobash 2017, *Mon. Wea. Rev.* 145, 3397–3418, doi:10.1175/MWR-D-16-0400.1.
- **Fuzzy verification:** Ebert 2008, *Meteorol. Appl.* 15, 51–64, doi:10.1002/met.25.
- **The fractions skill score:** Roberts & Lean 2008, *Mon. Wea. Rev.* 136, 78–97, doi:10.1175/2007MWR2123.1.
- **Spatial techniques for ensembles:** Ben Bouallègue & Theis 2014, *Meteorol. Appl.* 21, 922–929, doi:10.1002/met.1435.
- **No study of ECMWF ensemble heavy-rain skill in Thailand was found.** Met Office convection-permitting ensembles over maritime SE Asia were skilful for 3-h rain only at scales above 200 km on day 1, and under-spread (Ferrett et al. 2021, *Wea. Forecasting* 36, 1199–1217, doi:10.1175/WAF-D-20-0216.1).

## 2. Experiment A: fire weather and satellite hotspots in the north

**Question.** Does a fire-weather index predict days with many satellite hotspots near a point better than the calendar (climatology) and yesterday's count (persistence)?

**Data and method** (`research/hz_fire.py`, log `hz_fire-2026-10-24.log`, results `research/out/hz_fire.json`, daily table `research/data/hz_fire_daily.csv.gz`):
- **Index:** the full Canadian Fire Weather Index (FWI) System (FFMC, DMC, DC, ISI, BUI, FWI; Van Wagner 1987, with the latitude day-length tables of Wang, Anderson & Suddaby 2015), coded in `research/hz_fwi.py`.
  - It passes the Van Wagner & Pickett test day: FFMC 87.69, DMC 8.55, DC 19.01, ISI 10.85, BUI 8.49, FWI 10.10.
  - Inputs are ERA5 noon weather (12:00 Bangkok: temperature, humidity, 10 m wind, and rain in the 24 h to noon) from Open-Meteo's historical API.
  - The codes start on 1 December each season from the standard start values.
- **Points:** 10 northern towns, each 25 km circle inside Thailand and at least 50 km from the next.
  - Sample A (choose): Chiang Mai, Lampang, Phayao, Tak, Hot.
  - Sample B (confirm): Chiang Rai, Nan, Phrae, Pai, Uttaradit.
- **Hotspots:** NASA FIRMS VIIRS S-NPP 375 m, from the yearly country archive for Thailand.
  - It **downloads without a key**: 2019–2025 answered 200, from 4.3 MB (2022) to 18.5 MB (2019). 2026 is not there yet (404).
  - Type 0 detections only (presumed vegetation fire), low confidence left out as the page's collector does: 933,846 of 1,052,638 rows were kept.
  - Counted within 25 km per Bangkok day. S-NPP only, so the years stay comparable.
- **Event:** a "high-hotspot day", 10 or more detections within 25 km. It was fixed before any result was seen; 1 and 30 serve as sensitivity. Days scored: 15 Jan – 30 Apr, 6,380 point-days in the 2020–2025 seasons.
- **Protocol:**
  - Fit on A in 2020–2022 (1,595 days, 292 events).
  - Score on A in 2023–2025 (later years) and on B in 2023–2025 (disjoint points and years).
  - Climatology is each point's own frequency by day of season in 2020–2022 (±15 days).
  - Persistence is a logistic fit on log(1 + yesterday's count).
  - Differences are tested with a moving-block bootstrap (7-day blocks, 2,000 draws).
- **Caveats that matter:**
  - ERA5 is analysed weather, so this is a **perfect-forecast** FWI, an upper bound for any forecast FWI.
  - Clouds hide fires from the satellite on wet days, which flatters a rain-sensitive index. A dry-days-only check is included.

**What the seasons looked like** (all 10 points, scored days):

| Season | Mean hotspots within 25 km a day | Days with ≥ 10 | Mean FWI |
|---|---|---|---|
| 2020 | 10.9 | 0.33 | 36.1 |
| 2021 | 5.4 | 0.17 | 23.2 |
| 2022 | 1.9 | 0.06 | 14.6 |
| 2023 | 10.7 | 0.29 | 30.7 |
| 2024 | 6.9 | 0.21 | 30.1 |
| 2025 | 4.0 | 0.11 | 24.7 |

Season totals follow season-mean FWI: Spearman per point over the 6 seasons from +0.43 (Tak) to +1.00 (Hot), median +0.77.

**Results, event ≥ 10 hotspots within 25 km** (Brier skill score against climatology; higher is better):

| Model | A, 2023–25 (n 1,595, 326 events) | B, 2023–25 (n 1,595, 325 events) |
|---|---|---|
| climatology (day of season) | 0 (AUC 0.63) | 0 (AUC 0.70) |
| FWI + climatology | **+0.186** (AUC 0.79) | **+0.188** (AUC 0.82) |
| persistence (yesterday's count) | **+0.455** (AUC 0.91) | **+0.478** (AUC 0.93) |
| persistence + climatology | +0.447 | +0.475 |
| persistence + climatology + FWI | +0.462 | +0.491 |
| FWI's gain over persistence + climatology (Brier, 95 % CI) | −0.0023 (−0.0050, +0.0007) | −0.0024 (−0.0044, −0.0002) |

- **FWI clearly beats the calendar.**
  - Brier −0.030 (A) and −0.028 (B), both intervals below zero.
  - Within each month the event rate climbs with FWI. In March, 8 % of days in the lowest third of FWI were high-hotspot days, 26 % in the middle third and 54 % in the top third (all points and seasons).
- **On dry days only** (under 0.5 mm in the 24 h to noon, that day and the day before), FWI still beats climatology.
  - Brier skill +0.148 (A, n 1,297) and +0.162 (B, n 1,274).
  - The event rate was 9 % in the lowest FWI third and 41 % in the top third (A); 4 % and 50 % (B).
- **Yesterday's hotspots beat any weather index by far, and the page already shows them.**
  - FWI adds little on top: +0.015 Brier skill.
  - The interval excludes zero on B but not on A. With the cloud check it is not significant on either.
- **FWI matters more as the known count gets older** (post-hoc in timing; nothing was chosen on test data). With the latest count 3 days old, Brier skill rises from +0.165 to +0.238 on A (significant) and from +0.252 to +0.285 on B (not significant).
- **As a yes/no line:**
  - FWI ≥ 29 (chosen on the training set by CSI) says yes on about half the days. On those days 33 % (A) and 36 % (B) were high-hotspot days, against 7 % and 4 % on the others.
  - FWI ≥ 38 (EFFIS's "very high" edge, an external cut point) says yes on 16–18 % of days, with 42 % (A) and 55 % (B) high-hotspot days against 17 % and 13 %.
  - FWI < 21.3 (below EFFIS's "high") came before a high-hotspot day only 1.7–1.8 % of the time. That is low, but never "safe".
  - ASEAN FDRS's red classes (FFMC > 82, FWI > 13) are red on 91–94 % of these days in the north, so as a line they would be on almost every day of the season.
- **Reliability** of persistence + climatology + FWI is good on B: forecasts of 0.20–0.40 verified 0.30, and 0.60–1.00 verified 0.86.

**Can the page say "สภาพอากาศเอื้อต่อไฟป่า" from a forecast FWI? Not yet**, because the FWI the page can actually read is not the one tested.
- **The six GWIS values are confirmed** (`research/hz_gwis_probe.py`).
  - GWIS's point layer `nasa_geos5.query` returns FWI, FFMC, DMC, DC, ISI, BUI.
  - The proof is algebraic: on 6 dry-season days at 2 points, BUI recomputed from DMC and DC, and FWI recomputed from ISI and BUI, equal the returned values to 2 decimals. This settles the [unverified] order in sources-2026-10-23 gap 9.
  - The layer answers from today to **+6 days** (24 → 30 Oct 2026) and back to at least 15 Aug 2025. 15 Mar 2025 and 15 Mar 2024 gave no result.
- **GWIS reads lower than the FWI tested.** Over 1 Jan – 30 Apr 2026 at Chiang Mai and Nan (240 days, `research/hz_gwis_vs_era5.py`):
  - The mean was 16.3 against ERA5's 25.1, with r = 0.72 (Chiang Mai 0.66, Nan 0.78).
  - GWIS never reached 38 (ERA5 did on 16 % of days) and reached 29 on 4 % of days (ERA5 35 %).
  - By rank, ERA5's 29 corresponds to GWIS 18.6 and ERA5's 38 to GWIS 24.1. That mapping rests on 2 points and 1 season.
  - What GWIS keeps for a past date (analysis or the day-1 forecast) is not documented [unverified].
- So the tested thresholds can't be put on GWIS numbers, GWIS's forecast skill at 1–6 days is untested, and its licence for this layer is unclear (§1).

## 3. Experiment B: heavy rain at the point vs "somewhere within 25 km"

**Question.** Does a neighbourhood chance ("≥ 35 mm somewhere within 25 km") deserve the page's words better than the point chance the page shows?

**Data and method** (`research/hz_rain.py`, log `hz_rain-2026-10-24.log`, results `research/out/hz_rain.json`, observations `research/data/hz_rain_obs.csv.gz`):

- **Observations.**
  - NOAA NCEI GHCNh hourly records of **76 TMD synoptic stations**, 2024–2026. The files had already been downloaded by this session's heat researcher and were reused read-only.
  - 24-h rain for the 07–07 Bangkok day, exactly as in the earlier study: the 00 UTC report's 24-h total; a SYNOP with iR = 3 counts as dry; otherwise ≥ 20 one-hour amounts are summed; otherwise the day is missing.
  - Station-days, Apr–Dec: 19,903 in 2024 and 19,956 in 2025, with heavy rain (≥ 35.1 mm) on 4.5 % and 4.4 % of them.
  - 2026 (6,554 station-days, 7.2 % heavy) is BUFR-gappy, with dry days under-represented, so it is indicative only.
  - **What GHCN-Daily offered instead** (`research/hz_ghcnd_check.py`): 45 of 54 Thai stations have rain into 2024–2025, all from GSOD (source flag S). Chiang Mai had rain values on 204 of 356 days in 2024, 122 of 236 in 2025, and none after 24 Aug 2025. GHCN-Daily was not used.
- **Forecasts as issued.** ECMWF open data from the Google Cloud mirror, 00 UTC runs, kept as a 0.25° box over Thailand (`research/hz_fetch_ecmwf.py`).
  - **HRES rain:** every 3rd day, Apr–Dec 2024 and 2025, 184 runs.
  - **ENS probabilities** P(> 25 mm), P(> 50 mm) and P(> 100 mm) in 24 h (the open-data "ep" products): every day, Apr–Dec 2024 and 2025 plus Apr – 20 Oct 2026, 752 runs. The index for 2 Oct 2025 was empty.
  - Day 0 = steps 0–24 (optimistic), day 1 = 24–48 (as issued), day 2 = 48–72.
  - **Geometry check:** the HRES day-1 value at the nearest grid point equals the earlier study's on 2,471 station-days (median difference 0.024 mm).
- **Point and neighbourhood.**
  - The point is the nearest grid point, what the page's ensemble call returns: median 11.7 km from the station.
  - The neighbourhood is the grid points within 25 km (median 2 points, range 1–4), 40 km (7) and 60 km (15).
  - **HRES:** "somewhere ≥ 35.1 mm" = the neighbourhood maximum; a probability = the fraction of points ≥ 35.1 mm.
  - **ENS:** the largest member chance in the neighbourhood (a lower bound of "somewhere within r") and the neighbourhood mean (the smoothed chance of Theis et al. 2005).
  - Open data has no P(> 35 mm), so **P35~ = 0.6 · P25 + 0.4 · P50** stands in for the page's chance.
    - Its point skill at day 1 (+0.044 A, +0.064 B, below) is close to the earlier study's member-based +0.05.
    - A harsher check rebuilt P50 from P25 and P100: it erred by 0.215 on average on days with P50 ≥ 0.1, and its Brier was 4 % worse. So read P35~ above 0.4 with care.
- **The event is observed at the gauge.** No dense open network exists, and ThaiWater is not called. So this tests whether a neighbourhood forecast predicts rain **at the point** better; the event "somewhere within 25 km" cannot be verified with these data.
- **Protocol.**
  - Choose radius and statistic on 2024 at sample A (38 stations, every other sorted id).
  - Score on 2025 at A; confirm on 2025 at B (the other 38).
  - Climatology is the station-month frequency in the other year, shrunk to the all-station month frequency (60 pseudo-days).
  - Persistence is the last complete rain day when the run is published.
  - Paired moving-block bootstrap (7-day blocks within stations, 2,000 draws).

**HRES yes/no, ≥ 35.1 mm** (2025; A n ≈ 3,384, 159 events; B n ≈ 3,310, 162 events):

| Day 1 (24–48 h) | POD A / B | FAR A / B | CSI A / B | frequency bias A / B |
|---|---|---|---|---|
| at the point | 0.11 / 0.14 | 0.67 / 0.59 | 0.092 / 0.113 | 0.35 / 0.33 |
| somewhere within 25 km | 0.18 / 0.18 | 0.73 / 0.67 | 0.121 / 0.132 | 0.69 / 0.54 |
| within 40 km | 0.24 / 0.25 | 0.77 / 0.72 | 0.134 / 0.152 | 1.02 / 0.87 |
| within 60 km | 0.28 / 0.33 | 0.81 / 0.77 | 0.128 / 0.155 | 1.45 / 1.44 |
| persistence | — | — | 0.048 / 0.068 | — |

- **Day 2 is weaker:** CSI 0.036 / 0.070 at the point, 0.056 / 0.103 within 25 km, 0.087 / 0.138 within 40 km.
- **As a probability, HRES never beat climatology.** The share of neighbourhood points ≥ 35.1 mm scored Brier skill −0.093 / −0.091 (25 km) and −0.017 / −0.003 (60 km) at day 1.
- **The 2024 choice failed in 2025** (post-hoc note): the 60 km fraction, +0.045 in 2024, scored −0.017 / −0.003 in 2025.
- **Conclusion for HRES:** the neighbourhood raises POD and CSI a little, but a yes/no amount remains a poor point forecast, as the earlier study found.

**ENS chance of heavy rain, P35~** (Brier skill vs climatology; 2025, A n 9,991, 425 events; B n 9,819, 454 events):

| Day 1 (24–48 h) | A | B | Change in Brier vs the point, 95 % CI (A; B) |
|---|---|---|---|
| at the point (what the page shows) | +0.044 | +0.064 | — |
| mean within 25 km (smoothed) | +0.053 | +0.079 | −0.00038 (−0.00067, −0.00011); −0.00067 (−0.00099, −0.00036) |
| mean within 60 km (chosen on 2024 A) | +0.058 | +0.082 | — |
| largest within 25 km | +0.019 | +0.074 | **+0.00102 (+0.00043, +0.00163)**; −0.00045 (−0.00100, +0.00005) |
| largest within 40 / 60 km | −0.045 / −0.119 | +0.048 / −0.032 | — |
| recalibrated on 2024 A: point / largest 25 km / mean 25 km | +0.062 / +0.064 / +0.068 | +0.077 / +0.087 / +0.087 | largest vs point: −0.00010 (−0.00040, +0.00020); −0.00046 (−0.00075, −0.00017) |

- **Day 2:** point +0.023 / +0.063, mean 25 km +0.031 / +0.076, largest 25 km −0.005 / +0.068.
- **At the exact product thresholds the picture is the same.** At day 1, P(> 25 mm) at the point scores +0.061 / +0.068 against +0.072 / +0.082 for the mean within 25 km. P(> 50 mm) at the point scores +0.025 / +0.056 against +0.028 / +0.069.
- **2026** (indicative): point +0.021, mean within 25 km +0.025, largest within 25 km −0.014.

**The page's three words** (P35~ at day 1, 2025; share of days → heavy rain observed → share of all heavy-rain days):

| Word | At the point, A | At the point, B | Largest within 25 km, A | Largest within 25 km, B |
|---|---|---|---|---|
| ต่ำ (< 10 %) | 90.3 % → 2.9 % → 62 % | 91.0 % → 2.9 % → 57 % | 86.2 % → 2.5 % → 51 % | 87.7 % → 2.5 % → 48 % |
| มีโอกาส (10–40 %) | 8.6 % → 14.1 % → 28 % | 7.8 % → 18.6 % → 31 % | 11.9 % → 12.4 % → 35 % | 10.6 % → 16.1 % → 37 % |
| สูง (≥ 40 %) | 1.1 % → 37.3 % → 10 % | 1.2 % → 42.6 % → 12 % | 1.9 % → 31.4 % → 14 % | 1.7 % → 40.6 % → 15 % |

**Reliability** (at the point, day 1, 2025):
- Forecasts of 0 verified 1.1 % (A, n 4,997) and 1.4 % (B).
- 10–20 % verified 10.4 % (A) and 16.8 % (B).
- 40–60 % verified 31.6 % (A, n 76) and 24.3 % (B, n 70).
- 60–100 % verified 50 % (A, n 34) and 67 % (B, n 52).
- The largest-within-25-km chance is more over-confident: 40–60 % verified 23–25 %.

**Answer.**
- **No version deserves new words.**
  - The smoothed chance improves the point's Brier by a significant but small amount: +0.01 to +0.02 skill, all versions under +0.09.
  - The "largest chance within 25 km" catches more heavy-rain days under มีโอกาส or สูง (49–52 % instead of 38–43 %) but over-forecasts the point. It was worse than the point on A.
  - Whether it is right as "somewhere within 25 km" needs a dense gauge network to say (§7).
- **The existing point words hold on 76 stations.**
  - "ต่ำ" is followed by heavy rain on 2.9 % of days, yet carries 57–62 % of all heavy-rain days. The card's "ฝนหนักเกิดได้แม้วันที่คาดว่าโอกาสต่ำ" is the right sentence.
  - "สูง" verified 37–43 % on about 1 % of days.

**Landslide rule check** (the page: in a DMR risk area, P(> 100 mm in 24 h) ≥ 0.2 → ติดตามไว้, ≥ 0.5 → เตรียมตัว). Day 1, 2024–25, all 76 stations (39,642 station-days, 156 days with ≥ 100 mm):
- **At the point:** P100 ≥ 0.2 came on 15 days, and 10 of them had ≥ 100 mm (all 15 had ≥ 35.1 mm). P100 ≥ 0.5 came on 1 day, with no hit.
- **Largest within 25 km:** ≥ 0.2 on 25 days, 14 hits.
- **So:** the ensemble almost never gives a high chance of 100 mm, but when it gives 20 % it is usually right. The measured-rain part of the rule (a gauge over 100 mm) carries most of the tile.

## 4. Experiment C (feasibility): GloFAS through Open-Meteo's Flood API

`research/hz_glofas.py` and `research/hz_glofas_now.py`, log `hz_glofas-2026-10-24.log`, results `research/out/hz_glofas.json`.
- **What was read:** daily `river_discharge`, GloFAS v4 (0.05°), the API's default "seamless" series.
  - Open-Meteo's page says reanalysis ("consolidated") runs 1984 – July 2022, then forecasts. So 2024–2025 is the forecast series stitched day by day; which lead is stitched is [unverified].
  - No ThaiWater call was made, and no measured discharge was read.
- **How events were matched:** event dates come from news and agency summaries, compared with the dates of the series' peaks. Those marked † were seen only in search summaries (the articles didn't open) [unverified detail].

| River at | Cell returned for the gauge's coordinates | 2024 peaks in the series | Reported flood |
|---|---|---|---|
| Kok, Chiang Rai city | 0.8 km away; median 66, max **1,232 m³/s on 12 Sep 2024** | 12 Sep, 5 Oct, 23 Sep | Mueang Chiang Rai among the flooded districts by 13 Sep 2024 (HII summary, quoting DDPM) |
| Sai, Mae Sai | 0.8 km; max **204 on 12 Sep 2024** | 12 Sep, 22 Sep, 29 Aug | 235.8 mm in 24 h at Mae Sai on 11 Sep (HII); flooding 10–12 Sep (Khaosod 10 Sep; Reuters 12 Sep †) |
| Ping, Chiang Mai (P.1) | **side cell**: median 10, max 91 | (4 Oct, 67) | P.1 at 5.30 m, "the highest level in 50 years" (Bangkok Post via dpa, 5 Oct 2024) |
| — main-stem cell found by search, 8.1 km | | **5 Oct 409**, 25 Sep 355, 14 Sep 328 | as above |
| Nan, Nan city (N.1) | **side cell**: median 0, max 7 | — | Nan and Yom over their banks about 15 Aug, "critical" in Nan about 22 Aug 2024 † (OCHA 16 Aug; TNA) |
| — main-stem cell, 5.8 km | | 4 Aug 709, **23 Aug 591**, 26 Sep 609 | only a small rise on 15 Aug (383) |
| Yom, Sukhothai | **side cell**: max 2 | — | embankments broke about 20 Sep 2024, when RID gave 418 m³/s; a flood wall broke 24 Sep † (Thai PBS World) |
| — main-stem cell, 8.7 km | | 6 Oct 759, 26 Sep 458 | the rise came about 6 days after the reported overflow |
| Chao Phraya, Nakhon Sawan (C.2) | **side cell**: max 2 | — | — |
| — main-stem cell, 6.5 km | | 6 Oct 4,063; 2022: 5 Oct 4,177 | magnitudes not checked |
| Chao Phraya, Bangkok | 3.2 km; max 5,320 on 7 Oct 2024 | | tidal and diverted reach: not meaningful |
| Mun, Ubon (M.7) | 1.7 km; 2024–25 max 2,654 (3 Oct 2025); **2022: 5,069 on 6 Oct** | | the 2022 Ubon flood is the largest in the series, as expected |

- **The "largest river within 5 km" rule failed at 4 of 8 gauges.**
  - The cell returned for the gauge's coordinates was a side cell carrying 0–91 m³/s.
  - A 5 × 5 cell search (±0.1°, weight 25 a site) found the main stem 5.8–8.7 km away: the main-stem cell nearest the gauge, a post-hoc rule.
  - The first rule tried, the cell with the largest flow, drifted 13.0–17.9 km downstream, because rivers grow downstream.
- **Timing is promising where the cell is right.**
  - Chiang Rai and Mae Sai peaked on 12 Sep, a day after the 235.8 mm rain and as the floods were reported.
  - Chiang Mai peaked 4–5 Oct, as P.1 did.
  - Nan had a peak on 23 Aug against "critical" about 22 Aug.
  - Sukhothai's rise came about 6 days late.
- **Magnitudes are unverified.**
  - No observed discharge was read.
  - GloFAS v4 is weakest where rivers are regulated [R6], and the Ping and Nan run below the Bhumibol and Sirikit dams.
- **August 2026 at the Nan main-stem cell:** a peak of **747 m³/s on 14 Aug 2026**. News on 20 Aug 2026 reported the Nan flood's toll (The Star); the flood's start date was not confirmed.
- **The forecast today:** at the Nan cell on 24 Oct 2026 the API serves 30 days with ensemble statistics (`river_discharge_mean/median/max/min/p25/p75`): 24.4 m³/s now, a 25–75 % range of 25.8–30.1 m³/s on 30 Oct.
- **Verdict:**
  - GloFAS sees the big northern floods of 2024 at the right time.
  - But a point lookup silently returns a side cell at half the gauges tried, its numbers are uncalibrated, and its licence says it is not a flood warning.
  - **It is FloodWatch's to evaluate, not this page's to show.**

## 5. Flash flood, landslide, storms and drought: what the evidence allows (no experiment)

- **Flash flood.**
  - HII's daily list is the only Thai forecast product, and the page quotes it.
  - HII publishes no class edges, no listing rule and no validation [R29], and there is no archive of past lists. So its skill can't be measured.
  - The collector could keep each day's list (one small file a day). Scored against DDPM's reports after a season, that would give the first validation.
- **Landslide.**
  - DMR's 100 mm rule is the agency's own word; its AP Model numbers are unpublished.
  - Thai peer-reviewed thresholds add antecedent rain:
    - Northern Thailand: 25-day cumulative rain of 140 mm plus an event–duration curve split at 3 days [R33].
    - Southern Thailand: 20-day cumulative rain of 100 mm [R34].
    - Southern Thailand: event–duration curves by DMR susceptibility class, AUC 0.71 for the plain threshold and 0.89–1.00 by class [R35].
  - The coefficients weren't retrieved. These thresholds need **measured** multi-day rain at the point, so they belong with the ThaiWater rain history that FloodWatch already fetches.
  - Ensemble forecasts of 100 mm are too rare to carry the tile (§3).
- **Storms.**
  - The page already reads TMD, JMA and GDACS. JMA's own 2024 errors (71 km at 24 h, 152 km at 72 h, 424 km at 120 h [R49]) are what its 70 % circles express.
  - The Bay of Bengal is RSMC New Delhi's (TLS failure from research hosts), and JTWC's terms are unconfirmed. JTWC stays a roadmap item for the Andaman coast.
- **Drought.**
  - It is slow, a weeks-to-months hazard. On a "now and 3 days" page it belongs in the place profile, in an agency's word.
  - Candidates: GISTDA's DRI by subdistrict (keyed), ONWR's drought API (unreachable), Copernicus GDO SPI (CC BY 4.0, 1° monthly; its point query failed). An SPI computed by this app from model rain would be the app inventing a drought verdict.
  - SPEI-1 has Thai impact evidence for rain-fed rice in the Mun basin [R55]; no product was tested here.

## 6. What the page should do

| Candidate | Verdict | Exact words (when shipped) | Rules it touches |
|---|---|---|---|
| **Fire-weather line** | **Wait**: one dry season of archiving, then the §2 protocol on GWIS's own numbers (or RFD's TFDRS if RFD agrees) | TH: "สภาพอากาศวันนี้เอื้อต่อไฟป่า (แบบจำลอง)" · EN: "Today's weather favours wildfire (model)". Shown only on the fire card, below the hotspot count, for today and tomorrow, when the tested threshold is reached. Nothing shown below it: never "ไม่เอื้อ" or "ปลอดภัย" | **Rule 7:** a secondary source adds a line and never sets the tile, which stays graded by hotspots. **Rule 3:** labelled แบบจำลอง. **Rule 5:** never ปลอดภัย. **Rule 1:** the threshold must be measured on GWIS's numbers, not ERA5's. **Rule 2:** if RFD's TFDRS is readable, its word leads |
| **Hotspots** (existing) | **Keep**: the strongest predictor tested (persistence, Brier skill +0.46–0.48) | unchanged | **Rule 3:** measurements before models |
| **Neighbourhood rain chance** | **Don't ship** | (would have been "โอกาสฝนหนักในรัศมี 25 กม." / "Chance of heavy rain within 25 km") | **Rule 3d:** only validated words. **Rule 6:** the chance rule needs a reliability test, and the largest-within-25-km chance was over-confident (40–60 % verified 23–25 %) |
| **Rain words** (existing) | **Keep**; add the 76-station numbers to MODELS §3 | unchanged: "ต่ำ · มีโอกาส · สูง" and "ฝนหนักเกิดได้แม้วันที่คาดว่าโอกาสต่ำ" | **Rule 4:** chances, never amounts |
| **GloFAS line** | **Don't ship here**; FloodWatch tests it (§7) | — | **§4:** rivers as FloodWatch reads them. **Rule 1:** the cell and magnitude are unverified. GloFAS's licence: "does not constitute in any way a flood warning" |
| **Drought line** | **Wait** for GISTDA's key (DRI by subdistrict) or ONWR's API; then a profile line in the agency's own class word, never a 3-day level | not proposed until the agency's class words are read | **Rule 1:** no invented band. **Rule 2:** the agency's word leads |
| **Landslide** | **Keep** the DMR rule as is. Later, an antecedent-rain line from measured rain ([R33], [R34]) once a rain history exists | unchanged | **Rule 3b:** a forecast alone tops out at เตรียมตัว, and here it practically never reaches it |
| **Flash flood** | **Keep** quoting HII; the collector archives the daily list from now | unchanged | **Rule 2** |
| **Storms** | **Nothing new** | — | — |
| **Quote ONWR's notices and RFD's TFDRS** | **Wait**: the owner asks both (OWNER_ACTIONS) for a feed and reuse terms | the agency's own title and level, quoted | **Rule 2** |

## 7. Integration with FloodWatch and บ้านรอดไหม

**FloodWatch** (water is FloodWatch's):
1. **Test GloFAS at its gauges, not at points.**
   - Map each gauge to a GloFAS cell by upstream area (the CEMS static maps), not by nearest cell: §4 found side cells at 4 of 8 gauges.
   - Score GloFAS's discharge percentile against the gauge's bank exceedances at 3–15 days, where FloodWatch's own forecasts are weakest beyond 48 h (its 48/72 h gains are −3.0 % and −3.5 %).
   - Ship only if it beats "no change", by FloodWatch's own rule.
   - Credit "Generated using Copernicus Emergency Management Service information 2026" and keep GloFAS below the agencies' warnings, as its licence requires.
2. **Publish a daily 07–07 rain file from the ThaiWater gauges it already fetches** (about 1,000 gauges, every 10 min).
   - That is the dense network this note lacked: with it, "≥ 35 mm somewhere within 25 km" can be verified as an area event, and the Thai antecedent-rain landslide thresholds can be computed at a point.
   - No extra calls to ThaiWater (KI-029).
3. **Keep HII's daily flash-flood list and ONWR's notices as dated files.** FloodWatch already decodes ONWR's tiles. Both apps would then share one archive to validate against DDPM's reports.

**บ้านรอดไหม** (advice lines are its):
1. **A sourced "burning season" line, if the fire-weather line ships later.** The fire card links to its smoke guide (`/pm25`). A line such as an agency's ban on open burning would have to come from its guide word for word (GUIDELINES §4); none is proposed here without a source.
2. **The landslide card's warning-signs line** ("สังเกตน้ำในลำห้วยขุ่นข้น ดินร้าว ต้นไม้เอียง") should be checked against its `/landslide` guide by `npm run check:advice`, like the other advice lines.

## 8. What could not be done, and why

- **The neighbourhood event itself** ("somewhere within 25 km") wasn't verified. No dense open gauge network exists outside ThaiWater, which this research must not call. IMERG and GSMaP need logins.
- **The ENS chance of exactly 35 mm** isn't in ECMWF's open products. Downloading 51 members a day would have been about 50 GB, over the 2 GB limit. P35~ is interpolated (§3).
- **GWIS's forecast skill at 1–6 days**, and whether its FWI predicts hotspots, weren't tested:
  - FIRMS's 2026 country file doesn't exist yet, and the FIRMS API needs a key.
  - GWIS keeps no past forecasts.
  - Its archive starts about Aug 2025 (15 Mar 2025 gave no result).
- **Observed river discharge** wasn't read (ThaiWater excluded; RID not tried), so GloFAS magnitudes are unchecked. Only one forecast call was made, so GloFAS forecast skill is also untested.
- **Unconfirmed:**
  - the GWIS layer's source and licence;
  - the JTWC terms;
  - TMD's SPI maps;
  - the coefficients of the Thai landslide thresholds;
  - HII's FFPI classes;
  - DMR's AP Model numbers;
  - ONWR's licence.
- **Hosts unreachable** from the review: `wildfire.forest.go.th` (403), `climate.tmd.go.th` (TLS), `onwr.go.th` (timeout), `rsmcnewdelhi.imd.gov.in`, `metoc.navy.mil/jtwc` (403).
- **Storms and drought** got no experiment: no point product to test, and the page already quotes the storm agencies.

## 9. Reproduce, data and budget

```
python -I research/hz_fwi.py                       # FWI self-test
python -I research/hz_fetch_firms.py               # FIRMS VIIRS S-NPP Thailand 2019-2025 (83 MB)
python -I research/hz_fire_fetch.py                # ERA5 for 10 points x 6 seasons (60 Open-Meteo calls)
python -I research/hz_fire.py                      # Experiment A
python -I research/hz_gwis_probe.py                # GWIS value order, horizon, archive (about 30 requests)
python -I research/hz_gwis_vs_era5.py              # GWIS vs ERA5 FWI, Jan-Apr 2026 (240 GWIS requests, 2 ERA5 calls)
python -I research/hz_fetch_ecmwf.py oper 2024-04-01 2024-12-31 3   # and 2025; ep 2024-04-01 2024-12-31 1, 2025, 2026-04-01 2026-10-20
python -I research/hz_rain.py                      # Experiment B (GHCNh files in $GHCNH_DIR)
python -I research/hz_ghcnd_check.py               # why GHCN-Daily was not used
python -I research/hz_glofas.py; python -I research/hz_glofas_now.py   # Experiment C
python -I research/hz_prevruns_probe.py            # what the previous-runs API serves
```

- **Python:** a venv in the session scratchpad (numpy, pandas, scipy, scikit-learn, eccodes). Downloads live in the scratchpad (`$HZ_DATA`), never in the repository.
- **Open-Meteo:** 93 calls, **weight 1,284.8** of the 1,500 allowed, each in `research/logs/openmeteo-calls-2026-10-24.log`: ERA5 62; Flood API 26 (10 series at the gauges' own cells, 4 cell searches, 10 series at main-stem cells under the two cell rules, 2 for 2026); previous-runs 5. No limit message was received.
- **Downloads, about 1.25 GB:**
  - ECMWF open data: 1.11 GB of single-field byte ranges (HRES 514 MB, ENS probabilities 596 MB), one request at a time, 1.1 s apart.
  - FIRMS: 83 MB.
  - GHCN-Daily: station list and inventory, 47.8 MB, and one 3.5 MB station file.
  - GHCNh was reused from the heat researcher, so no new download.
- **No ThaiWater call. Honest User-Agent** `disaster-now-research/0.4 (+https://github.com/bejranonda/disaster-now)` on every request.

## References (all read 2026-10-24)

R-numbers follow the literature review behind §1.
- [R2] https://open-meteo.com/en/licence (OD)
- [R3] https://ewds.climate.copernicus.eu/licences/cems-floods (OD; read and checked)
- [R4] https://ewds.climate.copernicus.eu/datasets/cems-glofas-forecast (OD)
- [R6] https://confluence.ecmwf.int/spaces/CEMS/pages/340755428/GloFAS+v4+calibration+hydrological+model+performance (OD)
- [R7] Harrigan et al. 2020, ESSD 12, 2043–2060, doi:10.5194/essd-12-2043-2020 (PR; the Thailand sentence checked)
- [R12] https://forest-fire.emergency.copernicus.eu/about-effis/data-license (OD)
- [R13] https://data.giss.nasa.gov/impacts/gfwed/ (OD; checked: no licence stated)
- [R15] Di Giuseppe et al. 2020, NHESS 20, 2365–2378, doi:10.5194/nhess-20-2365-2020 (PR)
- [R18] https://www.met.gov.my/en/iklim/fdrs-malaysia/ (OD; class table checked)
- [R19] https://asmc.asean.org/asmc-fire-ffmc (OD)
- [R20] de Groot et al. 2007, Mitig. Adapt. Strat. Glob. Change 12, 165–180, doi:10.1007/s11027-006-9043-8 (PR)
- [R22] Tanpipat et al. 2023, in *Vegetation Fires and Pollution in Asia*, doi:10.1007/978-3-031-29916-2_34 (PR, chapter)
- [R25] https://fdrs.forest.go.th/ (OD)
- [R26] https://www.ecmwf.int/node/29497 (OD)
- [R27] https://ecmwf.int/en/forecasts/datasets/open-data (OD)
- [R29] https://www.hii.or.th/en/research-development/rd/2020/04/16/flash-flood-forecasting-and-warning-system/ (OD)
- [R30] https://www.iahr.org/library/info?pid=7663 (O)
- [R33] Chinkulkijniwat et al. 2022, Geomat. Nat. Haz. Risk 13, 2425–2441, doi:10.1080/19475705.2022.2120833 (PR)
- [R34] Salee et al. 2022, Nat. Hazards 113, 125–141, doi:10.1007/s11069-022-05292-0 (PR)
- [R35] Salee et al. 2022, J. Ecol. Eng. 23(12), 124–133, doi:10.12911/22998993/155023 (PR)
- [R41] Stanley et al. 2021, Front. Earth Sci. 9, 640043, doi:10.3389/feart.2021.640043 (PR)
- [R43] Biswas et al. 2022, Front. Earth Sci. 10, 1057796, doi:10.3389/feart.2022.1057796 (PR)
- [R45] https://github.com/nasa/LHASA (O)
- [R47] https://gdcc.data.go.th/en/dataset/dataset_32_013 (OD, search summary only)
- [R48] https://www.nhc.noaa.gov/aboutrsmc.shtml (OD, search summary only)
- [R49] JMA RSMC Tokyo Annual Report 2024, https://www.jma.go.jp/jma/jma-eng/jma-center/rsmc-hp-pub-eg/AnnualReport/2024/Text/Text2024.pdf (OD)
- [R51] https://gdacs.org/About/termofuse.aspx (OD)
- [R52] https://data.jrc.ec.europa.eu/dataset/4b6bbb51-ce1f-4489-97a8-b566b9379cf1 (OD)
- [R53] https://spei.csic.es/database.html (OD)
- [R55] Prabnakorn et al. 2018, Sci. Total Environ. 621, 108–119, doi:10.1016/j.scitotenv.2017.11.136 (PR)
- [R56] https://thinkhazard.org/en/about (OD)

**Event sources for §4:**
- HII, Chiang Rai flood summary, Sep 2024: https://thaiwater.net/uploads/contents/current/2024/FloodChiangrai_Sep2024/summary.html (OD; HII's website, not its API).
- Khaosod English, 10 Sep 2024: https://www.khaosodenglish.com/news/2024/09/10/tropical-storm-yagi-triggers-severe-flooding-in-northern-thailand/ (N).
- dpa via bluewin, 5 Oct 2024, citing the Bangkok Post: https://www.bluewin.ch/en/news/flood-situation-in-thailand-worsened-elephants-drowned-li.2394730 (N).
- OCHA ReliefWeb, 16 Aug 2024: https://reliefweb.int/report/thailand/thailand-flooding-and-landslides-13-provinces-16-aug-2024 (OD; 403 to our reader, search summary only).
- Thai PBS World, 20 Sep 2024: https://old.thaipbsworld.com/monsoon-troughs-blamed-for-rain-and-flooding-in-sukhothai-province (N; search summary only).
- The Star, 20 Aug 2026: https://www.thestar.com.my/aseanplus/aseanplus-news/2026/08/20/nan-province-floods-in-thailand-kill-two-and-affect-more-than-16000-people (N; search summary only).

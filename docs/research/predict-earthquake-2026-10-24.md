# Can the page forecast earthquakes, or give a risk, for a point in Thailand? (24 Oct 2026)

Research note for ภัยรอบบ้าน · Thai Risk. Question from the owner: can we forecast, or give a risk for, earthquakes near
a specific point in Thailand by learning from data, history, existing forecasts and theories? Every number below comes
from a script in `research/` whose log is in `research/logs/` (commands in §10). Anything not confirmed from a primary
source is marked **[unverified]**. Nothing here changes the page; §8 gives the verdicts and the exact words.

The frame (owner's request) is the Pacific Northwest Seismic Network's four categories (PNSN, "Earthquake Prediction",
https://pnsn.org/education/seismology/earthquake-prediction, read 2026-10-24, no date on the page; an operational
regional network's education page):

1. **Prediction** ("when, where and how big"): "there is no scientifically reliable way to do this."
2. **Early warning**: "a notification that is issued after an earthquake starts to rupture along a fault"; ShakeAlert
   is "a rapid detection system that indicates an earthquake has begun and shaking is imminent", not prediction.
3. **Probabilities / hazard** (PSHA): the chance of shaking or of a quake of some size in a region over years;
   "forms the basis of seismic building codes and other long-term earthquake planning efforts."
4. **Forecasts**: short windows, mainly aftershocks: "Larger earthquakes trigger more aftershocks than smaller
   earthquakes", "The rate of aftershocks decreases with time", "The magnitudes of the aftershocks do not necessarily
   get smaller with time."

PNSN also warns that trivial "predictions" look successful against base rates ("There will be a M4 earthquake
somewhere in the U.S. in the next 30 days"; M4s in the contiguous US average about one every 3 days). So every forecast
below is scored against a base rate.

## 0. Answer in brief

- **Prediction: no.** Nobody can say when, where and how big (USGS, ICEF, TMD). Nothing in this study changes that.
- **Early warning: exists for Thai Android phones, not for this page.** Google lists Thailand among the countries
  where Android Earthquake Alerts are active; TMD runs no early warning; DDPM's Cell Broadcast notifies after a quake.
  A web page in LINE cannot push in seconds; it can tell people where the switch is.
- **Long-term hazard: yes, as the official sources state it.** Thailand's 2021 Ministerial Regulation zones provinces
  by seismic hazard; GEM publishes a global map. Our own catalogue experiment shows the **where** is learnable from
  history (a smoothed-seismicity map gains 1.51 bits per quake on 2015–2026; each city's past felt rate beats a flat
  rate), but the **how often** is uncertain by a factor of about 2, and the felt-shaking counts per city could not be
  validated beyond a floor.
- **Aftershock forecasts: real elsewhere, but not good enough here to compute ourselves.** On 69 mainshocks of
  2015–2026, the generic model USGS uses by default (Page et al. 2016) over-forecast "another M ≥ 5 within a week"
  (mean 29 % vs 7 % observed) and scored worse than the plain base rate; a regional refit on 1973–2014 only tied the
  base rate. USGS's own ETAS forecasts for the 2025 M7.7 kept their count ranges but gave chances of a further M ≥ 6
  that did not happen (one sequence).
- **For the page:** ship a clearer "can't be predicted" line, the Android switch, the province's legal seismic zone
  and (optionally) a GEM link; say in words that aftershocks follow big quakes and link to USGS's forecast when one
  exists; **don't** compute an aftershock chance; **wait** on a per-point felt-history number. Reword GUIDELINES §7
  from "Nothing forecasts earthquakes" to "Nothing predicts earthquakes; the page computes no earthquake chance of
  its own" (§8).

## 1. The world: state of the art, by category

Sources were read on 2026-10-24 (numbers in brackets refer to §11). Types: **PR** peer-reviewed, **OP** an agency's
operational or official page, **NEWS**, **OTHER**. A literature scout read most of them; the author re-read
PNSN [37], Google's Android alerts page in English and Thai [34], the Ministerial Regulation's zone clause [22] and
USGS's operational code [38]. Anything seen only in a search snippet is **[unverified]**.

### 1.1 Prediction: nobody can

- USGS (OP) [3]: "No. Neither the USGS nor any other scientists have ever predicted a major earthquake. We do not know
  how, and we do not expect to know how any time in the foreseeable future." A prediction must give "1) the date and
  time, 2) the location, and 3) the magnitude."
- The International Commission on Earthquake Forecasting (PR, Jordan et al. 2011) [1, 2]: "The Commission has
  identified no method for the short-term prediction of large earthquakes that has been demonstrated to be both
  reliable and skillful." It separates "Predictions … prospective deterministic statements" from "Forecasts …
  prospective probabilistic statements", and notes that even when forecast probabilities rise by orders of magnitude
  they "typically remain low in an absolute sense (< 1% per day)."
- TMD (OP) [39]: "ภัยแผ่นดินไหวยังคงเป็นภัยธรรมชาติที่ยังไม่สามารถพยากรณ์ได้"; and "เรื่องของการพยากรณ์แผ่นดินไหว
  ปัจจุบันยังไม่สามารถกระทำได้ให้ถูกต้องแม่นยำ ทั้งด้านเวลาและสถานที่". The app's current line agrees with the Thai agency.

### 1.2 Early warning: detection after a quake starts (see §7)

- PNSN (OTHER, a regional network's education page) [37]: a "notification that is issued after an earthquake starts
  to rupture along a fault". USGS (OP) [36]: "ShakeAlert Is Not Earthquake Prediction."

### 1.3 Probabilities and hazard: operational, peer-reviewed, and available for Thailand

- **GEM Global Seismic Hazard Map v2026.1** (OP) [19]: "This map replaces the previous version (v2023.1) released in
  June 2023"; PGA with a 10 % chance of exceedance in 50 years, "computed for reference rock conditions (… VS,30 of
  800 m/s)"; data "under a CC BY-NC-SA 4.0 license". For Thailand it rests on GEM's South-East Asia model (Chan and
  Ornthammarath; OP documentation) [20], which "covers Myanmar, Thailand, Vietnam, Laos, Cambodia, Singapore, and
  West Malaysia" from two source models (Chan et al. 2017; Ornthammarath et al. 2020, Earthquake Spectra, PR, not
  read). The documentation gives no city values; the map grid was not downloaded (licence and registration), so **no
  GEM value per city is given here**.
- **Thailand's law** (OP) [22]: the Ministerial Regulation "กฎกระทรวงกำหนดการรับน้ำหนัก ความต้านทาน ความคงทนของอาคาร
  และพื้นดินที่รองรับอาคารในการต้านทานแรงสั่นสะเทือนของแผ่นดินไหว พ.ศ. ๒๕๖๔" (Royal Gazette vol. 138 part 16 ก
  pp. 13–14, 4 Mar 2021; replaces the 2550 regulation) names three zones by province in clause 3 (all 43, read from
  the Gazette's own pages and checked against its text layer: `research/data/eq_zones_2564.json`,
  `eq_zones_2564.py`): "บริเวณที่ ๑ …
  ที่ต้องเฝ้าระวัง" (14 provinces, including Songkhla and Surat Thani), "บริเวณที่ ๒ … ในระดับปานกลาง" (17, including
  Bangkok, Phuket, Ranong), "บริเวณที่ ๓ … ในระดับสูง" (12: Kanchanaburi, Chiang Rai, Chiang Mai, Tak, Nan, Phayao,
  Phrae, Mae Hong Son, Lampang, Lamphun, Sukhothai, Uttaradit). Khon Kaen, Udon Thani, Nakhon Ratchasima and Ubon
  Ratchathani are in no zone. The design standard มยผ. 1301/1302-61 (DPT, OP) with Ss/S1 per district would give
  numbers, but its page did not load [23]: **[unverified]**, no values used.
- **Thai PSHA** (PR): Ornthammarath et al. 2011 [24]: "northern and western Thailand are subjected to the highest
  hazard"; near Bangkok the largest contributions are "the nearby active faults and Sunda subduction zones". Paywalled;
  no city values read. Other values exist only in snippets **[unverified]** [25].
- **USGS Southeast Asia maps** (Petersen et al. 2007): the report is a USGS Administrative Report of 30 Sep 2007,
  not Open-File Report 2007-1352 (which is about a salamander); its host did not resolve [21], no values read.
- **DMR's active faults** (OP) [26]: an open dataset, updated 1 Dec 2023; the app already uses it ("within 20 km of an
  active fault"). The list of 16 fault zones is from a snippet **[unverified]**.

### 1.4 Forecasts: aftershocks, operational in a few countries, nowhere by a Thai agency

- **Reasenberg & Jones (1989)** (PR) [5]: "A stochastic parametric model allows determination of probabilities for
  aftershocks and larger mainshocks"; "typically well-constrained after the first day."
- **Page et al. (2016)** (PR, closed access) [6]: generic parameters by tectonic regime, the default in USGS's
  forecasts ("For most events, the generic parameter values are those from Page et al. (2016)", OP [8]). The values
  used here are read from USGS's own CC0 code [38], not from the paper; a 2026 preprint reproducing them [7] agrees
  with every value.
- **USGS operational aftershock forecasts** (OP) [9]: "Forecasts are posted for earthquakes of M4+ in the contiguous
  United States and M5+ in other U.S. states and territories"; "Occasionally we post aftershock forecasts for
  significant international earthquakes"; model "either the Reasenberg-Jones (1989, 1994) model" or ETAS (Ogata
  1988). The start year (2018 in the brief) is not on the page **[unverified]**. Its ETAS forecasts were evaluated
  prospectively (PR, van der Elst et al. 2022) [10]: "the ETAS model is a substantial improvement over the existing
  Reasenberg and Jones (1989) forecast model … performed well overall." For this region USGS issued forecasts for the
  2025 M7.7 Mandalay and a 2025 M5.4 in Bangladesh only (ComCat; §4.3); the 2023 Türkiye M7.8 has none [11].
- **New Zealand, GeoNet** (OP) [12]: e.g. "Within the next year, there is a 29% probability (unlikely) of one or more
  earthquakes" of M5.0–5.9 (Canterbury, issued 1 Feb 2025); "based on the behaviour of aftershock sequences
  worldwide"; "While no one can yet scientifically predict earthquakes."
- **Italy, OEF-Italy** (PR, Marzocchi et al. 2014) [13]: metadata only; its schedule is from a snippet **[unverified]**.
- **Japan** (OP) [14, 15, 16, 17]: JMA's advice is to watch, for about a week, for a quake as large as the first
  ("１週間程度は、最初の大地震の規模と同程度の地震に注意することが基本です"), and to say "地震" rather than "余震". Since
  2016 the Earthquake Research Committee no longer issues aftershock probabilities as percentages but as multiples of
  the normal rate ("確率の値（パーセンテージ）のまま発表せず、倍率で表現"), because low percentages may have been read as
  reassurance ("安心情報"). The Nankai Trough and Hokkaido–Sanriku advisories say a high relative chance "does not
  necessarily mean that one will actually strike"; the 2025 Hokkaido–Sanriku advisory put an M8+ within 7 days at
  about 1 in 100 (JST news).
- **Testing**: CSEP (PR, Schorlemmer et al. 2018) [18], "global cyberinfrastructure for prospective evaluations of
  earthquake forecast models".
- **Thailand and Myanmar**: no Thai agency, Myanmar's DMH or ASEAN's AHA Centre publishes an aftershock forecast
  (none found; TMD's earthquake site lists none) [39, 40].

### 1.5 The region

- **Sagaing fault, 2025** (PR, Goldberg et al. 2025, Science) [27]: the M7.7 "ruptured 475 kilometers of the Sagaing
  Fault" at "supershear velocities of greater than 5 kilometers per second"; hazard models "do not account for such
  long ruptures at moderate magnitudes". Slip budget (PR, Vigny et al. 2003) [29]: the Sagaing/Shan Scarp system
  "absorbs <20 mm/yr of the 35 mm/yr India/Sundaland strike-slip motion" (other rates in snippets **[unverified]**).
- **Indo-Burma arc** (PR, Steckler et al. 2016, Nature Geoscience) [30]: a locked megathrust (rates from a snippet
  **[unverified]**). In the USGS regime table the Mandalay epicentre is "SZ-GENERIC" (§2).
- **Northern Thailand** (PR, Pananont et al. 2017) [31]: "On 5 May 2014, a Mw 6.2 strike-slip earthquake occurred
  in the Mae Lao region" in an area "previously identified as having a relatively low earthquake hazard" (ComCat:
  Mww 6.1). **Laos**: the 2019-11-20 Mww 6.2 "43 km WNW of Sainyabuli" (ComCat) [32].
- **Andaman–Sumatra tsunami** (PR, Jankaew et al. 2008, Nature) [33]: "the most recent full-size predecessor to the
  2004 tsunami occurred about 550-700 years ago."

## 2. Data and methods

**Catalog.** USGS ComCat FDSN event service (https://earthquake.usgs.gov/fdsnws/event/1/, free, no key), box
0–30 °N, 88–110 °E (Thailand, Myanmar, Laos, Cambodia, Vietnam, Yunnan, north-east India and Bangladesh, the
Andaman–Nicobar arc and northern Sumatra), 1973-01-01 to 2026-10-24, M ≥ 4.0, type earthquake: **19,718 events**
(1973-02-10 … 2026-10-23), 19,690 of them from the `us` network; the preferred magnitude is mb for 17,687, Mw for
most M ≥ 6. Below M 4.0 ComCat has almost nothing here (110 events 1973–89, 794 in 1990–2009, 45 since 2010), so
ComCat is not a catalogue of Thailand's small local quakes. TMD keeps one; it was not used (no public history file
was found **[unverified]**).
File: `research/data/eq_comcat/comcat_0-30N_88-110E_1973-2026_M4.csv.gz` (`eq_fetch_catalog.py`).

**USGS's own aftershock-forecast code and parameters.** The operational code is public (opensha/opensha-oaf, CC0,
commit `fdfbaef1`, fetched 2026-10-24): `PageEtAlGenericParams_032116.csv` (Page et al. 2016's generic
Reasenberg–Jones parameters per tectonic regime), `GenericRJ_ParametersFetch.json`, `MagCompPage_ParametersFetch.json`
(world: catalog Mc 4.6; Mc(t) = max(0.5·Mmain − 0.25 − log10 t, 4.6); search radius 10^(0.69 M − 3.22) km clipped to
10–2,000 km, the Wells & Coppersmith 1994 "All" rupture length) and `TectonicRegimeTable.dat` (the Garcia et al. 2012
regionalization on a 0.05° grid). Copies in `research/data/eq_opensha_oaf/`; `research/eq_regime.py` decodes the table
(sanity check: San Francisco → ANSR-SHALCON, Kansas → SCR-GENERIC, Tokyo → SZ-ONSHORE; Mandalay → SZ-GENERIC,
Bangkok → ANSR-SHALCON).

**USGS's issued forecasts.** ComCat holds an "oaf" product for only two events in 10 °S–40 °N, 80–120 °E since 2015:
the 2025-03-28 M7.7 Mandalay earthquake (75 versions, 2025-03-28 17:02 UTC to 2026-04-03) and a 2025-11-21 M5.4 near
Tungi, Bangladesh (1 version). All 76 were downloaded as issued (`eq_fetch_oaf.py`, `research/data/eq_oaf/`); all
are "Epidemic-Type aftershock model (Bayesian Combination)", i.e. ETAS, not the generic Reasenberg–Jones.

**Felt reports.** USGS "Did You Feel It?" city aggregates (`cdi_zip.txt`) for every event in the box with a DYFI
product and at least one response (1,427 events have a DYFI product, 924 of them a response), kept where the country
is Thailand: 666 city rows from 150 events, the first on 2004-12-26 (`eq_fetch_dyfi.py`,
`research/data/eq_dyfi/`).

**Intensity.** The app's own equation (`public/js/ipe.js`): Allen, Wald & Worden (2012), hypocentral form, plus
1.06 MMI in greater Bangkok within 1,600 km (KNOWLEDGE §10, MODELS §5); copied into `research/eq_common.py` and checked
(M7.7 at 1,000 km → 3.63, as the unit test's 3.6). City points: the central tambon of each city from the app's
`public/data/tambon.json` (HDX COD-AB); Tak is represented by Mae Sot.

**Validation protocol** (GUIDELINES §7): choose on an earlier period, score on a later one, against a naive baseline;
everything chosen after seeing a test result is labelled **post-hoc**.

## 3. Experiment A: the catalog (`eq_catalog.py`)

**Completeness.** Maximum curvature + 0.2 (MAXC; Woessner & Wiemer 2005), 200 bootstrap resamples. The goodness-of-fit
method (Wiemer & Wyss 2000) cannot be used: the mb distribution is heaped (more events at 4.9 than at 4.8), so the fit
reaches R = 90 % only in 2005–09 and 2010–14.

| period | events | Mc (MAXC+0.2) | bootstrap 10–90 % | best GFT R (at Mc) | b at Mc |
|---|---|---|---|---|---|
| 1973–79 | 605 | 5.0 | 4.9–5.1 | 79 % (4.9) | 1.14 ± 0.08 |
| 1980–84 | 723 | 4.8 | 4.8–4.9 | 87 % (4.8) | 1.31 ± 0.08 |
| 1985–89 | 736 | 4.6 | 4.6–4.8 | 77 % (4.8) | 1.03 ± 0.05 |
| 1990–94 | 727 | 4.8 | 4.8–4.9 | 83 % (4.6) | 1.08 ± 0.07 |
| 1995–99 | 950 | 4.5 | 4.5–4.5 | 87 % (4.5) | 1.16 ± 0.06 |
| 2000–04 | 1,734 | 4.7 | 4.5–4.8 | 83 % (5.4) | 0.99 ± 0.03 |
| 2005–09 | 6,773 | 4.7 | 4.7–4.7 | 91 % (4.9) | 1.32 ± 0.03 |
| 2010–14 | 2,791 | 4.6 | 4.5–4.7 | 92 % (4.6) | 1.20 ± 0.04 |
| 2015–19 | 1,895 | 4.6 | 4.5–4.7 | 85 % (4.6) | 1.43 ± 0.05 |
| 2020–26 | 2,784 | 4.6 | 4.5–4.6 | 86 % (4.4) | 1.33 ± 0.05 |

Around Thailand itself (5–22 °N, 95–106 °E) Mc is 5.0 (1973–89), 4.6 (1990–2004), 4.4 (2005–14) and 4.6 (2015–26).
**ComCat is complete here only from about M 4.5–5.0**, which matches the 4.6 USGS assumes for the world.

**b-value** (Aki–Utsu maximum likelihood, each event above its period's Mc): all events **1.23** (95 % bootstrap
1.20–1.26, n = 7,523); declustered **1.02** (0.98–1.06, n = 2,877). The declustered value agrees with the b = 1 that
Page et al.'s generic model assumes; the higher raw value is the aftershock-rich, mb-dominated catalog.

**Declustering** (Gardner & Knopoff 1974 windows as fitted in OpenQuake hmtk `GardnerKnopoffWindow`, read from
oq-engine master on 2026-10-24: L = 10^(0.1238 M + 0.983) km; T = 10^(0.032 M + 2.7389) d for M ≥ 6.5, else
10^(0.5409 M − 0.547) d; fore- and aftershocks in the same window): 6,733 independent events of 19,718 (34.1 %);
9,245 aftershocks, 3,740 foreshocks, 1,836 clusters. Annual rates of independent events in the whole box (only periods
where the magnitude is complete): M ≥ 5.0 **23.9/yr**, M ≥ 5.5 **7.45/yr**, M ≥ 6.0 **2.88/yr**, M ≥ 6.5 **0.97/yr**,
M ≥ 7.0 **0.33/yr** (53.8 years). Within 600 km of Bangkok the largest are M6.0 south of Pyapon, Myanmar
(1991-04-01, 557 km) and M5.9 near Hpa-An (1975, 513 km); the closest of the large ones is the 1983-04-22 M5.7
"66 km ESE of Sangkhla Buri", Kanchanaburi (205 km from Bangkok). In the north, the 2014-05-05 M6.1 Mae Lao quake lay 33 km from
Chiang Rai's centre (§5).

## 4. Experiment B: aftershock forecasts (category 4) (`eq_aftershock.py`, `eq_oaf_score.py`)

### 4.1 Design (fixed before any score)

- **Mainshocks:** Gardner–Knopoff-independent events M ≥ 5.5 whose search circle lies inside the box: **391**
  (training, before 2015: **322**; test, 2015-01-01 to 2026-10-16: **69**). Regimes (train/test): SZ-GENERIC 121/21,
  SZ-ONSHORE 75/16, ANSR-DEEPCON 58/15, SZ-OUTERTR 23/7, ANSR-ABSLDEC 19/6, SZ-INLBACK 13/1, ANSR-SHALCON 6/2,
  SOR-GENERIC 5/0, SCR-GENERIC 2/1; 55 are deeper than 70 km.
- **Circle:** USGS's operational radius, 10^(0.69 M − 3.22) km clipped to 10–2,000 km, around the epicentre.
- **Forecast issued 1 h after the mainshock**; windows 7 and 30 days from then.
- **Event:** at least one ComCat quake M ≥ 5 (or ≥ 4) in the circle in the window, whatever it is called (the question
  a visitor would ask).
- **Models:** **G**, Page et al. (2016) generic Reasenberg–Jones for the epicentre's regime, a-value Normal(mean,
  σ(M)) as in USGS's `GenericRJ_Parameters.java`; **R**, the same form refit on the 322 training sequences (one a-value
  distribution and p for the whole box; b = 1, c = 0.018; counts above Mc(t)); **B0**, the training base rate (the
  naive baseline); **B1**, the training base rate per mainshock-magnitude bin.
- **Scores:** Brier, Brier skill vs B0 (BSS), mean log score, reliability; paired bootstrap (2,000) of Brier(B0) −
  Brier(model) — positive means the model beats the base rate.

The refit gave a-mean **−2.97**, σ **0.62**, p **0.61** (Page et al.'s SZ-GENERIC: −2.47, p 0.88; ANSR-SHALCON:
−2.42, p 0.98): an a-value about 0.5 lower than the generic ones (a factor of about 3 in the rate scale) and a
slower-looking decay, for this region's sequences as ComCat records them. 242 of the 322 training sequences had no counted event above Mc(t) in the first 30 days.

### 4.2 Results on the test set (2015–2026, n = 69)

| event to forecast | observed | B0 base rate | B1 by magnitude | G Page generic | R regional refit |
|---|---|---|---|---|---|
| ≥ 1 M ≥ 5 in 7 d | 5 (7.2 %) | p 0.14 · Brier 0.071 | 0.084 (BSS −0.18) | p 0.29 · **0.137 (BSS −0.91)** | 0.080 (BSS −0.12) |
| ≥ 1 M ≥ 5 in 30 d | 7 (10.1 %) | p 0.16 · 0.094 | 0.089 (+0.05) | p 0.34 · **0.161 (−0.71)** | 0.094 (−0.00) |
| ≥ 1 M ≥ 4 in 7 d | 23 (33.3 %) | p 0.30 · 0.224 | 0.216 (+0.03) | p 0.69 · **0.332 (−0.49)** | 0.233 (−0.04) |
| ≥ 1 M ≥ 4 in 30 d | 26 (37.7 %) | p 0.34 · 0.236 | 0.240 (−0.02) | p 0.74 · **0.363 (−0.53)** | 0.273 (−0.15) |

Bootstrap 95 % intervals of Brier(B0) − Brier(model): G is worse than the base rate in all four (e.g. M ≥ 5 in 7 d:
−0.108 … −0.022); R and B1 include zero in all four (e.g. R, M ≥ 5 in 7 d: −0.030 … +0.010). Log scores agree
(M ≥ 5 in 7 d: B0 −0.281, R −0.283, B1 −0.299, G −0.453).

**Reliability of G** (test, M ≥ 5 in 7 d): forecasts 0.10–0.20 → observed 0.07 (n 29); 0.20–0.40 → 0.04 (26);
0.40–0.70 → 0.18 (11); ≥ 0.70 → 0.00 (3). The generic model **over-forecasts in every regime** (all 391 sequences,
M ≥ 5 in 7 d, observed share vs mean G: SZ-GENERIC 0.17 vs 0.27, SZ-ONSHORE 0.11 vs 0.29, ANSR-DEEPCON 0.15 vs 0.34,
SZ-OUTERTR 0.00 vs 0.25, ANSR-ABSLDEC 0.04 vs 0.31; deeper than 70 km 0.04 vs 0.28).

On the training period (in-sample for R and B1) R and B1 beat B0 (M ≥ 5 in 7 d: BSS +0.19 and +0.22, intervals above
zero); that skill **did not carry over** to 2015–2026.

**What history says, by mainshock size** (share of sequences with another M ≥ 5 in the circle within 7 days from 1 h
after; training 1973–2014 | test 2015–2026): M 5.5–6.0: 16/203 | 2/43; M 6.0–6.5: 8/83 | 2/18; M 6.5–7.0: 10/24 |
1/7; M ≥ 7: 10/12 | 0/1. The one test M ≥ 7 is the 2025 M7.7 (`eq_oaf_score.py`): its M6.7 came 0.19 h after,
35 km away, before the window opened; the M5.1 on day 2 lay 259 km away near Nay Pyi Taw, outside the 124-km circle;
27 % of its M ≥ 4 aftershocks in the first 30 days within 500 km lay beyond 124 km. A circle around the epicentre
misses a long rupture's aftershocks. Larger mainshocks are followed by a strong quake more often, as PNSN says, but
the numbers per bin are small.

**Post-hoc sensitivity** (chosen after seeing the results above; `eq_aftershock.py --tag …`):

| variant | n test | M ≥ 5 in 7 d: observed / mean G / BSS G / BSS R | M ≥ 4 in 30 d: observed / mean G / BSS G / BSS R |
|---|---|---|---|
| pre-registered (circle ×1, min 10 km, from 1 h) | 69 | 7.2 % / 0.29 / −0.91 / −0.12 | 37.7 % / 0.74 / −0.53 / −0.15 |
| circle ×2, min 20 km | 67 | 13.4 % / 0.28 / −0.39 / −0.12 | 55.2 % / 0.74 / −0.02 / +0.08 |
| circle ×3, min 30 km | 66 | 16.7 % / 0.28 / −0.12 / +0.04 | 60.6 % / 0.73 / +0.03 / +0.09 |
| shallow mainshocks only (≤ 70 km) | 61 | 8.2 % / 0.27 / −0.57 / −0.04 | 42.6 % / 0.74 / −0.30 / −0.03 |
| issued 24 h after | 69 | 4.3 % / 0.19 / −0.88 / −0.10 | 29.0 % / 0.67 / −0.74 / −0.30 |

A wider circle catches more events (location error, long ruptures, background quakes) and narrows G's over-forecast,
but **no variant beats the base rate with an interval above zero**; in three variants the refit's p ran into the
fit's lower bound (0.3), a sign the Omori form does not describe these counts well.

### 4.3 USGS's own forecasts for the 2025 M7.7 (one sequence: a case study, not a validation)

USGS issued 75 versions (ETAS, Bayesian combination) and states its forecasts are "based on aftershocks recorded in
the ANSS Comprehensive Earthquake Catalog (ComCat)", so ComCat is the right yardstick. Outcomes inside each forecast's
own circle (196 km in the first version, 400–500 km later):

- **First forecast** (issued 2025-03-28 17:02 UTC; window from 9.7 h after the mainshock; circle 196 km): 1 week
  M ≥ 5 **P = 0.97** (95 % count 0–20) → observed **0**; M ≥ 6 0.40 → 0; 1 month M ≥ 5 0.99 → 1; 1 year M ≥ 5 0.998
  (3–83) → 5, M ≥ 6 0.73 → 0, M ≥ 7 0.16 → 0.
- **Second** (2025-03-29 00:55, circle 400 km): 1 week M ≥ 5 0.92 → 1; 1 year M ≥ 5 → 10 (95 % range 2–66);
  M ≥ 6 0.65 → 0.
- **All 75 versions pooled** (overlapping windows, not independent): 1 week M ≥ 5 mean P 0.24, observed in 19 %;
  M ≥ 6 mean 0.06, observed 0 %; 1 month M ≥ 5 0.47 vs 67 %; M ≥ 6 0.11 vs 0 %; 1 year M ≥ 6 (50 versions) 0.37 vs
  0 %. Observed counts fell inside USGS's 95 % ranges in 81–100 % of windows.
- **Bangladesh M5.4** (one version): 1 week M ≥ 4 P = 0.18 → 1 observed; M ≥ 5 0.025 → 0.

USGS's ranges held; its chances of a further M ≥ 6 were not borne out in this one sequence (none came after the first
hours). One sequence cannot validate or reject a method.

## 5. Experiment C: long-term felt shaking at a point (category 3) (`eq_felt_rates.py`, `eq_felt_validate.py`, `eq_felt_future.py`)

### 5.1 Predicted rates, 1973–2026

Design (fixed before results): every ComCat event above its period's completeness (7,523; 2,877 independent), the
app's equation at the city point (Bangkok +1.06 within 1,600 km), 53.8 years; the main set is declustered, as hazard
studies do; counts of events whose predicted MMI reaches the threshold, per 10 years, with a 90 % Poisson interval.
"With scatter" adds the equation's error: the expected number Σ P(MMI ≥ x) with sd 1.10 (the Thai-city DYFI residual
sd, Bangkok term applied; MAE there 0.88).

| city | ≥ 2.5 | **≥ III (3.0)** (count; 90 %) | ≥ IV | ≥ V | ≥ III, all events | with scatter ≥ III / ≥ IV | without M ≥ 8 ≥ III / ≥ IV *(post-hoc)* | strongest two |
|---|---|---|---|---|---|---|---|---|
| Bangkok | 15.1 | **7.6** (41; 5.8–9.9) | 1.5 (8) | 0.6 (3) | 9.3 | 23.9 / 6.2 | 6.9 / 0.9 | 2004 M9.1 1264 km → 6.4; 2005 M8.6 1350 km → 5.6 |
| Chiang Mai | 6.5 | **4.3** (23; 2.9–6.1) | 1.3 (7) | 0.0 (0) | 4.8 | 8.9 / 2.6 | 3.5 / 0.7 | 2004 M9.1 1754 km → 4.9; 1988 M7.7 449 km → 4.7 |
| Chiang Rai | 8.2 | **5.0** (27; 3.5–6.9) | 1.3 (7) | 0.6 (3) | 6.9 | 9.7 / 3.2 | 4.3 / 1.1 | 2014 M6.1 33 km → 5.9; 2011 M6.9 87 km → 5.7 |
| Mae Hong Son | 8.2 | **5.0** (27; 3.5–6.9) | 1.1 (6) | 0.0 (0) | 5.6 | 10.5 / 3.1 | 4.3 / 0.6 | 2025 M7.7 368 km → 4.9; 2004 M9.1 1792 km → 4.9 |
| Mae Sot (Tak) | 5.9 | **3.0** (16; 1.9–4.5) | 0.9 (5) | 0.2 (1) | 3.0 | 7.9 / 2.1 | 2.2 / 0.4 | 2004 M9.1 1519 km → 5.1; 2005 M8.6 1635 km → 4.3 |
| Kanchanaburi | 3.5 | **1.9** (10; 1.0–3.2) | 0.6 (3) | 0.2 (1) | 2.0 | 6.7 / 1.7 | 1.1 / 0.0 | 2004 M9.1 1255 km → 5.3; 2005 M8.6 1354 km → 4.5 |
| Phuket | 6.1 | **3.3** (18; 2.2–5.0) | 0.9 (5) | 0.6 (3) | 3.9 | 11.3 / 2.9 | 2.6 / 0.2 | 2004 M9.1 576 km → 6.3; 2005 M8.6 661 km → 5.5 |
| Ranong | 4.8 | **2.6** (14; 1.6–4.1) | 0.7 (4) | 0.4 (2) | 2.8 | 8.9 / 2.2 | 1.9 / 0.0 | 2004 M9.1 798 km → 5.9; 2005 M8.6 893 km → 5.1 |
| Khon Kaen | 3.3 | **1.9** (10; 1.0–3.2) | 0.6 (3) | 0.0 (0) | 1.9 | 4.8 / 1.3 | 1.1 / 0.0 | 2004 M9.1 1642 km → 5.0; 2005 M8.6 1715 km → 4.2 |
| Udon Thani | 3.5 | **2.0** (11; 1.1–3.4) | 0.7 (4) | 0.0 (0) | 2.0 | 5.2 / 1.4 | 1.3 / 0.2 | 2004 M9.1 1737 km → 4.9; 1988 M7.7 684 km → 4.1 |
| Nakhon Ratchasima | 3.0 | **1.7** (9; 0.9–2.9) | 0.6 (3) | 0.2 (1) | 1.7 | 4.9 / 1.3 | 0.9 / 0.0 | 2004 M9.1 1460 km → 5.1; 2005 M8.6 1533 km → 4.3 |
| Hat Yai (Songkhla) | 5.2 | **3.2** (17; 2.0–4.7) | 0.9 (5) | 0.4 (2) | 3.5 | 8.3 / 2.2 | 2.4 / 0.2 | 2004 M9.1 647 km → 6.2; 2005 M8.6 663 km → 5.4 |
| Surat Thani | 4.6 | **2.8** (15; 1.7–4.3) | 0.9 (5) | 0.4 (2) | 3.0 | 8.4 / 2.2 | 2.0 / 0.2 | 2004 M9.1 748 km → 6.0; 2005 M8.6 822 km → 5.2 |
| Ubon Ratchathani | 2.4 | **1.5** (8; 0.7–2.7) | 0.6 (3) | 0.0 (0) | 1.5 | 3.8 / 1.0 | 0.7 / 0.0 | 2004 M9.1 1645 km → 5.0; 2005 M8.6 1691 km → 4.2 |
| Nan | 5.8 | **3.5** (19; 2.3–5.2) | 1.1 (6) | 0.0 (0) | 3.9 | 7.6 / 2.4 | 2.8 / 0.7 | 2004 M9.1 1800 km → 4.8; 1988 M7.7 461 km → 4.6 |

(per 10 years; ≥ V is the count over 53.8 years in brackets; "all events" includes aftershocks.)

Read with care:

- **The order is the robust part**: Bangkok (soft-clay term), then the north and north-west (Chiang Rai, Mae Hong
  Son, Chiang Mai, Nan) and the Andaman coast; the north-east (Ubon, Nakhon Ratchasima, Khon Kaen, Udon) lowest.
- **The levels are not robust.** The equation's error (MAE ≈ 0.9–1.0 MMI) moves the counts by a factor of 2–3
  ("with scatter"); the scatter estimate is itself inflated by thousands of small far quakes and by DYFI's selection
  (only people who felt something report), so the truth lies between the two columns, not at either.
- **The great Sunda-arc quakes are outside the equation's domain.** The values ≥ V in the south (2004 M9.1 →
  6.3 at Phuket; 6.4 in Bangkok with the term) come from a point-source crustal equation applied to M8.6–9.1
  subduction ruptures; without M ≥ 8 the south's ≥ IV rate falls from 0.9 to 0.2 per 10 years (post-hoc). The page
  must not show these as measured history.
- **Small near quakes are missing.** ComCat is complete only from M 4.5–5.0; a G-R add-on (b = 1, M 3.0 to Mc, placed
  at recorded epicentres within 300 km) adds little at the median prediction (+0.5 per 10 years ≥ III at Chiang Rai,
  +0.1 at Mae Hong Son, 0 elsewhere), but quakes below M 4 within ~30 km can reach III (the equation gives 3.0 for
  M 4.0 at 30 km and M 4.5 at 50 km), and TMD's own catalogue of small Thai quakes was not available for this test.

### 5.2 Against what people reported (DYFI, 2004-12-26 to 2026-10-23, 21.8 years)

A city's reports are the DYFI city aggregates in Thailand within 20 km of the city point (e.g. Bangkok: Bangkok, Bang
Kruai, Bang Yai, Pak Kret, Phra Pradaeng, Bang Bo Thong); per event the response-weighted CDI. The predicted side uses
every ComCat event M ≥ 4 in the same years (aftershocks too, since people report them).

| city | events with a report | reported CDI ≥ 3 (≥ 3 responses) | predicted ≥ III | median CDI − predicted |
|---|---|---|---|---|
| Bangkok | 54 | 11 (7) | 27 | +0.57 |
| Chiang Mai | 50 | **19** (12) | 15 | +0.70 |
| Chiang Rai | 33 | 16 (8) | 30 | +0.52 |
| Mae Hong Son | 8 | 5 (3) | 13 | −0.29 |
| Mae Sot (Tak) | 7 | 2 (1) | 8 | +0.84 |
| Kanchanaburi | 3 | 2 (0) | 7 | +0.01 |
| Phuket | 40 | 12 (6) | 16 | +0.19 |
| Ranong | 0 | 0 (0) | 11 | – |
| Khon Kaen | 6 | 5 (2) | 7 | +1.11 |
| Udon Thani | 6 | 3 (2) | 8 | +0.26 |
| Nakhon Ratchasima | 4 | 3 (1) | 7 | +1.04 |
| Hat Yai (Songkhla) | 6 | 2 (1) | 13 | −0.49 |
| Surat Thani | 2 | 1 (0) | 11 | +0.11 |
| Ubon Ratchathani | 4 | 1 (0) | 6 | +1.27 |
| Nan | 10 | 5 (2) | 11 | −0.27 |
| **all 15** | | **87 (45)** | **190** | |

- **The prediction stays above the DYFI floor in 14 of 15 cities** (190 predicted city-events at III or more vs 87
  reported; 45 with ≥ 3 responses). That is what a floor allows, so it is consistent, not a confirmation: DYFI
  cannot say how many of the other 103 were felt unreported. Ranong (11 predicted, no report at all) shows how thin
  participation is.
- **Chiang Mai is the exception** (19 reported vs 15 predicted): small and moderate quakes are felt more than the
  equation says. By magnitude, all pairs: M < 5.5 MAE 1.41, **bias +1.26** (n = 103 pairs, 82 events); M ≥ 5.5 MAE
  0.84, bias −0.08 (n = 130, 49 events). The app already withholds felt words below M 5.5 (U15); this confirms it
  on a new, larger set.
- **Event by event**, of the 87 city-events reported at CDI ≥ 3, the equation said ≥ 3.0 for 42 (48 %) and ≥ 2.5 for
  49 (56 %); of the 22 at CDI ≥ 4, it said ≥ 4.0 for 9 (41 %).
- *Post-hoc* (added after seeing one-person reports such as CDI 2 in Bangkok for an M4.2 1,890 km away, plainly
  misassigned): keeping M ≥ 5.5 and ≥ 3 responses, n = 68 pairs, MAE **0.71**, bias −0.17; of 38 reported CDI ≥ 3,
  28 were predicted ≥ 3.0 and 33 ≥ 2.5. Predicted 175 vs reported 38 city-events in those years.
- **Offshore great quakes are over-predicted where people did report**: the 2012 M8.6 Wharton Basin quake in
  Bangkok, CDI 2.6 from 71 responses vs 5.4 predicted with the Bangkok term (4.4 without it); the 2009 M7.5 Andaman
  quake in Bangkok, 2.3 (9 responses) vs 4.7. The term was fitted on mainland crustal quakes, and the app applies it
  to any quake within 1,600 km; it should probably not be applied to offshore subduction quakes (a finding for
  KNOWN_ISSUES/MODELS; two events, not tested further here).

### 5.3 Is the past rate a fair guide to the next decade? (`eq_felt_future.py`)

Training 1973–2014 (42.0 yr), test 2015-01-01 to 2026-10-23 (11.8 yr), declustered events: the city's own past rate
vs a flat rate (the 15-city mean, the same everywhere).

| threshold | test count, 15 cities | expected from each city's past rate | log-likelihood, city rate vs flat | cities with Poisson P < 0.05 on either side |
|---|---|---|---|---|
| ≥ 2.5 | 70 | 110.8 | −35.97 vs −49.13 (**+13.2**) | 1 of 15 (Kanchanaburi, 1 vs 5.1) |
| ≥ III | 37 | 64.1 | −29.94 vs −35.55 (**+5.6**) | 0 of 15 |
| ≥ IV | 7 | 18.8 | −17.12 vs −17.94 (+0.8) | 0 of 15 |

The **where** carried over (each city's own rate beats one rate for all), the **how often** did not: 2015–2026 had
about 0.6 of the earlier rate at III, 0.4 at IV, because large quakes cluster in time (the 2004–2012 Sunda-arc
sequence sits in the training years). A "per 10 years" figure from 50 years of catalogue can be off by a factor of
about 2 for the next decade; the 15 counts share quakes, so these tests are not independent.

## 6. Experiment D: where, not when (category 3) (`eq_spatial.py`)

Does the past say **where** quakes will happen? A smoothed-seismicity map (Gaussian kernel on past independent
M ≥ 5.0 epicentres plus a uniform floor), bandwidth and floor chosen on 1973–2003 → 2004–2014 (chosen: 100 km, 5 %),
refit on 1973–2014, scored on the **304** independent M ≥ 5.0 quakes of 2015–2026: **information gain 1.51 bits per
quake over a uniform map** (2.8 times the likelihood per quake), and **55 %** of them fell in the 10 % of the area the
map rates highest. So the long-term "where" is learnable from history (as hazard maps assume); Experiment B shows the
"when" is not, beyond the base rate.

## 7. Early warning (category 2)

- **Android Earthquake Alerts System is active in Thailand** (Google, OP) [34]: the list "Where the Android
  Earthquake Alerts System is active" includes Thailand (read in English and in Thai, where it reads "ไทย"). Google's
  Thai help page gives the switch: "การตั้งค่า" → "ความปลอดภัยและเหตุฉุกเฉิน" → "การแจ้งเตือนแผ่นดินไหว" (or
  "ตำแหน่ง" > "ขั้นสูง" > "การแจ้งเตือนแผ่นดินไหว"), for quakes "ขนาด 4.5 แมกนิจูดขึ้นไป"; "คุณอาจได้รับการแจ้งเตือนก่อน
  ระหว่าง หรือหลังเริ่มมีการสั่นสะเทือน"; "ระบบอาจตรวจจับแผ่นดินไหวบางครั้งไม่ได้"; "คุณต้องเปิด Wi-Fi หรืออินเทอร์เน็ต
  เพื่อรับการแจ้งเตือน". The English page says alerts are on by default. Launched in Thailand in July 2022 (Brand
  Buffet, NEWS, 18 Jul 2022) [34]; no Thai government page confirms it, and its performance in Thailand (e.g. on
  28 Mar 2025) was not found **[unverified]**.
- **TMD**: no early-warning service found [39]; a 2026 report that TMD is studying one did not load **[unverified]**.
- **Cell Broadcast** (NEWS) [35]: after the 28 Mar 2025 quake (13:20), "the initial SMS alert was dispatched to the
  … NBTC at 14:42" and the Prime Minister called it "too slow and inadequate"; DDPM "aimed to get alerts out within
  10 minutes of an earthquake". Thai PBS (15 Jan 2026): a nationwide test on 20 Jan 2026; built by "ปภ. กสทช. และ
  ผู้ให้บริการเครือข่าย"; needs "iOS เวอร์ชัน 18 … Android เวอร์ชัน 11 ขึ้นไป". This is a notification after a quake,
  not early warning; no official DDPM page or go-live date was found **[unverified]**.
- **What a web page can do**: early warning needs a push to the phone within seconds. A static page opened in LINE
  cannot deliver it; its honest role is to point to the Android switch and to say that the page itself only shows
  quakes after they happen.

## 8. What the page should do

Each candidate belongs to exactly one PNSN category. None may read as a prediction: no line gives a date, a countdown
or "will", every chance is the agency's and linked, and long-term lines say "ระยะยาว" / "long term".

| # | candidate | category | verdict |
|---|---|---|---|
| 1 | Reword the existing "can't be forecast" line | 1 Prediction | **ship** (wording) |
| 2 | "Turn on Android earthquake alerts" line | 2 Early warning | **ship** |
| 3 | "DDPM Cell Broadcast" line | 2 Early warning (a notification after the quake) | **wait** (news sources only) |
| 4 | The province's seismic zone from the 2564 Ministerial Regulation | 3 Hazard | **ship** |
| 5 | Link to GEM's global hazard map | 3 Hazard | **ship as a link** (optional) |
| 6 | Per-point "felt shaking history" line | 3 Hazard | **wait** (level not validated; ranking already given by #4) |
| 7 | The page's own aftershock chance (Page generic or a refit) | 4 Forecast | **don't ship** |
| 8 | "Aftershocks follow big quakes" in words after a big nearby quake | 4 Forecast (behaviour, no number) | **ship**, after the owner checks it against บ้านรอดไหม |
| 9 | Link to USGS's aftershock forecast when USGS has published one | 4 Forecast | **ship as a link, no numbers**, once the rule below is changed |
| 10 | History of "another M5 within a week" after quakes of this size | 4 Forecast | **don't ship** (did not beat the base rate on 2015–2026; small n) |

**1. Prediction (ship, wording).** Today: "แผ่นดินไหวพยากรณ์ล่วงหน้าไม่ได้" / "Earthquakes can't be forecast." The
English is too broad once the page links an aftershock forecast (USGS does forecast aftershocks). Proposed:
- TH: "แผ่นดินไหวยังพยากรณ์ล่วงหน้าไม่ได้ว่าจะเกิดเมื่อไร ที่ไหน แรงแค่ไหน"
- EN: "No one can predict when, where or how big an earthquake will be."
- Sources: USGS FAQ [3] (date and time, location, magnitude), TMD [39] (the Thai word "พยากรณ์" kept, as TMD uses it).
  GUIDELINES §1 (3d) and §7. Data: none.

**2. Early warning, Android (ship).** In the quake card's notes or the place profile, every time (static, no data):
- TH: "มือถือ Android ในไทยมีระบบแจ้งเตือนแผ่นดินไหวของ Google (ขนาด 4.5 ขึ้นไป) ตรวจว่าเปิดไว้: การตั้งค่า >
  ความปลอดภัยและเหตุฉุกเฉิน > การแจ้งเตือนแผ่นดินไหว อาจเตือนก่อน ระหว่าง หรือหลังเริ่มสั่น และบางครั้งตรวจไม่พบ
  หน้านี้แสดงแผ่นดินไหวหลังเกิดแล้วเท่านั้น"
- EN: "Android phones in Thailand have Google's earthquake alerts (M4.5 and up). Check they're on: Settings > Safety &
  emergency > Earthquake alerts. An alert may come before, during or after the shaking starts, and some quakes are
  missed. This page only shows quakes after they happen."
- Source: Google's help page in Thai and English [34] (the menu names are Google's Thai wording). It is a company's
  service, so the line names Google and claims nothing for TMD or DDPM. GUIDELINES §1 (1: a sourced line), §3. No
  link to an app store; nothing about the visitor is sent anywhere. Re-check the country list yearly.

**3. Cell Broadcast (wait).** The facts are from news only [35]; no DDPM page with a go-live date or with earthquake
use was found. When DDPM publishes one: "ข้อความเตือนภัยทางการถึงมือถือมาจาก ปภ. (Cell Broadcast)". Owner action.

**4. The province's seismic zone (ship).** In the place profile, for the 43 provinces of the 2564 regulation [22]
(`research/data/eq_zones_2564.json`: zone 1 = 14, zone 2 = 17, zone 3 = 12 provinces, with the app's province codes;
all 43 names match `public/data/tambon.json` verbatim; no collector). The regulation's title is long; the line names
it by a short description and links the Gazette PDF:
- Zone 3 — TH: "กฎกระทรวงเรื่องอาคารต้านทานแรงสั่นสะเทือนของแผ่นดินไหว (พ.ศ. 2564) จัดจังหวัดนี้เป็น 'บริเวณที่ 3':
  อาคารอาจได้รับผลกระทบจากแผ่นดินไหวในระดับสูง (ความเสี่ยงระยะยาว ไม่ใช่การทำนาย)"; EN: "Thailand's seismic building rules (2021) put this
  province in zone 3: buildings may be affected by earthquakes at a high level (long-term hazard, not a prediction)."
- Zone 2: "… 'บริเวณที่ 2': … ในระดับปานกลาง …" / "… zone 2: … at a moderate level …".
- Zone 1: "… 'บริเวณที่ 1': บริเวณที่ต้องเฝ้าระวัง …" / "… zone 1: an area to watch …".
- Not listed: "จังหวัดนี้ไม่อยู่ในบริเวณที่กฎกระทรวง (2564) กำหนด ซึ่งไม่ได้แปลว่าไม่มีแผ่นดินไหว" / "This province is
  not in a zone of the 2021 rules; that doesn't mean no earthquakes." (never "ปลอดภัย", GUIDELINES §1 (5)).
- Evidence that it fits the felt history: Spearman rank correlation between the zone and the predicted rate ≥ III
  across the 15 cities **+0.65** (p = 0.009; ≥ IV +0.61, p = 0.015; without Bangkok +0.73), `eq_hazard_compare.py`.
  They differ where they should: Bangkok (zone 2) feels far quakes most often through its soft clay; Kanchanaburi
  (zone 3) rarely felt any in 1973–2026 (1.9 per 10 years ≥ III), probably because its zone reflects nearby active
  faults that were quiet in these 50 years. Frequent weak shaking and rare damaging shaking are different questions; the zone answers
  the second, which is the one that matters for buildings.
- GUIDELINES §1 (the agency's word leads: here the law's own words), §3.

**5. GEM map (ship as a link, optional).** TH: "แผนที่ความเสี่ยงแผ่นดินไหวระยะยาวของ GEM (โอกาสสั่นไหวในรอบ 50 ปี
บนหิน ไม่ใช่การทำนาย)"; EN: "GEM's long-term earthquake hazard map (chance of shaking over 50 years on rock; not a
prediction)". Link only: the data are CC BY-NC-SA [19] and no city value was verified here.

**6. Felt shaking history (wait).** What would be shown, per tambon, from a static table computed offline from
ComCat (7,425 tambons, refreshed yearly; no collector call):
- TH: "ระยะยาว: ในรอบ 50 ปี (2516–2569) แผ่นดินไหวที่น่าจะรู้สึกได้เบาๆ ที่นี่ (ระดับ III ขึ้นไป) ประมาณ N ครั้งต่อ
  10 ปี (ค่าประมาณจากแบบจำลอง อาจคลาดเคลื่อนได้ 2–3 เท่า ไม่ใช่การทำนาย)"
- EN: "Long term: over the last 50 years, quakes probably felt lightly here (intensity III or more) about N times per
  10 years (a model estimate that can be off by 2–3 times; not a prediction)."
- Why wait: (1) the level is not validated: DYFI gives only a floor (§5.2), and the equation's error moves the counts
  2–3 times (§5.1); (2) the past rate over-stated the next decade by about 1.7 times at III (§5.3); (3) the
  strongest values in the south come from M8.6–9.1 quakes outside the equation's domain, and the Bangkok term
  over-predicts them (§5.2); (4) the equation under-predicts felt reports from M < 5.5 quakes (bias +1.26), so a
  "rarely felt" north-western valley may be told too little; (5) the robust part, the ranking, is already given in
  the law's own words by #4. Revisit after the Bangkok term is limited to crustal quakes, TMD's small-quake catalogue
  is available, and a rupture-distance version is tested.

**7. The page's own aftershock chance (don't ship).** Out of sample (2015–2026, 69 mainshocks), Page et al.'s
generic model over-forecast by about a factor 2–4 in this region and scored worse than the base rate on every
target (§4.2); a refit on 1973–2014 did no better than the base rate. A number the page computed would be the page's
own forecast (GUIDELINES §1 (1, 3b), §7) with no validated skill.

**8. Aftershocks in words (ship, owner check).** When a quake of M ≥ 6.0 is in the quake card (the existing 7-day,
≤ 300 km or "อาจรู้สึกได้" filter) and is less than 7 days old:
- TH: "หลังแผ่นดินไหวใหญ่ มักมีแผ่นดินไหวตามมา (อาฟเตอร์ช็อก) มากที่สุดในช่วงแรกแล้วค่อยๆ ลดลง แต่ครั้งหลังก็อาจแรงได้"
- EN: "After a big quake more quakes (aftershocks) usually follow, most of them early on and fewer later, but a
  later one can still be strong."
- Sources: PNSN [37] ("Larger earthquakes trigger more aftershocks", "The rate of aftershocks decreases with time",
  "The magnitudes of the aftershocks do not necessarily get smaller with time"); JMA [14] (watch for a quake as large
  as the first for about a week). It states behaviour, no chance and no time. Any action ("what to do") must be
  บ้านรอดไหม's own words (`npm run check:advice`). GUIDELINES §1 (1), §4 (บ้านรอดไหม's advice). Data: none new.

**9. USGS's aftershock forecast, as a link (ship once the rule changes).** When the USGS event for a quake in the
card carries an "oaf" product (2 events in this region since 2015):
- TH: "USGS ได้เผยแพร่การคาดการณ์อาฟเตอร์ช็อกของแผ่นดินไหวครั้งนี้ (เป็นโอกาส ไม่ใช่คำทำนาย)" + link to the event's
  USGS page (`properties.url`, which the page already uses; the exact path of its aftershock-forecast tab is
  **[unverified]**); EN: "USGS has published an aftershock forecast for this quake (chances, not a prediction)" +
  link.
- No number is copied: USGS's numbers change with each update (75 versions for the M7.7), and in the one regional
  case its chances of a further M ≥ 6 (0.40 in the first week, 0.73 in a year) were not borne out (§4.3), which one
  sequence can neither confirm nor refute. Japan stopped publishing low percentages because they read as
  reassurance [15]; a link keeps the agency's own framing.
- Data: the collector (or page) reads the USGS event detail (`?eventid=…&format=geojson`) for quakes M ≥ 6 in the card
  and checks `properties.products.oaf`; one extra call per big quake, cached.

**10. "After quakes this size, another M5 followed in N of 10 cases" (don't ship).** The by-magnitude base rate (B1)
beat the plain base rate in 1973–2014 (in-sample) but not in 2015–2026 (§4.2), and depends strongly on how
"near" is drawn (the 2025 M7.7, §4.2). It would read as a forecast.

**The rule.** GUIDELINES §7 now says "Nothing forecasts earthquakes." Frankly, that sentence is right about
prediction and wrong about aftershocks: USGS, GeoNet, Italy and Japan do issue forecasts, and USGS's have been tested
prospectively [10]. It
should keep the page from making its own, not pretend none exist. Proposed text:

> **Nothing predicts earthquakes** (when, where and how big: USGS, ICEF, TMD). The page computes no earthquake chance
> of its own: the aftershock chances tested on this region had no skill over the base rate
> (docs/research/predict-earthquake-2026-10-24.md). It may (a) say in words how aftershocks behave, (b) link to an
> agency's published aftershock forecast, without copying its numbers, worded as chances, never as a prediction, and
> (c) show long-term hazard only as an official source states it (the 2564 ministerial zones; GEM by link), labelled
> long term. Early warning is a phone push, not this page: the page may only say where to switch it on.

The quake card's "พยากรณ์ล่วงหน้าไม่ได้" stays true under this rule.

## 9. Caveats, what is untested, what could not be done

- **One catalogue.** ComCat (NEIC) only, complete from about M 4.5–5.0; mb for most events. TMD's catalogue (small
  Thai quakes), ISC and ISC-GEM were not used; the M ≥ 4 targets in Experiment B are "recorded by ComCat", a lower
  bound on what happened.
- **Small n.** 69 test sequences with 5–12 events for the M ≥ 5 targets; one sequence (the M7.7) for USGS's own
  forecasts. A model with real but small skill could not be detected; what *can* be said is that the generic model
  over-forecasts here and that nothing beat the base rate.
- **Circles, not ruptures.** Aftershock zones were circles around the epicentre (USGS centres on the aftershock
  centroid and analysts widened the M7.7's to 400–500 km); long ruptures put aftershocks outside. The post-hoc runs
  show this moves the results but not the verdict.
- **Generic only.** The test is of the forecast available 1 h (or 24 h) after the mainshock, before any sequence data;
  USGS's Bayesian update and ETAS were not reimplemented (USGS's own ETAS forecasts were scored instead, one case).
- **The intensity equation** is outside its domain for the M8.6–9.1 subduction quakes and deep (> 70 km) events, has
  MAE ≈ 0.9–1.0 MMI at Thai cities, and was validated only on M ≥ 5.5 events (MODELS §5); the felt counts inherit all
  of this. The Bangkok-metro zone in the scatter estimate was approximated as 35 km around central Bangkok.
- **DYFI is a floor.** People report only when they felt something and know the site exists; absence of reports is
  not absence of shaking.
- **Not done:** no numeric hazard per city (GEM grid not downloaded: licence and registration; DPT standard's Ss/S1
  did not load; USGS 2007 Southeast Asia report unreachable); no ETAS fit of our own; no test of Italy's or New
  Zealand's systems; no check of Android alerts' performance in Thailand (no data found); Thailand's Cell Broadcast
  confirmed by news only.
- **Rules kept:** no docker, no container touched, `nice -n 19`, memory well under 1.5 GB; 1,958 HTTP calls by the
  scripts (1,956 × 200, 2 × 404), 43 MB transferred, 9.1 MB kept under `research/data/eq_*`; no call to
  api-v3.thaiwater.net; ≥ 1.1 s between calls to one host, honest User-Agent; `.env` not read. Files were
  created only under `research/` (`eq_` prefix) and this report.

## 10. Reproduce

All with `nice -n 19` and the venv in the session scratchpad (`python -I`); every HTTP call is in
`research/logs/eq_http-calls-2026-10-24.log` (honest User-Agent "disaster-now-research/0.4", ≥ 1.1 s per host,
cached).

```
python -I research/eq_fetch_catalog.py      # A: ComCat download
python -I research/eq_catalog.py            # A: Mc, b, Gardner-Knopoff
python -I research/eq_fetch_oaf.py          # B: USGS's issued aftershock forecasts
python -I research/eq_aftershock.py         # B: Page generic / refit / base rates (pre-registered)
python -I research/eq_aftershock.py --tag r2 --radius-mult 2 --radius-min 20   # B: post-hoc (also r3, shallow, ts24h)
python -I research/eq_oaf_score.py          # B: USGS's forecasts vs ComCat
python -I research/eq_felt_rates.py         # C: predicted felt rates per city
python -I research/eq_fetch_dyfi.py         # C: all DYFI reports from Thailand
python -I research/eq_felt_validate.py      # C: predicted vs reported
python -I research/eq_felt_future.py        # C: past rate vs the next decade
python -I research/eq_hazard_compare.py     # C: felt ranking vs the 2564 legal zones
python -I research/eq_zones_2564.py         # the 43 provinces' zones from the Royal Gazette PDF
python -I research/eq_spatial.py            # D: smoothed seismicity
```

## 11. Sources

All read 2026-10-24. PR peer-reviewed, OP official/operational, NEWS, OTHER; OA open access.

1. Jordan, T. H. et al. (2011), Operational Earthquake Forecasting: State of Knowledge and Guidelines for
   Utilization, Annals of Geophysics 54(4), doi:10.4401/ag-5350 —
   https://www.annalsofgeophysics.eu/index.php/annals/article/view/5350 — PR, OA.
2. ICEF Final Report (V.14, 30 May 2011) —
   https://rischi.protezionecivile.gov.it/static/b263aeefdd6803efac719b5a4131b912/ICEF_FinalReport_enpdf.pdf — OP, OA.
3. USGS FAQ, "Can you predict earthquakes?" — https://www.usgs.gov/faqs/can-you-predict-earthquakes — OP.
4. Hardebeck, J. L. et al. (2024), Aftershock forecasting, Annu. Rev. Earth Planet. Sci. 52:61–84 —
   https://pubs.usgs.gov/publication/70256158 — PR.
5. Reasenberg, P. A. & Jones, L. M. (1989), Science 243:1173–1176, doi:10.1126/science.243.4895.1173 — PR, paywalled
   (abstract via Crossref).
6. Page, M. T. et al. (2016), BSSA 106(5):2290–2301, doi:10.1785/0120160073 —
   https://pubs.usgs.gov/publication/70177935 — PR, closed (values used from [38]).
7. Zhu (2026), arXiv 2607.24109, Tables S2–S3 — https://arxiv.org/html/2607.24109v1 — OTHER (preprint), OA; used only
   as a cross-check of [38].
8. USGS, Aftershock forecast background — https://earthquake.usgs.gov/data/oaf/background.php — OP.
9. USGS, Aftershock forecast overview — https://earthquake.usgs.gov/data/oaf/overview.php — OP.
10. van der Elst, N. J. et al. (2022), SRL, doi:10.1785/0220210222 —
    https://www.usgs.gov/publications/prospective-and-retrospective-evaluation-us-geological-survey-public-aftershock — PR.
11. USGS ComCat event us7000pn9s and its "oaf" product —
    https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=us7000pn9s&format=geojson — OP (data).
12. GeoNet, Canterbury aftershock forecast — https://www.geonet.org.nz/earthquake/forecast/canterbury — OP.
13. Marzocchi, W., Lombardi, A. M. & Casarotti, E. (2014), SRL 85(5):961–969, doi:10.1785/0220130219 — PR
    (metadata only).
14. JMA, "余震とは" — https://www.jma.go.jp/jma/kishou/know/jishin/aftershocks/index_whats_aftershock.html — OP.
15. HERP column on the 19 Aug 2016 report — https://jishin.go.jp/resource/column/16aut_p10/ — OP.
16. JMA, Earthquakes and tsunamis (Activities) — https://www.jma.go.jp/jma/en/Activities/earthquake.html — OP.
17. JST Science Portal, 9 Dec 2025 — https://scienceportal.jst.go.jp/stories/20251209_g01/ — NEWS.
18. Schorlemmer, D. et al. (2018), SRL 89(4):1305–1313 — https://central.scec.org/node/37257 — PR.
19. GEM Global Seismic Hazard Map — https://www.globalquakemodel.org/product/global-seismic-hazard-map — OP.
20. GEM South-East Asia hazard model documentation — https://hazard.openquake.org/gem/models/SEA/ — OP, OA.
21. USGS, Thailand seismic hazard workshop 2007 —
    https://www.usgs.gov/programs/earthquake-hazards/science/thailand-seismic-hazard-workshop-2007 — OP
    (the hazard report itself not retrieved).
22. กฎกระทรวงกำหนดการรับน้ำหนัก ความต้านทาน ความคงทนของอาคาร และพื้นดินที่รองรับอาคารในการต้านทานแรงสั่นสะเทือนของ
    แผ่นดินไหว พ.ศ. ๒๕๖๔, Royal Gazette vol. 138 part 16 ก pp. 13–14 (PDF SHA-256 67989bf6…d838b) —
    https://ratchakitcha.soc.go.th/documents/17159461.pdf — OP.
23. DPT standard มยผ. 1301/1302-61 — https://www.dpt.go.th/th/dpt-standard/854 — OP (did not load).
24. Ornthammarath, T. et al. (2011), Bull. Earthquake Eng. 9:367–394, doi:10.1007/s10518-010-9197-3 —
    https://unipv.unifind.cineca.it/resource/item/60493 — PR (abstract).
25. Foytong et al. (2020), KSCE J. Civil Eng. 24(6):1845–1857, and a 2012 Chulalongkorn study — snippets only
    **[unverified]**.
26. DMR, active-fault dataset — https://data.dmr.go.th/dataset/zone-acttivefault — OP, open licence.
27. Goldberg, D. E. et al. (2025), Science 390:458–462, doi:10.1126/science.ady3581 —
    https://pubs.usgs.gov/publication/70272081 — PR.
28. García, D. et al. (2012), BSSA 102(1):185–203, doi:10.1785/0120110124 (the tectonic regionalization behind
    [38]'s regime table) — PR (metadata only).
29. Vigny, C. et al. (2003), JGR 108(B11), doi:10.1029/2002JB001999 —
    https://www.isterre.fr/IMG/pdf/sagaing-JGRnov2003.pdf — PR, author copy.
30. Steckler, M. S. et al. (2016), Nature Geoscience 9:615–618, doi:10.1038/ngeo2760 — PR, paywalled (snippet).
31. Pananont, P. et al. (2017), JGR 122:6367–6388 —
    https://pure.psu.edu/en/publications/seismotectonics-of-the-2014-chiang-rai-thailand-earthquake-sequen/ — PR.
32. USGS ComCat, 2019-11-20 Sainyabuli events (us70006ara) — OP (data).
33. Jankaew, K. et al. (2008), Nature 455:1228–1231 — https://pubs.usgs.gov/publication/70030484 — PR.
34. Google, Android Earthquake Alerts — https://support.google.com/android/answer/9319337?hl=en and ?hl=th — OP;
    Brand Buffet, 18 Jul 2022 —
    https://www.brandbuffet.in.th/2022/07/google-launched-android-earthquake-alerts-system-in-thailand/ — NEWS;
    Google blog, 15 Oct 2026 —
    https://blog.google/products-and-platforms/platforms/android/android-earthquake-alerts-expansion-2026/ — OP.
35. The Nation, 29 Mar 2025 — https://www.nationthailand.com/news/general/40048026 — NEWS; AFP via Arab News,
    23 Apr 2025 — https://www.arabnews.pk/node/2598118/world — NEWS; Thai PBS, 15 Jan 2026 —
    https://www.thaipbs.or.th/news/content/501096 — NEWS.
36. USGS, "ShakeAlert Is Not Earthquake Prediction" — https://www.usgs.gov/media/images/shakealert-not-earthquake-prediction — OP.
37. PNSN, Earthquake Prediction — https://pnsn.org/education/seismology/earthquake-prediction — OTHER (regional
    seismic network, no date on the page).
38. USGS operational aftershock code, opensha/opensha-oaf (CC0-1.0), commit fdfbaef163f3355201a8df5a56b8bbffaaaf24a5 —
    https://github.com/opensha/opensha-oaf — OP (code and parameter files, copied to `research/data/eq_opensha_oaf/`).
39. TMD earthquake site — https://earthquake.tmd.go.th/ and https://tmd.go.th/info/แผ่นดินไหว — OP.
40. AHA Centre, Situation Update No. 10 (M7.7 Mandalay, 23 Apr 2025) —
    https://ahacentre.org/situation-update/situation-update-no-10-m7-7-mandalay-earthquake-23-april-2025/ — OP.
41. OpenQuake hmtk, Gardner–Knopoff windows —
    https://raw.githubusercontent.com/gem/oq-engine/master/openquake/hmtk/seismicity/declusterer/distance_time_windows.py — OP (code).
42. Methods cited by name, not re-read: Aki (1965), Utsu (1965), Shi & Bolt (1982), Gardner & Knopoff (1974),
    Wiemer & Wyss (2000), Woessner & Wiemer (2005), Wells & Coppersmith (1994), García et al. (2012), Frankel (1995),
    Ogata (1988), Allen, Wald & Worden (2012).

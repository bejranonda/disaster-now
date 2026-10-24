# Could FloodWatch have warned Hat Yai 4–6 h ahead? An independent check (24 Oct 2026)

The owner: *"We are trying to let flood.autobahn.bot forecast the Hat Yai incident 4–6 hours in advance. You can check
again."* This is an independent re-check of FloodWatch's own replay (`flood2026-research` at `4d700de`,
`research/2026-10-24_hatyai_2025_replay.py/.log`, KNOWLEDGE §110, KI-545, KI-546), with the river data re-read from
ThaiWater, the rain from NOAA's copies of TMD's reports, and RID's 40-year annual maxima for the out-of-sample test.
It also answers which FloodWatch fields this page's collector should read, how an "upstream water is coming" line
could be worded, and what FloodWatch could change. Nothing on the page or in FloodWatch was changed.

**Rules followed** (AGENTS §5, GUIDELINES §1, §7): every number below comes from a script in `research/fwhy_*.py`
(logs in the session scratchpad, §9), FloodWatch's own log, or a cited source; **[unverified]** marks what isn't
confirmed; a rule chosen after looking at Nov 2025 is marked **post-hoc**; the city's flag criteria and FloodWatch's
status steps were fixed before Nov 2025, so testing them on that event is fair. All times are Bangkok (ICT).

## 0. In brief: the direct answers

**Q1. Could FloodWatch, as it stands today, have warned Hat Yai city 4–6 h ahead?** It depends on what "warned" and
"the flood" mean, and the honest answer has three parts.

1. **The U-Taphao reaching the bank at X.44 (7.15 m, FloodWatch's bank; 22 Nov 12:00): yes, from its measured parts,
   not its forecast.** FloodWatch's own status step "warning" (90 % of the bank depth) came **7 h** before, "watch"
   (70 %) **17 h** before, and its "⚠️ จับตา" upstream group (X.44 at watch and X.90 up ≥ 30 cm in 24 h) would have
   listed X.44 from the same hour, **17 h** before. Its **forecast as served** said "chance of reaching the bank > 25 %"
   only **1–2 h** before (the silent-gauge fault, KI-545); with that fault fixed, **5–6 h** (event left out of
   training). Re-read from ThaiWater, every crossing in FloodWatch's replay table is right to the hour.
2. **The city's first flooding (hill runoff from Kho Hong into the eastern communities, from 21 Nov 15:00 per DWR; the
   night of 21 Nov per RID): no river gauge gave any lead.** X.44 was at 4.0 m (67 % of the bank depth) at 15:00 and
   reached "watch" 4 h later. Only **measured rain** led it: Hat Yai airport's 72-h total passed **300 mm (the city's own
   red-flag criterion) at 12:00, 3 h before**; 250 mm at 09:00 (6 h); its 24-h total passed 150 mm at 06:00 on 20 Nov
   (33 h).
3. **The deadly second wave (X.44 over RID's 8.68 m at 24 Nov 16:00; 9.97 m on 25 Nov 10:00):** timing wasn't the
   problem, the size was. The river had been over FloodWatch's bank since 22 Nov; X.173A at Sadao passed the city's
   16.4 m criterion **30 h** before 8.68 and kept rising to 18.00 m, while FloodWatch's 24-h path at X.44 said 7.92 m
   on 24 Nov 06:00 (the river reached 9.91). What was missing is a line saying **"upstream is still rising: more is
   coming"**.

**How much more lead is reachable** (§3–§4):

| Source of lead | Nov 2025 (to X.44 ≥ 7.15) | Nov 2024 (to X.44 ≥ 7.15) | Tested on other seasons? |
|---|---|---|---|
| (a) Upstream travel time alone, Sadao (X.173A) → city | **−4 h** (the city crossed first) at the bank; 6–13 h by rises; 8 h peak to peak | +31 h at the bank; 1–6 h by rises; 25 h peak to peak | yes (season scale): X.173A over its bank in 4 of 17 quiet seasons |
| (a) X.90 (10 km above the city) at the city's red 9.30 m | **+5 h** | +17 h | yes: 5 of 5 floods, 2 near-miss seasons in 30 |
| (b) FloodWatch's forecast as served / with KI-545 fixed | **+1–2 h / +5–6 h** (bands > 25 %) | not replayed | no (FloodWatch's replay is one event) |
| (b) a simple model with upstream **levels** and **measured rain** (this study, trained on 2024–25) | **+13 h** (+9 h with a 4-h data delay) | in its training | one event out of sample: illustrative only |
| (c) Measured rain, Hat Yai airport 72 h ≥ 300 mm (city red) | **+24 h** | +24 h | yes: 3 of 5 floods, 1 near-miss season in 37 (2005 missed at 272 mm; 2000 a data gap) |
| (c) Measured rain, 72 h ≥ 250 mm | +27 h | +39 h | 4 of 5 floods, same 1 near-miss season (250 was not pre-registered: in-sample) |

**The catch nobody's replay shows: data delay.** Every lead above assumes RID's hourly readings arrived on time. On
24 Oct 2026 (20:28 UTC), RID's gauges in the south reached FloodWatch with a **median age of 28 h (the freshest tenth
4.5 h)**; X.44, X.90, X.173A and X.174 were 4.5 h old. A 4-h delay turns the 7-h "warning" step into ~3 h, and FloodWatch's
point check for Hat Yai (`/api/point`) already falls back to SLA002, 8.3 km upstream (§2.4). HII's own 10-minute
gauges (SLA003 at Sadao, SLA002 at Bang Sala) arrive in ~20 min, but SLA002 was silent 19–23 Nov 2025.

**Q2. What the collector should read** (§5): `/api/stations` (2.47 MB raw, 239 KB gzip, `max-age=60`, no ETag;
levels every 10 min, forecasts every 30 min, upstream links daily), plus `/api/risks` for the groups and their
30-day records. The 0.6.0 `floodwatch.json` already has the right core (212 KB raw, 63 KB gzip on today's copy). Add
**bank, twin, the 24-h fit quality, and the 12-h outlook**, and drop unusable upstream links at the collector
(24 % of the 1,075 links have a lag under 3 h): 271 KB raw, 78 KB gzip.

**Q3. The "upstream water is coming" line** (§6): three lines, all sourced to FloodWatch, a range not a countdown
("ภายในราว {2×lag} ชม. หรือเร็วกว่านั้น"), never above เตรียมตัว by themselves. Upstream at or over its bank and rising
→ เตรียมตัว (at Hat Yai: 5 of 5 floods, 5 near-miss seasons in 30, X.44 then at 79–99 % of its bank depth); upstream
at ≥ 90 % and rising → ติดตามไว้; the city gauge already over its bank and upstream still rising → "อาจสูงขึ้นอีก".
Say nothing when the upstream reading is over 3 h old or flagged, the link's lag is under 3 h or at the 48-h search
limit, the upstream gauge is the twin or over 50 km away, or the rise is a single reading (X.174 read 24.02 m for 2 h
on 10 Feb 2025).

**Q4. To FloodWatch** (§7, frankly): fix KI-545 first; add upstream levels and measured basin rain to the model and
test them on 2024 and 2025 (Q117); show the city's own flag criteria; flag late RID data and count it in the lead;
replay "as received", not "as backfilled"; sanity-check the learned links (twins at the same place get 1–4 h "lags",
X.174's "upstream" gauges are 85–107 km away in other catchments); give the over-the-bank group a "still rising upstream"
flag; don't merge SLA003 and X.173A (a 1.9 m datum offset: SLA003's bank equals X.173A at 88 %).

## 1. Method and data

| Data | What | Where from | Calls |
|---|---|---|---|
| River levels, Nov 2025 | hourly X.44, X.90, X.173A, X.174 (RID) and 10-min SLA003 (HII), 12 Nov – 3 Dec 2025 | ThaiWater `waterlevel_graph` (ids 2591, 2589, 2585, 2590, 855) | 5 |
| River levels, 2024–25 | X.44 for 20 Nov – 6 Dec 2024; one year (1 Oct 2024 – 1 Oct 2025) of X.44, X.90, X.173A, X.174 | the same endpoint: it answers one year ending at `end_date` (a 4-year request returned only the last year) | 5 |
| Rain, hourly | rolling 24-h totals (`precipitation_24_hour`) at Hat Yai airport 48569, Kho Hong 48571, Sadao 48574, 2024–2025 | NOAA NCEI GHCNh files already in the scratchpad (the hindcast's downloads) | 0 |
| Rain, daily, 1973 – Aug 2025 | Hat Yai airport, TMD rain day | GHCN-Daily TH000048569 (scratchpad) | 0 |
| Annual maxima | X.44 1986–2025, X.90 1988–2025, X.173A 2006–2025, X.174 1989–2025 | RID, `WL_Max_Songkla.pdf` (saved copy) | 0 |
| Banks | X.44 7.40, X.90 9.53, X.173A 16.13, X.174 8.88 m MSL | RID's field report on the Songkhla Lake basin, 20–25 Jan 2568 (saved copy) | 0 |
| City criteria | yellow: X.90 8.00 m for 6 h, basin rain > 100 mm/day; red: X.90 9.30 m, X.173A 16.4 m, 300 mm in 3 days or 200 mm/day | hatyaicityclimate.org/paper/620 (saved copy) | 0 |
| FloodWatch | `/api/health` ×2, `/api/stations`, `/api/stations/X.44?days=3`, `/api/point?lat=7.00&lon=100.47`, `/api/stations?scope=focus`; the 20:15 UTC copies; the repository | flood.autobahn.bot, honest User-Agent | 6 |

- **ThaiWater: 10 calls, the limit, 3–5 s apart** (log `<scratch>/agentA/tw/calls.log`); no 429.
- **Cross-checks.** ThaiWater's hourly peaks equal RID's annual maxima: X.44 9.97 (2025) and 7.26 (2024), X.173A
  18.00 and 16.83, X.90 10.20 (2024); X.174 10.14 hourly against RID's 10.24 (2024). X.90's 2025 record stops at
  12.18 m on 24 Nov 23:00 (61 hours missing); RID's annual maximum is 13.04 m on 25 Nov, hour unknown.
- **Status steps** are FloodWatch's `classify_status`: % of the height from its "ground" to its bank (X.44: 70 % =
  4.34 m, 90 % = 6.21 m).
- **Travel times** three ways: the hour each gauge crossed the same kind of threshold; peak to peak; and the
  cross-correlation of 3-h rises over the event window (lags 0–30 h; the plateau within 0.05 of the best r is printed,
  because the best lag alone is noise).
- **Events at X.44** (several, because "the bank" has three values): **E0** city flooding from the Kho Hong hills,
  21 Nov 15:00 (DWR's 22 Nov report via FloodWatch's sources file; RID via Naewna: "the night of 21 Nov"); **E1** X.44
  ≥ 7.15 (ONWR's bank, FloodWatch's), 22 Nov 12:00; **E2** ≥ 7.40 (RID's field report, the city's), 22 Nov 13:00;
  **E3** ≥ 7.40 again on the second wave, 23 Nov 22:00; **E4** ≥ 8.68 (RID's hydro table), 24 Nov 16:00; **E5** peak
  9.97 m, 25 Nov 10:00. (The white paper's "X.44 over its bank 24 Nov 01:00–06:00" matches none of the three banks;
  X.44 read 7.5–7.9 m then.)

## 2. Results: the river, Nov 2025 and Nov 2024

### 2.1 The hydrographs (every 6 h; m MSL; rain at Hat Yai airport, rolling, mm)

| Time | SLA003 | X.173A | X.90 | X.174 | X.44 | 24 h rain | 72 h rain |
|---|---|---|---|---|---|---|---|
| 20 Nov 00:00 | 14.22 | 11.89 | 2.79 | 5.61 | 1.95 | 114 | 116 |
| 20 Nov 12:00 | 15.04 | 13.22 | 4.00 | 6.51 | 2.58 | 168 | – |
| 21 Nov 00:00 | 16.04 | 14.03 | 5.06 | 6.63 | 2.99 | 66 | 182 |
| 21 Nov 12:00 | 16.46 | 14.47 | 5.94 | 7.74 | 3.66 | 131 | 305 |
| 21 Nov 18:00 | 16.85 | 14.80 | 6.88 | 8.85 | 4.30 | 213 | 401 |
| 22 Nov 00:00 | 17.11 | 15.23 | 8.27 | 10.72 | 5.42 | 327 | 507 |
| 22 Nov 06:00 | 17.63 | 15.66 | 9.21 | 10.78 | 6.46 | 354 | 541 |
| 22 Nov 12:00 | 18.04 | 16.03 | 9.80 | 10.41 | **7.22** | 352 | 651 |
| 23 Nov 00:00 | 18.02 | 16.16 | 10.09 | 10.25 | 7.91 | 190 | 583 |
| 23 Nov 18:00 | 19.22 | 17.19 | 10.11 | 8.98 | 7.30 | 79 | 579 |
| 24 Nov 06:00 | 19.29 | 17.36 | 11.16 | 9.98 | 7.90 | 140 | 666 |
| 24 Nov 18:00 | 19.69 | 17.85 | 11.99 | 11.05 | 8.87 | 233 | 599 |
| 25 Nov 06:00 | 19.62 | 17.84 | – | 11.77 | 9.91 | 260 | 572 |

Two waves at X.44: 7.91 m (22 Nov 23:00), down to 7.30 m (23 Nov 18:00), then 9.97 m (25 Nov 10:00). Khlong Wa (X.174)
peaked first (11.08 m, 22 Nov 03:00) and over its bank from 21 Nov 19:00. Upstream at Sadao the river had no first-wave
peak: it rose for five days.

### 2.2 Threshold crossings (first hour; equal to FloodWatch's replay table where it lists them)

| Gauge | 70 % | 90 % | ONWR bank | City red | RID field bank | RID hydro bank |
|---|---|---|---|---|---|---|
| SLA003 (HII, Sadao; bank 16.59) | 20 Nov 09:00 | 21 Nov 00:00 | 21 Nov 15:00 | – | – | – |
| X.173A (RID, Sadao; 16.13) | 20 Nov 04:00 | 21 Nov 20:00 | 22 Nov 16:00 | 16.4: 23 Nov 10:00 | (16.13) | 16.96: 23 Nov 16:00 |
| X.90 (Bang Sala; 9.34) | 21 Nov 14:00 | 22 Nov 01:00 | 22 Nov 08:00 | 9.30: 22 Nov 07:00 | 9.53: 22 Nov 10:00 | 11.25: 24 Nov 08:00 |
| X.174 (Khlong Wa; 8.88) | 20 Nov 04:00 | 21 Nov 13:00 | 21 Nov 19:00 | – | (8.88) | 11.22: 24 Nov 20:00 |
| X.44 (city; 7.15) | 21 Nov 19:00 | 22 Nov 05:00 | **22 Nov 12:00** | – | 7.40: 22 Nov 13:00 | 8.68: 24 Nov 16:00 |
| **Nov 2024**: X.173A / X.90 / X.44 | 27 Nov 02:00 / 09:00 / 16:00 | 27 Nov 12:00 / 19:00 / 28 Nov 19:00 | 28 Nov 01:00 / 28 Nov 15:00 / **29 Nov 08:00** | 28 Nov 03:00 / 15:00 / – | – / 17:00 / never | never |

In 2024 X.44 peaked at 7.26 m: over FloodWatch's 7.15, **never over RID's and the city's 7.40**. Whether 2024 counts
as a flood depends on whose bank you use.

### 2.3 Travel times: FloodWatch's `lag_h` against the hydrographs

| Link | FloodWatch `lag_h` | 2025: best lag [plateau] of 3-h rises | 2024 | Peak to peak | Bank to bank |
|---|---|---|---|---|---|
| SLA003 → X.173A (same reach, ~3 km [unverified]) | 4 | 2 [0–4] | – | 3 h (2025) | – |
| X.173A → X.90 | 7 | 5 [2–9] | 4 [1–7] | 15 h (2024) | −8 h (2025), +14 h (2024) |
| SLA003 → X.90 | 12 | 7 [4–10] | – | – | – |
| X.90 → X.44 | 6 | 6 [0–9] | 0 [0–3] | 10 h (2024); ≥ 11 h (2025, X.90 then silent) | **+4 h** (2025), +17 h (2024) |
| X.173A → X.44 (not a FloodWatch link) | – | 9 [6–13] | 4 [1–6] | 8 h (2025), 25 h (2024) | **−4 h** (2025), +31 h (2024) |
| X.174 → X.44 | 7 | 0 [0–3] | – | – | +17 h (2025) |
| SLA002 → X.44 (SLA002 is X.90's twin) | 11 | silent | – | – | – |
| SLA007 → X.44 (Bang Klam, another canal) | 1 | not fetched | – | – | – |

- **The links are statistical, not routed** (FloodWatch `forecast/upstream.py`: the lag of 1–48 h at which a gauge's
  24-h change best correlates with the target's, over its whole record). Some land inside the measured plateaus
  (SLA003 → X.173A, X.173A → X.90), others outside (SLA003 → X.90 12 h against 4–10; X.174 → X.44 7 h against 0–3;
  X.90 → X.44 6 h against 0–3 in 2024). The plateaus are wide, the same place gets two lags (X.90 6 h, its twin SLA002 11 h), twins get "lags" of 1–4 h, and
  X.174's two "upstream" gauges (X.276, 1 h; MOU510, 7 h) are 107 and 85 km away in other catchments.
- **Upstream gives hours, and in 2025 not even that at the bank.** The rain fell on the whole basin (Hat Yai airport
  370 mm on 21 Nov): the city gauge crossed its bank 4 h *before* X.173A did. In 2024 the order was upstream first, a
  day apart. A travel time is a range that changes with where the rain falls.
- **SLA003 and X.173A are not one gauge.** SLA003 reads 1.93 m higher than X.173A (median over 399 hours; 1.77–2.10),
  so SLA003 over its ONWR bank (16.59) is X.173A at 14.61 m, 88 % of its bank depth. RID's field report puts X.173A at
  6.823 N 100.438 E; ThaiWater (and FloodWatch) give X.173A SLA003's coordinates. "Over the bank at Sadao" was true on
  21 Nov 15:00 for one and on 22 Nov 16:00 for the other.

### 2.4 Data delay, today

- `/api/stations` at 20:28 UTC: RID's 157 southern gauges (they reach FloodWatch through HII's feed) had a **median
  age of 1,708 min (28 h)**, the freshest tenth 268 min (4.5 h), all stale (> 180 min); HII's own 68 southern gauges a
  median of 18 min. The 20:15 copy gave the same picture (1,691 and 251 min).
- X.44's forecast was issued at **16:00 UTC, its last reading**, though the run was at 19:49: every horizon counts from
  the reading, so a "6-h" outlook from a 4-h-old reading reaches 2 h past now.
- `/api/point?lat=7.00&lon=100.47` (Hat Yai) answered with **SLA002, 8.3 km away, "far"**, and SLA007 (10 km): X.44 and
  X.174, 1.5–2.5 km away, were left out as stale. In an event with RID late and SLA002 silent (as on 19–23 Nov 2025),
  the city would have no fresh gauge at all.
- Whether RID's readings reached HII on time in Nov 2025 is **[unverified]**: FloodWatch's record of the event is its
  2026 backfill (`hii_graph`), not what was available hour by hour.

## 3. Results: the lead of each signal (hours before the event; negative = after)

### 3.1 Nov 2025

| Signal (fired) | Before E0 (city, 21 Nov 15:00) | E1 (7.15) | E2 (7.40) | E4 (8.68) | Fixed before Nov 2025? |
|---|---|---|---|---|---|
| X.44 at 70 % "watch" (21 Nov 19:00) | −4 | **+17** | +18 | +69 | yes (FloodWatch) |
| X.44 at 90 % "warning" (22 Nov 05:00) | −14 | **+7** | +8 | +59 | yes |
| X.44 1.5 m under 7.40 (city yellow, 2016 leaflet) (22 Nov 03:00) | −12 | +9 | +10 | +61 | yes |
| FloodWatch "upstream" group at X.44 (21 Nov 19:00) | −4 | **+17** | +18 | +69 | yes |
| X.174 over its bank (21 Nov 19:00) | −4 | +17 | +18 | +69 | yes |
| X.90 at 8.00 m for 6 h (city yellow) (22 Nov 04:00) | −13 | +8 | +9 | +60 | yes |
| X.90 at 90 % (22 Nov 01:00) | −10 | +11 | +12 | +63 | yes |
| X.90 ≥ 9.30 (city red) (22 Nov 07:00) | −16 | **+5** | +6 | +57 | yes |
| X.173A at 90 % (21 Nov 20:00) | −5 | +16 | +17 | +68 | yes |
| X.173A over its bank (22 Nov 16:00) | −25 | −4 | −3 | +48 | yes |
| X.173A ≥ 16.4 (city red) (23 Nov 10:00) | −43 | −22 | −21 | **+30** | yes |
| SLA003 at 90 % (21 Nov 00:00) | +15 | +36 | +37 | +88 | **post-hoc**: fires every season (§4.1) |
| Hat Yai airport 24 h ≥ 150 mm (20 Nov 06:00) | **+33** | +54 | +55 | +106 | no (tested in §4.2) |
| Hat Yai airport 24 h ≥ 200 mm, city red (21 Nov 18:00) | −3 | +18 | +19 | +70 | yes |
| Hat Yai airport 72 h ≥ 250 mm (21 Nov 09:00) | **+6** | +27 | +28 | +79 | no |
| Hat Yai airport 72 h ≥ 300 mm, city red (21 Nov 12:00) | **+3** | **+24** | +25 | +76 | yes |
| Kho Hong 72 h ≥ 250 mm (20 Nov 13:00) | +26 | +47 | +48 | +99 | no (no long Kho Hong record here for the season test) |
| Sadao 72 h ≥ 250 mm (22 Nov 07:00) | −16 | +5 | +6 | +57 | no |

### 3.2 Nov 2024 (to X.44 ≥ 7.15 on 29 Nov 08:00; it never reached 7.40)

X.44 70 % +40 h · X.44 90 % +13 h · X.90 8.00 m for 6 h (city yellow) +35 h · X.90 ≥ 9.30 (city red) +17 h · X.173A
90 % +44 h · X.173A over its bank +31 h · X.173A ≥ 16.4 (city red) +29 h · Hat Yai airport 24 h ≥ 150 mm +51 h, ≥ 200 mm
+45 h, 72 h ≥ 250 mm +39 h, ≥ 300 mm +24 h · Sadao 72 h ≥ 300 mm +23 h.

### 3.3 FloodWatch's forecast, as its replay reconstructs it (re-read from its log)

"Chance of reaching the bank" bands, hours of notice before X.44 reached 7.15 (first shown / shown without a break are
equal unless noted). FloodWatch lists a gauge as "may reach the bank" only at > 50 % and 25–50 % (`risks.BANDS`); its
own 30-day record: > 50 % came true 65 % of 459 times, 25–50 % 14 % of 383 (24-h window).

| X.44, bank 7.15 (22 Nov 12:00) | > 50 % | 25–50 % | 5–25 % |
|---|---|---|---|
| As served (SLA002 silent → "no change" methods, KI-545) | 1 | 2 (3 within 72 h) | 5 (6) |
| Refitted without SLA002, event left out (the fair test) | 5 | 6 | 7 |
| Same, record only from 30 Sep 2025 ("C") | 9 | 10 | 10 |
| Event in the training (a ceiling, not a test) | 14 | 15 | 16 |
| X.44, RID's 8.68 (24 Nov 16:00), as served / without SLA002 | 1 (72 h only) / 3 | 1–4 / 4 | 7–9 / 6–9 |
| X.90, 9.34 (22 Nov 08:00), as served / without SLA002 | 2 / 7 (held 1) | 2–3 / 7 (held 1–3) | 5 / 7 (held 1–4) |
| X.173A, 16.13 (22 Nov 16:00), as served | 7 | 8–10 | 15–31 |

- Without SLA002 the 24-h median at X.44 was **1.65 m too low** on average over the rise ("no change" 1.33 m): the
  model has never seen a flood this size and was fed a third of the rain that fell (KI-546).
- **"C" isn't quite "as it stood then":** FloodWatch learns an upstream gauge only after 90 days of pairs; with a
  record from 30 Sep 2025, X.44 would have had no learned upstream gauge in Nov 2025 (and that record is itself a
  one-year backfill made in 2026). "C" uses today's links.

### 3.4 How much a model could add: upstream levels and measured rain (`research/fwhy_route.py`)

Ridge regression of X.44's change over the next h hours, trained on 1 Oct 2024 – 30 Sep 2025 (Nov 2024 the only bank-
high event), tested on Nov 2025 (a later water year). The alarm: the median path reaches the bank within h hours. A
data delay d feeds the model only readings up to t − d.

| Inputs | h | Mean error on the 2025 rise (m, actual − forecast) | Lead before E1, delay 0 / 2 / 4 h | Before E3 (wave 2) | Before E4 (8.68), first / held |
|---|---|---|---|---|---|
| X.44 alone (level, 3 and 6 h change) | 6 / 12 | +0.43 / +0.83 | none / none / none | none | none |
| + X.90 and X.173A levels and 6-h changes | 6 | +0.29 | +1 / none / none | +3 h | none |
| same | 12 | +0.60 | +3 / +1 / none | +1 h | none |
| + Hat Yai airport measured 24 h and 72 h rain | 6 | −0.04 | **+8 / +6 / +4** | +4 h | +4 / +4 |
| same | 12 | +0.06 | **+13 / +11 / +9** | +4 h | +53 / +6 |

- In the training year the 12-h rain model's alarm fired once, at 29 Nov 2024 00:00, 8 h before that crossing (in
  sample): no false alarm, no miss, one event.
- **Read it as an illustration, not a score:** one event out of sample, and the 2025 72-h rain (up to 673 mm) lay far
  beyond the training year's (405 mm, 29 Nov 2024): a linear model extrapolated, and was lucky to extrapolate the right way.
  What it shows is the direction: **upstream levels and measured rain are the inputs FloodWatch's model lacks** (star
  reads upstream gauges only as 24/48-h changes, and rain only as forecast: `forecast/__init__.py`, `star_features`).

## 4. Trigger tests on other seasons

### 4.1 Level triggers against RID's annual maxima (one value per season; Nov 2025 left out)

A trigger "fired" in a season when the gauge's maximum passed its threshold; the event is X.44's maximum ≥ 7.15 m.
False-alarm seasons are certain (X.44 never reached 7.15 that season); hits and misses are exact at the season scale,
but not timed (in every flood season the upstream and city maxima fell within 0–1 day of each other).

| Trigger | Seasons | Floods caught | False-alarm seasons (X.44 max that season) | False-alarm ratio |
|---|---|---|---|---|
| X.90 ≥ 9.30 (city red) | 35 | **5 of 5** | 2: 2009 (6.68), 2011 (7.05) | 0.29 |
| X.90 ≥ 8.00 (city yellow, without the 6-h hold) | 35 | 5 of 5 | 9 | 0.64 |
| X.90 at 90 % | 35 | 5 of 5 | 6 | 0.55 |
| X.173A over its bank 16.13 | 19 | 2 of 2 | 4: 2009, 2011, 2014 (5.42), 2017 (5.62) | 0.67 |
| X.173A ≥ 16.4 (city red) | 19 | 2 of 2 | 2: 2009, 2011 | 0.50 |
| X.173A at 90 % | 19 | 2 of 2 | 12 | 0.86 |
| SLA003 over its bank (≈ X.173A ≥ 14.6, §2.3) **post-hoc** | 19 | 2 of 2 | 13 of 17 quiet seasons | ≈ 0.87 |
| X.174 over its bank | 32 | 3 of 3 | 5: 2008, 2009, 2011, 2017, 2022 | 0.62 |
| X.44 at 70 % | 37 | 5 of 5 | 16 | 0.76 |
| X.44 at 90 % | 37 | 5 of 5 | 4: 1987, 1999, 2009, 2011 | 0.44 |
| **X.90 or X.174 over its bank** (the page's upstream rule at X.44, §6) | 35 | **5 of 5** | 5 of 30 quiet seasons; X.44 then at 79–99 % of its bank depth | 0.50 |

- **Since 2011** (after the 2010 flood and the R.1 canal's widening; the city's page says its criteria changed with
  it): one flood season (2024) in 14; X.90 ≥ 9.30 caught it, with one false-alarm season (2011, X.44 7.05 m, 10 cm short).
- **With RID's 7.40 as the event**, 2024 becomes a false alarm for every trigger: the choice of bank moves the score
  more than the choice of rule.
- The false alarms of the over-the-bank rules are near misses (X.44 at 5.2–7.05 m), not dry seasons: for a "be ready" line that is the right
  kind of error. The channel, the R.1 diversion and possibly the gauge datum changed over these decades [unverified
  how much]; the old seasons are a weaker test than the recent ones.

### 4.2 Rain triggers on 37 seasons (Hat Yai airport, GHCN-Daily rain days, Oct–Jan)

Events: X.44's maximum ≥ 7.15 in 1988, 2000, 2005, 2010 and 2024. A hit is an episode starting 0–7 days before X.44's
maximum date; the lead is in days to the maximum, not to the bank. The record has gaps (every season has ≥ 60 % of
its days; 2000 lacks the days before its peak), so false alarms are lower bounds and a miss may be a gap.

| Trigger | Episodes a season | Floods caught (days before the maximum) | Misses | False-alarm episodes |
|---|---|---|---|---|
| 1-day ≥ 100 mm | 0.62 | 4 (1988 1 d, 2005 2 d, 2010 2 d, 2024 3 d) | 2000 (gap) | 17 |
| 1-day ≥ 150 mm | 0.14 | 3 (1988 1 d, 2010 2 d, 2024 3 d) | 2000 (gap), 2005 | 2 (both 2009) |
| 1-day ≥ 200 mm (city red) | 0.03 | 1 (2010) | 4 | 0 |
| 3-day ≥ 250 mm | 0.16 | **4** (1988 0 d, 2005 0 d, 2010 1 d, 2024 2 d) | 2000 (gap) | **2 (both 2009)** |
| 3-day ≥ 300 mm (city red) | 0.14 | 3 (1988, 2010, 2024) | 2000 (gap), 2005 (272 mm) | 2 (both 2009) |
| 3-day ≥ 400 mm | 0.03 | 1 (2010) | 4 | 0 |

- The city's 300 mm in 3 days is **a priori and holds up**: 3 of 4 floods with data, its only false-alarm season a
  near flood (2009, X.44 6.68 m). 250 mm catches 2005 too, but was picked from five thresholds on this record: treat it
  as in-sample until another season confirms it.
- A real-time rolling 72-h total fires earlier and a little more often than rain-day sums; one gauge is not the basin
  (FloodWatch's GSMaP basin mean for 19–25 Nov was 873 mm; the airport 1,246 mm).

### 4.3 Hour by hour on the 2024–25 year (`research/fwhy_rules.py`)

Over 1 Oct 2024 – 30 Sep 2025 every level trigger of §3.2 and every rain trigger tested hourly (24 h ≥ 150 / 200 mm,
72 h ≥ 250 / 300 mm at three gauges) fired in at most one hydrological episode, Nov 2024 (Sadao's 24 h ≥ 200 mm
never), each followed by X.44 ≥ 7.15 (FloodWatch's upstream group at X.44: +40 h; the page's upstream-over-bank rule: +46 h,
through X.174). The only other "episode" was a **sensor spike**: X.174's hourly values jumped to 10.89 and 24.02 m on 10 Feb 2025
14:00–16:00 and were back at 4.32 m by 18:00. A rule on raw readings fires on it; FloodWatch's QC and a fitted 24-h change should not.

## 5. What the collector should read (Q2)

**Read:** `GET /api/stations` (all gauges) and `GET /api/risks`, server-side, every 15 min, as 0.6.0 does. Don't read
`/api/point` (a visitor's position would leave for a second server, AGENTS §5), `/api/stations/{code}` (one call per
gauge; ≤ 35 days), `/api/rain` (forecast points), or `/api/dwr` (no status).

| Endpoint | Size (24 Oct, 20:28 UTC) | Freshness |
|---|---|---|
| `/api/stations` | 2,468,201 B raw, 238,861 B gzip; 1,408 gauges; `cache-control: public, max-age=60, stale-while-revalidate=300`; no ETag or Last-Modified | levels: `hii_waterlevel` every 600 s (HII data ~10–20 min old); RID hourly, often hours late (§2.4); forecasts: the forecaster every 1,800 s; upstream links and the groups' records daily |
| `/api/risks` | 18.6 KB | rebuilt with the rows; records daily (computed 12:37 UTC) |
| `/api/health` | 8.5 KB, `no-store` | per source: last success, last data time, failures |

**The 0.6.0 file** (`floodwatch.json`, `tools/collect.mjs` `FW_COLS`): code, name, river, lat, lon, status, freeboard,
obs, stale, c24 [dir, median, likely low, likely high, skill, level], rise24 (observed24 cm), group, up [[code, lag]],
qc, pct, agency: 1,374 rows, **211,901 B raw, 63,404 B gzip** from today's copy. Proposed additions (prototyped on the
same copy: **270,590 B raw, 77,560 B gzip**):

| Add | Why (this study) |
|---|---|
| `bank` (m MSL) and `bank_source` | Hat Yai has three banks (7.15 / 7.40 / 8.68); the line must say whose. |
| `twin` (code) | SLA003/X.173A and SLA002/X.90 are listed as each other's "upstream" at 1–4 h; a twin is never upstream. |
| `r2_24` (observed24's fit) | the 10 Feb 2025 spike: a rise counts only with a fit (r² ≥ 0.5, FloodWatch's own CONT rule). |
| `c12` [dir, median, likely low, high, skill] | a 4–6-h question needs the shortest horizon FloodWatch serves. |
| `b24`, `b48` (bands) | for the record-backed "may reach" line only; never printed as a percent (FloodWatch D-077). |
| filter `up` at the collector | keep lag 3–47 h, drop the twin, keep `null` lags only for the Chao Phraya chain (no time shown). Today 254 of 1,075 links are under 3 h and 14 at the 48-h search limit. |
| per-file `fw_version`, `rid_age_p50` | from `/api/health` and the rows: the page can say "RID's gauges are N h late" instead of going quiet. |

Keep the page's rules: the file only while under 2 h old; each gauge only while its reading is under 3 h old; and
count a forecast's horizon from the reading, not from now (§2.4).

## 6. Wording for an "upstream water is coming" line (Q3)

The 0.6.0 page already shows FloodWatch's own upstream group (no level change): *"⬆️ น้ำจากต้นน้ำ: {U} ขึ้น {rise} ซม.
ใน 24 ชม. น้ำจากจุดนั้นมักถึง {G} ({dist}) ในราว {lag} ชม. ช้าหรือเร็วกว่านี้ได้ (FloodWatch) · {record}"*. Keep it, with
three changes: a range instead of "ราว {lag} ชม." (the measured X.90 → X.44 times were 0–11 h for a 6-h lag); a second
line when the city gauge is already over its bank (FloodWatch lists a gauge in one group only, so the upstream group
goes silent exactly in a second wave); and a level only where the evidence carries it.

**Gauges:** G is a gauge that judges the point (the area index's basis). U is in G's FloodWatch `up` list with lag
3–47 h, is not G's twin, lies within 50 km, and its reading is under 3 h old and not flagged. `hi` = 2 × lag, rounded
(it covers every measured X.90 → X.44 time in both years, 0–11 h; X.173A → X.90's 2024 peak-to-peak, 15 h, was just
beyond its 14 h). Two hops (Hat Yai → X.90 → Sadao) only
as information, no level: X.173A over its bank had a 0.67 false-alarm ratio (§4.1).

| Line | When (all of) | Level (a forecast alone tops out at เตรียมตัว) | Thai | English |
|---|---|---|---|---|
| A. Upstream over its bank | U at or over its bank, U's fitted 24-h rise ≥ 30 cm, G under its bank | lift to **เตรียมตัว**: at Hat Yai, 5 of 5 floods and 5 near-miss seasons in 30; elsewhere, until FloodWatch's record for this rule exists, show the line at ติดตามไว้ | ⬆️ ต้นน้ำล้นตลิ่งแล้ว: {U} ({river}) สูงกว่าตลิ่ง {x} ซม. และยังขึ้น ({rise} ซม. ใน 24 ชม.) น้ำจากจุดนั้นมักถึง{G}ภายในราว {hi} ชม. หรือเร็วกว่านั้น (FloodWatch) | ⬆️ Upstream is over its bank: {U} ({river}) is {x} cm over its bank and still rising ({rise} cm in 24 h). Its water usually reaches {G} within about {hi} h, or sooner (FloodWatch) |
| B. Upstream near its bank | U at ≥ 90 % (FloodWatch "warning"), rise ≥ 30 cm, G under its bank | at most **ติดตามไว้** (X.90 at 90 %: false-alarm ratio 0.55) | ⬆️ ต้นน้ำใกล้ล้นตลิ่ง: {U} ({river}) ขึ้น {rise} ซม. ใน 24 ชม. น้ำที่{G}อาจขึ้นตามภายในราว {hi} ชม. (FloodWatch) | ⬆️ Upstream near its bank: {U} ({river}) rose {rise} cm in 24 h; the water at {G} may follow within about {hi} h (FloodWatch) |
| C. More is coming | G at or over its bank (the tile is already ทำทันที from the measurement) and any U still rising ≥ 30 cm in 24 h | no change | ⬆️ ต้นน้ำยังขึ้นอยู่: {U} ขึ้น {rise} ซม. ใน 24 ชม. น้ำที่{G}อาจสูงขึ้นอีก (FloodWatch) | ⬆️ Upstream is still rising: {U} rose {rise} cm in 24 h; the water at {G} may rise further (FloodWatch) |

Add FloodWatch's 30-day record to A and B as now (its upstream group: a ≥ 10-cm rise downstream came true 55 % of
8,215 times); it measures a rise, so A and B say "มักถึง / อาจขึ้นตาม", never "จะล้นตลิ่ง".

**In Nov 2025** (with on-time data): A at X.44 from 21 Nov 19:00, through X.174 (+17 h before E1, 4 h after E0);
B from 21 Nov 13:00 (+2 h before E0, +23 h before E1); C from 22 Nov 12:00 to 25 Nov 17:00, 52 h before X.44 passed
8.68 m. **In Nov 2024:** A +46 h, B +49 h.

**Say nothing about upstream when:**
- U's reading is over 3 h old, flagged (erratic, stuck, hidden values, suspect datum), or the FloodWatch file is over
  2 h old. Missing is never calm: no "ต้นน้ำปกติ", and when G is at ติดตามไว้ or above and every U is late, one muted line
  "ข้อมูลต้นน้ำล่าสุดเมื่อ {age} ชม.ก่อน" instead.
- The link is unusable: lag under 3 h (twins, the same place), 48 h (the search limit: SLA002's "upstream" X.44, which is
  downstream), `null` outside the Chao Phraya chain, U is G's twin, or U is over 50 km away (X.174's MOU510).
- The rise isn't real: a single reading, a fit under r² 0.5, or under 30 cm.
- U is falling: never "ต้นน้ำเริ่มลดแล้ว" as reassurance. Between the 2025 waves X.44 fell 0.6 m (22 Nov 23:00 → 23 Nov
  18:00) before rising 2.7 m more.
- Never a countdown ("ใน 6 ชม."), never a level at the house, never a bank chance as a percent.

## 7. Frank suggestions to FloodWatch (Q4)

1. **Fix KI-545 before anything else.** One silent HII copy (SLA002) turned X.44's and X.90's models into "no change"
   for the whole rise; refitting without it moves X.44's notice from 1–2 h to 5–6 h. Leave twins out of the upstream
   candidates (D-200 already knows SLA002 = X.90).
2. **Give the model what this flood needed, then test it declared (Q117):** upstream *levels* (or position against the
   upstream bank) and 3–6-h changes, not only 24/48-h changes; measured basin rain (HII's rain gauges, which FloodWatch
   already reads every 15 min, and GSMaP), not only forecast rain. A simple model with both gave 9–13 h on Nov 2025
   (§3.4). Test on Nov 2024 and Nov 2025 together, against "no change", with the false alarms of the 2024–25 year.
3. **Show the city's own criteria at X.90 and X.173A** (yellow X.90 8.00 m for 6 h; red X.90 9.30 m, X.173A 16.4 m,
   300 mm in 3 days, 200 mm a day). They are a priori, sourced, and X.90 ≥ 9.30 caught 5 of 5 floods in 35 seasons with
   two near-miss false alarms. And say whose bank X.44's status uses: 7.15 (ONWR), 7.40 (RID's field report, the city),
   8.68 (RID's hydro table); 2024 is a flood by the first only.
4. **Count the data delay in every lead.** Forecasts are issued at the last reading, so the served lead is horizon −
   age; print it. Flag "RID's gauges are N h late" on the gauge and in `/api/point` instead of silently dropping X.44
   for SLA002. Ask HII and RID for the timely X.44 / X.90 feed (or the municipality's own gauges, which it read out at
   08:00 on 22 Nov).
5. **Replay as received.** The 2025 replay uses the 2026 backfill; record each reading's arrival time, and score the
   archive (`forecast_run`, since 26 Sep 2026) as issued.
6. **Sanity-check the learned links.** Twins at one place get 1–4 h; X.90 and its twin get 6 h and 11 h to the same
   gauge; SLA002 lists X.44 (downstream) at the 48-h limit; X.174 lists X.276 and MOU510, 107 and 85 km away in
   other catchments; SLA007 (Bang Klam) leads X.44 by 1 h. A distance cap, a flow-direction check (HII's river lines, bank
   elevation), the correlation `r` and the plateau of lags in the API would let users trust `lag_h`.
7. **Don't merge SLA003 and X.173A.** SLA003 reads 1.93 m above X.173A; its bank (16.59) is X.173A at 88 %. RID puts
   X.173A ~3 km north of SLA003; ThaiWater gives both the same coordinates.
8. **A "still rising upstream" flag in the over-the-bank group.** In the second wave X.44 was over its bank from
   22 Nov while X.173A rose from 16.2 to 18.0 m; the risk tab (one group per gauge) had nowhere to say it.
9. **The first wave has no FloodWatch gauge.** The Kho Hong runoff came down Khlong Rian and Khlong Plee; the nearest
   gauges are X.174 and RID's `ridhydro_TSL39` (upper Khlong Wa, 10.5 km; 40 h old today), plus DWR's early-warning
   stations (STN2062 บ้านพรุ 4.8 km, STN2212 ควนลัง 8.7 km, STN2213 นาหม่อม 6.7 km). Whether any read the hill runoff on
   21 Nov is [unverified]; FloodWatch has the archive to check.
10. **For this page:** a compact `/api/stations?fields=…` or a published snapshot with an ETag would cut ~240 MB a day
    raw (~23 MB gzipped) to a few MB, and a measured-rain file (24/48/72 h per gauge) would replace this page's own ThaiWater reads.

## 8. Sources (all read 24 Oct 2026)

- ThaiWater (HII), `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_graph?station_type=tele_waterlevel&station_id={2591|2589|2585|855|2590}&start_date=…&end_date=…`, 20:21–20:37 UTC, 10 calls (`<scratch>/agentA/tw/`).
- FloodWatch, `https://flood.autobahn.bot/api/health`, `/api/stations`, `/api/stations/X.44?days=3`, `/api/point?lat=7.00&lon=100.47`, `/api/stations?scope=focus`, 20:28–20:40 UTC, 6 calls (`<scratch>/agentA/fwapi/`); copies of `/api/stations`, `/api/risks`, `/api/rain`, `/api/dwr`, `/api/health` from 20:15 UTC (`<scratch>/fwlive/`).
- FloodWatch repository `bejranonda/flood2026-research` at `4d700de` (read-only clone): `research/2026-10-24_hatyai_2025_replay.py`, `.log`, `research/2026-10-24_hatyai_2025_sources.md`; `docs/KNOWLEDGE.md` §110; `docs/KNOWN_ISSUES.md` KI-336, KI-545, KI-546; `src/floodwatch/forecast/upstream.py`, `forecast/__init__.py` (`classify_status`, `bank_chance`, `star_features`), `risks.py`, `api/__init__.py`, `worker.py`.
- RID, annual maximum water levels, Songkhla: http://water.rid.go.th/hyd/WLMax/WL_Max_Songkla.pdf (saved copy `<scratch>/hy/web/rid/`).
- RID Hydrology Division, รายงานภาคสนามพื้นที่ลุ่มน้ำทะเลสาบสงขลา 20–25 ม.ค. 2568 (PDF created 1 Apr 2025; saved copy `<scratch>/hy/web/rid/field_songkhla_2568.pdf`; its URL was not recorded **[unverified]**).
- Hat Yai City Climate, flag criteria (undated; says they changed after R.1 was widened): https://hatyaicityclimate.org/paper/620 (saved copy).
- TEI leaflet by the municipality (2016), the flag colours: https://www.tei.or.th/thaicityclimate/public/cfli-6.pdf (via the hindcast, [S32]).
- DWR, 22 Nov 2025 evening report (hill runoff from 21 Nov 15:00), via FloodWatch's sources file: https://dwr.go.th/uploads/file/statuswater/2025/20251122%2024hr-evening.pdf.
- Naewna, 22 Nov 2025 (RID: overflow into communities from the night of 21 Nov): https://www.naewna.com/local/929711.
- NOAA NCEI GHCNh hourly (by year) and GHCN-Daily (TH000048569): https://www.ncei.noaa.gov/oa/global-historical-climatology-network/hourly/access/by-year/ , https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/ (the hindcast's downloads).
- The event and its warnings: [hatyai-flood-2025-hindcast](hatyai-flood-2025-hindcast.md).

## 9. Reproduce, and what this study could not check

```
nice -n 19 python3 -I research/fwhy_hydro.py    # §2, §3.1–3.2: crossings, travel times, trigger leads (2025, 2024)
nice -n 19 python3 -I research/fwhy_seasons.py  # §4.1–4.2: annual maxima and 37 seasons of daily rain
nice -n 19 python3 -I research/fwhy_route.py    # §3.4: the upstream-level and measured-rain model
nice -n 19 python3 -I research/fwhy_rules.py    # §4.3, §6: the line's rules hour by hour
python3 -I research/fwhy_trim.py <stations.json> <out.json>   # §5: a fuller trimmed shape and its size
```

Shared readers: `research/fwhy_common.py`. Logs: `<scratch>/agentA/logs/fwhy_*-2026-10-24.log`; inputs stay in the
scratchpad (ThaiWater's answers are not re-fetched by the scripts: the 10-call limit is spent).

**Not checked:**
- **Data as available in real time in Nov 2025** (RID's delay then), the biggest unknown behind every lead here.
- **FloodWatch's model itself:** its database isn't reachable from here; §3.3 is its log, re-read, and the crossings
  it rests on were re-derived (§2.2). The rain it was fed (GSMaP, Open-Meteo's earlier runs) was not re-derived.
- **SLA002 and SLA007 in 2025**, SLA003 in 2024, **Kho Hong and Sadao** before 2023 (no long
  record), the **basin-mean rain** for other seasons (only one gauge has the long record), ThaiWater's own rain gauges.
- **Other floods' timing:** annual maxima give one value a season, so the multi-season tests count seasons, not
  episodes, and give no hours.
- **The first wave's gauges** (Khlong Rian, Khlong Plee, upper Khlong Wa, DWR's stations) and the R.1 canal's gates.
- **X.173A's real position and datum** against SLA003 (RID's report and ThaiWater disagree).
- **Real phones:** whether a line like §6 is understood in LINE, at night, in a flood.

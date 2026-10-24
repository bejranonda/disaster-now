# The Hat Yai flood of November 2025: what happened, what this page would have said, and what would warn better (24 Oct 2026)

A case study and hindcast for ภัยรอบบ้าน · Thai Risk. The owner asked: *"At the end of 2568 (2025), Hat Yai suffered a
great flood (มหาอุทกภัย). Deep research how we can provide enough warning and forecasting for this kind of situation,
considering the models we have."*

**Rules followed** (GUIDELINES §1, §7): every number comes from a script in `research/hy_*.mjs` (its log in
`research/logs/hy_*-2026-10-24.log`, its results in `research/out/hy_*.json`) or from a cited source with the date it
was read; anything not confirmed is marked **[unverified]**; a trigger is chosen on one season and scored on others,
against the page's current method; anything chosen after looking at the Hat Yai results is marked **post-hoc**.
Nothing on the page was changed. The page's own functions (`public/js/outlook.js`, `assess.js`, v0.4.0) grade every
hindcast window, so the words below are the words the page would have printed.

## 0. In brief (frank)

1. **What happened.** A low over the Gulf of Thailand and the lower South, on a strong north-east monsoon, stalled
   rain over Songkhla from 19 to 25 Nov 2025. Hat Yai measured **370.2 mm on 21 Nov** (TMD's old record: 219.4 mm, in
   2000) and **1,328.8 mm in November**. The city flooded in two waves, from the eastern hills on the night of 21 Nov and
   down the U-Taphao on 23–25 Nov. X.44 in the city peaked at **9.97 m on 25 Nov**, 2.8 m over its bank and 0.9 m above
   2010. The Ministry of Public Health counted **229 dead in Songkhla, 142 in Hat Yai** (2 Dec).
2. **The warnings.** Songkhla was named 7–8 days ahead (ONWR, TMD, DDPM), but as "heavy to very heavy" rain in a list
   of provinces. TMD kept the worst day at "heavy" until that morning. The first Extreme phone alert came as the water
   arrived, and the evacuation orders came after the river had overtopped. **It was not a failure to warn; it was a
   failure to convey the size and to act on it.**
3. **This page, had it existed** (its own functions on the forecasts as issued): "high chance of heavy rain" for 19 Nov
   from the evening of 17 Nov, two days ahead; orange (เตรียมตัว) from the evening of 19 Nov; red from the **measured**
   rain at about 23:00 on 19 Nov, if a ThaiWater gauge near the point read like the airport. The forecast found the
   right days but **a quarter of the rain**: the ensemble's 3-day median was 113–160 mm against 426–654 mm that fell.
   In the late-November 2024 flood the same method said "low" until the rain had begun.
4. **What would have warned better, tested on three seasons:** nothing beat the page's current pre-warning on the
   disjoint season. A 3-day total and an "anywhere within 40 km" chance raise hits and false alarms together; a basin
   mean warns *less*; ECMWF's extreme index is not open data; GloFAS can't be scored as issued from here (its
   reanalysis does rank 2010 and 2000 as this basin's top floods).
5. **What to do:** keep the cap and the measured escalation, and make the measured path reliable (the collector's
   province files); add the measured 3-day rain; add one honest line on how badly multi-day rain is under-forecast; name
   the official channels. **Wait** on multi-day chance words until another season is scored. **FloodWatch** owns the
   river: it has the U-Taphao gauges, their upstream links and a store that covers Nov 2025; it should replay the event.
6. **A web page someone has to open is not a warning system.** The warning that would have saved lives in Hat Yai
   had to come from the municipality and the province, through Cell Broadcast, sirens and people at the door, early
   enough to move. This page can only make sure that what a family reads agrees with them and shows the water rising.

## 1. What happened

Two research assistants read the agencies' pages, the government's white paper and the news for this study (all read
on 24 Oct 2026). The TMD monthly summary's records, TMD's 16 Nov notice and the white paper's Tables 1 and 2 were
re-read by me from the saved copies. Sources are keyed [S#] and listed in §10.

**The weather.** TMD: a low-pressure area lay over the Gulf of Thailand and the lower South on 19–21 Nov, moved over
the lower Andaman Sea and Malaysia on 22–25 Nov, then to the Strait of Malacca; a strong high (cold air mass) from China
reached the upper South on 21 Nov, so the north-east monsoon over the Gulf and the South was "ค่อนข้างแรง"; a monsoon
trough lay over the lower South on 24–25 Nov [S1][S2][S3]. The low later became tropical cyclone 04B **Senyar**, named
on 26 Nov in the Strait of Malacca (HII [S15]; JTWC put it at 4.7 N 98.4 E on 25 Nov [S39]): Senyar came **after** the
city's worst rain, not before it. Background: La Niña and a negative Indian Ocean Dipole [S2].

**The rain** (TMD's rain day, 07:00 → 07:00, labelled with its first day):

| Station | Value | Previous record (TMD) | Source |
|---|---|---|---|
| Hat Yai (airport) | **370.2 mm** on 21 Nov | 219.4 mm, 21 Nov 2000 (records from 1973) | TMD Nov 2568 summary [S1] |
| Hat Yai, November total | **1,328.8 mm** | 926.9 mm (2000) | [S1] |
| Kho Hong agromet (PSU), November total | 1,238.0 mm | 1,150.0 mm (2000) | [S1] |
| Sadao | 271.5 mm on 24 Nov; November 1,023.3 mm | 174.7 mm (1 Nov 2010); 536.5 mm (2024) | [S1] |
| Municipality, 3 days to 07:00 22 Nov | 595 mm | 497 mm (2000), 516 mm (2010) | Statement 5 [S9] |

The GHCNh records used for the hindcast agree: Hat Yai airport 370.0 mm on 21 Nov, Kho Hong 306.0 mm (TMD's
news list: 306.5 mm at ต.คอหงส์ [S5]); §3.2 has the daily table. RID called it "ฝน 300 ปี" [S6][S7]; no frequency
analysis behind that label was found.

**Two floods in one.** The first wave came on the night of 21–22 Nov from the hills of Kho Hong east of the city,
through Khlong Wa and the Khlong Rian retention basin ("น้ำล้นตลิ่งเข้าท่วมชุมชนตั้งแต่คืนวันที่ 21 พ.ย.", RID via
[S13]; analysis [S30]); water entered the inner city overnight into 22 Nov [S5]. The second wave came down the
U-Taphao from Sadao on 23–25 Nov.

**The rivers** (RID's annual maxima, m above mean sea level [S4]; "flood-onset" is RID's ระดับเริ่มท่วมที่ลุ่มต่ำ,
which equals the bank FloodWatch and this page use):

| Gauge | 2025 peak | 2010 | 2000 | Flood-onset level | Over it at the peak |
|---|---|---|---|---|---|
| X.44 บ้านหาดใหญ่ใน (city) | **9.97 on 25 Nov** | 9.10 | 8.77 | 7.15 | 2.82 m |
| X.90 บ้านบางศาลา | 13.04 on 25 Nov | 11.27 | 10.12 | 9.34 | 3.70 m |
| X.173A บ้านม่วงก็อง (Sadao) | 18.00 on 25 Nov | 17.46 | – | 16.13 | 1.87 m |
| X.174 คลองหวะ | 11.82 on 25 Nov | 10.40 | – | 8.88 | 2.94 m |

The white paper's Table 1 gives the order: X.90 over its bank **22 Nov 08:00**; X.173A **23 Nov 16:00**; X.44 over its
bank in the city **24 Nov 01:00–06:00**; X.44's peak **25 Nov 10:00** [WP]. The R.1 diversion canal, built for
1,200 m³/s after 2010, received about 1,800 m³/s (RID's director [S8]).

**The city's flags** (municipality, as published in 2016 [S32]): green normal; yellow, water less than 1.50 m below the
bank; red, "จะเกิดน้ำท่วม ภายใน 6-30 ชม.ข้างหน้า ให้อพยพเคลื่อนย้ายสิ่งของ"; red with siren, a violent flood within
3–6 h. The basin criteria [S31] include red when X.90 reaches 9.30 m, X.173A 16.4 m, or rain over 300 mm in 3 days or
200 mm in a day. **The rain criterion was met on 21 Nov** (370.2 mm); the red flag for 103 communities came with
Statement 5 on 22 Nov, from data to 07:00 [S9].

**The harm.**
- Depth: 0.5–2.5 m on average in the municipality [S7]; GISTDA's depth model on the 24 Nov radar image, mostly 2–3 m
  and over 4 m in places [S20].
- People: 635,423 affected in Songkhla, 20–23 Nov (provincial disaster office [S29]); the water supply plant was under
  more than 3 m of water [S12]; 89 critical patients were flown out of Hat Yai Hospital [S28].
- Deaths: the counts rose for weeks. The latest official figure found: **267 in the South, 229 in Songkhla, 142 in
  Hat Yai** (Ministry of Public Health, 2 Dec [S25]); 276 in the South by 8 Dec (ADINet via ECHO [S26]). The 2000
  flood killed 30 (the Nation citing DDPM [S33]).
- Money: estimates only, 25 bn baht for Songkhla (KResearch [S35]) to 40 bn for 10 southern provinces (UTCC [S34]).
- Duration: the inner city from the night of 21–22 Nov; RID expected X.44 back under its bank on 27 Nov [S8]; "dry in
  3–5 days" was said on 30 Nov [S24]. An official end date was not found.

## 2. The warnings: who said what, when

T1 = the evening of 21 Nov, when water first entered parts of the city; T2 = 24 Nov 01:00–06:00, when X.44 overtopped
in the city centre. All times Bangkok. [WP] is the white paper (the National Research Council's committee,
"แนวทางการแก้ปัญหาอุทกภัยหาดใหญ่อย่างยั่งยืน", January 2569, hosted at sip-water.com [S44]); its page 37 reproduces
DDPM's own "Timeline การแจ้งเตือนภัย".

| When | Who, channel | What it said | Before T1 / T2 | Source |
|---|---|---|---|---|
| 13 Nov | ONWR, notice 30/2568 | flash-flood watch for the South, 17–22 Nov; 16 Songkhla districts **including Hat Yai** | ~8 d / ~10 d | news [S45][S46] (ONWR's own page timed out) |
| 14 Nov 11:00 | TMD Songkhla centre, notice 1 (59/2568) | heavy to very heavy rain 19–23 Nov, Songkhla among the provinces | ~7 d | [S47] |
| 14, 16 Nov | DDPM, fax to provinces | flash-flood and overflow watch, 17–22 / 17–23 Nov | ~7 d | [WP] p. 37 |
| 16 Nov 05:00 | TMD, notice 3 (342/2568) | per-day table: Songkhla **very heavy (≥ 90.1 mm) 19 and 20 Nov**, only **heavy (35.1–90 mm) 21–22 and 23 Nov** | ~5.6 d | [S48], re-read |
| 16–20 Nov | TMD, notices 4–12, twice a day | the same pattern: the worst day, 21 Nov, kept at "heavy" | 1–5 d | [S49] |
| 19 Nov | ONWR (briefing) | 3-day rain over 200 mm for Songkhla, 18–20 Nov; HII's 48-h list left Songkhla out | ~2.5 d | [S50] |
| 20 Nov 05:30 | DDPM, first Cell Broadcast to Hat Yai, **Information** level | "แจ้งเตือนฝนตก เฝ้าระวังน้ำท่วม ดินโคลนถล่ม" | ~38 h | [WP] |
| 21 Nov 05:00 | TMD, notice 13 (352/2568) | Songkhla **very heavy for 21 Nov**, the same day | ~14 h | [S51] |
| 21 Nov 14:40 | municipality flag at the U-Taphao bridge | green, "สถานการณ์ปกติ" (a reporter saw it) | ~5 h | [S52] |
| 21 Nov 20:11 | DDPM, Cell Broadcast, **Extreme** | "แจ้งเตือนฝนตกแช่ น้ำท่วม ดินโคลนถล่ม เตือนให้อพยพ"; WP: "การสั่งการให้อพยพเป็นอำนาจของท้องถิ่น" | ~T1 / ~53 h | [WP] Table 1, re-read |
| 22 Nov ~08:00 | Hat Yai municipality, Statement 5 | **red flag** for 103 communities: "อพยพเคลื่อนย้ายสิ่งของ และเตรียมเข้าอยู่ในที่ปลอดภัย" | T1 + 12 h | [S9] |
| 22–23 Nov | DDPM, Cell Broadcasts (Extreme 22 Nov 12:16, 14:32; 23 Nov 13:34) | water from the U-Taphao and R.1 "จะเพิ่มสูงขึ้นอีก" at named hours | ~36–12 h to T2 | [WP] |
| 23 Nov 16:00 | (X.173A over its bank) | WP: "น้ำหลากต้นน้ำกำลังลงมา ยังไม่มีเตือนอพยพ" | ~9 h to T2 | [WP] Table 1, re-read |
| 24 Nov | WP; governor | X.44 over its bank: "เริ่มเตือน 'เตรียมอพยพ'", then "ให้อพยพด่วน" 08:00–12:00; the governor orders the high-risk inner city evacuated | T2 and after | [WP]; [S18] |
| 24 Nov 11:07 | ONWR with RID | the first published forecast of X.44 found: 2.0–2.2 m over the bank on 25 Nov | after T2 | [S53] |
| 25 Nov | Cabinet | state of emergency for Songkhla | | [S54] |

- **No TMD notice named Hat Yai or the U-Taphao**, and none used a word above "หนักมาก" (21 national and 14 Songkhla
  notices read): TMD's scale stops at ≥ 90.1 mm, so 100 mm and 370 mm read the same.
- **Everyone's amounts were too low.** WP Table 2 (lead time not stated) for Hat Yai district on 21 Nov: TMD's
  forecast 173 mm, HII's 215 mm, the highest measured 513 mm; HII then over-forecast 23 Nov (508 against 229). WP:
  "คลาดเคลื่อนจากสภาพความเป็นจริงมาก ทั้งในแง่ของปริมาณและเวลาที่เกิด".
- **The phone alerts were vague:** WP: "ข้อความไม่กระชับเป็นภาพกว้าง ไม่ชี้ชัดถึงวิธีปฏิบัติ"; agencies' criteria
  "ไม่เป็นเอกภาพ". DDPM counts 15 Cell Broadcasts to Hat Yai, 7 of them Extreme [WP]. No evidence was found that
  LINE ALERT was used.

**Warning or action?** On the evidence, both, in this order:
1. **Not an absence of warning:** Songkhla was named 7–8 days ahead, Hat Yai district by ONWR on 13 Nov.
2. **A failure of magnitude and specificity:** the worst day was rated "heavy" until its morning; no product said
   "record" or named the city's river before 24 Nov.
3. **Late at the level that matters:** the first Extreme alert came at about T1; the flag was green that afternoon.
4. **The largest failure was action:** the red flag came after the water rose; the upstream gauge overtopped with no
   evacuation warning; the evacuation order came after the river had overtopped in the city. Who could order it was
   disputed (WP: local government; the mayor: a committee had to approve the flag [S55]). The Prime Minister said
   "รัฐบาลก็มีความบกพร่อง" [S56]. A lessons-learned committee's report had not reached the government by 8 Apr 2026
   [S57]; no formal published inquiry into the warning chain was found.

## 3. Hindcast: the page's own rain method

### 3.1 Method

- **Forecasts as issued:** the ECMWF ensemble (control + 50 members, the 51 runs the page reads through Open-Meteo),
  00 UTC runs from the ECMWF open-data archive on Google Cloud (CC BY 4.0), total precipitation per member at 0.25°,
  one byte-range request per field (`research/hy_fetch_ens_tp.mjs`). Only the first ~47 % of each field is fetched:
  the grid starts at 90 N and southern Thailand is reached at 46 % of the message. `research/hy_grib.mjs` decodes it
  and fetches more when needed; a self-test decoded three whole fields both ways and got identical values
  (log `hy_fetch_ens_tp`).
- **Runs:** every day from 14 to 24 Nov 2025 (11 runs, case); the sample of §4; daily runs 21–26 Nov 2024 (a second
  event).
- **The view:** the 00 UTC run read at **19:00 Bangkok the same day** (the run reaches Open-Meteo in the afternoon;
  the exact minute is [unverified]). Windows are differences of the accumulated rain: the tile's next 24 h is
  19:00 → 19:00; "tonight" is 19:00 → 01:00; a calendar day is 01:00 → 01:00 (the page uses 00:00 → 24:00; the
  archive has 3-hourly steps). The page's ensemble call asks for `forecast_days: 4` (`public/js/sources.js`), so a
  72-hour window from tomorrow is inside what the page already downloads.
- **The point:** the 0.25° grid point the page reads for Hat Yai city, **7.0 N, 100.5 E** (Kho Hong 48571 at PSU and
  Hat Yai airport 48569 both fall on it); Sadao's (6.75 N, 100.5 E); the U-Taphao basin mean (six points,
  6.5–7.0 N × 100.25–100.5 E; the basin outline was not read from a shapefile: **[unverified] approximation**); and
  "anywhere within about 40 km" (the largest of the 3 × 3 points around Hat Yai).
- **Observed rain:** NOAA NCEI GHCNh hourly records of TMD stations, turned into the 07:00 → 07:00 Bangkok rain day
  exactly as `research/hz_rain.py` and the earlier validation did (`research/hy_obs.mjs`, `research/data/hy_obs_daily.csv`).
  A forecast day (01:00 → 01:00) overlaps its rain day by 18 h; the 72-hour windows by 66 h. GHCN-Daily (by-station
  files) gave the long records for climatology; for Thai stations it ends on 24 Aug 2025, so it has no 2025 event.

### 3.2 What fell (GHCNh, rain day 07:00 → 07:00 Bangkok, mm)

| Rain day (Nov 2025) | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
|---|---|---|---|---|---|---|---|---|---|---|
| Hat Yai airport 48569 | 0.0 | 3.0 | **155.0** | 47.0 | **370.0** | 140.0 | 144.0 | **262.0** | 128.0 | 36.0 |
| Kho Hong (PSU) 48571 | 1.2 | 6.0 | **210.0** | 78.0 | **306.0** | 141.0 | 106.0 | **286.0** | – | – |
| Sadao 48574 (upper basin) | 0.0 | 7.1 | 74.0 | 14.0 | 174.0 | 154.7 | 268.7 | 272.0 | – | – |
| Phatthalung 48560 | 14.7 | 37.0 | 245.3 | 95.0 | 127.0 | 77.0 | 50.0 | 123.0 | 103.0 | 42.1 |
| Yala 48581 | 0.0 | 7.6 | 72.9 | 35.7 | 92.8 | 188.1 | 347.2 | 320.8 | 123.6 | 60.3 |

- **Totals, 19–25 Nov:** Hat Yai airport **1,246.0 mm** (7 days on record); Kho Hong 1,127.0 mm (6 days; 25 Nov
  missing); Sadao 957.4 mm (6 days); Yala 1,181.1 mm. Largest 3-day totals: Hat Yai airport **654.0 mm** (21–23 Nov),
  Kho Hong 594.0, Sadao 695.4, Yala 856.1 (`hy_obs` log). "–" is a day with no record (Kho Hong and Sadao have none for
  25–27 Nov).
- **Against the long record:** Hat Yai airport's GHCN-Daily file (1973–Aug 2025, with gaps; its values come from
  daily summaries and differ from the SYNOP totals by up to ~20 mm on wet days) has as its largest 1-day total
  364.0 mm (24 Dec 1975), 3-day 517.1 mm (from 11 Aug 1985) and 7-day 596.8 mm. The 2025 event's 370.0 / 654.0 /
  1,246.0 mm exceed all three. In the Oct–Jan seasons of that record, a 3-day total of 350 mm or more happened in 3
  separate episodes in 51 seasons (Nov 1988, 369 mm; Oct 2010, 424 mm; Nov 2024, 365 mm).

| Oct–Jan, 3-day totals | ≥ 150 mm | ≥ 250 mm | ≥ 350 mm |
|---|---|---|---|
| Hat Yai airport (51 seasons): share of 3-day windows | 1.94 % | 0.57 % | 0.08 % |
| Hat Yai airport: separate episodes a season | 0.75 | 0.24 | 0.06 |
| Songkhla 48568 (83 seasons): share of windows | 4.76 % | 1.50 % | 0.42 % |
| Songkhla: separate episodes a season | 1.71 | 0.63 | 0.19 |

### 3.3 What the page would have shown, each evening (Hat Yai point)

The tile is the next 24 h; the table is tonight / tomorrow / the day after (the page's three columns); a forecast alone
tops out at เตรียมตัว. "Fell" is the next rain day at Hat Yai airport / Kho Hong. The measured column is Hat Yai
airport's rolling 24-h rain at 19:00 in GHCNh, a **proxy** for the page's measured-rain line (ThaiWater's own gauges
were not read: this server must not call ThaiWater).

| Run, 19:00 | Tile (next 24 h): level · word · P(> 35) · P(> 90) | Table: tonight / tomorrow / the day after | Pre-warnings | Tomorrow: ensemble median [10–90 %] | Fell tomorrow | Measured 24 h at 19:00 (proxy) |
|---|---|---|---|---|---|---|
| 14 Nov | ยังไม่น่าห่วง · ต่ำ · 0 % · 0 % | ต่ำ / ต่ำ / ต่ำ | none | 4 [2–12] | 3 / 15 | – |
| 15 Nov | ยังไม่น่าห่วง · ต่ำ · 0 · 0 | ต่ำ / ต่ำ / ต่ำ | none | 1 [0–2] | 0 / 25 | 1.0 |
| 16 Nov | ยังไม่น่าห่วง · ต่ำ · 0 · 0 | ต่ำ / ต่ำ / ต่ำ | none | 5 [2–10] | 0 / 1 | 2.2 |
| 17 Nov | ติดตามไว้ · ต่ำ · 10 · 0 | ต่ำ / ต่ำ / **สูง** | ฝนหนัก มะรืนนี้ 40 % | 17 [6–30] | 3 / 6 | 0.2 |
| 18 Nov | ติดตามไว้ · มีโอกาส · 20 · 2 | ต่ำ / มีโอกาส / **สูง** | ฝนหนัก พรุ่งนี้ 40 %; ฝนหนัก มะรืนนี้ 70 %; ฝนหนักมาก มะรืนนี้ 20 % | 29 [13–69] | **155 / 210** | 2.4 |
| 19 Nov | **เตรียมตัว** · สูง · 76 · 14 | ต่ำ / สูง / สูง | ฝนหนัก พรุ่งนี้ 70 %, มะรืนนี้ 60 %; ฝนหนักมาก มะรืนนี้ 20 % | 54 [21–113] | 47 / 78 | 34.6 |
| 20 Nov | เตรียมตัว · สูง · 67 · 16 | ต่ำ / สูง / สูง | ฝนหนัก 70 % / 60 %; ฝนหนักมาก พรุ่งนี้ 30 %, มะรืนนี้ 20 % | 57 [23–139] | **370 / 306** | 144.6 |
| 21 Nov | เตรียมตัว · สูง · 86 · 22 | มีโอกาส / สูง / สูง | ฝนหนัก 70 % / 50 % | 44 [19–89] | 140 / 141 | 244.6 |
| 22 Nov | เตรียมตัว · สูง · 59 · 2 | ต่ำ / สูง / สูง | ฝนหนัก 80 % / 50 % | 50 [31–77] | 144 / 106 | 255.8 |
| 23 Nov | เตรียมตัว · สูง · 80 · 31 | ต่ำ / สูง / สูง | ฝนหนัก 80 % / 50 %; ฝนหนักมาก พรุ่งนี้ 20 % | 54 [28–135] | **262 / 286** | 78.8 |
| 24 Nov | ติดตามไว้ · สูง · 41 · 6 | ต่ำ / สูง / มีโอกาส | ฝนหนัก 50 % / 30 % | 32 [16–69] | 128 / – | 241.8 |

(The 17 Nov tile reads "10" but its word is ต่ำ: 5 of 51 members is 9.8 %, under the 10 % cut. On 24 Nov the tile
is yellow, ติดตามไว้, beside the word สูง (41 %): the chance rule gives "possible" heavy rain only ติดตามไว้, while the
word follows the chance: KI-030 in a real case.)

**The measured path matters more than the forecast:** the rain tile takes the higher of the forecast (capped) and a
gauge within 10 km and 3 h (`assess.js`), and a gauge over 90 mm in 24 h is "ฝนหนักมาก", level 3, **ทำทันที**. Hat Yai
airport's rolling 24-h rain crossed 35.1 mm at 20:00 and **90.1 mm at 23:00 Bangkok on 19 Nov** (`hy_hindcast` log,
section H, and the GHCNh file). If a ThaiWater gauge near the point read about the same, the page would have turned red
that night and stayed red through 25 Nov, about **two days before the worst day (21 Nov)**. That is the page's existing
design working; it needs ThaiWater to answer the visitor's phone (KI-029).

### 3.4 Chance of > 35 mm in the day, by run and day (%), Hat Yai point

`[x]` is on the page's table (tomorrow, the day after); `(x)` is beyond it (d+3 to d+5; not shown on the page).

| Run \ day | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
|---|---|---|---|---|---|---|---|---|---|
| 14 Nov | (0) | (8) | (10) | | | | | | |
| 15 Nov | [0] | (12) | (35) | (53) | | | | | |
| 16 Nov | [0] | [10] | (57) | (53) | (59) | | | | |
| 17 Nov | | [8] | [41] | (53) | (61) | (49) | | | |
| 18 Nov | | | [35] | [67] | (75) | (59) | (43) | | |
| 19 Nov | | | | [69] | [63] | (47) | (47) | (24) | |
| 20 Nov | | | | | [69] | [59] | (35) | | |
| 21 Nov | | | | | | [67] | [51] | (45) | |
| 22 Nov | | | | | | | [84] | [53] | (25) |
| 23 Nov | | | | | | | | [80] | [51] |
| **Fell, 48569 / 48571** | 0 / 1 | 3 / 6 | **155 / 210** | 47 / 78 | **370 / 306** | 140 / 141 | 144 / 106 | **262 / 286** | 128 / – |

The chance of > 90 mm in a day (the page's "ฝนหนักมาก") never passed **31 %** at the point in any run (23 Nov run for
24 Nov; 25 % for 21 Nov from the 20 Nov run).

### 3.5 Amounts: the right days, a quarter of the rain

The ensemble put the wet days in the right place and was far too dry on all of them. Observed rain passed the
ensemble's 90th percentile on every day over 100 mm: 155–210 mm against a median of 29 mm on 19 Nov (18 Nov run), 306–370 mm
against 57 [23–139] mm on 21 Nov (20 Nov run), 262–286 mm against 54 [28–135] mm on 24 Nov.

72 hours from tomorrow (forecast 01:00 d+1 → 01:00 d+4 against the rain days d+1..d+3):

| Run | Point: median [10–90 %], wettest member | P(≥ 150 / 250 / 350 mm), point | Basin mean: median, P(≥ 150 / 250) | Anywhere ≤ 40 km: P(≥ 150 / 250 / 350) | Fell (48569 / 48571 / 48574) |
|---|---|---|---|---|---|
| 15 Nov | 20 [5–40], 63 | 0 / 0 / 0 % | 19, 0 / 0 % | 0 / 0 / 0 % | 3 / 32 / 7 |
| 16 Nov | 64 [35–100], 161 | 4 / 0 / 0 | 46, 0 / 0 | 20 / 2 / 0 | 158 / 217 / 81 |
| 17 Nov | 89 [51–217], 360 | 25 / 6 / 4 | 65, 14 / 4 | 49 / 18 / 8 | 205 / 294 / 95 |
| 18 Nov | 151 [86–295], 521 | **51** / 20 / 2 | 109, 27 / 10 | **88** / 47 / 22 | **572 / 594 / 262** |
| 19 Nov | 144 [71–330], 783 | 43 / 22 / 6 | 93, 27 / 10 | 84 / 51 / 20 | 557 / 525 / 343 |
| 20 Nov | 160 [74–321], 384 | 55 / 20 / 6 | 118, 37 / 14 | 92 / 45 / 20 | **654 / 553 / 597** |
| 21 Nov | 131 [61–238], 316 | 43 / 10 / 0 | 96, 24 / 4 | 82 / 39 / 6 | 546 / 533 / 695 |
| 22 Nov | 113 [72–225], 444 | 35 / 6 / 2 | 93, 22 / 6 | 82 / 22 / 6 | 534 / – / – |
| 23 Nov | 121 [62–277], 419 | 33 / 12 / 2 | 101, 31 / 8 | 76 / 27 / 12 | 426 / – / – |

- From the 18 Nov run on, the 72 h that fell at the two Hat Yai stations (426–654 mm) were **3.5 to 4.7 times the
  ensemble's median** at the point and above its 90th percentile in every run. At most 3 of 51 members reached 350 mm
  (P ≤ 6 %); the wettest member ranged from 316 to 783 mm.
- **The basin mean is lower than the point** in every run: averaging over the basin smooths the heaviest members
  away. For this event it would have warned less, not more.
- **Days 3–5 ahead** (beyond the page): the 15 Nov run gave the 72 h of 18–20 Nov a 20 % chance of ≥ 150 mm at the
  point; the 16 Nov run gave 19–21 Nov 33 %; the 18 Nov run gave the five days 19–23 Nov a 53 % chance of ≥ 250 mm
  (`hy_hindcast` log, section F). A heads-up existed 4–5 days ahead at moderate chances; nothing in the ensemble said
  "a record".

### 3.6 The second event: late November 2024

Kho Hong had 170 / 109 / 180 mm on 26–28 Nov 2024 (459 mm in 3 days), Hat Yai airport 157 / 80 / 97 (334 mm), Yala
303.6 / 276 / 113.4 (`hy_case2024` log). Daily runs 21–26 Nov 2024, the same reading:

| Run, 19:00 | Tomorrow: P(> 35) · word | The day after: P(> 35) · word | Pre-warnings | 72 h point: median [10–90 %], P(≥ 150) | Anywhere ≤ 40 km: P(≥ 150) | Fell 72 h (48571 / 48569) |
|---|---|---|---|---|---|---|
| 21 Nov | 10 % · ต่ำ | 0 · ต่ำ | none | 33 [15–66], 0 % | 6 % | 51 / 19 |
| 22 Nov | 0 · ต่ำ | 6 · ต่ำ | none | 36 [22–54], 0 | 0 | 71 / 40 |
| 23 Nov | 0 · ต่ำ | 6 · ต่ำ | none | 39 [20–65], 0 | 0 | 212 / 185 |
| 24 Nov | 4 · ต่ำ | 8 · ต่ำ | none | 38 [19–81], 4 | 8 | 307 / 259 |
| 25 Nov | 6 · ต่ำ | 10 · ต่ำ | none | 66 [38–103], 4 | 18 | **459 / 334** |
| 26 Nov | 8 · ต่ำ | 61 · สูง | ฝนหนัก มะรืนนี้ 60 % | 101 [47–174], 20 | 45 | 403 / 277 |

**In 2024 the page would have said "ต่ำ" for every heavy day until the rain had begun.** Its only signal came from the
measured rain (Hat Yai airport 157 mm on rain day 26 Nov). One event (2025) shows the forecast can give two days'
notice; the other (2024) shows it can give none.

### 3.7 How many days ahead would the page have said anything above "low"?

- **2025, forecast alone:** the first word above ต่ำ for Hat Yai was **"สูง" for 19 Nov on the evening of 17 Nov** (the
  day after), with the pre-warning "ฝนหนัก มะรืนนี้ โอกาส 40 %": about **2 days before the first heavy day, 4 days
  before water entered the city (T1, the evening of 21 Nov) and 6 days before X.44 overtopped (T2, 24 Nov)**. Yellow
  (ติดตามไว้) from 17 Nov, orange (เตรียมตัว) from the evening of 19 Nov; never red from the forecast, by design. TMD's
  notices had named Songkhla "very heavy" for 19–20 Nov a day earlier (16 Nov, §2), and ONWR had named Hat Yai district
  on 13 Nov: **the page would not have been earlier than the agencies.**
- **2025, with the measured rain:** red (ทำทันที) from about 23:00 on 19 Nov if a gauge within 10 km read like Hat Yai
  airport: about 45 h before DDPM's first Extreme alert (21 Nov 20:11). The flood tile (X.44 and X.174 within 3 km)
  would have gone red once Khlong Wa overtopped: the municipality's Khlong Wa reading was 1.68 m over its bank at 08:00
  on 22 Nov [S10]; when ThaiWater's X.174 crossed it is not known here.
- **2024:** nothing above ต่ำ from the forecast before the rain began.
- **What the words could not say, either year:** that this was not an ordinary heavy-rain day. The page's "สูง" for
  heavy rain fired on 5–13 % of station-runs in Nov–Dec of 2023–2025 (§4). The same word covered the 29 Nov 2024 run
  at Hat Yai (43 % for the next day; 16 mm fell in three days) and the 370 mm day of 21 Nov 2025.

## 4. What would have warned better, tested beyond this event

### 4.1 The sample and the protocol

- **Runs:** every 4th day, 1 Nov – 31 Dec of 2023, 2024 and 2025 (48 runs scheduled; 2023 at 0.4°, the resolution of
  the archive then; 27 and 31 Dec 2023 not fetched: the download budget stopped them). Steps 18, 42, 66, 90: tomorrow,
  the day after, d+3, and their 72 h.
- **Stations** (GHCNh daily rain on record): Kho Hong 48571, Hat Yai airport 48569, Sadao 48574, Phatthalung 48560,
  Yala 48581, Nakhon Si Thammarat agromet 48554, Surat Thani agromet 48555. 322 run × station rows; 276 with all three
  observed days.
- **Events at the station:** E150 / E250, the 3 rain days d+1..d+3 sum to ≥ 150 / 250 mm. 24 E150 rows in 9 event
  runs (2023: 4 runs; 2024: 3 runs; 2025: 2 runs). **Stations share weather: read the n as counts, not independent
  cases.** No flood record was read; heavy rain at the station stands in for the flood.
- **Triggers** (fixed before the sample was scored; cut points the page's own 10 / 20 / 40 %):
  - T0, the page as it is: P(day > 35 mm) ≥ 20 % (a pre-warning) or ≥ 40 % ("สูง") on tomorrow or the day after;
  - T1 point, T2 3 × 3 area mean, T3 anywhere in the 3 × 3 (≈ 40 km): P(72 h ≥ 150 / 250 / 350 mm) ≥ 10 / 20 / 40 %;
  - T4: the page's very-heavy pre-warning, P(day > 90 mm) ≥ 20 %;
  - T5 / T6 (**post-hoc**, added after reading §3): P(day > 35) ≥ 40 % / ≥ 20 % on **both** tomorrow and the day after.
- **Protocol:** choose among T1–T3 on 2024 (a season without the Hat Yai flood) by CSI against E150; confirm on 2023
  (a disjoint season); then look at 2025 (the Hat Yai season).

### 4.2 Results

Chosen on 2024: **T3, P(≥ 150 mm in 72 h anywhere within ~40 km) ≥ 10 %** (CSI 0.62 against 0.29 for the page's
pre-warning).

| Trigger (vs E150) | 2023 (disjoint) hits / false alarms / misses, CSI | 2024 (choosing) | 2025 (Hat Yai season) | Fires on, rows 2023 / 2024 / 2025 |
|---|---|---|---|---|
| T0 pre-warning (P > 35 ≥ 20 %, d+1 or d+2) | 3 / 9 / 1, **0.23** | 6 / 11 / 4, 0.29 | 10 / 7 / 0, 0.59 | 16 / 17 / 17 % |
| T0 "สูง" (P > 35 ≥ 40 %) | 2 / 8 / 2, 0.17 | 2 / 3 / 8, 0.15 | 10 / 1 / 0, **0.91** | 13 / 5 / 11 % |
| **T3 chosen:** anywhere ≤ 40 km, P(72 h ≥ 150) ≥ 10 % | 2 / 6 / 2, **0.20** | 8 / 3 / 2, 0.62 | 10 / 6 / 0, 0.63 | 10 / 11 / 16 % |
| T1 point, P(72 h ≥ 150) ≥ 10 % | 2 / 4 / 2, 0.25 | 3 / 0 / 7, 0.30 | 10 / 4 / 0, 0.71 | 8 / 3 / 14 % |
| T1 point, P(72 h ≥ 150) ≥ 20 % | 1 / 1 / 3, 0.20 | 1 / 0 / 9, 0.10 | 10 / 2 / 0, 0.83 | 3 / 1 / 12 % |
| T3 anywhere ≤ 40 km, P(72 h ≥ 250) ≥ 20 % | 2 / 1 / 2, 0.40 | 0 / 0 / 10, 0.00 | 7 / 1 / 3, 0.64 | 4 / 0 / 8 % |
| T4 very heavy (P > 90 ≥ 20 %) | 1 / 3 / 3, 0.14 | 0 / 0 / 10, 0.00 | 3 / 0 / 7, 0.30 | 5 / 0 / 3 % |
| T5 post-hoc: "สูง" on both days | 1 / 1 / 3, 0.20 | 1 / 0 / 9, 0.10 | 6 / 0 / 4, 0.60 | 3 / 1 / 6 % |

(`hy_sample` log; the full grid of 33 triggers × 2 events × 5 subsets is in `research/out/hy_sample.json`.)

- **No trigger beat the page's current pre-warning on the disjoint season:** the chosen T3 scored CSI 0.20 against
  0.23 in 2023. By GUIDELINES §7 it doesn't ship as a replacement.
- **Every method missed late November 2024.** At the 25 Nov 2024 run the point chances were 4–10 %; the only signal was
  T3's 18 %. Misses of the page's pre-warning in all three seasons: 5 rows; four of them are that run.
- **The ensemble almost never reaches the big totals at a point:** P(72 h ≥ 250) ≥ 20 % at the point fired on 1 of 276
  rows (Surat Thani agromet, 17 Nov 2025: 238 mm fell). In the daily case runs it reached 20–22 % at Hat Yai on
  18–20 Nov only (§3.5). A trigger on the amounts that matter for a basin flood (250–350 mm) cannot be built from raw
  members without calibration; the case shows why (§3.5).
- **False alarms are not wasted, but they are not rare:** 19 of the pre-warning's 27 false alarms had 30–150 mm at
  the station (e.g. 2023-11-25 at NST agromet, 148 mm), a wet spell short of the event.

### 4.3 The five candidates, one by one

**(a) Multi-day accumulation** (72 h ≥ 150 / 250 / 350 mm). It flagged the 2025 event earlier and in more members
than the daily word (point P(≥ 150) 51 % on the 18 Nov run), but it did not beat the current pre-warning on the
disjoint season, it missed 2024, and its amounts were about 4 times too low in the event that matters. **Wait**: worth
archiving and re-scoring; not worth a new level now.

**(b) Neighbourhood or basin chance.** "Anywhere within 40 km" raises hits and false alarms together (POD 0.50–1.00,
FAR 0.27–0.75 across seasons). The basin mean lowered every chance in the case (smoothing). Neither is better than the
point chance on the disjoint test. The national 24-h neighbourhood test is the other study's
(`docs/research/predict-hazards-2026-10-24.md`, `research/hz_rain.py`).

**(c) ECMWF's own extreme signals.** The Extreme Forecast Index and Shift of Tails are **not in ECMWF's open-data
product list** (https://www.ecmwf.int/en/forecasts/datasets/open-data, read 24 Oct 2026: members, means, standard
deviations and probabilities of daily precipitation of 1–100 mm and gusts; EFI and SOT are not mentioned). The open
probability "tpg100" (P(24 h > 100 mm)) is what the members already give; at the point the members' P(> 90 mm) never
passed 31 %. ECMWF's open data now has a 0.1° IFS, the ensemble included (same page: "from 20 October 2026"; the bucket has
`ifs/0p1/enfo/` for 23 Oct 2026 and not for 18 Oct, listed 24 Oct 2026). Untested here; it may resolve the rain over the
Sankalakhiri hills that feed the U-Taphao better. Whether Open-Meteo serves it is [unverified].

**(d) GloFAS (Open-Meteo's flood API)** (`research/hy_glofas.mjs`, 4 calls):
- Open-Meteo's docs (https://open-meteo.com/en/docs/flood-api, read 24 Oct 2026) describe a reanalysis to July 2022 and a
  "seamless" series that "combines forecast and consolidated historical data"; **nothing about forecasts archived by
  issue date**. A call for 15–30 Nov 2025 with `ensemble=true` returned 50 members, but which run each day comes from
  is not documented [unverified]. **GloFAS as issued cannot be scored from here.** CEMS's own archive needs an account
  on the Early Warning Data Store [unverified: not tried].
- The cell that carries the U-Taphao near gauge X.44 is **7.025 N, 100.425 E** (4.3 km away). The two cells nearer the gauge
  (3.3 and 3.7 km) carry side streams that peaked at 26 and 101 m³/s: the trap the other study found in the north.
- **Reanalysis (1997–2022 only; earlier years came back empty):** the largest annual maxima are 3 Nov **2010**
  (1,534 m³/s), 17 Dec 2005 (1,495) and 25 Nov **2000** (1,158). The two great Hat Yai floods are the top and third
  years: GloFAS "sees" this basin.
- **The stitched 2025 series** peaks at **1,580 m³/s on 25 Nov**, above every reanalysis annual maximum; it rose from
  146 (22 Nov) to 688 (23 Nov) and 1,482 (24 Nov). No measured discharge was read, so the magnitude is unverified,
  and its daily values are averages of a day the city was already under water.
- **Verdict:** a promising signal for FloodWatch to test as issued; **don't put it on this page** (as the other study
  concluded for the north).

**(e) Quoting the agencies' warnings.** They can't be scored like the model triggers: no archive of their notices across seasons was read (n = 1). What
the record of this event shows (§2):
- **TMD's notices** named Songkhla "very heavy" for 19–20 Nov from 16 Nov 05:00 (3–4 days ahead, earlier than the
  ensemble's "สูง" for 19 Nov on the evening of 17 Nov) but rated 21 Nov "heavy" until its morning. The page already
  lifts its rain tile from TMD's CAP feed; the CAP items it reads cover about a day (KI-028), not the notices' per-day
  table.
- **ONWR** named Hat Yai district on 13 Nov for 17–22 Nov: the earliest and most specific word in the record. The page
  plans ONWR's point warning (ROADMAP v0.5 #1, owner's C4).
- **HII**'s 48-hour list on 19 Nov left Songkhla out; its district forecast for 21 Nov was 215 mm against 513 mm
  measured (WP Table 2). The page already lists HII's flash-flood report.
- **The national high-resolution forecasts gave bigger numbers than the ECMWF ensemble:** TMD 173 mm and HII 215 mm for
  Hat Yai district on 21 Nov (WP Table 2, lead time not stated [unverified]) against the ensemble's median of 57 mm at
  the point the evening before (§3.3). The ensemble at 0.25° is not where the size of this event could be seen.
- **Their value is authority, not skill:** the agencies were also too low. Quoting them keeps the page from
  contradicting them (GUIDELINES §1.2); it doesn't make the page more right.

## 5. What the page should do

Every proposal below keeps the hard rules: chances in words, never a forecast amount; a forecast alone tops out at
เตรียมตัว; the agency's word leads; no countdowns. Words are for review by the owner and a Thai reader before they
ship.

| # | Change | Verdict | Exact words (Thai / English) | Evidence | What it needs |
|---|---|---|---|---|---|
| 1 | Keep the forecast cap at เตรียมตัว, the measured escalation to ทำทันที (gauge > 90 mm in 24 h, a gauge over its bank) and TMD's lift | **keep** | (no change) | the measured path would have gone red ~23:00 on 19 Nov 2025 (proxy gauge), about 45 h before DDPM's first Extreme alert; Hat Yai airport had > 90 mm on 1 / 3 / 6 days of Nov–Dec 2023 / 2024 / 2025, all but one in the two flood spells (`hy_obs` log) | nothing |
| 2 | Make the measured path reach the phone: the collector publishes the province rain and level files | **ship** (already planned; raise it) | (no new words) | the page's useful warning in this event is the gauge, and ThaiWater limits per IP (KI-029); a carrier's shared address may be refused on the worst night | SERVER §6.4: the collector fetches ThaiWater's `rain_24h` and `waterlevel_load` per province every 15 min and the page reads the files |
| 3 | The measured 3-day rain at the nearest gauge, as a line (no level) | **ship when built** | "วัดได้รวม {N} มม. ใน 3 วันที่ผ่านมา ที่{gauge} (ห่าง {d} กม.)" / "{N} mm measured over the last 3 days at {gauge} ({d} km away)" | a measurement; the city's own red-flag rule uses 3-day rain (> 300 mm, [S31]); the municipality counted 595 mm in 3 days by 07:00 on 22 Nov [S9] | the collector keeps the last three daily (07:00) `rain_24h` snapshots per gauge and sums them; a unit test with a missing day (no sum when a day is missing) |
| 4 | One honest line on multi-day rain in the rain card, shown when any day of the table is มีโอกาส or สูง | **ship** (copy; the number is this validation's) | "ฝนหลายวันติดกันอาจหนักกว่าที่พยากรณ์มาก: น้ำท่วมหาดใหญ่ พ.ย. 2568 ฝนจริง 3 วันราว 4 เท่าของค่ากลางที่แบบจำลองคาด ติดตามประกาศกรมอุตุฯ และระดับน้ำ" / "Rain over several days can be far heavier than forecast: in the Hat Yai flood of November 2025, three days brought about four times the model's middle estimate. Follow TMD's notices and the river levels." | §3.5: 3.5–4.7 times the median in every run from 18 Nov; the 2024 event was missed outright (§3.6) | i18n strings and a test that the line appears with the word and not on a dry day |
| 5 | The chance of more than 150 mm in 3 days (point, or anywhere within ~40 km) as chance words | **wait** | (if it passes) "โอกาสฝนรวม 3 วัน (พรุ่งนี้ถึง{day}) เกิน 150 มม. ในรัศมีราว 40 กม.: {ต่ำ / มีโอกาส / สูง}" / "Chance of more than 150 mm over 3 days (tomorrow to {day}) within about 40 km: {low / possible / high}" | chosen on 2024 (CSI 0.62), it lost to the current pre-warning on the disjoint 2023 (0.20 vs 0.23); it missed 2024's event at the point | nothing on the page (`forecast_days: 4` covers d+3); for the test, score Nov–Jan 2026–27 with the open-data archive as this study did, plus Jan of earlier seasons |
| 6 | A basin-mean chance for the U-Taphao | **don't ship** | – | it lowered every chance in the case (§3.5) and was never better than the point (§4.2) | – |
| 7 | "ทำทันที" from the forecast alone when the chance is high | **don't ship** | – | the "สูง" word had 12 false alarms in three seasons across 7 stations (8 / 3 / 1) and missed 2024 (§4.2); the cap is GUIDELINES §1.3b | – |
| 8 | GloFAS discharge on the page | **don't ship** | – | no as-issued archive; uncalibrated; the cell trap (§4.3 d) | FloodWatch's test (§6) |
| 9 | Days 3–5 of rain (beyond the table) | **wait** | – | the 15–17 Nov runs gave 20–39 % for ≥ 150 mm on d+3..d+5 (§3.5), but no false-alarm test was run for those leads | `forecast_days: 6` and a sample with steps 66–138 |
| 10 | TMD's per-day province table from its notices in the 3-day table ("📢 กรมอุตุฯ: ฝนหนักมาก") | **wait** | "📢 กรมอุตุฯ: ฝนหนักมาก" / "📢 TMD: very heavy rain" | Songkhla very heavy for 19–20 Nov from 16 Nov 05:00, earlier than the ensemble; but "heavy" for the worst day | a machine-readable source of the notices' table (they are PDFs [S48]); whether TMD's CAP or API carries it is [unverified] |
| 11 | ONWR's warning for the point | **wait** (ROADMAP v0.5 #1, C4) | the agency's own word, quoted | ONWR named Hat Yai district on 13 Nov (§2) | the owner asks ONWR for its tile service |
| 12 | The official channels, on the rain and flood cards at เตรียมตัว or above | **ship** | "ข้อความเตือนภัยบนมือถือ (Cell Broadcast) มาจาก ปภ. คำสั่งอพยพมาจากเทศบาลและจังหวัด · เว็บนี้ไม่ส่งการแจ้งเตือน" / "Phone alerts (Cell Broadcast) come from DDPM; evacuation orders come from your municipality and province. This page sends no alerts." | DDPM sent 15 Cell Broadcasts to Hat Yai, 7 Extreme [WP]; the orders came from the municipality and the governor (§2). The page's "warnings unknown" line points to LINE ALERT, for which no use in this flood was found: check with DDPM [unverified] | i18n strings; the footer already lists ปภ. 1784 |

**Not proposed:** a "record rain" or "300-year" word. Nothing in the ensemble said record (§3.5), and RID's label has
no published analysis behind it.

## 6. Integration with FloodWatch and บ้านรอดไหม

**FloodWatch already has the gauges that matter.** Its station list (snapshot 23 Oct 2026, 20:23 UTC,
`research/data/floodwatch_stations_2026-10-23T2023Z.json.gz`) holds the whole Khlong U-Taphao chain, and so does
ThaiWater's file this page reads:

| Gauge | Where | From Hat Yai centre | Bank (m MSL) | FloodWatch's `upstream` links (lag) |
|---|---|---|---|---|
| X.173A บ้านม่วงก็อง (RID); SLA003 สะเดา (HII) | Sadao, upper U-Taphao | 23.8 km | 16.13; 16.59 | SLA003 → X.173A 4 h |
| X.90 บ้านบางศาลา (RID); SLA002 คลองหอยโข่ง (HII) | above the city | 9.4 km | 9.34 | X.173A 7 h, SLA003 12 h, X.174 5 h |
| X.44 บ้านหาดใหญ่ใน (RID) | in the city | 2.2 km | 7.15 | X.90 6 h, X.174 7 h, SLA002 11 h |
| X.174 บ้านคลองหวะ (RID) | Khlong Wa, a tributary in the city | 2.6 km | 8.88 | |
| ONE037 สะพานข้ามคลองอู่ตะเภา (HII) | downstream, towards Songkhla Lake | 14.3 km | 0.84 | |

- **The page's flood tile for Hat Yai is X.44 and X.174** (FloodWatch's point rule: gauges within 3 km first,
  `water.areaIndex`). X.173A at Sadao is outside its 20 km list. So the page sees the river only when the water is
  already at the city.
- **The best measured lead time is upstream:** FloodWatch's links put X.173A 7 h before X.90 and X.90 6 h before X.44,
  about 13 h from Sadao to the city (how FloodWatch derives the links is not in the snapshot [unverified]). That is
  hours, not days, and it is FloodWatch's to say. **Advice for FloodWatch:** an "upstream" line on its X.44 and X.90
  pages and in `/api/point` ("ต้นน้ำที่สะเดา: {status}", with the lag as a range), then this page shows FloodWatch's
  line in the flood card (it waits for CORS, OWNER_ACTIONS B1, or the published snapshot, INTEGRATION §3.5).
- **FloodWatch's own forecasts at X.44** (same snapshot): the 12 h and 24 h changes have skill 0.22 and 0.17 against
  persistence ("low" confidence); 48 and 72 h fall back to persistence (skill 0, "proven": false). For a flood that
  rose for five days, FloodWatch's 24 h outlook is the most this family of apps can honestly give from rivers today.
- **What would FloodWatch have shown in Nov 2025?** Unknown to this study: FloodWatch's records say
  `history_since: 2025-09-30T18:00Z`, so its own store holds the event, but its public API serves at most 35 days
  (`/api/stations/X.44?days=400` answered "less than or equal to 35"). **Owner action:** replay 19–26 Nov 2025 at
  X.173A, X.90, X.44 and X.174 from FloodWatch's database: when each crossed 70 %, 90 % and its bank, and what
  `change24` and `bank_chance24` said 24 h before. That is the hindcast this page cannot do and FloodWatch can.
- **GloFAS** (§4.3 d) belongs in FloodWatch's tests, not on this page: GloFAS's reanalysis puts 2010 and 2000 at the
  top of 1997–2022 for this cell, and its stitched 2025 series peaked above both; whether its forecasts *as issued*
  saw it days ahead needs CEMS's archive.

**บ้านรอดไหม:** the advice for a basin flood is its job ("ก่อนน้ำมา", `/flood`). This study did not read its flood guide
line by line [unverified whether it covers multi-day rain and water from upstream]. Two suggestions: a short
"ฝนตกหลายวัน / น้ำมาจากต้นน้ำ" part in the flood guide, in its own sourced words, which this page's new line (§5) can
link to; and the same official-channels block in all three apps (INTEGRATION §5).

## 7. Frank about the limits: a web page is not a warning system

- **A warning system is a chain** (the four pillars of the UN's Early Warnings for All: knowing the risk, monitoring and
  forecasting, dissemination, and the capacity to respond). In Hat Yai the first two worked partly (the rain was
  forecast, too small), the third was late and vague, and the fourth failed: the red flag, the evacuation orders and the evacuation points
  (DDPM's alert of 22 Nov 01:23) came after the water. This page sits beside the chain, not in it.
- **What warns people:** the municipality's flags and sirens, the province's evacuation orders, DDPM's Cell Broadcast to
  every phone in the cell area, community leaders, loudspeakers and people at the door. They reach people who are not
  looking. A page reaches only those who open it, and only while the phone network and the power last: both failed
  once the flood came [WP][S36].
- **What this page can honestly add:** the same words as the agencies, never milder; the measured rain and the river
  next to the point, with their age; the upstream river from FloodWatch; and the plain statement that a "high chance
  of heavy rain" can be four times heavier than forecast. That would have helped a family that was already looking
  on 19–21 Nov. It would not have replaced an evacuation order on 22 Nov.
- **What it must not do:** sound more certain than the agencies about the size of the next flood. In 2025 the ensemble
  saw the days; in 2024 it saw nothing. One event shows a signal; it doesn't prove a method.

## 8. What this study could not do

- **ThaiWater for Nov 2025:** this server must not call ThaiWater (it limits this IP), so the gauges' levels and the
  rain gauges the page would have read are not in this study. The measured-rain path (§3.3) uses Hat Yai airport's
  SYNOP record as a proxy; when the flood tile would have changed colour is unknown.
- **FloodWatch's archive** (its API serves 35 days) and **TMD's CAP items for Nov 2025** (this app keeps no archive of
  past warnings; how TMD's notices then appeared in the CAP feed, and with which severity, is [unverified]). So the
  hindcast tables show the forecast and measured paths, not the warning lift; §2 gives the warnings from published
  sources instead.
- **GloFAS as issued** and **ECMWF's EFI** (not open data).
- **Floods, not rain, as the event:** no flood record by station and date was read; the trigger tests score heavy
  rain at the gauge. A trigger that fires on a wet spell that floods nothing is counted a hit if the rain reached
  150 mm.
- **A bigger sample:** two 0.25° seasons and one 0.4° season, every 4th day, 7 stations: 9 event runs. Jan was not
  sampled; 27 and 31 Dec 2023 were not fetched (budget); 12 UTC runs were not used. Songkhla 48568 has no 2025 record
  in GHCNh or GHCN-Daily.
- **The basin outline:** approximated by six grid points, not read from a shapefile.
- **Real phones and LINE:** whether a family in Hat Yai would have opened the page, or understood "สูง", is untested.

## 9. Reproduce

```
node research/hy_fetch_ens_tp.mjs selftest
node research/hy_fetch_ens_tp.mjs case 0p25 12,18,36,42,66,90,114,138 --range 2025-11-14 2025-11-19 1
node research/hy_fetch_ens_tp.mjs case 0p25 12,18,36,42,66,90 --range 2025-11-20 2025-11-24 1
node research/hy_fetch_ens_tp.mjs sample 0p25 18,42,66,90 --range 2024-11-01 2024-12-31 4
node research/hy_fetch_ens_tp.mjs sample 0p25 18,42,66,90 2025-11-01 2025-11-05 2025-11-09 2025-11-13 2025-11-25 2025-11-29 2025-12-03 2025-12-07 2025-12-11 2025-12-15 2025-12-19 2025-12-23 2025-12-27 2025-12-31
node research/hy_fetch_ens_tp.mjs sample 0p4-beta 18,42,66,90 --range 2023-11-01 2023-12-31 4   # stopped at the 5,200 MB default
HY_BUDGET_MB=5650 node research/hy_fetch_ens_tp.mjs sample 0p25 18,42,66,90 2024-11-22 2024-11-23 2024-11-24 2024-11-26
node research/hy_obs.mjs        # GHCNh -> research/data/hy_obs_daily.csv; GHCN-Daily climatology
node research/hy_hindcast.mjs   # §3, the page's functions on the 2025 runs
node research/hy_case2024.mjs   # §3.6
node research/hy_sample.mjs     # §4
node research/hy_glofas.mjs     # §4.3 (d)
```

- **Downloads:** ECMWF open data 5,556 MB in about 16,200 requests, byte ranges and index files (the ledger is in the
  `hy_fetch_ens_tp` log; `HY_BUDGET_MB` stops a run); NOAA NCEI 66 MB (GHCNh and GHCN-Daily, `hy_fetch_obs` log); Open-Meteo 4 calls (in
  `research/logs/openmeteo-calls-2026-10-24.log`, weight 1,086); FloodWatch 13 small requests (`hy_fetch_obs` log).
  No ThaiWater call. The extracted member values stay in the session scratchpad
  (`<scratch>/hy/ens/*.csv`, 62 MB); the scripts re-fetch them.
- **Files:** `research/hy_grib.mjs` (partial GRIB2 reader), `research/hy_fetch_ens_tp.mjs`, `research/hy_obs.mjs`,
  `research/hy_hindcast.mjs`, `research/hy_case2024.mjs`, `research/hy_sample.mjs`, `research/hy_glofas.mjs`,
  `research/data/hy_points.json`, `research/data/hy_obs_daily.csv`, `research/out/hy_*.json`, `research/logs/hy_*`.

## 10. Sources (all read 24 Oct 2026)

Agency documents first. Saved copies are in the session scratchpad (`<scratch>/hy/web/`, `<scratch>/hy/web2/`).
"Re-read" in §2 marks a document I checked myself from the saved copy; the rest come from the two research
assistants' reading, with their quotes.

- [S1] TMD, ลักษณะอากาศประเทศไทย เดือนพฤศจิกายน 2568 (8 Dec 2568, preliminary): https://www.tmd.go.th/media/climate/climate-monthly/%E0%B8%9E%E0%B8%A4%E0%B8%A8%E0%B8%88%E0%B8%81%E0%B8%B2%E0%B8%A2%E0%B8%99-2568.pdf (re-read: the record table, "อ.หาดใหญ่ จ.สงขลา 370.2 21 219.4 21/2543 2516")
- [S2] TMD, ลักษณะอากาศประเทศไทยปี 2568 (30 Jan 2569): https://www.tmd.go.th/media/climate/climate-annual/%E0%B8%AA%E0%B8%A3%E0%B8%9B%E0%B8%AA%E0%B8%A0%E0%B8%B2%E0%B8%A7%E0%B8%B0%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8%E0%B8%9B-2568.pdf
- [S3] TMD daily forecast, 21 Nov 2025 05:00: https://tmd.go.th/media/forecast/daily-forecast/2025-11-21_06_thai_1.pdf
- [S4] RID, annual maximum water levels, Songkhla: http://water.rid.go.th/hyd/WLMax/WL_Max_Songkla.pdf
- [S5] Thai PBS, 22 Nov 2025: https://www.thaipbs.or.th/news/content/358756
- [S6] Thai PBS Sci & Tech, 24 Nov 2025: https://www.thaipbs.or.th/now/content/3403
- [S7] The Standard, 24 Nov 2025: https://thestandard.co/hat-yai-flood-record-rain/
- [S8] The Standard, 26 Nov 2025 (RID's director): https://thestandard.co/hat-yai-water-record-passed/
- [S9] Thansettakij, 22 Nov 2025 (municipality Statement 5): https://www.thansettakij.com/general-news/644636
- [S10] Thansettakij, 22 Nov 2025 (municipal gauges at 08:00): https://www.thansettakij.com/general-news/644644
- [S12] Thansettakij, 24 Nov 2025: https://www.thansettakij.com/general-news/644770
- [S13] Naewna, 22 Nov 2025 (RID Songkhla project): https://www.naewna.com/local/929711
- [S15] HII weekly report 48/2568: https://tiwrmdev.hii.or.th/web/attachments/1265_20251201_Predict_SendRid.pdf
- [S18] Thansettakij, 24 Nov 2025 (the governor's order): https://www.thansettakij.com/general-news/644830
- [S20] Naewna, 25 Nov 2025 (GISTDA): https://www.naewna.com/local/930253
- [S24] Thai PBS, 30 Nov 2025: https://www.thaipbs.or.th/news/content/358984
- [S25] Thai PBS, 2 Dec 2025 (MOPH): https://www.thaipbs.or.th/news/content/359070
- [S26] ReliefWeb, FL-2025-000209-THA: https://reliefweb.int/disaster/fl-2025-000209-tha
- [S28] Thansettakij, 25 Nov 2025 (MOPH airlift): https://www.thansettakij.com/health-wellness/health/644939
- [S29] Thai PBS, 24 Nov 2025: https://www.thaipbs.or.th/news/content/358797
- [S30] Thai PBS Policy Watch, 1 Dec 2025: https://policywatch.thaipbs.or.th/article/life-223
- [S31] Hatyai City Climate, flag criteria (undated): https://hatyaicityclimate.org/paper/620
- [S32] TEI leaflet by the municipality (2016): https://www.tei.or.th/thaicityclimate/public/cfli-6.pdf
- [S33] The Nation, 26 Nov 2025: https://www.nationthailand.com/news/general/40058814
- [S34] The Nation, 2 Dec 2025 (UTCC): https://www.nationthailand.com/business/economy/40059122
- [S35] Thai PBS World, 27 Nov 2025 (KResearch): https://www.thaipbsworld.com/economy/hat-yai-floods-inflict-bt25-billion-economic-blow-%E2%80%93-kasikorn-research-centre
- [S36] Mongabay, March 2026: https://news.mongabay.com/2026/03/hat-yais-floods-are-a-warning-for-cities-built-against-nature-analysis/
- [S39] JTWC prognostic reasoning for 04B, via a mirror: https://wiki.chlod.net/jtwc/prog/2025-11-25-2110-io0425prog.txt
- [S44] / [WP] สมุดปกขาว "แนวทางการแก้ปัญหาอุทกภัยหาดใหญ่อย่างยั่งยืน" (National Research Council committee, January 2569), hosted by a third party: https://sip-water.com/wp-content/uploads/02-%E0%B8%AA%E0%B8%A1%E0%B8%B8%E0%B8%94%E0%B8%9B%E0%B8%81%E0%B8%82%E0%B8%B2%E0%B8%A7%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%97%E0%B9%88%E0%B8%A7%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%94%E0%B9%83%E0%B8%AB%E0%B8%8D%E0%B9%88-%E0%B8%89%E0%B8%9A%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%95%E0%B9%87%E0%B8%A1.pdf (re-read: Tables 1 and 2, pp. 37–38)
- [S45] Hatyai Focus (ONWR notice 30/2568): https://www.hatyaifocus.com/news-detail/29785/
- [S46] Thai PBS, 13 Nov 2025: https://www.thaipbs.or.th/news/content/358514
- [S47] TMD Southern Meteorological Centre (East Coast), notice 59/2568, 14 Nov 2025: https://songkhla.tmd.go.th/static/forecast/warning/2025-59_warning_th.pdf
- [S48] TMD notice ฉบับที่ 3 (342/2568), 16 Nov 2025 05:00: https://www.tmd.go.th/media/forecast/warning/2025-11_16_05_warning_th.pdf (re-read: the per-day tables)
- [S49] TMD notice, 20 Nov 2025 17:00: https://www.tmd.go.th/media/forecast/warning/2025-11_20_17_warning_th.pdf
- [S50] The Active (Thai PBS), 19 Nov 2025: https://theactive.thaipbs.or.th/news/disaster-20251119-2
- [S51] TMD notice ฉบับที่ 13 (352/2568), 21 Nov 2025 05:00: https://www.tmd.go.th/media/forecast/warning/2025-11_21_05_warning_th.pdf
- [S52] PSU news (the green flag at 14:40, 21 Nov): https://psub.psu.ac.th/?p=15529
- [S53] Thansettakij, 24 Nov 2025 (ONWR's X.44 forecast): https://www.thansettakij.com/economy/trade-agriculture/644827
- [S54] Thai PBS, 25 Nov 2025 (emergency decree): https://www.thaipbs.or.th/news/content/358839
- [S55] MGR Online (the mayor on the flag): https://mgronline.com/onlinesection/detail/9680000113954
- [S56] InfoQuest, 29 Nov 2025 (the Prime Minister): https://www.infoquest.co.th/?p=550037
- [S57] TP Channel, 8 Apr 2026: https://tpchannel.org/news/33470
- ECMWF open data: https://www.ecmwf.int/en/forecasts/datasets/open-data; Open-Meteo flood API: https://open-meteo.com/en/docs/flood-api
- NOAA NCEI GHCNh: https://www.ncei.noaa.gov/oa/global-historical-climatology-network/hourly/access/by-year/ ; GHCN-Daily: https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/

**Not read** (blocked, not bypassed): Bangkok Post's two analyses, Thairath (Thai), ThaiPublica's summary of the white
paper, Prachatai's timeline, Khaosod English, The Diplomat. ONWR's own site timed out.

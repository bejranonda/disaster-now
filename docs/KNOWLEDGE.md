# Knowledge: every number, band and rule, with its evidence

Reference for the cut points, time rules and findings the app depends on. Status marks as in [SOURCES.md](SOURCES.md): ✅ read or called live (date, host), ⚠️ with a catch, **[unverified]**. The full research records are in [research/](research/); this page keeps what the code uses. All live calls: 23 Oct 2026 UTC, a cloud host outside Thailand.

## 1. The app's scale

Four levels named by what to do, the same for every hazard ([UX scout §5a](research/ux-scout-2026-10-23.md#5a-the-four-levels-plus-no-data-and-old)), plus "no data":

| Level | Thai | English | Colour (fill, text) | Meter |
|---|---|---|---|---|
| 0 | ยังไม่น่าห่วง | Nothing notable yet | blue `#2F6FB0` | ●○○○ |
| 1 | ติดตามไว้ | Keep an eye on it | yellow `#F2E700` (`#2E2A00`) | ●●○○ |
| 2 | เตรียมตัว | Get ready | orange `#E46C0A` (`#1F1300`) | ●●●○ |
| 3 | ทำทันที | Act now | crimson `#B3122E` | ●●●● |
| — | ไม่มีข้อมูล | No data | grey `#9AA3AE`, hatched | – – – – |

The UX scout checked the palette by simulation (Machado 2009, CIEDE2000): smallest difference between any two fills 18.4 (tritan, orange vs crimson); label contrast 5.2–11.2 : 1. The orange is FloodWatch's warning orange. Never "ปลอดภัย".

## 2. Bands, and who sets them

From [research/thresholds-2026-10-23.md](research/thresholds-2026-10-23.md) (and its JSON), re-read where marked:

| Hazard | Bands (agency words) → app level | Source | Status |
|---|---|---|---|
| Heat index, daily max (°C) | < 27.0 → 0 · 27.0–32.9 เฝ้าระวัง → 1 · 33.0–41.9 เตือนภัย → 2 · 42.0–51.9 อันตราย → 3 · ≥ 52.0 อันตรายมาก → 3 | DOH/TMD 2024 scheme via BMA (Post Today 2 Apr 2026), DOH (Daily News 7 Apr 2026), TMD (Post Today 11 Mar 2024); TMD's own page for 42.0–51.9 | ⚠️ news quoting the agencies |
| Heat-index formula | US NWS: Steadman's simple formula, then the Rothfusz regression with the two adjustments | NWS WPC page; TMD's 2012 explainer prints the same; TMD's agromet page names "Stedman (1979)" and an example (33 °C, 80 % → 49 °C) the NWS formula gives as 48.1 °C | ⚠️ which formula today's TMD product uses is **[unverified]** |
| PM2.5, 24-h mean (µg/m³, 1 decimal) | 0–15.0 ดีมาก · 15.1–25.0 ดี → 0 · 25.1–37.5 ปานกลาง → 1 · 37.6–75.0 เริ่มมีผลกระทบต่อสุขภาพ → 2 · ≥ 75.1 มีผลกระทบต่อสุขภาพ → 3 | PCD notice 2566, Royal Gazette, Table 2 (`ratchakitcha.soc.go.th/documents/140D157S0000000000300.pdf`) | ✅ re-read |
| Thai AQI (the highest sub-index) | 0–25 · 26–50 → 0 · 51–100 → 1 · 101–200 → 2 · ≥ 201 → 3 | the same notice | ✅ |
| UV index (whole number) | 0–2 ต่ำ → 0 · 3–5 ปานกลาง, 6–7 สูง → 1 · 8–10 สูงมาก → 2 · ≥ 11 สูงที่สุด → 3 | WHO *Global Solar UV Index* (2002); grouping by WHO's advice tiers is the app's | ✅ bands, app's grouping |
| Rain, 24 h (mm) | 0.1–10.0 ฝนเล็กน้อย → 0 · 10.1–35.0 ฝนปานกลาง → 1 · 35.1–90.0 ฝนหนัก → 2 · ≥ 90.1 ฝนหนักมาก → 3 | TMD "เกณฑ์อากาศ" p. 1 (the period isn't printed; FloodWatch applies it to 24 h; the rain day is 07:00–07:00) | ✅ values; one level below each TMD class is the app's |
| Gusts (km/h), TMD's Beaufort words | < 39 (ลมสงบ … ลมแรง = Bft 5, 29–38) → 0 · 39–49 ลมจัด, 50–61 พายุเกลอ่อน → 1 · 62–74 พายุเกล, 75–88 พายุเกลแรง → 2 · ≥ 89 พายุ … → 3 | TMD "เกณฑ์อากาศ" p. 2; WMO-No. 8 ch. 5 | ✅ words; using Beaufort (a 10-min mean) for gusts and the grouping are the app's |
| Tropical cyclone (TMD) | depression < 63 · storm 63–< 118 · typhoon ≥ 118 km/h | TMD (its criteria page says 65 kt for a typhoon, its cyclone page 64 kt) | ✅ |
| Landslide | DMR's trigger: > 100 mm of rain in 24 h in a risk area | DMR daily report legend (31 Jul 2024); Post Today 11 Sep 2025 | ✅; the AP Model's 3-day numbers aren't published |
| River gauge | FloodWatch: ≥ bank → ล้นตลิ่ง (3) · ≥ 90 % of bed-to-bank → ใกล้ล้นตลิ่ง (2) · ≥ 70 % → เฝ้าระวัง (1) · else ยังรับน้ำได้ (0); no bed: within 0.3 m of the bank → 2 | FloodWatch `forecast.classify_status`, words `web/app.js STATUS` (re-read) | ✅ FloodWatch calls it heuristic |
| Earthquake at a point (MMI, + 1.06 in greater Bangkok within 1,600 km) | < 2.5 "ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง" → 0 · 2.5–4.4 "อาจรู้สึกได้" → 1 · ≥ 4.5 "รู้สึกได้ชัด" → 2; never "ไม่รู้สึก", never a damage word | Allen, Wald & Worden 2012 (§10); edges and words from 357 Thai DYFI city reports (MODELS §5) | ✅ equation; edges validated in-sample (since 0.2.0; before: 3 / 5 / 6, ShakeMap words) |
| Fire hotspots | nearest within 10 km → 1 · within 2 km → 2 (nominal + high confidence only) | none: no Thai agency grades hotspots | app's own |
| Official warning (TMD CAP severity) | Minor, Moderate → 1 · Severe → 2 · Extreme → 3; lifts its hazard's tile: rain/flood → rain, storm/wind/cyclone → wind, heat → heat (`events.capHazard`) | OASIS CAP 1.2; TMD marks its routine heavy-rain alert "Severe" | ✅; mapping the app's |

**Rounding:** a value is rounded to the agency's resolution before banding (PM2.5 0.1, AQI and UV whole numbers), so 25.04 is ดี and 25.1 ปานกลาง (`levels.roundTo`, `test/core.test.mjs`).

## 3. The app's own choices (say so on screen when asked)

- The chance rule: a window's level is the highest level ≥ 50 % of members reach; ≥ 20 % for เตรียมตัว or worse lifts it to at least ติดตามไว้ (`levels.CHANCE`).
- The verdict = the highest tile; with fewer than half the tiles answering, no verdict.
- UV from the value now in daylight (06–18), not the day's peak: on 24 Oct 2026 every one of TMD's 77 stations had a clear-sky peak of 8 or more (thresholds §3.2).
- A river gauge sets the point's level through FloodWatch's area index only; a storm's distance (≤ 800 km → 1, ≤ 300 km → 2); fires by distance; Andaman tsunami watch after an M ≥ 6.5 in the Indian Ocean within 6 h.
- Groupings of UV, rain, wind and MMI as above.
- **A forecast alone tops out at เตรียมตัว** (`assess.MODEL_MAX = 2`, since 0.2.0): heat, rain and gust forecasts and CAMS's UV. "ทำทันที" needs a measurement (a PCD station, a gauge, measured rain) or an agency's warning or estimate (TMD CAP, HII's list, GISTDA). The tile still shows the agency's word for the value (MODELS §6; visitor audit V1).
- **Rain in three words** at the validation's cut points: below 10 % "ต่ำ", 10–40 % "มีโอกาส", 40 % and more "สูง" (`outlook.RAIN_WORD_CUTS`); no forecast amount on screen (MODELS §3).
- **Storm lines only within 1,500 km** (`assess.STORM_SHOW_KM`; the cross-check: lines at 2,100–7,500 km were noise).
- **A quake gets a line** within 300 km or at a predicted MMI of 2.5 or more (`quake.quakesForPoint`).
- **Heat numbers are floored** for display after the band's own rounding to 0.1 (41.6 shows 41, "เตือนภัย"; 41.978 rounds to 42.0 and shows 42, "อันตราย"), so a number never reads past its band nor below it (V26, X3; `assess.heatNum`), in the tile, the card's days and the 3-day table alike (0.3.0's table rounded, S2).
- **Heat is said as "รู้สึกเหมือน 43 °C" / "feels like"** (U3): a bare number reads as the air temperature, several degrees lower. The window is named, and the number is that window's: today's afternoon before 16:00 Bangkok ("บ่ายนี้"), then tomorrow's ("บ่ายพรุ่งนี้") (U25). A window with no hour from 12:00 to 15:59 has no heat number (`outlook.hasAfternoon`, S6): the correction (MODELS §1) is for afternoon daily maxima.
- **PM2.5 days 2–3 show the band word with "อาจเปลี่ยน",** not a number (their tested miss is 6–11 µg/m³).

## 4. Time and data rules, per source

| Source | Rule | Evidence |
|---|---|---|
| GISTDA PM2.5 | "…Z" is **Bangkok time** | "2026-10-24T02:00:00.000Z" at 19:47 UTC on 23 Oct (and 21 Oct, Hazard-huntz) |
| ThaiWater / HII | Bangkok time with no offset ("2026-10-24 02:00"); 999999 missing; `rain_24h` a rolling 24-h total; `ground_level: 0` = no bed level | fixtures; FloodWatch SOURCES.md; §6 |
| Air4Thai | Bangkok time, `AQILast` PM2.5 = the 24-h mean; `-1` not measured | fixture; Hazard-huntz (170 of 170 colours matched) |
| TMD CAP | take times from the CAP item; the RSS `pubDate` is 7 h early; provinces as ISO 3166-2 `TH-80` = DOPA codes | fixture `tmd_cap_item.xml`; Hazard-huntz docs/09 |
| TMD storm track | `time` is UTC with no offset (pairs with `dateTimeTH` +7 h, Buddhist year) | fixture `tmd_storm.json` |
| TMD quake RSS | the description's "2026-10-24 02:31:21 น." is Bangkok time (CE); the title's date is Buddhist era | fixture `tmd_eq.xml` |
| Open-Meteo | local times with `timezone=Asia/Bangkok` and `utc_offset_seconds` | fixtures |
| JMA | `validtime.UTC` | fixture |
| FIRMS | `acq_date` + `acq_time` UTC | sample in `test/more.test.mjs` |

## 5. PM2.5: measured, estimated, modelled

- **GISTDA's estimate runs high against the PCD's stations.** At 02:00–03:00 Bangkok on 24 Oct 2026, GISTDA's province 24-h means were a median **1.31×** the median of PCD stations in the same province (interquartile range 0.98–1.56) across 60 provinces; the same app level in 44 of 60. Bangkok: GISTDA 43.2 vs PCD median 30.6 (55 stations). At the old town, GISTDA's point said 46.4 while five PCD stations within 2.3 km read 27.0–33.3. One snapshot, not a validation: the page uses PCD's station within 15 km first and doesn't show GISTDA's number beside it.
- **A second snapshot agrees (24 Oct 05:06 Bangkok):** GISTDA's 24-h mean at the positions of 30 fresh PCD stations was a median **×1.27** of the station (10–90 % ×0.96…×1.88; over ×1.5 at 9 of 30). [research/crosscheck-live-2026-10-23.md §D](research/crosscheck-live-2026-10-23.md#d-gistdas-estimate-vs-the-pcds-stations-still-about-13-high).
- **CAMS** (Open-Meteo air quality) read 14.6 µg/m³ at the same hour; its mean over the previous 24 h was close to the station's (ratio 1.03 for bkp92t), so the correction changed little that night. Its measured skill and the corrections tested are in [MODELS.md](MODELS.md).
- **Stations:** 173 Air4Thai stations; O₃ measured at 27 (sources scout); many Bangkok stations measure PM2.5 only, so "other pollution" uses the nearest station that measures another gas.

## 6. Rivers: the same as FloodWatch

- **The cross-check** (`research/crosscheck_floodwatch.mjs`, ThaiWater national `waterlevel_load` and FloodWatch `/api/stations` fetched within a minute, 20:23 UTC): of 707 ThaiWater gauges judged here, 693 have a FloodWatch twin with a known status; **691 agree (99.7 %)**. Pairs: normal 553, watch 91, warning 31, critical 16, and 2 normal↔watch (ONE039: a different reading at the 70 % edge; TCP004: FloodWatch has another bed level).
- **Why the first run gave 97.8 %:** ThaiWater writes `ground_level: 0` on many gauges with no bed level; FloodWatch drops it (its collector's Python `or` treats 0 as missing), so `pct` is null and the gauge is judged by the 0.3 m rule. The app now does the same (`water.nearGauges`).
- **ThaiWater's own `situation_level` is not used:** it is the same % of bed-to-bank, and C.12 (Chao Phraya at Samsen) read level 4 "มาก" / FloodWatch "warning" at **1.31 m** below its bank (92.2 %), on 24 Oct 02:00.
- **The point:** FloodWatch's `point.area_index`: fresh gauges within 8 km; the up-to-3 within 3 km, weighted 1/max(d, 0.3)²; rounded to a category; in Bangkok and its five neighbours (provinces 10, 11, 12, 13, 73, 74) canal gauges only. For the old town it gives "normal", as FloodWatch's own `/api/point` did (`test/more.test.mjs`).
- **Measured rain:** FloodWatch's limits (≤ 10 km, ≤ 3 h): at 13.75, 100.5 both apps name ปากคลองตลาด, 4.5 mm.

## 7. Places and search

- **HDX COD-AB Thailand** (xlsx, 1,850,520 bytes, sha256 `7d23fca9…e529f0`, HDX metadata 26 Jan 2026): 77 provinces, 928 districts, 7,425 subdistricts with DOPA codes and centres; GISTDA's `tb_idn` and the DMR's `TB_CODE` use the same codes. `data/tambon.json` 514 KB, 158 KB gzip. Only 5,838 of 7,425 subdistrict names are unique (UX scout), so a hit always shows district and province.
- **FloodWatch's search pattern** (its `geocode.py`, D-032): instant local matches; "🔎 ค้นหาสถานที่" only on Enter or a tap; ซ. → ซอย, ถ. → ถนน, พหล → พหลโยธิน; "name + number" also tried as "ซอย…" (live: "ลาดพร้าว 71" alone finds a place on ถนนลาดพร้าว, "ซอยลาดพร้าว 71" the soi); exact names first; queries never logged.
- **A province or district found by name opens its seat** (since 0.4.0, U2): the province's subdistrict `pv0101` (all 77 exist, each the capital's town subdistrict: ศรีภูมิ, ตลาดใหญ่, ในเมือง …) and the district's `dddd01` (914 of 928 exist; the other 14, renumbered, open their lowest code). The centres used before were up to 40.3 km from town: Chiang Mai's sat at 994 m near ต.แม่วิน, Ubon's 29.5 km away, Khon Kaen's 19.4 km (visitor audit U2, from `tambon.json`).
- **Geocoder terms:** Nominatim: at most 1 request a second **for the whole application**, no autocomplete, attribution, switchable without a software update. Photon: fair use, throttled when heavy, `lang=th` refused (default names are Thai). Both CORS `*`.

## 8. Privacy and the law

A page that keeps nothing about a person is outside most of the PDPA's duties; the first per-person record (a push subscription, an account, a stored position, an IP log) brings consent, a notice with retention, a 72-hour breach duty and cross-border rules (Hazard-huntz docs/09 §7, a summary of the Act; a Thai lawyer must confirm). This app sends providers a ~1 km point and keeps saved places in the browser only.

## 9. The ensemble and its corrections

ECMWF IFS 0.25° ensemble via Open-Meteo: the control and 50 members (51), hourly to 96 h from local midnight; temperature, humidity, precipitation and gusts are each member's own, so the heat index is computed per member. 26.7 KB gzip per call (4 days, 4 variables). For Bangkok on 24–26 Oct the raw median daily-max heat index was 38–39 °C (air 31.5–32.3 °C, humid), rain 2–4 mm a day, gusts about 25–27 km/h.

**Corrections the page applies** (`public/js/calibration.js`, from `research/out/calibration.json`; MODELS §1–2):

| What | Formula | Fitted on | Tested on |
|---|---|---|---|
| Heat index, 0–48 h | HI = 10.375 + 0.8647·HI_raw per member, dressed with N(0, 2.95 °C) | 2025, 8 TMD stations (sample A), ECMWF HRES day 1 | 2026 at A and 10 held-out stations; ENS Mar–May 2026 |
| Heat index, 48–72 h | HI = 11.689 + 0.826·HI_raw, SD 3.01 °C | 2025 day-2 forecasts (54–57 h) | day 3 untested |
| PM2.5, days 1 / 2 / 3 | measured 24-h mean × (CAMS(day) ÷ CAMS(past 24 h))^β, β = 0.45 / 0.55 / 0.55; needs ≥ 18 h of CAMS's past day | Dec 2025–Feb 2026, sample A | Mar–Apr 2026 at A and B, Dec–Feb at B, 20 Sep–22 Oct 2026 (post-hoc choice) |

With the heat correction, Bangkok's afternoons read about 43 °C on 24 Oct (the live walk: "บ่ายนี้ 43 °C", range 39–47 °C).

## 10. Earthquakes

- **Allen, Wald & Worden (2012), hypocentral form:** MMI = 2.085 + 1.428·M − 1.402·ln√(R² + Rm²) + 0.078·ln(R/50) [R > 50 km], Rm = −0.209 + 2.042·e^(M−5); σ = 0.82 + 0.37/(1 + (R/22.9)²). Copied from OpenQuake 3.26.2 `allen_2012_ipe.py` by two researchers independently (thresholds §8.4; `research/e4_quake_ipe.py`). Unit-tested against the table in thresholds §8.4 (e.g. M7.7 at 1,000 km → 3.6).
- **The Bangkok term (since 0.2.0):** + 1.06 MMI in Bangkok, Samut Prakan, Nonthaburi and Pathum Thani, for quakes within 1,600 km (MODELS §5; `assess.BKK_MMI_TERM`, `quake.SITE_MAX_KM`). Elsewhere the equation is used as is (Thai-city bias 0.00).
- **Its limit, on screen:** no site term outside greater Bangkok. The 28 Mar 2025 M7.7 Myanmar quake was 996 km from central Bangkok, where the equation gives MMI ≈ 3.6, yet a building under construction collapsed in Chatuchak (Thairath, 29 Mar 2025). Soft clay and tall buildings shake more; a point source understates a long rupture. Validation against "Did You Feel It?" is in [MODELS.md](MODELS.md).
- **The lowest felt words need M5.5 or more** (`assess.FELT_WORDS_MIN_MAG`, since 0.4.0, U15). In the "Did You Feel It?" reports behind the words (`research/data/e4_dyfi_residuals.csv`, 1,776 rows), every event is M5.5 or larger, and even where the equation predicts under 1.0, half the reporters gave CDI 2 or more (n = 24; 1.0–1.5: 63 % of 73; 1.5–2.0: 65 % of 69; 2.0–2.5: 82 % of 199). So "ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ …" holds for big, far quakes and has no evidence for an M1.8 200 km away; a smaller quake gets the facts alone. This is a floor on what the words claim, never a "not felt".
- **Early warning in Thailand** (24 Oct 2026): Google's Android Earthquake Alerts System lists Thailand
  (https://support.google.com/android/answer/9319337, read 24 Oct 2026 by the research and again by the session):
  "nearby earthquakes of magnitude 4.5 and above", on by default, Settings > Safety & emergency > Earthquake alerts,
  "You may receive an alert before, during, or after shaking begins", "Not all earthquakes can be detected". TMD runs
  no early-warning service found; DDPM's Cell Broadcast is a notification after the event, confirmed only by news
  [unverified]. The quake card says where to switch Android's on (predict-earthquake §7).
- **Thailand's seismic zones** ("กฎกระทรวงกำหนดการรับน้ำหนัก ความต้านทาน ความคงทนของอาคาร และพื้นดินที่รองรับอาคารในการ
  ต้านทานแรงสั่นสะเทือนของแผ่นดินไหว พ.ศ. ๒๕๖๔", Royal Gazette vol. 138 part 16 ก pp. 13–14, 4 Mar 2021,
  https://ratchakitcha.soc.go.th/documents/17159461.pdf, SHA-256 `67989bf6…416d838b`, clause 3, read 24 Oct 2026 from
  the page images and cross-checked with the PDF's text layer): zone 3 "ในระดับสูง" 12 provinces, zone 2 "ในระดับปานกลาง"
  17 (Bangkok, Phuket, Ranong among them), zone 1 "บริเวณหรือพื้นที่ที่ต้องเฝ้าระวัง" 14 (Songkhla, Surat Thani among
  them); Khon Kaen, Udon Thani, Nakhon Ratchasima and Ubon are in none. `research/data/eq_zones_2564.json`;
  `assess.SEISMIC_ZONE` equals it (a test). The place profile shows the province's zone, labelled "ความเสี่ยงระยะยาว ไม่ใช่การทำนาย".
  The zone and the predicted felt rate rank the 15 study cities alike (Spearman +0.65, p 0.009).
- **TMD's event colours** (Thai PBS, 15 Apr 2025, quoting TMD): < 2.5 green, 2.5–3.9 yellow, > 4.0 red, by magnitude only ⚠️.

## 11. A snapshot of the night it was built (24 Oct 2026, 02:00–03:30 Bangkok)

- TMD CAP: "Heavy Rain", Severe, 23 Oct 18:00 – 24 Oct 08:00 +07, 11 southern provinces (TH-80, 81, 83, 84, 90–96).
- Typhoon จำปี / CHAMPI (TMD, JMA, GDACS Red) near 24.8 N 122.5 E, about 2,590 km from Bangkok; In-fa (JMA, TS) far east.
- EMSC/TMD: M4.2 in Laos (19.081 N, 101.974 E) at 02:31 Bangkok, about 130 km from Nan.
- Bangkok old town: PCD bkp92t 31.9 µg/m³ (24-h); heat index median 38 °C for the coming afternoon; rain 4.5 mm in 24 h at ปากคลองตลาด; HII's flash-flood list empty; 303 FIRMS hotspots in Thailand's box, none within 25 km.

## 12. 0.3.0: the live cross-check, Cloudflare and GLM (23 Oct 2026, 21:40–22:10 UTC)

- **TMD's warning vs the ensemble:** under the Severe heavy-rain notice for 11 southern provinces, the app's 24-h
  heavy-rain chance at each province's centre was **0–8 % ("low") in all 11**, the median 24-h rain 10.8–16.8 mm. A
  province warning ("บางแห่ง") and a point chance are different quantities; the page now lets the notice lead the tile,
  the verdict and the 3-day table (KI-F25). [research/crosscheck-live-2026-10-23.md §B](research/crosscheck-live-2026-10-23.md#b-tmds-warning-vs-the-ensemble-they-disagree-everywhere-the-warning-applies).
- **TMD's quake list vs EMSC:** the one event in both, Laos 02:31, M4.2 in both, 0 km apart; 9 of TMD's 10 were
  M1.6–2.9 local events EMSC doesn't list.
- **Air4Thai from FloodWatch's server (Germany):** 173 stations at 21:43 and 22:04 UTC. **ThaiWater:** HTTP 429 to the
  same server at 22:06 (KI-029). Both are **that host's** results, not the app's: measure them again on the risk
  server (A6, KI-032).
- **The collector on that server:** 5 of 5 files in 10–13 s (warnings 1, TMD quakes 10, storms 1, hotspots 311–327,
  Air4Thai 173).
- **GLM (glm-5.3-flash at open.bigmodel.cn, effort low):** warning translation 6 of 6 accepted after the region rule,
  median 3.4 s, max 3.9 s; a one-word probe 6.6 s; the copy review (glm-5.3) 12–20 s per 30 strings. Prices and limits:
  [AI.md §1](AI.md#1-what-glm-is-as-of-october-2026-researched-in-this-session).
- **Cloudflare (documented limits):** Workers Free 100,000 requests a day, 10 ms CPU per invocation, 5 cron triggers;
  static-asset requests outside `run_worker_first` are not Worker calls; KV Free 100,000 reads and 1,000 writes a day
  (the collector writes at most 6 keys a run, 576 a day at 15 min). [CLOUDFLARE.md §1](CLOUDFLARE.md#1-the-recommendation-frankly).
- **Small-phone layout:** at 360 × 640 with a LINE user agent the verdict ends at 504 px (was 642). The 3-day table
  starts 1,529–2,267 px down at 390 px (was 5,865–6,574).

## 13. 0.4.0: the new host and the audits (24 Oct 2026, 07:40–09:00 UTC)

- **The host `autobahn-bot`** (also BrainPlatform's production): Node 24.14.0, Docker 29.4.0; Chromium at
  `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`. **Air4Thai: 173 stations** at the collector's first
  run (07:50 UTC); **ThaiWater answered** every call from it during the session's walks and audits (the output audit counted 25 of its
  own, none 429; the visitor audit asked about six provinces, none 429).
- **The Cloudflare token** (owner, 24 Oct): valid, zone `autobahn.bot` visible, Workers readable; Workers KV answered
  HTTP 401 until the owner added *Workers KV Storage: Edit*. Its scope is *All zones across all accounts* (OWNER_ACTIONS A9).
- **wrangler's "Read N files"** is the raw directory listing (directories included), before `.assetsignore`; with
  `WRANGLER_LOG=debug`, `data/live/*`, `_headers` and `.assetsignore` are listed as "Ignoring asset" (wrangler 4.148.0,
  `buildAssetManifest`). 0.3.0's "32 files" was that count.
- **The output cross-check** ([research/output-crosscheck-2026-10-24.md](research/output-crosscheck-2026-10-24.md)):
  139 of 144 numbers at six points equal an independent recomputation from the sources; the 5 others were the table's
  rounding (S2, fixed). Air4Thai 173 of 173 stations equal; gauge statuses 737 of 742 equal FloodWatch's (the 5 were
  newer readings); GISTDA's estimate ran **1.39×** the PCD stations (KI-009; 1.31× on 24 Oct 02:00); FloodWatch still
  sends no CORS on `/api/point`, `/api/stations`, `/api/geocode` (OPTIONS 405).
- **Contrast** (WCAG formula, `#rrggbb` pairs): white on LINE green `#06C755` 2.26:1, `#14202b` on it 7.32:1 (now
  used); `#2F6FB0` on `#e3eef9` 4.44:1, `#24599a` on it 6.01:1 (now the level-0 words and dots).
- **TMD's warnings page**, the "full notice" link since 0.4.0: `https://www.tmd.go.th/warning-and-events/warnings` and
  `/en/warning-and-events/warnings`, both 200 text/html (08:2x UTC). A CAP item's `<web>` is TMD's daily-forecast page,
  and its link the raw XML.
- **บ้านรอดไหม's English guides** `/en/hot`, `/en/air`, `/en/mask`, `/en/flood`, `/en/storm`, `/en/landslide`,
  `/en/quake`, `/en/pm25`: all 200 (08:3x UTC); the English page links to them since 0.4.0 (X10).


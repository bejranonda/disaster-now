# Hazard thresholds for disaster-now: the official Thai cut points, and the international fallback

> Research for the planned single-page app (GPS or a place → a level for every hazard at that point in Thailand, plus a 12–72 h outlook). It establishes **which numbers each level should use and who says so**. It is not app code.
> Researched on **23 Oct 2026, 19:50–20:20 UTC**, from this cloud session (its egress country was not checked; earlier sessions of the sister projects went out from outside Thailand). Every request sent the User-Agent `disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)`. No bot check was solved and no block was evaded; pages that refused are recorded as refused.
> The machine-readable copy of the cut points is [thresholds-2026-10-23.json](thresholds-2026-10-23.json).

**Status marks**

- ✅ read today in the agency's own page or document, or in the standard's own text (WHO, WMO, OASIS), or in the code that implements it
- ⚠️ read today, but through a news report quoting the agency, or on an agency page that conflicts with another agency page, or the value is an inference from what was read
- **[unverified]** not read in any primary text; where it was seen is said
- *carried over*: taken from Hazard-huntz or FloodWatch without re-opening the source; *re-read*: re-opened today

Times are UTC. "Bangkok" times are UTC+7. Thai text is quoted as printed; where the Royal Gazette PDF's text layer drops the vowel ำ, it is restored and said so.

---

## Summary

| # | Hazard | Level names (TH / EN) | Cut points | Unit · period | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Heat index | เฝ้าระวัง / watch · เตือนภัย / warning · อันตราย / danger · อันตรายมาก / extreme danger | 27.0–32.9 · 33.0–41.9 · 42.0–51.9 · ≥ 52.0 | °C, the day's maximum heat index (TMD forecasts the daily maximum) | DOH and TMD (2024 scheme), via BMA (Post Today, 2 Apr 2026), DOH (Daily News, 2026) and TMD (Thairath, 27 Feb 2024); TMD's own page for 42.0–51.9 (carried over) | ⚠️ three agencies agree, read through news; only one band on an agency page |
| 1a | Heat-index formula | — | Steadman (1979) on TMD's agromet page; the NWS Rothfusz regression in TMD's 2012 explainer (carried over) | T (°C→°F) and RH (%) | TMD `arcims.tmd.go.th` DetailHeatIndex page; Hazard-huntz §32.8 | ⚠️ which formula today's TMD product uses is **[unverified]** |
| 2 | Hot day (max temperature) | อากาศร้อน / hot · อากาศร้อนจัด / very hot | 35.0–39.9 · ≥ 40.0 | °C, daily maximum, **used only in the hot season** | TMD "เกณฑ์อากาศ" p. 1 | ✅ |
| 3 | PM2.5 | ดีมาก ฟ้า · ดี เขียว · ปานกลาง เหลือง · เริ่มมีผลกระทบต่อสุขภาพ ส้ม · มีผลกระทบต่อสุขภาพ แดง | 0–15.0 · 15.1–25.0 · 25.1–37.5 · 37.6–75.0 · ≥ 75.1 | µg/m³, continuous 24-h average, 1 decimal | PCD notice 2566, Royal Gazette, Table 2, clause 4.1(1) | ✅ re-read |
| 3a | Thailand's AQI | same five | 0–25 · 26–50 · 51–100 · 101–200 · ≥ 201 | index, the highest of 6 sub-indices; AQI 100 = the standard | the same notice, clauses 3 and 4.2 | ✅ |
| 3b | PM10 | same five | 0–50 · 51–80 · 81–120 · 121–180 · ≥ 181 | µg/m³, 24-h, whole numbers | the same notice, Table 2 | ✅ |
| 3c | CO | same five | 0–4.4 · 4.5–6.4 · 6.5–9.0 · 9.1–30.0 · ≥ 30.1 | ppm, 8-h, 1 decimal | the same | ✅ |
| 3d | O₃ | same five | 0–35 · 36–50 · 51–70 · 71–120 · ≥ 121 | ppb, 8-h, whole numbers | the same | ✅ |
| 3e | NO₂ | same five | 0–60 · 61–106 · 107–170 · 171–340 · ≥ 341 | ppb, 1-h, whole numbers | the same | ✅ |
| 3f | SO₂ | same five | 0–100 · 101–200 · 201–300 · 301–400 · ≥ 401 | ppb, 1-h, whole numbers | the same | ✅ |
| 3g | Hourly PM2.5 | "ค่าเฉลี่ย 1 ชั่วโมง" / "ค่ารายชั่วโมง" | no bands of its own; PCD's daily report compares the 24-h average with the 24-h standard; hourly is for the trend and for timing outdoor activity | µg/m³, 1-h | PCD's ศกพ., 27 Jan 2025, via Thansettakij and Thai PBS | ⚠️ news quoting PCD; whether hourly values may be coloured with the 24-h bands: not stated |
| 4 | UV index | Low · Moderate · High · Very high · Extreme | 0–2 · 3–5 · 6–7 · 8–10 · ≥ 11 | UVI, whole number; a daily maximum is a 30-min average | WHO/WMO/UNEP/ICNIRP *Global Solar UV Index* (2002), Tables 1 and 4; TMD's UV map uses the same colour edges | ✅ (TMD's protection chart uses a different 4-band scale: conflict) |
| 5 | Rain amount | ฝนเล็กน้อย / light · ฝนปานกลาง / moderate · ฝนหนัก / heavy · ฝนหนักมาก / very heavy | 0.1–10.0 · 10.1–35.0 · 35.1–90.0 · ≥ 90.1 | mm; the page gives **no period** (applied to 24 h by FloodWatch) | TMD "เกณฑ์อากาศ" p. 1 | ✅ values, ⚠️ period |
| 5a | Rain day | — | 07:00–07:00 Bangkok time | — | TMD API list ("ผลการตรวจวัดลักษณะอากาศรายวัน เวลา 07.00 น. … ค่าทางสถิติของ 24 ชั่วโมงที่ผ่านมา"); DMR's daily report (07.00–07.00) | ✅ |
| 5b | Rain rate | light · moderate · heavy · violent | < 2.5 · 2.5–< 10.0 · 10.0–< 50.0 · ≥ 50.0 | mm/h (3-min measurement) | WMO-No. 8 (2008), Part I ch. 14, Annex | ✅ international; no TMD hourly criteria found |
| 6 | Wind (Beaufort) | ลมสงบ … ลมแรง (Bft 5) · ลมจัด (6) · พายุเกลอ่อน (7) · พายุเกล (8) · พายุเกลแรง (9) · พายุ (10) · พายุใหญ่ (11) · ไต้ฝุ่น (12) | … 29–38 · 39–49 · 50–61 · 62–74 · 75–88 · 89–102 · 103–117 · > 117 km/h | km/h (and knots) at 10 m in the open; WMO: a 10-min mean; a gust is the highest 3-s average | TMD "เกณฑ์อากาศ" p. 2; WMO-No. 8 ch. 5 | ✅ (no TMD wind or gust warning threshold found) |
| 7 | Tropical cyclone | พายุดีเปรสชันเขตร้อน · พายุโซนร้อน · ไต้ฝุ่น | < 63 · 63–< 118 · ≥ 118 km/h (< 34 · 34–< 64 · ≥ 64 kt) | maximum wind near the centre | TMD "พายุหมุนเขตร้อนในประเทศไทย" | ✅ (TMD's criteria p. 5 says typhoon "65 นอต หรือมากกว่า": conflict) |
| 8 | Landslide (and flash flood) rain | — | > 100 mm in 24 h in a DMR risk area; DMR's AP Model uses statistical critical accumulated rain with HII's 72-h forecast (numbers not published) | mm, 24 h (07:00–07:00) | DMR daily report, 31 Jul 2024 (legend); Post Today 11 Sep 2025 | ✅ the 100 mm trigger; **[unverified]** any 3-day number |
| 9 | Flash flood | HII: tambon listed as at risk in the next 24 h; DWR: เฝ้าระวัง · เตรียมพร้อม · อพยพ | HII: FFPI + soil moisture (AMC) + WRF-ROMS rain (no class edges published); DWR: per-post thresholds (not published) | — | ThaiWater's own page text; DWR reports 2018 and 2023 | ✅ the schemes; **[unverified]** FFPI classes and DWR numbers |
| 10 | River level | ThaiWater: น้อยวิกฤต · น้อย · ปกติ · มาก · ล้นตลิ่ง (`situation_level` 1–5) | ≤ 10 · > 10–30 · > 30–70 · > 70–100 · > 100 | % of channel capacity, (level − ground)/(bank − ground) | ThaiWater's app code (re-read today); FloodWatch's observed ranges (21 Oct 2026) | ✅ |
| 10a | River level (FloodWatch) | normal · watch · warning · critical | < 70 % · ≥ 70 % · ≥ 90 % (or < 0.3 m below a bank with no ground) · ≥ bank | % of channel depth; BMA canals: BMA's own warning and critical levels | FloodWatch `classify_status`, `bma_status` (re-read) | ✅ (FloodWatch labels it a heuristic) |
| 11 | Earthquake, event | TMD: ไม่มีผลกระทบ (เขียว) · ผลกระทบเล็กน้อย-ปานกลาง (เหลือง) · ผลกระทบปานกลาง-รุนแรง (แดง) | < 2.5 · 2.5–3.9 · > 4.0 | magnitude (TMD's "ขนาด") | TMD deputy DG, Thai PBS, 15 Apr 2025 | ⚠️ news quoting TMD |
| 11a | Earthquake, at a place | Modified Mercalli I–XII (TMD's Thai wording); ShakeMap: Not felt (I) · Weak (II–III) · Light (IV) · Moderate (V) · Strong (VI) · Very strong (VII) · Severe (VIII) · Violent (IX) · Extreme (X+) | — | MMI | TMD "ความรุนแรงแผ่นดินไหว"; USGS ShakeMap's legend strings | ✅ |
| 11b | Shaking at a distance | Allen, Wald & Worden (2012) IPE | coefficients in §8.4 | MMI from Mw and distance (km) | OpenQuake 3.26.2 `allen_2012_ipe.py` | ✅ from code; AWW 2014 **[unverified]** |
| 12 | Fire hotspot | VIIRS: low · nominal · high confidence | classes, not numbers | per 375 m pixel, last 24 h | NASA FIRMS attribute page and FAQ | ✅; GISTDA counts by province and land use ⚠️; no Thai alert threshold found |
| 13 | Tsunami | — | no open official list or map of risk areas; DDPM: 6 Andaman provinces, 27 districts, 102 subdistricts, 509 villages, 226 warning towers | — | Bangkok Biz News (6 Jul 2022) quoting DDPM; `ndwc.go.th` NXDOMAIN today | ⚠️ / ✅ for the absence |
| 14 | Official warnings | CAP severity: Extreme · Severe · Moderate · Minor · Unknown | — | per alert, with ISO 3166-2 province codes | OASIS CAP 1.2; TMD's CAP feed | ✅ |

---

## 1. Heat

### 1.1 The heat-index levels (DOH and TMD, 2024)

The scheme was set by the Department of Health with the TMD in 2024 (*carried over*: Hazard-huntz KNOWLEDGE §32.8 read the TMD's own page of the 7 Mar 2024 press conference, which gives the level names and the 42.0–51.9 band; the TMD's heat-index pages answered 503 then). Re-read today through three news reports that quote three agencies:

- **BMA**, Post Today, 2 Apr 2026 (https://www.posttoday.com/general-news/740308, read 20:03 UTC):
  "-ดัชนีความร้อน 27.0 – 32.9 องศาเซลเซียส อยู่ในระดับ "เฝ้าระวัง" … -ดัชนีความร้อน 33.0 – 41.9 องศาเซลเซียส อยู่ในระดับ "เตือนภัย" ควรลดกิจกรรมกลางแจ้ง ช่วง 11.00 – 15.00 น. … -ดัชนีความร้อน 42.0 – 51.9 องศาเซลเซียส อยู่ในระดับ "อันตราย" … -ดัชนีความร้อน เกินกว่า 52 องศาเซลเซียส อยู่ในระดับ "อันตรายมาก" ควรงดกิจกรรมกลางแจ้งโดยเด็ดขาด"
  and the definition: "อุณหภูมิที่ร่างกายรู้สึกได้ ณ ขณะนั้น (Feel like) ซึ่งจะขึ้นอยู่กับอุณหภูมิและความชื้นสัมพัทธ์ของอากาศ".
- **DOH**, Daily News 5756174 (https://www.dailynews.co.th/news/5756174/, read 20:03 UTC): the same four bands and names, and the colours: "สีเขียว ทำกิจกรรมได้ปกติ แต่ควรดื่มน้ำสม่ำเสมอ สีเหลือง เริ่มเสี่ยง ควรลดกิจกรรมกลางแดด สีส้ม เสี่ยงสูง ควรหลีกเลี่ยงแดดและปรับเวลา และสีแดง อันตรายมาก ควรหยุดกิจกรรมกลางแจ้งทันที".
- **TMD**, Thairath 2766399, 27 Feb 2024 (https://www.thairath.co.th/news/society/2766399, read 20:03 UTC): "กรมอุตุนิยมวิทยา คาดหมายค่าดัชนีความร้อนสูงสุดรายวัน …" with values by station ("บางนา กทม. = 43.6 อยู่ในระดับอันตราย") and "ระดับเฝ้าระวัง (สีเขียว) ดัชนีความร้อน 27.0-32.9 … ระดับเตือนภัย (สีเหลือง) … 33.0-41.9 … (สีส้ม) … 42.0-51.9 … (สีแดง) ดัชนีความร้อน มากกว่า 52.0 องศาเซลเซียส". (Thairath labels the orange and red rows "ระดับเตือนภัย" too, a typo against the other sources.)

**Edges.** The danger band ends at 51.9 and the top band is written "เกินกว่า 52" / "มากกว่า 52.0", so a value is placed on one decimal: 51.9 is danger, 52.0 and over is extreme danger. Below 27.0 there is no named level.

**Period.** The TMD forecasts the **daily maximum** heat index ("ค่าดัชนีความร้อนสูงสุดรายวัน"). Hazard-huntz recorded that the TMD issues it by region on Mondays, Wednesdays and Fridays (*carried over*).

**Old bands still in print** (don't use): TMD's agromet page (§1.2) has < 27 · 27–32 · 32–41 · 41–54 · > 54, the NWS bands; MGR Online's science page still prints 41–54 and > 54 (search result, 23 Oct 2026).

### 1.2 The formula

- **TMD's agromet heat-index map** (http://www.arcims.tmd.go.th/dailydata/DetailHeatIndex.html, cp874, undated, read 20:04 UTC; linked from `dailydata/HeatIndex.php`, which shows maps for 10:00, 13:00 and 16:00 each day): "ในที่นี้ได้ประมาณค่าดรรชนีความร้อน โดยใช้ผลการตรวจวัดอุณหภูมิอากาศและความชื้นสัมพัทธ์ของอากาศ ด้วยวิธี Stedman's Heat Index (Stedman, 1979)". Its table (with time limits from two Thai physicians' 1997 guidance): น้อยกว่า 27 ปกติ · 27 ถึง 32 ความเสี่ยงต่ำ "ไม่ควรเกิน 50 นาที" · 32 ถึง 41 ความเสี่ยงปานกลาง "45 นาที" · 41 ถึง 54 ความเสี่ยงค่อนข้างสูง "30 นาที" · มากกว่า 54 ความเสี่ยงสูง "20 นาที". ✅ that this TMD page names Steadman; it is an old product with the old bands.
- **TMD's 2012 explainer** "ดัชนีความร้อนคืออะไร" prints the NWS table and the Rothfusz regression with the NWS coefficients (*carried over*, Hazard-huntz §32.8).
- **The NWS equation** (https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml, read 20:03 UTC), T in °F, RH in %:
  `HI = -42.379 + 2.04901523*T + 10.14333127*RH - .22475541*T*RH - .00683783*T*T - .05481717*RH*RH + .00122874*T*T*RH + .00085282*T*RH*RH - .00000199*T*T*RH*RH`;
  subtract `[(13-RH)/4]*SQRT{[17-ABS(T-95.)]/17}` if RH < 13 % and 80 ≤ T ≤ 112 °F; add `[(RH-85)/10] * [(87-T)/5]` if RH > 85 % and 80 ≤ T ≤ 87 °F; "the simple formula is computed first and the result averaged with the temperature" (`HI = 0.5 * {T + 61.0 + [(T-68.0)*1.2] + (RH*0.094)}`), and the regression is used only if that is 80 °F or more. NWS: the Rothfusz regression is a fit to Steadman's results, so the two TMD statements are compatible.
- **A consistency check, not a proof.** The TMD's own example in Thairath, "เวลา 12.00 น. วัดอุณหภูมิได้ 33.0 องศาเซลเซียส วัดความชื้นสัมพัทธ์ได้ 80 เปอร์เซ็นต์ จะมีดัชนีความร้อน 49 องศาเซลเซียส", gives **48.1 °C** with the NWS procedure above (run in a scratch script on 23 Oct 2026). Within 1 °C, so the TMD's number is consistent with the NWS formula; it doesn't show which variant the TMD runs.
- **[unverified]:** the formula and inputs of the current TMD product at `http://www.rnd.tmd.go.th/heatindexanalysis/` (today: HTTP 503, "upstream connect error … connection timeout"; `https://` gave no answer).

### 1.3 Hot days by maximum temperature (TMD) ✅

TMD "เกณฑ์อากาศ", page 1 (https://www.tmd.go.th/info/เกณฑอากาศ, category พยากรณ์, กองพยากรณ์อากาศ, undated, read 19:55 UTC):

> เกณฑ์อากาศร้อน ใช้อุณหภูมิสูงสุดประจำวันและใช้เฉพาะในฤดูร้อน
> 1. อากาศร้อน(Hot) อุณหภูมิตั้งแต่ 35.0 – 39.9 องศาเซลเซียส
> 2. อากาศร้อนจัด(Very Hot) อุณหภูมิตั้งแต่ 40.0 องศาเซลเซียสขึ้นไป

The same page also defines cold (not asked, kept for completeness): "เกณฑ์อากาศหนาว ใช้อุณหภูมิต่ำสุดประจำวันและใช้เฉพาะในฤดูหนาว: อากาศเย็น(Cool) 16.0 – 22.9 · อากาศหนาว(Cold) 8.0 – 15.9 · อากาศหนาวจัด(Very Cold) 7.9 องศาเซลเซียสลงไป".

Note "ใช้เฉพาะในฤดูร้อน": the TMD uses the words only in the hot season. A 36 °C day in October is not "อากาศร้อน" in the TMD's vocabulary.

---

## 2. Dust PM2.5 and the other air pollutants

### 2.1 The PCD notice of 2023 ✅ (re-read)

ประกาศกรมควบคุมมลพิษ เรื่อง ดัชนีคุณภาพอากาศของประเทศไทย พ.ศ. 2566, Royal Gazette vol. 140, special part 157 ง, pp. 3–6, published 3 Jul 2023, signed 16 May 2023 (https://ratchakitcha.soc.go.th/documents/140D157S0000000000300.pdf, 170,958 bytes, read 19:54 UTC). It replaces the notice of 24 Sep 2018 (ข้อ ๑).

- **Clause 3:** "ดัชนีคุณภาพอากาศ แบ่งเป็น ๕ ระดับ … ซึ่งมีคะแนนตั้งแต่ ๐ ถึงมากกว่า ๒๐๐ โดยดัชนีคุณภาพอากาศ ๑๐๐ มีค่าเทียบเท่าค่ามาตรฐานคุณภาพอากาศในบรรยากาศโดยทั่วไป หากดัชนีคุณภาพอากาศมีค่าสูงเกินกว่า ๑๐๐ แสดงว่าค่าความเข้มข้นของมลพิษทางอากาศเกินมาตรฐาน"
- **Clause 4.1, averaging and rounding** (ำ restored): (๑) PM2.5 "ค่าเฉลี่ย ๒๔ ชั่วโมงต่อเนื่อง … (มคก./ลบ.ม.) ทศนิยม ๑ ตำแหน่ง หากมีทศนิยมเกิน ๑ ตำแหน่ง ให้ปัดเลขตามหลักสากล"; (๒) PM10 24 h, "ไม่มีทศนิยม"; (๓) CO "ค่าเฉลี่ย ๘ ชั่วโมงต่อเนื่อง หน่วยส่วนในล้านส่วน (พีพีเอ็ม) ทศนิยม ๑ ตำแหน่ง"; (๔) "ก๊าซโอโซน ค่าเฉลี่ย ๘ ชั่วโมงต่อเนื่อง ไนโตรเจนไดออกไซด์และซัลเฟอร์ไดออกไซด์ ค่าเฉลี่ย ๑ ชั่วโมงต่อเนื่อง หน่วย ส่วนในพันล้านส่วน (พีพีบี) ไม่มีทศนิยม".
- **Clause 4.2:** "ดัชนีย่อยที่มีค่ามากที่สุด ให้ถือเป็นดัชนีคุณภาพอากาศ ณ เวลานั้น". Clause 4.3 gives linear interpolation within a row (the formula itself is an image in the PDF; its symbols are defined: I, X, Xi/Xj, Ii/Ij).
- **Table 1** (levels, meaning, colour): 0–25 ดีมาก ฟ้า · 26–50 ดี เขียว · 51–100 ปานกลาง เหลือง · 101–200 เริ่มมีผลกระทบต่อสุขภาพ ส้ม · 201 ขึ้นไป มีผลกระทบต่อสุขภาพ แดง, with what to do for "ประชาชนทั่วไป" and "ประชาชนกลุ่มเสี่ยง" (older than 60, children up to 5, pregnant women, heart and respiratory patients). The advice per level is already in Hazard-huntz (kit.json → air, KNOWLEDGE §32.3, *carried over*).
- **Table 2** (as printed):

| AQI (I) | PM2.5 µg/m³, 24 h | PM10 µg/m³, 24 h | CO ppm, 8 h | O₃ ppb, 8 h | NO₂ ppb, 1 h | SO₂ ppb, 1 h |
|---|---|---|---|---|---|---|
| 0–25 | 0–15.0 | 0–50 | 0–4.4 | 0–35 | 0–60 | 0–100 |
| 26–50 | 15.1–25.0 | 51–80 | 4.5–6.4 | 36–50 | 61–106 | 101–200 |
| 51–100 | 25.1–37.5 | 81–120 | 6.5–9.0 | 51–70 | 107–170 | 201–300 |
| 101–200 | 37.6–75.0 | 121–180 | 9.1–30.0 | 71–120 | 171–340 | 301–400 |
| ≥ 201 | ≥ 75.1 | ≥ 181 | ≥ 30.1 | ≥ 121 | ≥ 341 | ≥ 401 |

The 24-h PM2.5 standard is 37.5 µg/m³ since 1 Jun 2023 (formerly 50) (*carried over*: Thai PBS 329386 quoting the PCD Director-General, read by Hazard-huntz on 19 Oct 2026). Reports from before mid-2023 still carry the 2018 bands (0–25 · 26–37 · 38–50 · 51–90 · ≥ 91): don't use them.

### 2.2 Hourly PM2.5 ⚠️

PCD's ศูนย์สื่อสารการแก้ไขปัญหามลพิษทางอากาศ (ศกพ.), 27 Jan 2025, quoted by Thansettakij (https://www.thansettakij.com/economy/618002, read 20:13 UTC) and Thai PBS (https://www.thaipbs.or.th/news/content/348609, read 20:13 UTC):

> 1. … ค่านี้เป็นค่าเฉลี่ย 24 ชั่วโมง ซึ่งจะอัพเดทจากข้อมูลที่ตรวจวัดทุกชั่วโมง และหากเราต้องการทราบค่าฝุ่น PM2.5 รายชั่วโมง ให้เลื่อนหน้าจอลงมา … จะแสดงค่าฝุ่น PM2.5 ค่าเฉลี่ย 1 ชั่วโมง และค่าเฉลี่ย 24 ชั่วโมงให้เห็นพร้อมกัน
> 2. การรายงานค่าฝุ่น PM2.5 ประจำวันของกรมควบคุมมลพิษ จะใช้ค่าเฉลี่ย 24 รายชั่วโมง เพื่อเทียบกับค่ามาตรฐานเฉลี่ย 24 ชั่วโมง … ส่วนค่าฝุ่น PM2.5 รายชั่วโมงหรือเฉลี่ย 1 ชั่วโมง จะทำให้หน่วยงานของรัฐทราบแนวโน้มหรือวิเคราะห์ความผิดปกติของสถานการณ์ได้อย่างรวดเร็ว และมีประโยชน์กับประชาชนในการเลือกทำกิจกรรมกลางแจ้งให้เหมาะสมกับช่วงเวลาของประชาชน
> 3. … ค่า AQI ไม่ใช่ค่าฝุ่น และเป็นค่าที่ไม่มีหน่วย … ตัวเลข 235 AQI … ค่าฝุ่น PM2.5 เฉลี่ย 24 ชั่วโมง … เท่ากับ 109.3 ไมโครกรัมต่อลูกบาศก์เมตร บางคนเข้าใจผิดว่าค่าฝุ่นเท่ากับ 235 ซึ่งไม่ถูกต้อง

So: hourly PM2.5 **may be shown**, labelled "ค่าเฉลี่ย 1 ชั่วโมง", for the trend and the timing of outdoor activity. The level belongs to the 24-h average. Whether the PCD colours hourly values with Table 2's bands is not stated anywhere read. Air4Thai's `AQILast` PM2.5 is the 24-h average its colour is judged on (*carried over*, Hazard-huntz docs/08 §4: 170 of 170 colours matched).

---

## 3. UV index

### 3.1 WHO's categories ✅

*Global Solar UV Index: A Practical Guide*, WHO/WMO/UNEP/ICNIRP, WHO/SDE/OEH/02.2 (2002) (IRIS PDF https://iris.who.int/server/api/core/bitstreams/94a908ec-14ee-4bb4-84eb-ace483c9eb51/content, read 20:02 UTC):

- "The UVI should be presented as a single value rounded to the nearest whole number." "When forecasting or reporting daily maxima, a 30-minute time average value should be used." Forecasts without clouds should be called "clear sky" or "cloud free" UVI.
- Table 1, exposure categories: LOW "<2" · MODERATE 3 TO 5 · HIGH 6 TO 7 · VERY HIGH 8 TO 10 · EXTREME 11+. Table 4 (colours): Low (1,2) green · Moderate (3,4,5) yellow · High (6,7) orange · Very high (8,9,10) red · Extreme (11+) purple. (Table 1's "<2" and Table 4's "(1,2)" disagree on 2; with whole numbers the usual reading is 0–2.)
- WHO's Q&A "Radiation: The ultraviolet (UV) index", 20 Jun 2022 (https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index, read about 20:02 UTC through a fetch tool): advice in three tiers, 0–2 "You can safely enjoy being outside!", 3–7 "Seek shade during midday hours! Slip on a shirt, slop on sunscreen and slap on hat!", 8 and above "Avoid being outside during midday hours! … Shirt, sunscreen and hat are a must!".

### 3.2 TMD publishes UV: a clear-sky forecast ✅, with two scales ⚠️

- **The page** https://ozone.tmd.go.th/UV_index.htm (TMD Ozone & Radiation Center, read 19:58 UTC): "แผนที่ Clear-Sky UV Index ประเทศไทย", factors, the 9–15 h warning ("การได้รับปริมาณมากในช่วงเวลา 9-15 น. สามารถเกิดผิวหนังเกรียมแดด (sun burn) จากการได้รับแสงแดดติดต่อกันประมาณ 15 นาที"), and references (Sudhibrabha et al. 2006, *ScienceAsia* 32; KNMI/TEMIS).
- **The map's colours** (https://ozone.tmd.go.th/uvimap.html, read 19:59 UTC) are WHO's edges: `if(u<=2) "#2ecc71"; if(u<=5) "#f1c40f"; if(u<=7) "#e67e22"; if(u<=10) "#e74c3c"; else "#8e44ad"`, after `Math.round`.
- **The data**: `https://ozone.tmd.go.th/ORC/uvi_forecast/uvi-YYYY-MM-DD.csv`, 7 days ahead (`DAYS_AHEAD=7`), columns `station,latitude,longitude,07:30 … 16:30` (half-hourly), **77 stations**; the 24 Oct 2026 file (7,930 bytes, `last-modified: Fri, 23 Oct 2026 07:00:22 GMT`, no CORS header) was read at 19:59 UTC. Its daily clear-sky maxima ranged 8.4 (Chiang Rai) to 10.8 (Yala agromet): 70 stations in 8–10, 7 at 11 or more after rounding. Clear sky means an upper bound: clouds lower it.
- **The conflict.** The same page's protection chart (https://ozone.tmd.go.th/UV_index/protectivetools_202512.png, viewed 19:59 UTC) uses four bands, "1 - 3 low · 4 - 6 medium · 7 - 9 high · 10 + extreme", with sunburn times for two skin types. That is not WHO's scheme and not the map's. Use WHO's (the map's).

---

## 4. Rain

### 4.1 TMD's rain amounts ✅ (period ⚠️)

TMD "เกณฑ์อากาศ", page 1 (read 19:55 UTC; FloodWatch read the same page on 27 Sep 2026, *re-read*):

> เกณฑ์ปริมาณฝน
> 1. ฝนเล็กน้อย(Light Rain) ฝนตกมีปริมาณตั้งแต่ 0.1 มิลลิเมตร ถึง 10.0 มิลลิเมตร
> 2. ฝนปานกลาง(Moderate Rain) ฝนตกมีปริมาณตั้งแต่ 10.1 มิลลิเมตร ถึง 35.0 มิลลิเมตร
> 3. ฝนหนัก(Heavy Rain) ฝนตกมีปริมาณตั้งแต่ 35.1 มิลลิเมตร ถึง 90.0 มิลลิเมตร
> 4. ฝนหนักมาก(Very Heavy Rain) ฝนตกมีปริมาณตั้งแต่ 90.1 มิลลิเมตร ขึ้นไป

- **No period is printed.** FloodWatch applies the words to a 24-h total and says so in its UI as its own reading (FloodWatch KI-224, *carried over*). They are national words for amounts, not local flood thresholds.
- **The rain day is 07:00–07:00 Bangkok time.** The TMD's API list (https://data.tmd.go.th/api/index1.php, read about 20:10 UTC): "WeatherToday … ผลการตรวจวัดลักษณะอากาศรายวัน เวลา 07.00 น. ประกอบด้วยข้อมูล ณ เวลา 07.00 น. และค่าทางสถิติของ 24 ชั่วโมงที่ผ่านมา". The DMR's daily report counts its volunteers' rain "(30 ก.ค. 67 เวลา 07.00 น. – 31 ก.ค. 67 เวลา 07.00 น.)" (§6). HII's daily rain is labelled by the day its window ends (*carried over*, FloodWatch).
- **Spatial words** on the same page, for reading forecasts such as "ร้อยละ 40 ของพื้นที่": ฝนบางพื้นที่ (Isolated) < 20 % · ฝนกระจายเป็นแห่งๆ (Widely Scattered) 20–< 40 % · ฝนกระจาย (Scattered) 40–< 60 % · ฝนเกือบทั่วไป (Almost Widespread) 60–< 80 % · ฝนทั่วไป (Widespread) ≥ 80 % of the area.

### 4.2 Hourly rate: no TMD criteria; WMO ✅

No hourly criterion appears on TMD's criteria pages 1–5. WMO-No. 8, *Guide to Meteorological Instruments and Methods of Observation*, 7th edition (2008), Part I ch. 14, Annex "Criteria for light, moderate and heavy precipitation intensity" (the copy at https://www.weather.gov/media/epz/mesonet/CWOP-WMO8.pdf, read 20:14 UTC):

> Rain (also showers): i < 2.5 mm h–1 Light · 2.5 ≤ i < 10.0 mm h–1 Moderate · 10.0 ≤ i < 50.0 mm h–1 Heavy · ≥ 50.0 mm h–1 Violent

with the notes "Intensity values based on a 3 min measurement period" and "The term "violent" … is inconsistent with the other categories and confusing. A term such as "intense" or "extreme" may be more appropriate."

---

## 5. Wind and storms

### 5.1 The Beaufort scale in TMD's words ✅

TMD "เกณฑ์อากาศ", page 2 (https://www.tmd.go.th/info/เกณฑอากาศ-หนา-2, read 19:56 UTC): "ความเร็วลมที่ระดับสูงมาตรฐาน 10 เมตรเหนือพื้นดินในบริเวณที่โล่งแจ้ง". The TMD table has no Beaufort numbers; they are added here by matching WMO-No. 8 ch. 5 (same km/h and knot ranges, read 20:14 UTC).

| Bft | TMD (TH) | TMD (EN) | knots | km/h | TMD's sign on land |
|---|---|---|---|---|---|
| 0 | ลมสงบ | CALM | < 1 | < 1 | ลมเงียบ ควันลอยขึ้นตรง ๆ |
| 1 | ลมเบา | LIGHT AIR | 1–3 | 1–5 | ควันลอยตามลม แต่ศรลมไม่หันไปตามทิศลม |
| 2 | ลมอ่อน | LIGHT BREEZE | 4–6 | 6–11 | รู้สึกลมพัดที่ใบหน้า ใบไม้แกว่งไกว |
| 3 | ลมโชย | GENTLE BREEZE | 7–10 | 12–19 | ใบไม้และกิ่งไม้เล็ก ๆ กระดิก ธงปลิว |
| 4 | ลมปานกลาง | MODERATE BREEZE | 11–16 | 20–28 | มีฝุ่นตลบ กระดาษปลิว กิ่งไม้เล็กขยับเขยื้อน |
| 5 | **ลมแรง** | FRESH BREEZE | 17–21 | 29–38 | ต้นไม้เล็กแกว่งไกวไปมา มีระลอกน้ำ |
| 6 | ลมจัด | STRONG BREEZE | 22–27 | 39–49 | กิ่งไม้ใหญ่ขยับเขยื้อน ได้ยินเสียงหวีดหวิว ใช้ร่มลำบาก |
| 7 | พายุเกลอ่อน | NEAR GALE | 28–33 | 50–61 | ต้นไม้ใหญ่ทั้งต้นแกว่งไกว เดินทวนลมไม่สะดวก |
| 8 | พายุเกล | GALE | 34–40 | 62–74 | กิ่งไม้หัก ลมต้านการเดิน |
| 9 | พายุเกลแรง | STRONG GALE | 41–47 | 75–88 | อาคารที่ไม่มั่นคงหักพัง หลังคาปลิว |
| 10 | พายุ | STORM | 48–55 | 89–102 | ต้นไม้ถอนรากล้ม เกิดความเสียหายมาก (ไม่ปรากฏบ่อยนัก) |
| 11 | พายุใหญ่ | VIOLENT STORM | 56–63 | 103–117 | เกิดความเสียหายทั่วไป (ไม่ค่อยปรากฏ) |
| 12 | พายุไต้ฝุ่น หรือ เฮอร์ริเคน | TYPHOON or HURRICANE | > 63 | > 117 | — |

- **Careful with "ลมแรง".** In the TMD's scale it is Beaufort 5, 29–38 km/h, not "a strong wind" in general. The app should not print "ลมแรง" for a gale.
- **Averaging (WMO-No. 8 ch. 5):** wind "should represent, for synoptic reports, an average over 10 min"; gusts: "Highest 3 s average". The Beaufort ranges are for the mean wind; applying them to gusts is a choice, not a standard.
- **No TMD wind or gust warning threshold** was found. TMD warnings say "ลมกระโชกแรง" without numbers (e.g. its 7-day outlook of 23 Oct 2026, read 20:10 UTC).
- **Sea state** (TMD criteria page 3, read 19:56 UTC): ทะเลสงบ 0.0–0.10 m · ทะเลเรียบ 0.10–0.50 · มีคลื่นเล็กน้อย 0.50–1.25 · มีคลื่นปานกลาง 1.25–2.50 · มีคลื่นจัด 2.50–4.00 · มีคลื่นจัดมาก 4.00–6.00 · มีคลื่นใหญ่ 6.00–9.00 · มีคลื่นใหญ่มาก 9.00–14.00 · มีคลื่นใหญ่และจัดมาก (ทะเลบ้า) > 14 m.

### 5.2 Tropical cyclones ✅ (with a TMD-internal conflict)

TMD "พายุหมุนเขตร้อนในประเทศไทย Tropical cyclone in Thailand" (https://www.tmd.go.th/info/พายหมนเขตรอนในประเทศไทย-tropical-cyclone-in-thailand, read 20:17 UTC):

> ความเร็วลมสูงสุดที่บริเวณใกล้ศูนย์กลางนำมาใช้เป็นเกณฑ์ในการพิจารณาความรุนแรงของพายุ ซึ่งในย่านมหาสมุทรแปซิฟิกเหนือด้านตะวันตก และทะเลจีนใต้มีการแบ่งตามข้อตกลงระหว่างประเทศดังนี้
> พายุดีเปรสชันเขตร้อน (tropical depression) ความเร็วลมใกล้ศูนย์กลางไม่ถึง 34 นอต (63 กม./ชม.)
> พายุโซนร้อน (tropical storm) ความเร็วลมใกล้ศูนย์กลาง 34 นอต (63 กม./ชม.) ขึ้นไป แต่ไม่ถึง 64 นอต (118 กม./ชม.)
> ไต้ฝุ่น (typhoon) ความเร็วลมสูงสุดใกล้ศูนย์กลางตั้งแต่ 64 นอต (118 กม./ชม.) ขึ้นไป

**Conflict:** TMD "เกณฑ์อากาศ" page 5 (read 19:56 UTC) says "พายุโซนร้อน … ระหว่าง 34 ถึง 64 นอต (63 ถึง 117 กิโลเมตรต่อชั่วโมง)" and "พายุไต้ฝุ่น … 65 นอต หรือมากกว่า หรือ ตั้งแต่ 118 กิโลเมตรต่อชั่วโมง ขึ้นไป", while the paragraph above it on the same page says typhoon winds are "ตั้งแต่ 117 กิโลเมตรต่อชั่วโมง (64 นอต) ขึ้นไป". The cyclone page's "64 kt / 118 km/h" is internally consistent; use it. The same page notes that storms of the Bay of Bengal are called "ไซโคลน".

A cyclone's category is not a level at a point. Whether a storm affects a province comes from the TMD's warning (CAP, §11), not from the category.

---

## 6. Landslide

- **The 100 mm trigger ✅.** DMR's daily geohazard report of 31 Jul 2024 (https://www.dmr.go.th/wp-content/uploads/2024/07/ทธ-240731-รายงานประจำวัน.pdf, read 20:09 UTC), map legend: "ปริมาณน้ำฝนในพื้นที่เสี่ยงภัย มากกว่า 100 มม. ขึ้นไป". The window of its volunteers' gauges: "ปริมาณน้ำฝนที่วัดได้จากเครือข่ายเฝ้าระวังแจ้งเตือนธรณีพิบัติภัยในรอบ 24 ชั่วโมง (30 ก.ค. 67 เวลา 07.00 น. – 31 ก.ค. 67 เวลา 07.00 น.)". (The report also lists volunteers by name; they are not repeated here.)
- **The same number in announcements ⚠️:** Post Today 730219 (11 Sep 2025, read about 20:09 UTC): "ศูนย์ปฏิบัติการธรณีพิบัติภัย กรมทรัพยากรธรณี … ออกประกาศเตือน … 21 จังหวัด … หลังตรวจพบว่ามีฝนตกหนักต่อเนื่อง ปริมาณน้ำฝนในบางพื้นที่วัดได้เกิน 100 มิลลิเมตรภายใน 24 ชั่วโมง". Hazard-huntz holds two more news reports quoting DMR with "over 100 mm" in 24 hours or a day (`dmr-rain-2568`, `dmr-riskvillage-2565`; *carried over*).
- **The multi-day criterion is a model, not a number ✅.** DMR's reports of 13 Jul 2021 and 31 Jul 2024: "พื้นที่คาดการณ์ปริมาณน้ำฝนที่อาจก่อให้เกิดดินถล่มล่วงหน้า 3 วัน จากแบบจำลองพื้นที่อ่อนไหวต่อดินถล่มแบบพลวัต (AP Model)" … "หมายเหตุ AP Model เป็นการวิเคราะห์ข้อมูลเชิงสถิติของปริมาณน้ำฝนสะสมและเหตุการณ์ดินถล่มในอดีตนำมาสร้างเกณฑ์น้ำฝนสะสมวิกฤตสำหรับเฝ้าระวังและแจ้งเตือนภัยดินถล่ม ข้อมูลการคาดการณ์ปริมาณน้ำฝนล่วงหน้า 72 ชั่วโมง โดยสถาบันสารสนเทศทรัพยากรน้ำ (องค์การมหาชน) ได้นำมาวิเคราะห์ด้วยแบบจำลอง AP Model". Its output is a list of provinces "เฝ้าระวังในระยะ 1-3 วันนี้". The critical accumulated amounts themselves are **not published** in anything read; a 3-day number (e.g. "300 mm") is **[unverified]** and was not seen.
- **DMR's 25 soil-movement stations** have their own criteria ("ปริมาณน้ำฝนและเกณฑ์การแจ้งเตือนจากสถานีตรวจติดตามการเคลื่อนตัวของมวลดิน … 56 มม. /ปริมาณน้ำฝนอยู่ในเกณฑ์ปกติ"); the numbers are not printed.
- **Where:** DMR's `HAZARD/VILLLAGE_RISK` layer (11,475 villages, mapped 2556) and `FLASHFLOOD_TAMBON` on `gis.dmr.go.th` (1,084 subdistricts) answered on 20–21 Oct 2026; their licence is not stated (*carried over*, Hazard-huntz docs/08 §2b).

---

## 7. Flash flood and river flood

### 7.1 HII's flash-flood risk areas ✅ (classes [unverified])

- ThaiWater's own page text (in https://www.thaiwater.net/dist/js/app.chunk.js, 7.6 MB, read 20:05 UTC): "ระบบเตือนภัยน้ำท่วมฉับพลัน เป็นระบบที่ใช้คาดการณ์พื้นที่เสี่ยงน้ำท่วมฉับพลัน ที่จะเกิดขึ้นใน 24 ชม. ข้างหน้า โดยใช้เทคนิคการซ้อนทับข้อมูล 3 ข้อมูล ได้แก่ 1) ดัชนีศักยภาพการเกิดน้ำท่วมฉับพลัน (FFPI Index) 2) สถานะระดับความชื้นสะสมในดิน (AMC Class) และ 3) ฝนคาดการณ์ (WRF-ROMS) โดยระบบมีการประมวลผลรายวัน และแจ้งเตือนพื้นที่ถึงระดับตำบล".
- The list: `https://fews2.hii.or.th/model-output/data_portal/flashflood/flashflood_report.txt`, columns "รหัสตำบล","จังหวัด","อำเภอ","ตำบล","FFPI","ฝนสะสม 1 วันล่วงหน้า","สถานีโทรมาตรเพื่อติดตามสถานการณ์","ลุ่มน้ำ". At 19:54 UTC today it held the header only (271 bytes: no subdistrict listed). On 21 Oct it listed ต.ทางพูน, FFPI 4.61, 85.66 mm (*carried over*).
- **The FFPI is a static susceptibility index** (slope, land cover, soil); a listed subdistrict is HII's own verdict for the next 24 h. FFPI class edges and the rule for being listed were not found. The general literature uses a 1–10 FFPI (search results only).

### 7.2 DWR's village warning posts ✅ (thresholds not published)

- DWR, "EARLY WARNING SYSTEM ระบบเตือนภัยล่วงหน้าน้ำหลาก- ดินถล่ม", report of 17 Sep 2018 (https://dwr.go.th/uploads/file/statuswater/2018/DWR20180917%20Report_Early%20warning.pdf, read 20:14 UTC): the station table "ปริมาณฝนตกสะสมสูงสุด … เวลาสะสม (ชม.) ปริมาณฝน (มม.) … ระดับสถานการณ์การเตือนภัย" (e.g. 12 h 196.0 mm "เตรียมพร้อม"), and alerts "1. เตือนภัยสีเขียว … 2. เตือนภัยสีเหลือง … 3. เตือนภัยสีแดง" on rain (mm) or on level (m on the post).
- DWR's report of Mar 2023 (https://dwr.go.th/uploads/file/statuswater/2023/660321%20Manager.pdf, read 20:14 UTC): "ระดับการเตือนภัย" by village: "เฝ้าระวัง 4 หมู่บ้าน · เตรียมพร้อม 4 หมู่บ้าน · อพยพ - หมู่บ้าน".
- **Three levels: เฝ้าระวัง, เตรียมพร้อม, อพยพ.** Green = เฝ้าระวัง, yellow = เตรียมพร้อม, red = อพยพ is an inference ⚠️: in the 2018 report the same post (บ้านกงษีไร่) is "เตือนภัยสีเหลือง" at 165.5 mm and "เตรียมพร้อม" at 196.0 mm/12 h.
- **The numbers are per post** and not published. Green alerts in the 2018 report fired at 83.5–110.5 mm; that is what happened, not a rule. FloodWatch could not confirm a research claim of "100 / 150 mm/24 h" as DWR thresholds: they are not in the feed (*carried over*). The feed (`ews.dwr.go.th`, `LoadStation`) answers only from Thailand and carries `status` 0–3 and 9; the meaning of each code is not documented (*carried over*).

### 7.3 River levels: ThaiWater's classes ✅

ThaiWater's app code (the same bundle, read 20:05 UTC) colours a gauge by `storage_percent`:

```
e>100 → ล้นตลิ่ง (red) · e>70 → มาก (blue) · e>30 → ปกติ (green) · e>10 → น้อย (yellow) · e<=10 → น้อยวิกฤต (brown)
legend: น้อยวิกฤต "<=10" · น้อย ">10-30" · ปกติ ">30-70" · มาก ">70-100" · ล้นตลิ่ง ">100"
chart: "น้ำล้นตลิ่ง ( > 100% )" · "น้ำมาก ( > 70-100% )" · "น้ำปานกลาง ( > 30-70% )" · "น้ำน้อย ( > 10-30% )" · "น้ำน้อยวิกฤต ( < 10% )"
```

- `situation_level` 1–5 in `waterlevel_load` follows the same classes: in HII's file of 21 Oct 2026 the observed `storage_percent` ranges were 1: −53.6–9.9 · 2: 10.3–30.0 · 3: 30.0–69.8 · 4: 70.1–99.0 · 5: 100.6–129.0 (FloodWatch `research/2026-10-21_status_category_failures.log`, *re-read*).
- `storage_percent` = (level − ground) / (bank − ground) × 100, and 35 gauges carry `ground_level` 0, which inflates it (FloodWatch KNOWLEDGE §97, *re-read*). "ปกติ" in ThaiWater is 30–70 % of the channel; below 30 % is "น้อย" (low water), not a flood level.
- ONWR's National Thai Water shows the same colours from the same HII file (FloodWatch §97). ONWR's official area warning per subdistrict (`api.waterrisk.onwr.go.th`) was unreachable from research hosts and its class labels were inconsistent (*carried over*).

### 7.4 FloodWatch's status ✅ (its own heuristic)

`src/floodwatch/forecast/__init__.py` → `classify_status` (re-read today), labelled in its docstring "heuristic thresholds, ⚠️ to calibrate against official levels":

```python
if level >= bank: "critical"
pct = (level - ground) / (bank - ground) * 100   # when a ground below the bank exists
if pct is None: "warning" if bank - level < 0.3 else "normal"
if pct >= 90: "warning"
if pct >= 70: "watch"
else: "normal"
```

BMA canal gauges use BMA's own levels (`bma_status`, D-038): critical = over the bank · warning = over BMA `critical` ("คลองเต็ม") · watch = over BMA `warning` ("คลองเริ่มเต็ม") · normal ("คลองยังรับน้ำได้"). FloodWatch's Thai words: `critical` "ล้นตลิ่งแล้ว", `warning` "ใกล้ล้นตลิ่ง", `watch` "น้ำเริ่มสูง", `normal` "ยังรับน้ำได้" (`explain.py`). On 21 Oct 2026 its statuses matched ONWR's colours on the same readings: critical ↔ level 5 (21/21), warning and watch ↔ level 4 (138/139) (FloodWatch §97, *re-read*). Its gauge banks follow ONWR's (D-199); agencies' levels are never mixed (BMA and HII differ by 0.3–0.6 m).

---

## 8. Earthquake

### 8.1 What the TMD reports ✅

- The TMD's list "แผ่นดินไหวภายในประเทศและใกล้เคียง" (https://earthquake.tmd.go.th/, and `feed/rss_inside.xml`, read 20:11 UTC) carries every located event in and near Thailand, down to small ones: today M 4.2 Laos, 2.5 Myanmar, 1.8 and 2.4 at ต.ปากน้ำ อ.สวรรคโลก จ.สุโขทัย, 1.6–1.9 Laos, 1.9 Chiang Dao. Times are Thai time, with UTC on the page.
- **TMD's operating criteria ⚠️** (Thai PBS ข่าวค่ำ, 15 Apr 2025, quoting the TMD deputy director-general, https://www.thaipbs.or.th/program/EveningNews/watch/hvQXSI, read 20:12 UTC):
  > 1. ถ้าเกิดแผ่นดินไหว น้อยกว่า 2.5 อยู่ในเกณฑ์ไม่มีผลกระทบ (สีเขียว) จะแจ้งผ่านเว็บไซต์และโซเชียลมีเดียของกรมอุตุฯ
  > 2. ถ้าเกิดแผ่นดินไหวขนาด 2.5-3.9 จะอยู่ในเกณฑ์ผลกระทบ เล็กน้อย-ปานกลาง (สีเหลือง) ซึ่งต้องเฝ้าระวัง จะเพิ่มช่องทางแจ้งเตือน เช่น ส่ง SMS ไปยังกลุ่มหน่วยงานที่เกี่ยวข้อง …
  > 3. ถ้าเกิดแผ่นดินไหวขนาดมากกว่า 4.0 จะอยู่ในเกณฑ์ผลกระทบปานกลาง-รุนแรง (สีแดง) จะเพิ่มการแจ้งเตือนไปถึงผู้บริหารหน่วยงาน และออกประกาศอย่างเป็นทางการ

  He also said the same magnitude at a different depth gives a different intensity. The rule is by magnitude only, with no distance; exactly 4.0 falls between "2.5-3.9" and "มากกว่า 4.0".
- **Magnitude and shaking near the epicentre** (TMD "ความรุนแรงแผ่นดินไหว", https://www.tmd.go.th/info/ความรนแรงแผนดนไหว, read 19:56 UTC), "ความสัมพันธ์ของขนาดโดยประมาณกับความสั่นสะเทือนใกล้ศูนย์กลาง": 1-2.9 "เกิดการสั่นไหวเล็กน้อย ผู้คนเริ่มมีความรู้สึกถึงการสั่นไหว บางครั้ง รู้สึกเวียน ศีรษะ" · 3-3.9 "ผู้คนที่อยู่ในอาคารรู้สึกเหมือนรถไฟวิ่งผ่าน" · 4-4.9 "เกิดการสั่นไหวปานกลาง … วัตถุห้อยแขวนแกว่งไกว" · 5-5.9 "เกิดการสั่นไหวรุนแรงเป็นบริเวณกว้าง เครื่องเรือน และวัตถุมีการเคลื่อนที่" · 6-6.9 "เกิดการสั่นไหวรุนแรงมาก อาคารเริ่มเสียหาย พังทลาย" · 7.0 ขึ้นไป "เกิดการสั่นไหวร้ายแรง อาคาร สิ่งก่อสร้างมีความเสียหายอย่างมาก …".
- **Felt events:** "โดยเฉลี่ยเกิดแผ่นดินไหวรู้สึกได้ประมาณปีละ 5-6 ครั้ง" (TMD, ความรู้ทั่วไปแผ่นดินไหว.pdf, https://earthquake.tmd.go.th/file_downloads/ความรู้ทั่วไปแผ่นดินไหว.pdf, read 19:57 UTC). No TMD rule of magnitude and distance for "felt" was found.
- **Magnitude type:** the RSS gives `tmd:magnitude` without a type; the TMD PDF explains ML, mb, Ms and Mw and says Mw is mostly used for large distant events. Which type each RSS value is: **[unverified]**.

### 8.2 Intensity scales ✅

- **There is no separate Thai intensity scale.** TMD: "ในกรณีของประเทศไทยใช้ มาตราเมอร์แคลลี่ สำหรับเปรียบเทียบอันดับซึ่งมีทั้งหมด 12 อันดับ". Its short Thai wording (same page): I "เป็นอันดับที่อ่อนมาก ตรวจวัดโดยเครื่องมือ" · II "พอรู้สึกได้สำหรับผู้ที่อยู่นิ่ง ๆ ในอาคารสูง ๆ" · III "พอรู้สึกได้สำหรับผู้อยู่ในบ้าน แต่คนส่วนใหญ่ยังไม่รู้สึก" · IV "ผู้อยู่ในบ้านรู้สึกว่าของในบ้านสั่นไหว" · V "รู้สึกเกือบทุกคน ของในบ้านเริ่มแกว่งไกว" · VI "รู้สึกได้กับทุกคนของหนักในบ้านเริ่มเคลื่อนไหว" · VII "ทุกคนต่างตกใจ สิ่งก่อสร้างเริ่มปรากฎความเสียหาย" · VIII "เสียหายค่อนข้างมากในอาคารธรรมดา" · IX "สิ่งก่อสร้างที่ออกแบบไว้อย่างดี เสียหายมาก" · X "อาคารพัง รางรถไฟบิดงอ" · XI "อาคารสิ่งก่อสร้างพังทลายเกือบทั้งหมด …" · XII "ทำลายหมดทุกอย่าง มองเห็นเป็นคลื่นบนแผ่นดิน". The TMD PDF's Table 4 has a longer version.
- **USGS:** the MM scale of 1931 (Wood and Neumann) "does not have a mathematical basis; instead it is an arbitrary ranking based on observed effects" (https://www.usgs.gov/programs/earthquake-hazards/modified-mercalli-intensity-scale, read 20:16 UTC). ShakeMap's legend (`shakemap_modules` 1.1.18 on PyPI, `data/mapping/map_strings.en`, read about 20:15 UTC): intensity `I · II-III · IV · V · VI · VII · VIII · IX · X+`, shaking `Not felt · Weak · Light · Moderate · Strong · Very strong · Severe · Violent · Extreme`, damage `None · None · None · Very light · Light · Moderate · Moderate/heavy · Heavy · Very heavy`.

### 8.3 Choosing an intensity-prediction equation

- **Atkinson, Worden & Wald (2014)**, "Intensity prediction equations for North America" (BSSA): its coefficients were **not found** in any open text or code today. It is not in OpenQuake 3.26.2, `esi-shakelib` 1.2.1 or `shakemap-modules` 1.1.18 (wheels listed today); the USGS page of Teng, Baker & Wald (2022, BSSA 112(1), doi:10.1785/0120210150) names it without coefficients. Don't use any AWW 2014 numbers until they are copied from the paper. It was also fitted to North America (Teng et al.: developed on central and eastern US DYFI data with Mw > 3).
- **Allen, Wald & Worden (2012)**, "Intensity attenuation for active crustal regions", *J. Seismology* 16: 409–433: in OpenQuake, and fitted to active crustal regions, which fits the shallow crustal quakes of Myanmar, northern Thailand and Laos better than a North American model.

### 8.4 Allen, Wald & Worden (2012): the coefficients ✅ (from code)

Copied from `openquake/hazardlib/gsim/allen_2012_ipe.py` in `openquake.engine` 3.26.2 (PyPI wheel `openquake_engine-3.26.2-py3-none-any.whl`, file dated 2026-07-23, read about 20:00 UTC). `ln` is the natural log (`np.log`); distances in km.

**Rupture distance** (`AllenEtAl2012`):

```
MMI = c0 + c1·M + c2·ln( sqrt( Rrup² + (1 + c3·exp(M − 5))² ) )
σ   = s1 + s2 / (1 + (Rrup/s3)²)
IMT   c0     c1      c2     c3     s1    s2    s3
mmi   3.950  0.913  -1.107  0.813  0.72  0.23  44.7
```

**Hypocentral distance** (`AllenEtAl2012Rhypo`):

```
Rm  = m1 + m2·exp(M − 5)
MMI = c0 + c1·M + c2·ln( sqrt( Rhypo² + Rm² ) ) + [ c4·ln(Rhypo/50) if Rhypo > 50 km ]
σ   = s1 + s2 / (1 + (Rhypo/s3)²)
IMT   c0     c1     c2      c3   c4     m1      m2     s1    s2    s3
mmi   2.085  1.428  -1.402  0.0  0.078  -0.209  2.042  0.82  0.37  22.9
```

- **Cross-check:** another session's uncommitted script in this repository, `research/e4_quake_ipe.py` (seen at 20:29 UTC, not edited), copied the same file from OpenQuake's git master and has identical values for both forms.
- The code comment says "Required rupture parameters are magnitude (ML is used)"; which magnitude the paper's fit uses, and the paper's validity ranges of magnitude and distance, are **[unverified]**: the paper was not opened.
- **Sanity table** (hypocentral form; from a scratch script written from the file above and run on 23 Oct 2026; MMI, no site term):

| M | 10 km | 30 km | 50 km | 100 km | 200 km | 500 km | 1,000 km |
|---|---|---|---|---|---|---|---|
| 4.0 | 4.6 | 3.0 | 2.3 | 1.4 | 0.5 | −0.7 | −1.7 |
| 5.0 | 6.0 | 4.5 | 3.7 | 2.8 | 1.9 | 0.7 | −0.2 |
| 6.0 | 7.2 | 5.9 | 5.2 | 4.2 | 3.3 | 2.1 | 1.2 |
| 7.0 | 8.0 | 7.2 | 6.5 | 5.7 | 4.8 | 3.5 | 2.6 |
| 7.7 | 8.2 | 7.8 | 7.4 | 6.6 | 5.7 | 4.5 | 3.6 |

- **Limits to state on screen.** No site term. The 28 Mar 2025 Myanmar earthquake (TMD's announcement quoted by Thansettakij 623360, read 20:12 UTC: 21.682 N, 96.121 E, "ขนาด 8.2. ริกเตอร์ ความลึก 10 กิโลเมตร"; USGS M 7.7, `us7000pn9s`, *carried over*) was 996 km from central Bangkok (great-circle, computed today); the table gives MMI ≈ 3.6 there ("Weak/Light", no damage), yet Thairath (29 Mar 2025, https://www.thairath.co.th/news/local/bangkok/2849972, read 20:12 UTC) reported a collapsed building in Chatuchak ("ตึกถล่ม ย่านจตุจักร"). Soft ground and tall buildings are outside the equation; the app must say so. A point source also understates shaking along a long rupture; for M ≥ 7 use the rupture-distance form with a fault trace when one is published. Values below 1 mean not felt.

---

## 9. Fire hotspots and smoke

- **VIIRS confidence ✅** (NASA FIRMS, https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs, read 20:01 UTC): "Confidence values are set to low, nominal and high. Low confidence daytime fire pixels are typically associated with areas of sun glint and lower relative temperature anomaly (<15K) in the mid-infrared channel I4. Nominal confidence pixels are those free of potential sun glint contamination during the day and marked by strong (>15K) temperature anomaly in either day or nighttime data. High confidence fire pixels are associated with day or nighttime saturated pixels." The FAQ (https://www.earthdata.nasa.gov/data/tools/firms/faq, read 20:01 UTC): "there is no way to establish an optimal cutoff a priori"; "Users requiring fewer false alarms may wish to retain only nominal- and high-confidence fire pixels".
- **MODIS** confidence is 0–100 % with the same three classes (attribute page); the percentages that separate them are **[unverified]** (the MODIS user guide's host failed TLS verification today; checking was not turned off).
- **Today's file** (`SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv`, 1,927,332 bytes, read 20:01 UTC): 23,500 rows (nominal 21,598, high 960, low 942); 157 inside Thailand's bounding box 5.6–20.5 N, 97.3–105.7 E (which includes parts of neighbours): nominal 154, low 3; day 145, night 12. The `confidence` column holds `low`/`nominal`/`high` as words.
- **GISTDA's practice ⚠️** (The Bangkok Insight, 17 Jan 2025, https://www.thebangkokinsight.com/news/politics-general/general/1440402/, read 20:17 UTC): "GISTDA เผยข้อมูลจากดาวเทียมซูโอมิ เอ็นพีพี (Suomi NPP) ระบบ VIIRS และจากข้อมูลดาวเทียมดวงอื่น ๆ … ประเทศไทยมีจุดความร้อนรวม 457 จุด … เกิดขึ้นในพื้นที่เกษตร 160 จุด พื้นที่ป่าสงวนแห่งชาติ 117 จุด พื้นที่ชุมชนและพื้นที่อื่นๆ 69 จุด พื้นที่เขต สปก. 67 จุด พื้นที่ป่าอนุรักษ์ 37 จุด และพื้นที่ริมทางหลวง …". GISTDA counts per day by province and land-use class; it publishes **no level or alert threshold** in what was read. Its dashboard `fire.gistda.or.th` failed to connect today (TLS error); its API needs a key (*carried over*).
- **Smoke** has no separate scale: its health level is PM2.5 (§2).

---

## 10. Tsunami

- **No open official list or map of tsunami-risk areas was found.** `ndwc.go.th` and `www.ndwc.go.th`: **NXDOMAIN** at the `go.th` registry today (Google DNS, 20:12 UTC, `"Status":3`, SOA `a.thains.co.th`), as on 20 Oct 2026. `www.disaster.go.th` answered **403** (a bot check, as before; not solved).
- **DDPM's numbers ⚠️** (Bangkok Biz News, 6 Jul 2022, quoting DDPM, https://www.bangkokbiznews.com/lifestyle/1013996, read 20:13 UTC): "พื้นที่เสี่ยง ของไทยที่อาจเกิดเหตุคลื่นยักษ์สึนามิ คือ พื้นที่ชายฝั่งทะเลด้านทะเลอันดามัน รวม 6 จังหวัด ได้แก่ ภูเก็ต พังงา ระนอง กระบี่ ตรัง และสตูล ครอบคลุมพื้นที่ 27 อำเภอ 102 ตำบล 509 หมู่บ้าน", and the warning system "ส่งสัญญาณผ่านดาวเทียมแจ้งเตือนไปยังหอเตือนภัยและอุปกรณ์เตือนภัยที่ติดตั้งอยู่ในพื้นที่เสี่ยงภัย 6 จังหวัดชายฝั่งทะเลอันดามัน จำนวน 226 แห่ง". **Conflict:** Hazard-huntz docs/08 recorded "6 provinces, 27 districts and 108 subdistricts [unverified]"; the subdistrict count is 102 in the report read today.
- **The towers' messages ⚠️** (Thai PBS, 27 Jun 2025, DDPM's drill, https://www.thaipbs.or.th/news/content/353652, read 20:12 UTC): "M2 แจ้งเกิดแผ่นดินไหวในทะเล เสียงเตือนว่า "โปรดทราบ โปรดทราบ เกิดแผ่นดินไหวในทะเล อาจเกิดคลื่นสึนามิ ขอให้ออกจากชายหาดให้ไกลที่สุด ไปยังพื้นที่สูงโดยด่วน"" and "M3 แจ้งเตือนสึนามิ … "ขณะนี้เกิดคลื่นสึนามิ ขอให้ออกจากชายหาดให้ไกลที่สุด ไปยังพื้นที่สูงโดยด่วน"".
- **TMD's rule for people ✅** (https://www.tmd.go.th/info/มาตรการปองกนภยจากคลนสนาม, read 19:56 UTC): "เมื่อรู้สึกว่ามีการสั่นไหวเกิดขึ้น ขณะที่อยู่ในทะเลหรือบริเวณชายฝั่ง ให้รีบออกจากบริเวณชายฝั่งไปยังบริเวณที่สูงหรือที่ดอนทันที โดยไม่ต้องรอประกาศจากทางการ" and "สังเกตปรากฏการณ์ของชายฝั่งหากทะเลมีการลดระดับของน้ำลงมาก หลังการเกิดแผ่นดินไหวให้สันนิษฐานว่าอาจเกิดคลื่นสึนามิตามมาได้".
- No magnitude rule for a tsunami threat from a Thai agency was found; TMD's `rss_tsunami.xml` gives an error page and PTWC covers the Pacific only (*carried over*).

---

## 11. Official warnings (CAP) ✅

- **TMD's feed** `https://www.tmd.go.th/api/xml/CAP` (read 20:11 UTC; `<copyright>public domain`). Today's item (`CAPTMD20261023164718_2.xml`): `event` "Heavy Rain", `urgency` Immediate, `severity` **Severe**, `certainty` Likely, `effective` 2026-10-23T18:00+07:00, `expires` 2026-10-24T08:00+07:00, headline "พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย", 11 southern provinces as `ISO3166-2` codes (TH-80 … TH-96). So the TMD marks its routine heavy-rain risk-area product "Severe".
- **OASIS CAP 1.2** (https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html, read 20:11 UTC), severity: "Extreme" - Extraordinary threat to life or property · "Severe" - Significant threat to life or property · "Moderate" - Possible threat to life or property · "Minor" - Minimal to no known threat to life or property · "Unknown" - Severity unknown.

---

## What is still unverified

1. **The TMD's current heat-index formula and its full four bands on a TMD page.** `rnd.tmd.go.th/heatindexanalysis/` timed out (503) today as on 18–19 Oct. The bands rest on news quoting the BMA, the DOH and the TMD, plus one TMD page for 42.0–51.9 (carried over).
2. **Hourly PM2.5 colours.** The PCD says what hourly values are for; it doesn't say whether they may be coloured with the 24-h bands.
3. **FFPI classes** and HII's rule for listing a subdistrict in `flashflood_report.txt`.
4. **DWR's thresholds per post**, the meaning of `status` 0–3 and 9, and the colour ↔ level-name mapping (inferred from one report).
5. **DMR's multi-day critical rain** (the AP Model's numbers). Only "> 100 mm in 24 h" is in DMR's own document.
6. **AWW 2014 coefficients**; the magnitude type and validity ranges of Allen et al. (2012); a site-amplification term for the Bangkok basin; which magnitude type the TMD's RSS gives.
7. **The TMD's earthquake operating criteria** rest on one TV news report (15 Apr 2025), and exactly 4.0 falls between two bands.
8. **MODIS confidence percentages.**
9. **An official list or map of tsunami-risk villages** (DDPM's 509 villages are known only as a count; 102 vs 108 subdistricts), and whether NDWC's role now sits at another domain.
10. **TMD wind/gust warning numbers and hourly rain criteria:** none found; the period of TMD's rain-amount words is not printed.
11. **TMD's own conflicts:** typhoon "65 นอต" on criteria page 5 vs "64 นอต (118 กม./ชม.)" on the cyclone page; the UV protection chart's 4 bands vs WHO's 5 on the map.
12. **ONWR's subdistrict flood warnings** (`api.waterrisk.onwr.go.th`) and their classes: not reachable from research hosts.

---

## Recommended level scheme for the app

**One scheme for every hazard:** ปกติ (normal) · เฝ้าระวัง (watch) · เตือนภัย (warning) · อันตราย (danger). Rules that apply to all:

1. **Show the agency's own band next to the app's level**, in the agency's words ("เตือนภัย · ส้ม เริ่มมีผลกระทบต่อสุขภาพ (กรมควบคุมมลพิษ)"), with the source and its time. Never re-label one agency's scale with another's (no US AQI, no FFPI re-classing, no BMA level against an HII bank).
2. **An official warning wins.** A TMD CAP alert, a DDPM Cell Broadcast or a DMR/DWR evacuation notice for the user's province sets the level for that hazard at least as high as the mapping below. CAP severity → level: Minor → เฝ้าระวัง, Moderate → เฝ้าระวัง, Severe → เตือนภัย, Extreme → อันตราย. *App's choice*, made because the TMD marks its routine heavy-rain product "Severe": mapping Severe to อันตราย would put a third of the country in danger most rainy days.
3. **Round as the agency does before placing a value** (PM2.5 one decimal, AQI and PM10 whole numbers, heat index and rain one decimal, UVI whole number), then take the band whose edges contain it.
4. **The 12–72 h outlook uses the same cut points**, labelled "คาดการณ์" with the issue time: TMD's daily-max heat index (Mon/Wed/Fri), TMD's clear-sky UV CSV (7 days; an upper bound), TMD's 7-day forecast and heavy-rain risk areas, HII's flash-flood list (24 h), DMR's AP Model (1–3 days), FloodWatch's 24/48/72 h bank chances. Earthquakes and tsunamis have no outlook.
5. **Where no agency sets a level, the mapping below is the app's own and says so on screen** ("ระดับนี้แอปกำหนดเอง จากเกณฑ์ของ …").

| Hazard (value) | ปกติ | เฝ้าระวัง | เตือนภัย | อันตราย | Whose mapping |
|---|---|---|---|---|---|
| Heat index (daily max, °C) | < 27.0 | 27.0–32.9 · DOH/TMD เฝ้าระวัง | 33.0–41.9 · เตือนภัย | ≥ 42.0 · อันตราย (42.0–51.9) and อันตรายมาก (≥ 52.0), shown as its own sub-label | **Agency names, 1:1**; merging the top two into อันตราย is the app's choice. Expect เฝ้าระวัง or higher often: the regional maxima the TMD forecast for 27–29 Feb 2024 were all 30.3 °C or more (Thairath). That is the DOH's own scheme, not an app setting |
| Max temperature (°C), only when no heat index | < 35.0 | 35.0–39.9 · อากาศร้อน | ≥ 40.0 · อากาศร้อนจัด | — | **App's choice** to turn TMD words into levels; TMD uses them only in the hot season |
| PM2.5 (24-h average, µg/m³) | 0–25.0 · ฟ้า, เขียว | 25.1–37.5 · เหลือง | 37.6–75.0 · ส้ม | ≥ 75.1 · แดง | PCD bands; joining blue and green into ปกติ is the **app's choice** (both are below the standard; the PCD asks people at risk to watch for symptoms at green) |
| Thailand's AQI (highest sub-index) | 0–50 | 51–100 | 101–200 | ≥ 201 | the same |
| PM10, CO, O₃, NO₂, SO₂ | rows 1–2 of Table 2 | row 3 | row 4 | row 5 | the same; their own averaging periods |
| PM2.5 (1-h) | — | — | — | — | **no level**; a trend line labelled "ค่าเฉลี่ย 1 ชั่วโมง" (PCD) |
| UV index (current half-hour, whole number) | 0–2 · Low | 3–7 · Moderate, High | 8–10 · Very high | ≥ 11 · Extreme | WHO categories grouped by **WHO's three advice tiers** (3–7 one message); the grouping is the **app's choice**. Use the current value, not the daily maximum: the clear-sky maximum was ≥ 8 at all 77 TMD stations on 24 Oct 2026 |
| Rain, 24 h (07:00–07:00, mm; observed or forecast) | 0–10.0 · none or ฝนเล็กน้อย | 10.1–35.0 · ฝนปานกลาง | 35.1–90.0 · ฝนหนัก | ≥ 90.1 · ฝนหนักมาก | TMD words; one step below each TMD class is the **app's choice**. TMD's period is not printed (FloodWatch applies it to 24 h too) |
| Rain rate (mm/h) | < 2.5 | 2.5–< 10.0 | 10.0–< 50.0 | ≥ 50.0 | WMO-No. 8 classes; **app's choice** to use them (no TMD hourly criteria) |
| Wind, 10-min mean (km/h) | ≤ 38 · Bft ≤ 5 | 39–61 · ลมจัด, พายุเกลอ่อน | 62–88 · พายุเกล, พายุเกลแรง | ≥ 89 · พายุ and above | TMD/WMO Beaufort words; the grouping is the **app's choice**. Applying it to gusts is also the app's choice ⚠️ and must say "ลมกระโชก" |
| Tropical cyclone affecting the province (TMD warning) | none | พายุดีเปรสชันเขตร้อน | พายุโซนร้อน | ไต้ฝุ่น | TMD classes; "affecting" only from a TMD warning; the mapping is the **app's choice** |
| River gauge near the point (FloodWatch) | normal | watch (70–< 90 % of the channel; BMA: over BMA warning) | warning (≥ 90 %; BMA: over BMA critical) | critical (at or over the bank) | **FloodWatch's own heuristic**, labelled so; matches ONWR's colours (level 4 split at 90 %, level 5) |
| Flash flood | nothing below | DWR post at เฝ้าระวัง, or a TMD heavy-rain alert for a hilly province | subdistrict listed in HII's flash-flood report (next 24 h), or a DWR post at เตรียมพร้อม | DWR อพยพ, or an evacuation notice (DMR/DDPM) | each agency's own product; **combining them is the app's choice** |
| Landslide (in a DMR risk-village subdistrict) | nothing below | DMR's AP Model lists the province "เฝ้าระวังในระยะ 1-3 วัน", or 24-h rain 35.1–100 mm | 24-h rain > 100 mm (DMR's trigger), or a DMR announcement for the province | a DMR/DDPM evacuation notice, or DWR อพยพ | the 100 mm trigger is **DMR's**; the rest is the **app's choice**. Outside DMR's risk villages, show the rain only |
| Earthquake, estimated MMI at the point (Allen et al. 2012, hypocentral) | < 3.0 (I–II) | 3.0–4.9 (III–IV: Weak, Light; felt, no damage) | 5.0–5.9 (V: Moderate; very light damage) | ≥ 6.0 (VI+: Strong and above; damage possible) | ShakeMap's shaking and damage words; the cut points are the **app's choice**. Show TMD's event colour (< 2.5 / 2.5–3.9 / > 4.0) beside it; say on screen that soft ground (Bangkok) can shake more |
| Fire hotspots (VIIRS nominal + high, last 24 h) | none within 10 km | ≥ 1 within 10 km | ≥ 1 within 2 km | — (danger only through PM2.5 red or an official order) | **entirely the app's choice**; no Thai agency publishes a hotspot level. Low-confidence pixels left out, as FIRMS suggests for fewer false alarms |
| Tsunami (in the 6 Andaman provinces) | no event | TMD has issued an announcement for an earthquake in the Andaman Sea or off Sumatra | — | a tsunami warning (TMD/DDPM, tower M2/M3, Cell Broadcast), or "felt strong shaking at the coast" (TMD: leave the coast without waiting) | official messages; the watch trigger is the **app's choice**. Never an "all clear" from the app; without an official risk-village list, the app can't say a place is outside the risk area |

**What the app should not do:** compute a level from a model (Open-Meteo, CAMS, GloFAS) and present it as an agency's; turn a static index (FFPI, DMR susceptibility) into a live danger; call a TMD "ลมแรง" (29–38 km/h) a gale; show a UV, heat or dust colour from another country's scale.

---

## Sources

| id | Title | URL | Read (UTC) | Kind | Status |
|---|---|---|---|---|---|
| `pcd-aqi-2566` | ประกาศกรมควบคุมมลพิษ เรื่อง ดัชนีคุณภาพอากาศของประเทศไทย พ.ศ. 2566 (ราชกิจจานุเบกษา 140 ตอนพิเศษ 157 ง) | https://ratchakitcha.soc.go.th/documents/140D157S0000000000300.pdf | 2026-10-23 19:54 | official | verified |
| `pcd-hourly-thansettakij-2568` | ศกพ. แจง ความแตกต่างค่า AQI กับค่าฝุ่น PM2.5 (ฐานเศรษฐกิจ, 27 Jan 2025) | https://www.thansettakij.com/economy/618002 | 20:13 | secondary | partial |
| `pcd-hourly-thaipbs-2568` | ทำความเข้าใจ เทียบความต่างค่า AQI-ฝุ่น PM2.5 (Thai PBS, 27 Jan 2025) | https://www.thaipbs.or.th/news/content/348609 | 20:13 | secondary | partial |
| `tmd-criteria` | กรมอุตุนิยมวิทยา: เกณฑ์อากาศ, pages 1–5 | https://www.tmd.go.th/info/เกณฑอากาศ (and `-หนา-2` … `-หนา-5`) | 19:55–19:56 | official | verified |
| `tmd-cyclone` | กรมอุตุนิยมวิทยา: พายุหมุนเขตร้อนในประเทศไทย | https://www.tmd.go.th/info/พายหมนเขตรอนในประเทศไทย-tropical-cyclone-in-thailand | 20:17 | official | verified |
| `tmd-api-list` | TMD Data Service API list | https://data.tmd.go.th/api/index1.php | ~20:10 | official | verified |
| `tmd-arcims-heatindex` | แผนที่ดรรชนีความร้อน (Heat Index Map), TMD agromet | http://www.arcims.tmd.go.th/dailydata/DetailHeatIndex.html | 20:04 | official | verified (old product) |
| `tmd-heat-thairath-2567` | กรมอุตุฯ คาดหมายค่าดัชนีความร้อนสูงสุดรายวัน 27-29 ก.พ. 67 (ไทยรัฐ) | https://www.thairath.co.th/news/society/2766399 | 20:03 | secondary | partial |
| `bma-heat-posttoday-2569` | กทม.เตือนค่าดัชนีความร้อนวันนี้ อยู่ในเกณฑ์ "อันตราย" (โพสต์ทูเดย์, 2 Apr 2026) | https://www.posttoday.com/general-news/740308 | 20:03 | secondary | partial |
| `doh-heat-dailynews-2569` | กรมอนามัย: ดัชนีความร้อน 4 ระดับ (เดลินิวส์) | https://www.dailynews.co.th/news/5756174/ | 20:03 | secondary | partial |
| `hh-knowledge-heat` | Hazard-huntz KNOWLEDGE §32.8 (TMD page of 7 Mar 2024; TMD 2012 explainer) | /home/user/Hazard-huntz/docs/KNOWLEDGE.md | carried over (read there 19 Oct 2026) | sister-project | partial |
| `nws-heatindex` | NWS WPC: The Heat Index Equation | https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml | 20:03 | international | verified |
| `tmd-uv-page` | TMD Ozone & Radiation Center: ข้อมูลเกี่ยวกับรังสี UV, map, protection chart | https://ozone.tmd.go.th/UV_index.htm · https://ozone.tmd.go.th/uvimap.html · https://ozone.tmd.go.th/UV_index/protectivetools_202512.png | 19:58–19:59 | official | verified |
| `tmd-uv-csv` | TMD clear-sky UVI forecast CSV | https://ozone.tmd.go.th/ORC/uvi_forecast/uvi-2026-10-24.csv | 19:59 | official | verified |
| `who-uvi-2002` | Global Solar UV Index: A Practical Guide (WHO/SDE/OEH/02.2) | https://iris.who.int/server/api/core/bitstreams/94a908ec-14ee-4bb4-84eb-ace483c9eb51/content | 20:02 | international | verified |
| `who-uv-qa-2022` | WHO Q&A: Radiation: The ultraviolet (UV) index (20 Jun 2022) | https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index | ~20:02 (fetch tool) | international | verified |
| `wmo-8-2008` | WMO-No. 8, Guide to Meteorological Instruments and Methods of Observation, 7th ed. (2008) | https://www.weather.gov/media/epz/mesonet/CWOP-WMO8.pdf | 20:14 | international | verified |
| `dmr-daily-2567` | DMR รายงานสถานการณ์ธรณีพิบัติภัยประจำวัน 31 ก.ค. 2567 | https://www.dmr.go.th/wp-content/uploads/2024/07/ทธ-240731-รายงานประจำวัน.pdf | 20:09 | official | verified |
| `dmr-daily-2564` | DMR รายงานสถานการณ์ธรณีพิบัติภัยประจำวัน 13 ก.ค. 2564 | https://www.dmr.go.th/wp-content/uploads/2022/10/article_20210713090439.pdf | 19:59 | official | verified |
| `dmr-100mm-posttoday-2568` | กรมทรัพยากรธรณีเตือน 21 จังหวัดเสี่ยงดินถล่ม น้ำป่า (โพสต์ทูเดย์, 11 Sep 2025) | https://www.posttoday.com/general-news/730219 | ~20:09 | secondary | partial |
| `hh-dmr` | Hazard-huntz sources `dmr-rain-2568`, `dmr-riskvillage-2565`; docs/08 §2b (DMR layers) | /home/user/Hazard-huntz/public/content/sources.json | carried over | sister-project | partial |
| `hii-thaiwater-app` | ThaiWater web app code (flash-flood text; water-level classes) | https://www.thaiwater.net/dist/js/app.chunk.js | 20:05 | official | verified |
| `hii-ffpi-report` | HII FEWS flash-flood report | https://fews2.hii.or.th/model-output/data_portal/flashflood/flashflood_report.txt | 19:54 | official | verified |
| `dwr-ews-2561` | DWR Early Warning report, 17 Sep 2018 | https://dwr.go.th/uploads/file/statuswater/2018/DWR20180917%20Report_Early%20warning.pdf | 20:14 | official | verified |
| `dwr-ews-2566` | DWR situation report, Mar 2023 | https://dwr.go.th/uploads/file/statuswater/2023/660321%20Manager.pdf | 20:14 | official | verified |
| `fw-status` | FloodWatch `classify_status`, `bma_status`; KNOWLEDGE §97; `research/2026-10-21_status_category_failures.log` | /home/user/flood2026-research/src/floodwatch/forecast/__init__.py | re-read 2026-10-23 | sister-project | verified |
| `fw-rain-words` | FloodWatch KNOWLEDGE §9 and KI-224 (TMD rain words applied to 24 h) | /home/user/flood2026-research/docs/KNOWLEDGE.md | carried over | sister-project | partial |
| `tmd-eq-intensity` | กรมอุตุนิยมวิทยา: ความรุนแรงแผ่นดินไหว | https://www.tmd.go.th/info/ความรนแรงแผนดนไหว | 19:56 | official | verified |
| `tmd-eq-general-pdf` | TMD: ความรู้ทั่วไปแผ่นดินไหว (PDF) | https://earthquake.tmd.go.th/file_downloads/ความรู้ทั่วไปแผ่นดินไหว.pdf | 19:57 | official | verified |
| `tmd-eq-rss` | TMD earthquake list and RSS (in and near Thailand) | https://earthquake.tmd.go.th/feed/rss_inside.xml | 20:11 | official | verified |
| `tmd-eq-criteria-thaipbs-2568` | ข่าวค่ำ: เปิดเกณฑ์แผ่นดินไหวขนาดใด ถึงจะส่งข้อความแจ้งเตือนให้ประชาชน (Thai PBS, 15 Apr 2025) | https://www.thaipbs.or.th/program/EveningNews/watch/hvQXSI | 20:12 | secondary | partial |
| `tmd-eq-myanmar-thansettakij-2568` | ประกาศกรมอุตุนิยมวิทยา เรื่อง แผ่นดินไหวที่ประเทศเมียนมา, 28 Mar 2025 (ฐานเศรษฐกิจ) | https://www.thansettakij.com/general-news/623360 | 20:12 | secondary | partial |
| `bkk-collapse-thairath-2568` | สรุป 24 ชม. การแผ่นดินไหวขนาด 8.2 ที่เมียนมา (ไทยรัฐ, 29 Mar 2025) | https://www.thairath.co.th/news/local/bangkok/2849972 | 20:12 | secondary | partial |
| `usgs-mmi` | USGS: The Modified Mercalli Intensity Scale | https://www.usgs.gov/programs/earthquake-hazards/modified-mercalli-intensity-scale | 20:16 | international | verified |
| `usgs-shakemap-strings` | USGS ShakeMap `shakemap_modules` 1.1.18, `data/mapping/map_strings.en` | https://pypi.org/project/shakemap-modules/ | ~20:15 | code | verified |
| `oq-allen2012` | OpenQuake 3.26.2 `openquake/hazardlib/gsim/allen_2012_ipe.py` (Allen, Wald & Worden 2012) | https://pypi.org/project/openquake.engine/ | ~20:00 | code | verified |
| `usgs-teng-2022` | Teng, Baker & Wald (2022), Evaluation of IPEs for small-magnitude earthquakes, BSSA 112(1) | https://pubs.usgs.gov/publication/70230088 | ~20:00 (fetch tool) | international | partial |
| `firms-attributes` | NASA FIRMS: Active fire data attributes (MODIS, VIIRS) | https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs | 20:01 | international | verified |
| `firms-faq` | NASA FIRMS FAQ | https://www.earthdata.nasa.gov/data/tools/firms/faq | 20:01 | international | verified |
| `firms-csv` | FIRMS VIIRS S-NPP 24 h, Southeast Asia | https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv | 20:01 | international | verified |
| `gistda-hotspot-news-2568` | GISTDA เผยวานนี้จุดความร้อนประเทศไทยพบ 457 จุด (The Bangkok Insight, 17 Jan 2025) | https://www.thebangkokinsight.com/news/politics-general/general/1440402/ | 20:17 | secondary | partial |
| `tmd-tsunami` | กรมอุตุนิยมวิทยา: มาตรการป้องกันภัยจากคลื่นสึนามิ | https://www.tmd.go.th/info/มาตรการปองกนภยจากคลนสนาม | 19:56 | official | verified |
| `ddpm-tsunami-bkbiz-2565` | จาก "ทุ่นสึนามิ" ชวนรู้จักระบบเตือนภัย "สึนามิ" ในไทย (กรุงเทพธุรกิจ, 6 Jul 2022) | https://www.bangkokbiznews.com/lifestyle/1013996 | 20:13 | secondary | partial |
| `ddpm-tsunami-drill-thaipbs-2568` | ปภ.ซ้อมอพยพหนีภัย "สึนามิ" 6 จังหวัดอันดามัน (Thai PBS, 27 Jun 2025) | https://www.thaipbs.or.th/news/content/353652 | 20:12 | secondary | partial |
| `ndwc-dns` | DNS for ndwc.go.th (Google DNS JSON) | https://dns.google/resolve?name=ndwc.go.th&type=A | 20:12 | observation | verified (NXDOMAIN) |
| `tmd-cap` | TMD CAP feed and item CAPTMD20261023164718_2 | https://www.tmd.go.th/api/xml/CAP | 20:11 | official | verified |
| `oasis-cap12` | OASIS Common Alerting Protocol 1.2 | https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html | 20:11 | international | verified |
| `hh-open-data` | Hazard-huntz docs/08-open-data.md and docs/research/open-data-2026-10-21.md | /home/user/Hazard-huntz/docs/08-open-data.md | carried over | sister-project | partial |

Downloads stayed in the session's scratch space and were not committed. The scratch scripts that produced the two computed checks (the heat index of 33 °C at 80 % and the IPE table) are not app code.

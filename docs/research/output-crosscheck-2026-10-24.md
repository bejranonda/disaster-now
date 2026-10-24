# Output cross-check: what the page shows vs the sources (24 Oct 2026, 07:57–08:14 UTC)

An independent audit of v0.3.0 as served at http://127.0.0.1:8090/ (the collector's files of 07:50 UTC), in the
format of the [first output cross-check](output-crosscheck-2026-10-23.md). Six places were opened in headless
Chromium, every response the page received was saved, each source was fetched again once, and every number was
recomputed by the auditor's own Python code (not the app's). The page was also compared with FloodWatch and
บ้านรอดไหม. Only this file was written in the repository.

**Verdict in one paragraph.** The data are carried over faithfully. Of 144 numbers compared item by item, 139 equal
the recomputation after the page's own rounding. That covers heat, rain, gusts, PM2.5, the damped outlook, UV, rain
gauges, river gauges, hotspots and the Air4Thai values (all 173 stations equal the official feed). The 5 that differ
come from one cause: the 3-day table rounds heat where the cards floor it. Quakes, storms, DMR layers and the TMD
warning also match their raw feeds. Against FloodWatch, every gauge status near the six points agrees, and so does
the area category at all six points; across the country 737 of 742 statuses agree. The five that differ are newer
readings, not a different rule. What does not hold are seven rules about what the page *says* with those numbers:
- **Colour.** A heat forecast is painted in the "ทำทันที" crimson in the 3-day table, the card's day chips and the
  pre-warnings at 3 of 6 points, though a forecast alone stops at เตรียมตัว.
- **"บ่ายนี้".** The heat tile's "this afternoon" uses a 24-hour window. At 15:00 most ensemble members peak at noon
  *tomorrow*, so the label is wrong, and in Chiang Mai the word is too.
- **Measured vs forecast.** "Today" for PM2.5 shows a rest-of-day forecast, milder than the measurement on the tile,
  under a note that calls it the day's mean.
- **Under a warning.** The rain card's chips stay blue "ต่ำ" under TMD's Severe warning.
- **Privacy.** A GPS place shows its (rounded) coordinates in the footer.
- **Withdrawn warnings.** The collector ignores CAP `references`, so an updated or cancelled TMD warning would stay
  on the page.
- **English links.** The English page links to the Thai guides.

---

## 1. Method

**Host and browser.**
- **Host:** a Linux server that also runs another app's production containers. No container was touched and
  `docker` was not run. That is also why `npm run preflight` was not run: it calls `docker ps`.
- **Browser:** headless Chromium 1217 (`playwright-core`) at 390 × 844, locale `th-TH`, zone `Asia/Bangkok`, real
  clock, no mocks.
- **Loads:** GPS was mocked with the context's geolocation (accuracy 25 m) and 📍 was tapped. Phang Nga was opened as
  a search link (`#p=8.45,98.53,ตัวเมืองพังงา`).
- **Both languages:** after each load the page was switched to English (the same data, no new load).

| Place | Point | Page load, UTC (Bangkok) | Why |
|---|---|---|---|
| Bangkok old town (bkk) | 13.757, 100.502 (GPS) | 07:57:34 (14:57) | given |
| Chiang Mai city (cnx) | 18.7883, 98.9853 (GPS) | 07:58:14 (14:58) | given |
| Hat Yai, Songkhla TH-90 (hdy) | 7.0084, 100.4767 (GPS) | 07:58:24 (14:58) | under TMD's warning |
| Phuket town, TH-83 (hkt) | 7.8804, 98.3923 (GPS) | 07:58:41 (14:58) | under TMD's warning |
| Khon Kaen city (kkc) | 16.4322, 102.8236 (GPS) | 07:58:51 (14:58) | the north-east |
| Phang Nga town (pna) | 8.45, 98.53 (search link) | 08:13:39 (15:13) | no PCD station within 62 km (GISTDA fallback); Andaman coast, not warned |

**Timeline (UTC).**

| What | When, 24 Oct 2026 |
|---|---|
| Collector files read by the page (warnings, TMD quakes, storms, hotspots, Air4Thai 173 stations) | 07:50:44–07:50:50 |
| Six page loads | 07:57:34–08:13:39 |
| Independent fetch, once per source per place: Open-Meteo ensemble and CAMS, GISTDA, ThaiWater `rain_24h` and `waterlevel_load`, DMR × 2, FloodWatch `/api/point` | 07:59:19–08:00:04; Phang Nga 08:14:26 |
| Independent fetch, once: EMSC, USGS, GDACS, HII flash-flood list, JMA, FloodWatch `/api/stations` and `/api/geocode` | 07:59:19–08:00:04 |
| Independent fetch, once: TMD CAP RSS and its 7 items, TMD quake RSS, TMD StormTrack, FIRMS S-NPP + NOAA-20, Air4Thai official (with `tools/certs`), บ้านรอดไหม `kit.json` | 08:00:21–08:00:46 |
| `node research/crosscheck_live.mjs public/data/live --fw https://flood.autobahn.bot/api/stations`, once | 08:01:18–08:01:36 |
| `npm run check:advice`; every outgoing link (GET, one each) | 08:02–08:10 |

**Fetch rules.**
- **User-Agent:** `disaster-now-audit/0.3 (+https://github.com/bejranonda/disaster-now)`.
- **ThaiWater:** 25 calls in 17 minutes over 6 provinces (the page's 12, the audit's 12, the cross-check's 1
  national), with no 429.
- **The cross-check's `--fw`:** it takes the full `/api/stations` URL. The brief's bare `https://flood.autobahn.bot`
  would have spent the ThaiWater call and then failed parsing HTML (see X18).

**Code under test.**
- The page served the committed v0.3.0: the 16 modules, `index.html`, `sw.js` and `config.json` equal `HEAD`.
- From about 08:00 UTC another session was editing the working tree (`assess.js`, `main.js`, `i18n.js` and others,
  uncommitted; v0.4.0). Line numbers below are **`HEAD`'s**. Where that uncommitted work already touches a finding
  (seen at 08:05 UTC), the finding says so.

**Recomputation** (Python 3, the auditor's own code):
- **Heat:** the NWS heat index (Steadman, then Rothfusz with both adjustments) per member and hour. Then each
  member's maximum over the window, `a + b·HI` with `calibration.js`'s coefficients (lead 1: 10.375 + 0.8647·HI; the
  day after: 11.689 + 0.826·HI) and the median. The dressed 10–90 % and the chance ≥ 42 °C use N(0, 2.95 °C) via
  `erf`, solved by bisection.
- **Windows:** `[now hour, +24 h)` and the Bangkok calendar days from the current hour.
- **Rain and gusts:** each member's 24-h sum and maximum; chances are shares of members at or above the band edge.
- **PM2.5:** the nearest PCD station within 15 km and 3 h; the damped outlook `measured × (CAMS(day) ÷ CAMS(24 h
  ending at the measurement))^β`, β = 0.45 / 0.55 / 0.55.
- **Distances:** haversine, R 6,371.0088 km.
- **Rivers:** FloodWatch's bank rule and `area_index` restated; ThaiWater `ground_level` 0 = no bed; 3 h freshness.
- **Quakes:** Allen, Wald & Worden 2012 (hypocentral), + 1.06 in greater Bangkok within 1,600 km.
- **Hotspots:** FIRMS rows in Thailand's box, low confidence out, last 24 h, ≤ 25 km.

**Freshness of the page's copies.** The audit's re-fetch equalled the page's copy for the ensemble, CAMS, GISTDA,
ThaiWater rain, both DMR layers, EMSC, GDACS, HII and JMA at every point. ThaiWater's level file had changed
elsewhere in the province, but every gauge within 20 km of each point was identical. The official Air4Thai feed at
08:00 equalled the collector's 07:50 copy at all 173 stations.

**Match rule.** ✅ means equal after the page's own rounding (half up, like JS `toFixed`).

## 2. Results at a glance

| Place | Items compared | ✅ | ❌ | Verdict shown (Thai) | Findings seen here |
|---|---|---|---|---|---|
| Bangkok | 25 | 24 | 1 | ●●●○ เตรียมตัว · 🌡️ ความร้อน: อันตราย · บ่ายนี้ 43 °C | X1, X2, X4, X5, X7, X12, X13; KI-007, KI-008 |
| Chiang Mai | 25 | 24 | 1 | ●●●○ เตรียมตัว · 🌡️ ความร้อน: อันตราย · บ่ายนี้ 41 °C | X1, X2, **X3**, X4, X7, X9; KI-006, KI-024 |
| Hat Yai | 25 | 24 | 1 | ●●●○ เตรียมตัว · 🌧️ ฝน: กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้ | X1 (pre), X2, X4, X6, X7 |
| Phuket | 23 | 22 | 1 | ●●●○ เตรียมตัว · 🌧️ ฝน: กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้ | X4, X6, X7; KI-030 |
| Khon Kaen | 25 | 25 | 0 | ●●●○ เตรียมตัว · 🌡️ ความร้อน: อันตราย · บ่ายนี้ 43 °C | X1, X2, X7, X9, X11 |
| Phang Nga | 21 | 20 | 1 | ●●●○ เตรียมตัว · 🌡️ ความร้อน: เตือนภัย · บ่ายนี้ 40 °C | X1 (pre), X2, X4, X14; KI-030 |
| **All** | **144** | **139** | **5** | | |

- **What the ❌ are:** all 5 are the heat row of the 3-day table (X4). In Khon Kaen the rounded and floored values
  happen to agree.
- **Three ✅ needed a closer look,** and the page was right each time:
  - two Air4Thai station names end in a space;
  - a gauge at 0.947 km shows "0.9";
  - Phang Nga's day-3 chance of danger heat is 0.24999 → "20 %".
- **Thai and English** carry identical numbers on every card at all six points.
- **Page health:** no page errors; no horizontal scroll at 390 px.

## 3. Findings

Severity as in [KNOWN_ISSUES](../KNOWN_ISSUES.md): **high** could mislead about a hazard, **medium** a gap or a
wrong detail, **low** polish.

### X1. A heat forecast is painted "ทำทันที" (crimson) in the 3-day table, the card's day chips and the pre-warnings (high)

- **Where and when:** Bangkok, Chiang Mai, Khon Kaen (table and chips); also Hat Yai and Phang Nga (pre-warnings);
  24 Oct 07:57–08:13 UTC (14:57–15:13).
- **What the page shows:**
  - The tile and the verdict are capped at ●●●○ เตรียมตัว (orange), as the rule requires.
  - On the same screen, crimson (`lv-danger`: `--l3` #B3122E border, pink fill):
    - Bangkok: the table's heat cells **44° / 44° / 43°** and the card's chips **43° / 43° / 42°**, all crimson, and
      three crimson pre-warnings "🌡️ ร้อนระดับอันตราย (≥ 42 °C) · วันนี้/พรุ่งนี้/จ. 26 · โอกาส 70 % / 70 % / 60 %".
    - Chiang Mai: tomorrow 42° crimson.
    - Khon Kaen: today and tomorrow 43° crimson.
    - Every heat pre-warning at 5 of 6 points (Phuket had none).
- **The source:**
  - These are forecast medians: Bangkok 43.61 / 43.68 / 42.67 °C, Chiang Mai 42.18 tomorrow, Khon Kaen 43.07 / 43.36.
  - No TMD or DOH heat warning is in force; the only CAP item is a heavy-rain warning for the South.
  - The rule ([GUIDELINES](../GUIDELINES.md) 3b, AGENTS §5): "A forecast alone tops out at เตรียมตัว".
- **Responsible:** the table and the chips use the band's level uncapped:
  - `public/js/assess.js:90` (card days) and `:498` (table heat).
  - `public/js/outlook.js:158`: pre-warnings carry level 3, and `public/js/main.js:262` colours them `lv-${LV(x.level)}`.
  - **Latent, same cause:** rain and gust chips and cells (`assess.js:221`, `:248`, `:499–500`, `windowLevel`
    uncapped, can reach 3), PM2.5 (`:129–130`, `:501`: a forecast ≥ 75.1 would be crimson) and UV (`:192`, `:502`).
- **Fix:** grade every forecast cell, chip and pre-warning colour by the tile's rule, `min(MODEL_MAX, …)`. Keep the
  agency's word in the text ("ร้อนระดับอันตราย"). Add a test that no `lv-danger` appears on a fixture without a
  measurement or warning.
- **Being fixed?** The uncommitted working tree adds `fcLevel` and a capped `tone` for pre-warnings.

### X2. "บ่ายนี้" on the heat tile is a 24-hour maximum that, in the afternoon, is mostly tomorrow's noon (medium)

- **Where and when:** all six points, 14:57–15:13 Bangkok.
- **What the page shows:**
  - "บ่ายนี้ 43 °C" (Bangkok), "อันตราย · บ่ายนี้ 41 °C" (Chiang Mai), "บ่ายนี้ 40 °C" (Phang Nga).
  - The card line "โอกาสถึงระดับอันตราย (≥ 42 °C) 70 % / 50 % / 30 %" comes from the same window.
- **The source:**
  - The window is 14:00 today → 13:00 tomorrow (Phang Nga 15:00 → 14:00).
  - The members' own maximum falls tomorrow, at 10:00–13:00, for:

    | Place | Members peaking tomorrow |
    |---|---|
    | Bangkok | 31 of 51 |
    | Chiang Mai | 38 of 51 |
    | Hat Yai | 27 of 51 |
    | Khon Kaen | 34 of 51 |
    | Phang Nga | 46 of 51 |
    | Phuket | 6 of 51 |

  - Corrected medians, this afternoon (now → 17:00) against the tile's window:

    | Place | This afternoon | Tile's window |
    |---|---|---|
    | Chiang Mai | **41.48 °C, เตือนภัย** (danger chance 43 %) | 41.98 → "อันตราย" |
    | Phang Nga (rest of today) | 38.63 °C | 40.67 |
    | Bangkok | 43.61 °C | 43.97 |

- **Responsible:**
  - `public/js/assess.js:77–78` names the window "บ่ายนี้" whenever it is before 16:00.
  - `public/js/outlook.js:143`: `next24` is `[i0, i0 + 24)`, which after about 11:00 contains tomorrow's late morning.
  - KNOWLEDGE §3 describes the window as "บ่ายนี้ before 16:00".
- **Fix:** make the tile's window match its name:
  - this afternoon (now → 18:00) before 16:00, tomorrow's calendar day after;
  - or name the window by the hour of the median member's peak;
  - or say "ใน 24 ชม. ข้างหน้า".

  Use the same window for the danger chance and the action line.

### X3. The heat word and number disagree at a band edge: "อันตราย · 41 °C" (medium)

- **Where and when:** Chiang Mai, 07:58 UTC (14:58).
- **What the page shows:** the tile, the verdict's headline and the English page read **"อันตราย · บ่ายนี้ 41 °C"** /
  "Danger · This afternoon 41 °C". The action line is the danger band's "👉 หลีกเลี่ยงแดด ย้ายกิจกรรมไปช่วงที่ไม่ร้อน".
- **The source:**
  - The corrected 24-h median is **41.978 °C**. The word bands it after rounding to 0.1 (42.0 → อันตราย); the
    number is floored (41).
  - By the page's own band table, 41 °C is เตือนภัย (33.0–41.9).
  - KNOWLEDGE §3 says the number is floored "so a number never reads past its band" (V26); here the word reads past
    the number.
- **Responsible:**
  - `public/js/assess.js:76` (`band("heat", w.p50)`, which rounds to 0.1 in `levels.roundTo`) vs `:78`
    (`Math.floor`).
  - `public/js/actions.js:159` also rounds to 0.1.
- **Fix:** band, word and action from the displayed value. Truncate to 0.1 before banding, so 41.97 → 41.9 → เตือนภัย.
  Add a unit test at 41.95–41.99.

### X4. The heat card floors, the 3-day table rounds: 1 °C apart for the same day (low)

- **Where and when:** 5 of 6 points (in Khon Kaen the two happen to agree).
- **What the page shows** (card chips / table):

  | Place | Card chips | Table |
  |---|---|---|
  | Bangkok | 43 / 43 / 42 | 44 / 44 / 43 |
  | Hat Yai | 40 / 39 / 39 | 41 / 40 / 39 |
  | Phuket | 38 / 38 / 37 | 39 / 38 / 38 |
  | Phang Nga | 38 / 40 / 38 | 39 / 40 / 39 |
  | Chiang Mai, day 3 | 40 | 41 |

  10 of 18 cells differ. Bangkok's table "วันนี้ 44°" sits beside the tile's "บ่ายนี้ 43 °C".
- **The source:** medians 43.61 / 43.68 / 42.67 (Bangkok), 40.61 / 39.995 / 39.33 (Hat Yai) and so on. KNOWLEDGE §3:
  floored.
- **Responsible:** `public/js/assess.js:498` (`fmt(d.heat.p50)` rounds), against `:90` (`Math.floor`).
- **Fix:** floor in the table.
- **Being fixed?** The uncommitted working tree floors it.

### X5. PM2.5 "today": a rest-of-day forecast, milder than the measurement, under a note that calls it the day's mean (medium)

- **Where and when:** Bangkok, 07:57 UTC (14:57); the same mechanism at every point.
- **What the page shows:**
  - The tile: **30.2 µg/m³ · ปานกลาง** (yellow), the PCD's bkp92t, 0.9 km, 14:00.
  - The card's chip and the table: **"วันนี้ 20"** in blue (ดี), with no forecast label.
  - The table note: "ฝุ่นคือค่าเฉลี่ยทั้งวัน" (dust is the day's mean).
- **The source:**
  - 20.0 = 30.2 × (CAMS's mean over **14:00–23:00 only**, 9.26 ÷ CAMS's mean over the 24 h to 14:00, 23.14)^0.45.
  - The validation's lead-1 target is the **whole calendar day**, from the previous day's daily mean
    (`research/e3_pm25.py:24–26`). A partial-day CAMS mean carries the diurnal cycle and was never tested.
  - The whole-day form gives 22.2 here; at 22:00 the same data give 17.1.
  - Either way, the cell shows a level milder than the PCD's measured band for the same day, with no "forecast" word
    beside it.
- **Responsible:**
  - `public/js/airq.js:107` (`dailyMeans` from the current hour).
  - `public/js/assess.js:129` (today's chip without a label) and `:501`.
  - `public/js/i18n.js:24` (the note).
- **Fix:**
  - For today, show the measured 24-h mean (or nothing) in the chip and the cell.
  - If a forecast stays, compute it on the whole calendar day as validated and label it "คาด".
  - Correct the note.
- **Being fixed?** The uncommitted working tree adds "คาด" and rewrites the note ("ค่าเฉลี่ยที่คาดไว้ ไม่ใช่ค่าวัด"). The
  partial-day computation is unchanged there.

### X6. Under TMD's Severe warning, the rain card's chip for today stays blue "ต่ำ" (medium)

- **Where and when:** Hat Yai and Phuket, 07:58 UTC (14:58).
- **What the page shows:**
  - The tile and the verdict read "🌧️ ฝน: กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้" (●●●○), and the table's cell
    "📢 เตือนภัย".
  - The rain card's own day chips read **"วันนี้ ต่ำ ฝนหนัก"** in blue (`lv-ok`, ยังไม่น่าห่วง), under the card's
    line "ตัวเลขจากแบบจำลองด้านล่างเบากว่าประกาศ".
- **The source:** CAP `TMD20261024063005_2`, Heavy Rain, **Severe**, 06:00–18:00 +07, covering TH-90 and TH-83. The
  ensemble's 24-h chance of > 35 mm at the point is 3.9 % (Hat Yai) and 0 % (Phuket) for the rest of today.
- **Responsible:** `public/js/assess.js:221–222`. The card's `days` are never overridden; only the table's rows are,
  at `:507–515`. KI-F25 fixed the table, not the chips.
- **Fix:** apply the same override to the lifted card's chips: "📢 เตือนภัย" at the warning's level for each day
  before `expires`.

### X7. A GPS place shows coordinates on screen (medium)

- **Where and when:** all five GPS points.
- **What the page shows:** the footer "อัปเดต 14:57 · แบบจำลอง 51 ชุด · **จุดที่ส่งให้แหล่งข้อมูล 13.76, 100.5**"
  (Chiang Mai 18.79, 98.99; Hat Yai 7.01, 100.48; Phuket 7.88, 98.39; Khon Kaen 16.43, 102.82).
- **The rule:**
  - [GUIDELINES](../GUIDELINES.md) §2 says "a GPS place shows no coordinates on screen", "not even through a
    screenshot"; AGENTS §5 says the same.
  - KI-F14 is marked fixed.
  - The numbers are the ~1.1 km point that providers get, not the exact fix. A screenshot shared to a family chat
    still carries the 1 km cell of the home.
- **What holds:** the exact fix was in **no** request URL at any point. The header shows no coordinates, and the
  FloodWatch link carries 2 decimals.
- **Responsible:** `public/js/main.js:271–272`, `public/js/i18n.js:52`.
- **Fix:** for `source` gps or saved, drop `{p}` ("จุดที่ส่งให้แหล่งข้อมูลถูกปัดเศษ ~1 กม."). Extend the "V10/V15" test
  to the footer.

### X8. The collector keeps TMD warnings that TMD has updated or cancelled (medium, latent)

- **Where and when:** today's feed. One item is in force, so nothing wrong was on screen.
- **The source:** TMD issues CAP `Update` messages that point to the alert they replace:
  - **22 Oct 05:45 +07:** `TMD20261022054531_2` (Update, `references` `TMD20261021173903_2`) ended the **Extreme**
    "Very Heavy Rain" alert for 4 provinces at **05:45**, where the original said 06:00.
  - **22 Oct 05:41 +07:** `TMD20261022054449_2` updated `TMD20261021173643_2`.
- **What the page would have shown:**
  - With the collector running on 22 Oct, an Extreme (ทำทันที) box that TMD had already ended, and two boxes for one
    heavy-rain warning.
  - A `Cancel` is dropped, but the alert it cancels is kept until its original expiry.
- **Responsible:** `tools/collect.mjs:86–89` (`HEAD`). Items are filtered on `status`, `msgType !== "Cancel"` and
  `expires` only; `<references>` is never read.
- **Fix:**
  - Parse `references` (sender,identifier,sent triplets). Drop every item referenced by a newer Update or Cancel.
  - Add a test with the 21–22 Oct pair (both items are still in TMD's RSS today).

### X9. The quake tile says "none nearby in 24 h" while its card lists one (low)

- **Where and when:** Khon Kaen and Chiang Mai.
- **What the page shows:**
  - The tile: "24 ชม. นี้ไม่มีรายงานใกล้ ๆ".
  - The card: "ขนาด 2.2 ประเทศลาว ห่าง 293 กม. · 06:51 น. วันนี้" (Khon Kaen, 8.1 h earlier).
  - In Chiang Mai, 5 of the 7 events that qualify by the page's own rule (within 300 km) are less than 24 h old; the
    card shows "ขนาด 2.4 ต.ปากน้ำ อ.สวรรคโลก จ.สุโขทัย ห่าง 197 กม. · 22:20 น. 23 ต.ค.".
- **The source:** TMD's RSS (equal to the collector's file, 10 of 10 items) and EMSC.
- **Responsible:** `public/js/assess.js:406`. The word is "none nearby" whenever no recent quake reaches level 1.
- **Fix:** "24 ชม. นี้ไม่มีที่น่าจะรู้สึกได้ที่นี่" (none likely felt here), or count the recent ones.

### X10. The English page links to the Thai guides (medium)

- **Where:** every card on the English page, at every point.
- **What the page shows:** "What to do in this heat →" etc. go to `https://baanrodmai.autobahn.bot/hot` (Thai).
- **The source:** บ้านรอดไหม has English guides at `/en/hot`, `/en/air`, `/en/flood` and so on (200, `lang="en"`;
  INTEGRATION §2 lists them as checked).
- **Responsible:** `public/js/main.js:286`. `${lang === "en" ? "" : ""}` is a no-op.
- **Fix:** insert `/en` before the path when `lang === "en"`, and add a test.

### X11. The flood tile shows a number on a "ไม่มีข้อมูล" tile (low)

- **Where and when:** Khon Kaen, 07:58 UTC (14:58).
- **What the page shows:** the tile "ไม่มีข้อมูล · ต่ำกว่าตลิ่ง 547 ซม." (– – – –).
- **The source:**
  - E.16A บ้านกุดกว้าง is 8.7 km away, outside the 8 km rule, so the point has no category.
  - FloodWatch's `/api/point` agrees: category none, "nearest_gauge_far".
  - The number is right, but on the tile it reads as this point's water.
- **Responsible:** `public/js/assess.js:332–333` (`c.value` from `fresh[0]` when `ai.category` is null).
- **Fix:** no tile value without a category; keep the gauge line in the card.

### X12. The rain tile's word is yesterday's gauge beside tomorrow's chance (low)

- **Where and when:** Bangkok, Chiang Mai, Khon Kaen.
- **What the page shows:** "🌧️ ฝน · **ไม่มีฝน** · โอกาสฝนหนัก ต่ำ".
- **The source:** "ไม่มีฝน" is the 0.0 mm measured in the **past** 24 h at สนข.พระนคร. The ensemble's median for the
  **next** 24 h is 2.4 mm (p90 4.2; light rain likely), and FloodWatch says "rain_band light, 2.6 mm".
- **Responsible:** `public/js/assess.js:218`.
- **Fix:** use the scale word, or say "วัดได้ 0 มม. ใน 24 ชม. ที่ผ่านมา" on the tile.

### X13. "Other pollution" prints a PCD sub-index as if it were a concentration (low)

- **Where and when:** Bangkok.
- **What the page shows:** the value "AQI 25", and the line "PM10 25".
- **The source:** bkp61t's PM10 was **50 µg/m³**; 25 is its sub-index (PCD AQI).
- **Responsible:** `public/js/assess.js:160`.
- **Fix:** "PM10 50 µg/m³ (ดัชนี 25)", or label the numbers as index values.

### X14. A PM2.5 outlook built on GISTDA's estimate is labelled "adjusted to the latest measurement" (low)

- **Where and when:** Phang Nga, 08:13 UTC (15:13).
- **What the page shows:**
  - The tile: GISTDA's 11.1 µg/m³ (no PCD station within 62 km), correctly labelled "ค่าประมาณ".
  - The outlook's source: "แบบจำลอง CAMS **ปรับตามค่าวัดล่าสุด**".
- **The source:** the basis is GISTDA's estimate (`air.ratio.basis = "estimate"`). MODELS §2 marks the damped ratio on
  that input **[unverified]**. GUIDELINES §7: "A model value is never shown as a measurement".
- **Responsible:** `public/js/assess.js:131`.
- **Fix:** "ปรับตามค่าประมาณ GISTDA (ยังไม่ได้ทดสอบ)" when the basis is the estimate.

### X15. "TMD's full notice" opens the raw CAP XML (low)

- **Where:** Hat Yai and Phuket, Thai and English.
- **What the page shows:** "ประกาศฉบับเต็มของกรมอุตุฯ →" goes to
  `https://www.tmd.go.th/uploads/CAP/CAPTMD20261024063005_2.xml`: 79 KB of XML with province polygons. On a phone
  that is unreadable.
- **The source:** TMD's warnings page `https://www.tmd.go.th/warning-and-events/warnings` answers 200.
- **Responsible:** `public/js/main.js:250` (`w.link || w.web`).
- **Fix:** link TMD's warnings page first; the XML at most as a second link.

### X16. HII's flash-flood report has no time on the card (low)

- **Where:** every point.
- **What the page shows:** the source "รายงานน้ำป่า สสน." with no time.
- **The source:** the file's `Last-Modified` was 07:43:07 GMT (14:43 Bangkok). SOURCES.md says to use it. It listed 2
  subdistricts (Narathiwat 960903, Nakhon Si Thammarat 801301); the page's "มี 2 ตำบลทั่วประเทศ" ✅.
- **Responsible:** `public/js/assess.js:360`.
- **Fix:** read `Last-Modified` and show it.
- **Note for the owner:** a listed subdistrict's line prints HII's own forecast amount, "ฝนคาดการณ์ N มม."
  (`assess.js:351`). AGENTS §5 says "never a rain amount as a forecast". Decide whether an agency's number is exempt.

### X17. The same word has a different colour in the sister apps (low)

- **The source:**
  - **บ้านรอดไหม (`content/kit.json`):** heat เฝ้าระวัง green `#6CC04A`, เตือนภัย yellow `#F2CF3A`, อันตราย orange
    `#F28C28`, อันตรายมาก red `#E5372E`; PM2.5 ดี green `#6CC04A`.
  - **FloodWatch (`static/app.js` STATUS):** watch `#b58900`, critical `#c62828`.
- **What the page shows:**
  - Heat: เฝ้าระวัง yellow `#F2E700`, เตือนภัย orange `#E46C0A`, อันตราย crimson `#B3122E` (capped to orange for a
    forecast). So Hat Yai's "เตือนภัย 41 °C" is orange here and yellow there.
  - PM2.5 ดี is blue `#2F6FB0`.
  - River watch is `#F2E700`, critical `#B3122E`.
- **What matches:** the words (all 9 advice lines, both band sets, FloodWatch's four status words). FloodWatch's
  normal `#2f6fb0` and warning `#e46c0a` match.
- **Responsible:** INTEGRATION §5 says FloodWatch's colours "already match"; two of four don't.
- **Fix:** the owner's call (one palette for the family, D2). Meanwhile correct INTEGRATION §5.

### X18. The live cross-check compares gauge readings of different times (low)

- **What the cross-check said:** "742 judged by both, 737 the same (99.3 %)" at 08:01 UTC.
- **The source:** one of the five pairs that differ was checked. ONE037 read 0.24 m, bank 0.84, bed −4.515 → **88.8 %
  (watch)** in ThaiWater's Songkhla file at 07:58 UTC, the same as FloodWatch's 07:40 snapshot. The national file at
  08:01 had a newer reading over 90 % ("warning"). BKC003 (FloodWatch: 2 cm below its bank at 07:40) is likely the
  same; it wasn't re-fetched (KI-029).
- **Responsible:** `research/crosscheck_live.mjs:30–40`. It compares statuses without the observation times, and uses
  6 h where the page uses 3 h. Its `--fw` also wants the full `/api/stations` URL; a base URL fails after ThaiWater
  has been called.
- **Fix:** compare only pairs with the same `waterlevel_datetime` / `obs_time`, and count the rest as "newer
  reading". Accept a base URL for `--fw`.

### X19. Small doc drift (low)

- [GUIDELINES](../GUIDELINES.md) §3 says gauges are dropped after 6 h. The code (`public/js/water.js:131`) and the
  card ("ใน 3 ชม.") use 3 h.
- KNOWLEDGE §3 says heat is floored; the table rounds (X4).
- INTEGRATION §5 overstates the colour match (X17).
- The English warning says "meters" on a British-English page (GUIDELINES §5).

## 4. Already known, still present

- **KI-005:** heat reads "อันตราย" at Bangkok, Chiang Mai and Khon Kaen, from raw medians of 38.9 / 36.6 / 38.2 °C
  (corrected 44.0 / 42.0 / 43.4).
- **KI-006:** Chiang Mai is named ต.พระสิงห์ (500102), where GISTDA's polygon lookup says ศรีภูมิ (500101). The same point
  as on 23 Oct.
- **KI-007:** Bangkok's area is "ยังรับน้ำได้ … จาก 1 สถานี ใกล้สุด 6.7 กม. · ความมั่นใจต่ำมาก". FloodWatch says normal,
  confidence **medium**, from **32** gauges, the nearest 0.7 km away. The categories agree.
- **KI-008:** "กรมชลประทานสามเสน (แม่น้ำเจ้าพระยา) … ต่ำกว่าตลิ่ง 111 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้)"
  (C.12: 93.4 % of bed-to-bank). CPY015 is the same at 103 cm. The tile's 102 cm comes from the third, unnamed line.
  The uncommitted working tree drops the word and names the tile's gauge.
- **KI-009:** GISTDA ran **×1.39** the PCD at 30 fresh stations at 08:01 UTC (10–90 % ×0.99…×1.82; over ×1.5 at 8).
  At the Bangkok old town it said 38.4 (orange) where bkp92t measured 30.2 (yellow).
- **KI-024:** EMSC's English region names in Thai lines ("MYANMAR-CHINA BORDER REGION", Chiang Mai).
- **KI-027 (V18):** "มลพิษอื่น" reads "ไม่มีข้อมูล" with model values ("O₃ 149"), and is listed as missing, at 5 of 6
  points.
- **KI-030:** a yellow "ต่ำ" for tomorrow's rain in Phuket and Phang Nga. The heavy-rain chance was 7.8 %, but moderate
  rain is likely (80 % and 92 % of members).
- **KI-002:** curl can't verify `air4thai.pcd.go.th` without `tools/certs` (error 60). Headless Chromium timed out
  on its home page (linked in the footer). The collector's copy was complete.
- **KI-029:** no 429 this time (25 ThaiWater calls over 17 min).
- **OWNER_ACTIONS B1/B2 still open:** FloodWatch sends no `Access-Control-Allow-Origin` on `/api/point`,
  `/api/stations` or `/api/geocode` (GET with `Origin: https://risk.autobahn.bot`), and `OPTIONS /api/point`
  answers 405.

## 5. Every check

| # | Check | Result | Evidence |
|---|---|---|---|
| 1a | Heat: corrected median, floor, band, dressed 10–90 %, chance ≥ 42 °C (tile and card), 6 points | ✅ numbers; ❌ word at an edge (X3) | e.g. Bangkok p50 43.969 → "43", range 40.002–47.794 → "40–48", P(≥ 42) 0.735 → "70 %"; Chiang Mai 41.978 → "41" but "อันตราย" |
| 1b | Heat: 3-day values | ❌ table rounds (X4); card ✅ | 10 of 18 table cells 1 °C above the card (5 of 6 points) |
| 1c | Heat: pre-warnings (≥ 20 % danger chance, rounded to tens) | ✅ 14 of 14 | Bangkok 0.677 / 0.699 / 0.598 → 70 / 70 / 60 % |
| 1d | Heat: windows match the hours used | ❌ (X2) | "บ่ายนี้" = 14:00 → 13:00 tomorrow; 27–46 of 51 members peak tomorrow at 5 points |
| 1e | Heat: forecast alone ≤ เตรียมตัว everywhere it is shown | ❌ (X1) | tile and verdict ✅; table, chips and pre-warnings crimson |
| 2a | PM2.5: nearest PCD station within 15 km and 3 h, its 24-h mean = the official Air4Thai feed | ✅ 5 of 5 | bkp92t 30.2 (0.9 km), 36t 16.7, 44t 10.9, 43t 8.9, 46t 23.1, all 14:00; official feed at 08:00 = collector, 173 of 173 |
| 2b | PM2.5: GISTDA fallback where no station | ✅ | Phang Nga: 62 km to the nearest; GISTDA 24-h 11.126 → "11.1 ดีมาก", "15:00 น. วันนี้" ("Z" = Bangkok time confirmed: 15:00Z at 08:13 UTC) |
| 2c | PM2.5: damped outlook recomputed | ✅ 6 of 6 | Bangkok 20.0 / 17.1 (ดี) / 22.1 (ดี); Khon Kaen 22.9 / 24.1 / 24.7; Phang Nga 7.5 / 5.9 / 5.9 |
| 2d | PM2.5: measured vs forecast clear; "today" consistent | ❌ (X5); label ❌ (X14) | tile 30.2 ปานกลาง vs "วันนี้ 20" ดี |
| 3a | Rain: chance > 35 mm (24 h) and the three words | ✅ 6 of 6; table words ✅ 18 of 18 | Hat Yai 5 of 51 = 9.8 % → "ไม่ถึง 10%" "ต่ำ"; tomorrow 15.7 % "มีโอกาส" |
| 3b | Rain: measured gauge (10 km, 3 h) vs ThaiWater and FloodWatch | ✅ 6 of 6, the same gauge as FloodWatch's `rain_measured` at 6 of 6 | RF.PNK.01 0.0 mm; TH71 0.0 (⏱ 1 ชม.); G09006-TC220510 3.0 mm, 2.1 km |
| 3c | Gusts p50, p10–p90, TMD's word, days | ✅ 6 of 6 | Bangkok 26 (23–31) "ลมปานกลาง"; Chiang Mai 19 (18–21) "ลมสงบถึงลมโชย" |
| 3d | Rain tile word | ❌ minor (X12) | "ไม่มีฝน" = past 24 h |
| 4a | Gauges near the point vs ThaiWater (page copy = re-fetch) and FloodWatch `/api/stations`, same codes | ✅ 10 of 10 | C.12 111 cm warning, CPY015 103 warning, AIT001 102 normal, P.1 275, P.103 517, X.44 646, X.174 392, X.190A 239, E.16A 547, X.245 705 |
| 4b | Area category vs FloodWatch's `/api/point` | ✅ 6 of 6 (category); confidence ✅ 5 of 6 (Bangkok: KI-007) | normal at 5; none at Khon Kaen (FloodWatch: none, "nearest_gauge_far") |
| 4c | Gauge statuses, whole country (`crosscheck_live` A) | ✅ 737 of 742 (99.3 %); the 5 are newer readings (X18) | ONE037 88.8 % at 07:58 = FloodWatch "watch" |
| 4d | Missing gauge never calm | ✅ (value on the tile: X11) | Khon Kaen ไม่มีข้อมูล, listed as missing |
| 5a | TMD CAP: items in force, provinces | ✅ | 1 of 7 RSS items live: TMD20261024063005_2, Heavy Rain, Severe, 06:00–18:00 +07, TH-80, 81, 83, 84, 90–96 = the 11 names in `areaDesc` |
| 5b | Where the page lifts tiles | ✅ | Hat Yai, Phuket: rain tile ●●●○ "กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้", verdict headline, table "📢 เตือนภัย" today only; Bangkok, Chiang Mai, Khon Kaen and Phang Nga (TH-82, not listed) not lifted; no wind or heat warning |
| 5c | Warning times as shown | ✅ | "ออก 06:27 น. วันนี้ · ถึง 18:00 น. วันนี้" = CAP `sent`/`expires` (RSS `pubDate` 23:27 the day before: the 7 h rule holds) |
| 5d | Card chips under the warning | ❌ (X6) | "วันนี้ ต่ำ" blue |
| 5e | English translation | ✅ faithful | read against the Thai below |
| 5f | Superseded CAP messages | ❌ latent (X8) | 21–22 Oct Update pairs |
| 6a | Quakes: TMD's file vs the RSS; list per point vs EMSC + USGS + TMD | ✅ 10 of 10; lines ✅ 6 of 6 points; tile word ❌ (X9) | Chiang Mai top 3 by intensity (M3.5 293 km, M3.0 267 km, M2.4 197 km); Khon Kaen M2.2 293 km; Bangkok none (largest M7.0 Tibet, beyond reach) |
| 6b | TMD vs EMSC (`crosscheck_live` C) | ✅ | 1 of 10 in both: M4.2 Laos 02:31, 0 km apart; the other 9 are M1.6–2.5 local |
| 6c | Fires: FIRMS raw → collector → page | ✅ | raw 10,776 + 13,174 rows → 178 in the box (nominal/high) = file 178; latest pass 19:28Z = "02:28 น. วันนี้"; 0 within 25 km / 24 h at all 6 (nearest: Chiang Mai 19.7 km, from a pass over 24 h old) |
| 6d | Storms | ✅ | TMD จำปี/CHAMPI 2,227–3,159 km; JMA Champi 2,401–3,359 km, In-fa 5,457+ km; GDACS VANCE-26 16,357 km → "ไม่มีพายุหมุนเขตร้อนในรัศมี 1,500 กม." at 6 of 6 |
| 6e | DMR landslide villages and fault | ✅ 6 of 6 | Chiang Mai 1 village, Mae Tha fault; Phuket and Phang Nga Khlong Marui |
| 7a | `npm run check:advice` | ✅ | 9 lines, PM2.5 tops [15, 25, 37.5, 75], heat floors [27.0, 33.0, 42.0, 52.0] all "ok" |
| 7b | Same words as FloodWatch (gauge status) and บ้านรอดไหม (bands, advice) | ✅ | FloodWatch STATUS = `RIVER_WORDS` |
| 7c | Same colours | ❌ (X17) | heat one step apart; FloodWatch watch and critical differ |
| 7d | FloodWatch CORS on `/api/point`, `/api/geocode` (B1/B2) | ❌ still none | no ACAO header; OPTIONS 405 |
| 7e | Outgoing links | ✅ 18 of 20; ❌ English guides (X10) | Thai guides 8 of 8: 200; TMD warnings, TMD quake site, ThaiWater, FloodWatch and its 5 `#p=` links (FloodWatch's `openFromHash` reads `#p=`), the CAP XML: 200; `disaster.go.th` 403 (bot check; known, SOURCES §3); `air4thai.pcd.go.th` TLS error to curl, timeout in Chromium (KI-002) |
| 8a | Verdict never milder than a tile; missing never calm | ✅ 6 of 6 | verdict ●●●○ = the highest tile; Khon Kaen "ยังไม่มีข้อมูล: น้ำท่วม, มลพิษอื่น" |
| 8b | Raw model heat never shown | ✅ | only corrected values (+5.1 °C over raw in Bangkok) |
| 8c | No rain amount as a forecast; no countdown; chances in tens, never 0/100 % | ✅ (latent: X16 note) | "ไม่ถึง 10%", "โอกาส 70%" |
| 8d | Exact GPS fix never leaves the phone | ✅ | 0 of 252 request URLs carry it; every position parameter has 2 decimals |
| 8e | No coordinates on screen for a GPS place | ❌ (X7) | footer "13.76, 100.5" |
| 8f | Thai = English numbers | ✅ 6 of 6 | identical number multisets |

**The translation, read against the Thai** (CAP `TMD20261024063005_2`, GLM `glm-5.3-flash`, `checked: true`):
- **Every number kept:** "2 เมตร" → "2 meters".
- **Every region kept:** ภาคใต้, ประเทศไทยตอนบน, ภาคเหนือตอนบน, ภาคตะวันออกเฉียงเหนือตอนบน, ทะเลจีนใต้, ภาคใต้ตอนบน,
  อ่าวไทยตอนบน, ภาคใต้ตอนกลาง ("central South", not "lower"), ทะเลอันดามัน, อ่าวไทย.
- **No clause dropped:** the weakening high, the easterlies, the monsoon trough, the waves, the boaters' line.
- **Wording:**
  - "น้ำท่วมฉับพลันและน้ำป่าไหลหลาก" → "flash floods and runoff" matches TMD's own English usage.
  - "ระวังอันตรายจาก…" → "beware of the dangers of…" is not softened.
- **Nits:** "meters" (US spelling), and "aforementioned areas" is stiff.
- **On screen:** the label, the Thai original and the link to TMD are shown.

## 6. What could not be checked

- **Night behaviour.** UV at night, "บ่ายพรุ่งนี้" after 16:00, "คืนนี้", and the warning's day boundary at 18:00 all
  need loads at other hours; all loads were at 14:57–15:13 Bangkok.
- **A stale or failed source.** The live fixtures had none. Every source answered: Air4Thai from the collector, all
  ThaiWater calls 200.
- **The LINE share text and URL.** The `line.me` popup redirected to `www.line.me/th/` before its URL could be read.
  `shareUrl` was read in code instead (`main.js:404–410`: a GPS place shares `#t=` only).
- **A warning for wind or heat, a felt quake, hotspots near a point, a storm within 1,500 km, a subdistrict on HII's
  list.** None occurred at the six points, so those paths were checked in code only (X8 and X16 are code findings).
- **The other four of the cross-check's five gauge differences** (BKC003, THA009, TPI006, TCP004). Their provinces'
  files weren't fetched, to keep within KI-029's limits.
- **Real phones, LINE's in-app browser, dark mode, larger text.** Not run. The brief was outputs, not layout.
- **`npm test` and `npm run smoke`.** Not run. This was an audit of the served v0.3.0, and the working tree held
  another session's uncommitted changes, so the tests would have tested that work instead.
- **`npm run preflight`.** Not run: it calls `docker`, which the brief ruled out on this host.

Scratch scripts and the raw captures (`capture.mjs`, `recompute.py`, `quakes.py`, `compare.py`, `cap/`, `indep/`)
are in the session's scratchpad, not in the repository.

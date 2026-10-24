# Visitor audit: ภัยรอบบ้าน ตอนนี้ / Disaster Now, v0.3.0 (24 Oct 2026)

An independent read of the running page as its visitors would meet it: Thai families on phones, many inside LINE,
some older, some reading English. Findings are numbered U1–U25. Severity follows [KNOWN_ISSUES](../KNOWN_ISSUES.md):
**high** could mislead someone about a hazard, **medium** is a gap or a wrong detail, **low** is polish.

## How it was done

- **What ran:** the Docker build on `http://127.0.0.1:8090/` (title "ภัยรอบบ้าน ตอนนี้ · Disaster Now", v0.3.0),
  with the collector's files of 07:50 UTC and the live sources. The walk ran on 24 Oct 2026 from 14:53 to 15:05
  Bangkok time (07:53–08:05 UTC), on a hot, dry afternoon. TMD's CAP "พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย"
  (Heavy Rain, Severe, 06:27 until 18:00) covered provinces 80, 81, 83, 84 and 90–96.
- **Line numbers** point at commit `0d60644`, the code that ran. During the audit another session was making
  uncommitted changes to the working tree: the rename, a `fcLevel` cap and a pre-warning `tone`, a "คาด" label on
  today's dust, and dots in the table. Some of them aim at U1, U6 and KI-025. Check again once they are committed.
- **Browser:** headless Chromium 1217 via playwright-core. Mobile, touch, `th-TH`, `Asia/Bangkok`. LINE Android UA at
  360 × 640 and at 320 × 568 with ก+. iPhone Safari UA at 390 × 844. Light and dark. Thai, with English switched on in
  the same load.
- **Eight page loads with a place open**, within the limit:
  1. Bangkok GPS (13.75712, 100.50234).
  2. That page reloaded with the place saved. The data came from `sessionStorage`, so ThaiWater wasn't called.
  3. "เชียงใหม่" and Enter.
  4. ต.ศรีภูมิ, Chiang Mai. Same province, so ThaiWater came from the cache.
  5. ต.ในเมือง, Nakhon Si Thammarat, under the warning.
  6. "Phuket" in English, under the warning.
  7. A farm point by GPS in Khon Kaen (16.5512, 102.4931).
  8. "หาดใหญ่", under the warning.

  ThaiWater was asked about six provinces, two requests each. No 429 came back. No page error appeared in the console.
- **Each outgoing link** was fetched once with curl from this server. Scripts and screenshots are in the session
  scratchpad (`…/scratchpad/visitor/`), not in the repo.
- **Not run:**
  - **Offline after one visit:** `sw.js` registers only on `https:` (`main.js:481`), and this server is `http:`.
  - **A real phone, LINE's real WebView and a real screen reader:** the Chromium accessibility tree was read instead.
  - **A slow network.**

## The short version

- **Heat has three severities on one screen (U1).**
  - The verdict and tile say ●●●○ เตรียมตัว in orange, but with the word "อันตราย".
  - The pre-warnings and the 3-day table paint the same forecast red, the "ทำทันที" colour, even at a 20 % chance.
  - Under TMD's Severe warning, the model's heat items are redder than TMD's own notice, which sits above them in orange.
- **Searching a province opens the province's map centre, not its city (U2).** "เชียงใหม่" + Enter lands 40 km away, on a
  994 m hillside in อ.แม่วาง. There the heat is a level lower, nothing is pre-warned, and dust is a satellite estimate.
  The city, at the same minute, read "อันตราย" with a 50 % chance of dangerous heat tomorrow.
- **Several numbers disagree for the same day, and the visitor can see it:**
  - Heat: the tile shows 43 and the table 44 (U1).
  - Dust today: 30.2 in yellow against 20 in blue (U6).
  - The rain card says "วันนี้ ต่ำ" under a TMD warning (U4).
  - The quake tile says nothing was reported in 24 h above a list of quakes from the last 24 h (U8).
  - The rain tile's "ไม่มีฝน" describes yesterday, not this afternoon (U5).
- **Words read as more official or more alarming than they are:**
  - The heat band "เตือนภัย"/"Warning" sits beside the real "กรมอุตุฯ เตือนภัย"/"TMD warning" (U9).
  - The bare "43 °C" is the heat index, not the air temperature (U3).
  - "O₃ 149" sits where Bangkok shows an AQI (U12).
- **The grandmother's question is answered on the first screen.** In Bangkok at 360 × 640 inside LINE, the verdict ends at
  543 px: "เตรียมตัว · ความร้อน: อันตราย · บ่ายนี้ 43 °C · 👉 หลีกเลี่ยงแดด ย้ายกิจกรรมไปช่วงที่ไม่ร้อน".
  The Chiang Mai parent gets a clear, measured dust answer once on the city. The warning provinces get TMD's notice
  first. The weakest part is everything below the first screen: 7,700–10,500 px of repeated and partly
  contradictory detail.

## Findings

### U1. A heat forecast is orange in the verdict and tile but red in the pre-warnings, the table and the card's days (high)
- **What the visitor sees:**
  - **Bangkok, 360 × 640 LINE, Thai:**
    - The verdict reads "●●●○ เตรียมตัว · 🌡️ ความร้อน: อันตราย · บ่ายนี้ 43 °C", on orange.
    - Just below it, three red pre-warnings: "🌡️ ร้อนระดับอันตราย (≥ 42 °C) · วันนี้ · โอกาส 70%", the same for
      "พรุ่งนี้", and for "จ. 26 · โอกาส 60%".
    - The 3-day table has red cells "44° 44° 43°", and the heat card's day chips are red "43° 43° 42°".
  - **Khon Kaen and Chiang Mai city:** the same, with red table cells "43° 43°" and "42°".
  - **Nakhon Si Thammarat and Hat Yai, under TMD's Severe heavy-rain warning:** the official item
    "📢 กรมอุตุฯ: พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย · ถึง 18:00 น. วันนี้" is orange. Under it sit red items:
    "🌡️ ร้อนระดับอันตราย (≥ 42 °C) · วันนี้ · โอกาส 20%" (NST) and "· พรุ่งนี้ · โอกาส 30%" (Hat Yai).
  - **Phuket:** the pre-warning "🌧️ ฝนหนัก (> 35 มม.) · จ. 26 · โอกาส 30%" is orange, while that day's table cell
    "มีโอกาส" is yellow.
- **Why it matters:**
  - GUIDELINES 3b says a forecast alone tops out at "เตรียมตัว", and 3c says an official warning leads.
  - Here the page paints a 20 % model chance in the "act now" colour, more urgent than the agency's Severe warning.
  - The verdict, which is supposed to be never milder than anything on the page, looks milder than the list below it.
  - The table's 44° and the tile's 43 °C differ because the table rounds and the tile floors (KI-F16 fixed only the
    tile).
- **Cause:**
  - Pre-warnings take the band's level (`outlook.js:158` `level: 3`, `:162` `level: 2`) and are coloured by it
    (`main.js:262` `lv-${LV(x.level)}`).
  - The table uses the uncapped band and `fmt` (`assess.js:498`).
  - The card's days use the uncapped band (`assess.js:90`).
- **Fix:**
  - Grade every forecast colour (table cells, card days, pre-warnings) as the tile grades it, capped at `MODEL_MAX`.
    Keep the agency's words ("ร้อนระดับอันตราย").
  - Floor heat everywhere it is shown.
  - Add a test: no `lv-danger` anywhere on a page whose only red source is a model.

### U2. Searching a province opens its map centre, not its city (high)
- **What the visitor sees (Chiang Mai, 390 × 844, Thai):**
  - **Where it lands:** typing "เชียงใหม่" lists "📌 จังหวัดเชียงใหม่" first, and Enter goes straight there. The
    place header is "จังหวัดเชียงใหม่ · ใกล้ ต.แม่วิน อ.แม่วาง จ.เชียงใหม่ · 18.7, 98.62", at "ความสูงของพื้นที่ราว 994 ม.".
  - **What it shows there:**
    - Heat "เตือนภัย · บ่ายนี้ 36 °C".
    - Pre-warnings "ไม่มีสิ่งผิดปกติที่แบบจำลองคาดไว้ใน 3 วัน".
    - Dust "17.3 µg/m³" from GISTDA's estimate ("ไม่มีสถานีวัดของ คพ. … ใช้ค่าประมาณ").
    - Flood "ไม่มีข้อมูล".
  - **The city at the same minute (ต.ศรีภูมิ):**
    - Heat "อันตราย · บ่ายนี้ 41 °C".
    - "ร้อนระดับอันตราย … พรุ่งนี้ · โอกาส 50%".
    - Dust measured at a station 0.7 km away.
  - **The share link spreads the wrong point:** `#p=18.7,98.62,จังหวัดเชียงใหม่`.
  - **Phuket:** "Phuket (province)" opens near Si Sunthon, Thalang.
- **Distances from the province centre in `tambon.json` to the capital's first subdistrict:** Chiang Mai 40.3 km,
  Ubon Ratchathani 29.5 km, Khon Kaen 19.4 km, Phuket 12.6 km, Bangkok 12.4 km.
- **Why it matters:** the most natural search, a province name, gives a reading for a place almost nobody in that
  search means. The headline says the province, so the visitor can't tell.
- **Cause:** province hits use `data.p`'s centre (`places.js` `buildIndex`). Enter takes `hits[0]` when the name matches
  exactly (`main.js:385–387`).
- **Fix:**
  - **A province hit opens the town centre:** subdistrict `pv·10000 + 101`. In all 77 provinces district `pv01` is the
    capital district, and `pv0101` exists, for example ศรีภูมิ, ตลาดใหญ่, ในเมือง. Label it
    "ตัวเมืองเชียงใหม่ (ต.ศรีภูมิ)".
  - **A district hit opens its seat** (`dddd01`), not the mean of its subdistricts.
  - **Share the hit as `#t=`.**

### U3. "43 °C" is the heat index, but the first screen shows it as a bare temperature (medium)
- **What the visitor sees:**
  - Verdict "ความร้อน: อันตราย · บ่ายนี้ 43 °C"; tile "บ่ายนี้ 43 °C"; table row "🌡️ ความร้อน °C 44°".
  - The share text carries only "ความร้อน: อันตราย".
  - The explanation "(ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก)" is the third line of the heat card, several screens down.
- **Why it matters:** TV and phone weather apps show the air temperature, several degrees lower. An older reader
  either thinks it is 43 °C outside, which is alarming, or decides the app is wrong and stops trusting it.
- **Cause:** `assess.js:78` and `i18n.js` `rowHeat`.
- **Fix:**
  - Say "รู้สึกเหมือน 43 °C" / "feels like 43 °C" on the verdict, the tile and the share text.
  - Name the row "🌡️ ร้อนที่รู้สึก °C".

### U4. Under a TMD warning, the rain card's day chips still say "วันนี้ ต่ำ" (medium)
- **What the visitor sees (Hat Yai, NST, Phuket):**
  - The tile says "กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้", and the table's today cell says "📢 เตือนภัย".
  - The rain card's chips say "วันนี้ / ต่ำ / ฝนหนัก" in blue. English: "Today / low / heavy".
- **Why it matters:** a blue "low" for today under a Severe heavy-rain warning contradicts the notice. The card's line
  "ตัวเลขจากแบบจำลองด้านล่างเบากว่าประกาศ…" softens it but doesn't remove it. KI-F25 fixed this in the table only.
- **Cause:** the warning loop (`assess.js:455–473`) doesn't touch `c.days` (`assess.js:221`). Only the table is
  overridden (`assess.js:506–515`).
- **Fix:** apply the table's override to the card's days, so cells under the warning read "📢 เตือนภัย" at the
  warning's level.

### U5. The rain tile's word is yesterday's gauge and reads as the forecast (medium)
- **What the visitor sees:**
  - Bangkok: the tile reads "🌧️ ฝน · ไม่มีฝน · โอกาสฝนหนัก ต่ำ" (English "No rain"). The source is "วัดได้ 0.0 มม. ใน 24
    ชม. ที่ผ่านมา".
  - Chiang Mai's centre: "ไม่มีฝน". The city: "ฝนเล็กน้อย".
- **Why it matters:**
  - At 15:00 on a late-October afternoon, "ไม่มีฝน" answers the grandmother's real question: is rain coming?
  - The forecast says nothing of the kind. It says only that heavy rain is unlikely.
  - GUIDELINES rule 7 lets a secondary source add lines, not set the tile's message.
- **Cause:** `assess.js:218`.
- **Fix:** take the tile's word from the forecast and keep the gauge in the card. If the gauge must show, write
  "24 ชม. ที่ผ่านมา: ไม่มีฝน".

### U6. Dust "today" has two values and two colours (medium)
- **What the visitor sees:**
  - Bangkok: the tile and card read "ปานกลาง · 30.2 µg/m³" in yellow. Right below, the card's chip "วันนี้ 20" and the
    table's "😷 ฝุ่น PM2.5 · 20" are blue.
  - Khon Kaen: 22.2 against 25.
- **Why it matters:** a parent checking dust for a child sees two answers for today, in different colours. The note
  "ฝุ่นคือค่าเฉลี่ยทั้งวัน" doesn't say which one is measured.
- **Cause:** the tile is the measured mean of the past 24 h (`assess.js:105`). The chip and table are the forecast
  mean of the rest of today (`assess.js:129`, `:501`).
- **Fix:** start the dust row at tomorrow, or label today's cell "คาด" and keep the measured value as the headline.

### U7. The 3-day table hides tomorrow on small phones (medium)
- **What the visitor sees:**
  - At 360 px (LINE), the third column ("จ. 26") is cut through the middle of its cells: Bangkok, Hat Yai.
  - At 320 px with ก+, only "วันนี้" is visible. "พรุ่งนี้" and "จ. 26" are off the right edge of the box, and nothing
    hints that the table scrolls.
  - Hat Yai at 360 also breaks "📢 เตือน/ภัย" and "มี/โอกาส" across lines.
- **Why it matters:** the table is where the page answers "will tomorrow be worse?" On the audience's usual screen, the
  answer is hidden.
- **Cause:** `app.css:107` (`overflow-x: auto`) and `:109` (`.outlook th { white-space: nowrap }`). The row headers
  "💨 ลมกระโชก กม./ชม." take about 55 % of the width.
- **Fix:**
  - Short row names ("ร้อน", "ฝนหนัก", "ฝุ่น", "UV", "ลม"), with units in the note.
  - `table-layout: fixed` with three equal day columns.
  - Or turn it so days are rows. Add a smoke check that every day column is inside the viewport at 320 px with ก+.

### U8. The quake tile says nothing was reported in 24 h, above quakes from the last 24 h (medium)
- **What the visitor sees:**
  - Khon Kaen: the tile reads "24 ชม. นี้ไม่มีรายงานใกล้ ๆ". The card lists "ขนาด 4.2 ประเทศลาว ห่าง 287 กม. … 02:31 น.
    วันนี้" and "ขนาด 2.5 ประเทศลาว ห่าง 295 กม. … 11:33 น. วันนี้".
  - Chiang Mai: the same tile word, above "ขนาด 2.4 ต.ปากน้ำ อ.สวรรคโลก … 22:20 น. 23 ต.ค.", 16.6 h earlier.
- **Why it matters:** the tile contradicts its own card. Someone who felt something, or heard about the Laos quake,
  reads "none".
- **Cause:** `assess.js:406` picks "ไม่มีรายงาน" whenever the level is 0, even when `recent` is not empty.
- **Fix:** with recent quakes but none at "อาจรู้สึกได้", say "24 ชม. นี้: 2 ครั้ง ไกลหรือเล็ก". Never "ไม่รู้สึก".

### U9. The heat band "เตือนภัย"/"Warning" reads as an official warning (medium)
- **What the visitor sees:**
  - NST and Hat Yai: the verdict is "🌧️ ฝน: กรมอุตุฯ เตือนภัย" with the chip "🌡️ ความร้อน: เตือนภัย".
  - Phuket in English: "Rain: TMD warning · until 18:00 today · Also: 🌡️ Heat: Warning".
  - Elsewhere on the same page, "เตือนภัย" with 📢 means "TMD has issued a notice".
- **Why it matters:** an expat or an older reader concludes that TMD has also warned of heat. Nobody has.
- **Cause:** `levels.js:211` (DOH/TMD's band words) beside `assess.js:465` and the table's "📢 เตือนภัย".
- **Fix:**
  - On tiles, chips and the verdict, show the heat band with its scale: "ดัชนีความร้อนระดับเตือนภัย" /
    "Heat index: warning level". Reserve a bare "เตือนภัย"/"Warning" with 📢 for agency notices.
  - The English words came from บ้านรอดไหม (KI-F13), so change both apps together.

### U10. "ประกาศฉบับเต็มของกรมอุตุฯ →" opens a raw XML file (medium)
- **What the visitor sees:** the warning box's link goes to
  `https://www.tmd.go.th/uploads/CAP/CAPTMD20261024063005_2.xml`. It returns 200 `text/xml`, 79 KB, with no stylesheet:
  "`<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>…`". English: "TMD's full notice (Thai) →", the
  same file.
- **Why it matters:** in LINE's browser or on a phone this shows markup or starts a download. A grandmother who taps
  "the full notice" gets nothing readable.
- **Cause:** `main.js:250` (`w.link || w.web`).
- **Fix:** link to TMD's warnings page, `https://www.tmd.go.th/warning-and-events/warnings` (200, readable; the page
  footer already uses it). Keep the CAP file for machines.

### U11. The verdict, an `aria-live` region, is rewritten about a dozen times per load (medium)
- **What was measured:** a MutationObserver on `#verdict` counted 12 rewrites in the first 14 s of one Chiang Mai load,
  including "กำลังดึงข้อมูล (0 จาก 10 เรื่อง)".
- **Why it matters:** TalkBack and VoiceOver may announce the verdict over and over, or announce the loading text, as
  sources arrive. Older users with screen readers are part of the audience.
- **Cause:** `index.html:63` (`role="status" aria-live="polite"`). `main.js:218–232` writes `innerHTML` on every
  `render()`.
- **Fix:** keep the region stable. Write it only when the level or headline text changes, set `aria-busy="true"` until
  settled, and announce once.

### U12. "O₃ 149" on a "no data" tile, where Bangkok shows an AQI (medium)
- **What the visitor sees:**
  - Chiang Mai: "🏭 มลพิษอื่น · ไม่มีข้อมูล · O₃ 149". Khon Kaen: "O₃ 118". Hat Yai: "O₃ 103".
  - In Bangkok the same slot reads "ดีมาก · AQI 25".
  - The card's "CO 949" is also unitless on its line. The unit appears only in the line above.
- **Why it matters:** 149 on the Thai AQI is "เริ่มมีผลกระทบต่อสุขภาพ". Next to an AQI elsewhere, a parent reads an
  alarm the data doesn't support. It is related to KI-027 (V18), but this is the alarming case.
- **Cause:** `assess.js:165`.
- **Fix:** no number on a tile with no level. In the card, give the unit and "(แบบจำลอง)" on each value.

### U13. A "no data" flood tile shows a reassuring number (low)
- **What the visitor sees:**
  - Chiang Mai centre: "🌊 น้ำท่วม · ไม่มีข้อมูล · ต่ำกว่าตลิ่ง 260 ซม.", from a gauge 8.4 km away, outside the 8 km rule.
  - Phuket: "No data · 239 cm below bank". Khon Kaen: "ไม่มีข้อมูล · ต่ำกว่าตลิ่ง 265 ซม.", from a gauge 10.5 km away.
- **Why it matters:** missing data must never look calm, and a big "260 cm below the bank" does.
- **Cause:** `assess.js:333` sets `c.value` even when `ai.category == null`. `main.js:237` draws it on any tile.
- **Fix:** no value on a tile at level −1. Keep the gauge line in the card.

### U14. The landslide tile calls Chiang Mai's old city a "risk area" (low)
- **What the visitor sees:** ต.ศรีภูมิ shows "⛰️ ดินถล่ม · พื้นที่เสี่ยง ฝนยังไม่มาก". Phuket shows "Risk area, little
  rain". The data says only "มีหมู่บ้านเสี่ยงดินถล่ม 2 แห่งในรัศมี 3 กม.".
- **Why it matters:** a parent in the town centre reads that their home is in a landslide area.
- **Cause:** `assess.js:383`.
- **Fix:** "มีหมู่บ้านเสี่ยงในรัศมี 3 กม. · ฝนยังไม่มาก" / "Risk villages within 3 km · little rain".

### U15. The felt word "some may feel it" is attached to tiny, far quakes (low)
- **What the visitor sees:** "ขนาด 1.8 … ห่าง 212 กม. … · ส่วนใหญ่ไม่รู้สึก แต่บางคนอาจรู้สึกได้ โดยเฉพาะบนอาคารสูง"
  (Chiang Mai centre). The same words follow M2.4–2.5 quakes at 198–295 km.
- **Why it matters:** it reads as though a M1.8 quake 200 km away could be felt. People in tall buildings may blame
  it for sway, or stop trusting the card.
- **Cause:** the band-0 word goes on every listed quake (`assess.js:409–411`).
- **Fix:**
  - List only quakes that matter here, for example M ≥ 4 or an estimated MMI ≥ 2, so far small ones leave the list
    and never get "ไม่รู้สึก".
  - Or show no felt word below a floor.

### U16. UV: the tile says "low" while today's cell says 10 (low)
- **What the visitor sees (NST, 15:00):**
  - The tile reads "☀️ UV · ต่ำ · UV 2" in blue. The table's today cell is "10" in orange.
  - The card says "สูงสุดวันนี้ราว 10 (สูงมาก) ช่วงเที่ยง", about a noon that has passed.
- **Cause:** `assess.js:183–192` and `:502`.
- **Fix:** after 13:00, show the rest of today's maximum in today's cell. Say "ที่ผ่านมา" for the past noon, or drop it.

### U17. Coordinates show on screen for a GPS place (low; privacy)
- **What the visitor sees:**
  - Every GPS view's footer: "อัปเดต 14:56 · แบบจำลอง 51 ชุด · จุดที่ส่งให้แหล่งข้อมูล 13.76, 100.5".
  - After a reload, the saved home "บ้าน" shows "ใกล้ แขวงบวรนิเวศ เขตพระนคร กรุงเทพมหานคร · 13.76, 100.5" under its
    name.
  - These are rounded to about 1 km, and "100.5" should read "100.50".
- **Why it matters:** GUIDELINES §2 says a GPS place shows no coordinates. Screenshots of "บ้าน" travel in family groups.
- **Cause:** `main.js:272`, and `main.js:200–201` (a reopened GPS place has `source: "saved"`).
- **Fix:** for GPS and saved places, show the subdistrict only. Format with `toFixed(2)`.

### U18. Contrast below AA on the LINE button and the blue meters (low)
- **Measured:**
  - "ส่งใน LINE": white on `#06C755` is **2.26:1**. That fails AA, even 3:1 for large bold text. `app.css:137`.
  - Blue dots and pills on "ยังไม่น่าห่วง" tiles: `#2F6FB0` on `#e3eef9` is 4.44:1 at 12.6–15 px.
- **Fix:** dark ink on LINE green (`#14202b` on `#06C755` is 7.3:1), or white on `#037A33` (5.5:1). Use `#24599a` for
  the level-0 ink (6.0:1).

### U19. Two CSS variables are undefined: the "แบบจำลอง" tag has no tag look (low)
- **What the visitor sees:** `.tag { background: var(--none-bg) }` (`app.css:103`) and
  `.msg { background: var(--watch-bg) }` (`:57`) point at variables that don't exist. The model tag renders as loose
  grey text that often wraps onto its own line ("…ECMWF 51 ชุด / แบบจำลอง"), so it reads as part of the source name.
  Messages such as "คัดลอกลิงก์แล้ว" have no background.
- **Fix:** use `--ln-bg` and `--l1-bg`.

### U20. Province hits keep an English label (low)
- **What the visitor sees:**
  - In Thai mode after switching back from English, the header still reads "Phuket (province)".
  - The English share text reads "Hazards at Phuket (province) (24 Oct, 15:01): Get ready · Rain: TMD warning", with
    double brackets.
- **Cause:** `places.js:65`. The label is fixed when the hit is chosen (`main.js:345`).
- **Fix:** store the code and label the place when it is drawn (this goes with U2).

### U21. "about under 10%" (low)
- **What the visitor sees:** "chance of heavy rain … in the area about under 10%". Thai: "ในพื้นที่ราว ไม่ถึง 10%".
- **Cause:** `assess.js:219–220`.
- **Fix:** drop "ราว"/"about" when the chance is a bound.

### U22. The focus ring looks like a level colour (low)
- **What the visitor sees:** a focused tile gets Chromium's thin default ring, `auto 1px rgb(229,151,0)`. That is close
  to the orange of "เตรียมตัว", so a focused blue tile looks like an orange one.
- **Fix:** `:focus-visible { outline: 3px solid var(--link); outline-offset: 2px }`.

### U23. The warning box's toggles are 28 px tall (low)
- **What was measured:** "อ่านรายละเอียด", "Details" and "The Thai original" in the warning box are 304–334 × 28 px
  (NST, Phuket, Hat Yai). KI-027 lists the other small targets.
- **Fix:** `.warn summary { min-height: 44px; display: flex; align-items: center }`.

### U24. A storm source that times out vanishes without a word (low)
- **What the visitor sees:** in the Phuket load, GDACS was aborted at the 12-s timeout. The wind card simply lost its
  "No tropical cyclone within 1,500 km" line and its GDACS credit. Neither the card nor the verdict's "ยังไม่มีข้อมูล"
  mentions it.
- **Fix:** add a card line "ตรวจพายุจาก GDACS ไม่ได้ตอนนี้" (GUIDELINES rule 7: a failed source is worded as a failure).

### U25. "บ่ายนี้" can name tomorrow's peak (low; code reading, not measured)
- **What the code does:** the heat tile's number is the maximum of the next 24 hours (`assess.js:72–78`). From about
  14:00, that window holds tomorrow's late morning and early afternoon, yet the label stays "บ่ายนี้" until 16:00.
- **Fix:** take today's afternoon window for "บ่ายนี้", and tomorrow's 11–16 h for "บ่ายพรุ่งนี้".

## Still present (known issues, not described again)

- **KI-001** is still present. Not deployed, and not on real phones, which this audit didn't use either.
- **KI-002** is still present. The footer link `https://air4thai.pcd.go.th` failed from this server (curl: no response,
  certificate chain).
- **KI-005** is still present. Heat is orange in all six places at 15:00, and the verdict is "เตรียมตัว" in all six.
- **KI-007** is still present. Bangkok: "จาก 1 สถานี ใกล้สุด 6.6 กม. · ความมั่นใจต่ำมาก".
- **KI-008** is still present. Bangkok: "กรมชลประทานสามเสน … ต่ำกว่าตลิ่ง 111 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน
  ไม่ใช้ตัดสินจุดนี้)".
- **KI-009** is still present. Chiang Mai centre and the Khon Kaen farm used GISTDA's estimate.
- **KI-016** is still present. GDACS timed out in one load (U24).
- **KI-017** is still present (see U16).
- **KI-018** is still present: "กรมอุตุฯ เรียกลมระดับนี้ว่า "ลมปานกลาง"".
- **KI-019** is still present. Under TMD's warning the verdict has no 👉 line, though TMD's own instruction is in the
  box.
- **KI-021** is still present: "(ข่าวอ้างหน่วยงาน)", "แบบจำลอง 51 ชุด", "ความมั่นใจต่ำมาก", "สนข.พระนคร".
- **KI-024** is still present:
  - English in Thai mode: "MYANMAR-CHINA BORDER REGION", "MYANMAR" and "µg/m³".
  - Thai in English mode: the station names "สนข.พระนคร", "อ่างเก็บน้ำบางเหนียวดำ" and "กรมชลประทานสามเสน".
- **KI-025** is still present. The table cells are colour only, and so are the card's day chips. "วันนี้" means the rest
  of today.
- **KI-027** is still present:
  - Targets narrower than 44 px: ↻ is 36 px and 199 is 34 px.
  - The meters are 12.6 px.
  - Thai words break across lines: "ภัยรอบบ้าน ตอน/นี้" and "แผ่นดิน/ไหว" at 320 px with ก+, and "วัน/นี้" in the
    pre-warnings at 390 px in dark mode.
  - The placeholder is truncated: "หรือพิมพ์ ตำบล อำเภอ จังห".
  - Tapping a tile leaves `#card-heat` in the address bar, and it was still there after the reload.
  - The welcome screen is empty.
  - "KHLONG MARUI" is in capitals.
  - "Other pollution" with model values reads as no data (see U12).
- **KI-030** is still present. NST's table shows a yellow "ต่ำ" for จ. 26.

## What works well

- **The verdict is on the first screen** of a 360 × 640 LINE window (it ends at 543 px), and it answers the
  grandmother's question with a sourced action: "👉 หลีกเลี่ยงแดด ย้ายกิจกรรมไปช่วงที่ไม่ร้อน". At 320 px with ก+, the
  level and headline are still on screen.
- **Official warnings come first.**
  - In NST, Hat Yai and Phuket the verdict reads "ฝน: กรมอุตุฯ เตือนภัย · ถึง 18:00 น. วันนี้", and the box quotes
    TMD's instruction with its issue and expiry times.
  - The English page's GLM translation read naturally: "People in the aforementioned areas should beware…". It is
    labelled as machine output, with the Thai original one tap away.
- **Missing data is visibly missing.** Tiles are hatched grey with "– – – –", and the verdict lists them
  ("ยังไม่มีข้อมูล: น้ำท่วม, มลพิษอื่น").
- **Privacy holds in the requests.** None of them carried more than two decimals of the fix (13.75712, 100.50234 went out
  as 13.76, 100.5). The share and LINE links carry `#t=100107`.
- **The share text is short, dated and specific:** "ภัยรอบบ้านที่ แขวงบวรนิเวศ … (24 ต.ค. 14:56): เตรียมตัว · ความร้อน:
  อันตราย".
- **On the city, the Chiang Mai parent gets a measured, plain answer:** "ดี · 16.7 µg/m³ · 👉
  ทำกิจกรรมนอกบ้านได้ตามปกติ", from a station 0.7 km away.
- **The page renders cleanly.** No console errors in eight loads, and no horizontal page scroll from 320 to 390 px.
  Dark mode is readable; only the LINE button fails AA.
- **Loading is honest:** "กำลังดึงข้อมูล (0 จาก 10 เรื่อง)", then a level in about 0.3 s here.
- **Every guide link works.** All eight "ทำอย่างไร" links reach real บ้านรอดไหม pages (`/hot`, `/air`, `/pm25`, `/mask`,
  `/flood`, `/storm`, `/landslide`, `/quake`), and FloodWatch's link carries the rounded point.
- **Model skill is stated frankly:** "จับวันฝนหนักที่สถานีได้ราว 1 ใน 8", "พลาดราว ±2.4 °C".

## A frank UX recommendation

1. **The page says everything three times, and the copies drift apart.**
   - One hazard appears as a verdict chip, a tile, a pre-warning, a table cell, card chips and card text. Six
     renderings with separate code produced U1, U4, U6 and U8.
   - Make one function produce a hazard's "day cells" (level, word, number), and have the tile, table and chips read
     from it. That is the direction of the uncommitted `fcLevel`.
2. **Cut the length.** The pages were 7,700–10,500 px tall, or 12–18 screens at 360 px.
   - Keep: verdict → tiles → the 3-day table, made to fit 320 px (U7) → official notices.
   - Collapse the ten cards: tapping a tile opens its card in place instead of jumping down the page (this also fixes
     the hash, KI-027).
   - Drop the card's day chips; they repeat the table.
   - Fold the pre-warnings into the table: a mark on the cell that has a chance worth naming.
   - Under a warning, show the headline, the time it ends and the first sentence of TMD's instruction, with the rest
     collapsed. Today the box pushes the tiles to 1,040–1,240 px.
3. **Fix how the levels and the agency's words fit together.**
   - "The agency's word leads" and "a forecast tops out at เตรียมตัว" together produce "อันตราย" on orange most
     afternoons (KI-005).
   - For forecasts, phrase the word as a forecast of the band, for example "อาจถึงระดับอันตราย บ่ายนี้", so the orange
     makes sense.
   - Keep a bare "เตือนภัย" with 📢 for agency notices only (U9).
4. **Don't show a tile you can't grade.** "มลพิษอื่น" had no level in four of six places (Chiang Mai ×2, Khon Kaen, Hat
   Yai, Phuket), yet it took a tile and showed a number (U12). Show it only where a PCD station measures other
   pollutants, and use nine tiles otherwise.
5. **Answer the visitors' actual questions.**
   - **The farmer asks "will it rain?"** The page answers only "heavy rain: low". Say why on the tile ("ฝนตกหรือไม่
     พยากรณ์รายจุดได้ไม่แม่น"), and link TMD's radar.
   - **The grandmother's "this afternoon?"** would be better answered with the hottest hours. That needs validating
     first (MODELS.md: ranges, not countdowns).
   - **The search should prefer towns:** see U2.

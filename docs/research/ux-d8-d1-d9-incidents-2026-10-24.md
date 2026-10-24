# UX research: the redesign (D8), heat on most afternoons (D1), one palette (D9), warning ahead of a Hat Yai, and the backup role (24 Oct 2026)

The owner's five questions, answered by a UX and risk-communication researcher for ภัยรอบบ้าน · Thai Risk. The audience is
Thai families on phones, many inside LINE, some older. Each answer ends in a concrete, prioritised recommendation.

**Rules followed** (GUIDELINES §1, AGENTS §5): every number comes from a run named below (page renders on the saved
fixtures, `research/data/model_check_daily.csv.gz`, the repository's colour check) or from a source with its URL and
the date read; anything not confirmed is **[unverified]**. Nothing in the app was changed: this file is the only edit.
No live source was called (ThaiWater limits this IP, KI-029); the page was rendered on `test/fixtures/` only.

**What was run** (scripts in the session scratchpad `…/scratchpad/agentC/`, not in the repository; the method of each
is given where it is used, so it can be re-run from repository data):
- **Renders:** headless Chromium 1217 (playwright-core), LINE's Android user agent, 360 × 640, 320 × 568 with ก+, the
  clock pinned as `npm run smoke` pins it (23 Oct 2026 19:50 UTC = 02:50 Bangkok) and at 18:30 Bangkok; Bangkok by
  subdistrict link (`#t=100101`) and Hat Yai (`#p=7.01,100.47`) under the saved TMD heavy-rain notice
  (`test/fixtures/warnings_en.json`). Every `lv-*` element, section box and text was read from the DOM. **The page
  measured is commit `ff4b126` (v0.5.0)**, re-rendered from a clean `git archive` of it (the numbers were identical to
  the first render); line numbers in this file refer to it. Another session was changing the working tree while this
  study ran (it began applying §3's heat colours); those changes are not what was measured.
- **Heat frequency:** the day-1 rows of `research/data/model_check_daily.csv.gz` (45,245 station-days, 71 TMD stations
  and 8 airports, Mar 2024–Oct 2026; observed daily-max heat index from NOAA GHCNh, and the HRES forecast through the
  year-round correction "C0"), graded by the page's own rule (`assess.fcLevel` emulated: band of the median, lifted by
  the chance rule, dressed with SD 2.95, capped at เตรียมตัว).
- **Colours:** `research/ux_palette_check.py`'s functions (Machado 2009 colour-vision simulation, CIEDE2000, WCAG 2
  contrast) on the three apps' palettes.
- **Sister apps read:** FloodWatch (read-only clone, `web/style.css`, `web/app.js`, `docs/`), บ้านรอดไหม
  (`bejranonda/Hazard-huntz`, cloned 24 Oct 2026: `public/hot.html`, `public/air.html`, `docs/KNOWLEDGE.md`,
  `docs/01-safety-content.md`).
- **Not run:** a real phone, LINE's real WebView, a screen reader, a live load, any test with people. Every layout
  below is a proposal to test with people (OWNER_ACTIONS A4), not a finding.

## 0. In brief (frank)

1. **D8, the redesign: improve, don't extend.** The page draws one forecast up to six times. On the Bangkok fixture
   the heat forecast alone is painted orange **12 times** (verdict, tile, three pre-warnings, three table cells, the
   card's pill and three day chips), and the ten hazards carry **55 level-coloured marks** (66 counting the cards'
   coloured top edges). The page is **8,612 px** tall at 360 px (13.5 screens) and **11,669 px** at 320 px with ก+
   (20.5 screens); the tiles start below the first
   screen (668 px on a 640 px window), and under a TMD notice at 1,124 px. Keep three views, each answering one
   question: **the verdict** (what matters now and what is coming), **one row per hazard** (now, plus a 3-day strip
   that absorbs the table, the card chips and the pre-warnings), and **the detail, opened in place** from its row.
   Add only two lines, both inside the verdict: "ข้างหน้า" (the worst of the coming days) and "เปลี่ยนจากที่ดูครั้งก่อน".
2. **D1, heat: show it, in the Department of Health's own colours.** The heat tile is orange whenever the heat index
   reaches 33 °C, and at the stations that is **94–100 % of days from March to October**, everywhere in Thailand
   (Don Mueang: 253 days in a row). The DOH colours its own bands **one step lower** than this page does: เฝ้าระวัง
   green, **เตือนภัย yellow**, อันตราย orange, อันตรายมาก red. Following the DOH's colours is not milder than the agency; it
   *is* the agency. It makes orange mean "≥ 42 °C likely", which still happens often where it is real (Bangkok 60 % of
   Mar–Oct days, 95 % of April days) and rarely where it is not (Chiang Mai 3 %, Hat Yai 12 %). It also unmasks the
   next flood: in Hat Yai on 14–18 Nov 2025 the heat index was 34–38 °C, so today's page would have been orange for
   heat on every one of the days the flood signal was building, and its colour would not have changed when the rain
   turned orange on 19 Nov.
3. **D9, one palette: Thai Risk's four colours for all three apps,** with the agency's word on every level. The check
   finds **FloodWatch's watch (`#B58900`) and warning (`#E46C0A`) indistinguishable to deuteranopes (ΔE00 1.8) and
   protanopes (4.3)**, and its white badge text on them at 3.2–3.3 : 1 (fails WCAG AA). บ้านรอดไหม's dots separate
   worse than Thai Risk's for colour-blind readers (green vs orange ΔE00 5.8, deutan). Thai Risk's palette keeps every
   adjacent pair ≥ 20 for red-green colour blindness (≥ 18 for the rare tritan type) and every label ≥ 5.2 : 1. Exact
   changes per app in §4.4.
4. **Incidents like Hat Yai: a ladder, not louder colours.** Watch → building → official → measured, with four rules
   against crying wolf: the verdict's colour changes only on the next 24 h, a measurement or an agency's notice (days
   2–3 go to the "ข้างหน้า" line); red never from a model; orange freed from everyday heat (D1); every change explained
   ("เปลี่ยนจากที่ดูครั้งก่อน"). For the LINE group: a share text with the five elements warnings need (source, hazard,
   place, time, what to do) and its own time stamp. **Beyond the page, don't build push now**: LINE's in-app browser
   cannot receive web push, iOS needs the page installed to the Home Screen, LINE Notify has ended, and every push
   channel needs a server that keeps who-wants-what (personal data under the PDPA). Point to the channels that reach
   people who aren't looking: DDPM's Cell Broadcast and the municipality's orders.
5. **The backup role: the river where FloodWatch can't answer, never a second FloodWatch.** Thai Risk is static at
   Cloudflare's edge and reads ThaiWater from the visitor's phone, so it keeps showing the gauges near a point, graded
   by FloodWatch's own rule, when FloodWatch's single server is down. Add: the collector's province files (so a
   flood-night crowd doesn't hit ThaiWater's per-IP limit), FloodWatch's upstream topology cached as a static file
   (so "ต้นน้ำที่สะเดา" can be read live from ThaiWater), and a FloodWatch-down notice. Don't copy its forecasts, maps,
   canals or history.

**Priority** (§7 has the full table): D1's colour change and D9's palette first (small, and they make every other
signal mean something); then the D8 redesign as one release with its own visitor audit; then the escalation lines
(most need the collector's province files, ROADMAP v0.5 #5); push only after a legal review, if ever.

## 1. What the page does today (measured on the fixtures, v0.5.0)

### 1.1 The six ways a hazard is drawn

| # | View | Code | What it shows | Colour from | Hazards |
|---|---|---|---|---|---|
| 1 | **Verdict** (headline, or a chip under "เรื่องอื่น") | `main.js` 219–247; `assess.js` 564–586 | level name + 4-dot meter; the worst hazard in the agency's word with its value; one sourced 👉 action (heat and dust only, KI-019); a chip for every other hazard at ≥ ติดตามไว้; "ยังไม่มีข้อมูล" | the highest tile, or a TMD notice | all 10 |
| 2 | **Tile** (2 columns at 360 px) | `main.js` 249–253 | short name, the agency's word, a value, meter | the card's level | all 10 |
| 3 | **Pre-warning** ("⏰ เตือนล่วงหน้า 3 วัน") | `main.js` 270–279; `outlook.prewarnings`; `assess.js` 168–171, 424, 588 | TMD notices first, then one line per day and band reached by ≥ 20 % of members ("🌡️ ร้อนระดับอันตราย (≥ 42 °C) · พรุ่งนี้ · โอกาส 70%") | `tone` = band level capped at เตรียมตัว | heat, rain, gusts, dust, HII flash flood |
| 4 | **3-day table** | `main.js` 328–340; `assess.js` 590–616 | 5 rows × 3 days: feels-like °C, heavy-rain chance word, PM2.5, UV peak, gusts; 📢 on warned days | `fcLevel`, TMD notice | heat, rain, PM2.5, UV, gusts |
| 5 | **Card day chips** | `main.js` 300; `assess.js` 120, 162–163, 246, 277–278, 311, 611–615 | the same three days, the same five hazards, the same `fcLevel` | as the table | heat, rain, PM2.5, UV, gusts |
| 6 | **Card** | `main.js` 297–317 | pill (word + meter), value, action, lines, note, sources with times and "แบบจำลอง", links to บ้านรอดไหม and FloodWatch | the card's level | all 10 |
| (7) | **Official warning box** | `main.js` 256–268 | TMD's headline, issue and end, instruction, collapsible description, link | CAP severity | notices only |

Views 4 and 5 are the same data twice, by design since 0.4.0 (one `fcLevel`). View 3 is the same data a third time,
filtered to the cells that cross a band. Views 1, 2 and 6 are the "now" at three depths.

### 1.2 Measurements

| | Bangkok `#t=100101`, 360 × 640 | Hat Yai under TMD's notice, 360 × 640 | Bangkok, 320 × 568, ก+ |
|---|---|---|---|
| Page height | **8,612 px** (13.5 screens) | **9,161 px** (14.3 screens) | **11,669 px** (20.5 screens) |
| Verdict | 205–481 px | 198–506 px | |
| Tiles start | **668 px** (below the first screen) | **1,124 px** (the notice box is 542 px tall) | |
| Pre-warnings / table / cards | 1,403 / 1,756 / 2,294 px | 1,848 / 2,307 / 2,870 px | |
| The ten cards | 5,028 px, **58 %** of the page | 5,028 px | |
| Level-coloured marks (DOM count; the cards' coloured top edges and the grey "warnings unknown" box not counted) | **55** (verdict 1, its chip 1, tiles 10, pre-warnings 3, table 15, pills 10, day chips 15) | **58** (verdict and 2 chips, notice box 1, tiles 10, pre-warnings 4, table 15, pills 10, chips 15) | |
| The heat forecast, orange | **12 times** | 12 times, plus "ระดับอันตราย" in the verdict beside TMD's notice | |

The first screen at 360 × 640 shows the header, the place, the verdict and the share buttons; nothing else
(screenshot in the scratchpad, `render/shots/bkk-360-first.png`). That meets GUIDELINES §6 (the verdict on the first
screen) and is right: the verdict is the page's answer.

### 1.3 What is wrong (frank)

1. **Orange has stopped meaning anything for most of the year.** Heat alone keeps the verdict orange on ~all days from
   March to October (§3.1). A colour that is always on carries no information, and the next real orange (rain, a TMD
   notice) arrives with no change of colour (§3.3).
2. **Heat is coloured one step hotter than the agency that owns the bands** (§3.2). The page's own rule is that the
   agency's word leads; for heat, the agency's colour doesn't.
3. **The same forecast four times** (tile, pre-warning, table cell, day chip). It is consistent since 0.4.0, but every
   copy costs height and every copy is a place for the next contradiction (U1, U4, U6 and U8 were all copies drifting).
4. **The page answers "will tomorrow be worse?" only far down.** In the hindcast's 17 Nov 2025 run the tile said
   ติดตามไว้ while the day after was "สูง" (hindcast §3.3); that line sat in the pre-warnings at about 1,400 px.
5. **An official notice looks like a model.** In Hat Yai the TMD notice, a satellite PM2.5 estimate and the everyday
   heat are all the same orange chip in the verdict ("ฝน: กรมอุตุฯ เตือนภัย" / "ฝุ่น: เริ่มมีผลกระทบต่อสุขภาพ" / "ความร้อน:
   ระดับอันตราย"), and the verdict has no 👉 line under a notice (KI-019).
6. **Ten cards nobody asked for.** 58 % of the height is detail for hazards the visitor didn't tap, most of them at
   ยังไม่น่าห่วง.

## 2. D8: the redesign

### 2.1 What the research says

Read on 24 Oct 2026 by a research assistant for this study (quotes from the pages and PDFs named; the keys [L#] are
in §9). What it adds to the UX scout's evidence (ux-scout §2):

- **Hierarchy, not repetition.** WMO's multi-hazard guidelines recommend "a hierarchical approach": "the warning
  colour alone, along with supporting text, is appropriate for use by the general public", with users able to "mine
  down" to the detail (WMO-No. 1150 Part II, §3.4 [L2]). Content should be "structured to provide a "trigger",
  followed by additional information on impacts and the suggested response", and list the risk level and its trend,
  "Monitor/prepare/act now", place, start and duration, and likelihood (p. 7). Shneiderman's mantra is "Overview
  first, zoom and filter, then details-on-demand" [L18]; Nielsen: progressive disclosure "defers advanced or rarely
  used features to a secondary screen, making applications easier to learn and less error-prone", and "it must be
  obvious how users progress from the primary to the secondary disclosure levels" [L19]. **No study was found that
  tests repeating the same forecast in several places**; the case against it here is the page's own record (four
  drift bugs, U1, U4, U6, U8) and Weyrich's finding that inconsistent warnings lower response (ux-scout R6).
- **The order of a warning screen.** The Met Office's warnings show "Headline", "What to expect", "What should I do"
  (linking to partners' advice) and "Further details", with the impact × likelihood matrix inside the details [L3].
  NWS's Hazard Simplification moved alerts to a bulleted "What, Where, When, Impacts" format, headlines "led by the
  HAZARD NAME" (e.g. "HEAT: Heat index values up to 100F until 4pm"), and "Active alerts prominently displayed at the
  top of each page" [L6][L7][L9]. That is the verdict's shape, and the notice box's.
- **Colour needs words.** The Met Office's yellow can mean a likely moderate impact or an unlikely big one, and readers
  are told to check which [L3]; MeteoAlarm adds that "for colour-blind users the coloured weather chart can be converted
  to black and white tints" [L4]. NWS's user studies found "Color- and number-based options problematic" for replacing
  its terms [L8]. WMO warns about "varying use of colour to depict certainty, severity, urgency and impact" and asks
  providers to "strive for consistency of presentation" (Part II §2.7 [L2]). Thai Risk's words-plus-dots rule is right;
  a chance or "คาด" beside a colour says which kind of orange it is.
- **The middle term is the weak one.** NWS found "ADVISORY is least understood headline and often conflated with
  WATCH" and decided to replace advisories with plain-language headlines [L6][L8] (decided in 2023; the date it took
  effect was not found **[unverified]**). Thai Risk's "ติดตามไว้" is its middle term: it should always carry its hazard
  and its window, never stand alone.
- **Words beat graphics for uncertainty.** "Almost no misinterpretations occurred when the predictive interval was
  expressed in text alone"; "no advantages were found for visualizations" (Savelli & Joslyn 2013 [L20]); in a tornado
  study "color-coding led to several misunderstandings" while probabilistic formats raised understanding and trust (Qin
  et al. 2024 [L21]). Keep the chance words and ranges in text; don't add charts.
- **The big apps put official alerts first and name their source.** Apple Weather in Thailand carries "Severe weather
  information … from national weather services", with the Thai Meteorological Department listed [L15] (Apple's
  WeatherKit attribution page lists fewer sources, so whether Thai iPhones show TMD's notices today is
  **[unverified]**). Google shows "a banner indicating that there's an ongoing crisis, followed by emergency
  information and resources", from "local, national, or international authorities" [L16], and labels its own computed
  heat warnings "approximate and for informational purposes only. Check official sources" [L16]. Thai Risk's page
  must agree with what a phone's own weather app may already show, and label its own computations as such.

**For D8 this means:** one verdict first (the trigger: level, hazard, window, action, source), one line per hazard
under it, the detail one obvious tap away; no second or third copy of a forecast.

### 2.2 Keep, merge or drop: each of the six

| View | Verdict | Why |
|---|---|---|
| 1 Verdict | **Keep, and extend by two lines** ("ข้างหน้า", "เปลี่ยนจากที่ดูครั้งก่อน") | It is the overview the evidence asks for, and the only part of the page every visitor reads. The pre-warnings' one useful job (the worst of the coming days) moves here, so it is on the first screen. |
| 2 Tile | **Merge with 4 and 5 into one row per hazard** | A tile without days hides "tomorrow"; a table without the "now" hides the reading. One row with "now" and a 3-day strip answers both at the place people already look. |
| 3 Pre-warning | **Drop as a list** | Its content is one of three things, each with a better place: a TMD notice (the verdict and the notice box), a day's chance (a mark on that day's cell: "โอกาส 60%"), the worst coming day (the verdict's "ข้างหน้า"). |
| 4 3-day table | **Merge into the rows** | Five hazards share one grid far below their tiles; in 0.3.0 it cut off tomorrow at 320 px (U7, fixed since by wrapping the row names). Inside each row the strip has its own line, next to the reading it continues, and wraps at 320 px with ก+. |
| 5 Card day chips | **Drop** | A literal copy of view 4 (the audit's D8 item). |
| 6 Card | **Keep its content, open it in place** from its row (`<details>`) | Detail on demand: the sources, the times, the honest skill notes and the guide link stay one tap away, and 5,000 px leave the default page. It also fixes `#card-heat` left in the address bar (KI-027). |
| (7) Notice box | **Keep, collapsed** to the headline, the end time, TMD's first instruction sentence and "อ่านต่อ" | The audit's U-series recommendation; today it pushes the hazards to 1,124 px. |

Rows with no data fold into one line ("ยังไม่มีข้อมูล: ไฟป่า, มลพิษอื่น"), as the verdict already lists them, instead
of a hatched tile each (they keep their hatch and dashes when opened). "Other pollution" without a measuring station
is one of them (the audit's recommendation 4).

### 2.3 The target layout at 360 px

The words are proposals for a native reader (OWNER_ACTIONS A5); the level rules, numbers and advice lines are the
page's own and unchanged, except heat's colours (§3).

**A. An ordinary October afternoon in Bangkok, after the D1 change** (first screen, 360 × 640):

```
┌──────────────────────────────────────┐
│ ◉ ภัยรอบบ้าน                  ก+  EN │
├──────────────────────────────────────┤
│ 📍 แขวงพระบรมมหาราชวัง เขตพระนคร  🔎 │  ← the place is the "change place" button
├──────────────────────────────────────┤
│█ ●●○○ ติดตามไว้                       │  ← verdict: level (yellow)
│█ 🌡️ ร้อนระดับเตือนภัย บ่ายนี้             │
│█    รู้สึกเหมือน 40 °C · ปกติของเดือนนี้   │  ← seasonal context, words only (§3.5)
│█ 👉 ลดกิจกรรมกลางแดด                   │  ← บ้านรอดไหม's line for the band
│█ ข้างหน้า: ไม่มีเรื่องที่แรงขึ้นใน 3 วัน      │  ← the worst coming day, or "nothing worse"
│█ ข้อมูล 14:56 · ยังไม่มีข้อมูล: ไฟป่า       │
├──────────────────────────────────────┤
│ [ ส่งใน LINE ] [☆ บันทึก] [↗ แชร์] [↻] │
├──────────────────────────────────────┤
│ ทุกเรื่องที่จุดนี้ · แตะดูรายละเอียด          │
│▌🌧️ ฝนหนัก   ต่ำ                ●○○○ ›│  ← one row per hazard: now …
│▌   วันนี้ ●○○○  พรุ่งนี้ ●○○○  จ.26 ●●○○ │  ← … and its 3-day strip
│▌🌊 น้ำท่วม  ยังรับน้ำได้           ●○○○ ›│  ← no forecast: one line
│▌😷 ฝุ่น     ปานกลาง 30.1        ●●○○ ›│
│▌   วันนี้ 23 คาด  พรุ่งนี้ ดี   จ.26 ดี    │
└──────────────────────────────────────┘
```

**B. The rest of the list, and one row opened** (scrolling):

```
│▌🌡️ ร้อน     เตือนภัย · 40 °C     ●●○○ ⌄│  ← opened in place
│▌   วันนี้ 40° ●●○○ พรุ่งนี้ 41° ●●○○      │
│▌   จ.26 41° ●●○○ อาจถึงอันตราย 30%      │  ← a chance mark replaces a pre-warning
│ ├──────────────────────────────────── │
│ │ บ่ายนี้ รู้สึกเหมือน 40 °C (ราว 37–43)  │
│ │ ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก        │
│ │ จ.26 อาจถึงระดับอันตราย (≥ 42 °C) 30%  │  ← was a pre-warning
│ │ 👉 ลดกิจกรรมกลางแดด                  │
│ │ ทดสอบแล้ว: พลาดราว ±2.5 °C           │
│ │ ที่มา: ECMWF 51 ชุด ปรับตามสถานี [คาด] │
│ │ ร้อนแบบนี้ ทำอย่างไร → (บ้านรอดไหม)     │
│ └──────────────────────────────────── │
│▌🌏 แผ่นดินไหว 24 ชม.: 2 ครั้ง ไกลหรือเล็ก ●○○○ ›│
│▌💨 ลม พายุ  กระโชก 27 กม./ชม.    ●○○○ ›│
│▌   วันนี้ ●○○○  พรุ่งนี้ ●○○○  จ.26 ●○○○ │
│▌☀️ UV      กลางคืน · พรุ่งนี้สูงสุด 7  ●○○○ ›│
│▌⛰️ ดินถล่ม  ไม่ใกล้พื้นที่เสี่ยงที่สำรวจ    ●○○○ ›│
│ ยังไม่มีข้อมูล: 🔥 ไฟป่า · 🏭 มลพิษอื่น ›  │  ← missing hazards fold into one line
├──────────────────────────────────────┤
│ ข้อมูลพื้นที่ (ระยะยาว) ›                  │  ← collapsed
│ ประกาศเตือนภัยทางการ: กรมอุตุฯ 1182 · ปภ. 1784 │
└──────────────────────────────────────┘
```

**C. Under a TMD notice** (Hat Yai fixture), the notice leads and looks official, not like a model:

```
│█ ●●●○ เตรียมตัว                        │
│█ 📢 กรมอุตุฯ: พื้นที่เสี่ยงภัยฝนตกหนัก        │  ← official: the 📢 badge and the agency's name
│█    ถึง 08:00 น. วันนี้                    │
│█ 👉 ระวังน้ำท่วมฉับพลันและน้ำป่า (กรมอุตุฯ)  │  ← TMD's own instruction, first sentence (KI-019)
│█ เรื่องอื่น: 😷 ฝุ่น เริ่มมีผลกระทบ (ค่าประมาณ) │
│█ ข้อมูล 02:50 · ยังไม่มีข้อมูล: น้ำท่วม      │
├──────────────────────────────────────┤
│ 📢 ประกาศกรมอุตุฯ ออก 16:43 น. 23 ต.ค.   │  ← the box, collapsed to ~150 px
│ ขอให้ประชาชนในบริเวณดังกล่าวระวังอันตราย… │
│ อ่านต่อ ⌄ · ประกาศฉบับเต็ม →             │
```

Rules for the layout:
- **Heights to aim for:** the default page (all rows closed, no notice) under about 1,800 px at 360 px, against 8,612
  today; tiles' replacement (the list) starting within the second screen; every day of every strip inside the
  viewport at 320 px with ก+ (the U7 check, kept in `npm run smoke`).
- **One provenance mark per value:** "วัด" (a measurement), "คาด" (a model), "📢" (an agency's notice), "ค่าประมาณ" (an
  estimate). The verdict's chips carry them too, so a model orange and an official orange read differently.
- **Fixed row order** (`assess.ORDER`), as today: people learn where their row is.
- **Strip cells carry dots and a word or number**, never colour alone (KI-025), and a chance only when a higher band
  is possible ("60%").

### 2.4 What changes in code (layout only; the rules and numbers stay)

- `assess.js`: one per-hazard structure, `c.now` and `c.days[]` (level, text, sub, chance, provenance), for all ten
  cards; the table rows, the chips and `prewarnings()` become views of it; the TMD-notice override is applied once
  (today it is applied separately to the table and the chips, `assess.js` 598–616). `verdict.coming` (the worst
  day-2/3 cell above the verdict's level, with its chance) replaces the pre-warnings list.
- `main.js`: the tiles, the pre-warnings, the table and the cards' chips become one list of rows with `<details>`;
  the notice box collapses; the verdict gets "ข้างหน้า" and the change line (§5.3).
- `app.css`: the row and strip; the old `.tiles`, `.outlook`, `.pre`, `.days` go.
- **Tests:** a smoke check that no forecast value appears in two places on the default page (the audit's "done when"
  for KI-033), the page height at 360 px, the first screen, the strip at 320 px with ก+; the audit tests that read
  `.outlook` cells and `.day` chips move to the rows.

## 3. D1: heat orange on most afternoons

### 3.1 How often the heat tile is orange

The page's heat tile is orange (เตรียมตัว) when the corrected median of the afternoon's heat index is 33 °C or more, or
when at least half the dressed members reach it (`levels.js`: 33.0 → level 2; `assess.fcLevel`). A perfect forecast
would therefore be orange on every day the observed heat index reaches 33 °C.

**Nationally, by month** (day-1 rows, 71 TMD stations and 8 airports, Mar 2024–Oct 2026):

| Month | Station-days | Observed ≥ 33 °C: orange today with a perfect forecast | Observed ≥ 42 °C: orange in the DOH's colours | Forecast (C0) graded by the page: orange today | Forecast (C0) ≥ 42 °C |
|---|---|---|---|---|---|
| Jan | 3,804 | 30 % | 0 % | 82 % | 0 % |
| Feb | 2,669 | 72 % | 1 % | 97 % | 3 % |
| Mar | 3,133 | 88 % | 23 % | 99 % | 32 % |
| Apr | 4,170 | 98 % | 60 % | 100 % | 69 % |
| May | 4,812 | 99 % | 61 % | 100 % | 71 % |
| Jun | 4,915 | 99 % | 43 % | 100 % | 65 % |
| Jul | 4,427 | 97 % | 22 % | 100 % | 46 % |
| Aug | 4,331 | 98 % | 32 % | 100 % | 49 % |
| Sep | 3,159 | 97 % | 21 % | 100 % | 37 % |
| Oct | 3,373 | 94 % | 16 % | 99 % | 21 % |
| Nov | 2,982 | 61 % | 4 % | 88 % | 5 % |
| Dec | 3,470 | 47 % | 0 % | 90 % | 0 % |

- The forecast columns use HRES through the year-round line (C0) as the stand-in for the ensemble median, as the model
  check did; it reads warm (+0.95 °C in Mar–Oct on unseen stations, model-check §1.7). In Nov–Feb the page has used
  C6 since 0.4.0, whose false "เตือนภัย likely" was 9 % of days (model-check §1.8): there the page is about the
  observed column plus a few points, not the C0 column.
- By region the picture is the same: from March to October the observed ≥ 33 °C share is 77–100 % in every region and
  month (the Northeast's March is the lowest; from April to October it is 89–100 % everywhere); in December–January it
  is 7–31 % in the North and Northeast and 48–88 % in the East and South.

**At representative stations** (observed, day 1; "C0" is the forecast through the line):

| Station | Mar–Oct: ≥ 33 °C | Mar–Oct: ≥ 42 °C (C0 ≥ 42) | Nov–Feb: ≥ 33 °C | Nov–Feb: ≥ 42 °C | Longest run of days ≥ 33 °C |
|---|---|---|---|---|---|
| Bangkok Metropolis (48455) | 100 % | 60 % (70 %) | 78 % | 2 % | 56 (record has gaps) |
| Don Mueang airport | 99 % | 19 % (79 %) | 53 % | 0 % | **253** |
| Chiang Mai airport | 93 % | 3 % (24 %) | 16 % | 0 % | 137 |
| Khon Kaen, Tha Phra (48384) | 98 % | 56 % (61 %) | 45 % | 3 % | 14 (gaps) |
| Udon Thani airport | 93 % | 17 % (53 %) | 22 % | 0 % | 80 |
| Ubon Ratchathani airport | 96 % | 44 % (57 %) | 43 % | 0 % | 130 |
| Hat Yai airport | 99 % | 12 % (59 %) | 76 % | 0 % | **216** |
| Phuket (48564) | 99 % | 33 % (5 %) | 98 % | 6 % | 52 |
| Rayong (48478) | 100 % | 22 % (41 %) | 69 % | 1 % | 53 |

So the heat tile, and with it the verdict, is orange on practically every day from March to October at every lowland
station, and on half or more of the cool-season days in Bangkok, the East and the South. The UX scout foresaw this
("Measure how many days the page shows ≥ level 2 … A very high alarm rate harms decisions", ux-scout §5a); D1's "most
afternoons" understates it.

**What a typical afternoon is** (observed daily-max heat index, median / 90th percentile, °C, 2024–2026, about two
years per month, so a short record): Bangkok Metropolis October **42 / 44**, April 46 / 49, December 35 / 39; Chiang
Mai airport October 37 / 39, April 39 / 42, January 28 / 30; Hat Yai airport October 39 / 39, April 42 / 45, November
37 / 39. The median October afternoon in Bangkok sits on the DOH's อันตราย line.

### 3.2 The colours belong to the DOH, and the page shifts them by one

บ้านรอดไหม sourced the DOH's own colours for its heat bands (its `docs/01-safety-content.md`, `[doh-heatlevels-2569]`,
read there on 20 Oct 2026): the Director-General, quoted by Daily News on 7 Apr 2026 (https://www.dailynews.co.th/news/5756174/),
"สีเขียว ทำกิจกรรมได้ปกติ แต่ควรดื่มน้ำสม่ำเสมอ สีเหลือง เริ่มเสี่ยง ควรลดกิจกรรมกลางแดด สีส้ม เสี่ยงสูง
ควรหลีกเลี่ยงแดดและปรับเวลา และสีแดง อันตรายมาก ควรหยุดกิจกรรมกลางแจ้งทันที"; THE STANDARD (3 May 2024, the DOH's
deputy Director-General) maps them: เฝ้าระวัง green, เตือนภัย yellow, อันตราย orange, อันตรายมาก red. บ้านรอดไหม's `/hot`
draws exactly that (`#6CC04A`, `#F2CF3A`, `#F28C28`, `#E5372E`). **The DOH's own page confirms it** (กรมอนามัย, news
43642, 3 May 2024, https://anamai.moph.go.th/th/news-anamai/43642 [K2]): "แบ่งระดับความรุนแรงต่อสุขภาพเป็น 4 ระดับ คือ
ระดับเฝ้าระวัง (สีเขียว) ระดับเตือนภัย (สีเหลือง) ระดับอันตราย (สีส้ม) และระดับอันตรายมาก (สีแดง)", and TMD's news page of
7 Mar 2024 gives the same names and colours with "ระดับอันตราย (42.0 – 51.9 องศาเซลเซียส)" [K3]. Neither publishes a hex
value, and the 27.0–32.9 and 33.0–41.9 ranges were found only in news quoting the agencies **[unverified on an agency
page]**.

| DOH band (heat index) | DOH's colour and words | Thai Risk today | Proposed |
|---|---|---|---|
| < 27.0 (no band) | – | ยังไม่น่าห่วง, blue | ยังไม่น่าห่วง, blue |
| เฝ้าระวัง 27.0–32.9 | green: "ทำกิจกรรมได้ปกติ แต่ควรดื่มน้ำสม่ำเสมอ" | ติดตามไว้, **yellow** | ยังไม่น่าห่วง, blue (the family's level-0 colour, §4) |
| เตือนภัย 33.0–41.9 | **yellow**: "เริ่มเสี่ยง ควรลดกิจกรรมกลางแดด" | เตรียมตัว, **orange** | **ติดตามไว้, yellow** |
| อันตราย 42.0–51.9 | **orange**: "เสี่ยงสูง ควรหลีกเลี่ยงแดดและปรับเวลา" | ทำทันที, **red** (a forecast capped at orange) | **เตรียมตัว, orange** |
| อันตรายมาก ≥ 52.0 | **red**: "อันตรายมาก ควรหยุดกิจกรรมกลางแจ้งทันที" | ทำทันที, red (capped at orange) | ทำทันที, red (a forecast capped at orange, as today) |

The DOH's four colours are a one-to-one match for the page's four action words: green "go on as normal, drink water"
is ยังไม่น่าห่วง, yellow "reduce" is ติดตามไว้, orange "avoid and reschedule" is เตรียมตัว, red "stop now" is ทำทันที. The
page's present mapping (KNOWLEDGE §2's table, from the UX scout, which did not have the DOH's colours) puts every band
one step higher and folds อันตราย and อันตรายมาก into one red. GUIDELINES rule 2 ("never milder than the agency's word")
is met by the proposal: the word is unchanged and the colour *is* the agency's. The advice lines are already
บ้านรอดไหม's per band (`actions.js`) and don't change.

The only colour that differs from the DOH's is green → blue at the bottom, the family's "ยังไม่น่าห่วง" (§4.3:
FloodWatch's D-036 reason, and green next to red is what the palette avoids). The tile keeps the DOH's word
"เฝ้าระวัง" beside it.

**What changes on screen is smaller than the table suggests.** The page has no measured heat: the heat tile is always
a forecast, capped at เตรียมตัว. So อันตราย and อันตรายมาก look the same as today (orange, the cap); the visible change is
only that เตือนภัย (33–41.9 °C) goes from orange to yellow and เฝ้าระวัง (27–32.9 °C) from yellow to blue. The rules,
`MODEL_MAX` and `fcLevel` stay as they are.

**A caveat the owner should know.** The DOH's page of 3 May 2024 says of that hot season "ตั้งแต่วันที่ 22 กุมภาพันธ์ –
ปัจจุบัน พบส่วนใหญ่อยู่ในระดับอันตรายมาก (สีแดง) หรือมากกว่า 52 องศาเซลเซียส" [K2]: by the agencies' own product, red was the
usual state of April 2024. The station heat index this page is corrected to (NWS formula on TMD's hourly records)
rarely reaches 52 °C (Bangkok's April 90th percentile is 49 °C, §3.1), so TMD's published heat index and the page's
read differently, and which formula TMD's product uses is still **[unverified]** (KI-004). The forecast cap already
keeps the page at orange where the DOH said red; that tension exists today and the proposal doesn't change it. It is a
reason to ask TMD for its heat-index product as data (a new item beside OWNER_ACTIONS C3, the TMD API key) rather
than to raise the page's colours.

**What it changes** (a perfect forecast, observed shares from §3.1): orange heat falls from 94–100 % of Mar–Oct days to
the days the heat index reaches 42 °C: nationally 16 % (Oct) to 61 % (May); Bangkok 60 % of Mar–Oct and 95 % of April
days; Chiang Mai 3 %; Hat Yai 12 %; Nov–Feb 0–6 % everywhere. With today's forecast (C0, warm) it would be more often
(Bangkok 70 %, Hat Yai 59 %, the C0 ≥ 42 column): that is the correction's known warm bias (KI-005), which the as-issued
scoring of C6 (ROADMAP v0.5 #3) should settle before anyone tunes words to it. In Bangkok's April, orange most days is
not crying wolf: it is the DOH's "เสี่ยงสูง".

### 3.3 Hat Yai, November 2025: everyday heat hid the flood signal

The observed daily-max heat index at Hat Yai airport (VTSS, `model_check_daily.csv.gz`): 14 Nov 35.1, 15 Nov 35.1,
16 Nov 34.2, 17 Nov 37.7, 18 Nov 34.5, 19 Nov 30.9 °C; 19 of the 30 days of November 2025 reached 33 °C.

- **Today's page, with a perfect heat forecast,** would have been ●●●○ เตรียมตัว for heat on 14–18 Nov: the days
  when ONWR (13 Nov), TMD (14 and 16 Nov) and DDPM (14 and 16 Nov) had named Songkhla (hindcast §2). On 17–18 Nov the
  rain tile was ติดตามไว้ with "สูง" for the day after (hindcast §3.3), so the verdict's headline stayed on heat, and
  the rain signal was a yellow chip under "เรื่องอื่น". On 19 Nov the rain tile went orange: **the verdict stayed the
  same orange**, with a different headline. Its first change of colour was red, from the measured rain at about 23:00
  on 19 Nov (proxy gauge).
- **With the DOH's colours,** 14–18 Nov would have been ●●○○ ติดตามไว้ (heat เตือนภัย, rain possible), with "ข้างหน้า:
  ฝนหนัก พ. 19 โอกาสสูง" in the verdict from 17 Nov (§5); on 19 Nov at 19:00 the verdict would turn **yellow → orange**
  for rain, a change a family can see and forward; then red from the gauge.

### 3.4 What others do, and the evidence on alarm rates

- **NWS HeatRisk** (national across the contiguous US since 2024, "available in the Western United States since 2014";
  still labelled "Experimental" [K1]) grades heat **relative to the place and the season**, not by a fixed heat index:
  "is it warmer than the top 5% of hottest days in the period of record for this date?"; "is this early season heat
  that you likely haven't become used to"; "will unusually warm overnight low temperatures add to heat stress into the
  next day?"; "thresholds also change based on the day of year so that they are lower in the spring than in the
  summer" [K1 fact sheet]. Its yellow rests on CDC's minimum-mortality temperature and its red on "the 50th percentile
  of CDC heat-attributable deaths"; the stated rationale is "Acclimation of heat important • Communities adapt and
  build to local climatology" [K1 slides]. Each level names who is affected: 1 Minor "Primarily affects those who are
  extremely sensitive to heat and without cooling/hydration" … 3 Major "Affects anyone without cooling/hydration" [K1].
  No statement that warning fatigue motivated it was found **[unverified]**.
- **What transfers to Thailand, and what doesn't.** HeatRisk's levels come from local health outcomes that Thailand
  has not published as thresholds; the DOH's bands are absolute and are the agency's word, so the page cannot lower a
  colour below them (rule 2). What transfers is the *information*: whether today is usual for this place and season,
  whether it is early-season heat (February–March, before people have adapted), and whether nights stay hot. Those
  can be **added as words** that raise attention when heat is unusual, never as a lower colour (§3.5 item 3).
- **The DOH's own colours already do half of HeatRisk's job:** with เตือนภัย yellow, the everyday Thai hot-season
  afternoon is "เริ่มเสี่ยง ลดกิจกรรมกลางแดด", and orange starts where the DOH says "เสี่ยงสูง".

- **Heat-health warning systems are meant to fire rarely.** WMO and WHO's guidance (WMO-No. 1142, 2015, §4.4.3 [L13]):
  with a low threshold "the cost would be high and warning fatigue may set in"; "the optimal HHWS should neither miss
  heatwave events nor give false alarms"; false positives "will undermine the credibility of the system".
- **False alarms cost lives, and probabilities help.** "A one-standard-deviation increase in the false-alarm ratio
  increases expected fatalities by between 12% and 29%" (tornadoes, Simmons & Sutter 2009 [L11]); "actual county FAR
  rates do predict behavioral response" (Trainor et al. 2015 [L12]); "very high and very low false alarm rates led to
  inferior decision making", and "adding a probabilistic uncertainty estimate … improved both compliance and decision
  quality" (LeClerc & Joslyn 2015 [L10]).
- **Heat alerts have not shown a mortality benefit on their own:** among US older adults "heat alerts were not
  associated with lower risk of mortality" (Weinberger et al. 2021 [L14]). A flood of alerts erodes attention: South
  Korea sent "a total of 4,189 disaster alert texts" in July 2026, and residents said "as the messages pile up, the
  sense of risk drops" (news, [L17]). **No controlled study was found that isolates how often a heat warning is issued
  and whether people then ignore it**; the evidence is the general false-alarm literature and the agencies' guidance.
- **What it means here.** The page's orange is not an alert pushed to anyone, so it is not a "false alarm" in the
  tornado sense. But it is the colour the page also uses for a TMD heavy-rain notice and for a likely heavy rain, and
  a colour on 250 days in a row can't announce the 251st. The DOH's own colours (§3.2) are the agency's threshold, not
  the app's; the evidence argues for not putting the app's orange below it.

### 3.5 Recommendation for D1

**Keep showing heat, every day, in the DOH's own colours.** In order:

1. **Colours (owner's decision, then a small change):** the heat bands' levels in `levels.js` become 27.0 → 0,
   33.0 → 1, 42.0 → 2, 52.0 → 3 (KNOWLEDGE §2 and the band tests in `test/core.test.mjs` updated together, with the
   DOH source above). The heat pre-warning moves with it (`outlook.prewarnings` emits heat as `level: 3` and
   `PRE_WHAT.heat[3]`; both become 2), and its colour should be that day's `fcLevel`, not the band's, so a 20–49 %
   chance of อันตราย is yellow and a likely one orange (today's `tone` is the band capped, orange at any chance). The
   advice lines, `MODEL_MAX`, `fcLevel` and the chance rule don't change.
2. **Words as a forecast of the band** (the audit's recommendation 3): "อาจถึงระดับอันตราย บ่ายนี้ (โอกาส 60%)" when the
   band is likely but not measured; the bare band word when the median is in it. Keep "รู้สึกเหมือน N °C".
3. **"Usual for this time of year", in words only, never lowering a colour:** "บ่ายแบบนี้พบบ่อยในเดือนนี้" when the
   forecast is at or below the place's usual afternoon for the month, and "ร้อนกว่าปกติของช่วงนี้" above its 90th
   percentile. This is NWS HeatRisk's insight (risk relative to local climate and season) applied without breaking
   rule 2, because it only adds emphasis. It needs a climatology per district and month from a long record (GHCNh
   2024–2026 is two years; ERA5 or TMD's own normals are candidates **[unverified]** which fits best); until then, ship
   nothing of it.
4. **Hours:** the DOH says avoid outdoor activity "above all 13.00–16.00", but BMA's hours differ, so บ้านรอดไหม gives
   none (its `[doh-heatsigns-2569]` note). The page should follow บ้านรอดไหม: if it adds hours, the page quotes them.
   The page's "บ่ายนี้" already names the window, and its correction is fitted on 13:00 and 16:00, which matches the
   DOH's hours without claiming them.
5. **Count, without visitors' data:** run `research/archive_forecasts.mjs` daily (it is not yet on cron, HANDOFF) and
   report the share of days each of its 12 points has an orange or red verdict, before and after the change. That is
   D1's "count orange-verdict days" with no analytics.

## 4. D9: one palette for the three apps

### 4.1 Today

| Level | Thai Risk (fill / label) | FloodWatch (`web/style.css`; white badge text) | บ้านรอดไหม (dots, its agency bands) |
|---|---|---|---|
| 0 | `#2F6FB0` / white | normal `#2F6FB0` | green `#6CC04A` (DOH เฝ้าระวัง, PCD ดี); PCD ดีมาก `#4FB3E8` |
| 1 | `#F2E700` / `#2E2A00` | watch `#B58900` | yellow `#F2CF3A` |
| 2 | `#E46C0A` / `#1F1300` | warning `#E46C0A` | orange `#F28C28` |
| 3 | `#B3122E` / white | critical `#C62828` | red `#E5372E` |
| no data | `#9AA3AE` + hatch | unknown `#8A94A3` | – |

### 4.2 The check (WCAG 2 contrast; CIEDE2000 between adjacent levels after Machado 2009 simulation, severity 1.0)

| Palette | Label contrast | Normal | Protan | Deutan | Tritan |
|---|---|---|---|---|---|
| **Thai Risk** | 5.22 / 11.20 / 5.60 / 6.90 | 72.9 · 41.9 · 30.4 | 64.2 · 28.5 · 26.4 | 69.1 · **20.2** · 21.8 | 47.3 · 30.3 · 18.4 |
| **FloodWatch** (white text) | 5.22 / **3.21** / **3.26** / 5.62 | 51.9 · 20.6 · 23.2 | 52.4 · **4.3** · 19.8 | 57.0 · **1.8** · 14.8 | 44.1 · 12.0 · 13.6 |
| **บ้านรอดไหม** (dark text; white on red) | 7.30 / 10.83 / 6.73 / **4.27** | 26.8 · 24.6 · 25.7 | **8.3** · 14.9 · 22.8 | 13.3 · 10.1 · 12.7 (green vs orange **5.8**) | 43.1 · 17.1 · 14.3 |

(The three numbers are levels 0–1, 1–2, 2–3. A ΔE00 under about 10 is hard to tell apart; the bold cells are the
failures.)

- **FloodWatch's watch and warning are the same colour to a deuteranope (1.8) and nearly so to a protanope (4.3).**
  Red-green deficiency was found in 5–8 % of Thai men in small studies (ux-scout R10, **[unverified]** abstracts), and
  FloodWatch's map tells the two levels apart mainly by dot colour. Its white badge text on watch and warning is
  3.2–3.3 : 1, below WCAG AA's 4.5 : 1 for 13 px text.
- **บ้านรอดไหม's** greens and oranges merge for colour-blind readers (5.8 deutan, 7.8 protan), and white on its red is
  4.27 : 1.
- **Thai Risk's** palette is the best of the three on every count: it was chosen with this check (ux-scout §5a), and
  its yellow is Japan's tested level-2 yellow (242, 231, 0) = `#F2E700` (Cabinet Office, 29 May 2020, via ux-scout A32).

### 4.3 Agency conventions

| Agency scale | Its levels and colour names | Published hex? | Maps to the family's levels |
|---|---|---|---|
| **PCD, Thai AQI and PM2.5** (Royal Gazette, 3 Jul 2023, Tables 1–2 [K4]) | ดีมาก ฟ้า · ดี เขียว · ปานกลาง เหลือง · เริ่มมีผลกระทบต่อสุขภาพ ส้ม · มีผลกระทบต่อสุขภาพ แดง | **no** (names only). Air4Thai's own code uses `#3BCCFF #92D050 #FFFF00 #FFA200 #F04646` in its legend and `#E8E819`, `#FF3B3B` for yellow and red on its map markers [K4] | ฟ้า, เขียว → 0; เหลือง → 1; ส้ม → 2; แดง → 3 (as today) |
| **DOH heat index** (anamai 43642, 3 May 2024 [K2]; TMD 7 Mar 2024 [K3]) | เฝ้าระวัง เขียว · เตือนภัย เหลือง · อันตราย ส้ม · อันตรายมาก แดง | no | **เฝ้าระวัง → 0; เตือนภัย → 1; อันตราย → 2; อันตรายมาก → 3** (proposed, §3.2; today one step higher) |
| **TMD warnings** | CAP severity (a routine heavy-rain notice is "Severe", `test/fixtures/tmd_cap.xml`); its heavy-rain risk map: "พื้นที่สีแดงหมายถึง บริเวณเสี่ยงภัยฝนตกหนักมาก … สีเหลืองหมายถึง บริเวณเสี่ยงภัยฝนตกหนัก" (Matichon, 18 Sep 2020 [K5]) | no; an official TMD colour scheme was not found **[unverified]** | Minor, Moderate → 1; Severe → 2; Extreme → 3 (as today, `events.CAP_LEVEL`) |
| **DDPM warning colours** (a provincial plan citing the national plan 2564–2570, p. 19 [K6]); the same five as LINE ALERT [K9] | เขียว ภาวะปกติ · **น้ำเงิน เฝ้าระวัง** · เหลือง เสี่ยงอันตราย · **ส้ม เสี่ยงอันตรายสูง … ให้อพยพ** · แดง อันตรายสูงสุด | no **[unverified]** | not ingested today. If it ever is: by meaning, not colour: เขียว → 0, น้ำเงิน → 1, เหลือง → 2, ส้ม (evacuate) and แดง → 3 |
| **DDPM disaster sizes 1–4** (the same plan, p. 32 [K6]; Thai PBS 9 May 2024 [K7]) | who commands: 1 the district or local director … 4 the Prime Minister | – | not a public warning colour; don't map |
| **NWS HeatRisk** (for comparison [K1]) | 0 green … 4 magenta | yes: `#E8F9E7 #F4F257 #F69632 #E22F33 #7A0E7F` ("official colors 4/7/23"), black text on the first three, white on red and magenta | – |
| **MeteoAlarm** [L4][L5] | green, yellow, orange, red ("3; orange; Severe", "4; red; Extreme") | no official hex found | Severe → 2, Extreme → 3, the same as TMD's CAP |

What follows from it:
- **Thai agencies publish colour names, not hex values.** So "the agency's colour" means its name: a family palette
  that keeps the names (เหลือง, ส้ม, แดง) and picks hexes for contrast and colour blindness respects the agency.
  Air4Thai's own hexes are weaker for colour-blind readers than Thai Risk's (deutan ΔE00 between yellow and orange:
  13.3 in its legend, 8.6 on its map markers, against 20.2), and black is the only readable text on four of its five.
- **Two clashes to know about.** (1) **DDPM's blue means "เฝ้าระวัง"**, one step up from normal, while the family's blue is
  level 0 (and FloodWatch's "ยังรับน้ำได้"). The family's blue never appears without its word ("ยังไม่น่าห่วง" or
  the agency's own), and the error, if any, is towards caution. (2) **DDPM's orange already means "ให้อพยพ"**, while the
  family's orange is "เตรียมตัว". If the page ever shows a DDPM or LINE ALERT level, it must map by meaning: DDPM's
  orange is ทำทันที (red), with DDPM's word on it.
- **Green stays out of the family palette** although three agencies use it for "normal": green beside orange and red is
  what colour-blind readers confuse (บ้านรอดไหม's dots, 5.8 deutan), and FloodWatch's D-036 ("blue = water in the
  channel, not safe") holds for the other hazards too: "ยังไม่น่าห่วง" is not "ปกติ".

### 4.4 The proposal: one family palette, and the exact changes

**The palette** (Thai Risk's, unchanged):

| Level | Thai Risk word | Fill | Label ink | Contrast | Used for |
|---|---|---|---|---|---|
| 0 | ยังไม่น่าห่วง | `#2F6FB0` | `#FFFFFF` | 5.22 : 1 | PCD ดีมาก/ดี, DOH < 33 °C, FloodWatch ยังรับน้ำได้ |
| 1 | ติดตามไว้ | `#F2E700` | `#2E2A00` | 11.20 : 1 | PCD ปานกลาง, DOH เตือนภัย, FloodWatch เฝ้าระวัง, TMD Minor/Moderate |
| 2 | เตรียมตัว | `#E46C0A` | `#1F1300` | 5.60 : 1 | PCD เริ่มมีผลกระทบ, DOH อันตราย, FloodWatch ใกล้ล้นตลิ่ง, TMD Severe |
| 3 | ทำทันที | `#B3122E` | `#FFFFFF` | 6.90 : 1 | PCD มีผลกระทบ, DOH อันตรายมาก, FloodWatch ล้นตลิ่ง, TMD Extreme |
| – | ไม่มีข้อมูล | `#9AA3AE` + 135° hatch | `#111827` | | every app |

Text in a level's colour on white (FloodWatch's legends, links) uses a darker ink of the same hue, never the fill:
`#24599A` for level 0 (6.0 : 1, already Thai Risk's U18 fix); for yellow and orange use the dark labels on a light
tint (`#FFFBC4`, `#FFE6D1`) as Thai Risk's tiles do.

**Rule for all three:** colour = what to do (the level); word = the agency's. A tool that *teaches* an agency's own
scale (บ้านรอดไหม's "ค่าฝุ่นตอนนี้เป็นสีอะไร?", which asks which colour Air4Thai shows) keeps the agency's five colours,
because its job is to match the agency's screen.

**FloodWatch** (`web/style.css` line 3; `web/app.js` `STATUS` lines 9–15; `web/impact.css` fallbacks at lines 78, 80,
155, 451, 479; `web/impact.js` hard-coded hexes, 6 places):
1. `--watch: #F2E700` (was `#B58900`), `--critical: #B3122E` (was `#C62828`); the same in `STATUS`.
2. `.badge` text: dark ink (`#2E2A00`) on watch and `#1F1300` on warning (white is 1.30 and 3.26 : 1 there); white stays
   on normal and critical.
3. Legend and line text that uses `--watch` as a text colour (`.lg-watch`, `.imp-bl-watch`) switches to a dark ochre
   such as `#7A6400` (5.75 : 1 on white). The same ochre is the yellow level's border on white in all three apps:
   the yellow fill itself is 1.30 : 1 on white and Thai Risk's tile border `#C9BD00` is 1.95 : 1, below WCAG 1.4.11's
   3 : 1 for a component's edge (the word and the dots carry the level, so this is polish, not a failure of meaning).
4. Map dots in the new yellow need a dark outline on the light basemap (yellow on white is 1.30 : 1); its `.dot`
   already has a 2 px white border and a grey ring (`impact.css` 677), which should become the ochre above.
5. Run its `scripts/ux_consistency.py` and its smoke at 360 px after the change (its D-062).

**บ้านรอดไหม** (`public/css/app.css` 7 places, `public/hot.html` 4, `public/air.html` 5, `public/content/kit.json` 9):
1. `/hot` and every level badge: เฝ้าระวัง `#2F6FB0` (or keep the DOH's green **only** on the "what colour is it?"
   teaching screens), เตือนภัย `#F2E700`, อันตราย `#E46C0A`, อันตรายมาก `#B3122E`, with the inks above; the Thai colour
   names (เหลือง, ส้ม, แดง) stay, since they are the DOH's and PCD's names.
2. `/air`: the five PCD colours stay on the "ค่าฝุ่นตอนนี้เป็นสีอะไร?" buttons (they must match Air4Thai); the result badge
   uses the family palette, with ฟ้า and เขียว both on the level-0 blue.
3. White on red (`#E5372E`, 4.27 : 1) goes with the new red (6.90 : 1).

**Thai Risk:**
1. The heat mapping (§3.5).
2. Its own palette stays. Dark mode keeps its tints.
3. The link-preview cards (INTEGRATION §5): the same four chips on all three apps' cards.

## 5. Incidents like Hat Yai: warning in advance, without crying wolf

### 5.1 What the page can know, and when (Hat Yai, Nov 2025, from the hindcast)

| When | What exists | Today's page (hindcast §3.3) | With D1 and §5.2 |
|---|---|---|---|
| 14–16 Nov | ONWR has named Hat Yai district (13 Nov); TMD's notices name Songkhla; the ensemble: low | rain tile ยังไม่น่าห่วง; verdict orange **for heat** (34–35 °C) | verdict yellow (heat เตือนภัย); a TMD CAP item for Songkhla would show 📢 [whether TMD's notices reached its CAP feed then is **unverified**, hindcast §8] |
| 17 Nov 19:00 | the day after "สูง" (40 %) | rain ติดตามไว้; verdict orange for heat; the 40 % sits in the pre-warnings | verdict yellow; "ข้างหน้า: 🌧️ ฝนหนัก พ. 19 โอกาสสูง" on the first screen; the multi-day line (0.5.0) in the rain row |
| 18 Nov 19:00 | tomorrow 40 %, the day after 70 % | as above | as above ("ข้างหน้า" now names tomorrow) |
| 19 Nov 19:00 | next 24 h 76 % | rain เตรียมตัว; **verdict stays orange** | **verdict turns orange**; "เปลี่ยนจากที่ดูครั้งก่อน: ฝน ติดตามไว้ → เตรียมตัว"; the official-channels line |
| 19 Nov ~23:00 | a gauge > 90 mm in 24 h (proxy) | red ทำทันที (measured) | red; "วัดได้รวม … มม. ใน 3 วัน" (hindcast §5 #3, when built) |
| 20 Nov 05:30 / 21 Nov 20:11 | DDPM's Cell Broadcast (Information / Extreme) | the page can't see it | the same; the page names the channel |
| 23 Nov 16:00 | X.173A at Sadao over its bank | not on the page (outside its 20 km list) | FloodWatch's upstream line (B5), when it exists |

The page's useful lead in this event was the **measured** rain (~45 h before DDPM's first Extreme alert, hindcast §3.3)
and, with FloodWatch's help, the **upstream river** (~13 h from Sadao to the city). The forecast saw the days but a
quarter of the rain. The ladder below is built on that.

### 5.2 The escalation ladder

| Step | Trigger (all existing rules unless marked) | Verdict colour | What the first screen adds |
|---|---|---|---|
| 0 Quiet | nothing above the agencies' lowest steps | blue | – |
| 1 Watch | a higher band possible (≥ 20 % of members) on day 2–3, or in the next 24 h | **unchanged** by days 2–3; yellow by the next 24 h | "ข้างหน้า: {hazard} {day} โอกาส{word}" (**new**) |
| 2 Building | the next 24 h likely (≥ 50 % of members); heavy rain on several days | orange (a forecast's cap) | the multi-day line (0.5.0); the measured 3-day total (**new**, needs the collector's province files); the official-channels line |
| 3 Official | a TMD notice in force (Severe → orange, Extreme → red) | the notice's level | 📢 headline and TMD's first instruction sentence; the notice's end time |
| 4 Measured | a gauge > 90 mm in 24 h, a river over its bank, FloodWatch's area category | red | the gauge, its distance and age; the upstream line (**FloodWatch's**, B5) |
| 5 Orders | Cell Broadcast, an evacuation order | (outside the page) | "ข้อความเตือนภัยบนมือถือ (Cell Broadcast) มาจาก ปภ. คำสั่งอพยพมาจากเทศบาลและจังหวัด · เว็บนี้ไม่ส่งการแจ้งเตือน" (shipped); and **new**, from step 2: how to check a phone can receive it (below) |

**Rules against crying wolf:**
1. **The verdict's colour moves only on the next 24 h, a measurement or a notice.** Days 2–3 are words on the
   "ข้างหน้า" line, never a colour. (The hindcast's "สูง" word had 12 false alarms in three seasons at 7 stations, hindcast §4.2.)
2. **Red never from a model** (`MODEL_MAX`, unchanged).
3. **Orange is free** for the things that need it once heat follows the DOH's colours (§3).
4. **Every change is explained,** up and down: "เปลี่ยนจากที่ดูครั้งก่อน (เมื่อวาน 19:05): ฝน ติดตามไว้ → เตรียมตัว".
   A drop is said as plainly as a rise.
5. **No hysteresis, no countdowns:** a level that falls falls (honest); the window is named ("24 ชม. ข้างหน้า",
   "พ. 19"), never "in 6 hours".
6. **Score it:** the daily archive (`archive_forecasts.mjs`) records every orange and red the 12 points would have
   shown; count them against measured heavy-rain days each season, as the hindcast did.

### 5.3 What a family in a LINE group needs

**"What changed since you last looked"** — kept on the phone only (`localStorage`, beside the saved places; five places
at most, no server, nothing sent): for each place, the time of the last look and each hazard's level. On the next open:

```
│█ ●●●○ เตรียมตัว                        │
│█ 🌧️ ฝนหนัก 24 ชม. ข้างหน้า โอกาสสูง [คาด]   │
│█ ↑ เปลี่ยนจากที่ดูเมื่อวาน 19:05:            │
│█   ฝน ติดตามไว้ → เตรียมตัว               │
│█ ข้างหน้า: ฝนหนัก พฤ. 20 โอกาสสูง          │
│█ ฝนหลายวันติดกันอาจหนักกว่าที่พยากรณ์มาก…  │
│█ 👉 [บ้านรอดไหม's flood line, to be worded there] │
```

**The share text** (the LINE button). Warning research gives its shape: Sutton's template "[Source]: HAZARD TYPE
occurring in [location] at [time]. [Hazard impact statement]. [Protective Action Guidance]. For more information visit
[URL]." with "local, familiar, trusted sources" [L22]; "longer public warning messages reduced people's inclination to
search for and confirm information, thereby shortening warning response delay" (Wood et al. 2018 [L23]); and the
source belongs at the beginning (the START study via GovTech [L24]). People who get a warning "mill": they look for
confirmation from others before acting (Mileti & Sorensen, via [L22]). A LINE group is where a Thai family mills, so
the message it forwards should be complete, say whose words it carries first, and carry its own time so a
forwarded copy isn't read as current:

```
📢 กรมอุตุฯ: {headline} ถึง {end}          ← only while a notice is in force: the agency first
ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา · ข้อมูล ณ 19 พ.ย. 19:05
●●●○ เตรียมตัว: ฝนหนัก 24 ชม. ข้างหน้า โอกาสสูง (แบบจำลอง ECMWF)
↑ จากติดตามไว้ เมื่อ 18 พ.ย. 19:05          ← only if this phone saw the place before
👉 {บ้านรอดไหม's line}
ข้อความเตือนภัยบนมือถือมาจาก ปภ. · คำสั่งอพยพมาจากเทศบาลและจังหวัด
ดูล่าสุด (ภัยรอบบ้าน): https://risk.autobahn.bot/#t=901101
```

(The share link carries the subdistrict code, never the GPS fix: GUIDELINES §2, unchanged. Today's text is one line,
"ภัยรอบบ้านที่ {n} ({d}): {level} · {hazard}: {word}", `i18n.shareText`.)

**The link preview** stays static (Open Graph is fetched without the `#t=` fragment, so it can't show the level
without a server rendering per-subdistrict cards); the share text carries the level.

**"Can grandma's phone get the alert?"** Cell Broadcast is the channel that reaches people who aren't looking, but not
every phone. The government's notice for the national test of 20 Jan 2026 [K8]: it reaches "4G และ 5G … iOS เวอร์ชัน 18
ขึ้นไป หรือ Android เวอร์ชัน 11 ขึ้นไป"; messages are up to "600 ตัวอักษร", "จะไม่มีการแนบลิงก์ และส่งในชื่อ DDPM เท่านั้น";
on an iPhone: "การตั้งค่า (Settings) > การแจ้งเตือน (Notifications) > เปิดใช้งาน Amber Alerts และ Emergency Alerts". A
family group is exactly where someone can check the older members' phones. Proposed, beside the shipped channels line
at เตรียมตัว or above on the rain and flood rows, and once in the share text in the rainy season:

```
📱 ข้อความเตือนภัยของ ปภ. (Cell Broadcast) ถึงมือถือ 4G/5G ที่เป็น iOS 18 หรือ Android 11 ขึ้นไป
   iPhone: การตั้งค่า > การแจ้งเตือน > เปิด Amber Alerts และ Emergency Alerts
   ช่วยตรวจมือถือของผู้สูงอายุในบ้าน
```

(The Android path differs by maker and was not read on an official page **[unverified]**; the page already gives
Google's earthquake-alert path the same way. The page shouldn't try to detect a phone's support: Chrome's reduced user agent
reports a fixed Android version, as far as this author knows **[unverified here]**.)

### 5.4 Alerts beyond the page

| Channel | Reaches | Inside LINE? | Keeps data about people? | Cost | Verdict |
|---|---|---|---|---|---|
| **Web Push, Android** | Chrome (since version 42) [K12] | **no**: MDN's compatibility data lists the Push API and Notifications as unsupported in Android and iOS WebViews (`webview_android: false`, `webview_ios: false`) [K12]; LINE's LIFF browser "follows the specifications of WKWebView and Android WebView" and lists service workers as unsupported [K13] (which engine LINE's ordinary in-app browser uses is not documented **[unverified]**) | **yes**: a push server must store each phone's subscription and its place | a server | not now |
| **Web Push, iPhone** | iOS/iPadOS 16.4 and later, **only for a web app added to the Home Screen**, permission only "in response to direct user interaction" [K11]; the manifest must have a non-default `display` (this page's is `standalone`) [K12] | no | yes | a server | not now; from LINE it takes `openExternalBrowser=1` [K14], Safari, Share, Add to Home Screen, open, allow: too many steps for most of the audience |
| **LINE Notify** | – | – | – | – | **ended** "as of March 31, 2025" [K15] |
| **LINE Official Account (Messaging API)** | a family that adds the account, or invites it into its group ("Allow bot to join group chats" is "disabled by default") [K18] | yes, it *is* LINE | **yes**: group IDs and the subdistrict each group watches (where a family lives) | Thailand, before 7 % VAT [K16]: free 300 messages a month; เบสิก 1,280 baht for 15,000, then 0.1 baht each; โปร 1,780 baht for 35,000, then 0.06 baht. A push to a group of five counts as five [K17] | only as a pilot, after the owner and a Thai lawyer (PDPA); see below |
| **LINE ALERT** (@linealert) | launched 6 Oct 2022 with DDPM and TMD; five levels "ปกติ, เฝ้าระวัง, เสี่ยงอันตราย, เสี่ยงอันตรายสูง และ อันตรายสูงสุด"; PCD joined for PM2.5 on 21 Feb 2025 [K9] | yes | LINE's | free to people | **point to it** (the page's "warnings unknown" line does); its status in 2026 is **[unverified]** (OWNER_ACTIONS C8) |
| **Cell Broadcast** (DDPM with the NBTC and the operators) | every 4G/5G phone on iOS 18+ or Android 11+ in the area; tested 2, 7 and 13 May 2025, used "ใช้งานจริงในหลายเหตุการณ์ เช่น น้ำท่วมภาคเหนือ น้ำท่วมภาคใต้ … PM2.5", national test 20 Jan 2026; five types (National, Emergency, Amber, Public Safety, Test), five languages, 600 characters, no links [K8] | it reaches the phone, not the app | no | public | **the** channel; the page names it and helps families check their phones (§5.3) |
| **Agency apps** | TMD's "Thai Weather" ("…เส้นทางพายุ, รายงานแผ่นดินไหว, เตือนภัยสภาพอากาศ…"), "TMD Earthquake" for Android ("แจ้งข้อความข่าวด่วน ผ่านทาง Notification") [K19]; DDPM's "Thai Disaster Alert" [K20] | no | the agencies' | free | list them in the one "official channels" block of the three apps (INTEGRATION §5) |

**Cell Broadcast in Hat Yai.** DDPM sent specific messages: "ปภ. ส่งข้อความ Cell Broadcast แจ้ง ปริมาณน้ำคลองอู่ตะเภา …
คาดว่าจะขึ้นสูงสุดประมาณ 1.25-1.45 ม." (Thai PBS, 24 Nov 2025 [K10]). The criticism was mostly of timing and clarity: "การแจ้งเตือนประชาชนยังไม่ได้รับอย่างทันท่วงที ทำให้เกิดการอพยพล่าช้า" (Naewna, 22 Nov 2025, on the Prime Minister's
call to check the system [K10]); "ไม่ชัดเจนว่าอพยพที่ใด เส้นทางไหน เมื่อไหร่?" (Thai Post opinion, 28 Nov 2025 [K10]). The white
paper counts 15 messages to Hat Yai, 7 of them Extreme (hindcast §2).

**A LINE account, honestly costed.** It is the only push that reaches families where they are. Rough sizes from the
published prices (an estimate, not a quote): 1,000 family groups of five with four alerts a month is 20,000 messages,
about 1,780 baht a month before VAT (เบสิก plus 5,000 extra, or โปร); 10,000 groups is 200,000 messages, about 11,680
baht (โปร plus 165,000 × 0.06). The money is the small part. It needs: a server that decides and sends (the collector
could), stored group IDs with the subdistrict each watches (personal data under the PDPA: GUIDELINES §2 and SERVER §5
say the server keeps nothing about a person, so this changes a rule), someone answering when it misfires (FloodWatch
has no one on call either, its Q12), and a trigger strict enough not to cry wolf (an official notice or a measured
ทำทันที only, never a forecast). It would also duplicate LINE ALERT, which already pushes the agencies' levels inside
LINE. **Recommendation: no push now (D4 stands).** If the family ever pushes, one LINE account for all three apps
(FloodWatch's Q7 asks the same question), after a lawyer, triggered only by notices and measurements.

**What the page does instead (pull, done well):**
1. **Be the place a family checks when a phone alert or a rumour arrives**: fast, in the agencies' words, saying what
   changed since last time (§5.3). That is the "confirmation" warning research says people look for [L22].
2. **Be one tap away:** the page is installable (its manifest is `standalone`); offer "เพิ่มไว้ที่หน้าจอ" outside LINE,
   and inside LINE the existing "open in the phone's browser" link (`openExternalBrowser=1` [K14]; `main.js lineHint`,
   today shown only when location fails).
3. **Forward well:** the share text of §5.3.
4. **Name the channels that push:** Cell Broadcast (and how to check a phone), LINE ALERT, the agencies' apps, 1182
   and 1784, the municipality's orders.

## 6. Roles: Thai Risk as FloodWatch's backup

**Why the roles differ in a failure.** FloodWatch is one server behind a Cloudflare Tunnel (its `edge/README.md`:
"`flood.autobahn.bot` … proxied CNAMEs to tunnel"; its database, collectors and API on one VPS): when that server or
its tunnel stops, the site stops. Thai Risk, once deployed (it is not yet: A9), is static files at Cloudflare's edge;
the phone itself calls ThaiWater for the province's rain gauges and water levels and grades them with FloodWatch's
own rules (`levels.riverLevel` = `classify_status`, `water.areaIndex` = `point.area_index`; 737 of 742 gauge statuses
equal FloodWatch's on 24 Oct 2026, INTEGRATION §2). So on a night FloodWatch is down, Thai Risk still answers "is the
water near this point high?", in FloodWatch's words. That is already a backup; it needs four things to be a reliable
one, and one thing it must not become.

**Add:**
1. **The collector's province files** (SERVER §6.4, ROADMAP v0.5 #5): ThaiWater's `rain_24h` and `waterlevel_load` per
   province every 15 minutes into KV. On a flood night many phones share a few carrier addresses, and ThaiWater limits
   per IP (KI-029); one fetch per province per 15 minutes from the server is what keeps the gauges on screen. The page
   keeps its direct call as the fallback (and the reverse: when the collector is down the page still calls ThaiWater).
2. **FloodWatch's upstream topology as a static file.** FloodWatch's station list carries `upstream` links with lags
   (hindcast §6: SLA003 → X.173A 4 h, X.173A → X.90 7 h, X.90 → X.44 6 h). The links change rarely; copied once a day
   by the collector (or once by hand into `public/data/`), they let the page read the upstream gauges' *live* levels
   from ThaiWater and show "ต้นน้ำ: X.173A บ้านม่วงก็อง (สะเดา) ห่าง 24 กม. · {status}" even when FloodWatch is down.
   The lag sentence ("น้ำจากต้นน้ำมักถึง…") is FloodWatch's to word and validate (B5); until then, the page names the
   upstream gauge and its status only.
3. **A "FloodWatch isn't answering" line, without a call per visitor:** the collector already runs every 15 minutes;
   it records FloodWatch's health (one request) in `index.json`, and the flood card's link becomes "FloodWatch
   ไม่ตอบตอนนี้ (ตรวจเมื่อ {time}) · ดูข้อมูลน้ำที่ ThaiWater". Which FloodWatch endpoint is its health check is
   **[unverified]**; ask FloodWatch's maintainer.
4. **Capacity for a flood night.** Static files are free and unmetered at the edge, but `/data/live/*` runs the Worker:
   Workers Free allows 100,000 requests a day and KV Free 100,000 reads (CLOUDFLARE.md, read 23 Oct 2026). A page load
   reads `index.json` and up to five files (six Worker requests), so the free plan covers roughly 16,000 page loads a
   day (about 12,500 with two province files), less any sessionStorage reuse. Past that, the live files fail and the
   page falls back to "ตรวจประกาศเตือนภัยไม่ได้". Decide before the next monsoon whether Workers Paid (US$5 a month,
   CLOUDFLARE.md) is worth it; FloodWatch's own peak traffic in a flood would size it **[unknown here]**.
5. **FloodWatch names its backup:** its offline page and its "server unavailable" text (if its service worker serves
   one) point to `risk.autobahn.bot` for "ระดับน้ำใกล้จุดของฉัน". A backup nobody knows of isn't one.

**Don't duplicate** (each is FloodWatch's and would go stale or wrong in a copy):
- its 12–72 h level forecasts and their measured skill (only FloodWatch can validate them; a copied number outlives
  its check);
- BMA's canals and thresholds (KI-007: only FloodWatch has them; Thai Risk says "ความมั่นใจต่ำมาก" in Bangkok and should
  keep saying so);
- maps, history charts, the `/impact` reservoir cases, Traffy street reports, the AI triage, users' notes;
- its database or archive (Thai Risk keeps no history of gauges; FloodWatch's replay of Nov 2025, B5, is FloodWatch's).

**The division in one line each:** FloodWatch = the water, in depth, with forecasts; Thai Risk = every hazard at one
point now, and the river near it in FloodWatch's words even when FloodWatch is down; บ้านรอดไหม = what to do.

## 7. Prioritised plan

| # | Change | App | Size | Needs | Evidence |
|---|---|---|---|---|---|
| 1 | **Heat in the DOH's colours:** bands 27 → 0, 33 → 1, 42 → 2, 52 → 3; words as a forecast of the band | Thai Risk | small (`levels.js`, KNOWLEDGE §2, the band test, the smoke's heat checks) | the owner's D1; A5's reader for the words | §3.1–3.3 |
| 2 | **FloodWatch's watch and critical colours and badge inks** | FloodWatch | small | its maintainer; its D-062 consistency run | §4.2 (an accessibility fix even without D9) |
| 3 | **บ้านรอดไหม's level badges in the family palette** (agency colours only on its "which colour?" screens) | บ้านรอดไหม | small–medium | its maintainer; its smoke | §4.2, §4.4 |
| 4 | **"ข้างหน้า" in the verdict** (the worst day 2–3 cell above the verdict's level) | Thai Risk | small; can ship before the redesign | a test: the 17 Nov 2025 hindcast run shows it | §1.3 (4), §5.1 |
| 5 | **"เปลี่ยนจากที่ดูครั้งก่อน"** (on the phone only) | Thai Risk | small–medium | GUIDELINES §2 note (local storage, five places) | §5.3 |
| 6 | **The share text with the five elements and its own time** | Thai Risk | small | A5's reader | §5.3 |
| 7 | **The D8 redesign** (rows with 3-day strips, details in place, the notice collapsed, pre-warnings, table and chips gone) | Thai Risk | one release, medium–large | its own visitor audit; real phones (A4) | §1, §2 |
| 8 | **The collector's province files**, then the measured 3-day rain line | Thai Risk server | medium | A9/A10 (deploy, KV token) | hindcast §5 #2–3; §6 |
| 9 | **FloodWatch's upstream topology file** and the upstream line | FloodWatch, then Thai Risk | medium | B5 | hindcast §6; §6 |
| 10 | **FloodWatch-down line** from the collector | Thai Risk | small | FloodWatch's health endpoint | §6 |
| 11 | **Workers Paid** before the monsoon, if a flood crowd is expected | owner | US$5 a month | traffic estimate | §6 (4) |
| 12 | **Seasonal context for heat** ("ปกติของเดือนนี้" / "ร้อนกว่าปกติ") | Thai Risk | research first | a long climatology per district | §3.5 (3) |
| 13 | **Push alerts** | – | don't, for now | a Thai lawyer (PDPA), a server that keeps subscriptions, the owner | §5.4 |

## 8. What this study could not do

- **No people.** Every layout and word here is a proposal. Whether a grandmother reads a 3-day strip faster than
  today's table, or a family forwards the new share text, is untested (OWNER_ACTIONS A4, A5). The redesign's own
  visitor audit is part of item 7.
- **No real phone, no LINE WebView, no screen reader**; headless Chromium with LINE's user agent only.
- **The mockups were not rendered.** The "about 1,500–1,800 px" for the redesigned default page is an estimate from
  today's measured parts (verdict ~300 px, a two-line row ~76 px, a one-line row ~52 px), not a measurement.
- **The heat frequencies** use the deterministic HRES through the year-round line as the stand-in for the ensemble
  median (as the model check did), and a GHCNh record of about two and a half years; the agromet stations' records
  have gaps, so their "longest run" is a floor. The page's cool-season correction (C6) was not re-run here.
- **The colour check** simulates full dichromacy (severity 1.0) only, not the milder anomalous trichromacies, and
  doesn't model a phone's screen or sunlight.
- **The agency colours** for TMD's and DDPM's levels are as far as the sources in §4.3 go; anything marked
  **[unverified]** there was not read on an agency page.
- **What FloodWatch would have shown in Nov 2025** is still unknown (hindcast §6; B5).

## 9. Sources

All read on 24 Oct 2026 unless marked. [L#] were read by a research assistant for this study (literature); [K#] by a
second assistant (agencies and channels); quotes are theirs from the pages named. Their text extracts are in the
session scratchpad (`…/agentC/litA/`, `…/agentC/litB/`), not in the repository.

**Warning communication and layout**

| # | What | URL |
|---|---|---|
| L1 | WMO-No. 1150 Part I (2015): impact × likelihood, "traffic-light" colours; people "demanding information about what to do" | https://etrp.wmo.int/mod/resource/view.php?id=10058 |
| L2 | WMO-No. 1150 Part II (2021): 5W messages; trigger then impacts and response; consistency of colour (§2.7); the hierarchical approach (§3.4) | https://www.anticipation-hub.org/Documents/Manuals_and_Guidelines/WMO_Guidelines_on_Multi-hazard__part2.pdf |
| L3 | Met Office: warnings guide (headline, what to expect, what should I do, further details; the matrix; a new harmonised matrix from Oct 2026); blog 2025 | https://weather.metoffice.gov.uk/guides/warnings · https://www.metoffice.gov.uk/blog/2025/how-are-weather-warnings-categorised |
| L4 | MeteoAlarm flyer (KNMI, 2012): green, yellow, orange, red meanings; black-and-white tints for colour-blind users | https://cdn.knmi.nl/knmi/pdf/bibliotheek/weerbrochures/meteoalarm_eu_flyer_en.pdf |
| L5 | MET Norway CAP profile: awareness level with colour, used by MeteoAlarm ("3; orange; Severe", "4; red; Extreme") | https://docs.api.met.no/doc/metalerts/CAP-v2-profile |
| L6 | NWS PNS 23-49 (17 Aug 2023): "Advisory" replaced by plain-language headlines; "What, Where, When, Impacts" | https://www.weather.gov/media/notification/pdf_2023_24/pns23-49_nws_alerting_system_plain_language.pdf |
| L7 | NWS Hazard Simplification fact sheet and product description | https://www.weather.gov/media/hazardsimplification/HazSimp2023-update-1.pdf · https://www.weather.gov/media/notification/PDDs/PDD_Haz_Simp.pdf |
| L8 | NWS Hazard Simplification user studies | https://www.weather.gov/hazardsimplification/user-engagement-studies |
| L9 | NWS Hazard Simplification key successes | https://www.weather.gov/hazardsimplification/key-successes |
| L10 | LeClerc & Joslyn 2015, *Risk Analysis* 35(3) 385–395 (via Europe PMC) | DOI 10.1111/risa.12336 |
| L11 | Simmons & Sutter 2009, *Weather, Climate, and Society* 1(1) 38–53 (abstract via Crossref) | – |
| L12 | Trainor et al. 2015, *Weather, Climate, and Society* 7(4) 333–352 (via Crossref) | – |
| L13 | WMO and WHO, *Heatwaves and Health: Guidance on Warning-System Development* (WMO-No. 1142, 2015), §4.4.3 | https://www.uncclearn.org/wp-content/uploads/library/who16102015.pdf |
| L14 | Weinberger et al. 2021, *Environment International* 157, 106834 (via Europe PMC) | – |
| L15 | Apple: Weather data sources (Thailand, TMD listed); severe weather alerts; WeatherKit attribution | https://support.apple.com/en-us/105038 · https://support.apple.com/en-us/102516 · https://developer.apple.com/weatherkit/data-source-attribution/ |
| L16 | Google SOS Alerts help (banners, authorities' updates, its own heat warnings "approximate"); Public Alerts for publishers | https://support.google.com/sosalerts/?hl=en · https://developers.google.com/public-alerts/guides/introduction?hl=en |
| L17 | Korea JoongAng Daily, 10 Aug 2026 (news): 4,189 disaster texts in July | https://www.koreajoongangdaily.com/korea/a-nonstop-flood-of-heat-wave-alerts-gets-some-residents-hot-under-the-collar/12813160 |
| L18 | Shneiderman 1996, "The eyes have it" (CS-TR-3665) | https://webspace.science.uu.nl/~telea001/uploads/VACourse/Shneiderman96.pdf |
| L19 | Nielsen 2006, "Progressive disclosure" | https://www.nngroup.com/articles/progressive-disclosure/ |
| L20 | Savelli & Joslyn 2013, *Applied Cognitive Psychology* 27(4) 527–541 (via Crossref) | – |
| L21 | Qin et al. 2024, *Journal of Experimental Psychology: Applied* (abstract) | – |
| L22 | Sutton, EENA 2025 slides: message contents (Sutton & Kuligowski 2019), the template, the Warning Lexicon, milling and confirmation | https://eena.org/wp-content/uploads/2025/08/SUTTON_EENA_2025-1.pdf |
| L23 | Wood et al. 2018, *Environment and Behavior* 50(5) 535–566 (abstract via Crossref): longer messages cut confirmation search | https://api.crossref.org/works/10.1177/0013916517709561 |
| L24 | GovTech, 24 Apr 2015, on the DHS/START study of Wireless Emergency Alerts: 90 characters "insufficient"; source first | https://www.govtech.com/em/disaster/Longer-Messages-Needed-Wireless-Emergency-Alerts.html |

**Agencies, colours and alert channels**

| # | What | URL |
|---|---|---|
| K1 | NWS HeatRisk: levels, who is affected, "Experimental"; colours ("official colors 4/7/23"); overview (West since 2014, contiguous US 2024); fact sheet (percentile, early season, overnight lows, day of year); Staudenmaier, CPASW 2024 slides (CDC thresholds, 95th percentile 1970–2020, acclimation) | https://www.wpc.ncep.noaa.gov/heatrisk/ · https://www.wpc.ncep.noaa.gov/heatrisk/css/style.css · https://www.wpc.ncep.noaa.gov/heatrisk/overview.html · https://www.weather.gov/media/aly/FactSheets/Whats-in-HeatRisk.pdf · https://weather.gov/media/climateservices/CPASW/2024/Tuesday/4-Tues-Session1-Staudenmaier.pdf |
| K2 | กรมอนามัย, news 43642 (3 May 2024): four heat levels and their colours; the 2024 hot season "ส่วนใหญ่อยู่ในระดับอันตรายมาก (สีแดง)" | https://anamai.moph.go.th/th/news-anamai/43642 |
| K3 | TMD news (7 Mar 2024): DOH and TMD, the same names and colours, "ระดับอันตราย (42.0 – 51.9 องศาเซลเซียส)" | https://tmd.go.th/activity/ (the item titled "กรมอนามัย-กรมอุตุนิยมวิทยา-เผยปีนี้ร้อนสูงกว่าปีที่แล้ว-นำ-heat-index-…"; the full URL was not recorded) |
| K4 | PCD notice on the Thai AQI (Royal Gazette, 3 Jul 2023), Tables 1–2; Air4Thai's own colours from its site code | https://ratchakitcha.soc.go.th/documents/140D157S0000000000300.pdf · https://air4thai.pcd.go.th/webV3/ |
| K5 | Matichon, 18 Sep 2020: TMD's heavy-rain risk map, red and yellow | https://www.matichon.co.th/local/news_2353328 |
| K6 | Trang provincial flood plan (Aug 2023), citing the national plan 2564–2570: DDPM's five warning colours (p. 19) and disaster sizes 1–4 (p. 32) | https://catalog.disaster.go.th/dataset/e11a5fcd-2350-41c8-b951-2e64f140c131/resource/39ae8bed-864f-49c7-983b-5ff9818db625/download/63_.pdf |
| K7 | Thai PBS, 9 May 2024: DDPM's levels and the public's action at each | https://www.thaipbs.or.th/news/content/339839 |
| K8 | Government PR (PRD Ratchaburi): Cell Broadcast's five types and languages (7 Jul 2024); tests, live use, the national test of 20 Jan 2026, phones, 600 characters, no links, the iPhone setting (19 Jan 2026) | https://ratchaburi.prd.go.th/th/content/category/detail/id/57/iid/304067 · https://ratchaburi.prd.go.th/th/content/category/detail/id/57/iid/467111 |
| K9 | LINE Thailand: LINE ALERT launched with DDPM and TMD (6 Oct 2022); PCD joins (21 Feb 2025); referenced 30 Oct 2025 | https://www.linecorp.com/th/pr/news/th/2022/4368 · https://www.linecorp.com/th/pr/news/th/2025/0221/ · https://today.line.me/th/v3/article/l2ngxzL |
| K10 | Hat Yai's Cell Broadcasts and their criticism: Thai PBS (24 Nov 2025), Naewna (22 Nov 2025), Thai Post opinion (28 Nov 2025) | https://www.thaipbs.or.th/news/content/358813 · https://www.naewna.com/politic/929695 · https://www.thaipost.net/x-cite-news/904527/ |
| K11 | WebKit, "Web Push for Web Apps on iOS and iPadOS" (16 Feb 2023) | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ |
| K12 | MDN browser-compat-data: `PushManager`, `Notification` (WebView support, iOS Home Screen notes) | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/PushManager.json · https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Notification.json |
| K13 | LINE Developers: LIFF browser vs an external browser | https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-external-browser/ |
| K14 | LINE Developers: URL scheme, `openExternalBrowser=1` | https://developers.line.biz/en/docs/line-login/using-line-url-scheme/ |
| K15 | LINE Notify: closing announcement; LINE Developers news (1 Apr 2025) | https://notify-bot.line.me/closing-announce · https://developers.line.biz/en/news/2025/04/01/line-notify/ |
| K16 | LINE for Business Thailand: Official Account plans and prices | https://lineforbusiness.com/th/service/line-oa-features/broadcast-message |
| K17 | LINE Developers: Messaging API pricing (what counts) | https://developers.line.biz/en/docs/messaging-api/pricing/ |
| K18 | LINE Developers: group chats | https://developers.line.biz/en/docs/messaging-api/group-chats/ |
| K19 | TMD's apps | https://www.tmd.go.th/service/applications |
| K20 | DDPM: "Thai Disaster Alert" (App Store); hotline 1784 | https://apps.apple.com/us/app/id1593150344 · https://dpmreporter.disaster.go.th/portal/contact-us/hotline |

Not reached by the assistants (blocked, not bypassed): WMO's e-Library and PreventionWeb (403), an official MeteoAlarm
definitions page, the Met Office's new October 2026 impact terms, the FCC's 360-character order (403), several full
papers (SAGE 403, PMC behind a reCAPTCHA, which was not solved; Europe PMC was used), Thairath (403), thailand.go.th
(a bot check), disaster.go.th (403), TMD's heat-index product page (a generic page), the WHO UV-index guide's colour
table (403).

**This repository and the sister apps**

- The UX scout ([ux-scout-2026-10-23.md](ux-scout-2026-10-23.md)): its A28 (NWS HeatRisk), A29 (Met Office), A32
  (Japan's tested level colours, Cabinet Office 29 May 2020), R5–R7 and R10 (colour vision in Thailand, **[unverified]**
  abstracts).
- The visitor audit ([visitor-audit-2026-10-24.md](visitor-audit-2026-10-24.md)), the model check
  ([model-check-2026-10-24.md](model-check-2026-10-24.md)), the Hat Yai hindcast
  ([hatyai-flood-2025-hindcast.md](hatyai-flood-2025-hindcast.md)).
- บ้านรอดไหม (`bejranonda/Hazard-huntz`, cloned 24 Oct 2026): `docs/01-safety-content.md` `[doh-heatlevels-2569]`
  (Daily News, 7 Apr 2026, https://www.dailynews.co.th/news/5756174/, and THE STANDARD, 3 May 2024, as read there on
  20 Oct 2026), `[doh-heatsigns-2569]` (https://thestandard.co/doh-warns-heat-index-heatstroke/); `docs/KNOWLEDGE.md`
  (PCD's five colours); `public/hot.html`, `public/air.html`.
- FloodWatch (read-only clone): `web/style.css`, `web/app.js` `STATUS`, `web/impact.css`, `edge/README.md`,
  `docs/GUIDELINES.md` (D-036, D-062), `docs/OWNER_ACTIONS.md` (Q7: "Alerts by LINE or Web Push? … No alerts").

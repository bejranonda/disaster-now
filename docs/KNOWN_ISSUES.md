# Known issues and limits

Issues are numbered KI-NNN. The next number is the first one not used below. Move a fixed issue to "Fixed", with its evidence.

Severity:
- **high:** could mislead someone about a hazard.
- **medium:** a gap or a wrong detail.
- **low:** polish.

The audits of 23 Oct 2026 use their own IDs: M1–M5 and H1–H4 from the [output cross-check](research/output-crosscheck-2026-10-23.md), V1–V41 from the [visitor audit](research/visitor-audit-2026-10-23.md). An issue below names the findings it carries.

## Open

### KI-001 Not deployed, not tried on real phones (high)
Checked only in headless Chromium (23 Oct 2026).
- GPS inside LINE's in-app browser is undocumented by LINE.
- iPhone Safari is untested.
- In 0.3.0 the Docker stack ran on FloodWatch's server (healthy, 5 of 5 collector files, GLM English for the live
  warning), and the Cloudflare Worker ran under `wrangler dev` with the real files. Neither is public: the Worker
  isn't deployed, because the old token couldn't write Workers KV ([CLOUDFLARE.md §4](CLOUDFLARE.md#4-what-the-owner-does)).
- **Since 24 Oct 2026, nothing of this app runs anywhere.** FloodWatch's server was the wrong one, and it was cleaned
  up. The stack waits for the risk server and the new tokens (KI-032).

**Next:** [OWNER_ACTIONS A12, A9, A10, A4](OWNER_ACTIONS.md#a-to-go-live).

### KI-002 Air4Thai's server sends a broken certificate chain, and answered 503 (high)
- **The chain:** Let's Encrypt's YR1 intermediate is missing (Hazard-huntz docs/09 §3). curl, Node and Python refuse it.
- **The collector** adds the two public intermediates for that host only (`tools/certs/`), with verification on. The PCD's server then answered **HTTP 503** at every run from this cloud host (20:16, 20:21, 20:25 and 21:12 UTC).
- **Browsers:** headless Chromium read the CORS mirror `air4thai.com` on 23 Oct in the builder's walks and the live walk at 21:1x UTC, but refused the same mirror's chain in the visitor audit (V27: `ERR_CERT_AUTHORITY_INVALID`). Phones that don't fetch missing intermediates, possibly LINE's Android WebView **[unverified]**, will fall back to GISTDA's estimate in every province (KI-009).
- Since 0.2.0 the card says "ดึงข้อมูลสถานีวัดของ คพ. ไม่ได้ตอนนี้" instead of "no station here" (M1).

- **Since 0.3.0:** from FloodWatch's server (Germany), the collector read **173 stations** at 21:43 and 22:04 UTC on
  23 Oct. That meets A6's "170 or more", so the 503s belonged to the build session's cloud host. With the collector
  running, the page reads Air4Thai from `data/live/` and doesn't depend on the browser accepting the chain.
- That result is that host's. The collector moves to the risk server, so A6 is open again until it is measured there.

**Next:** run the collector on the risk server (A12, A6). **The chain's fix belongs to the PCD** (OWNER_ACTIONS C5).

### KI-003 Without the collector, four feeds are missing (medium)
TMD's warnings, TMD's quake list, TMD's storm tracks and NASA FIRMS hotspots need the collector. Since 0.2.0, the page without it:
- shows "ตรวจประกาศเตือนภัยของกรมอุตุฯ ไม่ได้ตอนนี้ ดูที่ tmd.go.th หรือ LINE ALERT";
- lists "ประกาศเตือนภัย" among the missing (V4);
- says on the fire tile that there is no data.

**Next:** OWNER_ACTIONS A3, [SERVER.md](SERVER.md).

### KI-004 The heat-index bands rest on news reports quoting the agencies (medium)
- **The bands:** 27.0 / 33.0 / 42.0 / 52.0 °C agree across BMA, DOH and TMD reports (thresholds §1.1), but only the 42.0–51.9 band was seen on an agency page.
- **The formula:** which one TMD's own product uses is **[unverified]**. Its agromet page names Steadman 1979 and shows older bands, 27/32/41/54.
- The app uses the NWS method (Steadman, then Rothfusz). TMD's own example (33 °C, 80 %) gives 48.1 °C by it, against TMD's 49 °C.

### KI-005 Heat reads "อันตราย" on most afternoons once corrected (high; owner decision D1)
- **Why it reads so high:** the raw ensemble read about 5 °C low against TMD's stations, so 0.2.0 shows only corrected values ([MODELS §1](MODELS.md#1-heat-index)).
- **What that means:** Bangkok's October afternoons now read 42–44 °C, "อันตราย". Observed Bangkok October days reach 42 °C or more on 48 % of days, and April days on 95 % (station data, `research/out/e1e2_results.json`).
- **What 0.2.0 does:** a forecast alone stops at เตรียมตัว (`MODEL_MAX`, V1). The tile says "บ่ายนี้" (V6), and the pre-warnings list "ร้อนระดับอันตราย" on such days.
- **The risk:** the verdict is orange on most days at most places, which may teach people to ignore orange.

**Next:** the owner's D1, and count the orange-verdict days in the first month.

### KI-006 The subdistrict is the nearest centre, not the one containing the point (medium)
- Near a district or province border, the nearest of 7,425 centres can be the neighbour's, and a TMD warning is matched by province.
- The output cross-check saw it once: Chiang Mai, ต.พระสิงห์ against GISTDA's ศรีภูมิ.
- The page offers "ไม่ใช่ตำบลนี้?".

**Next:** measure against the boundary file (ROADMAP v0.5, item 8).

### KI-007 In Bangkok the flood tile sees few canal gauges (medium)
ThaiWater gives 8 gauges for Bangkok. FloodWatch's point check counted 33 near the old town, most of them BMA canals behind BMA's own servers. The app mirrors FloodWatch's rule but with less data, so its confidence is often "ต่ำมาก".

**Fix:** FloodWatch CORS on `/api/point` (OWNER_ACTIONS B1), then `"floodwatchPoint": true`.

### KI-008 FloodWatch's river rule reads deep rivers as near the bank, in one self-contradicting line (medium; V17)
- C.12 (Chao Phraya, Samsen) was "ใกล้ล้นตลิ่ง" at 92 % of bed-to-bank with **1.31 m** of freeboard (24 Oct 02:00).
- The card's line "ต่ำกว่าตลิ่ง 131 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้)" reassures, alarms and dismisses itself at once.
- The app copies FloodWatch's rule for consistency.

**Fix in both apps together** (INTEGRATION §3.4). Meanwhile: drop the status word when freeboard is 1 m or more, and name the tile's gauge.

### KI-009 GISTDA's PM2.5 estimate ran 1.3× the PCD's stations (medium)
- On 24 Oct 02:00 it was a median 1.31× across 60 provinces (KNOWLEDGE §5); one snapshot.
- It is used only where no PCD station reported within 15 km and 3 h, labelled "ค่าประมาณ". Since 0.2.0 a late station's last reading is shown beside it (V9).
- It can still raise the verdict to orange alone. Should it? That is the owner's call (D5).

### KI-010 Felt intensity: only Bangkok has a site term (medium)
- 0.2.0 adds +1.06 MMI in greater Bangkok (MODELS §5).
- Other soft basins have no term (Chiang Mai, the lower Chao Phraya beyond the four provinces).
- Tall buildings can feel more anywhere. The card says so.

### KI-011 Open-Meteo's free limit is per IP (medium)
- **The limit:** 10,000 calls a day per IP, for non-commercial use. Each visit makes about three: ensemble, air quality, elevation. Whether the ensemble's 51 members raise its weight is **[unverified]**.
- **The risk:** Thai mobile carriers put many phones behind one address (carrier-grade NAT) **[unverified for Thailand]**. A page shared widely in a disaster could hit the limit for a whole carrier.

**Fix:** district files from the server ([SERVER §6.2](SERVER.md#6-what-to-build-on-the-server-next)).

### KI-012 Street search depends on third-party goodwill and misses local names (medium; V19)
- **Terms:** Photon is "fair use, throttled when heavy". Nominatim allows 1 request a second for the whole app. Both see what was typed: the button and About name Photon (komoot) since 0.2.0 (V11).
- **Misses:** "ม.เชียงใหม่" never found Chiang Mai University, and "นิมมาน" found a Bangkok building.
- **Bias:** Photon is biased to Bangkok's centre.

**Fix:**
- Bias Photon by the last place.
- Expand "ม." before a name.
- Add a short landmark list.
- Use FloodWatch's `/api/geocode` with CORS (OWNER_ACTIONS B2).

### KI-013 Storm data are undocumented site files (low)
- JMA's `bosai` JSON and TMD's `/api/Weather/StormTrack` are the sites' own data, not documented APIs, and may change without notice.
- JMA doesn't cover the Andaman Sea or the Bay of Bengal; JTWC does (ROADMAP v0.5, item 3).
- Storm lines show only within 1,500 km (V15).

### KI-014 The DMR's layers state no licence (low)
`copyrightText` is empty on the landslide-village and active-fault layers the page queries live (OWNER_ACTIONS C1).

### KI-015 HII's API is "not formally public" (low)
Each visit asks ThaiWater for its province's rain and levels, 13–14 KB gzip each. At scale the server should publish province files instead (SERVER §6.4).

### KI-016 A first visit is about 450–470 KB in about 40 requests (low; V22)
- **The big items:** the subdistrict table is 158 KB gzipped. GDACS sends 134 KB uncompressed for one line.
- **Measured:** at 400 kbit/s the first level word took about 16 s.
- **Since 0.2.0:** the point's own requests start before the table arrives.

**Next:**
- A GDACS digest from the collector (SERVER §6.3).
- A 3-decimal, Thai-only table (about 92 KB, UX scout §4c).

### KI-017 UV is CAMS's, daylight is a fixed 06–18 (low)
- The tile grades the UV index now, from CAMS via Open-Meteo, and stops at เตรียมตัว (a model value).
- TMD publishes its own clear-sky UV forecast for 77 stations (ROADMAP v0.5, item 4).
- Whether CAMS's `uv_index` includes clouds is **[unverified]**.

### KI-018 TMD's Beaufort words are for the 10-minute mean (low)
- They now appear only in the card, as "กรมอุตุฯ เรียกลมระดับนี้ว่า …".
- The tile uses plain gust words (V16).
- Gusts are not validated (MODELS §4).

### KI-019 Only heat and PM2.5 have a sourced one-line action (low)
The verdict's 👉 line comes from บ้านรอดไหม's lines for those two; other hazards link to its guides.

### KI-020 The visitor walk runs on fixtures of one night (medium)
- `npm run smoke` pins the clock to 23 Oct 2026 19:50 UTC: a dry, calm night.
- `test/audit.test.mjs` covers a warning, a stale station, failed sources and a big quake. Even so, the walk has no rainy, smoky or quake fixtures.
- `--live` checks today's sources but not a bad day.
- The visitor audit's states (`dust3`, `wet`, `warning`, `stale`) are in its scratch scripts (not committed).

### KI-021 The Thai copy hasn't been read by a native reviewer (medium; V33)
- Jargon remains: "แบบจำลอง 51 ชุด", "ความมั่นใจต่ำมาก", "FFPI", "สนข.", "(ข่าวอ้างหน่วยงาน)".
- The new 0.2.0 lines are unreviewed too: the quake words from the validation, "บ่ายนี้", "โอกาสฝนหนัก ต่ำ".

**Next:** OWNER_ACTIONS A5.

### KI-024 English and codes in Thai mode, Thai in English mode (medium; V12, V14, V38)
- **English in Thai mode:** EMSC and USGS region names ("MYANMAR-CHINA BORDER REGION", "191 km ENE of Nagqu, China"), storm names, "µg/m³" (the UX scout asks for "มคก./ลบ.ม.").
- **Thai in English mode:** station names. TMD's warning text has had GLM's checked English since 0.3.0 when the
  collector runs with `AI_ENABLED=1` ([AI.md §2.1](AI.md#21-english-for-tmds-warnings-collector-toolstranslatemjs)); without it, the text is labelled "(in Thai)".
- **Fixed in 0.2.0:** fetch errors are now Thai words.

**Fix:** map regions to Thai country names, as TMD's rows have them.

### KI-025 The 3-day table's cells are colour only (medium; V13)
- **Fixed in 0.3.0:** it sits above the cards (Phuket at 390 px: from 6,574 to 2,267 px down). Its rain row is named
  "โอกาสฝนหนัก", and the note no longer calls the cell the day's total. A day under a TMD warning reads "📢 เตือนภัย".
- **Open:** heat, PM2.5, UV and gust cells have no meter and no word; "วันนี้" means the rest of today.

**Fix:**
- Add dots and band words.
- Name the first column by the time of day ("คืนนี้" after 15:00).
- Put the quake footnote under it.

### KI-027 Polish from the visitor audit (low; V18, V28, V29, V31, V32, V34, V35, V37–V40)
- **V18:** "other pollution" with model values reads as no data.
- **V28:** tap targets under 44 px wide: ↻, and the hotline links 1182, 1784, 1669, 199.
- **V29:** sizes are px from an 18 px root, so the phone's text setting is ignored. Meters and tags are under 14 px.
- **V31, V32:** line breaks split a number from its unit and "ไม่" from its word, and the search placeholder is cut off.
- **V34:** two or three names per hazard and four words for "no data".
- **V35:** saved places open the last saved, show no level and have no undo.
- **V37:** a tile tap changes the URL's hash, and the dust card has no lines for people at risk (บ้านรอดไหม has them).
- **V38:** "hotspot(s)"-style plurals are fixed; names in capitals remain.
- **V39:** the welcome screen is empty; it could show the in-force TMD notices.
- **V40:** there is no automatic retry after a timeout.
- **0.3.0 visitor walk:** at 320 px with ก+ the brand wraps ("ภัยรอบบ้าน ตอน/นี้") in the header; gust, PM2.5 and
  dust-word cells in the 3-day table break inside a word ("ดี/มาก"). Fixed in 0.3.0: a number and its unit no longer
  wrap apart (°C, µg/m³ joined by a no-break space), and the chips' "Heat:Warning" has its space back.

### KI-029 ThaiWater rate-limited FloodWatch's server after this app's tests (medium)
- On 23 Oct 2026 (22:06 UTC) ThaiWater answered **HTTP 429** to FloodWatch's server, after this app's live walks and
  cross-checks there. FloodWatch's collector reads ThaiWater from the same IP every 10 minutes.
- The page in a visitor's browser calls ThaiWater from the phone's own address, so production is unaffected unless a
  carrier puts many phones behind one address (as KI-011).
- **Since 24 Oct 2026** the stack moves to a server of its own (D-040), so its tests no longer spend FloodWatch's quota.
  The limit itself stays: the risk server's IP can be limited too.

**Next:**
- On the risk server, one live walk and one cross-check per change, not loops (GUIDELINES §8).
- Have FloodWatch publish the ThaiWater snapshot it already fetches, and let this app read it (INTEGRATION §3.5).
  One fetch for the family is kinder to HII.

### KI-030 A rain cell can be yellow while its word says "ต่ำ" (low)
- The rain tile and the 3-day table take their **level** from the likely amount (GUIDELINES rule 6: "watch" when
  moderate rain is likely), but their **word** from the chance of heavy rain. Phuket's table on 24 Oct showed a
  yellow "ต่ำ" for tomorrow.
- Both are true, but a visitor reads a contradiction. It's the owner's D2 (the app's own rain grouping).

**Fix:** either grade the cell by the heavy-rain chance word (low → ยังไม่น่าห่วง), or add the amount word
("ฝนปานกลาง") beside it. Decide with D2.

### KI-031 The warning translation's check sees numbers, regions and tone, not every meaning (medium)
- `tools/translate.mjs` rejects dropped or added numbers, Thai left over, added reassurance, a wrong TMD region word
  and odd lengths. It can't see a changed verb or a dropped clause that has no number.
- On 23 Oct: 6 of 6 accepted after the region rule; before it, 1 of 3 said "lower South" for ภาคใต้ตอนกลาง.

**Mitigation in place:** the label ("Machine translation … The Thai notice is the official one"), the Thai original
one tap away, the level and times set by rules only. **Next:** a bilingual reader checks the first ten live
translations (OWNER_ACTIONS A5), and a phrase table for TMD's fixed instructions.

### KI-032 No server of its own yet; the go-live waits for it and for new tokens (medium)
- 0.3.0's stack was set up on FloodWatch's production server by mistake (23 Oct 2026). The owner is moving it to a
  dedicated server for risk and replacing the Cloudflare token, which came from FloodWatch's `.env` (24 Oct).
- **Done before leaving FloodWatch's server:**
  - everything was pushed to `main` and the work branch;
  - this app's Docker volume and images were removed (SERVER §2.4);
  - **not done:** the checkout with both `.env` files, blocked by Claude Code's safety check on deleting the
    agent's working directory: the owner's `rm -rf /root/disaster-now` (A11);
  - FloodWatch's containers, `.env` and tunnel were left untouched.
- **Unknown until the risk server exists:** its Node version, its Chromium path, and whether Air4Thai (A6) and
  ThaiWater answer it.
- **The guard:** `npm run preflight` fails on a host that runs FloodWatch's containers, and warns on any other app's
  containers or a `.env` with names this project doesn't read. Tests: `test/cloud.test.mjs` "preflight".

**Next:** [OWNER_ACTIONS A11, A12, A9, A10](OWNER_ACTIONS.md#a-to-go-live), runbook [SERVER.md §2](SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server).

## Fixed

### KI-F23 The verdict was below the fold on small phones (0.3.0; was KI-022, V5)
With a place open, the finder folds to one "🔎 ดูที่อื่น" row and the four buttons sit under the verdict. At 360 × 640
with a LINE user agent the verdict ends at **504 px** (was 642). Smoke check "verdict ends at … on a 360 × 640 LINE screen".

### KI-F24 An interim verdict about another hazard while sources arrived (0.3.0; was KI-026, V21)
No level until the ensemble, air quality and the collector's files have answered (or failed), or 5 s have passed;
meanwhile "กำลังดึงข้อมูล (n จาก 10 เรื่อง)". Live, Phuket: "Loading (5 of 10)" at 0.6 s, the warning's verdict at 0.9 s
(before: a heat headline first). Smoke check "no level while warnings are unanswered".

### KI-F25 TMD's warning and the model's "low chance" in one line (0.3.0; KI-028)
- **The defect:** Phuket under a Severe heavy-rain warning showed "🌧️ Rain: TMD warning · Heavy rain: low chance".
  The 3-day table showed "ต่ำ" for the same day. The ensemble said "low" in all 11 warned provinces
  ([research/crosscheck-live-2026-10-23.md](research/crosscheck-live-2026-10-23.md)).
- **The fix:** a lifted tile shows the notice's end ("until 08:00 today"), the card says the model's numbers are
  milder than the notice and to follow TMD, and table cells under a warning read "📢 เตือนภัย".
- Tests: "M5/V2", smoke "verdict leads with the warning".

### KI-F26 The 3-day table's rain row said "mm" and doubled its word (0.3.0)
Since 0.2.0 the cells held chance words, but the row still said "ฝน มม." and the note "ฝนคือรวมทั้งวัน". Each cell
also printed "ฝนหนัก" twice ("low heavy heavy" in English). The row is now "โอกาสฝนหนัก" with one word per cell.


### KI-F01 Gauge statuses disagreed with FloodWatch on 15 gauges (23 Oct 2026)
ThaiWater's `ground_level: 0` was read as a river bed at 0 m MSL. It is now treated as missing, as FloodWatch does: 691 of 693 agree (`research/logs/crosscheck-floodwatch-2026-10-23.log`).

### KI-F02 The verdict called a mostly empty page calm (23 Oct 2026)
With every source down but the local hotspot file, it said "ทุกเรื่องอยู่ในระดับต่ำสุด". Now fewer than half the tiles answering gives "ยังไม่มีข้อมูลพอ" (smoke test "all sources down").

### KI-F03 The GPS headline said "ตำแหน่งของฉัน" instead of the place (23 Oct 2026)
The subdistrict is now the headline.

### KI-F04 The finder overflowed at 320 px with larger text (23 Oct 2026)
The grid column now shrinks (`minmax(0, 1fr)`); the smoke test checks 320 px with ก+.

### KI-F05 The raw heat index read about 5 °C low (0.2.0)
Only corrected and dressed values are shown (`calibration.js`). On held-out stations the MAE fell from 4.7–5.1 °C to 2.4 °C, and the 10–90 % range held 82 % (MODELS §1). Unit tests cover the correction.

### KI-F06 The planned PM2.5 correction was worse than persistence (0.2.0)
The damped ratio replaced it. Day-1 MAE was 6.55 vs persistence 7.31 and the planned ratio 8.76 (disjoint stations, Mar–Apr 2026; MODELS §2).

### KI-F07 A forecast alone could say "ทำทันที" (0.2.0; V1)
Heat, rain, gust and UV forecasts now stop at เตรียมตัว (`assess.MODEL_MAX`). "ทำทันที" needs a measurement or an agency warning (`test/audit.test.mjs` "V1").

### KI-F08 A TMD warning didn't lift its tile (0.2.0; M5, V2)
- A CAP warning now lifts its hazard's tile: rain/flood → rain, storm/wind → wind, heat → heat (`events.capHazard`).
- Its first line quotes TMD, and the warning ranks above model-only tiles of the same level in the verdict.
- The pre-warnings list it and never say "nothing unusual" beside it.
- The box shows TMD's instruction, the issue and end times in the page's format, and a link to the notice.

### KI-F09 Offline after one visit was a dead page (0.2.0; V3)
`sw.js` missed `js/actions.js` (and `calibration.js`). The shell now lists every module and `config.json`, and a unit test walks the import graph and checks every `?v=`.

### KI-F10 Missing data showed as calm on rain, wind and flood (0.2.0; V4, M4)
- No forecast → rain and wind have no level. A dry gauge yesterday or a far storm no longer counts as calm.
- No gauge within 8 km, or ThaiWater down → flood has no level. HII's list alone adds a line only.
- Unchecked warnings are listed as missing.

### KI-F11 Air4Thai failing was worded as "no station here" (0.2.0; M1, M2, V9)
- A failed read says so.
- A late station is named with its last value and age.
- "Other pollution" says why it uses CAMS.

### KI-F12 The mask line went out without the under-2 line (0.2.0; H1)
บ้านรอดไหม's line "เด็กต่ำกว่า 2 ขวบ ไม่ควรใส่หน้ากากทุกชนิด…" follows every mask line, in the verdict and on the card.

### KI-F13 Words that differed from บ้านรอดไหม and from the page itself (0.2.0; H2, H3, H4)
- English heat words are now Watch / Warning / Danger / Extreme danger.
- The PCD's wording is the same everywhere.
- The rain card links to the flood guide ("ฝนหนัก น้ำท่วม ทำอย่างไร"), not the storm guide.

### KI-F14 The exact GPS fix showed on screen and went into the FloodWatch link (0.2.0; V10)
A GPS place shows no coordinates, and other places show 2 decimals. The FloodWatch link carries the rounded point (unit test "V10/V15").

### KI-F15 UV named tomorrow's peak before dawn (0.2.0; M3, V7)
Before 16:00 the tile names today's peak, as the card does.

### KI-F16 Far storms and stray words (0.2.0; V15, V16, V24, V25, V26, V30, V36, V41)
- Storm lines show only within 1,500 km.
- Gust tile words are plain.
- Hotspots are counted over the last 24 h and timed by the latest pass.
- The model source shows no misleading clock.
- The heat number is floored, so it never reads past its band.
- About describes what the page does.
- A refused location moves focus to search.
- The flash-flood line no longer says "คืนนี้" or a bare "0 ตำบล".

### KI-F17 Rain forecast as an amount and a yes/no (0.2.0)
The validation found almost no skill at a point (MODELS §3). The tile shows "โอกาสฝนหนัก ต่ำ / มีโอกาส / สูง" at the validated cut points, and the card adds "ฝนหนักเกิดได้แม้วันที่คาดว่าโอกาสต่ำ".

### KI-F18 Likely heavy rain was hidden by possible very heavy rain (0.2.0; V8)
The pre-warnings list both lines when heavy rain is the likelier one.

### KI-F19 Quake words implied "not felt" and damage (0.2.0)
The validated words are used ("อาจรู้สึกได้", "รู้สึกได้ชัด", never "ไม่รู้สึก", never damage), at 2.5 / 4.5 with the Bangkok term (MODELS §5).

### KI-F20 Sharing said "ตอนนี้" with no date, and a subdistrict found by name shared a long #p= link (0.2.0; V20)
The text now carries the date and time, the level and the worst hazard. A subdistrict hit shares `#t=`.

### KI-F21 FIRMS failing wrote "0 hotspots" (0.2.0)
Found in the Docker test. When no FIRMS file is read, the collector now fails that file (the old one stays) instead of writing an empty list the page would show as "ไม่พบ".

### KI-023 The Bangkok shaking term was used beyond the distances it was fitted on (0.2.0)
The live walk of 24 Oct 2026 applied +1.06 MMI to an M7.0 in Tibet 2,181 km away. The term now applies only within 1,600 km, the reach of the reports behind it (`quake.SITE_MAX_KM`, unit test). Number kept so references stay valid.

### KI-F22 The age badge was unreadable in dark mode (0.2.0; V23)
It had 1.4:1 contrast. It now uses dark-mode colours.

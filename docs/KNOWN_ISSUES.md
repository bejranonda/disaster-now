# Known issues and limits

Issues are numbered KI-NNN. The next number is the first one not used below. Move a fixed issue to "Fixed", with its evidence.

Severity:
- **high:** could mislead someone about a hazard.
- **medium:** a gap or a wrong detail.
- **low:** polish.

The audits of 23 Oct 2026 use their own IDs: M1–M5 and H1–H4 from the [output cross-check](research/output-crosscheck-2026-10-23.md), V1–V41 from the [visitor audit](research/visitor-audit-2026-10-23.md). Those of 24 Oct 2026: S1–S11 from the session's [review](research/review-2026-10-24.md), U1–U25 from the [visitor audit](research/visitor-audit-2026-10-24.md), X1–X19 from the [output cross-check](research/output-crosscheck-2026-10-24.md). An issue below names the findings it carries.

## Open

### KI-001 Not tried on real phones (high; was "not deployed" until 24 Oct 2026)
- **Deployed on 24 Oct 2026, 20:13 UTC:** https://risk.autobahn.bot (Worker version `9b913164`, 0.5.0), once the owner's
  token gained *Workers Scripts: Edit*; the live files reach the edge since 21:12 UTC (the KV token). 0.7.0 since 25 Oct.

Checked only in headless Chromium (23 Oct 2026).
- GPS inside LINE's in-app browser is undocumented by LINE.
- iPhone Safari is untested.
- In 0.3.0 the Docker stack ran on FloodWatch's server (healthy, 5 of 5 collector files, GLM English for the live
  warning), and the Cloudflare Worker ran under `wrangler dev` with the real files. Neither is public: the Worker
  isn't deployed, because the old token couldn't write Workers KV ([CLOUDFLARE.md §4](CLOUDFLARE.md#4-what-the-owner-does)).
- **Since 24 Oct 2026, nothing of this app runs anywhere.** FloodWatch's server was the wrong one, and it was cleaned
  up. The stack waits for the risk server and the new tokens (KI-032).

**Next:** [OWNER_ACTIONS A4](OWNER_ACTIONS.md#a-to-go-live) (real phones), and A9's KV token.

### KI-002 Air4Thai's server sends a broken certificate chain, and answered 503 (high)
- **The chain:** Let's Encrypt's YR1 intermediate is missing (Hazard-huntz docs/09 §3). curl, Node and Python refuse it.
- **The collector** adds the two public intermediates for that host only (`tools/certs/`), with verification on. The PCD's server then answered **HTTP 503** at every run from this cloud host (20:16, 20:21, 20:25 and 21:12 UTC).
- **Browsers:** headless Chromium read the CORS mirror `air4thai.com` on 23 Oct in the builder's walks and the live walk at 21:1x UTC, but refused the same mirror's chain in the visitor audit (V27: `ERR_CERT_AUTHORITY_INVALID`). Phones that don't fetch missing intermediates, possibly LINE's Android WebView **[unverified]**, will fall back to GISTDA's estimate in every province (KI-009).
- Since 0.2.0 the card says "ดึงข้อมูลสถานีวัดของ คพ. ไม่ได้ตอนนี้" instead of "no station here" (M1).

- **Since 0.3.0:** from FloodWatch's server (Germany), the collector read **173 stations** at 21:43 and 22:04 UTC on
  23 Oct. That meets A6's "170 or more", so the 503s belonged to the build session's cloud host. With the collector
  running, the page reads Air4Thai from `data/live/` and doesn't depend on the browser accepting the chain.
- That result is that host's. **From `autobahn-bot` (24 Oct 2026, 07:50 UTC) the collector read 173 stations too**: A6
  is met, and the page reads Air4Thai from the collector's files wherever they are served.

**Next:** **the chain's fix belongs to the PCD** (OWNER_ACTIONS C5). Browsers that refuse the chain matter only where the
page has no collector files (KI-036).

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

### KI-006 The subdistrict is the nearest centre, not the one containing the point (medium)
- Near a district or province border, the nearest of 7,425 centres can be the neighbour's, and a TMD warning is matched by province.
- The output cross-check saw it once: Chiang Mai, ต.พระสิงห์ against GISTDA's ศรีภูมิ.
- The page offers "ไม่ใช่ตำบลนี้?".

**Next:** measure against the boundary file (ROADMAP v0.5, item 8).

### KI-007 In Bangkok the flood tile sees few canal gauges, unless the collector's FloodWatch file is fresh (medium → low)
ThaiWater gives 8 gauges for Bangkok. FloodWatch's point check counted 33 near the old town, most of them BMA canals behind BMA's own servers. The app mirrors FloodWatch's rule but with less data, so its confidence is often "ต่ำมาก".

- **Since 0.6.0** the collector publishes FloodWatch's own rows (`floodwatch.json`, BMA's 201 gauges among 1,374), and
  the tile reads them while the file is under 2 h old: on 24 Oct 20:26 UTC the old town had 141 fresh gauges within
  20 km and confidence **medium** ([floodwatch-integration §3](research/floodwatch-integration-2026-10-24.md#3-what-the-page-does-with-it)).
- Without a fresh file (FloodWatch down, or no KV token on the edge, KI-036) the tile falls back to ThaiWater's 8.

**Next:** nothing in this app; the KV token (A9) makes the edge serve the file. CORS on `/api/point` (B1) is no
longer needed.

### KI-008 FloodWatch's river rule reads deep rivers as near the bank, in one self-contradicting line (medium; V17)
- C.12 (Chao Phraya, Samsen) was "ใกล้ล้นตลิ่ง" at 92 % of bed-to-bank with **1.31 m** of freeboard (24 Oct 02:00).
- The card's line "ต่ำกว่าตลิ่ง 131 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้)" reassures, alarms and dismisses itself at once.
- The app copies FloodWatch's rule for consistency.

**Fix in both apps together** (INTEGRATION §3.4).
**Since 0.4.0 (the interim, S10):** the tile's gauge comes first and says "ตัวเลขบนป้ายน้ำท่วม"; a river that doesn't judge
the point (Bangkok and its neighbours) loses its status word with 1 m or more to spare (test "KI-008/V17"). Where a
river does judge the point, FloodWatch's word stays, because the tile's colour comes from it: that part waits for B3.

### KI-009 GISTDA's PM2.5 estimate ran 1.3× the PCD's stations (medium)
- On 24 Oct 02:00 it was a median 1.31× across 60 provinces (KNOWLEDGE §5); at 08:00 UTC the output cross-check
  measured 1.39× (KNOWLEDGE §13). Two snapshots, the same direction.
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
- Since 0.4.0 the walk also opens an 18:30 page on the same fixtures (the clock blind spot behind KI-F28), but it is
  still one day's data.
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


### KI-027 Polish from the visitor audit (low; V18, V28, V29, V31, V32, V34, V35, V37–V40)
- **V18:** "other pollution" with model values reads as no data.
- ~~**V28:** tap targets under 44 px wide: ↻, and the hotline links 1182, 1784, 1669, 199.~~ Fixed in 0.4.0 (S9; the walk
  now measures width too).
- **V29:** sizes are px from an 18 px root, so the phone's text setting is ignored. Meters and tags are under 14 px.
- **V31, V32:** line breaks split a number from its unit and "ไม่" from its word, and the search placeholder is cut off.
- **V34:** two or three names per hazard and four words for "no data".
- **V35:** saved places open the last saved, show no level and have no undo.
- **V37:** a tile tap changes the URL's hash, and the dust card has no lines for people at risk (บ้านรอดไหม has them).
- **V38:** "hotspot(s)"-style plurals are fixed; names in capitals remain.
- **V39:** the welcome screen is empty; it could show the in-force TMD notices.
- **V40:** there is no automatic retry after a timeout.
- **0.3.0 visitor walk:** ~~at 320 px with ก+ the brand wraps ("ภัยรอบบ้าน ตอน/นี้") in the header~~ (fixed by the
  rename, 0.4.0); gust, PM2.5 and
  dust-word cells in the 3-day table break inside a word ("ดี/มาก"). Fixed in 0.3.0: a number and its unit no longer
  wrap apart (°C, µg/m³ joined by a no-break space), and the chips' "Heat:Warning" has its space back.

### KI-029 ThaiWater rate-limited FloodWatch's server after this app's tests (medium)
- On 23 Oct 2026 (22:06 UTC) ThaiWater answered **HTTP 429** to FloodWatch's server, after this app's live walks and
  cross-checks there. FloodWatch's collector reads ThaiWater from the same IP every 10 minutes.
- The page in a visitor's browser calls ThaiWater from the phone's own address, so production is unaffected unless a
  carrier puts many phones behind one address (as KI-011).
- **Since 24 Oct 2026** the stack moves to a server of its own (D-040), so its tests no longer spend FloodWatch's quota.
  The limit itself stays: the risk server's IP can be limited too.

- **From `autobahn-bot` (24 Oct 2026)** every ThaiWater call of the session's walks and two audits answered (no 429).

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


### KI-034 The family's colours differ for the same word (low; X17, D9)
FloodWatch's watch and critical colours and บ้านรอดไหม's heat and dust colours differ from this page's (INTEGRATION §5,
corrected on 24 Oct: it had said they matched). Since 0.6.0 this page's heat follows the DOH's colours, as บ้านรอดไหม's
`/hot` does (D-053). The UX study's check: FloodWatch's watch `#B58900` and warning `#E46C0A` are indistinguishable to
deuteranopes (ΔE00 1.8) with white badge text at 3.2–3.3 : 1; this page's four keep every adjacent pair ≥ 20
([ux study §4](research/ux-d8-d1-d9-incidents-2026-10-24.md#4-d9-one-palette-for-the-three-apps)).
**Next:** the owner's D9 (recommended: this page's four colours in all three apps, the agency's word on each).

### KI-035 HII's flash-flood report is shown without its time (low; X16)
The card says "รายงานล่าสุดของ สสน." with no time (the file's `Last-Modified` was 14:43 Bangkok on 24 Oct). A browser
can't read that header from another origin unless HII exposes it. **Next:** the collector reads it and publishes the
report with its time (SERVER §6.3).

### KI-036 The deploy token is broader than this app (medium; A9)
- The deploy token in `.env` covers *All zones across all accounts* with Zone Settings, Page Rules, Firewall and DNS:
  Edit, plus Workers AI, Pages and R2. A leak would reach every zone the owner has, on a host that runs another app.
- **24 Oct 2026, 20:12 UTC:** it gained *Workers Scripts: Edit* and *Workers Routes: Edit*; `cf:deploy` works.
- **24 Oct 2026, 21:12 UTC: the collector's KV-only token is set** (checked read-only: KV read and write; no zones, no
  scripts; DNS and deploys refused). The edge serves the live files; `health --web https://risk.autobahn.bot/
  --need-live` exits 0.

**Next:** OWNER_ACTIONS A9: narrow the deploy token to `autobahn.bot` and the Workers permissions.

### KI-039 A multi-day flood rain looks like "สูง", never like its size (high; Hat Yai hindcast)
- In the Hat Yai flood of Nov 2025 the page would have said "สูง" two days ahead and reached ทำทันที from measured rain
  ~45 h before DDPM's first Extreme alert, but every forecast put the 3 days at a quarter of what fell; a 3-day or
  neighbourhood chance did no better on a held-out season.
- The page measures rain over 24 h only; the upstream gauge that rose first (Sadao, X.173A) is outside its 20 km list.
- **Since 0.5.0:** the rain card's caution about multi-day rain, and who alerts and who orders at เตรียมตัว or above.
- **Since 0.6.0:** the measured 2- and 3-day rain at the nearest gauge within 10 km (`rain3d.json`, from hourly
  readings of ThaiWater's 4,749 gauges; the history began 24 Oct 20:28 UTC, so 3-day totals appear from 26 Oct);
  FloodWatch's own "⚠️ จับตา" lines with their 30-day records, including its upstream group, for the gauges that judge
  the point ([floodwatch-integration](research/floodwatch-integration-2026-10-24.md)).
- **Also since 0.6.0:** this page's own upstream lines on FloodWatch's gauges (A over its bank → เตรียมตัว on the
  U-Taphao, ติดตามไว้ elsewhere; B near its bank; C more is coming; D-056), which don't wait for the city's gauge; and
  Hat Yai's red flag, more than 300 mm measured in 3 days, lifts the rain tile to เตรียมตัว (D-057). Re-read
  independently, Nov 2025: X.44's own watch step came 17 h and its warning 7 h before its bank; the 3-day rain line
  ~24 h before the flood in 2024 and 2025 ([lead-time](research/floodwatch-hatyai-leadtime-2026-10-24.md)).
- **Still open:** the size of the second wave (FloodWatch forecast 7.92 m, X.44 reached 9.91 m); RID's southern gauges
  a median 28 h late (KI-041); the upstream rule's record outside Hat Yai; a 3-day chance only after Nov–Jan 2026–27
  is scored.

### KI-040 FloodWatch's file is 257 KB for every visit (low)
- `floodwatch.json` carries all 1,374 gauges (about 68 KB gzipped) so the page can find its own; a first visit was
  450–470 KB before it (KI-016).
- KV's free writes (1,000 a day) don't allow one file per province at a 15-min cadence (77 × 96).
- **Next:** if phones on slow links matter more, split by region (6 files: ≈ 576 more writes a day, over the free
  plan) or let the Worker answer `?pv=` from the one file; measure first.

### KI-041 Hat Yai city's own gauges are often too old to judge (medium; Hat Yai)
- At 20:26 UTC on 24 Oct, RID's X.44 (บ้านหาดใหญ่ใน, 1.5 km from the centre) and X.90 were 4.4 h old, beyond FloodWatch's
  3 h, so neither app judged the city from them; the tile said no gauge within 8 km. HII's twin at X.90's site
  (SLA002, 8.9 km) was fresh.
- **Next:** FloodWatch (it reads RID's feeds; INTEGRATION §3); whether RID reported hourly during Nov 2025 is in
  [floodwatch-hatyai-leadtime](research/floodwatch-hatyai-leadtime-2026-10-24.md).

### KI-042 Cloudflare sets a cookie on every visitor (medium; device study T6, owner)
- The `autobahn.bot` zone's Bot Fight Mode / JavaScript detections inject a hidden iframe and
  `/cdn-cgi/challenge-platform/…` into every page and set **`cf_clearance`** (HttpOnly, one year): three extra requests
  and a cookie, against GUIDELINES §2 ("no cookies") and the About text ("เว็บนี้ไม่เก็บข้อมูลใด ๆ ของคุณ").
- Not the repository's: a zone-wide setting (the Free plan can't scope Bot Fight Mode to one hostname), shared with
  FloodWatch, which relies on challenging non-browser clients (its KI-506).
- **Next:** OWNER_ACTIONS A14: turn JavaScript detections off for the zone, or disclose the security cookie.

### KI-043 What only a real phone can show, and tablets get the phone layout (medium; device study T3, T5, T8, T13; A4)
- Simulated in headless Chromium only (no WebKit on this host): whether LINE's iOS browser shows `window.prompt` (T3:
  0.6.0 saves under the default name and says so when it doesn't), whether LINE's WebView follows the phone's font size
  (T8: at 200 % the verdict left a 360 × 560 screen; 0.6.0 unsticks the header on short screens), the GPS prompt itself.
- Slow 3G (T5): 0.6.0 preloads the modules and shows "กำลังเปิดพื้นที่ที่ส่งมา…" for a shared link at once; not
  re-measured on a throttled link.
- Tablets (T13): since 0.7.0 two columns from 960 px (an iPad in landscape: the hero and hotlines left, the list right);
  portrait tablets (744–820 px) keep the 680 px phone column.
- **Next:** OWNER_ACTIONS A4 (an Android and an iPhone, from a LINE chat; a tablet).

### KI-044 What the redesign audit left open (low; R13, R15, R16)
- **R15:** lines can break between a number and its unit or inside an abbreviation ("≥ 42 / °C", "กรมอุ / ตุฯ") at 320 px
  with ก+; the data words come from `assess.js` with ordinary spaces.
- **R16:** the loopless Anuphan for body text is a choice to test with older readers (A5, A4); secondary text is
  13.6–15.6 px at the default size.
- **R13:** the level glyph is read with its word, and the group heading says the same word again for screen readers.
- **Next:** NBSP between numbers and units in `assess.js`'s lines; a reading test with older readers before changing the face.

### KI-045 The zone's robots.txt and AI-crawler block are set for all of autobahn.bot (low; owner)
- Cloudflare's managed robots.txt and its AI-crawler block are zone settings: they cover FloodWatch and บ้านรอดไหม too,
  and come before `public/robots.txt` (KNOWLEDGE §14). Today they suit this page: training crawlers refused, search and
  AI assistants that fetch for a person allowed (`use=reference`).
- **Risk:** a change in the zone (say, "block all AI bots") would silently stop AI assistants from reading the page and
  `llms.txt`; nothing in this repository would show it.
- **Next:** after a change to the zone's bot settings, run the KNOWLEDGE §14 check (one request per User-Agent).

### KI-046 Places aren't pages, so search finds only the front page (low; SEO)
- A place is `#t=901101` or `#p=…`, which never reaches a server or a crawler: a search for "น้ำท่วม หาดใหญ่" can't land on
  Hat Yai. `llms.txt` teaches AI assistants to build the link instead.
- **Next, only with the owner's yes (OWNER_ACTIONS D12):** 77 static province pages (`/p/songkhla/`) with a real title
  and description that open the page at the province. They must stay files: no server rendering, nothing kept.

### KI-038 The dust chance is provisional, and over-warns at its low end (low)
- Shown 20 % → 8 % happened (disjoint stations, two dust seasons); it inherits the damped ratio's post-hoc status, and
  every CAMS-based score is an upper bound (Open-Meteo stitches short leads).
- **Next:** re-test as issued in Dec 2026–Apr 2027 (`research/archive_forecasts.mjs`); recalibrate the low end if it holds.

### KI-037 The cool season's heat correction is provisional and post-hoc (medium; D-046)
- From November to February the page uses C6 (corrected T and Td, then the heat index; MODELS §1.1). It beat the
  year-round line on disjoint stations in two winters (MAE 1.53–1.56 vs 3.45–3.56 °C) and kept danger days (7 vs 8 of
  29), but its form was chosen after the pre-registered test (C5) failed its safety rule.
- Its dressing SD is the all-season one, so its 10–90 % range is too wide in winter (held 92–98 %).
- **Next:** run `research/archive_forecasts.mjs` daily from the server; score C0 vs C6 as issued at the end of November
  and in March (pre-registered in MODELS §1.1). Revert if C6 loses on MAE or danger-day hits.

## Fixed

### KI-F40 The page drew each hazard up to six ways, in a fixed order, with emoji (0.7.0; was KI-033, D8 → D-061, D-062)
- The verdict, the tile, the pre-warnings, the 3-day table, the card and the card's day chips each show the same
  forecast. 0.3.0's contradictions (S1, U1, U4, U6, U16, U25, X1–X6) all lived in the gaps between them.
- 0.4.0 makes them agree (`assess.fcLevel`, one window per label, the warning override on chips too) and tests it, but
  the page is still 7,700–10,500 px long at 390 px.
- **The UX study (24 Oct 2026, evening):** one heat forecast was painted orange 12 times on Bangkok's fixture; the page
  is 8,612 px at 360 px. Recommended: improve, don't extend — three views (the verdict with "ข้างหน้า" and "เปลี่ยนจากที่ดู
  ครั้งก่อน", one row per hazard with a 3-day strip that absorbs the table, the chips and the pre-warnings, the detail
  opened in place) ([ux study §2](research/ux-d8-d1-d9-incidents-2026-10-24.md#2-d8-the-redesign)). 0.6.0 ships the
  two verdict lines.

- **Fixed in 0.7.0** (the owner's brief, 25 Oct): one hero, one list sorted by concern (by the worse of today and the
  coming days, grouped by the scale's words) whose rows open in place, the 3-day table and profile folded, sources behind
  a real ⓘ toggle, the staff-gauge glyph and the site's own icons and font. Bangkok's fixture page: about 2,600 px at 390
  px (was 8,612 at 360); the hero ends at 491–505 px on a 360 × 640 LINE screen. An independent audit (R1–R20) ran before
  shipping; R1 (a coming เตรียมตัว under "ยังไม่น่าห่วง") and nine mediums were fixed (CHANGELOG 0.7.0).

### KI-F38 Heat read orange on most afternoons, a step above the DOH's own colours (0.6.0; was KI-005, D1 → D-053)
- **Why it reads so high:** the raw ensemble read about 5 °C low against TMD's stations, so 0.2.0 shows only corrected values ([MODELS §1](MODELS.md#1-heat-index)).
- **What that means:** Bangkok's October afternoons now read 42–44 °C, "อันตราย". Observed Bangkok October days reach 42 °C or more on 48 % of days, and April days on 95 % (station data, `research/out/e1e2_results.json`).
- **What 0.2.0 does:** a forecast alone stops at เตรียมตัว (`MODEL_MAX`, V1). The tile says "บ่ายนี้" (V6), and the pre-warnings list "ร้อนระดับอันตราย" on such days.
- **The risk:** the verdict is orange on most days at most places, which may teach people to ignore orange.
- **Part of it is the correction's own warm bias** (model check, 24 Oct 2026): on 53 stations it never saw, the
  year-round line read +0.95 °C hot in Mar–Oct (+0.9 to +1.9 in the North, Northeast and Central), with false อันตราย on
  19–31 % of days there; in Nov–Feb it read 3–4 °C hot. 0.4.0 fixes the input (13:00/16:00, grid height) and uses C6
  in Nov–Feb (KI-037); the hot season keeps the line, which catches more danger days.



- **Fixed in 0.6.0:** the bands take the DOH's colours (เตือนภัย yellow, อันตราย orange, อันตรายมาก red; KNOWLEDGE §2).
  Orange heat now means "≥ 42 °C likely": with observed values, Bangkok 60 % of Mar–Oct days, Chiang Mai 3 %, Hat Yai
  12 % (was 94–100 % everywhere). On the edge at 20:58 UTC Hat Yai's verdict was led by rain, heat a yellow "เรื่องอื่น".
- **Still to do:** count orange and red verdicts at the 12 archive points (`research/archive_forecasts.mjs`, cron).

### KI-F39 Device findings: blocked storage, silent share and save, the address bar, offline links (0.6.0; T1, T2, T4, T7, T9, T10, T12, T14–T16)
- **T1:** with site data blocked, the storage getters threw and a shared link opened on the welcome page; now no storage
  is simply no memory (`places.js`, `sources.js`; smoke "with site data blocked …").
- **T2, T3:** share never fails silently (inside LINE without Web Share it sends through LINE; otherwise the link to copy
  by hand); save falls back to the default name when the WebView has no prompt.
- **T4, T14, T15:** LINE's own location permission named inside LINE; an approximate fix (±2 km or more) says the
  subdistrict may be wrong; 📍 is busy while it waits.
- **T7, T10:** offline links with a query open from the cache; a redirect is never cached (`sw.js`).
- **T9:** the address bar keeps the place as its subdistrict code after GPS, and tiles scroll without replacing it
  (smoke "after GPS the address bar holds …").
- **T12, T8:** long tile values and place names wrap; the header stops being sticky on short screens.
- **T16:** "all at the lowest step" needs the warnings read too.

### KI-F37 The page didn't compute what the heat line was fitted on (0.4.0; model check §4.1–4.2)
It took each member's max over every hour (+0.41 °C on average, up to 8.3 °C on showery days) and Open-Meteo's
elevation-downscaled temperature (Surat Thani +1.27 °C, up to +4.6 °C of heat index); the line was fitted on GRIB values
at 13:00 and 16:00. The page now asks for `elevation=nan` and uses 13:00/16:00 (`outlook.PREDICTOR_HOURS`). Tests
"model check §4.1", "§4.2"; the JavaScript reproduces the research code's C6 value to four decimals.

### KI-F27 One forecast in three colours and two numbers (0.4.0; S1, S2, U1, X1, X4)
- **The defect:** the verdict and the tile capped a heat forecast at เตรียมตัว (orange), while the 3-day table, the
  card's day chips and the pre-warnings showed it red (ทำทันที's colour), at 5 of 6 points on 24 Oct. The table rounded
  the heat number where the card floored it (10 of 18 cells 1 °C apart), and a band edge put "41 °C" under "อันตราย" (X3).
- **The fix:** `assess.fcLevel` grades a forecast window for every view; pre-warnings take a forecast's colour (`tone`)
  and keep the agency's band in words; one display rounding (`assess.heatNum`). Tests "S1", "S2", "X3".

### KI-F28 An evening's heat read as a 30 % chance of "อันตราย" (0.4.0; S6)
From 16:00 the "today" window holds no afternoon, and the daily-maximum correction lifted an evening's raw 34.9 °C to
40.5 °C (31 % ≥ 42 °C at 18:00). Such a window now has no heat summary (`outlook.hasAfternoon`). Test "S6"; the walk's
18:30 page.

### KI-F29 The 3-day table's colour-only cells, its hidden days and its "today" (0.4.0; was KI-025; S3, S4, S5, U6, U7, U16)
- Every cell has dots and, for screen readers, the level's word. Visible words were not added: they don't fit three
  days at 320 px with ก+.
- At 320 px with ก+ the table showed only "วันนี้" (row names didn't wrap); it fits now (smoke check on the table's box).
- The first column is "คืนนี้" from 18:00; UV's is the rest of today like every row; the note says dust is expected,
  not measured, and today's dust chip says "คาด".
- **Not done (from KI-025):** the quake footnote under the table.

### KI-F30 A province search opened a point 40 km from its town (0.4.0; U2, U20)
Province and district hits open their seat's subdistrict by code (`places.hitPlace`; KNOWLEDGE §7), share `#t=`, and are
labelled in the page's language. Test "U2/U20".

### KI-F31 Words that said more, or less, than the data (0.4.0; U3, U5, U8, U9, U14, U15, U21, U24, X13, X14)
Heat "รู้สึกเหมือน"; the heat band as "ระดับ…" in the verdict; the rain tile's word from the gauge only when the gauge
raised it; today's quakes counted; "ใกล้หมู่บ้านเสี่ยง"; the lowest felt words from M5.5; no "about under 10%"; GDACS's
failure said; AQI sub-indices named; the estimate-based dust outlook says so. Tests "U3/U25", "U5", "U8/U15", "U9",
"U14/U21/U24".

### KI-F32 Coordinates on screen for a GPS or saved place (0.4.0; U17, X7)
The footer and a reopened "บ้าน" showed "13.76, 100.5". Now only a place found on OpenStreetMap shows its rounded point;
the footer says "ปัดเศษราว 1 กม.". Smoke check "no coordinates on screen for a GPS place".

### KI-F33 Access: narrow targets, low contrast, a chatty live region (0.4.0; V28, S9, U11, U18, U19, U22, U23)
44 × 44 targets both ways (↻, hotlines, the warning's toggles); the LINE button 7.3:1 and level-0 words 6.0:1; a focus
ring in the link colour; two undefined CSS variables; the verdict's live region is busy until settled and rewritten only
when it changes.

### KI-F34 A notice TMD had updated or cancelled stayed on the page (0.4.0; X8, latent)
The collector reads CAP `<references>` and drops what an Update or Cancel replaces (`collect.inForce`). Test "X8".

### KI-F35 Links: TMD's raw XML and Thai guides on the English page (0.4.0; U10, X10, X15)
"ประกาศฉบับเต็ม" opens TMD's warnings page in the page's language; the English page links to บ้านรอดไหม's `/en/` guides.
Test "X10".

### KI-F36 No server of its own yet (0.4.0; was KI-032)
The collector runs on `autobahn-bot` since 24 Oct 2026 (D-045), with Air4Thai's 173 stations and ThaiWater answering.
The Cloudflare side is KI-036 and KI-001.

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

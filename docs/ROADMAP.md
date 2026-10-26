# Roadmap

Each item has a "done when". **AI-ready** items need nothing from the owner; **owner** items wait for [OWNER_ACTIONS.md](OWNER_ACTIONS.md).

## Done

- **v0.1.0 (23 Oct 2026):** the page, ten tiles, the verdict, the 3-day outlook and pre-warnings from the ECMWF ensemble, search, saved places, sharing by subdistrict code, Thai and English, the collector, unit tests, the visitor walk, the FloodWatch cross-check.
- **v0.2.0 (23 Oct 2026):** validated forecasts (the heat correction, the damped PM2.5 ratio, rain words, felt words with the Bangkok term), the output cross-check's and the visitor audit's main findings, and a Docker stack for the server.
- **v0.3.0 (23 Oct 2026):** Cloudflare prepared (Workers static assets + KV, `risk.autobahn.bot`, tested locally, not deployed); GLM's checked English for TMD's warnings and a copy first-reader; the live cross-check and its fixes (the warning leads the tile, the verdict and the table); the verdict on the first screen at 360 × 640; no interim verdict; the 3-day table moved up; link previews and PNG icons; `.env` for this project only.

- **The move (24 Oct 2026):** `npm run preflight`, the risk server's runbook ([SERVER.md §2](SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server)), `main` pushed, this project's Docker leftovers removed from FloodWatch's server (the owner deletes the old checkout, A11).

See [CHANGELOG.md](../CHANGELOG.md).

- **v0.4.0 (24 Oct 2026, not deployed):** the name ภัยรอบบ้าน · Thai Risk; the collector on `autobahn-bot`; one grading for
  every forecast view; the cool-season heat fix (C6) and the fitted predictor; the evening false alarm; the province
  search; stale collector files missing; the 3-day table's dots and its 320 px fit; 25 visitor and 19 output findings.

- **v0.5.0 (24 Oct 2026):** the prediction research (a dust-day chance, earthquake wording, seismic zones, the Hat Yai
  hindcast's lines).
- **v0.6.0 (24 Oct 2026, live at https://risk.autobahn.bot):** deployed; FloodWatch's own gauges through the collector
  (KI-007 closed while fresh) with its look ahead and this page's upstream lines; the measured 3-day rain and Hat Yai's
  red flag; heat in the DOH's colours (D1); "ข้างหน้า", what changed since the last look, a share text with its time;
  the device study's fixes.

- **v0.7.0 (25 Oct 2026, live):** the redesign (D8 by the owner's brief): one hero, one list sorted by concern with rows
  that open in place, the staff gauge, the site's icons and font; an independent audit's R1 and nine mediums fixed.

- **v0.7.1 (26 Oct 2026, live):** the MIT licence; `llms.txt`, `robots.txt`, a sitemap, `hreflang` and JSON-LD for
  search and AI assistants, held to the page by `test/discover.test.mjs`; the GitHub "About" box.

## Next, in order (from 25 Oct 2026)

1. ✅ **The KV token** (A9, 24 Oct 21:12 UTC): the edge serves the live files; `health --need-live` exits 0.
2. **Real phones in LINE, and a tablet** (A4): the device study's §5 list.
3. **The archive on cron** (`research/archive_forecasts.mjs`, daily): C6 and the dust chance scored as issued, and the
   orange and red verdict days counted after D1.
4. ✅ **The D8 redesign** (0.7.0). Next for it: real phones and older readers (A4, A5; KI-043, KI-044), and NBSP
   between numbers and units (R15).
5. **D11's words and link** after the owner's yes ([OWNER_ACTIONS D11](OWNER_ACTIONS.md#d-decisions)).
6. **The upstream rule's record outside Hat Yai:** log each A/B firing and what the gauge downstream did (from
   FloodWatch's history); lift A to เตรียมตัว elsewhere only with a record like the U-Taphao's.
7. **FloodWatch's file, leaner:** the lead-time study's additions (`c12`, the bank bands, `rid_age`) and the upstream links
   filtered at the collector; measure page weight first (KI-040).
8. **Province pages for search** (KI-046), only after the owner's yes (D12) and A4.

## v0.4: live (owner first, then AI-ready)

0. ✅ **The risk server** (A12; `autobahn-bot`, D-045): preflight with no ❌, the stack healthy (24 Oct 2026).
1. ✅ **Go live at risk.autobahn.bot** (A10 done 24 Oct 2026, 20:13 UTC; the live files wait for A9's KV token; [CLOUDFLARE.md §4](CLOUDFLARE.md#4-what-the-owner-does)): new tokens, `npm run cf:setup`, the collector on the risk server, `npm run cf:deploy`. *Done when* the URL answers from the edge, `data/live/index.json` there is under 15 min old, and the warning, fire and storm tiles show data.
2. **Air4Thai from the risk server** (A6): 173 stations from FloodWatch's server on 23 Oct; measure it again on the new host.
3. **Real-phone test** inside LINE (A4). *Done when* the 12 tasks of the UX scout's script pass on an Android and an iPhone.
4. ✅ **FloodWatch as the flood tile's source for a Bangkok point** (0.6.0, through the collector; CORS no longer needed for
   `/api/point`). `/api/geocode` CORS (B2) still open.

## v0.4 also: what the audits left (AI-ready)

In order. Each item names its known issue and audit finding.

1. ✅ **The verdict above the fold at 360 × 640** (KI-F23): 504 px, smoke-checked.
2. ✅ **No interim milder verdict** (KI-F24): smoke-checked with the warnings held back 2.5 s.
3. **The 3-day table's words** (KI-025, V13): it moved above the cards and is honest about rain in 0.3.0; still to do: dots and band words in every cell, "คืนนี้". *Done when* every cell has dots and a word.
3b. **The rain level and its word** (KI-030, after the owner's D7).
4. **Thai place names and units in Thai mode** (KI-024, V12). *Done when* no Latin capitals appear in a Thai quake line, and dust reads "มคก./ลบ.ม.".
5. **Search that finds local names** (KI-012, V19): bias Photon by the last place, expand "ม.", a landmark list. *Done when* "ม.เชียงใหม่" and "นิมมาน" find Chiang Mai University and the road.
6. ✅ **The flood line that contradicts itself** (KI-008, V17; the last "91 %" reason line went in 0.6.0). *Done when* the tile names its gauge and a river line with 1 m or more of freeboard carries no "ใกล้ล้นตลิ่ง".
7. **The polish list** (KI-027): tap widths, rem sizes, line breaks, one name per hazard, saved places, at-risk dust lines (from บ้านรอดไหม's `kit.json → air`), a retry, the welcome screen with TMD's notices.
8. **Fixtures for bad days** (KI-020): a wet, a smoky, a warning and a felt-quake state for the smoke walk, from the visitor audit's states.

## v0.4 and after: the server's own jobs (AI-ready once the collector runs)

From [SERVER.md §6](SERVER.md#6-what-to-build-on-the-server-next):
1. A GDACS digest (KI-016).
2. **District forecast files**: the ensemble and CAMS once per district centre (928) after each ECMWF run, published as `data/live/district/<code>.json`. *Done when* the page reads the district file first and calls Open-Meteo only if it's missing. Then no point leaves the phone for the weather (KI-011).
3. National files by code (ThaiWater by province, HII, a DMR profile).
4. An archive of the issued forecasts and collector files, for the validation's re-tests.

## v0.5: more of the situation (AI-ready unless marked)

1. **ONWR's official flood warning** for the point, today to +3 days, from its tile service (CORS reflected; research/sources gap 2), after the owner asks ONWR (C4). *Done when* the flood tile quotes ONWR's word for the point's tile and its update time.
2. **"Water seen near you"**: Copernicus GFM and NASA VIIRS flood pixels, worded "เห็นน้ำ" / "เมฆบัง", never "ไม่ท่วม". *Done when* a point in a GFM flood polygon shows the satellite pass time.
3. **JTWC's Indian Ocean bulletins** for the Andaman Sea and the Bay of Bengal (JMA doesn't cover them). *Done when* a parser has a saved bulletin as a test.
4. **TMD's keyless XML in the collector**: the announcement text (`storm-tracking`), regional forecasts, and TMD's clear-sky UV CSV (77 stations, 7 days). *Done when* the UV tile can use TMD's own forecast.
5. **The place profile per subdistrict at build time**: DMR flash-flood class and sinkholes, ThinkHazard's district levels (labelled "ภาพรวมระดับโลก ปี 2020"), and GISTDA's flood years once keyed (C2). *Done when* `data/profile.json` exists and the profile lists them with sources.
6. **Air4Thai's full pollutants and ThaiWater's salinity** (สำแล) in the collector.
7. **A map** (Leaflet, loaded only when asked) to pick a point by tapping, as FloodWatch does. The UX scout advised against a map on the first screen.
8. **Measure the nearest-centre error** near district borders from the boundary file (KI-006).

## v0.5 also: from the 24 Oct audits and research

1. ✅ **The redesign** (D8, KI-F40; 0.7.0): one drawing per hazard. *Done when* a visitor audit finds no two views of one forecast.
2. **The PM2.5 chance line, Dec–Apr** ([predict-air](research/predict-air-2026-10-24.md)): "พรุ่งนี้ โอกาสที่ฝุ่นเฉลี่ยทั้งวันจะถึงระดับ
   เริ่มมีผลกระทบต่อสุขภาพ ราว 40%", lognormal dressing of the damped ratio (σ 0.343 / 0.380), PCD station input only.
   Provisional, like the damped ratio. And a link to PCD's 7-day forecast image.
3. **Score C6 and the PM2.5 chance as issued** from `research/archive_forecasts.mjs` (daily cron): end of November, March.
4. ✅ **The prediction studies** (0.5.0): see CHANGELOG 0.5.0 and FRANK_FEEDBACK §8.
5. **The measured path for floods** (KI-039, the Hat Yai hindcast): ✅ a measured 3-day rain line and Hat Yai's red flag,
   ✅ FloodWatch's gauges and upstream lines (0.6.0); still: the collector's province rain files so a flood-night crowd
   doesn't each call ThaiWater. *Done when* a replay of 19–26 Nov 2025
   shows the page at ทำทันที from measurements before the first Extreme phone alert.
6. **Archive for the next tests:** GWIS fire danger and PCD's forecast images from December; HII's flash-flood list
   daily; then the fire-weather line and a 3-day rain chance can be scored as issued.

## v0.6: forecasts ([MODELS.md §7](MODELS.md#7-what-is-still-to-test))

1. **Re-test the damped PM2.5 ratio as issued** in the 2026–27 dry season (it was chosen post-hoc), from the server's archive.
2. **Test the heat correction at 72 h** and on the deterministic fallback.
3. **A neighbourhood rain chance** ("within 25 km"), which may score better than a point.
4. **Gusts** against any station records that carry them.
5. **Reliability of the ensemble's chances** before changing the chance rule.
6. **The quake words** after the next felt event, and a site term for other soft basins (KI-010).

## AI (GLM), by value ([AI.md §3](AI.md#3-where-else-glm-could-help-ranked-research-notes-not-built))

1. **Region names in Thai and TMD storm announcements in English** as a build-time table GLM drafts and a person checks (KI-024).
2. **Landmark aliases for search** (KI-012), GLM-drafted, OpenStreetMap coordinates, reviewed, searched on the phone.
3. **A bilingual check of the first ten live warning translations** (KI-031), then a phrase table for TMD's fixed instructions.
4. Later, only with FloodWatch's checker ported: a national "today" line on the welcome screen (V39).

## Not planned (and why)

- **Push notifications:** they need a server keeping subscriptions (PDPA) and don't work inside LINE's browser. Official Cell Broadcast and LINE ALERT exist.
- **An earthquake forecast:** none exists.
- **An "AI summary" of a point, AI-written levels or advice, or a chat about one's area:** the tiles' words are the agencies'; a paraphrase would add risk (FloodWatch D-022), and a chat would send a visitor's place and words to a provider outside Thailand. GLM's checked translation of TMD's own words is the exception ([AI.md](AI.md)).

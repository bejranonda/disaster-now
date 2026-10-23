# Guidelines: the rules for this app

Rules for anyone (person or AI) changing Disaster Now. Most come from the owner's two other apps, FloodWatch (`flood2026-research`) and บ้านรอดไหม (`Hazard-huntz`), whose rules were learned from real users and real mistakes; the source of each is named. Where a rule is this app's own choice, it says so.

## 1. Non-negotiables

1. **Never invent a number, an endpoint, a field or a safety line.** Every cut point in `public/js/levels.js`, every advice line in `public/js/actions.js` and every endpoint in `public/js/sources.js` has a source in [KNOWLEDGE.md](KNOWLEDGE.md) (a live call with date and host, or a document with its URL and the date read). Anything not confirmed is marked **[unverified]** in the docs. (FloodWatch's evidence rule; Hazard-huntz rule 1.)
2. **The agency's own word leads every tile, and the app's level is never milder than that word.** PCD's "เริ่มมีผลกระทบต่อสุขภาพ" stays on the PM2.5 tile; TMD's warning is quoted, never re-graded. (UX scout §5a; a Swiss study found inconsistent warnings lower action.)
3. **Measurements before models.** A PCD station within 15 km beats GISTDA's estimate; a rain gauge within 10 km and 3 h beats the model; every model value carries the "แบบจำลอง" tag. (FloodWatch's habit; KNOWLEDGE §5.)
4. **Ranges and chances, never countdowns.** "พรุ่งนี้ โอกาส 40%", never "ฝนจะตกใน 2 ชม. 15 นาที". Chances are rounded to tens and never 0 or 100 % (51 ensemble members can't be certain). (FloodWatch D-005.)
5. **One scale for every hazard, named by what to do:** ยังไม่น่าห่วง · ติดตามไว้ · เตรียมตัว · ทำทันที, with a 4-dot meter so colour is never the only signal, and a hatched grey "ไม่มีข้อมูล". Never "ปลอดภัย". (UX scout §5a.)
6. **The chance rule** (this app's own choice, `levels.js → CHANCE`): a window's level is the highest level at least half the ensemble members reach; if "เตรียมตัว" or worse is only *possible* (≥ 20 % of members), the window is at least "ติดตามไว้". Change it only with a reliability test (MODELS.md).
7. **The verdict is never milder than a tile, and missing data is never calm.** Its level is the highest tile's; fewer than half the tiles answering means no verdict ("ยังไม่มีข้อมูลพอ"); an incomplete page says so ("บางเรื่องยังไม่มีข้อมูล").
8. **One failing source never stops the page.** Every call has a timeout (12 s) and its own error line; the page renders as answers arrive.
9. **Switchable services:** the street geocoder is chosen in `public/config.json` (`photon` | `nominatim` | `floodwatch` | `off`), so komoot or the OSMF can be obeyed at once without a release (Nominatim's usage policy asks for this).
10. **No secrets in git.** The page has no keys; a key (TMD, GISTDA, FIRMS) lives only in the collector's environment and goes in a header, never a URL.

## 2. Privacy

- **The exact GPS fix never leaves the phone.** Providers that need a point get it rounded to 2 decimals (~1.1 km), as FloodWatch rounds before its reverse lookup (`geo.rounded`).
- **The subdistrict comes from the phone** (nearest of 7,425 centres in `data/tambon.json`), not from a reverse-geocoding call.
- **Search text leaves the phone only when the person presses search,** to Photon or Nominatim, and the button says so ("คำที่พิมพ์จะส่งไปค้นที่นั่น"). Never per keystroke (Nominatim forbids autocomplete).
- **Shared links carry a subdistrict code (`#t=100103`) for a GPS fix or a saved place,** never the coordinates of a home; a searched public place may keep its rounded point (`#p=`). (UX scout §4c.6.)
- **Saved places stay in `localStorage`,** five at most. This site has no server, no cookies, no analytics and no accounts. Anything per-person on a future server waits for a Thai lawyer (Hazard-huntz docs/09 §7, PDPA).
- **The static host must allow geolocation:** `Permissions-Policy: geolocation=(self)`. Don't copy Hazard-huntz's `_headers`, which sends `geolocation=()`.

## 3. Sources

- **Honest User-Agent** in the collector and research (`disaster-now-collector/0.1 (+repo URL)`); browsers send their own and the page's origin as Referer.
- **Never faster than the source updates;** the page caches each answer in `sessionStorage` for the source's cadence (`SOURCES[*].ttl`).
- **No evasion:** no bot-challenge solving, no proxy rotation, no geo-block workaround. A Thai-only host waits for a host in Thailand (Hazard-huntz docs/09 §5).
- **Each source's time rule is written in code with a test** (KNOWLEDGE §4): GISTDA's "Z" is Bangkok time; HII has no offset; TMD's CAP list `pubDate` is 7 h early (take the item's times); TMD's storm `time` is UTC without an offset; TMD's quake RSS description is Bangkok time in CE.
- **Show the age:** "⏱ N ชม.ก่อน" when a reading is over an hour old; readings older than about three times their cadence are dropped (PCD stations 3 h, gauges 6 h, rain 3 h).
- **Never mix agencies' levels** (FloodWatch KI-217): each gauge is judged only against its own bank; BMA's canals by BMA's thresholds (only FloodWatch has them).
- **Credit every source on its card** and in "ข้อมูลมาจากไหน".

## 4. Consistency with the owner's other apps

- **Rivers read as FloodWatch reads them:** the same bank rule (`levels.riverLevel` = FloodWatch `classify_status`), the same words (`RIVER_WORDS` = FloodWatch `STATUS`), the same point rule (`water.areaIndex` = FloodWatch `point.area_index`: in Bangkok and its five neighbours only canals judge a point), the same rain gauge limits (10 km, 3 h). `research/crosscheck_floodwatch.mjs` checks it: 691 of 693 gauges agreed on 23 Oct 2026.
- **Advice lines are Hazard-huntz's, word for word** (`actions.js` ← `kit.json → air, hot`), and every "ทำอย่างไร" link goes to its guide. Change them there first; `npm run check:advice` compares with the live copy.
- **The same PM2.5 and heat-index bands** as Hazard-huntz (PCD 2023; TMD/DOH), checked by a unit test.

## 5. Thai and English copy

- Every string in Thai and English (`i18n.js`, and the `L(th, en)` pairs in `assess.js`); a test checks every `data-t` key. The English is British English (Hazard-huntz rule 58).
- Warm, plain Thai for an older reader; no jargon without a gloss ("ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก").
- Emoji in visible text are Unicode 11 or older (Hazard-huntz rule 64): no 🟢🟡🟠 circles.
- Numbers: one decimal for PM2.5 (PCD's resolution), whole °C, mm and km/h, thousands grouped (2,590 กม.).
- Bangkok areas are "แขวง/เขต", elsewhere "ต./อ./จ.".

## 6. Layout and testing

- **Phones first:** checked at 320 × 568 and 390 × 844, with ก+ (larger text), in light and dark mode; no horizontal scroll; every tap target ≥ 44 px (the smoke test measures it).
- **Fixed tile order** (`assess.ORDER`): people learn where their tile is.
- **Before a change is done:** `npm test` (unit tests on saved live responses) and `CHROME_PATH=/opt/pw-browsers/chromium npm run smoke` (the visitor walk on fixtures, the clock pinned to 23 Oct 2026 19:50 UTC); for source or wording changes also `npm run smoke -- --live` and read its output as a visitor would.
- **A new source gets:** a fixture saved from a live call, a parser with a unit test (including its missing-value codes and its time rule), a row in [SOURCES.md](SOURCES.md), and its credit line.
- **Bump `?v=`** on `css/app.css` and `js/main.js` in `index.html`, `VERSION` in `main.js` and `sw.js`, and `package.json` with every release.

## 7. Models and forecasts

- **Judge model changes honestly** (FloodWatch GUIDELINES §4): choose on an earlier period, score on a later one, confirm on a disjoint sample (other stations or the newest season), always against persistence and climatology; a change ships only if it beats the current method on the disjoint test.
- **Nothing forecasts earthquakes.** The quake tile estimates whether a past quake was felt; it says "พยากรณ์ล่วงหน้าไม่ได้".
- **A model value is never shown as a measurement,** and a model's correction is shown as such ("ปรับตามค่าวัด").
- **No interpolated water surface over land** (FloodWatch D-019); elevation is context only ("ไม่ได้บอกว่าน้ำท่วมหรือไม่").

## 8. Git

- Branch from `main` (or the branch you were given); push only there. Commit messages start with `feat:`, `fix:`, `docs:`, `test:`, `content:` or `chore:` and end with the attribution lines the harness gives.
- Stage files by name; never commit `public/data/live/` (the collector's output), `.env`, keys or big downloads.
- Several sessions may work here: `git pull --ff-only` and read `git log` before editing.

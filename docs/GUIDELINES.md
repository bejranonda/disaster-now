# Guidelines: the rules for this app

Rules for anyone (person or AI) changing Disaster Now. Most come from the owner's two other apps, FloodWatch (`flood2026-research`) and บ้านรอดไหม (`Hazard-huntz`), whose rules were learned from real users and real mistakes; the source of each is named. Where a rule is this app's own choice, it says so.

## 1. Non-negotiables

1. **Never invent a number, an endpoint, a field or a safety line.** Every cut point in `public/js/levels.js`, every advice line in `public/js/actions.js` and every endpoint in `public/js/sources.js` has a source in [KNOWLEDGE.md](KNOWLEDGE.md) (a live call with date and host, or a document with its URL and the date read). Anything not confirmed is marked **[unverified]** in the docs. (FloodWatch's evidence rule; Hazard-huntz rule 1.)
2. **The agency's own word leads every tile, and the app's level is never milder than that word.** PCD's "เริ่มมีผลกระทบต่อสุขภาพ" stays on the PM2.5 tile; TMD's warning is quoted, never re-graded. (UX scout §5a; a Swiss study found inconsistent warnings lower action.)
3. **Measurements before models.** A PCD station within 15 km beats GISTDA's estimate; a rain gauge within 10 km and 3 h beats the model; every model value carries the "แบบจำลอง" tag. (FloodWatch's habit; KNOWLEDGE §5.)
3b. **A forecast alone tops out at "เตรียมตัว".** "ทำทันที" needs a measurement or an agency's warning (`assess.MODEL_MAX`; the visitor audit found "act now" on most October nights for the next afternoon's heat). The tile keeps the agency's word for the value, and names the window ("บ่ายนี้").
3c. **An official warning lifts its hazard's tile** (`events.capHazard`), leads the verdict over model-only tiles of the same level, and is listed first among the pre-warnings; "nothing unusual" is never said beside it.
3d. **Only validated numbers, in validated words.** Raw model heat is never shown (it reads 5 °C low); rain is three chance words, never a forecast amount; gusts say "ยังไม่ได้ตรวจสอบความแม่นยำ"; quakes use the validated felt words and never "ไม่รู้สึก" or a damage word (MODELS.md).
4. **Ranges and chances, never countdowns.** "พรุ่งนี้ โอกาส 40%", never "ฝนจะตกใน 2 ชม. 15 นาที". Chances are rounded to tens and never 0 or 100 % (51 ensemble members can't be certain). (FloodWatch D-005.)
5. **One scale for every hazard, named by what to do:** ยังไม่น่าห่วง · ติดตามไว้ · เตรียมตัว · ทำทันที, with a 4-dot meter so colour is never the only signal, and a hatched grey "ไม่มีข้อมูล". Never "ปลอดภัย". (UX scout §5a.)
6. **The chance rule** (this app's own choice, `levels.js → CHANCE`): a window's level is the highest level at least half the ensemble members reach; if "เตรียมตัว" or worse is only *possible* (≥ 20 % of members), the window is at least "ติดตามไว้". Change it only with a reliability test (MODELS.md).
7. **The verdict is never milder than a tile, and missing data is never calm.** Its level is the highest tile's; fewer than half the tiles answering means no verdict ("ยังไม่มีข้อมูลพอ"); an incomplete page says so ("บางเรื่องยังไม่มีข้อมูล"). **A tile is graded only from its primary source:** rain and wind need the forecast, flood needs gauges; a secondary source (yesterday's gauge, a far storm, HII's list) adds lines but never sets "ยังไม่น่าห่วง". Warnings that couldn't be checked are listed as missing. A failed source is worded as a failure, never as "no station here".
8. **One failing source never stops the page.** Every call has a timeout (12 s) and its own error line; the page renders as answers arrive.
9. **Switchable services:** the street geocoder is chosen in `public/config.json` (`photon` | `nominatim` | `floodwatch` | `off`), so komoot or the OSMF can be obeyed at once without a release (Nominatim's usage policy asks for this).
10. **No secrets in git.** The page has no keys; a key (TMD, GISTDA, FIRMS) lives only in the collector's environment and goes in a header, never a URL.

## 2. Privacy

- **The exact GPS fix never leaves the phone,** not even through a screenshot or a link: providers and links (FloodWatch's too) get it rounded to 2 decimals (~1.1 km), as FloodWatch rounds before its reverse lookup (`geo.rounded`), and a GPS place shows no coordinates on screen.
- **The subdistrict comes from the phone** (nearest of 7,425 centres in `data/tambon.json`), not from a reverse-geocoding call.
- **Search text leaves the phone only when the person presses search,** to Photon or Nominatim, and the button says so ("คำที่พิมพ์จะส่งไปค้นที่นั่น"). Never per keystroke (Nominatim forbids autocomplete).
- **Shared links carry a subdistrict code (`#t=100103`) for a GPS fix or a saved place,** never the coordinates of a home; a searched public place may keep its rounded point (`#p=`). (UX scout §4c.6.)
- **Saved places stay in `localStorage`,** five at most. This site has no server, no cookies, no analytics and no accounts. Anything per-person on a future server waits for a Thai lawyer (Hazard-huntz docs/09 §7, PDPA).
- **The static host must allow geolocation:** `Permissions-Policy: geolocation=(self)`. Don't copy Hazard-huntz's `_headers`, which sends `geolocation=()`.

## 3. Sources

- **Honest User-Agent** in the collector and research (`disaster-now-collector/0.2 (+repo URL)`); browsers send their own.
- **A failed fetch is never written as data:** the collector keeps the old file and lists the failure (FIRMS with no file read is a failure, not "0 hotspots").
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
- **Bump `?v=`** on `css/app.css` and `js/main.js` in `index.html` and in `sw.js`'s `SHELL`, `VERSION` in `main.js` and `sw.js`, and `package.json` (and `package-lock.json`) with every release.
- **The first screen of a 360 × 640 phone inside LINE shows the verdict** (smoke check, KI-F23), and no level shows before the forecast, air quality and warnings have answered or 5 s have passed (KI-F24).
- **A page string that describes data must match what the cells show** (KI-F26: the rain row said "mm" for a year of chance words).
- **Every module the page imports is in `sw.js`'s `SHELL`** (one missing file kills the page offline: the visitor audit's V3); `test/audit.test.mjs` walks the imports and fails otherwise.
- **Each audit finding that is fixed gets a test** named after its ID (`test/audit.test.mjs`: "M5/V2: …").

## 7. Models and forecasts

- **Judge model changes honestly** (FloodWatch GUIDELINES §4): choose on an earlier period, score on a later one, confirm on a disjoint sample (other stations or the newest season), always against persistence and climatology; a change ships only if it beats the current method on the disjoint test.
- **Nothing forecasts earthquakes.** The quake tile estimates whether a past quake was felt; it says "พยากรณ์ล่วงหน้าไม่ได้".
- **A model value is never shown as a measurement,** and a model's correction is shown as such ("ปรับตามค่าวัด").
- **No interpolated water surface over land** (FloodWatch D-019); elevation is context only ("ไม่ได้บอกว่าน้ำท่วมหรือไม่").

## 8. The server and Cloudflare

- The rules in [SERVER.md §5](SERVER.md#5-rules-that-apply-on-the-server): publish files and keep nothing about a person
  (no visitor logs, positions, cookies or accounts); the app binds to localhost; containers run read-only as a non-root
  user; the collector never loops faster than every 600 s; the page must keep working when the server is down.
- **On Cloudflare** ([CLOUDFLARE.md §5](CLOUDFLARE.md#5-rules-on-cloudflare)): only `/data/live/*` runs Worker code;
  `observability` stays off and the Worker logs nothing; its headers equal `_headers` (a test compares them).
- **Keys:** only in `.env` (git-ignored, mode 600), one scoped token per job, passed by docker-compose.yml to the one
  service that needs it, sent in headers, never printed (`tools/env-check.mjs` shows states, not values). **Never copy
  another project's `.env`**, and never run another site's tunnel token here.
- **One server per app (D-040):** the stack runs on the risk server, never on FloodWatch's production machine or
  another app's. Sharing one means sharing an IP's rate limits (KI-029), Docker and disk, and `.env` files drift
  between projects. Run `npm run preflight` before the first `docker compose up` on any host; it fails where
  FloodWatch runs.
- **Re-issue, don't copy (D-041):**
  - A new server gets a fresh `.env` from `.env.example`, with tokens made for this project.
  - A changed token goes into `.env` only; nothing in git changes.
  - An old token that another app may use is revoked only after checking that app.
- **Live calls:** one live walk and one cross-check per change, never loops (ThaiWater limits per IP, KI-029).

## 9. Git

- Branch from `main` (or the branch you were given); push only there. Commit messages start with `feat:`, `fix:`, `docs:`, `test:`, `content:` or `chore:` and end with the attribution lines the harness gives.
- Stage files by name; never commit `public/data/live/` (the collector's output), `.env`, keys or big downloads.
- Several sessions may work here: `git pull --ff-only` and read `git log` before editing.
- **Before leaving a server, push.** Commits that exist only in a server's checkout are lost with it: 0.3.0 existed
  only on FloodWatch's server until the move (24 Oct 2026). Merge into `main` only when the owner asks.

## 10. AI (GLM)

The full reasoning is in [AI.md](AI.md). In short:
1. **Off the visitor's path:** only the collector and dev tools call GLM; the page never waits for it and is complete without it (`AI_ENABLED=0`).
2. **Rules write facts; GLM only translates or reviews.** Never a level, number, time, province, advice or verdict.
3. **Checked or not shown:** every AI text on the page passes a deterministic check (`tools/translate.mjs`), is labelled as machine output, and keeps the original one tap away.
4. **Public text only:** GLM never sees a position, a typed search or anything about a visitor.
5. **Bounded:** one call per new text, `AI_DAILY_CALLS`, `reasoning_effort: "low"`, a timeout, the key in a header only.
6. **A new use is measured on live text first** and written into AI.md with its acceptance rate; a dev tool's suggestions (`tools/ai-review-copy.mjs`) are prompts for a person, never applied unread.

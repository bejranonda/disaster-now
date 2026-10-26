# Guidelines: the rules for this app

Rules for anyone (person or AI) changing ภัยรอบบ้าน · Thai Risk (code name `disaster-now`). Most come from the owner's two other apps, FloodWatch (`flood2026-research`) and บ้านรอดไหม (`Hazard-huntz`), whose rules were learned from real users and real mistakes; the source of each is named. Where a rule is this app's own choice, it says so.

## 1. Non-negotiables

1. **Never invent a number, an endpoint, a field or a safety line.** Every cut point in `public/js/levels.js`, every advice line in `public/js/actions.js` and every endpoint in `public/js/sources.js` has a source in [KNOWLEDGE.md](KNOWLEDGE.md) (a live call with date and host, or a document with its URL and the date read). Anything not confirmed is marked **[unverified]** in the docs. (FloodWatch's evidence rule; Hazard-huntz rule 1.)
2. **The agency's own word leads every tile, and the app's level is never milder than that word.** PCD's "เริ่มมีผลกระทบต่อสุขภาพ" stays on the PM2.5 tile; TMD's warning is quoted, never re-graded. (UX scout §5a; a Swiss study found inconsistent warnings lower action.)
3. **Measurements before models.** A PCD station within 15 km beats GISTDA's estimate; a rain gauge within 10 km and 3 h beats the model; every model value carries the "แบบจำลอง" tag. (FloodWatch's habit; KNOWLEDGE §5.)
3b. **A forecast alone tops out at "เตรียมตัว", in every view.** "ทำทันที" needs a measurement or an agency's warning (`assess.MODEL_MAX`; the visitor audit found "act now" on most October nights for the next afternoon's heat). The tile keeps the agency's word for the value, and names the window ("บ่ายนี้"). **One function grades a forecast window** (`assess.fcLevel`) for the tile, the card's day chips and the 3-day table, and a pre-warning takes a forecast's colour (`tone`) while its words keep the agency's band: in 0.3.0 the table and the pre-warnings were red beside an orange tile (review S1, visitor audit U1).
3c. **An official warning lifts its hazard's tile** (`events.capHazard`), leads the verdict over model-only tiles of the same level, and is listed first among the pre-warnings; "nothing unusual" is never said beside it.
3d. **Only validated numbers, in validated words.** Raw model heat is never shown (it reads 5 °C low); rain is three chance words, never a forecast amount; gusts say "ยังไม่ได้ตรวจสอบความแม่นยำ"; quakes use the validated felt words and never "ไม่รู้สึก" or a damage word (MODELS.md).
3e. **A correction is used only inside the domain it was fitted on.** The heat correction was fitted on afternoon daily maxima, so a window with no afternoon left (from 16:00) gets no heat number at all (`outlook.hasAfternoon`; review S6: an evening became "danger heat, 30 %"). The lowest felt words rest on reports from M5.5 and larger, so a smaller quake gets the facts alone (`assess.FELT_WORDS_MIN_MAG`, U15).
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
- **Shared links carry a subdistrict code (`#t=100103`) for a GPS fix, a saved place, or a subdistrict, district or province found by name** (a district or province opens its seat's subdistrict, review U2), never the coordinates of a home; a place found on OpenStreetMap may keep its rounded point (`#p=`). (UX scout §4c.6.)
- **Coordinates appear on screen only for a place found on OpenStreetMap,** never for a GPS fix or a saved place, not even rounded (the footer says "ปัดเศษราว 1 กม."; U17).
- **The address bar holds the place as its subdistrict code** after a GPS fix or a saved place (`#t=…`, the share link's
  own form, since 0.6.0: LINE's own ⋯ → Share sends the address bar, device study T9), never coordinates.
- **"What changed since you last looked" stays on the phone:** `localStorage` key `dn:seen`, keyed by subdistrict code,
  holding each hazard's level and the time of the look, five places at most; never a position, a name, or anything sent
  (0.6.0, D-059).
- **Storage blocked is no memory, never a broken page** (T1): every `localStorage`/`sessionStorage` access, the getter
  included, sits inside a `try`.
- **Saved places stay in `localStorage`,** five at most. This site has no server, no cookies, no analytics and no accounts. Anything per-person on a future server waits for a Thai lawyer (Hazard-huntz docs/09 §7, PDPA).
- **The static host must allow geolocation:** `Permissions-Policy: geolocation=(self)`. Don't copy Hazard-huntz's `_headers`, which sends `geolocation=()`.

## 3. Sources

- **Honest User-Agent** in the collector and research (`disaster-now-collector/0.2 (+repo URL)`); browsers send their own.
- **A failed fetch is never written as data:** the collector keeps the old file and lists the failure (FIRMS with no file read is a failure, not "0 hotspots").
- **Never faster than the source updates;** the page caches each answer in `sessionStorage` for the source's cadence (`SOURCES[*].ttl`).
- **No evasion:** no bot-challenge solving, no proxy rotation, no geo-block workaround. A Thai-only host waits for a host in Thailand (Hazard-huntz docs/09 §5). **No VPN** (D-058): every source answers the collector's host; BMA's and RID's gauges come through FloodWatch, which runs the family's one Thai egress under its own rules (public pages only).
- **The family's data once:** a feed FloodWatch already reads (gauges, its forecasts) comes from FloodWatch's API through the collector, not from a second fetch of the agency (D-054); the page keeps a direct fallback for when FloodWatch is down.
- **Each source's time rule is written in code with a test** (KNOWLEDGE §4): GISTDA's "Z" is Bangkok time; HII has no offset; TMD's CAP list `pubDate` is 7 h early (take the item's times); TMD's storm `time` is UTC without an offset; TMD's quake RSS description is Bangkok time in CE.
- **Show the age:** "⏱ N ชม.ก่อน" when a reading is over an hour old; readings older than about three times their cadence are dropped (PCD stations 3 h, gauges 3 h as FloodWatch's `STALE_MIN` of 180 min, rain 3 h; the docs said 6 h for gauges until 0.4.0, X19).
- **Never mix agencies' levels** (FloodWatch KI-217): each gauge is judged only against its own bank; BMA's canals by BMA's thresholds (only FloodWatch has them).
- **Credit every source on its card** and in "ข้อมูลมาจากไหน".

## 4. Consistency with the owner's other apps

- **Rivers read as FloodWatch reads them:** the same bank rule (`levels.riverLevel` = FloodWatch `classify_status`), the same words (`RIVER_WORDS` = FloodWatch `STATUS`), the same point rule (`water.areaIndex` = FloodWatch `point.area_index`: in Bangkok and its five neighbours only canals judge a point), the same rain gauge limits (10 km, 3 h). `research/crosscheck_floodwatch.mjs` checks it: 691 of 693 gauges agreed on 23 Oct 2026.
- **Advice lines are Hazard-huntz's, word for word** (`actions.js` ← `kit.json → air, hot`), and every "ทำอย่างไร" link goes to its guide. Change them there first; `npm run check:advice` compares with the live copy.
- **The same PM2.5 and heat-index bands** as Hazard-huntz (PCD 2023; TMD/DOH), checked by a unit test.
- **The agency's own colours where it gives them** (D-053): PCD's yellow, orange and red for PM2.5 and the DOH's for
  heat map one-to-one onto ติดตามไว้, เตรียมตัว and ทำทันที; the agency's green becomes the family's blue
  ยังไม่น่าห่วง. Never a step above the agency's colour on the app's own initiative: until 0.5.0 heat sat one step
  higher and was orange on 94–100 % of Mar–Oct days.
- **FloodWatch's look ahead counts only from the gauges that judge the point** (the area index's basis, D-055), says
  its 30-day record, and names itself in the tile's word when it raises the level. **An upstream line says nothing**
  when the upstream reading is over 3 h old or flagged, the link is spurious (lag under 3 h or at 48 h, a twin, over
  50 km), or the rise is a single reading; it never reassures ("ต้นน้ำปกติ", "ลดแล้ว") and gives a range ("within about
  2 × lag h, or sooner"), never a countdown (D-056).

## 5. Thai and English copy

- Every string in Thai and English (`i18n.js`, and the `L(th, en)` pairs in `assess.js`); a test checks every `data-t` key. The English is British English (Hazard-huntz rule 58).
- Warm, plain Thai for an older reader; no jargon without a gloss ("ดัชนีความร้อน = ร้อนที่ร่างกายรู้สึก").
- Emoji in visible text are Unicode 11 or older (Hazard-huntz rule 64): no 🟢🟡🟠 circles.
- Numbers: one decimal for PM2.5 (PCD's resolution), whole °C, mm and km/h, thousands grouped (2,590 กม.).
- Bangkok areas are "แขวง/เขต", elsewhere "ต./อ./จ.".
- **What machines read is copy too** (0.7.1, D-065): `public/llms.txt`, the JSON-LD, the meta description and the
  `og:` tags follow the same rules as the page: the level words are `levels.js`'s, the hotlines are the ones the page
  dials, "not a warning service" stays, nothing is promised that the page doesn't do (no public API; `/data/live/` is
  internal). Change the page's words and these files in the same commit; `test/discover.test.mjs` checks them.
- **No canonical link** while `/` and `?lang=en` are one file: `hreflang` names both instead.

## 6. Layout and testing

- **Phones first:** checked at 320 × 568 and 390 × 844, with ก+ (larger text), in light and dark mode; no horizontal scroll, **of the page or of the 3-day table inside its box** (0.3.0 hid tomorrow at 320 px with ก+, review S5); every tap target ≥ 44 px **wide and tall** (the smoke test measures both since 0.4.0; it measured height only and missed V28); text at 4.5:1 or more (U18).
- **Walk the clock.** The fixture walk pins 02:50 in Bangkok, when every window still holds an afternoon. A change to anything with a day or a window is also walked in the evening (`npm run smoke` has an 18:30 page since 0.4.0) and read at noon: the evening's false "danger heat" (S6) lived from 0.2.0 to 0.4.0 because nobody looked after 16:00.
- **The list is sorted by concern** (0.7.0, the owner's brief, D-061; `assess.byConcern`), **grouped by the scale's own
  words**: each row by the worse of today's level and its coming days' (`assess.listLevel`; a coming day is a forecast,
  so เตรียมตัว at most unless TMD's notice covers it), highest first; then no data (never calm, so above the calm ones);
  then ยังไม่น่าห่วง; ties by today's level, then the fixed order (`assess.ORDER`). A row placed by a coming day says so
  on its face ("พรุ่งนี้ เตรียมตัว"). **The verdict's colour stays today's.** Until the sources settle the rows keep the
  fixed order with no groups (nothing moves under a finger). UV's day peaks are information, not a level (redesign
  audit R1, R2, R5, R8).
- **A model value says so on its face** where it asks for attention (ติดตามไว้ and above) and in the hero: "พยากรณ์",
  "ค่าประมาณ", "แบบจำลอง" (rule 3; audit R10); every row's sources fold says it for the rest.
- **ⓘ is always a button** that shows its text; never a decorative glyph (audit R9). `[hidden]` always wins over a
  component's own `display`.
- **Progressive disclosure, with a floor** (0.7.0, D-062): the first screen holds the place, the hero (the level, the
  worst hazard in the agency's word and value, the sourced action, "ข้างหน้า", what is missing) and the start of the list.
  A row opens in place for its lines, days, method note, sources and links; the 3-day table and the long-term profile
  are folded; a source is one ⓘ away. **Never folded:** an official warning (its own block under the hero, with its
  instruction), the list of what is missing, the level of every hazard. Touch has no hover: no tooltips, ⓘ buttons.
- **The site's own graphics** (0.7.0, D-062): icons from the sprite in `index.html` (one line weight on a 24 px grid),
  never emoji in the interface; a level is drawn as **the staff gauge** (four segments filled from the bottom, blue,
  yellow, orange, red; dashed for no data), so it reads by height as well as colour, with its word as its label. Data
  words from `assess.js` may start with an emoji (the share text goes to LINE as text); the page draws its icon instead
  (`main.rich`).
- **The site's own font, self-hosted:** Anuphan (Cadson Demak, SIL OFL 1.1, `public/fonts/`), Thai and Latin subsets,
  54 KB for every weight; no font request leaves the site. A new weight or face needs its licence beside it.
- **Two columns from 960 px** (the place and hero on the left, the list on the right; not sticky: a long notice must scroll); one column below, 680 px at most.
- **Before a change is done:** `npm test` (unit tests on saved live responses) and `CHROME_PATH=/opt/pw-browsers/chromium npm run smoke` (the visitor walk on fixtures, the clock pinned to 23 Oct 2026 19:50 UTC); for source or wording changes also `npm run smoke -- --live` and read its output as a visitor would.
- **A new source gets:** a fixture saved from a live call, a parser with a unit test (including its missing-value codes and its time rule), a row in [SOURCES.md](SOURCES.md), and its credit line.
- **Bump `?v=`** on `css/app.css` and `js/main.js` in `index.html` and in `sw.js`'s `SHELL`, `VERSION` in `main.js` and `sw.js`, and `package.json` (and `package-lock.json`) with every release.
- **The first screen of a 360 × 640 phone inside LINE shows the verdict** (smoke check, KI-F23; since 0.7.0 the list
  starts on it too), and no level shows before the forecast, air quality and warnings have answered or 5 s have passed (KI-F24).
- **A page string that describes data must match what the cells show** (KI-F26: the rain row said "mm" for a year of chance words).
- **Every module the page imports is in `sw.js`'s `SHELL`** (one missing file kills the page offline: the visitor audit's V3); `test/audit.test.mjs` walks the imports and fails otherwise.
- **Each audit finding that is fixed gets a test** named after its ID (`test/audit.test.mjs`: "M5/V2: …").
- **Walk the device too** (device study, 0.6.0): site data blocked, LINE without Web Share, the place kept in the
  address bar, an offline link with a query; the smoke walk checks the first and third since 0.6.0. A new module is
  also a `<link rel="modulepreload">` in `index.html` (Slow 3G loaded the graph in 5 serial round trips, T5).
- **Check a new rule on today's real data before it ships** (0.6.0): the first look-ahead version passed every fixture
  test and turned Lat Phrao orange from a sluice gate 12.6 km away; a nationwide count of how many subdistricts a rule
  fires at, read line by line, caught it and a contradiction at Palian.

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
- **Never on FloodWatch's server; a shared host only with the owner's yes (D-040, amended by D-045):** the stack never
  runs on FloodWatch's production machine: it shares this app's sources (ThaiWater's per-IP limit, KI-029), its
  `.env` was copied once, and its tunnel token must never run here. Another app's host is allowed when the owner says
  so and that app calls none of this app's sources, shares no `.env` and no tunnel: since 24 Oct 2026 the collector
  runs on `autobahn-bot` beside BrainPlatform, bound to 127.0.0.1, read-only, non-root, never touching its
  containers. Run `npm run preflight` before the first `docker compose up` on any host; it fails where FloodWatch runs
  and warns about any other app's containers.
- **Re-issue, don't copy (D-041):**
  - A new server gets a fresh `.env` from `.env.example`, with tokens made for this project.
  - A changed token goes into `.env` only; nothing in git changes.
  - An old token that another app may use is revoked only after checking that app.
- **The zone's robots.txt is the owner's** (KI-045): Cloudflare puts its managed block (AI training crawlers refused,
  `Content-Signal: search=yes,ai-train=no,use=reference`) above `public/robots.txt`. Ours only adds `/data/live/` and
  the sitemap; never try to undo the zone's block from the file.
- **Live calls:** one live walk and one cross-check per change, never loops (ThaiWater limits per IP, KI-029). Layout
  probes block ThaiWater (`page.route(/thaiwater/, …)`): they don't need it.

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

# Device simulation: LINE's in-app browser, tablets, accessibility settings, slow links (24 Oct 2026)

The owner asked for "a real-phone test inside LINE: you can simulate to test yourself, also think about tablet". No
phone was available, so this is a **simulation in headless Chromium**. It answers what a simulation can answer, and §4
lists what only a real phone in LINE can show. Findings are numbered T1–T16. Severity follows
[KNOWN_ISSUES](../KNOWN_ISSUES.md): **high** could mislead someone about a hazard, **medium** is a gap or a wrong detail,
**low** is polish.

## 1. Summary

- **Inside LINE the page holds up.** At every LINE-sized screen tried (360 × 560, 375 × 553, 393 × 700, 360 × 512 and
  320 × 480), the verdict's level word is on the first screen. Nothing scrolls sideways and every tap target is at
  least 44 × 44. LINE's iOS and Android user agents are both recognised. Every GPS failure offers
  `?openExternalBrowser=1`, keeping `?lang=` and the `#t=` place. The LINE button and the copied link carry the
  subdistrict code, never coordinates.
- **No high findings.** Nine are medium:
  - Four are silent failures on paths LINE users are more likely to hit: share with no clipboard (T2), save when
    `prompt()` is blocked (T3), GPS denied with advice that names "the browser" (T4), and a page that dies when
    storage access throws (T1).
  - T5: slow links leave a shared link looking like the empty welcome page for 12–17 s.
  - T6: Cloudflare sets a one-year `cf_clearance` cookie, against GUIDELINES §2.
  - T7: the service worker can't open `?openExternalBrowser=1` or `?lang=en` URLs offline.
  - T8: large system text pushes the verdict off the first screen and makes the sticky header tall.
  - T9: after a tile tap the address bar no longer holds the place, so LINE's own Share menu sends a placeless link.
- **Tablets work but waste space.** The page is a 720 px phone column on every tablet. Landscape uses 53–64 % of the
  width. The PM2.5 tile's value spills out of its tile from 560 to 700 px, and on every tablet with ก+ (T12, T13).
- **Passed:** contrast in light and dark (0 text runs below AA), reduced motion, forced colours, keyboard order and focus
  rings, Fast 3G, offline after one visit (in a new session), and the edge without the collector. That last case is
  never calm: warnings are named as unchecked and fire as missing. The live walk passed too: Bangkok by GPS, then Hat
  Yai by search. §3 has the details.

## 2. How it was done

- **Code:** commit `ff4b126` (v0.5.0). `index.html` is excepted: the edge serves it re-encoded, with Cloudflare's script
  injected (T6), so it can't be compared byte for byte. Every other file compared (`js/main.js`, `js/assess.js`,
  `css/app.css`, `sw.js`) is identical to what https://risk.autobahn.bot serves.
  - Another session was changing the working tree during this run (0.6.0: `fwLive`, `rain3d`). The simulations
    therefore served a `git archive` snapshot of HEAD's `public/`, not the working tree.
  - Every file:line below is HEAD's.
- **Browser:** Chromium 1217 (`/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`) with playwright-core
  1.56.1. WebKit is not installed, and no browser was installed for this run.
- **Approach:** the same as `tools/smoke.mjs`. The fixtures of `test/fixtures` (23 Oct 2026) serve every agency, and
  the clock is pinned to 2026-10-23 19:50 UTC.
- **LINE's user agents** (tokens as `ua-parser-js` 1.0.40 matches them: `safari (line)/` on iOS, `line/x/iab` on
  Android; LINE numbers its 2026 releases 26.x):
  - Android: `… Chrome/141.0.7390.122 Mobile Safari/537.36 Line/26.8.0/IAB` with `; wv)`.
  - iOS: `… Mobile/15E148 Safari Line/26.8.0`.
  - Old Android: `Android 8.1 … Chrome/95 … Line/13.4.2/IAB` at 320 × 480.
- **Screen sizes in LINE:** the viewport left after LINE's header and footer bars. LINE's docs confirm the bars but
  give no heights, so these are estimates.
- **Tablets:** iPad mini 744 × 1133, iPad 820 × 1180, iPad Pro 1024 × 1366 and an Android tablet 800 × 1280, each in
  portrait and landscape.
- **The edge** (https://risk.autobahn.bot, Cloudflare) was used for the service worker and the missing `/data/live/`:
  - Every agency was mocked from the fixtures.
  - Chromium ran with `--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE risk.autobahn.bot`, so nothing could reach
    ThaiWater even if a request escaped the mocks.
  - "Offline" relaunches the same profile with every host unresolvable. Playwright's `setOffline` does not reach the
    service worker's own fetches (an uncached URL came back 200 "from SW"), and route mocks keep answering, so it
    couldn't be used.
- **One live walk**, no mocks and no pinned clock, on 24 Oct 2026 at 20:40 UTC (03:40 Bangkok):
  - Bangkok by GPS (13.7563, 100.5018), then "หาดใหญ่" by search. Two loads in total.
  - ThaiWater answered 200 to all four requests.
- **Scripts and logs** are in the session scratchpad
  `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/`: `harness.mjs`,
  `line.mjs`, `tablet.mjs`, `spill.mjs`, `a11y.mjs`, `net.mjs`, `waterfall.mjs`, `edge2.mjs`, `live.mjs`,
  `storage.mjs`, `recipient.mjs`, and a `.log` file for each. Screenshots are in its `shots/` folder.

## 3. Findings

| ID | Sev. | Device, settings | What a visitor sees | Cause | Screenshot |
|---|---|---|---|---|---|
| T1 | medium | Any phone with site data or cookies blocked (Chrome "Block all cookies", Safari "Block All Cookies"), where `window.localStorage` access throws | A shared `#t=` link opens on the bare welcome page. 📍 then shows an empty grey verdict bar forever: no tiles, no cards, no message | `places.js:164,167,173` default `store = globalThis.localStorage` is evaluated outside the `try`. The throw at `main.js:490` (`renderSaved()`) stops the module before `fromHash()`. `sources.js:69,79` `typeof sessionStorage` also throws inside `get()`, so no source ever answers | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/storage-throw.png` |
| T2 | medium | LINE Android (Android WebView has no Web Share), clipboard write refused or `navigator.clipboard` missing | Tapping "↗ แชร์" does nothing: no sheet, no copy, no message | `main.js:442-444`: no Web Share → `navigator.clipboard.writeText`. Any failure lands in `catch {}` labelled "the person closed the share sheet" | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-share-noclipboard.png` |
| T3 | medium | An in-app WebView whose app doesn't implement JS prompts. WKWebView returns `null` when the app has no text-input-panel delegate; whether LINE iOS implements one is **[unverified]** | "☆ บันทึก" stays ☆. Nothing is saved, and nothing says why | `main.js:415-416` `window.prompt`, then `if (name == null) return;` | — (no visible change; `line.log` L6) |
| T4 | medium | LINE (both), location refused. Inside LINE that is LINE's own app permission | "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง **เปิดสิทธิ์ตำแหน่งในเบราว์เซอร์** หรือพิมพ์ค้นหาแทน" + "เปิดในเบราว์เซอร์ของเครื่อง". LINE's in-app browser has no site settings to open | `i18n.js:40` `geoDenied`, used at `main.js:86` for every browser | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-geo-deny.png` |
| T5 | medium | LINE Android 360 × 560 on DevTools' Slow 3G (2 s RTT, 50 kB/s) | First paint at 4.2 s. The 📍 button does nothing until 11.9 s. A shared `#t=` link shows the plain welcome page ("ใช้ตำแหน่งของฉันตอนนี้") until 12 s, names the place at 17.1 s and gives the verdict at 19.9 s. Fast 3G: 3.4 / 4.9 / 5.7 s | The module graph loads in 5 serial round trips: `index.html` → `main.js` → 7 modules → 6 → `calibration`/`heat` at 11.7 s (`index.html:112`, no `modulepreload`). `data/tambon.json` (158 kB gzip) starts only after that (`main.js:67-68`). Nothing in the static HTML says a shared place is opening. Extends KI-016 | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/net-slow3g-shared-link-6s.png` |
| T6 | medium | Every visitor of the edge | Invisible. Cloudflare injects a hidden 1 × 1 iframe and `/cdn-cgi/challenge-platform/…/jsd/main.js` into every HTML response. Its `oneshot` call sets **`cf_clearance`** (HttpOnly, expires 2027-10-24). That is three extra requests, one of them a 302. GUIDELINES §2 says "no cookies"; the About text says "เว็บนี้ไม่เก็บข้อมูลใด ๆ ของคุณ" | The `autobahn.bot` zone's Bot Fight Mode / JavaScript detections (zone setting, not repo code) | — (`edge2.log` E7; `curl -s --compressed https://risk.autobahn.bot/ \| tail -c 900`) |
| T7 | medium | Phone browser after LINE's "เปิดในเบราว์เซอร์ของเครื่อง", reopened offline. Also any `?lang=en` link | `/?openExternalBrowser=1#t=…` and `/?lang=en#t=…` show the browser's offline error page. `/` and `/#p=…` open from the cache | `sw.js:15` `caches.match(e.request)` matches the query string, so `/?openExternalBrowser=1` never matches the cached `./` | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/edge-offline-_openExternalBrowser_1_t_100101.png` |
| T8 | medium | LINE Android 360 × 560 with the phone's font size at 200 %. Simulated as WebView text zoom; whether LINE's WebView follows the system font scale is **[unverified]** | The sticky header grows to 137 px (24 % of the screen). The place name wraps to 4 lines. The verdict's level word ends at 653 px, below the 560 px screen (the KI-F23 rule). The 3-day table is 308 px in a 306 px box. With ก+ on top: the table overflows by ~24 px, the place name runs 23 px off-screen, and the page scrolls 78 px sideways. 130 % and 150 % pass | `app.css:27` `position: sticky` header, whose brand wraps. `app.css:65` `.place-name` has no `overflow-wrap`. Table cells at `app.css:116` | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/a11y-textzoom-200.png`, `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/a11y-textzoom-200-bigger-table.png` |
| T9 | medium | LINE (both): the in-app browser's ⋯ → Share / Copy link | After a tile or chip tap the address bar holds `https://risk.autobahn.bot/#card-pm25`. After 📍 it holds `/`. A friend who opens either link sees the welcome page, not the place (checked on the edge, `recipient.log`) | `main.js:249` tiles are `href="#card-…"`, which replace `#t=`. `main.js:107-111` sets the hash only for a subdistrict or a search, never after GPS. Extends V37 (KI-027) | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/edge-recipient-after-a-tile-tap.png`, `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/edge-recipient-after-GPS.png` |
| T10 | low | Edge, service worker installed, online or offline | `https://risk.autobahn.bot/index.html` → `net::ERR_FAILED` (Chrome's error page) | `sw.js:6` caches `index.html`, which the edge answers with a 307 to `/`. The cached redirected response is then served to a navigation | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/edge-offline-index_html.png` |
| T11 | low | 200 % page zoom (Safari/Chrome; CSS viewport 195, 180, 160 px). LINE landscape (≈ 740 × 300) | 195 px: the 3-day table needs a sideways scroll inside its box (176 in 141 px), and the page overflows 8 px. 160 px: overflow 44 px. The sticky header is 108–137 px (26–48 % of the screen). In LINE landscape the 64 px header is 21 % of the screen | `app.css:27` sticky header. `app.css:110` table `width: 100%` with three fixed columns | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/a11y-zoom-195.png`, `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-landscape-640x300.png` |
| T12 | low | 560–700 px wide (phones in landscape, small tablets) and every tablet ≥ 740 px with ก+ | The PM2.5 tile's "30.1 µg/m³" runs out of its tile into the next one: by 29 px at 560 and 13 px at 640; with ก+, by 48 px at 560 and 16 px at 744–1024. On an iPad with ก+ it reads "30.1 µg/m", the ³ hidden under the next tile. 320 + ก+: 5 px | `assess.js:137` joins value and unit with ` ` (KI-027's fix). Tiles go to 5 columns at 560 px (`app.css:150`), and `.tv` (`app.css:155`) can't wrap | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/spill-744-bigger.png`, `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-landscape-640x300-scrolled.png` |
| T13 | low | Tablets, especially landscape | The page is the same 720 px column everywhere. Landscape uses 53 % (iPad Pro), 56 % (Android) and 61–64 % (iPad, iPad mini) of the width. No card is on any tablet's first screen. The 133 px tiles break "ความ/ร้อน" and "แผ่นดิน/ไหว". The page is 5,574 px tall at every size. Line lengths are fine: median 28, max 80 graphemes, 44 em | `app.css:35` `main { max-width: 720px }`; `app.css:89` 2 card columns; `app.css:150` 5 tile columns | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/tablet-ipad-pro-landscape-first.png` |
| T14 | low | LINE, approximate location (Android "Approximate", iOS "Precise: Off"), ±5 km | The headline names one subdistrict ("แขวงบวรนิเวศ …") with only "(±5.0 กม.) · ไม่ใช่ตำบลนี้?" in small text. Nothing says the subdistrict may be wrong or how to turn on precise location for LINE | `main.js:209-210` shows the ± but treats the fix like a precise one (and KI-006) | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-geo-approx.png` |
| T15 | low | LINE, location never arrives (services off, indoors) | "กำลังหาตำแหน่ง…" for 15 s. The 📍 button stays live with no busy state, so another tap starts another request. Then the failure message and the LINE hint appear | `main.js:80-91`, `timeout: 15000`, no `disabled` or `aria-busy` on `#gps` | `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentD/shots/line-geo-timeout-waiting.png` |
| T16 | low | Code reading only: the collector runs, but `warnings.json` is missing from its index | On a page where all ten tiles are at the lowest step, the verdict would say "ทุกเรื่องอยู่ในระดับต่ำสุดของหน่วยงาน ณ ตอนนี้" right above "ยังไม่มีข้อมูล: ประกาศเตือนภัย". It can't happen on today's edge: with no collector the fire tile is missing too, so the page says "บางเรื่องยังไม่มีข้อมูล" | `assess.js:579` `complete` counts tiles only, not the warnings; `main.js:234` picks `allQuiet` from it | — |

### Suggested fixes

- **T1:**
  - In `places.js`, read the store inside the `try`: `const s = store ?? safeLocal()`, where `safeLocal` wraps the
    `globalThis.localStorage` access.
  - In `sources.js`, wrap the `sessionStorage` probe in a `try`.
  - Add a smoke step with throwing storage getters, as `line.mjs` §7 does.
- **T2:**
  - Never fail silently. On a clipboard error, show the link in `#finder-msg` as selectable text ("กดค้างเพื่อคัดลอก")
    or fall back to `document.execCommand("copy")` from a hidden field.
  - Inside LINE (`/\bLine\//`), the "แชร์" button could simply do what "ส่งใน LINE" does.
- **T3:** replace `window.prompt` with an inline name field under the Save button: a prefilled input, then OK. That also
  suits ก+ and Thai keyboards. If the field is cancelled, save under the default name and say so.
- **T4:** inside LINE, word the refusal for LINE: "LINE ยังไม่ได้รับอนุญาตให้ใช้ตำแหน่ง: ตั้งค่าเครื่อง > LINE > ตำแหน่ง
  หรือเปิดในเบราว์เซอร์ของเครื่อง หรือพิมพ์ค้นหาแทน". The wording needs a native reviewer (A5).
- **T5:**
  - Add `<link rel="modulepreload">` for all 17 modules in `index.html`, and keep them in `sw.js`'s `SHELL`.
  - Preload `data/tambon.json` (`<link rel="preload" as="fetch" crossorigin>`) when the hash is `#t=`.
  - A 3-line inline script can hide `#welcome` and show "กำลังเปิดพื้นที่ที่ส่งมา…" as soon as the hash is `#t=` or
    `#p=`.
  - Estimate: JavaScript ready at about 5–6 s instead of 11.9 s on Slow 3G.
- **T6:** an owner decision (zone-wide on the Free plan; Bot Fight Mode can't be scoped to one hostname):
  - either turn off Bot Fight Mode / JavaScript detections for `autobahn.bot` (Security → Bots);
  - or disclose Cloudflare's security cookie in the About text and GUIDELINES §2.

  Record it as an OWNER_ACTIONS item.
- **T7:** for `e.request.mode === "navigate"`, answer `caches.match("./")` (or `{ ignoreSearch: true }`) when the
  network fails.
- **T8:**
  - Make the header non-sticky when it grows or the screen is short, e.g.
    `@media (max-height: 520px) { .top { position: static } }`, or use a JS check of
    `.top.offsetHeight > 80`.
  - Let the brand shrink (`font-size: clamp(...)`, or hide "ภัยรอบบ้าน" behind the icon when it would wrap).
  - Add `overflow-wrap: anywhere` to `.place-name`.
  - Let the table's day headers wrap at large text.
- **T9:**
  - Keep the place in the URL: `history.replaceState` to `#t=<code>` after a GPS fix too. It is the same subdistrict
    code `shareUrl()` already sends.
  - Make tiles and chips scroll with `scrollIntoView()` and keep the hash. Focus the card (`tabindex="-1"`) so screen
    readers follow.
- **T10:** drop `"index.html"` from `SHELL`, or cache `new Response(r.body, r)` without the redirect flag.
- **T11:** see T8. Also let the 3-day table drop to one day per row below ~260 px of content width.
- **T12:** `.tv { overflow-wrap: anywhere }`, or use 5 tile columns only from ~760 px
  (`repeat(auto-fit, minmax(140px, 1fr))`), or put the unit in its own `<small>` that may wrap.
- **T13:** from ~1000 px, a wider `main` (≈ 1000–1100 px) with the verdict and tiles beside the 3-day table, and three
  card columns. Not urgent: the 720 px column reads well.
- **T14:** when `accuracy > 2000` m, add "ตำแหน่งโดยประมาณ ±5 กม. ตำบลอาจไม่ตรง" and how to allow precise location
  for LINE.
- **T15:** set `#gps` to `aria-busy="true"` and `disabled` while locating, show a countdown or a "ยกเลิก" link, and
  consider `timeout: 10000`.
- **T16:** set `complete` only when the warnings were read, or pick `quietSoFar` whenever `missing` is non-empty.

## 4. What passed

- **LINE screens** (360 × 560, 375 × 553, 393 × 700, 360 × 512 Android; 320 × 480 old Android):
  - no horizontal scroll, nothing pushed sideways, every tap target ≥ 44 × 44, no page errors;
  - the verdict's level word ends at 256 px, the action line at 383 px;
  - the first visit shows 📍 and search above 200 px.
- **ก+ at 360 × 560 and 320 × 480:** the verdict word ends at 277 and 313 px, and nothing goes sideways.
- **LINE detection:**
  - iOS `Safari Line/26.8.0` and Android `Line/26.8.0/IAB` both match `/\bLine\//` (`main.js:96`).
  - Every GPS failure inside LINE (refused, timeout, unavailable, no geolocation) adds one "เปิดในเบราว์เซอร์ของเครื่อง"
    link, even after repeated failures.
  - The link keeps `?lang=en` and `#t=100101`, giving `?lang=en&openExternalBrowser=1#t=100101`.
  - No link appears outside LINE.
- **Sharing:**
  - with Web Share, the sheet gets `#t=100107`;
  - without it, the clipboard gets "ภัยรอบบ้านที่ แขวงบวรนิเวศ … เตรียมตัว · ความร้อน: ระดับอันตราย …/#t=100107", and
    "คัดลอกลิงก์แล้ว" shows;
  - the LINE button calls `window.open("https://line.me/R/share?text=…", "_blank", "noopener")` with the `#t=` link and
    no coordinates.
- **Privacy:** no coordinates on screen for a precise or a ±5 km GPS fix.
- **Missing APIs:**
  - with no service worker (iOS WKWebView outside App-Bound Domains), there's no error;
  - with `localStorage` = `null` (Android WebView with DOM storage off), the page works.
- **Tablets** (8 orientations, plus iPad mini with ก+ and the Hat Yai warning):
  - no horizontal scroll, the 3-day table fits (666 / 666), tap targets ≥ 44, no page errors;
  - 5 tile columns and 2 card columns;
  - median line 28 graphemes, max 80.
- **Contrast:** 0 text runs below WCAG AA in light and dark mode. Checked on Bangkok and on the Hat Yai TMD warning page
  with every `<details>` open, and on the dark welcome page with the LINE location message.
- **Reduced motion:** no animations or transitions; `scroll-behavior: auto`.
- **Forced colours** (light and dark): borders and fills go to system colours and the no-data hatch disappears. Every
  tile keeps its ●○ meter and its word, so no level is lost.
- **Keyboard:**
  - 40 Tab stops in reading order: header, verdict chip, actions, tiles, card links, hotlines, About;
  - every stop shows the 3 px ring, and no hidden control takes focus;
  - after Enter on a tile, the next Tab lands inside that card.
- **Fast 3G:** the 📍 button works at 3.4 s, a shared place is named at 4.9 s, and the verdict comes at 5.7 s. The
  shared link transfers 234 kB.
- **The edge without the collector** (`/data/live/index.json` → 404, checked live): the page shows "ตรวจประกาศเตือนภัย
  ของกรมอุตุฯ ไม่ได้ตอนนี้ ดูที่ tmd.go.th หรือ LINE ALERT". The fire tile says "ไม่มีข้อมูล". The verdict lists
  "ยังไม่มีข้อมูล: ไฟป่า, ประกาศเตือนภัย". Never calm (KI-003 as documented).
- **Offline after one visit** (new session, every host unresolvable):
  - The service worker had installed `dn-0.5.0` with all 23 shell entries.
  - The shell and the subdistrict table open the shared place.
  - The verdict says "ยังไม่มีข้อมูลพอ" and lists all ten hazards and the warnings as missing.
  - Every card says "ดึงข้อมูลไม่สำเร็จ" or "ยังไม่มีข้อมูล". No tile shows a number, and there are no page errors.
- **The live walk** (03:40 Bangkok, LINE Android, 360 × 560):
  - **Bangkok by GPS:** แขวงบวรนิเวศ; "เตรียมตัว · ความร้อน: ระดับอันตราย · บ่ายนี้ รู้สึกเหมือน 43 °C"; PM2.5 17.7 at
    สำนักงานเขตพระนคร (0.9 km); อโศก (คลองแสนแสบ, 6.7 km) 107 cm below the bank.
  - **Hat Yai by search:** ต.หาดใหญ่ (`#t=901101`); "เตรียมตัว · ความร้อน: ระดับเตือนภัย · 38 °C", rain "ติดตามไว้".
    Flood is "no data", because no gauge reports within 8 km (บางกล่ำ is at 8.8 km).
  - Both pages: the verdict word is on the first screen (300 and 226 px) and no coordinates are shown.
  - Every agency answered 200, ThaiWater included. The only console errors were the two expected `/data/live/` 404s.

## 5. Limits: what only a real phone in LINE can show

- **WebKit was not run.** Every iPhone and iPad result above is Chromium wearing an iOS user agent. LINE iOS uses
  WKWebView, so these are untested:
  - WebKit's Thai line breaking and the Thonburi font;
  - `prompt()` (T3), Web Share and `navigator.clipboard`;
  - the geolocation prompt;
  - `position: sticky` under LINE's bars.
- **LINE itself:**
  - the real header and footer heights, and LINE's own font-size setting;
  - whether its Android WebView applies the system font scale (T8);
  - pull-to-refresh and the back button;
  - `target="_blank"` and `tel:` links;
  - how LINE's chat link-preview and linkifier treat `#t=` / `#p=` URLs;
  - whether `openExternalBrowser=1` also works when the page navigates from inside the in-app browser. LINE's docs say
    the parameter works "for all URLs accessed from the LINE app"; the only field test found (Classmethod, 2024) tapped
    links in chats and rich menus, not links inside the in-app browser.
- **The LINE 26.7.x bug:** buttons didn't respond (iOS 26.7.0–26.7.1, Android 26.7.0, fixed in 26.7.2 / 26.7.1;
  roboin.io, 29 May 2026). It can't be reproduced here.
- **Geolocation** outcomes were injected (permission states and overridden `getCurrentPosition`). LINE's OS-level
  location dialog and real fix times were not exercised.
- **Network:** throttling is DevTools-style on a local HTTP/1.1 server with gzip. The edge uses HTTP/2 or 3 and brotli,
  which parallelise better but don't remove T5's dependency chain. Real 3G loss and handovers were not simulated.
- **Accessibility:** forced colours is Windows' model. Android's high-contrast text, iOS Increase Contrast and Smart
  Invert, TalkBack and VoiceOver were not tested.
- **Storage:** blocking was simulated with throwing getters. Each browser's exact behaviour with cookies blocked varies.

So OWNER_ACTIONS A4 still stands: an Android and an iPhone, from a LINE chat. Tap 📍 (allow, then deny), tap แชร์ and
บันทึก, and send the link to a family group.

## 6. Sources

- LINE Developers, "Using LINE URL scheme": `openExternalBrowser=1`, `openInAppBrowser=0`, `line.me/R/share`
  (https://developers.line.biz/en/docs/line-login/using-line-url-scheme/).
- LINE Developers, "Differences between the LIFF browser and LINE's in-app browser": the in-app browser has a header and
  a footer (https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-line-in-app-browser/).
- Classmethod DevelopersIO:
  - "LINE 内で開く URL を外部ブラウザで開く方法", 31 Jul 2024
    (https://dev.classmethod.jp/articles/line-open-uri-in-external-browser/);
  - "LIFFブラウザとLINE InAppBrowserにおけるUser-Agentの違い", 18 Aug 2025: an iOS UA ending "Safari Line/15.12.1"
    (https://dev.classmethod.jp/articles/liff-vs-line-inappbrowser-user-agent/).
- `ua-parser-js` 1.0.40, `src/ua-parser.js`: `/safari (line)\/([\w\.]+)/i` (iOS), `/\b(line)\/([\w\.]+)\/iab/i`
  (Android).
- roboin.io, 29 May 2026: LINE 26.7.x in-app browser button bug
  (https://roboin.io/article/2026/05/29/why-buttons-dont-work-in-lines-in-app-browser/).
- Web Share in Android WebView: not implemented. Chromium's Intent to Ship (Android only), and the B4X and OutSystems
  notes.
- Service workers in WKWebView: only for App-Bound Domains. Apple Developer Forums threads 773539 and 745615, and WebKit
  bug 206741.
- Cloudflare docs: Bot Fight Mode is switched off in Security → Bots and can't be skipped by WAF rules or Page Rules
  (via search results; the exact `cf_clearance` behaviour is as observed here).

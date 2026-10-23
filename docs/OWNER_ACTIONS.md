# What needs the owner

Things only the owner can decide or do. Each has why, the steps and how to check it. Newest first within each group.

## A. To go live

| # | What | Why | Steps | Done when |
|---|---|---|---|---|
| A1 | **Choose the host and the address** | nothing is deployed; the session had no deploy access (the Cloudflare connector wasn't authorised) | Cloudflare Pages project `disaster-now` on the `autobahn.bot` zone (suggested `now.autobahn.bot`), or GitHub Pages; [DEPLOY.md §1](DEPLOY.md#1-the-page) | the URL opens on a phone and `curl -sI` shows `permissions-policy: geolocation=(self)` |
| A2 | **Choose the name** | "ภัยรอบบ้าน ตอนนี้ / Disaster Now" is a placeholder; avoid a name that looks like an agency's; one name family with บ้านรอดไหม and FloodWatch would help trust ([INTEGRATION.md §5](INTEGRATION.md#5-one-family-one-look)) | tell the next session; it changes `brand` in `public/js/i18n.js`, the manifest and the title | — |
| A3 | **Run the collector** | without it the page has no TMD warnings, TMD quakes and storm tracks, or fire hotspots (those tiles say so) | one cron line on FloodWatch's server ([DEPLOY.md §2](DEPLOY.md#2-the-collector-toolscollectmjs)) | `data/live/index.json → generated` is within 15 minutes |
| A4 | **Test on real phones,** inside LINE too | headless Chromium is not a phone; GPS inside LINE's browser is undocumented; Air4Thai's broken certificate chain worked in Chromium but is untested on iPhones | Android and iPhone; open the link from a LINE chat; tap 📍, search, ก+, EN, save, share to LINE | each task of the UX scout's script ([research/ux-scout §6](research/ux-scout-2026-10-23.md#6-visitor-test-script-for-playwright-later)) passes on both phones |
| A5 | **A safety and language review** of the Thai copy | the advice lines come from บ้านรอดไหม (already queued for review there); the tiles' words are new | a native reader reads every tile in Thai at 320 px | KNOWN_ISSUES updated with the changes |

## B. Small changes in the owner's other apps ([INTEGRATION.md](INTEGRATION.md))

| # | What | Why |
|---|---|---|
| B1 | FloodWatch: **CORS on `/api/point`** for this site's origin | the flood tile would show FloodWatch's own answer with BMA's canals (this app sees 8 ThaiWater gauges in Bangkok; FloodWatch had 33 near the old town); then set `"floodwatchPoint": true` in `public/config.json` |
| B2 | FloodWatch: **CORS on `/api/geocode`** | Nominatim's 1-request-a-second limit is for the whole app; FloodWatch already throttles and caches to it; then `"geocoder": "floodwatch"` |
| B3 | FloodWatch: **reconsider the river rule** | C.12 read "ใกล้ล้นตลิ่ง" with 1.31 m of freeboard (92 % of bed-to-bank); change both apps together |
| B4 | บ้านรอดไหม: **link to this app** instead of building its N28 "around my home" | one codebase for live data |

## C. Data permissions and keys

| # | What | Why |
|---|---|---|
| C1 | **DMR's licence** for its ArcGIS hazard layers (landslide-risk villages, active-fault subdistricts) | their `copyrightText` is empty; the page queries them live (asked by Hazard-huntz too; ask กองธรณีวิทยาสิ่งแวดล้อม) |
| C2 | **May FloodWatch's GISTDA key be reused** here (in the collector only)? | GISTDA's flood frequency and drought index need a key; the page never holds one |
| C3 | **A TMD API key** | the 7-day forecast and the warning text; keyless XML covers phase 1 |
| C4 | **Ask ONWR** whether its flood-warning tiles may be used, and their heat-index unit and colours | ONWR's tiles give the official area flood warning today to +3 days ([research/sources gap 2](research/sources-2026-10-23.md#gap-2-flood-seen-by-satellite-flood-today)) |
| C5 | **A note to the PCD** about Air4Thai's missing intermediate certificate | it breaks every script and some browsers (Hazard-huntz docs/09 §3) |

## D. Decisions

| # | Question | The agent's recommendation |
|---|---|---|
| D1 | **The heat tile will be orange (เตรียมตัว) on most days** in Bangkok: TMD/DOH call a heat index of 33–41.9 °C "เตือนภัย", and the ensemble gave 37–39 °C for 24–26 Oct. Keep the agency's level (the rule "never milder"), or treat heat up to เตือนภัย as everyday care in the verdict? | keep it for now (both researchers agreed: the agency's word leads), and **count how many days the verdict is orange in the first month**; a page that is always orange gets ignored |
| D2 | **UV, rain and wind levels are the app's own groupings** of WHO's, TMD's and Beaufort's words (no agency grades them) | accept, with the reasons in KNOWLEDGE §3; review after a month |
| D3 | **Should the page count opens** (an anonymous event, no location)? | not now (no analytics, no cookies); if wanted, the same anonymous counter as บ้านรอดไหม |
| D4 | **Push warnings?** | not from this page: Web Push doesn't work inside LINE's browser and needs a server that keeps subscriptions (personal data under the PDPA); point to Cell Broadcast and LINE ALERT, which already warn (Hazard-huntz docs/09 §6) |

# What needs the owner

Things only the owner can decide or do. Each has why, the steps and how to check it. Newest first within each group.

## A. To go live

| # | What | Why | Steps | Done when |
|---|---|---|---|---|
| A1 | **Choose the host and the address** | nothing is deployed; the session had no deploy access (the Cloudflare connector wasn't authorised) | Cloudflare Pages project `disaster-now` on the `autobahn.bot` zone (suggested `now.autobahn.bot`), or GitHub Pages; [DEPLOY.md §1](DEPLOY.md#1-the-page) | the URL opens on a phone and `curl -sI` shows `permissions-policy: geolocation=(self)` |
| A2 | **Choose the name** | "ภัยรอบบ้าน ตอนนี้ / Disaster Now" is a placeholder; avoid a name that looks like an agency's; one name family with บ้านรอดไหม and FloodWatch would help trust ([INTEGRATION.md §5](INTEGRATION.md#5-one-family-one-look)) | tell the next session; it changes `brand` in `public/js/i18n.js`, the manifest and the title | — |
| A3 | **Run the collector** | without it the page has no TMD warnings, TMD quakes and storm tracks, or fire hotspots (those tiles say so) | `docker compose up -d --build` on the server runs it every 15 minutes ([SERVER.md](SERVER.md)); or one cron line ([DEPLOY.md §2](DEPLOY.md#2-the-collector-toolscollectmjs)) | `data/live/index.json → generated` is within 15 minutes |
| A4 | **Test on real phones,** inside LINE too | headless Chromium is not a phone; GPS inside LINE's browser is undocumented; Air4Thai's broken certificate chain worked in Chromium but is untested on iPhones | Android and iPhone; open the link from a LINE chat; tap 📍, search, ก+, EN, save, share to LINE | each task of the UX scout's script ([research/ux-scout §6](research/ux-scout-2026-10-23.md#6-visitor-test-script-for-playwright-later)) passes on both phones |
| A5 | **A safety and language review** of the Thai copy | the advice lines come from บ้านรอดไหม (already queued for review there); the tiles' words are new, and so are 0.2.0's quake words, "บ่ายนี้" and the rain words | a native reader reads every tile in Thai at 320 px | KNOWN_ISSUES updated with the changes |
| A6 | **Check Air4Thai from a host in Thailand** | the PCD's server answered HTTP 503 to the cloud host at every collector run on 23 Oct; browsers that refuse its broken chain then fall back to GISTDA's estimate (1.3× high) | run the stack on the Thai server; read `index.json → failed` | `air4thai.json` lists 170 or more stations |
| A7 | **Where the stack runs, and its public hostname** | the Docker stack is ready ([SERVER.md](SERVER.md)) and was tested in the session, not on a real server | FloodWatch's server is the natural home (port 8090 beside FloodWatch's 3000); add a public hostname to FloodWatch's tunnel or create one (`CLOUDFLARE_TUNNEL_TOKEN` in `.env`) | `curl -sI https://<host>/` shows `permissions-policy: geolocation=(self)` and no `set-cookie` |
| A8 | **The default branch** | the agent created `main` from its work branch (the repository had no `main`); the session can't change repository settings or delete branches | GitHub → Settings → Branches: default `main`; delete `claude/dazzling-goldberg-z8pq18` once merged; create the `v0.2.0` release (the session's git proxy refuses tag pushes, as in Hazard-huntz) | `main` is the default and has a `v0.2.0` release |

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
| D1 | **Heat makes the verdict orange on most days, and the tile says "อันตราย" on most afternoons.** The corrected heat index (MODELS §1) reads 42–44 °C in Bangkok in October; observed days reach ≥ 42 °C on 48 % of October days and 95 % of April days. 0.2.0 already stops a forecast at เตรียมตัว (never "ทำทันที" without a warning) and names the window ("บ่ายนี้"). Keep it so, or treat heat up to อันตราย as everyday care in the verdict (milder than the agency's word on the tile)? | keep it, and **count orange-verdict days in the first month**; the visitor audit's alternative (heat alone never above เตรียมตัว) is what 0.2.0 does; going further needs the owner |
| D2 | **UV, rain and wind levels are the app's own groupings** of WHO's, TMD's and Beaufort's words (no agency grades them) | accept, with the reasons in KNOWLEDGE §3; review after a month |
| D3 | **Should the page count opens** (an anonymous event, no location)? | not now (no analytics, no cookies); if wanted, the same anonymous counter as บ้านรอดไหม |
| D4 | **Push warnings?** | not from this page: Web Push doesn't work inside LINE's browser and needs a server that keeps subscriptions (personal data under the PDPA); point to Cell Broadcast and LINE ALERT, which already warn (Hazard-huntz docs/09 §6) |
| D5 | **May GISTDA's satellite estimate alone make the verdict orange or red?** Where no PCD station reports, GISTDA's estimate grades PM2.5; it ran 1.3× the stations (KI-009), and the visitor audit asked that it not raise the verdict alone (V9) | keep it grading (it is a Thai agency's published estimate, and "never milder than the agency" applies), with the card saying "ค่าประมาณ" and a late station's last reading beside it, as 0.2.0 does |

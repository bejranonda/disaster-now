# Running and developing ภัยรอบบ้าน · Thai Risk (`disaster-now`) on a server

Everything needed to put the collector (and a local copy of the page) on **a server of its own**, run it there, and keep
building on it. It follows the pattern of FloodWatch's server (docker compose, the app on localhost only), but **never on
FloodWatch's machine** (D-040). Visitors get the page from Cloudflare's edge ([CLOUDFLARE.md](CLOUDFLARE.md)); the server
runs the collector, which uploads its files to Workers KV, and a local copy of the page for checks.

**The move (24 Oct 2026):**
- 0.3.0's stack was set up on FloodWatch's production server by mistake.
- It now runs on **`autobahn-bot`**, which also runs BrainPlatform, by the owner's choice (D-045;
  [§2.5](#25-autobahn-bot-as-set-up-24-oct-2026)).
- The runbook is [§2](#2-the-risk-server-install-go-live-and-leave-floodwatchs-server).
- Nothing of this app runs on FloodWatch's server any more ([§2.4](#24-floodwatchs-server-cleaned-up-24-oct-2026)).

**Tested on 23 Oct 2026** in a cloud session with Docker 29 and compose v2:
- `docker compose up -d --build` built the image (node:22-alpine, 240 MB) and both containers reported healthy.
- `node tools/health.mjs --web http://127.0.0.1:8090/` returned ok.
- The collector's first run wrote 4 of its 5 files in 8 s: warnings 1, TMD quakes 10, storms 1, hotspots 306. Air4Thai answered HTTP 503, as it had all evening (KI-002).
- `docker compose stop collector` returned at once, with exit code 0.

**Tested on FloodWatch's server, 23 Oct 2026 (0.3.0, before the move):**
- The same stack ran on port 8090 beside FloodWatch's 3000, and both containers were healthy.
- The collector wrote **5 of 5 files in 13 s**, Air4Thai with 173 stations.
- With `AI_ENABLED=1`, GLM gave the live warning its English in 1 call, and 0 on the next run.
- Both health checks returned ok.

Two of those results belong to that host, not to the app: Air4Thai's 173 stations and ThaiWater's HTTP 429. Check
both again on the risk server ([§2.3](#23-install-and-go-live) step 7).

**Not tested:** the risk server itself (not set up yet) and the tunnel. If the tunnel is ever used, make a new one:
**never use FloodWatch's token**, which was in the copied `.env` (FRANK_FEEDBACK §5).

## 1. What runs

```
                 ┌──────────────────── the risk server (its own; never FloodWatch's) ─────────────────────┐
 visitors ──► Cloudflare ──► cloudflared (profile "public") ──► web :8080 ──► public/ (the page, static)
                 │               or the host's own proxy           ▲   │      public/data/live/ (read only)
                 │                                                 │   └── named volume "live" ◄──┐
                 │                                                 │                              │ writes
                 │                            collector: node tools/collect.mjs --every 900 ──────┘
                 │                              TMD CAP, TMD quakes, TMD storms, NASA FIRMS, Air4Thai
 the phone ──────┴──► Open-Meteo, GISTDA, ThaiWater, EMSC, USGS, GDACS, JMA, DMR  (directly, as before)
```

With the recommended Worker route, visitors reach the page at Cloudflare's edge, and the server's `web` serves only
local checks ([CLOUDFLARE.md §1](CLOUDFLARE.md#1-the-recommendation-frankly)). The diagram shows the fallback tunnel route.

| Piece | File | What it does |
|---|---|---|
| Image | `Dockerfile` | `node:22-alpine` with `public/` and `tools/` only; no npm packages at run time; runs as `node`; health check built in |
| Page server | `tools/serve.mjs` | static files from `public/`, applying `public/_headers` (the same file Cloudflare Pages reads); gzip over 1 KB; ETag/304; GET and HEAD only; hidden and `_headers` files refused; **logs nothing about requests** |
| Collector | `tools/collect.mjs --every 900` | the feeds a phone can't read (no CORS, or Air4Thai's broken chain); writes `data/live/*.json` atomically, plus `index.json` (what was written, when, what failed); a failed source keeps its old file; refuses to loop faster than every 600 s; stops cleanly on SIGTERM |
| Preflight | `tools/preflight.mjs` (`npm run preflight`) | is this host ready? Fails on a host that runs FloodWatch's containers, a missing `.env`, a missing deploy token or KV ids that differ between `wrangler.jsonc` and `.env`; warns on other apps' containers, a readable `.env`, names this project doesn't read (a copied file), a placeholder KV id. Read-only, prints no values |
| Health | `tools/health.mjs` | `--web URL` (the page answers with its title, the live index answers, the Permissions-Policy header) and/or `--live DIR --max-age S` (the collector wrote `index.json` recently); one JSON line; exit 0 or 1 |
| Stack | `docker-compose.yml` | `web` (127.0.0.1:${WEB_PORT:-8090}), `collector`, `cloudflared` (profile `public`); both app containers read-only with a tmpfs `/tmp` |
| Settings | `.env.example` → `.env` (git-ignored, mode 600) | `WEB_PORT`, `COLLECT_EVERY`, `CONTACT_EMAIL`, `PUBLIC_HOST`; optional GLM (`AI_ENABLED`, `GLM_*`, `AI_DAILY_CALLS`) and Workers KV (`CLOUDFLARE_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_KV_TOKEN`), each passed only to the collector; nothing is needed to run. `node tools/env-check.mjs` shows which are set without printing values |

The page itself still has **no server logic**:
- The phone calls most sources directly. The server only serves files and refreshes five of them.
- Nothing about a visitor is stored anywhere: no logs, no cookies, no positions (GUIDELINES §2).

## 2. The risk server: install, go live, and leave FloodWatch's server

### 2.1 What the server needs

- **Never FloodWatch's machine; another app's only with the owner's yes** (D-045), and only if that app calls none of
  this app's sources and shares no `.env` or tunnel. ThaiWater's and Open-Meteo's limits are per IP (KI-029, KI-011).
  `npm run preflight` fails on a host that runs FloodWatch's containers and warns about any other app's.
- **Software:**
  - Linux (Ubuntu or Debian), git, Docker with the compose v2 plugin.
  - Node 22 is recommended. Node 20 works too, and then `npm run cf:deploy` runs wrangler in Docker.
- **Disk:** about 1 GB (the image is 240 MB; `node:22-bookworm-slim`, about 330 MB, only with Node 20).
- **Network:** outbound HTTPS only. Nothing comes in: the collector pushes to Workers KV, and visitors go to Cloudflare.
- **Where:** the host's country matters little, since the page comes from Cloudflare's edge. Air4Thai, though,
  answered from FloodWatch's server in Germany (173 stations) and refused a cloud dev host (HTTP 503, KI-002), so
  check it there (§2.3, step 7).

### 2.2 The new `.env` (fresh, never copied)

`cp .env.example .env && chmod 600 .env`, then fill in values issued **for this project**. The old server's `.env`
held a Cloudflare token taken from FloodWatch's `.env`; it is being replaced. Delete that file with the old checkout (A11).

| Variable | Where it comes from |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` | the dashboard (account home; autobahn.bot → Overview). Not secrets. The zone is **autobahn.bot's**: the copied file had bejranonda.com's |
| `CLOUDFLARE_API_TOKEN` | **a new token** for deploying: Account → *Workers Scripts: Edit*, *Workers KV Storage: Edit*; Zone autobahn.bot → *Workers Routes: Edit*, *DNS: Edit* ([CLOUDFLARE §4](CLOUDFLARE.md#4-what-the-owner-does)) |
| `CF_KV_TOKEN` | **a second new token** with only *Workers KV Storage: Edit*. The collector gets this one and nothing else |
| `CF_KV_NAMESPACE_ID` | written by `npm run cf:setup` |
| `AI_ENABLED`, `GLM_API_KEY` | `1` and a GLM key of this project's own (OWNER_ACTIONS D6). Empty: the English page shows TMD's warnings in Thai |
| `CONTACT_EMAIL` | optional: a contact for agencies, in the collector's User-Agent |
| `TMD_API_KEY`, `GISTDA_*`, `GOOGLE_FLOOD_API_KEY`, `CLOUDFLARE_TUNNEL_TOKEN` | not used by 0.3.0: leave them empty (C2, C3) |

### 2.3 Install and go live

```
git clone https://github.com/bejranonda/disaster-now.git /srv/disaster-now && cd /srv/disaster-now
cp .env.example .env && chmod 600 .env       # §2.2: new values only
npm run preflight                            # 1. ❌ until the host and .env are right
npm ci && npm test                           # 2. 105 unit tests (0.7.0)
npx playwright@1.56.1 install --with-deps chromium                # 3. the same version as playwright-core
CHROME_PATH=<the chrome it installed under ~/.cache/ms-playwright> npm run smoke   # "all checks passed"
npm run env:check -- --probe                 # 4. token valid, zone visible, KV readable, "Workers deploy: allowed", GLM answers
npm run cf:setup                             # 5. KV namespace "disaster-now-live", its id into wrangler.jsonc and .env
git commit -m "chore: the KV namespace id" wrangler.jsonc   #    the id is not a secret
docker compose up -d --build && docker compose ps            # 6. both healthy after about a minute
node tools/health.mjs --web http://127.0.0.1:8090/
docker compose logs collector | tail         # 7. "kv: 7 files uploaded" (8 when the hourly rain is due); air4thai.json with 170 or more stations; floodwatch.json with 1,300 or more gauges
npm run smoke -- --live                      #    once, read as a visitor; ThaiWater's flood tile must not say 429
npm run cf:deploy -- --dry-run && npm run cf:deploy          # 8. the page and the Worker at risk.autobahn.bot
node tools/health.mjs --web https://risk.autobahn.bot/ --need-live   # 9. then a phone inside LINE, and the link in a chat
```

**Done when:**
- `npm run preflight` shows no ❌.
- `docker compose ps` shows both containers healthy.
- In `data/live/index.json`, `kv.ok` is true and `failed` is empty.
- `https://risk.autobahn.bot/` answers with `permissions-policy: geolocation=(self)`.
- A LINE chat shows the preview card.

Then write the host's facts into HANDOFF §4: its Node version, its Chromium path, and Air4Thai's and ThaiWater's
answers from it.

- **Docker Hub rate limit (HTTP 429 on `node:22-alpine`):** set `NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine` in `.env`. It is the same official image on Amazon's public mirror (used in the test above).
- **The volume:** the named volume `live` is created on the first `up` with the image's empty `data/live/` owned by `node`, so the collector can write and the page server only reads. `docker compose down -v` deletes it. That is harmless: the next run refills it.
- **Nothing to back up:** the stack is stateless. The repository is the source, and `live` is regenerated every 15 minutes; KV keeps the last upload while the server is down.

### 2.4 FloodWatch's server, cleaned up (24 Oct 2026)

After pushing everything to GitHub, the session that wrote this:
- **Removed** what was provably this project's:
  - the `disaster-now_live` volume (public data only);
  - the images `disaster-now:local`, `node:22-alpine` and `node:22-bookworm-slim` (no FloodWatch image is built on
    them, checked by layer);
  - its own scratch files.
- **Could not remove the checkout** `/root/disaster-now`, which still holds `.env` (the old token) and
  `.env.floodwatch-original` (a full copy of FloodWatch's `.env`). Claude Code's safety check stops an agent from
  deleting its own working directory, so this step is **the owner's** (OWNER_ACTIONS A11): `rm -rf /root/disaster-now`.
  Nothing in it is lost: `main` on GitHub has every commit, and the `.env` values are re-issued on the risk server.
- **Left alone:**
  - every `floodwatch-*` container;
  - FloodWatch's own `.env` and tunnel;
  - the Chromium in `/root/.cache/ms-playwright` (installed in May 2026, before this project).
- **The old Cloudflare token** came from FloodWatch's `.env`, so FloodWatch may still use it. Check FloodWatch's
  deploys before you revoke it (OWNER_ACTIONS A9).

### 2.5 `autobahn-bot`, as set up (24 Oct 2026)

| Step | Result |
|---|---|
| `npm run preflight` | no ❌; ⚠️ BrainPlatform's seven `deploy-*` containers (left alone), `.env` 644 (made 600), `CF_KV_TOKEN` empty, the placeholder KV id (fixed by `cf:setup`) |
| Node, Docker, Chromium | 24.14.0; 29.4.0 with compose; `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` |
| `npm test`, `npm run smoke` | 61/61 and 29/29 on arrival; 82/82 and every check at the 0.4.0 commit |
| `npm run cf:setup` | KV namespace `disaster-now-live` created, id in `wrangler.jsonc` and `.env` |
| `docker compose up -d --build` | both healthy; 127.0.0.1:8090 only; the collector's first run 5 of 5 files in 14 s, **Air4Thai 173 stations**, GLM 1 call for the live warning |
| ThaiWater | answered every call of the session's walks and audits (no 429) |
| `npm run cf:deploy` | dry run ✓; the deploy **refused** (403: the token lacks *Workers Scripts: Edit*), nothing created |
| KV uploads | not yet: `CF_KV_TOKEN` empty, and the compose file passes only that token to the collector |
| BrainPlatform | untouched; its web answered 200 in 13 ms with the session's research agents running (`nice -n 19`) |

**Next on this host:** after the owner's token (A9): `npm run cf:deploy`, then `docker compose up -d` (the collector
reads `CF_KV_TOKEN` at start), then `node tools/health.mjs --web https://risk.autobahn.bot/`; and a daily cron for
`node research/archive_forecasts.mjs` (the as-issued scoring of C6 and the PM2.5 chance, MODELS §1.1).

## 3. Going public

**Recommended since 0.3.0: Cloudflare's edge serves the page, and the collector on the risk server uploads to Workers
KV.** No tunnel and no inbound path to the server: [CLOUDFLARE.md](CLOUDFLARE.md). The options below remain as fallbacks.

**a) A tunnel of its own** (what the compose file is ready for; a tunnel made for this site, never FloodWatch's token):
1. In Cloudflare Zero Trust → Networks → Tunnels, create a tunnel.
2. Give it a public hostname of its own pointing to `http://web:8080` (not `risk.autobahn.bot` while the Worker holds it).
3. Put its token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
4. Run `docker compose --profile public up -d`.

**b) ~~FloodWatch's existing tunnel~~:** not any more. The two apps run on different servers (D-040), and sharing a
tunnel would tie this page's outages to FloodWatch's.

**c) The host's reverse proxy** (as FloodWatch's Caddy fallback, its KI-501): add a site block that proxies to `127.0.0.1:8090`.

**d) The page on Cloudflare Pages, only `data/live/` from the server:**
1. Deploy `public/` to Pages ([DEPLOY.md §1](DEPLOY.md#1-the-page)).
2. Expose this server's `/data/live/` (it already sends `Access-Control-Allow-Origin: *` and `Cache-Control: max-age=300` there, from `_headers`).
3. Set `SOURCES.live.url` in `public/js/sources.js` to that absolute URL (e.g. `https://live.now.autobahn.bot/data/live/`).

After any of these, check:

```
curl -sI https://<host>/ | grep -i "permissions-policy"      # geolocation=(self) — GPS needs it
curl -sI https://<host>/ | grep -ci "set-cookie"             # 0
curl -s  https://<host>/data/live/index.json                 # "generated" within 15 minutes
```

Keep **Bot Fight Mode off** on the zone: FloodWatch found it blocked LINE's and Facebook's link previews. Cloudflare's own bot cookie is Hazard-huntz KNOWN_ISSUES #93.

## 4. Developing on the server

The page and the collector are plain ES modules. There is no build step.

| Task | Command |
|---|---|
| Unit tests (Node ≥ 20 on the host) | `npm test` |
| The same without Node on the host | `docker run --rm -v "$PWD:/app" -w /app node:22-alpine npm test` |
| The visitor walk | `npm install` (only `playwright-core`), then `CHROME_PATH=/path/to/chromium npm run smoke`. Elsewhere `npx playwright@1.63.0 install chromium` gets a matching browser. Add `-- --live` to walk today's real sources |
| The page locally, no Docker | `npm run serve` → http://127.0.0.1:8787/ |
| One collector run into the dev folder | `npm run collect` (writes `public/data/live/`, git-ignored) |
| One collector run in the stack | `docker compose run --rm collector node tools/collect.mjs` |
| Rebuild and restart after a change | `docker compose up -d --build` |
| Advice still equals บ้านรอดไหม's | `npm run check:advice` |
| Docs links | `npm run check:docs` |

**A change is done** when it meets [AGENTS.md §4](../AGENTS.md#4-definition-of-done):
- `npm test` and the smoke walk pass, plus `-- --live` for wording or source changes.
- The docs change in the same commit.
- Releases bump `package.json`, `VERSION` in `public/js/main.js`, `VERSION` and the `?v=` entries in `public/sw.js`, and the `?v=` in `index.html`. A unit test fails if the service worker misses a module or a `?v=`.

**Updating the risk server:**

```
cd /srv/disaster-now && git pull --ff-only && docker compose up -d --build && docker compose ps
npm run cf:deploy                 # when public/ or worker/ changed: the page lives on the edge, not here
```

To roll back, run `git checkout <previous tag or commit> && docker compose up -d --build`. The page's service worker re-fetches its shell when `VERSION` in `sw.js` changes.

**Monitoring:** both containers have health checks. A cron line on the host can alert on failure:

```
*/10 * * * * cd /srv/disaster-now && docker compose exec -T collector node tools/health.mjs --live /app/public/data/live --max-age 2700 >/dev/null || echo "disaster-now collector stale" | mail -s alert you@example.org
```

`index.json → failed` names any source that failed in the last run (e.g. `"air4thai.json": "HTTP 503"`).

## 5. Rules that apply on the server

- **Publish files, keep nothing about a person** (Hazard-huntz docs/09 §1 and §7, our GUIDELINES §2):
  - The server keeps no access logs of visitors. `serve.mjs` logs nothing, and the tunnel's logs stay off.
  - The server stores no positions, sets no cookies and has no accounts.
  - The first per-person record (push subscriptions, accounts, stored positions, IP logs) brings the PDPA's duties and needs a Thai lawyer first.
- **The exact GPS fix never reaches the server.** Today nothing does. Future district files (§6) are fetched by district code.
- **One server per app** (D-040): never run this stack on FloodWatch's production server or another app's. They would
  share an IP's rate limits (KI-029), Docker and disk, and a place where `.env` files get copied between projects.
  `npm run preflight` checks it.
- **Honest User-Agent** (`disaster-now-collector/0.3 (+https://risk.autobahn.bot)`), **never faster than the sources update** (the 600 s floor), **no evasion of blocks or bot checks**.
  - A Thai-only host waits for a host in Thailand.
  - On every new server, re-test Air4Thai and the Thai sources once (OWNER_ACTIONS A6).
- **Keys only in `.env`** (git-ignored), sent in headers by the collector, never to the page, never in URLs, never printed. None are needed today.
- **The page must still work without the server.** Everything the server adds is optional, and each tile says when its data is missing ("ตรวจประกาศเตือนภัยของกรมอุตุฯ ไม่ได้ตอนนี้").

## 6. What to build on the server next

In order of value. Each item comes from a known issue or an audit finding.

1. **Air4Thai from the risk server** (A6, open again). It worked from FloodWatch's server in Germany (0.3.0: 173
   stations), and the earlier 503s were the cloud dev host's. The collector already prefers its file over the
   browser's call. Kept for the record:
   - The PCD's server answered HTTP 503 to this cloud host all evening on 23 Oct, while browsers read its mirror.
   - LINE's Android WebView may refuse the mirror's broken chain (visitor audit V27, KI-002).
   - **Done when** `index.json` shows `air4thai.json` with 170 or more stations from the risk server.
2. **District forecast files** (KI-011, ROADMAP v0.4, item 2):
   - After each ECMWF run (00 and 12 UTC, about 7 h later), fetch the ensemble and CAMS once per district centre: 928 points, about 1,900 calls a run against Open-Meteo's 10,000 a day.
   - Publish `data/live/district/<code>.json`; the page reads its district's file first.
   - Then no point leaves the phone for the weather, and Open-Meteo's per-IP limit is the server's alone, not a carrier's.
   - Watch Open-Meteo's terms (non-commercial, attribution) and its weighting of ensemble calls **[unverified]**.
3. **A GDACS digest.** GDACS sends 134 KB uncompressed on every visit for one line (visitor audit V22). The collector can keep the few current tropical cyclones and Thai events in a file under 1 KB.
4. **National files by code** (Hazard-huntz docs/09):
   - ThaiWater's rain and levels by province.
   - HII's flash-flood list.
   - DMR's per-subdistrict profile.
   - This lowers the load on agencies that are "not formally public" (KI-015) and makes the page faster.
5. **FloodWatch's point and geocoder**, if FloodWatch prefers to relay rather than add CORS (OWNER_ACTIONS B1, B2). Keep FloodWatch's rule that queries are never logged (its D-032).
6. **An archive of what was issued:**
   - Store the collector's files and the district forecasts by date.
   - This is the as-issued record the validation needs to re-test the PM2.5 correction and the heat correction (MODELS §7).
   - It stores no personal data.

## 7. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `toomanyrequests` pulling `node:22-alpine` | Docker Hub's anonymous limit: set `NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine` in `.env` |
| The collector logs `self-signed certificate in certificate chain` for every source | the host's outbound traffic goes through an intercepting proxy (as in a cloud dev session). Mount its CA and set `NODE_EXTRA_CA_CERTS` for the collector (the collector keeps it beside Air4Thai's two intermediates). A normal server needs nothing |
| `air4thai.json: FAILED HTTP 503` | the PCD's server (KI-002). The page falls back to the browser's call, then to GISTDA's estimate, and says which it used |
| `hotspots.json: FAILED every FIRMS file failed` | NASA FIRMS unreachable. The old file stays, the page shows its age, and fires never show "ไม่พบ" from a failed fetch (fixed in 0.2.0) |
| `--every must be at least 600 seconds` | by design (GUIDELINES §3) |
| The page works but the GPS button doesn't | the proxy in front strips or overrides `Permissions-Policy`; it must allow `geolocation=(self)`, and the page must be on HTTPS |
| `curl` shows `set-cookie` | Cloudflare's bot detection (Hazard-huntz KNOWN_ISSUES #93): turn it off for this hostname |
| Port 8090 in use | set `WEB_PORT` in `.env` |
| `npm run preflight`: "FloodWatch runs on this host" | the wrong server: stop here and use the risk server (§2). Nothing of this app belongs on FloodWatch's machine |
| `kv: FAILED 10000 Authentication error` | the token lacks *Workers KV Storage: Edit* (OWNER_ACTIONS A9); the files stay local and the page on the edge shows their age |
| `translation of … rejected: …` | GLM's English failed the check (KI-031): the warning shows in Thai on the English page, as before; nothing else changes |
| ThaiWater answers `HTTP 429` to `curl` or a live walk here | the IP is rate-limited (KI-029): stop live walks and cross-checks for the day. On a host shared with another app it eats that app's quota too, which is why this stack has its own server |

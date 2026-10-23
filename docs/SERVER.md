# Running and developing Disaster Now on a server

Everything needed to put the page and its collector on a server, run them there, and keep building on them. It follows the pattern of FloodWatch's server (docker compose, the app on localhost only, public traffic through a Cloudflare tunnel), so the two can live on the same machine.

**Tested on 23 Oct 2026** in a cloud session with Docker 29 and compose v2:
- `docker compose up -d --build` built the image (node:22-alpine, 240 MB) and both containers reported healthy.
- `node tools/health.mjs --web http://127.0.0.1:8090/` returned ok.
- The collector's first run wrote 4 of its 5 files in 8 s: warnings 1, TMD quakes 10, storms 1, hotspots 306. Air4Thai answered HTTP 503, as it had all evening (KI-002).
- `docker compose stop collector` returned at once, with exit code 0.

**Tested on the owner's server, 23 Oct 2026 (0.3.0):** the same stack on FloodWatch's machine (Docker 29), port 8090
beside FloodWatch's 3000. Both containers were healthy, and the collector wrote **5 of 5 files in 13 s, Air4Thai with 173
stations**. With `AI_ENABLED=1`, GLM gave the live warning its English in 1 call, and 0 on the next run. Both health
checks returned ok. The stack was stopped afterwards (`docker compose down`; the `live` volume stays). Going public
is now through Cloudflare's edge, not a tunnel: [CLOUDFLARE.md](CLOUDFLARE.md).

**Not tested:** the tunnel. If it's ever used, make a new tunnel: **never use FloodWatch's token**, which was in the
copied `.env` (FRANK_FEEDBACK §5).

## 1. What runs

```
                 ┌──────────────────────────── one server (e.g. FloodWatch's) ────────────────────────────┐
 visitors ──► Cloudflare ──► cloudflared (profile "public") ──► web :8080 ──► public/ (the page, static)
                 │               or the host's own proxy           ▲   │      public/data/live/ (read only)
                 │                                                 │   └── named volume "live" ◄──┐
                 │                                                 │                              │ writes
                 │                            collector: node tools/collect.mjs --every 900 ──────┘
                 │                              TMD CAP, TMD quakes, TMD storms, NASA FIRMS, Air4Thai
 the phone ──────┴──► Open-Meteo, GISTDA, ThaiWater, EMSC, USGS, GDACS, JMA, DMR  (directly, as before)
```

| Piece | File | What it does |
|---|---|---|
| Image | `Dockerfile` | `node:22-alpine` with `public/` and `tools/` only; no npm packages at run time; runs as `node`; health check built in |
| Page server | `tools/serve.mjs` | static files from `public/`, applying `public/_headers` (the same file Cloudflare Pages reads); gzip over 1 KB; ETag/304; GET and HEAD only; hidden and `_headers` files refused; **logs nothing about requests** |
| Collector | `tools/collect.mjs --every 900` | the feeds a phone can't read (no CORS, or Air4Thai's broken chain); writes `data/live/*.json` atomically, plus `index.json` (what was written, when, what failed); a failed source keeps its old file; refuses to loop faster than every 600 s; stops cleanly on SIGTERM |
| Health | `tools/health.mjs` | `--web URL` (the page answers with its title, the live index answers, the Permissions-Policy header) and/or `--live DIR --max-age S` (the collector wrote `index.json` recently); one JSON line; exit 0 or 1 |
| Stack | `docker-compose.yml` | `web` (127.0.0.1:${WEB_PORT:-8090}), `collector`, `cloudflared` (profile `public`); both app containers read-only with a tmpfs `/tmp` |
| Settings | `.env.example` → `.env` (git-ignored, mode 600) | `WEB_PORT`, `COLLECT_EVERY`, `CONTACT_EMAIL`, `PUBLIC_HOST`; optional GLM (`AI_ENABLED`, `GLM_*`, `AI_DAILY_CALLS`) and Workers KV (`CLOUDFLARE_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_KV_TOKEN`), each passed only to the collector; nothing is needed to run. `node tools/env-check.mjs` shows which are set without printing values |

The page itself still has **no server logic**:
- The phone calls most sources directly. The server only serves files and refreshes five of them.
- Nothing about a visitor is stored anywhere: no logs, no cookies, no positions (GUIDELINES §2).

## 2. First install

On a fresh Linux server (Ubuntu or Debian) with Docker and its compose plugin installed:

```
git clone https://github.com/bejranonda/disaster-now.git /srv/disaster-now
cd /srv/disaster-now
cp .env.example .env            # then edit: WEB_PORT if 8090 is taken
docker compose up -d --build
docker compose ps               # both "healthy" after about a minute
node tools/health.mjs --web http://127.0.0.1:8090/      # or: docker compose exec web node tools/health.mjs --web http://127.0.0.1:8080/
docker compose logs -f collector                          # one line per file each run
```

- **Docker Hub rate limit (HTTP 429 on `node:22-alpine`):** set `NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine` in `.env`. It is the same official image on Amazon's public mirror (used in the test above).
- **The volume:** the named volume `live` is created on the first `up` with the image's empty `data/live/` owned by `node`, so the collector can write and the page server only reads. `docker compose down -v` deletes it. That is harmless: the next run refills it.
- **Nothing to back up:** the stack is stateless. The repository is the source, and `live` is regenerated every 15 minutes.

## 3. Going public

**Recommended since 0.3.0: Cloudflare's edge serves the page, and the collector here uploads to Workers KV.** No
tunnel and no inbound path to this server: [CLOUDFLARE.md](CLOUDFLARE.md). The options below remain as fallbacks.

**a) A tunnel of its own** (what the compose file is ready for; a tunnel made for this site, never FloodWatch's token):
1. In Cloudflare Zero Trust → Networks → Tunnels, create a tunnel.
2. Give it a public hostname (e.g. `now.autobahn.bot`, a suggested name: OWNER_ACTIONS A1) pointing to `http://web:8080`.
3. Put its token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
4. Run `docker compose --profile public up -d`.

**b) FloodWatch's existing tunnel** (the same server):
1. Add a second public hostname to FloodWatch's tunnel, pointing to `http://host.docker.internal:8090`, or to the host's address on the Docker bridge, because FloodWatch's cloudflared runs in its own compose project.
2. Leave this stack's `cloudflared` off.

**c) The host's reverse proxy** (FloodWatch has a Caddy fallback, its KI-501): add a site block that proxies to `127.0.0.1:8090`.

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

**Updating the live server:**

```
cd /srv/disaster-now && git pull --ff-only && docker compose up -d --build && docker compose ps
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
- **Honest User-Agent** (`disaster-now-collector/0.2 (+repo URL)`), **never faster than the sources update** (the 600 s floor), **no evasion of blocks or bot checks**.
  - A Thai-only host waits for a host in Thailand.
  - If the server is in Thailand, re-test Air4Thai and the Thai sources from it (OWNER_ACTIONS A6).
- **Keys only in `.env`** (git-ignored), sent in headers by the collector, never to the page, never in URLs, never printed. None are needed today.
- **The page must still work without the server.** Everything the server adds is optional, and each tile says when its data is missing ("ตรวจประกาศเตือนภัยของกรมอุตุฯ ไม่ได้ตอนนี้").

## 6. What to build on the server next

In order of value. Each item comes from a known issue or an audit finding.

1. ✅ **Air4Thai from the owner's server works** (0.3.0: 173 stations from Germany; the earlier 503s were the cloud
   host's). The collector already prefers its file over the browser's call. Kept for the record:
   - The PCD's server answered HTTP 503 to this cloud host all evening on 23 Oct, while browsers read its mirror.
   - LINE's Android WebView may refuse the mirror's broken chain (visitor audit V27, KI-002).
   - **Done when** `index.json` shows `air4thai.json` with 170 or more stations from the owner's server.
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
| Port 8090 in use | set `WEB_PORT` in `.env` (FloodWatch uses 3000) |
| `kv: FAILED 10000 Authentication error` | the token lacks *Workers KV Storage: Edit* (OWNER_ACTIONS A9); the files stay local and the page on the edge shows their age |
| `translation of … rejected: …` | GLM's English failed the check (KI-031): the warning shows in Thai on the English page, as before; nothing else changes |
| ThaiWater answers `HTTP 429` to `curl` or a live walk here | the IP is rate-limited, and FloodWatch's collector shares it (KI-029): stop testing from this host |

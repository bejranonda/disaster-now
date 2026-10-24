# Cloudflare: how ภัยรอบบ้าน · Thai Risk goes public at risk.autobahn.bot

**State (24 Oct 2026, 20:13 UTC): deployed.** https://risk.autobahn.bot serves the page from Cloudflare's edge
(Worker `disaster-now`, custom domain; versions `9b913164` = 0.5.0 at 20:13 UTC, `fc4b98b6` = 0.6.0 at 20:57,
`0b47a297` = 0.6.0 with one flood-card fix at 21:05; [§3.2](#32-the-deploy-24-oct-2026-evening)).
- **`/data/live/*` answers 404 on the edge**: the collector on `autobahn-bot` runs and writes its files, but
  `CF_KV_TOKEN` is empty, so it uploads nothing to KV (KI-036, A9). The page then says it couldn't check TMD's warnings,
  has no fire or storm data, and reads river gauges from ThaiWater only: honest, but less than it could show.
- `node tools/health.mjs --web https://risk.autobahn.bot/ --need-live` fails until the KV token is set.

## 1. The recommendation, frankly

**Serve the page from Cloudflare's edge (Workers static assets), run the collector on the risk server (a server of
its own, never FloodWatch's: D-040), and let the collector upload its five files to Workers KV.** No tunnel, no open port.

```
 visitors in Thailand ──► Cloudflare edge (Bangkok PoPs) ── risk.autobahn.bot
                            ├─ /*            static assets from public/ (+ public/_headers)   free, not a Worker call
                            └─ /data/live/*  Worker (worker/index.mjs) → Workers KV "disaster-now-live"
                                                                              ▲ one bulk PUT per run (≤ 6 keys)
 the risk server (its own) ─────── docker compose: collector every 15 min ─────┘   (web on 127.0.0.1:8090 for checks)
 the phone ──► Open-Meteo, GISTDA, ThaiWater, EMSC, USGS, GDACS, JMA, DMR      directly, as before
```

Why this and not the alternatives:

| Option | For | Against | Verdict |
|---|---|---|---|
| **A. Workers static assets + KV (built)** | the page is served from the edge near the visitor, not from the server; it keeps working when the server is down (the live files just age, and the page shows their age); static requests are free and unmetered; no inbound path to the server; no request logs | the collector needs a KV token; KV's free plan allows 1,000 writes a day (we use ≈ 696 since 0.6.0: 7 keys every 15 min, the hourly rain once an hour) | **recommended** |
| B. Cloudflare Pages | the older static product; `public/_headers` already works there | Cloudflare now points new projects to Workers static assets; live files would still need a Worker, R2 or a redeploy every 15 min (Pages Free counts 500 builds a month) | not worth a second product |
| C. A tunnel to this stack (`docker compose --profile public`) | ready since 0.2.0 | every page view crosses to the server and back; the server becomes a single point of failure for the page; needs a tunnel of its own — **the `.env` copied from FloodWatch held FloodWatch's own tunnel token** (identical, checked by hash only), which would have added a second connector to FloodWatch's tunnel and split FloodWatch's visitors between the two origins | fallback only, with a new tunnel |
| D. The collector as a Worker cron | no server at all | the Free plan gives a cron 10 ms of CPU (parsing 130 KB of Air4Thai and TMD's CAP XML won't fit); a Worker can't add Air4Thai's missing intermediate certificate (KI-002) **[unverified whether Cloudflare's fetch tolerates it]**; Paid is US$5 a month | not now |

Cloudflare's limits, as documented (developers.cloudflare.com, read 23 Oct 2026): Workers Free 100,000 requests a day
and 10 ms CPU per invocation; 5 cron triggers on Free; 20,000 static-asset files of up to 25 MiB per version;
`run_worker_first` with globs decides which paths run the Worker, and other asset requests are not billed; `_headers`
applies to asset responses only. KV Free: 100,000 reads and 1,000 writes a day.

## 2. What is in the repository

| File | What it does |
|---|---|
| `wrangler.jsonc` | name `disaster-now`; assets `./public` with `run_worker_first: ["/data/live/*"]`; KV binding `LIVE`; custom domain `risk.autobahn.bot`; `workers_dev` and preview URLs off; `observability` off (no request logs, GUIDELINES §2) |
| `worker/index.mjs` | `/data/live/<name>.json` from KV with the same headers `_headers` gives those paths (a unit test compares them), an ETag from the collector's `fetched` time, 304, 404, 405, a 60 s edge cache (one KV read per file per location per minute); everything else goes to `env.ASSETS` |
| `public/.assetsignore` | keeps the collector's local `data/live/` out of the upload |
| `tools/publish-live.mjs` | one bulk PUT of this run's files to KV (`/accounts/{id}/storage/kv/namespaces/{ns}/bulk`), token in the header only |
| `tools/collect.mjs` | uploads after each run when `CLOUDFLARE_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID` and `CF_KV_TOKEN` are set; `index.json → kv` says whether it worked |
| `tools/cf-setup.mjs` (`npm run cf:setup`) | finds or creates the KV namespace `disaster-now-live`, writes its id into `wrangler.jsonc` and `.env` |
| `tools/cf-deploy.mjs` (`npm run cf:deploy`) | runs the pinned `wrangler@4.148.0 deploy` with the token from `.env`; refuses while the KV id is the placeholder |
| `tools/env-check.mjs --probe` | says which variables are set and whether the token reaches the zone, Workers and KV, **without printing a value** |
| `tools/make-images.mjs` | the link-preview image (`og.png`) and PNG icons; the page's Open Graph tags point to `https://risk.autobahn.bot/` |

## 3. Checked on 23 Oct 2026 (FloodWatch's server, the old token)

These ran with the token copied from FloodWatch's `.env`, on FloodWatch's server, before the move. **With the new
token on the risk server, run `npm run preflight` and `npm run env:check -- --probe` again.** The results below say
what to expect, not what the new token can do.


- `node tools/env-check.mjs --probe`: the token is **valid**; zone `autobahn.bot` visible; `risk.autobahn.bot` has **no
  DNS record yet** (free); Workers scripts readable (0 on the account); **Workers KV: HTTP 401** (the token lacks KV).
  `CLOUDFLARE_ZONE_ID` in the copied `.env` was **bejranonda.com's**; it now points to `autobahn.bot`.
- `npm run cf:deploy -- --dry-run` (wrangler in `node:22-bookworm-slim`; the host has Node 20 and wrangler 4 needs 22):
  read 32 files from `public/`, bindings `env.LIVE` (KV) and `env.ASSETS`.
- `wrangler dev --local` with the collector's real files in local KV (in `node:22-bookworm-slim`; workerd needs glibc,
  so not Alpine): `/` 200 with `permissions-policy: geolocation=(self)…` and `x-frame-options`; `/data/live/index.json`
  200 with `access-control-allow-origin: *`, `cache-control: public, max-age=300, stale-while-revalidate=600` and an
  ETag; the same ETag → 304; unknown file 404; POST 405; `/data/tambon.json` `max-age=86400`; `_headers` and
  `.assetsignore` not served (404). The page opened through it in English for Phuket showed TMD's warning in checked
  English (docs/AI.md).
- Unit tests: `test/cloud.test.mjs` (Worker, KV upload, setup patches, config).

**Not checked:** a real deploy, the custom domain's certificate, KV's write limit in practice, the page on the edge
from Thailand.

### 3.1 Checked on 24 Oct 2026 (`autobahn-bot`, the owner's new token)

- **The token:** valid; zone `autobahn.bot` visible and `CLOUDFLARE_ZONE_ID` matching; `risk.autobahn.bot` free; Workers
  scripts readable (0 on the account); Workers KV 401 at first, readable after the owner added *Workers KV Storage:
  Edit*. Its scope is far wider than this app needs: *All zones across all accounts*, with Zone Settings, Page Rules,
  Firewall and DNS: Edit, plus Workers AI, Pages and R2 (A9, KI-036).
- `npm run cf:setup`: created `disaster-now-live` (`fc82e9e8…`, now in `wrangler.jsonc`).
- `npm run cf:deploy -- --dry-run` (Node 24, wrangler directly): both bindings. Its "Read 39 files" counts the raw
  directory, directories included; `WRANGLER_LOG=debug` shows `data/live/*`, `_headers` and `.assetsignore` as
  "Ignoring asset", so the collector's local files never ship as stale assets (wrangler 4.148.0, `buildAssetManifest`).
- **`npm run cf:deploy`: refused**, "A request to the Cloudflare API (/accounts/…/workers/scripts/disaster-now/secrets)
  failed. No access to the specified resource" (09:23 UTC). The token can list scripts but not deploy them: it lacks
  *Workers Scripts: Edit*. Nothing was created (0 scripts, no DNS record). `node tools/env-check.mjs --probe` now asks
  the same endpoint read-only and prints "Workers deploy: allowed" or "REFUSED".
- **The page and stale KV:** since 0.4.0 the page ignores the live files when `index.json` is more than 2 h old
  (`sources.liveFresh`, S12), because KV keeps the last upload while the server is down. Until `CF_KV_TOKEN` is set, the
  deployed page will say it couldn't check TMD's warnings, and the fire tile will have no data, which is honest.

### 3.2 The deploy (24 Oct 2026, evening)

- 20:12 UTC: the owner's token gained *Workers Scripts: Edit* and *Workers Routes: Edit*; `env-check --probe`:
  "Workers deploy ("disaster-now"): allowed" (the same endpoint answered 403 at 09:23).
- `npm run cf:deploy` (wrangler 4.148.0, Node 24): 27 assets uploaded, bindings `LIVE` (`fc82e9e8…`) and `ASSETS`,
  trigger `risk.autobahn.bot (custom domain)`, version `9b913164-9f9d-42e3-b521-be824ee6cec4`.
- `node tools/health.mjs --web https://risk.autobahn.bot/`: page 200, `Permissions-Policy: geolocation=(self), …`;
  `liveIndex` 404 (no KV upload yet).
- 20:57 UTC: 0.6.0 (`fc4b98b6`, 11 assets changed); 21:05 UTC: `0b47a297` (one file). The edge serves
  `main.js?v=0.6.0` and `sw.js` `dn-0.6.0`; one LINE-window load at Hat Yai had no page errors.
- The token is still as broad as before (KI-036): narrowing it and the KV-only token remain A9.

## 4. What the owner does

All of it on **the risk server**, in a fresh `.env` ([SERVER.md §2](SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server)); never on FloodWatch's.

1. **Two new tokens for this project** (the old one came from FloodWatch's `.env`: check whether FloodWatch's deploys
   use it before you revoke it):
   - `CLOUDFLARE_API_TOKEN`, to deploy: Account → *Workers Scripts: Edit*, *Workers KV Storage: Edit*; Zone
     `autobahn.bot` → *Workers Routes: Edit*, *DNS: Edit* (for the custom domain). **Only these, on this account and
     this zone** (24 Oct: the new token had KV but not Workers Scripts: Edit, and every zone of every account).
   - `CF_KV_TOKEN`, for the collector: only *Workers KV Storage: Edit*. docker-compose.yml passes it and nothing else.
2. `npm run preflight` (no ❌), then `npm run env:check -- --probe` → "Workers KV: readable" and **"Workers deploy: allowed"**.
3. `npm run cf:setup` → creates `disaster-now-live`, writes its id (commit `wrangler.jsonc`; the id is not a secret).
4. `docker compose up -d --build` → the collector uploads every 15 minutes (`docker compose logs collector` shows `kv: 7 files uploaded`, 8 in the runs that read the hourly rain).
5. `npm run cf:deploy` (on Node 22 it runs wrangler directly; on Node 20 in `node:22-bookworm-slim` by itself;
   `npm run cf:deploy -- --dry-run` first: on 23 Oct it read 32 files and both bindings).
6. Check: `node tools/health.mjs --web https://risk.autobahn.bot/ --need-live` (fails while the edge's live index is missing or over 45 min old); `curl -sI https://risk.autobahn.bot/ | grep -i permissions-policy`;
   `curl -s https://risk.autobahn.bot/data/live/index.json` (fresh `generated`); open it on a phone inside LINE and paste
   the link into a chat to see the preview.
7. Keep **Bot Fight Mode off** for this hostname (FloodWatch found it blocks LINE's link previews).

**Rollback:** `npx wrangler@4.148.0 rollback` (the previous version), or delete the custom domain in the dashboard;
FloodWatch is untouched either way.

## 5. Rules on Cloudflare

- No request logs (`observability` off, no `console.log` in the Worker), no cookies, no analytics (GUIDELINES §2).
- Only `/data/live/*` runs code; the page itself stays plain files.
- Tokens only in `.env` (git-ignored, mode 600), each scoped to its job; never in `wrangler.jsonc`, a URL or a log.
- Never reuse FloodWatch's tunnel token for this site, and never run this site's collector on FloodWatch's server (D-040).
- **When a token changes:** put the new one in `.env` on the risk server, run `npm run env:check -- --probe`, and
  restart the collector (`docker compose up -d`). Nothing in git changes, because no token is ever in git.

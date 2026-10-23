# Cloudflare: how Disaster Now goes public at risk.autobahn.bot

**State (23 Oct 2026, 0.3.0):** prepared and tested locally; **not deployed**. The Worker, its config and the collector's
upload exist and pass their tests, a wrangler dry run and a local `wrangler dev` run. Two owner steps remain:
a token that can write Workers KV, and the deploy command ([§4](#4-what-the-owner-does)).

## 1. The recommendation, frankly

**Serve the page from Cloudflare's edge (Workers static assets), keep the collector on FloodWatch's server, and let
the collector upload its five files to Workers KV.** No tunnel, no open port, no new server.

```
 visitors in Thailand ──► Cloudflare edge (Bangkok PoPs) ── risk.autobahn.bot
                            ├─ /*            static assets from public/ (+ public/_headers)   free, not a Worker call
                            └─ /data/live/*  Worker (worker/index.mjs) → Workers KV "disaster-now-live"
                                                                              ▲ one bulk PUT per run (≤ 6 keys)
 FloodWatch's server (Germany) ── docker compose: collector every 15 min ─────┘   (web on 127.0.0.1:8090 for checks)
 the phone ──► Open-Meteo, GISTDA, ThaiWater, EMSC, USGS, GDACS, JMA, DMR      directly, as before
```

Why this and not the alternatives:

| Option | For | Against | Verdict |
|---|---|---|---|
| **A. Workers static assets + KV (built)** | the page is served from the edge near the visitor, not from Germany; it keeps working when the server is down (the live files just age, and the page shows their age); static requests are free and unmetered; no inbound path to FloodWatch's server; no request logs | the collector needs a KV token; KV's free plan allows 1,000 writes a day (we use ≤ 576) | **recommended** |
| B. Cloudflare Pages | the older static product; `public/_headers` already works there | Cloudflare now points new projects to Workers static assets; live files would still need a Worker, R2 or a redeploy every 15 min (Pages Free counts 500 builds a month) | not worth a second product |
| C. A tunnel to this stack (`docker compose --profile public`) | ready since 0.2.0 | every page view crosses to Germany and back; the server becomes a single point of failure for the page; needs a tunnel of its own — **the `.env` copied from FloodWatch held FloodWatch's own tunnel token** (identical, checked by hash only), which would have added a second connector to FloodWatch's tunnel and split FloodWatch's visitors between the two origins | fallback only, with a new tunnel |
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

## 3. Checked in this session (23 Oct 2026)

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

## 4. What the owner does

1. **A token that can write KV.** Either add *Account → Workers KV Storage: Edit* to the existing token, or (better)
   create a second token with only that permission and put it in `.env` as `CF_KV_TOKEN` (the collector gets only
   this one; docker-compose.yml passes it and nothing else). The deploy token also needs *Workers Scripts: Edit*,
   *Workers Routes: Edit* and *DNS: Edit* on `autobahn.bot` for the custom domain.
2. `node tools/env-check.mjs --probe` → "Workers KV: readable".
3. `npm run cf:setup` → creates `disaster-now-live`, writes its id (commit `wrangler.jsonc`; the id is not a secret).
4. `docker compose up -d --build` → the collector uploads every 15 minutes (`docker compose logs collector` shows `kv: 6 files uploaded`).
5. `npm run cf:deploy` (on Node 20, as on FloodWatch's server, it runs wrangler in `node:22-bookworm-slim` by itself;
   `npm run cf:deploy -- --dry-run` first: on 23 Oct it read 32 files and both bindings).
6. Check: `node tools/health.mjs --web https://risk.autobahn.bot/`; `curl -sI https://risk.autobahn.bot/ | grep -i permissions-policy`;
   `curl -s https://risk.autobahn.bot/data/live/index.json` (fresh `generated`); open it on a phone inside LINE and paste
   the link into a chat to see the preview.
7. Keep **Bot Fight Mode off** for this hostname (FloodWatch found it blocks LINE's link previews).

**Rollback:** `npx wrangler@4.148.0 rollback` (the previous version), or delete the custom domain in the dashboard;
FloodWatch is untouched either way.

## 5. Rules on Cloudflare

- No request logs (`observability` off, no `console.log` in the Worker), no cookies, no analytics (GUIDELINES §2).
- Only `/data/live/*` runs code; the page itself stays plain files.
- Tokens only in `.env` (git-ignored, mode 600), each scoped to its job; never in `wrangler.jsonc`, a URL or a log.
- Never reuse FloodWatch's tunnel token for this site.

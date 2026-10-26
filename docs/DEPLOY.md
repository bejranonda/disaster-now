# Deploying Disaster Now

> **Going live: use [CLOUDFLARE.md](CLOUDFLARE.md)** (0.3.0). The page goes on Cloudflare's edge at `risk.autobahn.bot` as Workers static assets, and the collector on a server of its own ([SERVER.md §2](SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server), never FloodWatch's) uploads its files to Workers KV. This page keeps the other static-host options and the older notes.

The page is static files (`public/`). It works on any HTTPS static host without the collector; the collector adds the feeds a browser can't read (TMD's warnings, quakes and storm tracks, NASA FIRMS hotspots, Air4Thai with its certificate fixed). **Nothing is deployed yet** (23 Oct 2026): the agent session that built it had no deploy access (the Cloudflare connector wasn't authorised). The owner's choices are in [OWNER_ACTIONS.md](OWNER_ACTIONS.md).

## 1. The page

| Option | How | Notes |
|---|---|---|
| Cloudflare Pages (superseded by [CLOUDFLARE.md](CLOUDFLARE.md)'s Workers static assets) | the owner's `autobahn.bot` zone already hosts FloodWatch and baanrodmai; `npx wrangler@latest pages deploy public --project-name=disaster-now` with the owner's token, then a custom domain such as `now.autobahn.bot` [suggested name] | `public/_headers` sets `Permissions-Policy: geolocation=(self)` (GPS needs it and HTTPS). Keep **Bot Fight Mode off** on the zone: FloodWatch found it blocked LINE's and Facebook's link previews (Hazard-huntz docs/08 §3) |
| GitHub Pages | Settings → Pages → deploy `public/` | needs a public repository or a paid plan for a private one; `_headers` is ignored there (GitHub sends its own headers; geolocation isn't blocked) |
| Any web server | copy `public/` | serve `.webmanifest` as `application/manifest+json`, `.json` with `Cache-Control` as in `_headers` |

Before a release: bump the version (`package.json`, `VERSION` in `public/js/main.js` and `public/sw.js`, `?v=` in `index.html` and in `sw.js`'s `SHELL`), run `npm test`, `CHROME_PATH=/opt/pw-browsers/chromium npm run smoke` and `npm run smoke -- --live`, then open the live URL on a phone, inside LINE too.

## 2. The collector (`tools/collect.mjs`)

It fetches on a schedule and writes `public/data/live/{warnings,tmd_quakes,storms,hotspots,air4thai,index}.json` (atomic renames; a failed source keeps its old file and is listed in `index.json → failed`). It holds nothing about people: it never sees a visitor. Measured on 23 Oct 2026 (one run, cloud host outside Thailand): about 25 s, TMD warnings 1 item, quakes 10, storms 1, hotspots 303, Air4Thai answered 503 (the PCD's server; it answered the browser through its mirror the same hour).

**Where to run it** (Hazard-huntz docs/09 §5 measured the costs for a similar collector):

1. **On the owner's FloodWatch server (recommended):** the compose stack ([SERVER.md](SERVER.md)) runs `node tools/collect.mjs --every 900` in its own container. Without Docker, one more cron line, e.g. every 15 minutes:
   ```
   */15 * * * * cd /srv/disaster-now && node tools/collect.mjs --out /srv/disaster-now/public/data/live && npx wrangler@latest pages deploy public --project-name=disaster-now --branch=main
   ```
   or serve `data/live/` from FloodWatch's own web server under a path with `Access-Control-Allow-Origin` for the page's origin, and point `SOURCES.live.url` in `public/js/sources.js` at it. Cloudflare Pages Free counts 500 builds a month; whether direct uploads by wrangler count against it is **[unverified]**, and a deploy every 15 minutes (≈ 2,900 a month) would pass it, so the second way (serve `data/live/` from FloodWatch's own server) is the safer one.
2. **Cloudflare Workers Paid** (US$5 a month; a cron of an hour or more gets 15 min of CPU) writing to R2: possible, but the collector would need a Worker version, and whether a Worker can add Air4Thai's missing intermediate is **[unverified]**.
3. **GitHub Actions on a schedule:** free for public repositories; schedules run only on the default branch and can be late. A workflow would check out, run the collector and deploy. Not added to `.github/workflows/` on purpose: on an empty repository it would start failing every run until the secrets exist.

**Its requirements:** Node ≥ 20, no packages. Air4Thai's server leaves out Let's Encrypt's YR1 intermediate; the collector adds the two public intermediates in `tools/certs/` (from letsencrypt.org/certificates) for that host only, with verification on. If the host trusts an extra CA (a proxy), set `NODE_EXTRA_CA_CERTS`; the collector keeps it.

**Keys (none needed today):** a TMD key (7-day forecast, warning text) and a GISTDA key (flood frequency, drought) would go in the collector's environment and be sent in headers, never in URLs, never to the page ([OWNER_ACTIONS.md](OWNER_ACTIONS.md)).

## 3. Checks after a deploy

- `curl -sI https://<host>/` shows `permissions-policy: geolocation=(self)…` and no `set-cookie`.
- `curl -s https://<host>/data/live/index.json` shows `generated` within the cron interval.
- `curl -sI https://<host>/llms.txt` is 200 with `charset=utf-8`; `robots.txt` ends with the `Sitemap:` line.
- On a phone: GPS (also inside LINE), a search, the EN switch, ก+, save a place and reopen.
- `npm run check:advice` (the advice lines still equal baanrodmai's).

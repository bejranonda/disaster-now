# Handoff

**Disaster Now (ภัยรอบบ้าน ตอนนี้) v0.3.0, 24 Oct 2026.** Built, validated, audited and **ready for Cloudflare at
`risk.autobahn.bot`**, and **moving to a server of its own**. It is **not deployed** and **not tried on real phones**.
Read this first, then [AGENTS.md](AGENTS.md).

## 1. Where things stand

- **The page** (`public/`, static, no framework):
  - GPS or search finds the nearest of 7,425 subdistricts.
  - For that point: a verdict, ten tiles, pre-warnings, the 3-day table and ten cards, in Thai and English.
  - Forecasts as validated ([docs/MODELS.md](docs/MODELS.md)).
- **0.3.0 added** ([CHANGELOG](CHANGELOG.md)):
  - **Cloudflare** prepared: Workers static assets plus a KV-backed `/data/live/*`, tested with a dry run and `wrangler dev` ([docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)).
  - **GLM** writes checked English for TMD's Thai-only warnings, and nothing else on a visitor's path ([docs/AI.md](docs/AI.md)).
  - The **live cross-check** found TMD warning heavy rain where the model said "low" in all 11 provinces. The warning now leads the tile, the verdict and the table ([research](docs/research/crosscheck-live-2026-10-23.md)).
  - The verdict sits on the first screen at 360 × 640.
  - No interim verdict while sources arrive.
  - Link previews.
  - A `.env` for this project only.
- **The move (24 Oct 2026; D-040, D-041):**
  - **What happened:** 0.3.0's stack was set up on FloodWatch's production server by mistake. It ran healthy there,
    then was stopped.
  - **The owner's plan:** a dedicated server for risk, and a new Cloudflare token.
  - **Before leaving, the session:**
    - fast-forwarded `main` to the work branch and pushed both;
    - removed this project's Docker volume and images from FloodWatch's server ([SERVER §2.4](docs/SERVER.md#24-floodwatchs-server-cleaned-up-24-oct-2026));
    - left FloodWatch untouched.
  - **Still on FloodWatch's server: the checkout `/root/disaster-now`, with `.env` and `.env.floodwatch-original`.**
    Claude Code's safety check blocked the agent from deleting its own working directory. Run
    `rm -rf /root/disaster-now` there (A11).
  - **Nothing of this app runs anywhere now.** The new server's runbook is [SERVER.md §2](docs/SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server).
    `npm run preflight` says when a host is ready, and fails on FloodWatch's.
- **Checks, 24 Oct 2026 ≈ 06:50 UTC, on FloodWatch's server before the cleanup:**
  - `npm test`: 61 of 61 (2 new for the preflight).
  - The visitor walk: 29 of 29 on fixtures.
  - `npm run check:docs` and `npm run check:advice` both pass.
  - `npm run preflight` failed with "FloodWatch runs on this host", as intended.
  - From 23 Oct on the same host: live walks in Bangkok (360 × 640 LINE), Phuket (EN) and Chiang Mai, and
    `npm run cf:deploy -- --dry-run` (32 files, both bindings).
  - Not run: the gauge cross-check (ThaiWater 429, KI-029). Nothing has run on the risk server yet.

## 2. What the owner has to do ([docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md))

0. **A11: on FloodWatch's server, `rm -rf /root/disaster-now`.** Everything is on GitHub. That removes the last
   copy of FloodWatch's `.env` made for this project and the old token.
1. **A12: set up the risk server** ([SERVER.md §2.3](docs/SERVER.md#23-install-and-go-live)).
   - Clone `main` and write a fresh `.env` ([§2.2](docs/SERVER.md#22-the-new-env-fresh-never-copied): where each value comes from).
   - Run `npm run preflight`, then `npm ci && npm test` and the walk.
2. **A9: the new tokens.** One to deploy, one KV-only as `CF_KV_TOKEN`.
   - The old token came from FloodWatch's `.env`. **Check whether FloodWatch's deploys use it before revoking it.**
3. **A10: go live from the risk server:** `npm run cf:setup` → `docker compose up -d --build` → `npm run cf:deploy`.
4. **A6:** check that Air4Thai answers the new host (170 or more stations in `index.json`).
5. **A4:** test on an Android and an iPhone, inside LINE, and check the link preview in a chat.
6. **A5:** a native Thai review, starting from GLM's first reading ([copy review](docs/research/copy-review-glm-2026-10-23.md)), and a bilingual check of the first ten warning translations.
7. **Decisions:**
   - D1 (heat);
   - D6 (GLM translation, its platform, and **a GLM key of this project's own**);
   - D7 (rain level vs word);
   - D5 (GISTDA alone).
8. **A8, B1–B4:**
   - GitHub's default branch `main`, and the v0.2.0 and v0.3.0 releases;
   - CORS on FloodWatch;
   - a shared ThaiWater snapshot (INTEGRATION §3.5).

## 3. What an agent can do next ([docs/ROADMAP.md](docs/ROADMAP.md))

- **On the risk server, with the owner's go-ahead:** the runbook's steps and checks (SERVER §2.3), then the host's
  facts into §4 below. Use the prompt in [FRANK_FEEDBACK §6](docs/FRANK_FEEDBACK.md#6-the-move-24-oct-2026-sorry-i-deployed-in-the-wrong-server).
- **AI-ready, in order:**
  1. The 3-day table's dots and words (KI-025).
  2. Thai region names: a build-time table, GLM-drafted and reviewed (KI-024).
  3. Search aliases for landmarks: the same way (KI-012).
  4. The flood line (KI-008).
  5. The polish list (KI-027).
  6. Bad-day fixtures (KI-020).
- **Once live:** district forecast files, a GDACS digest, an archive of issued forecasts and warnings (to score
  province warnings against point chances, MODELS §7.8).

## 4. How to work here

- **Commands:**
  - `npm run preflight` first on any host;
  - `npm test`;
  - `CHROME_PATH=<chromium> npm run smoke` (add `-- --live` for wording or source changes: once per change, never in a loop);
  - `npm run check:docs`, `npm run check:advice`;
  - `node tools/env-check.mjs --probe`;
  - `docker compose up -d --build`, then `node tools/health.mjs --web http://127.0.0.1:8090/`;
  - `npm run cf:deploy -- --dry-run`.
- **The risk server's facts** (fill these in once it exists):

  | Fact | Value |
  |---|---|
  | Host, provider, country | — |
  | Node | — (below 22, wrangler runs in Docker) |
  | Chromium path | — (`npx playwright@1.56.1 install --with-deps chromium` prints it) |
  | Air4Thai from it | — (170 or more stations?) |
  | ThaiWater from it | — (200, or 429?) |

- **In a cloud session:** Chromium is at `/opt/pw-browsers/chromium`.
- **A change is done when** the tests and the walk pass and the docs change in the same commit: CHANGELOG,
  KNOWN_ISSUES and KNOWLEDGE for any number, and this file if the state changed.
- **A release bumps the version** in `package.json`, `package-lock.json`, `main.js`, `sw.js` (twice) and `index.html` (GUIDELINES §6).
- **The rules that bite** (all in [docs/GUIDELINES.md](docs/GUIDELINES.md)):
  - evidence for every number;
  - the agency's word leads;
  - the verdict is never milder than a tile;
  - missing data is never calm;
  - a forecast tops out at เตรียมตัว;
  - the exact GPS fix never leaves the phone;
  - AI only off the visitor's path, checked, labelled (§10);
  - keys only in `.env`, one per job;
  - never another project's `.env` or tunnel token;
  - **one server per app** (never FloodWatch's);
  - push before leaving a server.
- **Where things are:**

  | What | Where |
  |---|---|
  | Every number | [KNOWLEDGE](docs/KNOWLEDGE.md) |
  | Every source | [SOURCES](docs/SOURCES.md) |
  | Every forecast's skill | [MODELS](docs/MODELS.md) |
  | The risk server's runbook | [SERVER §2](docs/SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server) |
  | Cloudflare and GLM | [CLOUDFLARE](docs/CLOUDFLARE.md), [AI](docs/AI.md) |
  | How it was built and checked | [APPROACH_AND_METHODS](docs/APPROACH_AND_METHODS.md) |
  | The research trail and decisions D-001 … D-043 | [research/HISTORY](docs/research/HISTORY.md) |
  | Frank feedback, including on the sessions' own faults | [FRANK_FEEDBACK](docs/FRANK_FEEDBACK.md) |

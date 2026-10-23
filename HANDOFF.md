# Handoff

**Disaster Now (ภัยรอบบ้าน ตอนนี้) v0.3.0, 23 Oct 2026.** Built, validated, audited and **ready for Cloudflare at
`risk.autobahn.bot`**. It is **not deployed** and **not tried on real phones**. Read this first, then [AGENTS.md](AGENTS.md).

## 1. Where things stand

- **The page** (`public/`, static, no framework): GPS or search → the nearest of 7,425 subdistricts → a verdict, ten
  tiles, pre-warnings, the 3-day table and ten cards, in Thai and English. Forecasts as validated ([docs/MODELS.md](docs/MODELS.md)).
- **0.3.0 added** ([CHANGELOG](CHANGELOG.md)):
  - **Cloudflare** prepared: Workers static assets plus a KV-backed `/data/live/*`, tested with a dry run and `wrangler dev` ([docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)).
  - **GLM** writes checked English for TMD's Thai-only warnings, and nothing else on a visitor's path ([docs/AI.md](docs/AI.md)).
  - The **live cross-check** found TMD warning heavy rain where the model said "low" in all 11 provinces. The warning now leads the tile, the verdict and the table ([research](docs/research/crosscheck-live-2026-10-23.md)).
  - The verdict sits on the first screen at 360 × 640.
  - No interim verdict while sources arrive.
  - Link previews.
  - A `.env` for this project only.
- **On the owner's server** (FloodWatch's, Germany): the Docker stack ran healthy, and the collector wrote 5 of 5 files
  with **Air4Thai's 173 stations**. The stack was stopped afterwards; start it with `docker compose up -d --build`.
- **Checks, last run 23 Oct 2026 ≈ 22:15 UTC:**
  - `npm test`: 59 of 59.
  - The visitor walk: 29 of 29 on fixtures.
  - Live walks in Bangkok (360 × 640 LINE), Phuket (EN) and Chiang Mai.
  - `npm run cf:deploy -- --dry-run`: 32 files, both bindings.
  - Not run: the gauge cross-check (ThaiWater 429, KI-029).

## 2. What the owner has to do ([docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md))

1. **A11:** delete `.env.floodwatch-original`. The `.env` you added was FloodWatch's, including **FloodWatch's live
   tunnel token**. It was replaced by this project's variables.
2. **A9:** a Cloudflare token that can write Workers KV (now 401), ideally a KV-only one as `CF_KV_TOKEN`.
3. **A10:** go live: `npm run cf:setup` → `docker compose up -d --build` → `npm run cf:deploy` ([CLOUDFLARE §4](docs/CLOUDFLARE.md#4-what-the-owner-does)).
4. **A4:** test on an Android and an iPhone, inside LINE, and check the link preview in a chat.
5. **A5:** a native Thai review, starting from GLM's first reading ([copy review](docs/research/copy-review-glm-2026-10-23.md)), and a bilingual check of the first ten warning translations.
6. **Decisions:** D1 (heat), D6 (GLM translation, platform), D7 (rain level vs word), D5 (GISTDA alone).
7. **A8, B1–B4:** the default branch and the v0.3.0 tag; CORS on FloodWatch; a shared ThaiWater snapshot (INTEGRATION §3.5).

## 3. What an agent can do next ([docs/ROADMAP.md](docs/ROADMAP.md))

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
  - `npm test`;
  - `CHROME_PATH=<chromium> npm run smoke` (add `-- --live` for wording or source changes, at most twice from FloodWatch's server);
  - `npm run check:docs`, `npm run check:advice`;
  - `node tools/env-check.mjs --probe`;
  - `docker compose up -d --build`, then `node tools/health.mjs --web http://127.0.0.1:8090/`;
  - `npm run cf:deploy -- --dry-run`.
- **Chromium on this server:** `/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`.
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
  - never another project's `.env` or tunnel token.
- **Where things are:**

  | What | Where |
  |---|---|
  | Every number | [KNOWLEDGE](docs/KNOWLEDGE.md) |
  | Every source | [SOURCES](docs/SOURCES.md) |
  | Every forecast's skill | [MODELS](docs/MODELS.md) |
  | Cloudflare and GLM | [CLOUDFLARE](docs/CLOUDFLARE.md), [AI](docs/AI.md) |
  | How it was built and checked | [APPROACH_AND_METHODS](docs/APPROACH_AND_METHODS.md) |
  | The research trail and decisions D-001 … D-039 | [research/HISTORY](docs/research/HISTORY.md) |
  | Frank feedback, including on both sessions' own faults | [FRANK_FEEDBACK](docs/FRANK_FEEDBACK.md) |

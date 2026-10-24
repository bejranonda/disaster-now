# Handoff

**ภัยรอบบ้าน · Thai Risk (code name `disaster-now`) v0.5.0, 24 Oct 2026.** Built, validated, audited three ways, and
running its collector on `autobahn-bot`. **Not deployed:** Cloudflare refused the deploy because the token lacks
*Workers Scripts: Edit*. Not tried on real phones. Read this first, then [AGENTS.md](AGENTS.md).

## 1. Where things stand

- **The page** (`public/`, static): GPS or search → a verdict, ten tiles, pre-warnings, a 3-day table and ten cards,
  in Thai and English, for any of 7,425 subdistricts.
- **0.4.0** ([CHANGELOG](CHANGELOG.md)):
  - **The name** ภัยรอบบ้าน · Thai Risk (D-044).
  - **One forecast, one level:** `assess.fcLevel` grades a forecast for the tile, chips, table and pre-warnings.
    0.3.0 showed the same heat forecast orange and red.
  - **Heat:** the line ran 3–4 °C hot from November to February, worse than raw. Nov–Feb now uses **C6**, provisional
    (D-046). The page also computes what was validated: 13:00/16:00 and `elevation=nan`.
  - **An evening false alarm removed** (S6). **A province search** opens its town. **Stale collector files are
    missing, not calm** (S12).
  - 25 visitor findings (U), 19 output findings (X) and the session's own (S) fixed or recorded
    ([review](docs/research/review-2026-10-24.md)).
- **The host:** `autobahn-bot`, beside BrainPlatform (the owner's choice, D-045). The stack is up: web on 127.0.0.1:8090
  and the collector every 15 min. Air4Thai 173 stations; ThaiWater answering. KV namespace `disaster-now-live` created.
- **0.5.0, the prediction research** ([FRANK_FEEDBACK §8](docs/FRANK_FEEDBACK.md#8-prediction-research-24-oct-2026)):
  five studies ([air](docs/research/predict-air-2026-10-24.md), [earthquakes](docs/research/predict-earthquake-2026-10-24.md),
  [other hazards](docs/research/predict-hazards-2026-10-24.md), [Hat Yai 2025](docs/research/hatyai-flood-2025-hindcast.md),
  [heat](docs/research/model-check-2026-10-24.md)). Shipped: a dust-day chance (Dec–Apr, provisional), PCD's forecast
  link; earthquake wording, Android's alerts, the 2564 seismic zones, the Bangkok term on land only; a multi-day rain
  caution and who alerts at เตรียมตัว+. Aftershock chances, ML, a 25 km rain chance and GloFAS did not earn a place.
- **Checks, 24 Oct 2026 ≈ 09:30 UTC, on `autobahn-bot`:**
  - `npm test` 89 of 89 at 0.5.0 (82 at 0.4.0).
  - The fixture walk passes every check: the table's box at 320 px, the evening, tap targets both ways, a stale
    collector, no coordinates on screen.
  - One live walk (16:21 Bangkok) passes.
  - `check:docs` and `check:advice` pass; `preflight` shows no ❌.
  - `cf:deploy -- --dry-run` passes; **`cf:deploy` was refused (403)**.

## 2. What the owner has to do ([docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md))

1. **A9: the token.**
   - Add *Account → Workers Scripts: Edit* and *Zone autobahn.bot → Workers Routes: Edit*.
   - Remove what it doesn't need: all other zones, Zone Settings, Page Rules, Firewall, Workers AI, Pages, R2.
   - Make a second, KV-only token as `CF_KV_TOKEN`.
   - `node tools/env-check.mjs --probe` must say "Workers deploy: allowed".
2. **A10: deploy.** `npm run cf:deploy`, then `docker compose up -d` (so the collector reads `CF_KV_TOKEN`), then
   `node tools/health.mjs --web https://risk.autobahn.bot/`.
3. **A4:** an Android and an iPhone, from a LINE chat; tap 📍; send the link to a family group.
4. **A5:** a native Thai review, from GLM's first reading.
5. **Decisions:** D1 (heat orange most afternoons), D8 (the redesign), D9 (one palette for the family), D10, **D11
   (the earthquake rule)**, and whether to keep C6 after it is scored (end of November).
6. **Four emails to agencies** (C4, C6, C7, C8): ONWR's flood warnings, PCD's dust forecast as data, RFD's fire rating
   and ONWR's drought index, DDPM's alert channels. And FloodWatch's replay of Hat Yai, Nov 2025 (B5).
7. **A11, A8, B1–B4:** delete the old checkout on FloodWatch's server; GitHub default branch and releases; CORS on
   FloodWatch; a shared ThaiWater snapshot.

## 3. What an agent can do next ([docs/ROADMAP.md](docs/ROADMAP.md))

- **After the owner's token:** deploy, check the edge (`/data/live/index.json` under 15 min old, `kv.ok`), and re-take
  `docs/screens/` from the live site.
- **Daily from the server:** `node research/archive_forecasts.mjs` (cron), so C6 and the PM2.5 chance can be scored as
  issued (MODELS §1.1).
- **The measured path for floods** (KI-039): the collector's province rain and level files, a measured 3-day rain line,
  FloodWatch's upstream line; then a 3-day rain chance only if Nov–Jan 2026–27 scores it.
- **AI-ready:** KI-024 (Thai region names), KI-012 (landmarks), KI-033/D8 (the redesign, after the owner).

## 4. How to work here

- **Commands:**
  - `npm run preflight`;
  - `npm test`;
  - `CHROME_PATH=/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome npm run smoke` (`-- --live` once per
    change);
  - `npm run check:docs`, `npm run check:advice`;
  - `node tools/env-check.mjs --probe`;
  - `docker compose up -d --build`, then `node tools/health.mjs --web http://127.0.0.1:8090/`;
  - `npm run cf:deploy -- --dry-run`.
- **This host's facts:**

  | Fact | Value |
  |---|---|
  | Host | `autobahn-bot`; also runs BrainPlatform (`/root/BrainPlatform/deploy`, `deploy-*` containers: never touch) |
  | Node, Docker | 24.14.0 (wrangler runs without Docker); 29.4.0 with compose |
  | Chromium | `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` |
  | Air4Thai from it | 173 stations (07:50 UTC, 24 Oct) |
  | ThaiWater from it | answering, no 429 in the session's walks and audits |
  | Python | 3.12, no numpy: research scripts make a venv in the scratchpad |

- **A change is done when** the tests and the walk pass and the docs change in the same commit (CHANGELOG,
  KNOWN_ISSUES, KNOWLEDGE for any number, this file if the state changed).
- **A release bumps the version** in `package.json`, `package-lock.json`, `main.js`, `sw.js` (twice) and `index.html`.
- **The rules that bite** ([docs/GUIDELINES.md](docs/GUIDELINES.md)):
  - evidence for every number;
  - the agency's word leads;
  - one grading for every view of a forecast;
  - a correction only inside the domain it was fitted on;
  - missing data, including a stale collector, is never calm;
  - walk the clock (the evening too);
  - the exact GPS fix never leaves the phone, and no coordinates on screen for it;
  - never FloodWatch's server;
  - one live walk per change.
- **Where things are:**

  | What | Where |
  |---|---|
  | Every number | [KNOWLEDGE](docs/KNOWLEDGE.md) |
  | Every forecast's skill | [MODELS](docs/MODELS.md) (§1.1: the model check) |
  | Known problems | [KNOWN_ISSUES](docs/KNOWN_ISSUES.md) |
  | This session's audits | [review](docs/research/review-2026-10-24.md), [visitor](docs/research/visitor-audit-2026-10-24.md), [output](docs/research/output-crosscheck-2026-10-24.md), [model check](docs/research/model-check-2026-10-24.md) |
  | The server and Cloudflare | [SERVER](docs/SERVER.md), [CLOUDFLARE](docs/CLOUDFLARE.md) |
  | Decisions D-001 … D-052 | [research/HISTORY](docs/research/HISTORY.md) |
  | Frank feedback | [FRANK_FEEDBACK](docs/FRANK_FEEDBACK.md) |

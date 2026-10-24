# AGENTS.md: guide for AI assistants

## 1. The project in brief

**ภัยรอบบ้าน · Thai Risk** (code name `disaster-now`; ภัยรอบบ้าน ตอนนี้ / Disaster Now until 0.3.0) is one Thai web page: share GPS or search a place, and see every hazard at that point now and for the next 3 days, with the agency's own words, the source and time of every number, one sourced action and a link to what to do. Heat, PM2.5 and other pollution, UV, rain, wind and storms, river level and flash floods, landslides, earthquakes, fires. Static files (`public/`), no server, no framework, no runtime packages; a collector (`tools/collect.mjs`) for the feeds a phone can't read. It is the third app of the owner (`bejranonda`), beside FloodWatch (`flood2026-research`, water) and บ้านรอดไหม (`Hazard-huntz`, what to do), and must agree with both ([docs/INTEGRATION.md](docs/INTEGRATION.md)).

**State (25 Oct 2026):** v0.7.0, **live at https://risk.autobahn.bot** with its live files
([FRANK_FEEDBACK §10](docs/FRANK_FEEDBACK.md#10-the-redesign-25-oct-2026-070)): the redesign (one hero, one list sorted by
concern whose rows open in place, the staff gauge, the site's own icons and font), FloodWatch's gauges through the
collector, this page's upstream lines and Hat Yai's red-flag rain, heat in the DOH's colours (D1).
- Built, validated, and audited again in 0.4.0: an independent visitor audit, an output cross-check (139 of 144 numbers
  equal the sources) and a model check that found the heat line 3–4 °C hot in Nov–Feb (now C6 there, provisional;
  [docs/MODELS.md §1.1](docs/MODELS.md#11-the-model-check-of-24-oct-2026-and-what-040-changed)).
- **The collector runs on `autobahn-bot`**, beside BrainPlatform's production stack (the owner's choice, D-045): never
  touch its `deploy-*` containers.
- **Deployed** (`npm run cf:deploy`); the collector uploads its files to KV with its own KV-only token; the deploy
  token is still broader than it needs to be (OWNER_ACTIONS A9; [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)).
- **Simulated in LINE and on tablets, not tested on real phones** (A4). See [HANDOFF.md](HANDOFF.md).

## 2. Read in this order

1. [HANDOFF.md](HANDOFF.md): where things stand, what the owner has to do.
2. [docs/GUIDELINES.md](docs/GUIDELINES.md): the rules (evidence, levels, privacy, consistency, copy, testing).
3. [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): known problems (KI-NNN). Don't rediscover them; update them.
4. [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md): every number, band and source rule, with evidence.
5. [docs/SOURCES.md](docs/SOURCES.md), [docs/MODELS.md](docs/MODELS.md), [docs/APPROACH_AND_METHODS.md](docs/APPROACH_AND_METHODS.md), [docs/ROADMAP.md](docs/ROADMAP.md).

## 3. Commands

| Command | What it does |
|---|---|
| `npm test` | unit tests on saved live responses (`test/fixtures`, 23 Oct 2026) |
| `CHROME_PATH=<chromium> npm run smoke` | the visitor walk in headless Chromium on the fixtures, clock pinned to 23 Oct 2026 19:50 UTC, plus an 18:30 page (390, 360 × 640 in LINE and 320 px, Thai and English, search, saved places, a slow warnings feed, the English warning, a stale collector, every source down). `<chromium>`: `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` on `autobahn-bot`, `/opt/pw-browsers/chromium` in a cloud session |
| `npm run smoke -- --live` | the same walk on the real sources, printing every card |
| `npm run smoke -- --screens <dir>` | also saves screenshots |
| `npm run serve` | the page on http://127.0.0.1:8787/ |
| `npm run collect` | the collector once, into `public/data/live/` (git-ignored) |
| `npm run check:advice` | the advice lines and bands still equal บ้านรอดไหม's |
| `npm run check:docs` | every relative link and anchor in the Markdown |
| `docker compose up -d --build` | the page on 127.0.0.1:8090 and the collector every 15 min ([docs/SERVER.md](docs/SERVER.md)) |
| `node tools/health.mjs --web URL [--need-live]` / `--live DIR` | health of the page (with `--need-live`: and a fresh live index, e.g. the edge's KV) / the collector's files (exit 0 or 1) |
| `npm run preflight` | is this host ready for the stack and the deploy? Fails on FloodWatch's server, without `.env` or a deploy token, or with KV ids that differ; read-only, prints no values |
| `node tools/env-check.mjs [--probe]` | which `.env` variables are set (never their values); `--probe` tests the Cloudflare token (including whether it may deploy) and GLM |
| `npm run cf:setup` / `npm run cf:deploy [-- --dry-run]` | create the KV namespace and write its id / deploy to Cloudflare with the pinned wrangler (Docker on Node < 22) |
| `npm run ai:review-copy` | GLM's first reading of the Thai copy → `docs/research/copy-review-glm-<date>.md` (a reviewer's prompt, never applied unread) |
| `CHROME_PATH=… node tools/make-images.mjs` | re-render `og.png` and the PNG icons (after a rename) |
| `node research/archive_forecasts.mjs` | save the page's own forecast for 12 points (once a day; for scoring C6 and the PM2.5 chance as issued) |
| `node research/crosscheck_live.mjs <live dir> [--fw URL]` | the live cross-check: gauges vs FloodWatch, TMD warnings vs the ensemble, TMD vs EMSC quakes, GISTDA vs PCD |
| `node tools/collect.mjs --every 900` | the collector as a loop (at least 600 s) |
| `python3 tools/build_tambon.py <xlsx>` | rebuild `public/data/tambon.json` from HDX COD-AB |
| `node research/crosscheck_floodwatch.mjs <tw.json> <fw.json>` | gauge statuses vs FloodWatch |

## 4. Definition of done

1. `npm test` and `npm run smoke` pass; for wording or source changes also `npm run smoke -- --live`, read as a visitor; for server changes `docker compose up -d --build` and `tools/health.mjs`. A fixed audit finding gets a test named after its ID (`test/audit.test.mjs`).
2. The docs are updated in the same commit: CHANGELOG (Unreleased), KNOWN_ISSUES, KNOWLEDGE for any number, HANDOFF if the state changed.
3. The report gives the real output of every check and says which were not run.
4. Commit messages start with `feat:`, `fix:`, `content:`, `docs:`, `test:` or `chore:`. Push only to the branch you were given; no pull requests unless asked.

## 5. Hard rules (short versions of GUIDELINES §1–2)

- **Never invent a number, an endpoint or a safety line;** mark the unconfirmed **[unverified]**.
- **The agency's word leads; the app's level is never milder than it;** the verdict is never milder than a tile; missing data is never calm; **a forecast alone tops out at เตรียมตัว**; an official warning lifts its tile.
- **Measurements before models; ranges and chances, never countdowns; nothing predicts earthquakes** (and the page computes no earthquake chance of its own, nor recomputes an agency's for a place: D-060; the aftershock wording is the owner's D11).
- **The list is sorted by concern** (each row by the worse of today and its coming days, grouped by the scale's words;
  the verdict's colour stays today's); **the interface draws no emoji** (the site's icons and the staff gauge; data
  words may keep theirs for the LINE share text); **a model value is tagged on its face** (D-061–D-063).
- **The agency's own colours where it gives them** (D-053: heat follows the DOH's, PM2.5 PCD's); **FloodWatch's look ahead only from the gauges that judge the point, with its record; upstream lines say nothing on stale, flagged or spurious data** (D-055, D-056).
- **The exact GPS fix never leaves the phone** (rounded to ~1 km for providers and links; no coordinates on screen for a GPS place); shared links carry a subdistrict code; no cookies, analytics or accounts; a server publishes files and keeps nothing about a person.
- **Only validated forecast numbers, in validated words** (MODELS.md): never the raw heat index, never a rain amount as a forecast.
- **Rivers as FloodWatch reads them; advice as บ้านรอดไหม words it.**
- **Honest User-Agent, never faster than a source updates, no evasion of blocks or bot checks; no VPN or rotation** (D-058); what FloodWatch already reads comes through its API (D-054).
- **No secrets in git;** keys only in `.env` (one scoped token per job), passed only to the service that needs it, in headers, never printed. **Never copy another project's `.env`; never run FloodWatch's tunnel token here.**
- **AI (GLM) only off the visitor's path:** it translates or reviews public text; rules write every level, number and advice; what the page shows from it is checked and labelled (GUIDELINES §10).
- **Never on FloodWatch's server; another app's host only with the owner's yes** (D-045: `autobahn-bot` beside BrainPlatform is allowed; never touch its containers); `npm run preflight` first on any host. **Never loop live calls:** ThaiWater rate-limits per IP (KI-029).
- **One grading for every view of a forecast** (`assess.fcLevel`); **a correction only inside the domain it was fitted on**; **walk the clock** (the evening too); **a stale collector is missing, never calm** (GUIDELINES 3b, 3e, §6).

## 6. How the owner works

From the owner's brief and the sister repos: research deep and verify every number; frank feedback is welcome; assumptions over questions, and record open questions in [docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md); finished work with docs kept current; the audience is Thai families on phones, many inside LINE.

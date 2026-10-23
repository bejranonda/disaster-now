# AGENTS.md: guide for AI assistants

## 1. The project in brief

**ภัยรอบบ้าน ตอนนี้ (Disaster Now)** is one Thai web page: share GPS or search a place, and see every hazard at that point now and for the next 3 days, with the agency's own words, the source and time of every number, one sourced action and a link to what to do. Heat, PM2.5 and other pollution, UV, rain, wind and storms, river level and flash floods, landslides, earthquakes, fires. Static files (`public/`), no server, no framework, no runtime packages; a collector (`tools/collect.mjs`) for the feeds a phone can't read. It is the third app of the owner (`bejranonda`), beside FloodWatch (`flood2026-research`, water) and บ้านรอดไหม (`Hazard-huntz`, what to do), and must agree with both ([docs/INTEGRATION.md](docs/INTEGRATION.md)).

**State (23 Oct 2026):** v0.1.0, built and tested in one agent session; **not deployed** and **not tested on real phones**. See [HANDOFF.md](HANDOFF.md).

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
| `CHROME_PATH=/opt/pw-browsers/chromium npm run smoke` | the visitor walk in headless Chromium on the fixtures, clock pinned to 23 Oct 2026 19:50 UTC (390 and 320 px, Thai and English, search, saved places, every source down) |
| `npm run smoke -- --live` | the same walk on the real sources, printing every card |
| `npm run smoke -- --screens <dir>` | also saves screenshots |
| `npm run serve` | the page on http://127.0.0.1:8787/ |
| `npm run collect` | the collector once, into `public/data/live/` (git-ignored) |
| `npm run check:advice` | the advice lines and bands still equal บ้านรอดไหม's |
| `python3 tools/build_tambon.py <xlsx>` | rebuild `public/data/tambon.json` from HDX COD-AB |
| `node research/crosscheck_floodwatch.mjs <tw.json> <fw.json>` | gauge statuses vs FloodWatch |

## 4. Definition of done

1. `npm test` and `npm run smoke` pass; for wording or source changes also `npm run smoke -- --live`, read as a visitor.
2. The docs are updated in the same commit: CHANGELOG (Unreleased), KNOWN_ISSUES, KNOWLEDGE for any number, HANDOFF if the state changed.
3. The report gives the real output of every check and says which were not run.
4. Commit messages start with `feat:`, `fix:`, `content:`, `docs:`, `test:` or `chore:`. Push only to the branch you were given; no pull requests unless asked.

## 5. Hard rules (short versions of GUIDELINES §1–2)

- **Never invent a number, an endpoint or a safety line;** mark the unconfirmed **[unverified]**.
- **The agency's word leads; the app's level is never milder than it;** the verdict is never milder than a tile; missing data is never calm.
- **Measurements before models; ranges and chances, never countdowns; nothing forecasts earthquakes.**
- **The exact GPS fix never leaves the phone** (rounded to ~1 km for providers); shared links carry a subdistrict code; no server, cookies, analytics or accounts.
- **Rivers as FloodWatch reads them; advice as บ้านรอดไหม words it.**
- **Honest User-Agent, never faster than a source updates, no evasion of blocks or bot checks.**
- **No secrets in git;** keys only in the collector's environment, in headers.

## 6. How the owner works

From the owner's brief and the sister repos: research deep and verify every number; frank feedback is welcome; assumptions over questions, and record open questions in [docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md); finished work with docs kept current; the audience is Thai families on phones, many inside LINE.

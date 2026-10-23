# Handoff

**Disaster Now (ภัยรอบบ้าน ตอนนี้) v0.2.0, 23 Oct 2026.** It is built, tested and server-ready. It is **not deployed** and **not tried on real phones**. Read this first, then [AGENTS.md](AGENTS.md) for the rules.

## 1. Where things stand

- **The page** (`public/`, static, no framework): GPS or search → the nearest of 7,425 subdistricts → a verdict, ten hazard tiles, cards, pre-warnings and a 3-day table, in Thai and English.
- **Forecasts as validated** ([docs/MODELS.md](docs/MODELS.md)):
  - heat corrected (raw read 5 °C low);
  - PM2.5 by the damped ratio;
  - rain in three chance words;
  - quakes in the validated felt words, with a Bangkok term;
  - gusts labelled unvalidated.
  - A forecast alone never says "ทำทันที".
- **Agrees with the family:** the same gauge statuses as FloodWatch (691 of 693), and บ้านรอดไหม's advice lines word for word (`npm run check:advice`).
- **Audited by three independent agents** (validation, output cross-check, visitor audit; [docs/research/](docs/research/)). Their blockers and most majors are fixed, each with a unit test. What's left is KNOWN_ISSUES KI-022 … KI-027.
- **Server-ready:** `docker compose up -d --build` serves the page on 127.0.0.1:8090 and runs the collector every 15 minutes. It was tested in Docker in the session ([docs/SERVER.md](docs/SERVER.md)).
- **Checks, last run 23 Oct 2026 ≈ 21:15 UTC:**
  - `npm test`: 46 of 46 pass.
  - The visitor walk: all 23 checks pass on fixtures and on live sources.
  - Docker: both containers healthy; the collector wrote 4 of 5 files (Air4Thai answered 503).

## 2. What the owner has to do ([docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md))

1. **A7, A1, A3:** put the stack on FloodWatch's server, with a public hostname (a tunnel, or FloodWatch's proxy).
2. **A6:** check Air4Thai from that server. It refused the cloud host all evening.
3. **A4:** test on an Android and an iPhone, inside LINE.
4. **D1:** decide on heat. Corrected, the tile reads "อันตราย" on most afternoons, and the verdict is orange most days.
5. **A8:** make `main` the default branch, delete the work branch and create the `v0.2.0` release. The session can't change repository settings or push tags.
6. **B1, B2:** CORS on FloodWatch's `/api/point` and `/api/geocode`.
7. **A5:** a native Thai review of the copy.

## 3. What an agent can do next ([docs/ROADMAP.md](docs/ROADMAP.md))

- **AI-ready now**, from the audits' leftovers in order:
  - the verdict above the fold at 360 px (KI-022);
  - no interim milder verdict (KI-026);
  - the 3-day table moved up, with words (KI-025);
  - Thai place names (KI-024);
  - local search names (KI-012);
  - the flood line (KI-008);
  - the polish list (KI-027);
  - bad-day fixtures (KI-020).
- **Once the server exists** ([SERVER §6](docs/SERVER.md#6-what-to-build-on-the-server-next)): Air4Thai relayed from Thailand, district forecast files (no point leaves the phone; KI-011), a GDACS digest, national files by code, an archive of issued forecasts for re-tests.
- **Re-test** the damped PM2.5 ratio as issued in the 2026–27 dry season. It was chosen post-hoc.

## 4. How to work here

- **Commands:**
  - `npm test`;
  - `CHROME_PATH=/opt/pw-browsers/chromium npm run smoke` (add `-- --live` for wording or source changes);
  - `npm run check:docs`;
  - `npm run check:advice`;
  - `docker compose up -d --build`;
  - `node tools/health.mjs --web http://127.0.0.1:8090/`.
- **A change is done when** the tests and the walk pass and the docs change in the same commit: CHANGELOG, KNOWN_ISSUES and KNOWLEDGE for any number, and this file if the state changed. A release bumps the version in five places (GUIDELINES §6); a test catches a missed service-worker entry.
- **The rules that bite** (the full list is in [docs/GUIDELINES.md](docs/GUIDELINES.md)):
  - Evidence for every number.
  - The agency's word leads, and the verdict is never milder than a tile.
  - Missing data is never calm.
  - A forecast tops out at เตรียมตัว.
  - The exact GPS fix never leaves the phone, not even in a screenshot or link.
  - Rivers as FloodWatch reads them; advice as บ้านรอดไหม words it.
  - No secrets in git.
- **Where things are:**

  | What | Where |
  |---|---|
  | Every number | [KNOWLEDGE](docs/KNOWLEDGE.md) |
  | Every source | [SOURCES](docs/SOURCES.md) |
  | Every forecast's skill | [MODELS](docs/MODELS.md) |
  | How it was built and checked | [APPROACH_AND_METHODS](docs/APPROACH_AND_METHODS.md) |
  | The research trail and decisions D-001 … D-029 | [research/HISTORY](docs/research/HISTORY.md) |
  | Frank feedback, including on this session's own faults | [FRANK_FEEDBACK](docs/FRANK_FEEDBACK.md) |

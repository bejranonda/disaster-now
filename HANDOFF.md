# Handoff

**ภัยรอบบ้าน · Thai Risk (code name `disaster-now`) v0.7.0, 25 Oct 2026. Live at https://risk.autobahn.bot**
(Cloudflare Workers, version `e8ef0130`), with its live files (the collector uploads to KV every 15 min since 24 Oct
21:12 UTC). Redesigned on the owner's brief and audited before shipping. Simulated in LINE and on tablets, not tried on
real phones (A4). Read this first, then [AGENTS.md](AGENTS.md).

## 1. Where things stand

- **The page** (`public/`, static): GPS or search → a verdict, ten tiles, pre-warnings, a 3-day table and ten cards,
  in Thai and English, for any of 7,425 subdistricts.
- **0.7.0, the redesign** ([CHANGELOG](CHANGELOG.md), D-061–D-063): one hero (the level on the staff gauge, the worst
  hazard, the action, "ข้างหน้า", what is missing), "ส่งใน LINE" in one tap, every hazard in one list **sorted by concern**
  (by the worse of today and its coming days, grouped by the scale's words) whose rows open in place; the 3-day table and
  the profile folded; sources behind a real ⓘ; the site's own icons, mark and font (Anuphan, self-hosted); two columns
  from 960 px. An independent audit ([redesign-audit](docs/research/redesign-audit-2026-10-25.md)) found R1 (a coming
  เตรียมตัว filed under "ยังไม่น่าห่วง") and nine mediums before it shipped; all fixed.
- **0.6.0** ([CHANGELOG](CHANGELOG.md)):
  - **Live.** The token gained *Workers Scripts: Edit*; 0.5.0 went live at 20:13 UTC, 0.6.0 at the end of the session.
  - **FloodWatch through the collector** (`floodwatch.json`, D-054): the flood tile reads FloodWatch's own rows while
    fresh, BMA's canals included (KI-007 closed); ThaiWater from the phone otherwise, so the page backs FloodWatch up.
    FloodWatch's look ahead with its 30-day record, only from the gauges that judge the point (D-055).
  - **Hat Yai:** this page's own upstream lines (D-056), the measured 3-day rain and Hat Yai's red flag (D-057)
    ([lead time](docs/research/floodwatch-hatyai-leadtime-2026-10-24.md)).
  - **D1 decided: heat in the DOH's own colours** (D-053). Orange heat now means "≥ 42 °C likely"; a rain or river
    signal changes the colour a family sees.
  - **The first screen:** "ข้างหน้า", "เปลี่ยนจากที่ดูครั้งก่อน", a share text with its own time (D-059).
  - **The device study's fixes** (T1–T5, T7–T10, T12, T14–T16).
- **The host:** `autobahn-bot` (Germany), beside BrainPlatform (D-045). Web on 127.0.0.1:8090; the collector every
  15 min writes 7 files plus `rain3d.json` hourly (its rain history began 20:28 UTC on 24 Oct: 3-day totals from 26 Oct).
- **Research this evening:** [FloodWatch's API](docs/research/floodwatch-integration-2026-10-24.md),
  [Hat Yai lead time](docs/research/floodwatch-hatyai-leadtime-2026-10-24.md), [D11](docs/research/eq-d11-2026-10-24.md),
  [UX D8/D1/D9/incidents](docs/research/ux-d8-d1-d9-incidents-2026-10-24.md), [devices](docs/research/device-sim-2026-10-24.md);
  frank summary in [FRANK_FEEDBACK §9](docs/FRANK_FEEDBACK.md#9-live-floodwatch-hat-yai-again-24-oct-2026-evening-060).
- **Checks, 25 Oct 2026 ≈ 05:00 Bangkok (22:00 UTC), on `autobahn-bot`:**
  - `npm test` 105 of 105.
  - The fixture walk passes every check (the list's order, no emoji in the chrome, rows read open and closed with their
    sources, the dashed gauges when every source is down, the hero ends at 491–505 px at 360 × 640 in LINE).
  - One live walk (Bangkok) passes; the live cross-check (gauges 638 of 646 with FloodWatch, quakes, GISTDA ×1.28).
  - One load of the deployed page at Hat Yai under TMD's real Extreme very-heavy-rain notice: "ทำทันที", rain first,
    the notice in full, no page errors.
  - `check:docs` (48 files) and `check:advice` pass; the stack healthy; `health --web https://risk.autobahn.bot/
    --need-live` ok (`kv: true`).

## 2. What the owner has to do ([docs/OWNER_ACTIONS.md](docs/OWNER_ACTIONS.md))

1. **Look at the redesign on your phone** (A4, with two family members if you can: the older reader is the test, KI-044).
   If anything reads wrong, `npx wrangler@4.148.0 rollback` returns 0.6.0.
2. **A9:** narrow the deploy token (the KV-only token is done and checked).
3. **A14:** Cloudflare's zone cookie (`cf_clearance`, KI-042): turn JavaScript detections off for `autobahn.bot`, or let
   the page disclose it.
4. **Decisions:** D11 (the words are ready; your yes ships them), D9 (one palette for the family), D10; keep C6 after
   its scoring (end of November); keep D1 after a month of the archive. D8 is done (0.7.0).
5. **FloodWatch (B6–B8):** a measured-rain endpoint; Hat Yai's RID freshness; KI-545 first, then upstream levels and
   measured rain in its model.
6. **Four emails to agencies** (C4, C6, C7, C8), **A5** (a Thai reader), **A11, A8, B2–B4**.

## 3. What an agent can do next ([docs/ROADMAP.md](docs/ROADMAP.md))

- **R15:** NBSP between numbers and units in `assess.js`'s lines (KI-044).
- **Daily from the server:** `node research/archive_forecasts.mjs` (cron): C6, the dust chance and D1 counted as issued.
- **The upstream rule's record outside Hat Yai** (D-056: A lifts to เตรียมตัว only on the U-Taphao until then).
- **D11 after the owner's yes.**

## 4. How to work here

- **Commands:**
  - `npm run preflight`;
  - `npm test`;
  - `CHROME_PATH=/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome npm run smoke` (`-- --live` once per
    change, after `docker compose cp collector:/app/public/data/live/. public/data/live/` so it reads fresh files);
  - `npm run check:docs`, `npm run check:advice`;
  - `node tools/env-check.mjs --probe`;
  - `docker compose up -d --build`, then `node tools/health.mjs --web http://127.0.0.1:8090/ --need-live`;
  - `npm run cf:deploy` (the token may deploy since 24 Oct 20:12 UTC), then `node tools/health.mjs --web https://risk.autobahn.bot/`.
- **This host's facts:**

  | Fact | Value |
  |---|---|
  | Host | `autobahn-bot` (Cloudflare trace `loc=DE`); also runs BrainPlatform (`/root/BrainPlatform/deploy`, `deploy-*` containers: never touch) |
  | Node, Docker | 24.14.0 (wrangler runs without Docker); 29.4.0 with compose |
  | Chromium | `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` (no WebKit) |
  | Air4Thai from it | 173 stations |
  | ThaiWater from it | answering; the collector reads `rain_24h` once an hour |
  | FloodWatch from it | `/api/stations` 2.47 MB and `/api/risks`, 200, no CORS needed server-side |
  | Python | 3.12, no numpy: research scripts make a venv in the scratchpad |

- **A change is done when** the tests and the walk pass and the docs change in the same commit (CHANGELOG,
  KNOWN_ISSUES, KNOWLEDGE for any number, this file if the state changed).
- **A release bumps the version** in `package.json`, `package-lock.json`, `main.js`, `sw.js` (twice) and `index.html`.
- **The rules that bite** ([docs/GUIDELINES.md](docs/GUIDELINES.md)):
  - evidence for every number;
  - the agency's word leads, in the agency's own colours;
  - one grading for every view of a forecast;
  - a correction only inside the domain it was fitted on, a rule's level only where its record is;
  - missing data, including a stale collector or a late upstream gauge, is never calm;
  - walk the clock (the evening too) and the device (blocked storage, LINE without Web Share);
  - count a new rule's firings on today's real data and read them before shipping;
  - construct the worst day (a hot day before heavy rain) before calling an order or a fold safe;
  - never fold an official warning, what is missing, or a hazard's level; ⓘ is always a button;
  - no emoji in the interface: the sprite's icons and the staff gauge;
  - the exact GPS fix never leaves the phone, and no coordinates on screen for it;
  - never FloodWatch's server; one live walk per change; no VPN, no rotation.
- **Where things are:**

  | What | Where |
  |---|---|
  | Every number | [KNOWLEDGE](docs/KNOWLEDGE.md) |
  | Every forecast's skill | [MODELS](docs/MODELS.md) (§1.1: the model check; §3.3: Hat Yai's river and rain) |
  | Known problems | [KNOWN_ISSUES](docs/KNOWN_ISSUES.md) |
  | The audits and studies | [docs/research/](docs/research/) (index in [docs/README](docs/README.md)) |
  | The server and Cloudflare | [SERVER](docs/SERVER.md), [CLOUDFLARE](docs/CLOUDFLARE.md) |
  | Decisions D-001 … D-063 | [research/HISTORY](docs/research/HISTORY.md) |
  | Frank feedback | [FRANK_FEEDBACK](docs/FRANK_FEEDBACK.md) |

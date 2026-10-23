# Frank feedback for the owner

You asked to be told honestly, even blamed, and to get suggestions for your instructions. Here it is, from the agent session of 23 Oct 2026. Each point says what it rests on.

## 1. On the idea

1. **The idea is right, and it was already half-designed.** Hazard-huntz's research of 21 Oct (docs/08, docs/09, 113 live calls) proposed "around my home" for บ้านรอดไหม. This app builds it as its own page. **Don't build it twice:** let บ้านรอดไหม link here (its N28 becomes a link).
2. **"Every dimension" and "simple" pull against each other.** Ten hazards on one phone screen is a lot. The page answers with a verdict line first and a fixed grid of ten small tiles; details sit below. If the first month shows people only look at three tiles, cut to six (the UX scout's choice was rain, flood, PM2.5, heat, earthquakes, fires).
3. **"Pre-warning" can't mean a push from a static page.** Web Push doesn't work inside LINE's browser, where most of your readers arrive (MDN: WebView `false`), and on iPhones only after "Add to Home Screen". A push service is a server that keeps personal data (PDPA). The honest version is what is built: a 3-day heads-up when the page is opened, saved places that open first, and a link to Cell Broadcast and LINE ALERT, which already warn. If you want pushes, decide it as a budget and a legal question (Hazard-huntz docs/09 §6–7), not a feature.
4. **"ML to forecast 12–72 h": mostly no, and that's good news.** The ECMWF ensemble's 51 members are a better 72-hour forecast than anything trainable on free data, and they give honest chances for free. Where statistics help is *correcting* a model with a measurement, and the validation found two such corrections worth shipping. The raw heat index read 5 °C low; a two-number correction per member brought the error to 2.4 °C on held-out stations. For PM2.5, CAMS's change, damped, applied to the latest measurement beat persistence. A gradient-boosted model was tried for PM2.5 and failed every later test. Both are in [MODELS.md](MODELS.md). Earthquakes can't be forecast by anyone; floods are FloodWatch's job and it already measures its skill. Asking for "ML" invites a model nobody can check; asking for "beat persistence on a disjoint season" gets one you can trust.
5. **Corrected, the heat tile says "อันตราย" on most afternoons,** because that is what Thailand's heat index is: observed Bangkok October days reach 42 °C or more on 48 % of days. A page that is orange every day gets ignored, and one that is milder than TMD's scale is wrong. 0.2.0 stops a forecast at เตรียมตัว and names the afternoon. Beyond that it is your call ([OWNER_ACTIONS D1](OWNER_ACTIONS.md)); count the orange days in the first month.

## 2. Where I'd blame the setup (not the people)

1. **Three apps, three looks, one audience.** FloodWatch, บ้านรอดไหม and this page will meet the same family in the same LINE group on the same bad day. They must use one name family, one level scale and one block of official channels ([INTEGRATION.md §5](INTEGRATION.md#5-one-family-one-look)), or they will look like three unrelated sites telling three stories.
2. **FloodWatch's river rule misleads on deep rivers.** It said "ใกล้ล้นตลิ่ง" (warning) at C.12 with 1.31 m below the bank, because the water was 92 % of the way from the river bed. This page copies the rule to stay consistent, which means it copies the problem. Fix it in FloodWatch first ([INTEGRATION.md §3.4](INTEGRATION.md#3-small-changes-in-floodwatch-that-would-help-most)).
3. **FloodWatch answers no other site.** Its `/api/point`, `/api/stations` and `/api/geocode` send no CORS, so the best water data in the family can't reach this page. Two headers would fix most of it (B1, B2).
4. **Nothing in the family has been tested on a real phone inside LINE** (บ้านรอดไหม's HANDOFF says the same). Every check in this session ran in headless Chromium.
5. **Sessions build without the keys to finish.** This session couldn't deploy (no Cloudflare authorisation) and couldn't use a TMD or GISTDA key. The shared research IP had used up Open-Meteo's daily limit, so the validation had to read 22 GB of ECMWF's open data instead. Give a session what it needs to finish, or ask for a smaller finish.
6. **The docs are getting too long to hand over.** FloodWatch's HANDOFF is 1,654 lines and its KNOWN_ISSUES 2,407. A new person (or agent) can't read that before a change. This repo starts short on purpose; keep HANDOFF under two screens.
7. **Several sources rest on goodwill:** HII's API is "not formally public" (FloodWatch's words), the DMR's layers state no licence, the JMA and TMD storm files are their sites' own data, GISTDA's PM2.5 estimate read 1.3× the PCD's stations on 24 Oct. The page labels each; the licences are your questions to ask ([OWNER_ACTIONS C](OWNER_ACTIONS.md#c-data-permissions-and-keys)).

## 3. On the instructions

What worked: the goal (GPS or search → every risk at the point), the sources rule (free, open, public), "learn from FloodWatch", "record everything in disaster-now", and the request for frankness.

What to improve:

1. **One goal per section, a "done when" per goal.** "Validate the outcome, also the consistency to the current app and content" appears three times; it adds no information the third time. A checklist with pass criteria ("the page agrees with FloodWatch on every gauge both show") is checkable.
2. **Name the decisions you've already made, and the ones you haven't.** The domain, the host, the name, whether a server is allowed, the budget for a LINE account, who reviews safety words. Unstated, a session guesses or stops.
3. **Say what not to do.** E.g. "no push", "no map on the first screen", "don't change FloodWatch in this session".
4. **Phase it.** One session for the page, one for the collector and deploy, one for the models gives better work than one session for everything.
5. **Give the access the work needs** (a deploy token in the environment, the keys, a research IP that isn't shared), or say "build only, don't deploy".

### A prompt you could reuse

```
# disaster-now: <phase name>
Goal: <one sentence>. Done when: <3–6 checkable criteria>.
Already decided: host <…>, domain <…>, name <…>, server allowed: <yes/no>, budget: <…>.
Not in scope: <…>. Don't change: <other repos>.
Inputs you have: <keys/tokens in .env>, <deploy access yes/no>.
Rules: the repo's AGENTS.md. Evidence for every number; frank feedback welcome.
Validate: unit tests + visitor walk at 320/390 px in Thai and English + the FloodWatch cross-check;
          an independent agent reads the page as a visitor; models only if they beat persistence
          on a disjoint season.
Record: research in docs/research/, decisions in docs/OWNER_ACTIONS.md, then README, HANDOFF,
        KNOWLEDGE, KNOWN_ISSUES, GUIDELINES, APPROACH, CHANGELOG; commit and push to <branch>.
Ask me only if blocked; otherwise state assumptions.
```

## 4. Frank about this session's own work

The independent audits found real faults in what I built. They are fixed in 0.2.0, but you should know they were there:
- **Four blockers** from the visitor audit:
  - The page was **dead offline**: I added a module and forgot the service worker's list. A unit test now walks the imports.
  - It said **"ทำทันที" on most nights** for the next afternoon's heat.
  - A **TMD heavy-rain warning didn't lead** the verdict.
  - **A failed source read as calm** on three tiles.
- The output audit found the page telling Bangkok to **wear a mask on an estimate 1.4× the station** 0.9 km away, because Air4Thai's failure was worded as "no station here". The mask line also went out without บ้านรอดไหม's under-2 line, the blocker บ้านรอดไหม had already fixed.

The lesson is the one FloodWatch and บ้านรอดไหม keep learning: **the builder's own tests pass what the builder thought of.** Keep an independent visitor audit and an output audit in every release that changes what the page says. Their 41 + 16 findings cost two agent runs, and they caught what 35 unit tests and a 23-check walk missed.

**On "commit and merge":** the repository had no `main` yet, only the work branch. I read "merge" as creating `main` from it. Making `main` the default branch, deleting the work branch and tagging `v0.2.0` are left to you (OWNER_ACTIONS A8). If you meant a pull request, say so next time and I'll open one.

## 5. The second session (23 Oct 2026, 0.3.0): Cloudflare, GLM, risk.autobahn.bot

### What I'd blame you for, honestly

1. **You copied FloodWatch's whole `.env` into this repo, and that's the biggest risk of the day.** It carried 41
   variables, 27 of them FloodWatch-only: the database password, the impact-page password and session secret, the
   Gemini key, the Google service-account path. It also carried **FloodWatch's own Cloudflare tunnel token, identical
   to the live one (checked by hash, never printed)**. With this repo's `docker compose --profile public up -d`, a second
   connector would have joined FloodWatch's tunnel, and Cloudflare would have sent a share of FloodWatch's visitors to
   this page. The `CLOUDFLARE_ZONE_ID` was bejranonda.com's, not autobahn.bot's. I rewrote `.env` to this project's
   variables only and kept the original as `.env.floodwatch-original` (git-ignored, mode 600). **Delete that file when
   you've looked at it.** Next time, give a new project new, scoped keys: one token per job.
2. **The production server is the dev box.** This repo lives on the machine that runs FloodWatch (its database, VPN,
   tunnel and app). Here that cost something real: ThaiWater answered HTTP 429 to this IP after the session's live
   checks, and FloodWatch's collector uses the same IP (KI-029). A separate dev host, or at least no live walks from
   this one, would keep FloodWatch's quota safe.
3. **"Deep research how to apply GLM usefully" collided with the project's own rule,** written by the first session:
   "Not planned: an AI summary; the agencies' words are the product". I didn't treat the request as permission to put
   GLM in front of visitors. I found the one place where it adds real value without touching a safety word
   (English for TMD's Thai-only warnings) and built that with a checker. If you want GLM in the verdict or a chat,
   say so explicitly and expect me to argue: FloodWatch's own test had free AI answers say "ได้ครับ" to "can I take
   my child to school tomorrow?".
4. **"Prepare to integrate with Cloudflare" plus "continue all to finish" doesn't say whether I may publish.** A new
   public hostname on your zone is outward-facing and hard to take back in people's chats once shared. I built and
   tested everything up to the deploy and stopped there. The token also can't write KV, so the deploy needed you
   anyway ([CLOUDFLARE §4](CLOUDFLARE.md#4-what-the-owner-does)).

### On the instructions

- **The "Validate the outcome, also the consistency…" line appears three times again, word for word,** with "as
  visitors" twice. It reads as emphasis, not as criteria. What helped instead was what you wrote once: "cross-validate
  for the correction of output and forecasting results". That produced the session's most useful finding: TMD warned
  of heavy rain in 11 provinces while the model said "low" in all 11, and the page put both in one line.
- **"Pull this repo again"** had no `main` to pull, and the second time a local `.env.example` blocked the pull. A short
  "the remote has new commits on main; my local `.env.example` can be overwritten" would have saved a round.
- **The domain choice was clear,** thank you ("risk.autobahn.bot, you can suggest"). My suggestion: keep it. It is
  short and readable, and the name people see in LINE is the preview card's title (now set), not the domain.
  `now.autobahn.bot` could redirect to it later.

### A better prompt for the next session

```
# disaster-now: go live at risk.autobahn.bot
Done when: the page answers at https://risk.autobahn.bot from Cloudflare's edge; /data/live/index.json is under
15 min old; the link preview shows in a LINE chat; the 12 UX-scout tasks pass on one Android and one iPhone in LINE.
Already decided: Workers static assets + KV (docs/CLOUDFLARE.md); GLM only for warning translation; no push.
You may: create the KV namespace, deploy the Worker, add the custom domain (token with KV + Workers + DNS in .env).
You may not: touch FloodWatch's containers or tunnel; run live walks more than twice from this server.
Then: the native Thai review's changes (A5), KI-025's table words, KI-012's landmark list (GLM drafts, I review).
```

### Frank about this session's own work

- **I first wrote a translation check that only compared numbers** and would have shipped "lower South" for
  ภาคใต้ตอนกลาง. Reading the three live outputs myself caught it. The region glossary and its test came after. A
  checker is only as good as the failure you have already seen.
- **I added a test that was wrong twice** (a path the URL parser normalises; a day the warning doesn't cover). Each
  time the code was right and the test's assumption wasn't. I fixed the test, not the code, after checking.
- **The copy reviewer's 95 suggestions are not applied.** Some are good, and three are harmful (a privacy
  contradiction, a guessed placeholder, an added hotline). Applying them is A5's job.
- **Not done, though "finish" was asked:** no deploy, no real-phone test, no gauge cross-check (ThaiWater 429), and
  the 3-day table's dots and words (KI-025) are only half done (the table moved up and is honest now).

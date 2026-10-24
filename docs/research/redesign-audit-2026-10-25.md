# Redesign audit: the uncommitted v0.7.0 working tree (25 Oct 2026, Bangkok)

An independent UX audit of the 0.7.0 redesign. I read AGENTS.md and GUIDELINES §1–2 and §6, and deliberately not the
session's notes or decision log about the redesign. I judged the page against the owner's brief (calm, minimal,
progressive disclosure, the site's own graphics instead of emoji, the list sorted by severity, a good journey,
reference details behind ⓘ or folds) and against the hard rules.

## How it was walked

- **Renderer:** headless Chromium 1217 (`/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`) through
  `playwright-core`. The page was served by `tools/serve.mjs` and every source was mocked with `test/fixtures` (saved
  23 Oct 2026). The clock was pinned to 23 Oct 2026 19:50 UTC (02:50 Bangkok), and to 24 Oct 11:30 UTC (18:30 Bangkok)
  for the evening. Scripts are in `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/`:
  `audit.mjs` (personas, probes), `load.mjs` (mid-load frames, the changed-since line), `rainahead.mjs` and `badge.mjs`
  (an edited ensemble fixture with heavy rain tomorrow, in `fx/`). Screenshots are in
  `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/`. The 0.6.0 comparison
  (HEAD, `git archive`) is in `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots-head/`.
- **Personas walked:**
  - an older reader in LINE at 360 × 640, using the LINE user agent and ก+;
  - a parent checking Hat Yai (`#p=7.01,100.47`) under the TMD heavy-rain CAP warning (the collector's `warnings.json`);
  - an English visitor in Hat Yai and Bangkok;
  - a keyboard user (tab order, focus) and a screen-reader user (Playwright `ariaSnapshot`, not a real reader);
  - desktop at 1280 px;
  - dark mode;
  - the evening at 18:30;
  - every source down;
  - 320 × 568 with ก+ and every row and fold open;
  - a GPS fix;
  - saved places;
  - a repeat visit (the "เปลี่ยนจากที่ดูครั้งก่อน" line);
  - a slow network (sources delayed by 0.1–6.5 s);
  - heavy rain tomorrow on a hot day.
- **Probes:**
  - horizontal overflow of the page and of the 3-day table: 0 px everywhere, including 320 px with ก+;
  - tap targets under 44 px: none found at 320, 360 or 390 px;
  - text contrast under 4.5:1 (large text 3:1), walking every visible text node in light and dark mode with every row
    open: none found;
  - page errors: none.
- **Checks run on the tree as it stood:** `npm test` gave pass 104, fail 0. `CHROME_PATH=… npm run smoke` gave 45 "ok"
  lines and "all checks passed".
- **Not run:**
  - no live load (`npm run serve` against the real sources), so as not to spend ThaiWater's per-IP allowance;
  - no real phones and no real LINE in-app browser (only its user agent);
  - no TalkBack or VoiceOver;
  - no noon walk.
- **The tree moved during the audit.** `app.css`, `main.js`, `index.html`, `i18n.js` and GUIDELINES changed at about
  21:27–21:32 UTC, and the left column is no longer sticky. I re-ran the key shots and both rain reproductions on the
  later tree, and every finding below still held. Line numbers refer to the tree at 21:50 UTC on 24 Oct.

## Findings

| ID | Severity | In one line |
|---|---|---|
| R1 | high | A hazard at เตรียมตัว tomorrow is filed under "ยังไม่น่าห่วง", with no badge when the verdict is already that high, and 0.6.0's open 3-day heads-up list is gone |
| R2 | medium | The UV row is graded on this hour while its own day chip and the table grade today's peak: the row says calm, the chip says เตรียมตัว |
| R3 | medium | The hero names one hazard only; 0.6.0's "เรื่องอื่น" (other hazards at the same level) was dropped |
| R4 | medium | When warnings can't be checked, or everything is down, "where to look instead" is hidden behind an ⓘ labelled "ที่มา" |
| R5 | medium | The group name "ต้องระวัง" is a fifth word beside the four-level scale, and a row never shows its level in words |
| R6 | medium | The staff gauge is tiny, fixed in px (ก+ doesn't enlarge it) and low in contrast (1.1–2.6:1), and has no legend |
| R7 | medium | Save, share and refresh are unlabelled icons; "ส่งใน LINE" is now two taps deep |
| R8 | medium | The sorted list reorders 3–4 times in the first ~7 s while sources arrive, with interim levels |
| R9 | medium | An opened row is still a wall: method notes, sources and tags are all shown, and the row's ⓘ is a dead glyph |
| R10 | medium | Model values (a satellite PM2.5 estimate driving "wear a mask") show on the hero and rows with no "ค่าประมาณ / แบบจำลอง" marker |
| R11 | low | "เตรียมตัว" beside "ระดับอันตราย", with no visible reason (a forecast alone tops out at เตรียมตัว) |
| R12 | low | The focus ring on rows is clipped by the list's `overflow: hidden` |
| R13 | low | Screen-reader semantics: group labels aren't headings, the level is read twice, the h1 stays "เลือกจุดที่จะดู", one ⓘ is misnamed |
| R14 | low | English rows run the word and the value together ("Nothing notable yet gusts 27 km/h") |
| R15 | low | Breaks between a number and its unit or inside abbreviations ("≥ 42 / °C", "กรมอุ / ตุฯ", "เตือน / ภัย") and cramped chips and table cells |
| R16 | low | Secondary text at 12–14 px; the loopless face for body text is worth testing with older readers |
| R17 | low | Desktop: the left column is empty below the hero for ~1,500 px, and each row's gauge sits ~600 px from its label |
| R18 | low | Copy and leftovers (the official block's title, developer copy, the "อัปเดต" claim when all are down, a stale 📢 fallback, the welcome icon strip, the bare "เตือนภัย" heat word, the quake icon) |
| R19 | low | At 320 px with ก+ the place name breaks in two beside three icon buttons, and the GPS subline runs together |
| R20 | low | Tooling: `tools/serve.mjs` serves `.woff2` as `application/octet-stream` |

### R1 (high): a hazard at เตรียมตัว tomorrow is filed under "ยังไม่น่าห่วง"

**Who and where:** every visitor; the parent planning tomorrow. 390 × 844 and 360 × 640.

**What a visitor sees.** I edited the ensemble fixture so that tomorrow (25 Oct) has 3 mm/h in every member. The 3-day
table then reads "โอกาสฝนหนัก พรุ่งนี้ สูง (เตรียมตัว)". Today's heat is at เตรียมตัว, as in the fixture. With that data:

- The hero says nothing about rain.
- The rain row reads "ฝน — ยังไม่น่าห่วง โอกาสฝนหนัก ต่ำ", under "ยังไม่น่าห่วง (7)", with no badge.
- The coming rain shows only inside the closed rain row (its "พรุ่งนี้ สูง" chip) and inside the closed 3-day table.
- **0.6.0 on the same data** showed, in an always-open "⏰ เตือนล่วงหน้า 3 วัน" list: "🌧️ ฝนหนัก (> 35 มม.) · พรุ่งนี้ ·
  โอกาส เกิน 90%". It also showed "ร้อนระดับอันตราย (≥ 42 °C) · พรุ่งนี้ · โอกาส 70%", a chance that 0.7.0 no longer shows
  anywhere: the heat row gives only today's 60 %.

I then cooled the same data so the verdict is ติดตามไว้:

- The hero now says "ข้างหน้า: ฝนหนัก พรุ่งนี้ โอกาสสูง", and the rain row gets an orange "พรุ่งนี้ เตรียมตัว" badge.
- But the row is still sorted under "ยังไม่น่าห่วง (7)": below two ติดตามไว้ rows and below the no-data row.
- So the hero calls rain the coming concern while the "sorted by severity" list ranks it 4th, under a calm heading.

In Hat Yai's November floods this is exactly the pattern: a heat day before the rain, with heavy rain "สูง" the day after.

**Cause:**

- `public/js/assess.js:745` keeps a coming day only if it is above the *verdict* (`x.level > Math.max(verdict.level, 0)`).
- `assess.js:756–759` builds the rows' badges from that verdict-filtered list.
- `concern()` at `assess.js:835` and the groups at `public/js/main.js:351` use today's level only.
- `r.pre` (0.6.0's pre-warnings, still computed at `assess.js:707`) is no longer drawn.

**Fix:**

- Give each card its own `ahead`: every coming window above the *card's* level, not the verdict's.
- Show the badge whenever that exists.
- Group and sort by `max(level, ahead.level)`. A row whose coming day reaches เตรียมตัว sits in the เตรียมตัว group, and
  its badge names the day ("พรุ่งนี้ เตรียมตัว"), so it never reads as today. This keeps "a forecast alone tops out at
  เตรียมตัว": the level is the forecast's, capped.
- In the hero, also show "ข้างหน้า" when a *different* hazard reaches the verdict's level on a coming day.
- Bring back the chances ("โอกาส 70%") in the row's day chips, or in a single heads-up line.
- Add a test: "R1: a coming day at เตรียมตัว never sits under ยังไม่น่าห่วง".

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/rain-ahead-row.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/rain-ahead-first.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/badge-row.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/badge-first.png`

### R2 (medium): the UV row says calm while its own chip says เตรียมตัว

**Who and where:** every visitor before mid-morning, and in the evening. 390 × 844.

**What a visitor sees.** At 02:50 the row "รังสี UV — กลางคืน วันนี้สูงสุด 8" sits under "ยังไม่น่าห่วง (7)" with a
one-segment gauge. Opened, its first chip "วันนี้ 8" has a three-segment (เตรียมตัว) gauge, and the 3-day table says
"UV สูงสุด 8 (เตรียมตัว)". The heat row, by contrast, is graded on "บ่ายนี้", the coming afternoon. So the sort compares
heat's coming afternoon with UV's current hour: heat goes to the top and UV to the calm group, for the same kind of
model daily peak.

**Cause:**

- The row's level comes from `uvNow` (`assess.js:241`, by a deliberate choice explained at :231–233).
- Its chips and the table use the day's peak (`uvDay`, `assess.js:82`).
- UV is not in `AHEAD` (`assess.js:739`), and day 0 is skipped, so no badge is possible.

The grading predates 0.7.0. The 0.7.0 heading "ยังไม่น่าห่วง" turns it into an explicit claim. It breaks the spirit of
GUIDELINES 3b, "one grading for every view of a forecast".

**Fix (the owner's call between):**

- (a) grade the row like heat, on the next daylight peak, capped at เตรียมตัว;
- (b) keep "now" for the row, but give the chips and table cells words without a level (no gauge), so nothing
  contradicts the row;
- (c) keep "now" and add a "วันนี้ช่วงเที่ยง เตรียมตัว" badge through R1's per-card `ahead` (with day 0's later window).

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/q3-uv-open.png`

### R3 (medium): the hero names only one hazard

**Who and where:** the parent in Hat Yai, 360 × 640 in LINE with ก+.

**What a visitor sees.** Three hazards are at เตรียมตัว: TMD's rain warning, PM2.5 "เริ่มมีผลกระทบต่อสุขภาพ" (whose action
is "ใส่หน้ากาก…") and heat "อันตราย".

- The hero names rain only, and has no action line, since the rain card has none.
- The first screen ends inside TMD's notice, so nothing above the fold mentions dust or heat.
- 0.6.0's hero listed "เรื่องอื่น: 😷 ฝุ่น PM2.5: เริ่มมีผลกระทบต่อสุขภาพ · 🌡️ ความร้อน: ระดับอันตราย".

**Cause:** `verdict.others` is still computed (`assess.js:703`) but not drawn (`main.js:295–320`).

**Fix:** one quiet line in the hero, "อีก 2 เรื่องระดับเดียวกัน: ฝุ่น PM2.5 · ความร้อน", each a link to `#card-…`. The
handler at `main.js:575` already opens the row and scrolls to it.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p2-hatyai-line360-big-first.png`
- 0.6.0: `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots-head/p2-hatyai-first.png`

### R4 (medium): "where to look instead" is behind an ⓘ

**Who and where:** every visitor when the collector is absent or stale, or when every source is down. 360 × 640.

**What a visitor sees.** The hero's last line reads "ยังไม่มีข้อมูล: ไฟป่า, ประกาศเตือนภัย ⓘ".

- "ประกาศเตือนภัย" reads like a hazard name.
- The instruction "ตรวจประกาศเตือนภัยของกรมอุตุฯ ไม่ได้ตอนนี้ ดูที่ tmd.go.th หรือ LINE ALERT" opens only from an ⓘ whose
  accessible name is "ที่มา" (source).
- 0.6.0 showed that sentence as a visible box.
- With everything down, the hero says "ยังไม่มีข้อมูลพอ" and lists 11 items. The only pointer to a working channel is
  that same ⓘ, or the hotlines at the bottom of the page.

The rule "warnings that couldn't be checked are listed as missing" is kept. But what a person should do when the page
can't vouch for warnings is an action, not a reference detail.

**Cause:** `main.js:313–316`.

**Fix:**

- When `!bundle.warnings`, draw the sentence as a visible line, with a link to TMD's warnings page.
- With everything down, add a visible "ลองกดอัปเดต หรือโทร 1182 / ดูประกาศจากหน่วยงาน" under "ยังไม่มีข้อมูลพอ".
- Name the ⓘ by its content ("ดูที่ไหนแทน").

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p1-line360-big-first.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/q6-down-first.png`
- 0.6.0: `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots-head/p1-01.png`

### R5 (medium): a fifth word for the groups, and rows without their level in words

**Who and where:** the older reader; anyone not seeing colour well. All sizes.

**What a visitor sees.**

- The groups are "ต้องระวัง / ยังไม่มีข้อมูล / ยังไม่น่าห่วง". "ต้องระวัง" (must be careful) is not one of the four scale
  words, and it is stronger than "ติดตามไว้". "ฝุ่น PM2.5 ปานกลาง 31.9" and "ความร้อน เตือนภัย 33 °C" (both ติดตามไว้) sit
  under it next to "อันตราย" rows.
- Each row shows the agency's word ("อันตราย", "เริ่มมีผลกระทบต่อสุขภาพ", "กรมอุตุฯ เตือนภัย", "ปานกลาง") but never the
  app's level word. Only the gauge, the token's tint and the word's colour tell the reader that the first three are the
  same level and "ปานกลาง" is lower.
- The order inside "ต้องระวัง" therefore looks arbitrary to a reader who can't decode the gauge.

**Cause:** `main.js:351` and `public/js/i18n.js:63`.

**Fix:** make the group headings the scale itself, with counts: "เตรียมตัว (3)", "ติดตามไว้ (1)", "ยังไม่มีข้อมูล (3)",
"ยังไม่น่าห่วง (4)", and later "ทำทันที". Every row then carries its level in words through its heading, at no cost in
clutter. Combined with R1, a row lifted by a coming day sits under its level with the day badge.

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/badge-row.png`

### R6 (medium): the staff gauge is hard to read without colour or with older eyes

**Who and where:** the older reader with ก+; colour-blind and low-vision readers; dark mode. 360 × 640.

**What a visitor sees.** The gauge is the colour-free cue (its height), but the height is hard to read:

- **It doesn't scale.** Row segments are 7 × 6 px, table segments 5 × 4 px, all in px, so ก+ (17 → 20 px root)
  enlarges the text but not the glyph.
- **The empty segments almost vanish.** They are `#dce3e8`: 1.30:1 on white, 1.10:1 on the orange hero, 1.21:1 on a
  day chip, and 1.43:1 (`#2c3a46`) in dark mode.
- **Level 1 is faint.** Its only filled segment above blue is yellow `#c9bd00`, 1.95:1 on white.
- **"No data" is faint too.** Its 1 px dashed outline `#9aa3ae` is 2.55:1 on white and 2.16:1 on the orange hero.

All of these are under WCAG 1.4.11's 3:1 for graphics that carry meaning. 0.6.0's ●●○○ dots were ink-coloured and
countable. Nothing on the page explains the glyph (no legend). On desktop the gauge sits ~600 px from its label, at the
far right edge.

**Cause:** `public/css/app.css:139`, `:143`, `:145`, `:146`, `:277`; the placement at `main.js:384`.

**Fix:**

- Size the gauge in `em`, about 0.42 × 0.36 em per segment, so ก+ scales it.
- Draw empty segments as a 1 px outline in `--muted` (≥ 3:1), not as a pale fill.
- Give the yellow segment a dark edge (`--l1-edge` darkened to about `#8f8600`), or an inner outline.
- Make the no-data dash 1.5 px in `--muted`.
- Move the gauge next to the token (left), or inside it.
- Show the scale once, as a one-line legend under "ทุกเรื่องที่จุดนี้" or behind an ⓘ beside "เรียงตามความน่าห่วง".

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p1-line360-big-first.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p5-desk.png`

### R7 (medium): save, share and refresh are unlabelled icons

**Who and where:** the older reader in LINE; the family sharer. 360 × 640.

**What a visitor sees.**

- Three round icons, ☆, a box with an up arrow, and a circular arrow, with no words.
- Their `title` tooltips never show on touch.
- The up-arrow-from-box share glyph is iOS's; most Thai phones are Android.
- "ส่งใน LINE", the family journey (sharing in the family group) and 0.6.0's green, labelled button, is now the first item
  of a menu behind that glyph: two taps, and only for those who guess the icon.

**Cause:** `public/index.html:127–137`.

**Fix:** a labelled "ส่งใน LINE" button (brand colour, or LINE green with its icon) directly under the hero, where the
eye ends. Keep "แชร์ทางอื่นหรือคัดลอกลิงก์" as a quiet text link beside it. Give the remaining icons short captions under
them ("บันทึก", "อัปเดต"); 44 px with a caption still fits at 320 px if the buttons move to their own row (see R19).

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/q8-share-open.png`
- 0.6.0: `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots-head/p2-hatyai-first.png`

### R8 (medium): the sorted list jumps while sources arrive

**Who and where:** anyone on a slow LINE connection. 360 × 640, with the sources delayed by 0.1–6.5 s.

**What a visitor sees.** The order at each moment:

| Time | Hero | List |
|---|---|---|
| 0.8 s, 2.0 s | "กำลังดึงข้อมูล (4 จาก 10 เรื่อง)" | "ต้องระวัง (1): ฝุ่น PM2.5 เริ่มมีผลกระทบต่อสุขภาพ 46.4" (GISTDA's estimate), then 6 rows under "ยังไม่มีข้อมูล", then 3 calm |
| 3.5 s | settled | heat moves to the top; PM2.5 drops to "ปานกลาง 31.9" once Air4Thai answers; rain moves to the calm group |
| 7.5 s (after the hero settled) | settled | flood moves from "ยังไม่มีข้อมูล" to "ยังไม่น่าห่วง" |

A reader who starts at the list taps a different row from the one aimed at. KI-F24 holds the hero back until the
sources have answered, but the list shows interim levels and groups from the first answer.

**Cause:** `main.js:350–355` regroups and re-sorts on every render.

**Fix:**

- Until `settled`, draw the rows in the fixed `ORDER` with no group headings and a neutral "กำลังโหลด" state.
- Sort once when settled.
- After that, move a row only on an explicit refresh, or only upwards, and never move the open or focused row.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/load-2000.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/load-3500.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/load-7500.png`

### R9 (medium): an opened row is still a wall of text

**Who and where:** anyone opening a row; the older reader with ก+. 320–390 px.

**What a visitor sees.** The heat row opened at 360 px with ก+ is about two screens long:

- the action box;
- three bullet lines, two of them method notes ("ปรับแก้ตามสถานีวัดของกรมอุตุฯ แล้ว: แบบจำลองดิบมักต่ำกว่าค่าวัดจริงราว 3–5 °C");
- three chips;
- an accuracy paragraph ("ความแม่นยำที่ทดสอบกับสถานีที่ไม่ได้ใช้ปรับ (2025–26): …");
- a source line ending in a doubled "แบบจำลอง ECMWF 51 ชุด [แบบจำลอง]";
- a link.

The rain row under the warning has five bullets plus a note. This is the reference detail the brief asked to fold behind
ⓘ: the hero does it, but rows don't. The ⓘ glyph at the start of every row's source line is a decoration, while the
hero's identical ⓘ is a button. A reader who learned to tap ⓘ in the hero taps this one and nothing happens.

**Cause:** `main.js:385–394` (detail), `main.js:378` (the decorative `i-info`).

**Fix:**

- An opened row shows the action, one key line (the range or the station), the chips and the link.
- Everything else (method and accuracy notes, sources, model tags) goes into one "ที่มาและวิธีคิด ⓘ" toggle at the end,
  using the same `info()` as the hero.
- Drop the doubled "แบบจำลอง".
- Never use the ⓘ glyph as a decoration.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/p9-320-big-all-01.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/q1-rain-days.png`

### R10 (medium): model values show on the hero and rows with no marker

**Who and where:** the parent in Hat Yai; any place whose PM2.5 station is stale. 390 × 844.

**What a visitor sees.**

- **Hat Yai:** the PM2.5 row reads "เริ่มมีผลกระทบต่อสุขภาพ 46.4 µg/m³" and, opened, "ใส่หน้ากากกันฝุ่น PM2.5 ทุกครั้งที่ออก
  นอกบ้าน". Only the opened detail says this is GISTDA's satellite estimate, which the page itself notes runs a median
  1.3 × above stations, while the station 1.9 km away last read 16.3 (ดี).
- **Bangkok at 18:30 on the fixtures:** the same estimate is the hero's headline, "ฝุ่น PM2.5: เริ่มมีผลกระทบต่อสุขภาพ
  46.4 µg/m³", with the mask action, and with no "ค่าประมาณ" anywhere above the fold. (The station's 16 h gap there is the
  fixture clock, but stale stations are real: Hat Yai's was 6 h.)

GUIDELINES §1.3 says every model value carries the "แบบจำลอง" tag. On the faces it now carries none. The 0.6.0 tile
lacked it too, but the redesign is the moment to fix it, since the faces are now all most people read.

**Cause:** the row's value at `main.js:383` and the hero's `vval` at `main.js:295` don't look at `c.src[0].model`.

**Fix:** append a short marker to `value` when the grading source is a model: "(ค่าประมาณจากดาวเทียม)" for GISTDA,
"(พยากรณ์)" for the ensemble, as a `.tag` chip on the row face and in the hero.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p7-eve-first.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/p2open-01.png`

### R11 (low): "เตรียมตัว" beside "ระดับอันตราย", with no visible reason

**Who and where:** the older reader, at 02:50 or any morning. 360 × 640.

**What a visitor sees.** The hero reads "เตรียมตัว / ความร้อน: ระดับอันตราย / บ่ายนี้ รู้สึกเหมือน 42 °C", and the row reads
"อันตราย" with a เตรียมตัว gauge. Rule 3b (the agency's word plus the window) is met. But "get ready" sits beside
"danger", and the reason (a forecast alone tops out at เตรียมตัว) is only in the folded footer "ข้อมูลมาจากไหน".

**Cause:** `main.js:295`; the about text at `main.js:65`.

**Fix:** a word on the hero's value line, "พยากรณ์บ่ายนี้ …". Or an ⓘ on the level word: "ระดับนี้มาจากพยากรณ์ ซึ่งขึ้นได้
ถึง 'เตรียมตัว' เท่านั้น 'ทำทันที' ต้องมีค่าวัดจริงหรือประกาศของหน่วยงาน".

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p1-line360-big-first.png`

### R12 (low): the focus ring on rows is clipped

**Who and where:** keyboard users. 390 px, light and dark.

**What a visitor sees.** On a focused row only the top and bottom of the 3 px ring show. They read as blue divider
lines, not as a ring. The tab order itself is sensible: header, ดูที่อื่น, save, share, refresh, ⓘ, rows in sorted
order, folds, hotlines, links, footer.

**Cause:** `.list { overflow: hidden }` at `app.css:209`, with `outline-offset: 2px` at `app.css:42`.

**Fix:** `.row:focus-visible { outline-offset: -3px; border-radius: 12px; }`, or clip the list's corners with
`overflow: clip`, `overflow-clip-margin` and padding.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/k1-focus-row.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/k3-focus-dark.png`

### R13 (low): screen-reader semantics

**Who and where:** screen-reader users (Playwright `ariaSnapshot`; not checked with TalkBack or VoiceOver).

**What a visitor hears.**

- **Group labels aren't headings.** "ต้องระวัง (2)" and the others are `<p>`: not reachable by heading navigation, and not
  tied to their rows.
- **The level is read twice.** The hero reads "img เตรียมตัว", then "เตรียมตัว". The missing line reads
  "img ไม่มีข้อมูล", then "ยังไม่มีข้อมูล: …".
- **The page's h1 stays "เลือกจุดที่จะดู"** (sr-only) after a place opens.
- **The second hero ⓘ is called "ที่มา"** but holds where-to-look-instead text (R4).
- Each row's name is good: "ความร้อน (ดัชนีความร้อน) อันตราย บ่ายนี้ รู้สึกเหมือน 42 °C เตรียมตัว".

**Cause:** `main.js:234` (gauge `role=img` beside its own word), `main.js:354`, `index.html:92`.

**Fix:**

- Mark the gauge `aria-hidden` wherever its word is already beside it (the hero, the missing line).
- Make group labels `<h3>`, or wrap each group in `role="group" aria-labelledby`.
- Make the place name the h1 once a place is open.

**Screenshot:** none (an accessibility-tree finding).

### R14 (low): English rows run the word and value together

**Who and where:** the English visitor. 390 px.

**What a visitor sees.** "Nothing notable yet gusts 27 km/h", "Night Today up to 8", "Danger This afternoon: feels
like 42 °C", "Nothing notable yet Heavy rain: low chance".

**Cause:** `main.js:383` joins `.w` and the value with a space; Thai survives this thanks to the bold word, English
doesn't.

**Fix:** put " · " between them, or put the value on its own line.

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p3-en-hatyai.png`

### R15 (low): breaks inside numbers, units and abbreviations

**Who and where:** everyone; worst at 320–390 px with ก+.

**What a visitor sees.**

- Breaks between a number and its unit: "(≥ 42 / °C) 60%", "±2.5 / °C", "112 / ซม.".
- A break inside an abbreviation: "กรมอุ / ตุฯ".
- Breaks inside a word in the 3-column chips and the table at 390 px: "เตือน / ภัย", "ปาน / กลาง".

**Cause:** ordinary spaces in `assess.js` strings; `.day .dv` and `.outlook td` can wrap (`app.css:248`, `:275`).

**Fix:**

- Use U+00A0 between a number and its unit in `assess.js`'s `fmt` output and strings.
- Set `white-space: nowrap` on chip values, table cells and agency abbreviations.
- For a warning cell, show the triangle plus "เตือน" and give the full word to the screen reader.

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/p9-320-big-all-01.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/p12-outlook-hatyai.png`

### R16 (low): small secondary text, and the typeface

**Who and where:** the older reader. 360 px.

**What a visitor sees.** The "small print" carries real content, at sizes from a 17 px root:

| Element | Size |
|---|---|
| Day-chip labels and subs ("คาด", "อาจเปลี่ยน", "ฝนหนัก") | .74–.78 rem (12.6–13.3 px) |
| `.tag` | .72 rem (12.2 px) |
| Badges | .76 rem |
| Group headings | .82 rem (13.9 px), grey |
| Source lines | .8 rem |

Thai stacks vowels and tone marks and needs more size than Latin at equal legibility.

Separately, Anuphan is a loopless face. Many older Thai readers learned on looped forms (the government's TH Sarabun,
iOS's Thonburi). Loopless body text at these sizes is worth a short test with real older readers. This is a judgement,
not a measured result: no study is cited here **[unverified]**.

**Cause:** `app.css:210`, `:227`, `:247–253`.

**Fix:**

- Floor all content text at 0.82 rem (about 14 px) and give group headings `--ink-2`.
- Test a looped body face (for example IBM Plex Sans Thai Looped or Noto Sans Thai Looped, both said to be OFL; check
  each licence before adding it) against Anuphan with 5–6 older readers. Keep Anuphan for the wordmark and headings either
  way.

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/p9-320-big-all-03.png`

### R17 (low): desktop at 1280 px

**What a visitor sees.**

- The left column (finder, place, hero) ends at about 340 px of a 1,930 px page. It is no longer sticky (changed during
  this audit, for a long notice), so the rest of the left column is blank while the list, the table and the official block
  fill the right.
- Rows stretch to about 760 px, with the gauge and chevron at the far edge.

**Cause:** `app.css:64–68`.

**Fix:**

- On wide screens put the official block (hotlines and links), and perhaps the 3-day table, in the left column under the
  hero and the TMD notice.
- Cap the row content width, or bring the gauge next to the token (R6).

**Screenshot:** `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/desk-40.png`

### R18 (low): copy and leftovers

Each item is cause, then fix.

- **The bottom block's title.** It is called "ประกาศเตือนภัยทางการ" (official warnings), but holds hotlines and links,
  while the real TMD notice is the block under the hero. Cause: `index.html:166`, `i18n.js:26`. Fix: rename it
  "สายด่วนและเว็บของหน่วยงาน".
- **Developer copy for fire.** The missing line says "ยังไม่มีข้อมูลจุดความร้อน (ต้องเปิดตัวเก็บข้อมูลของเว็บนี้)". Cause:
  `assess.js:646`. Fix: "ยังไม่มีข้อมูลจุดความร้อนตอนนี้ ดูที่ FIRMS / GISTDA", or similar.
- **The all-down footer and rows.** The footer still says "อัปเดต 02:50 · แบบจำลอง – ชุด", and every opened row repeats
  "ดึงข้อมูลไม่สำเร็จ" above "ดึงข้อมูลไม่สำเร็จ (เชื่อมต่อไม่ได้)", with no retry. Cause: `main.js:363`, `main.js:389`.
  Fix: "ลองเมื่อ 02:50: ดึงข้อมูลไม่สำเร็จ", and one line per row with an "ลองอีกครั้ง" button.
- **A stale static fallback.** `index.html:157` still holds the 0.6.0 note with 📢; it is replaced at run time but shows
  if JS fails. Fix: copy the i18n text in.
- **The welcome screen.** Its 10 unlabelled icons don't follow the order of the sentence above them and wrap one orphan
  to a second line at 360 px (`index.html:117`). The placeholder is cut mid-word, "จังหวั". "~1 กม." should read "ราว
  1 กม.".
- **The bare heat word.** The row shows the heat band word "เตือนภัย" bare (U9's risk of reading as an official
  warning). The hero already says "ระดับเตือนภัย" (`assess.js:692`). Fix: use the same on the row face.
- **The heat row's title.** "ความร้อน (ดัชนีความร้อน)" wraps at 360 px with ก+ and repeats the gloss in the detail. Fix:
  "ความร้อน (ที่ร่างกายรู้สึก)", or just "ความร้อน".
- **The earthquake icon.** It is a seismograph trace that reads as a heartbeat (ECG) at 22 px. A cracked ground line, or
  a house with a crack, would not be mistaken for health.

### R19 (low): narrow place header

**What a visitor sees.**

- At 320 px with ก+, "แขวงบวร / นิเวศ" breaks the subdistrict name in two, because the three 44 px buttons take 144 of
  292 px.
- After a GPS fix the subline reads "ตำแหน่งของฉัน เขตพระนคร กรุงเทพมหานคร", running "my location" into the district.

**Cause:** `app.css:118–122`, `main.js:266`.

**Fix:**

- Below 360 px, or with ก+, put the buttons on their own row under the name (with captions, R7).
- Separate the GPS subline: "ตำแหน่งของฉัน · เขตพระนคร กรุงเทพมหานคร".

**Screenshots:**

- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/crop/p9-320-big-all-00.png`
- `/tmp/claude-0/-root-disaster-now/a1342f4c-e083-4ad0-bcca-4b4e86830662/scratchpad/agentE/shots/g1-gps-line360-big.png`

### R20 (low): `tools/serve.mjs` has no font type

`tools/serve.mjs:54` falls back to `application/octet-stream` for `.woff2`, and this server is the one Docker runs on
`autobahn-bot`. Chromium still loads the font, but `font/woff2` belongs in `TYPES` (line 15).

## What works

- **The first screen answers.** At 360 × 640 in LINE with ก+, the hero shows the level, the worst hazard in the agency's
  word, the value with its window ("บ่ายนี้"), the sourced action and what is missing, and it ends at about 528 px. The
  answer is unmistakable and far calmer than 0.6.0's: no emoji pills, no black dots, no five-button bar.
- **The chrome is quiet.** One icon family on a 24 px grid, one surface style, hairline rows, colour only where a level
  says so. The header is translucent and small. Dark mode is coherent (tints, text and the logo all hold), and no text
  contrast failure was found in either theme.
- **The official word leads.** TMD's notice is never folded: headline, issue and expiry times, the instruction in full,
  details one tap away, and TMD's page linked. In English, the checked machine translation is labelled and the Thai
  original is one tap away.
- **Missing is never calm.** Missing hazards have their own group above the calm one, a dashed gauge and a place in the
  hero. The all-down state is unambiguous ("ยังไม่มีข้อมูลพอ"; 10 rows "ดึงข้อมูลไม่สำเร็จ"; no calm group at all).
- **Native disclosure.** `details`/`summary` rows are keyboard-operable, 64–73 px tall, and keep their open state across
  redraws. Every tap target measured ≥ 44 px at 320, 360 and 390 px. Nothing overflows at 320 px with ก+, the 3-day
  table included.
- **The table and the chips agree.** Both use `fcLevel`; heat, rain, PM2.5 and wind match cell for cell. The evening
  holds: heat moves to "บ่ายพรุ่งนี้", the table's first column is "คืนนี้" with no heat number, and the chips drop
  today.
- **Equal rows are stable.** Inside a level, the official hazard comes first and then the fixed order, so equal rows
  don't shuffle.
- **"ข้างหน้า" works when it fires.** The hero's line, with its gauge, does what UX study §5.2 asked
  (`badge-first.png`).
- **The repeat-visit line is clear.** "เปลี่ยนจากที่ดูครั้งก่อน (20:50 น. 23 ต.ค.): ฝุ่น PM2.5 เตรียมตัว ↓ ติดตามไว้, …"
  reads well and stays out of the way (`changed-9000.png`).
- **The brand mark is a real idea.** A house built from the four level bars, with the red roof, ties the identity to the
  scale.
- **Privacy holds on screen.** A GPS place shows no coordinates.

## Overall critique

**Against the brief, 0.7.0 is a large step.** It no longer looks like "a website a child made". It reads as a calm,
competent, contemporary mobile list: grey paper, a white rounded card with hairlines, a tinted hero, and line icons
instead of emoji. Progressive disclosure works at the page level: one answer, then the list, with the 3-day table,
the profile and the notices' details folded.

**What still looks generic.** The white rounded list on pale grey with tinted icon squares is the default look of every
2024–26 settings or weather app. Nothing in it says Thai Risk except the small logo. The one distinctive element, the
staff gauge, is the least visible thing on the page: 7 px wide, at the far right, with near-invisible empty segments.
The idea (a water-level pole, filled from the bottom) is good and should be the signature, not a footnote.

**What still looks cluttered.** Mostly in two places:

1. **The hero.** It stacks two gauges, a level, an icon, an agency word, a value, a divider, an action, two ⓘ and a
   missing-data line: about ten elements in four weights. The level word and the gauge say the same thing beside each
   other.
2. **The opened rows (R9).** The brief's "reference details behind ⓘ" was applied to the hero's single source line but
   not to the rows, where most of the reference text lives.

Each row also signals its level three times (the tinted token, the coloured agency word, the gauge) and never in the
app's own words (R5). The bottom block (four call tiles and six links) is heavy, but it sits where it does no harm.

**The two changes that matter most:**

1. **Make the sort honest and self-explaining.** Group by the scale's own words (เตรียมตัว / ติดตามไว้ / ยังไม่มีข้อมูล /
   ยังไม่น่าห่วง), place each row by the worse of today and its coming days, and name the day on the row (R1, R2, R5).
   Hold the order until the sources have settled (R8). This fixes the one real safety regression (a coming เตรียมตัว
   filed under "ยังไม่น่าห่วง", and 0.6.0's heads-up list lost). It also puts the level in words on every row with no
   extra ink, and makes "sorted by severity" something a reader can see rather than infer from colour.
2. **Give the gauge its place and finish the disclosure.** Move a larger, em-sized, outlined gauge into each row's
   token, beside the label, and drop the separate tint so each row has one level signal (R6). Use the same glyph,
   explained once, as the page's legend and the hero's mark. Then cut each opened row to the action, one key line, the
   days and the link, with "ที่มาและวิธีคิด ⓘ" for the rest (R9). Put a labelled "ส่งใน LINE" under the hero (R7), so the
   family journey ends in one tap.

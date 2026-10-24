# GLM in Disaster Now: research, what it does, what it must never do

**State (23 Oct 2026, 0.3.0):** GLM writes **English for TMD's Thai warnings** in the collector (checked, labelled,
cached) and gives a **first reading of the Thai copy** as a dev tool. Nothing on a visitor's path waits for or depends
on it; with `AI_ENABLED=0` the page is identical except that warnings show in Thai on the English page, as in 0.2.0.

## 1. What GLM is, as of October 2026 (researched in this session)

| Fact | Value | Source |
|---|---|---|
| Provider | Zhipu AI; international brand Z.ai (Singapore entity), mainland platform open.bigmodel.cn (Beijing) | docs.z.ai legal pages; Wikipedia "Z.ai" |
| API | OpenAI-style `POST /api/paas/v4/chat/completions`, `Authorization: Bearer <key>`; JSON mode `response_format: {type: "json_object"}`; function calling; a built-in `web_search` tool (US$0.01 a use) | docs.z.ai guides (struct-output, web-search) |
| Models and prices (Z.ai, per 1 M tokens in/out) | glm-5.3 $1.40/$4.40 · glm-5.3-flashx $0.37/$1.25 · **glm-5.3-flash $0.15/$0.50** · glm-4.7-flashx $0.07/$0.40 · glm-4.7-flash, glm-4.5-flash, glm-4.6v-flash **free** · glm-ocr $0.03 | docs.z.ai/guides/overview/pricing, read 23 Oct 2026 |
| glm-5.3-flash | text, image, video and file input; 1 M context; 128 K output; **thinking cannot be disabled** (only `enabled`) | docs.z.ai/guides/vlm/glm-5.3-flash |
| Data (Z.ai's API terms, as summarised by third parties; the DPA itself not read) | content processed in real time and not stored; not used for training unless agreed; processed "generally" in Singapore; transfers to group companies not excluded | developersdigest, standardcompute, Silicon UK summaries **[unverified against the DPA]** |
| The family's own measurements (FloodWatch, open.bigmodel.cn key) | glm-5.3-flash: `thinking: disabled` → error 1210; `reasoning_effort: "low"` → ~1–5 s, and the token budget goes to the answer; an empty `content` with only `reasoning_content` is not an answer; glm-4-flash no longer exists (1211); ~570 validation calls median 3.1–4.5 s | FloodWatch docs/SOURCES.md, KNOWN_ISSUES KI-508, `src/floodwatch/ai.py` |

**The key used on 23 Oct** was FloodWatch's (`GLM_API_KEY` identical, checked by hash) on open.bigmodel.cn. Measured
there: `node tools/env-check.mjs --probe` → answers in 6.6 s (one Thai word, cold). It was deleted with the old
checkout (24 Oct). On the risk server, use **a key of this project's own** (OWNER_ACTIONS D6): cost and limits per app.

## 2. What it does here

### 2.1 English for TMD's warnings (collector, `tools/translate.mjs`)

**Why:** TMD's CAP feed is Thai only (`<language>th-TH`, one `<info>`). The provinces it warns most — on 23 Oct:
Phuket, Krabi, Surat Thani, Songkhla and seven more — are full of visitors who read no Thai, and the English page said
only "Heavy Rain (in Thai)".

**How (FloodWatch's D-022 rule, adapted):** rules decide every level, province and time; GLM only translates the
three text fields; a check rejects anything that isn't faithful; a rejected or missing translation leaves the 0.2.0
behaviour.
- Prompt: translate faithfully, keep every number, date and Buddhist-era year, no advice of one's own, JSON only, and
  TMD's region words exactly so (ภาคใต้ตอนกลาง = central South …, `REGIONS`).
- `checkTranslation`: every number of the Thai is in the English and none is added (a BE year may come back as CE);
  no Thai left; no reassurance word the Thai lacks ("safe", "normal", "no danger" …); length 0.6–5× the Thai; empty
  stays empty; **every TMD region word present must come back as its English** (the first live test turned
  ภาคใต้ตอนกลาง into "lower South" in 1 of 3 runs — the number check couldn't see it).
- One retry, told what was wrong. A warning is translated **once per text** (`textKey` = SHA-256 of the three fields)
  and reused from the last file; `AI_DAILY_CALLS` (200) caps a UTC day; the count is in `index.json → ai`.
- The page (English only) shows the translation under 🤖 "Machine translation (GLM) of TMD's Thai notice, checked to
  keep every number and region. The Thai notice is the official one.", with the Thai original one tap away. The
  verdict, the rain tile's TMD line and the pre-warnings use the English headline.

**Measured (23 Oct 2026, the live Heavy Rain notice for 11 southern provinces, glm-5.3-flash, effort low):**
- before the region rule: 3 of 3 passed the number check, 1 of 3 said "lower South" for ภาคใต้ตอนกลาง;
- with it: **6 of 6 accepted on the first call**, all "central South", median 3.4 s, max 3.9 s;
- in the Docker collector: 1 call for the new warning, 0 on the next runs (reused).

**Limits (KI-031):** the check sees numbers, regions, Thai left over, reassurance and length — not a changed verb or
a dropped clause without numbers. The label says so, and the Thai is always there.

### 2.2 A first reader for the Thai copy (dev tool, `tools/ai-review-copy.mjs`)

`npm run ai:review-copy` sends the Thai side of every page string and card line (207 strings, the site's own public
text) to glm-5.3 and writes a report for the native reviewer (KI-021, OWNER_ACTIONS A5):
[research/copy-review-glm-2026-10-23.md](research/copy-review-glm-2026-10-23.md).

**Measured:** 95 of 207 flagged in 7 batches (12–20 s each). Useful: the jargon list matches KI-021 (คพ., แบบจำลอง
51 ชุด, ข่าวอ้างหน่วยงาน, เซิร์ฟเวอร์ตอบรหัส, มัธยฐาน, µg/m³). **Wrong, and why it stays a reviewer's prompt:**
- it rewrote the privacy line into a contradiction ("ตำแหน่งของคุณไม่ถูกส่งออกไปไหน เราส่งเฉพาะตำแหน่งโดยประมาณ…");
- it read the date placeholder `{d}` as a distance ("ห่างออกไป {d}");
- it added a hotline to the fire line ("ไฟไหม้ โทร 199 หรือสายด่วนนิรภัย 1784");
- it flagged code placeholders (`${pm ? …}`) as visible text.

None of its suggestions was applied in 0.3.0.

## 3. Where else GLM could help, ranked (research notes, not built)

| # | Use | Value | Risk | Verdict |
|---|---|---|---|---|
| 1 | **English for TMD's storm-track announcements and the EMSC/USGS region names** (KI-024) | high for foreign visitors | low: region names are a finite list — better a reviewed table drafted once by GLM than runtime calls | do next, as a build-time table |
| 2 | **Search aliases** (KI-012): GLM drafts colloquial names for landmarks ("ม.เชียงใหม่", "นิมมาน", "เซ็นทรัลเฟส"); OpenStreetMap gives the coordinates; a person reviews; the page searches the static list | high (a known miss) | low: build time, no visitor text sent anywhere | do, build time |
| 3 | **A national "today" line on the welcome screen** (V39): rules gather the in-force warnings, felt quakes, storms within 1,500 km and hotspots; GLM retells; FloodWatch's checks (no new number, place or verdict) | medium | medium: FloodWatch needed 3 tries and a dozen checks (its KI-373…375) | later, only with FloodWatch's checker ported |
| 4 | **Bulletin extraction** for the collector: JTWC's Indian Ocean bulletins, TMD's Thai announcements → structured JSON (positions, provinces), validated against the province list | medium (ROADMAP v0.5.3) | low if every field is validated and nothing is shown that the rules didn't check | possible; regex first |
| 5 | **Reading a satellite or TMD chart** with glm-4.6v-flash (free) | low | high: a model reading an image becomes a measurement | no |
| 6 | **A chat "ask about my area"** (FloodWatch's ✨/❓) | low here | the visitor's text and place would leave the phone (GUIDELINES §2), to a provider outside Thailand (PDPA cross-border) | no |
| 7 | **AI-written verdicts, levels, advice or summaries of a point** | — | GLM gave "ได้ครับ" to "may I take my child to school?" in FloodWatch's test; the agencies' words are the product | **never** |

## 4. Rules (also in GUIDELINES §10)

1. **Off the visitor's path.** Only the collector and dev tools call GLM; the page never waits for it; the site is
   complete without it.
2. **Rules write facts; GLM only translates or reviews.** Never a level, a number, a time, a province, advice or a
   verdict.
3. **Checked or not shown.** Every AI text the page shows passes a deterministic check and is labelled as machine
   output, with the original one tap away.
4. **Public text only.** GLM never sees a position, a typed search, or anything about a visitor.
5. **Bounded.** One call per new text, a daily cap, `reasoning_effort: "low"`, a timeout; the key only in a header.
6. **Measure before shipping.** A new use needs a test on live text, written down here with its acceptance rate.

// English for TMD's Thai warnings, written once per warning by GLM in the collector and shown on the English page
// under the Thai notice's own facts (docs/AI.md §2). TMD's CAP feed is Thai only (`<language>th-TH`, one <info>),
// while the provinces it warns most (Phuket, Krabi, Surat Thani …) are full of visitors who read no Thai.
// The rules (FloodWatch D-022, adapted): rules decide every level and time; GLM only translates; `check` rejects a
// translation that drops or adds a number, leaves Thai in, adds reassurance, or is far too short or long. A rejected
// or missing translation leaves the warning as it was (Thai, labelled "in Thai"). GLM sees only TMD's public text.
import { createHash } from "node:crypto";
import { chat as glmChat, firstJson } from "./glm.mjs";

export const FIELDS = ["headline", "description", "instruction"];
/** TMD's region words and the English they must become (TMD's own English forecasts). A region is where a visitor
 *  decides whether a warning is theirs: the first live test (23 Oct 2026) turned "ภาคใต้ตอนกลาง" into "lower South"
 *  in one of three runs, which the number check can't see. `check` requires the English of every term present. */
export const REGIONS = [
  ["ภาคเหนือตอนบน", "upper North", /upper (part of the )?north/i],
  ["ภาคเหนือตอนล่าง", "lower North", /lower (part of the )?north(?!east)/i],
  ["ภาคตะวันออกเฉียงเหนือตอนบน", "upper Northeast", /upper (part of the )?north-?east/i],
  ["ภาคตะวันออกเฉียงเหนือตอนล่าง", "lower Northeast", /lower (part of the )?north-?east/i],
  ["ภาคใต้ตอนบน", "upper South", /upper (part of the )?south/i],
  ["ภาคใต้ตอนกลาง", "central South", /(central|middle) (part of the )?south/i],
  ["ภาคใต้ตอนล่าง", "lower South", /lower (part of the )?south/i],
  ["ภาคใต้ฝั่งตะวันออก", "the east coast of the South", /east(ern)? coast/i],
  ["ภาคใต้ฝั่งตะวันตก", "the west coast of the South", /west(ern)? coast/i],
  ["ประเทศไทยตอนบน", "upper Thailand", /upper (part of )?thailand/i],
  ["อ่าวไทยตอนบน", "upper Gulf of Thailand", /upper gulf of thailand/i],
  ["ทะเลอันดามัน", "Andaman Sea", /andaman/i],
  ["อ่าวไทย", "Gulf of Thailand", /gulf of thailand/i],
  ["กรุงเทพมหานคร", "Bangkok", /bangkok/i],
];
export const SYSTEM = "You translate official warnings of the Thai Meteorological Department (TMD) into plain English for "
  + "foreign visitors in Thailand. Translate faithfully and completely. Do not add, drop, soften or strengthen anything. "
  + "Keep every number, date and time exactly as written (keep Buddhist-era years as they are). Write Thai place names "
  + "in their usual English spelling, and TMD's region words exactly so: "
  + REGIONS.map(([th, en]) => `${th} = ${en}`).join("; ") + ". "
  + "Add no advice or comment of your own. Reply ONLY with JSON "
  + "{\"headline\": \"...\", \"description\": \"...\", \"instruction\": \"...\"}; an empty field stays an empty string.";
// words of comfort a TMD warning never uses: a translation that brings one in is rejected
const REASSURE = /\b(safe|safely|no danger|not dangerous|nothing to worry|no need to worry|normal|harmless|all clear)\b/i;
const THAI = /[฀-๿]/;
const TH_DIGITS = { "๐": 0, "๑": 1, "๒": 2, "๓": 3, "๔": 4, "๕": 5, "๖": 6, "๗": 7, "๘": 8, "๙": 9 };

/** Numbers in a text as strings ("2", "35.5", "2569"): Thai digits read as digits, thousands commas dropped. */
export function numbersOf(text) {
  const s = String(text || "").replace(/[๐-๙]/g, (d) => TH_DIGITS[d]).replace(/(\d),(\d{3})/g, "$1$2");
  return (s.match(/\d+(?:\.\d+)?/g) || []).map((n) => String(Number(n)));
}

/** The key of a warning's text: the same Thai text is translated once and reused from the last file. */
export const textKey = (w) => createHash("sha256").update(FIELDS.map((f) => w[f] || "").join("\u0000")).digest("hex").slice(0, 16);

/** Accept a translation only if it keeps the source's facts. → {ok, why: [...]} */
export function checkTranslation(src, en) {
  const why = [];
  if (!en || typeof en !== "object") return { ok: false, why: ["not a JSON object"] };
  for (const f of FIELDS) {
    const s = String(src[f] || "").trim();
    const e = en[f];
    if (typeof e !== "string") { why.push(`${f}: missing`); continue; }
    if (!s && e.trim()) why.push(`${f}: text where the notice has none`);
    if (s && !e.trim()) why.push(`${f}: empty`);
    if (!s) continue;
    if (THAI.test(e)) why.push(`${f}: Thai left in`);
    if (REASSURE.test(e) && !REASSURE.test(s)) why.push(`${f}: adds reassurance`);
    const ratio = e.length / s.length;
    if (ratio < 0.6 || ratio > 5) why.push(`${f}: length ${ratio.toFixed(1)}× the Thai`);
    const sn = numbersOf(s);
    const en2 = numbersOf(e);
    // a Buddhist-era year may come back as the Common Era one (2569 → 2026): both count as the same number
    const same = (a, b) => a === b || Number(a) - 543 === Number(b);
    const lost = sn.filter((n) => !en2.some((m) => same(n, m)));
    const added = en2.filter((m) => !sn.some((n) => same(n, m)));
    if (lost.length) why.push(`${f}: drops ${[...new Set(lost)].join(", ")}`);
    if (added.length) why.push(`${f}: adds ${[...new Set(added)].join(", ")}`);
    for (const [th, word, re] of REGIONS) if (s.includes(th) && !re.test(e)) why.push(`${f}: "${th}" must read "${word}"`);
  }
  return { ok: !why.length, why };
}

/** Translate one warning: up to two tries, the second told why the first was rejected. → {en} or {error} */
export async function translateOne(w, { chat = glmChat, tries = 2 } = {}) {
  const src = Object.fromEntries(FIELDS.map((f) => [f, String(w[f] || "").trim()]));
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(src) }];
  let calls = 0;
  let last = "";
  for (let i = 0; i < tries; i++) {
    const r = await chat(messages, { maxTokens: 1500, temperature: 0.1, json: true, timeoutMs: 45000 });
    calls++;
    if (!r.ok) { last = r.error; continue; }
    const en = firstJson(r.text);
    const c = checkTranslation(src, en);
    if (c.ok) return { en: { ...Object.fromEntries(FIELDS.map((f) => [f, en[f].trim()])), model: r.model, at: new Date().toISOString(), key: textKey(w), checked: true }, calls };
    last = c.why.join("; ");
    messages.push({ role: "assistant", content: r.text }, { role: "user", content: `Rejected: ${last}. Translate again, faithfully, keeping every number. JSON only.` });
  }
  return { error: last || "no answer", calls };
}

/** Add `en` to each warning: reused from the last file when the Thai text is unchanged, else translated within the
 *  day's budget. Never throws; a warning without a checked translation simply has no `en`. */
export async function translateWarnings(items, prevItems = [], { chat = glmChat, budget = { left: 0 }, log = () => {} } = {}) {
  const prev = new Map((prevItems || []).filter((p) => p.en?.key).map((p) => [p.en.key, p.en]));
  const out = [];
  let calls = 0;
  for (const w of items) {
    const key = textKey(w);
    if (prev.has(key)) { out.push({ ...w, en: prev.get(key) }); continue; }
    if (budget.left <= 0) { out.push(w); continue; }
    const r = await translateOne(w, { chat });
    calls += r.calls;
    budget.left -= r.calls;
    if (r.en) out.push({ ...w, en: r.en });
    else { out.push(w); log(`translation of ${w.id || key} rejected: ${r.error}`); }
  }
  return { items: out, calls };
}

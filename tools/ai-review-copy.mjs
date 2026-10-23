#!/usr/bin/env node
// A first reading of the page's Thai copy by GLM, before the native review (KNOWN_ISSUES KI-021, OWNER_ACTIONS A5).
// It reads the Thai side of every page string (i18n.js) and of the cards' words (assess.js), flags what an ordinary
// Thai adult or an older relative reading on a phone may not understand (jargon, English, abbreviations, long or
// ambiguous lines) and suggests plainer Thai. It changes nothing: it writes a report for a person to judge.
//   node tools/ai-review-copy.mjs [--out docs/research/copy-review-glm-YYYY-MM-DD.md] [--model glm-5.3]
// Reads GLM_API_KEY from .env; AI_ENABLED is not required (a dev tool, not the collector). The strings are the site's
// own public text: no visitor data is sent.
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env.mjs";
import { chat, glmConfig, firstJson } from "./glm.mjs";
import { STR } from "../public/js/i18n.js";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);

/** The Thai strings to read: the page's (STR) and the cards' (the first argument of L(...) in assess.js). */
export function thaiStrings(strTable, assessSrc) {
  const out = [];
  for (const [k, v] of Object.entries(strTable)) if (/[฀-๿]/.test(v.th || "")) out.push({ where: `i18n.${k}`, th: v.th });
  for (const m of assessSrc.matchAll(/\bL\(\s*(`[^`]*`|"[^"]*")/g)) {
    const th = m[1].slice(1, -1);
    if (/[฀-๿]/.test(th) && !out.some((x) => x.th === th)) out.push({ where: "assess.js", th });
  }
  return out;
}

export const SYSTEM = "คุณเป็นบรรณาธิการภาษาไทยของเว็บเตือนภัยสำหรับครอบครัวไทยทั่วไป รวมถึงผู้สูงอายุ ที่อ่านบนมือถือ (ส่วนใหญ่ใน LINE). "
  + "อ่านข้อความแต่ละบรรทัด แล้วชี้เฉพาะบรรทัดที่คนทั่วไปอาจไม่เข้าใจหรือเข้าใจผิด: ศัพท์เทคนิค คำย่อ คำอังกฤษ ประโยคยาวหรือกำกวม "
  + "หรือคำที่อาจทำให้ตกใจเกินหรือวางใจเกิน. ห้ามเปลี่ยนตัวเลข เกณฑ์ ชื่อหน่วยงาน หรือคำแนะนำด้านความปลอดภัย; "
  + "${...} คือค่าที่โปรแกรมใส่ ให้คงไว้. ตอบเป็น JSON เท่านั้น: {\"items\": [{\"i\": เลขบรรทัด, \"issue\": \"ปัญหาสั้นๆ\", "
  + "\"suggestion\": \"ข้อความที่ง่ายขึ้น\"}]} ถ้าบรรทัดไหนดีอยู่แล้วไม่ต้องใส่.";

async function main() {
  loadEnv();
  const config = glmConfig(process.env, { force: true });
  if (!config) { console.error("set GLM_API_KEY in .env"); process.exit(2); }
  config.model = arg("--model", "glm-5.3");
  const strings = thaiStrings(STR, readFileSync(new URL("../public/js/assess.js", import.meta.url), "utf8"));
  const flagged = [];
  let failed = 0;
  for (let s = 0; s < strings.length; s += 30) {
    const chunk = strings.slice(s, s + 30);
    const r = await chat([{ role: "system", content: SYSTEM }, { role: "user", content: chunk.map((x, i) => `${i + 1}. ${x.th}`).join("\n") }],
      { config, maxTokens: 6000, temperature: 0.2, json: true, timeoutMs: 180000 });
    const items = r.ok ? firstJson(r.text)?.items : null;
    if (!Array.isArray(items)) { failed++; console.error(`lines ${s + 1}–${s + chunk.length}: ${r.ok ? "no JSON" : r.error}`); continue; }
    for (const it of items) {
      const src = chunk[Number(it.i) - 1];
      if (src && it.issue) flagged.push({ ...src, issue: String(it.issue), suggestion: String(it.suggestion || "") });
    }
    console.log(`lines ${s + 1}–${s + chunk.length}: ${items.length} flagged (${(r.ms / 1000).toFixed(0)} s)`);
  }
  const day = new Date().toISOString().slice(0, 10);
  const out = arg("--out", `docs/research/copy-review-glm-${day}.md`);
  const cell = (t) => String(t).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const md = [`# GLM's first reading of the Thai copy (${day})`, "",
    `**Not a native review** (KNOWN_ISSUES KI-021, OWNER_ACTIONS A5): ${config.model} read ${strings.length} Thai strings`
    + ` of the page (i18n.js) and the cards (assess.js) with \`tools/ai-review-copy.mjs\` and flagged ${flagged.length}.`
    + `${failed ? ` ${failed} batch(es) failed and were not read.` : ""} Its suggestions are prompts for the human reviewer; none was`
    + " applied from this report alone, and none may change a number, a band, an agency's name or a safety line.", "",
    "| Where | Thai now | What GLM found | GLM's suggestion |", "|---|---|---|---|",
    ...flagged.map((f) => `| ${f.where} | ${cell(f.th)} | ${cell(f.issue)} | ${cell(f.suggestion)} |`), ""].join("\n");
  writeFileSync(new URL(`../${out}`, import.meta.url), md);
  console.log(`wrote ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

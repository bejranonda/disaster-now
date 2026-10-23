#!/usr/bin/env node
// What .env sets, without printing a single value (FloodWatch's owner_status idea, for this repo).
//   node tools/env-check.mjs            each variable of .env.example: set / empty / missing; extra names in .env
//   node tools/env-check.mjs --probe    also asks Cloudflare and GLM whether the keys work (read-only calls)
// Exit code 0 always for the listing; with --probe, 1 if a key that is set fails its probe.
import { readFileSync } from "node:fs";
import { parseEnv } from "./env.mjs";
import { chat, glmConfig } from "./glm.mjs";

const root = new URL("../", import.meta.url);
const read = (f) => { try { return readFileSync(new URL(f, root), "utf8"); } catch { return null; } };
const template = parseEnv(read(".env.example") || "");
const envText = read(".env");
const env = { ...parseEnv(envText || ""), ...Object.fromEntries(Object.keys(template).filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]])) };

/** Rows for the listing: never a value, only its state. */
export function status(templateVars, envVars) {
  const rows = Object.keys(templateVars).map((k) => [k, !(k in envVars) ? "missing" : envVars[k] === "" ? "empty" : "set"]);
  const extra = Object.keys(envVars).filter((k) => !(k in templateVars));
  return { rows, extra };
}

const { rows, extra } = status(template, env);
console.log(envText == null ? "no .env (copy .env.example to .env)" : ".env found");
for (const [k, s] of rows) console.log(`  ${s === "set" ? "✅" : s === "empty" ? "⬜" : "❔"} ${k.padEnd(24)} ${s}`);
if (extra.length) console.log(`  names in .env that this project doesn't read (safe to delete): ${extra.join(", ")}`);

if (process.argv.includes("--probe")) {
  let bad = 0;
  const cf = async (path, token) => {
    const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, { headers: { authorization: `Bearer ${token}` } });
    let d = null;
    try { d = await r.json(); } catch { /* not JSON */ }
    return { ok: r.ok && d?.success, d, status: r.status };
  };
  const tok = env.CLOUDFLARE_API_TOKEN;
  if (tok) {
    const v = await cf("/user/tokens/verify", tok);
    console.log(`  Cloudflare token: ${v.ok ? `valid (${v.d.result?.status})` : `FAILED (HTTP ${v.status})`}`);
    if (!v.ok) bad++;
    if (v.ok && env.CLOUDFLARE_DOMAIN) {
      const z = await cf(`/zones?name=${encodeURIComponent(env.CLOUDFLARE_DOMAIN)}`, tok);
      const zone = z.d?.result?.[0];
      console.log(`  zone ${env.CLOUDFLARE_DOMAIN}: ${zone ? `visible${env.CLOUDFLARE_ZONE_ID ? (zone.id === env.CLOUDFLARE_ZONE_ID ? ", CLOUDFLARE_ZONE_ID matches" : ", CLOUDFLARE_ZONE_ID DIFFERS") : ""}` : "not visible to this token"}`);
      if (zone && env.PUBLIC_HOST) {
        const dns = await cf(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(env.PUBLIC_HOST)}`, tok);
        const recs = dns.d?.result || [];
        console.log(`  ${env.PUBLIC_HOST}: ${dns.ok ? (recs.length ? `taken by ${recs.map((r) => r.type).join(", ")} record(s)` : "free (no DNS record yet)") : "DNS not readable with this token"}`);
      }
    }
    if (v.ok && env.CLOUDFLARE_ACCOUNT_ID) {
      const w = await cf(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`, tok);
      console.log(`  Workers scripts: ${w.ok ? `readable (${w.d.result.length} on the account)` : `not readable (HTTP ${w.status}): add Workers Scripts permission`}`);
      const kv = await cf(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces?per_page=100`, tok);
      const ns = kv.ok ? kv.d.result.find((n) => n.id === env.CF_KV_NAMESPACE_ID) : null;
      console.log(`  Workers KV: ${kv.ok ? `readable${env.CF_KV_NAMESPACE_ID ? (ns ? `, namespace "${ns.title}" found` : ", CF_KV_NAMESPACE_ID NOT FOUND") : ""}` : `not readable (HTTP ${kv.status}): add Workers KV Storage permission`}`);
    }
  }
  const g = glmConfig(env, { force: true });
  if (g) {
    const r = await chat([{ role: "user", content: "ตอบคำเดียวว่า พร้อม" }], { config: g, maxTokens: 500, timeoutMs: 30000 });
    console.log(`  GLM ${g.model} at ${new URL(g.endpoint).host}: ${r.ok ? `answers in ${(r.ms / 1000).toFixed(1)} s` : `FAILED (${r.error})`}${env.AI_ENABLED === "1" ? "" : " — AI_ENABLED is not 1, so the collector won't call it"}`);
    if (!r.ok) bad++;
  }
  process.exitCode = bad ? 1 : 0;
}

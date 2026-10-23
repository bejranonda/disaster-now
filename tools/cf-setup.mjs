#!/usr/bin/env node
// One-time Cloudflare setup for the Worker route (docs/CLOUDFLARE.md §3): find or create the KV namespace that holds the
// collector's live files, then write its id into wrangler.jsonc and .env (CF_KV_NAMESPACE_ID). Idempotent. Reads
// CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from .env; prints no secret. Deploying stays a separate, deliberate
// step: `npm run cf:deploy`.
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env.mjs";

export const TITLE = "disaster-now-live";
const root = new URL("../", import.meta.url);

/** Put a namespace id into wrangler.jsonc's LIVE binding (text edit: the file keeps its comments). */
export function patchWrangler(text, id) {
  return text.replace(/("binding":\s*"LIVE",\s*"id":\s*")[0-9a-f]*(")/, `$1${id}$2`);
}
/** Set (or add) one variable in .env's text. */
export function patchEnv(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.replace(/\n?$/, "\n")}${key}=${value}\n`;
}

async function main() {
  loadEnv();
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!token || !account) { console.error("set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env first"); process.exit(2); }
  const api = async (path, init = {}) => {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,
      { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success) {
      const why = d.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${r.status}`;
      throw new Error(`${path}: ${why}${r.status === 401 || r.status === 403 ? " — the token needs Account → Workers KV Storage: Edit" : ""}`);
    }
    return d.result;
  };
  const list = await api("/storage/kv/namespaces?per_page=100");
  let ns = list.find((n) => n.title === TITLE);
  if (ns) console.log(`KV namespace "${TITLE}" exists`);
  else { ns = await api("/storage/kv/namespaces", { method: "POST", body: JSON.stringify({ title: TITLE }) }); console.log(`KV namespace "${TITLE}" created`); }
  const wPath = new URL("wrangler.jsonc", root);
  writeFileSync(wPath, patchWrangler(readFileSync(wPath, "utf8"), ns.id));
  const ePath = new URL(".env", root);
  let envText = "";
  try { envText = readFileSync(ePath, "utf8"); } catch { /* no .env yet */ }
  writeFileSync(ePath, patchEnv(envText, "CF_KV_NAMESPACE_ID", ns.id), { mode: 0o600 });
  console.log("wrote its id to wrangler.jsonc (commit it: not a secret) and to .env (CF_KV_NAMESPACE_ID)");
  console.log("next: npm run collect (uploads the live files), then npm run cf:deploy, then node tools/health.mjs --web https://"
    + `${process.env.PUBLIC_HOST || "risk.autobahn.bot"}/`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });

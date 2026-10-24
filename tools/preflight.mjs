#!/usr/bin/env node
// Is this host ready to run Disaster Now and deploy it? (docs/SERVER.md §2). Read-only: it starts no container, calls
// no API and prints no value from .env (names and states only).
//   node tools/preflight.mjs        (npm run preflight)   one line per check; exit 1 if any check fails
// The first check is whether another app already runs here: 0.3.0's stack was set up on FloodWatch's production
// server by mistake, where it shared FloodWatch's IP and its ThaiWater quota (D-040, KI-029).
import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseEnv } from "./env.mjs";

const OURS = /^(disaster-now|dn-)/;          // compose names its containers disaster-now-<service>-1
const FLOODWATCH = /^floodwatch[-_]/i;

/** The checks, judged from facts gathered on the host. Pure, so the tests need no host. Levels: ok, warn, fail. */
export function assess(f) {
  const out = [];
  const add = (level, msg) => out.push({ level, msg });
  const others = (f.containers || []).filter((n) => !OURS.test(n));
  if (others.some((n) => FLOODWATCH.test(n))) add("fail", "FloodWatch runs on this host: this is FloodWatch's server, not the risk server. Run this stack on its own server (GUIDELINES §8)");
  else if (others.length) add("warn", `other containers here (${others.join(", ")}): they share this IP's rate limits with the collector (KI-029)`);
  else if (f.containers) add("ok", "no other app's containers on this host");

  if (f.node < 20) add("fail", `Node ${f.node}: the tools need Node 20 or newer`);
  else add("ok", `Node ${f.node}${f.node < 22 ? " (wrangler needs 22, so npm run cf:deploy runs it in Docker)" : ""}`);
  if (!f.docker) add("fail", "docker isn't usable by this user: install Docker with its compose plugin (docs/SERVER.md §2)");
  else if (!f.compose) add("fail", "docker compose (v2) is missing: install the compose plugin");
  else add("ok", "docker and docker compose");

  const env = f.env;
  if (!env) {
    add("fail", ".env is missing: cp .env.example .env && chmod 600 .env, then fill in new tokens (never copy another server's .env)");
    return out;
  }
  if (f.envMode & 0o077) add("warn", `.env is readable by others (mode ${f.envMode.toString(8)}): chmod 600 .env`);
  const extra = Object.keys(env).filter((k) => !(k in (f.template || {})));
  if (extra.length) add("warn", `${extra.length} name(s) in .env that this project doesn't read (${extra.join(", ")}): was it copied from another project?`);
  const missing = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"].filter((k) => !env[k]);
  if (missing.length) add("fail", `${missing.join(" and ")} empty: needed by npm run cf:setup and cf:deploy (OWNER_ACTIONS A9)`);
  else add("ok", "Cloudflare account and deploy token set (npm run env:check -- --probe tests them)");
  if (!env.CF_KV_TOKEN) add("warn", "CF_KV_TOKEN empty: the collector would upload with the deploy token; give it a KV-only token (A9)");
  if (env.CLOUDFLARE_TUNNEL_TOKEN) add("warn", "CLOUDFLARE_TUNNEL_TOKEN set: the Worker route needs no tunnel; if kept, it must be a tunnel made for this site");
  if (env.AI_ENABLED === "1" && !env.GLM_API_KEY) add("warn", "AI_ENABLED=1 without GLM_API_KEY: the English page shows TMD's warnings in Thai");

  if (!f.kvId || /^0{32}$/.test(f.kvId)) add("warn", "wrangler.jsonc still has the placeholder KV id: npm run cf:setup (then commit wrangler.jsonc)");
  else if (env.CF_KV_NAMESPACE_ID && env.CF_KV_NAMESPACE_ID !== f.kvId) add("fail", "wrangler.jsonc and .env name different KV namespaces: the Worker would serve files the collector never writes");
  else add("ok", "KV namespace id in wrangler.jsonc" + (env.CF_KV_NAMESPACE_ID ? " matches .env" : ""));
  return out;
}

/** The facts, from this host. */
export function gather(root = new URL("../", import.meta.url)) {
  const read = (p) => { try { return readFileSync(new URL(p, root), "utf8"); } catch { return null; } };
  const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8" }); return r.status === 0 ? r.stdout : null; };
  const ps = run("docker", ["ps", "-a", "--format", "{{.Names}}"]);
  const envText = read(".env");
  let envMode = 0;
  try { envMode = statSync(new URL(".env", root)).mode & 0o777; } catch { /* no .env */ }
  return {
    node: Number(process.versions.node.split(".")[0]),
    docker: ps != null,
    compose: ps != null && run("docker", ["compose", "version"]) != null,
    containers: ps == null ? null : ps.split("\n").filter(Boolean),
    env: envText == null ? null : parseEnv(envText),
    envMode,
    template: parseEnv(read(".env.example") || ""),
    kvId: (read("wrangler.jsonc") || "").match(/"binding":\s*"LIVE",\s*"id":\s*"([0-9a-f]+)"/)?.[1] || null,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = assess(gather());
  console.log("preflight: is this host ready for Disaster Now? (docs/SERVER.md §2)");
  for (const r of results) console.log(`  ${r.level === "ok" ? "✅" : r.level === "warn" ? "⚠️ " : "❌"} ${r.msg}`);
  const fails = results.filter((r) => r.level === "fail").length;
  console.log(fails ? `${fails} check(s) failed` : "ready: npm test → npm run cf:setup → docker compose up -d --build → npm run cf:deploy (docs/SERVER.md §2)");
  process.exitCode = fails ? 1 : 0;
}

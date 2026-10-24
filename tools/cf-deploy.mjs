#!/usr/bin/env node
// Deploy the Worker and the page to Cloudflare (docs/CLOUDFLARE.md §4) with a pinned wrangler, reading the token and
// account from .env (wrangler itself doesn't read .env for its login). Refuses while wrangler.jsonc still has the
// placeholder KV id (run `npm run cf:setup` first). Extra arguments go to wrangler, e.g. `npm run cf:deploy -- --dry-run`.
// wrangler 4 needs Node ≥ 22: on an older Node (e.g. a host with Node 20) it runs in node:22-bookworm-slim instead
// (Debian: wrangler's workerd needs glibc), passing the two variables by name so they never appear in a command line.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadEnv } from "./env.mjs";

export const WRANGLER = "wrangler@4.148.0"; // pinned: released 6 Oct 2026; bump deliberately
const root = new URL("..", import.meta.url).pathname;
loadEnv();
const extra = process.argv.slice(2);
const conf = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
if (/"id":\s*"0{32}"/.test(conf) && !extra.includes("--dry-run")) {
  console.error("wrangler.jsonc still has the placeholder KV id: run `npm run cf:setup` first");
  process.exit(2);
}
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
const major = Number(process.versions.node.split(".")[0]);
const r = major >= 22
  ? spawnSync("npx", ["--yes", WRANGLER, "deploy", ...extra], { stdio: "inherit", env, cwd: root })
  : spawnSync("docker", ["run", "--rm", "-v", `${root}:/app`, "-w", "/app", "-e", "HOME=/tmp", "-e", "WRANGLER_SEND_METRICS",
    "-e", "CLOUDFLARE_API_TOKEN", "-e", "CLOUDFLARE_ACCOUNT_ID", "node:22-bookworm-slim", "npx", "--yes", WRANGLER, "deploy", ...extra],
  { stdio: "inherit", env });
process.exit(r.status ?? 1);

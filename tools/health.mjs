#!/usr/bin/env node
// Health check for the server deployment (docker-compose.yml, docs/SERVER.md): prints one JSON line and exits 0 when
// healthy, 1 when not. No dependencies; it never prints secrets (there are none in what it reads).
//   node tools/health.mjs --web http://127.0.0.1:8090/              the page and the live index answer
//   node tools/health.mjs --live public/data/live --max-age 2700    the collector wrote index.json recently
// Both can be given together. --max-age is in seconds (default 2,700: three missed 15-minute runs).
import { readFileSync, statSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const WEB = opt("--web", null);
const LIVE = opt("--live", null);
const MAX_AGE = Number(opt("--max-age", 2700));

async function checkWeb(base) {
  const out = { ok: false };
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(5000) });
    const html = await r.text();
    out.page = r.status;
    out.ok = r.ok && /ภัยรอบบ้าน/.test(html);
    // the live index is optional (a deployment without the collector still serves the page)
    const live = await fetch(new URL("data/live/index.json", base), { signal: AbortSignal.timeout(5000) }).catch(() => null);
    out.liveIndex = live ? live.status : "unreachable";
    out.permissionsPolicy = r.headers.get("permissions-policy") || null; // must allow geolocation=(self)
  } catch (e) {
    out.error = String(e.message || e);
  }
  return out;
}

function checkLive(dir) {
  const out = { ok: false };
  try {
    const idx = JSON.parse(readFileSync(`${dir}/index.json`, "utf8"));
    const age = (Date.now() - Date.parse(idx.generated)) / 1000;
    out.generated = idx.generated;
    out.ageS = Math.round(age);
    out.failed = idx.failed || {};
    out.files = Object.fromEntries(Object.keys(idx.files || {}).map((f) => {
      try { return [f, Math.round((Date.now() - statSync(`${dir}/${f}`).mtimeMs) / 1000)]; } catch { return [f, null]; }
    }));
    out.ok = age <= MAX_AGE;
  } catch (e) {
    out.error = `no index.json yet (${e.code || e.message})`;
  }
  return out;
}

const report = { at: new Date().toISOString() };
if (WEB) report.web = await checkWeb(WEB);
if (LIVE) report.live = checkLive(LIVE);
if (!WEB && !LIVE) {
  console.error("usage: node tools/health.mjs [--web URL] [--live DIR] [--max-age S]");
  process.exit(2);
}
report.ok = [report.web, report.live].filter(Boolean).every((x) => x.ok);
console.log(JSON.stringify(report));
process.exit(report.ok ? 0 : 1);

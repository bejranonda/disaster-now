#!/usr/bin/env node
// The static server for public/ (no dependencies), for local checks, the smoke test and the server deployment
// (docker-compose.yml, docs/SERVER.md). It applies public/_headers (the same file Cloudflare Pages reads), compresses
// text, answers conditional requests, and logs nothing about requests: no IPs, no paths, no queries (GUIDELINES §2).
//   npm run serve                      → http://127.0.0.1:8787/
//   HOST=0.0.0.0 PORT=8080 node tools/serve.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".txt": "text/plain; charset=utf-8" };
const COMPRESS = /^(text\/|application\/(json|manifest\+json)|image\/svg)/;

/** Cloudflare's `_headers` format: a path line (`/*`, `/data/live/*`, `/exact`), then indented `Name: value` lines.
 *  Every matching block applies, in file order. */
export function parseHeaders(text) {
  const rules = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { rules.push({ path: line.trim(), headers: [] }); continue; }
    const m = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (m && rules.length) rules[rules.length - 1].headers.push([m[1], m[2]]);
  }
  return rules;
}
export function headersFor(rules, path) {
  const out = {};
  for (const r of rules) {
    const hit = r.path.endsWith("*") ? path.startsWith(r.path.slice(0, -1)) : path === r.path;
    if (hit) for (const [k, v] of r.headers) out[k.toLowerCase()] = v;
  }
  return out;
}

let RULES = [];
try { RULES = parseHeaders(readFileSync(join(ROOT, "_headers"), "utf8")); } catch { /* no _headers: none */ }

export function serve(port = Number(process.env.PORT) || 8787, host = process.env.HOST || "127.0.0.1") {
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { allow: "GET, HEAD" }); return res.end(); }
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT) || p.split("/").some((s) => s.startsWith(".") && s.length > 1) || p.endsWith("/_headers")) throw new Error("no");
      const st = await stat(file);
      if (!st.isFile()) throw new Error("no");
      const type = TYPES[extname(file)] || "application/octet-stream";
      const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
      const h = { "content-type": type, etag, "cache-control": "no-cache", ...headersFor(RULES, p.replace(/index\.html$/, "")), ...headersFor(RULES, p) };
      if (req.headers["if-none-match"] === etag) { res.writeHead(304, h); return res.end(); }
      let body = await readFile(file);
      if (COMPRESS.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] || "") && body.length > 1024) {
        body = gzipSync(body);
        h["content-encoding"] = "gzip";
        h.vary = "Accept-Encoding";
      }
      h["content-length"] = body.length;
      res.writeHead(200, h);
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", ...headersFor(RULES, "/") });
      res.end("not found");
    }
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  serve().then((s) => console.log(`serving public/ on http://${s.address().address}:${s.address().port}/`));
}

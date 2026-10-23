#!/usr/bin/env node
// A tiny static server for public/ (no dependencies): `npm run serve` → http://127.0.0.1:8787/
// The page needs only static hosting; this is for local checks and the smoke test.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };

export function serve(port = Number(process.env.PORT) || 8787) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT)) throw new Error("outside");
      await stat(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  serve().then((s) => console.log(`serving public/ on http://127.0.0.1:${s.address().port}/`));
}

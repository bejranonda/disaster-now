#!/usr/bin/env node
// Every relative link in the Markdown files points at a file that exists (and an anchor that exists):  npm run check:docs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (["node_modules", ".git"].includes(f)) continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".md")) files.push(p);
  }
})(ROOT);
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
const anchors = (p) => new Set(readFileSync(p, "utf8").split("\n").filter((l) => /^#{1,6} /.test(l)).map((l) => slug(l.replace(/^#+ /, ""))));
let bad = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(link) && !link.startsWith("#")) continue;
    const [path, hash] = link.split("#");
    const target = path ? resolve(dirname(f), path) : f;
    if (!existsSync(target)) { console.log(`MISSING ${f.slice(ROOT.length + 1)} → ${link}`); bad++; continue; }
    if (hash && target.endsWith(".md") && !anchors(target).has(hash)) { console.log(`ANCHOR  ${f.slice(ROOT.length + 1)} → ${link}`); bad++; }
  }
}
console.log(bad ? `${bad} broken link(s)` : `all links ok in ${files.length} files`);
process.exit(bad ? 1 : 0);

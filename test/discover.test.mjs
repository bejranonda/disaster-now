// Tests for what search engines and AI assistants read (0.7.1): llms.txt, robots.txt, the sitemap and the page's head.
// They hold the files to the page itself, so a rename, a new hotline or a release can't leave them saying something else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const LLMS = read("public/llms.txt");
const HTML = read("public/index.html");
const SITE = "https://risk.autobahn.bot/";

test("llms.txt: the llmstxt.org shape, absolute links, and the page's own name", () => {
  assert.match(LLMS, /^# ภัยรอบบ้าน · Thai Risk\n\n> /); // H1, then the one-paragraph summary
  assert.ok(HTML.includes("<title>ภัยรอบบ้าน · Thai Risk</title>"));
  for (const [, url] of LLMS.matchAll(/\]\(([^)]+)\)/g)) assert.match(url, /^https:\/\//, url);
  assert.match(LLMS, /not a warning service/);
});

test("llms.txt: the hotlines are the ones the page calls, and the four level words are the scale's", async () => {
  for (const n of LLMS.match(/hotline (\d{4})/g).map((s) => s.slice(-4))) assert.ok(HTML.includes(`href="tel:${n}"`), n);
  const { SCALE, UNKNOWN } = await import("../public/js/levels.js");
  for (const s of [...SCALE, UNKNOWN]) assert.ok(LLMS.includes(`${s.th} (${s.en})`), s.th);
});

test("llms.txt: every example link opens a real subdistrict with the name it gives", () => {
  const T = JSON.parse(read("public/data/tambon.json")).t;
  const ex = [...LLMS.matchAll(/#t=(\d{6}) \(([^,)]+)/g)];
  assert.ok(ex.length >= 2);
  for (const [, code, name] of ex) {
    const row = T.find((r) => r[0] === Number(code));
    assert.ok(row, code);
    assert.equal(row[2].replace(/\s/g, "").toLowerCase(), name.replace(/\s/g, "").toLowerCase());
  }
  assert.match(read("public/js/main.js"), /#t=\(\\d\{6\}\)/); // the page still reads #t= links
});

test("robots.txt points at the sitemap; the sitemap and the head name both languages", () => {
  assert.match(read("public/robots.txt"), new RegExp(`^Sitemap: ${SITE}sitemap\\.xml$`, "m"));
  const map = read("public/sitemap.xml");
  for (const u of [SITE, `${SITE}?lang=en`]) { assert.ok(map.includes(`<loc>${u}</loc>`), u); assert.ok(HTML.includes(`href="${u}"`), u); }
  assert.ok(!/rel="canonical"/.test(HTML)); // "/" and "?lang=en" are one file: a fixed canonical would drop English
});

test("the page's JSON-LD parses and agrees with the page", () => {
  const ld = JSON.parse(HTML.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld["@type"], "WebApplication");
  assert.equal(ld.url, SITE);
  assert.match(ld.description, /Not a warning service/);
  assert.equal(ld.image, HTML.match(/og:image" content="([^"]+)"/)[1]);
});

test("one version everywhere a release names it", () => {
  const v = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("package-lock.json")).version, v);
  assert.ok(read("public/js/main.js").includes(`export const VERSION = "${v}"`));
  const sw = read("public/sw.js");
  assert.ok(sw.includes(`"dn-${v}"`) && sw.includes(`css/app.css?v=${v}`) && sw.includes(`js/main.js?v=${v}`));
  assert.ok(HTML.includes(`css/app.css?v=${v}`) && HTML.includes(`js/main.js?v=${v}`));
});

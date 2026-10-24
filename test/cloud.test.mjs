// Tests for 0.3.0's server pieces: the .env reader, the GLM client and the warning translator (docs/AI.md), the KV
// upload and the Cloudflare Worker (docs/CLOUDFLARE.md), the new server's preflight. No network: every call goes to a fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseEnv } from "../tools/env.mjs";
import { glmConfig, payload, answerText, chat, firstJson } from "../tools/glm.mjs";
import { numbersOf, checkTranslation, translateWarnings, textKey, REGIONS } from "../tools/translate.mjs";
import { kvConfig, bulkBody, publishKV } from "../tools/publish-live.mjs";
import { patchWrangler, patchEnv } from "../tools/cf-setup.mjs";
import { status } from "../tools/env-check.mjs";
import worker, { LIVE_HEADERS, live } from "../worker/index.mjs";
import { parseHeaders, headersFor } from "../tools/serve.mjs";
import { parseCap, ua } from "../tools/collect.mjs";
import { assess } from "../tools/preflight.mjs";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const WARN = parseCap(fx("tmd_cap_item.xml"));
const EN_FIXTURE = JSON.parse(fx("warnings_en.json")).items[0];

test(".env: comments, quotes, inline comments, export", () => {
  const e = parseEnv("# c\nA=1\nB = two words # note\nC='x # y'\nexport D=\"q\"\nE=\nnot a line\n");
  assert.deepEqual(e, { A: "1", B: "two words", C: "x # y", D: "q", E: "" });
});

test("env-check lists states, never values", () => {
  const s = status({ A: "", B: "", C: "" }, { A: "secret-value", B: "", X: "1" });
  assert.deepEqual(s.rows, [["A", "set"], ["B", "empty"], ["C", "missing"]]);
  assert.deepEqual(s.extra, ["X"]);
  assert.ok(!JSON.stringify(s).includes("secret-value"));
});

test("GLM: off unless enabled and keyed; reasoning stays low; only content is an answer", () => {
  assert.equal(glmConfig({ AI_ENABLED: "0", GLM_API_KEY: "k" }), null);
  assert.equal(glmConfig({ AI_ENABLED: "1", GLM_API_KEY: "" }), null);
  assert.equal(glmConfig({ AI_ENABLED: "1", AI_PROVIDER: "cloudflare", GLM_API_KEY: "k" }), null);
  const c = glmConfig({ AI_ENABLED: "1", GLM_API_KEY: "k" });
  assert.equal(c.model, "glm-5.3-flash");
  assert.match(c.endpoint, /open\.bigmodel\.cn/);
  assert.ok(glmConfig({ GLM_API_KEY: "k" }, { force: true }));
  const p = payload("m", [], { maxTokens: 100, json: true });
  assert.equal(p.max_tokens, 500, "a floor for the reasoning that can't be switched off");
  assert.equal(p.reasoning_effort, "low");
  assert.deepEqual(p.response_format, { type: "json_object" });
  assert.equal(answerText({ choices: [{ message: { content: "", reasoning_content: "The user wants…" } }] }), null);
  assert.equal(answerText({ choices: [{ message: { content: " ok " } }] }), "ok");
  assert.deepEqual(firstJson("```json\n{\"a\":1}\n```"), { a: 1 });
});

test("GLM: the key goes only in the Authorization header, errors never carry it", async () => {
  let seen = null;
  const fetchImpl = async (url, init) => { seen = { url, init }; return { ok: false, status: 401, json: async () => ({ error: { code: "1002", message: "bad key" } }) }; };
  const r = await chat([{ role: "user", content: "x" }], { config: { key: "SECRET123", model: "m", endpoint: "https://e/x" }, fetchImpl });
  assert.equal(r.ok, false);
  assert.ok(!seen.url.includes("SECRET123"));
  assert.equal(seen.init.headers.authorization, "Bearer SECRET123");
  assert.ok(!JSON.stringify(r).includes("SECRET123"));
});

test("translation check: numbers, Buddhist-era years, Thai left in, reassurance, regions", () => {
  assert.deepEqual(numbersOf("คลื่นสูง ๒-๓ เมตร 1,200 ราย 35.5"), ["2", "3", "1200", "35.5"]);
  const src = { headline: "ฝนตกหนัก", description: "คลื่นสูงกว่า 2 เมตร ภาคใต้ตอนกลาง ฉบับที่ 3 ลงวันที่ 24 ต.ค. 2569", instruction: "" };
  const good = { headline: "Heavy rain", description: "Waves higher than 2 metres in the central South, notice no. 3 dated 24 Oct 2026", instruction: "" };
  assert.ok(checkTranslation(src, good).ok, JSON.stringify(checkTranslation(src, good).why));
  const lost = checkTranslation(src, { ...good, description: "Waves higher than two metres in the central South, notice 3, 24 Oct 2569" });
  assert.ok(lost.why.some((w) => /drops 2/.test(w)), lost.why.join("; "));
  const region = checkTranslation(src, { ...good, description: good.description.replace("central South", "lower South") });
  assert.ok(region.why.some((w) => /ภาคใต้ตอนกลาง/.test(w)), "the live test's 'lower South' for ภาคใต้ตอนกลาง is caught");
  assert.ok(!checkTranslation(src, { ...good, headline: "ฝนตกหนัก" }).ok, "Thai left in");
  assert.ok(!checkTranslation(src, { ...good, headline: "Heavy rain, but it is safe" }).ok, "reassurance added");
  assert.ok(!checkTranslation(src, { ...good, instruction: "Stay indoors" }).ok, "text where the notice has none");
  assert.ok(REGIONS.every(([th, en, re]) => re.test(en)), "every region's English passes its own pattern");
});

test("the real GLM translation of 23 Oct passes the check against TMD's text", () => {
  assert.ok(EN_FIXTURE.en.checked);
  const c = checkTranslation(EN_FIXTURE, EN_FIXTURE.en);
  assert.ok(c.ok, c.why.join("; "));
});

test("translateWarnings: reuses an unchanged text, respects the budget, drops a rejected answer", async () => {
  let calls = 0;
  const goodChat = async () => { calls++; return { ok: true, model: "fake", text: JSON.stringify({ headline: "Areas at risk of heavy rain in Thailand", description: EN_FIXTURE.en.description, instruction: EN_FIXTURE.en.instruction }) }; };
  const w = { ...EN_FIXTURE, en: undefined };
  const first = await translateWarnings([w], [], { chat: goodChat, budget: { left: 5 } });
  assert.equal(first.calls, 1);
  assert.equal(first.items[0].en.key, textKey(w));
  const again = await translateWarnings([w], first.items, { chat: goodChat, budget: { left: 5 } });
  assert.equal(again.calls, 0, "the same Thai text is never sent twice");
  assert.equal(calls, 1);
  const none = await translateWarnings([w], [], { chat: goodChat, budget: { left: 0 } });
  assert.equal(none.items[0].en, undefined, "no budget, no call, no English");
  const bad = await translateWarnings([WARN], [], { chat: async () => ({ ok: true, text: "{\"headline\":\"x\",\"description\":\"y\",\"instruction\":\"z\"}" }), budget: { left: 4 } });
  assert.equal(bad.items[0].en, undefined, "a rejected translation leaves the warning Thai");
  assert.equal(bad.calls, 2, "one retry, told why");
});

test("KV upload: settings, body, one bulk PUT with the token in a header", async () => {
  assert.equal(kvConfig({ CLOUDFLARE_ACCOUNT_ID: "a", CF_KV_NAMESPACE_ID: "" }), null);
  assert.deepEqual(kvConfig({ CLOUDFLARE_ACCOUNT_ID: "a", CF_KV_NAMESPACE_ID: "n", CLOUDFLARE_API_TOKEN: "t" }), { account: "a", ns: "n", token: "t" });
  assert.equal(kvConfig({ CLOUDFLARE_ACCOUNT_ID: "a", CF_KV_NAMESPACE_ID: "n", CF_KV_TOKEN: "kv", CLOUDFLARE_API_TOKEN: "t" }).token, "kv");
  assert.deepEqual(bulkBody([{ name: "x.json", text: "{}", fetched: "T" }]), [{ key: "x.json", value: "{}", metadata: { fetched: "T" } }]);
  let seen;
  const r = await publishKV({ account: "a", ns: "n", token: "t" }, [{ name: "x.json", text: "{}" }],
    { fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ success: true }) }; } });
  assert.ok(r.ok);
  assert.equal(seen.init.method, "PUT");
  assert.match(seen.url, /\/accounts\/a\/storage\/kv\/namespaces\/n\/bulk$/);
  assert.equal(seen.init.headers.authorization, "Bearer t");
  const denied = await publishKV({ account: "a", ns: "n", token: "t" }, [{ name: "x.json", text: "{}" }],
    { fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }) }) });
  assert.equal(denied.ok, false);
  assert.match(denied.error, /10000/);
});

test("cf-setup patches wrangler.jsonc and .env without touching the rest", () => {
  const w = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  // the committed id: the placeholder before `npm run cf:setup`, the real namespace's after (both are fine)
  const id0 = w.match(/"binding":\s*"LIVE",\s*"id":\s*"([0-9a-f]*)"/)[1];
  const p = patchWrangler(w, "abcdef0123456789abcdef0123456789");
  assert.match(p, /"binding": "LIVE", "id": "abcdef0123456789abcdef0123456789"/);
  assert.equal(p.replace("abcdef0123456789abcdef0123456789", id0), w);
  assert.equal(patchEnv("A=1\nCF_KV_NAMESPACE_ID=\nB=2\n", "CF_KV_NAMESPACE_ID", "x"), "A=1\nCF_KV_NAMESPACE_ID=x\nB=2\n");
  assert.equal(patchEnv("A=1", "K", "v"), "A=1\nK=v\n");
});

test("wrangler.jsonc: only /data/live/* runs the Worker, the address is risk.autobahn.bot, no logs", () => {
  const conf = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  assert.deepEqual(conf.assets.run_worker_first, ["/data/live/*"]);
  assert.equal(conf.assets.directory, "./public");
  assert.equal(conf.routes[0].pattern, "risk.autobahn.bot");
  assert.equal(conf.observability.enabled, false);
  assert.match(readFileSync(new URL("../public/.assetsignore", import.meta.url), "utf8"), /^data\/live$/m);
});

test("the Worker's live headers equal what public/_headers gives /data/live/*", () => {
  const rules = parseHeaders(readFileSync(new URL("../public/_headers", import.meta.url), "utf8"));
  const want = headersFor(rules, "/data/live/index.json");
  for (const [k, v] of Object.entries(want)) assert.equal(LIVE_HEADERS[k], v, k);
});

const fakeKV = (store) => ({ getWithMetadata: async (k) => (k in store ? { value: store[k], metadata: { fetched: "2026-10-23T21:49:00.000Z" } } : { value: null, metadata: null }) });
const req = (path, init) => new Request(`https://risk.autobahn.bot${path}`, init);

test("the Worker serves live files from KV with an ETag, 304, 404, 405; everything else is a static asset", async () => {
  const env = { LIVE: fakeKV({ "index.json": "{\"generated\":\"x\"}" }), ASSETS: { fetch: async () => new Response("asset") } };
  const r = await worker.fetch(req("/data/live/index.json"), env, {});
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "{\"generated\":\"x\"}");
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  const etag = r.headers.get("etag");
  assert.equal(etag, "\"2026-10-23T21:49:00.000Z\"");
  assert.equal((await worker.fetch(req("/data/live/index.json", { headers: { "if-none-match": etag } }), env, {})).status, 304);
  assert.equal((await worker.fetch(req("/data/live/nope.json"), env, {})).status, 404);
  assert.equal((await worker.fetch(req("/data/live/sub/index.json"), env, {})).status, 404, "no folders, only plain names");
  assert.equal((await worker.fetch(req("/data/live/index.json", { method: "POST" }), env, {})).status, 405);
  assert.equal((await live(req("/data/live/index.json"), { ASSETS: env.ASSETS }, {})).status, 503, "no KV binding: says so");
  assert.equal(await (await worker.fetch(req("/"), env, {})).text(), "asset");
  assert.equal((await worker.fetch(req("/data/live/index.json"), env, {})).headers.get("set-cookie"), null);
});

test("the collector's User-Agent names the site and, when set, a contact", () => {
  assert.equal(ua({ PUBLIC_HOST: "risk.autobahn.bot" }), "disaster-now-collector/0.3 (+https://risk.autobahn.bot)");
  assert.match(ua({ PUBLIC_HOST: "risk.autobahn.bot", CONTACT_EMAIL: "a@b.c" }), /contact: a@b\.c\)$/);
});

// The risk server's preflight (D-040): FloodWatch's server must fail; a clean, filled-in host must pass.
const READY = {
  node: 22, docker: true, compose: true, containers: ["disaster-now-web-1", "disaster-now-collector-1"], envMode: 0o600,
  template: { CLOUDFLARE_ACCOUNT_ID: "", CLOUDFLARE_API_TOKEN: "", CF_KV_TOKEN: "", CF_KV_NAMESPACE_ID: "" },
  env: { CLOUDFLARE_ACCOUNT_ID: "a", CLOUDFLARE_API_TOKEN: "t", CF_KV_TOKEN: "k", CF_KV_NAMESPACE_ID: "f".repeat(32) },
  kvId: "f".repeat(32),
};
const levels = (r) => r.map((x) => x.level);

test("preflight: a filled-in host of its own passes; FloodWatch's server fails first", () => {
  assert.ok(!levels(assess(READY)).includes("fail"));
  assert.ok(!levels(assess(READY)).includes("warn"));
  const fw = assess({ ...READY, node: 20, containers: ["floodwatch-app", "floodwatch-vpn", "disaster-now-web-1"] });
  assert.equal(fw[0].level, "fail");
  assert.match(fw[0].msg, /FloodWatch's server/);
  assert.equal(assess({ ...READY, containers: ["someapp"] })[0].level, "warn");
});

test("preflight: no .env, a readable .env, a copied .env, a placeholder or mismatched KV id", () => {
  assert.match(assess({ ...READY, env: null }).find((r) => r.level === "fail").msg, /never copy another server's \.env/);
  assert.ok(assess({ ...READY, envMode: 0o644 }).some((r) => r.level === "warn" && /chmod 600/.test(r.msg)));
  const copied = assess({ ...READY, env: { ...READY.env, DATABASE_URL: "x", SESSION_SECRET: "y" } });
  const w = copied.find((r) => /doesn't read/.test(r.msg));
  assert.equal(w.level, "warn");
  assert.ok(!JSON.stringify(copied).includes('"x"') && /DATABASE_URL, SESSION_SECRET/.test(w.msg));
  assert.ok(assess({ ...READY, kvId: "0".repeat(32) }).some((r) => r.level === "warn" && /cf:setup/.test(r.msg)));
  assert.ok(assess({ ...READY, kvId: "e".repeat(32) }).some((r) => r.level === "fail" && /different KV namespaces/.test(r.msg)));
  assert.ok(assess({ ...READY, env: { ...READY.env, CLOUDFLARE_API_TOKEN: "" } }).some((r) => r.level === "fail" && /A9/.test(r.msg)));
  assert.equal(assess({ ...READY, node: 18 }).find((r) => /Node/.test(r.msg)).level, "fail");
});

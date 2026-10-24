// Uploads the collector's files to Workers KV, where the Cloudflare Worker serves them as /data/live/* (worker/index.mjs,
// docs/CLOUDFLARE.md). One bulk request per run. KV's free plan allows 1,000 writes a day: 7 files every 15 minutes and
// rain3d.json once an hour is ≈ 696. The token needs only "Workers KV Storage: Edit"; it goes in the Authorization header and is never printed.

export const API = "https://api.cloudflare.com/client/v4";

/** The upload's settings from the environment, or null (then the collector writes local files only). */
export function kvConfig(env = process.env) {
  const account = (env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const ns = (env.CF_KV_NAMESPACE_ID || "").trim();
  const token = (env.CF_KV_TOKEN || env.CLOUDFLARE_API_TOKEN || "").trim();
  return account && ns && token ? { account, ns, token } : null;
}

/** [{name, text, fetched}] → KV's bulk body: the file name is the key, `fetched` rides along as metadata (the ETag). */
export const bulkBody = (files) => files.map((f) => ({ key: f.name, value: f.text, metadata: { fetched: f.fetched || null } }));

/** PUT the files in one request. Never throws: {ok, n} or {ok: false, error}. */
export async function publishKV(cfg, files, { fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
  if (!cfg || !files.length) return { ok: false, error: "nothing to publish" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${API}/accounts/${cfg.account}/storage/kv/namespaces/${cfg.ns}/bulk`, {
      method: "PUT",
      signal: ctl.signal,
      headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
      body: JSON.stringify(bulkBody(files)),
    });
    let d = null;
    try { d = await r.json(); } catch { /* not JSON */ }
    if (r.ok && d?.success) return { ok: true, n: files.length };
    const why = d?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${r.status}`;
    return { ok: false, error: why.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : String(e.message || e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

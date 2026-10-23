// Disaster Now on Cloudflare Workers (docs/CLOUDFLARE.md). The page is static assets served from Cloudflare's edge
// (`public/`, with `public/_headers`); this Worker runs ONLY for /data/live/* (wrangler.jsonc → run_worker_first) and
// serves the collector's files from Workers KV, where the collector on the server uploads them (tools/publish-live.mjs).
// So the page keeps working from the edge if the server is down; the live files then simply grow old, and the page
// shows their age. Like tools/serve.mjs it logs nothing about requests (GUIDELINES §2) and sets no cookies.

/** The live files' headers. They equal what public/_headers gives /data/live/* plus /* (a unit test compares them),
 *  because _headers applies to static assets only, not to responses a Worker makes. */
export const LIVE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300, stale-while-revalidate=600",
  "access-control-allow-origin": "*",
  "permissions-policy": "geolocation=(self), camera=(), microphone=(), payment=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
};
const NAME = /^\/data\/live\/([a-z0-9_]{1,40}\.json)$/;
// one KV read per file per Cloudflare location per minute, at most: KV's free plan reads 100,000 a day
const EDGE_TTL_S = 60;

const plain = (status, text, extra = {}) => new Response(text, {
  status, headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", ...extra },
});

/** GET/HEAD /data/live/<file>.json → the KV value, with an ETag from the collector's `fetched` time. */
export async function live(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return plain(405, "method not allowed", { allow: "GET, HEAD" });
  const m = new URL(request.url).pathname.match(NAME);
  if (!m) return plain(404, "not found");
  if (!env.LIVE) return plain(503, "live files not configured");
  const cache = globalThis.caches?.default;
  const key = new Request(new URL(request.url).origin + `/data/live/${m[1]}`);
  let res = cache ? await cache.match(key) : null;
  if (!res) {
    const { value, metadata } = await env.LIVE.getWithMetadata(m[1], { type: "text" });
    if (value == null) return plain(404, "not found");
    const etag = `"${String(metadata?.fetched || value.length).replace(/[^\w:.-]/g, "")}"`;
    res = new Response(value, { headers: { ...LIVE_HEADERS, etag } });
    if (cache) {
      const copy = new Response(value, { headers: { ...LIVE_HEADERS, etag, "cache-control": `public, max-age=${EDGE_TTL_S}` } });
      const put = cache.put(key, copy);
      if (ctx?.waitUntil) ctx.waitUntil(put); else await put;
    }
  }
  const etag = res.headers.get("etag");
  const headers = { ...LIVE_HEADERS, etag };
  if (etag && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : res.body, { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/data/live/")) return live(request, env, ctx);
    return env.ASSETS.fetch(request); // anything else that reached the Worker: the static asset, with _headers applied
  },
};

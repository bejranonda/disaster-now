// Offline shell: the page, its code and the subdistrict table. Data always comes from the network (never a stale
// forecast from the cache); the shell is refreshed in the background. Bump VERSION with every release.
// SHELL must list every module the page imports, or one missing file kills the page offline (the visitor audit's V3:
// actions.js was missing); test/more.test.mjs walks the import graph and fails when one is left out.
const VERSION = "dn-0.7.1";
// (no "index.html": the edge answers it with a 307 to "/", and a cached redirect fails as a navigation, device study T10)
const SHELL = ["./", "css/app.css?v=0.7.1", "js/main.js?v=0.7.1", "js/geo.js", "js/heat.js", "js/levels.js",
  "js/outlook.js", "js/airq.js", "js/water.js", "js/quake.js", "js/events.js", "js/sources.js", "js/assess.js",
  "js/places.js", "js/i18n.js", "js/ipe.js", "js/actions.js", "js/calibration.js", "config.json", "data/tambon.json",
  "manifest.webmanifest", "icon.svg", "fonts/anuphan-thai.woff2", "fonts/anuphan-latin.woff2"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.includes("/data/live/")) return; // agencies and live files: network only
  // every navigation is the one page: "?openExternalBrowser=1" (the page's own LINE link) and "?lang=en" open from the
  // cache offline too (T7); a redirected answer is never cached (T10)
  const nav = e.request.mode === "navigate";
  e.respondWith(caches.match(e.request, nav ? { ignoreSearch: true } : undefined).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok && !r.redirected) caches.open(VERSION).then((c) => c.put(e.request, r.clone())); return r; })
      .catch(() => hit || (nav ? caches.match("./") : undefined));
    return hit || net;
  }));
});

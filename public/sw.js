// Offline shell: the page, its code and the subdistrict table. Data always comes from the network (never a stale
// forecast from the cache); the shell is refreshed in the background. Bump VERSION with every release.
// SHELL must list every module the page imports, or one missing file kills the page offline (the visitor audit's V3:
// actions.js was missing); test/more.test.mjs walks the import graph and fails when one is left out.
const VERSION = "dn-0.4.0";
const SHELL = ["./", "index.html", "css/app.css?v=0.4.0", "js/main.js?v=0.4.0", "js/geo.js", "js/heat.js", "js/levels.js",
  "js/outlook.js", "js/airq.js", "js/water.js", "js/quake.js", "js/events.js", "js/sources.js", "js/assess.js",
  "js/places.js", "js/i18n.js", "js/ipe.js", "js/actions.js", "js/calibration.js", "config.json", "data/tambon.json",
  "manifest.webmanifest", "icon.svg"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.includes("/data/live/")) return; // agencies and live files: network only
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});

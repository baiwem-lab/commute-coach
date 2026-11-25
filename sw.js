// Offline support. Bump VERSION when publishing a new week.
const VERSION = "cc-week01-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png",
               "content/diagnostic.json", "content/current-week.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first (with a 3 s limit, for tunnels), then the saved copy.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await Promise.race([
        fetch(e.request),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
      ]);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(e.request, {ignoreSearch: true});
      if (hit) return hit;
      throw err;
    }
  })());
});

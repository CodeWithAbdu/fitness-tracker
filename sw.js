const CACHE = "fitlog-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./exercises.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  // fetch with cache: "reload" so the browser's HTTP cache can't hand back stale assets
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((url) => fetch(url, { cache: "reload" }).then((res) => c.put(url, res))))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("api.jsonbin.io")) return; // never cache the API
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

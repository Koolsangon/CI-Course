/*
 * Minimal offline service worker for Cost Sim v1.
 * Strategy: cache-first for /content/**, network-first for pages,
 * stale-while-revalidate for Next.js chunks.
 *
 * NOTE: We intentionally avoid next-pwa because our offline requirement
 * is narrow (sandbox + cases + engine) and a hand-tuned SW keeps the
 * critical path bundle small (AC12 ≤260KB gzip).
 */

const CACHE = "cost-sim-v1-0";
const CONTENT_PATTERN = /\/(content|_next\/static)\//;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Cache-first for static content + Next chunks.
  if (CONTENT_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Network-first for navigation.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

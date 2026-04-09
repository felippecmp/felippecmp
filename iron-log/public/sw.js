/* Felippe's Log service worker.
 *
 * Simplified strategy (v3): cache ONLY Next.js static assets, never the
 * HTML. HTML is always fetched network — stale HTML is the source of CSS
 * drift bugs because it pins the page to a specific CSS hash.
 *
 * - GET + same-origin only. POSTs (server actions) pass through.
 * - Next.js static assets (/_next/static/*, images, fonts) → cache-first,
 *   keyed by the hashed filename, so they're immutable and safe.
 * - Page navigations → pass through (browser HTTP cache only, no SW).
 * - API routes and RSC refetches → pass through untouched.
 *
 * Bumping CACHE_VERSION evicts old caches on activate. v3 moves away from
 * caching navigations — previously stale HTML would keep pointing at old
 * CSS chunks, producing subtle visual regressions across deploys.
 */
const CACHE_VERSION = "felippes-log-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|woff2?|ttf|png|jpg|jpeg|gif|svg|ico|webp)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (
      cached ||
      new Response("Offline", {
        status: 503,
        headers: { "content-type": "text/plain" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Never cache server actions, API routes, or RSC refetches.
  if (url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("_rsc")) return;

  // Static assets only. HTML navigations pass through to the network so
  // each response reflects the current deploy.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

// Allow the page to ask for a fresh SW without a full reload.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

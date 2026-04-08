/* Felippe's Log service worker.
 *
 * Lean cache-the-shell SW. Strategy:
 *  - GET + same-origin only. Let POSTs (server actions) go straight to net.
 *  - Next.js static assets (/_next/static/*) → cache-first, immutable.
 *  - Page navigations → network-first, fall back to cache when offline.
 *  - RSC refetches (?_rsc=...) are skipped entirely; they fail fast so the
 *    client can render from its existing state.
 *  - Everything else (fonts, svgs) → stale-while-revalidate.
 *
 * Bumping CACHE_VERSION evicts old caches on activate.
 */
const CACHE_VERSION = "felippes-log-v1";
const OFFLINE_FALLBACK = "/";

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
  } catch (err) {
    return (
      cached ||
      new Response("Offline", {
        status: 503,
        headers: { "content-type": "text/plain" },
      })
    );
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(request);
    if (res && res.ok && request.method === "GET") {
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last-resort: serve the cached home page so the shell renders and the
    // client router can take over (if routes it needs are also cached).
    const fallback = await cache.match(OFFLINE_FALLBACK);
    if (fallback) return fallback;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0\"><div style=\"text-align:center\"><p style=\"font-size:14px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px\">Sem conexão</p><h1 style=\"font-size:28px;font-weight:800;margin:0\">Offline</h1><p style=\"font-size:13px;color:#71717a;margin-top:12px\">Abra novamente quando tiver sinal.</p></div></body>",
      {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
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

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
});

// Allow the page to ask for a fresh SW without a full reload.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

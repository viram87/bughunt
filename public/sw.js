// Service worker for BugHunt.
//
// The main win isn't offline — it's that Pyodide is ~10MB fetched from a CDN
// every time a fresh worker spins up. Those URLs are version-pinned, so they
// can be cached indefinitely and the second run of any Python challenge
// becomes near-instant.
//
// Deliberately conservative about HTML: pages are network-first, so a stale
// app shell can never be served to someone who is online. Only immutable,
// version-pinned assets get cache-first treatment.

const VERSION = "v1";
const RUNTIME_CACHE = `bughunt-runtime-${VERSION}`;
const PAGE_CACHE = `bughunt-pages-${VERSION}`;

// Version-pinned and immutable: safe to keep forever.
const IMMUTABLE_HOSTS = ["cdn.jsdelivr.net"];

self.addEventListener("install", (event) => {
  // Activate immediately rather than waiting for every old tab to close —
  // otherwise a fix can sit unused for days.
  self.skipWaiting();
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(["/offline"]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("bughunt-") && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache auth or API traffic — a cached session or stale challenge
  // list would be worse than being offline.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Pyodide, acorn, astring: pinned versions, cache-first and kept.
  if (IMMUTABLE_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Our own workers change with deploys, so revalidate but fall back to cache
  // when offline.
  if (url.origin === self.location.origin && url.pathname.startsWith("/workers/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const hit = await cache.match(request);
          if (hit) return hit;
          throw new Error("worker unavailable offline");
        }
      })()
    );
    return;
  }

  // Pages: network-first so online users always get fresh content, with the
  // last successful response kept purely as an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) ?? (await cache.match("/offline")) ?? Response.error();
        }
      })()
    );
  }
});

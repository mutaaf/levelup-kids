// LevelUp Kids service worker — minimal, hand-rolled, no Workbox.
//
// Strategy map (origin only — third-party requests pass through):
//
//   PUBLIC NAVIGATIONS                stale-while-revalidate (PUBLIC_CACHE)
//     /, /auth/signin, /auth/signup,
//     /display/<token>, /invite/<token>
//
//   AUTHENTICATED NAVIGATIONS         network-first, no caching
//     /settings, /kids/<id>, /coach, /onboarding/*
//     (cookies vary per user — caching the HTML risks showing a
//      previous user's content after sign-out)
//
//   SHARE CARDS                       stale-while-revalidate (IMAGE_CACHE)
//     /api/share/score-card           (cards are URL-keyed, no cookies)
//
//   STATIC ASSETS                     cache-first (STATIC_CACHE)
//     /_next/static/*, /icons/*, /icon, /apple-icon, /favicon.ico
//
//   EVERYTHING ELSE                   pass through (no SW involvement)
//
// Bump the version when changing the strategy map so old caches drain
// on next visit.

const VERSION = "v2";
const STATIC_CACHE = `levelup-static-${VERSION}`;
const PUBLIC_CACHE = `levelup-public-${VERSION}`;
const IMAGE_CACHE = `levelup-image-${VERSION}`;
const ALL_CACHES = [STATIC_CACHE, PUBLIC_CACHE, IMAGE_CACHE];

const OFFLINE_URL = "/offline";

// Precache the offline fallback so a first-time-offline visitor sees
// something other than the browser's "no internet" page.
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                (k.startsWith("levelup-") || k.startsWith("levelup-kids-")) &&
                !ALL_CACHES.includes(k),
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const PUBLIC_NAV_PATHS = new Set(["/", "/auth/signin", "/auth/signup"]);

function isPublicNav(url) {
  if (PUBLIC_NAV_PATHS.has(url.pathname)) return true;
  if (url.pathname.startsWith("/display/")) return true;
  if (url.pathname.startsWith("/invite/")) return true;
  return false;
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (url.pathname === "/icon" || url.pathname === "/apple-icon") return true;
  if (url.pathname === "/favicon.ico") return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  return false;
}

function isShareCard(url) {
  return url.pathname === "/api/share/score-card";
}

// Stale-while-revalidate: respond with the cached copy IMMEDIATELY,
// kick off a background refresh, update the cache for next time.
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Don't poison the cache with non-OK responses.
          if (res && res.ok && res.status === 200) {
            cache.put(req, res.clone()).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached || Response.error());
      // Return cached if we have it (instant); otherwise wait for net.
      return cached || network;
    }),
  );
}

// Cache-first: serve from cache if present, fall back to network.
function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.status === 200) {
          cache.put(req, res.clone()).catch(() => undefined);
        }
        return res;
      });
    }),
  );
}

// Network-first: try the net; on failure fall back to the offline page
// (only for navigations) or just rethrow.
function networkFirstNav(req) {
  return fetch(req).catch(() =>
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.match(OFFLINE_URL))
      .then(
        (hit) =>
          hit ||
          new Response("You're offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Same-origin only.
  if (url.origin !== self.location.origin) return;

  // Skip range requests (video/audio scrubbing).
  if (req.headers.get("range")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (isShareCard(url)) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }

  if (req.mode === "navigate") {
    if (isPublicNav(url)) {
      event.respondWith(staleWhileRevalidate(req, PUBLIC_CACHE));
      return;
    }
    event.respondWith(networkFirstNav(req));
    return;
  }

  // Everything else: pass through.
});

// Hot-reload trigger from the client. The page can postMessage
// {type:'SKIP_WAITING'} to force the new SW to activate immediately
// instead of waiting for all tabs to close.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

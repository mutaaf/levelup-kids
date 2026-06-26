// LevelUp Kids service worker — minimal, hand-rolled, no Workbox.
// Cache-first for the static app shell, network-first for the app routes,
// fallback to an offline shell page if the network is unreachable.

const SHELL_CACHE = "levelup-kids-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
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
            .filter((k) => k.startsWith("levelup-kids-shell-") && k !== SHELL_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Don't intercept Supabase or third-party requests.
  if (url.origin !== self.location.origin) return;

  // Static assets via the Next.js build output: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        });
      }),
    );
    return;
  }

  // Navigation requests: network-first with cached shell fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/").then((hit) => hit ?? new Response("offline", { status: 503 })),
      ),
    );
    return;
  }
});

/*
 * Service worker — app shell only.
 *
 * TermHive's data is live (agent state, terminal streams, the WebSocket), so
 * caching API responses would show stale agents and mislead the user. This
 * caches the static shell so the app opens when installed, and lets every
 * /api and /ws request go straight to the network.
 */

const CACHE = 'termhive-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache live data or the socket.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    return;
  }

  // Navigations: network first so a deploy is picked up, falling back to the
  // cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Hashed build assets are immutable — serve from cache when present.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }

          return response;
        }),
    ),
  );
});

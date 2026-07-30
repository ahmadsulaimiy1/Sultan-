// Sultan Hanafi Royal Schools — PWA service worker.
//
// Design intent (per the Founder's app-architecture directive): this
// site is the single source of truth. Pages must NEVER be served stale
// from cache when the network is available — a new policy, handbook,
// calendar, announcement, or admissions update must appear the moment
// it's published, with no reinstall and no app-store update. So this
// worker is network-first for navigations (HTML pages) and API calls are
// never intercepted at all; the cache exists only as an offline fallback
// and as a speed boost for static assets (css/js/images), which are
// safe to serve stale-while-revalidate since a page reload always
// re-fetches its own HTML fresh.
const CACHE_VERSION = 'shrs-pwa-v1';
const APP_SHELL = [
  '/css/brand.css',
  '/css/personalisation.css',
  '/css/announcements.css',
  '/js/site.js',
  '/js/personalisation.js',
  '/assets/images/favicon.png',
  '/assets/images/pwa-icon-192.png',
  '/assets/images/pwa-icon-512.png',
  '/offline/',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Live data (portal sessions, staff APIs, admissions, finance, etc.)
  // is never cached — it must always come straight from the network.
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/offline/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

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
const CACHE_VERSION = 'shrs-pwa-b6d1919da4';
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

// Web Push (functions/_lib/web-push.js sends the encrypted payload;
// this is the receiving half). event.data is the decrypted JSON body —
// the browser has already done the aes128gcm decryption by the time
// this fires, this worker only ever sees plaintext. Falls back to a
// generic notice if a push somehow arrives with no payload (the Push
// API permits payload-less pushes) rather than silently dropping it.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'Sultan Hanafi Royal Schools';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/assets/images/pwa-icon-192.png',
    badge: '/assets/images/pwa-icon-192.png',
    tag: data.tag || 'shrs-notification',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focuses an already-open tab on the target URL if one exists, rather
// than always opening a new one — matches how a real installed app's
// notifications behave.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
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

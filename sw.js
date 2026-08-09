// Sultan Hanafi Royal Schools — PWA service worker.
//
// Two rules govern everything below, and they pull in opposite
// directions, so they are separated by SURFACE rather than compromised:
//
//   PUBLIC CONTENT (pages, announcements, policies, calendars) must never
//   be served stale while the network is reachable. A published change has
//   to appear on the next view, with no reinstall. So navigations are
//   network-first; the copy in the cache exists ONLY as an offline
//   fallback, and when it is used the page is told so it can say so out
//   loud rather than passing a saved copy off as live.
//
//   THE APPLICATION SHELL (css, js, fonts, icons, dictionaries) is what
//   makes the site feel instantaneous and what makes it work at all with
//   no signal. Those URLs carry a ?v=<hash> fingerprint and the whole
//   cache is retired whenever any of them changes (scripts/build.js
//   rewrites CACHE_VERSION from a hash of every css/js file), so
//   cache-first is safe for them in a way it is never safe for a page.
//
// API traffic is not intercepted at all — not cached, not replayed, not
// "helpfully" answered from a stale copy. A request for live institutional
// data either reaches the server or fails honestly. Nothing here may fail
// open.
const CACHE_VERSION = 'shrs-pwa-36f9b70f59';

// One cache per lifetime rule, all sharing the version so a build retires
// the whole set together.
const SHELL_CACHE = CACHE_VERSION + '-shell';   // fingerprinted assets — cache-first
const PAGES_CACHE = CACHE_VERSION + '-pages';   // HTML — network-first, offline fallback only
const DATA_CACHE = CACHE_VERSION + '-data';     // unfingerprinted static JSON — stale-while-revalidate
const TYPE_CACHE = CACHE_VERSION + '-type';     // third-party webfonts — stale-while-revalidate
const OUR_CACHES = [SHELL_CACHE, PAGES_CACHE, DATA_CACHE, TYPE_CACHE];

// Precached at install so the very first offline launch — even one that
// happens seconds after the first visit, before the visitor has browsed
// anything — still renders the institution's own shell rather than the
// browser's dinosaur. Everything else is cached on access.
//
// Deliberately unversioned URLs: pages request them with a ?v= fingerprint,
// and shell lookups use ignoreSearch, so one stored copy answers both. The
// cache name changes on every build, so this can never serve a stale asset
// across a deploy.
const PRECACHE = [
  '/offline/',
  '/manifest.webmanifest',
  // Sitewide stylesheets (partials/head.html) — the chrome of every page.
  '/css/brand.css',
  '/css/i18n.css',
  '/css/menu.css',
  '/css/personalisation.css',
  '/css/announcements.css',
  '/css/liveries.css',
  '/css/atelier.css',
  '/css/regalia.css',
  // The scripts a page cannot be itself without: the locale runtime (which
  // decides language, direction and typography) and the connectivity layer.
  '/js/locale-registry.js',
  '/js/i18n-core.js',
  '/js/i18n.js',
  '/js/shrs-connectivity.js',
  '/js/site.js',
  // Self-hosted Yoruba face. Without it ẹ, ọ and ṣ fall back to whatever
  // the device has and a Yoruba page breaks at exactly the letters that
  // carry meaning — see the note in css/i18n.css.
  '/assets/fonts/charis-sil-yoruba-400-normal.woff2',
  '/assets/fonts/charis-sil-yoruba-700-normal.woff2',
  // Institutional marks.
  '/assets/images/favicon.png',
  '/assets/images/brand-mark.png',
  '/assets/images/crest-full.png',
  '/assets/images/pwa-icon-192.png',
  '/assets/images/pwa-icon-512.png',
];

// The four dictionaries, so an offline language switch has words to use.
//
// These are precached into DATA_CACHE and not into the shell, because that is
// where the fetch handler looks for them — /i18n/ is unfingerprinted, so it
// is served stale-while-revalidate rather than cache-first. Putting them in
// the shell (which is where they started) left every dictionary present on
// the device and unreadable offline: the handler looked in one cache while
// the copy sat in another. The acceptance run caught it as zero keys read
// from /i18n/yo.json with no signal.
const PRECACHE_DATA = [
  '/i18n/en.json',
  '/i18n/ar.json',
  '/i18n/yo.json',
  '/i18n/fr.json',
];

const CACHED_AT_HEADER = 'x-shrs-cached-at';

// --- small helpers -------------------------------------------------------
// Every CacheStorage call is wrapped. A corrupted or evicted cache is a
// recoverable condition, not a reason for a fetch handler to reject and
// leave the visitor staring at a network error on a working connection.
function safeOpen(name) {
  return caches.open(name).catch(() => null);
}

function safeMatch(name, request, options) {
  return safeOpen(name)
    .then((cache) => (cache ? cache.match(request, options) : undefined))
    .catch(() => undefined);
}

function safePut(name, request, response) {
  return safeOpen(name)
    .then((cache) => (cache ? cache.put(request, response) : undefined))
    .catch(() => undefined);
}

// Re-issues a response carrying the moment it was stored. The page reads
// this back (see markAsCached) so "saved copy from 14:20" is a real
// timestamp rather than a guess.
function withCacheStamp(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now()));
  return response.blob().then((body) => new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
}

// --- install / activate --------------------------------------------------
// allSettled, not addAll: addAll is atomic, so one renamed icon would leave
// the entire shell uncached and the app would silently lose offline support
// until someone noticed. Each asset is cached on its own merits.
function precacheInto(cacheName, urls) {
  return safeOpen(cacheName).then((cache) => {
    if (!cache) return null;
    return Promise.allSettled(urls.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
  });
}

function precache() {
  return Promise.all([
    precacheInto(SHELL_CACHE, PRECACHE),
    precacheInto(DATA_CACHE, PRECACHE_DATA),
  ]);
}

self.addEventListener('install', (event) => {
  // No skipWaiting() here, deliberately. A worker that seizes control
  // mid-session can serve a page assets from a version it was not built
  // with. The new worker waits; the page offers the update; the visitor
  // decides. (On a first install there is no controller to wait behind, so
  // activation is immediate either way.)
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.indexOf('shrs-pwa-') === 0 && OUR_CACHES.indexOf(k) === -1)
          .map((k) => caches.delete(k))
      ))
      .catch(() => null)
      .then(() => self.clients.claim())
  );
});

// --- messages ------------------------------------------------------------
// The recovery channel. js/shrs-connectivity.js calls RESET_CACHES when a
// shell asset fails to load under a controlling worker — the signature of a
// half-written or evicted cache — and after the reset the shell is rebuilt
// from the network before the page reloads.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const reply = (payload) => {
    if (event.ports && event.ports[0]) {
      try { event.ports[0].postMessage(payload); } catch (e) { /* port closed */ }
    }
  };

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'RESET_CACHES') {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.indexOf('shrs-pwa-') === 0).map((k) => caches.delete(k))))
        .catch(() => null)
        .then(() => precache())
        .then(() => reply({ type: 'CACHES_RESET', ok: true }))
        .catch(() => reply({ type: 'CACHES_RESET', ok: false }))
    );
    return;
  }

  if (data.type === 'CACHE_STATUS') {
    event.waitUntil(
      Promise.all(OUR_CACHES.map((name) => safeOpen(name).then((c) => (c ? c.keys() : [])).then((k) => k.length)))
        .then((counts) => reply({
          type: 'CACHE_STATUS',
          version: CACHE_VERSION,
          shell: counts[0], pages: counts[1], data: counts[2], type: counts[3],
        }))
        .catch(() => reply({ type: 'CACHE_STATUS', version: CACHE_VERSION }))
    );
  }
});

// --- web push ------------------------------------------------------------
// (functions/_lib/web-push.js sends the encrypted payload; this is the
// receiving half. The browser has already done the aes128gcm decryption by
// the time this fires — this worker only ever sees plaintext.)
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

// --- routing -------------------------------------------------------------
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

function isShellAsset(url) {
  const p = url.pathname;
  return p.indexOf('/css/') === 0
    || p.indexOf('/js/') === 0
    || p.indexOf('/assets/') === 0
    || p === '/manifest.webmanifest';
}

// Unfingerprinted same-origin JSON the interface reads at runtime: the four
// translation dictionaries and the four search indexes. Stale-while-
// revalidate rather than cache-first — they have no ?v= to retire them, so
// every online view quietly refreshes the stored copy.
function isRuntimeData(url) {
  const p = url.pathname;
  return p.indexOf('/i18n/') === 0 || /^\/search-index\.[a-z]{2}\.json$/.test(p);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Third-party webfonts. The four Latin/Arabic display faces come from
  // Google's CDN, so with no signal the institution's typography would
  // collapse to a system serif on every page. Cached copies are served
  // first and refreshed in the background; a failure to refresh is not
  // allowed to evict what already works.
  if (FONT_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(staleWhileRevalidate(req, TYPE_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Live institutional data is never intercepted — not cached, not replayed.
  // Offline means the request fails and the caller says so.
  if (url.pathname.indexOf('/api/') === 0) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }

  if (isRuntimeData(url)) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(handleShellAsset(req));
    return;
  }

  // Anything else same-origin: straight to the network, cache nothing.
  event.respondWith(fetch(req));
});

// Cache-first, because these URLs are content-addressed by ?v= and the
// whole cache is retired on the next build. ignoreSearch lets one stored
// copy answer every fingerprint of the same file, which is what makes the
// precache list above legible instead of a wall of hashes.
function handleShellAsset(req) {
  return safeMatch(SHELL_CACHE, req, { ignoreSearch: true }).then((cached) => {
    if (cached) {
      // Refresh in the background so an asset that changed without a
      // fingerprint change (a hand-edited file, a hotfix) still converges.
      fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') safePut(SHELL_CACHE, req, res.clone());
      }).catch(() => {});
      return cached;
    }
    return fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') safePut(SHELL_CACHE, req, res.clone());
      return res;
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return safeMatch(cacheName, req).then((cached) => {
    const network = fetch(req).then((res) => {
      // An opaque response (status 0) cannot be inspected, so a 404 from a
      // font CDN looks exactly like a hit. It is stored anyway rather than
      // skipped — a network FAILURE rejects instead of resolving, so an
      // opaque response at least means the request completed — and it is
      // overwritten on every subsequent online load, so a bad copy heals
      // itself rather than being pinned forever by a `!cached` guard.
      const storable = res && (res.ok || res.type === 'opaque');
      if (storable) safePut(cacheName, req, res.clone());
      return res;
    });
    if (cached) {
      network.catch(() => {});
      return cached;
    }
    return network;
  });
}

// Network-first. The cached copy is a fallback, never a shortcut.
//
// The race against a 6-second timer is not a licence to serve stale pages:
// the network request is left running and still refreshes the cache when it
// lands. It exists so that a connection which has technically not failed
// but is not delivering either — a train tunnel, a saturated campus link —
// produces a readable saved page instead of an indefinite white screen.
// Whenever that happens the page is stamped, and the interface says
// "saved copy" in the reader's own language.
const NAVIGATION_TIMEOUT_MS = 6000;

function handleNavigation(req) {
  let timer = null;
  const network = fetch(req).then((res) => {
    // Only a real, same-origin, non-redirected 200 is worth storing. A
    // redirect to a login screen must never become the cached face of the
    // page it redirected from.
    if (res && res.ok && res.type === 'basic' && !res.redirected) {
      withCacheStamp(res.clone()).then((stamped) => safePut(PAGES_CACHE, req, stamped)).catch(() => {});
    }
    return res;
  });

  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('timeout'), NAVIGATION_TIMEOUT_MS);
  });

  return Promise.race([network.then((res) => ({ res }), (err) => ({ err })), timeout])
    .then((outcome) => {
      if (timer) clearTimeout(timer);
      if (outcome && outcome.res) return outcome.res;
      // Either the network failed outright or it is too slow to be usable.
      return fallbackForNavigation(req);
    });
}

function fallbackForNavigation(req) {
  return safeMatch(PAGES_CACHE, req, { ignoreSearch: true }).then((cached) => {
    if (cached) return markAsCached(cached);
    return offlineDocument(new URL(req.url));
  });
}

// Announces the saved copy to the page it is handing over. A response
// header would be invisible to a navigation, so the fact is written into
// the document itself — one script tag, before anything else runs, so
// js/shrs-connectivity.js can render the notice on first paint rather than
// after a flash of apparently-live content.
function markAsCached(response) {
  const type = response.headers.get('content-type') || '';
  if (type.indexOf('text/html') === -1) return response;
  const at = Number(response.headers.get(CACHED_AT_HEADER)) || 0;
  return response.text().then((body) => {
    const inject = '<script>window.__SHRS_CACHED_AT=' + at + ';</script>';
    const out = body.indexOf('</head>') !== -1
      ? body.replace('</head>', inject + '</head>')
      : inject + body;
    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(out, { status: 200, statusText: 'OK', headers });
  }).catch(() => response);
}

// The offline document is one file in four languages. Which language it
// speaks is decided here, from the URL the visitor was actually trying to
// reach, because the page itself has no other way to know: by the time it
// runs, the address it was serving as a stand-in for is gone.
const LOCALE_PREFIXES = { '/ar': 'ar', '/yo': 'yo', '/fr': 'fr' };

function localeForPath(pathname) {
  for (const prefix in LOCALE_PREFIXES) {
    if (pathname === prefix || pathname.indexOf(prefix + '/') === 0) return LOCALE_PREFIXES[prefix];
  }
  return 'en';
}

function offlineDocument(url) {
  return safeMatch(SHELL_CACHE, '/offline/', { ignoreSearch: true }).then((page) => {
    if (!page) {
      return new Response(
        '<!DOCTYPE html><meta charset="utf-8"><title>Offline</title>'
        + '<p style="font:16px system-ui;padding:24px">No connection, and no saved copy of this page.</p>',
        { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
      );
    }
    const lang = localeForPath(url.pathname);
    return page.text().then((body) => {
      const inject = '<script>window.__SHRS_OFFLINE_LANG=' + JSON.stringify(lang)
        + ';window.__SHRS_OFFLINE_FROM=' + JSON.stringify(url.pathname + url.search) + ';</script>';
      const out = body.indexOf('</head>') !== -1
        ? body.replace('</head>', inject + '</head>')
        : inject + body;
      return new Response(out, {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    });
  }).catch(() => new Response('', { status: 503 }));
}

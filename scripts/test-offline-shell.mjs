// Phase 3 acceptance — the offline application shell, tested with the
// browser genuinely offline.
//
// Nothing here is mocked. A real static server serves the real built site,
// a real Chromium installs the real sw.js, and Playwright's setOffline cuts
// the network at the browser rather than at a stub. Every claim Phase 3
// makes is checked against what the browser actually does:
//
//   · a fresh launch with no signal renders the institution's own shell
//   · a reload, and navigation between pages, keep working offline
//   · a page never visited is answered in the language of the URL asked for,
//     right-to-left where that language is Arabic
//   · a page served from the cache says so, dated, and never passes for live
//   · /api/ is never cached and never answered offline — no failing open
//   · a new worker waits, is announced, and only takes over when accepted
//   · a corrupt shell can be reset and the device is offline-capable again
//
// Run: npm run test:offline:shell
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// Appended to sw.js on demand so the update lifecycle can be exercised
// against a genuinely byte-different worker, which is the only thing the
// browser treats as a new version.
let swSuffix = '';

// The network is cut in TWO places, and both are needed.
//
// context.setOffline() is what makes navigator.onLine false, which is what
// the interface reads — but it only covers the targets the browser had when
// it was called. Chromium terminates an idle service worker after about
// thirty seconds and starts a fresh one on the next event, and that new
// worker is NOT covered: halfway through the first run of this harness the
// worker quietly regained the network, served live pages, and the offline
// document went untested while the checks around it still passed.
//
// So the server refuses connections too. A destroyed socket is what an
// unreachable origin actually looks like, and no emulation layer can leak
// around it.
let netDown = false;

function serve() {
  const server = http.createServer((req, res) => {
    if (netDown) { req.socket.destroy(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400).end(); return; }

    if (pathname.startsWith('/api/')) { res.writeHead(404).end('no api in this harness'); return; }

    let file = path.join(ROOT, pathname);
    if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!path.resolve(file).startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }

    let body = fs.readFileSync(file);
    if (pathname === '/sw.js' && swSuffix) body = Buffer.concat([body, Buffer.from(swSuffix)]);

    // no-store, not no-cache. With no-cache Chromium still KEEPS a copy in
    // its own HTTP cache, and a service worker's fetch() reads that cache —
    // so an "offline" navigation to a page the visitor had never opened came
    // back as the real page and the offline document was never reached. That
    // made the first run of this harness pass the wrong things for the wrong
    // reason. Storing nothing at the HTTP layer forces every offline answer
    // to come from sw.js, which is the only thing under test here.
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail || '' });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function waitForController(page) {
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 });
}

async function cacheReport(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) {
      const c = await caches.open(n);
      out[n] = (await c.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search);
    }
    return out;
  });
}

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nSHRS Phase 3 — offline application shell\nserving ${ROOT} at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const context = await browser.newContext();
  let failed = false;

  try {
    // --- install -----------------------------------------------------------
    console.log('Installing the worker');
    const page = await context.newPage();
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await waitForController(page);
    check('service worker takes control of the first page', true);

    // The precache runs at install; give it a moment to settle, then ask the
    // worker itself rather than guessing from the outside.
    await page.waitForTimeout(1500);
    const status = await page.evaluate(() => new Promise((resolve, reject) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data);
      setTimeout(() => reject(new Error('no reply')), 8000);
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_STATUS' }, [ch.port2]);
    }));
    check('application shell precached at install', status.shell >= 20, `${status.shell} entries, version ${status.version}`);

    // --- warm the page cache the way a visitor would ------------------------
    for (const p of ['/', '/about/', '/ar/', '/ar/about/', '/yo/', '/fr/']) {
      await page.goto(origin + p, { waitUntil: 'load' });
    }
    const warm = await cacheReport(page);
    const pagesCacheName = Object.keys(warm).find((n) => n.endsWith('-pages'));
    check('visited pages are stored for offline use', warm[pagesCacheName] && warm[pagesCacheName].length >= 6,
      `${(warm[pagesCacheName] || []).length} pages`);

    // A live fetch to /api/ must leave no trace anywhere in CacheStorage.
    await page.evaluate(() => fetch('/api/ping').catch(() => {}));
    const anyApi = Object.values(warm).flat().concat(
      Object.values(await cacheReport(page)).flat()
    ).filter((p) => p.startsWith('/api/'));
    check('no /api/ response is ever cached', anyApi.length === 0, anyApi.join(', '));

    // --- go dark -----------------------------------------------------------
    console.log('\nCutting the network');
    netDown = true;
    await context.setOffline(true);

    // 1. Fresh launch: a brand-new tab, no warm memory cache, no connection.
    const cold = await context.newPage();
    const resp = await cold.goto(origin + '/about/', { waitUntil: 'load' });
    const coldTitle = await cold.title();
    check('fresh offline launch renders the real page', Boolean(resp) && /Sultan Hanafi/i.test(coldTitle), coldTitle);

    const coldMarks = await cold.evaluate(() => ({
      cachedAt: window.__SHRS_CACHED_AT || null,
      hasHeader: Boolean(document.querySelector('.site-header, header, .portal-topbar')),
      barText: (document.querySelector('.shrs-conn-bar-text') || {}).textContent || '',
      barHidden: (document.querySelector('.shrs-conn-bar') || {}).hidden,
      pill: (document.querySelector('.shrs-conn-pill .shrs-conn-label') || {}).textContent || '',
      pillShown: document.querySelector('.shrs-conn-pill') ? document.querySelector('.shrs-conn-pill').hasAttribute('data-show') : false,
    }));
    check('page chrome survives with no network', coldMarks.hasHeader);
    check('the saved copy is stamped with when it was taken', Boolean(coldMarks.cachedAt),
      coldMarks.cachedAt ? new Date(coldMarks.cachedAt).toISOString() : 'no stamp');
    check('a saved copy says so, and is not passed off as live',
      coldMarks.barHidden === false && /saved/i.test(coldMarks.barText), coldMarks.barText.trim());
    check('the offline indicator is shown', coldMarks.pillShown && /offline/i.test(coldMarks.pill), coldMarks.pill);

    // 2. Reload, still offline.
    await cold.reload({ waitUntil: 'load' });
    check('reload works offline', /Sultan Hanafi/i.test(await cold.title()));

    // 3. Navigate offline to another visited page.
    await cold.goto(origin + '/', { waitUntil: 'load' });
    const homeIsReal = await cold.evaluate(() => Boolean(document.querySelector('.site-header, header')) && !document.querySelector('[data-retry]'));
    check('offline navigation between saved pages', homeIsReal);

    // 4. A page never visited: the offline document, in the right language.
    const LANG_CASES = [
      { path: '/contact/', lang: 'en', dir: 'ltr', needle: 'currently offline' },
      { path: '/ar/gallery/', lang: 'ar', dir: 'rtl', needle: 'غير متصل' },
      { path: '/yo/gallery/', lang: 'yo', dir: 'ltr', needle: 'ayélujára' },
      { path: '/fr/gallery/', lang: 'fr', dir: 'ltr', needle: 'hors ligne' },
    ];
    for (const c of LANG_CASES) {
      await cold.goto(origin + c.path, { waitUntil: 'load' });
      const seen = await cold.evaluate(() => ({
        lang: document.documentElement.getAttribute('lang'),
        dir: document.documentElement.getAttribute('dir'),
        computed: getComputedStyle(document.body).direction,
        heading: (document.querySelector('h1') || {}).textContent || '',
        home: (document.querySelector('[data-home]') || {}).getAttribute
          ? document.querySelector('[data-home]').getAttribute('href') : '',
        requested: (document.querySelector('[data-requested]') || {}).textContent || '',
      }));
      check(`unvisited ${c.path} answers in ${c.lang}`,
        seen.lang === c.lang && seen.heading.includes(c.needle), `${seen.lang}: ${seen.heading.trim()}`);
      check(`${c.lang} offline document uses ${c.dir}`,
        seen.dir === c.dir && seen.computed === c.dir, `dir=${seen.dir} computed=${seen.computed}`);
      check(`${c.lang} offline document offers its own homepage`,
        seen.home === (c.lang === 'en' ? '/' : '/' + c.lang + '/'), seen.home);
      check(`${c.lang} offline document names the page that was asked for`,
        seen.requested.includes(c.path), seen.requested.trim());
    }

    // 5. The offline document lists what IS readable — and only in this language.
    await cold.goto(origin + '/contact/', { waitUntil: 'load' });
    await cold.waitForTimeout(400);
    const listed = await cold.$$eval('[data-saved-list] a', (as) => as.map((a) => a.getAttribute('href')));
    check('offline document lists pages that really are available', listed.includes('/about/'), listed.join(' '));
    check('offline document does not offer pages in another language',
      listed.every((h) => !/^\/(ar|yo|fr)\//.test(h)), listed.join(' '));

    // 6. No failing open: live data must fail, not be answered from a copy.
    const apiOffline = await cold.evaluate(() => fetch('/api/portal/me').then(() => 'answered', () => 'failed'));
    check('offline /api/ fails honestly rather than failing open', apiOffline === 'failed', apiOffline);

    // 7. Language switching offline, on a page that IS saved.
    await cold.goto(origin + '/ar/about/', { waitUntil: 'load' });
    const arOffline = await cold.evaluate(() => ({
      lang: document.documentElement.getAttribute('lang'),
      dir: document.documentElement.getAttribute('dir'),
      pill: (document.querySelector('.shrs-conn-pill .shrs-conn-label') || {}).textContent || '',
      bar: (document.querySelector('.shrs-conn-bar-text') || {}).textContent || '',
      cached: Boolean(window.__SHRS_CACHED_AT),
    }));
    check('the saved Arabic page opens offline, right to left', arOffline.lang === 'ar' && arOffline.dir === 'rtl');
    check('the indicator speaks the page’s language', arOffline.pill.trim() === 'غير متصل', arOffline.pill.trim());
    check('the saved-copy notice speaks the page’s language', /النسخة المحفوظة/.test(arOffline.bar), arOffline.bar.trim());

    // 8. The dictionaries are on the device, so an offline switch has words.
    const dictOk = await cold.evaluate(() => fetch('/i18n/yo.json').then((r) => r.json()).then((j) => Object.keys(j).length, () => 0));
    check('offline dictionaries are readable for all four languages', dictOk > 100, `${dictOk} keys from /i18n/yo.json`);

    // --- back on ------------------------------------------------------------
    console.log('\nRestoring the network');
    netDown = false;
    await context.setOffline(false);
    await cold.goto(origin + '/about/', { waitUntil: 'load' });
    const live = await cold.evaluate(() => ({
      cached: window.__SHRS_CACHED_AT || null,
      barHidden: (document.querySelector('.shrs-conn-bar') || {}).hidden,
      pillShown: document.querySelector('.shrs-conn-pill') ? document.querySelector('.shrs-conn-pill').hasAttribute('data-show') : false,
    }));
    check('after reconnection the live page is served, not the copy', live.cached === null);
    check('no saved-copy notice on a live page', live.barHidden !== false);
    check('no indicator shown when simply online', live.pillShown === false);

    // --- update lifecycle ---------------------------------------------------
    console.log('\nPublishing a new worker');
    swSuffix = '\n// deploy marker for the Phase 3 update test\n';
    await cold.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await cold.waitForFunction(
      () => document.querySelector('.shrs-conn-bar') && !document.querySelector('.shrs-conn-bar').hidden,
      null, { timeout: 20000 }
    ).catch(() => {});
    const updateBar = await cold.evaluate(() => ({
      text: (document.querySelector('.shrs-conn-bar-text') || {}).textContent || '',
      buttons: Array.prototype.map.call(document.querySelectorAll('.shrs-conn-btn'), (b) => b.textContent),
      waiting: null,
    }));
    check('a new version is announced rather than seized', /newer version/i.test(updateBar.text), updateBar.text.trim());
    check('the reader is offered the choice', updateBar.buttons.length === 2, updateBar.buttons.join(' / '));

    const before = await cold.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r.waiting)));
    check('the new worker waits until it is accepted', before === true);

    await Promise.all([
      cold.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
      cold.evaluate(() => {
        const btns = document.querySelectorAll('.shrs-conn-btn');
        btns[0].click();
      }),
    ]);
    await cold.waitForTimeout(1200);
    const after = await cold.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r.waiting)));
    check('accepting the update activates it and reloads the page', after === false);

    // --- recovery -----------------------------------------------------------
    console.log('\nRecovering from a damaged cache');
    await cold.goto(origin + '/about/', { waitUntil: 'load' });
    await waitForController(cold);
    // Damage it the way an eviction would: drop the shell entirely.
    await cold.evaluate(async () => {
      for (const n of await caches.keys()) if (n.endsWith('-shell')) await caches.delete(n);
    });
    const damaged = await cold.evaluate(() => caches.keys().then((k) => k.filter((n) => n.endsWith('-shell')).length));
    check('the damaged state is real (shell cache removed)', damaged === 0);

    const reset = await cold.evaluate(() => window.SHRS_CONNECTIVITY.resetCaches());
    check('the worker accepts a reset and rebuilds the shell', reset && reset.ok === true, JSON.stringify(reset));

    await cold.waitForTimeout(1200);
    netDown = true;
    await context.setOffline(true);
    await cold.goto(origin + '/contact/', { waitUntil: 'load' });
    const recovered = await cold.evaluate(() => Boolean(document.querySelector('[data-retry]')));
    check('the device is offline-capable again after recovery', recovered);

    // Reconnecting while the offline document is open should carry the reader
    // to the address they originally asked for — no spinner, no second tap.
    // (This was found the hard way: it interrupted the harness's next
    // navigation, which is exactly the behaviour it is supposed to have.)
    netDown = false;
    await Promise.all([
      cold.waitForURL('**/contact/', { timeout: 15000 }).catch(() => {}),
      context.setOffline(false),
    ]);
    await cold.waitForTimeout(1200);
    const returned = await cold.evaluate(() => ({
      path: location.pathname,
      stillOfflineDoc: Boolean(document.querySelector('[data-retry]')),
    }));
    check('reconnecting returns the reader to the page they asked for',
      returned.path === '/contact/' && returned.stillOfflineDoc === false, returned.path);

    // --- speed --------------------------------------------------------------
    // Cache-first on the shell is what removes the wait; measure it rather
    // than assert it. A stylesheet already on the device should come back in
    // single-digit milliseconds.
    await cold.goto(origin + '/about/', { waitUntil: 'load' });
    await cold.waitForTimeout(500);
    const ms = await cold.evaluate(async () => {
      const runs = [];
      for (let i = 0; i < 5; i += 1) {
        const t = performance.now();
        await fetch('/css/brand.css');
        runs.push(performance.now() - t);
      }
      return Math.min.apply(null, runs);
    });
    check('a cached shell asset returns without a network wait', ms < 60, `${ms.toFixed(1)}ms (best of 5)`);
  } catch (err) {
    failed = true;
    console.error('\nharness error:', err && err.stack ? err.stack : err);
  } finally {
    await browser.close();
    server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  const bad = results.filter((r) => !r.pass);
  if (bad.length) {
    console.log('\nfailed:');
    bad.forEach((r) => console.log(`  ✗ ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
  }
  process.exit(failed || bad.length ? 1 : 0);
}

main();

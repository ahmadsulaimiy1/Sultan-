// Phase 5 acceptance — offline search, authorised documents, freshness,
// secure eviction. Real Chromium, real IndexedDB, real WebCrypto.
//
// The claims under test are mostly negative ones again:
//   · search cannot return a field that was never allowed onto the device
//   · a document with no established owner is not stored at all
//   · a document is not readable by someone who does not own it
//   · an expired document is refused, not served with a warning
//   · eviction under pressure never touches the outbound queue
//   · a freshness stamp exists in all four languages, never falling back
//
// Run: npm run test:search
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let netDown = false;

const HARNESS = `<!doctype html><meta charset="utf-8"><title>search harness</title><body>
<script type="module">
import * as store from '/js/shrs-local-store.js';
import * as search from '/js/shrs-offline-search.js';
import * as layer from '/js/shrs-data-layer.js';
import { NEVER_CACHED_FIELDS, LIFETIMES, SCOPE } from '/js/shrs-offline-policy.js';
window.store = store; window.search = search; window.layer = layer;
window.NEVER_CACHED_FIELDS = NEVER_CACHED_FIELDS; window.LIFETIMES = LIFETIMES; window.SCOPE = SCOPE;

// Backdates a document so the thirty-day rule can be tested without waiting.
window.ageDocument = (key, ms) => new Promise((resolve, reject) => {
  const req = indexedDB.open('shrs');
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('documents', 'readwrite');
    const s = tx.objectStore('documents');
    s.get(key).onsuccess = (e) => {
      const row = e.target.result;
      if (row) { row.savedAt = Date.now() - ms; s.put(row); }
    };
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => reject(tx.error);
  };
  req.onerror = () => reject(req.error);
});

window.ready = store.unlock('search-session-secret', 'search-device-salt').then(() => true);
</script></body>`;

function serve() {
  const server = http.createServer((req, res) => {
    if (netDown) { req.socket.destroy(); return; }
    const p = new URL(req.url, 'http://127.0.0.1').pathname;
    if (p === '/' || p === '/harness') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(HARNESS);
      return;
    }
    const file = path.join(ROOT, p);
    if (!path.resolve(file).startsWith(ROOT) || !existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nf'); return;
    }
    const type = p.endsWith('.js') ? 'application/javascript; charset=utf-8'
      : p.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail || '' });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nSHRS Phase 5 — offline search, documents, freshness, eviction\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const context = await browser.newContext();
  const page = await context.newPage();
  let harnessFailed = false;

  try {
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.waitForFunction(() => window.ready, null, { timeout: 20000 });
    await page.evaluate(() => window.ready);
    check('device store unlocked and the search layer loaded', true);

    // --- seeding with data that includes what must never be kept -----------
    console.log('\nSeeding, including fields that must never reach the device');
    const seeded = await page.evaluate(async () => {
      const write = (id, extra) => window.store.putRecord('student', id, Object.assign({
        id, identity_no: 'SHRS-STU-' + id, admission_no: 'ADM/' + id,
        full_name: extra.full_name, full_name_ar: extra.full_name_ar,
        class_name: extra.class_name, programme_code: extra.programme_code,
        enrolment_status: 'active', updated_at: Date.now(),
        // Deliberately offered, and expected to be dropped at the door:
        safeguarding_notes: 'CONFIDENTIAL-SAFEGUARDING',
        medical_conditions: 'CONFIDENTIAL-MEDICAL',
        home_address: 'CONFIDENTIAL-ADDRESS',
        guardian_phone: 'CONFIDENTIAL-PHONE',
      }, extra));
      await write('1001', { full_name: 'Abdul Samod Ayomide Jimoh', full_name_ar: 'عبد الصمد أيوميدي جيمو', class_name: 'Primary 6', programme_code: 'IBT' });
      await write('1002', { full_name: 'Aisha Bello', full_name_ar: 'عائشة بلو', class_name: 'JSS 1', programme_code: 'IDD' });
      await write('1003', { full_name: 'Ọlámidé Ṣóyínká', full_name_ar: 'أولاميدي شوينكا', class_name: 'Primary 4', programme_code: 'IBT' });
      const held = await window.store.listRecords('student');
      return { count: held.length, sample: held[0] && Object.keys(held[0].data) };
    });
    check('records are held for search', seeded.count === 3, `${seeded.count} students`);
    check('the forbidden fields never reached the device',
      seeded.sample && !seeded.sample.some((k) => /safeguarding|medical|address|phone/i.test(k)),
      (seeded.sample || []).join(', '));

    // --- search cannot surface what was never stored -----------------------
    console.log('\nSearching');
    const leak = await page.evaluate(() => window.search.searchPersonal('CONFIDENTIAL'));
    check('a query for a forbidden value returns nothing, because it is not there',
      leak.results.length === 0, `${leak.results.length} result(s)`);

    const byName = await page.evaluate(() => window.search.searchPersonal('ayomide'));
    check('a personal record is found offline by name',
      byName.results.length === 1 && byName.results[0].matchedOn === 'full_name',
      byName.results.map((r) => r.preview.full_name).join(', '));

    const byAdmission = await page.evaluate(() => window.search.searchPersonal('ADM/1002'));
    check('found by admission number', byAdmission.results.length === 1 && byAdmission.results[0].id === '1002');

    const yoruba = await page.evaluate(() => window.search.searchPersonal('olamide'));
    check('Yoruba tone marks do not have to be typed to find the name',
      yoruba.results.length === 1 && yoruba.results[0].id === '1003',
      yoruba.results.map((r) => r.preview.full_name).join(', '));

    const arabic = await page.evaluate(() => window.search.searchPersonal('عايشه'));
    check('an Arabic name is found despite alef and tā’ marbūṭa spelling',
      arabic.results.length === 1 && arabic.results[0].id === '1002',
      arabic.results.map((r) => r.preview.full_name_ar).join(', '));

    const previewFields = await page.evaluate(async () => {
      const r = await window.search.searchPersonal('ayomide');
      return Object.keys(r.results[0].preview);
    });
    check('a search result exposes only the fields it searched',
      previewFields.every((f) => ['full_name', 'full_name_ar', 'admission_no', 'identity_no', 'class_name', 'programme_code'].includes(f)),
      previewFields.join(', '));

    const stamped = await page.evaluate(() => window.search.searchPersonal('ayomide'));
    check('personal results never claim to be live',
      stamped.live === false && typeof stamped.oldestSyncedAt === 'number');

    // --- public index, on the device --------------------------------------
    const pub = await page.evaluate(() => window.search.searchPublic('admission', 'en'));
    check('the public index is searchable', pub.results.length > 0, `${pub.results.length} page(s)`);

    netDown = true;
    await context.setOffline(true);
    const pubOffline = await page.evaluate(() => window.search.searchPublic('admission', 'en'));
    check('the public index still answers with the network cut (held in memory once read)',
      pubOffline.results.length > 0 && pubOffline.live === false,
      `${pubOffline.results.length} page(s), live=${pubOffline.live}`);
    const missing = await page.evaluate(() => window.search.searchPublic('admission', 'fr'));
    check('an index that is not on the device says so rather than reporting nothing found',
      missing.reason === 'index-not-on-device', missing.reason);
    netDown = false;
    await context.setOffline(false);

    // --- authorised documents ---------------------------------------------
    console.log('\nAuthorised documents');
    const docs = await page.evaluate(async () => {
      const bytes = new Uint8Array([37, 80, 68, 70, 1, 2, 3, 4, 5]);
      const noOwner = await window.store.putDocument('doc-a', bytes, { label: 'Certificate' });
      const owned = await window.store.putDocument('doc-b', bytes, { ownedBy: 'guardian-77', label: 'Certificate', mime: 'application/pdf' });
      const readOwner = await window.store.getDocument('doc-b', 'guardian-77');
      const readOther = await window.store.getDocument('doc-b', 'guardian-99');
      const index = await window.store.documentIndex();
      return {
        noOwner, owned,
        readOwner: readOwner && { label: readOwner.label, len: readOwner.bytes.length, first: readOwner.bytes[0] },
        readOther,
        index,
      };
    });
    check('a document with no established owner is refused, not stored',
      docs.noOwner.stored === false && docs.noOwner.reason === 'owner-not-established', docs.noOwner.reason);
    check('an owned document is stored and reads back byte-identical',
      docs.owned.stored === true && docs.readOwner && docs.readOwner.len === 9 && docs.readOwner.first === 37);
    check('another person on the same device cannot open it', docs.readOther === null);
    check('the shelf lists metadata without opening anything',
      docs.index.length === 1 && docs.index[0].key === 'doc-b' && !('sealed' in docs.index[0]));

    const expired = await page.evaluate(async () => {
      await window.ageDocument('doc-b', window.LIFETIMES.documentRetentionMs + 60000);
      const read = await window.store.getDocument('doc-b', 'guardian-77');
      const index = await window.store.documentIndex();
      return { read, remaining: index.length };
    });
    check('a document past thirty days is refused and destroyed, not served with a warning',
      expired.read === null && expired.remaining === 0);

    // --- the cap ------------------------------------------------------------
    const capped = await page.evaluate(async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      for (let i = 0; i < window.SCOPE.maxDocuments + 5; i += 1) {
        await window.store.putDocument('cap-' + i, bytes, { ownedBy: 'guardian-77', label: 'D' + i });
      }
      const index = await window.store.documentIndex();
      return { held: index.length, cap: window.SCOPE.maxDocuments, keys: index.map((d) => d.key) };
    });
    check('the approved document cap is enforced by eviction, not ignored',
      capped.held === capped.cap, `${capped.held}/${capped.cap}`);
    check('it is the least recently used that goes',
      !capped.keys.includes('cap-0') && capped.keys.includes('cap-24'));

    // --- eviction under pressure never costs someone their unsent work -----
    console.log('\nEviction under pressure');
    const pressure = await page.evaluate(async () => {
      await window.store.enqueue({ type: 'adhkar.complete', payload: { period: 'morning', completionDate: '2026-08-09' } });
      const before = (await window.store.pendingOperations()).length;
      const freed = await window.store.evictUnderPressure(5 * 1024 * 1024);
      const after = (await window.store.pendingOperations()).length;
      const docs = await window.store.documentIndex();
      return { before, after, freed, docsLeft: docs.length };
    });
    check('pressure eviction frees documents first', pressure.freed.documents > 0, JSON.stringify(pressure.freed));
    check('the outbound queue is never what gets discarded to make room',
      pressure.before === 1 && pressure.after === 1);

    // --- freshness, four languages -----------------------------------------
    console.log('\nFreshness, in every language the estate speaks');
    const labels = await page.evaluate(() => {
      const env = { source: 'cache', ageMs: 3 * 3600 * 1000 };
      const out = {};
      for (const lang of ['en', 'ar', 'yo', 'fr']) out[lang] = window.layer.freshnessLabel(env, lang);
      out.locked = window.layer.freshnessLabel({ source: 'locked' }, 'yo');
      out.live = window.layer.freshnessLabel({ source: 'network' }, 'fr');
      return out;
    });
    const distinct = new Set(['en', 'ar', 'yo', 'fr'].map((l) => labels[l].text));
    check('every language gets its own stamp — none falls back to English',
      distinct.size === 4, ['en', 'ar', 'yo', 'fr'].map((l) => `${l}: ${labels[l].text}`).join(' | '));
    check('a cached stamp is never toned as live',
      ['en', 'ar', 'yo', 'fr'].every((l) => labels[l].tone === 'cached'));
    check('an expired offline session is stated, in language', labels.locked.tone === 'locked' && /pari/.test(labels.locked.text), labels.locked.text);
    check('a live read says live, in language', labels.live.tone === 'live' && labels.live.text === 'En direct', labels.live.text);

    // --- locked means locked ------------------------------------------------
    const locked = await page.evaluate(async () => {
      window.store.lock();
      return {
        search: await window.search.searchPersonal('ayomide'),
        docs: await window.store.documentIndex(),
        doc: await window.store.getDocument('cap-24', 'guardian-77'),
      };
    });
    check('with the session locked, search returns nothing and says why',
      locked.search.results.length === 0 && locked.search.reason === 'locked');
    check('with the session locked, no document is listed or opened',
      locked.docs.length === 0 && locked.doc === null);
  } catch (err) {
    harnessFailed = true;
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
  process.exit(harnessFailed || bad.length ? 1 : 0);
}

main();

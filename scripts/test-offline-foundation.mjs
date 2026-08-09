#!/usr/bin/env node
/**
 * PHASE 1 + 2 ACCEPTANCE — run in a real browser, not simulated.
 *
 *     node scripts/test-offline-foundation.mjs
 *
 * The directive is explicit (§9, §24): do not report "implemented" without a
 * demonstrable test, and do not declare offline work complete on the strength
 * of having turned Wi-Fi off once. So this drives real Chromium with real
 * IndexedDB, real WebCrypto and the network genuinely severed at the browser
 * level — `context.setOffline(true)` makes fetch fail the way it fails on a
 * phone in a lift, not the way a mock fails.
 *
 * Every assertion below is one the modules would pass by accident only if they
 * were actually correct. In particular the security assertions are written to
 * FAIL LOUDLY: a test that cannot catch a safeguarding note reaching a device
 * is not a test, it is a comment.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const PORT = 8899;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

/* A minimal static server for the module files, plus one fake API endpoint the
 * data layer can call so the cache-then-revalidate path is exercised for real
 * rather than against a stub inside the page. */
let requestCount = 0;
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/student') {
    requestCount += 1;
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({
      id: '1', identity_no: '711232557821021', full_name: 'Abdulbasit Adedokun',
      full_name_ar: 'عبد الباسط أددوكن', class_name: 'Ibtida’iyyah', programme_code: 'IBT',
      enrolment_status: 'active', guardian_name: 'A Guardian',
      // Everything from here down is forbidden on a device. The server sends it
      // because the server is allowed to; the store must refuse to write it.
      guardian_phone: '+2348000000000', home_address: '12 Somewhere Street, Ikorodu',
      safeguarding_notes: 'CONFIDENTIAL', medical_notes: 'CONFIDENTIAL',
      password_hash: 'CONFIDENTIAL', serverTick: requestCount,
    }));
    return;
  }
  const file = url.pathname === '/' ? '/test-harness.html' : url.pathname;
  const path = join(ROOT, file);
  if (!existsSync(path) || !path.startsWith(ROOT)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(path)] || 'text/plain' });
  res.end(readFileSync(path));
});

const HARNESS = `<!doctype html><meta charset="utf-8"><title>SHRS offline harness</title>
<script type="module">
  import * as store from '/js/shrs-local-store.js';
  import * as data from '/js/shrs-data-layer.js';
  import * as policy from '/js/shrs-offline-policy.js';
  window.shrs = { store, data, policy };
  window.fetchStudent = () => fetch('/api/student').then((r) => r.json());
  window.ready = true;
</script>`;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`    ${pass ? '·' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
};

await new Promise((r) => server.listen(PORT, r));
// Serve the harness from the repo root so the module specifiers resolve.
const { writeFileSync, unlinkSync } = await import('node:fs');
writeFileSync(join(ROOT, 'test-harness.html'), HARNESS);

/* The sandbox ships a pinned Chromium at PLAYWRIGHT_BROWSERS_PATH that may not
 * match the npm package's expected build number, and re-downloading is blocked.
 * Point at the installed binary when it is there, and fall back to Playwright's
 * own resolution everywhere else (CI, a developer's laptop) so this script is
 * not welded to one machine. */
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(
  existsSync(PINNED) ? { executablePath: PINNED } : {},
);
const context = await browser.newContext();
const page = await context.newPage();
let failed = false;

try {
  console.log('\n  OFFLINE FOUNDATION — real Chromium, real IndexedDB, real WebCrypto\n');
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.ready === true);

  // ── 1. The policy is what the Founder approved ─────────────────────────
  const pol = await page.evaluate(() => ({
    status: window.shrs.policy.POLICY_STATUS,
    session: window.shrs.policy.LIFETIMES.offlineSessionMs,
    retention: window.shrs.policy.LIFETIMES.recordRetentionMs,
    students: window.shrs.policy.SCOPE.maxStudentRecords,
    phone: window.shrs.policy.isCacheable('student', 'guardian_phone'),
  }));
  check('policy approved and versioned', pol.status.startsWith('APPROVED'), pol.status);
  check('12-hour readability window', pol.session === 12 * 3600_000);
  check('7-day destruction window', pol.retention === 7 * 86400_000);
  check('50-student cap', pol.students === 50);
  check('guardian phone REMOVED per the amendment', pol.phone === false);

  // ── 2. A locked store refuses everything ───────────────────────────────
  const lockedRead = await page.evaluate(() => window.shrs.store.getRecord('student', '1'));
  check('locked store returns nothing', lockedRead === null);

  // ── 3. Unlock, then the forbidden-field test that matters most ─────────
  await page.evaluate(() => window.shrs.store.unlock('a-session-secret', 'device-salt'));
  const first = await page.evaluate(() => window.shrs.data.read('student', '1', window.fetchStudent));
  check('first read comes from the network', first.source === 'network', first.source);
  check('first read is marked live', first.isLive === true);

  const onDisk = await page.evaluate(async () => {
    const r = await window.shrs.store.getRecord('student', '1');
    return r ? Object.keys(r.data) : null;
  });
  const forbidden = ['guardian_phone', 'home_address', 'safeguarding_notes', 'medical_notes', 'password_hash', 'serverTick'];
  const leaked = forbidden.filter((f) => onDisk?.includes(f));
  check('NO forbidden field reached the device', leaked.length === 0,
    leaked.length ? `LEAKED: ${leaked.join(', ')}` : `stored: ${onDisk.join(', ')}`);
  check('permitted fields did reach the device', onDisk?.includes('full_name') && onDisk?.includes('identity_no'));

  // ── 4. Instant response — the whole point of Phase 2 ───────────────────
  const timed = await page.evaluate(async () => {
    const t0 = performance.now();
    const env = await window.shrs.data.read('student', '1', window.fetchStudent);
    return { ms: performance.now() - t0, source: env.source, hasName: !!env.data?.full_name };
  });
  check('second read served from the device', timed.source === 'cache', timed.source);
  check('second read returned the record', timed.hasName === true);
  check('second read was effectively instant (<50ms)', timed.ms < 50, `${timed.ms.toFixed(1)}ms`);

  // ── 5. Cached data is never dressed up as live ─────────────────────────
  const label = await page.evaluate(async () => {
    const env = await window.shrs.data.read('student', '1', window.fetchStudent, { revalidate: false });
    return { isLive: env.isLive, label: window.shrs.data.freshnessLabel(env).tone, syncedAt: !!env.syncedAt };
  });
  check('cached result is NOT flagged live', label.isLive === false);
  check('cached result carries a freshness stamp', label.label === 'cached' && label.syncedAt);

  // ── 6. Genuinely offline — network severed at the browser ─────────────
  await context.setOffline(true);
  const offlineRead = await page.evaluate(() => window.shrs.data.read('student', '1', window.fetchStudent));
  check('OFFLINE: previously synced record still opens', offlineRead.source === 'cache' && !!offlineRead.data?.full_name);

  const offlineMiss = await page.evaluate(() => window.shrs.data.read('student', '999', window.fetchStudent));
  check('OFFLINE: never-seen record says so plainly', offlineMiss.source === 'unavailable' && offlineMiss.data === null);

  // ── 7. The queue, and what it refuses ─────────────────────────────────
  const queued = await page.evaluate(() => window.shrs.store.enqueue({ type: 'attendance.record', recordId: '1', userId: 'u1', payload: { present: true } }));
  check('OFFLINE: a safe mutation queues', queued.queued === true && !!queued.operationId);

  const refused = await page.evaluate(() => window.shrs.store.enqueue({ type: 'certificate.issue', recordId: '1', payload: {} }));
  check('certificate issuance is REFUSED, not queued', refused.queued === false && refused.reason === 'requires-live-connection');

  const pend = await page.evaluate(() => window.shrs.store.pendingOperations());
  const op = pend[0];
  check('queued op carries the full audit metadata',
    !!(op && op.operationId && op.deviceId && op.createdAt && op.syncState === 'pending' && op.retryCount === 0 && op.payload));

  await context.setOffline(false);

  // ── 8. Expiry fails closed ────────────────────────────────────────────
  const expired = await page.evaluate(async () => {
    window.shrs.store.lock();                       // simulates session end
    const env = await window.shrs.data.read('student', '1', window.fetchStudent);
    const raw = await window.shrs.store.getRecord('student', '1');
    return { source: env.source, data: env.data, raw };
  });
  check('expired session LOCKS rather than showing stale data', expired.source === 'locked' && expired.data === null);
  check('expired session cannot read the record at all', expired.raw === null);

  // ── 9. Revocation purges, including the queue ─────────────────────────
  const purged = await page.evaluate(async () => {
    await window.shrs.store.unlock('a-session-secret', 'device-salt');
    await window.shrs.data.read('student', '1', window.fetchStudent);
    await window.shrs.store.setMeta('trustVersion', 1);
    const res = await window.shrs.store.reconcileTrust(2);   // admin revoked
    const rec = await window.shrs.store.getRecord('student', '1');
    const ops = await window.shrs.store.pendingOperations();
    return { purged: res.purged, rec, ops: ops.length };
  });
  check('trust-version mismatch purges the device', purged.purged === true);
  check('purge removed the cached record', purged.rec === null);
  check('purge removed the outbound queue too', purged.ops === 0);

  // ── 10. Ciphertext, not plaintext, on disk ────────────────────────────
  const raw = await page.evaluate(async () => {
    await window.shrs.store.unlock('a-session-secret', 'device-salt');
    await window.shrs.data.read('student', '1', window.fetchStudent);
    return new Promise((resolve) => {
      const req = indexedDB.open('shrs');
      req.onsuccess = () => {
        const db = req.result;
        const get = db.transaction('records').objectStore('records').get('student:1');
        get.onsuccess = () => resolve(JSON.stringify(get.result));
      };
    });
  });
  check('record is stored as ciphertext', !raw.includes('Abdulbasit') && raw.includes('cipher'),
    raw.includes('Abdulbasit') ? 'PLAINTEXT ON DISK' : 'sealed');
} catch (err) {
  failed = true;
  console.error(`\n  HARNESS ERROR: ${err.message}\n`);
} finally {
  await browser.close();
  server.close();
  try { unlinkSync(join(ROOT, 'test-harness.html')); } catch { /* already gone */ }
}

const bad = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - bad.length}/${results.length} checks passed\n`);
if (bad.length || failed) {
  for (const b of bad) console.error(`  FAILED: ${b.name}${b.detail ? ` — ${b.detail}` : ''}`);
  process.exit(1);
}
console.log('  PASSED — the device database and the instant-read path behave as specified,');
console.log('  offline, with the network genuinely severed, and fail closed when they should.\n');

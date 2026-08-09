// Phase 4 acceptance — the outbound sync engine, adversarially.
//
// Real Chromium, real IndexedDB, real WebCrypto, real HTTP. The server here is
// scriptable rather than mocked at the fetch layer: it genuinely answers 409,
// genuinely returns 500, and genuinely destroys the socket mid-request, so the
// engine meets the failures it will actually meet.
//
// What is being proved is mostly what the engine REFUSES to do:
//   · it will not queue an operation nobody declared
//   · it will not queue what must never be deferred
//   · it will not queue an edit it could not check for conflicts
//   · it will not deliver a second row when a delivery is retried
//   · it will not resolve a conflict by itself
//   · it will not retry a refusal for ever, or abandon a transient failure
//   · it will not purge a device merely because the network dropped
//   · it will not lose an operation, in any of those paths
//
// Run: npm run test:sync
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- scriptable server ----------------------------------------------------
const state = {
  adhkar: 'ok',      // ok | drop | 409 | 400 | 500 | 401
  probe: 'ok',       // ok | 401 | trust2 | down
  netDown: false,
};
const received = [];   // every adhkar delivery the server actually saw
const recorded = new Map(); // idempotency-key -> the row it created (one only)

const HARNESS = `<!doctype html><meta charset="utf-8"><title>sync harness</title><body>
<script type="module">
import * as store from '/js/shrs-local-store.js';
import * as engine from '/js/shrs-sync-engine.js';
import { SYNC } from '/js/shrs-offline-policy.js';

window.__syncCalls = [];
window.SHRS_CONNECTIVITY = { setSync: (s) => window.__syncCalls.push(s) };
window.store = store;
window.engine = engine;
window.SYNC = SYNC;

// Pushes every queued operation's last attempt into the past so a backoff
// window can be tested without waiting half an hour for it. Only scalar
// bookkeeping fields are touched; the sealed payload is left alone.
window.ageQueue = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('shrs');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('queue', 'readwrite');
    const s = tx.objectStore('queue');
    s.getAll().onsuccess = (e) => {
      for (const row of e.target.result) { row.lastAttemptAt = 0; s.put(row); }
    };
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => reject(tx.error);
  };
});

// Empties the queue between blocks that count deliveries exactly. Without it
// one block's leftovers are delivered inside the next block's run and every
// index-based assertion after it is measuring the wrong operation — which is
// how the first version of this harness "found" three idempotency defects
// that did not exist.
window.clearQueue = async () => {
  for (const op of await store.allOperations()) await store.removeOperation(op.operationId);
  return (await store.allOperations()).length;
};

window.ready = store.unlock('harness-session-secret', 'harness-device-salt').then(() => true);
</script></body>`;

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;

    if (p === '/__set') {
      for (const [k, v] of url.searchParams) state[k] = v === 'true' ? true : v === 'false' ? false : v;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }
    if (p === '/__received') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ received, rows: [...recorded.keys()] }));
      return;
    }
    if (p === '/__reset') {
      received.length = 0; recorded.clear();
      res.writeHead(200).end('{}');
      return;
    }

    if (state.netDown) { req.socket.destroy(); return; }

    if (p === '/api/portal/me') {
      if (state.probe === 'down') { req.socket.destroy(); return; }
      if (state.probe === '401') { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"no"}'); return; }
      const trustVersion = state.probe === 'trust2' ? 2 : 1;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, trustVersion }));
      return;
    }

    if (p === '/api/portal/adhkar' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      let body = null;
      try { body = JSON.parse(raw); } catch { body = null; }
      const key = req.headers['idempotency-key'] || null;
      const entry = {
        key,
        op: req.headers['x-shrs-operation'] || null,
        queuedAt: req.headers['x-shrs-queued-at'] || null,
        base: req.headers['x-shrs-base-version'] || null,
        body,
      };
      received.push(entry);

      // The real endpoint's unique constraint, modelled honestly: the same
      // key never creates a second row, whatever the transport did.
      if (state.adhkar === 'drop') {
        if (key && !recorded.has(key)) recorded.set(key, entry);
        req.socket.destroy();          // recorded, then the connection dies
        return;
      }
      if (state.adhkar === '409') {
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'record changed', serverView: { updatedAt: 999 } }));
        return;
      }
      if (state.adhkar === '400') {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid period.' }));
        return;
      }
      if (state.adhkar === '401') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not signed in.' }));
        return;
      }
      if (state.adhkar === '500') {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'boom' }));
        return;
      }
      if (key && !recorded.has(key)) recorded.set(key, entry);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, completionDate: body && body.completionDate }));
      return;
    }

    if (p === '/' || p === '/harness') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(HARNESS);
      return;
    }

    const file = path.join(ROOT, p);
    if (!path.resolve(file).startsWith(ROOT) || !existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nf');
      return;
    }
    res.writeHead(200, {
      'content-type': p.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/octet-stream',
      'cache-control': 'no-store',
    });
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
  console.log(`\nSHRS Phase 4 — the outbound sync engine\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const context = await browser.newContext();
  const page = await context.newPage();
  let harnessFailed = false;

  const set = async (params) => {
    const qs = new URLSearchParams(params).toString();
    await page.evaluate((u) => fetch(u).then((r) => r.json()), `/__set?${qs}`);
  };
  const serverSaw = () => page.evaluate(() => fetch('/__received').then((r) => r.json()));
  const resetServer = () => page.evaluate(() => fetch('/__reset').then((r) => r.json()));

  try {
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.waitForFunction(() => window.ready, null, { timeout: 20000 });
    await page.evaluate(() => window.ready);
    check('device store unlocked and the engine loaded', true);

    // --- what it refuses to queue -----------------------------------------
    console.log('\nWhat it refuses to queue');
    const refusals = await page.evaluate(async () => ({
      undeclared: await window.engine.queue('student.rename', { name: 'x' }),
      neverQueued: await window.engine.queue('certificate.issue', { student: 'x' }),
    }));
    check('an undeclared operation is refused',
      refusals.undeclared.queued === false && refusals.undeclared.reason === 'operation-not-declared',
      refusals.undeclared.reason);
    check('issuing a certificate is never deferred to a queue',
      refusals.neverQueued.queued === false && refusals.neverQueued.reason === 'requires-live-connection',
      refusals.neverQueued.reason);

    const editRefusal = await page.evaluate(async () => {
      // Temporarily declare an edit-kind operation to prove the base-version
      // rule, then take it away again.
      window.engine.OPERATIONS['test.edit'] = { method: 'POST', path: '/api/portal/adhkar', kind: 'edit', conflict: 'server-wins' };
      const r = await window.engine.queue('test.edit', { a: 1 });
      delete window.engine.OPERATIONS['test.edit'];
      return r;
    });
    check('an edit with no base version is refused, not queued blind',
      editRefusal.queued === false && editRefusal.reason === 'edit-requires-base-version', editRefusal.reason);

    // --- queued offline, delivered on reconnection ------------------------
    console.log('\nQueued with no signal, delivered when it returns');
    await page.evaluate(() => window.clearQueue());
    await set({ netDown: 'true' });
    await context.setOffline(true);
    const queuedOffline = await page.evaluate(async () => {
      const a = await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-07' });
      const b = await window.engine.queue('adhkar.complete', { period: 'evening', completionDate: '2026-08-07' });
      const c = await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-08' });
      return { a, b, c, status: await window.engine.status() };
    });
    check('operations queue with no connection', queuedOffline.a.queued && queuedOffline.c.queued,
      `${queuedOffline.status.pending} pending`);
    let saw = await page.evaluate(() => ({ len: 0 })); // server unreachable; nothing to ask
    check('nothing was delivered while offline', queuedOffline.status.synced === 0);

    await context.setOffline(false);
    await set({ netDown: 'false' });
    await resetServer();
    const firstRun = await page.evaluate(() => window.engine.sync());
    saw = await serverSaw();
    check('every queued operation is delivered on reconnection',
      firstRun.synced === 3 && saw.received.length === 3, JSON.stringify(firstRun));
    check('delivery order is the order they were made',
      saw.received[0].body.period === 'morning' && saw.received[0].body.completionDate === '2026-08-07'
      && saw.received[1].body.period === 'evening'
      && saw.received[2].body.completionDate === '2026-08-08');
    check('the day it happened is carried, not the day it was sent',
      saw.received.every((r) => r.body.completionDate && r.body.completionDate.startsWith('2026-08-0')),
      saw.received.map((r) => r.body.completionDate).join(' '));
    check('each delivery carries a stable idempotency key',
      saw.received.every((r) => r.key && r.key.length >= 16) && new Set(saw.received.map((r) => r.key)).size === 3);
    check('each delivery names the operation it is', saw.received.every((r) => r.op === 'adhkar.complete'));

    // --- a retry must not create a second row ------------------------------
    console.log('\nA retry that must not become a second record');
    await page.evaluate(() => window.clearQueue());
    await resetServer();
    await set({ adhkar: 'drop' });
    const dropped = await page.evaluate(async () => {
      const q = await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-09' });
      const run = await window.engine.sync();
      return { q, run, status: await window.engine.status() };
    });
    check('a connection lost mid-delivery leaves the operation pending, not lost',
      dropped.status.pending === 1 && dropped.status.failed === 0, JSON.stringify(dropped.run));

    await set({ adhkar: 'ok' });
    await page.evaluate(() => window.ageQueue());
    const retried = await page.evaluate(() => window.engine.sync());
    saw = await serverSaw();
    // Not "exactly two deliveries": a socket destroyed before any response
    // byte is one the browser may itself re-drive, so the number of times the
    // server is spoken to is genuinely outside the engine's control. What IS
    // in its control — and what makes that harmless — is that every one of
    // those deliveries carries the same key.
    check('every delivery of one operation carries the SAME idempotency key',
      saw.received.length >= 2 && new Set(saw.received.map((r) => r.key)).size === 1,
      `${saw.received.length} deliveries, ${new Set(saw.received.map((r) => r.key)).size} key(s)`);
    check('the server recorded exactly one row despite two deliveries',
      saw.rows.length === 1 && retried.synced === 1, `${saw.rows.length} row(s)`);

    // --- a conflict is not resolved by the engine --------------------------
    console.log('\nA conflict the engine will not settle');
    await page.evaluate(() => window.clearQueue());
    await resetServer();
    await set({ adhkar: '409' });
    const conflicted = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'evening', completionDate: '2026-08-09' });
      const run = await window.engine.sync();
      return { run, status: await window.engine.status(), conflicts: await window.engine.conflicts() };
    });
    check('a 409 becomes a conflict, not an overwrite',
      conflicted.status.conflicts === 1 && conflicted.run.conflicts === 1);
    check("the person's own version is kept, not discarded",
      conflicted.conflicts[0] && conflicted.conflicts[0].payload && conflicted.conflicts[0].payload.period === 'evening');
    check("the server's version is recorded alongside it",
      conflicted.conflicts[0].serverAck && conflicted.conflicts[0].serverAck.serverView);

    await set({ adhkar: 'ok' });
    await page.evaluate(() => window.ageQueue());
    await resetServer();
    const afterConflict = await page.evaluate(() => window.engine.sync());
    saw = await serverSaw();
    check('a conflicted operation is never retried behind the reader’s back',
      saw.received.length === 0, `${saw.received.length} deliveries`);

    // --- a refusal is terminal; a wobble is not ----------------------------
    console.log('\nTelling a refusal from a wobble');
    await page.evaluate(() => window.clearQueue());
    await resetServer();
    await set({ adhkar: '400' });
    const rejected = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-06' });
      const run = await window.engine.sync();
      return { run, failures: await window.engine.failures() };
    });
    check('a 4xx refusal is terminal and surfaced, not retried for ever',
      rejected.run.failed === 1 && rejected.failures.some((f) => (f.serverAck || {}).reason === 'rejected-400'));

    await set({ adhkar: '500' });
    const wobble = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'evening', completionDate: '2026-08-06' });
      const run = await window.engine.sync();
      const all = await window.store.allOperations();
      const op = all.find((o) => o.payload && o.payload.completionDate === '2026-08-06' && o.payload.period === 'evening');
      return { run, state: op.syncState, retryCount: op.retryCount };
    });
    check('a 5xx stays pending and consumes one attempt',
      wobble.state === 'pending' && wobble.retryCount === 1, `retryCount=${wobble.retryCount}`);

    const immediate = await page.evaluate(() => window.engine.sync());
    check('the backoff window is honoured — no immediate second attempt',
      immediate.attempted === 0 && immediate.deferred >= 1, JSON.stringify(immediate));

    // Four attempts, then terminal. Aged between each so the backoff does not
    // have to be waited out in real time.
    const exhausted = await page.evaluate(async () => {
      for (let i = 0; i < 5; i += 1) {
        await window.ageQueue();
        await window.engine.sync();
      }
      const all = await window.store.allOperations();
      const op = all.find((o) => o.payload && o.payload.completionDate === '2026-08-06' && o.payload.period === 'evening');
      return { state: op.syncState, retryCount: op.retryCount, max: window.SYNC.maxRetries };
    });
    check('retries are bounded, and exhaustion is a visible failure',
      exhausted.state === 'failed' && exhausted.retryCount >= exhausted.max,
      `${exhausted.retryCount}/${exhausted.max}`);

    // --- an authorisation failure stops the run ---------------------------
    console.log('\nAn authorisation failure stops everything');
    await page.evaluate(() => window.clearQueue());
    await set({ adhkar: '401' });
    await resetServer();
    const halted = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-05' });
      await window.engine.queue('adhkar.complete', { period: 'evening', completionDate: '2026-08-05' });
      await window.ageQueue();
      const run = await window.engine.sync();
      const all = await window.store.allOperations();
      const fresh = all.filter((o) => o.payload && o.payload.completionDate === '2026-08-05');
      return { run, states: fresh.map((o) => o.syncState), retries: fresh.map((o) => o.retryCount) };
    });
    saw = await serverSaw();
    check('the run stops at the first authorisation refusal',
      saw.received.length === 1, `${saw.received.length} delivery attempt(s)`);
    check('the operations behind it keep their retry budget',
      halted.states.every((s) => s === 'pending') && halted.retries.every((r) => r === 0),
      halted.retries.join(','));

    // --- the revocation gate ----------------------------------------------
    console.log('\nThe revocation gate');
    await set({ adhkar: 'ok', probe: 'down' });
    await resetServer();
    const probeDown = await page.evaluate(async () => {
      await window.ageQueue();
      const run = await window.engine.sync();
      return { run, remaining: (await window.store.allOperations()).length };
    });
    check('a probe that cannot be reached does NOT purge the device',
      probeDown.run.skipped === 'probe-unreachable' && probeDown.remaining > 0,
      `${probeDown.remaining} operation(s) still held`);

    await set({ probe: 'trust2' });
    const trustChanged = await page.evaluate(async () => {
      await window.ageQueue();
      const run = await window.engine.sync();
      return { run, remaining: (await window.store.allOperations()).length };
    });
    saw = await serverSaw();
    check('a changed trust version purges the device before anything is sent',
      trustChanged.run.skipped === 'trust-version-changed' && saw.received.length === 0,
      JSON.stringify(trustChanged.run));
    check('the outbound queue goes with it', trustChanged.remaining === 0, `${trustChanged.remaining} left`);

    // --- rejected session --------------------------------------------------
    await page.evaluate(() => window.store.unlock('harness-session-secret', 'harness-device-salt'));
    await set({ probe: '401' });
    const rejectedSession = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-04' });
      const run = await window.engine.sync();
      return { run, remaining: (await window.store.allOperations()).length };
    });
    check('a rejected session purges rather than retrying',
      rejectedSession.run.skipped === 'session-rejected' && rejectedSession.remaining === 0,
      JSON.stringify(rejectedSession.run));

    // --- human resolution --------------------------------------------------
    console.log('\nWhat only a human may do');
    await page.evaluate(() => window.store.unlock('harness-session-secret', 'harness-device-salt'));
    await set({ probe: 'ok', adhkar: '409' });
    const human = await page.evaluate(async () => {
      await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-03' });
      await window.engine.sync();
      const before = await window.engine.conflicts();
      const discarded = await window.engine.discard(before[0].operationId);
      const after = await window.engine.conflicts();
      return { beforeCount: before.length, discarded, afterCount: after.length };
    });
    check('a conflict can be discarded, but only deliberately',
      human.beforeCount === 1 && human.afterCount === 0 && human.discarded.discarded);

    // --- nothing is ever silently dropped ---------------------------------
    console.log('\nThe closing accounting');
    await set({ adhkar: '400' });
    const ledger = await page.evaluate(async () => {
      // One that will be refused outright, one that cannot leave yet: the
      // ledger is only meaningful over a queue that actually holds something.
      await window.engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-02' });
      await window.engine.sync();
      await window.engine.queue('adhkar.complete', { period: 'evening', completionDate: '2026-08-02' });
      const all = await window.store.allOperations();
      const known = ['pending', 'syncing', 'synced', 'failed', 'conflict'];
      return {
        total: all.length,
        unaccounted: all.filter((o) => !known.includes(o.syncState)).length,
        states: all.reduce((acc, o) => { acc[o.syncState] = (acc[o.syncState] || 0) + 1; return acc; }, {}),
      };
    });
    check('every operation held is in a state a person can be shown',
      ledger.total >= 2 && ledger.unaccounted === 0, JSON.stringify(ledger.states));

    const told = await page.evaluate(() => window.__syncCalls.length);
    check('the interface is told about the queue', told > 0, `${told} updates`);
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

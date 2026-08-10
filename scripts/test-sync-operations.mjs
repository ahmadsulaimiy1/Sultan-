// The outbound queue with more than one operation in it, and the server half
// that makes the extra ones honest.
//
// The single-operation registry was easy: `adhkar.complete` is additive and the
// database already had a unique constraint, so idempotency was free and
// conflict was impossible. Neither is true of the two added here, and that is
// the point of this file:
//
//   · message.reply is additive but NOT free — a retried reply becomes a second
//     message in a parent's thread unless the server remembers the delivery.
//   · emergency.contact.save is the registry's first EDIT. Tuesday's correction
//     delivered on Friday must not erase Wednesday's. That needs a base version
//     going out and a real 409 coming back, with the server's row attached.
//
// The server in this test is not a mock of those rules. It imports the real
// functions/_lib/offline-write.js and runs it, so what is under test is the
// code that will run in production, not a second implementation of it.
//
// Run: npm run test:sync:operations
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  idempotencyKey, replayed, remember, compareVersion, conflictBody,
} from '../functions/_lib/offline-write.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail || '' });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

/* ── A fake `sql` for the two statements the helper issues ────────────────
 *
 * Not a SQL engine. It recognises the helper's SELECT and its INSERT by their
 * table and verb, and keeps rows in a Map keyed the way the real primary key
 * is. Everything the helper actually decides — the actor scoping, the replay,
 * the ON CONFLICT DO NOTHING — is exercised for real; only the storage is
 * stood in for. Stated plainly because a fake that quietly diverges from the
 * schema is worse than no test.
 */
function fakeSql() {
  const rows = new Map();                     // idempotency_key → row
  const fn = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    if (/^SELECT .* FROM sync_operations/i.test(text)) {
      const [key, actorType, actorId] = values;
      const row = rows.get(key);
      const hit = row && row.actor_type === actorType && row.actor_id === actorId;
      return Promise.resolve({ rows: hit ? [row] : [] });
    }
    if (/^INSERT INTO sync_operations/i.test(text)) {
      const [key, actorType, actorId, operationType, status, body] = values;
      if (!rows.has(key)) {                   // ON CONFLICT (idempotency_key) DO NOTHING
        rows.set(key, {
          idempotency_key: key, actor_type: actorType, actor_id: actorId,
          operation_type: operationType, response_status: status,
          response_body: JSON.parse(body),
        });
      }
      return Promise.resolve({ rows: [] });
    }
    throw new Error('fakeSql: unrecognised statement — ' + text.slice(0, 80));
  };
  fn.rows = rows;
  return fn;
}

async function serverUnitChecks() {
  console.log('The server half, on its own');

  // Idempotency keys
  const hdr = (v) => ({ headers: { get: (n) => (n === 'Idempotency-Key' && v !== undefined ? v : null) } });
  check('a delivery with no key is allowed — a live form has no retry problem',
    idempotencyKey(hdr(undefined)) === null);
  check('a well-formed key is accepted',
    idempotencyKey(hdr('op_2026-08-10_a1b2c3d4')) === 'op_2026-08-10_a1b2c3d4');
  check('a key with a quote in it is refused, not escaped',
    idempotencyKey(hdr("abcdefgh'; DROP")) === null);
  check('a key long enough to fill a table is refused',
    idempotencyKey(hdr('x'.repeat(400))) === null);
  check('a key too short to be unique is refused', idempotencyKey(hdr('abc')) === null);

  // Version comparison — the three answers
  const now = '2026-08-10T09:00:00.000Z';
  check('a row nobody has is "absent", not "changed"', compareVersion(null, now) === 'absent');
  check('an edit with NO base version is stale, never a pass',
    compareVersion(now, null) === 'stale');
  check('an unchanged row is current', compareVersion(now, now) === 'current');
  check('sub-second timestamp noise is not a conflict',
    compareVersion('2026-08-10T09:00:00.400Z', now) === 'current');
  check('a row that moved by a minute IS a conflict',
    compareVersion('2026-08-10T09:01:00.000Z', now) === 'stale');
  check('an unparseable base version is stale, not trusted',
    compareVersion(now, 'sometime last week') === 'stale');

  // Replay guard
  const sql = fakeSql();
  check('nothing is replayed before anything happened',
    (await replayed(sql, 'op_first_delivery', 'guardian', 7)) === null);
  await remember(sql, 'op_first_delivery', 'guardian', 7, 'message.reply', 200, { ok: true });
  const again = await replayed(sql, 'op_first_delivery', 'guardian', 7);
  check('a repeat delivery gets the first answer back, not a second write',
    again && again.status === 200 && again.body.ok === true);

  await remember(sql, 'op_first_delivery', 'guardian', 7, 'message.reply', 500, { ok: false });
  const unchanged = await replayed(sql, 'op_first_delivery', 'guardian', 7);
  check('a later delivery cannot overwrite the recorded answer',
    unchanged.status === 200 && unchanged.body.ok === true);

  check('another account cannot replay — or discover — this operation',
    (await replayed(sql, 'op_first_delivery', 'guardian', 8)) === null);
  check('nor another kind of actor with the same id',
    (await replayed(sql, 'op_first_delivery', 'staff', 7)) === null);

  await remember(sql, null, 'guardian', 7, 'message.reply', 200, { ok: true });
  check('a delivery with no key records nothing rather than a null key row',
    sql.rows.size === 1);

  const conflict = conflictBody({ id: 3, fullName: 'Aminat Òjó' }, 'Changed elsewhere.');
  check('a conflict hands back the server\'s own row, so a person can choose',
    conflict.conflict === true && conflict.server.fullName === 'Aminat Òjó');
}

/* ── The browser half ────────────────────────────────────────────────────── */

const state = { drop: false, closedThread: false, contactMovedAt: null };
const threadMessages = [];                    // every reply the server really stored
const contacts = new Map();                   // order → { …, updated_at }

const HARNESS = `<!doctype html><meta charset="utf-8"><title>sync operations</title><body>
<script type="module">
import * as store from '/js/shrs-local-store.js';
import * as engine from '/js/shrs-sync-engine.js';
window.store = store; window.engine = engine;
window.OPERATIONS = engine.OPERATIONS;
window.clearQueue = async () => {
  for (const op of await store.allOperations()) await store.removeOperation(op.operationId);
  return (await store.allOperations()).length;
};
window.ready = store.unlock('ops-session-secret', 'ops-device-salt').then(() => true);
</script></body>`;

/* Node's req.headers is a plain object; a Cloudflare Request carries a Headers.
 * The helper is written against the real one, so the test adapts rather than
 * the helper loosening — a loosened helper is a helper that stops checking. */
const asRequest = (req) => ({ headers: { get: (n) => req.headers[n.toLowerCase()] ?? null } });

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
  });
}

function serve(sql) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };

    if (p === '/__set') {
      for (const [k, v] of url.searchParams) {
        state[k] = v === 'true' ? true : v === 'false' ? false : v;
      }
      return send(200, state);
    }
    if (p === '/__seen') return send(200, { replies: threadMessages, contacts: [...contacts.values()] });
    if (p === '/api/portal/me') return send(200, { ok: true, trustVersion: 1 });

    // The two guarded endpoints, running the real helper.
    if (p === '/api/portal/messages/reply' && req.method === 'POST') {
      const body = await readBody(req);
      const key = idempotencyKey(asRequest(req));
      const prior = await replayed(sql, key, 'guardian', 7);
      if (prior) return send(prior.status, prior.body);

      if (state.drop) { req.socket.destroy(); return; }     // dies AFTER reading, before answering

      if (state.closedThread) {
        const closed = { error: 'This thread has been closed by the office.' };
        await remember(sql, key, 'guardian', 7, 'message.reply', 409, closed);
        return send(409, closed);
      }
      threadMessages.push({ threadId: body.threadId, body: body.body, key });
      const ok = { ok: true };
      await remember(sql, key, 'guardian', 7, 'message.reply', 200, ok);
      return send(200, ok);
    }

    if (p === '/api/portal/emergency-contacts' && req.method === 'POST') {
      const body = await readBody(req);
      const key = idempotencyKey(asRequest(req));
      const prior = await replayed(sql, key, 'guardian', 7);
      if (prior) return send(prior.status, prior.body);

      const existing = contacts.get(Number(body.order)) || null;
      const verdict = compareVersion(existing && existing.updatedAt, body.baseUpdatedAt);
      if (verdict === 'stale') {
        const conflict = conflictBody(existing, 'This emergency contact was changed elsewhere.');
        await remember(sql, key, 'guardian', 7, 'emergency.contact.save', 409, conflict);
        return send(409, conflict);
      }
      const row = {
        id: Number(body.order), order: Number(body.order), fullName: body.fullName,
        relationship: body.relationship, phone: body.phone, email: body.email,
        updatedAt: new Date(Date.parse('2026-08-10T12:00:00.000Z')).toISOString(),
      };
      contacts.set(row.order, row);
      const payload = { ok: true, contacts: [...contacts.values()] };
      await remember(sql, key, 'guardian', 7, 'emergency.contact.save', 200, payload);
      return send(200, payload);
    }

    if (p === '/' || p === '/harness') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(HARNESS);
    }
    const file = path.join(ROOT, p);
    if (!path.resolve(file).startsWith(ROOT) || !existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nf'); return;
    }
    res.writeHead(200, {
      'content-type': p.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

async function main() {
  await serverUnitChecks();

  const sql = fakeSql();
  const { server, port } = await serve(sql);
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nThe queue, with three declared operations\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const page = await (await browser.newContext()).newPage();

  try {
    await page.goto(`${origin}/harness`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ready, null, { timeout: 10000 });
    await page.evaluate(() => window.ready);

    const registry = await page.evaluate(() => Object.entries(window.OPERATIONS).map(([k, v]) => ({
      type: k, kind: v.kind, replaySafe: v.replaySafe,
      because: v.replaySafeBecause, conflict: v.conflict,
    })));
    check('the registry holds more than one operation', registry.length >= 3, registry.map((r) => r.type).join(', '));
    check('every entry states WHY a repeat delivery is safe',
      registry.every((r) => r.replaySafe === true && typeof r.because === 'string' && r.because.length > 20));
    check('and every entry names its conflict rule',
      registry.every((r) => typeof r.conflict === 'string' && r.conflict.length > 0));
    check('there is now a real edit in the registry, not only additive writes',
      registry.some((r) => r.kind === 'edit') && registry.some((r) => r.kind === 'additive'));

    console.log('\nA parent replying to the school with no signal');
    await page.evaluate(() => window.clearQueue());
    const queuedReply = await page.evaluate(() =>
      window.engine.queue('message.reply', { threadId: 4, body: 'Thank you — he will be back on Monday.' }));
    check('the reply is queued', queuedReply.queued === true);

    // The request is read, then the socket dies. The phone cannot tell a lost
    // reply from a lost request, so it retries. That is the whole scenario.
    await page.evaluate((o) => fetch(o + '/__set?drop=true'), origin);
    await page.evaluate(() => window.engine.sync());
    let seen = await page.evaluate((o) => fetch(o + '/__seen').then((r) => r.json()), origin);
    check('a delivery that died before answering stored nothing', seen.replies.length === 0);

    await page.evaluate((o) => fetch(o + '/__set?drop=false'), origin);
    await page.evaluate(() => window.store.allOperations().then((ops) => ops.forEach(() => {})));
    await page.evaluate(async () => {
      // Clear the backoff so the retry happens now rather than in thirty minutes.
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('shrs');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('queue', 'readwrite');
          const s = tx.objectStore('queue');
          s.getAll().onsuccess = (e) => { for (const row of e.target.result) { row.lastAttemptAt = 0; s.put(row); } };
          tx.oncomplete = () => { db.close(); resolve(true); };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await page.evaluate(() => window.engine.sync());
    await page.evaluate(() => window.engine.sync());
    seen = await page.evaluate((o) => fetch(o + '/__seen').then((r) => r.json()), origin);
    check('after the retries, the office has ONE message, not three',
      seen.replies.length === 1, `${seen.replies.length} stored`);
    check('and it is the message the parent actually wrote',
      seen.replies[0].body === 'Thank you — he will be back on Monday.');

    const afterReply = await page.evaluate(() => window.store.allOperations());
    check('the operation ends synced, not pending for ever',
      afterReply.length === 1 && afterReply[0].syncState === 'synced', afterReply[0] && afterReply[0].syncState);

    console.log('\nA reply to a thread the office has closed');
    await page.evaluate(() => window.clearQueue());
    await page.evaluate((o) => fetch(o + '/__set?closedThread=true'), origin);
    await page.evaluate(() => window.engine.queue('message.reply', { threadId: 4, body: 'Are you there?' }));
    await page.evaluate(() => window.engine.sync());
    const closedOps = await page.evaluate(() => window.store.allOperations());
    check('a refusal is terminal, not retried for half an hour',
      closedOps[0].syncState === 'conflict', closedOps[0].syncState);
    check('what the parent typed is kept, not discarded with the refusal',
      closedOps.length === 1);
    await page.evaluate((o) => fetch(o + '/__set?closedThread=false'), origin);

    console.log('\nAn emergency contact corrected on a phone with no signal');
    await page.evaluate(() => window.clearQueue());
    const noBase = await page.evaluate(() => window.engine.queue('emergency.contact.save', {
      order: 1, fullName: 'Tunde Òjó', relationship: 'Uncle', phone: '+234...',
    }));
    check('an edit with no base version is refused at the door, not sent blind',
      noBase.queued === false && noBase.reason === 'edit-requires-base-version');

    // First save: nothing in that slot yet.
    const first = await page.evaluate(() => window.engine.queue('emergency.contact.save', {
      order: 1, fullName: 'Tunde Òjó', relationship: 'Uncle', phone: '+234 800 000 0001',
      baseUpdatedAt: null,
    }, { baseUpdatedAt: 'absent', recordId: 'contact:1' }));
    check('a first save is queued once a base version is declared', first.queued === true);
    await page.evaluate(() => window.engine.sync());
    seen = await page.evaluate((o) => fetch(o + '/__seen').then((r) => r.json()), origin);
    check('the contact reaches the school', seen.contacts.length === 1 && seen.contacts[0].fullName === 'Tunde Òjó');

    console.log('\nThe same slot, changed by someone else in the meantime');
    await page.evaluate(() => window.clearQueue());
    const stale = await page.evaluate(() => window.engine.queue('emergency.contact.save', {
      order: 1, fullName: 'Bola Òjó', relationship: 'Aunt', phone: '+234 800 000 0002',
      // What this device last saw — hours before the row moved.
      baseUpdatedAt: '2026-08-10T06:00:00.000Z',
    }, { baseUpdatedAt: '2026-08-10T06:00:00.000Z', recordId: 'contact:1' }));
    check('the stale edit is queued — the device cannot know yet', stale.queued === true);
    await page.evaluate(() => window.engine.sync());

    const conflicted = await page.evaluate(() => window.store.allOperations());
    check('the server refuses it, and the refusal is terminal',
      conflicted[0].syncState === 'conflict', conflicted[0].syncState);
    seen = await page.evaluate((o) => fetch(o + '/__seen').then((r) => r.json()), origin);
    check('NO LAST-WRITER-WINS — the newer value is still on the server',
      seen.contacts[0].fullName === 'Tunde Òjó', seen.contacts[0].fullName);
    check('and what the person typed is still on the device, not thrown away',
      conflicted.length === 1);

    const ack = conflicted[0].serverAck || {};
    const serverView = ack.serverResponse || ack.server || {};
    check('the conflict carries the server\'s own row, so a person can choose',
      JSON.stringify(serverView).includes('Tunde'), JSON.stringify(serverView).slice(0, 90));

    console.log('\nWhat is still refused');
    const undeclared = await page.evaluate(() => window.engine.queue('certificate.issue', {}));
    check('an operation on the never-queued list is still refused',
      undeclared.queued === false && undeclared.reason === 'requires-live-connection');
    const invented = await page.evaluate(() => window.engine.queue('fees.write.off', { amount: 250000 }));
    check('and an undeclared one is still refused, three operations later',
      invented.queued === false && invented.reason === 'operation-not-declared');

  } finally {
    await browser.close();
    server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks passed\n`);
  console.log('Not covered here, and not claimed: the real Postgres. The helper');
  console.log('runs for real, but against a Map rather than the sync_operations');
  console.log('table, so the schema itself is verified only by the fact that both');
  console.log('sql/schema.sql and setup.js declare it. A live database run remains');
  console.log('REQUIRES EXTERNAL ACTION.\n');
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });

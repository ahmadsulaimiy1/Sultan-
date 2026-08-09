// The two sync paths the adversarial suite could not reach, and the full
// journey end to end.
//
//   1. A REAL browser restart. scripts/test-sync-engine.mjs uses an ordinary
//      context, which loses IndexedDB when it closes — so "the queue survives"
//      was never actually tested, only assumed. This uses a persistent profile
//      on disk, closes the browser completely, and reopens it.
//
//   2. A STALE BASE VERSION. The adversarial suite proves a 409 becomes a
//      terminal conflict. It does not prove the rest of the story: that the
//      person can look at what the server now says, resubmit on top of it, and
//      have that land — without the engine ever having done it for them.
//
//   3. The whole journey in one line: an action → held locally → queued →
//      synchronised → acknowledged → reconciled against the server's answer.
//
// Run: npm run test:sync:lifecycle
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const state = { adhkar: 'ok', probe: 'ok' };
const received = [];
const rows = new Map();          // idempotency key -> stored row

const HARNESS = `<!doctype html><meta charset="utf-8"><title>lifecycle</title><body>
<button id="mark">Mark morning adhkār</button>
<p id="status">—</p>
<script type="module">
import * as store from '/js/shrs-local-store.js';
import * as engine from '/js/shrs-sync-engine.js';
window.store = store; window.engine = engine;

// The real journey starts at a button, not at an API call.
document.getElementById('mark').addEventListener('click', async () => {
  const r = await engine.queue('adhkar.complete', { period: 'morning', completionDate: '2026-08-09' });
  document.getElementById('status').textContent = r.queued ? 'held on this device' : ('refused: ' + r.reason);
});

document.addEventListener('shrs:sync-report', (e) => { window.__lastReport = e.detail; });

window.ready = store.unlock('lifecycle-secret', 'lifecycle-salt').then(() => true);
</script></body>`;

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    if (p === '/__set') {
      for (const [k, v] of url.searchParams) state[k] = v;
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(state));
      return;
    }
    if (p === '/__received') {
      res.writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ received, rows: [...rows.keys()] }));
      return;
    }
    if (p === '/api/portal/me') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, trustVersion: 1 }));
      return;
    }
    if (p === '/api/portal/adhkar' && req.method === 'POST') {
      let raw = '';
      for await (const c of req) raw += c;
      const key = req.headers['idempotency-key'] || null;
      const base = req.headers['x-shrs-base-version'] || null;
      let body = null; try { body = JSON.parse(raw); } catch { /* malformed */ }
      received.push({ key, base, body });

      // A stale base version is the server's to detect, not the client's.
      if (state.adhkar === 'stale-base' && base !== '999') {
        res.writeHead(409, { 'content-type': 'application/json' })
          .end(JSON.stringify({ error: 'record changed', serverView: { updatedAt: 999 } }));
        return;
      }
      if (state.adhkar === 'down') { req.socket.destroy(); return; }
      if (key && !rows.has(key)) rows.set(key, body);
      res.writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ ok: true, completionDate: body && body.completionDate, serverUpdatedAt: 999 }));
      return;
    }
    if (p === '/' || p === '/harness') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(HARNESS);
      return;
    }
    const file = path.join(ROOT, p);
    if (!path.resolve(file).startsWith(ROOT) || !existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nf'); return;
    }
    res.writeHead(200, {
      'content-type': p.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail || '' });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOpts = existsSync(PINNED) ? { executablePath: PINNED } : {};

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shrs-profile-'));
  console.log(`\nSHRS — the sync journey, and what survives a restart\nserving at ${origin}\nprofile ${profile}\n`);

  let failed = false;
  try {
    // --- the journey, with the network away -------------------------------
    console.log('An action taken with no signal');
    // Loaded with a connection, then the signal goes — which is the order it
    // happens to a person, and the only order in which a browser launched
    // offline could reach the page at all.
    let ctx = await chromium.launchPersistentContext(profile, launchOpts);
    let page = await ctx.newPage();
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.evaluate(() => window.ready);
    await ctx.setOffline(true);

    await page.click('#mark');
    await page.waitForFunction(() => document.getElementById('status').textContent !== '—');
    const afterClick = await page.evaluate(async () => ({
      status: document.getElementById('status').textContent,
      held: (await window.store.allOperations()).length,
      state: (await window.store.allOperations())[0].syncState,
      payload: (await window.store.allOperations())[0].payload,
    }));
    check('a button press is held on the device, not lost', afterClick.held === 1 && afterClick.state === 'pending',
      afterClick.status);
    check('what was held is what was done', afterClick.payload.period === 'morning'
      && afterClick.payload.completionDate === '2026-08-09');
    check('nothing reached the server', received.length === 0, `${received.length} deliveries`);

    // --- a real restart ----------------------------------------------------
    console.log('\nClosing the browser completely, then reopening it');
    await ctx.close();
    ctx = await chromium.launchPersistentContext(profile, launchOpts);
    page = await ctx.newPage();
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.evaluate(() => window.ready);
    // Nothing synchronises on its own here — start() is not called — so the
    // queue can be inspected before anything has had a chance to drain it.
    const afterRestart = await page.evaluate(async () => {
      const all = await window.store.allOperations();
      return { held: all.length, state: all[0] && all[0].syncState, payload: all[0] && all[0].payload };
    });
    check('the queue survives a full browser restart', afterRestart.held === 1 && afterRestart.state === 'pending');
    check('and it is still readable — the session key was re-derived, not stored',
      afterRestart.payload && afterRestart.payload.period === 'morning');

    // --- reconnect, deliver, reconcile ------------------------------------
    console.log('\nThe signal returns');
    const run = await page.evaluate(() => window.engine.sync());
    const reconciled = await page.evaluate(async () => {
      const all = await window.store.allOperations();
      return { state: all[0].syncState, ack: all[0].serverAck, report: window.__lastReport };
    });
    check('the held action is delivered on reconnection', run.synced === 1 && received.length === 1,
      JSON.stringify(run));
    check('the server acknowledgement is reconciled back onto the device',
      reconciled.state === 'synced' && reconciled.ack && reconciled.ack.ok === true);
    check('the server recorded exactly one row', rows.size === 1, `${rows.size} row(s)`);
    check('the interface was told the queue had drained',
      reconciled.report && reconciled.report.pending === 0, JSON.stringify(reconciled.report));

    // --- a stale base version ---------------------------------------------
    console.log('\nAn edit made against a version that has moved on');
    await page.evaluate(async () => {
      // A declared edit-kind operation, so the base-version rule is in force.
      window.engine.OPERATIONS['adhkar.amend'] = {
        method: 'POST', path: '/api/portal/adhkar', kind: 'edit',
        replaySafe: true, conflict: 'server-wins',
        body: (p) => ({ period: p.period, completionDate: p.completionDate }),
      };
    });
    await page.evaluate((u) => fetch(u), '/__set?adhkar=stale-base');

    const stale = await page.evaluate(async () => {
      const q = await window.engine.queue('adhkar.amend',
        { period: 'evening', completionDate: '2026-08-09' }, { baseUpdatedAt: 100, recordId: 'a1' });
      const run = await window.engine.sync();
      const conflicts = await window.engine.conflicts();
      return { q, run, conflicts: conflicts.length, serverView: conflicts[0] && conflicts[0].serverAck.serverResponse.serverView };
    });
    check('an edit on a stale base is refused by the server and held as a conflict',
      stale.run.conflicts === 1 && stale.conflicts === 1, JSON.stringify(stale.run));
    check("the server's current version is shown to the person, not discarded",
      stale.serverView && stale.serverView.updatedAt === 999, JSON.stringify(stale.serverView));

    const beforeResubmit = received.length;
    const untouched = await page.evaluate(() => window.engine.sync());
    check('a conflicted edit is never retried on its own',
      received.length === beforeResubmit, `${received.length - beforeResubmit} further deliveries`);

    // Only a human, having seen the server's version, may resubmit on top.
    const resubmitted = await page.evaluate(async () => {
      const c = await window.engine.conflicts();
      const r = await window.engine.resubmit(c[0].operationId, 999);
      const run = await window.engine.sync();
      return { r, run, remainingConflicts: (await window.engine.conflicts()).length };
    });
    check('a deliberate resubmission on the current version succeeds',
      resubmitted.r.queued === true && resubmitted.run.synced === 1 && resubmitted.remainingConflicts === 0,
      JSON.stringify(resubmitted.run));
    const lastBase = received[received.length - 1].base;
    check('and it carried the version the person actually looked at', lastBase === '999', `base=${lastBase}`);

    const noForce = await page.evaluate(async () => {
      window.engine.OPERATIONS['adhkar.amend'].kind = 'edit';
      return window.engine.queue('adhkar.amend', { period: 'evening', completionDate: '2026-08-09' });
    });
    check('there is no path that overwrites without a base version — no last-writer-wins',
      noForce.queued === false && noForce.reason === 'edit-requires-base-version', noForce.reason);

    await ctx.close();
  } catch (err) {
    failed = true;
    console.error('\nharness error:', err && err.stack ? err.stack : err);
  } finally {
    server.close();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* best effort */ }
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

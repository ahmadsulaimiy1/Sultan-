// Phase 6 acceptance — the offline certificate register.
//
// The single most important claim under test is a negative one: NO path
// through this module returns "genuine". Offline checking answers a weaker
// question than verification, and the whole design is worthless if any state
// can be mistaken for the strong answer.
//
// The key pair used here is generated inside the test and thrown away when it
// ends. It signs nothing but the fixture registers below. No certificate is
// minted, re-minted or touched, and no production key is created, used or
// written anywhere by this file.
//
// Run: npm run test:certificate-offline
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { FIXTURE_CANONICAL } from './build-certificate-register.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HARNESS = `<!doctype html><meta charset="utf-8"><title>register harness</title><body>
<script type="module">
import * as cert from '/js/shrs-certificate-offline.js';
window.cert = cert;

// A throwaway Ed25519 pair, generated in the page, existing only for this run.
window.makeKeys = async () => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  window.__priv = pair.privateKey;
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
};

window.sign = async (register) => {
  const bytes = cert.canonicalBytes(register);
  const sig = await crypto.subtle.sign('Ed25519', window.__priv, bytes);
  return { ...register, signature: btoa(String.fromCharCode(...new Uint8Array(sig))) };
};

window.digestOf = (serial) => cert.serialDigest(serial);
window.ready = true;
</script></body>`;

function serve() {
  const server = http.createServer((req, res) => {
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

const REAL = 'SHRS-CERT-IBT-2026-000035-22C49';
const WITHDRAWN = 'SHRS-CERT-IBT-2026-000037-22C49';
const UNKNOWN = 'SHRS-CERT-IBT-2026-999999-00000';

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nSHRS Phase 6 — the offline certificate register\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const page = await (await browser.newContext()).newPage();
  let harnessFailed = false;

  try {
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.waitForFunction(() => window.ready, null, { timeout: 20000 });

    // --- the two implementations must agree byte for byte ------------------
    // The signer runs in Node, the verifier in a browser. If their canonical
    // forms drift, every signature fails on a parent's phone and the cause is
    // invisible. Both are pinned to this one string.
    console.log('Server and browser agree on the signed bytes');
    const canonical = await page.evaluate(() => {
      const fixture = {
        version: 1,
        issuedAt: 1754697600000,
        keyId: 'shrs-cert-test',
        algorithm: 'Ed25519',
        entries: [{ h: 'abc', s: 'valid', d: '2026-08-08' }],
      };
      return new TextDecoder().decode(window.cert.canonicalBytes(fixture));
    });
    check('the browser canonical form matches the signer’s, exactly',
      canonical === FIXTURE_CANONICAL, canonical);

    // --- the shipped state -------------------------------------------------
    console.log('\nWhat ships today');
    const shipped = await page.evaluate(() => Object.keys(window.cert.TRUSTED_KEYS).length);
    check('no placeholder public key ships — the pinned set is empty', shipped === 0,
      `${shipped} key(s) pinned`);

    const unsignedRefused = await page.evaluate(async () => {
      const reg = { version: 1, issuedAt: Date.now(), keyId: 'shrs-cert-v1', algorithm: 'Ed25519', entries: [] };
      return window.cert.check('SHRS-CERT-IBT-2026-000035-22C49', { register: reg });
    });
    check('with no key pinned, every register is refused rather than believed',
      unsignedRefused.state === 'register-untrusted' && unsignedRefused.genuine === false,
      unsignedRefused.reason);

    // --- with a signing key ------------------------------------------------
    console.log('\nWith a signed register');
    const setup = await page.evaluate(async ([real, withdrawn]) => {
      const pub = await window.makeKeys();
      window.__keys = { 'shrs-cert-test': pub };
      const register = await window.sign({
        version: 1,
        issuedAt: Date.now(),
        keyId: 'shrs-cert-test',
        algorithm: 'Ed25519',
        entries: [
          { h: await window.digestOf(real), s: 'valid', d: '2026-08-08' },
          { h: await window.digestOf(withdrawn), s: 'revoked', d: '2026-08-08' },
        ],
      });
      window.__register = register;
      return { entries: register.entries.length, hasSig: Boolean(register.signature) };
    }, [REAL, WITHDRAWN]);
    check('a register can be built and signed', setup.entries === 2 && setup.hasSig);

    const serialsInClear = await page.evaluate(([real]) =>
      JSON.stringify(window.__register).includes(real), [REAL]);
    check('no serial appears in the register in the clear', serialsInClear === false);

    const good = await page.evaluate(([serial]) =>
      window.cert.check(serial, { register: window.__register, trustedKeys: window.__keys }), [REAL]);
    check('an issued serial is found', good.state === 'recorded', good.state);
    check('and is NOT reported as genuine', good.genuine === false);

    const spaced = await page.evaluate(([serial]) =>
      window.cert.check('  ' + serial.toLowerCase() + ' ', { register: window.__register, trustedKeys: window.__keys }), [REAL]);
    check('spacing and case do not defeat the lookup', spaced.state === 'recorded');

    const revoked = await page.evaluate(([serial]) =>
      window.cert.check(serial, { register: window.__register, trustedKeys: window.__keys }), [WITHDRAWN]);
    check('a withdrawn certificate reads as withdrawn', revoked.state === 'revoked' && revoked.genuine === false);

    const unknown = await page.evaluate(([serial]) =>
      window.cert.check(serial, { register: window.__register, trustedKeys: window.__keys }), [UNKNOWN]);
    check('an unknown serial is "not in this register", not "forged"',
      unknown.state === 'not-in-register' && unknown.genuine === false);

    // --- tampering ---------------------------------------------------------
    console.log('\nTampering');
    const tampered = await page.evaluate(async ([serial]) => {
      const forged = JSON.parse(JSON.stringify(window.__register));
      forged.entries.push({ h: await window.digestOf(serial), s: 'valid', d: '2026-08-08' });
      return window.cert.check(serial, { register: forged, trustedKeys: window.__keys });
    }, [UNKNOWN]);
    check('an entry added after signing invalidates the whole register',
      tampered.state === 'register-untrusted' && tampered.reason === 'signature-invalid', tampered.reason);

    const statusFlipped = await page.evaluate(([serial]) => {
      const forged = JSON.parse(JSON.stringify(window.__register));
      forged.entries[1].s = 'valid';           // un-revoke a withdrawn certificate
      return window.cert.check(serial, { register: forged, trustedKeys: window.__keys });
    }, [WITHDRAWN]);
    check('a revocation cannot be quietly reversed on the device',
      statusFlipped.state === 'register-untrusted', statusFlipped.reason);

    const otherKey = await page.evaluate(async ([serial]) => {
      const rogue = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const spki = await crypto.subtle.exportKey('spki', rogue.publicKey);
      const reg = { version: 1, issuedAt: Date.now(), keyId: 'shrs-cert-test', algorithm: 'Ed25519', entries: [{ h: await window.digestOf(serial), s: 'valid', d: '2026-08-08' }] };
      const bytes = window.cert.canonicalBytes(reg);
      const sig = await crypto.subtle.sign('Ed25519', rogue.privateKey, bytes);
      reg.signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
      return {
        result: await window.cert.check(serial, { register: reg, trustedKeys: window.__keys }),
        rogueIsDifferent: btoa(String.fromCharCode(...new Uint8Array(spki))) !== window.__keys['shrs-cert-test'],
      };
    }, [UNKNOWN]);
    check('a register signed by anyone else is rejected',
      otherKey.rogueIsDifferent && otherKey.result.state === 'register-untrusted'
      && otherKey.result.reason === 'signature-invalid');

    const unpinned = await page.evaluate(() => {
      const reg = { ...window.__register, keyId: 'some-other-key' };
      return window.cert.check('X', { register: reg, trustedKeys: window.__keys });
    });
    check('a register naming a key the client does not pin is rejected',
      unpinned.state === 'register-untrusted' && unpinned.reason === 'key-not-pinned');

    // --- staleness ---------------------------------------------------------
    console.log('\nAge');
    const stale = await page.evaluate(async ([serial]) => {
      const old = await window.sign({
        version: 1,
        issuedAt: Date.now() - (25 * 60 * 60 * 1000),
        keyId: 'shrs-cert-test',
        algorithm: 'Ed25519',
        entries: [{ h: await window.digestOf(serial), s: 'valid', d: '2026-08-08' }],
      });
      return window.cert.check(serial, { register: old, trustedKeys: window.__keys });
    }, [REAL]);
    check('a register older than the revocation window refuses to answer',
      stale.state === 'register-stale' && stale.genuine === false, `${Math.round(stale.ageMs / 3600000)}h old`);

    const absent = await page.evaluate(() => window.cert.check('X', { register: null, url: '/nothing-here.json' }));
    check('with no register at all, it says so rather than guessing',
      absent.state === 'register-absent' && absent.genuine === false);

    // --- the guarantee -----------------------------------------------------
    console.log('\nThe guarantee');
    const everyState = await page.evaluate(async ([real, withdrawn, unknown]) => {
      const R = window.__register, K = window.__keys;
      const outcomes = [
        await window.cert.check(real, { register: R, trustedKeys: K }),
        await window.cert.check(withdrawn, { register: R, trustedKeys: K }),
        await window.cert.check(unknown, { register: R, trustedKeys: K }),
        await window.cert.check(real, { register: R, trustedKeys: {} }),
        await window.cert.check(real, { register: null, url: '/nope.json' }),
      ];
      return {
        anyGenuine: outcomes.some((o) => o.genuine === true),
        states: outcomes.map((o) => o.state),
        descriptions: outcomes.map((o) => window.cert.describe(o, 'en').title),
        arabic: outcomes.map((o) => window.cert.describe(o, 'ar').title),
      };
    }, [REAL, WITHDRAWN, UNKNOWN]);
    check('NO offline path reports a certificate as genuine', everyState.anyGenuine === false,
      everyState.states.join(', '));
    check('every state has a sentence a person can read',
      everyState.descriptions.every((d) => d && d.length > 10));
    check('and one in Arabic, distinct from the English',
      everyState.arabic.every((d) => d && d.length > 5)
      && everyState.arabic.every((d, i) => d !== everyState.descriptions[i]));
    const recordedWording = everyState.descriptions[0];
    check('the strongest offline wording still stops short of a verdict',
      !/genuine|authentic|verified certificate/i.test(recordedWording), recordedWording);
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

// QR scanning — what it accepts, what it refuses, and what it will not claim.
//
// The optics are not testable here and are not pretended to be: a headless
// browser has no lens. What IS tested is everything between the decoded string
// and the answer shown to a person — which is where every security property
// of this feature lives. BarcodeDetector and getUserMedia are stubbed in the
// page so the camera lifecycle can be observed exactly.
//
// The claim under test, above all: a scan performed offline can never produce
// a stronger statement than the offline register supports.
//
// Run: npm run test:qr
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HARNESS = `<!doctype html><meta charset="utf-8"><title>qr</title><body>
<video id="cam"></video>
<script type="module">
import * as qr from '/js/shrs-qr-scan.js';
import * as cert from '/js/shrs-certificate-offline.js';
window.qr = qr; window.cert = cert;

// A stubbed camera that records exactly what happened to it, so "the stream
// is stopped" can be asserted rather than assumed.
window.__camera = { opened: 0, constraints: null, streams: [] };

// A REAL MediaStream, from a canvas. Using a plain object would not exercise
// the actual srcObject binding or a real track's shutdown — and the point of
// this block is to prove the camera is genuinely released, not that a stub
// method was called.
function realStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  canvas.getContext('2d').fillRect(0, 0, 32, 32);
  const s = canvas.captureStream(5);
  window.__camera.streams.push(s);
  return s;
}
window.liveTracks = () => window.__camera.streams
  .flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length;

// navigator.mediaDevices is a getter-only accessor, so it is replaced with a
// configurable own property rather than assigned to.
window.installCamera = (mode) => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, writable: true, value: {
    getUserMedia: async (c) => {
      window.__camera.constraints = c;
      if (mode === 'denied') { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; }
      window.__camera.opened += 1;
      return realStream();
    },
  } });
};
window.removeCamera = () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, writable: true, value: undefined });
};

window.installDecoder = (payloads) => {
  let i = 0;
  window.BarcodeDetector = class {
    constructor(opts) { window.__decoderFormats = opts && opts.formats; }
    async detect() {
      const p = payloads[Math.min(i, payloads.length - 1)];
      i += 1;
      if (p === null) return [];
      if (p === 'throw') throw new Error('bad frame');
      return [{ rawValue: p }];
    }
  };
};
window.removeDecoder = () => { delete window.BarcodeDetector; };

// A signed register with one valid and one revoked certificate, using a
// throwaway key generated here and discarded with the page.
window.buildRegister = async (real, revoked) => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const reg = {
    version: 1, issuedAt: Date.now(), keyId: 'qr-test', algorithm: 'Ed25519',
    entries: [
      { h: await cert.serialDigest(real), s: 'valid', d: '2026-08-08' },
      { h: await cert.serialDigest(revoked), s: 'revoked', d: '2026-08-08' },
    ],
  };
  const sig = await crypto.subtle.sign('Ed25519', pair.privateKey, cert.canonicalBytes(reg));
  window.__register = { ...reg, signature: btoa(String.fromCharCode(...new Uint8Array(sig))) };
  window.__keys = { 'qr-test': btoa(String.fromCharCode(...new Uint8Array(spki))) };
  return true;
};
window.ready = true;
</script></body>`;

function serve() {
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://127.0.0.1').pathname;
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

const REAL = 'SHRS-CERT-IBT-2026-000035-22C49';
const REVOKED = 'SHRS-CERT-IBT-2026-000037-22C49';

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nSHRS — scanning a certificate's QR code\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const context = await browser.newContext();
  const page = await context.newPage();
  let failed = false;

  try {
    await page.goto(origin + '/harness', { waitUntil: 'load' });
    await page.waitForFunction(() => window.ready, null, { timeout: 20000 });
    await page.evaluate(([a, b]) => window.buildRegister(a, b), [REAL, REVOKED]);
    check('harness ready with a signed register', true);

    // --- what a payload is allowed to be ----------------------------------
    console.log('\nReading the code');
    const reads = await page.evaluate(([real]) => ({
      ours: window.qr.referenceFrom('https://shroyalschools.com/verify-certificate/?ref=' + real),
      oursPath: window.qr.referenceFrom('https://shroyalschools.com/verify-certificate/' + real),
      bare: window.qr.referenceFrom(real),
      spaced: window.qr.referenceFrom('  ' + real + '  '),
      foreign: window.qr.referenceFrom('https://evil.example/verify-certificate/?ref=' + real),
      lookalike: window.qr.referenceFrom('https://shroyalschools.com.evil.example/?ref=' + real),
      junk: window.qr.referenceFrom('hello world'),
      empty: window.qr.referenceFrom(''),
      script: window.qr.referenceFrom('javascript:alert(1)'),
    }), [REAL]);
    check('a code carrying our verification URL resolves', reads.ours.outcome === 'resolved' && reads.ours.reference === REAL);
    check('the path form resolves too', reads.oursPath.outcome === 'resolved');
    check('a bare serial resolves', reads.bare.outcome === 'resolved');
    check('surrounding whitespace does not defeat it', reads.spaced.outcome === 'resolved');
    check('a code pointing at another origin is refused, not looked up',
      reads.foreign.outcome === 'not-ours' && reads.foreign.host === 'evil.example', reads.foreign.host);
    check('a look-alike hostname is refused', reads.lookalike.outcome === 'not-ours', reads.lookalike.host);
    check('unrelated text is unreadable, not guessed at', reads.junk.outcome === 'unreadable');
    check('an empty code is unreadable', reads.empty.outcome === 'unreadable');
    check('a javascript: payload is never treated as a reference', reads.script.outcome === 'unreadable');

    // --- offline: the claim can never strengthen ---------------------------
    console.log('\nScanned with no signal');
    const off = await page.evaluate(([real, revoked]) => Promise.all([
      window.qr.resolveScan(real, { online: false, register: window.__register, trustedKeys: window.__keys }),
      window.qr.resolveScan(revoked, { online: false, register: window.__register, trustedKeys: window.__keys }),
      window.qr.resolveScan('SHRS-CERT-IBT-2026-999999-00000', { online: false, register: window.__register, trustedKeys: window.__keys }),
      window.qr.resolveScan(real, { online: false, register: window.__register, trustedKeys: {} }),
    ]), [REAL, REVOKED]);
    check('an issued certificate reads as recorded, offline',
      off[0].mode === 'offline' && off[0].offline.state === 'recorded', off[0].offline.state);
    check('a withdrawn one reads as withdrawn', off[1].offline.state === 'revoked');
    check('an unknown one is "not in this register", not "forged"', off[2].offline.state === 'not-in-register');
    check('a register signed by an unpinned key is refused', off[3].offline.state === 'register-untrusted');
    check('NO offline scan reports genuine', off.every((o) => o.genuine === false),
      off.map((o) => o.offline.state).join(', '));
    check('and every one has a sentence a person can read',
      off.every((o) => o.description && o.description.title.length > 10));

    const strongest = off[0].description.title;
    check('the strongest offline wording stops short of a verdict',
      !/genuine|authentic|valid certificate/i.test(strongest), strongest);

    // --- online: it defers, it does not decide ----------------------------
    console.log('\nScanned with a connection');
    const on = await page.evaluate(([real]) =>
      window.qr.resolveScan(real, { online: true }), [REAL]);
    check('online, the scan hands off to the live endpoint', on.mode === 'online'
      && on.verifyUrl.includes('/api/certificates/verify'), on.verifyUrl);
    check('and still asserts nothing itself', on.genuine === false);

    // --- the camera --------------------------------------------------------
    console.log('\nThe camera');
    const noDecoder = await page.evaluate(async () => {
      window.removeDecoder(); window.installCamera('ok');
      const r = await window.qr.scan(document.getElementById('cam'), {});
      return { r, opened: window.__camera.opened };
    });
    check('with no decoder it says so, and never opens the camera',
      noDecoder.r.outcome === 'no-decoder' && noDecoder.opened === 0);

    const denied = await page.evaluate(async () => {
      window.installDecoder(['x']); window.installCamera('denied');
      const r = await window.qr.scan(document.getElementById('cam'), {});
      return { r, live: window.liveTracks() };
    });
    check('a refused camera is stated, not retried silently',
      denied.r.outcome === 'no-camera' && denied.r.reason === 'NotAllowedError', denied.r.reason);
    check('nothing is left running after a refusal', denied.live === 0);

    const noCam = await page.evaluate(async () => {
      window.installDecoder(['x']); window.removeCamera();
      const r = await window.qr.scan(document.getElementById('cam'), {});
      window.installCamera('ok');
      return r;
    });
    check('a device with no camera at all is handled', noCam.outcome === 'no-camera' && noCam.reason === 'unsupported');

    const scanned = await page.evaluate(async ([real]) => {
      window.__camera = { opened: 0, constraints: null, streams: [] };
      window.installCamera('ok');
      // Two empty frames, one unreadable frame, then the code.
      window.installDecoder([null, 'throw', null, 'https://shroyalschools.com/verify-certificate/?ref=' + real]);
      const r = await window.qr.scan(document.getElementById('cam'), {
        online: false, register: window.__register, trustedKeys: window.__keys, intervalMs: 5,
      });
      return {
        r,
        camera: { opened: window.__camera.opened, constraints: window.__camera.constraints, live: window.liveTracks() },
        formats: window.__decoderFormats,
        videoDetached: document.getElementById('cam').srcObject === null,
      };
    }, [REAL]);
    check('blank and unreadable frames are skipped, not treated as failures',
      scanned.r.outcome === 'resolved' && scanned.r.reference === REAL);
    check('the rear camera is requested',
      scanned.camera.constraints.video.facingMode.ideal === 'environment');
    check('only QR is asked for, not every barcode format',
      Array.isArray(scanned.formats) && scanned.formats.length === 1 && scanned.formats[0] === 'qr_code');
    check('the camera is stopped the moment a code is read — no live track remains',
      scanned.camera.opened === 1 && scanned.camera.live === 0,
      JSON.stringify(scanned.camera));
    check('the video element is detached from the stream', scanned.videoDetached);
    check('a scan taken offline is answered offline, and is not genuine',
      scanned.r.mode === 'offline' && scanned.r.genuine === false);

    const timedOut = await page.evaluate(async () => {
      window.__camera = { opened: 0, constraints: null, streams: [] };
      window.installCamera('ok'); window.installDecoder([null]);
      const r = await window.qr.scan(document.getElementById('cam'), { timeoutMs: 60, intervalMs: 5 });
      return { r, live: window.liveTracks(), opened: window.__camera.opened };
    });
    check('a scan that finds nothing gives up and releases the camera',
      timedOut.r.outcome === 'cancelled' && timedOut.opened === 1 && timedOut.live === 0);

    const foreignScan = await page.evaluate(async () => {
      window.installCamera('ok'); window.installDecoder(['https://evil.example/?ref=SHRS-CERT-IBT-2026-000035-22C49']);
      const r = await window.qr.scan(document.getElementById('cam'), { online: false, intervalMs: 5 });
      return { r, described: window.qr.describeScan(r, 'en'), ar: window.qr.describeScan(r, 'ar') };
    });
    check('a foreign code scanned from the camera is refused at the same gate',
      foreignScan.r.outcome === 'not-ours' && foreignScan.r.genuine === false);
    check('and is explained without accusing the certificate',
      /does not belong/i.test(foreignScan.described.title) && foreignScan.ar.title.length > 5,
      foreignScan.described.title);
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
  console.log('\nNot covered here, and not claimed: the optics. A headless browser');
  console.log('has no lens, so reading a real printed code from a real camera');
  console.log('remains REQUIRES EXTERNAL ACTION — a device test.');
  process.exit(failed || bad.length ? 1 : 0);
}

main();

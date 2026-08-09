#!/usr/bin/env node
/**
 * The ink map of a rendered certificate sheet — every element's box, in
 * millimetres on the 297x210 face, sorted down the page.
 *
 *     node scripts/measure-certificate-ink-map.mjs [TMH] [--free]
 *
 * WHY. Ornament on this sheet has to be placed into space that is actually
 * empty, and "actually empty" cannot be read off the source. The elements are
 * positioned in millimetres across two thousand lines of template, some boxes
 * are far wider than their ink, and the artwork underneath has ornament of its
 * own. Guessing produces the two failures this sheet cannot have: an ornament
 * that collides with type, or an ornament placed so timidly that it may as well
 * not be there.
 *
 * Both happened before this existed. The first Tamhīdiyyah regalia pass put
 * four corner brackets around the name band and they read as crop marks; the
 * halo behind the name was invisible against the plate. The second pass was
 * measured against this map — it found y 62–77 free at every x, which is where
 * the ceremonial rule now runs, and it fixed the cartouche's edges against the
 * intro line's real foot (100.6) and the body paragraph's real head (121.0).
 *
 * It reads a DESIGN PROOF, so it signs nothing and needs no key.
 *
 * `--free` additionally prints the horizontal bands that no element occupies —
 * the shortlist of places an ornament can go.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const CODE = (process.argv[2] || 'TMH').toUpperCase();
const WANT_FREE = process.argv.includes('--free');
const PROOF = `dist/certificate-proofs/proof-${CODE}-`;

const MIME = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const ROOT = resolve('.');
const srv = createServer((q, r) => {
  let body; let p;
  try { p = resolve(ROOT, `.${decodeURIComponent(q.url.split('?')[0])}`); body = readFileSync(p); }
  catch { r.writeHead(404); r.end('x'); return; }
  r.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const { readdirSync } = await import('node:fs');
let file;
try {
  file = readdirSync('dist/certificate-proofs')
    .filter((f) => f.startsWith(`proof-${CODE}-`) && f.endsWith('.html'))[0];
} catch { /* handled below */ }
if (!file) {
  console.error(`  No proof for ${CODE}. Render one first:\n`
    + `    node scripts/proof-certificate-design.mjs ${CODE}\n`);
  srv.close(); process.exit(2);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/dist/certificate-proofs/${file}`, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
const out = await page.evaluate(() => {
  const sheet = document.querySelector('.sheet');
  const s = sheet.getBoundingClientRect();
  const MM = s.width / 297;
  const rows = [];
  for (const el of sheet.querySelectorAll('*')) {
    if (el.closest('svg')) continue;                         // svg internals
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cls = (el.className && el.className.toString ? el.className.toString() : '')
      .split(' ')[0] || el.tagName.toLowerCase();
    // Full-bleed layers occupy the whole face and say nothing about free space.
    if (/official-bg|official-paper|frame|o5-plate|tmh-/.test(cls)) continue;
    rows.push({ c: cls,
      x: +((r.left - s.left) / MM).toFixed(1), y: +((r.top - s.top) / MM).toFixed(1),
      w: +(r.width / MM).toFixed(1), h: +(r.height / MM).toFixed(1) });
  }
  return rows;
});
await browser.close(); srv.close();

console.log(`\n  INK MAP — ${CODE}, 297 x 210mm, ${out.length} element boxes\n`);
for (const r of out.sort((a, b) => a.y - b.y)) {
  console.log(`    y ${String(r.y).padStart(6)}–${String((r.y + r.h).toFixed(1)).padStart(6)}`
    + `   x ${String(r.x).padStart(6)}–${String((r.x + r.w).toFixed(1)).padStart(6)}   ${r.c}`);
}

if (WANT_FREE) {
  // Horizontal bands no element touches at any x. The regalia's own layers are
  // excluded above, so re-running after adding one still reports the ground it
  // was placed into rather than reporting itself as occupied.
  const busy = new Array(2101).fill(false);          // 0.1mm resolution
  for (const r of out) {
    for (let t = Math.floor(r.y * 10); t <= Math.ceil((r.y + r.h) * 10); t += 1) {
      if (t >= 0 && t < busy.length) busy[t] = true;
    }
  }
  console.log('\n  FREE HORIZONTAL BANDS (no element at any x, ≥3mm tall)\n');
  let run = -1;
  for (let t = 0; t <= busy.length; t += 1) {
    if (t < busy.length && !busy[t]) { if (run < 0) run = t; continue; }
    if (run >= 0) {
      const lo = run / 10; const hi = (t - 1) / 10;
      if (hi - lo >= 3) console.log(`    y ${lo.toFixed(1).padStart(6)}–${hi.toFixed(1).padStart(6)}`
        + `   ${(hi - lo).toFixed(1)}mm`);
      run = -1;
    }
  }
  console.log();
}

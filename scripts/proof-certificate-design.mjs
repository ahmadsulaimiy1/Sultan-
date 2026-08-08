#!/usr/bin/env node
/**
 * Design proof for one stage certificate — the artwork, and nothing else.
 *
 *     node scripts/proof-certificate-design.mjs TMH [--out <dir>]
 *
 * WHAT THIS IS FOR. Certificate artwork cannot be judged from source. It is a
 * 297x210mm engraved sheet whose elements are placed to a tenth of a
 * millimetre, and the only way to know whether an ornament collides with a
 * rule, or a rosette shows through a name, is to render it and look.
 *
 * WHAT THIS IS NOT. It is NOT an issuance. It signs nothing, it consumes no
 * certificate number, it touches no register, and it cannot be turned into a
 * certificate by anyone downstream:
 *
 *   · Every identifier on the sheet reads SPECIMEN or is visibly zeroed. No
 *     serial, no content hash, no verification code, no document ID and no
 *     archive reference on a proof has ever been issued or ever will be.
 *   · The QR encodes the proof's own dead URL, not a verification endpoint.
 *   · SPECIMEN — NOT A CERTIFICATE is struck across the face in a weight that
 *     survives photocopying, and repeated in the foot rule.
 *   · The Student ID is a real one, because the layout has to be judged at the
 *     real digit count. It appears under the SPECIMEN mark like everything else.
 *
 * The distinction matters more here than almost anywhere in this repository.
 * A signed certificate is a permanent institutional record; a design proof is
 * a picture of one. Producing the second must never be a way of accidentally
 * producing the first, so this file deliberately cannot reach the signing code
 * at all — it never imports it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

import { PROGRAMMES, formatHijri } from '../functions/_lib/certificate-serial.js';
import { renderStageCertificate } from '../functions/_lib/stage-certificate-template.js';
import { qrSvgForPrint } from '../functions/_lib/qrcode.js';
import { rollFor } from './_lib/class-of-2026.mjs';

const CODE = (process.argv[2] || 'TMH').toUpperCase();
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : 'dist/certificate-proofs';

const roll = rollFor(CODE);
if (!roll.length) { console.error(`no roll for ${CODE}`); process.exit(2); }
if (!PROGRAMMES[CODE]) { console.error(`no programme wording for ${CODE}`); process.exit(2); }

const ISSUED_AT = '2026-08-08';
// Every one of these is a non-value, and it has to LOOK like a serial without
// BEING one, because the renderer refuses to engrave a number that is not in
// the issuable format — correctly: a sheet that prints a blank where its number
// belongs is worse than no sheet.
//
// So the proof uses the format's null: sequence 000000, which the global
// sequence starts past and has never issued, and check tail 00000, which is a
// 20-bit-improbable hash head. Neither resolves to a record, and the SPECIMEN
// overprint says so in words on the face.
const specimen = (s) => ({
  serial_no: `SHRS-CERT-${CODE}-${ISSUED_AT.slice(0, 4)}-000000-00000`,
  content_hash: '0'.repeat(64),
  student_identity_no: s.identityNo,
  student_full_name: s.en,
  student_full_name_ar: s.ar,
  student_sex: s.sex,
  programme_code: CODE,
  programme_label_en: PROGRAMMES[CODE].labelEn,
  programme_label_ar: PROGRAMMES[CODE].labelAr,
  academic_year: '2025/2026',
  place_en: 'Ikorodu, Lagos, Nigeria',
  place_ar: 'إكورودو، لاغوس، نيجيريا',
  issued_at: ISSUED_AT,
  issued_at_hijri: formatHijri(ISSUED_AT, 'en'),
  issued_at_hijri_ar: formatHijri(ISSUED_AT, 'ar'),
});

// Struck across the face, and again in the foot. Two marks rather than one
// because a single diagonal can be cropped off a photograph of the sheet.
const MARK = `<style>
  .sheet::after{content:"SPECIMEN — NOT A CERTIFICATE";position:absolute;
    left:0;right:0;top:96mm;text-align:center;z-index:99;
    font:700 30pt/1 Georgia,serif;letter-spacing:8px;color:rgba(150,32,32,.30);
    transform:rotate(-19deg);transform-origin:50% 50%;pointer-events:none;}
  .sheet::before{content:"DESIGN PROOF · NOT ISSUED · NO SERIAL · NOT VERIFIABLE · SPECIMEN";
    position:absolute;left:0;right:0;bottom:2.4mm;text-align:center;z-index:99;
    font:700 6pt/1 Georgia,serif;letter-spacing:3px;color:rgba(150,32,32,.62);}
</style>`;

mkdirSync(OUT, { recursive: true });
const pages = roll.map((s) => {
  const cert = specimen(s);
  const html = renderStageCertificate({
    cert,
    // A dead link. It resolves to nothing and is not the verification host.
    qrSvgMarkup: qrSvgForPrint('https://example.invalid/specimen',
      { width: 208, margin: 2, errorCorrectionLevel: 'H' }),
    verifyUrl: 'https://example.invalid/specimen',
  }).replace('</head>', `${MARK}</head>`);
  const file = join(OUT, `proof-${CODE}-${s.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`);
  writeFileSync(file, html);
  return { file, name: s.en };
});

// Served over HTTP, not file://, so /assets/... resolve exactly as they do in
// the press pipeline. A 404 here is a missing asset on the real sheet too, so
// it is a hard failure rather than a blank rectangle nobody notices.
const MIME = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const ROOT = resolve('.');
const missing = [];
const server = createServer((req, res) => {
  const p = resolve(ROOT, `.${decodeURIComponent(req.url.split('?')[0])}`);
  try {
    if (!p.startsWith(ROOT)) throw new Error('outside root');
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    // /favicon.ico is requested by the browser itself, not by the sheet. It is
    // not an asset of the certificate and its absence says nothing about the
    // press file, so it is not counted as a missing asset.
    if (req.url !== '/favicon.ico') missing.push(req.url);
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
for (const p of pages) {
  await page.goto(`${base}/${p.file}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const el = await page.$('.sheet');
  const png = p.file.replace(/\.html$/, '.png');
  await el.screenshot({ path: png });
  console.log(`  ${p.name}  →  ${png}`);
}
await browser.close();
server.close();

if (missing.length) {
  console.error(`\n  ${missing.length} asset(s) 404ed — they are missing from the real sheet too:`);
  for (const m of [...new Set(missing)]) console.error(`    ${m}`);
  process.exit(1);
}
console.log('\n  Design proofs only. Nothing here is signed, numbered or verifiable.\n');

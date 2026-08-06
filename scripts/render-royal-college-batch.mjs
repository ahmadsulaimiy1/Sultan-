#!/usr/bin/env node
/**
 * Press-artefact producer for the Royal College graduation batch.
 *
 *     node scripts/render-royal-college-batch.mjs <batch-dir> [--out <dir>] [--dpi 600]
 *
 * Writes, from the HTML already sitting in <batch-dir>:
 *
 *   SHRS-JSS-<year>-<first>-<last>-press.pdf     the press file, one page per sheet
 *   <seq>-<slug>-<dpi>dpi.png                    one proof raster per sheet
 *
 * The sheets reference /assets/… absolutely — fonts, crests, the Chairman's
 * signature — so they are served over a real HTTP root rather than opened from
 * file://. A file:// render silently drops every one of those and produces a
 * plausible-looking PDF of a document missing its typefaces and its emblems.
 * That has happened in this repository before, which is why the check below
 * refuses to write a proof whose fonts did not load.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const batchDir = resolve(args[0] || '');
if (!batchDir || !existsSync(batchDir)) {
  console.error('usage: node scripts/render-royal-college-batch.mjs <batch-dir> [--out <dir>] [--dpi 600]');
  process.exit(1);
}
const outDir = resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : batchDir);
const DPI = Number(args.includes('--dpi') ? args[args.indexOf('--dpi') + 1] : 600);
if (![150, 200, 300, 400, 600, 1200].includes(DPI)) {
  console.error(`--dpi ${DPI} is not one of 150/200/300/400/600/1200`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// The sheet, from the stylesheet the certificates are set in
// (.sheet{width:297mm;height:210mm}) — true A4 landscape, unlike the v1.0
// master's 297 x 209.5.
const SHEET_W_MM = 297;
const SHEET_H_MM = 210;
const CSS_PX_PER_MM = 96 / 25.4;
const CSS_W = Math.round(SHEET_W_MM * CSS_PX_PER_MM);   // 1123
const CSS_H = Math.round(SHEET_H_MM * CSS_PX_PER_MM);   // 794
const SCALE = DPI / 96;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

// Every asset the page asks for is logged, so a 404 on a font or a crest is a
// hard failure rather than a silently thinner-looking proof.
const missing = new Set();
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const candidates = [join(ROOT, url), join(batchDir, url.replace(/^\/sheet\//, ''))];
  for (const p of candidates) {
    if (existsSync(p) && statSync(p).isFile()) {
      res.writeHead(200, { 'content-type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
      res.end(readFileSync(p));
      return;
    }
  }
  // /favicon.ico is the browser asking on its own account, not the sheet
  // asking. Counting it would make every clean run report a failure.
  if (url !== '/favicon.ico') missing.add(url);
  res.writeHead(404); res.end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const sheets = readdirSync(batchDir).filter((f) => /^\d{6}-.*\.html$/.test(f)).sort();
const printFile = readdirSync(batchDir).find((f) => /-print\.html$/.test(f));
if (!sheets.length) { console.error(`no per-student sheets in ${batchDir}`); process.exit(1); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ── The press PDF ───────────────────────────────────────────────────────────
// preferCSSPageSize is the only print setting that takes the page size from the
// sheet's own @page{size:A4 landscape;margin:0}; stating the size in the call
// instead produces a different box.
if (printFile) {
  const page = await browser.newPage();
  await page.goto(`${base}/dist/certificates/${batchDir.split('/').pop()}/${printFile}`,
    { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({
    preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  const name = printFile.replace(/-print\.html$/, '-press.pdf');
  writeFileSync(join(outDir, name), pdf);
  console.log(`  ${name}  ${(pdf.length / 1024 / 1024).toFixed(2)} MB  ${sheets.length} pages`);
  await page.close();
}

// ── The proof rasters ───────────────────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: CSS_W, height: CSS_H }, deviceScaleFactor: SCALE });
for (const f of sheets) {
  await page.goto(`${base}/dist/certificates/${batchDir.split('/').pop()}/${f}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: CSS_W, height: CSS_H } });
  const name = `${f.replace(/\.html$/, '')}-${DPI}dpi.png`;
  writeFileSync(join(outDir, name), png);
  console.log(`  ${name}  ${(png.length / 1024).toFixed(0)} KB`);
}
await browser.close();
server.close();

if (missing.size) {
  console.error(`\nRENDER REJECTED — ${missing.size} asset(s) the sheets asked for were not served:`);
  for (const u of missing) console.error(`  404  ${u}`);
  console.error('\n  A proof missing its fonts, crests or signature is not a proof.\n');
  process.exit(1);
}

console.log(`\n  ${sheets.length} sheets at ${DPI} DPI `
  + `(${Math.round(CSS_W * SCALE)} x ${Math.round(CSS_H * SCALE)} px over ${SHEET_W_MM} x ${SHEET_H_MM}mm)`);
console.log(`  → ${outDir}\n`);

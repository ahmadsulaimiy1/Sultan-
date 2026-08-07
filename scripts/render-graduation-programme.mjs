#!/usr/bin/env node
/**
 * Press artefacts for the Graduation Ceremony Programme.
 *
 *     node scripts/render-graduation-programme.mjs
 *
 * Writes the press PDF and one proof raster per leaf from the HTML the builder
 * produced. The sheet references /assets/… absolutely — fonts, crest,
 * photographs — so it is served over a real HTTP root rather than opened from
 * file://, and any asset the page asks for and does not get is a hard failure.
 * A proof missing its typefaces is not a proof.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const DIR = 'dist/graduation-programme';
const NAME = 'SHRS-Graduation-Programme-2026';
const PAGES = 4;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const missing = new Set();
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const p = join(ROOT, url);
  if (existsSync(p) && statSync(p).isFile()) {
    res.writeHead(200, { 'content-type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(p));
    return;
  }
  // The browser asks for /favicon.ico on its own account; the sheet does not.
  if (url !== '/favicon.ico') missing.add(url);
  res.writeHead(404); res.end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await page.goto(`${base}/${DIR}/${NAME}.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const pdf = await page.pdf({
  preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
});
writeFileSync(join(DIR, `${NAME}.pdf`), pdf);
console.log(`  ${NAME}.pdf  ${(pdf.length / 1024).toFixed(0)} KB`);

// One full-height capture, then one file per leaf: clipping below the fold
// needs the whole page in hand first.
for (let i = 0; i < PAGES; i += 1) {
  const png = await page.screenshot({
    fullPage: true, clip: { x: 0, y: i * 1123, width: 794, height: 1123 },
  });
  writeFileSync(join(DIR, `page-${i + 1}.png`), png);
}
await browser.close();
server.close();

if (missing.size) {
  console.error(`\nRENDER REJECTED — ${missing.size} asset(s) the sheet asked for were not served:`);
  for (const u of missing) console.error(`  404  ${u}`);
  process.exit(1);
}
console.log(`  ${PAGES} proof rasters at 192 DPI\n  → ${DIR}\n`);

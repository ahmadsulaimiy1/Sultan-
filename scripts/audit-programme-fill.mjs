#!/usr/bin/env node
/**
 * Measure how much of each panel's live area the CONTENT occupies.
 *
 *     node scripts/audit-programme-fill.mjs
 *
 * Axis 3 of the Editorial Bible: "Every panel fills 88–96% of its live area.
 * No wall of type, no hand's width of blank paper." That was being read by
 * eye; this measures it, so the figure in the score is a measurement.
 *
 * Fill is the vertical extent of the content — first line of type or top of
 * the first plate, down to the last — over the height of the live area. It is
 * deliberately NOT measured off the rendered raster: every panel carries a
 * frame, corner marks and engine-turned bands that run the full height, so a
 * pixel reading says 100% for all twelve and tells you nothing. What matters
 * is where the type starts and stops, so that is what is measured, in the
 * page, from the boxes the browser actually laid out.
 *
 * Furniture is excluded by construction: only elements that carry their own
 * text, or are plates, are counted. A gold rule is not content.
 *
 * Exits non-zero if any panel falls outside the band. Called by the release gate.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const DIR = 'dist/graduation-programme';
const NAME = 'SHRS-Graduation-Programme-2026';
const BAND = [0.88, 0.96];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]));
  if (existsSync(p) && statSync(p).isFile()) {
    res.writeHead(200, { 'content-type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(p));
  } else { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1145, height: 816 } });
await page.goto(`${base}/${DIR}/${NAME}.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const panels = await page.evaluate(() => {
  const MM = 96 / 25.4;
  const HEAD = 9 * MM, FOOT = 8 * MM, BLEED = 3 * MM;

  return [...document.querySelectorAll('.panel')].map((panel, i) => {
    const box = panel.getBoundingClientRect();

    // Content is anything carrying its own text, plus the plates. Frames,
    // corners, rules, lathes and crop marks carry none and are ignored.
    const carriers = [...panel.querySelectorAll('*')].filter((el) => {
      if (el.matches('svg, svg *')) return false;
      // The running folio sits in the foot margin by design, below the live
      // area. Counting it puts every panel over 100% and measures nothing.
      if (el.closest('.fol')) return false;
      if (el.matches('figure, figure *, img')) return el.matches('figure');
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join('');
      return own.length > 0;
    });

    let top = Infinity;
    let bottom = -Infinity;
    for (const el of carriers) {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) continue;
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!Number.isFinite(top)) return { index: i, fill: 0 };

    const liveTop = box.top + BLEED + HEAD;
    const liveBottom = box.bottom - BLEED - FOOT;
    const live = liveBottom - liveTop;

    return { index: i, fill: (bottom - top) / live };
  });
});

await browser.close();
server.close();

const NAMES = [
  'welcome flap', 'back', 'face',
  'the Chief Host', 'the Lecture', 'order of proceedings',
  'distinguished guests', 'the Digital Campus', 'insert face',
  'graduands I', 'graduands II', 'graduands III',
];

console.log('\n  panel fill — content extent over live area, band 88–96%\n');
const outside = [];
for (const { index, fill } of panels) {
  const side = Math.floor(index / 3) + 1;
  const inBand = fill >= BAND[0] && fill <= BAND[1];
  if (!inBand) outside.push({ index, fill });
  console.log(`  side ${side} panel ${index % 3 + 1}  ${(fill * 100).toFixed(1).padStart(5)}%`
    + `${inBand ? '   ' : '  <'} ${NAMES[index] || ''}`);
}

if (outside.length) {
  console.log(`\n  ${outside.length} panel(s) outside the band:`);
  for (const { index, fill } of outside) {
    const short = fill < BAND[0];
    console.log(`    ${NAMES[index]} — ${(fill * 100).toFixed(1)}%, `
      + `${short ? 'short of 88%' : 'over 96%'}`);
  }
  process.exit(1);
}
console.log('\n  all twelve panels inside the band');

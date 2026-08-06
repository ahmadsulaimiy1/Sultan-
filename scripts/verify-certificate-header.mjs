/**
 * Ink-separation gate for the institutional header.
 *
 *     node scripts/verify-certificate-header.mjs <sheet-url>
 *
 * The header's six lines alternate Arabic and English, and the risk is not
 * clipping — CSS overflow is visible, nothing gets cut — but one line's ink
 * touching the next. Amiri's descenders reach well below the baseline, so an
 * Arabic line sitting above an English one is the tight case, and a leading
 * change that looks harmless in the box model can close it to nothing.
 *
 * That is exactly what happened: a first attempt at compacting this block took
 * the Arabic-to-English gap to -0.09mm, and the setting BEFORE that attempt was
 * already at 0.18mm, which fills in on press. Neither was visible in the
 * element geometry; both are obvious in the ink.
 *
 * So this measures ink, and it measures it per line. Scanning the whole column
 * for ink bands does not work — an Arabic line's dots and hamza sit clear of
 * its body and register as a band of their own, which reports 7 bands for 6
 * lines. Each line is rendered ALONE, with the others made transparent, and
 * its own ink extent read off the pixels.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const URL = process.argv[2];
if (!URL) throw new Error('usage: verify-certificate-header.mjs <sheet-url>');

// 0.55mm is the floor: below it the two inks bridge under normal dot gain and
// the pair reads as one smudged line at 300 DPI.
const MIN_GAP_MM = 0.55;
const SCALE = 6;                       // deviceScaleFactor for the ink render
const MMPP = 25.4 / (96 * SCALE);
const TMP = '/tmp/hdr-line.png';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await (await browser.newContext({
  viewport: { width: 1200, height: 900 }, deviceScaleFactor: SCALE,
})).newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const hasHeader = await page.$('.ihdr-ng');
if (!hasHeader) {
  console.log('no institutional header on this sheet — nothing to check');
  await browser.close();
  process.exit(0);
}

// Strip the plate and the emblems so only the type is inked.
await page.evaluate(() => {
  document.querySelectorAll('.sheet > *:not(.ihdr)').forEach((e) => { e.style.visibility = 'hidden'; });
  document.querySelectorAll('.ihdr-badge').forEach((e) => { e.style.visibility = 'hidden'; });
  document.querySelector('.sheet').style.background = '#fff';
});

const LINES = await page.$$eval('.ihdr-ng > div:not(.ihdr-badge)',
  (els) => els.map((e) => e.textContent.trim()));

async function inkExtent(i) {
  await page.evaluate((idx) => {
    document.querySelectorAll('.ihdr-ng > div:not(.ihdr-badge)')
      .forEach((e, k) => { e.style.color = k === idx ? '' : 'transparent'; });
  }, i);
  writeFileSync(TMP, await (await page.$('.ihdr-ng')).screenshot());
  return JSON.parse(execFileSync('python3', ['-c', `
import json
import numpy as np
from PIL import Image
a = np.asarray(Image.open(${JSON.stringify(TMP)}).convert('RGBA')).astype(float)
ink = ((a[...,:3].mean(2) < 200) & (a[...,3] > 20)).any(1)
ys = np.flatnonzero(ink)
print(json.dumps([int(ys.min()), int(ys.max())] if ys.size else [-1, -1]))
`]).toString()).map((v) => v * MMPP);
}

const extents = [];
for (let i = 0; i < LINES.length; i++) extents.push(await inkExtent(i));
await browser.close();

console.log(`\nInstitutional header — ink separation (${LINES.length} lines)\n`);
let fails = 0;
for (let i = 0; i < LINES.length; i++) {
  const [top, bot] = extents[i];
  const gap = i === 0 ? null : top - extents[i - 1][1];
  const verdict = gap === null ? '' : (gap >= MIN_GAP_MM ? 'PASS' : 'FAIL');
  if (verdict === 'FAIL') fails++;
  console.log(`  ${gap === null ? '     ' : `${gap.toFixed(2)}mm`.padStart(7)} ${verdict.padEnd(5)}`
    + `ink ${top.toFixed(2)}..${bot.toFixed(2)}mm   ${LINES[i].slice(0, 40)}`);
}
const depth = extents[extents.length - 1][1] - extents[0][0];
console.log(`\n  block ink depth ${depth.toFixed(2)}mm`);
console.log(fails
  ? `\n${fails} pair(s) closer than the ${MIN_GAP_MM}mm floor — this will fill in on press.`
  : `\nall pairs clear the ${MIN_GAP_MM}mm floor.`);
process.exit(fails ? 1 : 0);

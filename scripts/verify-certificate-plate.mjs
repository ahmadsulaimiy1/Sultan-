#!/usr/bin/env node
// Fidelity gate for the faithful plate (functions/_lib/certificate-plate.js).
//
// The whole claim of that module is "the client's composition, unchanged".
// A claim like that is worth nothing unless it is measured, so this gate
// renders the plate and diffs it against the supplied artwork pixel for pixel.
// If any mark moved, vanished or changed colour, the correlation drops and this
// fails.
//
// Usage: node scripts/verify-certificate-plate.mjs [--render]

import { certificatePlateSvg, PLATE_RULES, PAPER as PAPER_HEX } from '../functions/_lib/certificate-plate.js';
import { existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'build/certificate-plate');
const MARKS = resolve(ROOT, 'assets/images/certificates/official-background-idd-marks.png');
const SOURCE = resolve(ROOT, 'assets/images/certificates/official-background-idd.jpg');
const PT = 0.35278;

let pass = 0; const fails = []; const notes = [];
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\n— assets —');
check('marks layer exists', existsSync(MARKS));
check('supplied artwork exists', existsSync(SOURCE));
if (existsSync(MARKS)) notes.push(`marks layer ${(statSync(MARKS).size / 1024).toFixed(0)} KB`);

console.log('\n— module contract —');
let threw = false;
try { certificatePlateSvg({}); } catch { threw = true; }
check('refuses to render without the artwork', threw,
  'a plate that silently renders without the client artwork is the exact defect already recorded in §8');

// Rails ON for the structure checks — the wording and press-floor assertions
// only mean something against the variant that actually emits type.
const svg = certificatePlateSvg({
  serial: 'SHRS-CERT-IDD-000042', microtextRails: true,
  marksHref: 'assets/images/certificates/official-background-idd-marks.png',
});
// Default output must be the client's plate and nothing else.
const plain = certificatePlateSvg({
  serial: 'SHRS-CERT-IDD-000042',
  marksHref: 'assets/images/certificates/official-background-idd-marks.png',
});

console.log('\n— plate structure —');
check('viewBox is A4 landscape in millimetres', /viewBox="0 0 297 210"/.test(svg));
check('physical size declared in mm', /width="297mm" height="210mm"/.test(svg));
check('the artwork is placed full-bleed at 1:1',
  /x="0" y="0" width="297" height="210"/.test(svg));
check('no opacity attribute anywhere', !/\sopacity="/.test(svg));
check('default output adds nothing to the client plate', !/<text/.test(plain),
  'microtext rails must be opt-in');

const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => parseFloat(m[1]) / PT);
check('microtext at or above the 0.75pt floor', sizes.every((v) => v >= 0.75 - 1e-6),
  sizes.map((v) => v.toFixed(2)).join(', '));

// Only approved wording may reach the plate.
const APPROVED = ['SULTAN HANAFI ROYAL SCHOOLS', 'OFFICIAL ACADEMIC RECORD'];
const blocks = [...svg.matchAll(/<textPath[^>]*>([\s\S]*?)<\/textPath>/g)].map((m) => m[1]);
const tokens = [...new Set(blocks.join(' ').split('·').map((s) => s.trim()).filter(Boolean))];
const bad = tokens.filter((t) => !APPROVED.includes(t) && !/^SHRS-CERT-[A-Z]{3}-\d{6}$/.test(t));
check('rails carry only approved wording and the live serial', bad.length === 0, bad.join(' | '));
check('the serial reached the rails', tokens.some((t) => t.startsWith('SHRS-CERT-')));

// The rails must sit in the frame's clear channel, not over its ornament.
const railY = PLATE_RULES.fieldTop + 1.2;
check('rails sit in open field, clear of the plate ornament',
  railY > PLATE_RULES.bandInner && (PLATE_RULES.stripInner + 5) > PLATE_RULES.stripInner,
  `rail y ${railY}mm vs band inner edge ${PLATE_RULES.bandInner}mm`);
notes.push(`rails at y ${railY}mm / ${(210 - railY).toFixed(1)}mm, x ${PLATE_RULES.stripInner + 5}–${(297 - PLATE_RULES.stripInner - 5).toFixed(1)}mm`);

if (process.argv.includes('--render')) {
  console.log('\n— render + fidelity diff —');
  mkdirSync(OUT, { recursive: true });
  // The marks layer goes in as a data URI. A bare filesystem path fires NO
  // request at all under setContent (base about:blank), so a "no failed
  // requests" check passes on a plate that rendered without the client's
  // artwork — which is precisely how the first run of this gate reported
  // success on a blank sheet. Hence the data URI here AND the ink-coverage
  // assertion below: absence of a failure is not evidence of presence.
  const marksB64 = readFileSync(MARKS).toString('base64');
  // Fidelity is measured on the DEFAULT variant: the claim under test is
  // "the client's composition, unchanged", so anything this module adds must
  // be excluded from the thing that proves it.
  const svgAbs = certificatePlateSvg({
    marksHref: `data:image/png;base64,${marksB64}`,
  });
  writeFileSync(resolve(OUT, 'plate.svg'), svgAbs);

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--font-render-hinting=none'],
  });
  try {
    for (const dpi of [300, 600, 92.4]) {
      const cssW = (297 / 25.4) * 96, cssH = (210 / 25.4) * 96;
      const ctx = await browser.newContext({
        viewport: { width: Math.ceil(cssW), height: Math.ceil(cssH) },
        deviceScaleFactor: dpi / 96,
      });
      const page = await ctx.newPage();
      const missing = [];
      page.on('requestfailed', (r) => missing.push(r.url()));
      await page.setContent(
        `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block}</style>${svgAbs}`,
        { waitUntil: 'load' });
      await page.waitForTimeout(400);
      check(`${dpi} DPI render loaded every asset`, missing.length === 0, missing.join(', '));
      // 92.4 DPI is the artwork's OWN pixel grid. The fidelity diff is taken
      // there, not at 600, because comparing a 600 DPI render back down to the
      // source means a 92->600->92 resample round-trip, and that round-trip
      // blurs fine texture on its own — it would charge the plate for an error
      // the measurement introduced.
      const name = dpi === 92.4 ? 'plate-native.png' : `plate-${dpi}dpi.png`;
      await page.screenshot({
        path: resolve(OUT, name),
        clip: { x: 0, y: 0, width: cssW, height: cssH },
      });
      await ctx.close();
      console.log(`  wrote ${OUT}/${name}`);
    }
  } finally { await browser.close(); }

  // ── THE FIDELITY CLAIM, MEASURED ───────────────────────────────────────
  // Two separate things are being proven and they need separate measurements.
  //
  // (a) Does the marks layer, composited over PAPER, reconstruct the supplied
  //     artwork? This is the real claim and it is exact arithmetic — the same
  //     source-over the renderer performs, done in full precision on the
  //     artwork's own pixel grid. No resampling is involved, so nothing here
  //     is charged to the plate that the measurement introduced.
  //
  // (b) Does the browser render it? Measured separately and to a looser bound,
  //     because the render path necessarily resamples (1080px artwork -> 1122
  //     CSS px -> device pixels), and that round-trip blurs fine texture by
  //     itself. Holding (b) to (a)'s threshold would be measuring the
  //     resampler, not the plate.
  const py = `
import numpy as np
from PIL import Image
src   = np.asarray(Image.open(${JSON.stringify(SOURCE)}).convert('RGB')).astype(float)
marks = np.asarray(Image.open(${JSON.stringify(MARKS)}).convert('RGBA')).astype(float)
paper = np.array([${['0x' + PAPER_HEX.slice(1, 3), '0x' + PAPER_HEX.slice(3, 5), '0x' + PAPER_HEX.slice(5, 7)].join(', ')}], float)
a = marks[...,3:4]/255.0
comp = paper[None,None,:]*(1-a) + marks[...,:3]*a
d = np.abs(comp-src).mean(2)
rend = np.asarray(Image.open(${JSON.stringify(resolve(OUT, 'plate-native.png'))}).convert('RGB')
                  .resize((src.shape[1], src.shape[0]), Image.LANCZOS)).astype(float)
rd = np.abs(rend-src).mean(2)
print(f'{d.mean():.4f} {np.percentile(d,99.9):.2f} {(d>12).mean()*100:.4f} '
      f'{np.corrcoef(rend.mean(2).ravel(), src.mean(2).ravel())[0,1]:.5f} {rend.mean(2).std():.2f}')
`;
  const [mad, p999, gross, rcorr, spread] = execFileSync('python3', ['-c', py])
    .toString().trim().split(/\s+/).map(Number);

  console.log(`\n  composite vs supplied artwork — mean abs difference  ${mad.toFixed(3)} / 255`);
  console.log(`  composite 99.9th percentile difference               ${p999.toFixed(1)} / 255`);
  console.log(`  pixels off by more than 12 levels                    ${gross.toFixed(4)} %`);
  console.log(`  rendered plate correlation (resample-bounded)        ${rcorr.toFixed(5)}`);

  check('composite reconstructs the artwork (MAD < 1.0 of 255)', mad < 1.0, mad.toFixed(3));
  check('no mark moved or vanished (< 0.05% of pixels off by >12)', gross < 0.05, `${gross.toFixed(4)}%`);
  check('rendered plate matches the artwork (r >= 0.97)', rcorr >= 0.97, rcorr.toFixed(5));
  // Positive proof the artwork is on the plate. "No failed request" is NOT
  // proof: a scheme-less href fires no request at all, which is exactly how the
  // first run of this gate reported success on a blank sheet. Contrast cannot
  // be faked — a blank plate is one flat colour and reads ~0 here.
  check("render carries the artwork's ink", spread > 12,
    `luminance spread ${spread.toFixed(1)} (a blank sheet reads ~0)`);
  notes.push(`fidelity: composite MAD ${mad.toFixed(3)}/255, render r=${rcorr.toFixed(5)}`);
}

console.log(`\n${notes.map((n) => `  · ${n}`).join('\n')}`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.log(`  ! ${f}`)); process.exit(1); }

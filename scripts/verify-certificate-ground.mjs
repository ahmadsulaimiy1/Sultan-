#!/usr/bin/env node
// Press gate for the vector ground (functions/_lib/certificate-ground.js).
//
// This exists because the first draft of that file shipped two colour strings
// that were not colours at all ("#D8B css", "#C6B punkt"). An SVG with a bad
// paint does not throw — the renderer silently drops that paint and draws
// nothing, so the plate would have gone to the printer missing a gradient and
// a whole security screen with every visual check still "passing". Every
// assertion below is therefore mechanical: parsed out of the emitted SVG, not
// eyeballed on a render.
//
// Usage: node scripts/verify-certificate-ground.mjs [--render]

import { certificateGroundSvg } from '../functions/_lib/certificate-ground.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'build/certificate-ground');

const PT = 0.35278;
const SCREEN_FLOOR_MM = 0.07;   // finest line a commercial press holds on coated
const MICRO_FLOOR_PT = 0.75;    // finest type that still carries information

let pass = 0;
const fails = [];
const notes = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const svg = certificateGroundSvg({ serial: 'SHRS-CERT-IDD-000042' });

console.log(`\nGround plate: ${svg.length.toLocaleString()} bytes of SVG\n`);
console.log('— paint validity —');

// 1. Every paint is either a real 6-digit hex or a url() that resolves.
const defined = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const paints = [...svg.matchAll(/\b(?:stroke|fill|stop-color)="([^"]*)"/g)].map((m) => m[1]);
const bad = [...new Set(paints.filter((p) =>
  p !== 'none' && !/^#[0-9A-Fa-f]{6}$/.test(p) && !/^url\(#[^)]+\)$/.test(p)))];
check('every paint is a valid hex or url() reference', bad.length === 0, bad.join(', '));

const refs = [...new Set(paints.filter((p) => p.startsWith('url(')).map((p) => p.slice(5, -1)))];
const dangling = refs.filter((id) => !defined.has(id));
check('every url() paint resolves to a defined id', dangling.length === 0, dangling.join(', '));
notes.push(`${refs.length} paint servers referenced, ${defined.size} ids defined`);

// A paint server that is defined but never used is dead weight on the plate —
// and, more usefully, is the signature of a reference that got renamed on one
// side only.
const hrefs = [...svg.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const used = new Set([...refs, ...hrefs]);
const orphans = [...defined].filter((id) => !used.has(id));
check('no defined-but-unreferenced paint server or path', orphans.length === 0, orphans.join(', '));

console.log('\n— press limits —');

// 2. No opacity anywhere. On a hairline an opacity becomes a screen percentage
//    at separation, and a screened hairline is the first thing to drop on press.
const ops = [...svg.matchAll(/\sopacity="([^"]*)"/g)].map((m) => m[1]);
check('no opacity attribute on any element', ops.length === 0, `${ops.length} found: ${[...new Set(ops)].join(', ')}`);

// 3. Stroke floor.
const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
const thin = widths.filter((v) => v < SCREEN_FLOOR_MM);
check(`every stroke >= ${SCREEN_FLOOR_MM}mm screen floor`, thin.length === 0,
  `${thin.length} below floor, min ${Math.min(...widths)}`);
notes.push(`${widths.length} strokes, ${Math.min(...widths)}–${Math.max(...widths).toFixed(2)}mm`);

// 4. Microtext floor. The viewBox unit is the millimetre, so font-size is in mm.
const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => parseFloat(m[1]) / PT);
check(`every font-size >= ${MICRO_FLOOR_PT}pt`, sizes.every((v) => v >= MICRO_FLOOR_PT - 1e-6),
  sizes.map((v) => v.toFixed(2)).join(', '));
notes.push(`microtext set at ${sizes.map((v) => `${v.toFixed(2)}pt`).join(' and ')}`);

console.log('\n— wording —');

// 5. Only approved wording reaches the plate. Anything else is a fictional
//    claim on an academic credential, which the directive forbids outright.
const APPROVED = ['SULTAN HANAFI ROYAL SCHOOLS', 'OFFICIAL ACADEMIC RECORD'];
const textBlocks = [...svg.matchAll(/<textPath[^>]*>([\s\S]*?)<\/textPath>/g)].map((m) => m[1]);
const tokens = [...new Set(textBlocks.join(' ').split('·').map((s) => s.trim()).filter(Boolean))];
const unapproved = tokens.filter((t) => !APPROVED.includes(t) && !/^SHRS-CERT-[A-Z]{3}-\d{6}$/.test(t));
check('microtext carries only approved wording and the live serial',
  unapproved.length === 0, unapproved.join(' | '));
check('the serial actually reached the microtext', tokens.some((t) => t.startsWith('SHRS-CERT-')));

console.log('\n— geometry —');

// 6. This plate's own band positions. It is a regression check that the
//    architecture has not drifted between edits — NOT evidence that the
//    supplied composition was reproduced. It was not; see the module header
//    and docs/certificate-ground-vector.md §2.
const BANDS = [4.7, 10.2, 14.0, 21.7, 28.1, 32.7, 36.3];
const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
const missing = BANDS.filter((v) => !rects.some((x) => Math.abs(x - v) < 0.75));
check("this plate's own border architecture is intact", missing.length === 0,
  `absent: ${missing.join(', ')}mm`);

// 7. Sheet is A4 landscape at 1:1 in millimetres, so it rasterises to any DPI
//    without a resampling step.
check('viewBox is A4 landscape in millimetres', /viewBox="0 0 297 210"/.test(svg));
check('physical size declared in mm', /width="297mm" height="210mm"/.test(svg));

// 8. No raster, no filter, no blend — the three things that reintroduce a
//    resolution ceiling into a file that is supposed to have none.
check('no embedded raster image', !/<image\b/.test(svg));
check('no filter or blend mode', !/filter=|mix-blend-mode|<filter\b/.test(svg));

if (process.argv.includes('--render')) {
  console.log('\n— render —');
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, 'ground.svg'), svg);

  // Same engine and same binary the certificate PDF is printed from, so what
  // this gate rasterises is what the plate will actually be.
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--font-render-hinting=none'],
  });
  try {
    for (const dpi of [300, 600]) {
      const px = Math.round((297 / 25.4) * dpi);
      const py = Math.round((210 / 25.4) * dpi);
      // Size the page in CSS px to the mm box at 96 DPI, then let
      // deviceScaleFactor carry the real resolution. The vector is rasterised
      // once at the target DPI — nothing is rendered small and enlarged.
      const cssW = (297 / 25.4) * 96, cssH = (210 / 25.4) * 96;
      const ctx = await browser.newContext({
        viewport: { width: Math.ceil(cssW), height: Math.ceil(cssH) },
        deviceScaleFactor: dpi / 96,
      });
      const page = await ctx.newPage();
      await page.setContent(
        `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block}</style>${svg}`,
        { waitUntil: 'load' });
      const file = resolve(OUT, `ground-${dpi}dpi.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: cssW, height: cssH } });
      await ctx.close();
      console.log(`  wrote ${file}  (target ${px}x${py} px at ${dpi} DPI)`);
    }
  } finally { await browser.close(); }
}

console.log(`\n${notes.map((n) => `  · ${n}`).join('\n')}`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.log(`  ! ${f}`)); process.exit(1); }

#!/usr/bin/env node
/**
 * Press-artefact producer for one graduation certificate batch.
 *
 *     node scripts/render-certificate-batch.mjs <batch-dir> [--out <dir>] [--base-url <url>]
 *
 * From the HTML already sitting in <batch-dir> this writes the two things that
 * actually go to the printer:
 *
 *   SHRS-<STAGE>-<YEAR>-<FIRST>-<LAST>-press.pdf   the press file, one page per sheet
 *   <seq>-<student-id>-600dpi.png                  one 600 DPI proof per sheet
 *
 * Neither had a producer in this tree. Both were made by an ad-hoc script that
 * was never committed, which meant the archive could not be regenerated and
 * every geometry fix was unreproducible. This script was written BACKWARDS from
 * the artefacts already in dist/, and its constants are the measurements of
 * those artefacts — not preferences. If a number here changes, the archive
 * changes shape, so each one carries the measurement that fixed it.
 *
 * It renders to a staging directory, checks the bytes, and only then moves them
 * into place. A wrong-sized artefact is worse than no artefact: nothing
 * downstream re-measures a PDF before sending it to a printer, so this is the
 * last place the mistake can be caught.
 *
 * NOTE ON RUNNING IT: the default --out is the batch directory itself, i.e. it
 * overwrites the archived deliverables. Render to a scratch --out unless you
 * intend to reissue.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { crc32 } from 'node:zlib';
import { chromium } from 'playwright-core';

// ── Press geometry ────────────────────────────────────────────────────────────
// Measured on the artefact already in the archive,
// dist/certificates/2026-08-08-IDD-000042/SHRS-IDD-2026-000042-000047-press.pdf:
// every one of its six /MediaBox entries reads [0 0 841.91998 594.95996].
//
// That box is NOT any nominal paper size, and it is not the sheet either. The
// drawn sheet is 297.0 x 209.5mm (1122.516 x 791.797 CSS px); the page is
// 297.01 x 209.89mm. The 0.34mm surplus lands at the FOOT, filled with the
// print-media body colour #FDF6E3. It is a real feature of the file, the
// printer has to be told about it (docs/certificate-press-specification.md),
// and reproducing it is the whole point of pinning these numbers.
const PAGE_W_PT = 841.92;
const PAGE_H_PT = 594.96;
// Skia writes the box as a float ("594.95996"), so compare with a tolerance
// rather than for equality. 0.05pt is ~0.018mm: far below anything a press can
// hold, and far below the 0.32pt gap to the next candidate page size measured
// below, so it cannot mask a wrong setting.
const PAGE_TOL_PT = 0.05;

// preferCSSPageSize is the ONLY print setting that reproduces that box, and the
// margin is not close. Measured, same document, same Chromium (chromium-1194):
//
//   { preferCSSPageSize: true }        -> 841.91998 x 594.95996   <- the archive
//   { format: 'A4', landscape: true }  -> 842.88    x 595.91998
//   { width: '297mm', height: '210mm' }-> 841.91998 x 595.91998
//   { width: '11.69in', height:'8.27in'}-> 841.91998 x 595.91998
//   { width: '297mm', height:'209.5mm'}-> 841.91998 x 594
//
// So the page size comes from the sheet's own `@page{size:A4 landscape;margin:0}`
// via Chromium's CSS page-size path, and any attempt to state the size in the
// call instead silently produces a different page.
const PDF_OPTIONS = {
  preferCSSPageSize: true,
  printBackground: true,
  displayHeaderFooter: false,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
};

// ── Proof-raster geometry ─────────────────────────────────────────────────────
// The drawn sheet, from the stylesheet the certificates are set in
// (.sheet{width:297mm;height:209.5mm}). This is the TRIM size, and it is not
// A4 landscape: A4 would be 210mm deep.
const SHEET_W_MM = 297.0;
const SHEET_H_MM = 209.5;
const SHEET_LABEL = `${SHEET_W_MM} x ${SHEET_H_MM}mm`;

// The archived PNGs are 7019 x 4950. Over that sheet it is 600.3 x 600.1 DPI —
// 600 DPI, with the fractional overshoot that comes from Chromium snapping a
// millimetre-sized box onto whole device pixels. The tolerance below is what
// separates that snapping (0.3 DPI) from a real mistake; 300 or 1200 DPI would
// miss it by two orders of magnitude.
const TARGET_DPI = 600;
const DPI_TOL = 2;
const CSS_DPI = 96;
const DEVICE_SCALE = TARGET_DPI / CSS_DPI; // 6.25
const PNG_W = 7019;
const PNG_H = 4950;

// The viewport is geometry, not convenience, and both numbers are load-bearing.
//
// WIDTH: the sheet is 1122.516 CSS px wide and centred by `margin:0 auto`. At a
// 1123 px viewport it lands at x=0.234, and Chromium's device-pixel rounding of
// the screenshot clip gives 7019 px. At 1400 px it lands at x=138.734 and the
// SAME element renders 7025 px wide — measured, not theorised. Change this and
// the archive's rasters change width for no visible reason.
//
// HEIGHT: must be at least the sheet's 791.8 px. At 400 px the element
// screenshot never completes — Playwright scrolls the sheet into view, the
// screen-media box-shadow keeps the box moving, and it times out on "waiting
// for element to be stable".
const VIEWPORT = { width: 1123, height: 794 };

// PNG records physical resolution in pixels per METRE (pHYs unit specifier 1).
// 600 DPI = 600 / 0.0254 = 23622.05 px/m; 23622 reads back as 599.9988 DPI,
// which every tool displays as 600.
//
// This is the gap the archived PNGs have: Chromium never writes a pHYs chunk,
// so a 7019 px file carries no resolution at all and a placement tool falls back
// to its own default — at the usual 72 or 96 DPI that lands the certificate on
// the page 2.48m or 1.86m wide. The pixels were always 600 DPI; the file just
// never said so, which is why the check below treats a missing pHYs as a defect
// and not a cosmetic omission.
const PHYS_PPM = 23622;

const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf',
};

function die(msg) {
  console.error(`render-certificate-batch: ${msg}`);
  process.exit(1);
}

// ── Arguments ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
if (positional.length !== 1) {
  die('usage: render-certificate-batch.mjs <batch-dir> [--out <dir>] [--base-url <url>]');
}
const BATCH_DIR = resolve(positional[0]);
if (!existsSync(join(BATCH_DIR, 'batch-print.html'))) {
  die(`${BATCH_DIR} has no batch-print.html — is that a certificate batch directory?`);
}
const OUT_DIR = resolve(flags.out || BATCH_DIR);

// The sheets link their assets root-absolutely ("/assets/fonts/...", as they
// must, because the same HTML is served from the site). Those paths only
// resolve if the document root is the repository root, so find it by walking up
// from the batch directory rather than from this file's own location — that way
// a copy of this script run from anywhere still resolves the same root.
function repoRootFrom(dir) {
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, 'package.json'))) return d;
    if (dirname(d) === d) die(`no package.json above ${dir} — cannot locate the document root`);
  }
}
const ROOT = repoRootFrom(BATCH_DIR);
if (!(BATCH_DIR + sep).startsWith(ROOT + sep)) die(`${BATCH_DIR} is not inside ${ROOT}`);
const URL_PREFIX = '/' + relative(ROOT, BATCH_DIR).split(sep).join('/');

// ── Sheet inventory ──────────────────────────────────────────────────────────
// Per-sheet files are "<6-digit archive seq>-<15-digit Student ID>.html". Both
// halves are identifiers that must not be invented here, so they are read off
// the filenames and passed through untouched into the PNG names.
const SHEET_RE = /^(\d{6})-(\d{15})\.html$/;
const sheets = readdirSync(BATCH_DIR)
  .map((f) => ({ file: f, m: SHEET_RE.exec(f) }))
  .filter((s) => s.m)
  .map((s) => ({ file: s.file, seq: s.m[1], studentId: s.m[2] }))
  .sort((a, b) => a.seq.localeCompare(b.seq));
if (!sheets.length) die(`no <seq>-<student-id>.html sheets in ${BATCH_DIR}`);

// Batch directories are named "<YYYY-MM-DD>-<STAGE>-<first seq>"; the press file
// is named for the stage, the year and the sequence RANGE it actually contains.
const BATCH_RE = /^(\d{4})-\d{2}-\d{2}-([A-Z]{3})-(\d{6})$/;
const batchName = BATCH_RE.exec(basename(BATCH_DIR));
if (!batchName) die(`batch directory name "${basename(BATCH_DIR)}" is not <YYYY-MM-DD>-<STAGE>-<seq>`);
const [, YEAR, STAGE, FIRST_IN_NAME] = batchName;
if (sheets[0].seq !== FIRST_IN_NAME) {
  die(`batch directory is named for ${FIRST_IN_NAME} but its first sheet is ${sheets[0].seq}`);
}
const PDF_NAME = `SHRS-${STAGE}-${YEAR}-${sheets[0].seq}-${sheets[sheets.length - 1].seq}-press.pdf`;

// ── PNG pHYs ─────────────────────────────────────────────────────────────────
function pngChunks(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const out = [];
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i);
    out.push({ at: i, len, type: buf.toString('latin1', i + 4, i + 8), data: buf.subarray(i + 8, i + 8 + len) });
    i += 12 + len;
  }
  return out;
}

function makeChunk(type, data) {
  // zlib.crc32 landed in Node 20.15 / 22.2. Without this the failure is a bare
  // "crc32 is not a function" from inside a PNG writer, which reads like a bug
  // in this file rather than a runtime that is too old.
  if (typeof crc32 !== 'function') die('node 20.15 or newer is required (zlib.crc32)');
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const tail = Buffer.alloc(4);
  // The PNG CRC covers the type AND the data, but not the length field.
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4, 8), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/** Return `png` with a pHYs chunk declaring `ppm` px/m on both axes. */
function withPhys(png, ppm) {
  const data = Buffer.alloc(9);
  data.writeUInt32BE(ppm, 0);
  data.writeUInt32BE(ppm, 4);
  data.writeUInt8(1, 8); // unit specifier 1 = metre; 0 would mean "aspect only"
  const chunk = makeChunk('pHYs', data);
  const chunks = pngChunks(png);
  const existing = chunks.find((c) => c.type === 'pHYs');
  if (existing) {
    // Chromium does not currently emit one, but replacing rather than appending
    // keeps this correct if a future build starts to.
    return Buffer.concat([png.subarray(0, existing.at), chunk, png.subarray(existing.at + 12 + existing.len)]);
  }
  // pHYs is only legal before the first IDAT, so splice it in there.
  const idat = chunks.find((c) => c.type === 'IDAT');
  if (!idat) throw new Error('PNG has no IDAT');
  return Buffer.concat([png.subarray(0, idat.at), chunk, png.subarray(idat.at)]);
}

// ── Assertions ───────────────────────────────────────────────────────────────
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
// Every artefact in a batch comes off the same code path, so once one is wrong
// the other six will be wrong the same way. Stop there rather than spend two
// more minutes rendering rasters that are already known to be unusable.
class Refused extends Error {}
const stopIfFailed = () => { if (failures.length) throw new Refused(); };

function assertPng(path, sheet) {
  const png = readFileSync(path);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  check(w === PNG_W && h === PNG_H,
    `${basename(path)}: ${w}x${h} px, expected ${PNG_W}x${PNG_H} (${TARGET_DPI} DPI over the ${SHEET_LABEL} sheet)`);
  // Cross-check the pixel count against the trim independently of PNG_W/PNG_H,
  // so that changing one constant without the other cannot pass.
  const dpiX = w / (SHEET_W_MM / 25.4);
  const dpiY = h / (SHEET_H_MM / 25.4);
  check(Math.abs(dpiX - TARGET_DPI) <= DPI_TOL && Math.abs(dpiY - TARGET_DPI) <= DPI_TOL,
    `${basename(path)}: ${dpiX.toFixed(1)} x ${dpiY.toFixed(1)} DPI over the ${SHEET_LABEL} sheet, `
    + `expected ${TARGET_DPI} +/- ${DPI_TOL}`);
  const phys = pngChunks(png).find((c) => c.type === 'pHYs');
  if (!phys) {
    check(false, `${basename(path)}: no pHYs chunk — the file does not declare its resolution`);
    return;
  }
  const [px, py, unit] = [phys.data.readUInt32BE(0), phys.data.readUInt32BE(4), phys.data.readUInt8(8)];
  check(px === PHYS_PPM && py === PHYS_PPM && unit === 1,
    `${basename(path)}: pHYs says ${px}x${py} px/unit${unit}, expected ${PHYS_PPM}x${PHYS_PPM} px/metre`);
  // The raster is only usable as an archive record if it names the certificate
  // it depicts. Six near-identical sheets render in one run; a shuffled or
  // truncated name is the mistake that files the wrong graduate's proof.
  check(basename(path) === `${sheet.seq}-${sheet.studentId}-600dpi.png`,
    `${basename(path)}: expected ${sheet.seq}-${sheet.studentId}-600dpi.png`);
}

function assertPdf(path, expectPages) {
  // Skia writes the page tree uncompressed, so the boxes can be read straight
  // out of the bytes. Three independent counts have to agree: a mismatch means
  // the regex is matching something it should not, and a silently wrong page
  // count is exactly the failure this gate exists to catch.
  const src = readFileSync(path).toString('latin1');
  const mediaBoxes = [...src.matchAll(/\/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]/g)];
  const pageObjs = src.match(/\/Type\s*\/Page(?![s])/g) || [];
  const treeCount = /\/Count\s+(\d+)/.exec(src);
  check(mediaBoxes.length === expectPages,
    `${basename(path)}: ${mediaBoxes.length} /MediaBox entries, expected ${expectPages}`);
  check(pageObjs.length === expectPages,
    `${basename(path)}: ${pageObjs.length} page objects, expected ${expectPages}`);
  check(treeCount && Number(treeCount[1]) === expectPages,
    `${basename(path)}: page tree /Count ${treeCount ? treeCount[1] : 'missing'}, expected ${expectPages}`);
  mediaBoxes.forEach((m, i) => {
    const [x0, y0, w, h] = m.slice(1, 5).map(Number);
    const ok = x0 === 0 && y0 === 0
      && Math.abs(w - PAGE_W_PT) <= PAGE_TOL_PT && Math.abs(h - PAGE_H_PT) <= PAGE_TOL_PT;
    check(ok, `${basename(path)} page ${i + 1}: /MediaBox [${x0} ${y0} ${w} ${h}], `
      + `expected [0 0 ${PAGE_W_PT} ${PAGE_H_PT}] +/- ${PAGE_TOL_PT}pt`);
  });
}

// ── Static server ────────────────────────────────────────────────────────────
function startServer(root) {
  return new Promise((res) => {
    const server = createServer((req, rq) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const file = join(root, p.endsWith('/') ? join(p, 'index.html') : p);
      if (!(file + sep).startsWith(root + sep)) { rq.writeHead(403); rq.end(); return; }
      let body;
      try { body = readFileSync(file); } catch { rq.writeHead(404); rq.end('Not found'); return; }
      rq.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      rq.end(body);
    });
    server.listen(0, '127.0.0.1', () => res(server));
  });
}

// ── Render ───────────────────────────────────────────────────────────────────
const STAGE_DIR = join(OUT_DIR, '.render-staging');
rmSync(STAGE_DIR, { recursive: true, force: true });
mkdirSync(STAGE_DIR, { recursive: true });

let server = null;
let base = flags['base-url'];
if (!base) {
  server = await startServer(ROOT);
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({ executablePath: CHROME });

try {
  // The press PDF. Print media is what page.pdf() emulates by default, which is
  // what the sheets are designed against — the @media print block is where the
  // screen-only drop shadow and the 24px gutter between sheets are dropped.
  const pdfPage = await browser.newPage();
  await pdfPage.goto(`${base}${URL_PREFIX}/batch-print.html`, { waitUntil: 'networkidle' });
  await pdfPage.evaluate(() => document.fonts.ready);
  const pdfPath = join(STAGE_DIR, PDF_NAME);
  await pdfPage.pdf({ path: pdfPath, ...PDF_OPTIONS });
  await pdfPage.close();
  assertPdf(pdfPath, sheets.length);
  stopIfFailed();
  console.log(`  pdf  ${PDF_NAME}  ${sheets.length} pp  ${(statSync(pdfPath).size / 1048576).toFixed(1)} MB`);

  // The 600 DPI proofs. One context per sheet: deviceScaleFactor is fixed at
  // context creation, and a stale one is the kind of mistake that produces a
  // plausible-looking file at the wrong resolution.
  for (const sheet of sheets) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
    const page = await ctx.newPage();
    await page.goto(`${base}${URL_PREFIX}/${sheet.file}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$('.sheet');
    if (!el) die(`${sheet.file} has no .sheet element`);
    const shot = await el.screenshot({ type: 'png' });
    const name = `${basename(sheet.file, '.html')}-600dpi.png`;
    const path = join(STAGE_DIR, name);
    writeFileSync(path, withPhys(shot, PHYS_PPM));
    await ctx.close();
    assertPng(path, sheet);
    stopIfFailed();
    console.log(`  png  ${name}  ${(statSync(path).size / 1048576).toFixed(1)} MB`);
  }
} catch (err) {
  if (!(err instanceof Refused)) throw err;
} finally {
  await browser.close();
  if (server) server.close();
}

if (failures.length) {
  // Leave nothing behind. A wrong-sized press file that survives in the output
  // directory will be picked up by whoever mails the printer next.
  rmSync(STAGE_DIR, { recursive: true, force: true });
  console.error(`\nrender-certificate-batch: REFUSING to write ${failures.length} artefact problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(STAGE_DIR)) renameSync(join(STAGE_DIR, f), join(OUT_DIR, f));
rmSync(STAGE_DIR, { recursive: true, force: true });
console.log(`\nrender-certificate-batch: ${sheets.length + 1} artefacts verified and written to ${OUT_DIR}`);

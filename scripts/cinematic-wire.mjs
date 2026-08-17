#!/usr/bin/env node
/* ===========================================================================
   CINEMATIC WIRE — link the cinematic-pass stylesheets, sitewide
   ===========================================================================
   Adds each stylesheet below to every page that carries the public masthead
   (detected by class="imperial-motion", unique to that chrome — the portal
   has its own separate header and is untouched).

   Idempotent PER STYLESHEET, not per page: each entry in SHEETS is checked
   and inserted independently, so adding a new sheet to this list and
   re-running only adds what's missing — a page that already has the first
   two from an earlier run gets just the new ones appended after them,
   preserving cascade order (khatam pattern, then running light, then the
   icon and photo liveliness passes, in that order after brand.css and
   before atelier.css/elevate.css — so the 4 elevate.css pages still cascade
   their bespoke header/footer treatment on top of all of this).

       node scripts/cinematic-wire.mjs [--dry]
   =========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['.git', 'node_modules', 'portal', 'dist', 'scripts', 'functions',
  'partials', 'sql', 'lib', 'offline', 'i18n', 'css', 'js', 'assets', 'brand',
  'docs', 'mobile-app', 'pages', 'archive', 'data']);

const ANCHOR = '<link rel="stylesheet" href="/css/brand.css';
const SHEETS = [
  '/css/islamic-pattern.css',
  '/css/running-light.css',
  '/css/lively-icons.css',
  '/css/lively-photos.css',
];

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n === 'index.html') out.push(f);
  }
  return out;
}

let touched = 0, noMasthead = 0, alreadyComplete = 0;
const perSheet = Object.fromEntries(SHEETS.map((s) => [s, 0]));

for (const f of walk(ROOT)) {
  let html = readFileSync(f, 'utf8');
  if (!html.includes('imperial-motion')) { noMasthead++; continue; }

  const missing = SHEETS.filter((s) => !html.includes(s));
  if (!missing.length) { alreadyComplete++; continue; }

  const anchorIdx = html.indexOf(ANCHOR);
  if (anchorIdx === -1) continue;
  // Insert after the last already-present cinematic sheet if any, else
  // right after brand.css — keeps the declared SHEETS order intact even
  // when only some of them are already wired on this page.
  let insertAfterLine = html.indexOf('\n', anchorIdx);
  for (const s of SHEETS) {
    const idx = html.indexOf(s);
    if (idx !== -1) {
      const lineEnd = html.indexOf('\n', idx);
      if (lineEnd > insertAfterLine) insertAfterLine = lineEnd;
    }
  }
  const tags = missing.map((s) => `<link rel="stylesheet" href="${s}?v=1">`).join('\n');
  html = html.slice(0, insertAfterLine + 1) + tags + '\n' + html.slice(insertAfterLine + 1);
  missing.forEach((s) => perSheet[s]++);
  touched++;
  if (!DRY) writeFileSync(f, html);
}

console.log(`${DRY ? 'would touch' : 'touched'}: ${touched}   already complete: ${alreadyComplete}   no masthead: ${noMasthead}`);
for (const s of SHEETS) console.log(`  ${s}: +${perSheet[s]}`);

#!/usr/bin/env node
/* ===========================================================================
   CINEMATIC WIRE — link the khatam pattern and running-light stylesheets
   ===========================================================================
   Adds both new stylesheets to every page that carries the public masthead
   (detected by the presence of class="imperial-motion", which is unique to
   that chrome — the portal has its own separate header and is untouched).

   Link order matters: both go in EARLY (right after brand.css, before
   atelier.css/elevate.css), so that on the 4 pages which also load
   elevate.css, elevate.css's later, more elaborate header/footer treatment
   cascades on top of this file's sitewide baseline rather than losing to it.

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
const TAGS = '<link rel="stylesheet" href="/css/islamic-pattern.css?v=1">\n' +
             '<link rel="stylesheet" href="/css/running-light.css?v=1">';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n === 'index.html') out.push(f);
  }
  return out;
}

let wired = 0, already = 0, noMasthead = 0;
for (const f of walk(ROOT)) {
  const html = readFileSync(f, 'utf8');
  if (!html.includes('imperial-motion')) { noMasthead++; continue; }
  if (html.includes('/css/islamic-pattern.css')) { already++; continue; }
  const i = html.indexOf(ANCHOR);
  if (i === -1) continue;
  const lineEnd = html.indexOf('\n', i);
  const out = html.slice(0, lineEnd + 1) + TAGS + '\n' + html.slice(lineEnd + 1);
  wired++;
  if (!DRY) writeFileSync(f, out);
}
console.log(`${DRY ? 'would wire' : 'wired'}: ${wired}   already: ${already}   no masthead (skipped): ${noMasthead}`);

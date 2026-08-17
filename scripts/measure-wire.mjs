#!/usr/bin/env node
/* ===========================================================================
   MEASURE WIRE — put the measurement layer on every public page
   ===========================================================================
   Adds <script defer src="/js/measure.js"></script> before </head> on public
   pages only — the signed-in portal is not analytics territory. Idempotent.
       node scripts/measure-wire.mjs [--dry]
   =========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['.git', 'node_modules', 'portal', 'dist', 'scripts', 'functions',
  'partials', 'sql', 'lib', 'offline', 'i18n', 'css', 'js', 'assets', 'brand',
  'docs', 'mobile-app', 'pages', 'archive', 'data']);
/* ar/fr/yo mirrors ARE public pages — they get measured too. */

const TAG = '<script defer src="/js/measure.js?v=1"></script>';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n === 'index.html' || n === '404.html') out.push(f);
  }
  return out;
}

let wired = 0, already = 0;
for (const f of walk(ROOT)) {
  const html = readFileSync(f, 'utf8');
  if (html.includes('/js/measure.js')) { already++; continue; }
  if (!html.includes('</head>')) continue;
  wired++;
  if (!DRY) writeFileSync(f, html.replace('</head>', TAG + '\n</head>'));
}
console.log(`${DRY ? 'would wire' : 'wired'}: ${wired}   already: ${already}`);

#!/usr/bin/env node
/* ===========================================================================
   PORTAL COMMAND WIRE — the one link 22 staff pages never got
   ===========================================================================

   THE GAP. portal-command.css was built and wired onto all 72 portal/office/*
   pages earlier in this project. It was never a bespoke-markup system: it
   enhances the SHARED classes every portal page already carries —
   .portal-topbar, .portal-child-head, .office-group-head — and it already
   has dedicated rules for .registrar-* classes specifically (checked before
   writing this script: registrar-form-grid, registrar-approvals-list,
   registrar-hint and others are all already styled in it).

   What happened is ordering, not a design gap: the entire portal/staff/*
   wing (registrar, certificate centre, finance, safeguarding, and 17 other
   working tools) was built by a separate, parallel session AFTER the
   command-center wiring pass had already run — so it was never in scope for
   that pass, and every one of those 22 pages shipped on the plain
   portal.css/portal-chrome.css baseline. That is the entire explanation for
   "the portal looks static and unpolished": the tools a Registrar actually
   uses every day were the ones that never got the upgrade.

   THE FIX. One stylesheet link, in the exact position it holds on every
   working exemplar (immediately after portal-chrome.css) — verified against
   portal/office/certificates/index.html before writing this. No JS
   accompanies it there and none is added here: this is a pure CSS
   enhancement layer over markup that already exists, so nothing about how
   these pages function changes, only how they look.

       node scripts/portal-command-wire.mjs [--dry]
   =========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DRY = process.argv.includes('--dry');
const STAFF_DIR = join(ROOT, 'portal/staff');

const ANCHOR = /<link rel="stylesheet" href="\/css\/portal-chrome\.css[^"]*">\n/;
const TAG = '<link rel="stylesheet" href="/css/portal-command.css">\n';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n === 'index.html') out.push(f);
  }
  return out;
}

let wired = 0, already = 0, noAnchor = 0;
for (const f of walk(STAFF_DIR)) {
  const html = readFileSync(f, 'utf8');
  if (html.includes('/css/portal-command.css')) { already++; continue; }
  if (!ANCHOR.test(html)) { noAnchor++; console.log('  no portal-chrome.css anchor:', f); continue; }
  const out = html.replace(ANCHOR, (m) => m + TAG);
  wired++;
  if (!DRY) writeFileSync(f, out);
}
console.log(`${DRY ? 'would wire' : 'wired'}: ${wired}   already: ${already}   no anchor: ${noAnchor}`);

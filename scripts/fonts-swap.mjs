#!/usr/bin/env node
/* ===========================================================================
   FONTS SWAP — take fonts.googleapis.com off the critical path, everywhere
   ===========================================================================

   Replaces the render-blocking Google Fonts <link> (and its preconnects) with
   this origin's own /css/fonts.css on every HTML page in the repository,
   public and portal alike.

   WHY THE PRECONNECTS GO TOO. A preconnect to a host nothing requests any
   more is not free: it opens a DNS lookup, a TCP connection and a TLS
   handshake, holds a connection slot, and returns nothing. Leaving them would
   keep part of the cost the swap exists to remove.

   Idempotent — running it twice changes nothing the second time.

       node scripts/fonts-swap.mjs [--dry]
   =========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['.git', 'node_modules', 'dist']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const CORE = '<link rel="stylesheet" href="/css/fonts.css">';
const EDITIONS = '<link rel="stylesheet" href="/css/fonts-editions.css">';

/* Four prospectus editions set themselves in faces that appear nowhere else.
   They get the second bundle; the other 219 pages must not pay for it. */
const EDITION_FAMILIES = /Fraunces|Jost|IBM\+Plex\+Sans|Playfair\+Display|Source\+Sans\+Pro|Space\+Grotesk/;

let swapped = 0, preconnects = 0, already = 0, untouched = 0, editions = 0;
const families = new Set();

for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let html = before;

  /* Record what each page asked Google for, so the manifest can be checked
     against real demand rather than against my memory of it. */
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2\?([^"']+)/g)) {
    for (const f of m[1].matchAll(/family=([^&:]+)/g)) {
      families.add(decodeURIComponent(f[1].replace(/\+/g, ' ')));
    }
  }

  /* The stylesheet link, in either attribute order. */
  const linkRe = /<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*"[^>]*>\s*/g;
  const needsEditions = EDITION_FAMILIES.test(html);
  const replacement = CORE + (needsEditions ? '\n' + EDITIONS : '') + '\n';
  const hadLink = linkRe.test(html);
  linkRe.lastIndex = 0;
  if (hadLink) {
    if (needsEditions) editions++;
    let first = true;
    html = html.replace(linkRe, () => (first ? ((first = false), replacement) : ''));
  }

  /* Preconnects to hosts this page no longer talks to. */
  const pc = html.match(/<link[^>]*rel="preconnect"[^>]*href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\s*/g);
  if (pc) { preconnects += pc.length; html = html.replace(/<link[^>]*rel="preconnect"[^>]*href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\s*/g, ''); }

  if (html === before) {
    (before.includes('/css/fonts.css') ? already++ : untouched++);
    continue;
  }
  swapped++;
  if (!DRY) writeFileSync(file, html);
}

console.log(`${DRY ? 'WOULD SWAP' : 'swapped'}      : ${swapped} pages`);
console.log(`editions bundle    : ${editions} pages`);
console.log(`preconnects removed: ${preconnects}`);
console.log(`already local      : ${already}`);
console.log(`no font link       : ${untouched}`);
console.log(`families requested : ${[...families].sort().join(', ')}`);

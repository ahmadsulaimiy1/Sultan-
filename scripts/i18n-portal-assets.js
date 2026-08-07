#!/usr/bin/env node
/* Wires the i18n stylesheet and runtime into the portal pages.
 *
 * Portal pages are standalone HTML — they are not assembled from partials/,
 * so scripts/build.js does not put the i18n assets in their <head> the way it
 * does for the public site. This adds them, in the one order that works:
 *
 *   css/i18n.css            per-locale typography + the switcher's styling
 *   js/locale-registry.js   ) synchronous, and BEFORE portal-theme.js, which
 *   js/i18n-core.js         ) needs SHRS_I18N to resolve the stored locale's
 *                             direction before first paint
 *   js/i18n.js              deferred — fetches a dictionary and builds the
 *                             control, neither of which should block paint
 *
 * Idempotent: a page that already has them is left alone, so this is safe to
 * re-run whenever portal pages are added.
 *
 * Usage: node scripts/i18n-portal-assets.js [--dry]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const CSS = '<link rel="stylesheet" href="/css/i18n.css">';
const CORE = '<script src="/js/locale-registry.js"></script>\n<script src="/js/i18n-core.js"></script>';
const RUNTIME = '<script src="/js/i18n.js" defer></script>';

function wire(html) {
  let out = html;
  let changed = false;

  if (out.indexOf('/css/i18n.css') === -1) {
    // After portal.css so the locale overrides win the cascade.
    const m = /<link rel="stylesheet" href="\/css\/portal\.css[^>]*>/.exec(out);
    if (m) {
      out = out.slice(0, m.index + m[0].length) + '\n' + CSS + out.slice(m.index + m[0].length);
      changed = true;
    }
  }

  if (out.indexOf('/js/i18n-core.js') === -1) {
    // Immediately before portal-theme.js, which reads SHRS_I18N synchronously.
    const m = /<script src="\/js\/portal-theme\.js[^>]*><\/script>/.exec(out);
    if (m) {
      out = out.slice(0, m.index) + CORE + '\n' + out.slice(m.index);
      changed = true;
    }
  }

  if (out.indexOf('/js/i18n.js') === -1) {
    const m = /<script src="\/js\/portal-theme\.js[^>]*><\/script>/.exec(out);
    if (m) {
      const at = out.indexOf(m[0]) + m[0].length;
      out = out.slice(0, at) + '\n' + RUNTIME + out.slice(at);
      changed = true;
    }
  }

  return { out, changed };
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

// portal/office/** is regenerated from scripts/build-office-portals.js, whose
// template carries these tags directly; editing the output would be undone.
const files = walk(path.join(ROOT, 'portal')).filter(
  (f) => !path.relative(ROOT, f).startsWith(path.join('portal', 'office') + path.sep)
);

let wired = 0;
files.forEach((file) => {
  const original = fs.readFileSync(file, 'utf8');
  const { out, changed } = wire(original);
  if (!changed) return;
  if (!DRY) fs.writeFileSync(file, out);
  wired += 1;
});

console.log(`${DRY ? '[dry run] ' : ''}portal i18n assets wired into ${wired} of ${files.length} page(s)`);

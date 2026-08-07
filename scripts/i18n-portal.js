#!/usr/bin/env node
/* Annotates the portal pages with data-i18n attributes, and mounts the
 * language switcher in the portal topbar.
 *
 * The public site is pre-rendered per language, so its translation happens at
 * build time. The portal cannot work that way: a portal page is a live
 * application view behind a session, and re-rendering it in another language
 * by navigating to a second copy would drop the reader's session state, their
 * open form and their fetched data. So the portal translates IN PLACE — which
 * needs the strings marked in the DOM, which is what this adds:
 *
 *     <button data-i18n="action.signOut">Sign Out</button>
 *     <input data-i18n-attr="placeholder:form.email" placeholder="Email address">
 *
 * js/i18n.js then rewrites them on a switch, with no reload and no navigation.
 *
 * Safety rules, all of them load-bearing:
 *   - A text node is annotated only when it is its element's ONLY child.
 *     The runtime sets textContent, which would otherwise delete sibling
 *     markup — an <a> containing an icon <svg> plus a label must not be
 *     annotated on the <a> itself.
 *   - Only exact, whole-string matches against the English dictionary.
 *     Never a substring, never a partial word.
 *   - Elements that already carry data-i18n are left alone, so the script is
 *     idempotent and safe to re-run after new pages are added.
 *   - Only attributes and no visible text are changed; the script verifies
 *     that the rendered text of every file is byte-identical afterwards, and
 *     writes nothing for a file that fails.
 *
 * Usage: node scripts/i18n-portal.js [--dry]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/en.json'), 'utf8'));
delete en._comment;
delete en._identical;

// value -> key, ambiguous values dropped (see scripts/i18n-templatise.js)
const byValue = new Map();
const ambiguous = new Set();
Object.entries(en).forEach(([key, value]) => {
  if (typeof value !== 'string') return;
  const v = value.trim();
  if (!v) return;
  if (byValue.has(v) && byValue.get(v) !== key) ambiguous.add(v);
  else byValue.set(v, key);
});
ambiguous.forEach((v) => byValue.delete(v));

const TEXT_ATTRS = ['aria-label', 'title', 'placeholder'];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…').replace(/&middot;/g, '·')
    .replace(/&larr;/g, '←').replace(/&rarr;/g, '→')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function lookupKey(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const decoded = decodeEntities(trimmed);
  // Arrows and the "← " / " →" affixes are decoration around a label.
  const stripped = decoded.replace(/^[←→]\s*/, '').replace(/\s*[←→]$/, '').trim();
  return byValue.get(trimmed) || byValue.get(decoded) || byValue.get(stripped) || null;
}

/* Finds <tag ...>text</tag> pairs where `text` contains no further markup —
   which is exactly the "only child is this text node" condition the runtime
   needs. A regex is enough precisely because that condition excludes every
   nested case; anything with a child element simply will not match. */
const SIMPLE_ELEMENT = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>([^<>]+)<\/\1>/g;

function annotate(html) {
  let added = 0;

  // 1. Text nodes that are an element's sole content.
  let out = html.replace(SIMPLE_ELEMENT, (whole, tag, attrs, text) => {
    if (/\bdata-i18n\s*=/.test(attrs)) return whole;       // already annotated
    if (/^(script|style|title|textarea)$/i.test(tag)) return whole;
    const key = lookupKey(text);
    if (!key) return whole;
    added += 1;
    return `<${tag}${attrs} data-i18n="${key}">${text}</${tag}>`;
  });

  // 2. Reader-visible attributes.
  out = out.replace(/<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g, (whole, tag, attrs) => {
    if (/\bdata-i18n-attr\s*=/.test(attrs)) return whole;
    const pairs = [];
    TEXT_ATTRS.forEach((attr) => {
      const m = new RegExp(`\\s${attr}="([^"]*)"`).exec(attrs);
      if (!m) return;
      const key = lookupKey(m[1]);
      if (key) pairs.push(`${attr}:${key}`);
    });
    if (!pairs.length) return whole;
    added += 1;
    return `<${tag}${attrs} data-i18n-attr="${pairs.join(',')}">`;
  });

  return { out, added };
}

/* Mounts the switcher in the portal topbar. Placed before the sign-out
   button so it reads as chrome rather than as an account action, and marked
   with a class the portal stylesheet already understands. */
const MOUNT = '<span class="lang-switch-mount" data-locale-switcher></span>';

function mountSwitcher(html) {
  if (html.indexOf('data-locale-switcher') > -1) return { out: html, mounted: 0 };

  // Preferred position: just before the sign-out button, so the switcher
  // reads as chrome sitting beside the account action.
  const beforeLogout = /(<button[^>]*\bdata-(?:portal|office)-logout\b)/;
  if (beforeLogout.test(html)) {
    return { out: html.replace(beforeLogout, `${MOUNT}\n    $1`), mounted: 1 };
  }

  /* Signed-out screens (sign in, register, set password, forgot password)
     have a topbar but no logout button — and they are precisely where the
     choice matters most, since a reader who cannot read the sign-in form
     cannot reach anything behind it. Append at the end of the topbar,
     located by brace-matching rather than by a regex for </div>, which would
     stop at the first nested close. */
  const open = html.indexOf('<div class="portal-topbar"');
  if (open === -1) return { out: html, mounted: 0 };
  let i = html.indexOf('>', open) + 1;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) return { out: html, mounted: 0 };
    if (nextOpen !== -1 && nextOpen < nextClose) { depth += 1; i = nextOpen + 4; }
    else { depth -= 1; i = nextClose + 6; }
  }
  const closeAt = i - 6;
  return {
    out: html.slice(0, closeAt) + `  ${MOUNT}\n` + html.slice(closeAt),
    mounted: 1,
  };
}

// Strips tags to compare what a reader actually sees. Adding an attribute
// must never change this.
function visibleText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

/* Only hand-authored pages are annotated in place. Two sets of portal pages
   are GENERATED, and editing their output would be undone by the next build:
     - pages/manifest.json entries (portal/select/ today) come from
       scripts/build.js and already carry translated chrome and a switcher,
       because they are assembled from the shared partials;
     - portal/office/** is stamped out by scripts/build-office-portals.js from
       a single template, so its strings are annotated in that template
       instead — one edit covering all 32 offices.
   Skipping them here is what keeps the annotation idempotent across builds. */
const generated = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'pages/manifest.json'), 'utf8'))
    .map((p) => path.join(ROOT, p.output))
);
const files = walk(path.join(ROOT, 'portal')).filter((f) => {
  if (generated.has(f)) return false;
  return !path.relative(ROOT, f).startsWith(path.join('portal', 'office') + path.sep);
});
let totalAdded = 0;
let totalMounted = 0;
let failed = 0;

files.forEach((file) => {
  const original = fs.readFileSync(file, 'utf8');
  const a = annotate(original);
  const m = mountSwitcher(a.out);
  const result = m.out;

  if (result === original) return;

  // The switcher mount is new markup, so exclude it from the comparison —
  // but only when THIS run added one. A page that already carried a mount
  // must be compared with it intact, or the strip creates a phantom diff.
  const comparable = m.mounted
    ? result.replace(MOUNT, '')
    : result;
  const before = visibleText(original);
  const after = visibleText(comparable);
  if (after !== before) {
    console.error(`  FAIL ${path.relative(ROOT, file)}: visible text changed — not written`);
    for (let i = 0; i < Math.max(before.length, after.length); i += 1) {
      if (before[i] !== after[i]) {
        console.error(`        at offset ${i}`);
        console.error(`        before: ${JSON.stringify(before.slice(Math.max(0, i - 80), i + 80))}`);
        console.error(`        after:  ${JSON.stringify(after.slice(Math.max(0, i - 80), i + 80))}`);
        break;
      }
    }
    failed += 1;
    return;
  }

  if (!DRY) fs.writeFileSync(file, result);
  totalAdded += a.added;
  totalMounted += m.mounted;
});

console.log(
  `${DRY ? '[dry run] ' : ''}portal i18n: ${totalAdded} string(s) annotated, ` +
  `switcher mounted on ${totalMounted} page(s), across ${files.length} portal file(s)`
);
if (failed) {
  console.error(`${failed} file(s) failed verification and were left untouched.`);
  process.exit(1);
}

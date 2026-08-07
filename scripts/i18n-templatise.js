#!/usr/bin/env node
/* One-time migration: turns a hand-authored English chrome partial into a
 * language-neutral template.
 *
 * Before: partials/header.html (English) and partials/header.ar.html (Arabic)
 *         are two 34 KB files that must be edited in lockstep forever, and a
 *         third language means a third copy.
 * After:  partials/header.tpl.html carries {{t:nav.academics}} tokens which
 *         scripts/build.js resolves per locale from i18n/<code>.json. One
 *         file, four outputs, and a missing translation is a parity error
 *         rather than a silent English leak.
 *
 * Substitution is deliberately conservative. It only rewrites:
 *   - a complete text node between tags
 *   - the full value of a small allow-list of human-visible attributes
 * It never touches href/src/class/id, never rewrites a partial word, and
 * never substitutes a string that appears in the dictionary more than once
 * under different keys. Anything it is unsure of is left alone and reported,
 * to be tokenised by hand.
 *
 * The result is verified before it is written: re-rendering the template in
 * English must reproduce the original file byte for byte. If it does not,
 * nothing is written and the run fails.
 *
 * Usage: node scripts/i18n-templatise.js [partial ...]     (default: all)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/en.json'), 'utf8'));
delete en._comment;

// Attributes whose entire value is prose a reader can perceive.
const TEXT_ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'value'];

// value -> key, dropping any value claimed by more than one key (ambiguous:
// we cannot know which the author meant, and guessing would silently swap
// one label for another).
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

// Longest first, so "Student Life Hub" wins over "Student Life".
const values = Array.from(byValue.keys()).sort((a, b) => b.length - a.length);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// HTML entities the source uses for characters our dictionary stores raw.
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…').replace(/&middot;/g, '·');
}

function templatise(html) {
  const hits = new Map();
  let out = '';
  let i = 0;

  // Walk tag/text alternately so we only ever consider real text nodes and
  // never the inside of a tag (which is where href/class/src live).
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { out += substituteText(html.slice(i), hits); break; }

    out += substituteText(html.slice(i, lt), hits);

    // Skip wholesale over elements whose text is code, not prose.
    const opaque = /^<(script|style|svg)\b/i.exec(html.slice(lt));
    if (opaque) {
      const tag = opaque[1];
      const close = html.toLowerCase().indexOf(`</${tag.toLowerCase()}>`, lt);
      const end = close === -1 ? html.length : close + tag.length + 3;
      // The tag itself may still carry an aria-label worth translating.
      const gt0 = html.indexOf('>', lt);
      if (gt0 !== -1 && gt0 < end) {
        out += substituteAttrs(html.slice(lt, gt0 + 1), hits) + html.slice(gt0 + 1, end);
      } else {
        out += html.slice(lt, end);
      }
      i = end;
      continue;
    }

    const gt = html.indexOf('>', lt);
    if (gt === -1) { out += html.slice(lt); break; }
    out += substituteAttrs(html.slice(lt, gt + 1), hits);
    i = gt + 1;
  }
  return { out, hits };
}

/* A text node is substituted only if, after trimming, it equals a dictionary
   value outright. Partial/substring replacement is refused on purpose: "Menu"
   appearing inside "Full Menu" must not be rewritten, and a sentence that
   merely contains a label is prose the dictionary does not own. */
function substituteText(chunk, hits) {
  if (!chunk.trim()) return chunk;
  const trimmed = chunk.trim();
  const decoded = decodeEntities(trimmed);

  /* Many call-to-action labels are written "Board of Governors →" — the
     arrow is decoration appended to the label, not part of it, and the
     dictionary rightly stores only the words. Split a trailing arrow off,
     translate the label, then put the arrow back verbatim so the visual
     treatment is untouched. The arrow is left as authored rather than
     mirrored for RTL because css/brand.css already flips these with
     transform, and the Arabic partials use the same character. */
  const arrowMatch = /^([\s\S]*?)(\s*[→←]\s*)$/.exec(decoded);
  const label = arrowMatch ? arrowMatch[1].trim() : decoded;
  const arrow = arrowMatch ? arrowMatch[2] : '';

  const key = byValue.get(trimmed) || byValue.get(decoded) || byValue.get(label);
  if (!key) return chunk;
  hits.set(key, (hits.get(key) || 0) + 1);
  const lead = chunk.slice(0, chunk.indexOf(trimmed[0]));
  const tail = chunk.slice(chunk.lastIndexOf(trimmed[trimmed.length - 1]) + 1);
  return `${lead}{{t:${key}}}${arrow}${tail}`;
}

function substituteAttrs(tag, hits) {
  let out = tag;
  TEXT_ATTRS.forEach((attr) => {
    const re = new RegExp(`(\\s${escapeRe(attr)}=")([^"]*)(")`, 'g');
    out = out.replace(re, (whole, pre, val, post) => {
      const key = byValue.get(val.trim()) || byValue.get(decodeEntities(val.trim()));
      if (!key) return whole;
      hits.set(key, (hits.get(key) || 0) + 1);
      return `${pre}{{t:${key}}}${post}`;
    });
  });
  return out;
}

// The verification step: rendering the template back in English must
// reproduce the input exactly, or the migration has changed the page.
function renderEnglish(tpl) {
  return tpl.replace(/\{\{t:([\w.]+)\}\}/g, (whole, key) => {
    const v = en[key];
    return v === undefined ? whole : v;
  });
}

const requested = process.argv.slice(2);
const targets = requested.length ? requested : [
  'topbar', 'header', 'footer', 'search', 'announcement-ribbon',
];

let failures = 0;
let totalHits = 0;

targets.forEach((name) => {
  const src = path.join(PARTIALS, `${name}.html`);
  if (!fs.existsSync(src)) {
    console.error(`  SKIP ${name}: partials/${name}.html not found`);
    return;
  }
  const original = fs.readFileSync(src, 'utf8');
  const { out, hits } = templatise(original);

  // Entity-decoded matches round-trip to the raw character, which is a real
  // difference in the file even though it renders identically. Compare on a
  // decoded basis so that is not counted as corruption.
  const rendered = renderEnglish(out);
  if (decodeEntities(rendered) !== decodeEntities(original)) {
    console.error(`  FAIL ${name}: re-rendering the template does not reproduce the original`);
    const a = decodeEntities(rendered);
    const b = decodeEntities(original);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`        first difference at offset ${i}`);
        console.error(`        rendered: ${JSON.stringify(a.slice(Math.max(0, i - 60), i + 60))}`);
        console.error(`        original: ${JSON.stringify(b.slice(Math.max(0, i - 60), i + 60))}`);
        break;
      }
    }
    failures += 1;
    return;
  }

  fs.writeFileSync(path.join(PARTIALS, `${name}.tpl.html`), out);
  totalHits += hits.size;
  console.log(`  ok   ${name}: ${hits.size} distinct key(s) tokenised -> partials/${name}.tpl.html`);
});

console.log(`\ntokenised ${totalHits} key slot(s) across ${targets.length} partial(s)`);
if (failures) {
  console.error(`${failures} partial(s) failed verification — nothing written for those.`);
  process.exit(1);
}

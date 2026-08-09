#!/usr/bin/env node
/* Translation parity gate.
 *
 * The default locale's dictionary is the contract: every other locale must
 * answer every key it defines, with no extras. Without this check a missing
 * Yoruba string is invisible until a visitor meets an English button in the
 * middle of a Yoruba page — the exact failure the multilingual directive
 * exists to prevent. With it, the gap is a build error naming the key.
 *
 * Also catches three quieter classes of bug that a plain key-diff misses:
 *   - untranslated copies (a non-default locale whose value is byte-identical
 *     to English on a string long enough that coincidence is implausible)
 *   - placeholder drift ({min} present in English, absent or renamed in the
 *     translation, so the number never appears for that language)
 *   - Yoruba orthography regressions (ASCII 'e'/'o'/'s' where the underdotted
 *     ẹ/ọ/ṣ belong is the single most common way Yoruba text gets mangled by
 *     an editor, a copy-paste, or a well-meaning spell-checker)
 *
 * Usage: node scripts/i18n-check.js [--strict]
 *   --strict  treat warnings (untranslated copies) as failures too
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N = path.join(ROOT, 'i18n');
const registry = JSON.parse(fs.readFileSync(path.join(I18N, 'locales.json'), 'utf8'));
const DEFAULT = registry.defaultLocale;
const LOCALES = registry.locales.filter((l) => l.enabled !== false);

const STRICT = process.argv.includes('--strict');

function loadDict(code) {
  const file = path.join(I18N, `${code}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Registry files carry a leading _comment array for the humans; it is
  // documentation, not a translatable string, so it never participates.
  const out = {};
  Object.keys(raw).forEach((k) => {
    if (k.charAt(0) !== '_') out[k] = raw[k];
  });
  return out;
}

function placeholders(str) {
  const found = new Set();
  String(str).replace(/\{(\w+)\}/g, (_, name) => { found.add(name); return _; });
  return found;
}

/* Yoruba's three underdotted letters carry meaning — "ọkọ" (vehicle/husband)
   and "oko" (farm) are different words — so a stripped diacritic is a
   spelling error, not a cosmetic one. We can't spell-check Yoruba here, but
   we CAN assert that a Yoruba value which should contain them still does:
   any Yoruba string that lost every underdot while its committed reference
   had them is almost certainly diacritic-stripped. The lightweight proxy: a
   Yoruba value with no combining marks AND no underdotted letters at all,
   on a string long enough to expect at least one, is suspicious. */
const UNDERDOTTED = /[ẹọṣẸỌṢ]/;
const COMBINING = /[̣̀́]/;

const dicts = {};
// Underscore-prefixed keys are metadata for maintainers, not translatable
// strings; loadDict strips them, so keep the raw form for the few checks
// (like _identical) that need to read them.
const rawDicts = {};
LOCALES.forEach((l) => {
  dicts[l.code] = loadDict(l.code);
  const file = path.join(I18N, `${l.code}.json`);
  rawDicts[l.code] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
});

const errors = [];
const warnings = [];

const base = dicts[DEFAULT];
if (!base) {
  console.error(`FATAL: default locale dictionary i18n/${DEFAULT}.json is missing.`);
  process.exit(2);
}
const baseKeys = Object.keys(base).sort();

LOCALES.forEach((l) => {
  if (l.code === DEFAULT) return;
  const dict = dicts[l.code];
  if (!dict) {
    errors.push(`${l.code}: dictionary i18n/${l.code}.json does not exist`);
    return;
  }
  const keys = new Set(Object.keys(dict));

  baseKeys.forEach((key) => {
    if (!keys.has(key)) {
      errors.push(`${l.code}: missing key "${key}"`);
      return;
    }
    const src = base[key];
    const val = dict[key];

    if (typeof val !== 'string' || val.trim() === '') {
      errors.push(`${l.code}: key "${key}" is empty`);
      return;
    }

    // Placeholder drift — a renamed or dropped {var} silently swallows data.
    const want = placeholders(src);
    const got = placeholders(val);
    want.forEach((p) => {
      if (!got.has(p)) errors.push(`${l.code}: key "${key}" drops placeholder {${p}}`);
    });
    got.forEach((p) => {
      if (!want.has(p)) errors.push(`${l.code}: key "${key}" adds unknown placeholder {${p}}`);
    });

    // Untranslated copy. Brand names, platform names and acronyms are
    // legitimately identical across languages, so only flag strings long
    // enough that an exact match cannot be coincidence, and skip the keys
    // we know are deliberately Latin-invariant.
    /* Some words genuinely are the same in two languages — "Notifications"
       and "Documents" are identical in English and French, and the brand
       name is identical everywhere. A dictionary declares those in an
       `_identical` array so the warning list stays short enough that a real
       untranslated string still stands out in it. */
    const declaredIdentical = (rawDicts[l.code]._identical || []).indexOf(key) > -1;
    const invariant = declaredIdentical ||
      /^(topbar\.(whatsapp|facebook|instagram|youtube)|brand\.name)$/.test(key);
    if (!invariant && val === src && src.length > 12) {
      warnings.push(`${l.code}: key "${key}" is identical to ${DEFAULT} ("${src.slice(0, 48)}…")`);
    }
  });

  Object.keys(dict).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      errors.push(`${l.code}: unknown key "${key}" (not in ${DEFAULT})`);
    }
  });

  // Yoruba-specific orthography guard.
  if (l.code === 'yo') {
    let marked = 0;
    let total = 0;
    Object.keys(dict).forEach((key) => {
      const v = String(dict[key]);
      if (v.length < 12) return;
      total += 1;
      if (UNDERDOTTED.test(v) || COMBINING.test(v)) marked += 1;
    });
    // Yoruba prose of any length nearly always carries diacritics; if fewer
    // than half the substantial strings do, the file has been flattened.
    if (total > 0 && marked / total < 0.5) {
      errors.push(
        `yo: only ${marked}/${total} substantial strings carry Yoruba diacritics — ` +
        `the dictionary looks diacritic-stripped (tone marks and underdots lost)`
      );
    }
  }
});

// --- Report --------------------------------------------------------------
const localeList = LOCALES.map((l) => l.code).join(', ');
console.log(`i18n parity: ${baseKeys.length} keys × ${LOCALES.length} locales (${localeList})`);

warnings.forEach((w) => console.log(`  warn  ${w}`));
errors.forEach((e) => console.error(`  ERROR ${e}`));

if (errors.length || (STRICT && warnings.length)) {
  console.error(`\ni18n parity FAILED — ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`i18n parity OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);

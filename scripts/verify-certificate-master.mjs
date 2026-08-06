#!/usr/bin/env node
// Freeze gate for the certificate master.
//
// The other verify-* gates answer "is this batch correct?" — they re-derive
// serials, recompute hashes, re-measure the plate. Not one of them can answer
// "is this the same master?", because every one of them consults the current
// source to decide what correct means. Change the typeface, move the seal 3mm,
// re-cut the crest, and they all still pass: the sheet is internally
// consistent, it is simply no longer the sheet the six graduates were issued.
//
// This gate is the only one that holds a fixed, external opinion. It compares
// the bytes of every file on the render path against hashes recorded in
// docs/shrs-certificate-master-freeze-declaration.md at v1.0.
//
// WHY THE BASELINE LIVES IN THE DECLARATION, NOT IN THIS FILE
// A freeze whose baseline sits beside the gate is two files one commit can
// change together — and the published declaration then quietly stops being
// what is enforced. Parsing the declaration makes the document load-bearing:
// the hashes the Founder signed are the hashes that run.
//
// WHY THERE IS NO --update FLAG
// A gate that can rewrite its own baseline is a gate that gets rewritten
// instead of investigated. Re-baselining is a deliberate edit to the
// declaration, reviewed like any other change to a signed document.
//
// This gate only reads. It cannot alter a certificate number, a Student ID or
// a content hash, and must never be given the ability to.
//
// Usage: node scripts/verify-certificate-master.mjs [--strict]
//        --strict escalates warnings (undeclared / orphaned) to failures.
//        CI runs it with --strict; a human checking a working tree does not.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATION = 'docs/shrs-certificate-master-freeze-declaration.md';

// Verbatim, as the Founder specified it. A freeze declaration whose own
// release identity has been edited is not the declaration that was signed, so
// this is checked before a single hash is compared.
const RELEASE_IDENTITY = [
  "Sultan Hanafi Royal Schools — Official I'dadiyyah Certificate System",
  'Production Release v1.0 Master Locked',
];

// Entry points for re-deriving the render path. The template is the sheet;
// ground and plate are the vector authority the supplied artwork was solved
// against (nothing imports them at render time, which is exactly why they need
// naming here — an unimported file is invisible to an import walk); qrcode.js
// produces the QR that prints on the sheet, reached through the caller rather
// than through an import edge.
const RENDER_ROOTS = [
  'functions/_lib/stage-certificate-template.js',
  'functions/_lib/certificate-ground.js',
  'functions/_lib/certificate-plate.js',
  'functions/_lib/qrcode.js',
];

// The only absolute URLs a frozen source may contain. These are XML namespace
// identifiers — SVG will not parse without them and nothing is ever fetched
// from them. Any other absolute URL on the render path means the sheet reaches
// off-repository at render time, which freezing the repository does not
// freeze. See the declaration, "What a freeze does not guarantee".
const ALLOWED_ABSOLUTE_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
]);

const STRICT = process.argv.includes('--strict');

const fails = [];
const warns = [];
let pass = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ok   ${name}`); return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}
function warn(name, detail) {
  const line = `${name}${detail ? ` — ${detail}` : ''}`;
  if (STRICT) { fails.push(line); console.log(`  FAIL ${line}`); return; }
  warns.push(line);
  console.log(`  WARN ${line}`);
}

function sha256Of(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

// ── 1. The declaration, and the manifest inside it ──────────────────────────

const declAbs = resolve(ROOT, DECLARATION);
if (!existsSync(declAbs)) {
  console.error(`\nMASTER FREEZE — CANNOT RUN\n\n  ${DECLARATION} is missing.\n` +
    '  Without the declaration there is no baseline, and a freeze gate with no\n' +
    '  baseline must fail rather than pass silently.\n');
  process.exit(1);
}
const declaration = readFileSync(declAbs, 'utf8');

console.log(`\nMaster freeze — baseline: ${DECLARATION}\n`);
console.log('— release identity —');
for (const line of RELEASE_IDENTITY) {
  check(`declaration carries "${line}"`, declaration.includes(line));
}

// Checked as an ADJACENT PAIR, not as two independent substrings. Proving this
// gate caught the loophole: the second line also occurs in §7's prose (it
// quotes the pass banner), so a header edited from v1.0 to v1.1 still
// satisfied a plain substring test and the run reported clean. The release
// identity is a two-line block; enforce it as one.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const adjacent = new RegExp(
  `${escapeRe(RELEASE_IDENTITY[0])}[^\n]*\n[^\n]*${escapeRe(RELEASE_IDENTITY[1])}`);
check('the two identity lines stand together as the declaration\'s own header',
  adjacent.test(declaration));

// Delimited by explicit markers rather than "the first code fence", so adding
// prose or another example block to the declaration cannot silently move which
// block is enforced.
const block = declaration.match(/<!-- MANIFEST:BEGIN -->([\s\S]*?)<!-- MANIFEST:END -->/);
if (!block) {
  console.error('\n  FAIL manifest block not found — expected <!-- MANIFEST:BEGIN --> … <!-- MANIFEST:END -->\n');
  process.exit(1);
}
const manifest = new Map();
const malformed = [];
for (const raw of block[1].split('\n')) {
  const line = raw.trim();
  if (!line || line.startsWith('```') || line.startsWith('#')) continue;
  const m = line.match(/^([0-9a-f]{64})\s+(\S.*)$/);
  if (!m) { malformed.push(line); continue; }
  if (manifest.has(m[2])) malformed.push(`duplicate entry: ${m[2]}`);
  manifest.set(m[2], m[1]);
}
check('every manifest line parses as "<sha256>  <path>"', malformed.length === 0,
  malformed.slice(0, 5).join(' | '));

// A manifest that parsed to nothing (or nearly nothing) is the failure mode a
// naive parser hides: it reports a clean run having checked no files at all.
check('manifest is populated', manifest.size >= 20, `${manifest.size} entries parsed`);
if (manifest.size === 0) {
  console.error('\n  refusing to report a pass over an empty manifest\n');
  process.exit(1);
}

// ── 2. Re-derive the render path from the sources themselves ────────────────
// Deliberately independent of the manifest: the manifest is the claim, this is
// the evidence. Walking relative imports from the roots and collecting every
// /assets/ reference finds a font or a crest that was added to the sheet
// without being declared.

const derived = new Set();
const externalUrls = [];
const walkQueue = [...RENDER_ROOTS];
const walked = new Set();
while (walkQueue.length) {
  const rel = walkQueue.shift();
  if (walked.has(rel)) continue;
  walked.add(rel);
  derived.add(rel);
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) continue;   // reported as MISSING by the manifest pass
  const src = readFileSync(abs, 'utf8');
  for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"](\.[^'"]+)['"]/g)) {
    walkQueue.push(relative(ROOT, resolve(dirname(abs), m[1])).split(sep).join('/'));
  }
  for (const m of src.matchAll(/['"(](\/assets\/[A-Za-z0-9._/-]+)['")]/g)) {
    derived.add(m[1].replace(/^\//, ''));
  }
  for (const m of src.matchAll(/https?:\/\/[^'"`)\s]+/g)) {
    if (!ALLOWED_ABSOLUTE_URLS.has(m[0])) externalUrls.push(`${rel}: ${m[0]}`);
  }
}

console.log('\n— render path —');
check('no frozen source fetches from a host outside this repository',
  externalUrls.length === 0, externalUrls.slice(0, 5).join(' | '));

const undeclared = [...derived].filter((p) => !manifest.has(p)).sort();
if (undeclared.length) {
  for (const p of undeclared) warn('on the render path but not in the manifest', p);
} else {
  check(`every file on the derived render path is declared (${derived.size} found)`, true);
}

// The other direction. A declared file that has left the render path can only
// happen if a frozen source changed — which fails on its hash below — or if
// the manifest was edited by hand, which is worth saying out loud.
const orphaned = [...manifest.keys()].filter((p) => !derived.has(p)).sort();
if (orphaned.length) {
  for (const p of orphaned) warn('in the manifest but no longer on the render path', p);
} else {
  check('no manifest entry has fallen off the render path', true);
}

// ── 3. The freeze itself ────────────────────────────────────────────────────

console.log('\n— frozen bytes —');
const missing = [];
const drifted = [];
for (const [rel, expected] of manifest) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) { missing.push(rel); continue; }
  const actual = sha256Of(abs);
  if (actual !== expected) drifted.push({ rel, expected, actual });
}
check(`no frozen file is missing (${manifest.size} declared)`, missing.length === 0,
  missing.join(', '));
check('no frozen file has drifted', drifted.length === 0,
  drifted.map((d) => d.rel).join(', '));

if (missing.length || drifted.length) {
  console.log('\n— what changed —');
  for (const rel of missing) {
    console.log(`  ! MISSING  ${rel}`);
  }
  for (const d of drifted) {
    console.log(`  ! DRIFTED  ${d.rel}`);
    console.log(`             declared ${d.expected}`);
    console.log(`             on disk  ${d.actual}`);
  }
  console.log('\n  The master is locked at v1.0. If this change is intended, it is a new\n' +
    '  release: amend the declaration, re-baseline, and record why — do not\n' +
    '  edit the hash to match the file.');
}

// ── 4. Verdict ──────────────────────────────────────────────────────────────

console.log(`\n${pass} passed, ${fails.length} failed, ${warns.length} warned` +
  `${STRICT ? '  (--strict)' : ''}`);
if (warns.length) warns.forEach((w) => console.log(`  ~ ${w}`));
if (fails.length) {
  fails.forEach((f) => console.log(`  ! ${f}`));
  console.log('\nMASTER FREEZE VIOLATED\n');
  process.exit(1);
}
console.log('\nMaster intact — Production Release v1.0 Master Locked\n');

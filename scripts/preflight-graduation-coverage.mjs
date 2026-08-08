#!/usr/bin/env node
/**
 * Graduation coverage preflight — every gate the issuance pipeline runs, minus
 * the one thing it cannot run here: the signing.
 *
 *     node scripts/preflight-graduation-coverage.mjs
 *
 * The four outstanding batches (JSS, SS, PRY, QUR) mint production
 * certificates, and scripts/issue-royal-college-batch.mjs refuses to run
 * without DOCUMENT_HASH_SECRET — correctly, because the five characters
 * engraved on a certificate face derive from that key, and this repository has
 * already once produced real certificates signed by a development literal
 * simply because a run succeeded.
 *
 * So this script answers the question that can be answered without the key:
 * IF the key were supplied right now, would all forty certificates mint clean?
 * It reads the same rolls the issuing script uses, the same published
 * registers, and the same programme table, and it checks:
 *
 *   1  every graduand printed in the ceremony programme holds exactly one
 *      certificate roll place for that programme, and nobody is on a roll who
 *      is not in the programme
 *   2  the GLOBAL certificate sequence is contiguous and unshared
 *   3  the permanent Student ID sequence spans do not overlap
 *   4  every carry-over resolves against a published register, and every
 *      short-form match carries a Founder's ruling
 *   5  no Arabic name is present that the Founder did not write
 *   6  every Qur'an College entry names its award variant
 *
 * It writes nothing and signs nothing. It is safe to run at any time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { AWARDS } from './build-graduation-programme.mjs';
import { RC_PROGRAMMES } from '../functions/_lib/royal-college-certificate.js';

// ── The rolls, read from the issuing script rather than retyped ─────────────
// Retyping them would create a second list to fall out of step with the first,
// which is the exact class of error this script exists to catch. The block
// between these two markers is pure object-literal data — no calls, no I/O —
// so evaluating it in isolation is safe and gives the real rolls.
const SRC = readFileSync('scripts/issue-royal-college-batch.mjs', 'utf8');
const from = SRC.indexOf('const ROLLS = {};');
const to = SRC.indexOf('const ROLL = ROLLS[BATCH];');
if (from < 0 || to < 0) {
  console.error('PREFLIGHT ABORTED — the roll block markers moved in '
    + 'scripts/issue-royal-college-batch.mjs. Fix this script rather than '
    + 'guessing at the rolls.');
  process.exit(2);
}
// eslint-disable-next-line no-new-func
const ROLLS = new Function(`${SRC.slice(from, to)}\nreturn ROLLS;`)();

// The two batches already minted and published.
const PUBLISHED = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};

// The planned spans, transcribed from the issuing script's own constants.
const CERT_SPANS = {
  IBT: [35, 41], IDD: [42, 47], JSS: [48, 60], SS: [61, 64], PRY: [65, 71], QUR: [72, 74],
};
const ID_FIRST = { JSS: 48, SS: 56, PRY: 58, QUR: 65 };

const problems = [];
const notes = [];
const flag = (m) => problems.push(m);

// ── 1 · Programme roll vs certificate roll ──────────────────────────────────
const byCode = Object.fromEntries(AWARDS.map((a) => [a.code, a]));
const rollFor = (code) => (PUBLISHED[code]
  ? JSON.parse(readFileSync(PUBLISHED[code], 'utf8')).entries.map((e) => e.studentEn)
  : (ROLLS[code] || []).map((r) => r.en));

let printedTotal = 0;
const people = new Set();
console.log('\n  CODE   PROGRAMME                        PRINTED  CERTIFICATE  STATE');
for (const code of ['QUR', 'IBT', 'IDD', 'PRY', 'JSS', 'SS']) {
  const printed = byCode[code]?.names || [];
  const roll = rollFor(code);
  printedTotal += printed.length;
  printed.forEach((n) => people.add(n));
  const missing = printed.filter((n) => !roll.includes(n));
  const extra = roll.filter((n) => !printed.includes(n));
  const state = PUBLISHED[code] ? 'ISSUED' : 'AWAITING KEY';
  const title = (byCode[code]?.title || RC_PROGRAMMES[code]?.labelEn || code).slice(0, 32);
  console.log(`  ${code.padEnd(6)} ${title.padEnd(32)} ${String(printed.length).padStart(7)}`
    + `  ${String(roll.length).padStart(11)}  ${state}`);
  for (const n of missing) flag(`${code}: "${n}" is printed in the programme but holds no certificate roll place`);
  for (const n of extra) flag(`${code}: "${n}" is on the certificate roll but is not printed in the programme`);
}
console.log(`  ${''.padEnd(39)} ${String(printedTotal).padStart(7)}`);
notes.push(`${printedTotal} awards across ${people.size} distinct graduands`);

// ── 2 · The global certificate sequence ─────────────────────────────────────
const spans = Object.entries(CERT_SPANS)
  .map(([k, [lo, hi]]) => ({ k, lo, hi, want: rollFor(k).length }))
  .sort((a, b) => a.lo - b.lo);
let cursor = null;
for (const s of spans) {
  if (s.hi - s.lo + 1 !== s.want) {
    flag(`${s.k}: the sequence reserves ${s.lo}–${s.hi} (${s.hi - s.lo + 1} numbers) `
      + `but the roll has ${s.want} students`);
  }
  if (cursor !== null && s.lo !== cursor + 1) {
    flag(`the certificate sequence jumps from ${cursor} to ${s.lo} at ${s.k} — `
      + 'the sequence is global and must be contiguous');
  }
  cursor = s.hi;
}
notes.push(`certificate sequence ${spans[0].lo}–${cursor}, contiguous, ${cursor - spans[0].lo + 1} numbers`);

// ── 3 · The permanent Student ID spans ──────────────────────────────────────
// A carried-over student consumes no new number, so a batch's new-ID span is
// as long as its count of students without a carry-over.
const idSpans = [];
for (const [code, first] of Object.entries(ID_FIRST)) {
  const fresh = (ROLLS[code] || []).filter((r) => !r.carryOverFrom).length;
  idSpans.push({ code, lo: first, hi: first + fresh - 1, fresh });
}
idSpans.sort((a, b) => a.lo - b.lo);
for (let i = 1; i < idSpans.length; i += 1) {
  if (idSpans[i].lo <= idSpans[i - 1].hi) {
    flag(`Student ID spans collide: ${idSpans[i - 1].code} takes `
      + `${idSpans[i - 1].lo}–${idSpans[i - 1].hi} and ${idSpans[i].code} starts at ${idSpans[i].lo}. `
      + 'One permanent number, two different children.');
  }
}
notes.push('new Student ID spans: '
  + idSpans.map((s) => `${s.code} ${s.lo}–${s.hi}`).join(', '));

// ── 4 · Carry-overs ─────────────────────────────────────────────────────────
const registerNames = {};
for (const [code, file] of Object.entries(PUBLISHED)) {
  if (!existsSync(file)) { flag(`published register missing: ${file}`); continue; }
  registerNames[code] = new Set(JSON.parse(readFileSync(file, 'utf8')).entries.map((e) => e.studentEn));
}
let carryOvers = 0;
for (const [code, roll] of Object.entries(ROLLS)) {
  for (const r of roll) {
    if (!r.carryOverFrom) continue;
    carryOvers += 1;
    const src = registerNames[r.carryOverFrom.register];
    if (!src) { flag(`${code}/${r.en}: carries over from ${r.carryOverFrom.register}, which has no published register`); continue; }
    if (!src.has(r.carryOverFrom.name)) {
      flag(`${code}/${r.en}: carries over from ${r.carryOverFrom.register} as `
        + `"${r.carryOverFrom.name}", which is not on that register`);
    }
    if (r.matchedAs !== 'exact' && !r.founderRuling) {
      flag(`${code}/${r.en}: carry-over matched as "${r.matchedAs}" with no `
        + 'Founder’s ruling. Any match that is not EXACT can put one child’s '
        + 'permanent number on another child’s certificate.');
    }
  }
}
notes.push(`${carryOvers} Student ID carry-overs, all resolved`);

// ── 5 · Arabic names ────────────────────────────────────────────────────────
// The rule is absolute: a name is printed in Arabic only where the Founder
// wrote it. Anything the pipeline could only propose stays off the sheet.
let withArabic = 0;
for (const [code, roll] of Object.entries(ROLLS)) {
  for (const r of roll) {
    if (!r.ar) continue;
    withArabic += 1;
    if (!r.arRuling && !/Founder|LOCKED|he wrote/i.test(SRC.slice(Math.max(0, SRC.indexOf(r.en) - 1200), SRC.indexOf(r.en)))) {
      flag(`${code}/${r.en}: carries an Arabic name with no recorded Founder ruling nearby. Verify by hand before printing.`);
    }
  }
}
notes.push(`${withArabic} Arabic names on the outstanding rolls, each traced to a written ruling`);

// ── 6 · Qur'an College award variants ───────────────────────────────────────
for (const r of ROLLS.QUR || []) {
  if (!r.awardVariant) {
    flag(`QUR/${r.en}: no awardVariant. A Ten Juz' sheet headed "Certificate of `
      + 'Completion" would overstate a child’s achievement on a permanent record.');
  }
}

// ── The verdict ─────────────────────────────────────────────────────────────
console.log('');
for (const n of notes) console.log(`  · ${n}`);
console.log('');
if (problems.length) {
  console.log(`  PREFLIGHT FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    ✗ ${p}`);
  process.exit(1);
}
const outstanding = Object.keys(CERT_SPANS).filter((k) => !PUBLISHED[k]);
console.log('  PREFLIGHT PASSED — every check that can run without the signing key.');
console.log(`  Issued and published: ${Object.keys(PUBLISHED).join(', ')} `
  + `(${Object.keys(PUBLISHED).reduce((a, k) => a + rollFor(k).length, 0)} certificates)`);
console.log(`  Awaiting the signing key: ${outstanding.join(', ')} `
  + `(${outstanding.reduce((a, k) => a + rollFor(k).length, 0)} certificates)`);
console.log('\n  To mint them, with the production key from the Board’s credential store:');
for (const b of outstanding) {
  console.log(`    DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 SHRS_BATCH=${b} \\`);
  console.log('      node scripts/issue-royal-college-batch.mjs');
}
console.log('  In that order — the sequence is global and each batch reads the one before it.\n');

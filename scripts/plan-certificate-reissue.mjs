#!/usr/bin/env node
/**
 * The reissue and allocation plan for the Class of 2026.
 *
 *     node scripts/plan-certificate-reissue.mjs [--write]
 *
 * The Registrar's roll became authoritative on 8 August 2026, after thirteen
 * certificates had already been minted against a different one. This computes
 * exactly what that costs, per certificate:
 *
 *   KEEP     minted, and the holder is on the canonical roll under the same
 *            engraved name. Nothing to do.
 *   REVOKE   minted, and the holder is not on the canonical roll for that
 *            programme at all. The award is not theirs.
 *   REISSUE  minted, the holder IS on the canonical roll for that programme,
 *            but under a fuller name. The engraved name is wrong, and because
 *            the name is hashed into the number it cannot be corrected in
 *            place — the sheet is revoked and a new one issued.
 *   NEW      on the canonical roll, holding no certificate for that programme.
 *
 * It then allocates the global sequence for everything that must be minted.
 * The sequence issues a number ONCE, EVER: 000035–000047 are spent, including
 * on certificates about to be revoked, because a revoked certificate has still
 * been issued. New numbers therefore continue from 000048.
 *
 * It writes nothing to the certificate system and signs nothing. It is the
 * instruction the Registrar works from, and it is reproducible.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { formatStudentIdentityNo } from '../functions/_lib/identity-no.js';

const CANON = JSON.parse(readFileSync('docs/graduation-registers/canonical-roll-2026.json', 'utf8'));
const canon = (c) => (CANON.categories.find((x) => x.code === c) || { names: [] }).names;

const MINTED = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};
const minted = {};
for (const [c, f] of Object.entries(MINTED)) {
  minted[c] = JSON.parse(readFileSync(f, 'utf8')).entries;
}

// The same clustering the canonical roll was built with, so "same child under a
// fuller name" is judged identically in both places. Kept deliberately narrow:
// a given name plus one shared further part, or an explicit ruling.
const SAME_CHILD = [
  ['Ashrof Akorede', 'Ashrof Ojewumi', 'Ashraf Ojewumi', 'Ashraf Korede Ojewumi'],
  ['Naheemah Ismail', 'Naheemah Ismaeel', 'Naheemah Ismai Seriki', 'Naheemah Ismail Seriki'],
  ['Zainab Anofi', 'Zaynab Anofi', 'Zaynab Zakariya Anofi'],
  ['Fareedah Aliu', 'Faridah Aliu', 'Faridah Ayomide Aliu'],
  ['Fateemah Ibrahim', 'Fatimah Desire Ibrahim'],
  ['Anisa Jokumba', 'Anisa Opeyemi Jokomba'],
  ['Basit Jabarr', 'Abdulbasit Jabarr', 'Abdulbasit Amobi Jabarr'],
];
const norm = (s) => s.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
const parts = (s) => norm(s).split(/\s+/).filter(Boolean);
const rk = (n) => { const i = SAME_CHILD.findIndex((g) => g.includes(n)); return i < 0 ? null : i; };
function same(a, b) {
  const x = rk(a); const y = rk(b);
  if (x !== null && y !== null) return x === y;
  if (x !== null || y !== null) return false;
  if (parts(a)[0] !== parts(b)[0]) return false;
  const B = new Set(parts(b).slice(1));
  return parts(a).slice(1).some((t) => B.has(t));
}

// ── Classify every minted certificate ───────────────────────────────────────
const actions = [];
for (const [code, rows] of Object.entries(minted)) {
  const want = canon(code);
  for (const e of rows) {
    const match = want.find((n) => same(n, e.studentEn));
    if (!match) {
      actions.push({ kind: 'REVOKE', code, name: e.studentEn, cert: e.serialNo,
        id: e.identityNo, why: `not on the Registrar’s ${code} roll` });
    } else if (match === e.studentEn) {
      actions.push({ kind: 'KEEP', code, name: e.studentEn, cert: e.serialNo, id: e.identityNo });
    } else {
      // The same child, under a shorter engraved name than the canonical roll
      // carries. This USED to be a REISSUE: revoke the sheet in the child's
      // hands and mint a replacement, because the engraved name is hashed into
      // the number and cannot be corrected in place.
      //
      // FOUNDER'S RULING, 15 August 2026: "Whatever certificate has been issued
      // before should not be altered."
      //
      // So it is kept. The canonical name governs every record the institution
      // writes from here on — registers, transcripts, the verification portal,
      // every future award — and the certificate already conferred keeps the
      // name it was conferred under, because that is what the document in the
      // child's hands says and the record must match the document.
      //
      // Nothing is lost by this. The Student ID is permanent and unchanged, so
      // the verification portal resolves her older certificate and her newer
      // ones together under one identity; certificate-serial.js knows the two
      // spellings are one child and returns the index rather than a fault.
      actions.push({ kind: 'KEEP', code, name: e.studentEn, cert: e.serialNo,
        id: e.identityNo, canonicalName: match,
        why: 'engraved under a shorter name than the canonical roll carries; '
          + 'KEPT UNALTERED on the Founder’s ruling of 15 Aug 2026. The canonical '
          + 'name governs every future record; this document keeps the name it '
          + 'was conferred under.' });
    }
  }
}

// ── Everything that must be minted ──────────────────────────────────────────
// Order: the sequence follows the programme's own order of the schools, so the
// numbers run in the order the awards are conferred.
const ORDER = ['QUR', 'TMH', 'IBT', 'IDD', 'PRY', 'JSS', 'SS'];
const toMint = [];
for (const code of ORDER) {
  for (const n of canon(code)) {
    const held = (minted[code] || []).find((e) => same(n, e.studentEn));
    // Holds a certificate for THIS programme already — under any spelling of
    // her name. Nothing to mint. The test used to be `held.studentEn === n`,
    // which minted a replacement whenever the engraved name was shorter than
    // the canonical one; the Founder's ruling of 15 August 2026 that an issued
    // certificate is not altered removes that case entirely.
    if (held) continue;
    // One child, one permanent number, for life — across EVERY programme, not
    // just this one. A child who holds an I'dadiyyah number and is now to
    // receive a Qur'an College certificate carries the same number onto it.
    const anywhere = Object.values(minted).flat().find((e) => same(n, e.studentEn));
    toMint.push({
      code, name: n,
      replaces: held ? held.serialNo : null,
      identity: anywhere ? anywhere.identityNo : null,
      identityFrom: anywhere ? anywhere.serialNo : null,
    });
  }
}

// The sequence is global and 000035–000047 are spent, revoked or not.
const SPENT_TO = 47;
let seq = SPENT_TO;
for (const r of toMint) { seq += 1; r.certificateSeq = seq; }

// ── The permanent Student ID ────────────────────────────────────────────────
// A certificate number is allocated per CERTIFICATE. A Student ID is allocated
// per CHILD, and once — it is the one number a person carries for life, across
// every stage and every year.
//
// Those two facts are not the same fact, and conflating them is how a pipeline
// hands one child two permanent numbers. This roll contains the case exactly:
// Ameerah Abdulhafeez holds no certificate yet and appears TWICE on it, for
// Ibtidā'iyyah and for Junior Secondary. Allocating alongside the certificate
// sequence would have minted her two numbers in a single run.
//
// So allocation here is keyed on the child, not the row. Children are keyed by
// their canonical name string, which is safe precisely because the canonical
// roll has already resolved every alternative spelling of one child down to one
// string — two rows reading the same string are one child by construction. (The
// converse risk, two DIFFERENT children sharing a full name, would defeat this;
// no such pair exists on this roll, and the gate below would not catch it. If
// one ever appears the Registrar must distinguish them before this runs.)
const identityTaken = new Map();          // identityNo → who already holds it
{
  // Which sequence values are already consumed is READ, not assumed. The
  // Student ID body is a bijection of the sequence — (seq·MULT + OFFSET) mod
  // 10^12 — so every issued number has exactly one sequence value behind it,
  // and it is recovered here by forward-mapping a bounded range rather than
  // by trusting a constant somebody remembered to update.
  const bySeq = new Map();
  for (let s = 1; s <= 5000; s += 1) bySeq.set(formatStudentIdentityNo(s), s);
  for (const [code, rows] of Object.entries(minted)) {
    for (const e of rows) {
      identityTaken.set(e.identityNo, { name: e.studentEn, code });
      const s = bySeq.get(e.identityNo);
      if (s === undefined) {
        console.error(`  ${e.identityNo} (${e.studentEn}) is not in the first 5000 of the `
          + 'Student ID sequence — the allocation floor below cannot be computed.');
        process.exit(1);
      }
      e.identitySeq = s;
    }
  }
}
const identitySpentTo = Math.max(...Object.values(minted).flat().map((e) => e.identitySeq));
let idSeq = identitySpentTo;
const perChild = new Map();
for (const r of toMint) {
  if (r.identity) {
    // Already holds one, from a certificate minted on 8 August. It carries.
    perChild.set(r.name, { identityNo: r.identity, source: `carried from ${r.identityFrom}` });
  } else if (!perChild.has(r.name)) {
    idSeq += 1;
    perChild.set(r.name, {
      identityNo: formatStudentIdentityNo(idSeq),
      source: `newly issued (identity sequence ${idSeq})`,
      identitySeq: idSeq,
    });
  }
  const held = perChild.get(r.name);
  r.identity = held.identityNo;
  r.identitySource = held.source;
}

// One number, one child — proved, not asserted. Checked in both directions:
// no child holding two numbers, and no number held by two children (including
// the thirteen already minted).
{
  const byChild = new Map();
  const byNumber = new Map();
  const faults = [];
  for (const r of toMint) {
    if (byChild.has(r.name) && byChild.get(r.name) !== r.identity) {
      faults.push(`${r.name} would hold two permanent Student IDs: `
        + `${byChild.get(r.name)} and ${r.identity}`);
    }
    byChild.set(r.name, r.identity);
    const prior = identityTaken.get(r.identity);
    if (prior && prior.name !== r.name) {
      // A number already engraved on a minted certificate, now appearing under
      // a different written name. That is either the worst fault this pipeline
      // can produce — one number, two children — or the most ordinary lawful
      // thing it does: the same child, under the fuller name the Registrar's
      // roll gives her. The two are told apart by evidence, not by charity.
      //
      // The carry is lawful only if this row DECLARES where the number came
      // from (identityFrom names one specific certificate), that certificate is
      // the one the prior holder holds, and the clustering that built the
      // canonical roll agrees the two written forms are one child. Anything
      // short of all three stops the plan.
      const declared = r.identityFrom
        && (minted[prior.code] || []).some((e) => e.serialNo === r.identityFrom
          && e.studentEn === prior.name)
        && same(r.name, prior.name);
      if (!declared) {
        faults.push(`${r.name} would take ${r.identity}, which already belongs to `
          + `${prior.name} (${prior.code})`);
      }
    }
    if (byNumber.has(r.identity) && byNumber.get(r.identity) !== r.name) {
      faults.push(`${r.identity} would be held by both ${byNumber.get(r.identity)} and ${r.name}`);
    }
    byNumber.set(r.identity, r.name);
  }
  if (faults.length) {
    console.error('\n  PLAN REJECTED — the permanent Student ID allocation is not one-to-one:');
    for (const f of faults) console.error(`    ${f}`);
    process.exit(1);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const L = (s = '') => console.log(s);
const tally = (k) => actions.filter((a) => a.kind === k).length;
L();
L('  CLASS OF 2026 · REISSUE AND ALLOCATION PLAN');
L('  Registrar’s roll authoritative from 8 August 2026');
L('  ──────────────────────────────────────────────────────────────────────');
L(`  Already minted: ${actions.length}   `
  + `KEEP ${tally('KEEP')} · REISSUE ${tally('REISSUE')} · REVOKE ${tally('REVOKE')}`);
L(`  To be minted:   ${toMint.length}   numbers 0000${SPENT_TO + 1}–${String(seq).padStart(6, '0')}`);

for (const k of ['KEEP', 'REISSUE', 'REVOKE']) {
  const rows = actions.filter((a) => a.kind === k);
  if (!rows.length) continue;
  L(`\n  ── ${k} ─────────────────────────────────────────────────────────────`);
  for (const a of rows) {
    L(`     ${a.code}  ${a.name.padEnd(26)} ${a.cert}`);
    if (a.to) L(`           → reissue as ${a.to}`);
    if (a.why) L(`           ${a.why}`);
  }
}

L('\n  ── TO BE MINTED ────────────────────────────────────────────────────────');
L('     SEQ     PROG  NAME                          STUDENT ID');
for (const r of toMint) {
  L(`     ${String(r.certificateSeq).padStart(6, '0')}  ${r.code.padEnd(4)}  ${r.name.padEnd(28)} `
    + `${r.identity}  ${r.identitySource.startsWith('carried') ? 'carried' : 'new'}`);
}

L('\n  ── ONE CHILD, ONE PERMANENT NUMBER ─────────────────────────────────────');
L(`     Student ID sequence spent through ${identitySpentTo}; `
  + `this plan allocates ${identitySpentTo + 1}–${idSeq}.`);
const awards = new Map();
for (const r of toMint) awards.set(r.name, (awards.get(r.name) || 0).valueOf() + 1);
const multi = [...awards].filter(([, n]) => n > 1);
L(`     ${awards.size} children · ${toMint.length} certificates · `
  + `${multi.length} children receiving more than one`);
for (const [name, n] of multi) {
  const rows = toMint.filter((r) => r.name === name);
  L(`       ${name.padEnd(28)} ${n} awards (${rows.map((r) => r.code).join(', ')})  `
    + `${rows[0].identity}  ${rows[0].identitySource.startsWith('carried') ? 'carried' : 'new'}`);
}

L('\n  ── NAMES THAT STILL NEED A RULING ──────────────────────────────────────');
// Two forms the clustering deliberately refused to merge, because merging them
// would be a guess about a child's identity rather than about a spelling.
// Both were ruled on 8 August 2026 and are closed. Kept as a record of what was
// asked and what was answered, because a name question that has been settled is
// still a name question that was once open.
const OPEN = [];
const CLOSED = [
  ['Basit Jabarr vs Abdulbasit Amobi Jabarr',
    'RULED: "They are one." Basit is the short form of Abdulbasit; one boy, two '
    + 'awards. His I‘dādiyyah certificate 000046 already carries the fuller name '
    + 'for the right programme, so it is KEPT rather than revoked.'],
  ['Balogun Yaseer',
    'RULED: "Yaseer Balogun is the name." Given-name-first, as every other name '
    + 'on the roll is.'],
];
if (!OPEN.length) L('     (none — both were ruled on 8 August 2026)');
L('\n  ── NAME QUESTIONS RULED ────────────────────────────────────────────────');
for (const [q, a] of CLOSED) { L(`     ${q}`); L(`          ${a}`); L(); }

if (process.argv.includes('--write')) {
  writeFileSync('docs/graduation-registers/reissue-plan-2026.json',
    `${JSON.stringify({
      generatedBy: 'scripts/plan-certificate-reissue.mjs',
      authority: 'Founder’s ruling, 8 August 2026 — the Registrar’s roll governs.',
      spentThrough: SPENT_TO, allocatedThrough: seq,
      identitySpentThrough: identitySpentTo, identityAllocatedThrough: idSeq,
      actions, toMint, openNameQuestions: OPEN, ruledNameQuestions: CLOSED,
    }, null, 2)}\n`);
  L('  → docs/graduation-registers/reissue-plan-2026.json\n');
}

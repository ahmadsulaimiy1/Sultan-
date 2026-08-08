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
      actions.push({ kind: 'REISSUE', code, name: e.studentEn, cert: e.serialNo,
        id: e.identityNo, to: match,
        why: 'the canonical roll carries a fuller name; the engraved name is '
          + 'hashed into the number and cannot be corrected in place' });
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
    if (held && held.studentEn === n) continue;            // KEEP — already valid
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
    + `${r.identity ? `${r.identity} (carried)` : 'new'}`);
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
      actions, toMint, openNameQuestions: OPEN, ruledNameQuestions: CLOSED,
    }, null, 2)}\n`);
  L('  → docs/graduation-registers/reissue-plan-2026.json\n');
}

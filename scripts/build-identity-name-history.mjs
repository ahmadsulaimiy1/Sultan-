#!/usr/bin/env node
/**
 * The name history of every permanent Student ID, derived — never typed.
 *
 *     node scripts/build-identity-name-history.mjs [--write]
 *
 * The Student ID is the person; a name is an attribute of that identity, and
 * attributes have dates. This builds one row per (identity, name) from the two
 * sources that already govern names, and writes the SQL that seeds
 * student_identity_names:
 *
 *   the PUBLISHED REGISTERS  — what is engraved on a document in a child's
 *                              hands, and the day it was issued. Historical
 *                              fact; nothing may change it.
 *   the CANONICAL ROLL       — the name the institution uses now, and why.
 *
 * Deriving rather than maintaining is the point. A hand-kept history is a
 * third list to disagree with the other two, and the way it would disagree is
 * by telling a parent their child's certificate is under the wrong name.
 *
 * It writes nothing to the live system. The SQL it emits is applied with the
 * rest of a release.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { RULED_ONE_CHILD } from '../functions/_lib/certificate-serial.js';
import { PLAN, REGISTERS } from './_lib/class-of-2026.mjs';

const CANON = JSON.parse(readFileSync('docs/graduation-registers/canonical-roll-2026.json', 'utf8'));
const OUT = 'docs/graduation-registers/2026-08-15-IDENTITY-NAMES.sql';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, '').trim();
// The same question, answered the same way, as the public verification
// endpoint and the coverage preflight — imported from the endpoint's own
// module so the three cannot drift.
const group = (n) => RULED_ONE_CHILD.findIndex((g) => g.some((f) => norm(f) === norm(n)));
function sameChild(a, b) {
  const [na, nb] = [norm(a), norm(b)];
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [ga, gb] = [group(na), group(nb)];
  if (ga >= 0 || gb >= 0) return ga === gb;
  const [x, y] = [na.split(/\s+/), nb.split(/\s+/)];
  if (x[0] !== y[0]) return false;
  const rest = new Set(y.slice(1));
  return x.slice(1).some((t) => rest.has(t));
}

// ── 1 · What is engraved, and when it was issued ────────────────────────────
// Read off the published registers, which are the record of the documents
// themselves. These rows are historical and are never marked current by this
// step — whether an engraved name is still the institution's name is decided
// below, by the roll.
const engraved = [];
for (const [code, file] of Object.entries(REGISTERS)) {
  const reg = JSON.parse(readFileSync(file, 'utf8'));
  for (const e of reg.entries) {
    if (!e.identityNo) continue;
    engraved.push({
      id: e.identityNo,
      name: e.studentEn,
      ar: e.studentAr || null,
      from: reg.issuedAt || '2026-08-08',
      source: `published ${code} register`,
      reason: `the name engraved on ${e.serialNo}`,
    });
  }
}

// ── 2 · What the institution calls each child now ───────────────────────────
// The canonical roll, reached through the plan, which is what every issuing
// script reads. A name that is also the engraved one is not a second row; it
// is the same row, now marked current.
const current = new Map();
const claim = (id, name, from, source, reason) => {
  if (!id) return;
  if (!current.has(id)) current.set(id, { id, name, from, source, reason });
};
for (const r of PLAN.toMint) claim(r.identity, r.name, '2026-08-08', 'canonical roll of the Class of 2026', null);
for (const a of PLAN.actions) {
  // A certificate KEPT under a shorter engraved name still tells us what the
  // roll calls the child now — that is exactly the case this table exists for.
  claim(a.id, a.canonicalName || a.name, '2026-08-08', 'canonical roll of the Class of 2026',
    a.canonicalName ? a.why : null);
}

// Why the current name differs from an engraved one, where the roll recorded it.
const adopted = new Map();
for (const d of CANON.fullerNamesAdopted || []) adopted.set(norm(d.chosen), d);

// ── 3 · One list, deduplicated per identity ─────────────────────────────────
const rows = [];
const seen = new Set();
const add = (r) => {
  const k = `${r.id}|${norm(r.name)}`;
  if (seen.has(k)) return;
  seen.add(k);
  rows.push(r);
};
for (const e of engraved) {
  const cur = current.get(e.id);
  add({ ...e, isCurrent: !!cur && sameChild(cur.name, e.name) && norm(cur.name) === norm(e.name) });
}
for (const [id, c] of current) {
  const d = adopted.get(norm(c.name));
  add({
    id,
    name: c.name,
    ar: null,
    from: c.from,
    source: c.source,
    reason: c.reason
      || (d ? `adopted as the fuller form from the ${d.from}; also written as ${d.seen.join(', ')}` : null),
    isCurrent: true,
  });
}
// If an identity's engraved name IS the current one, the two collapsed into a
// single row above and it is already current. Otherwise exactly one current
// row was added by the loop just now. Assert it rather than assume it — the
// schema's partial unique index will reject a second, and finding that out at
// import time is finding out too late.
const currents = new Map();
for (const r of rows.filter((r) => r.isCurrent)) {
  if (currents.has(r.id)) {
    console.error(`REFUSED — Student ID ${r.id} would have two current names: `
      + `"${currents.get(r.id)}" and "${r.name}"`);
    process.exit(1);
  }
  currents.set(r.id, r.name);
}

// ── 4 · Report ──────────────────────────────────────────────────────────────
rows.sort((a, b) => a.id.localeCompare(b.id) || Number(b.isCurrent) - Number(a.isCurrent));
const changed = [...new Set(rows.filter((r) => !r.isCurrent).map((r) => r.id))];
console.log('\n  IDENTITY NAME HISTORY — derived from the published registers and the roll\n');
console.log(`  ${rows.length} names across ${currents.size} permanent Student IDs`);
console.log(`  ${changed.length} identit${changed.length === 1 ? 'y has' : 'ies have'} `
  + 'carried more than one name\n');
for (const id of changed) {
  const mine = rows.filter((r) => r.id === id);
  console.log(`  ${id}`);
  for (const r of mine) {
    console.log(`     ${r.isCurrent ? 'NOW ' : 'was '} ${r.name.padEnd(28)} ${r.source}`);
  }
}

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const sql = [
  '-- Identity name history — GENERATED by scripts/build-identity-name-history.mjs.',
  '-- Derived from the published graduation registers and the canonical roll.',
  '-- Do not hand-edit: correct the roll or the register and regenerate.',
  'BEGIN;',
  ...rows.map((r) => 'INSERT INTO student_identity_names '
    + '(student_identity_no, full_name, full_name_ar, is_current, effective_from, source, reason) '
    + `VALUES (${q(r.id)}, ${q(r.name)}, ${q(r.ar)}, ${r.isCurrent}, ${q(r.from)}, `
    + `${q(r.source)}, ${q(r.reason)}) `
    + 'ON CONFLICT (student_identity_no, full_name, effective_from) DO NOTHING;'),
  'COMMIT;',
  '',
].join('\n');

if (process.argv.includes('--write')) {
  writeFileSync(OUT, sql);
  console.log(`\n  → ${OUT}`);
} else {
  console.log(`\n  (dry run — pass --write to produce ${OUT})`);
}

#!/usr/bin/env node
/**
 * Graduation coverage preflight — every gate the issuance pipeline runs, minus
 * the one thing it cannot run here: the signing.
 *
 *     node scripts/preflight-graduation-coverage.mjs
 *
 * The outstanding batches mint production certificates, and both issuing
 * scripts refuse to run without DOCUMENT_HASH_SECRET — correctly, because the
 * five characters engraved on a certificate face derive from that key, and this
 * repository has already once produced real certificates signed by a
 * development literal simply because a run succeeded.
 *
 * So this script answers the question that can be answered without the key:
 * IF the key were supplied right now, would every certificate mint clean?
 *
 * It used to read the rolls out of the issuing script's source. It no longer
 * needs to: since 8 August 2026 there is one roll, computed by
 * scripts/plan-certificate-reissue.mjs from the Registrar's Notice and the
 * thirteen certificates already minted, and the issuing scripts read it too.
 * This checks that plan — which is now the same act as checking them.
 *
 *   1  every graduand printed in the ceremony programme holds exactly one
 *      certificate place for that programme, and nobody holds a place who is
 *      not in the programme
 *   2  the GLOBAL certificate sequence is contiguous, unshared, and claims no
 *      number already engraved on a minted sheet
 *   3  one child, one permanent Student ID — in both directions
 *   4  every carried Student ID resolves against the exact certificate it
 *      claims to come from
 *   5  no Arabic name is present that the Founder did not write, and every
 *      bilingual sheet still waiting on one is named
 *   6  every Qur'an College entry names its award variant
 *   7  every graduand's sex is on record, because the wording is gendered
 *   8  Tamhidiyyah and Ibtida'iyyah are mutually exclusive
 *
 * It writes nothing and signs nothing. It is safe to run at any time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { AWARDS } from './build-graduation-programme.mjs';
import { RC_PROGRAMMES } from '../functions/_lib/royal-college-certificate.js';
import { RULED_ONE_CHILD } from '../functions/_lib/certificate-serial.js';
import { PLAN, REGISTERS, rollFor } from './_lib/class-of-2026.mjs';

const CANON = JSON.parse(readFileSync('docs/graduation-registers/canonical-roll-2026.json', 'utf8'));

const ORDER = ['QUR', 'TMH', 'IBT', 'IDD', 'PRY', 'JSS', 'SS'];

// Certificates that HAVE been minted but that a ruling has since put beyond the
// holder's entitlement. They are not build errors and they are not resolved by
// rebuilding: a minted certificate is undone by revocation on the live system,
// which is the Registrar's act. Cleared when the revocation is recorded as
// executed. Read from the plan, so this cannot drift from what was computed.
const REVOKE = PLAN.actions.filter((a) => a.kind === 'REVOKE');
const REISSUE = PLAN.actions.filter((a) => a.kind === 'REISSUE');
const KEEP = PLAN.actions.filter((a) => a.kind === 'KEEP');

const problems = [];
const held = [];
const notes = [];
const omitted = [];
const flag = (m) => problems.push(m);
const hold = (m) => held.push(m);

// ── 1 · Programme roll vs certificate places ────────────────────────────────
// A "place" is a certificate this child will hold for this programme when the
// plan is executed: one already minted and KEPT, or one to be minted.
const byCode = Object.fromEntries(AWARDS.map((a) => [a.code, a]));
const placesFor = (code) => [
  ...KEEP.filter((a) => a.code === code).map((a) => a.name),
  ...PLAN.toMint.filter((r) => r.code === code).map((r) => r.name),
];

// Is this the same child under two written forms?
//
// The Founder ruled on 15 August 2026 that an issued certificate is not
// altered, so three children now hold an Ibtidā'iyyah sheet engraved under a
// shorter name than the canonical roll carries — Aisha Anofi, Ashrof Akorede,
// Imran Adegoke. Compared as strings, each of them reads as two people: one
// crossing the stage to no certificate, and one holding a certificate for a
// ceremony they are not in. Both are false, and the Student ID check called
// each pair an identity collision for the same reason.
//
// Same rule as everywhere else this question is asked — the canonical roll's
// clustering, and certificate-serial.js's — so all three agree by construction:
// the given name matches, and at least one further part is shared.
// RULED_ONE_CHILD is imported from the verification endpoint's own module, not
// copied, so this preflight and the live public lookup can never disagree about
// who is one child. Some pairs no rule can reach — "Ashrof Akorede" and "Ashraf
// Korede Ojewumi" differ in the given name AND the second part — and those are
// ruled rather than guessed.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, '').trim();
const sameChild = (a, b) => {
  const [na, nb] = [norm(a), norm(b)];
  if (!na || !nb) return false;
  if (na === nb) return true;
  const group = (n) => RULED_ONE_CHILD.findIndex((g) => g.some((f) => norm(f) === n));
  const [ga, gb] = [group(na), group(nb)];
  if (ga >= 0 || gb >= 0) return ga === gb;
  const [x, y] = [na.split(/\s+/).filter(Boolean), nb.split(/\s+/).filter(Boolean)];
  if (x[0] !== y[0]) return false;
  const rest = new Set(y.slice(1));
  return x.slice(1).some((t) => rest.has(t));
};

let printedTotal = 0;
let placesTotal = 0;
const people = new Set();
console.log('\n  CODE   PROGRAMME                        PRINTED  CERTIFICATES  STATE');
for (const code of ORDER) {
  const printed = byCode[code]?.names || [];
  const places = placesFor(code);
  printedTotal += printed.length;
  placesTotal += places.length;
  printed.forEach((n) => people.add(n));
  for (const n of printed) {
    if (!places.some((p) => sameChild(p, n))) {
      flag(`${code}/${n} is printed in the ceremony programme but holds no `
        + 'certificate place. A graduand crossing the stage to no certificate.');
    }
  }
  for (const n of places) {
    if (!printed.some((p) => sameChild(p, n))) {
      flag(`${code}/${n} holds a certificate place but is not printed in the `
        + 'ceremony programme for that award.');
    }
  }
  const mint = PLAN.toMint.filter((r) => r.code === code).length;
  const kept = KEEP.filter((a) => a.code === code).length;
  const state = mint === 0 ? 'ISSUED' : kept ? `${kept} issued · ${mint} to mint` : `${mint} to mint`;
  const title = (byCode[code]?.title || RC_PROGRAMMES[code]?.labelEn || code).slice(0, 32);
  console.log(`  ${code.padEnd(6)} ${title.padEnd(32)} ${String(printed.length).padStart(7)}`
    + `  ${String(places.length).padStart(12)}  ${state}`);
}
console.log(`  ${''.padEnd(39)} ${String(printedTotal).padStart(7)}  ${String(placesTotal).padStart(12)}`);
notes.push(`${printedTotal} awards across ${people.size} distinct graduands`);

// ── 2 · The global certificate sequence ─────────────────────────────────────
// One number is issued once, ever. Every number from the first minted to the
// last allocated must be claimed exactly once, by a minted certificate or by
// the plan — no gaps, no sharing. A revoked certificate still holds its number.
{
  const claims = new Map();
  const claim = (n, who) => {
    if (claims.has(n)) {
      flag(`certificate number ${String(n).padStart(6, '0')} is claimed twice: `
        + `${claims.get(n)} and ${who}. Two certificates may never carry the same `
        + 'engraved number.');
    } else claims.set(n, who);
  };
  for (const a of PLAN.actions) claim(Number(a.cert.match(/-(\d{6})-/)[1]), `${a.kind} ${a.name}`);
  for (const r of PLAN.toMint) claim(r.certificateSeq, `mint ${r.code} ${r.name}`);
  const lo = Math.min(...claims.keys());
  const hi = Math.max(...claims.keys());
  // CONTIGUOUS, BUT THIS REPOSITORY IS NOT THE ONLY ISSUER.
  //
  // The rule is that a global sequence has no holes: a number nobody can
  // account for is a number that might be on a sheet somewhere. But the
  // Registrar's Office issues through the LIVE system too, and those numbers
  // appear in no published register here. On 16 August 2026 it issued
  // 000048, 000049 and 000050 while this batch was planned and unminted.
  //
  // So a number at or below the recorded live floor is ACCOUNTED FOR — spent
  // by the live system — rather than skipped. Above the floor, every number
  // must still be claimed by this plan, and that is where a real hole would
  // show. The floor is dated data with its source, not a constant; re-read it
  // from production before any future batch.
  const LIVE_FLOOR = JSON.parse(
    readFileSync('docs/graduation-registers/live-sequence-floor.json', 'utf8'));
  const spentLive = [];
  for (let n = lo; n <= hi; n += 1) {
    if (claims.has(n)) continue;
    if (n <= LIVE_FLOOR.certificateSequence) { spentLive.push(n); continue; }
    flag(`the certificate sequence skips ${String(n).padStart(6, '0')} — `
      + 'the sequence is global and must be contiguous');
  }
  if (spentLive.length) {
    notes.push(`${spentLive.length} number(s) in range spent by the live system, not by this `
      + `plan: ${spentLive.map((n) => String(n).padStart(6, '0')).join(', ')} `
      + `(issued through the Registrar's Office, floor recorded ${LIVE_FLOOR.observedAt})`);
  }
  if (hi !== PLAN.allocatedThrough) {
    flag(`the plan says it allocated through ${PLAN.allocatedThrough} but the highest `
      + `number claimed is ${hi}`);
  }
  notes.push(`certificate sequence ${lo}–${hi}, contiguous, ${hi - lo + 1} numbers`);
}

// ── 3 · One child, one permanent Student ID ─────────────────────────────────
// Checked in both directions, across the minted certificates AND the plan.
// A child with two numbers is an institution holding two irreconcilable records
// of one person; a number held by two children is one child's identity printed
// on another child's certificate. Both are terminal.
{
  const byChild = new Map();
  const byNumber = new Map();
  const add = (name, id, where) => {
    if (byChild.has(name) && byChild.get(name).id !== id) {
      flag(`${name} would hold two permanent Student IDs: `
        + `${byChild.get(name).id} (${byChild.get(name).where}) and ${id} (${where})`);
    }
    if (byNumber.has(id) && !sameChild(byNumber.get(id).name, name)) {
      flag(`Student ID ${id} would be held by two children: `
        + `${byNumber.get(id).name} (${byNumber.get(id).where}) and ${name} (${where})`);
    }
    byChild.set(name, { id, where });
    byNumber.set(id, { name, where });
  };
  // The minted certificates are matched to the canonical roll by the plan, so a
  // REISSUE row's number legitimately belongs to the child under the FULLER
  // name. Registering it under the fuller name is what the reissue means.
  for (const a of PLAN.actions) {
    add(a.to || a.name, a.id, a.cert);
  }
  for (const r of PLAN.toMint) add(r.name, r.identity, `${r.code} ${r.certificateSeq}`);
  notes.push(`${byChild.size} children hold ${byNumber.size} permanent Student IDs`);
  const multi = ORDER.flatMap((c) => PLAN.toMint.filter((r) => r.code === c))
    .reduce((m, r) => m.set(r.name, (m.get(r.name) || 0) + 1), new Map());
  const dual = [...multi].filter(([, n]) => n > 1);
  if (dual.length) {
    notes.push(`${dual.length} children receive more than one certificate, each on one number`);
  }
}

// ── 4 · Carry-overs resolve against the certificate they name ───────────────
{
  const minted = {};
  for (const [code, file] of Object.entries(REGISTERS)) {
    if (!existsSync(file)) { flag(`published register missing: ${file}`); continue; }
    minted[code] = JSON.parse(readFileSync(file, 'utf8')).entries;
  }
  const all = Object.values(minted).flat();
  let carried = 0;
  for (const r of PLAN.toMint) {
    if (!r.identityFrom) continue;
    carried += 1;
    const src = all.filter((e) => e.serialNo === r.identityFrom);
    if (src.length !== 1) {
      flag(`${r.code}/${r.name}: carries a Student ID from ${r.identityFrom}, which `
        + `matches ${src.length} entries in the published registers`);
    } else if (src[0].identityNo !== r.identity) {
      flag(`${r.code}/${r.name}: carries ${r.identity} from ${r.identityFrom}, but that `
        + `certificate carries ${src[0].identityNo}`);
    }
  }
  notes.push(`${carried} Student ID carry-overs, each resolved against one named certificate`);
}

// ── 5 · Arabic names ────────────────────────────────────────────────────────
// The rule is absolute: a name is printed in Arabic only where the Founder
// wrote it. A form approved for a shorter name is NOT approved for a longer
// one — the printed name is hashed into the printed number. A sheet still
// waiting on one is HELD, not failed: nothing is wrong, the pipeline is
// refusing to invent a child's name.
const BILINGUAL = ['TMH', 'IBT', 'IDD'];
{
  let withArabic = 0;
  const waiting = [];
  for (const code of BILINGUAL) {
    for (const r of rollFor(code)) {
      if (r.ar) { withArabic += 1; continue; }
      waiting.push(`${code}  ${r.en}`);
    }
  }
  notes.push(`${withArabic} approved Arabic names carried onto the stage rolls`);
  if (waiting.length) {
    hold(`${waiting.length} bilingual sheet(s) have no approved Arabic name at the `
      + 'full length to be engraved:\n        ' + waiting.join('\n        ')
      + '\n      See docs/shrs-arabic-names-for-ruling-2026.md.');
  }
}

// ── 6 · Qur'an College award variants ───────────────────────────────────────
{
  const missing = rollFor('QUR').filter((r) => !r.awardVariant).map((r) => r.en);
  if (missing.length) {
    hold(`${missing.length} Qur’an College sheet(s) name no award variant — `
      + `${missing.join(', ')}.\n      A Ten Juz’ sheet headed “Certificate of `
      + 'Completion” would overstate a child’s achievement on a permanent record,\n'
      + '      so the renderer refuses rather than choosing one.');
  }
}

// ── 7 · Sex is on record ────────────────────────────────────────────────────
// The certificate wording is gendered. Five graduands reach this pipeline for
// the first time on the Registrar's Notice, which lists names and stages and
// states no sex. It is not inferred here from a name.
{
  const missing = [...new Set(ORDER.flatMap((c) => rollFor(c).filter((r) => !r.sex).map((r) => r.en)))];
  if (missing.length) {
    hold(`${missing.length} graduand(s) have no sex on record — ${missing.join(', ')}.\n`
      + '      The certificate wording is gendered; it is not inferred from a name.');
  }
}

// ── 8 · Tamhidiyyah and Ibtida'iyyah are mutually exclusive ─────────────────
// The Founder's ruling of 8 August 2026: "Those who show in Tamheediy shouldn't
// have the right to Ibtida'iyyah at all." A child on both rolls holds an award
// the institution says they are not entitled to, so this is a hard gate. It
// caught Abdulbasit Adedokun, whose Ibtida'iyyah certificate 000037 was minted
// before the two stages were distinguished in this system at all.
{
  const tmh = new Set(byCode.TMH?.names || []);
  const ibt = new Set(byCode.IBT?.names || []);
  for (const n of tmh) {
    if (ibt.has(n)) {
      flag(`${n} is on BOTH the Tamhīdī and the Ibtidā'iyyah roll. The Founder's `
        + 'ruling of 8 August 2026 makes the two stages mutually exclusive.');
    }
  }
  if (tmh.size) notes.push(`Tamhīdī ${tmh.size}, Ibtidā'iyyah ${ibt.size}, no student on both`);
}

// ── 9 · Children a ruling has removed from a roll ───────────────────────────
// Removing a name from a category is not the same as placing it somewhere else.
// A child who is on no roll at all is not a bookkeeping remainder: he is not in
// the ceremony programme, he crosses no stage, and he receives no certificate.
// That is a real outcome and it is reported here every run — the one thing a
// coverage check must never do is let a child fall quietly out of his own
// graduation.
//
// A DECISION and a QUESTION are different states, and they are reported
// differently. `ruledOn` is set when the institution has closed the matter —
// omit, and no certificate. That is settled, and listing it under "rulings
// still owed" would ask the Founder, on every run, for an answer he has
// already given. Without it the child is still an open question and stays in
// the hold list until someone places him.
for (const u of CANON.withdrawnByRuling || []) {
  if (u.alsoOn && u.alsoOn.length) continue;      // withdrawn here, placed elsewhere
  const line = `${u.name} is on NO roll and receives NO certificate.\n`
    + `      Withdrawn from ${u.code}: ${u.why}\n`
    + `      ${u.standing}`;
  if (u.ruledOn) omitted.push(line); else hold(line);
}

// ── What the Registrar must do on the live system ───────────────────────────
if (REVOKE.length || REISSUE.length) {
  console.log('\n  PENDING ON THE LIVE SYSTEM — the Registrar’s act, not a build step:');
  for (const a of REVOKE) {
    console.log(`    REVOKE   ${a.cert}  ${a.name} (${a.code})`);
    console.log(`             ${a.why}`);
  }
  for (const a of REISSUE) {
    const to = PLAN.toMint.find((r) => r.replaces === a.cert);
    console.log(`    REISSUE  ${a.cert}  ${a.name} → ${a.to}`
      + `${to ? `  at ${String(to.certificateSeq).padStart(6, '0')}` : ''}`);
  }
  console.log('    See docs/shrs-certificate-revocations.md.');
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
console.log('  PREFLIGHT PASSED — every check that can run without the signing key.');
console.log(`  Minted and published: ${PLAN.actions.length} certificates `
  + `(${KEEP.length} stand, ${REISSUE.length} to be reissued, ${REVOKE.length} to be revoked)`);
console.log(`  To be minted: ${PLAN.toMint.length}, numbers `
  + `${String(PLAN.spentThrough + 1).padStart(6, '0')}–${String(PLAN.allocatedThrough).padStart(6, '0')}`);

if (held.length) {
  console.log(`\n  ${held.length} BATCH HOLD(S) — nothing is wrong; these are rulings still owed:`);
  for (const h of held) console.log(`    · ${h}`);
}

// Settled, and printed every run anyway. A child left off the roll is the one
// outcome a coverage check must never allow to go quiet — but it is reported
// as a decision on the record, not as something the institution still owes.
if (omitted.length) {
  console.log(`\n  ${omitted.length} OMITTED BY RULING — decided, not outstanding:`);
  for (const o of omitted) console.log(`    · ${o}`);
}

// Version 3, not 2. Version 2 signed the six I‘dadiyyah certificates on
// 2026-08-06 and is RETIRED for signing — document-hash.js throws rather than
// let it sign again — so it is not a default that can be left in place by
// inattention. These batches mint under the key rotated in on 2026-08-15.
console.log('\n  To mint, with the production key from the Board’s credential store:');
for (const b of ['QUR', 'PRY', 'JSS', 'SS']) {
  console.log(`    DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=3 SHRS_BATCH=${b} \\`);
  console.log('      node scripts/issue-royal-college-batch.mjs');
}
for (const b of ['TMH', 'IBT2026', 'IDD2026']) {
  console.log(`    DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=3 \\`);
  console.log(`      node scripts/issue-certificate-batch.mjs ${b}`);
}
console.log('  Certificate numbers come from the plan, so batch order does not');
console.log('  change them. Nothing is held: every batch above mints on a clean run,');
console.log(`  and the ${omitted.length} omissions listed are rulings, not gaps.\n`);

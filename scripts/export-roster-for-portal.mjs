#!/usr/bin/env node
/**
 * Roster export — the Class of 2026 plan, in the exact paste format the
 * Registrar's Office Certificate Generation Centre reads.
 *
 *     node scripts/export-roster-for-portal.mjs [CODE]
 *
 * WHY THIS EXISTS. The offline issuing scripts (issue-certificate-batch.mjs,
 * issue-royal-college-batch.mjs) need DOCUMENT_HASH_SECRET typed into a local
 * terminal. That secret was set directly on Cloudflare and never saved
 * anywhere it can be read back out — Cloudflare Pages secrets are write-only
 * by design. It is not lost or misplaced; it cannot be extracted, by anyone,
 * ever. That is not a gap to close. It means the offline scripts are the
 * wrong tool for every mint after the first: the live Certificate Generation
 * Centre (functions/api/portal/staff/registrar/stage-certificates.js,
 * action=generate_batch) already runs inside the one place that secret is
 * usable, and a member of staff with certificate authority already has a
 * working path to it — the same path that issued certificates 000048-000050.
 *
 * THE ONE GAP THAT MATTERED. That endpoint matches a returning child to their
 * existing student record by an EXACT, case-insensitive match on full_name
 * (or by admission number, if supplied). Four children on this roll are
 * returning under a fuller name than the one on file — Aisha Anofi -> Aisha
 * Omoshalewa Anofi, and three more — and an exact-name match would have
 * missed every one of them, silently creating a second student record with a
 * second, different Student ID for a child who already holds one. This is
 * the one-child-two-numbers failure this whole pipeline exists to prevent,
 * arrived at by a different door. It is now closed the ordinary way: the four
 * students' records were corrected to their canonical fuller name directly
 * (see docs/governance-resolution-register.md), which does not touch any
 * already-issued certificate — verification reads stage_certificates'
 * OWN snapshot columns, never a live join back to students. Every row this
 * script exports still carries its admission number where one is known, as a
 * second, independent match key — belt and suspenders, not a substitute.
 *
 * WHAT THIS DOES NOT DO. It does not call the portal, and it does not touch
 * the database. It reads the plan (scripts/_lib/class-of-2026.mjs, which
 * reads docs/graduation-registers/reissue-plan-2026.json) and formats it. The
 * staff member still reviews and submits every row through the portal's own
 * screen, under their own authenticated session, subject to every gate that
 * screen already enforces.
 */
import { rollFor, PLAN } from './_lib/class-of-2026.mjs';

// Admission numbers for the eight children who already hold a Student ID from
// an earlier certificate, so the portal can match them by admission number
// FIRST rather than depend on the exact-name match alone. Read directly off
// the `students` table (2026-08-22); update this if the Registrar's Office
// ever re-numbers admissions.
const ADMISSION_NO = {
  'Aisha Omoshalewa Anofi': 'SHRS-IAS-26-BACKFILL-000002',
  'Naheemah Ismail Seriki': 'SHRS-IAS-26-BACKFILL-000004',
  'Ashraf Korede Ojewumi': 'SHRS-IAS-26-BACKFILL-000005',
  'Imran Iremide Adegoke': 'SHRS-IAS-26-BACKFILL-000006',
  'Muhammad Ismail Seriki': 'SHRS-IAS-26-BACKFILL-000008',
  'Baqi Olamiposi Anofi': 'SHRS-IAS-26-BACKFILL-000009',
  'Faridah Ayomide Aliu': 'SHRS-IAS-26-BACKFILL-000010',
  'Abdulbasit Amobi Jabarr': 'SHRS-IAS-26-BACKFILL-000012',
};

const CODES = ['QUR', 'TMH', 'IBT', 'IDD', 'PRY', 'JSS', 'SS'];
const LABELS = {
  QUR: 'Ḥifẓ of the Glorious Qur’an', TMH: 'Tamhīdiyyah', IBT: 'Ibtidā’iyyah',
  IDD: 'I‘dādiyyah', PRY: 'Primary School Graduation',
  JSS: 'Junior Secondary School Graduation', SS: 'Senior Secondary School Graduation',
};

const requested = process.argv[2] ? [process.argv[2].toUpperCase()] : CODES;
for (const code of requested) {
  if (!CODES.includes(code)) { console.error(`Unknown programme code "${code}". Known: ${CODES.join(', ')}.`); process.exit(1); }
}

// Only these three sheets are bilingual — see preflight-graduation-coverage.mjs
// section 5. An English-only sheet (QUR, PRY, JSS, SS) never held on a
// missing Arabic name; requiring one here would invent a gate that does not
// exist on the actual certificate.
const BILINGUAL = ['TMH', 'IBT', 'IDD'];

let totalMissing = 0;
for (const code of requested) {
  const roll = rollFor(code);
  if (!roll.length) continue;
  console.log(`\n=== ${code} — ${LABELS[code]} (${roll.length}) ===`);
  console.log('Paste below the header row into the Certificate Generation Centre roster box.');
  console.log('English Name, Arabic Name, Sex, Grade EN, Grade AR, Admission No.');
  const missing = [];
  for (const r of roll) {
    if (!r.sex) missing.push(`${r.en}: no sex on record`);
    if (BILINGUAL.includes(code) && !r.ar) missing.push(`${r.en}: no Arabic name on record`);
    if (code === 'QUR' && !r.awardVariant) missing.push(`${r.en}: no Qur’an College award variant on record`);
    const admissionNo = ADMISSION_NO[r.en] || '';
    console.log([r.en, r.ar || '', r.sex || '', '', '', admissionNo].join(','));
  }
  if (missing.length) {
    totalMissing += missing.length;
    console.log(`\n  HELD — do not submit this batch yet:`);
    for (const m of missing) console.log(`    ${m}`);
  }
}
if (totalMissing) {
  console.error(`\n${totalMissing} field(s) still missing — see docs/graduation-registers/reissue-plan-2026.json `
    + 'and scripts/_lib/class-of-2026.mjs. Run scripts/preflight-graduation-coverage.mjs for the full picture.');
  process.exit(1);
}
console.log(`\nEvery row above is ready to submit. Certificate numbers and Student IDs `
  + 'are allocated live by the portal itself when each batch is submitted — this '
  + `export does not assign them and they are not printed here.`);

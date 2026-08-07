/**
 * Issue the Sultan Hanafi Royal College Junior Secondary graduation batch and
 * its register.
 *
 *     DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 \
 *       node scripts/issue-royal-college-batch.mjs
 *
 * This is not a mock-up generator. It drives the same identifier engine the
 * Registrar's Office runs in production — generateStageCertificateSerial for
 * the serial and content hash, formatStudentIdentityNo for the permanent
 * Student ID, qrSvgForPrint for the verification payload — against an in-memory
 * sequence rather than Neon. Every identifier it prints is therefore the
 * identifier the live system would have produced for the same inputs, which is
 * what makes the register importable rather than something to reconcile later.
 *
 * Writes  dist/certificates/<batch>/  — one HTML sheet per student, the
 *                                       combined print file, the register in
 *                                       JSON and Markdown, and the SQL to seed
 *                                       the Registrar's tables.
 *
 * IT REFUSES TO RUN WITHOUT THE SIGNING KEY, and that is deliberate. The key
 * lives in the Cloudflare environment and in the Board's credential store, not
 * in this repository (docs/certificate-key-deployment.md). A batch minted under
 * a convenience default is how six real certificates once came to be signed by
 * a development literal — nobody chose it, the run simply succeeded.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateStageCertificateSerial, displayStageCertificateNo } from '../functions/_lib/certificate-serial.js';
import { formatStudentIdentityNo, isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { qrSvgForPrint } from '../functions/_lib/qrcode.js';
import {
  RC_PROGRAMMES, renderRoyalCollegeCertificate, renderRoyalCollegeCertificateBatch,
} from '../functions/_lib/royal-college-certificate.js';

// ── Batch constants ─────────────────────────────────────────────────────────
// The batch this run issues. Selected by SHRS_BATCH so one audited pipeline
// serves every Royal College stage — forking the script would fork the gates
// with it, and the gates are the reason any of this is trustworthy.
const BATCH = (process.env.SHRS_BATCH || 'JSS').toUpperCase();
const PROGRAMME = BATCH;
const ACADEMIC_YEAR = '2025/2026';
const ISSUED_AT = '2026-08-08';
// The issuing school, per programme. This was hardcoded to the Royal College,
// which is right for JSS and SS and wrong for Primary — and it is not only a
// banner: this string is written into the register, into the DB import SQL and
// into stage_certificates.institution_name, so a wrong value here puts the
// wrong school on the Registrar's permanent record of a child's award.
const INSTITUTION_NAME = `Sultan Hanafi Royal Schools — ${RC_PROGRAMMES[PROGRAMME].school}`;
const PLACE_EN = 'Ikorodu, Lagos, Nigeria';
const ORIGIN = 'https://www.shroyalschools.com';

// The certificate sequence is GLOBAL — one number is issued once, ever, across
// every stage and every year. Ibtida'iyyah ran 000035–000041 and I'dadiyyah ran
// 000042–000047, so this batch starts at 000048. That is not a convention; it
// is the only correct value, and the span check below proves no other batch
// claims these numbers.
const FIRST_CERTIFICATE_SEQ = { JSS: 48, SS: 61, PRY: 65 }[BATCH];
if (!FIRST_CERTIFICATE_SEQ) {
  console.error(`No batch definition for "${BATCH}".`);
  process.exit(2);
}
const PRIOR_SPANS = [
  { key: 'IBT', lo: 35, hi: 41 },
  { key: 'IDD', lo: 42, hi: 47 },
];

// ── The grade ───────────────────────────────────────────────────────────────
// Never printed — the certificate attests completion, not performance
// (editorial bible §2) — but NOT optional data: certificateHashFields binds
// gradeEn into the content hash and the public verifier recomputes it from
// stage_certificates.grade_en on every lookup. One constant feeds both the hash
// and the register INSERT, because the two must be the same string or the
// certificate reports 'integrity check failed' with nothing wrong with it.
const GRADE_EN = 'Excellent';
// No Arabic wording is approved for this school's awards and nothing hashes it.
// NULL is the honest value; any Arabic string here would be this pipeline's
// invention sitting in a production record.
const GRADE_AR = null;

// ── The roll ────────────────────────────────────────────────────────────────
// THE FOUNDER'S LIST, VERBATIM AND AUTHORITATIVE (2026-08-06), in his order.
// No name is expanded, abbreviated, reordered or "corrected" here: a student's
// name is whatever their institution records.
//
// `carryOverFrom` names a graduation register this student already appears in.
// The Student ID is PERMANENT and there is one per person — a student who holds
// an Ibtida'iyyah or I'dadiyyah certificate must carry the same number onto
// this one, or the institution ends up with two irreconcilable records of one
// child. The number is not re-derived here; it is read out of that register at
// run time and cross-checked against the generator, so a typo in either fails
// the run rather than reaching a printed sheet.
//
// `matchedAs` records HOW the match was made, because two of the five are short
// forms rather than exact strings and that is a judgement the Founder — not
// this script — is entitled to overturn. Both were printed on the register as
// outstanding until he ruled on them.
//
// `founderRuling` carries that ruling. It is kept as a field rather than simply
// changing `matchedAs` to 'exact', because the two are different facts: the
// match still WAS made on a short form, and a later reader of this register is
// entitled to see both that and the decision that settled it. A permanent
// Student ID is the one number a person carries for life; the reasoning behind
// it should survive longer than the conversation that produced it.
//
// Note what the ruling does NOT change: the name ENGRAVED on the sheet is still
// the one on the Founder's roll. He confirmed an identity, not a re-spelling,
// and the printed name is hashed into the serial — so changing it is a separate
// instruction, given separately.
const ROLLS = {};
ROLLS.JSS = [
  { en: 'Hameedah Adebimpe Ojewumi', sex: 'female',
    carryOverFrom: { register: 'IBT', name: 'Hameedah Adebimpe Ojewumi' }, matchedAs: 'exact' },
  { en: 'Muhammad Ismail Seriki', sex: 'male',
    carryOverFrom: { register: 'IDD', name: 'Muhammad Ismail Seriki' }, matchedAs: 'exact' },
  { en: 'Fatimah Desire Ibrahim', sex: 'female' },
  { en: 'Aisha Anofi', sex: 'female',
    carryOverFrom: { register: 'IBT', name: 'Aisha Anofi' }, matchedAs: 'exact' },
  { en: 'Baqi Anofi', sex: 'male',
    carryOverFrom: { register: 'IDD', name: 'Baqi Olamiposi Anofi' }, matchedAs: 'short-form',
    founderRuling: { date: '2026-08-07', decision: 'Same student. Student ID carry-over approved.' } },
  { en: "Sa'ad Sanusi", sex: 'male' },
  { en: 'Fawaz Owolabi', sex: 'male' },
  { en: 'Radiah Apatira', sex: 'female' },
  { en: 'Faridah Aliu', sex: 'female',
    carryOverFrom: { register: 'IDD', name: 'Faridah Ayomide Aliu' }, matchedAs: 'short-form',
    founderRuling: { date: '2026-08-07', decision: 'Same student. Student ID carry-over approved.' } },
  { en: 'Anisa Opeyemi Jokomba', sex: 'female' },
  { en: 'Ameerah Durodola', sex: 'female' },
  { en: 'Abdulrahman Abdullah', sex: 'male' },
  { en: 'Ameerah Abdulhafeez', sex: 'female' },
];

// Senior Secondary, verbatim and in the Founder's order (2026-08-07).
// Two of the four already hold an I'dadiyyah certificate under an EXACT name
// match — no short form, nothing to rule on — so their permanent Student ID
// carries across rather than a second number being minted for one person.
ROLLS.SS = [
  { en: 'Thoirah Makinde', sex: 'female',
    carryOverFrom: { register: 'IDD', name: 'Thoirah Makinde' }, matchedAs: 'exact' },
  { en: 'Abdulbasit Amobi Jabarr', sex: 'male',
    carryOverFrom: { register: 'IDD', name: 'Abdulbasit Amobi Jabarr' }, matchedAs: 'exact' },
  { en: 'Aisha Shode', sex: 'female' },
  { en: 'Mazeed Hassan-Murtala', sex: 'male' },
];

// ── The secular Primary roll ────────────────────────────────────────────────
// These seven are the Nursery and Primary School's own graduates. They are NOT
// the Ibtida'iyyah seven, and the distinction cost some care to establish:
//
// Two register files under dist/certificates/ carry exactly these seven names
// against Student IDs — 2026-08-08-IBT-000014 and 2026-08-08-IBT-000035 — and
// a third, docs/graduation-registers/2026-08-08-IBT-000035.json, carries seven
// DIFFERENT names against the same IDs as the second. Taking any of them at
// face value would have put an existing child's permanent number on a
// different child's certificate.
//
// The published register wins, and the evidence is unambiguous. Only the docs/
// file is committed to the repository; both dist/ files are untracked build
// output, and both predate it. The commit that wrote the docs/ register says
// what happened in its own subject line: "Ibtida'iyyah roll: regenerate on the
// final authoritative list of seven". The Ibtida'iyyah roll was corrected, and
// the dist/ folders are stale renders from before that correction.
//
// So these seven hold no Student ID in any published register, and each is
// issued a new one here. If the Registrar's records show otherwise for any of
// them, the number must be carried over instead and this roll amended — say
// so and it is a one-line change per student.
ROLLS.PRY = [
  { en: 'Naheemah Ismai Seriki', sex: 'female' },
  { en: 'Ashraf Korede Ojewumi', sex: 'male' },
  { en: 'Al-ameen Okoh', sex: 'male' },
  { en: 'Al-ameen Abidemi Jokomba', sex: 'male' },
  { en: 'Aisha Lawal', sex: 'female' },
  { en: 'Imran Iremide Adegoke', sex: 'male' },
  { en: 'Daud Aliu', sex: 'male' },
];

const ROLL = ROLLS[BATCH];

// Students who hold an SHRS certificate but are NOT on this roll. A name from
// another stage appearing on a Royal College sheet is the same class of error
// as a withdrawn one: the wrong award over the right name. Checked against the
// rendered HTML, not against the roll, so a template that hard-codes a name
// cannot slip past.
// A name is residue only if it is NOT on the roll actually being issued. The
// same list served the JSS batch; two of the names below — Thoirah Makinde and
// Abdulbasit Amobi Jabarr — are legitimately on the Senior Secondary roll, and
// the gate caught that on the first SS run rather than letting a real graduate
// be filtered out of her own certificate. So the list is declared once and
// filtered against ROLL at use, by full name AND by every part of it.
const ROLL_WORDS = new Set(ROLL.flatMap((r) => r.en.split(/[^A-Za-z']+/).filter(Boolean)));
const NOT_ON_THIS_ROLL_ALL = [
  'Abdulbasit Adedokun', 'Naheemah Ismail', 'Ashrof Akorede', 'Imran Adegoke',
  'Abdulateef Adedokun', 'Thoirah Makinde', 'Abdulbasit Amobi Jabarr',
  'Abdullah Oladimeji Anofi',
  // Sub-names, chosen so none is a substring of a name that legitimately
  // appears on the sheet. 'Adegoke' is deliberately ABSENT even though Imran
  // Adegoke is a real Ibtida'iyyah student: it is also the surname of Royal
  // College's own Principal, Dr. Adegoke Musa Olatunji, whose name is set into
  // every signature block on this batch. The gate caught that on its first run,
  // which is the point of running it against the rendered HTML — the full name
  // above still catches the student.
  'Adedokun', 'Naheemah', 'Ashrof', 'Akorede', 'Abdulateef',
  'Thoirah', 'Makinde', 'Amobi', 'Jabarr', 'Oladimeji',
];
// A Student ID is permanent and there is one per person. Uniqueness WITHIN a
// batch is not enough — the number must not already belong to someone else in
// any register this institution has issued. Read at run time, never assumed.
function assertIdentityIsFreeAcrossRegisters(issuedRows) {
  const taken = new Map();
  // Published registers, AND any batch already issued into dist/ but not yet
  // published. The JSS batch lived only in dist/ when the Senior Secondary run
  // was first made, so a gate reading docs/ alone could not have seen the
  // collision it was built to prevent.
  const sources = Object.entries(REGISTERS);
  // A PUBLISHED register outranks a build artefact for the same batch. This is
  // not a preference — it is the difference between two answers to "who owns
  // this number", and getting it wrong prints one child's permanent ID on
  // another child's certificate. dist/certificates/2026-08-08-IBT-000035 and
  // docs/graduation-registers/2026-08-08-IBT-000035.json disagree about all
  // seven of their entries; the docs one is committed and was written by the
  // commit that regenerated the roll on the final authoritative list, and the
  // dist one is an untracked render from before that. Committed wins.
  const publishedBatches = new Set(Object.values(REGISTERS)
    .map((f) => (f.match(/(\d{4}-\d{2}-\d{2}-[A-Z]+-\d{6})/) || [])[1]).filter(Boolean));
  const shadowed = [];
  try {
    for (const d of readdirSync('dist/certificates')) {
      if (publishedBatches.has(d)) { shadowed.push(d); continue; }
      for (const f of readdirSync(join('dist/certificates', d))) {
        if (/^(register-.*|graduation-register)\.json$/.test(f)) {
          sources.push([d, join('dist/certificates', d, f)]);
        }
      }
    }
  } catch { /* no dist yet — the published registers are the whole world */ }
  if (shadowed.length) {
    console.log(`  ignoring ${shadowed.length} build register(s) shadowed by a published one: `
      + shadowed.join(', '));
  }
  // EVERY holder of a number is kept, not just the last one seen. Overwriting
  // meant that if two registers already disagreed about who owns an ID, the
  // gate reported only whichever file happened to be read last.
  for (const [code, path] of sources) {
    let reg; try { reg = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
    for (const e of reg.entries) {
      if (!taken.has(e.identityNo)) taken.set(e.identityNo, []);
      taken.get(e.identityNo).push({ name: e.studentEn, code });
    }
  }
  const clashes = [];
  for (const r of issuedRows) {
    for (const holder of taken.get(r.identityNo) || []) {
      // The same person under the same written name — including this batch's
      // own earlier run, re-read out of dist/ on a re-issue.
      if (holder.name === r.studentEn) continue;
      // A DECLARED carry-over. One person can appear on two rolls under two
      // written forms of one name (a short form on one register, the full form
      // on another), and carrying the Student ID across is the whole reason
      // carryOverFrom exists — reusing the number there is correct, not a
      // collision. The exemption is deliberately narrow: it applies only to the
      // exact register and name the roll declares, and only where the Founder
      // has ruled that the two names are one student. An undeclared reuse, or a
      // declared one nobody has ruled on, still fails the batch. This is what
      // separates a lawful carry-over from the fault this gate was built for —
      // the Senior Secondary run that minted fresh IDs from an overlapping
      // sequence and handed two children numbers already engraved on two other
      // children's certificates. That had no declaration and no ruling, and it
      // still stops the batch dead.
      const declared = r.carryOverFrom
        && holder.code === r.carryOverFrom.register
        && holder.name === r.carryOverFrom.name;
      if (declared && r.founderRuling) continue;
      if (declared) {
        clashes.push(`${r.studentEn} would take ${r.identityNo} from ${holder.name} (${holder.code}) `
          + 'on an undeclared name match — the Founder has not ruled that these are one student');
        continue;
      }
      clashes.push(`${r.studentEn} was given ${r.identityNo}, `
        + `which already belongs to ${holder.name} (${holder.code})`);
    }
  }
  if (clashes.length) {
    console.error('\nBATCH REJECTED — a permanent Student ID would be held by two different people:');
    for (const c of clashes) console.error(`  ${c}`);
    process.exit(1);
  }
}

const NOT_ON_THIS_ROLL = NOT_ON_THIS_ROLL_ALL.filter(
  (n) => !ROLL.some((r) => r.en === n) && !ROLL_WORDS.has(n));


// The registers this batch's carry-overs are read from.
const REGISTERS = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};

// New students get sequence numbers that continue the student register. IBT
// used 35–41 and IDD used 42–47, so the next free value is 48. The generator
// scatters them — consecutive sequence values land 324 billion apart — so a
// contiguous run here produces Student IDs with no visible order, which is the
// point.
// Where this batch's NEW Student IDs begin. It is per batch and it must never
// overlap a batch already issued: the JSS run consumed 48–55, so the Senior
// Secondary run starts at 56. The first SS run got this wrong — it restarted at
// 48 and handed Aisha Shode and Mazeed Hassan-Murtala numbers already engraved
// on two JSS certificates, which is the single worst thing this pipeline can
// produce: one permanent number, two different children. The cross-batch gate
// below now refuses it outright rather than trusting this constant.
const FIRST_NEW_IDENTITY_SEQ = { JSS: 48, SS: 56, PRY: 58 }[BATCH];

// ─────────────────────────────────────────────────────────────────────────────
// PRE-FLIGHT
// ─────────────────────────────────────────────────────────────────────────────
const fail = (msg) => { console.error(`BATCH REJECTED — ${msg}`); process.exit(1); };

if (!process.env.DOCUMENT_HASH_SECRET) {
  fail('DOCUMENT_HASH_SECRET is not set.\n'
    + '  This script mints production certificates. The key that signs them must\n'
    + '  be supplied deliberately, never defaulted — the five characters engraved\n'
    + '  on the certificate face derive from it. See docs/certificate-key-deployment.md.');
}
// DOCUMENT_HASH_KEY_VERSION travels with the secret. Omitting it silently
// defaults to version 1, which is RETIRED, so signing refuses outright rather
// than minting a batch stamped with the wrong key version.
const env = {
  DOCUMENT_HASH_SECRET: process.env.DOCUMENT_HASH_SECRET,
  DOCUMENT_HASH_KEY_VERSION: process.env.DOCUMENT_HASH_KEY_VERSION,
};

const lastSeq = FIRST_CERTIFICATE_SEQ + ROLL.length - 1;
for (const s of PRIOR_SPANS) {
  if (FIRST_CERTIFICATE_SEQ <= s.hi && lastSeq >= s.lo) {
    fail(`certificate numbers ${FIRST_CERTIFICATE_SEQ}–${lastSeq} overlap the ${s.key} `
      + `batch's ${s.lo}–${s.hi}. The sequence is global; two certificates may never `
      + 'carry the same engraved number.');
  }
}

if (!RC_PROGRAMMES[PROGRAMME]) fail(`no award wording for programme "${PROGRAMME}"`);

// ── Resolve the carried-over Student IDs from the real registers ────────────
const registerCache = new Map();
function identityFromRegister(key, name) {
  if (!registerCache.has(key)) {
    registerCache.set(key, JSON.parse(readFileSync(join(process.cwd(), REGISTERS[key]), 'utf8')));
  }
  const reg = registerCache.get(key);
  const hits = reg.entries.filter((e) => e.studentEn === name);
  if (hits.length !== 1) {
    fail(`carry-over lookup for "${name}" in ${REGISTERS[key]} matched ${hits.length} entries — `
      + 'a Student ID may only be carried across when exactly one record names it.');
  }
  return hits[0].identityNo;
}

let nextNewIdentitySeq = FIRST_NEW_IDENTITY_SEQ;
const roll = ROLL.map((student) => {
  if (student.carryOverFrom) {
    const identityNo = identityFromRegister(student.carryOverFrom.register, student.carryOverFrom.name);
    return { ...student, identityNo, identitySource: `carried from ${student.carryOverFrom.register}` };
  }
  const seq = nextNewIdentitySeq++;
  return { ...student, identityNo: formatStudentIdentityNo(seq), identitySource: `newly issued (seq ${seq})` };
});

for (const s of roll) {
  if (!isValidStudentIdentityNo(s.identityNo)) {
    fail(`invalid Student ID for ${s.en}: ${s.identityNo}`);
  }
}

// A carried-over number must never collide with a newly issued one, and no two
// students on this roll may share a number. Checked before anything is signed.
{
  const seen = new Map();
  for (const s of roll) {
    if (seen.has(s.identityNo)) {
      fail(`${s.en} and ${seen.get(s.identityNo)} would share Student ID ${s.identityNo}`);
    }
    seen.set(s.identityNo, s.en);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE
// ─────────────────────────────────────────────────────────────────────────────
function sequenceStub(first) {
  let n = first - 1;
  return async (strings) => {
    const q = strings.join(' ');
    if (q.includes('nextval')) return { rows: [{ seq: ++n }] };
    throw new Error(`issue-royal-college-batch: unexpected query ${q}`);
  };
}
const sql = sequenceStub(FIRST_CERTIFICATE_SEQ);

const issued = [];
for (const [i, student] of roll.entries()) {
  const gen = await generateStageCertificateSerial(sql, env, {
    programmeCode: PROGRAMME,
    issuedAt: ISSUED_AT,
    studentIdentityNo: student.identityNo,
    studentFullName: student.en,
    academicYear: ACADEMIC_YEAR,
    gradeEn: GRADE_EN,
  });
  const certId = FIRST_CERTIFICATE_SEQ + i;
  issued.push({
    certId,
    hashKeyVersion: gen.keyVersion,
    studentEn: student.en,
    sex: student.sex,
    identityNo: student.identityNo,
    identitySource: student.identitySource,
    matchedAs: student.matchedAs || null,
    founderRuling: student.founderRuling || null,
    gradeEn: GRADE_EN,
    gradeAr: GRADE_AR,
    serialNo: gen.serialNo,
    contentHash: gen.fullHash,
    verifyCode: gen.fullHash.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-'),
    documentId: `DID-${ISSUED_AT.slice(0, 4)}-${PROGRAMME}-${String(certId).padStart(7, '0')}`,
    archiveRef: `ARCH/${PROGRAMME}/${ISSUED_AT.slice(0, 4)}/${String(certId).padStart(6, '0')}`,
    // The sheet carries TWO Code 128 symbols. The archive barcode identifies
    // the document (year + run, derived from archiveRef by the code gate); this
    // one identifies the holder. Recorded here because a gate that decodes the
    // page needs to know what the second symbol is supposed to say — Code 128-C
    // needs an even-length payload and the Student ID is 15 digits, so it is
    // left-padded, and the pad is part of what comes off the scanner.
    holderBarcode: `0${student.identityNo}`,
    // The number as it is ENGRAVED, check tail included — see the note in
    // royal-college-certificate.js. This is the single authority the register,
    // the sheet and the public verification page all quote.
    printedNo: displayStageCertificateNo(gen.serialNo),
    verifyUrl: `${ORIGIN}/verify-certificate/?ref=${gen.serialNo}`,
    // What the QR actually carries. /v/ is a permanent 301 to the verification
    // page (see _redirects) and exists to shorten the payload: the long form
    // pushed the symbol to a 53x53 grid, which is below the module density a
    // phone camera needs at the printed size.
    qrUrl: `${ORIGIN.replace('://www.', '://')}/v/${gen.serialNo}`,
  });
}

assertIdentityIsFreeAcrossRegisters(issued);

// ── Uniqueness gate ─────────────────────────────────────────────────────────
// A duplicated identifier in a graduation register is not a cosmetic fault; it
// makes two students' records indistinguishable. Nothing is written until every
// field that must be unique demonstrably is.
{
  const problems = [];
  for (const f of ['identityNo', 'serialNo', 'contentHash', 'verifyCode', 'documentId',
    'archiveRef', 'printedNo', 'verifyUrl', 'qrUrl']) {
    const seen = new Map();
    for (const r of issued) {
      if (seen.has(r[f])) problems.push(`${f} duplicated between ${seen.get(r[f])} and ${r.studentEn}: ${r[f]}`);
      seen.set(r[f], r.studentEn);
    }
  }
  for (const r of issued) {
    if (!/^\d{15}$/.test(r.identityNo)) problems.push(`${r.studentEn}: Student ID is not 15 digits`);
    if (/^(19|20)\d{2}/.test(r.serialNo.split('-').pop())) problems.push(`${r.studentEn}: serial tail looks like a year`);
  }
  if (problems.length) fail(`\n  ${problems.join('\n  ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────────────────
const stamp = `${ISSUED_AT}-${PROGRAMME}-${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}`;
const dir = join(process.cwd(), 'dist/certificates', stamp);
mkdirSync(dir, { recursive: true });

const toRow = (r) => ({
  id: r.certId,
  serial_no: r.serialNo,
  student_identity_no: r.identityNo,
  student_full_name: r.studentEn,
  student_sex: r.sex,
  programme_code: PROGRAMME,
  programme_label_en: RC_PROGRAMMES[PROGRAMME].labelEn,
  institution_name: INSTITUTION_NAME,
  academic_year: ACADEMIC_YEAR,
  place_en: PLACE_EN,
  issued_at: ISSUED_AT,
  content_hash: r.contentHash,
});

// The QR is rendered at the printed module density, not at a convenient one.
// 17.6mm at 300 DPI is 208 device pixels; error correction H so the symbol
// still reads with the seal's drop shadow falling across a corner.
const items = issued.map((r) => ({
  cert: toRow(r),
  qrSvgMarkup: qrSvgForPrint(r.qrUrl, { width: 208, margin: 2, errorCorrectionLevel: 'H' }),
}));

for (const [i, it] of items.entries()) {
  const r = issued[i];
  writeFileSync(join(dir, `${String(r.certId).padStart(6, '0')}-${slug(r.studentEn)}.html`),
    renderRoyalCollegeCertificate(it));
}
const combined = renderRoyalCollegeCertificateBatch(
  `SHRS ${RC_PROGRAMMES[PROGRAMME].school} — ${RC_PROGRAMMES[PROGRAMME].labelEn} — ${stamp}`, items);
writeFileSync(join(dir, `SHRS-${PROGRAMME}-${ISSUED_AT.slice(0, 4)}-`
  + `${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}-${String(lastSeq).padStart(6, '0')}-print.html`), combined);

// ── Residue gate ────────────────────────────────────────────────────────────
// Run against the RENDERED HTML rather than the roll, because the failure this
// guards against is a name reaching the sheet from somewhere other than the
// roll — a template literal, a stale fixture, a copied signature block.
{
  const found = NOT_ON_THIS_ROLL.filter((n) => combined.includes(n));
  if (found.length) fail(`the print file names students who are not on this roll: ${found.join(', ')}`);
  for (const r of issued) {
    if (!combined.includes(r.studentEn)) fail(`${r.studentEn} does not appear in the print file`);
    if (!combined.includes(r.serialNo)) fail(`${r.serialNo} does not appear in the print file`);
    if (!combined.includes(r.identityNo)) fail(`Student ID ${r.identityNo} does not appear in the print file`);
    if (!combined.includes(r.printedNo)) fail(`printed number ${r.printedNo} does not appear in the print file`);
  }
}

function slug(s) {
  return String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTER
// ─────────────────────────────────────────────────────────────────────────────
const pendingConfirmation = issued.filter((r) => r.matchedAs === 'short-form' && !r.founderRuling);
const ruledConfirmation = issued.filter((r) => r.founderRuling);

const register = {
  programme: PROGRAMME,
  programmeLabelEn: RC_PROGRAMMES[PROGRAMME].labelEn,
  school: RC_PROGRAMMES[PROGRAMME].school,
  award: RC_PROGRAMMES[PROGRAMME].award,
  institutionName: INSTITUTION_NAME,
  academicYear: ACADEMIC_YEAR,
  issuedAt: ISSUED_AT,
  place: PLACE_EN,
  language: 'English only — Founder directive, 2026-08-06',
  firstCertificateSeq: FIRST_CERTIFICATE_SEQ,
  count: issued.length,
  identityCarryOver: {
    rule: 'The Student ID is permanent and there is one per person. A student '
      + 'already holding an SHRS certificate carries the same number onto this one.',
    resolved: issued.filter((r) => r.identitySource.startsWith('carried'))
      .map((r) => ({ student: r.studentEn, identityNo: r.identityNo, source: r.identitySource, matchedAs: r.matchedAs })),
    awaitingFounderConfirmation: pendingConfirmation.map((r) => ({
      student: r.studentEn,
      identityNo: r.identityNo,
      matchedTo: ROLL.find((s) => s.en === r.studentEn).carryOverFrom.name,
      question: 'This roll gives a short form of a name already on the '
        + 'I’dādiyyah register. Treated as the same student, so the '
        + 'Student ID is carried across rather than a second permanent number '
        + 'minted for one child. If they are different people, this certificate '
        + 'must be reissued with a new Student ID before it is printed.',
    })),
    // Settled. Kept in full — a permanent number is worth the words.
    founderRulings: ruledConfirmation.map((r) => {
      const roll = ROLL.find((s2) => s2.en === r.studentEn);
      return {
        student: r.studentEn,
        identityNo: r.identityNo,
        matchedTo: roll.carryOverFrom.name,
        matchedAs: r.matchedAs,
        ruledOn: r.founderRuling.date,
        decision: r.founderRuling.decision,
        effect: 'One person, one permanent Student ID. No second number was minted, '
          + 'and the number on this certificate is the same one this student already holds '
          + `on the ${roll.carryOverFrom.register} register.`,
      };
    }),
  },
  entries: issued,
};

writeFileSync(join(dir, `register-${stamp}.json`), `${JSON.stringify(register, null, 2)}\n`);

const md = [
  `# SHRS Graduation Register — ${RC_PROGRAMMES[PROGRAMME].school}`,
  '',
  `**${RC_PROGRAMMES[PROGRAMME].labelEn}** · ${RC_PROGRAMMES[PROGRAMME].award}`,
  '',
  `| | |`,
  `|---|---|`,
  `| Academic session | ${ACADEMIC_YEAR} |`,
  `| Date of award | ${ISSUED_AT} |`,
  `| Place of issue | ${PLACE_EN} |`,
  `| Certificates | ${issued.length} (${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}–${String(lastSeq).padStart(6, '0')}) |`,
  `| Signing key version | ${issued[0].hashKeyVersion} |`,
  `| Language | English only (Founder directive, 2026-08-06) |`,
  '',
  '## Roll',
  '',
  '| # | Student | Student ID | Printed number | Full serial | Verification code |',
  '|---|---|---|---|---|---|',
  ...issued.map((r, i) => `| ${i + 1} | ${r.studentEn} | ${r.identityNo} | ${r.printedNo} `
    + `| ${r.serialNo} | ${r.verifyCode} |`),
  '',
  '## Permanent Student IDs',
  '',
  'The Student ID is permanent and there is one per person. Five students on this',
  'roll already hold one from an earlier SHRS award; their existing number is',
  'carried onto this certificate rather than a second one being minted.',
  '',
  '| Student | Student ID | Source |',
  '|---|---|---|',
  ...issued.map((r) => `| ${r.studentEn} | ${r.identityNo} | ${r.identitySource}`
    + `${r.matchedAs ? ` (${r.matchedAs} match)` : ''} |`),
  '',
  ...(pendingConfirmation.length ? [
    '### Awaiting the Founder’s confirmation',
    '',
    'These carry-overs were matched on a short form of a name rather than on an',
    'exact string. They are treated as the same student, because minting a second',
    'permanent number for one child is the more damaging of the two errors — but',
    'that is the Founder’s call, not this pipeline’s, and it is recorded here',
    'rather than assumed silently.',
    '',
    '| This roll | Existing register | Student ID carried |',
    '|---|---|---|',
    ...pendingConfirmation.map((r) => `| ${r.studentEn} | `
      + `${ROLL.find((s) => s.en === r.studentEn).carryOverFrom.name} | ${r.identityNo} |`),
    '',
  ] : []),
  ...(ruledConfirmation.length ? [
    '## Student ID carry-over — ruled by the Founder',
    '',
    'Each of these was matched to an existing register on a SHORT FORM of the name,',
    'not an exact string, and was held open on the register until the Founder ruled.',
    'He has: they are the same students, and the permanent Student ID carries across.',
    'No second number was minted for any child.',
    '',
    '| This roll | Existing register | Student ID carried | Ruled | Decision |',
    '|---|---|---|---|---|',
    ...ruledConfirmation.map((r) => {
      const roll = ROLL.find((s2) => s2.en === r.studentEn);
      return `| ${r.studentEn} | ${roll.carryOverFrom.name} (${roll.carryOverFrom.register}) `
        + `| ${r.identityNo} | ${r.founderRuling.date} | ${r.founderRuling.decision} |`;
    }),
    '',
  ] : []),
  '## Verification',
  '',
  '| Student | Document ID | Archive reference | QR payload |',
  '|---|---|---|---|',
  ...issued.map((r) => `| ${r.studentEn} | ${r.documentId} | ${r.archiveRef} | ${r.qrUrl} |`),
  '',
].join('\n');
writeFileSync(join(dir, `register-${stamp}.md`), `${md}\n`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qOrNull = (s) => (s === null || s === undefined ? 'NULL' : q(s));
const sqlOut = [
  `-- SHRS graduation register — ${RC_PROGRAMMES[PROGRAMME].school}`,
  `-- ${RC_PROGRAMMES[PROGRAMME].labelEn} · ${ISSUED_AT} · certificates `
    + `${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}–${String(lastSeq).padStart(6, '0')}`,
  '--',
  '-- grade_en is written even though it is never printed: the content hash is',
  '-- taken over it, and the public verifier recomputes it from this column. A',
  '-- row imported without it verifies as tampered.',
  '',
  ...issued.map((r) => 'INSERT INTO stage_certificates (id, serial_no, student_identity_no, '
    + 'student_full_name, student_sex, programme_code, programme_label_en, institution_name, '
    + 'academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES ('
    + `${r.certId}, ${q(r.serialNo)}, ${q(r.identityNo)}, ${q(r.studentEn)}, ${q(r.sex)}, `
    + `${q(PROGRAMME)}, ${q(RC_PROGRAMMES[PROGRAMME].labelEn)}, ${q(INSTITUTION_NAME)}, `
    + `${q(ACADEMIC_YEAR)}, ${q(r.gradeEn)}, ${qOrNull(r.gradeAr)}, ${q(PLACE_EN)}, `
    + `${q(ISSUED_AT)}, ${q(r.contentHash)}, ${r.hashKeyVersion});`),
  '',
  '-- Move the sequences past what this batch consumed, so the next issuance',
  '-- cannot mint a number that is already engraved on a printed document.',
  `SELECT setval('stage_certificate_serial_seq', ${lastSeq}, true);`,
  `SELECT setval('student_identity_seq', ${nextNewIdentitySeq - 1}, true);`,
  '',
  '-- ── Linking each certificate to its student record ───────────────────────',
  '-- The rows above are complete and verifiable on their own: every certificate',
  '-- is a SNAPSHOT, and the public verifier reads only the snapshot, so nothing',
  '-- below is needed for a certificate to verify.',
  '--',
  '-- What it IS needed for is the Registrar\'s Office. stage_certificates.student_id',
  '-- is the foreign key to students(id); until it is set, a certificate is',
  '-- findable by any number printed on it but does NOT appear when a registrar',
  '-- opens that student\'s record. This batch was minted from the Founder\'s roll',
  '-- of names, not from student rows, so the issuer cannot set it — guessing a',
  '-- foreign key from a name is exactly the kind of silent mismatch that ends',
  '-- with one graduate\'s certificate filed under another graduate.',
  '--',
  '-- So the link is made here, deliberately, and only where it is unambiguous:',
  '-- the UPDATE matches on the exact full name within this programme and refuses',
  '-- any name that matches more or fewer than one active student. Run it AFTER',
  '-- the JSS cohort exists in students, then run the audit query beneath it and',
  '-- read the result: any row still showing NULL is a link a human must make.',
  'UPDATE stage_certificates sc',
  '   SET student_id = s.id',
  '  FROM students s',
  ' WHERE sc.student_id IS NULL',
  `   AND sc.programme_code = ${q(PROGRAMME)}`,
  '   AND s.full_name = sc.student_full_name',
  '   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;',
  '',
  '-- Audit: every certificate in this batch, and whether it reached a student.',
  'SELECT serial_no, student_identity_no, student_full_name,',
  '       CASE WHEN student_id IS NULL THEN \'NOT LINKED — link by hand\' ELSE \'linked\' END AS student_record',
  '  FROM stage_certificates',
  ` WHERE programme_code = ${q(PROGRAMME)} AND id BETWEEN ${FIRST_CERTIFICATE_SEQ} AND ${lastSeq}`,
  ' ORDER BY id;',
  '',
].join('\n');
writeFileSync(join(dir, `register-${stamp}.sql`), sqlOut);

console.log(`\n${RC_PROGRAMMES[PROGRAMME].school} — ${RC_PROGRAMMES[PROGRAMME].labelEn} graduation batch`);
console.log(`  ${issued.length} certificates, ${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}–${String(lastSeq).padStart(6, '0')}`);
console.log(`  signing key version ${issued[0].hashKeyVersion}`);
console.log(`  written to ${dir}\n`);
for (const r of issued) {
  console.log(`  ${r.printedNo}  ${r.identityNo}  ${r.studentEn}`);
}
if (pendingConfirmation.length) {
  console.log('\n  AWAITING THE FOUNDER’S CONFIRMATION — Student ID carry-over on a short-form name:');
  for (const r of pendingConfirmation) {
    console.log(`    ${r.studentEn}  →  ${ROLL.find((s) => s.en === r.studentEn).carryOverFrom.name}  (${r.identityNo})`);
  }
}
if (ruledConfirmation.length) {
  console.log('\n  RULED BY THE FOUNDER — Student ID carry-over on a short-form name:');
  for (const r of ruledConfirmation) {
    console.log(`    ${r.studentEn}  →  ${ROLL.find((s) => s.en === r.studentEn).carryOverFrom.name}`
      + `  (${r.identityNo})  ${r.founderRuling.date} — ${r.founderRuling.decision}`);
  }
}
console.log('');

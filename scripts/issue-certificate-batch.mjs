/**
 * Issue a production batch of stage certificates and its graduation register.
 *
 *     node scripts/issue-certificate-batch.mjs
 *
 * This is not a mock-up generator. It drives the same code the Registrar's
 * Office runs in production — generateStageCertificateSerial for the serial
 * and content hash, formatStudentIdentityNo for the permanent student
 * number, qrSvg for the verification payload, renderStageCertificateBatch
 * for the artwork — against an in-memory sequence rather than Neon. Every
 * identifier it prints is therefore the identifier the live system would
 * have produced for the same inputs, which is what makes the register
 * importable instead of something to be reconciled later.
 *
 * Writes  dist/certificates/<batch>/  — one HTML sheet per student, the
 *                                       combined print file, the register in
 *                                       JSON and Markdown, and the SQL to
 *                                       seed the Registrar's tables.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PROGRAMMES, generateStageCertificateSerial, formatHijri,
} from '../functions/_lib/certificate-serial.js';
import {
  renderStageCertificate, renderStageCertificateBatch,
} from '../functions/_lib/stage-certificate-template.js';
import { formatStudentIdentityNo, isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { qrSvgForPrint } from '../functions/_lib/qrcode.js';

// ── Batch definition ────────────────────────────────────────────────────
const PROGRAMME = 'IBT';
const ACADEMIC_YEAR = '2025/2026';
const ISSUED_AT = '2026-08-08';
// institution_name is NOT NULL in stage_certificates. The renderer never
// reads it (the institution is set in the locked artwork), so it was
// missing here until the register SQL was checked against the schema.
const INSTITUTION_NAME = 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies';
const PLACE_EN = 'Ikorodu, Lagos, Nigeria';
const PLACE_AR = 'إكورودو، لاغوس، نيجيريا';
const ORIGIN = 'https://www.shroyalschools.com';

// The Founder's instruction: this is not the first graduating class, so
// certificate numbering resumes at 000035. The thirty-four before it are
// already issued and their numbers are not reused.
const FIRST_CERTIFICATE_SEQ = 35;

// The permanent student numbers are drawn from the same position in the
// register. The generator scatters them — consecutive sequence values land
// 324 billion apart — so taking a contiguous run here produces student IDs
// with no visible order, which is the point. On import these values seed
// students.identity_no directly and student_identity_seq is set past them;
// they are never regenerated.
const FIRST_IDENTITY_SEQ = 35;

// ── The graduation register ─────────────────────────────────────────────
// FINAL CORRECTION (Founder, 2026-08-06): this is the third and
// authoritative Ibtida'iyyah roll. It supersedes every previous version —
// both the original roll of seven and the interim roll of six. Nothing from
// either survives in the production files; the residue gates below and in
// scripts/verify-certificate-batch.mjs fail the batch if anything does.
//
// THE ENGLISH NAMES ARE THE FOUNDER'S AND ARE AUTHORITATIVE, including
// "Ashrof" — the Founder's earlier roll spelled the same given name
// "Ashraf", and the current spelling is the one that prints.
//
// THE ARABIC NAMES ARE NOT SUPPLIED. The notice gives English only, so the
// Arabic below is this pipeline's rendering. Most of it is not a guess:
// this roll re-uses names the Founder HAS already approved in Arabic on the
// original register, so those strings are carried across verbatim rather
// than re-derived. That matters, because the last time this file derived
// Arabic it "improved" seven approved spellings — عليو for علي, أوكوه for
// أكو, أديغوكي for أدغكي — on the reasoning that they represented the
// English pronunciation more fully. A student's name is whatever their
// institution records, not what a transliteration scheme suggests.
//
//   APPROVED BY THE FOUNDER, carried across unchanged:
//     Naheemah → نعيمة      Ismail  → إسماعيل    Ojewumi → أوجومي
//     Aisha    → عائشة      Imran   → عمران      Adegoke → أدغكي
//     Ashraf   → أشرف       Korede  → كوردي  (giving Akorede → أكوردي)
//   THE INSTITUTION'S OWN, from the school name مدارس السلطان حنفي الملكية
//   and the Chairman's signature block د. زكريا أولانريوجو حنفي:
//     Anofi    → حنفي
//   STANDARD ARABIC, no transliteration choice to make:
//     Hameedah → حميدة   Abdulbasit → عبد الباسط   Abdulateef → عبد اللطيف
//
// That leaves exactly TWO strings with no institutional precedent, both
// Yoruba, both rendered on the pattern of the approved أدغكي (Adegoke) and
// أبديمي (Abidemi):
//     Adebimpe → أدبيمبي        Adedokun → أددوكن
// Those two are what the Founder needs to confirm or correct. The register
// JSON and Markdown say so in their own arabicNames block, so a registrar
// reading the register — not this file — learns it before printing.
//
// APPROVED_AR below is a second, independent transcription, and the script
// refuses to run if the two disagree by so much as one code point. A visual
// comparison is not enough: أ and ا, ي and ى, ة and ه are separate
// characters that look near-identical at body size.
const CLASS_ROLL = [
  { en: 'Hameedah Adebimpe Ojewumi', ar: 'حميدة أدبيمبي أوجومي',  sex: 'female' },
  { en: 'Aisha Anofi',               ar: 'عائشة حنفي',            sex: 'female' },
  { en: 'Abdulbasit Adedokun',       ar: 'عبد الباسط أددوكن',     sex: 'male' },
  { en: 'Naheemah Ismail',           ar: 'نعيمة إسماعيل',         sex: 'female' },
  { en: 'Ashrof Akorede',            ar: 'أشرف أكوردي',           sex: 'male' },
  { en: 'Imran Adegoke',             ar: 'عمران أدغكي',           sex: 'male' },
  { en: 'Abdulateef Adedokun',       ar: 'عبد اللطيف أددوكن',     sex: 'male' },
];

// Transcribed separately. Do not derive one from the other — the whole
// point is that they are two independent copies.
const APPROVED_AR = {
  'Hameedah Adebimpe Ojewumi': 'حميدة أدبيمبي أوجومي',
  'Aisha Anofi':               'عائشة حنفي',
  'Abdulbasit Adedokun':       'عبد الباسط أددوكن',
  'Naheemah Ismail':           'نعيمة إسماعيل',
  'Ashrof Akorede':            'أشرف أكوردي',
  'Imran Adegoke':             'عمران أدغكي',
  'Abdulateef Adedokun':       'عبد اللطيف أددوكن',
};

// Both withdrawn rolls, kept ONLY so the gates can prove they are gone.
// Never read for issuance.
//
// These are name FRAGMENTS unique to the withdrawn rolls, not whole names.
// Getting that wrong in either direction is easy and silent: this roll
// shares Naheemah, Ismail, Ojewumi, Aisha, Imran, Adegoke, Ashraf/Ashrof
// and Anofi with rolls that were withdrawn, so guarding on those would fail
// every valid batch — while guarding on too little lets a withdrawn student
// through. The assertion below is what makes the list trustworthy: it
// refuses to run if any guard string appears in a CURRENT name.
// Every withdrawn name IN FULL, both scripts — full names are always safe to
// guard on, because no current student is a withdrawn student.
const WITHDRAWN_ROLL = [
  // original roll of seven
  'Naheemah Ismail Seriki', 'Ashraf Korede Ojewumi', 'Al-Ameen Okoh',
  'Al-Ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu',
  // interim roll of six
  'Muhammad Ismail Seriki', 'Baqi Olamiposi Anofi', 'Faridah Ayomide Aliu',
  'Thoirah Makinde', 'Abdulbasit Amobi Jabarr', 'Abdullah Oladimeji Anofi',
  // Fragments, which catch a withdrawn name that has been partially edited
  // rather than removed. Only fragments the assertion below proves cannot
  // occur in a current name: NOT "Korede" or "Okoh", because "Akorede"
  // contains the first and case-folding makes the second unsafe to reason
  // about by eye.
  'Seriki', 'Jokomba', 'Lawal', 'Iremide', 'Aliu', 'Abidemi',
  'Olamiposi', 'Ayomide', 'Oladimeji', 'Amobi', 'Jabarr', 'Makinde',
];
const WITHDRAWN_AR = [
  'نعيمة إسماعيل سركي', 'أشرف كوردي أوجومي', 'الأمين أكو',
  'الأمين أبديمي جوكمبا', 'عائشة لوال', 'عمران إريمدي أدغكي', 'داود علي',
  'محمد إسماعيل سركي', 'باقي أولاميبوسي حنفي', 'فريدة أيومدي علي',
  'طاهرة مكيندي', 'عبد الباسط أموبي جبار', 'عبد الله أولاديميجي حنفي',
  // Fragments proven non-colliding by the assertion below. أكو and كوردي are
  // deliberately ABSENT: both are substrings of أكوردي (Akorede), a current
  // student, so guarding on them would fail every valid batch. The full
  // names above cover those two withdrawn students.
  'سركي', 'جوكمبا', 'لوال', 'إريمدي', 'داود', 'الأمين', 'محمد', 'باقي',
  'أولاميبوسي', 'فريدة', 'أيومدي', 'طاهرة', 'مكيندي', 'أموبي', 'جبار',
  'أولاديميجي', 'عبد الله',
];

// A guard that matches a CURRENT student is a gate that can never pass; a
// missing guard is a gate that can never fail. This assertion is not
// ceremony — it caught أكو and كوردي inside أكوردي on the first run of this
// roll, which would have rejected every correct batch. English is compared
// case-insensitively, because "Akorede" contains "korede".
const guardFaults = [];
for (const g of [...WITHDRAWN_ROLL, ...WITHDRAWN_AR]) {
  for (const s of CLASS_ROLL) {
    if (s.en.toLowerCase().includes(g.toLowerCase())) {
      guardFaults.push(`guard "${g}" matches current student ${s.en}`);
    }
    if (s.ar.normalize('NFC').includes(g.normalize('NFC'))) {
      guardFaults.push(`guard "${g}" matches current Arabic name ${s.ar} (${s.en})`);
    }
  }
}
if (guardFaults.length) {
  console.error('BATCH REJECTED — withdrawn-roll guard collides with the current roll:\n  '
    + guardFaults.join('\n  '));
  process.exit(1);
}

// Code point by code point, before anything is generated or written. A
// visual comparison is not enough: أ and ا, ي and ى, ة and ه are separate
// characters that can look near-identical at body size, and a difference in
// Unicode normalisation form would not show up on screen at all.
const nameFaults = [];
for (const student of CLASS_ROLL) {
  const approved = APPROVED_AR[student.en];
  if (approved === undefined) {
    nameFaults.push(`${student.en}: not on the approved register`);
    continue;
  }
  const a = [...student.ar.normalize('NFC')];
  const b = [...approved.normalize('NFC')];
  if (a.length !== b.length || a.some((c, i) => c !== b[i])) {
    const at = a.findIndex((c, i) => c !== b[i]);
    nameFaults.push(`${student.en}: Arabic differs from the approved spelling`
      + ` at position ${at < 0 ? Math.min(a.length, b.length) : at}`
      + ` — set "${student.ar}", approved "${approved}"`);
  }
}
if (Object.keys(APPROVED_AR).length !== CLASS_ROLL.length) {
  nameFaults.push('the roll and the approved register are different lengths');
}
if (nameFaults.length) {
  console.error('BATCH REJECTED — name mismatch:\n  ' + nameFaults.join('\n  '));
  process.exit(1);
}
console.log(`names: all ${CLASS_ROLL.length} Arabic spellings match the approved register exactly`);

// ── Sequence stub ───────────────────────────────────────────────────────
// The only thing the live database contributes to certificate issuance is
// nextval(). Standing in for it here is what lets this script produce real
// identifiers offline; every other value is computed by production code.
function sequenceStub(start) {
  let n = start - 1;
  return async (strings) => {
    const q = strings.join('?');
    if (q.includes('nextval')) return { rows: [{ seq: ++n }] };
    if (q.toLowerCase().includes('count')) return { rows: [{ n: 0 }] };
    throw new Error(`issue-certificate-batch: unexpected query ${q}`);
  };
}

const env = { DOCUMENT_HASH_SECRET: process.env.DOCUMENT_HASH_SECRET || 'batch-issuance-development-secret' };
const sql = sequenceStub(FIRST_CERTIFICATE_SEQ);

// ── Issue ───────────────────────────────────────────────────────────────
const issued = [];
for (const [i, student] of CLASS_ROLL.entries()) {
  const identityNo = formatStudentIdentityNo(FIRST_IDENTITY_SEQ + i);
  if (!isValidStudentIdentityNo(identityNo)) {
    throw new Error(`invalid student identity number for ${student.en}: ${identityNo}`);
  }
  const gen = await generateStageCertificateSerial(sql, env, {
    programmeCode: PROGRAMME,
    issuedAt: ISSUED_AT,
    studentIdentityNo: identityNo,
    studentFullName: student.en,
    academicYear: ACADEMIC_YEAR,
    // The grade never appears on the certificate or on public verification;
    // it is hashed so the document is bound to the real record.
    gradeEn: 'Excellent',
  });
  const certId = FIRST_CERTIFICATE_SEQ + i;
  issued.push({
    certId,
    studentEn: student.en,
    studentAr: student.ar,
    sex: student.sex,
    identityNo,
    serialNo: gen.serialNo,
    contentHash: gen.fullHash,
    verifyCode: gen.fullHash.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-'),
    documentId: `DID-${ISSUED_AT.slice(0, 4)}-${PROGRAMME}-${String(certId).padStart(7, '0')}`,
    archiveRef: `ARCH/${PROGRAMME}/${ISSUED_AT.slice(0, 4)}/${String(certId).padStart(6, '0')}`,
    verifyUrl: `${ORIGIN}/verify-certificate/?ref=${gen.serialNo}`,
    // What the QR actually carries — see qrUrlFor in the registrar
    // endpoint for why it is shorter than the human-facing URL.
    qrUrl: `${ORIGIN.replace('://www.', '://')}/v/${gen.serialNo}`,
  });
}

// ── Uniqueness gate ─────────────────────────────────────────────────────
// A duplicated identifier in a graduation register is not a cosmetic fault;
// it makes two students' records indistinguishable. Nothing is written
// until every field that must be unique demonstrably is.
const UNIQUE_FIELDS = ['identityNo', 'serialNo', 'contentHash', 'verifyCode',
                       'documentId', 'archiveRef', 'verifyUrl', 'qrUrl'];
const problems = [];
for (const f of UNIQUE_FIELDS) {
  const seen = new Map();
  for (const r of issued) {
    if (seen.has(r[f])) problems.push(`${f} duplicated between ${seen.get(r[f])} and ${r.studentEn}: ${r[f]}`);
    seen.set(r[f], r.studentEn);
  }
}
for (const r of issued) {
  if (!/^\d{15}$/.test(r.identityNo)) problems.push(`${r.studentEn}: student ID is not 15 digits`);
  if (/\b(19|20)\d{2}\b/.test(r.serialNo.split('-').slice(-1)[0])) problems.push(`${r.studentEn}: suffix looks like a year`);
}
if (problems.length) {
  console.error('BATCH REJECTED:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ── Render ──────────────────────────────────────────────────────────────
const stamp = `${ISSUED_AT}-${PROGRAMME}-${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}`;
const dir = join(process.cwd(), 'dist/certificates', stamp);
mkdirSync(dir, { recursive: true });

const toRow = (r) => ({
  id: r.certId,
  serial_no: r.serialNo,
  student_identity_no: r.identityNo,
  student_full_name: r.studentEn,
  student_full_name_ar: r.studentAr,
  student_sex: r.sex,
  programme_code: PROGRAMME,
  programme_label_en: PROGRAMMES[PROGRAMME].labelEn,
  programme_label_ar: PROGRAMMES[PROGRAMME].labelAr,
  academic_year: ACADEMIC_YEAR,
  place_en: PLACE_EN,
  place_ar: PLACE_AR,
  issued_at: ISSUED_AT,
  issued_at_hijri: formatHijri(ISSUED_AT, 'en'),
  issued_at_hijri_ar: formatHijri(ISSUED_AT, 'ar'),
  content_hash: r.contentHash,
});

const items = issued.map((r) => ({
  cert: toRow(r),
  qrSvgMarkup: qrSvgForPrint(r.qrUrl, { errorCorrectionLevel: 'H', margin: 4 }),
  verifyUrl: r.verifyUrl,
}));

for (const [i, item] of items.entries()) {
  writeFileSync(join(dir, `${String(issued[i].certId).padStart(6, '0')}-${issued[i].identityNo}.html`),
    renderStageCertificate(item));
}
writeFileSync(join(dir, 'batch-print.html'),
  renderStageCertificateBatch(`SHRS ${PROGRAMMES[PROGRAMME].labelEn} — ${stamp}`, items));

// ── Register ────────────────────────────────────────────────────────────
writeFileSync(join(dir, 'graduation-register.json'), JSON.stringify({
  programme: PROGRAMME,
  programmeLabelEn: PROGRAMMES[PROGRAMME].labelEn,
  programmeLabelAr: PROGRAMMES[PROGRAMME].labelAr,
  academicYear: ACADEMIC_YEAR,
  issuedAt: ISSUED_AT,
  issuedAtHijri: formatHijri(ISSUED_AT, 'en'),
  place: PLACE_EN,
  firstCertificateSeq: FIRST_CERTIFICATE_SEQ,
  count: issued.length,
  // Carried in the register rather than left as a code comment, because
  // this is the one fact a registrar must know before the batch is printed.
  arabicNames: {
    status: 'MOSTLY APPROVED — TWO STRINGS AWAIT FOUNDER CONFIRMATION',
    reason: 'The final correction notice of 2026-08-06 supplied English names '
      + 'only. English is authoritative. Most of the Arabic is not a new '
      + 'rendering: these names were already approved in Arabic by the Founder '
      + 'on an earlier register and are carried across unchanged.',
    approvedAndCarriedAcross: {
      Naheemah: 'نعيمة', Ismail: 'إسماعيل', Ojewumi: 'أوجومي', Aisha: 'عائشة',
      Imran: 'عمران', Adegoke: 'أدغكي', Ashrof: 'أشرف',
      Akorede: 'أكوردي — on the approved كوردي (Korede)',
      Anofi: 'حنفي — the school’s own name and the Chairman’s signature block',
    },
    standardArabicNoChoiceToMake: {
      Hameedah: 'حميدة', Abdulbasit: 'عبد الباسط', Abdulateef: 'عبد اللطيف',
    },
    awaitingConfirmation: {
      Adebimpe: 'أدبيمبي — Yoruba, no institutional precedent; rendered on the '
        + 'pattern of the approved أدغكي',
      Adedokun: 'أددوكن — Yoruba, no institutional precedent; rendered on the '
        + 'same pattern. Borne by two students, so a correction applies to both.',
    },
  },
  entries: issued,
}, null, 2) + '\n');

const md = [
  `# SHRS Graduation Register — ${PROGRAMMES[PROGRAMME].labelEn}`,
  '',
  `Academic session ${ACADEMIC_YEAR} · issued ${ISSUED_AT} (${formatHijri(ISSUED_AT, 'en')}) · ${PLACE_EN}`,
  '',
  `${issued.length} certificates, numbered from ${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}.`,
  'Grades are recorded in the student record and bound into the content hash;',
  'they appear neither on the certificate nor on public verification.',
  '',
  '> **Arabic names: two strings await the Founder\'s confirmation.**',
  '> The final correction notice supplied English names only, and the English is',
  '> authoritative. Most of the Arabic is not a new rendering: نعيمة (Naheemah),',
  '> إسماعيل (Ismail), أوجومي (Ojewumi), عائشة (Aisha), عمران (Imran), أدغكي',
  '> (Adegoke), أشرف (Ashrof) and أكوردي (on the approved كوردي) were all approved',
  '> by the Founder on an earlier register and are carried across unchanged, and',
  '> حنفي (Anofi) is the school\'s own name. حميدة, عبد الباسط and عبد اللطيف are',
  '> standard Arabic with no transliteration choice to make.',
  '>',
  '> Two Yoruba strings have no institutional precedent and need confirming',
  '> before print: **أدبيمبي** (Adebimpe) and **أددوكن** (Adedokun — borne by two',
  '> students, so a correction applies to both).',
  '',
  '| # | Student | الاسم | Student ID | Certificate Number | Document ID | Archive |',
  '|---|---------|-------|------------|--------------------|-------------|---------|',
  ...issued.map((r, i) => `| ${i + 1} | ${r.studentEn} | ${r.studentAr} | ${r.identityNo} | ${r.serialNo} | ${r.documentId} | ${r.archiveRef} |`),
  '',
  '## Verification codes',
  '',
  '| Student | Verification code | Verify URL |',
  '|---------|-------------------|------------|',
  ...issued.map((r) => `| ${r.studentEn} | ${r.verifyCode} | ${r.verifyUrl} |`),
  '',
].join('\n');
writeFileSync(join(dir, 'graduation-register.md'), md);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sqlOut = [
  '-- SHRS graduation register import.',
  '-- Student numbers are permanent and already printed, so they are seeded',
  '-- rather than generated, and the sequence is advanced past them so the',
  '-- registrar never re-issues one of these values to a different student.',
  ...issued.map((r) => `UPDATE students SET identity_no = ${q(r.identityNo)} WHERE full_name = ${q(r.studentEn)} AND identity_no IS NULL;`),
  `SELECT setval('student_identity_seq', ${FIRST_IDENTITY_SEQ + issued.length - 1}, true);`,
  '',
  // Column list checked against sql/schema.sql, not written from memory.
  // The previous version named a `status` column that stage_certificates
  // has never had (it records revoked_at / revocation_note) and omitted
  // programme_label_en and institution_name, both NOT NULL — so this file
  // could not actually be imported. A register that cannot be imported is
  // not a register.
  ...issued.map((r) => `INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (${r.certId}, ${q(r.serialNo)}, ${q(r.identityNo)}, ${q(r.studentEn)}, ${q(r.studentAr)}, ${q(r.sex)}, ${q(PROGRAMME)}, ${q(PROGRAMMES[PROGRAMME].labelEn)}, ${q(PROGRAMMES[PROGRAMME].labelAr)}, ${q(INSTITUTION_NAME)}, ${q(ACADEMIC_YEAR)}, ${q(PLACE_EN)}, ${q(PLACE_AR)}, ${q(ISSUED_AT)}, ${q(formatHijri(ISSUED_AT, 'en') || '')}, ${q(formatHijri(ISSUED_AT, 'ar') || '')}, ${q(r.contentHash)});`),
  '',
  '-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).',
  '-- An earlier version of this file said stage_certificate_seq, which does',
  '-- not exist. That is not a cosmetic slip: if the sequence is not advanced',
  '-- past these certificates, the Registrar re-issues 000035 to a different',
  '-- student in a later year — and because the number PRINTED on the',
  '-- certificate is now SHRS-CERT-IBT-000035 with no year, those two',
  '-- documents would carry the identical printed number.',
  `SELECT setval('stage_certificate_serial_seq', ${FIRST_CERTIFICATE_SEQ + issued.length - 1}, true);`,
  '',
  '-- Make the PRINTED number unique in the database, not merely unique by',
  '-- convention. serial_no already has a UNIQUE constraint, but two rows',
  '-- differing only in year and hash suffix satisfy it while collapsing to',
  '-- the same engraved number. This index is what actually forbids that.',
  "CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq",
  "  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));",
  '',
].join('\n');
writeFileSync(join(dir, 'graduation-register.sql'), sqlOut);

console.log(`issued ${issued.length} certificates into dist/certificates/${stamp}`);
for (const r of issued) {
  console.log(`  ${String(r.certId).padStart(6, '0')}  ${r.identityNo}  ${r.serialNo}  ${r.studentEn}`);
}
console.log('uniqueness: all', UNIQUE_FIELDS.length, 'identifier fields distinct across the batch');

// ── Residue gate ────────────────────────────────────────────────────────
// "No information from the earlier list should remain in the final
// production files." A stale sheet left in the output directory from the
// withdrawn roll would still print, still scan and still resolve, and the
// old roll had SEVEN students to this one's six — so certificate 000041
// exists on disk from the previous run and belongs to nobody now. Reading
// every file that was just written is the only way to know it is gone;
// regenerating on top of a directory does not delete what it no longer
// produces.
const residue = [];
for (const f of readdirSync(dir)) {
  const body = readFileSync(join(dir, f), 'utf8');
  for (const name of WITHDRAWN_ROLL) {
    if (body.includes(name)) residue.push(`${f}: withdrawn student "${name}"`);
  }
  for (const frag of WITHDRAWN_AR) {
    if (body.includes(frag)) residue.push(`${f}: withdrawn Arabic name fragment "${frag}"`);
  }
}
// Anything numbered beyond this batch is a leftover sheet, by definition.
for (const f of readdirSync(dir)) {
  const m = f.match(/^(\d{6})-\d{15}\.html$/);
  if (m && +m[1] > FIRST_CERTIFICATE_SEQ + issued.length - 1) {
    residue.push(`${f}: sheet numbered past the end of this batch`);
  }
}
if (residue.length) {
  console.error('BATCH REJECTED — withdrawn roll still present in the output:\n  '
    + residue.join('\n  ')
    + `\n\nDelete dist/certificates/${stamp} and re-run. Regenerating over a stale`
    + '\ndirectory leaves sheets that still print, still scan and belong to nobody.');
  process.exit(1);
}
console.log(`residue: no trace of the withdrawn roll in any of the ${readdirSync(dir).length} output files`);

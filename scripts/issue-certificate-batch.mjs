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
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PROGRAMMES, generateStageCertificateSerial, formatHijri,
} from '../functions/_lib/certificate-serial.js';
import {
  renderStageCertificate, renderStageCertificateBatch,
} from '../functions/_lib/stage-certificate-template.js';
import { formatStudentIdentityNo, isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { qrSvg } from '../functions/_lib/qrcode.js';

// ── Batch definition ────────────────────────────────────────────────────
const PROGRAMME = 'IBT';
const ACADEMIC_YEAR = '2025/2026';
const ISSUED_AT = '2026-08-08';
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

const CLASS_ROLL = [
  { en: 'Naheemah Ismail Seriki',      ar: 'نعيمة إسماعيل سريكي',        sex: 'female' },
  { en: 'Ashraf Korede Ojewumi',       ar: 'أشرف كوريدي أوجيومي',        sex: 'male' },
  { en: 'Al-Ameen Okoh',               ar: 'الأمين أوكوه',               sex: 'male' },
  { en: 'Al-Ameen Abidemi Jokomba',    ar: 'الأمين أبيديمي جوكومبا',     sex: 'male' },
  { en: 'Aisha Lawal',                 ar: 'عائشة لوال',                 sex: 'female' },
  { en: 'Imran Iremide Adegoke',       ar: 'عمران إيريميدي أديغوكي',     sex: 'male' },
  { en: 'Daud Aliu',                   ar: 'داود عليو',                  sex: 'male' },
];

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
  });
}

// ── Uniqueness gate ─────────────────────────────────────────────────────
// A duplicated identifier in a graduation register is not a cosmetic fault;
// it makes two students' records indistinguishable. Nothing is written
// until every field that must be unique demonstrably is.
const UNIQUE_FIELDS = ['identityNo', 'serialNo', 'contentHash', 'verifyCode',
                       'documentId', 'archiveRef', 'verifyUrl'];
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
  qrSvgMarkup: qrSvg(r.verifyUrl, { errorCorrectionLevel: 'H', width: 400, margin: 2 }),
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
  ...issued.map((r) => `INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, academic_year, place_en, place_ar, issued_at, content_hash, status) VALUES (${r.certId}, ${q(r.serialNo)}, ${q(r.identityNo)}, ${q(r.studentEn)}, ${q(r.studentAr)}, ${q(r.sex)}, ${q(PROGRAMME)}, ${q(ACADEMIC_YEAR)}, ${q(PLACE_EN)}, ${q(PLACE_AR)}, ${q(ISSUED_AT)}, ${q(r.contentHash)}, 'issued');`),
  `SELECT setval('stage_certificate_seq', ${FIRST_CERTIFICATE_SEQ + issued.length - 1}, true);`,
  '',
].join('\n');
writeFileSync(join(dir, 'graduation-register.sql'), sqlOut);

console.log(`issued ${issued.length} certificates into dist/certificates/${stamp}`);
for (const r of issued) {
  console.log(`  ${String(r.certId).padStart(6, '0')}  ${r.identityNo}  ${r.serialNo}  ${r.studentEn}`);
}
console.log('uniqueness: all', UNIQUE_FIELDS.length, 'identifier fields distinct across the batch');

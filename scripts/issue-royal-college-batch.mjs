/**
 * Issue the Sultan Hanafi Royal College Junior Secondary graduation batch and
 * its register.
 *
 *     DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 \
 *       node scripts/issue-royal-college-batch.mjs
 *
 * This is not a mock-up generator. It drives the same identifier engine the
 * Registrar's Office runs in production — generateStageCertificateSerial for
 * the serial and content hash, the Class of 2026 plan for the permanent
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
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateStageCertificateSerial, displayStageCertificateNo, formatHijri } from '../functions/_lib/certificate-serial.js';
import { isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { qrSvgForPrint } from '../functions/_lib/qrcode.js';
import {
  RC_PROGRAMMES, renderRoyalCollegeCertificate, renderRoyalCollegeCertificateBatch,
} from '../functions/_lib/royal-college-certificate.js';
import { PLAN, REGISTERS, assertSexOnRecord, rollFor } from './_lib/class-of-2026.mjs';

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
// The value is the registry displayName exactly as the certificate artwork
// prints it (RC_PROGRAMMES[*].school is golden-pinned to it) — an earlier
// version prefixed the umbrella onto a name that already carries
// 'Sultan Hanafi', and the public verifier showed the doubled form.
const INSTITUTION_NAME = RC_PROGRAMMES[PROGRAMME].school;
const PLACE_EN = 'Ikorodu, Lagos, Nigeria';
const ORIGIN = 'https://www.shroyalschools.com';

// The certificate sequence is GLOBAL — one number is issued once, ever, across
// every stage and every year. It used to be declared here, one hard-coded first
// number per batch, with a table of every other batch's span beside it so the
// two could be checked against each other. Both tables were maintained by hand,
// and the first Senior Secondary run proved what that is worth: it restarted at
// a number the Junior Secondary batch had already consumed.
//
// The allocation is now computed once, for every certificate in the Class of
// 2026 at once, by scripts/plan-certificate-reissue.mjs — from the Registrar's
// roll and the thirteen certificates already minted against the old one. This
// batch reads its own numbers out of that plan. There is nothing left here for
// two hand-kept tables to disagree about.
const ROLL = rollFor(BATCH);
if (!ROLL.length) {
  console.error(`No batch definition for "${BATCH}" in the Class of 2026 plan.`);
  process.exit(2);
}
const FIRST_CERTIFICATE_SEQ = ROLL[0].certificateSeq;

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
// It used to be declared here: four hand-written lists of names, each with its
// own carry-over declarations and its own first-Student-ID constant. That was
// right while the Founder's roll was the only roll. It stopped being right on
// 8 August 2026, when the Registrar's Notice of 2 July became authoritative and
// every name moved to its fullest recorded form — because the same
// reconciliation then had to be applied identically in four hand-maintained
// places, and the way four hand-maintained copies fail is by printing one
// child's permanent number on another child's certificate.
//
// So the roll comes from scripts/_lib/class-of-2026.mjs, which reads the plan.
// Each row arrives complete: the name to engrave, the certificate number, the
// permanent Student ID with its provenance, the approved Arabic name where one
// exists, and the award variant where the programme has more than one.
//
// Every gate below is unchanged. The script has not become more trusting; it
// has stopped holding a private opinion about who is graduating.

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
// This run's own output directory, needed by the cross-batch gate below.
const stamp = `${ISSUED_AT}-${PROGRAMME}-${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}`;

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
      // THIS run's own previous build. A batch cannot collide with itself: the
      // directory is about to be overwritten by what is being checked. Skipping
      // it is not a loosening of the gate — leaving it in meant that correcting
      // a student's NAME and re-issuing tripped the collision check against the
      // superseded sheet, which reads as "one ID, two children" when it is one
      // child under a corrected spelling. The gate still sees every other batch
      // in dist/, and every published register.
      if (d === stamp) continue;
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
      taken.get(e.identityNo).push({ name: e.studentEn, code, serialNo: e.serialNo });
    }
  }
  const clashes = [];
  for (const r of issuedRows) {
    for (const holder of taken.get(r.identityNo) || []) {
      // The same person under the same written name — including this batch's
      // own earlier run, re-read out of dist/ on a re-issue.
      if (holder.name === r.studentEn) continue;
      // A DECLARED carry-over. One person can appear on two rolls under two
      // written forms of one name — a short form on one register, the fullest
      // form on the Registrar's — and carrying the permanent Student ID across
      // is the whole reason the plan records where a number came from. Reusing
      // it there is correct, not a collision.
      //
      // The exemption names ONE CERTIFICATE. The plan says which minted sheet
      // each carried number came from, and the exemption applies only when the
      // number's existing holder is that exact sheet — not a matching register,
      // not a matching name, that certificate. It was previously a register-and-
      // name pair plus a recorded ruling; a serial is the same guarantee with
      // nothing left to spell two ways, and the rulings themselves now live in
      // the plan, which is where the identity question was decided.
      //
      // Anything else still stops the batch dead — including the fault this gate
      // was built for: the Senior Secondary run that minted fresh IDs from an
      // overlapping sequence and handed two children numbers already engraved on
      // two other children's certificates.
      const declared = r.carriedFrom && holder.serialNo === r.carriedFrom;
      if (declared) continue;
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


// New Student IDs are no longer minted here either. They were, from a per-batch
// first-value constant, and the first Senior Secondary run restarted that
// constant at 48 and handed Aisha Shode and Mazeed Hassan-Murtala numbers
// already engraved on two Junior Secondary certificates — one permanent number,
// two different children, the single worst thing this pipeline can produce.
//
// The plan now allocates every permanent Student ID for the Class of 2026 in
// one pass, keyed on the CHILD rather than the certificate. That distinction is
// not academic: Ameerah Abdulhafeez holds no certificate yet and appears twice
// on the Registrar's roll, for Ibtida'iyyah and for Junior Secondary. Allocating
// per certificate would have minted her two permanent numbers in a single run;
// allocating per child mints one, and both sheets carry it.
//
// The cross-batch gate below still refuses a collision outright. It no longer
// has a constant to trust.

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

// This batch's numbers must be exactly the block the plan allocated it —
// contiguous, in order, and claimed by no other batch and no minted sheet.
// Checked against the plan itself rather than against a remembered table, so a
// hand-edited plan fails here instead of at the press.
{
  for (const [i, r] of ROLL.entries()) {
    if (r.certificateSeq !== FIRST_CERTIFICATE_SEQ + i) {
      fail(`the plan allocates ${PROGRAMME} a non-contiguous block: ${r.en} holds `
        + `${r.certificateSeq} where ${FIRST_CERTIFICATE_SEQ + i} was expected.`);
    }
  }
  const mine = new Set(ROLL.map((r) => r.certificateSeq));
  for (const other of PLAN.toMint) {
    if (other.code !== PROGRAMME && mine.has(other.certificateSeq)) {
      fail(`certificate number ${other.certificateSeq} is claimed by both ${PROGRAMME} `
        + `and ${other.code} (${other.name}). The sequence is global; two certificates `
        + 'may never carry the same engraved number.');
    }
  }
  // A revoked certificate has still been issued. Its number is spent forever.
  for (const a of PLAN.actions) {
    const n = Number(a.cert.match(/-(\d{6})-/)[1]);
    if (mine.has(n)) {
      fail(`certificate number ${n} is already engraved on ${a.cert} (${a.name}).`);
    }
  }
}

if (!RC_PROGRAMMES[PROGRAMME]) fail(`no award wording for programme "${PROGRAMME}"`);

// ── The roll, as the plan gives it ──────────────────────────
// Nothing is resolved here any more. rollFor() has already read each carried
// Student ID out of the certificate the plan says it came from and confirmed
// the two agree, and has read each approved Arabic name out of a published
// register by EXACT name — a form approved for a shorter name is not a form
// approved for a longer one.
const roll = ROLL;

// The certificate wording is gendered. An unrecorded sex is not a blank field
// on the sheet; it is a sheet that would have to guess.
assertSexOnRecord(roll, fail);

// A bilingual award has no monolingual sheets. If one graduate's Arabic name is
// missing, her certificate would fall back to a centred English line while her
// classmates carry a matched pair — and a graduating class whose certificates
// do not match is not a class. The batch stops here, names everyone it is
// waiting on, and signs nothing.
if (RC_PROGRAMMES[PROGRAMME].ar) {
  const missing = roll.filter((s) => !s.ar);
  if (missing.length) {
    console.error('\nBATCH HELD — this is a bilingual award and every sheet must carry a matched');
    console.error('name pair. The following Arabic names are not on file:\n');
    for (const m of missing) {
      console.error(`  ${m.en}`);
      if (m.arProposal) {
        console.error(`      proposed: ${m.arProposal}`);
        console.error(`      ${m.arNote}`);
      }
    }
    console.error('\nNo Arabic name is ever transliterated or generated here. Supply the form,');
    console.error('or rule on the proposal above, and the batch issues unchanged.\n');
    process.exit(1);
  }
}

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
    carriedFrom: student.carriedFrom || null,
    replaces: student.replaces || null,
    sexSource: student.sexSource,
    nameAr: student.ar || null,
    arSource: student.arSource || null,
    arRuling: student.arRuling || null,
    awardVariant: student.awardVariant || null,
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
const dir = join(process.cwd(), 'dist/certificates', stamp);
mkdirSync(dir, { recursive: true });
// Clear the directory first. A re-issue under a CORRECTED NAME writes a new
// file and leaves the old one beside it — the superseded sheet keeps its serial
// and its Student ID, and it is a valid-looking certificate for a person who
// does not exist. It happened here: a name was locked late and the previous
// spelling's sheet stayed in the batch folder, so the press file count went to
// four for a roll of three. Nothing that carries a serial survives a re-issue.
for (const f of readdirSync(dir)) {
  if (/\.(html|pdf|png|json|md|sql)$/.test(f)) rmSync(join(dir, f));
}

const toRow = (r) => ({
  id: r.certId,
  serial_no: r.serialNo,
  student_identity_no: r.identityNo,
  student_full_name: r.studentEn,
  student_name_ar: r.nameAr,
  // Snapshotted at issue, not recomputed at render: the sheet and the register
  // must name the same Hijri day, and a render host with an older ICU build
  // would otherwise quietly print a different one (or none).
  issued_at_hijri: formatHijri(ISSUED_AT, 'en'),
  issued_at_hijri_ar: formatHijri(ISSUED_AT, 'ar'),
  student_sex: r.sex,
  award_variant: r.awardVariant,
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
// Sheets this batch replaces. A reissue is not a correction — the engraved name
// is hashed into the engraved number, so the superseded certificate is revoked
// and a new one issued at a new number, carrying the same permanent Student ID.
// Named on the register because a reader is entitled to see which sheet a
// certificate stands in place of.
const reissues = issued.filter((r) => r.replaces);

const register = {
  programme: PROGRAMME,
  programmeLabelEn: RC_PROGRAMMES[PROGRAMME].labelEn,
  school: RC_PROGRAMMES[PROGRAMME].school,
  // A programme with variants has no single award name, so the register lists
  // what this batch actually conferred rather than flattening two different
  // achievements into one line.
  award: RC_PROGRAMMES[PROGRAMME].award
    || [...new Set(issued.map((r) => RC_PROGRAMMES[PROGRAMME].variants[r.awardVariant].award))],
  institutionName: INSTITUTION_NAME,
  academicYear: ACADEMIC_YEAR,
  issuedAt: ISSUED_AT,
  issuedAtHijri: formatHijri(ISSUED_AT, 'en'),
  issuedAtHijriAr: formatHijri(ISSUED_AT, 'ar'),
  place: PLACE_EN,
  language: 'English only — Founder directive, 2026-08-06',
  firstCertificateSeq: FIRST_CERTIFICATE_SEQ,
  count: issued.length,
  identityCarryOver: {
    rule: 'The Student ID is permanent and there is one per person. A student '
      + 'already holding an SHRS certificate carries the same number onto this one.',
    resolved: issued.filter((r) => r.identitySource.startsWith('carried'))
      .map((r) => ({ student: r.studentEn, identityNo: r.identityNo, source: r.identitySource })),
    // WHERE each carried number came from — one certificate, named. Every
    // identity question on this roll was decided before the plan was computed;
    // the decisions are recorded in docs/graduation-registers/reissue-plan-2026.json
    // and in docs/shrs-graduation-consistency-audit.md, and are not restated
    // here as though this run had made them.
    carriedFrom: issued.filter((r) => r.carriedFrom)
      .map((r) => ({ student: r.studentEn, identityNo: r.identityNo, certificate: r.carriedFrom })),
  },
  // Certificates this batch supersedes. Each must be revoked on the live system
  // before its replacement is handed over; see docs/shrs-certificate-revocations.md.
  reissues: reissues.map((r) => ({
    student: r.studentEn, replaces: r.replaces, replacedBy: r.serialNo,
    identityNo: r.identityNo,
    note: 'The engraved name is hashed into the engraved number, so the name '
      + 'could not be corrected in place. Same child, same permanent Student ID, '
      + 'new certificate number.',
  })),
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
  ...issued.map((r) => `| ${r.studentEn} | ${r.identityNo} | ${r.identitySource} |`),
  '',
  ...(issued.some((r) => r.carriedFrom) ? [
    '### Where each carried number came from',
    '',
    'A carried Student ID names ONE certificate, not a register and a name. The',
    'number on the sheet below is the number already engraved on that certificate,',
    'read out of it at issue and confirmed against the plan.',
    '',
    '| Student | Student ID | Carried from |',
    '|---|---|---|',
    ...issued.filter((r) => r.carriedFrom)
      .map((r) => `| ${r.studentEn} | ${r.identityNo} | ${r.carriedFrom} |`),
    '',
  ] : []),
  ...(reissues.length ? [
    '## Certificates this batch supersedes',
    '',
    'Each holder IS entitled to this award; the sheet already minted carries a',
    'shorter form of the name. The engraved name is hashed into the engraved',
    'number, so it cannot be corrected in place: the old sheet is revoked and a',
    'new one issued at a new number, carrying the same permanent Student ID.',
    '',
    '| Student | Revoked | Replaced by | Student ID |',
    '|---|---|---|---|',
    ...reissues.map((r) => `| ${r.studentEn} | ${r.replaces} | ${r.serialNo} | ${r.identityNo} |`),
    '',
    'Revocation is an act of the Office of the Registrar on the live system.',
    'See docs/shrs-certificate-revocations.md.',
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
  // Past the WHOLE Class of 2026 allocation, not just this batch's slice. The
  // plan allocates Student IDs per child across every batch, so a value that
  // covered only this run would let the next issuance mint a number already
  // engraved on a sheet from a later batch in the same plan.
  `SELECT setval('student_identity_seq', ${PLAN.identityAllocatedThrough}, true);`,
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
if (issued.some((r) => r.carriedFrom)) {
  console.log('\n  PERMANENT STUDENT ID CARRIED FROM AN EXISTING CERTIFICATE:');
  for (const r of issued.filter((x) => x.carriedFrom)) {
    console.log(`    ${r.studentEn}  ${r.identityNo}  ←  ${r.carriedFrom}`);
  }
}
if (reissues.length) {
  console.log('\n  SUPERSEDES — revoke each of these on the live system before hand-over:');
  for (const r of reissues) {
    console.log(`    ${r.replaces}  →  ${r.serialNo}  (${r.studentEn})`);
  }
}
console.log('');


// ── THE STEP THAT IS NOT DONE YET, SAID LOUDLY ──────────────────────────
// A certificate exists as a DOCUMENT the moment this script finishes. It does
// not exist as a RECORD until the SQL below is imported, and the public
// verifier reads only records.
//
// That gap is not hypothetical. Certificates were minted, printed, signed and
// handed to graduands, and they returned nothing on the public verification
// page — because the import was never run. Nothing failed and nothing warned:
// the sheets, the register and the press file were all perfect, and the only
// place the omission showed was a graduand typing their own number and being
// told there was no such certificate.
//
// So the run does not end with "written to …". It ends here, with the step
// that is still outstanding, and it is the last thing on the screen.
console.log('\n  ────────────────────────────────────────────────────────────────');
console.log('  NOT FINISHED. These certificates do not verify yet.\n');
console.log('  They are documents. They become records — and only then resolve on');
console.log('  the public verification page — when this is imported into the live');
console.log('  database:\n');
console.log(`      ${join(dir, `register-${stamp}.sql`)}\n`);
console.log('  Then prove it, against the real site, before any sheet is handed over:\n');
console.log('      node scripts/verify-issued-certificates-live.mjs\n');
console.log('  Do not release a certificate that has not passed that check. A holder');
console.log('  whose number returns nothing has been handed a document the school');
console.log('  itself cannot confirm.');
console.log('  ────────────────────────────────────────────────────────────────\n');

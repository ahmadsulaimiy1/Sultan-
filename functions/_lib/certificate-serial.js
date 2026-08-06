// Academic Stage Certificate identifier engine (Certificate Generation
// Directive, 2026-08-05). Two client-approved formats, kept deliberately
// separate so one student can hold many uniquely verifiable documents:
//
//   Student ID (permanent, one per person):
//     SHRS-STU-<YYYY>-NG-<seq6>            — functions/_lib/identity-no.js
//   Certificate serial (unique per document):
//     SHRS-CERT-<PROG>-<YYYY>-<seq6>-<SUFFIX5>
//
// The <seq6> segment is a real, atomic PostgreSQL sequence
// (stage_certificate_serial_seq — sql/schema.sql), global across years
// and programmes so a number, once issued, is never reused, matching the
// standing Institutional Identity Number Architecture rule against
// COUNT(*)+1 counters for high-stakes identifiers.
//
// SUFFIX5 is the anti-forgery segment: the first five hex characters
// (uppercased) of the certificate's own HMAC-SHA256 content hash
// (functions/_lib/document-hash.js, keyed by DOCUMENT_HASH_SECRET) over
// the canonical field set INCLUDING the base serial. A forger can
// invent a plausible-looking serial, but cannot compute a matching
// suffix without the secret — and the public verifier recomputes both
// the full hash and the suffix on every lookup, so a tampered database
// row or a fabricated serial both surface as integrity failures rather
// than silently verifying.
import { computeDocumentHash, verifyDocumentHash } from './document-hash.js';
import { isValidStudentIdentityNo } from './identity-no.js';

// Programme registry — codes follow the institution's real academic
// stages. Labels are the exact bilingual wording the certificate
// renders; adding a stage is a one-line addition here, never a schema
// migration.
export const PROGRAMMES = {
  IBT: {
    labelEn: 'Ibtida’iyyah — Primary Stage',
    labelAr: 'المرحلة الابتدائية',
    stageEn: 'the primary educational stage',
    stageAr: 'المرحلة الإبتدائية',
  },
  IDD: {
    labelEn: 'I’dādiyyah — Intermediate Stage',
    labelAr: 'المرحلة الإعدادية',
    stageEn: 'the intermediate educational stage',
    stageAr: 'المرحلة الإعدادية',
  },
  THN: {
    labelEn: 'Thanawiyyah — Secondary Stage',
    labelAr: 'المرحلة الثانوية',
    stageEn: 'the secondary educational stage',
    stageAr: 'المرحلة الثانوية',
  },
};

// The canonical field set the content hash covers — one function used
// by BOTH issuance and verification so the two can never drift apart.
// Everything a third party relies on is in here: who, what programme,
// which year, what grade, when, and under which base serial.
export function certificateHashFields({ serialBase, studentIdentityNo, studentFullName, programmeCode, academicYear, gradeEn, issuedAt }) {
  return {
    serialBase: String(serialBase),
    studentIdentityNo: String(studentIdentityNo || ''),
    studentFullName: String(studentFullName),
    programmeCode: String(programmeCode),
    academicYear: String(academicYear),
    gradeEn: String(gradeEn || ''),
    issuedAt: String(issuedAt),
  };
}

function suffixFromHash(fullHash) {
  return fullHash.slice(0, 5).toUpperCase();
}

// Issues the next serial: atomic sequence → base serial → HMAC over the
// canonical fields → 5-char suffix. Returns everything the caller needs
// to persist ({ serialNo, fullHash }).
export async function generateStageCertificateSerial(sql, env, { programmeCode, issuedAt, studentIdentityNo, studentFullName, academicYear, gradeEn }) {
  const year = new Date(issuedAt).getUTCFullYear();
  const seqRes = await sql`SELECT nextval('stage_certificate_serial_seq') AS seq`;
  const seq = String(seqRes.rows[0].seq).padStart(6, '0');
  const serialBase = `SHRS-CERT-${programmeCode}-${year}-${seq}`;
  const { fullHash } = computeDocumentHash(env, certificateHashFields({
    serialBase, studentIdentityNo, studentFullName, programmeCode, academicYear, gradeEn, issuedAt,
  }));
  return { serialNo: `${serialBase}-${suffixFromHash(fullHash)}`, fullHash };
}

// ── The PRINTED number vs the STORED serial ─────────────────────────────
// Premium Certificate Number Security Panel directive (2026-08-06):
//
//     stored   SHRS-CERT-IBT-2026-000035-368DC
//     printed  SHRS-CERT-IBT-000035-368DC
//
// EXACTLY ONE segment is removed — the issue year — because the directive
// asks the printed document to read as timeless. Everything else the
// institutional numbering system carries is retained.
//
// The five-character tail is NOT cosmetic and is never dropped. It is the
// first five hex characters of this certificate's own HMAC-SHA256 over its
// canonical fields, keyed by DOCUMENT_HASH_SECRET (see suffixFromHash and
// the header note above). It is what makes the PRINTED number
// self-authenticating: a forger can invent a plausible sequence, but
// cannot compute a matching suffix without the secret, and a verifier
// holding the paper can compare the tail against the verification plate's
// printed code — whose first five characters ARE this suffix — without a
// database at all.
//
// An earlier revision printed SHRS-CERT-IBT-000035, dropping the suffix
// along with the year because the directive's worked example happened to
// omit it. That mistook the example for the specification and removed the
// number's only self-checking property. It is recorded here so nobody
// "simplifies" the format back.
//
// Dropping the YEAR is safe because <seq6> is one global sequence
// (stage_certificate_serial_seq — sql/schema.sql): sequence 000035 is
// issued exactly once, ever, across every year and every programme. If
// that sequence is ever re-scoped, resolveStageCertificateRef below fails
// closed on a multiple match rather than guessing, so the failure is loud.
export function displayStageCertificateNo(serialNo) {
  const parsed = parseStageCertificateSerial(serialNo);
  if (!parsed) return null;
  const m = parsed.serialBase.match(/^SHRS-CERT-([A-Z0-9]{2,4})-\d{4}-(\d{6})$/);
  return m ? `SHRS-CERT-${m[1]}-${m[2]}-${parsed.suffix}` : null;
}

// Accepts the printed number typed back in by a verifier. The suffix is
// optional on INPUT — someone reading a worn or partly obscured document
// should still reach the record — but resolveStageCertificateRef treats a
// supplied suffix as a constraint that must match, never as a hint.
export function parseStageCertificateDisplayNo(ref) {
  const m = String(ref || '').trim().toUpperCase()
    .match(/^SHRS-CERT-([A-Z0-9]{2,4})-(\d{6})(?:-([0-9A-F]{5}))?$/);
  return m ? { programmeCode: m[1], seq: m[2], suffix: m[3] || null } : null;
}

// ── Every number the sheet actually prints ──────────────────────────────
// One certificate carries SEVEN identifiers for one database row, and the
// holder cannot be expected to know which of them the verification service
// accepts — they type whichever one is nearest the QR code, or whatever a
// scanner put on the clipboard. Only the first two used to resolve, so the
// other five answered "no certificate found" about a genuine document in
// the person's hand: the worst answer a verification service can give,
// because it reads as an accusation of forgery.
//
//   SHRS-CERT-IDD-2026-000042-A775E   stored serial        serial
//   SHRS-CERT-IDD-000042[-A775E]      engraved number      printed_no
//   717455243759974                   Student ID           student_id
//   A775-E194-8527 / A775E1948527     verification code    verify_code
//   2026000042                        Code 128-C payload   archive_barcode
//   ARCH/IDD/2026/000042              archive path         archive_ref
//   DID-2026-IDD-0000042              document id          document_id
//
// The shapes are mutually exclusive by form, so nothing here ever has to
// guess which identifier the holder meant — the length and punctuation
// decide it. scripts/test-verify-identifiers.mjs asserts that separation
// against the real issued values rather than trusting the reading.
//
// TWO deliberate refusals:
//  - A 15-digit run that fails its Luhn check is rejected here rather than
//    queried. A mistyped Student ID must not become a database lookup that
//    happens to hit a different student's certificate.
//  - The retired 12-digit barcode payload (year + id padded to 8, e.g.
//    202600000042) is NOT accepted: it is indistinguishable from a
//    12-character verification code that happens to be all digits, and
//    resolving it would mean guessing between two identifier families. No
//    sheet was ever printed with it — the payload was corrected to the
//    6-digit archive run before the first issuance (see the archival
//    reference block in stage-certificate-template.js) — so accepting it
//    would buy nothing and cost the shape separation above.
export function parseStageCertificateIdentifier(ref) {
  const raw = String(ref || '').trim().toUpperCase();

  const serial = parseStageCertificateSerial(raw);
  if (serial) return { kind: 'serial', ...serial };
  const printed = parseStageCertificateDisplayNo(raw);
  if (printed) return { kind: 'printed_no', ...printed };

  const arch = raw.match(/^ARCH\/([A-Z0-9]{2,4})\/(\d{4})\/(\d{6})$/);
  if (arch) return { kind: 'archive_ref', programmeCode: arch[1], year: Number(arch[2]), id: Number(arch[3]) };

  const did = raw.match(/^DID-(\d{4})-([A-Z0-9]{2,4})-(\d{7})$/);
  if (did) return { kind: 'document_id', year: Number(did[1]), programmeCode: did[2], id: Number(did[3]) };

  if (/^\d{15}$/.test(raw)) {
    return isValidStudentIdentityNo(raw) ? { kind: 'student_id', identityNo: raw } : null;
  }

  const barcode = raw.match(/^(\d{4})(\d{6})$/);
  if (barcode) return { kind: 'archive_barcode', year: Number(barcode[1]), id: Number(barcode[2]) };

  // The printed verification code is grouped in fours for legibility; the
  // groups are typography, so both forms have to resolve.
  const code = raw.replace(/[\s-]/g, '');
  if (/^[0-9A-F]{12}$/.test(code)) return { kind: 'verify_code', hashPrefix: code.toLowerCase() };

  return null;
}

// Runs the lookup for one parsed identifier. Split out from
// resolveStageCertificateIdentifier so the policy below (what a given
// number of matches MEANS) reads as one uninterrupted decision.
//
// Neon's tagged-template driver has no raw-identifier escape hatch, so
// each shape gets its own literal query rather than one query with an
// assembled WHERE clause — the same constraint identity-no.js documents.
async function selectByIdentifier(sql, id) {
  if (id.kind === 'serial') {
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.serial_no = ${id.serialBase + '-' + id.suffix}`;
    return res.rows;
  }
  if (id.kind === 'printed_no') {
    // Underscores are single-character LIKE wildcards and the pattern is
    // anchored on both sides, so it cannot match a longer sequence that
    // merely ends in these six digits. When the verifier supplied the check
    // tail it is pinned here too — a wrong tail finds nothing, which is the
    // anti-forgery property doing its job at lookup time.
    const pattern = `SHRS-CERT-${id.programmeCode}-____-${id.seq}-${id.suffix || '_____'}`;
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.serial_no LIKE ${pattern}`;
    return res.rows;
  }
  if (id.kind === 'student_id') {
    // Newest first: the disambiguation list a holder reads should open with
    // the certificate they most likely just received.
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.student_identity_no = ${id.identityNo}
      ORDER BY sc.issued_at DESC, sc.id DESC`;
    return res.rows;
  }
  if (id.kind === 'verify_code') {
    // The printed code IS the first 12 hex of content_hash, so this is a
    // prefix match — expressed as left(lower(...)) rather than LIKE so the
    // expression index in sql/schema.sql can serve it, and so a stored hash
    // in either case still matches what the plate prints in upper case.
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE left(lower(sc.content_hash), 12) = ${id.hashPrefix}`;
    return res.rows;
  }
  if (id.kind === 'archive_barcode') {
    // Year is a CONSTRAINT, not decoration: sc.id alone would resolve, so
    // pinning the year is what makes a misread scan fail closed instead of
    // returning a different year's certificate that shares the record id.
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.id = ${id.id} AND EXTRACT(YEAR FROM sc.issued_at)::int = ${id.year}`;
    return res.rows;
  }
  if (id.kind === 'archive_ref' || id.kind === 'document_id') {
    // Same row as the barcode, with the programme code pinned too — these
    // two are read by eye, and a transcription that lands on the wrong
    // stage must find nothing rather than attest the wrong award.
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.id = ${id.id} AND EXTRACT(YEAR FROM sc.issued_at)::int = ${id.year}
        AND upper(sc.programme_code) = ${id.programmeCode}`;
    return res.rows;
  }
  throw new Error(`certificate-serial: no lookup for identifier kind "${id.kind}"`);
}

// Resolves ANY identifier printed on the sheet to the stage_certificates
// row(s) it names. Returns null when `ref` is not one of the shapes at all
// (the caller then has other document families to try), otherwise
// { kind, personScoped, rows, outcome } where outcome is:
//
//   'resolved'   exactly one row — attest it
//   'not_found'  well-formed, nothing matched
//   'multiple'   LEGITIMATELY several — see below
//   'ambiguous'  several where there must be one: a data-integrity fault
//
// The default is to fail closed. Six of the seven identifiers name ONE
// document, so two matches means the global serial sequence has been
// re-scoped, a hash prefix has collided, or a record has been duplicated —
// none of which may be papered over by picking a row.
//
// The Student ID is the one exception, and it is not an oversight: it
// names a PERSON, not a document, and a student who completes
// Ibtida'iyyah and then I'dadiyyah legitimately holds two certificates
// under one ID. Returning "ambiguous" there would call a correct academic
// record a fault; silently returning one of them would attest a document
// the holder is not looking at. So it returns the whole set and the caller
// asks which one — with the single exception that if the rows disagree on
// WHO the student is, that is a real fault again and falls back to
// 'ambiguous'.
export async function resolveStageCertificateIdentifier(sql, ref) {
  const id = parseStageCertificateIdentifier(ref);
  if (!id) return null;
  const personScoped = id.kind === 'student_id';
  const rows = await selectByIdentifier(sql, id);
  const base = { kind: id.kind, personScoped, rows };
  if (rows.length === 0) return { ...base, outcome: 'not_found' };
  if (rows.length === 1) return { ...base, outcome: 'resolved' };
  if (!personScoped) return { ...base, outcome: 'ambiguous' };
  const names = new Set(rows.map((r) => String(r.student_full_name || '')));
  return { ...base, outcome: names.size === 1 ? 'multiple' : 'ambiguous' };
}

// The original two-shape resolver, kept as the narrow contract callers
// outside the public verifier already depend on: full stored serial or
// printed number only, { row } | { ambiguous: true } | null.
export async function resolveStageCertificateRef(sql, ref) {
  const id = parseStageCertificateIdentifier(ref);
  if (!id || (id.kind !== 'serial' && id.kind !== 'printed_no')) return null;
  const resolved = await resolveStageCertificateIdentifier(sql, ref);
  if (resolved.outcome === 'ambiguous') return { ambiguous: true };
  return resolved.rows[0] ? { row: resolved.rows[0] } : null;
}

// Splits a printed serial back into base + suffix. Returns null for
// anything that doesn't even match the format (cheap pre-filter before
// touching the database).
export function parseStageCertificateSerial(serialNo) {
  const m = String(serialNo || '').trim().toUpperCase()
    .match(/^(SHRS-CERT-[A-Z0-9]{2,4}-\d{4}-\d{6})-([0-9A-F]{5})$/);
  if (!m) return null;
  return { serialBase: m[1], suffix: m[2] };
}

// The verification-time integrity check: recomputes the HMAC from the
// row as stored and confirms (a) it matches the stored content_hash
// (timing-safe — document-hash.js) and (b) the serial's printed suffix
// matches the hash-derived one. Either failing means the document or
// the record has been altered since issuance.
export function verifyStageCertificateIntegrity(env, row) {
  const parsed = parseStageCertificateSerial(row.serial_no);
  if (!parsed) return { hashValid: false, suffixValid: false };
  const fields = certificateHashFields({
    serialBase: parsed.serialBase,
    studentIdentityNo: row.student_identity_no,
    studentFullName: row.student_full_name,
    programmeCode: row.programme_code,
    academicYear: row.academic_year,
    gradeEn: row.grade_en,
    issuedAt: isoDateOnly(row.issued_at),
  });
  const hashValid = verifyDocumentHash(env, fields, row.content_hash);
  const suffixValid = suffixFromHash(String(row.content_hash || '')) === parsed.suffix;
  return { hashValid, suffixValid };
}

// Batch numbers: SHRS-CB-<YYYY>-<seq4>. Batch creation is a rare,
// Registrar-initiated action (a handful per year), so the existing
// low-volume COUNT(*)+1 convention (finance-no.js, graduation batches)
// is the honest fit here — the atomic sequence is reserved for the
// serials themselves, where uniqueness is a security property.
export async function generateCertificateBatchNo(sql, issuedAt) {
  const year = new Date(issuedAt).getUTCFullYear();
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM stage_certificate_batches
    WHERE EXTRACT(YEAR FROM issued_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-CB-${year}-${String(seq).padStart(4, '0')}`;
}

// Neon returns DATE columns as either a Date or a 'YYYY-MM-DD...' string
// depending on driver path — normalised to calendar digits so the hash
// input is identical at issuance and at every later verification.
export function isoDateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

// Hijri (Umm al-Qura) rendering for the certificate's dual date line —
// computed once at issuance and SNAPSHOTTED onto the row
// (issued_at_hijri), never recomputed at render/verify time, so the
// printed document and the database can never disagree. Uses the
// runtime's own ICU islamic-umalqura calendar; if the runtime lacks it
// (older ICU builds), returns null and the certificate simply omits the
// Hijri line rather than printing a wrong conversion.
const AR_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const EN_HIJRI_MONTHS = ['Muḥarram', 'Ṣafar', 'Rabī‘ al-Awwal', 'Rabī‘ al-Ākhir', 'Jumādā al-Ūlā', 'Jumādā al-Ākhirah', 'Rajab', 'Sha‘bān', 'Ramaḍān', 'Shawwāl', 'Dhū al-Qa‘dah', 'Dhū al-Ḥijjah'];

export function hijriDateParts(gregorianDate) {
  try {
    const d = gregorianDate instanceof Date ? gregorianDate : new Date(String(gregorianDate).slice(0, 10) + 'T12:00:00Z');
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    const parts = {};
    for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
    const day = parseInt(parts.day, 10);
    const month = parseInt(parts.month, 10);
    const year = parseInt(String(parts.year).replace(/\D/g, ''), 10);
    if (!day || !month || !year) return null;
    return { day, month, year };
  } catch {
    return null;
  }
}

export function formatHijri(gregorianDate, lang) {
  const h = hijriDateParts(gregorianDate);
  if (!h) return null;
  if (lang === 'ar') {
    return `${h.day} ${AR_MONTHS[h.month - 1]} ${h.year}هـ`;
  }
  return `${h.day} ${EN_HIJRI_MONTHS[h.month - 1]} ${h.year} A.H.`;
}

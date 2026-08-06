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
    labelEn: 'I’dādiyyah — Preparatory Stage',
    labelAr: 'المرحلة الإعدادية',
    stageEn: 'the preparatory educational stage',
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

// Resolves ANY form a person might type — the full stored serial, or the
// printed number with or without its check tail — to the single
// stage_certificates row it names. Returns { row } | { ambiguous: true } |
// null. Never guesses: two matches is a data-integrity fault, not a UX
// problem to paper over.
export async function resolveStageCertificateRef(sql, ref) {
  const full = parseStageCertificateSerial(ref);
  if (full) {
    const res = await sql`
      SELECT sc.*, b.batch_no FROM stage_certificates sc
      LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
      WHERE sc.serial_no = ${full.serialBase + '-' + full.suffix}`;
    return res.rows[0] ? { row: res.rows[0] } : null;
  }
  const short = parseStageCertificateDisplayNo(ref);
  if (!short) return null;
  // Underscores are single-character LIKE wildcards and the pattern is
  // anchored on both sides, so it cannot match a longer sequence that
  // merely ends in these six digits. When the verifier supplied the check
  // tail it is pinned here too — a wrong tail finds nothing, which is the
  // anti-forgery property doing its job at lookup time.
  const pattern = `SHRS-CERT-${short.programmeCode}-____-${short.seq}-${short.suffix || '_____'}`;
  const res = await sql`
    SELECT sc.*, b.batch_no FROM stage_certificates sc
    LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
    WHERE sc.serial_no LIKE ${pattern}`;
  if (res.rows.length > 1) return { ambiguous: true };
  return res.rows[0] ? { row: res.rows[0] } : null;
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

// Public certificate/Ijazah verification — no session required by
// design: the whole point is that anyone holding a physical certificate
// (an employer, another school, a scholarship board) can confirm it's
// genuine without a Digital Campus account. This is the IQ-02 §7.5
// "public third-party verification endpoint" the Ijazah Governance
// Framework already anticipated when ijazah_register was designed
// (see sql/schema.sql's comment on that table).
//
// Looked up by the same `reference_no` already printed/quoted on the
// certificate — no separate secret token. That's a deliberate choice,
// not an oversight: reference numbers are staff-assigned at issuance
// (never self-service), so nothing here lets a stranger register a
// fake one, and the fields returned (name, credential, dates, status)
// are exactly what a certificate is meant to prove to a third party —
// not sensitive account data. The real anti-forgery mechanism is that
// this result is pulled live from the database every time: a forged
// document can print any reference number it likes, but it can't make
// this endpoint return a match, and a revoked credential shows as
// revoked no matter how convincing the physical copy looks.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';
import {
  parseStageCertificateIdentifier, resolveStageCertificateIdentifier,
  displayStageCertificateNo, verifyStageCertificateIntegrity, isoDateOnly,
} from '../../_lib/certificate-serial.js';
import { hashIpAddress } from '../../_lib/document-hash.js';

// Best-effort verification audit (same verification_log the graduation-
// document verifier writes) — a failed log write must never break a
// legitimate verification.
async function logVerification(sql, request, refNo, outcome) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;
    await sql`
      INSERT INTO verification_log (document_reference_no, ip_hash, outcome)
      VALUES (${refNo}, ${hashIpAddress(ip)}, ${outcome})`;
  } catch (logErr) {
    console.error('verification_log write failed', logErr);
  }
}

// One place decides what a stage certificate's state IS, so the single
// attestation below and the disambiguation list cannot come to different
// conclusions about the same row. A hash check that throws (missing
// DOCUMENT_HASH_SECRET on a deployment) is reported as an integrity
// failure, never as "intact" by default.
function stageCertificateState(env, row) {
  let integrity = { hashValid: false, suffixValid: false };
  try {
    integrity = verifyStageCertificateIntegrity(env, row);
  } catch (hashErr) {
    console.error('stage certificate integrity check unavailable', hashErr);
  }
  const intact = integrity.hashValid && integrity.suffixValid;
  return {
    intact,
    status: !intact ? 'integrity_check_failed' : row.revoked_at ? 'revoked' : 'active',
    outcome: !intact ? 'hash_mismatch' : row.revoked_at ? 'revoked' : 'valid',
  };
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a certificate or Ijazah reference number.' }, 400);

  try {
    // Academic Stage Certificates (Certificate Generation Directive,
    // 2026-08-05). Tried first because every shape in this family is
    // recognisable by form alone, and verified DEEPER than the register
    // families below: beyond row lookup, the HMAC-SHA256 content hash is
    // recomputed over the stored fields and the serial's printed
    // anti-forgery suffix is re-derived from it, so a tampered record or a
    // fabricated serial surfaces as an integrity failure instead of
    // quietly verifying.
    //
    // EVERY identifier the sheet prints is accepted — stored serial,
    // engraved number (with or without its check tail), Student ID,
    // verification code, Code 128-C payload, archive path, document id —
    // because a holder types whichever number is nearest the QR code, and
    // being told "no certificate found" about a genuine document reads as
    // an accusation of forgery. See parseStageCertificateIdentifier for
    // the shapes and for why each one fails closed. What the verifier
    // typed only chooses the row: the integrity check is identical either
    // way, because it recomputes from the STORED serial.
    const identifier = parseStageCertificateIdentifier(ref);
    const resolved = identifier ? await resolveStageCertificateIdentifier(sql, ref) : null;
    if (resolved && resolved.outcome === 'ambiguous') {
      // Two rows where the identifier names one document means the global
      // serial sequence has been re-scoped, a content hash has collided, or
      // a record has been duplicated. Never pick one.
      await logVerification(sql, request, ref, 'ambiguous');
      return json({ error: 'That number matches more than one record. Contact the Registrar’s Office.' }, 409);
    }
    if (resolved && resolved.outcome === 'multiple') {
      // A Student ID names a PERSON. A student who completed Ibtida'iyyah
      // and then I'dadiyyah holds two certificates under one ID, so this is
      // a correct academic record, not a fault — but it is still not an
      // attestation, because no single document has been identified. The
      // holder is handed the certificate numbers off their own documents
      // and asked which one they mean; nothing here is picked for them.
      // NOTE for the public page (js/certificate-verify.js, not this file):
      // kind 'student_certificate_index' needs its own branch — an older
      // renderer that only knows the single-document shape will badge this
      // as a verified credential, which it is not.
      await logVerification(sql, request, ref, 'multiple');
      const rows = resolved.rows;
      return json({
        ok: true,
        found: true,
        kind: 'student_certificate_index',
        status: 'multiple_matches',
        studentIdentityNo: rows[0].student_identity_no,
        recipientName: rows[0].student_full_name,
        recipientNameAr: rows[0].student_full_name_ar,
        matchCount: rows.length,
        matches: rows.map((r) => {
          const state = stageCertificateState(env, r);
          return {
            serialNo: r.serial_no,
            certificateNo: displayStageCertificateNo(r.serial_no),
            programmeCode: r.programme_code,
            credentialType: `Certificate of Completion — ${r.programme_label_en}`,
            credentialTypeAr: r.programme_label_ar ? `شهادة إتمام ${r.programme_label_ar}` : null,
            academicYear: r.academic_year,
            issuedAt: isoDateOnly(r.issued_at),
            status: state.status,
          };
        }),
      });
    }
    if (resolved && resolved.outcome === 'resolved') {
      const row = resolved.rows[0];
      const state = stageCertificateState(env, row);
      await logVerification(sql, request, ref, state.outcome);
      return json({
        ok: true,
        found: true,
        kind: 'stage_certificate',
        serialNo: row.serial_no,
        referenceNo: row.serial_no,
        // The number as ENGRAVED on the sheet, so a verifier comparing the
        // result against the document in their hand sees the same string.
        certificateNo: displayStageCertificateNo(row.serial_no),
        recipientName: row.student_full_name,
        recipientNameAr: row.student_full_name_ar,
        studentIdentityNo: row.student_identity_no,
        credentialType: `Certificate of Completion — ${row.programme_label_en}`,
        credentialTypeAr: row.programme_label_ar ? `شهادة إتمام ${row.programme_label_ar}` : null,
        programmeCode: row.programme_code,
        institutionName: row.institution_name,
        academicYear: row.academic_year,
        // No grade fields: Editorial Bible §1.5 — the certificate (and
        // therefore its public attestation) certifies completion only;
        // performance data belongs to the Transcript / Statement of
        // Results. grade_en/grade_ar stay stored for those documents.
        issuedAt: isoDateOnly(row.issued_at),
        issuedAtHijri: row.issued_at_hijri,
        batchNo: row.batch_no,
        integrity: state.intact ? 'intact' : 'integrity_check_failed',
        status: state.status,
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }
    // A well-formed stage identifier that matched nothing still falls
    // through: the older certificate and Ijazah families use free-form
    // staff-assigned reference numbers, and short-circuiting here would
    // hide a genuine match in one of them behind a shape coincidence.
    const cert = await sql`
      SELECT certificate_type, student_full_name, reference_no, issued_at, revoked_at, revocation_note
      FROM certificates WHERE reference_no = ${ref}`;
    if (cert.rows.length) {
      const row = cert.rows[0];
      await logVerification(sql, request, row.reference_no, row.revoked_at ? 'revoked' : 'valid');
      return json({
        ok: true,
        found: true,
        kind: 'certificate',
        referenceNo: row.reference_no,
        recipientName: row.student_full_name,
        credentialType: row.certificate_type,
        issuedAt: row.issued_at,
        status: row.revoked_at ? 'revoked' : 'active',
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }

    const ijazah = await sql`
      SELECT student_full_name, reference_no, granted_date, examining_scholars, certified_scope, revoked_at, revocation_note
      FROM ijazah_register WHERE reference_no = ${ref}`;
    if (ijazah.rows.length) {
      const row = ijazah.rows[0];
      await logVerification(sql, request, row.reference_no, row.revoked_at ? 'revoked' : 'valid');
      return json({
        ok: true,
        found: true,
        kind: 'ijazah',
        referenceNo: row.reference_no,
        recipientName: row.student_full_name,
        credentialType: 'Ijazah — Qur’an Memorisation Certification',
        certifiedScope: row.certified_scope,
        examiningScholars: row.examining_scholars,
        issuedAt: row.granted_date,
        status: row.revoked_at ? 'revoked' : 'active',
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }

    // Audit trail for a failed public lookup — but only for a reference
    // whose SHAPE this institution issued. That distinction is the whole
    // point: a well-formed number that resolves to nothing is the signal
    // §3.7 tamper detection exists for (a forged sheet being checked, or a
    // record that has gone missing), and until now it left no trace at all.
    // Logging arbitrary strings instead would let an unauthenticated
    // endpoint fill verification_log with rows on demand, drowning exactly
    // the signal the table is for.
    if (identifier) await logVerification(sql, request, ref, 'not_found');
    return json({ ok: true, found: false });
  } catch (err) {
    console.error('certificate verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

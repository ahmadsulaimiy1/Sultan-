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
import { parseStageCertificateSerial, verifyStageCertificateIntegrity, isoDateOnly } from '../../_lib/certificate-serial.js';
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

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a certificate or Ijazah reference number.' }, 400);

  try {
    // Academic Stage Certificates (Certificate Generation Directive,
    // 2026-08-05) — the long-serial family
    // (SHRS-CERT-<PROG>-<YYYY>-<seq6>-<SUFFIX5>). Checked first because
    // the serial shape is unambiguous, and verified DEEPER than the
    // register families below: beyond row lookup, the HMAC-SHA256
    // content hash is recomputed over the stored fields and the
    // serial's printed anti-forgery suffix is re-derived from it, so a
    // tampered record or fabricated serial surfaces as an integrity
    // failure instead of quietly verifying.
    const parsedSerial = parseStageCertificateSerial(ref);
    if (parsedSerial) {
      const res = await sql`
        SELECT sc.*, b.batch_no FROM stage_certificates sc
        LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
        WHERE sc.serial_no = ${parsedSerial.serialBase + '-' + parsedSerial.suffix}`;
      const row = res.rows[0];
      if (!row) {
        await logVerification(sql, request, ref, 'not_found');
        return json({ ok: true, found: false });
      }
      let integrity = { hashValid: false, suffixValid: false };
      try {
        integrity = verifyStageCertificateIntegrity(env, row);
      } catch (hashErr) {
        console.error('stage certificate integrity check unavailable', hashErr);
      }
      const intact = integrity.hashValid && integrity.suffixValid;
      const outcome = !intact ? 'hash_mismatch' : row.revoked_at ? 'revoked' : 'valid';
      await logVerification(sql, request, ref, outcome);
      return json({
        ok: true,
        found: true,
        kind: 'stage_certificate',
        serialNo: row.serial_no,
        referenceNo: row.serial_no,
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
        integrity: intact ? 'intact' : 'integrity_check_failed',
        status: !intact ? 'integrity_check_failed' : row.revoked_at ? 'revoked' : 'active',
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }
    const cert = await sql`
      SELECT certificate_type, student_full_name, reference_no, issued_at, revoked_at, revocation_note
      FROM certificates WHERE reference_no = ${ref}`;
    if (cert.rows.length) {
      const row = cert.rows[0];
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

    return json({ ok: true, found: false });
  } catch (err) {
    console.error('certificate verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

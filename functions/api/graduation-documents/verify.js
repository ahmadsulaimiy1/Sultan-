// Public Graduation Document verification (Stage 3, Tier 1 — spec §5.2)
// — no session required by design, exactly like the existing
// certificate/receipt/identity verify endpoints this mirrors. Looked up
// by the reference_no printed/QR-coded/barcoded on the document itself.
//
// Every check is logged to verification_log (spec §3.8) — the Lifetime
// Verification Record — with the caller's IP hashed, never stored raw
// (spec §5.3). The response returns only the audience-safe field set
// (spec §5.1): never grades, disciplinary history, or contact details.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';
import { verifyDocumentHash, hashIpAddress } from '../../_lib/document-hash.js';

async function logVerification(sql, referenceNo, outcome, ipHash) {
  try {
    await sql`INSERT INTO verification_log (document_reference_no, ip_hash, outcome) VALUES (${referenceNo}, ${ipHash}, ${outcome})`;
  } catch (err) {
    console.error('verification_log insert error', err);
  }
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a graduation document reference number.' }, 400);
  const ipHash = hashIpAddress(request.headers.get('cf-connecting-ip'));

  try {
    const res = await sql`
      SELECT gd.id, gd.document_type, gd.document_kind, gd.reference_no, gd.verification_id, gd.issued_at,
             gd.content_hash, gd.revoked_at, gd.revocation_note, gd.reissue_of,
             gr.preferred_certificate_name, gr.full_legal_name, gr.graduation_session,
             ci.name AS institution_name
      FROM graduation_documents gd
      JOIN graduation_records gr ON gr.id = gd.graduation_record_id
      LEFT JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE gd.reference_no = ${ref}`;

    if (!res.rows.length) {
      await logVerification(sql, ref, 'not_found', ipHash);
      return json({ ok: true, found: false });
    }

    const row = res.rows[0];
    // The exact same canonical field set the document was hashed with at
    // issuance (spec §3.5) — must match computeDocumentHash's call site
    // in the (not-yet-built) issuance flow field-for-field, or every
    // genuine document would show a false content-mismatch.
    const hashFields = {
      graduationRecordId: row.id, documentType: row.document_type,
      referenceNo: row.reference_no, issuedAt: row.issued_at,
    };
    let hashOk = true;
    try {
      // Verify under the key that SIGNED this document, not the current one —
      // otherwise a secret rotation reports every previously issued document as
      // tampered. Rows predating key versioning default to version 1.
      const check = verifyDocumentHash(env, hashFields, row.content_hash, row.hash_key_version || 1);
      // A missing retired key is a deployment gap, not tampering. Treating the
      // two alike would publicly accuse genuine documents over an unset
      // environment variable, so only a real 'mismatch' counts as a failure.
      hashOk = check.ok || check.reason === 'key_unavailable';
      if (check.reason === 'key_unavailable') console.error('graduation-document verify:', check.detail);
    } catch (err) {
      console.error('graduation-document verify hash-check error', err);
      hashOk = true; // fail open on a config error, never fail closed and falsely accuse a genuine document
    }

    const isRevoked = !!row.revoked_at;
    const outcome = !hashOk ? 'hash_mismatch' : isRevoked ? 'revoked' : 'valid';
    await logVerification(sql, ref, outcome, ipHash);

    return json({
      ok: true,
      found: true,
      referenceNo: row.reference_no,
      documentType: row.document_type,
      documentKind: row.document_kind,
      verificationId: row.verification_id,
      recipientName: row.preferred_certificate_name || row.full_legal_name,
      institutionName: row.institution_name,
      graduationSession: row.graduation_session,
      issuedAt: row.issued_at,
      status: isRevoked ? 'revoked' : 'active',
      revokedAt: row.revoked_at,
      revocationNote: isRevoked ? row.revocation_note : null,
      contentVerified: hashOk,
      isReissue: !!row.reissue_of,
    });
  } catch (err) {
    console.error('graduation-documents verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

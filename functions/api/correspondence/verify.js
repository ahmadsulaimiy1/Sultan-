// Public correspondence verification — no session required, mirroring
// functions/api/graduation-documents/verify.js exactly in shape and
// discipline (same verification_log table, already generic enough to
// take any reference_no with no schema change; same hashed-IP-only
// logging; same "missing retired key is an operator problem, not
// evidence of tampering" fail-open rule).
//
// Deliberately narrower response than the graduation-document verifier:
// a letter of warning or an appointment letter can carry information
// that should never be exposed to an anonymous caller who only typed in
// a reference number — so this confirms AUTHENTICITY (it exists, it
// was issued by this office, on this date, it hasn't been revoked, its
// content hash checks out) without ever returning the recipient's name,
// the subject, or the body. That is the whole point of "verified where
// appropriate" — appropriate here means confirming genuineness, not
// republishing the letter.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';
import { verifyDocumentHash, hashIpAddress } from '../../_lib/document-hash.js';
import { correspondenceTypeLabel } from '../../_lib/correspondence-shell.js';
import { institutionByDbName } from '../../_lib/institutions.js';

async function logVerification(sql, referenceNo, outcome, ipHash) {
  try {
    await sql`INSERT INTO verification_log (document_reference_no, ip_hash, outcome) VALUES (${referenceNo}, ${ipHash}, ${outcome})`;
  } catch (err) {
    console.error('verification_log insert error (correspondence)', err);
  }
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a document reference number.' }, 400);
  const ipHash = hashIpAddress(request.headers.get('cf-connecting-ip'));

  try {
    const res = await sql`
      SELECT c.id, c.office_id, c.document_type, c.reference_no, c.issued_at, c.content_hash, c.hash_key_version,
             c.status, c.body_html, o.name AS office_name, i.name AS institution_name
      FROM office_correspondence c
      JOIN offices o ON o.id = c.office_id
      LEFT JOIN institutions i ON i.id = c.institution_id
      WHERE c.reference_no = ${ref}`;

    if (!res.rows.length) {
      await logVerification(sql, ref, 'not_found', ipHash);
      return json({ ok: true, found: false });
    }

    const row = res.rows[0];
    // Must match issue.js's hashFields field-for-field or every genuine
    // document reports a false mismatch.
    const hashFields = {
      correspondenceId: row.id, officeId: row.office_id, documentType: row.document_type,
      referenceNo: row.reference_no, issuedAt: row.issued_at, bodyHtml: row.body_html,
    };
    let hashOk = true;
    try {
      const check = verifyDocumentHash(env, hashFields, row.content_hash, row.hash_key_version || 1);
      hashOk = check.ok || check.reason === 'key_unavailable';
      if (check.reason === 'key_unavailable') console.error('correspondence verify:', check.detail);
    } catch (err) {
      console.error('correspondence verify hash-check error', err);
      hashOk = true; // fail open on a config error, never falsely accuse a genuine document
    }

    const isRevoked = row.status === 'revoked';
    const outcome = !hashOk ? 'hash_mismatch' : isRevoked ? 'revoked' : 'valid';
    await logVerification(sql, ref, outcome, ipHash);

    const specificInstitution = institutionByDbName(row.institution_name);

    return json({
      ok: true,
      found: true,
      referenceNo: row.reference_no,
      documentType: row.document_type,
      documentTypeLabel: correspondenceTypeLabel(row.document_type),
      officeName: row.office_name,
      institutionName: specificInstitution ? specificInstitution.displayName : 'Sultan Hanafi Royal Schools',
      issuedAt: row.issued_at,
      status: isRevoked ? 'revoked' : 'active',
      contentVerified: hashOk,
    });
  } catch (err) {
    console.error('correspondence verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

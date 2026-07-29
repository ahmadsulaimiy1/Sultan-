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

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a certificate or Ijazah reference number.' }, 400);

  try {
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

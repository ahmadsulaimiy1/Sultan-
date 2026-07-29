// Public Digital Identity verification — no session required, mirroring
// functions/api/certificates/verify.js: anyone holding a physical or
// digital SHRS ID card (a security guard, another institution, a parent
// confirming a teacher's identity) can confirm it's genuine without a
// Digital Campus account, looked up by the same `identity_no` printed
// on the card. No separate secret token, for the same reason as
// certificates: identity numbers are system-generated once per person,
// never user-chosen, so nothing here lets a stranger register a fake
// one — and this only ever returns fields that are already meant to be
// shown to a third party checking someone's identity, never contact
// details, addresses, fee status, or academic records.
//
// Deliberately excludes anything the Digital Identity System doesn't
// actually have yet — house, blood group, digital wallet number,
// library/transport/hostel status — rather than fabricating them (see
// docs/digital-identity-system.md).
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const idNo = (url.searchParams.get('id') || '').trim();
  if (!idNo) return json({ error: 'Provide an SHRS identity number.' }, 400);

  try {
    if (idNo.startsWith('SHR-STU-')) {
      const res = await sql`
        SELECT s.full_name, s.status, s.identity_no,
               c.institution, c.name AS class_name
        FROM students s
        LEFT JOIN student_classes sc ON sc.student_id = s.id AND sc.is_primary = true
        LEFT JOIN classes c ON c.id = sc.class_id
        WHERE s.identity_no = ${idNo}`;
      const row = res.rows[0];
      if (!row) return json({ ok: true, found: false });
      return json({
        ok: true,
        found: true,
        kind: 'student',
        identityNo: row.identity_no,
        fullName: row.full_name,
        status: row.status,
        institution: row.institution || null,
        className: row.class_name || null,
      });
    }

    if (idNo.startsWith('SHR-PAR-')) {
      const res = await sql`SELECT full_name, identity_no, email_verified_at FROM guardians WHERE identity_no = ${idNo}`;
      const row = res.rows[0];
      if (!row) return json({ ok: true, found: false });
      return json({
        ok: true,
        found: true,
        kind: 'guardian',
        identityNo: row.identity_no,
        fullName: row.full_name,
        status: row.email_verified_at ? 'verified' : 'unverified',
      });
    }

    if (idNo.startsWith('SHR-STF-')) {
      const res = await sql`
        SELECT s.full_name, s.position_title, s.status, s.identity_no,
               i.name AS institution_name
        FROM staff s
        LEFT JOIN institutions i ON i.id = s.institution_id
        WHERE s.identity_no = ${idNo}`;
      const row = res.rows[0];
      if (!row) return json({ ok: true, found: false });
      return json({
        ok: true,
        found: true,
        kind: 'staff',
        identityNo: row.identity_no,
        fullName: row.full_name,
        positionTitle: row.position_title,
        institution: row.institution_name || null,
        status: row.status,
      });
    }

    return json({ ok: true, found: false });
  } catch (err) {
    console.error('identity verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

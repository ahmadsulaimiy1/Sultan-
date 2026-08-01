// Lifetime Verification History — staff-facing surface over verification_log
// (spec §3.8's Lifetime Verification Record). Executive Directive point 2
// names "Lifetime Verification History" as its own platform component,
// distinct from simply having the table exist: §3.7's tamper-detection
// purpose only works if a real member of staff can actually look at the
// history of checks against one document. Never exposes ip_hash — that
// column exists solely for the institution's own anomaly review per §5.3,
// and even a hash is unnecessary detail for this office-level view.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'ref is required.' }, 400);

  try {
    const docRes = await sql`
      SELECT gd.reference_no, gd.document_type, gd.issued_at, gd.revoked_at, ci.id AS institution_id
      FROM graduation_documents gd
      LEFT JOIN graduation_records gr ON gr.id = gd.graduation_record_id
      LEFT JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE gd.reference_no = ${ref}`;
    const doc = docRes.rows[0];
    if (!doc) return json({ error: 'No graduation document found with that reference number.' }, 404);

    const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'V', doc.institution_id ?? null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to view this document’s verification history.' }, 403);
    }

    const logRes = await sql`
      SELECT verified_at, outcome FROM verification_log
      WHERE document_reference_no = ${ref}
      ORDER BY verified_at DESC
      LIMIT 200`;

    return json({
      ok: true,
      referenceNo: doc.reference_no,
      documentType: doc.document_type,
      issuedAt: doc.issued_at,
      status: doc.revoked_at ? 'revoked' : 'active',
      checkCount: logRes.rows.length,
      checks: logRes.rows.map((row) => ({ verifiedAt: row.verified_at, outcome: row.outcome })),
    });
  } catch (err) {
    console.error('verification-history error', err);
    return json({ error: 'Could not load that verification history right now — please try again shortly.' }, 500);
  }
}

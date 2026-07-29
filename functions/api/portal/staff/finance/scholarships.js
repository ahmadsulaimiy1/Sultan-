// Finance Officer: grant/revoke scholarships (Imperial Digital Campus
// Directive, Priority 3). Granting a scholarship does NOT retroactively
// change any invoice already issued — its discount is only applied to
// invoices created from this point on, since an invoice's discount is
// a permanent snapshot taken at issuance (see invoices.js).
//
// The Matrix (functions/_lib/permission-matrix.js) grants EXE an
// Approve permission on `finance` scoped specifically to
// "refund/waiver/scholarship" — but flags in its own scope text that
// "no policy exists yet to route this through." No Approval Workflow
// Architecture exists anywhere in this codebase yet (see
// docs/finance-platform.md and the open roadmap item), so granting a
// scholarship here is a direct FIN Create action, not a two-step
// FIN-request/EXE-approve flow. That gap is real and already flagged
// in the Matrix itself — this endpoint doesn't invent a workaround for
// it, it just doesn't block Priority 3 on unbuilt infrastructure.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

function mapRow(r) {
  return {
    id: r.id, studentId: r.student_id, scholarshipType: r.scholarship_type,
    discountPercent: r.discount_percent != null ? Number(r.discount_percent) : null,
    discountAmount: r.discount_amount != null ? Number(r.discount_amount) : null,
    sponsorName: r.sponsor_name, term: r.term, notes: r.notes,
    grantedAt: r.granted_at, isActive: r.is_active, revokedAt: r.revoked_at, revocationNote: r.revocation_note,
  };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view scholarships. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  const url = new URL(request.url);
  const admissionNo = (url.searchParams.get('admissionNo') || '').trim();

  try {
    let rows;
    if (admissionNo) {
      const studentRes = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      rows = (await sql`SELECT * FROM scholarships WHERE student_id = ${student.id} ORDER BY granted_at DESC`).rows;
    } else {
      rows = (await sql`SELECT * FROM scholarships WHERE is_active = true ORDER BY granted_at DESC LIMIT 100`).rows;
    }
    return json({ scholarships: rows.map(mapRow) });
  } catch (err) {
    console.error('scholarships list error', err);
    return json({ error: 'Could not load scholarships: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body.action || 'grant';

  try {
    if (action === 'grant') {
      const admissionNo = (body.admissionNo || '').trim();
      const scholarshipType = ['full', 'partial', 'sponsored'].includes(body.scholarshipType) ? body.scholarshipType : null;
      const discountPercent = body.discountPercent != null ? Number(body.discountPercent) : null;
      const discountAmount = body.discountAmount != null ? Number(body.discountAmount) : null;
      if (!admissionNo || !scholarshipType) {
        return json({ error: 'admissionNo and a valid scholarshipType (full, partial, sponsored) are required.' }, 400);
      }
      if (scholarshipType === 'partial' && discountPercent == null && discountAmount == null) {
        return json({ error: 'A partial scholarship needs a discountPercent or discountAmount.' }, 400);
      }

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'C', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to grant scholarships. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
      }

      const studentRes = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) return json({ error: 'No student found with that Institutional Student Number.' }, 404);

      const created = await sql`
        INSERT INTO scholarships (student_id, scholarship_type, discount_percent, discount_amount, sponsor_name, term, notes, granted_by_staff_id)
        VALUES (${student.id}, ${scholarshipType}, ${discountPercent}, ${discountAmount}, ${body.sponsorName || null}, ${body.term || null}, ${body.notes || null}, ${staffId})
        RETURNING id`;
      const scholarshipId = created.rows[0].id;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'scholarship', targetId: scholarshipId,
        reason: body.reason || null, metadata: { admissionNo, scholarshipType, discountPercent, discountAmount, term: body.term || null },
      });

      return json({ ok: true, scholarshipId });
    }

    if (action === 'revoke') {
      const scholarshipId = Number(body.scholarshipId);
      if (!scholarshipId) return json({ error: 'scholarshipId is required.' }, 400);

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'E', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to revoke scholarships. See docs/finance-platform.md." }, 403);
      }

      await sql`UPDATE scholarships SET is_active = false, revoked_at = now(), revocation_note = ${body.reason || null} WHERE id = ${scholarshipId}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'scholarship', targetId: scholarshipId,
        reason: body.reason || null, metadata: { action: 'revoke' },
      });
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('scholarships write error', err);
    return json({ error: 'Could not save that scholarship: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

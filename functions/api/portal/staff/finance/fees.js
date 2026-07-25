// Migration Phase C (docs/identity-migration-plan.md): fee status
// entry moved off admin/students.js's bearer token onto the Staff
// Identity Platform — session-authenticated, Permission-Engine-gated
// against the `finance` area, audited via staff_audit_log.
//
// No UI exists for this endpoint, deliberately — same "protected raw
// API, no UI yet" convention as admin/hifz-progress.js, except session-
// based rather than token-based. Building a form nobody can submit
// would be dead functionality: see docs/financial-authority-map.md's
// central finding. The Matrix grants Create/Edit on `finance` to the
// Finance Officer (FIN) role ONLY — no Registrar, Principal, or
// Executive grant exists at all (Executive holds only an aggregate View
// and an Approve permission scoped to refund/waiver/scholarship, itself
// unbuilt). FIN is seeded 'proposed' in setup.js — no such account has
// ever been issued. This endpoint enforces that precisely rather than
// inventing a fallback grant for an adjacent role, per the explicit
// instruction not to solve a missing-role gap that way: until a Finance
// Officer account exists, EVERY staff member receives the same honest
// 403 below, not a privileged subset of them.
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

async function ensureTerm(sql, rawTerm) {
  const term = String(rawTerm || '').trim();
  if (!term) return term;
  await sql`INSERT INTO academic_terms (label) VALUES (${term}) ON CONFLICT (label) DO NOTHING`;
  return term;
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const admissionNo = ((body && body.admissionNo) || '').trim();
  const rawTerm = (body && body.term) || '';
  const amountDue = body && body.amountDue != null ? Number(body.amountDue) : null;
  const amountPaid = body && body.amountPaid != null ? Number(body.amountPaid) : null;
  if (!admissionNo || !rawTerm || amountDue == null || amountPaid == null) {
    return json({ error: 'admissionNo, term, amountDue, and amountPaid are all required.' }, 400);
  }

  try {
    const studentRes = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that Institutional Student Number.' }, 404);
    }

    const term = await ensureTerm(sql, rawTerm);
    const existing = await sql`SELECT id FROM fee_status WHERE student_id = ${student.id} AND term = ${term}`;
    const isCreate = existing.rows.length === 0;

    // No institution scoping needed — the Matrix's `finance` grants
    // (FIN, EXE) carry no institution-scoped row; FIN's is
    // school-wide, EXE's is aggregate-only and doesn't reach this
    // Create/Edit action at all.
    const grant = await hasPermissionFor(sql, staffId, 'finance', isCreate ? 'C' : 'E', null);
    if (!grant.granted) {
      return json({
        error: "Your role does not have authority to enter fee records. Per the Role & Permission Matrix, this is a Finance Officer function — no Finance Officer account has been issued yet. See docs/financial-authority-map.md.",
      }, 403);
    }

    await sql`
      INSERT INTO fee_status (student_id, term, amount_due, amount_paid)
      VALUES (${student.id}, ${term}, ${amountDue}, ${amountPaid})
      ON CONFLICT (student_id, term) DO UPDATE SET
        amount_due = EXCLUDED.amount_due, amount_paid = EXCLUDED.amount_paid, updated_at = now()`;

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'fee_status', targetId: student.id,
      reason: body.reason || null, metadata: { admissionNo, term, amountDue, amountPaid, action: isCreate ? 'create' : 'correct' },
    });

    return json({ ok: true, studentId: student.id, term, created: isCreate });
  } catch (err) {
    console.error('staff finance fees error', err);
    return json({ error: 'Could not save that fee record: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

// Migration Phase A (docs/identity-migration-plan.md): attendance
// correction moved off admin/students.js's bearer token onto the Staff
// Identity Platform — session-authenticated, Permission-Engine-gated
// against the `attendance` area, audited via staff_audit_log.
//
// Honest gap, not smoothed over: the Matrix grants REG only Edit
// ('correction' scope), not Create — first-time attendance entry is a
// Class Teacher (TCH) function. This endpoint distinguishes Create
// (first row for a term) from Edit (correcting an existing row) and
// only grants what the Matrix actually says each role holds — it does
// not invent a provisional Create grant for REG to paper over the gap.
// See docs/registrar-office.md for what this means operationally today.
//
// Teacher Identity & Academic Workforce Activation added the piece this
// endpoint was missing: teacher_class_assignments now lets a TCH grant's
// "own class, own period" scope be checked against something real, not
// just assumed. checkGrants() in permissions.js can only resolve
// role+area+permission+institution generically — a specific class is
// exactly the "finer" check that file says the calling endpoint still
// owes, so it's enforced here: a TCH holder must have an active Class
// Teacher assignment (is_class_teacher = true) for this student's actual
// class, not merely hold the TCH role somewhere in the institution.
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
  const daysPresent = Number(body && body.daysPresent);
  const daysTotal = Number(body && body.daysTotal);
  if (!admissionNo || !rawTerm || !Number.isFinite(daysPresent) || !Number.isFinite(daysTotal)) {
    return json({ error: 'admissionNo, term, daysPresent, and daysTotal are all required.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.full_name, s.class_id, ci.id AS institution_id
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that Institutional Student Number.' }, 404);
    }

    const term = await ensureTerm(sql, rawTerm);
    const existing = await sql`SELECT id FROM attendance_summary WHERE student_id = ${student.id} AND term = ${term}`;
    const isCreate = existing.rows.length === 0;

    // Real institution id passed, never null — a Principal's
    // institution-scoped grant must be checked against this student's
    // actual institution, matching the fix already applied in
    // registrar/student.js and registrar/lifecycle-events.js.
    const grant = await hasPermissionFor(sql, staffId, 'attendance', isCreate ? 'C' : 'E', student.institution_id ?? null);
    if (!grant.granted) {
      return json({
        error: isCreate
          ? "No attendance record exists yet for this student and term. Per the Role & Permission Matrix, first-time attendance entry is a Class Teacher function — your role does not hold it. Once a Teacher account exists for this class, they can create the initial entry; you can then correct it."
          : 'Your role does not have authority to correct attendance records.',
      }, 403);
    }
    if (grant.via.roleCode === 'TCH') {
      const assignedRes = await sql`
        SELECT 1 FROM teacher_class_assignments
        WHERE staff_id = ${staffId} AND class_id = ${student.class_id} AND is_class_teacher = true AND revoked_at IS NULL`;
      if (!assignedRes.rows.length) {
        return json({ error: 'You are not the assigned Class Teacher for this student’s class.' }, 403);
      }
    }

    await sql`
      INSERT INTO attendance_summary (student_id, term, days_present, days_total)
      VALUES (${student.id}, ${term}, ${daysPresent}, ${daysTotal})
      ON CONFLICT (student_id, term) DO UPDATE SET
        days_present = EXCLUDED.days_present, days_total = EXCLUDED.days_total, updated_at = now()`;

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'attendance_summary', targetId: student.id,
      reason: body.reason || null, metadata: { admissionNo, term, daysPresent, daysTotal, action: isCreate ? 'create' : 'correct' },
    });

    return json({ ok: true, studentId: student.id, term, created: isCreate });
  } catch (err) {
    console.error('registrar attendance error', err);
    return json({ error: 'Could not save that attendance record: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

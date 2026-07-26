// Teacher Portal — take attendance for a whole class in one sitting.
// This is the real Class Teacher workflow the Migration Phase A
// endpoint (staff/registrar/attendance.js) was never shaped for — that
// one is a single-student, admission-number lookup built for Registrar
// corrections. This endpoint is class-roster-first, bulk, and is the
// first working path in this project for genuinely first-time
// (Create) attendance entry, now that a real teacher_class_assignments
// row can exist.
//
// Gated twice, deliberately: (1) an active Class Teacher assignment for
// this exact class — the "own class, own period" scope check the
// generic Permission Engine cannot resolve on its own (see
// permissions.js); (2) the Matrix's own Create/Edit grant per student,
// since a class can genuinely be a mix of first-time entries and
// corrections within the same submission.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

async function ensureTerm(sql, rawTerm) {
  const term = String(rawTerm || '').trim();
  if (!term) return term;
  await sql`INSERT INTO academic_terms (label) VALUES (${term}) ON CONFLICT (label) DO NOTHING`;
  return term;
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const classId = Number(body && body.classId);
  const rawTerm = (body && body.term) || '';
  const records = Array.isArray(body && body.records) ? body.records : [];
  if (!Number.isInteger(classId) || !rawTerm.trim() || !records.length) {
    return json({ error: 'classId, term, and a non-empty records array are all required.' }, 400);
  }

  try {
    const classRes = await sql`
      SELECT c.id, ci.id AS institution_id FROM classes c
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE c.id = ${classId}`;
    const cls = classRes.rows[0];
    if (!cls) {
      return json({ error: 'No such class.' }, 404);
    }

    const assignRes = await sql`
      SELECT 1 FROM teacher_class_assignments
      WHERE staff_id = ${session.staffId} AND class_id = ${classId} AND is_class_teacher = true AND revoked_at IS NULL`;
    if (!assignRes.rows.length) {
      return json({ error: 'You are not the assigned Class Teacher for this class.' }, 403);
    }

    const rosterRes = await sql`SELECT student_id FROM student_classes WHERE class_id = ${classId}`;
    const rosterIds = new Set(rosterRes.rows.map((r) => r.student_id));
    for (const rec of records) {
      if (!rosterIds.has(Number(rec.studentId))) {
        return json({ error: 'One or more students in this submission are not enrolled in this class.' }, 400);
      }
    }

    const term = await ensureTerm(sql, rawTerm);
    const studentIds = records.map((r) => Number(r.studentId));
    const placeholders = studentIds.map((_, i) => `$${i + 2}`).join(', ');
    const existingRes = await sql.query(
      `SELECT student_id FROM attendance_summary WHERE term = $1 AND student_id IN (${placeholders})`,
      [term, ...studentIds]
    );
    const existingSet = new Set(existingRes.rows.map((r) => r.student_id));
    const needsCreate = studentIds.some((id) => !existingSet.has(id));
    const needsEdit = studentIds.some((id) => existingSet.has(id));

    if (needsCreate) {
      const grant = await hasPermissionFor(sql, session.staffId, 'attendance', 'C', cls.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to create first-time attendance records.' }, 403);
      }
    }
    if (needsEdit) {
      const grant = await hasPermissionFor(sql, session.staffId, 'attendance', 'E', cls.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to correct existing attendance records.' }, 403);
      }
    }

    let saved = 0;
    for (const rec of records) {
      const studentId = Number(rec.studentId);
      const daysPresent = Number(rec.daysPresent);
      const daysTotal = Number(rec.daysTotal);
      if (!Number.isFinite(daysPresent) || !Number.isFinite(daysTotal)) continue;
      await sql`
        INSERT INTO attendance_summary (student_id, term, days_present, days_total)
        VALUES (${studentId}, ${term}, ${daysPresent}, ${daysTotal})
        ON CONFLICT (student_id, term) DO UPDATE SET
          days_present = EXCLUDED.days_present, days_total = EXCLUDED.days_total, updated_at = now()`;
      saved += 1;
    }

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'attendance_summary', targetId: classId,
      reason: body.reason || null, metadata: { classId, term, studentsRecorded: saved },
    });

    return json({ ok: true, term, saved });
  } catch (err) {
    console.error('teacher attendance error', err);
    return json({ error: 'Could not save that attendance — ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

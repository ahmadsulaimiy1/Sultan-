// Migration Phase B (docs/identity-migration-plan.md): raw CA/exam
// score entry moved off admin/students.js's bearer token onto the
// Staff Identity Platform — session-authenticated, Permission-Engine-
// gated against the `assessments` area, audited via staff_audit_log.
//
// Same honest split as Migration Phase A's attendance.js, and the same
// real gap: the Matrix grants TCH/MUH/ARB Create+Edit on `assessments`
// ('own subject/class' scope) but REG only Edit ('correction only,
// logged' scope) — first-time entry of a term's raw score is a
// subject-teacher-tier function.
//
// Teacher Identity & Academic Workforce Activation added
// teacher_class_assignments, so a TCH grant's "own subject/class" scope
// is now checked against a real assignment row (subject-specific, not
// just class-teacher) rather than assumed — same pattern as
// attendance.js. MUH and ARB remain 'proposed' roles with no account
// ever issued, so their branch of this same gap stands as documented
// below. See docs/academic-records-authority-map.md for
// the full accounting of where the Matrix's Approve/Publish step for
// the separate `results` area (finalising these into a report card) has
// never been implemented as an enforced gate anywhere in this project —
// a raw score is visible to the guardian/student dashboards the moment
// it's written, exactly as it already was under the old bearer token.
// This migration moves who may write it; it does not add a publish gate
// that didn't exist before (see the Approval Workflow Architecture
// roadmap item for that separate, not-yet-authorised work).
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
  const subject = ((body && body.subject) || '').trim();
  const rawTerm = (body && body.term) || '';
  const caScore = body && body.caScore != null ? Number(body.caScore) : null;
  const examScore = body && body.examScore != null ? Number(body.examScore) : null;
  const teacherComment = (body && body.teacherComment) || null;
  if (!admissionNo || !subject || !rawTerm) {
    return json({ error: 'admissionNo, term, and subject are all required.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.class_id, ci.id AS institution_id
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that Institutional Student Number.' }, 404);
    }

    const term = await ensureTerm(sql, rawTerm);
    const existing = await sql`SELECT id FROM term_results WHERE student_id = ${student.id} AND term = ${term} AND subject = ${subject}`;
    const isCreate = existing.rows.length === 0;

    const grant = await hasPermissionFor(sql, staffId, 'assessments', isCreate ? 'C' : 'E', student.institution_id ?? null);
    if (!grant.granted) {
      return json({
        error: isCreate
          ? "No score exists yet for this student, term, and subject. Per the Role & Permission Matrix, first-time assessment entry is a Subject Teacher / Muhaffiz / Arabic Instructor function — your role does not hold it. Once that account exists, they can create the initial entry; you can then correct it."
          : 'Your role does not have authority to correct assessment records.',
      }, 403);
    }
    if (grant.via.roleCode === 'TCH') {
      const assignedRes = await sql`
        SELECT 1 FROM teacher_class_assignments
        WHERE staff_id = ${staffId} AND class_id = ${student.class_id} AND subject = ${subject} AND revoked_at IS NULL`;
      if (!assignedRes.rows.length) {
        return json({ error: 'You are not the assigned Subject Teacher for this student’s class and subject.' }, 403);
      }
    }

    const totalScore = body.totalScore != null ? Number(body.totalScore) : (Number(caScore || 0) + Number(examScore || 0));
    await sql`
      INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
      VALUES (${student.id}, ${term}, ${subject}, ${caScore}, ${examScore}, ${totalScore}, ${teacherComment})
      ON CONFLICT (student_id, term, subject) DO UPDATE SET
        ca_score = EXCLUDED.ca_score, exam_score = EXCLUDED.exam_score,
        total_score = EXCLUDED.total_score, teacher_comment = EXCLUDED.teacher_comment, updated_at = now()`;

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'term_results', targetId: student.id,
      reason: body.reason || null, metadata: { admissionNo, term, subject, caScore, examScore, totalScore, action: isCreate ? 'create' : 'correct' },
    });

    return json({ ok: true, studentId: student.id, term, subject, totalScore, created: isCreate });
  } catch (err) {
    console.error('registrar assessments error', err);
    return json({ error: 'Could not save that assessment record: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

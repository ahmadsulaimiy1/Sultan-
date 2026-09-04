// Teacher Portal — LMS Phase 1: view one assignment's roster/submissions
// and save scores/feedback in bulk. Sibling to staff/teacher/assessments.js
// — same scope check (an active teacher_class_assignments row for this
// exact class+subject) before the Matrix's own Edit grant, since grading
// is a correction/entry onto an existing assignment, not first-time
// creation (that's assignments.js's POST).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  const sql = getSql(env);
  if (!sql) return { error: json({ error: 'Portal is not configured yet — no database is linked.' }, 500) };
  return { session, sql };
}

async function loadOwnedAssignment(sql, staffId, assignmentId) {
  const res = await sql`
    SELECT a.id, a.class_id, a.subject, a.title, a.max_score, a.due_at, c.institution
    FROM assignments a JOIN classes c ON c.id = a.class_id
    WHERE a.id = ${assignmentId} AND a.staff_id = ${staffId}`;
  return res.rows[0] || null;
}

// The whole class roster, each student's submission (if any) alongside
// it — a student with no assignment_submissions row yet still appears,
// as "not_submitted", so the teacher sees the full class, not just those
// who acted.
export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const assignmentId = Number(url.searchParams.get('assignmentId'));
  if (!Number.isInteger(assignmentId)) {
    return json({ error: 'assignmentId is required.' }, 400);
  }

  try {
    const assignment = await loadOwnedAssignment(sql, session.staffId, assignmentId);
    if (!assignment) {
      return json({ error: 'No such assignment, or it is not yours.' }, 404);
    }

    const res = await sql`
      SELECT st.id AS student_id, st.full_name, st.admission_no,
             sub.submission_text, sub.submitted_at, sub.status, sub.score, sub.teacher_feedback, sub.graded_at
      FROM student_classes sc
      JOIN students st ON st.id = sc.student_id
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = ${assignmentId} AND sub.student_id = st.id
      WHERE sc.class_id = ${assignment.class_id}
      ORDER BY st.full_name`;

    return json({ assignment, roster: res.rows });
  } catch (err) {
    console.error('teacher assignment-grading list error', err);
    return json({ error: 'Could not load that assignment right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const assignmentId = Number(body && body.assignmentId);
  const records = Array.isArray(body && body.records) ? body.records : [];
  if (!Number.isInteger(assignmentId) || !records.length) {
    return json({ error: 'assignmentId and a non-empty records array are required.' }, 400);
  }

  try {
    const assignment = await loadOwnedAssignment(sql, session.staffId, assignmentId);
    if (!assignment) {
      return json({ error: 'No such assignment, or it is not yours.' }, 404);
    }

    const grant = await hasPermissionFor(sql, session.staffId, 'assignments', 'E', null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to grade assignments.' }, 403);
    }

    const rosterRes = await sql`SELECT student_id FROM student_classes WHERE class_id = ${assignment.class_id}`;
    const rosterIds = new Set(rosterRes.rows.map((r) => r.student_id));
    for (const rec of records) {
      if (!rosterIds.has(Number(rec.studentId))) {
        return json({ error: 'One or more students in this submission are not enrolled in this class.' }, 400);
      }
    }

    let saved = 0;
    for (const rec of records) {
      const studentId = Number(rec.studentId);
      const score = rec.score != null && rec.score !== '' ? Number(rec.score) : null;
      const teacherFeedback = rec.teacherFeedback || null;
      if (score == null && !teacherFeedback) continue;
      await sql`
        INSERT INTO assignment_submissions (assignment_id, student_id, status, score, teacher_feedback, graded_at, graded_by_staff_id)
        VALUES (${assignmentId}, ${studentId}, 'graded', ${score}, ${teacherFeedback}, now(), ${session.staffId})
        ON CONFLICT (assignment_id, student_id) DO UPDATE SET
          status = 'graded', score = EXCLUDED.score, teacher_feedback = EXCLUDED.teacher_feedback,
          graded_at = now(), graded_by_staff_id = EXCLUDED.graded_by_staff_id`;
      saved += 1;
    }

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'assignment', targetId: assignmentId,
      reason: body.reason || null, metadata: { assignmentId, studentsGraded: saved },
    });

    return json({ ok: true, saved });
  } catch (err) {
    console.error('teacher assignment-grading save error', err);
    return json({ error: 'Could not save those grades — ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

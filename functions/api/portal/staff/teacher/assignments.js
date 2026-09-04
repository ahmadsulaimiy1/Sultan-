// Teacher Portal — LMS Phase 1: create and list assignments for a class
// you actually teach. Sibling to staff/teacher/assessments.js and built
// on the exact same discipline: an active teacher_class_assignments row
// for this class+subject is the "own subject/class" scope check the
// generic Permission Engine cannot resolve on its own (see
// permissions.js), checked before the Matrix's own Create grant.
//
// Deliberately a separate table from term_results — this is coursework
// (homework/classwork a teacher sets), not the official CA/exam ledger
// that feeds report cards, transcripts and graduation. See
// docs/role-permission-matrix.md §4.5a.
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

// List every assignment this teacher has set, across their assigned
// classes/subjects, newest first, with a submission-count summary so the
// Teacher Portal can show "12 of 28 submitted" without a second round trip.
export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  try {
    const res = await sql`
      SELECT a.id, a.class_id, c.institution, c.name AS class_name, a.subject, a.term,
             a.title, a.instructions, a.max_score, a.due_at, a.status, a.created_at,
             (SELECT COUNT(*)::int FROM student_classes sc WHERE sc.class_id = a.class_id) AS roster_size,
             (SELECT COUNT(*)::int FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status IN ('submitted', 'late', 'graded')) AS submitted_count,
             (SELECT COUNT(*)::int FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') AS graded_count
      FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.staff_id = ${session.staffId}
      ORDER BY a.due_at DESC NULLS LAST, a.created_at DESC`;
    return json({ assignments: res.rows });
  } catch (err) {
    console.error('teacher assignments list error', err);
    return json({ error: 'Could not load your assignments right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const classId = Number(body && body.classId);
  const subject = ((body && body.subject) || '').trim();
  const term = ((body && body.term) || '').trim();
  const title = ((body && body.title) || '').trim();
  const instructions = (body && body.instructions) || null;
  const maxScore = body && body.maxScore != null && body.maxScore !== '' ? Number(body.maxScore) : 100;
  const dueAt = body && body.dueAt ? new Date(body.dueAt) : null;
  if (!Number.isInteger(classId) || !subject || !term || !title) {
    return json({ error: 'classId, subject, term, and title are all required.' }, 400);
  }
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return json({ error: 'dueAt, if given, must be a valid date.' }, 400);
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
      WHERE staff_id = ${session.staffId} AND class_id = ${classId} AND subject = ${subject} AND revoked_at IS NULL`;
    if (!assignRes.rows.length) {
      return json({ error: 'You are not the assigned Subject Teacher for this class and subject.' }, 403);
    }

    const grant = await hasPermissionFor(sql, session.staffId, 'assignments', 'C', cls.institution_id ?? null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to create assignments.' }, 403);
    }

    const created = await sql`
      INSERT INTO assignments (class_id, subject, staff_id, term, title, instructions, max_score, due_at)
      VALUES (${classId}, ${subject}, ${session.staffId}, ${term}, ${title}, ${instructions}, ${maxScore}, ${dueAt})
      RETURNING id`;

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'assignment', targetId: created.rows[0].id,
      reason: body.reason || null, metadata: { classId, subject, term, title },
    });

    return json({ ok: true, assignmentId: created.rows[0].id });
  } catch (err) {
    console.error('teacher assignments create error', err);
    return json({ error: 'Could not create that assignment — ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

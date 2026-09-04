// Student Portal — LMS Phase 1: the assignments a student can see across
// every class they're enrolled in (a student may hold more than one
// enrolment at once — see sql/schema.sql's student_classes), each with
// their own submission status, and a text-only submission path.
//
// Only PUBLISHED assignments are ever returned — a teacher's draft never
// reaches a student. No file/media upload here: object storage is a
// named, unbuilt piece of infrastructure (see docs/digital-campus-roadmap.md);
// submission_text is a deliberate, honest scope for this phase, not an
// oversight.
import { getSql } from '../../../_lib/db.js';
import { readStudentSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStudentSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  const sql = getSql(env);
  if (!sql) return { error: json({ error: 'Portal is not configured yet — no database is linked.' }, 500) };
  return { session, sql };
}

export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  try {
    const res = await sql`
      SELECT a.id, a.subject, a.term, a.title, a.instructions, a.max_score, a.due_at,
             c.institution, c.name AS class_name,
             sub.submission_text, sub.submitted_at, sub.status, sub.score, sub.teacher_feedback
      FROM assignments a
      JOIN classes c ON c.id = a.class_id
      JOIN student_classes sc ON sc.class_id = a.class_id AND sc.student_id = ${session.studentId}
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ${session.studentId}
      WHERE a.status = 'published'
      ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC`;

    const assignments = res.rows.map((r) => ({
      ...r,
      status: r.status || 'not_submitted',
    }));
    return json({ assignments });
  } catch (err) {
    console.error('student assignments list error', err);
    return json({ error: 'Could not load your assignments right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const assignmentId = Number(body && body.assignmentId);
  const submissionText = ((body && body.submissionText) || '').trim();
  if (!Number.isInteger(assignmentId) || !submissionText) {
    return json({ error: 'assignmentId and non-empty submissionText are required.' }, 400);
  }

  try {
    const res = await sql`
      SELECT a.id, a.due_at FROM assignments a
      JOIN student_classes sc ON sc.class_id = a.class_id AND sc.student_id = ${session.studentId}
      WHERE a.id = ${assignmentId} AND a.status = 'published'`;
    const assignment = res.rows[0];
    if (!assignment) {
      return json({ error: 'No such assignment, or it is not open to you.' }, 404);
    }

    const isLate = assignment.due_at ? new Date(assignment.due_at).getTime() < Date.now() : false;
    const status = isLate ? 'late' : 'submitted';

    await sql`
      INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submitted_at, status)
      VALUES (${assignmentId}, ${session.studentId}, ${submissionText}, now(), ${status})
      ON CONFLICT (assignment_id, student_id) DO UPDATE SET
        submission_text = EXCLUDED.submission_text, submitted_at = now(),
        status = CASE WHEN assignment_submissions.status = 'graded' THEN assignment_submissions.status ELSE EXCLUDED.status END`;

    return json({ ok: true, status });
  } catch (err) {
    console.error('student assignments submit error', err);
    return json({ error: 'Could not save your submission — ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

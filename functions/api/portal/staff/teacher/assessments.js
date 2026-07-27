// Teacher Portal — enter CA/exam scores for a whole class, one subject
// at a time. The real Subject Teacher workflow the Migration Phase B
// endpoint (staff/registrar/assessments.js) was never shaped for — that
// one is a single-student, admission-number lookup built for Registrar
// corrections. This is the first working path in this project for
// genuinely first-time (Create) score entry, now that a real
// teacher_class_assignments row can exist.
//
// Gated twice, deliberately: (1) an active Subject Teacher assignment
// for this exact class AND subject — the "own subject/class" scope
// check the generic Permission Engine cannot resolve on its own (see
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
  const subject = ((body && body.subject) || '').trim();
  const records = Array.isArray(body && body.records) ? body.records : [];
  if (!Number.isInteger(classId) || !rawTerm.trim() || !subject || !records.length) {
    return json({ error: 'classId, term, subject, and a non-empty records array are all required.' }, 400);
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

    const rosterRes = await sql`SELECT student_id FROM student_classes WHERE class_id = ${classId}`;
    const rosterIds = new Set(rosterRes.rows.map((r) => r.student_id));
    for (const rec of records) {
      if (!rosterIds.has(Number(rec.studentId))) {
        return json({ error: 'One or more students in this submission are not enrolled in this class.' }, 400);
      }
    }

    const term = await ensureTerm(sql, rawTerm);
    const studentIds = records.map((r) => Number(r.studentId));
    const placeholders = studentIds.map((_, i) => `$${i + 3}`).join(', ');
    const existingRes = await sql(
      `SELECT student_id FROM term_results WHERE term = $1 AND subject = $2 AND student_id IN (${placeholders})`,
      [term, subject, ...studentIds]
    );
    const existingSet = new Set(existingRes.rows.map((r) => r.student_id));
    const needsCreate = studentIds.some((id) => !existingSet.has(id));
    const needsEdit = studentIds.some((id) => existingSet.has(id));

    if (needsCreate) {
      const grant = await hasPermissionFor(sql, session.staffId, 'assessments', 'C', cls.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to create first-time assessment records.' }, 403);
      }
    }
    if (needsEdit) {
      const grant = await hasPermissionFor(sql, session.staffId, 'assessments', 'E', cls.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to correct existing assessment records.' }, 403);
      }
    }

    let saved = 0;
    for (const rec of records) {
      const studentId = Number(rec.studentId);
      const caScore = rec.caScore != null && rec.caScore !== '' ? Number(rec.caScore) : null;
      const examScore = rec.examScore != null && rec.examScore !== '' ? Number(rec.examScore) : null;
      const teacherComment = rec.teacherComment || null;
      if (caScore == null && examScore == null) continue;
      const totalScore = Number(caScore || 0) + Number(examScore || 0);
      await sql`
        INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
        VALUES (${studentId}, ${term}, ${subject}, ${caScore}, ${examScore}, ${totalScore}, ${teacherComment})
        ON CONFLICT (student_id, term, subject) DO UPDATE SET
          ca_score = EXCLUDED.ca_score, exam_score = EXCLUDED.exam_score,
          total_score = EXCLUDED.total_score, teacher_comment = EXCLUDED.teacher_comment, updated_at = now()`;
      saved += 1;
    }

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'term_results', targetId: classId,
      reason: body.reason || null, metadata: { classId, term, subject, studentsRecorded: saved },
    });

    return json({ ok: true, term, subject, saved });
  } catch (err) {
    console.error('teacher assessments error', err);
    return json({ error: 'Could not save those scores — ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

// Teacher Portal — class roster. The view a Class/Subject Teacher
// actually needs before taking attendance or entering scores: every
// student in one of their assigned classes, plus that student's current-
// term attendance and (for the teacher's own subjects) results already
// on file — so the attendance/assessments forms below can show what's
// already recorded instead of starting blank every time.
//
// Session + Permission-Engine gated (student_records/V, same as
// registrar/student.js), AND gated on an active teacher_class_assignments
// row for this exact class — holding the TCH role somewhere in the
// institution is not enough; this is the "own classes only" scope check
// the Permission Engine itself cannot resolve (see permissions.js).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';

export async function onRequestGet({ request, env }) {
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

  const url = new URL(request.url);
  const classId = Number(url.searchParams.get('classId'));
  if (!Number.isInteger(classId)) {
    return json({ error: 'A valid classId query parameter is required.' }, 400);
  }

  try {
    const classRes = await sql`
      SELECT c.id, c.institution, c.name, ci.id AS institution_id
      FROM classes c LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE c.id = ${classId}`;
    const cls = classRes.rows[0];
    if (!cls) {
      return json({ error: 'No such class.' }, 404);
    }

    const grant = await hasPermissionFor(sql, session.staffId, 'student_records', 'V', cls.institution_id ?? null);
    if (!grant.granted) {
      return json({ error: 'Your role does not currently include visibility over student records.' }, 403);
    }

    const assignRes = await sql`
      SELECT subject, is_class_teacher FROM teacher_class_assignments
      WHERE staff_id = ${session.staffId} AND class_id = ${classId} AND revoked_at IS NULL`;
    if (!assignRes.rows.length) {
      return json({ error: 'You are not assigned to this class.' }, 403);
    }
    const isClassTeacher = assignRes.rows.some((r) => r.is_class_teacher);
    const subjects = assignRes.rows.filter((r) => r.subject).map((r) => r.subject);

    const studentsRes = await sql`
      SELECT s.id, s.full_name, s.admission_no, s.status
      FROM student_classes sc JOIN students s ON s.id = sc.student_id
      WHERE sc.class_id = ${classId}
      ORDER BY s.full_name`;
    const studentIds = studentsRes.rows.map((s) => s.id);

    const currentTermRes = await sql`SELECT label FROM academic_terms WHERE is_current = true LIMIT 1`;
    const currentTerm = currentTermRes.rows[0] ? currentTermRes.rows[0].label : null;

    let attendanceByStudent = {};
    let resultsByStudent = {};
    if (studentIds.length && currentTerm) {
      const placeholders = studentIds.map((_, i) => `$${i + 2}`).join(', ');
      const attRes = await sql(
        `SELECT student_id, days_present, days_total FROM attendance_summary WHERE term = $1 AND student_id IN (${placeholders})`,
        [currentTerm, ...studentIds]
      );
      attRes.rows.forEach((r) => { attendanceByStudent[r.student_id] = { daysPresent: r.days_present, daysTotal: r.days_total }; });

      if (subjects.length) {
        const subjPlaceholders = subjects.map((_, i) => `$${i + 2 + studentIds.length}`).join(', ');
        const resRes = await sql(
          `SELECT student_id, subject, ca_score, exam_score, total_score FROM term_results
           WHERE term = $1 AND student_id IN (${placeholders}) AND subject IN (${subjPlaceholders})`,
          [currentTerm, ...studentIds, ...subjects]
        );
        resRes.rows.forEach((r) => { (resultsByStudent[r.student_id] ||= []).push(r); });
      }
    }

    return json({
      class: { id: cls.id, institution: cls.institution, name: cls.name },
      isClassTeacher, subjects, currentTerm,
      students: studentsRes.rows.map((s) => ({
        id: s.id, fullName: s.full_name, admissionNo: s.admission_no, status: s.status,
        attendance: attendanceByStudent[s.id] || null,
        results: resultsByStudent[s.id] || [],
      })),
    });
  } catch (err) {
    console.error('teacher roster error', err);
    return json({ error: 'Could not load that class roster right now — please try again shortly.' }, 500);
  }
}

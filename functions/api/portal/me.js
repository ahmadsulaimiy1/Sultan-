import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';
import { isQuranCollegeInstitution, hifzStageLabel } from '../../_lib/hifz.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }

  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
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

  try {
    const guardianRes = await sql`SELECT full_name FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const studentsRes = await sql`
      SELECT s.id, s.full_name, s.admission_no, s.status, c.institution, c.name AS class_name
      FROM students s
      JOIN guardian_student gs ON gs.student_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE gs.guardian_id = ${session.guardianId}
      ORDER BY s.full_name`;

    const children = [];
    for (const student of studentsRes.rows) {
      const [attendance, results, fees] = await Promise.all([
        sql`SELECT term, days_present, days_total FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
        sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment FROM term_results WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
        sql`SELECT term, amount_due, amount_paid FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      ]);

      // Guardians see a Hifz *snapshot* only (stage + Juz' verified
      // count) — the student's own portal shows the full per-Juz' grid
      // and raw Muhaffiz notes; parents don't need that level of detail
      // in this summary card.
      let hifz = null;
      if (isQuranCollegeInstitution(student.institution)) {
        const [enrolmentRes, verifiedCountRes] = await Promise.all([
          sql`SELECT stage_number FROM hifz_enrolment WHERE student_id = ${student.id}`,
          sql`SELECT COUNT(*)::int AS n FROM hifz_progress WHERE student_id = ${student.id} AND status = 'verified'`,
        ]);
        const stageNumber = enrolmentRes.rows[0] ? enrolmentRes.rows[0].stage_number : 1;
        hifz = {
          stageNumber,
          stageLabel: hifzStageLabel(stageNumber),
          juzVerifiedCount: verifiedCountRes.rows[0] ? verifiedCountRes.rows[0].n : 0,
        };
      }

      children.push({
        id: student.id,
        fullName: student.full_name,
        admissionNo: student.admission_no,
        status: student.status,
        institution: student.institution,
        className: student.class_name,
        attendance: attendance.rows[0] || null,
        results: results.rows,
        fees: fees.rows[0] || null,
        hifz,
      });
    }

    const notificationsRes = await sql`
      SELECT id, message, created_at FROM notifications
      WHERE guardian_id = ${session.guardianId} AND read_at IS NULL
      ORDER BY created_at DESC LIMIT 20`;

    return json({ fullName: guardian.full_name, children, notifications: notificationsRes.rows });
  } catch (err) {
    console.error('portal me error', err);
    return json({ error: 'Could not load your dashboard right now — please try again shortly.' }, 500);
  }
}

// Personalisation Centre — Security & Privacy: "Download My Data".
// Real self-service export for a signed-in guardian, of exactly their
// own guardian record and linked children's records — reuses the same
// query shape as me.js. Complements privacy-request.js (which is for
// access/correction/deletion requests that need staff involvement);
// this one needs no staff involvement at all, since a guardian
// downloading their own already-authenticated data has no verification
// step to skip.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
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
    const guardianRes = await sql`SELECT id, full_name, email, created_at FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const studentsRes = await sql`
      SELECT s.id, s.full_name, s.admission_no, s.status, s.created_at, c.institution, c.name AS class_name, gs.relationship
      FROM students s
      JOIN guardian_student gs ON gs.student_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE gs.guardian_id = ${session.guardianId}
      ORDER BY s.full_name`;

    const children = [];
    for (const student of studentsRes.rows) {
      const [attendance, results, fees] = await Promise.all([
        sql`SELECT term, days_present, days_total, updated_at FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
        sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment, updated_at FROM term_results WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
        sql`SELECT term, amount_due, amount_paid, updated_at FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
      ]);
      children.push({
        fullName: student.full_name,
        admissionNo: student.admission_no,
        status: student.status,
        institution: student.institution,
        className: student.class_name,
        relationship: student.relationship,
        recordCreated: student.created_at,
        attendance: attendance.rows,
        results: results.rows,
        fees: fees.rows,
      });
    }

    const notificationPrefsRes = await sql`SELECT * FROM guardian_notification_preferences WHERE guardian_id = ${session.guardianId}`;
    const notificationsRes = await sql`SELECT message, created_at, read_at FROM notifications WHERE guardian_id = ${session.guardianId} ORDER BY created_at DESC`;

    return json({
      exportedAt: new Date().toISOString(),
      guardian: { fullName: guardian.full_name, email: guardian.email, accountCreated: guardian.created_at },
      children,
      notificationPreferences: notificationPrefsRes.rows[0] || null,
      notifications: notificationsRes.rows,
    });
  } catch (err) {
    console.error('portal export-data error', err);
    return json({ error: 'Could not prepare your data export right now.' }, 500);
  }
}

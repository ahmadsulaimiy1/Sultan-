// Teacher Portal — "My Classes." The landing view for a signed-in
// Teacher: every class they hold an active teacher_class_assignments
// row for, grouped by class, showing whether that grant is Class
// Teacher (attendance authority) and/or which subjects they teach there
// (assessment authority). This is the real data source the generic
// /portal/staff/identity/ page deliberately does not show — per
// docs/staff-identity-architecture.md §8, task-specific views belong to
// the office module that needs them, not the identity card.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';

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

  try {
    const rows = await sql`
      SELECT tca.class_id, c.institution, c.name AS class_name, tca.subject, tca.is_class_teacher,
             (SELECT count(*)::int FROM student_classes sc WHERE sc.class_id = tca.class_id) AS student_count
      FROM teacher_class_assignments tca
      JOIN classes c ON c.id = tca.class_id
      WHERE tca.staff_id = ${session.staffId} AND tca.revoked_at IS NULL
      ORDER BY c.institution, c.name`;

    const byClass = new Map();
    for (const r of rows.rows) {
      if (!byClass.has(r.class_id)) {
        byClass.set(r.class_id, {
          classId: r.class_id, institution: r.institution, className: r.class_name,
          studentCount: r.student_count, isClassTeacher: false, subjects: [],
        });
      }
      const entry = byClass.get(r.class_id);
      if (r.is_class_teacher) entry.isClassTeacher = true;
      if (r.subject) entry.subjects.push(r.subject);
    }

    return json({ classes: Array.from(byClass.values()) });
  } catch (err) {
    console.error('teacher classes list error', err);
    return json({ error: 'Could not load your classes right now — please try again shortly.' }, 500);
  }
}

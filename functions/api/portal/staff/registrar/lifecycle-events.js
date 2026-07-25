// The Registrar's Office's core write path — real academic-lifecycle
// actions (promotion, transfer, withdrawal, graduation, reinstatement),
// each writing a permanent, reasoned event to student_lifecycle_events
// (see sql/schema.sql's comment on why this replaces students.status as
// the only trace of these decisions). Session-authenticated,
// Permission-Engine-gated — the target state
// docs/identity-migration-plan.md describes for this office, built
// that way from day one rather than migrated later.
//
// One explicit `action` per request, never an implicit upsert — same
// convention as admin/announcements.js and admin/staff.js. Every action
// requires `reason` except graduation (a graduation earned through
// normal progression doesn't need one, though the field still accepts
// it if there's something worth recording).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

const EVENT_TYPES = {
  promote: 'promotion',
  transfer: 'transfer',
  withdraw: 'withdrawal',
  graduate: 'graduation',
  reinstate: 'reinstatement',
};

async function resolveClassId(sql, institution, className) {
  const existing = await sql`SELECT id FROM classes WHERE institution = ${institution} AND name = ${className}`;
  if (existing.rows.length) return existing.rows[0].id;
  const created = await sql`INSERT INTO classes (institution, name) VALUES (${institution}, ${className}) RETURNING id`;
  return created.rows[0].id;
}

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

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;
  const eventType = EVENT_TYPES[action];
  if (!eventType) {
    return json({ error: `Unknown action. Expected one of: ${Object.keys(EVENT_TYPES).join(', ')}.` }, 400);
  }

  const admissionNo = ((body && body.admissionNo) || '').trim();
  const reason = (body && body.reason) || null;
  if (!admissionNo) {
    return json({ error: 'admissionNo is required.' }, 400);
  }
  if (action !== 'graduate' && !reason) {
    return json({ error: 'reason is required for this action.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.status, s.class_id, c.institution AS current_institution, c.institution AS current_institution_name,
             ci.id AS current_institution_id
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that Institutional Student Number.' }, 404);
    }

    // Pass the student's OWN institution id so a Principal's
    // institution-scoped grant is actually checked against it —
    // passing null here would silently let an institution-scoped grant
    // through for any student, defeating the scope entirely.
    const grant = await hasPermissionFor(sql, staffId, 'student_records', 'E', student.current_institution_id ?? null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have edit authority over this student\'s record.' }, 403);
    }

    const effectiveDate = (body && body.effectiveDate) || null;
    const approvedByStaffNo = (body && body.approvedByStaffNo) || null;
    let approvedByStaffId = null;
    if (approvedByStaffNo) {
      const approverRes = await sql`SELECT id FROM staff WHERE staff_no = ${approvedByStaffNo}`;
      approvedByStaffId = approverRes.rows[0] ? approverRes.rows[0].id : null;
    }

    let toClassId = null;
    let newStatus = student.status;
    if (action === 'promote' || action === 'transfer') {
      const toInstitution = (body && body.toInstitution) || '';
      const toClassName = (body && body.toClassName) || '';
      if (!toInstitution || !toClassName) {
        return json({ error: 'toInstitution and toClassName are required for promotion/transfer.' }, 400);
      }
      toClassId = await resolveClassId(sql, toInstitution, toClassName);
    } else if (action === 'withdraw') {
      newStatus = 'withdrawn';
    } else if (action === 'graduate') {
      newStatus = 'graduated';
    } else if (action === 'reinstate') {
      newStatus = 'active';
    }

    const created = await sql`
      INSERT INTO student_lifecycle_events (student_id, event_type, from_class_id, to_class_id, reason, effective_date, decided_by_staff_id, approved_by_staff_id)
      VALUES (${student.id}, ${eventType}, ${student.class_id}, ${toClassId}, ${reason}, ${effectiveDate || new Date().toISOString().slice(0, 10)}, ${staffId}, ${approvedByStaffId})
      RETURNING id`;

    if (toClassId) {
      await sql`UPDATE students SET class_id = ${toClassId} WHERE id = ${student.id}`;
      await sql`UPDATE student_classes SET is_primary = false WHERE student_id = ${student.id} AND is_primary = true`;
      await sql`
        INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${student.id}, ${toClassId}, true)
        ON CONFLICT (student_id, class_id) DO UPDATE SET is_primary = true`;
    }
    if (newStatus !== student.status) {
      await sql`UPDATE students SET status = ${newStatus} WHERE id = ${student.id}`;
    }

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'student_lifecycle_event', targetId: created.rows[0].id,
      reason, metadata: { admissionNo, action, effectiveDate },
    });

    return json({ ok: true, eventId: created.rows[0].id, studentId: student.id, newStatus });
  } catch (err) {
    console.error('registrar lifecycle-events error', err);
    return json({ error: 'Could not record that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

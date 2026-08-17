// Closes the loop the Account Creation Journey promised: Enquiry ->
// Application -> Admission -> Parent Portal, all under one guardian
// account. Converts an admissions_applications row into a real
// students row, linked to the SAME guardian who submitted the
// application (guardian_student), so the login that submitted the
// enquiry is exactly the login that becomes real Parent Portal access
// once this runs — no second account, no manual reconciliation.
// Session-authenticated, Permission-Engine-gated against
// `student_records` (Create) — the Registrar's own act of admitting a
// student is, structurally, creating a student record.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { generateAdmissionNo } from '../../../../_lib/identity-no.js';
import { resolveClassId } from '../../../../_lib/classes.js';

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
  const applicationId = body && body.applicationId;
  let admissionNo = ((body && body.admissionNo) || '').trim();
  const admissionYear = (body && Number.isInteger(body.admissionYear)) ? body.admissionYear : new Date().getFullYear();
  const institution = (body && body.institution) || '';
  const className = (body && body.className) || '';
  if (!Number.isInteger(applicationId) || !institution || !className) {
    return json({ error: 'applicationId, institution, and className are all required.' }, 400);
  }

  try {
    const grant = await hasPermissionFor(sql, session.staffId, 'student_records', 'C', null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to enrol a student.' }, 403);
    }

    const appRes = await sql`SELECT id, guardian_id, applicant_child_name, status FROM admissions_applications WHERE id = ${applicationId}`;
    const application = appRes.rows[0];
    if (!application) {
      return json({ error: 'No admissions application found with that id.' }, 404);
    }

    // Institutional Identity Number Architecture Directive: the
    // Registrar can still hand-supply an admissionNo (e.g. to match a
    // pre-2026 paper register), same override precedent as certificate
    // reference numbers — but the default path now generates a real
    // SHRS-<SCHOOL>-<YY>-<seq6> Institutional Student Number
    // server-side, so admission no longer depends on staff typing a
    // number correctly.
    if (!admissionNo) {
      admissionNo = await generateAdmissionNo(sql, institution, admissionYear);
    }
    const existingStudent = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
    if (existingStudent.rows.length) {
      return json({ error: 'A student already exists with that Institutional Student Number.' }, 409);
    }

    const classId = await resolveClassId(sql, institution, className);
    const createdStudent = await sql`
      INSERT INTO students (full_name, admission_no, class_id, status)
      VALUES (${application.applicant_child_name}, ${admissionNo}, ${classId}, 'active')
      RETURNING id`;
    const studentId = createdStudent.rows[0].id;

    await sql`
      INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${studentId}, ${classId}, true)
      ON CONFLICT (student_id, class_id) DO UPDATE SET is_primary = true`;
    await sql`
      INSERT INTO guardian_student (guardian_id, student_id, relationship)
      VALUES (${application.guardian_id}, ${studentId}, 'parent/guardian')
      ON CONFLICT (guardian_id, student_id) DO NOTHING`;
    await sql`
      UPDATE admissions_applications SET status = 'admitted', reviewed_by_staff_id = ${session.staffId}, updated_at = now()
      WHERE id = ${applicationId}`;
    await sql`
      INSERT INTO student_lifecycle_events (student_id, event_type, to_class_id, reason, decided_by_staff_id, metadata)
      VALUES (${studentId}, 'enrolment', ${classId}, ${'Enrolled from admissions application #' + applicationId}, ${session.staffId}, ${JSON.stringify({ applicationId })})`;

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'student', targetId: studentId,
      reason: 'Enrolled from admissions application', metadata: { applicationId, admissionNo },
    });

    return json({ ok: true, studentId, admissionNo });
  } catch (err) {
    console.error('registrar enrol error', err);
    return json({ error: 'Could not enrol that student: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

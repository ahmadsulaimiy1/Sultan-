// Token-protected admin endpoint for school staff to enter real student
// records. Deliberately API-only (no UI) for Phase 1 — see
// docs/parent-portal.md for the request shape and how to call it. This
// keeps children's real data out of any chat transcript: staff (or
// whoever holds PORTAL_ADMIN_TOKEN) call this directly, it is never
// something to paste into a conversation with an AI assistant.
//
// Guardians are never given a password by staff. A brand-new guardian
// gets an activation link (a reset_token) back in the response for
// staff to relay via WhatsApp/email; the parent chooses their own
// password at /portal/set-password/. See functions/api/portal/set-password.js.
//
// Migration status (docs/identity-migration-plan.md): student/guardian
// creation and fee entry still go through this bearer token —
// attendance (Phase A) and assessment/results (Phase B) do not; both
// now return 410 pointing at their session-gated replacements under
// functions/api/portal/staff/registrar/. Fees (Phase C) are next.
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const ACTIVATION_TOKEN_TTL_DAYS = 7;
const VALID_STATUSES = ['active', 'graduated', 'withdrawn', 'suspended'];

async function resolveClassId(sql, institution, className) {
  const existingClass = await sql`SELECT id FROM classes WHERE institution = ${institution} AND name = ${className}`;
  if (existingClass.rows.length) return existingClass.rows[0].id;
  const createdClass = await sql`INSERT INTO classes (institution, name) VALUES (${institution}, ${className}) RETURNING id`;
  return createdClass.rows[0].id;
}

export async function onRequestPost({ request, env }) {
  const adminToken = env.PORTAL_ADMIN_TOKEN;
  if (!adminToken) {
    return json({ error: 'Portal admin is not configured yet — PORTAL_ADMIN_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-admin-token'), adminToken)) {
    return json({ error: 'Invalid admin token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const body = await readJsonBody(request);
  const guardianIn = body && body.guardian;
  const studentIn = body && body.student;
  if (!guardianIn || !guardianIn.email || !studentIn || !studentIn.fullName || !studentIn.admissionNo) {
    return json({ error: 'guardian.email, student.fullName and student.admissionNo are required.' }, 400);
  }
  if (studentIn.status && !VALID_STATUSES.includes(studentIn.status)) {
    return json({ error: 'student.status must be one of: ' + VALID_STATUSES.join(', ') }, 400);
  }

  try {
    const email = guardianIn.email.trim().toLowerCase();
    let guardianId;
    let activationLink = null;
    const existingGuardian = await sql`SELECT id FROM guardians WHERE email = ${email}`;
    if (existingGuardian.rows.length) {
      guardianId = existingGuardian.rows[0].id;
    } else {
      if (!guardianIn.fullName) {
        return json({ error: 'New guardian requires guardian.fullName.' }, 400);
      }
      const token = generateToken();
      const created = await sql`
        INSERT INTO guardians (full_name, email, reset_token, reset_token_expires)
        VALUES (${guardianIn.fullName}, ${email}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
        RETURNING id`;
      guardianId = created.rows[0].id;
      activationLink = '/portal/set-password/?token=' + token;
    }

    let classId = null;
    if (studentIn.institution && studentIn.className) {
      classId = await resolveClassId(sql, studentIn.institution, studentIn.className);
    }

    const admissionNo = studentIn.admissionNo.trim();
    const status = studentIn.status || 'active';
    // Optional — entering it here is what turns on the email OTP step
    // at the student's own login (see student/login.js). Not required;
    // a student with no email keeps signing in with password only.
    const studentEmail = studentIn.email ? studentIn.email.trim().toLowerCase() : null;
    let studentId;
    const existingStudent = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
    if (existingStudent.rows.length) {
      studentId = existingStudent.rows[0].id;
      await sql`UPDATE students SET full_name = ${studentIn.fullName}, class_id = ${classId}, status = ${status}, email = COALESCE(${studentEmail}, email) WHERE id = ${studentId}`;
    } else {
      const createdStudent = await sql`
        INSERT INTO students (full_name, admission_no, class_id, status, email)
        VALUES (${studentIn.fullName}, ${admissionNo}, ${classId}, ${status}, ${studentEmail})
        RETURNING id`;
      studentId = createdStudent.rows[0].id;
    }

    // student_classes is the authoritative multi-enrolment record — the
    // primary class above is mirrored here (is_primary = true), plus any
    // additionalPrograms (e.g. a Royal College student also enrolled in
    // Qur'an College and/or Islamic and Arabic Studies at the same time).
    // Purely additive: re-calling this endpoint never removes an
    // existing enrolment, only adds/updates ones named in this request.
    if (classId) {
      await sql`
        INSERT INTO student_classes (student_id, class_id, is_primary)
        VALUES (${studentId}, ${classId}, true)
        ON CONFLICT (student_id, class_id) DO UPDATE SET is_primary = true`;
    }
    if (Array.isArray(body.additionalPrograms)) {
      for (const p of body.additionalPrograms) {
        if (!p || !p.institution || !p.className) continue;
        const additionalClassId = await resolveClassId(sql, p.institution, p.className);
        await sql`
          INSERT INTO student_classes (student_id, class_id, is_primary)
          VALUES (${studentId}, ${additionalClassId}, false)
          ON CONFLICT (student_id, class_id) DO NOTHING`;
      }
    }

    await sql`
      INSERT INTO guardian_student (guardian_id, student_id, relationship)
      VALUES (${guardianId}, ${studentId}, ${body.relationship || 'parent/guardian'})
      ON CONFLICT (guardian_id, student_id) DO NOTHING`;

    // Attendance (Migration Phase A), results (Phase B), and fees
    // (Phase C) all moved to session + Permission-Engine-gated
    // endpoints under functions/api/portal/staff/ — each refused
    // outright here, not silently accepted and dropped, so a caller
    // still on the old integration sees it stop working rather than
    // appear to succeed. See docs/identity-migration-plan.md.
    if (body.attendance) {
      return json({ error: 'Attendance is no longer accepted here — use POST /api/portal/staff/registrar/attendance (staff session required). See docs/registrar-office.md.' }, 410);
    }
    if (body.results) {
      return json({ error: 'Assessment/result entry is no longer accepted here — use POST /api/portal/staff/registrar/assessments (staff session required). See docs/registrar-office.md.' }, 410);
    }
    if (body.fees) {
      return json({ error: 'Fee entry is no longer accepted here — use POST /api/portal/staff/finance/fees (staff session required). See docs/financial-authority-map.md.' }, 410);
    }

    return json({ ok: true, guardianId, studentId, activationLink });
  } catch (err) {
    console.error('portal admin students error', err);
    return json({ error: 'Could not save that record: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

// Token-protected admin endpoint that issues (or reissues) a Student
// Portal login for an EXISTING student record. Deliberately does not
// create students itself — that stays admin/students.js's job, so a
// student always exists as an academic record before it can also become
// a login. Same admin-mediated model as guardians (see admin/students.js
// and admin/reset-password.js): staff never choose or see a student's
// password. Calling this again for a student who's already activated
// simply issues a fresh activation link (same as admin/reset-password.js
// does for guardians) — useful if the first link expired or was lost.
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const ACTIVATION_TOKEN_TTL_DAYS = 7;

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
  const admissionNo = ((body && body.admissionNo) || '').trim();
  if (!admissionNo) {
    return json({ error: 'admissionNo is required.' }, 400);
  }

  try {
    const studentRes = await sql`SELECT id, full_name FROM students WHERE admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that admission number. Create the student record first via /api/portal/admin/students.' }, 404);
    }

    const token = generateToken();
    await sql`
      INSERT INTO student_accounts (student_id, reset_token, reset_token_expires)
      VALUES (${student.id}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
      ON CONFLICT (student_id) DO UPDATE SET
        reset_token = EXCLUDED.reset_token,
        reset_token_expires = EXCLUDED.reset_token_expires,
        failed_attempts = 0, locked_until = NULL`;

    return json({
      ok: true,
      studentId: student.id,
      fullName: student.full_name,
      activationLink: '/portal/student/set-password/?token=' + token,
    });
  } catch (err) {
    console.error('portal admin create-student-login error', err);
    return json({ error: 'Could not issue a student login: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

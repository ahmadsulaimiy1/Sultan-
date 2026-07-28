// First-time activation and staff-mediated reset for a student login —
// same token-is-the-secret model as functions/api/portal/set-password.js
// (see that file's header comment), scoped to student_accounts instead
// of guardians. A student only ever reaches this page via a link staff
// relayed to them (functions/api/portal/admin/create-student-login.js);
// there is no public "create your own student account" path.
import { getSql } from '../../../_lib/db.js';
import { createStudentSessionCookie, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const token = (body && body.token) || '';
  const password = (body && body.password) || '';
  if (!token) {
    return json({ error: 'Missing activation token.' }, 400);
  }
  if (!isPasswordStrongEnough(password)) {
    return json({ error: `Please choose a password at least ${MIN_PASSWORD_LENGTH} characters long.` }, 400);
  }

  try {
    const result = await sql`
      SELECT student_id, reset_token_expires FROM student_accounts WHERE reset_token = ${token}`;
    const account = result.rows[0];
    if (!account) {
      return json({ error: 'This activation link is invalid. Ask the school to send you a new one.' }, 400);
    }
    if (!account.reset_token_expires || new Date(account.reset_token_expires).getTime() < Date.now()) {
      return json({ error: 'This activation link has expired. Ask the school to send you a new one.' }, 400);
    }

    const { hash, salt } = hashPassword(password);
    await sql`
      UPDATE student_accounts SET
        password_hash = ${hash}, password_salt = ${salt},
        reset_token = NULL, reset_token_expires = NULL,
        failed_attempts = 0, locked_until = NULL
      WHERE student_id = ${account.student_id}`;
    // trust_version lives on students (not student_accounts) alongside
    // email — bumping it invalidates any previously-issued
    // trusted-device cookie, since a password reset is exactly the
    // security event that should force a fresh OTP on next login.
    await sql`UPDATE students SET trust_version = trust_version + 1 WHERE id = ${account.student_id}`;
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('student', ${account.student_id}, NULL, 'password_activated')`;

    return json(
      { ok: true },
      200,
      { 'Set-Cookie': createStudentSessionCookie(account.student_id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('student portal set-password error', err);
    return json({ error: 'Could not set your password right now — please try again shortly.' }, 500);
  }
}

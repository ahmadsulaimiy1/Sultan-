// First-time activation and ICT-mediated reset for a staff login — same
// token-is-the-secret model as functions/api/portal/set-password.js and
// student/set-password.js, scoped to staff_accounts. A staff member only
// ever reaches this page via a link issued by
// functions/api/portal/admin/staff.js (create-login action); there is
// no public "create your own staff account" path — see
// docs/staff-identity-architecture.md.
import { getSql } from '../../../_lib/db.js';
import { createStaffSessionCookie, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '../../../_lib/session.js';
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
      SELECT staff_id, reset_token_expires FROM staff_accounts WHERE reset_token = ${token}`;
    const account = result.rows[0];
    if (!account) {
      // A token that matches no row has three quite different histories: it
      // was used (line 46 clears it), it was superseded by a newer link
      // (admin/staff.js create-login overwrites), or it never existed. They
      // are indistinguishable from the token alone — so the message must not
      // assert one of them. It used to send everyone to the ICT Office,
      // including people whose accounts were already working and who only
      // needed to sign in.
      return json({ error: 'This activation link is no longer usable — it has already been used, or a newer link has replaced it. If you have already set your password, sign in at /portal/staff/login/. Otherwise ask the ICT Office for a fresh link, and be sure to open the most recent one they sent.' }, 400);
    }
    if (!account.reset_token_expires || new Date(account.reset_token_expires).getTime() < Date.now()) {
      return json({ error: 'This activation link has expired. Ask the ICT Office to send you a new one.' }, 400);
    }

    const { hash, salt } = hashPassword(password);
    await sql`
      UPDATE staff_accounts SET
        password_hash = ${hash}, password_salt = ${salt},
        reset_token = NULL, reset_token_expires = NULL,
        failed_attempts = 0, locked_until = NULL
      WHERE staff_id = ${account.staff_id}`;
    // trust_version lives on staff (not staff_accounts) alongside
    // email — bumping it invalidates any previously-issued
    // trusted-device cookie, since a password reset is exactly the
    // security event that should force a fresh OTP on next login.
    await sql`UPDATE staff SET trust_version = trust_version + 1 WHERE id = ${account.staff_id}`;
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('staff', ${account.staff_id}, NULL, 'password_activated')`;

    return json(
      { ok: true },
      200,
      { 'Set-Cookie': createStaffSessionCookie(account.staff_id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('staff portal set-password error', err);
    return json({ error: 'Could not set your password right now — please try again shortly.' }, 500);
  }
}
